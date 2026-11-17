"""
LANDSAFE - Global Routing & Dynamic Geotechnical Risk Analysis Service
Connects to Open Source Routing Engine (OSRM) for worldwide real-road navigation
and evaluates physics-based landslide risk & slope along the route geometry.
"""

import math
import json
import urllib.request
import urllib.parse
import re
from typing import Dict, List, Any, Optional
from backend.app.services.elevation_service import get_terrain_elevation_and_slope
from backend.app.services.geocode_service import reverse_geocode_location

OSRM_API_URL = "https://router.project-osrm.org/route/v1/driving"
_ROUTE_CACHE: Dict[str, Dict[str, Any]] = {}
_ROUTE_CACHE_TTL = 900  # 15 minutes
_GEOCODE_QUERY_CACHE: Dict[str, Dict[str, Any]] = {}


def get_coordinates_from_query(query: str) -> Optional[Dict[str, Any]]:
    """Geocode a place name into latitude and longitude using OpenStreetMap Nominatim or direct coordinate parsing."""
    if not query or not query.strip():
        return None
    q = query.strip()
    cache_key = q.lower()
    if cache_key in _GEOCODE_QUERY_CACHE:
        return _GEOCODE_QUERY_CACHE[cache_key]
    
    # Check for direct coordinates format (e.g. "31.1048, 77.1734")
    coord_match = re.match(r"^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$", q)
    if coord_match:
        try:
            parts = re.split(r"[,\s]+", q)
            lat = float(parts[0])
            lng = float(parts[1])
            res = {
                "name": f"{lat:.4f}, {lng:.4f}",
                "full_name": f"{lat:.4f}, {lng:.4f}",
                "lat": lat,
                "lng": lng
            }
            _GEOCODE_QUERY_CACHE[cache_key] = res
            return res
        except Exception:
            pass

    # Tier 1: Primary Nominatim geocoding
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(q)}&limit=1"
        req = urllib.request.Request(url, headers={"User-Agent": "LandSafe-GlobalRouter/2.0"})
        with urllib.request.urlopen(req, timeout=3.5) as response:
            data = json.loads(response.read().decode("utf-8"))
            if data and len(data) > 0:
                res = {
                    "name": data[0].get("display_name", q).split(",")[0],
                    "full_name": data[0].get("display_name", q),
                    "lat": float(data[0]["lat"]),
                    "lng": float(data[0]["lon"])
                }
                _GEOCODE_QUERY_CACHE[cache_key] = res
                return res
    except Exception as e:
        print(f"Nominatim geocoding error for '{q}': {e}. Trying Open-Meteo failover...")

    # Tier 2: Secondary Open-Meteo Geocoding API failover (instantaneous, rate-limit resilient)
    try:
        # Strip trailing country / state qualifiers for Open-Meteo search if comma separated
        search_term = q.split(",")[0].strip() if "," in q else q
        om_url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(search_term)}&count=1&language=en&format=json"
        om_req = urllib.request.Request(om_url, headers={"User-Agent": "LandSafe-GlobalRouter/2.0"})
        with urllib.request.urlopen(om_req, timeout=3.5) as om_resp:
            om_data = json.loads(om_resp.read().decode("utf-8"))
            results = om_data.get("results", [])
            if results and len(results) > 0:
                item = results[0]
                place_name = item.get("name", search_term)
                admin1 = item.get("admin1", "")
                country = item.get("country", "")
                full_display = ", ".join([p for p in [place_name, admin1, country] if p])
                res = {
                    "name": place_name,
                    "full_name": full_display,
                    "lat": float(item["latitude"]),
                    "lng": float(item["longitude"])
                }
                _GEOCODE_QUERY_CACHE[cache_key] = res
                return res
    except Exception as om_err:
        print(f"Open-Meteo geocoding error for '{q}': {om_err}")

    return None


def _km(lat1, lng1, lat2, lng2):
    dlat, dlng = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_global_road_route(
    start_lat: float,
    start_lng: float,
    dest_lat: float,
    dest_lng: float,
    start_name: str = "Origin",
    dest_name: str = "Destination"
) -> Dict[str, Any]:
    """
    Calculate real turn-by-turn road route between ANY two coordinates on Earth
    and compute live terrain & geotechnical risk profile along the route.
    """
    import time
    cache_key = f"{round(start_lat, 2)}_{round(start_lng, 2)}_{round(dest_lat, 2)}_{round(dest_lng, 2)}"
    now = time.time()
    if cache_key in _ROUTE_CACHE:
        entry = _ROUTE_CACHE[cache_key]
        if now - entry["cached_at"] < _ROUTE_CACHE_TTL:
            cached_res = dict(entry["data"])
            # Update start/dest display names if provided
            cached_res["start"]["name"] = start_name
            cached_res["destination"]["name"] = dest_name
            return cached_res

    # Approximate crow-flies distance in km to avoid heavy micro-maneuver overhead on cross-country routes (>150 km)
    dlat = math.radians(dest_lat - start_lat)
    dlng = math.radians(dest_lng - start_lng)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(start_lat)) * math.cos(math.radians(dest_lat)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    approx_crow_dist_km = 6371 * c
    include_steps = "true" if approx_crow_dist_km <= 150.0 else "false"

    # Query OSRM Driving Engine for authentic global road network
    osrm_url = f"{OSRM_API_URL}/{start_lng},{start_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson&steps={include_steps}"
    
    route_data = None
    try:
        req = urllib.request.Request(osrm_url, headers={"User-Agent": "LandSafe-GlobalRouter/2.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            if res_json.get("code") == "Ok" and res_json.get("routes"):
                route_data = res_json["routes"][0]
    except Exception as e:
        print(f"OSRM routing query error: {e}")

    if not route_data:
        raise ValueError("No road route was found between these places (OpenStreetMap routing).")

    total_dist_km = round(route_data["distance"] / 1000.0, 1)
    total_time_min = round(route_data["duration"] / 60.0)
    geo_coords = route_data["geometry"]["coordinates"]  # [[lng, lat], ...]

    # Convert coordinates format to {"lat": ..., "lng": ...}
    formatted_coords = [{"lat": pt[1], "lng": pt[0]} for pt in geo_coords]

    # Measured slope at 4 points along the road (Copernicus DEM); points that fail are skipped.
    num_pts = len(formatted_coords)
    sample_indices = list(range(num_pts)) if num_pts <= 4 else [0, num_pts // 3, (2 * num_pts) // 3, num_pts - 1]
    sampled_slopes = []
    for idx in sample_indices:
        pt = formatted_coords[idx]
        try:
            slope = get_terrain_elevation_and_slope(pt["lat"], pt["lng"]).get("slope_deg")
        except Exception:
            slope = None
        if slope is not None:
            sampled_slopes.append(slope)
    avg_slope = round(sum(sampled_slopes) / len(sampled_slopes), 1) if sampled_slopes else None
    max_slope = max(sampled_slopes) if sampled_slopes else None

    # Risk: model scores of monitored zones within 10 km of the road.
    from backend.app.database.store import db_store
    step = max(1, num_pts // 200)
    path = formatted_coords[::step]
    near = []
    for z in db_store.get_scored_zones():
        zc = z["center"]
        if any(_km(zc["lat"], zc["lng"], p["lat"], p["lng"]) <= 10.0 for p in path):
            near.append(z)
    if near:
        max_risk = max(z["risk_score"] for z in near)
        avg_risk = round(sum(z["risk_score"] for z in near) / len(near), 1)
        safety_level = {"CRITICAL": "CRITICAL RISK", "HIGH": "HIGH RISK", "MODERATE": "MODERATE RISK"}.get(
            max(near, key=lambda z: z["risk_score"])["risk_level"], "LOW RISK")
    else:
        max_risk = avg_risk = None
        safety_level = "NO RISK DATA"

    # Extract step-by-step turn maneuvers
    segments = []
    legs = route_data.get("legs", [])
    if legs and "steps" in legs[0]:
        for idx, step in enumerate(legs[0]["steps"]):
            step_dist_km = round(step.get("distance", 0.0) / 1000.0, 1)
            step_time_min = round(step.get("duration", 0.0) / 60.0)
            # Road number first (e.g. NH10), then a name in Latin script; local-script names are skipped
            name = step.get("name") or ""
            road_name = step.get("ref") or (name if name and name.isascii() else "") or "an unnamed road"
            maneuver = step.get("maneuver", {})
            m_type = maneuver.get("type", "turn")
            m_modifier = maneuver.get("modifier", "")
            
            # Construct clear Google Maps-style instructions
            if m_type == "depart":
                instruction = f"Head out on {road_name}"
            elif m_type == "arrive":
                instruction = f"Arrive at {dest_name}"
            elif m_modifier and m_modifier != "straight":
                instruction = f"Turn {m_modifier} onto {road_name}"
            else:
                instruction = f"Continue along {road_name}"

            if step_dist_km > 0 or idx == 0 or idx == len(legs[0]["steps"]) - 1:
                segments.append({
                    "step_number": idx + 1,
                    "instruction": instruction,
                    "road_name": "" if m_type == "arrive" else road_name,
                    "distance_km": step_dist_km,
                    "travel_time_min": max(1, step_time_min),
                })

    route_details = {
        "nodes": [start_name, dest_name],
        "distance_km": total_dist_km,
        "travel_time_min": total_time_min,
        "average_risk": avg_risk,
        "max_risk": max_risk,
        "slope_deg": avg_slope,
        "max_slope_deg": max_slope,
        "safety_level": safety_level,
        "zones_crossed": [z["zone_id"] for z in near],
        "coordinates": formatted_coords,
        "segments": segments
    }

    if near:
        names = ", ".join(z["name"] for z in near)
        explanation = f"The road passes within 10 km of {len(near)} monitored zone(s): {names}. Highest risk score {max_risk}/100."
    else:
        explanation = "No monitored landslide zone lies within 10 km of this road, so there is no risk score for it."

    return {
        "start": {
            "id": "CUSTOM_ORIGIN",
            "name": start_name,
            "lat": start_lat,
            "lng": start_lng
        },
        "destination": {
            "id": "CUSTOM_DEST",
            "name": dest_name,
            "lat": dest_lat,
            "lng": dest_lng
        },
        "safe_route": route_details,
        "fastest_route": route_details,
        "comparison": {
            "distance_delta_km": 0.0,
            "time_delta_min": 0,
            "risk_reduction_points": 0.0,
            "avoided_zones_count": 0,
            "avoided_zones": [],
            "avoided_blocked_roads": [],
            "is_identical": True,
            "is_fallback": False,
            "explanation": explanation
        }
    }
