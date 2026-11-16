"""
Vegetation index (NDVI) from NASA MODIS MOD13Q1 (250 m, 16-day composite)
via the ORNL DAAC MODIS/VIIRS Land Product Subsets REST API:
https://modis.ornl.gov/rst/api/v1/MOD13Q1/...
Returns None when unavailable; callers must label the fallback they use.
"""

import json
import time
import urllib.request
from typing import Any, Dict, Optional

API = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
BAND = "250m_16_days_NDVI"
FILL_THRESHOLD = -2000      # MOD13Q1 fill value is -3000 (scaled -0.3)
DEFAULT_SCALE = 0.0001
SUCCESS_TTL = 16 * 24 * 3600  # one composite period
FAILURE_TTL = 3600            # retry an unreachable cell after an hour

_CACHE: Dict[str, Dict[str, Any]] = {}


def _get_json(url: str, timeout: float = 8.0) -> Dict[str, Any]:
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "LandSafe/2.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def parse_subset(payload: Dict[str, Any]) -> Optional[float]:
    """Extract the scaled NDVI value from a /subset response, or None for fill/missing."""
    try:
        scale = float(payload.get("scale") or DEFAULT_SCALE)
        values = payload["subset"][0]["data"]
        raw = values[len(values) // 2]  # centre pixel
        if raw is None or float(raw) <= FILL_THRESHOLD:
            return None
        return round(max(-1.0, min(1.0, float(raw) * scale)), 3)
    except (KeyError, IndexError, TypeError, ValueError):
        return None


def get_ndvi(latitude: float, longitude: float) -> Dict[str, Any]:
    key = f"{round(latitude / 0.05) * 0.05:.2f},{round(longitude / 0.05) * 0.05:.2f}"
    now = time.time()
    hit = _CACHE.get(key)
    if hit and now < hit["expires_at"]:
        return hit["data"]

    result = {"ndvi": None, "date": None, "status": "UNAVAILABLE",
              "source": "NASA MODIS MOD13Q1 (ORNL DAAC)"}
    try:
        dates = _get_json(f"{API}/dates?latitude={latitude:.4f}&longitude={longitude:.4f}").get("dates", [])
        # Latest composite can be cloud-filled; try the three most recent.
        for entry in reversed(dates[-3:]):
            modis_date = entry.get("modis_date")
            payload = _get_json(
                f"{API}/subset?latitude={latitude:.4f}&longitude={longitude:.4f}&band={BAND}"
                f"&startDate={modis_date}&endDate={modis_date}&kmAboveBelow=0&kmLeftRight=0",
                timeout=12.0,
            )
            value = parse_subset(payload)
            if value is not None:
                result = {"ndvi": value, "date": entry.get("calendar_date"), "status": "LIVE",
                          "source": "NASA MODIS MOD13Q1 (ORNL DAAC)"}
                break
    except Exception as e:
        result["error"] = str(e)[:200]

    ttl = SUCCESS_TTL if result["status"] == "LIVE" else FAILURE_TTL
    _CACHE[key] = {"data": result, "expires_at": now + ttl}
    return result
