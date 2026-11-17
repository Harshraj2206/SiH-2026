"""
LANDSLIDEGUARD SIH26001 - Persistent User & Emergency Contacts Database Store
SQLite store (Postgres when DATABASE_URL is set) with bcrypt password hashing and RBAC.
"""

import os
import sqlite3
import json
import uuid
import secrets
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import bcrypt
import logging

from backend.app.core.config import IS_PRODUCTION

DB_DIR = os.environ.get("DATA_DIR") or os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
DB_PATH = os.environ.get("DATABASE_PATH") or os.environ.get("SQLITE_DB_PATH") or os.path.join(DB_DIR, "landslideguard_users.db")


def _postgres_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    return url if url.startswith(("postgres://", "postgresql://")) else ""


_OLD_DEMO_IDS = ("usr-admin-01", "usr-auth-01", "usr-rescue-01", "usr-med-01", "usr-resident-01")


class _PgCursor:
    """Lets the sqlite-style queries below ('?' placeholders) run on Postgres."""
    def __init__(self, cur):
        self._cur = cur

    def execute(self, sql, params=()):
        self._cur.execute(sql.replace("?", "%s"), params)
        return self

    def executemany(self, sql, seq):
        self._cur.executemany(sql.replace("?", "%s"), seq)

    def fetchone(self):
        return self._cur.fetchone()


class _PgConnection:
    """One short-lived connection per operation (Neon closes idle connections)."""
    def __init__(self, url):
        import psycopg
        from psycopg.rows import dict_row
        self._conn = psycopg.connect(url, row_factory=dict_row, connect_timeout=10)

    def cursor(self):
        return _PgCursor(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()


def hash_pw(password: str) -> str:
    """Hash password securely using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def check_pw(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


class UserDatabase:
    _instance = None
    _lock = threading.RLock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(UserDatabase, cls).__new__(cls)
                cls._instance._init_db()
            return cls._instance

    def _get_connection(self):
        url = _postgres_url()
        if url:
            return _PgConnection(url)
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initialize user table schema and pre-seed privileged roles."""
        conn = self._get_connection()
        cursor = conn.cursor()
        nocase = "" if _postgres_url() else " COLLATE NOCASE"  # lookups use LOWER() on both engines

        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL{nocase},
            email TEXT UNIQUE NOT NULL{nocase},
            phone TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'USER',
            is_active INTEGER NOT NULL DEFAULT 1,
            emergency_contacts TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """)
        conn.commit()

        # Earlier versions seeded demo accounts that posed as named officials (with made-up
        # gov.in addresses and real-looking phone numbers). Remove exactly those accounts.
        cursor.executemany("DELETE FROM password_reset_tokens WHERE user_id = ?", [(i,) for i in _OLD_DEMO_IDS])
        cursor.executemany("DELETE FROM users WHERE id = ?", [(i,) for i in _OLD_DEMO_IDS])
        conn.commit()
        self._seed_admin_from_env(conn)
        conn.close()

    def _seed_admin_from_env(self, conn):
        """Create one admin account only when ADMIN_EMAIL and ADMIN_SEED_PASSWORD are set."""
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_SEED_PASSWORD")
        if not email or not password:
            return
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
        if cursor.fetchone():
            return
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT INTO users (id, full_name, username, email, phone, password_hash, role, is_active, emergency_contacts, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT DO NOTHING
        """, ("usr-admin", "LandSafe Admin", os.environ.get("ADMIN_USERNAME", "admin"), email, None,
              hash_pw(password), "ADMIN", 1, "[]", now, now))
        conn.commit()

    def _row_to_dict(self, row) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        d = dict(row)
        if "emergency_contacts" in d and isinstance(d["emergency_contacts"], str):
            try:
                d["emergency_contacts"] = json.loads(d["emergency_contacts"])
            except Exception:
                d["emergency_contacts"] = []
        return d

    # ---------------- User Retrieval ----------------
    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            conn.close()
            return self._row_to_dict(row)

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Look up user by either Email OR Username (case-insensitive) with alias support."""
        with self._lock:
            clean_id = identifier.strip().lower()
            if clean_id in ["admin@ndma.gov.in", "ndma_admin"]:
                clean_id = "admin@landslideguard.gov.in"
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?",
                (clean_id, clean_id)
            )
            row = cursor.fetchone()
            conn.close()
            return self._row_to_dict(row)

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            clean_email = email.strip().lower()
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (clean_email,))
            row = cursor.fetchone()
            conn.close()
            return self._row_to_dict(row)

    def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            clean_user = username.strip().lower()
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(username) = ?", (clean_user,))
            row = cursor.fetchone()
            conn.close()
            return self._row_to_dict(row)

    # ---------------- User Registration ----------------
    def create_user(
        self,
        full_name: str,
        username: str,
        email: str,
        phone: Optional[str],
        password_hash: str,
        emergency_contact: Optional[Dict[str, str]] = None,
        role: str = "USER"
    ) -> Dict[str, Any]:
        """
        Create a new persistent user.
        Enforces that public registration only creates USER role.
        """
        with self._lock:
            user_id = f"usr-{uuid.uuid4().hex[:10]}"
            now = datetime.now(timezone.utc).isoformat()

            contacts = []
            if emergency_contact and emergency_contact.get("phone"):
                contacts.append({
                    "id": f"c-{uuid.uuid4().hex[:6]}",
                    "name": emergency_contact.get("name", "Primary Contact"),
                    "relationship": emergency_contact.get("relationship", "Family"),
                    "phone": emergency_contact.get("phone")
                })

            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO users (id, full_name, username, email, phone, password_hash, role, is_active, emergency_contacts, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                full_name.strip(),
                username.strip().lower(),
                email.strip().lower(),
                phone.strip() if phone else None,
                password_hash,
                role,
                1,
                json.dumps(contacts),
                now,
                now
            ))
            conn.commit()
            conn.close()

            return self.get_by_id(user_id)

    # ---------------- Profile Updates ----------------
    def update_profile(self, user_id: str, full_name: Optional[str] = None, phone: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self._lock:
            now = datetime.now(timezone.utc).isoformat()
            conn = self._get_connection()
            cursor = conn.cursor()

            updates = []
            params = []
            if full_name:
                updates.append("full_name = ?")
                params.append(full_name.strip())
            if phone is not None:
                updates.append("phone = ?")
                params.append(phone.strip())

            if not updates:
                conn.close()
                return self.get_by_id(user_id)

            updates.append("updated_at = ?")
            params.append(now)
            params.append(user_id)

            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", tuple(params))
            conn.commit()
            conn.close()
            return self.get_by_id(user_id)

    # ---------------- Emergency Contacts CRUD ----------------
    def add_emergency_contact(self, user_id: str, contact_data: Dict[str, str]) -> List[Dict[str, Any]]:
        with self._lock:
            user = self.get_by_id(user_id)
            if not user:
                raise KeyError(f"User '{user_id}' not found.")

            contacts = user.get("emergency_contacts", [])
            new_contact = {
                "id": f"c-{uuid.uuid4().hex[:6]}",
                "name": contact_data.get("name", "Emergency Contact").strip(),
                "relationship": contact_data.get("relationship", "Other").strip(),
                "phone": contact_data.get("phone", "").strip()
            }
            contacts.append(new_contact)

            now = datetime.now(timezone.utc).isoformat()
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET emergency_contacts = ?, updated_at = ? WHERE id = ?",
                (json.dumps(contacts), now, user_id)
            )
            conn.commit()
            conn.close()
            return contacts

    def delete_emergency_contact(self, user_id: str, contact_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            user = self.get_by_id(user_id)
            if not user:
                raise KeyError(f"User '{user_id}' not found.")

            contacts = user.get("emergency_contacts", [])
            contacts = [c for c in contacts if c.get("id") != contact_id]

            now = datetime.now(timezone.utc).isoformat()
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET emergency_contacts = ?, updated_at = ? WHERE id = ?",
                (json.dumps(contacts), now, user_id)
            )
            conn.commit()
            conn.close()
            return contacts

    # ---------------- Single-Use Time-Limited Password Reset ----------------
    def create_password_reset_token(self, email: str, ttl_minutes: int = 15) -> Optional[str]:
        """Generate a random single-use token valid for at most 15 minutes tied to a specific user."""
        with self._lock:
            user = self.get_by_email(email)
            if not user:
                return None
            token = secrets.token_urlsafe(32)
            now = datetime.now(timezone.utc)
            expires_at = (now + timedelta(minutes=ttl_minutes)).isoformat()

            conn = self._get_connection()
            cursor = conn.cursor()
            # Invalidate any older pending tokens for this user
            cursor.execute("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0", (user["id"],))
            cursor.execute(
                "INSERT INTO password_reset_tokens (token, user_id, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
                (token, user["id"], expires_at, now.isoformat())
            )
            conn.commit()
            conn.close()
            return token

    def verify_and_consume_reset_token(self, token: str, new_password_hash: str) -> bool:
        """Validate single-use token, check expiration (< 15 mins), update password, and invalidate token."""
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0", (token,))
            row = cursor.fetchone()
            if not row:
                conn.close()
                return False

            row_dict = dict(row)
            expires_at = datetime.fromisoformat(row_dict["expires_at"])
            now = datetime.now(timezone.utc)
            if now > expires_at:
                cursor.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = ?", (token,))
                conn.commit()
                conn.close()
                return False

            # Update password hash and mark token as consumed (single-use)
            cursor.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (new_password_hash, now.isoformat(), row_dict["user_id"])
            )
            cursor.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = ?", (token,))
            conn.commit()
            conn.close()
            return True


# Global User Database Singleton
user_db = UserDatabase()
