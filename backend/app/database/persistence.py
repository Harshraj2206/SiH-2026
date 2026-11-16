"""
Durable storage for the operational state store (reports, SOS, incidents, ...).

Records are kept as JSON documents in one table: (collection, key) -> data.
- Default: SQLite file STATE_DATABASE_PATH (or DATA_DIR/landsafe_state.db).
- If DATABASE_URL is set (postgres://...), a Postgres database is used instead.
  Use this on hosts with an ephemeral filesystem (e.g. Render free tier).
"""

import json
import os
import sqlite3
import threading
from typing import Any, Dict

from backend.app.core.config import DATA_DIR


class RecordStore:
    def __init__(self):
        self._lock = threading.Lock()
        url = os.environ.get("DATABASE_URL", "").strip()
        self.is_postgres = url.startswith(("postgres://", "postgresql://"))
        if self.is_postgres:
            import psycopg  # only needed when a Postgres URL is configured
            self._conn = psycopg.connect(url, autocommit=True)
            self._ph = "%s"
        else:
            path = os.environ.get("STATE_DATABASE_PATH") or os.path.join(DATA_DIR, "landsafe_state.db")
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
            self._conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
            self._ph = "?"
        self._execute(
            "CREATE TABLE IF NOT EXISTS store_records ("
            "collection TEXT NOT NULL, record_key TEXT NOT NULL, data TEXT NOT NULL, "
            "PRIMARY KEY (collection, record_key))"
        )

    def _execute(self, sql: str, params: tuple = ()):
        cur = self._conn.cursor()
        cur.execute(sql.replace("?", self._ph), params)
        return cur

    def is_empty(self) -> bool:
        with self._lock:
            return self._execute("SELECT COUNT(*) FROM store_records").fetchone()[0] == 0

    def load(self, collection: str) -> Dict[str, Any]:
        with self._lock:
            rows = self._execute(
                "SELECT record_key, data FROM store_records WHERE collection = ?", (collection,)
            ).fetchall()
        return {key: json.loads(data) for key, data in rows}

    def replace(self, collection: str, records: Dict[str, Any]):
        """Write the full contents of one collection (delete + insert in one transaction)."""
        with self._lock:
            self._execute("BEGIN")
            try:
                self._execute("DELETE FROM store_records WHERE collection = ?", (collection,))
                for key, value in records.items():
                    self._execute(
                        "INSERT INTO store_records (collection, record_key, data) VALUES (?, ?, ?)",
                        (collection, str(key), json.dumps(value, default=str)),
                    )
                self._execute("COMMIT")
            except Exception:
                self._execute("ROLLBACK")
                raise
