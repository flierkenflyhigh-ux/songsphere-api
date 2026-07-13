import os
import json
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from openai import AsyncOpenAI

# 1. FastAPI アプリケーションの初期化（他のすべての記述より上に配置）
app = FastAPI(title="Songsphere API")

# CORS設定 (フロントエンドからのアクセスを許可)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. リクエストモデルの定義
class GenerateRequest(BaseModel):
    track_id: str

# 3. 各種処理関数の定義
# ※ calculate_physics_params と generate_critique は、
# お手元に独自の実装（より詳細な分析ロジック）があれば、関数の中身を差し替えてください。

def calculate_physics_params(features, analysis):
    """Spotifyのデータから球体の物理パラメータを計算する"""
    energy = features.get("energy", 0.5)
    valence = features.get("valence", 0.5)
    tempo = features.get("tempo", 120.0)
    
    return {
        "color_intensity": valence,
        "rotation_speed": tempo / 120.0,
        "turbulence": energy
    }

async def generate_critique(track_id: str, params: dict):
    """OpenAI APIを使用して批評と視覚プロンプトを生成する"""
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    prompt = f"""
    Analyze a music track with the following physics parameters derived from its audio features: {json.dumps(params)}.
    Provide a short poetic critique of the song and a 'visual_prompt' describing an abstract 3D spherical art representation of it.
    Output in JSON format with keys 'critique' and 'visual_prompt'.
    """
    response = await client.chat.completions.create(
        model="gpt-4o", # 既存の構成に合わせてモデルを指定
        response_format={ "type": "json_object" },
        messages=[
            {"role": "system", "content": "You are a poetic music critic and visual artist."},
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

# 4. エンドポイントの定義
@app.post("/generate")
async def generate_sphere(req: GenerateRequest):
    try:
        # ★ 修正ポイント1: リクエスト実行時に環境変数を取得し、Spotifyクライアントを初期化する
        # これにより、Render起動時の変数の読み込み遅延による認証エラーを完全に防ぐ
        client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
        
        if not client_id or not client_secret:
            raise HTTPException(status_code=500, detail="Spotify API keys are missing in environment variables.")

        sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
            client_id=client_id,
            client_secret=client_secret
        ))
        
        # ★ 修正ポイント2: 対象の楽曲が存在しなかった場合のNone対策
        features_list = sp.audio_features(req.track_id)
        if not features_list or features_list[0] is None:
            raise HTTPException(status_code=404, detail=f"Track ID {req.track_id} not found or features unavailable.")
        
        features = features_list[0]
        analysis = sp.audio_analysis(req.track_id)
        
        # 処理の実行
        params = calculate_physics_params(features, analysis)
        critique_data = await generate_critique(req.track_id, params)
        image_url = await generate_sphere_image(critique_data["visual_prompt"])
        
        return {
            "status": "success",
            "params": params,
            "critique": critique_data["critique"],
            "image_url": image_url
        }
    except spotipy.exceptions.SpotifyException as e:
        # Spotify API固有のエラーを捕捉して明確に出力
        raise HTTPException(status_code=e.http_status, detail=f"Spotify API Error: {e.msg}")
    except Exception as e:
        # その他の内部エラー
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
