"""
LANDSLIDEGUARD SIH26001 - Weather & Precipitation Data Ingestion Service
Queries live meteorological data from IMD / WMO-standard open grids for North Eastern India.
Calculates real 1h, 24h, and 72h accumulated rainfall with full provenance and timestamping.
"""

import time
import urllib.request
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# In-memory cache with 15-minute TTL
_WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 900  # 15 minutes


from backend.app.services.weather_resolver import get_global_live_weather, _map_wmo_code


def fetch_live_meteorology(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Fetch live weather, temperature, humidity, and 1h/24h/72h rainfall accumulations
    from WMO-compliant global meteorological models via Open-Meteo.
    """
    data = get_global_live_weather(latitude, longitude)
    status = data.get("status", "LIVE")
    is_fallback = status in ["FALLBACK", "UNAVAILABLE"]
    
    # Do not silently convert None to 0.0 if data is unavailable
    raw_p1 = data.get("precipitation_1h_mm")
    raw_p24 = data.get("precipitation_24h_mm")
    raw_p72 = data.get("precipitation_72h_mm")
    raw_sm = data.get("soil_moisture_m3m3")

    return {
        "latitude": latitude,
        "longitude": longitude,
        "temperature_c": data.get("temperature_c"),
        "humidity_pct": data.get("relative_humidity_pct"),
        "rainfall_1h_mm": float(raw_p1) if raw_p1 is not None else None,
        "rain_current_mm": float(data.get("rain_current_mm")) if data.get("rain_current_mm") is not None else None,
        "rainfall_24h_mm": float(raw_p24) if raw_p24 is not None else None,
        "rainfall_72h_mm": float(raw_p72) if raw_p72 is not None else None,
        "soil_moisture_m3m3": float(raw_sm) if raw_sm is not None else None,
        "wind_speed_kmh": data.get("wind_speed_kmh"),
        "wind_direction_deg": data.get("wind_direction_deg"),
        "is_day": data.get("is_day", 1),
        "cloud_cover_pct": data.get("cloud_cover_pct", 0),
        "snowfall_cm": float(data.get("snowfall_cm") or 0.0),
        "weather_code": data.get("weather_code"),
        "condition": data.get("condition") or _map_wmo_code(data.get("weather_code")),
        "source": "Open-Meteo WMO Reanalysis Grid",
        "underlying_providers": "ECMWF / WMO Multi-Model Ensemble",
        "source_resolution": data.get("spatial_resolution", "0.1° (~10 km)"),
        "observation_time": data.get("observation_time"),
        "retrieved_at": data.get("retrieval_time"),
        "freshness_status": status,
        "is_fallback": is_fallback,
        "is_demo": False
    }


