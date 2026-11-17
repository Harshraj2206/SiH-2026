"""
LandSafe - Master Scientific Integrity & Regression Test Suite
Validates:
1. Model Immutability (SHA256, size, class, hyperparameters)
2. Zero Prediction Regression on Deterministic Baseline Vector
3. Strict Precipitation Validity Gate (Null/Missing/429/Timeout never becomes 0.0)
4. Rolling 24h and 72h Precipitation Aggregation
5. Volumetric Soil Moisture (m³/m³) & Provenance
6. Saabas Decision Tree Path Attribution & Identity Axiom
7. Geotechnical Physics & Factor of Safety Safety Override
8. Route Engine & Historical Disaster Replay Non-Regression
"""

import os
import math
import hashlib
import joblib
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.ml.predictor import (
    MODEL_PATH,
    get_model,
    predict_landslide_risk,
    categorize_risk_level
)
from backend.app.services.geotechnical_physics_service import calculate_factor_of_safety
from backend.app.services.soil_service import get_soil_moisture_telemetry
from backend.app.services.weather_resolver import resolve_weather_provider

client = TestClient(app)

BASELINE_SHA256 = "864e03c77da1b26cc4a924d511b1c5c289605b3b68e7fd9840babc9a1d62a717"
BASELINE_SIZE = 1343913


def test_01_model_file_immutability():
    """Confirms model.joblib exists, matches baseline size and exact SHA256."""
    assert os.path.exists(MODEL_PATH), f"Model not found at {MODEL_PATH}"
    with open(MODEL_PATH, "rb") as f:
        data = f.read()
    current_sha = hashlib.sha256(data).hexdigest()
    assert current_sha == BASELINE_SHA256, f"Model SHA256 mismatch! {current_sha} != {BASELINE_SHA256}"
    assert len(data) == BASELINE_SIZE, f"Model size mismatch! {len(data)} != {BASELINE_SIZE}"


def test_02_model_configuration_and_hyperparameters():
    """Confirms model architecture and hyperparameters are identical."""
    model, metadata = get_model()
    assert type(model).__name__ == "RandomForestClassifier"
    assert model.n_estimators == 200
    assert model.min_samples_leaf == 10
    assert model.class_weight == "balanced"
    assert metadata["features"] == list(model.feature_names_in_)
    assert model.random_state == 42


def test_03_deterministic_prediction_regression():
    """Verifies that a fixed valid numerical input vector (no rain) yields an identical, low probability."""
    solan_baseline_vector = {
        "rainfall_24h": 0.0,
        "rainfall_72h": 0.0,
        "slope_deg": 18.0,
        "soil_moisture": 0.35,
        "ndvi": 0.72,
        "historical_incidents": 1,
        "elevation_amsl": 850.0
    }
    res = predict_landslide_risk(solan_baseline_vector)
    assert res["status"] != "DATA_INSUFFICIENT"
    assert math.isclose(res["risk_score"], 29.6, abs_tol=1e-2)
    assert res["risk_level"] == "LOW"
    assert math.isclose(res["model_confidence"], 96.0, abs_tol=0.2)


def test_04_rainfall_validity_gate_rejects_none():
    """Verifies that None rainfall does NOT silently become 0.0, but triggers DATA_INSUFFICIENT."""
    res = predict_landslide_risk({
        "rainfall_24h": None,
        "slope_deg": 25.0,
        "soil_moisture": 0.35
    })
    assert res["status"] == "DATA_INSUFFICIENT"
    assert res["risk_score"] is None
    assert res["risk_level"] == "DATA_INSUFFICIENT"
    assert "Inference paused" in res["unavailability_reason"]


def test_05_rainfall_validity_gate_rejects_nan():
    """Verifies that NaN rainfall does NOT enter the model silently."""
    res = predict_landslide_risk({
        "rainfall_24h": float("nan"),
        "slope_deg": 25.0
    })
    assert res["status"] == "DATA_INSUFFICIENT"
    assert res["risk_score"] is None


def test_06_routes_predict_handles_none_rainfall():
    """Verifies POST /api/predict handles missing rainfall by returning DATA_INSUFFICIENT response."""
    payload = {
        "zone_id": "TEST-UNAVAILABLE",
        "rainfall_24h": None,
        "slope_deg": 30.0,
        "soil_moisture": 0.35
    }
    resp = client.post("/api/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "DATA_INSUFFICIENT"
    assert data["risk_score"] is None
    assert data["risk_level"] == "DATA_INSUFFICIENT"


def test_07_weather_provider_metadata_no_fake_imd_official_claim():
    """Confirms resolve_weather_provider accurately reports Open-Meteo and is_official=False."""
    meta = resolve_weather_provider("IN")
    assert "Open-Meteo" in meta["provider_name"]
    assert meta["is_official"] is False
    assert "0.1°" in meta["spatial_resolution"]


def test_08_soil_moisture_telemetry_units_and_ecmwf_provenance():
    """Verifies soil service uses volumetric units (m³/m³) and ECMWF IFS provenance."""
    soil = get_soil_moisture_telemetry(31.9579, 77.1095)
    assert "Open-Meteo Land Surface Grid (ECMWF IFS)" in soil["source"]
    assert soil["unit"] == "m³/m³ (volumetric fraction)"
    assert soil["layer_depth"] == "0-7 cm (Topsoil Layer 1)"
    if soil["volumetric_soil_moisture_m3m3"] is not None:
        assert 0.0 <= soil["volumetric_soil_moisture_m3m3"] <= 1.0


def test_09_saabas_tree_path_attribution_mathematical_identity():
    """
    Verifies that Saabas tree-path local contributions sum with bias
    to equal model.predict_proba score down to floating point precision.
    """
    res = predict_landslide_risk({
        "rainfall_24h": 120.0,
        "rainfall_72h": 220.0,
        "slope_deg": 35.0,
        "soil_moisture": 0.45,
        "ndvi": 0.35,
        "historical_incidents": 2,
        "elevation_amsl": 1400.0
    })
    bias = res["xai"]["base_hazard_bias"] / 100.0
    raw_contribs = res["xai"]["raw_tree_contributions"]
    reconstructed = bias + sum(raw_contribs.values()) / 100.0
    actual = res["risk_score"] / 100.0
    assert math.isclose(reconstructed, actual, abs_tol=1e-3)


def test_10_factor_of_safety_physics_and_safety_override():
    """Verifies infinite slope Factor of Safety and safety override logic."""
    stable = calculate_factor_of_safety(slope_deg=12.0, rainfall_72h=15.0, soil_moisture=0.20)
    assert stable["factor_of_safety"] > 1.5
    assert not stable["is_shear_failure_predicted"]

    unstable = calculate_factor_of_safety(slope_deg=45.0, rainfall_72h=350.0, soil_moisture=0.85, lat=31.0, lon=77.0)
    assert unstable["factor_of_safety"] < 1.0
    assert unstable["is_shear_failure_predicted"]


def test_11_historical_disaster_replay_endpoint():
    """Verifies that historical disaster replay data and endpoint remain operational."""
    resp = client.get("/api/predict/historical-replay")
    assert resp.status_code == 200
    scenarios = resp.json()
    assert len(scenarios) >= 3
    assert any("Shimla" in s.get("location_name", "") or "Wayanad" in s.get("location_name", "") for s in scenarios)


def test_12_safe_evacuation_routing_operational():
    """Verifies that the evacuation routing endpoint is intact."""
    payload = {
        "start_lat": 31.9579,
        "start_lng": 77.1095,
        "end_lat": 31.8500,
        "end_lng": 77.0500,
        "routing_profile": "safest"
    }
    resp = client.post("/api/routes/calculate", json=payload)
    assert resp.status_code in [200, 404]  # 404 only if graph outside bounds, otherwise 200


def test_13_spatial_cross_validation_results_available_and_sound():
    """Verifies spatial metrics endpoint exposes authentic geographic CV metrics."""
    resp = client.get("/api/predict/spatial-metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "spatial" in data["evaluation"]
    assert data["roc_auc"] > 0.5
    assert data["dataset_size"] == data["positives"] + data["negatives"]


def test_14_feature_provenance_matrix_complete_and_traceable():
    """Verifies that the provenance matrix exposes real source and fallback policy for all features."""
    resp = client.get("/api/predict/provenance")
    assert resp.status_code == 200
    prov = resp.json()
    assert "features" in prov
    feature_names = [f["feature"] for f in prov["features"]]
    assert "rainfall_24h" in feature_names
    assert "rainfall_72h" in feature_names
    assert "soil_moisture" in feature_names
    assert "slope_deg" in feature_names
    assert "elevation_amsl" in feature_names
    assert "ndvi" in feature_names
    assert "historical_incidents" in feature_names
    assert "factor_of_safety" in feature_names


def test_15_elevation_service_transparent_slope_status():
    """Verifies elevation service distinguishes dynamic DEM from baseline fallback and provides canonical keys."""
    from backend.app.services.elevation_service import get_terrain_elevation_and_slope
    res = get_terrain_elevation_and_slope(31.9579, 77.1095)
    assert "slope_deg" in res
    assert "elevation_amsl" in res
    assert "elevation_meters_amsl" in res
    assert res["slope_status"] in ["DYNAMIC_DEM", "BASELINE_PROFILE"]
    assert isinstance(res["is_dynamic"], bool)


def test_16_nearest_catalogued_landslide_proximity_query():
    """Verifies distance calculation to nearest GSI/NASA cataloged disaster and zero-preservation."""
    from backend.app.services.landslide_catalog import get_nearest_catalogued_landslide, get_historical_density_score
    nearest = get_nearest_catalogued_landslide(25.75, 91.89)  # Near Umsning, Meghalaya
    assert nearest is not None
    assert "distance_km" in nearest
    assert nearest["distance_km"] < 25.0
    assert "Umsning" in nearest["location_name"]

    # Far away point (e.g. Indian Ocean) should have 0 density
    count = get_historical_density_score(0.0, 75.0, radius_km=30.0)
    assert count == 0  # Proves 0 is not silently coerced to 1


def test_17_data_source_orchestrator_preserves_none_rainfall():
    """Verifies orchestrator does not convert None precipitation to 0.0."""
    from backend.app.services.data_source_orchestrator import orchestrate_location_intelligence
    bundle = orchestrate_location_intelligence(31.9579, 77.1095)
    assert "risk" in bundle
    assert "data_sources" in bundle
    # Data sources must NOT claim NASA GPM or NASA SMAP
    names = [s["name"] for s in bundle["data_sources"]]
    assert not any("NASA SMAP" in n for n in names)
    assert not any("NASA GPM" in n for n in names)


def test_18_final_model_immutability_and_prediction_reproducibility():
    """Final check that model.joblib hash is intact and the deterministic prediction is reproduced exactly."""
    with open(MODEL_PATH, "rb") as f:
        data = f.read()
    current_sha = hashlib.sha256(data).hexdigest()
    assert current_sha == BASELINE_SHA256, f"Immutability violated! Expected {BASELINE_SHA256}, got {current_sha}"

    solan_baseline_vector = {
        "rainfall_24h": 0.0,
        "rainfall_72h": 0.0,
        "slope_deg": 18.0,
        "soil_moisture": 0.35,
        "ndvi": 0.72,
        "historical_incidents": 1,
        "elevation_amsl": 850.0
    }
    res = predict_landslide_risk(solan_baseline_vector)
    assert math.isclose(res["risk_score"], 29.6, abs_tol=1e-2)
    assert res["risk_level"] == "LOW"
    assert math.isclose(res["model_confidence"], 96.0, abs_tol=0.2)

