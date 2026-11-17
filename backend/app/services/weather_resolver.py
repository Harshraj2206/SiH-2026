"""
LANDSAFE - Global Weather & Meteorological Provider Resolver
Selects appropriate national vs global meteorological provider based on country/region
with explicit source attribution, spatial resolution, and observation timestamps.
"""

import json
import time
import urllib.request
import urllib.error
from contextvars import ContextVar
from typing import Dict, Any, Optional


def describe_http_error(err: Exception) -> str:
    """Short, loggable description of a failed HTTP call (status code + start of body)."""
    if isinstance(err, urllib.error.HTTPError):
        try:
            body = err.read().decode("utf-8", "replace")[:200]
        except Exception:
            body = ""
        return f"HTTP {err.code} {err.reason}: {body}"
    return f"{type(err).__name__}: {err}"

_WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL = 900  # 15 minutes cache to prevent rate-limit exhaustion


def resolve_weather_provider(country_code: Optional[str] = None) -> Dict[str, Any]:
    """All weather comes from the Open-Meteo forecast API, whatever the country."""
    return {
        "provider_name": "Open-Meteo",
        "agency": "Open-Meteo (weather models from national services, chosen by Open-Meteo)",
        "tier": "Open-Meteo forecast API",
        "spatial_resolution": "about 10-25 km",
        "update_interval": "Hourly",
        "is_official": False
    }


_WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL = 900  # 15 minutes fresh cache
_STALE_CACHE_TTL = 3600  # 60 minutes acceptable stale cache if upstream is offline
_FAIL_CACHE_TTL = 10  # Only suppress hammering for 10 seconds on complete failure


def get_global_live_weather(latitude: float, longitude: float, country_code: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieve real-time meteorological observations and short-term forecast for any coordinate worldwide.
    Implements multi-tier failover, bounded retry, and stale cache serving.
    """
    cache_key = _cache_key(latitude, longitude)
    now = time.time()
    existing_entry = _WEATHER_CACHE.get(cache_key)

    # Open-Meteo data the user's browser sent for this point (used if the server is rate-limited)
    client = _CLIENT_WEATHER.get()
    has_client = bool(client and client.get("key") == cache_key)

    # 1. Return fresh live cache if within 15 minutes
    if existing_entry and existing_entry.get("data", {}).get("status") in ["LIVE", "CACHED"]:
        age = now - existing_entry["cached_at"]
        if age < existing_entry.get("ttl", _CACHE_TTL):
            entry_data = dict(existing_entry["data"])
            entry_data["status"] = "LIVE"
            entry_data["data_age_minutes"] = max(0, int(age / 60))
            return entry_data

    if not country_code:
        if 6.0 <= latitude <= 38.0 and 68.0 <= longitude <= 98.0:
            country_code = "IN"

    provider_info = resolve_weather_provider(country_code)

    url = open_meteo_url(latitude, longitude)

    # 2. Query Primary: Open-Meteo with bounded retry (max 2 attempts)
    primary_success = False
    data = {}
    last_error = ""
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LandSafe-GlobalWeather/2.0"})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                primary_success = True
                break
        except Exception as err:
            last_error = describe_http_error(err)
            if attempt == 0:
                time.sleep(0.3)  # Brief backoff before 1 retry

    if not primary_success:
        print(f"Open-Meteo forecast request failed: {last_error}")

    if primary_success:
        try:
            result = _parse_open_meteo(data, provider_info)
            _WEATHER_CACHE[cache_key] = {"data": result, "cached_at": now}
            return result
        except Exception as e:
            print(f"Error parsing primary weather payload: {e}")

    # 3. Open-Meteo data the user's browser fetched for this request (own IP, so not
    #    rate-limited like the shared server IP). Used for this request only, never cached.
    if has_client:
        return dict(client["data"])

    # 4. Graceful Stale Cache Fallback (Up to 60 minutes)
    if existing_entry and existing_entry.get("data", {}).get("temperature_c") is not None:
        age_seconds = now - existing_entry["cached_at"]
        if age_seconds < _STALE_CACHE_TTL:
            cached_data = dict(existing_entry["data"])
            cached_data["status"] = "CACHED"
            cached_data["data_age_minutes"] = max(1, int(age_seconds / 60))
            cached_data["source"] = f"{cached_data.get('source', 'Open-Meteo')} (Cached {cached_data['data_age_minutes']}m ago)"
            return cached_data

    # 5. Scientific Fallback with explicit null markers (UNKNOWN != ZERO)
    fallback = {
        "temperature_c": None,
        "feels_like_c": None,
        "relative_humidity_pct": None,
        "surface_pressure_hpa": None,
        "wind_speed_kmh": None,
        "wind_direction_deg": None,
        "is_day": None,
        "cloud_cover_pct": None,
        "snowfall_cm": None,
        "condition": None,
        "weather_code": None,
        "precipitation_1h_mm": None,
        "rain_current_mm": None,
        "precipitation_24h_mm": None,
        "precipitation_72h_mm": None,
        "soil_moisture_m3m3": None,
        "forecast_trend": [],
        "timezone": None,
        "utc_offset_seconds": None,
        "sunrise": None,
        "sunset": None,
        "source": provider_info["provider_name"],
        "agency": provider_info["agency"],
        "tier": provider_info["tier"],
        "spatial_resolution": provider_info["spatial_resolution"],
        "observation_time": None,
        "retrieval_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status": "UNAVAILABLE",
        "data_age_minutes": None,
        "quality": "UNAVAILABLE"
    }
    # Only cache failure for 10 seconds to prevent hammering, never poison cache for 15 minutes!
    _WEATHER_CACHE[cache_key] = {"data": fallback, "cached_at": now - (_CACHE_TTL - _FAIL_CACHE_TTL)}
    return fallback


def _cache_key(latitude: float, longitude: float) -> str:
    return f"{round(latitude, 2)}_{round(longitude, 2)}"


def open_meteo_url(latitude: float, longitude: float) -> str:
    return (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude:.4f}&longitude={longitude:.4f}"
        f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,is_day,cloud_cover"
        f"&daily=sunrise,sunset,precipitation_sum"
        f"&hourly=temperature_2m,precipitation,precipitation_probability,soil_moisture_0_to_7cm"
        f"&timezone=auto&past_days=3&forecast_days=3"
    )


_CLIENT_WEATHER: ContextVar[Optional[Dict[str, Any]]] = ContextVar("client_weather", default=None)


def use_client_weather(latitude: float, longitude: float, data: Optional[Dict[str, Any]]) -> None:
    """Accept an Open-Meteo response fetched by the user's browser as a fallback for this request.

    Ignored if it is missing, unparseable, or for a different point than the one requested.
    """
    _CLIENT_WEATHER.set(None)
    if not isinstance(data, dict):
        return
    try:
        if abs(float(data.get("latitude")) - latitude) > 0.1 or abs(float(data.get("longitude")) - longitude) > 0.1:
            return
        country = "IN" if 6.0 <= latitude <= 38.0 and 68.0 <= longitude <= 98.0 else None
        result = _parse_open_meteo(data, resolve_weather_provider(country))
    except Exception:
        return
    result["source"] = f"{result['source']} (fetched by your browser)"
    result["client_supplied"] = True
    _CLIENT_WEATHER.set({"key": _cache_key(latitude, longitude), "data": result})


RELAY_TTL = 4500  # relay pushes every 30 min; keep data 75 min so one missed run doesn't blank zones


def ingest_open_meteo(latitude: float, longitude: float, data: Dict[str, Any]) -> Dict[str, Any]:
    """Store an Open-Meteo response fetched by the trusted relay (same parsing as a direct fetch)."""
    country = "IN" if 6.0 <= latitude <= 38.0 and 68.0 <= longitude <= 98.0 else None
    result = _parse_open_meteo(data, resolve_weather_provider(country))
    result["source"] = f"{result['source']} (via scheduled relay)"
    _WEATHER_CACHE[_cache_key(latitude, longitude)] = {"data": result, "cached_at": time.time(), "ttl": RELAY_TTL}
    return result


def _parse_open_meteo(data: Dict[str, Any], provider_info: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(data.get("hourly"), dict) or not isinstance(data.get("current"), dict):
        raise ValueError("Open-Meteo payload missing current/hourly blocks")
    current = data.get("current", {})
    daily = data.get("daily", {})
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    precip = hourly.get("precipitation", [])
    soil = hourly.get("soil_moisture_0_to_7cm", [])
    temps = hourly.get("temperature_2m", [])

    # Index just after the current hour: hourly times and current.time share the
    # same local timezone and ISO format, so string comparison is chronological.
    now_str = current.get("time")
    if times and now_str:
        current_idx = sum(1 for t in times if t <= now_str)
    else:
        current_idx = min(72, len(times) - 1) if times else 0

    raw_p1 = current.get("precipitation")
    p_1h = round(float(raw_p1), 1) if raw_p1 is not None else None
    rain_now = round(float(current.get("rain")), 1) if current.get("rain") is not None else None

    def rain_window(end: int, hours: int) -> Optional[float]:
        """Rain total over `hours` hourly values ending at index `end` (exclusive)."""
        start = end - hours
        if not precip or start < 0 or end > len(precip):
            return None
        values = precip[start:end]
        if any(v is None for v in values):
            return None
        return round(sum(float(v) for v in values), 1)

    p_24h = rain_window(current_idx, 24)
    p_72h = rain_window(current_idx, 72)

    # Real outlook from the hourly forecast: rolling 24h/72h rain totals at +6/+12/+24h
    rainfall_outlook = [
        {"hour_offset": h,
         "rainfall_24h_mm": rain_window(current_idx + h, 24),
         "rainfall_72h_mm": rain_window(current_idx + h, 72)}
        for h in (6, 12, 24)
    ]

    current_soil = None
    soil_idx = max(0, current_idx - 1)
    if soil and len(soil) > soil_idx and soil[soil_idx] is not None:
        current_soil = round(float(soil[soil_idx]), 3)

    forecast_trend = []
    if times and temps and precip:
        offsets = [("Current", 0), ("+6h", 6), ("+12h", 12), ("+24h", 24), ("+48h", 48)]
        for label, off in offsets:
            target_i = min(len(times) - 1, current_idx + off)
            if target_i < len(times):
                forecast_trend.append({
                    "timeframe": label,
                    "timestamp": times[target_i],
                    "temperature_c": temps[target_i],
                    "precipitation_mm": precip[target_i] if target_i < len(precip) else None
                })

    weather_code = current.get("weather_code")
    condition_str = _map_wmo_code(weather_code)

    sunrises = daily.get("sunrise", [])
    sunsets = daily.get("sunset", [])

    result = {
        "temperature_c": current.get("temperature_2m"),
        "feels_like_c": current.get("apparent_temperature"),
        "relative_humidity_pct": current.get("relative_humidity_2m"),
        "surface_pressure_hpa": current.get("surface_pressure"),
        "wind_speed_kmh": current.get("wind_speed_10m"),
        "wind_direction_deg": current.get("wind_direction_10m"),
        "is_day": current.get("is_day"),
        "cloud_cover_pct": current.get("cloud_cover"),
        "snowfall_cm": current.get("snowfall"),
        "condition": condition_str,
        "weather_code": weather_code,
        "precipitation_1h_mm": p_1h,
        "rain_current_mm": rain_now,
        "precipitation_24h_mm": p_24h,
        "precipitation_72h_mm": p_72h,
        "soil_moisture_m3m3": current_soil,
        "forecast_trend": forecast_trend,
        "rainfall_outlook": rainfall_outlook,
        "timezone": data.get("timezone"),
        "timezone_abbreviation": data.get("timezone_abbreviation"),
        "utc_offset_seconds": data.get("utc_offset_seconds"),
        "sunrise": sunrises[0] if sunrises else None,
        "sunset": sunsets[0] if sunsets else None,
        "source": provider_info["provider_name"],
        "agency": provider_info["agency"],
        "tier": provider_info["tier"],
        "spatial_resolution": provider_info["spatial_resolution"],
        "observation_time": current.get("time") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "retrieval_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status": "LIVE",
        "data_age_minutes": 0,
        "quality": "HIGH"
    }
    return result


def _map_wmo_code(code: Optional[int]) -> str:
    if code is None:
        return "Unknown"
    if code == 0:
        return "Clear Sky"
    elif code == 1:
        return "Mainly Clear"
    elif code == 2:
        return "Partly Cloudy"
    elif code == 3:
        return "Overcast"
    elif code in [45, 48]:
        return "Fog / Mist"
    elif code in [51, 53]:
        return "Light Drizzle"
    elif code == 55:
        return "Dense Drizzle"
    elif code in [56, 57]:
        return "Freezing Drizzle"
    elif code == 61:
        return "Light Rain"
    elif code == 63:
        return "Moderate Rain"
    elif code == 65:
        return "Heavy Rain"
    elif code in [66, 67]:
        return "Freezing Rain"
    elif code in [71, 73]:
        return "Snow Fall"
    elif code == 75:
        return "Heavy Snow Fall"
    elif code == 77:
        return "Snow Grains"
    elif code == 80:
        return "Slight Rain Showers"
    elif code == 81:
        return "Moderate Rain Showers"
    elif code == 82:
        return "Violent Rain Showers"
    elif code in [85, 86]:
        return "Snow Showers"
    elif code in [95, 96, 99]:
        return "Thunderstorm"
    return "Cloudy"

