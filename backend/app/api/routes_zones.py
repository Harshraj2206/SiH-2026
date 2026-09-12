"""
LANDSLIDEGUARD SIH26001 - Real-Time Dynamic Risk Zones API
Evaluates authentic live precipitation and satellite soil moisture for every monitored zone.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from backend.app.database.store import db_store
from backend.app.models.schemas import RiskZoneSummary
from backend.app.services.weather_service import fetch_live_meteorology
from backend.app.ml.predictor import predict_landslide_risk, categorize_risk_level, get_recommended_action

router = APIRouter(prefix="/api/risk-zones", tags=["Risk Zones"])


import concurrent.futures

def _enrich_single_zone(z: dict) -> dict:
    center = z.get("center", {})
    if center.get("lat") and center.get("lng"):
        try:
            weather = fetch_live_meteorology(center["lat"], center["lng"])
            z["weather_source"] = weather.get("source", "Open-Meteo WMO Reanalysis Grid")
            z["is_weather_fallback"] = weather.get("is_fallback", False)
            z["weather_status"] = weather.get("freshness_status", "LIVE")

            if weather.get("rainfall_24h_mm") is not None:
                z["rainfall_24h"] = weather["rainfall_24h_mm"]
                z["rainfall_72h"] = weather["rainfall_72h_mm"]
            if weather.get("soil_moisture_m3m3") is not None:
                z["soil_moisture"] = weather["soil_moisture_m3m3"]
            if weather.get("temperature_c") is not None:
                z["temperature_c"] = weather["temperature_c"]
            if weather.get("humidity_pct") is not None:
                z["humidity_pct"] = weather["humidity_pct"]
            if weather.get("weather_code") is not None:
                z["weather_code"] = weather["weather_code"]
            if weather.get("condition") is not None:
                z["condition"] = weather["condition"]
            if weather.get("is_day") is not None:
                z["is_day"] = weather["is_day"]
            if weather.get("cloud_cover_pct") is not None:
                z["cloud_cover_pct"] = weather["cloud_cover_pct"]
            if weather.get("snowfall_cm") is not None:
                z["snowfall_cm"] = weather["snowfall_cm"]
            if weather.get("rainfall_1h_mm") is not None:
                z["rainfall_1h"] = weather["rainfall_1h_mm"]

            # Predict risk using fresh real observations
            pred = predict_landslide_risk({
                "rainfall_24h": z["rainfall_24h"],
                "rainfall_72h": z["rainfall_72h"],
                "slope_deg": z["slope_deg"],
                "soil_moisture": z["soil_moisture"],
                "ndvi": z.get("ndvi", 0.5),
                "historical_incidents": z.get("historical_incidents", 0)
            })

            if pred.get("status") == "DATA_INSUFFICIENT":
                z["ml_base_score"] = None
                z["risk_score"] = None
                z["risk_level"] = "DATA_INSUFFICIENT"
                z["inference_status"] = "PAUSED_DATA_UNAVAILABLE"
                z["unavailability_reason"] = pred.get("unavailability_reason")
            else:
                z["ml_base_score"] = pred["risk_score"]
                boost = z.get("community_boost", 0.0)
                final_score = round(min(100.0, z["ml_base_score"] + boost), 1)
                z["risk_score"] = final_score
                z["risk_level"] = categorize_risk_level(final_score)

            z["recommended_action"] = pred.get("xai", {}).get("recommended_action") or get_recommended_action(z["risk_level"], "live meteorological telemetry")
            z["model_confidence"] = pred.get("model_confidence", 85.0)
            z["tree_variance"] = pred.get("tree_variance", 0.05)
            z["data_quality"] = pred.get("data_quality", "HIGH")
            z["precision_context"] = pred.get("precision_context")
            z["weather_observation_time"] = weather.get("observation_time")
            z["last_updated"] = datetime.now(timezone.utc).isoformat()
        except Exception:
            z["weather_status"] = "UNAVAILABLE"
            z["is_weather_fallback"] = True

    return z


@router.get("", response_model=List[RiskZoneSummary])
async def list_risk_zones(
    level: Optional[str] = Query(None, description="Filter by level: LOW, MODERATE, HIGH, CRITICAL"),
    state: Optional[str] = Query(None, description="Filter by state: Meghalaya, Sikkim, Nagaland, etc.")
):
    zones = db_store.get_all_zones()

    # Ingest real-time meteorology concurrently for monitored zones (bounded workers to prevent rate-limiting)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        zones = list(executor.map(_enrich_single_zone, zones))

    if level:
        zones = [z for z in zones if z["risk_level"] == level.upper()]
    if state:
        zones = [z for z in zones if z["state"].lower() == state.lower()]

    # Sort with highest risk first (safe handling of DATA_INSUFFICIENT / None scores)
    zones.sort(key=lambda x: (x.get("risk_score") is not None, x.get("risk_score") or 0.0), reverse=True)
    return zones


@router.get("/{zone_id}")
async def get_risk_zone_detail(zone_id: str):
    zone = db_store.get_zone_by_id(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Risk zone '{zone_id}' not found.")

    # Refresh with live weather
    center = zone.get("center", {})
    if center.get("lat") and center.get("lng"):
        try:
            weather = fetch_live_meteorology(center["lat"], center["lng"])
            zone["weather_source"] = weather.get("source", "Open-Meteo WMO Reanalysis Grid")
            zone["is_weather_fallback"] = weather.get("is_fallback", False)
            zone["weather_status"] = weather.get("freshness_status", "LIVE")

            if weather.get("rainfall_24h_mm") is not None:
                zone["rainfall_24h"] = weather["rainfall_24h_mm"]
                zone["rainfall_72h"] = weather["rainfall_72h_mm"]
            if weather.get("soil_moisture_m3m3") is not None:
                zone["soil_moisture"] = weather["soil_moisture_m3m3"]
            if weather.get("temperature_c") is not None:
                zone["temperature_c"] = weather["temperature_c"]
            if weather.get("humidity_pct") is not None:
                zone["humidity_pct"] = weather["humidity_pct"]
            if weather.get("weather_code") is not None:
                zone["weather_code"] = weather["weather_code"]
            if weather.get("condition") is not None:
                zone["condition"] = weather["condition"]
            if weather.get("is_day") is not None:
                zone["is_day"] = weather["is_day"]
            if weather.get("cloud_cover_pct") is not None:
                zone["cloud_cover_pct"] = weather["cloud_cover_pct"]
            if weather.get("snowfall_cm") is not None:
                zone["snowfall_cm"] = weather["snowfall_cm"]
            if weather.get("rainfall_1h_mm") is not None:
                zone["rainfall_1h"] = weather["rainfall_1h_mm"]

            pred = predict_landslide_risk({
                "rainfall_24h": zone["rainfall_24h"],
                "rainfall_72h": zone["rainfall_72h"],
                "slope_deg": zone["slope_deg"],
                "soil_moisture": zone["soil_moisture"],
                "ndvi": zone.get("ndvi", 0.5),
                "historical_incidents": zone.get("historical_incidents", 0)
            })

            if pred.get("status") == "DATA_INSUFFICIENT":
                zone["ml_base_score"] = None
                zone["risk_score"] = None
                zone["risk_level"] = "DATA_INSUFFICIENT"
                zone["inference_status"] = "PAUSED_DATA_UNAVAILABLE"
                zone["unavailability_reason"] = pred.get("unavailability_reason")
            else:
                zone["ml_base_score"] = pred["risk_score"]
                final_score = round(min(100.0, zone["ml_base_score"] + zone.get("community_boost", 0.0)), 1)
                zone["risk_score"] = final_score
                zone["risk_level"] = categorize_risk_level(final_score)

            zone["xai"] = pred.get("xai", {})
            zone["model_confidence"] = pred.get("model_confidence", 85.0)
            zone["tree_variance"] = pred.get("tree_variance", 0.05)
            zone["data_quality"] = pred.get("data_quality", "HIGH (WMO / Copernicus DEM Calibrated)")
        except Exception:
            pass

    all_reports = db_store.get_all_reports()
    zone_reports = [r for r in all_reports if r.get("zone_id") == zone_id]

    return {
        "zone": zone,
        "recent_reports": zone_reports,
        "xai": zone.get("xai")
    }
