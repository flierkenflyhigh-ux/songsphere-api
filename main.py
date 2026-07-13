import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
    track_name: str
    artist_name: str

async def generate_critique_and_params(track_name: str, artist_name: str):
    """OpenAI APIを使用して、楽曲の推測パラメータ・批評を一括生成する"""
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    prompt = f"""
    You are a poetic music critic and visual artist.
    Analyze the song "{track_name}" by {artist_name}.
    Based on your knowledge of this song's sonic profile (tempo, energy, valence), generate physics parameters for an abstract 3D spherical art concept.
    
    Output strictly in JSON format with the following keys:
    - "physics_params": A dictionary containing "color_intensity" (float 0.0-1.0), "rotation_speed" (float 0.0-2.0), and "turbulence" (float 0.0-1.0).
    - "critique": A short poetic critique of the song.
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

@app.post("/generate")
async def generate_sphere(req: GenerateRequest):
    try:
        # GPT-4oによるパラメータと批評の生成のみを実行
        ai_data = await generate_critique_and_params(req.track_name, req.artist_name)
        
        return {
            "status": "success",
            "track_name": req.track_name,
            "artist_name": req.artist_name,
            "params": ai_data["physics_params"],
            "critique": ai_data["critique"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
