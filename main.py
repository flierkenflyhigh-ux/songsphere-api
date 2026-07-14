from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# 1. CORS設定：Vercel（フロントエンド）からの通信を明示的に許可する
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://songsphere-api-zkcl.vercel.app"  # 実際のVercelのURL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. iTunes APIへの接続とデータ取得（検索機能）
@app.get("/search")
def search_tracks(q: str):
    if not q:
        raise HTTPException(status_code=400, detail="Search query 'q' is required")

    # iTunes APIの公式エンドポイント
    itunes_url = "https://itunes.apple.com/search"
    params = {
        "term": q,
        "entity": "song",
        "limit": 10,       # 取得件数
        "country": "JP"    # 日本のストアを対象
    }

    try:
        # iTunes APIへ実際にリクエストを送信
        response = requests.get(itunes_url, params=params)
        response.raise_for_status()
        data = response.json()

        # 3. フロントエンドが要求するデータ構造（id, name, artist）に合わせて整形
        formatted_tracks = []
        for item in data.get("results", []):
            formatted_tracks.append({
                "id": str(item.get("trackId", "")),
                "name": item.get("trackName", "Unknown Track"),
                "artist": item.get("artistName", "Unknown Artist")
            })

        # フロントエンドに返す
        return {"tracks": formatted_tracks}

    except Exception as e:
        print(f"Error fetching from iTunes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch data from iTunes API")

# 稼働確認用のルートエンドポイント
@app.get("/")
def root():
    return {"status": "ok", "message": "Songsphere API is successfully running on Render!"}