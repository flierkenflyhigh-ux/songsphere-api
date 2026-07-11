import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import numpy as np
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

app = FastAPI(title="Songspere API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# APIクライアント初期化
sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"), 
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET")
))
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class GenerateRequest(BaseModel):
    spotify_track_id: str
    lyrics_key_phrase: str = ""

@app.get("/")
def read_root():
    return {"status": "Songspere API is running"}

@app.post("/api/generate")
async def generate_sphere(request: GenerateRequest):
    try:
        # 1. Spotifyデータ取得と独自パラメータ計算
        track = sp.track(request.spotify_track_id)
        features = sp.audio_features(request.spotify_track_id)[0]
        analysis = sp.audio_analysis(request.spotify_track_id)
        
        friction = features['energy'] * (1 - features['danceability']) * 100
        contrast = (1 - features['instrumentalness']) * 100
        loudness_array = np.array([seg['loudness'] for seg in analysis['segments']])
        dynamic_shift = min(np.std(loudness_array) * 5, 100.0)
        organic_index = ((features['acousticness'] + features['speechiness']) / 2) * 100

        track_data = {
            "name": track['name'],
            "artist": track['artists'][0]['name'],
            "BPM": round(features['tempo']),
            "Rhythmic_Friction": round(friction),
            "Instrument_Role_Contrast": round(contrast),
            "Dynamic_Shift": round(dynamic_shift),
            "Vocal_Organic_Index": round(organic_index)
        }

        # 2. OpenAIによるインサイトと画像プロンプト生成
        prompt = f"Analyze this song data and generate 3 short insights in Japanese, and an image generation prompt in English for a 'material sphere' representing the song.\nData: {json.dumps(track_data)}\nLyrics focus: {request.lyrics_key_phrase}"
        
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        ai_result = json.loads(response.choices[0].message.content)

        return {"status": "success", "track": track_data, "ai_result": ai_result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
