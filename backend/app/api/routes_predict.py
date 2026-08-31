"""
Landslide Early Warning System - ML Prediction API
"""

from fastapi import APIRouter
from backend.app.models.schemas import PredictionInput, PredictionResponse
from backend.app.ml.predictor import predict_landslide_risk

router = APIRouter(prefix="/api/predict", tags=["AI Prediction"])


@router.post("", response_model=PredictionResponse)
async def predict_risk(input_data: PredictionInput):
    data_dict = {
        "rainfall_24h": input_data.rainfall_24h,
        "rainfall_72h": input_data.rainfall_72h or (input_data.rainfall_24h * 1.8),
        "slope_deg": input_data.slope_deg,
        "soil_moisture": input_data.soil_moisture,
        "ndvi": input_data.ndvi if input_data.ndvi is not None else 0.55,
        "historical_incidents": input_data.historical_incidents or 1
    }

    result = predict_landslide_risk(data_dict)
    
    return PredictionResponse(
        zone_id=input_data.zone_id or "NER-PREDICT",
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        features=result["features"],
        xai=result["xai"],
        global_feature_importances=result["global_feature_importances"]
    )
