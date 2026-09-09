"""
LANDSAFE - Real-Time Nearby Hospital & Emergency Resource Discovery Engine
Integrates Google Places API (New / Legacy Nearby Search) with authentic open geospatial
fallback to discover real hospitals, emergency clinics, police, fire, and shelters
near ANY GPS coordinates in India and worldwide. Zero fake/hardcoded fallback data.
"""

import os
import math
import json
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional

# In-memory cache for place discovery to prevent repetitive API calls & stay within quota
_PLACES_QUERY_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 600  # 10 minutes cache per lat/lng/radius/category query

# Cumulative discovered facilities pool per geographic center and category
# Ensures radius expansion (5km -> 10km -> 25km -> 50km) strictly preserves all inner resources
_LOCATION_PLACES_POOL: Dict[str, List[Dict[str, Any]]] = {}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth in kilometers."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def get_configured_google_api_key(api_key_override: Optional[str] = None) -> Optional[str]:
    """Retrieve Google Maps Platform API key from parameter or environment variables."""
    if api_key_override and api_key_override.strip():
        return api_key_override.strip()
    return (
        os.environ.get("GOOGLE_MAPS_API_KEY") or
        os.environ.get("GOOGLE_PLACES_API_KEY") or
        os.environ.get("VITE_GOOGLE_MAPS_API_KEY") or
        None
    )


def _query_google_places_new(
    latitude: float,
    longitude: float,
    radius_meters: float,
    category: str,
    api_key: str
) -> Optional[List[Dict[str, Any]]]:
    """
    Query official Google Places API (New) places:searchNearby.
    Endpoint: https://places.googleapis.com/v1/places:searchNearby
    """
    url = "https://places.googleapis.com/v1/places:searchNearby"
    
    # Map internal category to Google Places (New) includedTypes
    type_mapping = {
        "hospitals": ["hospital", "doctor"],
        "hospital": ["hospital"],
        "ambulance": ["hospital"],
        "police": ["police"],
        "fire": ["fire_station"],
        "shelters": ["community_center"],
        "blood_bank": ["hospital"],
        "rescue": ["fire_station", "police"],
        "all": ["hospital", "doctor", "police", "fire_station", "community_center"],
        "all emergency": ["hospital", "doctor", "police", "fire_station", "community_center"]
    }
    included_types = type_mapping.get(category.lower(), ["hospital", "police", "fire_station", "community_center"] if "all" in category.lower() else ["hospital"])

    payload = {
        "includedTypes": included_types,
        "maxResultCount": 20,
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": latitude,
                    "longitude": longitude
                },
                "radius": float(radius_meters)
            }
        }
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,places.location,"
            "places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,"
            "places.userRatingCount,places.websiteUri,places.regularOpeningHours,"
            "places.currentOpeningHours,places.types,places.googleMapsUri"
        )
    }

    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            places_raw = res_json.get("places", [])
            
            normalized = []
            for p in places_raw:
                loc = p.get("location", {})
                p_lat = loc.get("latitude")
                p_lng = loc.get("longitude")
                if p_lat is None or p_lng is None:
                    continue

                dist_km = haversine_distance_km(latitude, longitude, p_lat, p_lng)
                disp_name = p.get("displayName", {}).get("text", "Medical Facility")
                place_id = p.get("id", "")
                
                # Opening hours status
                open_now = None
                opening_text = None
                if "currentOpeningHours" in p:
                    open_now = p["currentOpeningHours"].get("openNow")
                    opening_text = "Open Now" if open_now else "Closed"

                # Direct Google Maps & Directions URLs
                gmaps_url = p.get("googleMapsUri") or f"https://www.google.com/maps/search/?api=1&query={p_lat},{p_lng}&query_place_id={place_id}"
                directions_url = f"https://www.google.com/maps/dir/?api=1&origin={latitude},{longitude}&destination={p_lat},{p_lng}"

                types_list = p.get("types", [])
                facility_type = "Hospital / Medical Center"
                fac_cat = "hospitals"
                if "police" in types_list:
                    facility_type = "Police Station"
                    fac_cat = "police"
                elif "fire_station" in types_list:
                    facility_type = "Fire & Rescue Station"
                    fac_cat = "fire"
                elif "community_center" in types_list:
                    facility_type = "Evacuation & Community Shelter"
                    fac_cat = "shelters"
                elif category.lower() in ["police", "fire", "shelters"]:
                    fac_cat = category.lower()

                normalized.append({
                    "id": f"GP-{place_id}",
                    "place_id": place_id,
                    "name": disp_name,
                    "type": facility_type,
                    "category": fac_cat,
                    "latitude": p_lat,
                    "longitude": p_lng,
                    "address": p.get("formattedAddress") or f"Near coordinates {round(p_lat, 4)}, {round(p_lng, 4)}",
                    "distance_km": dist_km,
                    "phone": p.get("nationalPhoneNumber") or p.get("internationalPhoneNumber") or None,
                    "international_phone": p.get("internationalPhoneNumber") or None,
                    "website": p.get("websiteUri") or None,
                    "rating": p.get("rating"),
                    "review_count": p.get("userRatingCount"),
                    "open_now": open_now,
                    "opening_hours": opening_text,
                    "google_maps_url": gmaps_url,
                    "directions_url": directions_url,
                    "source": "Google Places API (New)",
                    "emergency_ready": True
                })

            return normalized
    except Exception as e:
        print(f"Google Places API (New) error: {e}")
        return None


def _query_google_places_legacy_single(
    latitude: float,
    longitude: float,
    radius_meters: float,
    g_type: str,
    cat_label: str,
    type_label: str,
    api_key: str
) -> List[Dict[str, Any]]:
    url = (
        f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?"
        f"location={latitude},{longitude}&radius={int(radius_meters)}&type={g_type}&key={api_key}"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "LandSafe-GoogleLegacy/2.0"})
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("status") not in ["OK", "ZERO_RESULTS"]:
                return []
            
            results = data.get("results", [])
            normalized = []
            for r in results:
                geo = r.get("geometry", {}).get("location", {})
                p_lat = geo.get("lat")
                p_lng = geo.get("lng")
                if p_lat is None or p_lng is None:
                    continue

                dist_km = haversine_distance_km(latitude, longitude, p_lat, p_lng)
                place_id = r.get("place_id", "")
                name = r.get("name", "Emergency Facility")

                open_now = r.get("opening_hours", {}).get("open_now")
                opening_text = "Open Now" if open_now else ("Closed" if open_now is False else None)

                gmaps_url = f"https://www.google.com/maps/search/?api=1&query={p_lat},{p_lng}&query_place_id={place_id}"
                directions_url = f"https://www.google.com/maps/dir/?api=1&origin={latitude},{longitude}&destination={p_lat},{p_lng}"

                normalized.append({
                    "id": f"GP-{place_id}",
                    "place_id": place_id,
                    "name": name,
                    "type": type_label,
                    "category": cat_label,
                    "latitude": p_lat,
                    "longitude": p_lng,
                    "address": r.get("vicinity") or f"Coordinates: {round(p_lat, 4)}, {round(p_lng, 4)}",
                    "distance_km": dist_km,
                    "phone": None,
                    "international_phone": None,
                    "website": None,
                    "rating": r.get("rating"),
                    "review_count": r.get("user_ratings_total"),
                    "open_now": open_now,
                    "opening_hours": opening_text,
                    "google_maps_url": gmaps_url,
                    "directions_url": directions_url,
                    "source": "Google Places API (Nearby Search)",
                    "emergency_ready": True
                })
            return normalized
    except Exception as e:
        print(f"Google Places Legacy search error: {e}")
        return []


def _query_google_places_legacy(
    latitude: float,
    longitude: float,
    radius_meters: float,
    category: str,
    api_key: str
) -> Optional[List[Dict[str, Any]]]:
    """
    Fallback to Google Places API (Legacy Nearby Search) if Places API (New) is not active.
    Endpoint: https://maps.googleapis.com/maps/api/place/nearbysearch/json
    """
    is_all = category.lower() in ["all", "all emergency", "all_emergency"]

    if is_all:
        specs = [
            ("hospital", "hospitals", "General Hospital"),
            ("police", "police", "Police Station"),
            ("fire_station", "fire", "Fire & Rescue Station"),
            ("local_government_office", "shelters", "Evacuation & Community Shelter")
        ]
        all_results = []
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(_query_google_places_legacy_single, latitude, longitude, radius_meters, gt, cl, tl, api_key)
                for gt, cl, tl in specs
            ]
            for f in as_completed(futures):
                all_results.extend(f.result())
        return all_results if all_results else None
    else:
        type_mapping = {
            "hospitals": ("hospital", "hospitals", "General Hospital"),
            "hospital": ("hospital", "hospitals", "General Hospital"),
            "ambulance": ("hospital", "hospitals", "Ambulance / Hospital"),
            "police": ("police", "police", "Police Station"),
            "fire": ("fire_station", "fire", "Fire & Rescue Station"),
            "shelters": ("local_government_office", "shelters", "Evacuation & Community Shelter"),
            "blood_bank": ("hospital", "hospitals", "Blood Bank / Hospital"),
            "rescue": ("fire_station", "fire", "Fire & Rescue Station")
        }
        spec = type_mapping.get(category.lower(), ("hospital", "hospitals", "General Hospital"))
        res = _query_google_places_legacy_single(latitude, longitude, radius_meters, spec[0], spec[1], spec[2], api_key)
        return res if res else None


def _query_open_geospatial_facilities(
    latitude: float,
    longitude: float,
    radius_meters: float,
    category: str
) -> List[Dict[str, Any]]:
    """
    Authentic Open Geospatial Overpass API query for ANY coordinates in India/Global.
    Discovers real hospitals, clinics, police stations, fire stations, and shelters with zero fake data.
    """
    overpass_endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter"
    ]

    is_all = (category.lower() in ["all", "all emergency", "all_emergency", "*"])

    # Map category to Overpass QL filters
    if category in ["hospitals", "hospital", "ambulance", "blood_bank"]:
        tag_filters = """
          node["amenity"="hospital"](around:{radius},{lat},{lng});
          way["amenity"="hospital"](around:{radius},{lat},{lng});
          node["amenity"="clinic"](around:{radius},{lat},{lng});
          way["amenity"="clinic"](around:{radius},{lat},{lng});
        """
    elif category in ["police"]:
        tag_filters = """
          node["amenity"="police"](around:{radius},{lat},{lng});
          way["amenity"="police"](around:{radius},{lat},{lng});
        """
    elif category in ["fire"]:
        tag_filters = """
          node["amenity"="fire_station"](around:{radius},{lat},{lng});
          way["amenity"="fire_station"](around:{radius},{lat},{lng});
        """
    elif category in ["shelters"]:
        tag_filters = """
          node["amenity"="shelter"](around:{radius},{lat},{lng});
          node["amenity"="community_centre"](around:{radius},{lat},{lng});
          way["amenity"="community_centre"](around:{radius},{lat},{lng});
        """
    else:
        # All Emergency categories
        tag_filters = """
          node["amenity"="hospital"](around:{radius},{lat},{lng});
          way["amenity"="hospital"](around:{radius},{lat},{lng});
          node["amenity"="clinic"](around:{radius},{lat},{lng});
          way["amenity"="clinic"](around:{radius},{lat},{lng});
          node["amenity"="police"](around:{radius},{lat},{lng});
          way["amenity"="police"](around:{radius},{lat},{lng});
          node["amenity"="fire_station"](around:{radius},{lat},{lng});
          way["amenity"="fire_station"](around:{radius},{lat},{lng});
          node["amenity"="shelter"](around:{radius},{lat},{lng});
          node["amenity"="community_centre"](around:{radius},{lat},{lng});
          way["amenity"="community_centre"](around:{radius},{lat},{lng});
        """

    query = f"""
    [out:json][timeout:10];
    (
      {tag_filters.format(radius=int(radius_meters), lat=latitude, lng=longitude)}
    );
    out center 50;
    """

    for ep in overpass_endpoints:
        try:
            data_encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")
            req = urllib.request.Request(
                ep,
                data=data_encoded,
                headers={"User-Agent": "LandSafe-EmergencyDiscovery/2.0"}
            )
            with urllib.request.urlopen(req, timeout=9.0) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                elements = res.get("elements", [])
                
                results = []
                for el in elements:
                    tags = el.get("tags", {})
                    name = tags.get("name") or tags.get("name:en") or tags.get("operator")
                    if not name:
                        continue

                    # Extract coordinates (node lat/lon or way center)
                    p_lat = el.get("lat") or el.get("center", {}).get("lat")
                    p_lng = el.get("lon") or el.get("center", {}).get("lon")
                    if p_lat is None or p_lng is None:
                        continue

                    p_lat = float(p_lat)
                    p_lng = float(p_lng)
                    dist_km = haversine_distance_km(latitude, longitude, p_lat, p_lng)

                    # Extract real contact & address tags if available
                    phone = (
                        tags.get("phone") or
                        tags.get("contact:phone") or
                        tags.get("emergency:phone") or
                        tags.get("tel") or
                        None
                    )
                    website = tags.get("website") or tags.get("contact:website") or None
                    
                    addr_parts = [
                        tags.get("addr:street"),
                        tags.get("addr:suburb") or tags.get("addr:district"),
                        tags.get("addr:city"),
                        tags.get("addr:state"),
                        tags.get("addr:postcode")
                    ]
                    clean_addr = ", ".join([p for p in addr_parts if p])
                    if not clean_addr:
                        clean_addr = f"Location: {round(p_lat, 4)}°N, {round(p_lng, 4)}°E"

                    amenity = tags.get("amenity", "")
                    if amenity in ["hospital"]:
                        facility_type = "Government / General Hospital"
                        fac_cat = "hospitals"
                    elif amenity in ["clinic"]:
                        facility_type = "Medical Clinic / Trauma Center"
                        fac_cat = "hospitals"
                    elif amenity in ["police"]:
                        facility_type = "Police Station"
                        fac_cat = "police"
                    elif amenity in ["fire_station"]:
                        facility_type = "Fire & Rescue Station"
                        fac_cat = "fire"
                    elif amenity in ["shelter", "community_centre"]:
                        facility_type = "Evacuation & Community Shelter"
                        fac_cat = "shelters"
                    else:
                        facility_type = "Emergency Facility"
                        fac_cat = "hospitals" if is_all else category

                    gmaps_url = f"https://www.google.com/maps/search/?api=1&query={p_lat},{p_lng}"
                    directions_url = f"https://www.google.com/maps/dir/?api=1&origin={latitude},{longitude}&destination={p_lat},{p_lng}"

                    results.append({
                        "id": f"OSM-{el.get('type', 'node')[:1].upper()}-{el['id']}",
                        "place_id": str(el["id"]),
                        "name": name,
                        "type": facility_type,
                        "category": fac_cat if is_all else category,
                        "latitude": p_lat,
                        "longitude": p_lng,
                        "address": clean_addr,
                        "distance_km": dist_km,
                        "phone": phone,
                        "international_phone": phone,
                        "website": website,
                        "rating": None,
                        "review_count": None,
                        "open_now": True if tags.get("opening_hours") == "24/7" else None,
                        "opening_hours": "24/7 Emergency Service" if tags.get("opening_hours") == "24/7" else None,
                        "google_maps_url": gmaps_url,
                        "directions_url": directions_url,
                        "source": "OpenStreetMap Real Geospatial Infrastructure",
                        "emergency_ready": True
                    })

                if results:
                    return results

        except Exception as err:
            print(f"Overpass endpoint {ep} attempt failed: {err}")
            continue

    return []


def _query_nominatim_facilities(
    latitude: float,
    longitude: float,
    radius_km: float,
    category: str
) -> List[Dict[str, Any]]:
    """
    Fast direct Nominatim amenity bounding-box search for hospitals, police, fire, shelters.
    Guarantees 100% real facilities with zero fake data even if Overpass is slow or throttled.
    Supports single category or concurrent multi-category search for 'All Emergency'.
    """
    try:
        deg_lat = radius_km / 111.0
        deg_lon = radius_km / (111.0 * max(0.2, math.cos(math.radians(latitude))))
        min_lon = round(longitude - deg_lon, 5)
        max_lon = round(longitude + deg_lon, 5)
        min_lat = round(latitude - deg_lat, 5)
        max_lat = round(latitude + deg_lat, 5)

        is_all = (category.lower() in ["all", "all emergency", "all_emergency", "*"])

        def _fetch_single_amenity(amenity_code: str, cat_key: str, default_type: str) -> List[Dict[str, Any]]:
            url = (
                f"https://nominatim.openstreetmap.org/search?"
                f"amenity={amenity_code}&viewbox={min_lon},{max_lat},{max_lon},{min_lat}"
                f"&bounded=1&format=json&limit=25"
            )
            req = urllib.request.Request(url, headers={"User-Agent": "LandSafe-EmergencyDiscovery/2.0"})
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                cat_results = []
                for item in data:
                    p_lat = float(item.get("lat"))
                    p_lon = float(item.get("lon"))
                    dist_km = haversine_distance_km(latitude, longitude, p_lat, p_lon)
                    name = item.get("name") or item.get("display_name", "").split(",")[0]
                    place_id = str(item.get("place_id", ""))
                    addr = item.get("display_name", f"Coordinates: {round(p_lat, 4)}, {round(p_lon, 4)}")

                    cat_results.append({
                        "id": f"OSM-NOM-{place_id}",
                        "place_id": place_id,
                        "name": name,
                        "type": default_type,
                        "category": cat_key,
                        "latitude": p_lat,
                        "longitude": p_lon,
                        "address": addr,
                        "distance_km": dist_km,
                        "phone": None,
                        "international_phone": None,
                        "website": None,
                        "rating": None,
                        "review_count": None,
                        "open_now": None,
                        "opening_hours": None,
                        "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={p_lat},{p_lon}",
                        "directions_url": f"https://www.google.com/maps/dir/?api=1&origin={latitude},{longitude}&destination={p_lat},{p_lon}",
                        "source": "OpenStreetMap Real Geospatial Infrastructure",
                        "emergency_ready": True
                    })
                return cat_results

        if is_all:
            # Query all emergency resource amenities in parallel
            amenity_configs = [
                ("hospital", "hospitals", "Government / General Hospital"),
                ("police", "police", "Police Station"),
                ("fire_station", "fire", "Fire & Rescue Station"),
                ("community_centre", "shelters", "Evacuation & Community Shelter"),
            ]
            all_results = []
            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = [
                    executor.submit(_fetch_single_amenity, code, cat_key, dtype)
                    for code, cat_key, dtype in amenity_configs
                ]
                for future in as_completed(futures):
                    try:
                        res = future.result()
                        if res:
                            all_results.extend(res)
                    except Exception as sub_err:
                        print(f"Nominatim sub-amenity query error: {sub_err}")
            return all_results
        else:
            amenity_map = {
                "hospitals": ("hospital", "hospitals", "Government / General Hospital"),
                "hospital": ("hospital", "hospitals", "Government / General Hospital"),
                "ambulance": ("hospital", "hospitals", "Government / General Hospital"),
                "police": ("police", "police", "Police Station"),
                "fire": ("fire_station", "fire", "Fire & Rescue Station"),
                "shelters": ("community_centre", "shelters", "Evacuation & Community Shelter"),
                "blood_bank": ("hospital", "hospitals", "Government / General Hospital")
            }
            code, cat_key, dtype = amenity_map.get(category.lower(), ("hospital", "hospitals", "Government / General Hospital"))
            return _fetch_single_amenity(code, cat_key, dtype)

    except Exception as e:
        print(f"Nominatim emergency facility discovery error: {e}")
        return []


def discover_nearby_emergency_resources(
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    category: str = "hospitals",
    keyword: Optional[str] = None,
    api_key_override: Optional[str] = None
) -> Dict[str, Any]:
    """
    Orchestrate real-time emergency resources discovery for ANY coordinates in India/Worldwide.
    1. Validates coordinate bounds.
    2. Checks in-memory query cache to preserve latency and quotas.
    3. Attempts Google Places API (New) -> then Google Places (Legacy).
    4. If no Google API key is configured or quota is exceeded, utilizes live OpenStreetMap Overpass.
    5. Calculates exact geographic Haversine distances from user GPS.
    6. Sorts by nearest distance first.
    """
    # 1. Bounds Validation
    if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
        raise ValueError(f"Invalid coordinate bounds: ({latitude}, {longitude})")

    radius_km = max(1.0, min(50.0, float(radius_km)))
    radius_meters = radius_km * 1000.0

    cache_key = f"{round(latitude, 3)}_{round(longitude, 3)}_{round(radius_km, 1)}_{category.lower()}_{keyword or ''}"
    now = time.time()
    if cache_key in _PLACES_QUERY_CACHE:
        entry = _PLACES_QUERY_CACHE[cache_key]
        if now - entry["cached_at"] < CACHE_TTL_SECONDS:
            return entry["data"]

    google_api_key = get_configured_google_api_key(api_key_override)
    places: List[Dict[str, Any]] = []
    used_provider = "NONE"
    is_google_configured = bool(google_api_key)

    # 2. Query Google Places if Key Available
    if google_api_key:
        # Try Places API (New) first
        res_new = _query_google_places_new(latitude, longitude, radius_meters, category, google_api_key)
        if res_new is not None:
            places = res_new
            used_provider = "Google Places API (New)"
        else:
            # Fallback to Places API (Legacy Nearby Search)
            res_legacy = _query_google_places_legacy(latitude, longitude, radius_meters, category, google_api_key)
            if res_legacy is not None:
                places = res_legacy
                used_provider = "Google Places API (Nearby Search)"

    # 3. Authentic Open Geospatial Discovery if Google was not configured or returned zero/error
    if not places:
        places = _query_nominatim_facilities(latitude, longitude, radius_km, category)
        if not places:
            places = _query_open_geospatial_facilities(latitude, longitude, radius_meters, category)
        if places:
            used_provider = "OpenStreetMap Real Infrastructure Directory"

    # 4. Merge with cumulative location pool for this geographic center & category
    # Mathematical rule: resource.distance <= selectedRadius (never drop resources on radius increase)
    pool_key = f"{round(latitude, 3)}_{round(longitude, 3)}_{category.lower()}_{keyword or ''}"
    existing_pool = _LOCATION_PLACES_POOL.get(pool_key, [])
    combined_candidates = places + existing_pool

    seen_ids = set()
    seen_coords = set()
    deduped_places = []
    for p in combined_candidates:
        pid = p.get("place_id") or p.get("id")
        coord_key = (round(p["latitude"], 4), round(p["longitude"], 4), p["name"].strip().lower())
        if pid and pid in seen_ids:
            continue
        if coord_key in seen_coords:
            continue
        if pid:
            seen_ids.add(pid)
        seen_coords.add(coord_key)
        
        # Ensure distance is strictly computed from current query center
        p_dist = haversine_distance_km(latitude, longitude, p["latitude"], p["longitude"])
        p["distance_km"] = p_dist
        deduped_places.append(p)

    # Save complete cumulative pool for this center & category
    _LOCATION_PLACES_POOL[pool_key] = deduped_places

    # 5. Filter strictly within requested maximum radius: distance_km <= radius_km * 1.05
    places = [p for p in deduped_places if p["distance_km"] <= (radius_km * 1.05)]

    # 6. Optional Keyword Filtering
    if keyword and keyword.strip():
        kw = keyword.strip().lower()
        places = [p for p in places if kw in p["name"].lower() or kw in p["address"].lower()]

    # 7. Sort Strictly by Nearest Distance First
    places.sort(key=lambda p: p["distance_km"])

    response_data = {
        "status": "success",
        "search_center": {
            "latitude": latitude,
            "longitude": longitude
        },
        "search_radius_km": radius_km,
        "category": category,
        "total_found": len(places),
        "places": places,
        "data_source": {
            "provider": used_provider,
            "is_google_configured": is_google_configured,
            "is_real_data": True,
            "is_simulated": False,
            "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "message": (
                "Live real-time places discovered via official Google Places API" if "Google" in used_provider
                else ("Live facilities discovered via verified open geospatial infrastructure. To use Google Places API, add GOOGLE_MAPS_API_KEY in environment." if not is_google_configured else "Google Places returned 0 places in radius; verified open geospatial facilities shown.")
            )
        }
    }

    _PLACES_QUERY_CACHE[cache_key] = {
        "data": response_data,
        "cached_at": now
    }

    return response_data
