"""
Is a point inside India? The model was trained only on Indian landslides, so risk scores are
given only for points inside India's boundary (backend/data/india_boundary.json, Natural Earth,
India's point of view, simplified to about 1 km).
"""

import json
import os
from functools import lru_cache
from typing import List, Tuple

_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "india_boundary.json")


@lru_cache(maxsize=1)
def _polygons() -> List[List[Tuple[float, float]]]:
    with open(_PATH, encoding="utf-8") as f:
        return [[(p[0], p[1]) for p in poly] for poly in json.load(f)["polygons"]]


def _inside(lon: float, lat: float, ring: List[Tuple[float, float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def in_india(latitude: float, longitude: float) -> bool:
    if not (6.0 <= latitude <= 37.6 and 68.0 <= longitude <= 97.5):
        return False
    return any(_inside(longitude, latitude, ring) for ring in _polygons())
