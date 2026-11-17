"""
LANDSAFE - USGS Real-Time Global Earthquake & Seismic Feed Service
Queries official USGS GeoJSON feeds and retrieves real-time seismic events
geographically relevant to selected global coordinates.
"""

import json
import time
import math
import urllib.request
from typing import Optional, List, Dict, Any

_USGS_FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
_SEISMIC_CACHE: Dict[str, Any] = {"data": [], "cached_at": 0}
_CACHE_TTL = 600  # 10 minutes


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_nearby_earthquakes(latitude: float, longitude: float, max_radius_km: float = 600.0) -> Optional[List[Dict[str, Any]]]:
    """
    Earthquakes from the USGS feed within max_radius_km, nearest first. None if the feed is unreachable.
    """
    now = time.time()
    all_events = []

    if _SEISMIC_CACHE["data"] and (now - _SEISMIC_CACHE["cached_at"] < _CACHE_TTL):
        all_events = _SEISMIC_CACHE["data"]
    else:
        try:
            req = urllib.request.Request(_USGS_FEED_URL, headers={"User-Agent": "LandSafe-USGSFeed/2.0"})
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                features = data.get("features", [])
                parsed = []
                for f in features:
                    props = f.get("properties", {})
                    geom = f.get("geometry", {})
                    coords = geom.get("coordinates", [])
                    if len(coords) >= 2:
                        eq_lon, eq_lat = coords[0], coords[1]
                        depth_km = coords[2] if len(coords) >= 3 else None
                        parsed.append({
                            "event_id": f.get("id"),
                            "title": props.get("title"),
                            "magnitude": props.get("mag"),
                            "place": props.get("place"),
                            "time_ms": props.get("time"),
                            "latitude": eq_lat,
                            "longitude": eq_lon,
                            "depth_km": round(depth_km, 1) if depth_km is not None else None,
                            "significance": props.get("sig"),
                            "source": "USGS Real-Time Seismic Network"
                        })
                all_events = parsed
                _SEISMIC_CACHE["data"] = parsed
                _SEISMIC_CACHE["cached_at"] = now
        except Exception as e:
            print(f"USGS earthquake feed fetch error: {e}")
            return None

    # Geographically filter by radius from selected coordinates
    nearby = []
    for eq in all_events:
        dist = _haversine_km(latitude, longitude, eq["latitude"], eq["longitude"])
        if dist <= max_radius_km:
            eq_copy = dict(eq)
            eq_copy["distance_km"] = round(dist, 1)
            nearby.append(eq_copy)

    # Sort by closest / highest magnitude
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby[:10]
