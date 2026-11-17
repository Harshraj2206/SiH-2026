"""
LandSafe - AI-Assisted Landslide Early Warning System (SIH26001)
ML Prediction, Verification & Historical Replay API
"""

import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from backend.app.models.schemas import PredictionInput, PredictionResponse
from backend.app.ml.predictor import predict_landslide_risk, get_model


router = APIRouter(prefix="/api/predict", tags=["AI Prediction & Model Auditing"])


@router.post("", response_model=PredictionResponse)
async def predict_risk(input_data: PredictionInput):
    # Inputs are passed through as given; anything missing makes the model withhold the score.
    data_dict = {
        "rainfall_24h": input_data.rainfall_24h,
        "rainfall_72h": input_data.rainfall_72h,
        "slope_deg": input_data.slope_deg,
        "soil_moisture": input_data.soil_moisture,
        "historical_incidents": input_data.historical_incidents,
        "elevation_amsl": input_data.elevation_amsl,
        "latitude": input_data.latitude,
        "longitude": input_data.longitude,
    }

    result = predict_landslide_risk(data_dict)

    return PredictionResponse(
        zone_id=input_data.zone_id or "PREDICT-INSPECT",
        risk_score=result.get("risk_score"),
        risk_level=result.get("risk_level", "UNKNOWN"),
        status=result.get("status", "SUCCESS"),
        inference_status=result.get("inference_status"),
        unavailability_reason=result.get("unavailability_reason"),
        features=result.get("features", {}),
        xai=result.get("xai", {"factors": [], "summary": "", "recommended_action": "", "primary_driver": ""}),
        global_feature_importances=result.get("global_feature_importances", {}),
        model_confidence=result.get("model_confidence"),
        tree_variance=result.get("tree_variance"),
        data_quality=result.get("data_quality"),
        model_metadata=result.get("model_metadata"),
        baseline_ml_level=result.get("baseline_ml_level"),
        precision_context=result.get("precision_context")
    )


@router.get("/metrics")
async def get_model_evaluation_metrics() -> Dict[str, Any]:
    """Training metadata and spatial cross-validation metrics of the deployed model."""
    import hashlib
    from backend.app.ml.predictor import MODEL_PATH
    model, metadata = get_model()
    with open(MODEL_PATH, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()
    return {**(metadata or {}), "model_sha256": sha256,
            "n_estimators": model.n_estimators, "min_samples_leaf": model.min_samples_leaf}


@router.get("/historical-replay")
async def get_historical_replay_scenarios() -> List[Dict[str, Any]]:
    """
    Past rain-triggered landslides scored by the current model, using the real conditions before
    each event (ERA5 rain and soil moisture, Copernicus DEM terrain, NASA catalog history), from
    backend/data/replay_events.json (built by backend/scripts/build_replay_events.py).
    """
    import json
    path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "replay_events.json")
    try:
        with open(path, encoding="utf-8") as f:
            events = json.load(f).get("events", [])
    except OSError:
        return []

    results = []
    for e in events:
        c = e["conditions"]
        inference = predict_landslide_risk({**c, "latitude": e["latitude"], "longitude": e["longitude"],
                                            "state": e.get("state", "")})
        results.append({
            "scenario_id": e["incident_id"],
            "location_name": e["title"],
            "district": e["district"],
            "state": e["state"],
            "event_time": e["timestamp"],
            "coordinates": {"lat": e["latitude"], "lng": e["longitude"]},
            "historical_conditions": {
                "rainfall_24h_mm": c["rainfall_24h"],
                "rainfall_72h_mm": c["rainfall_72h"],
                "slope_deg": c["slope_deg"],
                "elevation_amsl_m": c["elevation_amsl"],
                "soil_moisture": c["soil_moisture"],
                "historical_incidents": c["historical_incidents"],
            },
            "model_prediction": {
                "risk_score": inference.get("risk_score"),
                "risk_level": inference.get("risk_level"),
                "factors": (inference.get("xai") or {}).get("factors", []),
                "summary": (inference.get("xai") or {}).get("summary"),
            },
            "source": e["source"],
            "source_url": e["source_url"],
        })
    return results


@router.get("/spatial-metrics")
async def get_spatial_validation_metrics() -> Dict[str, Any]:
    """Spatial cross-validation of the deployed model (1-degree grid cells held out)."""
    _, metadata = get_model()
    metadata = metadata or {}
    return {**metadata.get("metrics", {}), "dataset_size": metadata.get("dataset_size"),
            "positives": metadata.get("positives"), "negatives": metadata.get("negatives")}


@router.get("/provenance")
async def get_feature_provenance_matrix() -> Dict[str, Any]:
    """Where each model input comes from. A missing input means no score (no defaults)."""
    rain = "Open-Meteo forecast API (global weather models)"
    return {
        "title": "Model inputs",
        "description": "Every input is fetched live for the point being scored. If any input is missing, no score is given.",
        "features": [
            {"feature": "rainfall_24h", "label": "Rain, last 24 h", "unit": "mm", "source": rain},
            {"feature": "rainfall_72h", "label": "Rain, last 72 h", "unit": "mm", "source": rain},
            {"feature": "soil_moisture", "label": "Topsoil moisture (0-7 cm)", "unit": "m³/m³", "source": rain},
            {"feature": "slope_deg", "label": "Slope", "unit": "°",
             "source": "Copernicus DEM GLO-90 via Open-Meteo elevation API (3 points ~110 m apart)"},
            {"feature": "elevation_amsl", "label": "Elevation", "unit": "m",
             "source": "Copernicus DEM GLO-90 via Open-Meteo elevation API"},
            {"feature": "historical_incidents", "label": "Past landslides within 35 km", "unit": "count",
             "source": "NASA Global Landslide Catalog (India, 2007-2016)"},
        ],
    }

