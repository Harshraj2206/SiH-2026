"""
Historical landslides in India from the NASA Global Landslide Catalog (backend/data/glc_india_landslides.csv).
"""

import csv
import os
from typing import List, Dict, Any, Optional

_GLC_SOURCE = "NASA Global Landslide Catalog"
_GLC_URL = "https://catalog.data.gov/dataset/global-landslide-catalog-export"
_GLC_RECORDS: Optional[List[Dict[str, Any]]] = None


def _glc_records() -> List[Dict[str, Any]]:
    """Indian events from the NASA Global Landslide Catalog (2007-2016), newest first."""
    global _GLC_RECORDS
    if _GLC_RECORDS is None:
        try:
            with open(_GLC_PATH, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
        except OSError:
            rows = []
        _GLC_RECORDS = sorted((
            {
                "incident_id": f"GLC-{r['event_id']}",
                "location_name": r.get("title") or "Unnamed location",
                "state": r.get("state") or "",
                "district": "",
                "latitude": float(r["latitude"]),
                "longitude": float(r["longitude"]),
                "event_date": r.get("event_date"),
                "trigger": (r.get("trigger") or "unknown").replace("_", " "),
                "location_accuracy": r.get("location_accuracy"),
                "source": _GLC_SOURCE,
                "source_url": _GLC_URL,
            }
            for r in rows
        ), key=lambda r: r["event_date"] or "", reverse=True)
    return _GLC_RECORDS


def get_historical_landslides(district: Optional[str] = None, state: Optional[str] = None) -> List[Dict[str, Any]]:
    """Catalogued landslides, optionally filtered by state (the catalog has no district field)."""
    results = _glc_records()
    if state:
        results = [r for r in results if r["state"].lower() == state.lower()]
    return results


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


_GLC_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "glc_india_landslides.csv")
_GLC_POINTS: Optional[List[tuple]] = None


def _glc_points() -> List[tuple]:
    """NASA Global Landslide Catalog events in India (same file the model was trained with)."""
    global _GLC_POINTS
    if _GLC_POINTS is None:
        try:
            with open(_GLC_PATH, newline="", encoding="utf-8") as f:
                _GLC_POINTS = [(float(r["latitude"]), float(r["longitude"])) for r in csv.DictReader(f)]
        except OSError:
            _GLC_POINTS = []
    return _GLC_POINTS


def get_historical_density_score(latitude: float, longitude: float, radius_km: float = 35.0) -> int:
    """Count of NASA-catalogued landslides within radius_km (true count, 0 allowed)."""
    return sum(1 for lat, lon in _glc_points() if _haversine_km(latitude, longitude, lat, lon) <= radius_km)


def get_nearest_catalogued_landslide(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """Closest event in the NASA catalog and its distance in km."""
    records = _glc_records()
    if not records:
        return None
    closest = min(records, key=lambda h: _haversine_km(latitude, longitude, h["latitude"], h["longitude"]))
    return {**closest, "distance_km": round(_haversine_km(latitude, longitude, closest["latitude"], closest["longitude"]), 1)}
