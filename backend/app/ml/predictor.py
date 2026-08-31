"""
Landslide Early Warning System - ML Inference & Explainable AI (XAI)
"""

import json
import os
from typing import Any, Dict, List, Tuple
import joblib
import numpy as np

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "feature_metadata.json")

_model = None
_metadata = None


def get_model():
    global _model, _metadata
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"ML Model not found at {MODEL_PATH}. Run train_model.py first.")
        _model = joblib.load(MODEL_PATH)
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, "r") as f:
                _metadata = json.load(f)
    return _model, _metadata


def categorize_risk_level(score: float) -> str:
    if score <= 30.0:
        return "LOW"
    elif score <= 60.0:
        return "MODERATE"
    elif score <= 80.0:
        return "HIGH"
    else:
        return "CRITICAL"


def get_recommended_action(level: str, primary_driver: str) -> str:
    if level == "CRITICAL":
        return f"IMMEDIATE EVACUATION / CLOSURE: Severely elevated instability driven by {primary_driver}. Halt heavy vehicle movement and dispatch SDRF rapid inspection."
    elif level == "HIGH":
        return f"HIGH ALERT: Deploy automated slope inclinometers, issue heavy transport diversions, and alert local disaster control room regarding {primary_driver}."
    elif level == "MODERATE":
        return f"WATCH & ADVISORY: Restrict night travel across vulnerable corridors. Monitor culvert drainage and soil saturation."
    else:
        return "ROUTINE MONITORING: Terrain parameters within standard stability thresholds. Maintain standard telemetry."


def explain_prediction(
    features: Dict[str, float],
    risk_score: float,
    risk_level: str
) -> Dict[str, Any]:
    """
    Computes local feature contribution and human-readable explanation for SIH presentation.
    """
    rain_24 = features.get("rainfall_24h", 0.0)
    rain_72 = features.get("rainfall_72h", rain_24 * 1.8)
    slope = features.get("slope_deg", 15.0)
    moisture = features.get("soil_moisture", 0.3)
    ndvi = features.get("ndvi", 0.5)
    history = features.get("historical_incidents", 0)

    # Local contribution heuristics aligned with physics
    c_slope = max(5.0, (slope / 45.0) * 45.0)
    c_rain = max(5.0, ((rain_24 + rain_72 * 0.3) / 180.0) * 35.0)
    c_moisture = max(3.0, (moisture / 0.8) * 18.0)
    c_history = max(2.0, (history / 10.0) * 12.0)
    c_ndvi = max(1.0, ((1.0 - ndvi) / 0.8) * 10.0)

    total_c = c_slope + c_rain + c_moisture + c_history + c_ndvi
    
    # Normalized factor contribution percentages
    factors = [
        {"name": "Slope Angle", "importance_pct": round((c_slope / total_c) * 100, 1), "value": f"{slope}°"},
        {"name": "Rainfall (24h/72h)", "importance_pct": round((c_rain / total_c) * 100, 1), "value": f"{rain_24} mm / {round(rain_72, 1)} mm"},
        {"name": "Soil Moisture", "importance_pct": round((c_moisture / total_c) * 100, 1), "value": f"{int(moisture * 100)}%"},
        {"name": "Historical Incidents", "importance_pct": round((c_history / total_c) * 100, 1), "value": f"{history} events"},
        {"name": "Vegetation / Land Cover (NDVI)", "importance_pct": round((c_ndvi / total_c) * 100, 1), "value": f"{ndvi:.2f}"}
    ]
    factors.sort(key=lambda x: x["importance_pct"], reverse=True)

    top_factors = [f"{f['name']} ({f['value']})" for f in factors[:2]]
    primary_driver = " and ".join([f["name"] for f in factors[:2]]).lower()

    if risk_score > 60:
        summary = f"{top_factors[0]} and {top_factors[1]} are the primary drivers of current {risk_level.lower()} landslide risk."
    elif risk_score > 30:
        summary = f"Moderate terrain slope with cumulative moisture levels indicates steady saturation. Primary factor: {factors[0]['name']}."
    else:
        summary = "Terrain stability remains robust under current hydrological parameters. Dense vegetation cover mitigates shear stress."

    action = get_recommended_action(risk_level, primary_driver)

    return {
        "factors": factors,
        "summary": summary,
        "recommended_action": action,
        "primary_driver": primary_driver
    }


def predict_landslide_risk(input_data: Dict[str, Any]) -> Dict[str, Any]:
    import pandas as pd
    model, metadata = get_model()

    rain_24 = float(input_data.get("rainfall_24h", 0.0))
    rain_72 = float(input_data.get("rainfall_72h", rain_24 * 1.8))
    slope = float(input_data.get("slope_deg", 20.0))
    moisture = float(input_data.get("soil_moisture", 0.35))
    ndvi = float(input_data.get("ndvi", 0.55))
    history = int(input_data.get("historical_incidents", 1))

    feat_df = pd.DataFrame([{
        "rainfall_24h": rain_24,
        "rainfall_72h": rain_72,
        "slope_deg": slope,
        "soil_moisture": moisture,
        "ndvi": ndvi,
        "historical_incidents": history
    }])

    raw_pred = float(model.predict(feat_df)[0])
    risk_score = round(float(np.clip(raw_pred, 0.0, 100.0)), 1)
    risk_level = categorize_risk_level(risk_score)

    features_dict = {
        "rainfall_24h": rain_24,
        "rainfall_72h": rain_72,
        "slope_deg": slope,
        "soil_moisture": moisture,
        "ndvi": ndvi,
        "historical_incidents": history
    }

    xai = explain_prediction(features_dict, risk_score, risk_level)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "features": features_dict,
        "xai": xai,
        "global_feature_importances": metadata.get("feature_importances") if metadata else {}
    }
