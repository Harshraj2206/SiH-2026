"""
LANDSLIDEGUARD SIH26001 - Real Terrain Elevation & Slope Computation Service
Queries Global Digital Elevation Models (Copernicus 90m / SRTM 30m) and computes physical terrain slope gradient in degrees for any location on Earth.
"""

import math
import time
import urllib.request
import json
from typing import Dict, Any

_DEM_CACHE: Dict[str, Dict[str, Any]] = {}


def get_terrain_elevation_and_slope(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Query real ground elevation (meters AMSL) and compute physical slope gradient (degrees)
    using Copernicus / SRTM 30m Global Digital Elevation Model for ANY place in the world.
    """
    cache_key = f"{round(latitude, 4)}_{round(longitude, 4)}"
    if cache_key in _DEM_CACHE:
        return _DEM_CACHE[cache_key]

    delta = 0.001  # ~110 meters spatial displacement
    # Query point, north offset, and east offset for directional gradient vectors
    lats = f"{latitude:.5f},{latitude + delta:.5f},{latitude:.5f}"
    lngs = f"{longitude:.5f},{longitude:.5f},{longitude + delta:.5f}"
    url = f"https://api.open-meteo.com/v1/elevation?latitude={lats}&longitude={lngs}"

    elevation = None
    slope_deg = None
    is_dynamic = False
    slope_status = "BASELINE_PROFILE"
    source_label = "Copernicus 90m / Open-Meteo Elevation Grid"
    freshness_label = "STATIC GEOTECHNICAL BASELINE"

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "LandSafe-GlobalDEM/2.0 (SIH26001-DisasterManagement)"}
        )
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elevations = data.get("elevation", [])
            if len(elevations) >= 3 and all(e is not None for e in elevations[:3]):
                z0 = float(elevations[0])
                z_lat = float(elevations[1])
                z_lng = float(elevations[2])

                # Horizontal distance in meters
                d_lat = delta * 111320.0
                d_lng = delta * 111320.0 * max(0.1, math.cos(math.radians(latitude)))

                # Gradient vectors
                dz_dy = (z_lat - z0) / max(1.0, d_lat)
                dz_dx = (z_lng - z0) / max(1.0, d_lng)

                slope_rad = math.atan(math.sqrt(dz_dx ** 2 + dz_dy ** 2))
                slope_deg = round(math.degrees(slope_rad), 1)
                elevation = round(z0, 1)
                is_dynamic = True
                slope_status = "DYNAMIC_DEM"
                source_label = "Copernicus 90m / Open-Meteo Elevation Grid"

    except Exception:
        # Secondary live DEM failover via Open-Elevation if primary is 429/offline
        try:
            sec_locs = f"{latitude:.5f},{longitude:.5f}|{latitude+delta:.5f},{longitude:.5f}|{latitude:.5f},{longitude+delta:.5f}"
            sec_url = f"https://api.open-elevation.com/api/v1/lookup?locations={sec_locs}"
            sec_req = urllib.request.Request(sec_url, headers={"User-Agent": "LandSafe-GlobalDEM/2.0"})
            with urllib.request.urlopen(sec_req, timeout=3.0) as sec_resp:
                sec_data = json.loads(sec_resp.read().decode("utf-8"))
                sec_res = sec_data.get("results", [])
                if len(sec_res) >= 3 and all(r.get("elevation") is not None for r in sec_res[:3]):
                    z0 = float(sec_res[0]["elevation"])
                    z_lat = float(sec_res[1]["elevation"])
                    z_lng = float(sec_res[2]["elevation"])

                    d_lat = delta * 111320.0
                    d_lng = delta * 111320.0 * max(0.1, math.cos(math.radians(latitude)))

                    dz_dy = (z_lat - z0) / max(1.0, d_lat)
                    dz_dx = (z_lng - z0) / max(1.0, d_lng)

                    slope_rad = math.atan(math.sqrt(dz_dx ** 2 + dz_dy ** 2))
                    slope_deg = round(math.degrees(slope_rad), 1)
                    elevation = round(z0, 1)
                    is_dynamic = True
                    slope_status = "DYNAMIC_DEM"
                    source_label = "SRTM / Open-Elevation Global Grid"
        except Exception:
            pass

    freshness_label = "DYNAMIC DEM GRADIENT" if is_dynamic else "STATIC GEOTECHNICAL BASELINE"

    result = {
        "latitude": latitude,
        "longitude": longitude,
        "elevation_meters_amsl": elevation,
        "elevation_amsl": elevation,  # Canonical alias for compatibility
        "slope_deg": slope_deg,
        "is_dynamic": is_dynamic,
        "slope_status": slope_status,
        "source": source_label,
        "spatial_resolution": "30-90 meters (WGS84 EGM96 Geoid)" if is_dynamic else "Regional Baseline",
        "vertical_datum": "EGM96 Mean Sea Level",
        "freshness_status": freshness_label,
        "is_demo": False
    }

    _DEM_CACHE[cache_key] = result
    return result

