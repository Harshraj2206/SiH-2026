"""
LANDSLIDEGUARD SIH26001 - Global Reverse Geocoding & Regional Place Resolver Service
Resolves exact village, town, city, district, state/province, and country for any coordinate on Earth.
"""

import time
import urllib.request
import json
from typing import Dict, Any

_GEOCODE_CACHE: Dict[str, Dict[str, Any]] = {}


def reverse_geocode_location(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Resolve real place name, district, state, and country for any GPS coordinate globally.
    """
    cache_key = f"{round(latitude, 3)}_{round(longitude, 3)}"
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={latitude:.5f}&lon={longitude:.5f}&zoom=14&addressdetails=1&accept-language=en"

    place_name = None
    district = None
    state = None
    country = None
    display_name = None

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "LandslideGuard-GlobalIntelligence/2.0 (SIH26001-DisasterManagement)"}
        )
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            address = data.get("address", {})
            display_name = data.get("display_name")

            # Extract local place name (village, suburb, town, city, municipality)
            place_name = (
                address.get("village") or
                address.get("suburb") or
                address.get("town") or
                address.get("city") or
                address.get("municipality") or
                address.get("county") or
                address.get("hamlet")
            )

            district = (
                address.get("state_district") or
                address.get("county") or
                address.get("city_district") or
                address.get("region") or
                address.get("state")
            )

            state = address.get("state") or address.get("province") or address.get("region") or ""
            country = address.get("country")

    except Exception:
        pass

    if not place_name:
        place_name = f"{latitude:.4f}, {longitude:.4f}"
    formatted_name = ", ".join(p for p in (place_name, state if state != place_name else None) if p)

    result = {
        "latitude": latitude,
        "longitude": longitude,
        "name": formatted_name,
        "short_name": place_name,
        "district": district,
        "state": state or country,
        "country": country,
        "formatted_address": display_name or formatted_name
    }

    if display_name:  # keep failed lookups out of the cache so they can be retried
        _GEOCODE_CACHE[cache_key] = result
    return result
