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


def test_saved_backup_weather_does_not_hide_browser_weather(monkeypatch):
    _fresh(monkeypatch)
    backup = {"status": "LIVE", "secondary_source": True, "precipitation_72h_mm": None, "temperature_c": 20.0}
    weather_resolver._WEATHER_CACHE[weather_resolver._cache_key(LAT, LON)] = {"data": backup, "cached_at": weather_resolver.time.time()}
    weather_resolver.use_client_weather(LAT, LON, _payload_at(LAT, LON))
    assert weather_resolver.get_global_live_weather(LAT, LON)["precipitation_72h_mm"] == 72.0


def test_browser_elevation_used_when_server_is_rate_limited(monkeypatch):
    from backend.app.services import elevation_service
    _fresh(monkeypatch)
    monkeypatch.setenv("TERRAIN_CACHE_DISABLED", "1")
    elevation_service._DEM_CACHE.clear()
    # 11.1 m rise over ~111 m to the north, flat to the east -> ~5.7 degrees
    elevation_service.use_client_elevation(LAT, LON, [2000.0, 2011.132, 2000.0])
    dem = elevation_service.get_terrain_elevation_and_slope(LAT, LON)
    assert dem["elevation_amsl"] == 2000.0
    assert dem["slope_deg"] == 5.7
    assert "browser" in dem["source"]
    assert not elevation_service._DEM_CACHE


def test_bad_browser_elevation_is_ignored(monkeypatch):
    from backend.app.services import elevation_service
    _fresh(monkeypatch)
    monkeypatch.setenv("TERRAIN_CACHE_DISABLED", "1")
    elevation_service._DEM_CACHE.clear()
    elevation_service.use_client_elevation(LAT, LON, [2000.0, "x", 1e9])
    assert elevation_service.get_terrain_elevation_and_slope(LAT, LON)["slope_deg"] is None
