"""
Build backend/data/replay_events.json: the real conditions before each rain-triggered past event
listed in landslide_intelligence_service.PAST_EVENTS.

- Rain (24 h / 72 h before the event) and topsoil moisture: ERA5 reanalysis via the Open-Meteo
  archive API (the same source the model was trained on).
- Elevation and slope: Copernicus DEM via the Open-Meteo elevation API (3 points ~110 m apart).
- Landslides within 35 km: NASA Global Landslide Catalog (all catalogued events predate 2017).

Run from the repo root where api.open-meteo.com is reachable:
    python backend/scripts/build_replay_events.py
"""

import json
import math
import os
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.getcwd())
from backend.app.services.landslide_intelligence_service import PAST_EVENTS  # noqa: E402
from backend.app.services.landslide_catalog import get_historical_density_score  # noqa: E402

OUT = os.path.join("backend", "data", "replay_events.json")


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "LandSafe/2.0"}), timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def conditions(e):
    t = datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00"))
    start = (t - timedelta(days=4)).date().isoformat()
    end = t.date().isoformat()
    lat, lon = e["latitude"], e["longitude"]
    arc = get_json(
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}&start_date={start}&end_date={end}"
        "&hourly=precipitation,soil_moisture_0_to_7cm&timezone=GMT"
    )
    hours = [datetime.fromisoformat(h).replace(tzinfo=timezone.utc) for h in arc["hourly"]["time"]]
    rain = arc["hourly"]["precipitation"]
    soil = arc["hourly"]["soil_moisture_0_to_7cm"]
    r24 = sum(p or 0 for h, p in zip(hours, rain) if t - timedelta(hours=24) < h <= t)
    r72 = sum(p or 0 for h, p in zip(hours, rain) if t - timedelta(hours=72) < h <= t)
    soil_at = [s for h, s in zip(hours, soil) if h <= t and s is not None]

    d = 0.001
    ele = get_json(
        "https://api.open-meteo.com/v1/elevation"
        f"?latitude={lat:.5f},{lat + d:.5f},{lat:.5f}&longitude={lon:.5f},{lon:.5f},{lon + d:.5f}"
    )["elevation"]
    dz_dy = (ele[1] - ele[0]) / (d * 111320.0)
    dz_dx = (ele[2] - ele[0]) / (d * 111320.0 * max(0.1, math.cos(math.radians(lat))))
    slope = math.degrees(math.atan(math.hypot(dz_dx, dz_dy)))

    return {
        "rainfall_24h": round(r24, 1),
        "rainfall_72h": round(r72, 1),
        "soil_moisture": round(soil_at[-1], 3) if soil_at else None,
        "slope_deg": round(slope, 1),
        "elevation_amsl": round(ele[0], 1),
        "historical_incidents": get_historical_density_score(lat, lon),
    }


events = []
for e in PAST_EVENTS:
    if e.get("trigger") != "Rainfall":
        continue  # the model scores rain-triggered landslides only
    events.append({
        "incident_id": e["incident_id"],
        "title": e["title"],
        "district": e["district"],
        "state": e["state"],
        "latitude": e["latitude"],
        "longitude": e["longitude"],
        "timestamp": e["timestamp"],
        "conditions": conditions(e),
        "source": e["source"],
        "source_url": e["source_url"],
    })
    print(e["title"], events[-1]["conditions"])

with open(OUT, "w", encoding="utf-8") as f:
    json.dump({
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": "ERA5 via Open-Meteo archive API; Copernicus DEM via Open-Meteo elevation API; NASA Global Landslide Catalog",
        "events": events,
    }, f, indent=1)
print(f"Wrote {len(events)} events to {OUT}")
