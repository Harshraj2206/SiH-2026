import os
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.store import db_store
from backend.app.services import weather_resolver


def _payload():
    times = [f"2026-11-{d:02d}T{h:02d}:00" for d in (14, 15, 16, 17, 18, 19) for h in range(24)]
    return {
        "timezone": "Asia/Kolkata", "utc_offset_seconds": 19800,
        "current": {"time": "2026-11-17T10:00", "temperature_2m": 20.0, "precipitation": 0.2, "rain": 0.2, "weather_code": 61},
        "hourly": {"time": times, "precipitation": [1.0] * len(times),
                   "temperature_2m": [20.0] * len(times), "soil_moisture_0_to_7cm": [0.31] * len(times)},
        "daily": {"sunrise": [], "sunset": []},
    }


def test_relay_rejects_bad_token(monkeypatch):
    monkeypatch.setenv("WEATHER_RELAY_TOKEN", "secret-token")
    r = TestClient(app).post("/api/weather/relay", json={"items": []}, headers={"X-Relay-Token": "wrong"})
    assert r.status_code == 401


def test_relay_ingests_zone_weather(monkeypatch):
    monkeypatch.setenv("WEATHER_RELAY_TOKEN", "secret-token")
    client = TestClient(app)
    targets = client.get("/api/weather/relay-targets").json()["targets"]
    assert targets and all(t["url"].startswith("https://api.open-meteo.com/") for t in targets)

    t = targets[0]
    items = [{"latitude": t["latitude"], "longitude": t["longitude"], "payload": _payload()},
             {"latitude": 0.0, "longitude": 0.0, "payload": _payload()}]
    monkeypatch.setattr("backend.app.services.zone_refresh.refresh_all_zones", lambda: None)
    r = client.post("/api/weather/relay", json={"items": items}, headers={"X-Relay-Token": "secret-token"})
    assert r.status_code == 200
    body = r.json()
    assert body["accepted"] == 1 and len(body["rejected"]) == 1

    w = weather_resolver.get_global_live_weather(t["latitude"], t["longitude"])
    assert w["precipitation_24h_mm"] == 24.0
    assert w["precipitation_72h_mm"] == 72.0
    assert w["soil_moisture_m3m3"] == 0.31
    assert "relay" in w["source"]
