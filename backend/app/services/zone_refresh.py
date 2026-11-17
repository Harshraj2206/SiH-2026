"""
Refresh monitored risk zones with live data through the shared feature builder.
If live inputs are missing, a zone keeps its last known values and is marked STALE
(never re-scored with zeros or defaults).
"""

import concurrent.futures
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict

from backend.app.database.store import db_store
from backend.app.ml.predictor import categorize_risk_level
from backend.app.services.feature_builder import build_features, score_features, provenance

logger = logging.getLogger("landslideguard")

_WEATHER_DISPLAY_FIELDS = (
    ("temperature_c", "temperature_c"), ("humidity_pct", "humidity_pct"),
    ("weather_code", "weather_code"), ("condition", "condition"), ("is_day", "is_day"),
    ("cloud_cover_pct", "cloud_cover_pct"), ("snowfall_cm", "snowfall_cm"),
    ("rainfall_1h_mm", "rainfall_1h"),
)


MIN_REFRESH_SECONDS = 900  # matches the 15-minute weather cache


def refresh_zone(zone: Dict[str, Any], force: bool = False) -> Dict[str, Any]:
    center = zone.get("center") or {}
    lat, lng = center.get("lat"), center.get("lng")
    if lat is None or lng is None:
        return zone
    # Skip zones refreshed recently (the background job keeps them current).
    if not force and time.time() - zone.get("_refreshed_at", 0) < MIN_REFRESH_SECONDS:
        return zone
    zone["_refreshed_at"] = time.time()

    try:
        built = build_features(lat, lng)
        prediction, trend = (None, []) if built["missing"] else score_features(built)
    except Exception as e:
        logger.warning("Live refresh failed for %s: %s", zone.get("zone_id"), e)
        with db_store.lock:
            zone["weather_status"] = "UNAVAILABLE"
            zone["inference_status"] = "STALE_LAST_KNOWN"
        return zone

    weather = built["weather"]
    with db_store.lock:
        for src, dst in _WEATHER_DISPLAY_FIELDS:
            if weather.get(src) is not None:
                zone[dst] = weather[src]
        zone["weather_source"] = weather.get("source")
        zone["is_weather_fallback"] = weather.get("is_fallback", False)
        zone["weather_status"] = weather.get("freshness_status", "LIVE")
        zone["weather_observation_time"] = weather.get("observation_time")

        if prediction is None:
            zone["inference_status"] = "STALE_LAST_KNOWN"
            zone["unavailability_reason"] = (
                f"Live data unavailable: {', '.join(built['missing'])}. Showing last known values."
            )
            zone["provenance"] = {**zone.get("provenance", {}), "freshness_status": "STALE"}
            return zone

        f = built["features"]
        for key in ("rainfall_24h", "rainfall_72h", "slope_deg", "soil_moisture", "ndvi",
                    "historical_incidents", "elevation_amsl"):
            zone[key] = f[key]

        zone["ml_base_score"] = prediction["risk_score"]
        final_score = round(min(100.0, zone["ml_base_score"] + zone.get("community_boost", 0.0)), 1)
        zone["risk_score"] = final_score
        zone["risk_level"] = categorize_risk_level(final_score)
        zone["forecast_trend"] = trend
        zone["xai"] = prediction.get("xai", {})
        zone["recommended_action"] = prediction.get("xai", {}).get("recommended_action") or zone.get("recommended_action")
        zone["model_confidence"] = prediction.get("model_confidence")
        zone["tree_variance"] = prediction.get("tree_variance")
        zone["data_quality"] = prediction.get("data_quality")
        zone["precision_context"] = prediction.get("precision_context")
        zone["alert_status"] = "CRITICAL WARNING" if final_score > 80 else ("HIGH ADVISORY" if final_score > 60 else None)
        zone["inference_status"] = "LIVE"
        zone.pop("unavailability_reason", None)
        # Zone boundary/name are still demo seed (is_demo stays True); the values are now live.
        zone["provenance"] = {**zone.get("provenance", {}), **provenance(built), "freshness_status": "LIVE"}
        zone["last_updated"] = datetime.now(timezone.utc).isoformat()
    return zone


def refresh_all_zones(max_workers: int = 6) -> None:
    zones = db_store.get_all_zones()
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
        list(pool.map(lambda z: refresh_zone(z, force=True), zones))
    db_store.refresh_fusion_and_alerts()
    db_store._persist()  # keep the latest real readings across restarts
