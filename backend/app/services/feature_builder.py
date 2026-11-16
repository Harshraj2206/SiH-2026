"""
One shared place that turns a coordinate into model features and a risk forecast,
so every page (zones, map inspector, location intelligence) scores a point the same way.

Live inputs: Open-Meteo rain (past + hourly forecast) and soil moisture, Open-Meteo DEM
slope/elevation, NASA MODIS NDVI, catalogued landslides within 35 km.
Missing rain, slope or soil moisture => risk is not computed (UNKNOWN != ZERO).
"""

from typing import Any, Dict, List, Tuple

from backend.app.ml.predictor import predict_landslide_risk, categorize_risk_level
from backend.app.services.weather_service import fetch_live_meteorology
from backend.app.services.elevation_service import get_terrain_elevation_and_slope
from backend.app.services.ndvi_service import get_ndvi
from backend.app.services.landslide_catalog import get_historical_density_score

NDVI_FALLBACK = 0.5  # neutral vegetation value, used only when MODIS is unreachable (labelled)


def build_features(latitude: float, longitude: float, state: str = "") -> Dict[str, Any]:
    weather = fetch_live_meteorology(latitude, longitude)
    dem = get_terrain_elevation_and_slope(latitude, longitude)
    ndvi = get_ndvi(latitude, longitude)

    features = {
        "rainfall_24h": weather.get("rainfall_24h_mm"),
        "rainfall_72h": weather.get("rainfall_72h_mm"),
        "slope_deg": dem.get("slope_deg"),
        "soil_moisture": weather.get("soil_moisture_m3m3"),
        "ndvi": ndvi["ndvi"] if ndvi.get("ndvi") is not None else NDVI_FALLBACK,
        "historical_incidents": get_historical_density_score(latitude, longitude),
        "elevation_amsl": dem.get("elevation_amsl"),
    }
    missing = [name for name, key in (("rainfall", "rainfall_24h"), ("slope", "slope_deg"),
                                      ("soil moisture", "soil_moisture")) if features[key] is None]
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
            "fallbacks_used": int(soil_missing) + int(dem_missing) + int(ndvi.get("ndvi") is None),
        },
    }
    return {
        "features": features,
        "context": context,
        "missing": missing,
        "weather": weather,
        "dem": dem,
        "ndvi": {**ndvi, "used_value": features["ndvi"], "is_fallback": ndvi.get("ndvi") is None},
    }


def _model_input(features: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    data = {k: v for k, v in features.items() if v is not None}
    return {**data, **context}


def score_features(built: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """Return (prediction, forecast_trend). forecast_trend uses the real hourly rain forecast."""
    features = built["features"]
    if built["missing"]:
        prediction = {
            "status": "DATA_INSUFFICIENT",
            "risk_score": None,
            "risk_level": "DATA_INSUFFICIENT",
            "unavailability_reason": f"Live data unavailable: {', '.join(built['missing'])}. Risk not computed.",
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
    weather, dem, ndvi = built["weather"], built["dem"], built["ndvi"]
    return {
        "rainfall_source": weather.get("source"),
        "rainfall_status": "LIVE" if built["features"]["rainfall_24h"] is not None else "UNAVAILABLE",
        "weather_observed_at": weather.get("observation_time"),
        "forecast_source": "Open-Meteo hourly forecast" if weather.get("rainfall_outlook") else "UNAVAILABLE",
        "dem_source": dem.get("source"),
        "slope_status": "LIVE" if dem.get("is_dynamic") else "UNAVAILABLE",
        "ndvi_source": ndvi.get("source"),
        "ndvi_status": ndvi.get("status"),
        "ndvi_date": ndvi.get("date"),
        "ndvi_note": f"MODIS unavailable; neutral {NDVI_FALLBACK} used" if ndvi.get("is_fallback") else None,
        "history_source": "LandSafe landslide catalogue (35 km radius; demo seed until GSI import)",
    }
