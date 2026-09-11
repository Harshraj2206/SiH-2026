"""
LandSafe - Post-ML Risk Fusion & Decision Engine
Unites immutable baseline ML probability, deterministic Limit-Equilibrium Factor of Safety (FS),
multi-factor Rainfall Trigger State, Data Quality, and Safety-Critical Overrides.
"""

from typing import Dict, Any


def fuse_risk_decision(
    ml_probability: float,
    ml_risk_level: str,
    factor_of_safety: float,
    rainfall_trigger_state: str,
    rainfall_trigger_score: float,
    data_quality_level: str,
    confidence_level: str,
    historical_density: int = 0
) -> Dict[str, Any]:
    """
    Executes transparent, rule-based post-ML risk synthesis.
    
    CRITICAL NON-NEGOTIABLE PRINCIPLES:
    1. The baseline ML probability (P_existing) is preserved exactly.
    2. SAFETY OVERRIDE: If Factor of Safety < 1.0 (shear failure), the final alert
       CANNOT be suppressed to LOW or MODERATE, regardless of ML probability.
    3. EXTREME RAINFALL OVERRIDE: If rainfall trigger is EXTREME (> 250mm or extreme surge),
       the zone is elevated to at least HIGH alert.
    4. DISTINCTION: Separates statistical probability from physical stability from alert class.
    """
    p_ml = float(ml_probability)
    fs = float(factor_of_safety) if factor_of_safety is not None else 1.5
    trig_state = (rainfall_trigger_state or "NORMAL").upper()

    overrides_applied = []
    final_alert_class = ml_risk_level

    # 1. Physics Safety Override (Shear Failure Rule)
    if fs < 1.0:
        if final_alert_class in ["LOW", "MODERATE"]:
            final_alert_class = "HIGH"
            overrides_applied.append(
                f"PHYSICS OVERRIDE: Limit-equilibrium Factor of Safety ({fs:.2f} < 1.0) dictates critical shear instability; alert elevated from {ml_risk_level} to HIGH."
            )
        elif final_alert_class == "HIGH" and trig_state in ["HIGH", "EXTREME"]:
            final_alert_class = "CRITICAL"
            overrides_applied.append(
                f"PHYSICS OVERRIDE: Saturated shear failure (FS: {fs:.2f}) combined with {trig_state} precipitation elevates zone to CRITICAL EVACUATION tier."
            )

    # 2. Meteorological Trigger Surge Rule
    if trig_state == "EXTREME":
        if final_alert_class in ["LOW", "MODERATE"]:
            final_alert_class = "HIGH"
            overrides_applied.append(
                f"METEOROLOGICAL OVERRIDE: Extreme rainfall surge triggers immediate orographic warning; alert elevated to HIGH."
            )
    elif trig_state == "HIGH" and final_alert_class == "LOW":
        final_alert_class = "MODERATE"
        overrides_applied.append(
            "METEOROLOGICAL ELEVATION: Heavy rainfall accumulation elevates baseline monitoring advisory."
        )

    # 3. Data Quality / Confidence Attenuation Flag
    data_caution = None
    if data_quality_level in ["LOW", "INSUFFICIENT"]:
        data_caution = "Data quality is degraded due to missing sensor/API observations. Treat alert status conservatively."

    # 4. Actionable Advisory Synthesis
    if final_alert_class == "CRITICAL":
        operational_advisory = (
            "IMMEDIATE EVACUATION & TRANSPORT CLOSURE: Severe instability imminent. "
            "Halt vehicular transit across vulnerable cuts, activate emergency extraction corridors, and move to designated high-elevation shelters."
        )
    elif final_alert_class == "HIGH":
        operational_advisory = (
            "HIGH READINESS & MONITORING: Elevated slope deformation hazard. "
            "Enforce heavy transport diversions, alert local disaster control rooms, and prepare civilian grab-bags."
        )
    elif final_alert_class == "MODERATE":
        operational_advisory = (
            "WATCH & ADVISORY: Threshold saturation equilibrium. "
            "Restrict night mountain travel, monitor culvert drainage, and inspect visible retaining walls."
        )
    else:
        operational_advisory = (
            "ROUTINE MONITORING: Meteorological and slope parameters remain within normal stability envelopes. "
            "Maintain standard baseline observations."
        )

    return {
        "final_alert_class": final_alert_class,
        "baseline_ml_level": ml_risk_level,
        "is_safety_override_active": len(overrides_applied) > 0,
        "overrides_applied": overrides_applied,
        "data_caution": data_caution,
        "operational_advisory": operational_advisory,
        "synthesis_matrix": {
            "ml_probability": p_ml,
            "factor_of_safety": fs,
            "rainfall_trigger_state": trig_state,
            "confidence_level": confidence_level,
            "data_quality_level": data_quality_level
        }
    }
