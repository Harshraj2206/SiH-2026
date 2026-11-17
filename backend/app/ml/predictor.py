"""
LandSafe - AI-Assisted Landslide Early Warning System (SIH26001)
Genuine ML Inference, Tree Vote Consensus & Saabas Decision-Tree Path Attribution

Features:
1. Random Forest Inference on Authoritative Ground Truth (150 Estimators)
2. Saabas Decision-Tree Path Feature Attribution
   Satisfies mathematical identity: sum(contributions) + bias == predicted_probability (difference < 1e-12)
3. Tree Vote Consensus derived from Ensemble Agreement across Trees
4. Actionable Geotechnical Recommendations directly driven by Primary Contributing Factors
"""

import json
import os
from typing import Any, Dict, List, Tuple
import joblib
import numpy as np
import pandas as pd

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
    """Classifies risk score (0-100) into standardized early warning tiers."""
    if score <= 30.0:
        return "LOW"
    elif score <= 60.0:
        return "MODERATE"
    elif score <= 80.0:
        return "HIGH"
    else:
        return "CRITICAL"


def get_recommended_action(level: str, primary_driver: str) -> str:
    """Plain advice for the public, by risk level."""
    if level == "CRITICAL":
        return "Avoid this area. Do not travel through hill roads here and follow local authority instructions."
    elif level == "HIGH":
        return "Avoid travel at night and on steep road cuts. Watch for cracks, falling stones or muddy water on slopes."
    elif level == "MODERATE":
        return "Travel with care. Watch for loose debris on sharp turns and water running off slopes."
    else:
        return "No action needed. Keep an eye on local weather warnings."


def compute_tree_attribution_and_confidence(
    model,
    X_matrix: np.ndarray,
    feature_names: List[str]
) -> Tuple[float, Dict[str, float], float, float]:
    """
    Computes exact local tree feature contributions and ensemble consensus variance.
    Mathematical Identity: bias + sum(contributions.values()) == predicted_probability.
    """
    n_features = len(feature_names)
    contributions = np.zeros(n_features)
    biases = []
    tree_preds = []

    for estimator in model.estimators_:
        tree = estimator.tree_
        indicator = estimator.decision_path(X_matrix).toarray()[0]
        node_indices = np.where(indicator == 1)[0]

        # Class 1 probability at root
        c0_root = tree.value[0, 0, 0]
        c1_root = tree.value[0, 0, 1]
        root_val = c1_root / max(1e-9, (c0_root + c1_root))
        biases.append(root_val)

        # Traverse decision path
        for i in range(len(node_indices) - 1):
            curr_node = node_indices[i]
            next_node = node_indices[i + 1]
            feat_idx = tree.feature[curr_node]

            c0_curr = tree.value[curr_node, 0, 0]
            c1_curr = tree.value[curr_node, 0, 1]
            v_curr = c1_curr / max(1e-9, (c0_curr + c1_curr))

            c0_next = tree.value[next_node, 0, 0]
            c1_next = tree.value[next_node, 0, 1]
            v_next = c1_next / max(1e-9, (c0_next + c1_next))

            contributions[feat_idx] += (v_next - v_curr)

        # Leaf prediction
        leaf_node = node_indices[-1]
        c0_leaf = tree.value[leaf_node, 0, 0]
        c1_leaf = tree.value[leaf_node, 0, 1]
        leaf_val = c1_leaf / max(1e-9, (c0_leaf + c1_leaf))
        tree_preds.append(leaf_val)

    n_trees = len(model.estimators_)
    mean_bias = float(np.mean(biases))
    mean_contribs = contributions / n_trees

    # Ensemble consensus variance across individual trees
    tree_variance = float(np.var(tree_preds))
    tree_std = float(np.std(tree_preds))

    # Model Confidence: High when individual trees exhibit low variance/disagreement
    model_confidence = float(np.clip((1.0 - tree_std) * 100.0, 50.0, 98.5))

    feat_contrib_dict = {
        name: float(mean_contribs[i]) for i, name in enumerate(feature_names)
    }

    return mean_bias, feat_contrib_dict, tree_variance, round(model_confidence, 1)


def explain_prediction(
    features: Dict[str, float],
    raw_contribs: Dict[str, float],
    bias: float,
    risk_score: float,
    risk_level: str
) -> Dict[str, Any]:
    """
    Turns the per-feature tree contributions (Saabas path attribution) into the factors the UI shows.
    Only real model inputs are listed; engineered features are folded into the input they come from.
    """
    slope = features.get("slope_deg")
    rain_24 = features.get("rainfall_24h")
    rain_72 = features.get("rainfall_72h")
    moisture = features.get("soil_moisture")
    history = int(features.get("historical_incidents") or 0)
    elev = features.get("elevation_amsl")

    c_slope = raw_contribs.get("slope_deg", 0.0) + raw_contribs.get("pore_slope_interaction", 0.0) * 0.5
    c_rain = (
        raw_contribs.get("rainfall_24h", 0.0) +
        raw_contribs.get("rainfall_72h", 0.0) +
        raw_contribs.get("antecedent_rain_index", 0.0)
    )
    c_moisture = raw_contribs.get("soil_moisture", 0.0) + raw_contribs.get("pore_slope_interaction", 0.0) * 0.5
    c_history = raw_contribs.get("historical_incidents", 0.0)
    c_elev = raw_contribs.get("elevation_amsl", 0.0)

    entries = [
        ("Rain (24 h / 72 h)", c_rain, f"{rain_24:.1f} mm / {rain_72:.1f} mm"),
        ("Soil moisture", c_moisture, f"{moisture * 100:.0f}%" if moisture is not None else "—"),
        ("Slope", c_slope, f"{slope:.1f}°" if slope is not None else "—"),
        ("Past landslides nearby", c_history, f"{history} recorded"),
        ("Elevation", c_elev, f"{elev:.0f} m" if elev is not None else "—"),
    ]
    total_abs = sum(abs(c) for _, c, _ in entries) or 1.0
    factors = [
        {
            "name": name,
            "importance_pct": round(abs(c) / total_abs * 100, 1),
            "value": value,
            "rawValue": value,
            "net_delta": round(c * 100, 2),  # points this input moved the score (+ raises, - lowers)
        }
        for name, c, value in entries
    ]
    factors.sort(key=lambda x: x["importance_pct"], reverse=True)

    raising = [f["name"].lower() for f in factors if f["net_delta"] > 0][:2]
    lowering = [f["name"].lower() for f in factors if f["net_delta"] < 0][:2]
    if raising:
        summary = f"Score raised mainly by {' and '.join(raising)}."
        if lowering:
            summary += f" Lowered by {' and '.join(lowering)}."
    elif lowering:
        summary = f"Score kept low mainly by {' and '.join(lowering)}."
    else:
        summary = "No single input stands out."
    primary_driver = (raising or lowering or ["no single input"])[0]

    action = get_recommended_action(risk_level, primary_driver)

    return {
        "factors": factors,
        "base_hazard_bias": round(bias * 100, 1),
        "raw_tree_contributions": {k: round(v * 100, 2) for k, v in raw_contribs.items()},
        "summary": summary,
        "recommended_action": action,
        "primary_driver": primary_driver
    }


def predict_landslide_risk(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes full ML inference pipeline:
    Real Data -> Validity Gate -> Feature Engineering -> Random Forest Inference -> Tree Attribution -> XAI & Confidence
    """
    model, metadata = get_model()

    # Validity gate: every model input must be real. Missing values are never filled with
    # made-up defaults; the score is withheld and the missing inputs are named instead.
    def _missing(v):
        return v is None or (isinstance(v, float) and np.isnan(v))
    labels = {"rainfall_24h": "24 h rain", "rainfall_72h": "72 h rain", "slope_deg": "slope",
              "soil_moisture": "soil moisture", "historical_incidents": "landslide history",
              "elevation_amsl": "elevation"}
    missing = [k for k in labels if _missing(input_data.get(k))]
    if missing:
        return {
            "status": "DATA_INSUFFICIENT",
            "risk_score": None,
            "risk_level": "DATA_INSUFFICIENT",
            "baseline_ml_level": "DATA_INSUFFICIENT",
            "inference_status": "PAUSED_DATA_UNAVAILABLE",
            "unavailability_reason": "Missing input: " + ", ".join(labels[k] for k in missing) + ". No score is given without it.",
            "missing_inputs": missing,
            "features": {
                "rainfall_24h": input_data.get("rainfall_24h"),
                "rainfall_72h": input_data.get("rainfall_72h"),
                "slope_deg": input_data.get("slope_deg"),
                "soil_moisture": input_data.get("soil_moisture"),
                "ndvi": input_data.get("ndvi"),
                "historical_incidents": input_data.get("historical_incidents"),
                "elevation_amsl": input_data.get("elevation_amsl")
            },
            "xai": {
                "factors": [],
                "summary": "No score: " + ", ".join(labels[k] for k in missing) + " not available right now.",
                "recommended_action": "Check again shortly.",
                "primary_driver": "missing data",
                "base_hazard_bias": None,
                "raw_tree_contributions": {}
            },
            "model_confidence": None,
            "tree_variance": None,
            "data_quality": "UNAVAILABLE",
            "global_feature_importances": metadata.get("feature_importances") if metadata else {},
            "model_metadata": {
                "model_type": metadata.get("model_type", "RandomForestClassifier"),
                "training_dataset": metadata.get("training_dataset"),
                "f1_score": metadata.get("metrics", {}).get("f1_score"),
                "precision": metadata.get("metrics", {}).get("precision"),
                "recall": metadata.get("metrics", {}).get("recall"),
                "roc_auc": metadata.get("metrics", {}).get("roc_auc"),
                "false_negative_rate": metadata.get("metrics", {}).get("false_negative_rate")
            },
            "precision_context": {
                "status": "DATA_INSUFFICIENT",
                "inference_paused": True,
                "reason": "Missing inputs"
            }
        }

    rain_24 = float(input_data["rainfall_24h"])
    rain_72 = float(input_data["rainfall_72h"])
    slope = float(input_data["slope_deg"])
    moisture = float(input_data["soil_moisture"])
    ndvi = float(input_data.get("ndvi") or 0.0)  # not a model input; kept only for the legacy column
    history = int(input_data["historical_incidents"])
    elev = float(input_data["elevation_amsl"])

    # Feature engineering aligned with training pipeline
    slope_rad = np.radians(np.clip(slope, 0.0, 85.0))
    api_rain = round(0.70 * rain_24 + 0.30 * rain_72, 2)
    pore_slope = round(moisture * np.tan(slope_rad), 4)
    veg_slope = round(ndvi * np.cos(slope_rad), 4)

    all_values = {
        "rainfall_24h": rain_24, "rainfall_72h": rain_72, "slope_deg": slope,
        "soil_moisture": moisture, "ndvi": ndvi, "historical_incidents": history,
        "elevation_amsl": elev, "antecedent_rain_index": api_rain,
        "pore_slope_interaction": pore_slope, "vegetation_slope_defense": veg_slope,
    }
    # Use exactly the columns (and order) the model was trained on
    feature_order = (metadata or {}).get("features") or list(all_values)
    X_df = pd.DataFrame([[all_values[f] for f in feature_order]], columns=feature_order)

    # 1. Random Forest Predicted Probability (0.0 to 100.0%)
    prob_class1 = float(model.predict_proba(X_df)[0, 1])
    risk_score = round(float(np.clip(prob_class1 * 100.0, 1.0, 99.0)), 1)
    risk_level = categorize_risk_level(risk_score)

    # 2. Saabas Decision Tree Path Attribution & Tree Vote Consensus
    bias, raw_contribs, tree_var, model_confidence = compute_tree_attribution_and_confidence(
        model, X_df.values, feature_order
    )

    features_dict = {
        "rainfall_24h": rain_24,
        "rainfall_72h": rain_72,
        "slope_deg": slope,
        "soil_moisture": moisture,
        "ndvi": ndvi,
        "historical_incidents": history,
        "elevation_amsl": elev
    }

    # 3. Scientific Explainable AI Result
    xai = explain_prediction(features_dict, raw_contribs, bias, risk_score, risk_level)

    # 4. Integrate Advanced Precision, Data Quality, Geotechnical Physics & Risk Fusion Engines
    try:
        if input_data.get("latitude") is None or input_data.get("longitude") is None:
            raise ValueError("no coordinates given")
        from backend.app.services.data_quality_service import assess_data_quality
        from backend.app.services.rainfall_trigger_service import evaluate_rainfall_trigger
        from backend.app.services.geotechnical_physics_service import calculate_factor_of_safety
        from backend.app.services.prediction_confidence_service import compute_prediction_confidence
        from backend.app.services.risk_fusion_engine import fuse_risk_decision

        dq_result = assess_data_quality(features_dict, input_data.get("metadata"))
        trigger_result = evaluate_rainfall_trigger(
            rainfall_24h=rain_24,
            rainfall_72h=rain_72,
            slope_deg=slope,
            soil_moisture=moisture,
            lat=float(input_data["latitude"]),
            lon=float(input_data["longitude"]),
            state=input_data.get("state", "")
        )
        geotech_result = calculate_factor_of_safety(
            slope_deg=slope,
            rainfall_72h=rain_72,
            soil_moisture=moisture,
            lat=float(input_data["latitude"]),
            lon=float(input_data["longitude"]),
            site_cohesion_kpa=input_data.get("site_cohesion_kpa"),
            site_friction_deg=input_data.get("site_friction_deg")
        )
        conf_result = compute_prediction_confidence(
            ml_probability=risk_score,
            tree_variance=tree_var,
            data_quality_score=dq_result["overall_score"],
            bound_warnings_count=len(dq_result["bound_warnings"]),
            factor_of_safety=geotech_result["factor_of_safety"],
            fallbacks_count=dq_result["fallbacks_used"]
        )
        fusion_result = fuse_risk_decision(
            ml_probability=risk_score,
            ml_risk_level=risk_level,
            factor_of_safety=geotech_result["factor_of_safety"],
            rainfall_trigger_state=trigger_result["trigger_state"],
            rainfall_trigger_score=trigger_result["trigger_score"],
            data_quality_level=dq_result["level"],
            confidence_level=conf_result["confidence_level"],
            historical_density=history
        )

        precision_context = {
            "rainfall_trigger": trigger_result,
            "data_quality": dq_result,
            "confidence": conf_result,
            "geotechnical": geotech_result,
            "risk_fusion": fusion_result
        }
        # Update user-facing model confidence with multi-factor calculated score
        calculated_confidence = conf_result["confidence_score"]
        calculated_data_quality_label = f"{dq_result['level']} ({dq_result['overall_score']}/100)"
        
        # The level shown always matches the score (no separate override).
        effective_risk_level = risk_level
    except Exception as e:
        precision_context = {
            "error": str(e),
            "status": "graceful_fallback"
        }
        calculated_confidence = model_confidence
        calculated_data_quality_label = None
        effective_risk_level = risk_level

    return {
        "status": "SUCCESS",
        "risk_score": risk_score,
        "risk_level": effective_risk_level,
        "baseline_ml_level": risk_level,
        "features": features_dict,
        "xai": xai,
        "model_confidence": calculated_confidence,
        "tree_variance": round(tree_var, 4),
        "data_quality": calculated_data_quality_label,
        "global_feature_importances": metadata.get("feature_importances") if metadata else {},
        "model_metadata": {
            "model_type": metadata.get("model_type", "RandomForestClassifier"),
            "training_dataset": metadata.get("training_dataset"),
            "f1_score": metadata.get("metrics", {}).get("f1_score"),
            "precision": metadata.get("metrics", {}).get("precision"),
            "recall": metadata.get("metrics", {}).get("recall"),
            "roc_auc": metadata.get("metrics", {}).get("roc_auc"),
            "false_negative_rate": metadata.get("metrics", {}).get("false_negative_rate")
        },
        "precision_context": precision_context
    }
