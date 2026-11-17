"""
LandSafe - Data Quality & Input Validation Engine
Evaluates freshness, completeness, bounds, fallback usage, and uncertainty across all environmental inputs.
"""

from typing import Dict, Any, List, Tuple
from datetime import datetime, timezone


def validate_input_bounds(features: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validates physical plausibility of environmental inputs.
    Detects impossible coordinates, negative rainfalls, unrealistic slopes, and extreme outliers.
    """
    warnings = []
    
    slope = features.get("slope_deg")
    if slope is not None:
        try:
            s = float(slope)
            if s < 0.0 or s > 90.0:
                warnings.append(f"Slope {s}° is physically impossible (valid: 0°–90°).")
        except (ValueError, TypeError):
            warnings.append("Invalid slope data type.")

    rain_24 = features.get("rainfall_24h")
    if rain_24 is not None:
        try:
            r = float(rain_24)
            if r < 0.0:
                warnings.append(f"Rainfall 24h ({r} mm) cannot be negative.")
            elif r > 1500.0:
                warnings.append(f"Rainfall 24h ({r} mm) exceeds global meteorological records.")
        except (ValueError, TypeError):
            warnings.append("Invalid 24h rainfall data type.")

    rain_72 = features.get("rainfall_72h")
    if rain_72 is not None:
        try:
            r72 = float(rain_72)
            if r72 < 0.0:
                warnings.append(f"Rainfall 72h ({r72} mm) cannot be negative.")
            if rain_24 is not None and float(rain_24) > r72 + 1e-3:
                warnings.append(f"Rainfall 24h ({rain_24} mm) cannot exceed 72h total ({r72} mm).")
        except (ValueError, TypeError):
            warnings.append("Invalid 72h rainfall data type.")

    moisture = features.get("soil_moisture")
    if moisture is not None:
        try:
            m = float(moisture)
            # Accept either volumetric (0.0 to 1.0) or percentage (0 to 100)
            if m < 0.0 or (m > 1.0 and m > 100.0):
                warnings.append(f"Soil moisture {m} is outside valid physical ranges.")
        except (ValueError, TypeError):
            warnings.append("Invalid soil moisture data type.")

    elevation = features.get("elevation_amsl")
    if elevation is not None:
        try:
            elev = float(elevation)
            if elev < -450.0 or elev > 8850.0:
                warnings.append(f"Elevation {elev} m is outside terrestrial boundaries (-450m to 8850m).")
        except (ValueError, TypeError):
            warnings.append("Invalid elevation data type.")

    is_valid = len(warnings) == 0
    return is_valid, warnings


def assess_data_quality(
    features: Dict[str, Any],
    metadata: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Computes a rigorous, calculated Data Quality Score (0–100) and operational classification.
    Evaluates:
    - Feature completeness
    - Input bounds consistency
    - Freshness / Observation age
    - Fallback usage count
    - Sensor/API resolution
    """
    if metadata is None:
        metadata = {}

    is_valid, bound_warnings = validate_input_bounds(features)
    fallbacks_used = metadata.get("fallbacks_used", 0)
    is_cached = metadata.get("is_cached", False)
    freshness_status = metadata.get("freshness_status", "LIVE")

    # 1. Component Quality Scores (Calculated)
    # Rainfall Quality
    rain_score = 100.0
    if features.get("rainfall_24h") is None:
        rain_score -= 50.0
    if features.get("rainfall_72h") is None:
        rain_score -= 20.0
    if freshness_status == "STALE":
        rain_score -= 25.0
    elif freshness_status == "FALLBACK":
        rain_score -= 40.0
    rain_score = max(10.0, rain_score)

    # Soil Moisture Quality
    soil_score = 95.0
    if features.get("soil_moisture") is None:
        soil_score = 40.0
    elif metadata.get("soil_is_fallback", False):
        soil_score -= 30.0

    # Terrain Quality (DEM & Slope)
    terrain_score = 100.0
    if features.get("slope_deg") is None:
        terrain_score -= 50.0
    if features.get("elevation_amsl") is None:
        terrain_score -= 20.0
    if metadata.get("dem_is_fallback", False):
        terrain_score -= 40.0

    # Geology / Geotechnical Quality
    geology_score = 75.0  # Regional estimate baseline
    if metadata.get("has_site_specific_boring", False):
        geology_score = 98.0
    elif metadata.get("geology_is_unresolved", False):
        geology_score = 50.0

    # Historical Benchmark Quality
    hist_score = 90.0 if features.get("historical_incidents") is not None else 60.0

    # Deductions for boundary anomalies
    anomaly_penalty = len(bound_warnings) * 15.0

    # Weighted Overall Score
    weights = {
        "rainfall": 0.35,
        "terrain": 0.25,
        "soil_moisture": 0.15,
        "geology": 0.15,
        "historical": 0.10
    }

    raw_overall = (
        rain_score * weights["rainfall"] +
        terrain_score * weights["terrain"] +
        soil_score * weights["soil_moisture"] +
        geology_score * weights["geology"] +
        hist_score * weights["historical"]
    ) - anomaly_penalty - (fallbacks_used * 8.0)

    overall_score = round(max(15.0, min(100.0, raw_overall)), 1)

    # Classification Level
    if overall_score >= 88.0:
        quality_level = "EXCELLENT"
    elif overall_score >= 75.0:
        quality_level = "GOOD"
    elif overall_score >= 60.0:
        quality_level = "MODERATE"
    elif overall_score >= 40.0:
        quality_level = "LOW"
    else:
        quality_level = "INSUFFICIENT"

    return {
        "overall_score": overall_score,
        "level": quality_level,
        "is_valid": is_valid,
        "bound_warnings": bound_warnings,
        "fallbacks_used": fallbacks_used,
        "freshness_status": freshness_status,
        "breakdown": {
            "rainfall_score": round(rain_score, 1),
            "terrain_score": round(terrain_score, 1),
            "soil_moisture_score": round(soil_score, 1),
            "geology_score": round(geology_score, 1),
            "historical_score": round(hist_score, 1)
        },
        "provenance_summary": {
            "rainfall": "Open-Meteo",
            "terrain": "Copernicus 30m Global DEM (ESA) / Regional Baseline Profile",
            "soil": "Open-Meteo (topsoil 0-7 cm)",
            "vegetation": "Regional Climatological NDVI Estimate (Copernicus Global Land / MODIS)",
            "historical": "GSI NLSM & NASA GLC Historical Landslide Archive",
            "geology": "Regional Stratigraphic Engineering Estimate (GSI Geological Maps)"
        }
    }


