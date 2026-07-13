import os
import json
import stripe
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import numpy as np
from openai import AsyncOpenAI

app = FastAPI(title="Songsphere API")

# CORS設定（Vercelからの通信を許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 各種APIクライアント初期化
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"), 
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET")
))
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 定数：Stripe Price IDs
ENTRY_PRICE_ID = "price_1Tru7RADyXuVm0kwpwOnza38"
PRO_PRICE_ID = "price_1Tru7RADyXuVm0kwqSpqsfPs"

# データベース接続関数
def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

# サーバー起動時の初期化処理（DBテーブルの自動生成）
@app.on_event("startup")
def startup_event():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS spheres (
            id SERIAL PRIMARY KEY,
            track_id VARCHAR(255) UNIQUE,
            track_name VARCHAR(255),
            artist_name VARCHAR(255),
            features JSONB,
            ai_insights JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # ※ここに50曲の初期シードデータ投入ロジックを後続で追加します
    conn.commit()
    cur.close()
    conn.close()

# リクエストモデル
class GenerateRequest(BaseModel):
    spotify_track_id: str
    lyrics_key_phrase: str = ""

class UpgradeRequest(BaseModel):
    subscription_id: str

@app.get("/")
def read_root():
    return {"status": "Songsphere API is running with DB and Stripe"}

# スフィア生成API
@app.post("/api/generate")
async def generate_sphere(request: GenerateRequest):
    try:
        track = sp.track(request.spotify_track_id)
        features = sp.audio_features(request.spotify_track_id)[0]
        
        friction = features['energy'] * (1 - features['danceability']) * 100
        organic_index = ((features['acousticness'] + features['speechiness']) / 2) * 100

        track_data = {
            "name": track['name'],
            "artist": track['artists'][0]['name'],
            "BPM": round(features['tempo']),
            "Rhythmic_Friction": round(friction),
            "Vocal_Organic_Index": round(organic_index)
        }

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

# StripeプランアップグレードAPI（差額決済ロジック）
@app.post("/api/upgrade")
async def upgrade_subscription(req: UpgradeRequest):
    try:
        subscription = stripe.Subscription.retrieve(req.subscription_id)
        
        # 現在のサブスクリプションのアイテムIDを取得し、プロプランへ即時変更
        updated_subscription = stripe.Subscription.modify(
            req.subscription_id,
            items=[{
                'id': subscription['items']['data'][0]['id'],
                'price': PRO_PRICE_ID,
            }],
            proration_behavior='always_invoice', # 即座に差額を計算し請求書を発行
            billing_cycle_anchor='now',          # 請求サイクルを今日から再スタート
        )
        return {"status": "success", "subscription_status": updated_subscription['status']}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
# --- 音楽的物理パラメータ変換関数 ---
def calculate_physics_params(audio_features, audio_analysis):
    # 1. Rhythmic_Friction
    friction = audio_features['energy'] * (1 - audio_features['danceability']) * 100
    
    # 2. Instrument_Role_Contrast
    contrast = (1 - audio_features['instrumentalness']) * 100
    
    # 3. Dynamic_Shift (Loudnessの標準偏差から計算)
    segments = audio_analysis.get('segments', [])
    loudness_values = [seg['loudness_start'] for seg in segments]
    dynamic_shift = np.std(loudness_values) * 10  # W=10で正規化
    
    # 4. Vocal_Organic_Index
    organic = ((audio_features['acousticness'] + audio_features['speechiness']) / 2) * 100
    
    return {
        "rhythmic_friction": round(friction, 2),
        "instrument_role_contrast": round(contrast, 2),
        "dynamic_shift": round(dynamic_shift, 2),
        "vocal_organic_index": round(organic, 2)
    }

# --- エンドポイント実装 ---
@app.post("/generate")
async def generate_sphere(req: GenerateRequest):
    try:
        # Spotifyデータの取得
        features = sp.audio_features(req.track_id)[0]
        analysis = sp.audio_analysis(req.track_id)
        
        # 独自パラメータ計算
        params = calculate_physics_params(features, analysis)
        
        # ここでLLM(OpenAI)を呼び出し、パラメータとアルバム文脈を解析させる
        # 処理を続行...
        return {"status": "success", "params": params}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# --- 追加: LLM連携とアルバム文脈解析 ---
async def generate_critique(track_id, params):
    # 楽曲とアルバム情報の取得
    track = sp.track(track_id)
    album = sp.album(track['album']['id'])
    track_name = track['name']
    album_name = album['name']
    
    # プロンプトの組み立て（アルバム文脈を強調）
    prompt = f"""
    楽曲「{track_name}」 (アルバム: {album_name}) を分析してください。
    【物理パラメータ】: {params}
    
    【依頼事項】:
    1. アルバム全体が持つテーマと、その中でこの曲が占める役割を深層分析し、3つの要点で音楽的洞察を出力してください。
    2. アルバムの文脈を加味した上で、この楽曲を「丸い球体（マテリアル・スフィア）」として可視化するためのプロンプトを生成してください。
    
    【出力形式】: JSON
    {{
        "critique": ["要点1", "要点2", "要点3"],
        "visual_prompt": "球体の材質や光沢、テクスチャを物理パラメータに基づいて詳細に記述"
    }}
    """
    
    # OpenAI API呼び出し
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={ "type": "json_object" }
    )
    return json.loads(response.choices[0].message.content)

# --- 更新: エンドポイントを非同期に修正 ---
@app.post("/generate")
async def generate_sphere(req: GenerateRequest):
    try:
        # Spotifyデータの取得
        features = sp.audio_features(req.track_id)[0]
        analysis = sp.audio_analysis(req.track_id)
        params = calculate_physics_params(features, analysis)
        
        # LLMによる批評とプロンプト生成
        result = await generate_critique(req.track_id, params)
        
        return {
            "status": "success",
            "params": params,
            "critique": result["critique"],
            "visual_prompt": result["visual_prompt"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
