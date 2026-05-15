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
    Open a SQLite connection.
    Using row_factory = sqlite3.Row means you can access columns by name:
        row["calories"]  instead of  row[2]

    We use URI mode with `nolock=1` so the database works on network-mounted
    filesystems (Docker volumes, NFS shares) that don't support POSIX locks.
    The database is read-only at runtime — all writes happen only during the
    build step (data/build_db.py).
    """
    path = db_path or settings.db_path
    # Convert to absolute path for the URI
    abs_path = os.path.abspath(path)
    uri = f"file:{abs_path}?nolock=1"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def search_foods(query: str, limit: int = 80, db_path: str | None = None) -> list[sqlite3.Row]:
    """
    Return food rows whose description contains the query string (case-insensitive).
    We fetch more than the final limit here because the ranking step in search.py
    will sort and trim the results down to 40.
    """
    with get_connection(db_path) as conn:
        return conn.execute(
            "SELECT fdc_id, description FROM food_macros "
            "WHERE LOWER(description) LIKE LOWER(?) LIMIT ?",
            (f"%{query}%", limit),
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
    Used by the PDF generation route, which needs all ingredients at once.
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
