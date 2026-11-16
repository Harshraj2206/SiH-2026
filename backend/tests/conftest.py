"""Test setup: keep runtime state in a fresh temporary database, never the real one."""
import os
import tempfile

_state_db = os.path.join(tempfile.mkdtemp(prefix="landsafe_test_"), "state.db")
os.environ["STATE_DATABASE_PATH"] = _state_db
os.environ.pop("DATABASE_URL", None)
os.environ["DISABLE_ZONE_REFRESH"] = "1"  # no background network loop during tests
