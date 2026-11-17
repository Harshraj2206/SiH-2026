import urllib.error

from backend.app.services import weather_resolver
from backend.tests.test_weather_relay import _payload

LAT, LON = 31.2345, 77.1234


def _rate_limited(*args, **kwargs):
    raise urllib.error.HTTPError("https://api.open-meteo.com", 429, "Too Many Requests", None, None)


def _payload_at(lat, lon):
    p = _payload()
    p["latitude"], p["longitude"] = lat, lon
    return p


def _fresh(monkeypatch):
    monkeypatch.setattr(weather_resolver.urllib.request, "urlopen", _rate_limited)
    monkeypatch.setattr(weather_resolver, "_fetch_secondary_live_weather", lambda *a, **k: None)
    monkeypatch.setattr(weather_resolver.time, "sleep", lambda s: None)
    weather_resolver._WEATHER_CACHE.pop(weather_resolver._cache_key(LAT, LON), None)


def test_browser_weather_used_when_server_is_rate_limited(monkeypatch):
    _fresh(monkeypatch)
    weather_resolver.use_client_weather(LAT, LON, _payload_at(31.25, 77.125))
    w = weather_resolver.get_global_live_weather(LAT, LON)
    assert w["precipitation_24h_mm"] == 24.0
    assert w["precipitation_72h_mm"] == 72.0
    assert w["soil_moisture_m3m3"] == 0.31
    assert "browser" in w["source"]
    # Never shared with other users through the cache
    cached = weather_resolver._WEATHER_CACHE.get(weather_resolver._cache_key(LAT, LON))
    assert not cached or not cached["data"].get("client_supplied")


def test_browser_weather_for_another_point_is_ignored(monkeypatch):
    _fresh(monkeypatch)
    weather_resolver.use_client_weather(LAT, LON, _payload_at(12.0, 77.0))
    assert weather_resolver.get_global_live_weather(LAT, LON)["status"] == "UNAVAILABLE"


def test_malformed_browser_weather_is_ignored(monkeypatch):
    _fresh(monkeypatch)
    weather_resolver.use_client_weather(LAT, LON, {"latitude": LAT, "longitude": LON, "current": "x"})
    assert weather_resolver.get_global_live_weather(LAT, LON)["status"] == "UNAVAILABLE"
