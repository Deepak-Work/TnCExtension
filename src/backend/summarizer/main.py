import json
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import db
from llm_wrapper import summarize_tnc, LLM_PROVIDER
from sentiment import get_sentiment

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your needs
    allow_methods=["*"],
    allow_headers=["*"],
)


class CacheCheckRequest(BaseModel):
    documentKey: str
    contentHash: str


class AnalyzeRequest(BaseModel):
    documentKey: str
    url: str
    title: str = ""
    text: str
    contentHash: str


def _cached_row_to_response(row: dict, source: str) -> dict:
    return {
        "documentKey": row["document_key"],
        "url": row["url"],
        "title": row["title"],
        "good": json.loads(row["good_json"]),
        "bad": json.loads(row["bad_json"]),
        "sentiment": json.loads(row["sentiment_json"]),
        "source": source,
        "analyzedAt": row["analyzed_at"],
    }


@app.post("/cache/check")
async def cache_check(body: CacheCheckRequest):
    row = db.get_cached(body.documentKey)
    if row is None:
        return {"hit": False}

    hash_matches = row["content_hash"] == body.contentHash
    if hash_matches and not db.is_stale(row):
        db.touch_checked(body.documentKey)
        return {"hit": True, "analysis": _cached_row_to_response(row, "cache")}

    return {"hit": False}


@app.post("/analyze")
async def analyze(body: AnalyzeRequest):
    try:
        summary = summarize_tnc(body.text)
        sentiment = get_sentiment(summary["subject"])

        row = db.upsert(
            document_key=body.documentKey,
            url=body.url,
            title=body.title,
            content_hash=body.contentHash,
            subject=summary["subject"],
            good=summary["good"],
            bad=summary["bad"],
            sentiment=sentiment,
            model_used=LLM_PROVIDER,
        )
        return _cached_row_to_response(row, "fresh")
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
