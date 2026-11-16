"""
LANDSAFE - Dedicated Real-Time Weather API Endpoint
SIH Problem Statement: SIH26001
Retrieves normalized real-time meteorological telemetry for any GPS coordinate globally.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException
from backend.app.services.weather_resolver import get_global_live_weather, _map_wmo_code

router = APIRouter(prefix="/api/weather", tags=["Real-Time Weather"])


@router.get("")
def get_live_weather(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude coordinate (-90 to 90)"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude coordinate (-180 to 180)")
) -> Dict[str, Any]:
    """
    Get live, authoritative meteorological data from WMO satellite/reanalysis grid (Open-Meteo).
    Returns real temperature, humidity, rainfall (1h, 24h), wind, and deterministic WMO weather codes.
    """
    try:
        raw_weather = get_global_live_weather(lat, lon)
        
        temp = raw_weather.get("temperature_c")
        humidity = raw_weather.get("relative_humidity_pct")
        weather_code = raw_weather.get("weather_code")
        
        # Determine condition string from code or existing label
        condition = raw_weather.get("condition")
        if not condition and weather_code is not None:
            condition = _map_wmo_code(weather_code)
        if not condition:
            condition = "Clear Sky" if weather_code == 0 else "Partly Cloudy"
        raw_p1 = raw_weather.get("precipitation_1h_mm")
        raw_rain = raw_weather.get("rain_current_mm")
        raw_p24 = raw_weather.get("precipitation_24h_mm")
        raw_p72 = raw_weather.get("precipitation_72h_mm")

        p_1h = float(raw_p1) if raw_p1 is not None else None
        rain_now = float(raw_rain) if raw_rain is not None else None
        p_24h = float(raw_p24) if raw_p24 is not None else None
        p_72h = float(raw_p72) if raw_p72 is not None else None

        return {
            "latitude": lat,
            "longitude": lon,
            "temperature_c": temp,
            "feels_like_c": raw_weather.get("feels_like_c", temp),
            "humidity_pct": humidity,
            "surface_pressure_hpa": raw_weather.get("surface_pressure_hpa"),
            "wind_speed_kmh": raw_weather.get("wind_speed_kmh"),
            "wind_direction_deg": raw_weather.get("wind_direction_deg"),
            "is_day": raw_weather.get("is_day", 1),
            "cloud_cover_pct": raw_weather.get("cloud_cover_pct", 0),
            "snowfall_cm": float(raw_weather.get("snowfall_cm")) if raw_weather.get("snowfall_cm") is not None else 0.0,
            "precipitation_1h_mm": p_1h,
            "rain_current_mm": rain_now,
            "precipitation_24h_mm": p_24h,
            "precipitation_72h_mm": p_72h,
            "rainfall_1h": p_1h,
            "rainfall_24h": p_24h,
            "rainfall_72h": p_72h,
            "precipitation_mm": p_1h if p_1h is not None else rain_now,
            "soil_moisture_m3m3": raw_weather.get("soil_moisture_m3m3"),
            "weather_code": weather_code if weather_code is not None else 0,
            "condition": condition,
            "forecast_trend": raw_weather.get("forecast_trend", []),
            "timezone": raw_weather.get("timezone", "Asia/Kolkata"),
            "timezone_abbreviation": raw_weather.get("timezone_abbreviation", "UTC"),
            "utc_offset_seconds": raw_weather.get("utc_offset_seconds", 19800),
            "sunrise": raw_weather.get("sunrise"),
            "sunset": raw_weather.get("sunset"),
            "source": raw_weather.get("source", "Open-Meteo / WMO Satellite Grid"),
            "agency": raw_weather.get("agency", "WMO / ECMWF Reanalysis"),
            "observation_time": raw_weather.get("observation_time"),
            "retrieval_time": raw_weather.get("retrieval_time"),
            "data_age_minutes": raw_weather.get("data_age_minutes", 0),
            "status": raw_weather.get("status") if raw_weather.get("status") in ["LIVE", "CACHED", "UNAVAILABLE"] else ("LIVE" if temp is not None else "UNAVAILABLE")
        }
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve meteorological telemetry from provider: {str(exc)}"
        )
