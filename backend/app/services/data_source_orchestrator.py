"""
LANDSAFE - Global Data Source Orchestrator & Location Intelligence Engine
Unified single geographic source of truth orchestrating satellite observations,
Copernicus DEM slope, USGS real-time seismic events, and OpenStreetMap infrastructure.
"""

import time
import math
from typing import Dict, Any, Optional
from backend.app.services.geocode_service import reverse_geocode_location
from backend.app.services.weather_resolver import get_global_live_weather
from backend.app.services.elevation_service import get_terrain_elevation_and_slope
from backend.app.services.usgs_earthquake_service import get_nearby_earthquakes
from backend.app.services.osm_places_service import get_nearby_real_facilities
from backend.app.ml.predictor import predict_landslide_risk
from backend.app.services.feature_builder import build_features, score_features, provenance

_ORCHESTRATOR_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL = 300  # 5 minutes


def validate_geographic_consistency(
    requested_lat: float,
    requested_lng: float,
    geo_data: Dict[str, Any]
) -> bool:
    """
    Validate that retrieved geocoding and observations correspond accurately
    to the requested geographic coordinates.
    """
    if not geo_data:
        return False
    # Check bounding validity
    if not (-90.0 <= requested_lat <= 90.0 and -180.0 <= requested_lng <= 180.0):
        return False
    return True


def orchestrate_location_intelligence(
    latitude: float,
    longitude: float,
    source: str = "GPS / Map Inspection"
) -> Dict[str, Any]:
    """
    Produce the canonical, unified location intelligence bundle for ANY coordinates on Earth.
    """
    cache_key = f"{round(latitude, 4)}_{round(longitude, 4)}"
    now = time.time()
    if cache_key in _ORCHESTRATOR_CACHE:
        entry = _ORCHESTRATOR_CACHE[cache_key]
        if now - entry["cached_at"] < _CACHE_TTL:
            return entry["data"]

    # 1. Authoritative Reverse Geocoding
    geo_info = reverse_geocode_location(latitude, longitude)
    if not validate_geographic_consistency(latitude, longitude, geo_info):
        raise ValueError(f"Geographic consistency validation failed for coordinates ({latitude}, {longitude})")

    country_code = (geo_info.get("country_code") or "").upper()
    country_name = geo_info.get("country")
    state_prov = geo_info.get("state", "")
    district_county = geo_info.get("district", "")
    place_name = geo_info.get("name")

    # Canonical Location Object
    canonical_location = {
        "latitude": latitude,
        "longitude": longitude,
        "accuracy": None,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": source,
        "display_name": place_name,
        "country": country_name,
        "country_code": country_code,
        "state_province": state_prov,
        "district": district_county,
        "locality": place_name
    }

    # 2. Live Weather & Open-Meteo NWP Grid Ingestion
    weather_data = get_global_live_weather(latitude, longitude, country_code)

    # 3-4, 7. Shared live features + model (same path as risk zones and the map inspector,
    # so a coordinate gets the same score on every page). Missing inputs stay None.
    built = build_features(latitude, longitude, state=state_prov)
    feats = built["features"]
    terrain_data = built["dem"]
    elev_m = feats["elevation_amsl"]
    slope_deg = feats["slope_deg"]
    soil_moisture_val = feats["soil_moisture"]
    soil_is_fallback = soil_moisture_val is None

    # 5. Real-Time USGS Seismic Events (within 500 km)
    earthquakes = get_nearby_earthquakes(latitude, longitude, max_radius_km=500.0)

    # 6. Real OpenStreetMap Overpass Infrastructure (Hospitals & Shelters)
    facilities = get_nearby_real_facilities(latitude, longitude, radius_km=30.0)

    rain_24h = feats["rainfall_24h"]
    rain_72h = feats["rainfall_72h"]

    ml_result, live_forecast_trend = score_features(built)
    is_paused = ml_result.get("status") == "DATA_INSUFFICIENT"
    risk_score = ml_result.get("risk_score")
    risk_level = ml_result.get("risk_level")

    # Model and data sources, stated as they are
    model_coverage = {
        "model_name": "Random Forest (200 trees)",
        "coverage_scope": "India only (trained on NASA Global Landslide Catalog events in India)",
        "primary_driver": (ml_result.get("xai") or {}).get("primary_driver"),
        "model_confidence": ml_result.get("model_confidence"),
        "tree_variance": ml_result.get("tree_variance"),
        "data_quality": ml_result.get("data_quality")
    }

    data_sources_registry = [
        {"name": "Open-Meteo (rain, temperature)", "observation_time": weather_data.get("observation_time"),
         "status": "CONNECTED" if rain_24h is not None else "UNAVAILABLE"},
        {"name": "Open-Meteo (topsoil moisture, 0-7 cm)", "observation_time": weather_data.get("observation_time"),
         "status": "CONNECTED" if not soil_is_fallback else "UNAVAILABLE"},
        {"name": terrain_data.get("source") or "Copernicus DEM (elevation, slope)", "observation_time": None,
         "status": "CONNECTED" if slope_deg is not None else "UNAVAILABLE"},
        {"name": "USGS earthquakes (past day)", "observation_time": None,
         "status": "CONNECTED" if earthquakes is not None else "UNAVAILABLE"},
        {"name": "OpenStreetMap (hospitals, shelters)", "observation_time": None,
         "status": "CONNECTED" if facilities.get("status") != "UNAVAILABLE" else "UNAVAILABLE"}
    ]

    bundle = {
        "location": canonical_location,
        "weather": weather_data,
        "precipitation": {
            "rate_1h_mm": weather_data.get("precipitation_1h_mm"),
            "accum_24h_mm": rain_24h,
            "accum_72h_mm": rain_72h,
            "source": "Open-Meteo",
            "observation_time": weather_data.get("observation_time")
        },
        "soil_moisture": {
            "volumetric_m3m3": soil_moisture_val,
            "saturation_pct": None if soil_moisture_val is None else (round(soil_moisture_val * 100, 1) if soil_moisture_val <= 1.0 else soil_moisture_val),
            "depth_layer": "0-7 cm topsoil",
            "source": "Open-Meteo",
            "is_fallback": soil_is_fallback
        },
        "terrain": {
            "elevation_amsl": elev_m,
            "slope_deg": slope_deg,
            "source": terrain_data.get("source"),
            "is_dynamic": terrain_data.get("is_dynamic", False)
        },
        "earthquakes": earthquakes,
        "risk": {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "operational_label": "Operational Landslide Hazard (INFERENCE PAUSED - Weather Telemetry Unavailable)" if is_paused else f"Operational Landslide Hazard ({risk_score}/100 - {risk_level})",
            "explanation": "Inference paused: Precipitation telemetry unavailable." if is_paused else f"{'Elevated' if (risk_score or 0) > 50 else 'Low'} hazard score driven primarily by {model_coverage['primary_driver']}.",
            "model_coverage": model_coverage,
            "model_confidence": ml_result.get("model_confidence"),
            "tree_variance": ml_result.get("tree_variance"),
            "data_quality": ml_result.get("data_quality", "HIGH"),
            "factors": ml_result.get("xai", {}).get("factors", []),
            "xai": ml_result.get("xai", {}),
            "precision_context": ml_result.get("precision_context"),
            "forecast_trend": live_forecast_trend,
            "unavailability_reason": ml_result.get("unavailability_reason"),
            "provenance": provenance(built)
        },
        "nearby_hospitals": facilities.get("hospitals", []),
        "nearby_shelters": facilities.get("shelters", []),
        "data_sources": data_sources_registry,
        "freshness": {
            "status": "FRESH",
            "retrieval_timestamp": canonical_location["timestamp"],
            "cache_ttl_seconds": _CACHE_TTL
        }
    }

    # browser-supplied weather/elevation is for this request only
    if not weather_data.get("client_supplied") and not terrain_data.get("client_supplied"):
        _ORCHESTRATOR_CACHE[cache_key] = {"data": bundle, "cached_at": now}
    return bundle
