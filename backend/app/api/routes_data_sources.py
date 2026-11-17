"""
Data sources list and the coordinate inspector (score any point in India from live data).
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from backend.app.services.weather_service import fetch_live_meteorology
from backend.app.services.elevation_service import get_terrain_elevation_and_slope
from backend.app.services.soil_service import get_soil_moisture_telemetry
from backend.app.services.landslide_catalog import get_historical_landslides, get_historical_density_score
from backend.app.services.geocode_service import reverse_geocode_location
from backend.app.ml.predictor import predict_landslide_risk, categorize_risk_level
from backend.app.services.feature_builder import build_features, score_features, provenance
from backend.app.services.weather_resolver import use_client_weather
from backend.app.services.elevation_service import use_client_elevation

router = APIRouter(prefix="/api", tags=["Real Data Ingestion & Sources"])


class CoordinateInspectRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    weather: Optional[Dict[str, Any]] = None  # raw Open-Meteo response fetched by the browser
    elevation: Optional[list] = None  # Open-Meteo elevations [point, +0.001 lat, +0.001 lng] from the browser


@router.get("/data-sources")
async def get_data_sources_status() -> Dict[str, Any]:
    """The data sources LandSafe actually uses."""
    return {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "sources": [
            {
                "id": "open-meteo-weather",
                "name": "Open-Meteo forecast API",
                "category": "Rain, temperature, humidity, soil moisture",
                "data_type": "Rain in the last 1, 24 and 72 hours; hourly forecast; topsoil (0-7 cm) moisture",
                "spatial_resolution": "Global weather models, about 10-25 km grid",
                "update_frequency": "Fetched every 15 minutes",
                "url": "https://open-meteo.com",
            },
            {
                "id": "copernicus-dem",
                "name": "Copernicus DEM GLO-90 (via Open-Meteo elevation API)",
                "category": "Elevation and slope",
                "data_type": "Elevation; slope from three points about 110 m apart",
                "spatial_resolution": "90 m",
                "update_frequency": "Static",
                "url": "https://open-meteo.com/en/docs/elevation-api",
            },
            {
                "id": "nasa-glc",
                "name": "NASA Global Landslide Catalog",
                "category": "Past landslides",
                "data_type": "1,265 Indian landslides, 2007-2016 (date, place, trigger)",
                "spatial_resolution": "Point locations (accuracy given per event)",
                "update_frequency": "Static copy in this app",
                "url": "https://catalog.data.gov/dataset/global-landslide-catalog-export",
            },
            {
                "id": "nasa-eonet",
                "name": "NASA EONET",
                "category": "Open natural events",
                "data_type": "Open landslide and flood events inside India",
                "spatial_resolution": "Point locations",
                "update_frequency": "Fetched every 10 minutes",
                "url": "https://eonet.gsfc.nasa.gov",
            },
            {
                "id": "osm",
                "name": "OpenStreetMap",
                "category": "Places, hospitals, shelters, roads",
                "data_type": "Place names (Nominatim), facilities (Overpass), driving routes (OSRM)",
                "spatial_resolution": "Map data",
                "update_frequency": "Live",
                "url": "https://www.openstreetmap.org",
            },
        ]
    }


@router.post("/telemetry/inspect")
def inspect_coordinate_telemetry(payload: CoordinateInspectRequest) -> Dict[str, Any]:
    """
    Live Coordinate Inspector:
    Given any latitude/longitude clicked on the map or user GPS position:
    1. Place name from reverse geocoding (OpenStreetMap Nominatim).
    2. Live weather, rain and soil moisture from Open-Meteo.
    3. Elevation and slope from the Copernicus DEM (via Open-Meteo).
    4. Landslides within 35 km from the NASA Global Landslide Catalog.
    5. Random Forest score on these inputs (India only).
    """
    lat, lng = payload.latitude, payload.longitude
    use_client_weather(lat, lng, payload.weather)
    use_client_elevation(lat, lng, payload.elevation)

    # 1. Reverse Geocoding for Real Place Name
    geo = reverse_geocode_location(lat, lng)

    # 2-6. Shared live features, model score and real hourly-forecast trend
    # (same path as risk zones and location intelligence, so a point scores the same everywhere)
    built = build_features(lat, lng)
    f = built["features"]
    weather, dem = built["weather"], built["dem"]
    rain_24h, rain_72h = f["rainfall_24h"], f["rainfall_72h"]
    slope_deg, moisture = f["slope_deg"], f["soil_moisture"]
    hist_count = f["historical_incidents"]
    prediction, forecast_trend = score_features(built)

    ml_score = prediction.get("risk_score")
    risk_level = prediction.get("risk_level", "DATA_INSUFFICIENT")

    zone_id = f"GPS-{round(lat, 2)}-{round(lng, 2)}"

    return {
        "zone_id": zone_id,
        "name": geo["name"],
        "short_name": geo["short_name"],
        "district": geo["district"],
        "state": geo["state"],
        "formatted_address": geo["formatted_address"],
        "center": {"lat": lat, "lng": lng},
        "coordinates": {"lat": lat, "lng": lng},
        "elevation_amsl": dem.get("elevation_meters_amsl"),
        "slope_deg": slope_deg,
        "temperature_c": weather.get("temperature_c"),
        "humidity_pct": weather.get("humidity_pct"),
        "is_day": weather.get("is_day", 1),
        "cloud_cover_pct": weather.get("cloud_cover_pct"),
        "snowfall_cm": weather.get("snowfall_cm"),
        "condition": weather.get("condition"),
        "weather_code": weather.get("weather_code"),
        "weather_source": weather.get("source"),
        "observation_time": weather.get("observation_time"),
        "rainfall_1h": weather.get("rainfall_1h_mm"),
        "rainfall_24h": rain_24h,
        "rainfall_72h": rain_72h,
        "soil_moisture": moisture,
        "ndvi": f["ndvi"],
        "historical_incidents": hist_count,
        "historical_landslides_nearby": hist_count,
        "ml_base_score": ml_score,
        "community_boost": 0.0,
        "risk_score": ml_score,
        "risk_level": risk_level,
        "community_report_count": 0,
        "verified_report_count": 0,
        "primary_driver": prediction.get("xai", {}).get("primary_driver"),
        "recommended_action": prediction.get("xai", {}).get("recommended_action"),
        "xai": prediction.get("xai", {}),
        "model_confidence": prediction.get("model_confidence"),
        "tree_variance": prediction.get("tree_variance"),
        "data_quality": prediction.get("data_quality"),
        "forecast_trend": forecast_trend,
        "alert_status": None if ml_score is None else ("CRITICAL WARNING" if ml_score > 80 else ("HIGH ADVISORY" if ml_score > 60 else None)),
        "unavailability_reason": prediction.get("unavailability_reason"),
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "is_live_inspected": True,
        "provenance": {
            **provenance(built),
            "freshness_status": weather.get("freshness_status", "LIVE"),
            "is_demo": False
        },
        "inspected_at": datetime.now(timezone.utc).isoformat()
    }
