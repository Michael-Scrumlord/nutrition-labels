# database.py
#
# All SQLite interaction lives here.
# Every function opens a connection, runs one query, and returns the result.
# Nothing else in the app writes SQL.

import os
import sqlite3
from app.config import settings


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    """
    Open a SQLite connection in read-only mode.
    Using row_factory = sqlite3.Row means you can access columns by name:
        row["calories"]  instead of  row[2]

    We use URI mode with `mode=ro` to enforce read-only access at the SQLite level,
    and `nolock=1` so the database works on network-mounted filesystems
    (Docker volumes, NFS shares) that don't support POSIX locks.
    """
    path = db_path or settings.db_path
    abs_path = os.path.abspath(path)
    uri = f"file:{abs_path}?mode=ro&nolock=1"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _fts_query(query: str) -> str:
    """
    Build a prefix-match FTS5 MATCH string from a user search query.
    Each whitespace-separated term becomes a quoted prefix: "term"*
    This matches "chick br" → foods containing words starting with "chick" AND "br".
    Double-quotes in the input are stripped to avoid breaking FTS5 syntax.
    """
    terms = query.strip().split()
    if not terms:
        return '""'
    return " ".join(f'"{t.replace(chr(34), "")}"*' for t in terms)


def search_foods(query: str, limit: int = 200, db_path: str | None = None) -> list[sqlite3.Row]:
    """
    Full-text search via the FTS5 food_search index.
    Returns up to `limit` rows ordered by BM25 relevance score.
    The caller (search.py) re-ranks and trims to 40 results.

    Returned columns: fdc_id, description, data_type
    """
    fts = _fts_query(query)
    with get_connection(db_path) as conn:
        return conn.execute(
            """
            SELECT fm.fdc_id, fm.description, fm.data_type
            FROM food_search
            JOIN food_macros fm ON fm.fdc_id = food_search.rowid
            WHERE food_search MATCH ?
            ORDER BY food_search.rank
            LIMIT ?
            """,
            (fts, limit),
        ).fetchall()


def get_food_by_id(fdc_id: int, db_path: str | None = None) -> sqlite3.Row | None:
    """
    Return all columns for one food, or None if the fdc_id doesn't exist.
    """
    with get_connection(db_path) as conn:
        return conn.execute(
            "SELECT * FROM food_macros WHERE fdc_id = ?",
            (fdc_id,),
        ).fetchone()


def get_portions_by_id(fdc_id: int, db_path: str | None = None) -> list[sqlite3.Row]:
    """
    Return the known portion sizes for one food.
    A food may have zero portions — that's fine, we just show the dropdown units.
    """
    with get_connection(db_path) as conn:
        return conn.execute(
            "SELECT amount, modifier, gram_weight FROM food_portions WHERE fdc_id = ?",
            (fdc_id,),
        ).fetchall()


def get_foods_by_ids(fdc_ids: list[int], db_path: str | None = None) -> list[sqlite3.Row]:
    """
    Return macro rows for multiple foods in a single query.
    Batch lookup helper for recipe-level macro math (see app/nutrition.py).
    The caller should verify that len(result) == len(fdc_ids) to catch unknown IDs.
    """
    if not fdc_ids:
        return []
    placeholders = ", ".join("?" for _ in fdc_ids)
    with get_connection(db_path) as conn:
        return conn.execute(
            f"SELECT * FROM food_macros WHERE fdc_id IN ({placeholders})",
            fdc_ids,
        ).fetchall()
