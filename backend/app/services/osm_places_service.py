"""
Hospitals, clinics and shelters near a point, from OpenStreetMap (Overpass API).
Only what OpenStreetMap lists is returned; nothing is invented when the lookup fails.
"""

import json
import time
import math
import urllib.request
import urllib.parse
from typing import List, Dict, Any

_OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
)
_PLACES_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL = 1800  # 30 minutes
# amenity=shelter also covers bus stops and picnic huts; those are not emergency shelters.
_NOT_EMERGENCY_SHELTERS = {"public_transport", "picnic_shelter", "lean_to", "gazebo", "field_shelter", "sun_shelter"}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _overpass(query: str) -> List[Dict[str, Any]]:
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    last_error = None
    for url in _OVERPASS_URLS:
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": "LandSafe/2.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8")).get("elements", [])
        except Exception as e:  # try the next public Overpass server
            last_error = e
    raise RuntimeError(f"Overpass unavailable: {last_error}")


def get_nearby_real_facilities(latitude: float, longitude: float, radius_km: float = 25.0) -> Dict[str, Any]:
    """Real facilities within radius_km. On failure: empty lists and status UNAVAILABLE."""
    cache_key = f"{round(latitude, 2)}_{round(longitude, 2)}_{radius_km}"
    now = time.time()
    entry = _PLACES_CACHE.get(cache_key)
    if entry and now - entry["cached_at"] < _CACHE_TTL:
        return entry["data"]

    r = int(radius_km * 1000)
    query = f"""
    [out:json][timeout:12];
    (
      nwr["amenity"="hospital"](around:{r},{latitude},{longitude});
      nwr["amenity"="clinic"](around:{r},{latitude},{longitude});
      nwr["emergency"="assembly_point"](around:{r},{latitude},{longitude});
      nwr["amenity"="shelter"](around:{r},{latitude},{longitude});
      nwr["amenity"="community_centre"](around:{r},{latitude},{longitude});
    );
    out center tags 200;
    """
    try:
        elements = _overpass(query)
    except Exception as e:
        print(f"Overpass facility query failed: {e}")
        return {"hospitals": [], "shelters": [], "status": "UNAVAILABLE"}

    hospitals, shelters = [], []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name:en") or tags.get("name")
        el_lat = el.get("lat", (el.get("center") or {}).get("lat"))
        el_lon = el.get("lon", (el.get("center") or {}).get("lon"))
        if not name or el_lat is None or el_lon is None:
            continue
        dist = round(_haversine_km(latitude, longitude, el_lat, el_lon), 1)
        phone = tags.get("phone") or tags.get("contact:phone")
        amenity = tags.get("amenity", "")
        beds = tags.get("beds")
        base = {
            "name": name,
            "latitude": el_lat,
            "longitude": el_lon,
            "distance_km": dist,
            "contact_phone": phone,
            "address": ", ".join(v for v in (tags.get("addr:street"), tags.get("addr:city")) if v) or None,
            "opening_hours": tags.get("opening_hours"),
            "operator": tags.get("operator"),
            "source": "OpenStreetMap",
            "osm_url": f"https://www.openstreetmap.org/{el.get('type', 'node')}/{el.get('id')}",
        }
        if amenity in ("hospital", "clinic"):
            hospitals.append({
                **base,
                "hospital_id": f"OSM-{el.get('type', 'n')[0]}{el['id']}",
                "type": "Hospital" if amenity == "hospital" else "Clinic",
                "has_emergency": tags.get("emergency") == "yes",
                "total_beds": int(beds) if beds and beds.isdigit() else None,
            })
        elif tags.get("emergency") == "assembly_point" or (
                amenity == "shelter" and tags.get("shelter_type") not in _NOT_EMERGENCY_SHELTERS) or amenity == "community_centre":
            cap = tags.get("capacity")
            shelters.append({
                **base,
                "shelter_id": f"OSM-{el.get('type', 'n')[0]}{el['id']}",
                "type": ("Emergency assembly point" if tags.get("emergency") == "assembly_point"
                         else "Community centre" if amenity == "community_centre" else "Shelter"),
                "capacity": int(cap) if cap and cap.isdigit() else None,
            })

    hospitals.sort(key=lambda x: x["distance_km"])
    shelters.sort(key=lambda x: x["distance_km"])
    result = {"hospitals": hospitals[:20], "shelters": shelters[:20], "status": "OK"}
    _PLACES_CACHE[cache_key] = {"data": result, "cached_at": now}
    return result
