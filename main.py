from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
import json
from openai import OpenAI
from supabase import create_client, Client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://songspere-api-zkcl.vercel.app", 
        "https://songsphere-api-zkcl.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/search")
def search_tracks(q: str):
    if not q:
        raise HTTPException(status_code=400, detail="Search query 'q' is required")
    itunes_url = "https://itunes.apple.com/search"
    params = {"term": q, "entity": "song", "limit": 10, "country": "JP"}
    try:
        response = requests.get(itunes_url, params=params)
        response.raise_for_status()
        data = response.json()
        formatted_tracks = []
        for item in data.get("results", []):
            formatted_tracks.append({
                "id": str(item.get("trackId", "")),
                "name": item.get("trackName", "Unknown Track"),
                "artist": item.get("artistName", "Unknown Artist")
            })
        return {"tracks": formatted_tracks}
    except Exception as e:
        print(f"Error fetching from iTunes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch data from iTunes API")

class GenerateRequest(BaseModel):
    track_name: str
    artist_name: str
    itunes_track_id: str

@app.post("/generate")
def generate_sphere(req: GenerateRequest):
    api_key = os.environ.get("OPENAI_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")

    if not all([api_key, supabase_url, supabase_key]):
        raise HTTPException(status_code=500, detail="API keys are missing.")

    client = OpenAI(api_key=api_key)
    supabase: Client = create_client(supabase_url, supabase_key)

    try:
        # 1. 既存キャッシュの確認（既に生成されていればパラメータを返す）
        existing = supabase.table("spheres").select("*").eq("itunes_track_id", req.itunes_track_id).execute()
        if existing.data and len(existing.data) > 0:
            cached_data = existing.data[0]
            return {
                "itunes_track_id": cached_data["itunes_track_id"],
                "critique": json.loads(cached_data["critique_json"]),
                "parameters": json.loads(cached_data["parameters_json"]),
                "is_cached": True
            }

        # 2. LLMによるテキスト＆パラメータ生成（DALL-Eは使わない）
        system_prompt = """
        あなたは音楽批評AIです。指定された楽曲について、以下のJSONを生成してください。
        1. critique: アルバムの文脈や楽曲の背景を含めた、3つの要点に絞った音楽的洞察（配列）。
        2. parameters: この楽曲をフロントエンドの3DスフィアUIで描画するための数値パラメータ。
           - color_main: 楽曲のコアを表すメインカラー（HEXコード）
           - color_sub: アクセントやノイズを表すサブカラー（HEXコード）
           - speed: リズムやBPMに基づく回転・波打ちの速度（0.0〜1.0）
           - distortion: 摩擦熱や音の歪み、ノイズの強さ（0.0〜1.0）
           - size_shift: ダイナミクスの重力・構成のメリハリの強さ（0.0〜1.0）
        """
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Track: {req.track_name}, Artist: {req.artist_name}"}
            ]
        )
        
        result_data = json.loads(response.choices[0].message.content)
        critique = result_data.get("critique", [])
        parameters = result_data.get("parameters", {})

        # 3. メタデータと「描画パラメータ」をSupabase Databaseに保存
        supabase.table("spheres").insert({
            "itunes_track_id": req.itunes_track_id,
            "track_name": req.track_name,
            "artist_name": req.artist_name,
            "critique_json": json.dumps(critique),
            "parameters_json": json.dumps(parameters)
        }).execute()

        return {
            "itunes_track_id": req.itunes_track_id,
            "critique": critique,
            "parameters": parameters,
            "is_cached": False
        }

    except Exception as e:
        print(f"Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"status": "ok", "message": "Songsphere Parametric API is running!"}