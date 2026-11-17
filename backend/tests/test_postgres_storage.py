"""Postgres paths of the user store and record store. Runs only when TEST_POSTGRES_URL is set."""
import os

import pytest

PG_URL = os.environ.get("TEST_POSTGRES_URL", "")
pytestmark = pytest.mark.skipif(not PG_URL, reason="TEST_POSTGRES_URL not set")


@pytest.fixture
def pg(monkeypatch):
    import psycopg
    with psycopg.connect(PG_URL, autocommit=True) as c:
        c.execute("DROP TABLE IF EXISTS password_reset_tokens, users, store_records")
    monkeypatch.setenv("DATABASE_URL", PG_URL)
    return PG_URL


def test_user_store_on_postgres(pg):
    from backend.app.database.user_store import UserDatabase, hash_pw, check_pw
    db = object.__new__(UserDatabase)  # fresh instance, not the module singleton
    db._init_db()
    db._init_db()  # second start must not re-seed or fail

    admin = db.get_by_identifier("ADMIN_NDMA")
    assert admin and admin["role"] == "ADMIN"

    user = db.create_user("Test User", "Tester1", "T@Example.com", None, hash_pw("pw-123456"))
    assert db.get_by_email("t@example.com")["id"] == user["id"]
    assert check_pw("pw-123456", db.get_by_username("tester1")["password_hash"])

    contacts = db.add_emergency_contact(user["id"], {"name": "Mum", "phone": "123"})
    assert db.get_by_id(user["id"])["emergency_contacts"] == contacts
    assert db.update_profile(user["id"], full_name="New Name")["full_name"] == "New Name"

    token = db.create_password_reset_token("t@example.com")
    assert db.verify_and_consume_reset_token(token, hash_pw("new-pw-123"))
    assert not db.verify_and_consume_reset_token(token, hash_pw("again"))
    assert check_pw("new-pw-123", db.get_by_id(user["id"])["password_hash"])


def test_record_store_reconnects_after_dropped_connection(pg):
    import psycopg
    from backend.app.database.persistence import RecordStore
    store = RecordStore()
    store.replace("reports", {"r1": {"a": 1}})

    # Simulate Neon closing the idle connection
    pid = store._conn.info.backend_pid
    with psycopg.connect(PG_URL, autocommit=True) as c:
        c.execute("SELECT pg_terminate_backend(%s)", (pid,))

    store.replace("reports", {"r2": {"b": 2}})
    assert store.load("reports") == {"r2": {"b": 2}}
