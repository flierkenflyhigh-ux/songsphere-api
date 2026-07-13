import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from openai import AsyncOpenAI

app = FastAPI(title="Songsphere API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    track_id: str

async def generate_critique_and_params(track_name: str, artist_name: str):
    """OpenAI APIを使用して、楽曲の推測パラメータ・批評・視覚プロンプトを一括生成する"""
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    prompt = f"""
    You are a poetic music critic and visual artist.
    Analyze the song "{track_name}" by {artist_name}.
    Based on your knowledge of this song's sonic profile (tempo, energy, valence), generate an abstract 3D spherical art concept.
    
    Output strictly in JSON format with the following keys:
    - "physics_params": A dictionary containing "color_intensity" (float 0.0-1.0), "rotation_speed" (float 0.0-2.0), and "turbulence" (float 0.0-1.0).
    - "critique": A short poetic critique of the song.
    - "visual_prompt": A prompt describing the abstract 3D spherical art based on the song's vibe.
    """
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        response_format={ "type": "json_object" },
        messages=[
            {"role": "system", "content": "You are a creative API that outputs only valid JSON."},
            {"role": "user", "content": prompt}
        ]
    )
    return json.loads(response.choices[0].message.content)

async def generate_sphere_image(prompt: str):
    """DALL-E 3 を使用して球体の画像を生成する"""
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    response = await client.images.generate(
        model="dall-e-3",
        prompt=f"Abstract 3D spherical art based on: {prompt}, high quality, cinematic lighting, 8k",
        n=1,
        size="1024x1024"
    )
    return response.data[0].url

@app.post("/generate")
async def generate_sphere(req: GenerateRequest):
    try:
        # Spotifyの初期化
        client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
        
        if not client_id or not client_secret:
            raise HTTPException(status_code=500, detail="Spotify API keys are missing.")

        sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
            client_id=client_id,
            client_secret=client_secret
        ))
        
        # 1. audio-features の代わりに、通常のトラック情報を取得（これはブロックされない）
        try:
            track_info = sp.track(req.track_id)
            track_name = track_info['name']
            artist_name = track_info['artists'][0]['name']
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Track ID {req.track_id} not found on Spotify. Error: {str(e)}")
        
        # 2. GPT-4oに楽曲情報を渡し、パラメータと批評を一括生成
        ai_data = await generate_critique_and_params(track_name, artist_name)
        
        # 3. 画像の生成
        image_url = await generate_sphere_image(ai_data["visual_prompt"])
        
        return {
            "status": "success",
            "track_name": track_name,
            "artist_name": artist_name,
            "params": ai_data["physics_params"],
            "critique": ai_data["critique"],
            "image_url": image_url
        }
        
    except spotipy.exceptions.SpotifyException as e:
        raise HTTPException(status_code=e.http_status, detail=f"Spotify API Error: {e.msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
