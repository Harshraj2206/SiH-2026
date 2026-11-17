"""Test setup: keep runtime state in a fresh temporary database, never the real one."""
import os
import tempfile

_state_db = os.path.join(tempfile.mkdtemp(prefix="landsafe_test_"), "state.db")
os.environ["STATE_DATABASE_PATH"] = _state_db
os.environ.pop("DATABASE_URL", None)
os.environ["DISABLE_ZONE_REFRESH"] = "1"  # no background network loop during tests

# Test-only accounts, created in the temporary database above (the real app seeds none).
from backend.app.database.user_store import user_db, hash_pw  # noqa: E402

for _name, _user, _email, _pw, _role in [
    ("Test Admin", "admin", "admin@landslideguard.gov.in", "Admin@2026!", "ADMIN"),
    ("Test Officer", "officer", "officer@sdim.ner.gov.in", "Officer@2026!", "AUTHORITY"),
    ("Test Rescue", "rescue", "rescue@sdrf.ner.gov.in", "Rescue@2026!", "RESCUE_TEAM"),
    ("Test Medical", "medical", "medical@civilhosp.ner.gov.in", "Medical@2026!", "MEDICAL_CENTER"),
    ("Test Resident", "resident_nongpoh", "resident@landslideguard.gov.in", "Resident@2026!", "USER"),
]:
    if not user_db.get_by_email(_email):
        user_db.create_user(_name, _user, _email, None, hash_pw(_pw), role=_role)


import pytest  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def scored_zones():
    """Score every zone once through the real pipeline, with fixed weather and terrain inputs."""
    from backend.app.database.store import db_store
    from backend.app.services import feature_builder, zone_refresh

    weather = {"rainfall_24h_mm": 80.0, "rainfall_72h_mm": 160.0, "soil_moisture_m3m3": 0.42,
               "source": "test", "observation_time": "2026-11-17T14:00", "freshness_status": "LIVE",
               "rainfall_outlook": []}
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(feature_builder, "fetch_live_meteorology", lambda lat, lon: weather)
        mp.setattr(feature_builder, "get_terrain_elevation_and_slope",
                   lambda lat, lon: {"slope_deg": 30.0, "elevation_amsl": 1200.0, "is_dynamic": True, "source": "test"})
        for zone in list(db_store.zones.values()):
            zone_refresh.refresh_zone(zone, force=True)
    yield
