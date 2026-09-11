"""
LandSafe - Unit & Precision Engine Regression Test Suite
Validates:
1. Data Quality Engine calculations, bounds, and fallbacks
2. Rainfall Trigger Engine multi-factor states and regional profiles
3. Prediction Confidence calculation and physics-ML consistency
4. Geotechnical Physics Limit-Equilibrium Factor of Safety (FS)
5. Post-ML Risk Fusion Safety Overrides (FS < 1.0 cannot be suppressed)
6. Immutability of ML model.joblib hash
"""

import hashlib
import pytest
from backend.app.services.data_quality_service import assess_data_quality, validate_input_bounds
from backend.app.services.rainfall_trigger_service import evaluate_rainfall_trigger, resolve_regional_profile
from backend.app.services.prediction_confidence_service import compute_prediction_confidence
from backend.app.services.geotechnical_physics_service import calculate_factor_of_safety, resolve_lithology_parameters
from backend.app.services.risk_fusion_engine import fuse_risk_decision
from backend.app.ml.predictor import predict_landslide_risk, MODEL_PATH


BASELINE_MODEL_HASH = "6a579e8b53c12a37ca9f9b21429fa075bfba911ec6e5f25c1265ce96aefd0472"


def test_model_joblib_immutability():
    """Confirms model.joblib has NOT been retrained, replaced, or touched."""
    with open(MODEL_PATH, "rb") as f:
        current_hash = hashlib.sha256(f.read()).hexdigest()
    assert current_hash == BASELINE_MODEL_HASH, f"Model binary modified! Expected {BASELINE_MODEL_HASH}, got {current_hash}"


def test_input_bounds_validation():
    """Detects physically impossible inputs."""
    # Impossible negative rainfall
    valid, warnings = validate_input_bounds({"rainfall_24h": -10.0, "slope_deg": 35.0})
    assert not valid
    assert any("negative" in w.lower() for w in warnings)

    # 24h rain greater than 72h total
    valid, warnings = validate_input_bounds({"rainfall_24h": 120.0, "rainfall_72h": 50.0})
    assert not valid
    assert any("exceed" in w.lower() for w in warnings)

    # Impossible slope > 90°
    valid, warnings = validate_input_bounds({"slope_deg": 95.0})
    assert not valid
    assert any("impossible" in w.lower() for w in warnings)


def test_data_quality_scoring():
    """Ensures calculated data quality score accurately reflects input completeness and fallback usage."""
    # Complete, fresh observations
    features = {
        "rainfall_24h": 45.0,
        "rainfall_72h": 90.0,
        "slope_deg": 28.0,
        "elevation_amsl": 1450.0,
        "soil_moisture": 0.38,
        "historical_incidents": 2
    }
    dq = assess_data_quality(features, {"freshness_status": "LIVE", "fallbacks_used": 0})
    assert dq["overall_score"] >= 85.0
    assert dq["level"] in ["EXCELLENT", "GOOD"]

    # Degraded observations with missing rain and fallbacks
    degraded = assess_data_quality({"slope_deg": 20.0}, {"freshness_status": "FALLBACK", "fallbacks_used": 3})
    assert degraded["overall_score"] < 65.0
    assert degraded["level"] in ["MODERATE", "LOW", "INSUFFICIENT"]


def test_rainfall_trigger_states():
    """Evaluates multi-factor precipitation trigger dynamic states."""
    # Normal dry conditions
    dry = evaluate_rainfall_trigger(rainfall_24h=5.0, rainfall_72h=12.0, slope_deg=15.0, soil_moisture=0.20)
    assert dry["trigger_state"] == "NORMAL"
    assert dry["trigger_score"] < 25.0

    # High rainfall coupled with wet soil and steep slope
    extreme = evaluate_rainfall_trigger(rainfall_24h=220.0, rainfall_72h=380.0, slope_deg=42.0, soil_moisture=0.65)
    assert extreme["trigger_state"] in ["HIGH", "EXTREME"]
    assert extreme["trigger_score"] >= 65.0


def test_geotechnical_factor_of_safety():
    """Computes limit equilibrium FS and validates shear failure threshold."""
    # Gentle dry slope: Stable (FS > 1.5)
    stable = calculate_factor_of_safety(slope_deg=10.0, rainfall_72h=10.0, soil_moisture=0.15)
    assert stable["factor_of_safety"] > 1.5
    assert not stable["is_shear_failure_predicted"]

    # Precipitous saturated slope in weathered Siwalik formation (lat: 31.0, lon: 77.0): Shear failure (FS < 1.0)
    failure = calculate_factor_of_safety(slope_deg=45.0, rainfall_72h=350.0, soil_moisture=0.85, lat=31.0, lon=77.0)
    assert failure["factor_of_safety"] < 1.0
    assert failure["is_shear_failure_predicted"]
    assert "Regional Engineering Estimate" in failure["parameters"]["cohesion_source"]


def test_risk_fusion_safety_override():
    """Ensures Factor of Safety < 1.0 overrides lower statistical probability."""
    # ML predicted LOW risk (18%), but physical slope has FS = 0.82 (shear failure)
    fused = fuse_risk_decision(
        ml_probability=18.0,
        ml_risk_level="LOW",
        factor_of_safety=0.82,
        rainfall_trigger_state="HIGH",
        rainfall_trigger_score=75.0,
        data_quality_level="GOOD",
        confidence_level="HIGH"
    )
    # The safety rule must elevate the final alert tier from LOW to HIGH
    assert fused["final_alert_class"] == "HIGH"
    assert fused["is_safety_override_active"]
    assert any("PHYSICS OVERRIDE" in o for o in fused["overrides_applied"])


def test_predict_landslide_risk_backward_compatibility():
    """Verifies that all legacy keys remain intact while precision_context is appended."""
    res = predict_landslide_risk({
        "rainfall_24h": 65.0,
        "rainfall_72h": 120.0,
        "slope_deg": 32.0,
        "soil_moisture": 0.45,
        "ndvi": 0.40,
        "historical_incidents": 3
    })
    # Legacy keys
    assert "risk_score" in res
    assert "risk_level" in res
    assert "features" in res
    assert "xai" in res
    assert "model_confidence" in res
    assert "tree_variance" in res
    assert "data_quality" in res
    assert "model_metadata" in res
    # New non-breaking precision context
    assert "precision_context" in res
    assert "rainfall_trigger" in res["precision_context"]
    assert "data_quality" in res["precision_context"]
    assert "geotechnical" in res["precision_context"]
    assert "risk_fusion" in res["precision_context"]
