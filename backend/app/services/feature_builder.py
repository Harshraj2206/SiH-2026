"""
One shared place that turns a coordinate into model features and a risk forecast,
so every page (zones, map inspector, location intelligence) scores a point the same way.

Live inputs: Open-Meteo rain (past + hourly forecast) and soil moisture, Open-Meteo DEM
slope/elevation (Copernicus GLO-90), NASA-catalogued landslides within 35 km.
Any missing input => risk is not computed (unknown is not zero). Points outside India are
not scored: the model was trained only on Indian landslides.
"""

from typing import Any, Dict, List, Tuple

from backend.app.ml.predictor import predict_landslide_risk, categorize_risk_level
from backend.app.services.weather_service import fetch_live_meteorology
from backend.app.services.elevation_service import get_terrain_elevation_and_slope
from backend.app.services.landslide_catalog import get_historical_density_score
from backend.app.services.coverage import in_india

OUTSIDE_INDIA_REASON = "Risk scores are only available for places in India (the model was trained on Indian landslides)."


def build_features(latitude: float, longitude: float, state: str = "") -> Dict[str, Any]:
    weather = fetch_live_meteorology(latitude, longitude)
    dem = get_terrain_elevation_and_slope(latitude, longitude)

    features = {
        "rainfall_24h": weather.get("rainfall_24h_mm"),
        "rainfall_72h": weather.get("rainfall_72h_mm"),
        "slope_deg": dem.get("slope_deg"),
        "soil_moisture": weather.get("soil_moisture_m3m3"),
        "ndvi": None,  # not a model input
        "historical_incidents": get_historical_density_score(latitude, longitude),
        "elevation_amsl": dem.get("elevation_amsl"),
    }
    missing = [name for name, key in (("24 h rain", "rainfall_24h"), ("72 h rain", "rainfall_72h"),
                                      ("slope", "slope_deg"), ("soil moisture", "soil_moisture"),
                                      ("elevation", "elevation_amsl")) if features[key] is None]
    soil_missing = features["soil_moisture"] is None
    dem_missing = not dem.get("is_dynamic", False)
    context = {
        # The predictor's rainfall-trigger and slope-physics checks are location-specific.
        "latitude": latitude,
        "longitude": longitude,
        "state": state,
        "metadata": {
            "freshness_status": "LIVE" if weather.get("observation_time") else "RECENT",
            "is_cached": False,
            "soil_is_fallback": soil_missing,
            "dem_is_fallback": dem_missing,
            "fallbacks_used": int(soil_missing) + int(dem_missing),
        },
    }
    return {
        "features": features,
        "context": context,
        "missing": missing,
        "weather": weather,
        "dem": dem,
        "in_india": in_india(latitude, longitude),
    }


def _model_input(features: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    data = {k: v for k, v in features.items() if v is not None}
    return {**data, **context}


def score_features(built: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """Return (prediction, forecast_trend). forecast_trend uses the real hourly rain forecast."""
    features = built["features"]
    if not built.get("in_india", True):
        return {
            "status": "OUTSIDE_COVERAGE",
            "risk_score": None,
            "risk_level": "OUTSIDE_COVERAGE",
            "unavailability_reason": OUTSIDE_INDIA_REASON,
        }, []
    if built["missing"]:
        prediction = {
            "status": "DATA_INSUFFICIENT",
            "risk_score": None,
            "risk_level": "DATA_INSUFFICIENT",
            "unavailability_reason": f"Not available right now: {', '.join(built['missing'])}. No score without it.",
        }
        return prediction, []

    prediction = predict_landslide_risk(_model_input(features, built["context"]))
    score = prediction.get("risk_score")
    trend = [{"timeframe": "Current", "hour_offset": 0, "predicted_rainfall_mm": features["rainfall_24h"],
              "predicted_risk_score": score, "risk_level": prediction.get("risk_level")}]

    for outlook in built["weather"].get("rainfall_outlook") or []:
        r24 = outlook.get("rainfall_24h_mm")
        if r24 is None:
            continue
        future = {**features, "rainfall_24h": r24, "rainfall_72h": outlook.get("rainfall_72h_mm")}
        future_score = predict_landslide_risk(_model_input(future, built["context"])).get("risk_score")
        if future_score is None:
            continue
        trend.append({
            "timeframe": f"+{outlook['hour_offset']}h",
            "hour_offset": outlook["hour_offset"],
            "predicted_rainfall_mm": r24,
            "predicted_risk_score": future_score,
            "risk_level": categorize_risk_level(future_score),
        })
    return prediction, trend


def provenance(built: Dict[str, Any]) -> Dict[str, Any]:
    """Where each input came from, for display next to the score."""
    weather, dem = built["weather"], built["dem"]
    return {
        "rainfall_source": weather.get("source"),
        "rainfall_status": "LIVE" if built["features"]["rainfall_24h"] is not None else "UNAVAILABLE",
        "weather_observed_at": weather.get("observation_time"),
        "forecast_source": "Open-Meteo hourly forecast" if weather.get("rainfall_outlook") else "UNAVAILABLE",
        "dem_source": dem.get("source"),
        "slope_status": "LIVE" if dem.get("is_dynamic") else "UNAVAILABLE",
        "history_source": "NASA Global Landslide Catalog (landslides within 35 km, 2007-2016)",
    }
