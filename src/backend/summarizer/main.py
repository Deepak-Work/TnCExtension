import json
import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import db
from llm_wrapper import summarize_tnc, LLM_PROVIDER
from sentiment import get_sentiment

# Comma-separated list of allowed origins, e.g. "chrome-extension://<published-id>".
# Defaults to "*" for local development; set explicitly once the extension's
# published ID is known so a random website can't call this API directly.
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")]

# Cache hits are free/cheap and stay unlimited; only real LLM calls are capped.
DAILY_ANALYZE_BUDGET = int(os.getenv("DAILY_ANALYZE_BUDGET", "150"))

limiter = Limiter(key_func=get_remote_address)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
        "subject": row["subject"],
        "good": json.loads(row["good_json"]),
        "bad": json.loads(row["bad_json"]),
        "sentiment": json.loads(row["sentiment_json"]),
        "source": source,
        "analyzedAt": row["analyzed_at"],
        "model": row["model_used"],
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


def _friendly_error_message(e: Exception) -> str:
    text = str(e)
    if "RESOURCE_EXHAUSTED" in text or "quota" in text.lower() or "429" in text:
        return (
            f"{LLM_PROVIDER} API quota exceeded for today. Wait for the quota to reset, "
            f"switch GEMINI_MODEL/LLM_PROVIDER in .env, or use a different API key."
        )
    return text


@app.post("/analyze")
@limiter.limit("10/hour")
async def analyze(request: Request, body: AnalyzeRequest):
    if db.increment_and_get_daily_analyze_count() > DAILY_ANALYZE_BUDGET:
        return JSONResponse(
            status_code=429,
            content={"error": "This service is at capacity for today. Please try again tomorrow."},
        )

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
        return JSONResponse(status_code=500, content={"error": _friendly_error_message(e)})
