"""Phase 2 tests: persistence, real rain windows/forecast, shared features, zone refresh."""
import io
import json
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.store import StateStore, db_store
from backend.app.services import feature_builder, weather_resolver, zone_refresh

client = TestClient(app)


# ---------- Persistence ----------
def test_state_survives_restart():
    store = StateStore()
    sos = store.add_sos_request({"latitude": 25.8, "longitude": 91.9, "location_name": "Persist test",
                                 "people_count": 2, "severity": "HIGH", "is_trapped": False,
                                 "description": "test"}, None)
    sos_id = sos.get("sos_id") or sos.get("id")
    store.vote_community_poll("unsure", "persist-user")

    restarted = StateStore()
    assert sos_id in restarted.sos_requests
    assert restarted.poll_voters.get("persist-user") == store.poll_voters["persist-user"]


# ---------- Weather: current-hour index and real outlook ----------
def _fake_open_meteo(now: datetime, rain_per_hour: float):
    start = (now - timedelta(days=3)).replace(hour=0, minute=0)
    times = [(start + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(6 * 24)]
    return {
        "current": {"time": now.strftime("%Y-%m-%dT%H:%M"), "precipitation": 0.0, "weather_code": 61},
        "daily": {}, "timezone": "Asia/Kolkata",
        "hourly": {"time": times, "precipitation": [rain_per_hour] * len(times),
                   "temperature_2m": [20.0] * len(times), "soil_moisture_0_to_7cm": [0.3] * len(times)},
    }


def test_rain_windows_use_current_hour_and_forecast(monkeypatch):
    now = datetime(2026, 11, 17, 14, 15)
    payload = json.dumps(_fake_open_meteo(now, 1.0)).encode()

    class Resp(io.BytesIO):
        def __enter__(self): return self
        def __exit__(self, *a): return False

    monkeypatch.setattr(weather_resolver.urllib.request, "urlopen", lambda *a, **k: Resp(payload))
    weather_resolver._WEATHER_CACHE.clear()
    data = weather_resolver.get_global_live_weather(25.83, 91.89)
    assert data["precipitation_24h_mm"] == 24.0
    assert data["precipitation_72h_mm"] == 72.0
    assert [o["hour_offset"] for o in data["rainfall_outlook"]] == [6, 12, 24]
    assert all(o["rainfall_24h_mm"] == 24.0 for o in data["rainfall_outlook"])
    weather_resolver._WEATHER_CACHE.clear()


# ---------- Shared features ----------
def _fake_inputs(monkeypatch, rain=40.0):
    weather = {"rainfall_24h_mm": rain, "rainfall_72h_mm": None if rain is None else rain * 2,
               "soil_moisture_m3m3": 0.4, "source": "test", "observation_time": "2026-11-17T14:00",
               "freshness_status": "LIVE",
               "rainfall_outlook": [{"hour_offset": h, "rainfall_24h_mm": 60.0, "rainfall_72h_mm": 100.0}
                                    for h in (6, 12, 24)]}
    monkeypatch.setattr(feature_builder, "fetch_live_meteorology", lambda lat, lon: weather)
    monkeypatch.setattr(feature_builder, "get_terrain_elevation_and_slope",
                        lambda lat, lon: {"slope_deg": 28.0, "elevation_amsl": 900.0, "is_dynamic": True, "source": "dem"})


def test_shared_features_give_real_forecast(monkeypatch):
    _fake_inputs(monkeypatch)
    built = feature_builder.build_features(25.83, 91.89)
    assert built["context"]["latitude"] == 25.83 and built["features"]["ndvi"] is None
    prediction, trend = feature_builder.score_features(built)
    assert prediction["risk_score"] is not None
    assert [t["timeframe"] for t in trend] == ["Current", "+6h", "+12h", "+24h"]
    assert trend[1]["predicted_rainfall_mm"] == 60.0


def test_missing_rain_is_not_scored(monkeypatch):
    _fake_inputs(monkeypatch, rain=None)
    prediction, trend = feature_builder.score_features(feature_builder.build_features(25.83, 91.89))
    assert prediction["risk_score"] is None and trend == []


def test_inspector_and_zone_score_a_point_the_same(monkeypatch):
    _fake_inputs(monkeypatch)
    zone = db_store.zones["NER-042"]
    zone_refresh.refresh_zone(zone, force=True)
    lat, lng = zone["center"]["lat"], zone["center"]["lng"]
    inspected = client.post("/api/telemetry/inspect", json={"latitude": lat, "longitude": lng}).json()
    assert inspected["ml_base_score"] == zone["ml_base_score"]
    assert zone["inference_status"] == "LIVE"


def test_zone_keeps_last_known_values_when_live_data_missing(monkeypatch):
    zone = db_store.zones["NER-011"]
    _fake_inputs(monkeypatch)
    zone_refresh.refresh_zone(zone, force=True)
    _fake_inputs(monkeypatch, rain=None)
    before = zone["risk_score"]
    zone_refresh.refresh_zone(zone, force=True)
    assert zone["risk_score"] == before and before is not None
    assert zone["inference_status"] == "STALE_LAST_KNOWN"
