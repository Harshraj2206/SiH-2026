"""
Build backend/data/terrain_cache.json: real DEM elevation and slope for every monitored
zone centre and route waypoint, fetched once from Open-Meteo's elevation API (Copernicus DEM).
Terrain does not change, so the server never needs a live call for these points.

Run from the repo root on a machine where api.open-meteo.com is reachable:
    python backend/scripts/build_terrain_cache.py
"""

import json
import os
import sys
import tempfile
from datetime import datetime, timezone

sys.path.insert(0, os.getcwd())
os.environ["TERRAIN_CACHE_DISABLED"] = "1"  # always fetch live while building
os.environ["STATE_DATABASE_PATH"] = os.path.join(tempfile.mkdtemp(), "state.db")
os.environ.pop("DATABASE_URL", None)

from backend.app.database.store import db_store  # noqa: E402
from backend.app.routing.road_network import NODES_DATA  # noqa: E402
from backend.app.services.elevation_service import get_terrain_elevation_and_slope, TERRAIN_CACHE_PATH  # noqa: E402

points = [(z["center"]["lat"], z["center"]["lng"], z["zone_id"]) for z in db_store.zones.values()]
points += [(n["lat"], n["lng"], node_id) for node_id, n in NODES_DATA.items()]

results, failed = [], []
for lat, lng, name in points:
    dem = get_terrain_elevation_and_slope(lat, lng)
    if dem.get("is_dynamic") and dem.get("slope_deg") is not None:
        results.append({"name": name, "lat": lat, "lng": lng,
                        "elevation_amsl": dem["elevation_amsl"], "slope_deg": dem["slope_deg"]})
    else:
        failed.append(name)

if failed:
    sys.exit(f"DEM lookup failed for {len(failed)} points ({', '.join(failed)}); cache not written.")

cache = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "source": "Open-Meteo elevation API (Copernicus GLO-90 DEM); slope from 3-point ~110 m gradient",
    "points": results,
}
with open(TERRAIN_CACHE_PATH, "w", encoding="utf-8") as f:
    json.dump(cache, f, indent=1)
print(f"Wrote {len(results)} points to {os.path.normpath(TERRAIN_CACHE_PATH)}")
