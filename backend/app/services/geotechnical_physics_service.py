"""
LandSafe - Deterministic Geotechnical Physics Service
Calculates in-situ Factor of Safety (FS) using the Infinite Slope Limit-Equilibrium Model.
Transparently labels parameters as regional estimates vs in-situ measurements.
"""

import math
from typing import Dict, Any, Tuple


# Regional Engineering Defaults (Documented GSI Lithology Formations)
# Used as conservative defaults when site-specific borehole core logs are unavailable
LITHOLOGY_REGIONAL_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "himalayan_gneiss_schist": {
        "formation_name": "Precambrian Crystalline Complex (Gneiss / Quartzite / Schist)",
        "cohesion_kpa": 24.0,
        "cohesion_range": [18.0, 32.0],
        "friction_angle_deg": 32.0,
        "friction_range": [28.0, 36.0],
        "saturated_unit_weight_kn_m3": 21.5,
        "soil_depth_m": 2.2,
        "source": "GSI Regional Engineering Geology Reports"
    },
    "siwalik_sedimentary": {
        "formation_name": "Tertiary Siwalik Group (Sandstone / Claystone / Siltstone)",
        "cohesion_kpa": 14.5,
        "cohesion_range": [10.0, 20.0],
        "friction_angle_deg": 26.0,
        "friction_range": [22.0, 30.0],
        "saturated_unit_weight_kn_m3": 19.8,
        "soil_depth_m": 2.5,
        "source": "Northern Region Engineering Geology Baselines"
    },
    "western_ghats_basalt": {
        "formation_name": "Deccan Basalt Colluvium / Charnockite Regolith",
        "cohesion_kpa": 18.0,
        "cohesion_range": [12.0, 26.0],
        "friction_angle_deg": 29.0,
        "friction_range": [25.0, 34.0],
        "saturated_unit_weight_kn_m3": 20.2,
        "soil_depth_m": 2.0,
        "source": "GSI Western Region Post-Disaster Geotechnical Profiles"
    },
    "regional_default": {
        "formation_name": "Generic Mountain Colluvium / Residual Soil Mantle",
        "cohesion_kpa": 18.5,
        "cohesion_range": [12.0, 25.0],
        "friction_angle_deg": 28.0,
        "friction_range": [24.0, 32.0],
        "saturated_unit_weight_kn_m3": 20.0,
        "soil_depth_m": 2.0,
        "source": "Standard Geotechnical Engineering Literature Default"
    }
}


def resolve_lithology_parameters(lat: float, lon: float) -> Tuple[str, Dict[str, Any]]:
    """
    Selects the regional stratigraphic baseline for the coordinate.
    """
    if 30.0 <= lat <= 33.5 and 75.5 <= lon <= 79.5:
        # Western Himalayas (HP & Uttarakhand)
        if lat < 31.2:
            return "siwalik_sedimentary", LITHOLOGY_REGIONAL_DEFAULTS["siwalik_sedimentary"]
        return "himalayan_gneiss_schist", LITHOLOGY_REGIONAL_DEFAULTS["himalayan_gneiss_schist"]
    elif 8.5 <= lat <= 20.5 and 73.0 <= lon <= 77.0:
        return "western_ghats_basalt", LITHOLOGY_REGIONAL_DEFAULTS["western_ghats_basalt"]
    
    return "regional_default", LITHOLOGY_REGIONAL_DEFAULTS["regional_default"]


def calculate_factor_of_safety(
    slope_deg: float,
    rainfall_72h: float,
    soil_moisture: float,
    lat: float = 31.95,
    lon: float = 77.10,
    site_cohesion_kpa: float = None,
    site_friction_deg: float = None
) -> Dict[str, Any]:
    """
    Computes Factor of Safety (FS) via the Infinite Slope Equation:
        FS = [c' + (γ·z·cos²β - u)·tan φ'] / [γ·z·sin β·cos β]
    
    Where:
    - β = slope angle in degrees
    - c' = effective cohesion (kPa)
    - φ' = internal friction angle in degrees
    - γ = saturated soil unit weight (kN/m³)
    - z = regolith depth (m)
    - u = pore-water pressure (kPa), driven by rainfall & moisture saturation
    """
    beta = max(1.0, min(80.0, float(slope_deg or 15.0)))
    beta_rad = math.radians(beta)

    key, litho = resolve_lithology_parameters(lat, lon)
    
    # Check if site-specific core measurements provided, else use regional estimate
    if site_cohesion_kpa is not None:
        c_prime = float(site_cohesion_kpa)
        c_source = "In-situ / Site Borehole Test"
    else:
        c_prime = litho["cohesion_kpa"]
        c_source = "Regional Engineering Estimate (GSI Geological Maps)"

    if site_friction_deg is not None:
        phi_prime = float(site_friction_deg)
        phi_source = "In-situ / Site Borehole Test"
    else:
        phi_prime = litho["friction_angle_deg"]
        phi_source = "Regional Engineering Estimate (GSI Geological Maps)"

    phi_rad = math.radians(phi_prime)
    gamma = litho["saturated_unit_weight_kn_m3"]
    z = litho["soil_depth_m"]
    gamma_w = 9.81  # Unit weight of water (kN/m³)

    # Hydrostatic pore pressure (u): derived from soil moisture and antecedent rain
    sm = float(soil_moisture or 0.30)
    if sm > 1.0:
        sm = sm / 100.0
    sm = max(0.0, min(1.0, sm))

    # Water table ratio m in soil layer (0.0 to 1.0)
    # Scaled by 72h rainfall surge and topsoil saturation
    r72 = max(0.0, float(rainfall_72h or 0.0))
    rain_surge = min(0.60, (r72 / 300.0) * 0.60)
    saturation_fraction = min(1.0, sm * 1.5 + rain_surge)

    # Pore water pressure u = m * γw * z * cos²(β)
    pore_pressure_kpa = saturation_fraction * gamma_w * z * (math.cos(beta_rad) ** 2)

    # Resisting Shear Strength (Numerator)
    effective_normal_stress = max(0.5, (gamma * z * (math.cos(beta_rad) ** 2)) - pore_pressure_kpa)
    shear_strength = c_prime + (effective_normal_stress * math.tan(phi_rad))

    # Driving Gravitational Shear Stress (Denominator)
    shear_stress = max(0.5, gamma * z * math.sin(beta_rad) * math.cos(beta_rad))

    fs_central = round(shear_strength / shear_stress, 2)

    # Sensitivity / Range Analysis over lithology plausible bounds
    c_low, c_high = litho["cohesion_range"]
    phi_low, phi_high = litho["friction_range"]
    fs_low = round((c_low + (effective_normal_stress * math.tan(math.radians(phi_low)))) / shear_stress, 2)
    fs_high = round((c_high + (effective_normal_stress * math.tan(math.radians(phi_high)))) / shear_stress, 2)

    if fs_central < 1.0:
        stability_state = "CRITICAL_INSTABILITY (Shear Stress Exceeds Shear Strength)"
    elif fs_central < 1.25:
        stability_state = "LIMIT_EQUILIBRIUM (Active Risk Under Dynamic Rain Surcharge)"
    elif fs_central < 1.50:
        stability_state = "MARGINALLY_STABLE"
    else:
        stability_state = "STABLE"

    return {
        "factor_of_safety": fs_central,
        "stability_state": stability_state,
        "is_shear_failure_predicted": fs_central < 1.0,
        "plausible_range": [fs_low, fs_high],
        "uncertainty_label": f"FS Central: {fs_central:.2f} (Formation range: {fs_low:.2f}–{fs_high:.2f} across plausible bounds)",
        "geotechnical_note": "Geotechnical parameters are engineering estimates from regional stratigraphic formations where in-situ borehole core logs are unavailable.",
        "parameters": {
            "slope_angle_deg": round(beta, 1),
            "effective_cohesion_kpa": c_prime,
            "cohesion_source": c_source,
            "friction_angle_deg": round(phi_prime, 1),
            "friction_source": phi_source,
            "soil_depth_m": z,
            "pore_pressure_kpa": round(pore_pressure_kpa, 1),
            "lithology_formation": litho["formation_name"]
        }
    }

