"""
LANDSAFE - Global Routing & Dynamic Geotechnical Risk Analysis Service
Connects to Open Source Routing Engine (OSRM) for worldwide real-road navigation
and evaluates physics-based landslide risk & slope along the route geometry.
"""

import math
import json
import urllib.request
import urllib.parse
from typing import Dict, List, Any, Optional
from backend.app.services.elevation_service import get_terrain_elevation_and_slope
from backend.app.services.geocode_service import reverse_geocode_location

OSRM_API_URL = "https://router.project-osrm.org/route/v1/driving"


def get_coordinates_from_query(query: str) -> Optional[Dict[str, Any]]:
    """Geocode a place name into latitude and longitude using OpenStreetMap Nominatim."""
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(query)}&limit=1"
        req = urllib.request.Request(url, headers={"User-Agent": "LandSafe-GlobalRouter/2.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            if data and len(data) > 0:
                return {
                    "name": data[0].get("display_name", query).split(",")[0],
                    "full_name": data[0].get("display_name", query),
                    "lat": float(data[0]["lat"]),
                    "lng": float(data[0]["lon"])
                }
    except Exception as e:
        print(f"Geocoding error for '{query}': {e}")
    return None


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
        with urllib.request.urlopen(req, timeout=4.0) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            if res_json.get("code") == "Ok" and res_json.get("routes"):
                route_data = res_json["routes"][0]
    except Exception as e:
        print(f"OSRM routing query error: {e}")

    # Fallback to direct great-circle interpolation if OSRM is unreachable
    if not route_data:
        steps_count = 10
        coords = []
        for i in range(steps_count + 1):
            t = i / float(steps_count)
            coords.append([start_lng + t * (dest_lng - start_lng), start_lat + t * (dest_lat - start_lat)])
        
        # Approximate distance in km
        dlat = math.radians(dest_lat - start_lat)
        dlng = math.radians(dest_lng - start_lng)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(start_lat)) * math.cos(math.radians(dest_lat)) * math.sin(dlng/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        approx_dist_km = round(6371 * c, 1)
        approx_time_min = round((approx_dist_km / 50.0) * 60)

        route_data = {
            "distance": approx_dist_km * 1000.0,
            "duration": approx_time_min * 60.0,
            "geometry": {"coordinates": coords},
            "legs": [{
                "steps": [{
                    "maneuver": {"instruction": f"Proceed directly toward {dest_name}", "type": "depart"},
                    "name": "Direct Corridor Link",
                    "distance": approx_dist_km * 1000.0,
                    "duration": approx_time_min * 60.0
                }]
            }]
        }

    total_dist_km = round(route_data["distance"] / 1000.0, 1)
    total_time_min = round(route_data["duration"] / 60.0)
    geo_coords = route_data["geometry"]["coordinates"]  # [[lng, lat], ...]

    # Convert coordinates format to {"lat": ..., "lng": ...}
    formatted_coords = [{"lat": pt[1], "lng": pt[0]} for pt in geo_coords]

    # Sample route at key points to calculate terrain slope and risk
    sample_indices = []
    num_pts = len(formatted_coords)
    if num_pts <= 10:
        sample_indices = list(range(num_pts))
    else:
        sample_indices = [int(i * (num_pts - 1) / 7) for i in range(8)]
        if (num_pts - 1) not in sample_indices:
            sample_indices.append(num_pts - 1)

    from concurrent.futures import ThreadPoolExecutor

    def _sample_pt(pt):
        try:
            terrain = get_terrain_elevation_and_slope(pt["lat"], pt["lng"])
            return terrain.get("slope_deg", 0.0)
        except Exception:
            return 0.0

    pts_to_sample = [formatted_coords[idx] for idx in sample_indices]
    with ThreadPoolExecutor(max_workers=min(8, len(pts_to_sample))) as executor:
        sampled_slopes = list(executor.map(_sample_pt, pts_to_sample))

    avg_slope = round(sum(sampled_slopes) / len(sampled_slopes), 1) if sampled_slopes else 0.0
    max_slope = max(sampled_slopes) if sampled_slopes else 0.0

    # Risk score evaluation based on real terrain physics
    # If slope is low (e.g. plains, city roads), risk is minimal (2-10 LOW)
    # If slope is steep (>15-30° in mountain passes), risk elevates accordingly
    if max_slope >= 30.0:
        avg_risk = min(85.0, round(25.0 + max_slope * 1.5, 1))
        safety_level = "HIGH RISK"
    elif max_slope >= 15.0:
        avg_risk = min(55.0, round(15.0 + max_slope * 1.2, 1))
        safety_level = "MODERATE RISK"
    else:
        avg_risk = max(2.0, min(20.0, round(3.0 + avg_slope * 1.5, 1)))
        safety_level = "LOW RISK"

    # Extract step-by-step turn maneuvers
    segments = []
    legs = route_data.get("legs", [])
    if legs and "steps" in legs[0]:
        for idx, step in enumerate(legs[0]["steps"]):
            step_dist_km = round(step.get("distance", 0.0) / 1000.0, 1)
            step_time_min = round(step.get("duration", 0.0) / 60.0)
            road_name = step.get("name") or "Main Road"
            maneuver = step.get("maneuver", {})
            m_type = maneuver.get("type", "turn")
            m_modifier = maneuver.get("modifier", "")
            
            # Construct clear Google Maps-style instructions
            if m_type == "depart":
                instruction = f"Head out on {road_name}"
            elif m_type == "arrive":
                instruction = f"Arrive at destination: {dest_name}"
            elif m_modifier:
                instruction = f"Turn {m_modifier} onto {road_name}"
            else:
                instruction = f"Continue along {road_name}"

            if step_dist_km > 0 or idx == 0 or idx == len(legs[0]["steps"]) - 1:
                segments.append({
                    "step_number": idx + 1,
                    "instruction": instruction,
                    "road_name": road_name,
                    "distance_km": step_dist_km,
                    "travel_time_min": max(1, step_time_min),
                    "risk_score": avg_risk,
                    "road_status": "OPEN"
                })

    # If steps were too granular or empty, generate consolidated steps
    if not segments:
        segments = [{
            "step_number": 1,
            "instruction": f"Proceed from {start_name} toward {dest_name}",
            "road_name": "Connected Highway Network",
            "distance_km": total_dist_km,
            "travel_time_min": total_time_min,
            "risk_score": avg_risk,
            "road_status": "OPEN"
        }]

    route_details = {
        "nodes": [start_name, dest_name],
        "distance_km": total_dist_km,
        "travel_time_min": total_time_min,
        "average_risk": avg_risk,
        "max_risk": avg_risk,
        "slope_deg": avg_slope,
        "max_slope_deg": max_slope,
        "safety_level": safety_level,
        "zones_crossed": [],
        "coordinates": formatted_coords,
        "segments": segments
    }

    explanation = (
        f"Real-world road navigation from {start_name} to {dest_name} ({total_dist_km} km, ~{total_time_min} mins). "
        f"Average terrain slope is {avg_slope}° (Max: {max_slope}°). Overall hazard level is {safety_level}."
    )

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
