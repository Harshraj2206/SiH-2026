"""
LANDSLIDEGUARD SIH26001 - Persistent User & Emergency Contacts Database Store
SQLite-backed thread-safe store with bcrypt password hashing and RBAC.
"""

import os
import sqlite3
import json
import uuid
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import bcrypt

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "landslideguard_users.db")


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

    def _get_connection(self) -> sqlite3.Connection:
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initialize user table schema and pre-seed privileged roles."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL COLLATE NOCASE,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            phone TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'USER',
            is_active INTEGER NOT NULL DEFAULT 1,
            emergency_contacts TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """)
        conn.commit()

        # Check if default accounts need seeding
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        if count == 0:
            self._seed_default_users(conn)
        conn.close()

    def _seed_default_users(self, conn: sqlite3.Connection):
        """Seed default pre-created privileged and resident accounts for SIH prototype."""
        now = datetime.now(timezone.utc).isoformat()
        default_users = [
            (
                "usr-admin-01",
                "Col. Rajesh Barua",
                "admin_ndma",
                "admin@landslideguard.gov.in",
                "+91 11-26701700",
                hash_pw("Admin@2026!"),
                "ADMIN",
                1,
                json.dumps([
                    {"id": "c-01", "name": "NDMA Operations Cell", "relationship": "Command Desk", "phone": "+91 11-26701728"}
                ]),
                now,
                now
            ),
            (
                "usr-auth-01",
                "Dr. Anamika Sharma",
                "officer_sdma",
                "officer@sdim.ner.gov.in",
                "+91 364-2224150",
                hash_pw("Officer@2026!"),
                "AUTHORITY",
                1,
                json.dumps([
                    {"id": "c-02", "name": "Shillong Emergency Ops", "relationship": "SDMA Control", "phone": "+91 364-2224151"}
                ]),
                now,
                now
            ),
            (
                "usr-rescue-01",
                "Sub-Inspector Wanbah Khonglah",
                "sdrf_commander",
                "rescue@sdrf.ner.gov.in",
                "+91 3638-232100",
                hash_pw("Rescue@2026!"),
                "RESCUE_TEAM",
                1,
                json.dumps([
                    {"id": "c-03", "name": "SDRF Control Room Nongpoh", "relationship": "Base Station", "phone": "+91 3638-232101"}
                ]),
                now,
                now
            ),
            (
                "usr-med-01",
                "Dr. Prabal Das",
                "civil_hospital",
                "medical@civilhosp.ner.gov.in",
                "+91 3638-232222",
                hash_pw("Medical@2026!"),
                "MEDICAL_CENTER",
                1,
                json.dumps([
                    {"id": "c-04", "name": "108 Ambulance Dispatch", "relationship": "Emergency Service", "phone": "108"}
                ]),
                now,
                now
            ),
            (
                "usr-resident-01",
                "Tariang Lyngdoh",
                "resident_nongpoh",
                "resident@landslideguard.gov.in",
                "+91 98620-11234",
                hash_pw("Resident@2026!"),
                "USER",
                1,
                json.dumps([
                    {"id": "c-05", "name": "Mayalang Lyngdoh", "relationship": "Brother", "phone": "+91 98620-55678"},
                    {"id": "c-06", "name": "Civil Hospital Nongpoh", "relationship": "Hospital", "phone": "+91 3638-232222"}
                ]),
                now,
                now
            )
        ]

        cursor = conn.cursor()
        cursor.executemany("""
        INSERT INTO users (id, full_name, username, email, phone, password_hash, role, is_active, emergency_contacts, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, default_users)
        conn.commit()

    def _row_to_dict(self, row: sqlite3.Row) -> Optional[Dict[str, Any]]:
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
        """Look up user by either Email OR Username (case-insensitive)."""
        with self._lock:
            clean_id = identifier.strip().lower()
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


# Global User Database Singleton
user_db = UserDatabase()
