"""
LANDSLIDEGUARD SIH26001 - Real Terrain Elevation & Slope Computation Service
Queries Global Digital Elevation Models (Copernicus 90m / SRTM 30m) and computes physical terrain slope gradient in degrees for any location on Earth.
"""

import math
import os
import time
import urllib.request
import json
from typing import Dict, Any, Optional

from backend.app.services.weather_resolver import describe_http_error

_DEM_CACHE: Dict[str, Dict[str, Any]] = {}

# Pre-computed DEM results for the monitored zones and route waypoints (same Copernicus DEM,
# fetched once by backend/scripts/build_terrain_cache.py), so they never depend on a live call.
TERRAIN_CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "terrain_cache.json")
_STATIC_POINTS: Optional[list] = None


def _static_terrain(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    global _STATIC_POINTS
    if os.environ.get("TERRAIN_CACHE_DISABLED") == "1":
        return None
    if _STATIC_POINTS is None:
        try:
            with open(TERRAIN_CACHE_PATH, encoding="utf-8") as f:
                cache = json.load(f)
            _STATIC_POINTS = [dict(p, generated_at=cache.get("generated_at")) for p in cache.get("points", [])]
        except (OSError, ValueError):
            _STATIC_POINTS = []
    for p in _STATIC_POINTS:
        if abs(p["lat"] - latitude) < 0.002 and abs(p["lng"] - longitude) < 0.002:  # ~200 m
            return {
                "latitude": latitude,
                "longitude": longitude,
                "elevation_meters_amsl": p["elevation_amsl"],
                "elevation_amsl": p["elevation_amsl"],
                "slope_deg": p["slope_deg"],
                "is_dynamic": True,
                "slope_status": "DYNAMIC_DEM",
                "dem_origin": "PRECOMPUTED",
                "source": f"Copernicus 90m DEM via Open-Meteo (pre-computed {p.get('generated_at', '')[:10]})",
                "spatial_resolution": "30-90 meters (WGS84 EGM96 Geoid)",
                "vertical_datum": "EGM96 Mean Sea Level",
                "freshness_status": "STATIC DEM (TERRAIN DOES NOT CHANGE)",
                "is_demo": False,
            }
    return None


def get_terrain_elevation_and_slope(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Query real ground elevation (meters AMSL) and compute physical slope gradient (degrees)
    using Copernicus / SRTM 30m Global Digital Elevation Model for ANY place in the world.
    """
    cache_key = f"{round(latitude, 4)}_{round(longitude, 4)}"
    if cache_key in _DEM_CACHE:
        return _DEM_CACHE[cache_key]

    static = _static_terrain(latitude, longitude)
    if static is not None:
        return static

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

    except Exception as primary_err:
        print(f"Open-Meteo elevation request failed: {describe_http_error(primary_err)}")
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

    if is_dynamic:  # cache only real DEM results so a temporary outage is retried later
        _DEM_CACHE[cache_key] = result
    return result

