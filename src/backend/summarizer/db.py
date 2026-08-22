import os
import json
from datetime import datetime, timezone, date
from contextlib import contextmanager

from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

load_dotenv()

CACHE_TTL_DAYS = float(os.getenv("CACHE_TTL_DAYS", "7"))
DATABASE_URL = os.environ["DATABASE_URL"]

# Small pool sized for a serverless container - Postgres has a hard connection cap
# and multiple Cloud Run instances can spin up concurrently, so this stays modest.
pool = ConnectionPool(
    conninfo=DATABASE_URL,
    min_size=1,
    max_size=5,
    kwargs={"row_factory": dict_row},
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def _connect():
    with pool.connection() as conn:
        yield conn
        conn.commit()


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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS request_budget (
                day TEXT PRIMARY KEY,
                analyze_count INTEGER NOT NULL DEFAULT 0
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
            WHERE d.document_key = %s
            """,
            (document_key,),
        ).fetchone()
    return dict(row) if row else None


def is_stale(row: dict, ttl_days: float = CACHE_TTL_DAYS) -> bool:
    last_checked = datetime.fromisoformat(row["last_checked_at"])
    age_days = (datetime.now(timezone.utc) - last_checked).total_seconds() / 86400
    return age_days > ttl_days


def touch_checked(document_key: str):
    with _connect() as conn:
        conn.execute(
            "UPDATE documents SET last_checked_at = %s WHERE document_key = %s",
            (_now(), document_key),
        )


def upsert(document_key: str, url: str, title: str, content_hash: str,
           subject: str, good: list, bad: list, sentiment: list, model_used: str):
    now = _now()
    with _connect() as conn:
        existing = conn.execute(
            "SELECT content_hash, created_at FROM documents WHERE document_key = %s",
            (document_key,),
        ).fetchone()

        created_at = existing["created_at"] if existing else now

        conn.execute(
            """
            INSERT INTO documents (document_key, url, title, content_hash, created_at, last_updated_at, last_checked_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (document_key) DO UPDATE SET
                url = EXCLUDED.url,
                title = EXCLUDED.title,
                content_hash = EXCLUDED.content_hash,
                last_updated_at = EXCLUDED.last_updated_at,
                last_checked_at = EXCLUDED.last_checked_at
            """,
            (document_key, url, title, content_hash, created_at, now, now),
        )

        conn.execute(
            """
            INSERT INTO analyses (document_key, subject, good_json, bad_json, sentiment_json, model_used, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (document_key) DO UPDATE SET
                subject = EXCLUDED.subject,
                good_json = EXCLUDED.good_json,
                bad_json = EXCLUDED.bad_json,
                sentiment_json = EXCLUDED.sentiment_json,
                model_used = EXCLUDED.model_used,
                created_at = EXCLUDED.created_at
            """,
            (document_key, subject, json.dumps(good), json.dumps(bad), json.dumps(sentiment), model_used, now),
        )

    return get_cached(document_key)


def increment_and_get_daily_analyze_count() -> int:
    """Atomically increments today's /analyze counter (UTC day) and returns the new total."""
    today = date.today().isoformat()
    with _connect() as conn:
        row = conn.execute(
            """
            INSERT INTO request_budget (day, analyze_count)
            VALUES (%s, 1)
            ON CONFLICT (day) DO UPDATE SET analyze_count = request_budget.analyze_count + 1
            RETURNING analyze_count
            """,
            (today,),
        ).fetchone()
    return row["analyze_count"]
