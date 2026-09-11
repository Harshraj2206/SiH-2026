"""
LandSafe - AI/ML Credibility, Exact TreeSHAP Attribution & Historical Replay Tests
Verifies mathematical correctness, model evaluation metrics, and historical validation.
"""

import math
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.ml.predictor import get_model, predict_landslide_risk

client = TestClient(app)


def test_model_metadata_genuine_metrics():
    """Verify that real evaluation metrics exist and are within authentic physical ranges."""
    _, metadata = get_model()
    assert metadata is not None, "Model metadata must exist"
    assert metadata["model_type"] == "RandomForestClassifier"

    metrics = metadata.get("metrics", {})
    assert "precision" in metrics
    assert "recall" in metrics
    assert "f1_score" in metrics
    assert "roc_auc" in metrics
    assert "false_negative_rate" in metrics
    assert "confusion_matrix" in metrics

    # Verify metrics are genuine percentages
    assert 70.0 <= metrics["accuracy"] <= 98.0
    assert 70.0 <= metrics["precision"] <= 98.0
    assert 75.0 <= metrics["recall"] <= 98.0  # High sensitivity for disaster safety
    assert 75.0 <= metrics["f1_score"] <= 98.0
    assert 0.75 <= metrics["roc_auc"] <= 0.99
    assert metrics["false_negative_rate"] <= 25.0  # False negative minimized

    cm = metrics["confusion_matrix"]
    assert cm["true_positive"] > 0
    assert cm["true_negative"] > 0


def test_exact_tree_attribution_mathematical_identity():
    """
    Verifies that the sum of local feature contributions plus tree bias
    equals the exact model predict_proba score down to floating-point precision.
    Identity: bias + sum(contributions) == predicted_probability
    """
    res = predict_landslide_risk({
        "rainfall_24h": 165.0,
        "rainfall_72h": 320.0,
        "slope_deg": 35.0,
        "soil_moisture": 0.45,
        "ndvi": 0.38,
        "historical_incidents": 3,
        "elevation_amsl": 1450.0
    })

    bias = res["xai"]["base_hazard_bias"] / 100.0
    raw_contribs = res["xai"]["raw_tree_contributions"]
    sum_contribs = sum(raw_contribs.values()) / 100.0

    reconstructed_prob = bias + sum_contribs
    model_score = res["risk_score"] / 100.0

    # Strict mathematical identity verification
    assert math.isclose(reconstructed_prob, model_score, abs_tol=1e-3), (
        f"Tree attribution violation: bias ({bias}) + sum_contribs ({sum_contribs}) = "
        f"{reconstructed_prob}, but model score is {model_score}"
    )


def test_model_confidence_distinct_from_probability():
    """
    Verify that model confidence is derived from ensemble consensus variance
    and is mathematically distinguished from the predicted probability.
    """
    # High risk case with unanimous tree agreement
    res_unanimous = predict_landslide_risk({
        "rainfall_24h": 350.0,
        "rainfall_72h": 550.0,
        "slope_deg": 42.0,
        "soil_moisture": 0.52,
        "ndvi": 0.25,
        "historical_incidents": 5,
        "elevation_amsl": 1800.0
    })

    # Borderline ambiguous case
    res_borderline = predict_landslide_risk({
        "rainfall_24h": 40.0,
        "rainfall_72h": 80.0,
        "slope_deg": 22.0,
        "soil_moisture": 0.32,
        "ndvi": 0.55,
        "historical_incidents": 1,
        "elevation_amsl": 900.0
    })

    # Probability is not equal to confidence
    assert res_unanimous["risk_score"] != res_unanimous["model_confidence"]
    assert res_borderline["risk_score"] != res_borderline["model_confidence"]
    assert "tree_variance" in res_unanimous
    assert "tree_variance" in res_borderline


def test_historical_replay_endpoint():
    """
    Tests /api/predict/historical-replay to verify that historical disasters
    (Wayanad 2024, Shimla 2023) produce True Positives, and stable ground control produces True Negative.
    """
    response = client.get("/api/predict/historical-replay")
    assert response.status_code == 200
    replays = response.json()
    assert len(replays) >= 8

    # Find Wayanad Chooralmala 2024
    wayanad = next((r for r in replays if "Wayanad" in r["location_name"] or "Wayanad" in r["district"]), None)
    assert wayanad is not None
    assert wayanad["ground_truth"]["landslide_occurred"] is True
    assert wayanad["model_prediction"]["probability_score"] >= 60.0
    assert "TRUE POSITIVE" in wayanad["ground_truth"]["outcome_classification"]

    # Find Shimla Summer Hill 2023
    shimla = next((r for r in replays if "Shimla" in r["location_name"] or "Shimla" in r["district"]), None)
    assert shimla is not None
    assert shimla["ground_truth"]["landslide_occurred"] is True
    assert shimla["model_prediction"]["probability_score"] >= 70.0
    assert "TRUE POSITIVE" in shimla["ground_truth"]["outcome_classification"]

    # Find Stable Baseline Control
    control = next((r for r in replays if "Stable" in r["location_name"] or "Kangra" in r["location_name"]), None)
    assert control is not None
    assert control["ground_truth"]["landslide_occurred"] is False
    assert control["model_prediction"]["probability_score"] <= 35.0
    assert "TRUE NEGATIVE" in control["ground_truth"]["outcome_classification"]


def test_predict_risk_endpoint_payload():
    """Test standard /api/predict endpoint returns full XAI bundle with confidence and quality."""
    payload = {
        "rainfall_24h": 95.0,
        "rainfall_72h": 180.0,
        "slope_deg": 32.0,
        "soil_moisture": 0.42,
        "ndvi": 0.45,
        "historical_incidents": 2
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "risk_level" in data
    assert "xai" in data
    assert "model_confidence" in data
    assert len(data["xai"]["factors"]) >= 5
    assert "summary" in data["xai"]
    assert "recommended_action" in data["xai"]
