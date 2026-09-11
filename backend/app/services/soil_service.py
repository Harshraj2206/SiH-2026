"""
LANDSAFE - Volumetric Soil Moisture Data Service
Ingests volumetric soil water content (0-7 cm layer) from ECMWF IFS Land Surface Model via Open-Meteo.
Accurately reports volumetric units (m³/m³) without claiming synthetic saturation or unverified NASA SMAP radiometer telemetry.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from backend.app.services.weather_service import fetch_live_meteorology


def get_soil_moisture_telemetry(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Fetch volumetric soil water content (m3/m3) for topsoil (0-7 cm).
    Derived from ECMWF IFS numerical land surface reanalysis.
    """
    meteo = fetch_live_meteorology(latitude, longitude)
    raw_sm = meteo.get("soil_moisture_m3m3")
    
    if raw_sm is not None:
        moisture_val = float(raw_sm)
        volumetric_pct = round(moisture_val * 100.0, 1)
        
        # Hydrological classification based on volumetric moisture thresholds for mountain soils
        if moisture_val > 0.48:
            moisture_tier = "CRITICAL_MOISTURE"
            description = "Volumetric water content high • Potential elevated pore-water pressure"
        elif moisture_val > 0.38:
            moisture_tier = "ELEVATED_MOISTURE"
            description = "Elevated volumetric water content • Reduced capillary suction"
        else:
            moisture_tier = "NOMINAL"
            description = "Nominal volumetric soil moisture for mountain colluvium"
    else:
        moisture_val = None
        volumetric_pct = None
        moisture_tier = "UNAVAILABLE"
        description = "Soil moisture telemetry currently unavailable from meteorological grid"

    return {
        "latitude": latitude,
        "longitude": longitude,
        "volumetric_soil_moisture_m3m3": moisture_val,
        "volumetric_percentage_vv": volumetric_pct,
        "moisture_tier": moisture_tier,
        "geotechnical_description": description,
        "source": "Open-Meteo Land Surface Grid (ECMWF IFS)",
        "spatial_resolution": "0.1° (~10 km Grid)",
        "layer_depth": "0-7 cm (Topsoil Layer 1)",
        "unit": "m³/m³ (volumetric fraction)",
        "observation_time": meteo.get("observation_time"),
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "freshness_status": meteo.get("freshness_status", "LIVE"),
        "is_demo": False
    }

