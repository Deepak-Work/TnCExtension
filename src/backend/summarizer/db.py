import os
import sqlite3
import json
from datetime import datetime, timezone
from contextlib import contextmanager

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "tnc_cache.db")

CACHE_TTL_DAYS = float(os.getenv("CACHE_TTL_DAYS", "7"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def _connect():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                document_key TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT,
                content_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_updated_at TEXT NOT NULL,
                last_checked_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                document_key TEXT PRIMARY KEY REFERENCES documents(document_key),
                subject TEXT,
                good_json TEXT NOT NULL,
                bad_json TEXT NOT NULL,
                sentiment_json TEXT NOT NULL,
                model_used TEXT,
                created_at TEXT NOT NULL
            )
        """)


init_db()


def get_cached(document_key: str):
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT d.document_key, d.url, d.title, d.content_hash, d.last_checked_at, d.last_updated_at,
                   a.subject, a.good_json, a.bad_json, a.sentiment_json, a.model_used, a.created_at AS analyzed_at
            FROM documents d
            JOIN analyses a ON a.document_key = d.document_key
            WHERE d.document_key = ?
            """,
            (document_key,),
        ).fetchone()
    if row is None:
        return None
    return dict(row)


def is_stale(row: dict, ttl_days: float = CACHE_TTL_DAYS) -> bool:
    last_checked = datetime.fromisoformat(row["last_checked_at"])
    age_days = (datetime.now(timezone.utc) - last_checked).total_seconds() / 86400
    return age_days > ttl_days


def touch_checked(document_key: str):
    with _connect() as conn:
        conn.execute(
            "UPDATE documents SET last_checked_at = ? WHERE document_key = ?",
            (_now(), document_key),
        )


def upsert(document_key: str, url: str, title: str, content_hash: str,
           subject: str, good: list, bad: list, sentiment: list, model_used: str):
    now = _now()
    with _connect() as conn:
        existing = conn.execute(
            "SELECT content_hash, created_at FROM documents WHERE document_key = ?",
            (document_key,),
        ).fetchone()

        created_at = existing["created_at"] if existing else now

        conn.execute(
            """
            INSERT INTO documents (document_key, url, title, content_hash, created_at, last_updated_at, last_checked_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(document_key) DO UPDATE SET
                url = excluded.url,
                title = excluded.title,
                content_hash = excluded.content_hash,
                last_updated_at = excluded.last_updated_at,
                last_checked_at = excluded.last_checked_at
            """,
            (document_key, url, title, content_hash, created_at, now, now),
        )

        conn.execute(
            """
            INSERT INTO analyses (document_key, subject, good_json, bad_json, sentiment_json, model_used, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(document_key) DO UPDATE SET
                subject = excluded.subject,
                good_json = excluded.good_json,
                bad_json = excluded.bad_json,
                sentiment_json = excluded.sentiment_json,
                model_used = excluded.model_used,
                created_at = excluded.created_at
            """,
            (document_key, subject, json.dumps(good), json.dumps(bad), json.dumps(sentiment), model_used, now),
        )

    return get_cached(document_key)
