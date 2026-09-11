"""
LandSafe - Prediction Confidence & Uncertainty Layer
Computes operational confidence based on data quality, model consensus variance,
feature validity, and physical consistency between ML probability and Limit-Equilibrium mechanics.
"""

from typing import Dict, Any


def compute_prediction_confidence(
    ml_probability: float,
    tree_variance: float,
    data_quality_score: float,
    bound_warnings_count: int,
    factor_of_safety: float = None,
    fallbacks_count: int = 0
) -> Dict[str, Any]:
    """
    Computes an operational Prediction Confidence metric (0–100) and qualitative tier (HIGH, MODERATE, LOW).
    
    IMPORTANT:
    Confidence is NOT the same as landslide probability.
    High confidence means we have strong, clean, consistent data and low model variance,
    regardless of whether the predicted risk is 10% (confident safe) or 90% (confident hazard).
    """
    # 1. Base score derived from data quality (40% weight)
    base_dq = (data_quality_score / 100.0) * 45.0

    # 2. Base score derived from tree consensus variance (35% weight)
    # Tree variance typically ranges from 0.01 (unanimous) to 0.25 (high disagreement)
    # Map variance to a 0 to 1 consistency factor
    variance_penalty = min(35.0, tree_variance * 140.0)
    tree_score = max(5.0, 35.0 - variance_penalty)

    # 3. Penalties for fallback count and physical anomalies
    fallback_penalty = min(20.0, fallbacks_count * 6.0)
    warning_penalty = min(25.0, bound_warnings_count * 10.0)

    # 4. Consistency bonus/penalty between ML and Factor of Safety (if FS available)
    # If ML predicts high risk (>70%) and FS < 1.0 -> Highly consistent physics & ML
    # If ML predicts low risk (<30%) and FS > 1.5 -> Highly consistent
    # If ML predicts low risk (<30%) but FS < 0.95 -> Significant discrepancy, lower confidence
    consistency_score = 20.0
    discrepancy_note = None
    if factor_of_safety is not None:
        p_norm = ml_probability / 100.0
        if p_norm < 0.35 and factor_of_safety < 1.0:
            consistency_score -= 14.0
            discrepancy_note = "ML statistical prediction indicates low risk, but geotechnical limit equilibrium calculates unstable slope (FS < 1.0)."
        elif p_norm > 0.70 and factor_of_safety > 1.6:
            consistency_score -= 8.0
            discrepancy_note = "ML statistical prediction indicates elevated hazard, but physical terrain geometry indicates high shear resistance (FS > 1.6)."

    raw_confidence = base_dq + tree_score + consistency_score - fallback_penalty - warning_penalty
    confidence_score = round(max(15.0, min(98.0, raw_confidence)), 1)

    # Categorization
    if confidence_score >= 82.0:
        confidence_level = "HIGH"
        guidance = "Prediction is supported by clean live observations, strong model tree consensus, and consistent physical parameters."
    elif confidence_score >= 60.0:
        confidence_level = "MODERATE"
        guidance = "Prediction is operational, but minor data approximations, regional defaults, or tree variance introduce moderate uncertainty."
    else:
        confidence_level = "LOW"
        guidance = "Prediction carries elevated uncertainty due to fallback data, extreme boundary values, or significant physics-model discrepancy."

    return {
        "confidence_score": confidence_score,
        "confidence_level": confidence_level,
        "guidance": guidance,
        "discrepancy_note": discrepancy_note,
        "components": {
            "data_quality_contribution": round(base_dq, 1),
            "model_consensus_contribution": round(tree_score, 1),
            "physics_consistency_contribution": round(consistency_score, 1),
            "fallback_penalty": round(fallback_penalty, 1)
        }
    }
