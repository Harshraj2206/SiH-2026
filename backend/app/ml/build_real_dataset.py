"""
Build the model training set from real data only.

Positives: rain-triggered landslides in India from the NASA Global Landslide Catalog
(location accuracy 10 km or better).
Negatives:
  - temporal: same place, same season, a different year with no catalogued landslide nearby
  - spatial:  same day, a point 15-60 km away with no catalogued landslide nearby
Features per sample:
  - rainfall_24h / rainfall_72h / soil_moisture: ERA5 reanalysis via the Open-Meteo archive API
  - slope_deg / elevation_amsl: Copernicus DEM via the same function the live app uses
  - historical_incidents: catalogued landslides within 35 km (excluding +-30 days of the sample)

Run from the repo root:  python -m backend.app.ml.build_real_dataset
Progress is saved after every sample; re-running resumes where it stopped.
"""

import csv
import json
import math
import os
import random
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

os.environ.setdefault("TERRAIN_CACHE_DISABLED", "1")  # always compute slope from the DEM here

from backend.app.services.elevation_service import get_terrain_elevation_and_slope  # noqa: E402

GLC_URL = "https://data.nasa.gov/docs/legacy/Global_Landslide_Catalog_Export/Global_Landslide_Catalog_Export_rows.csv"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
GLC_RAW = os.path.join(DATA_DIR, "glc_raw.csv")
CATALOG_OUT = os.path.join(DATA_DIR, "glc_india_landslides.csv")
PROGRESS = os.path.join(DATA_DIR, "real_dataset_progress.jsonl")
DATASET_OUT = os.path.join(DATA_DIR, "real_landslide_training.csv")

RAIN_TRIGGERS = {"downpour", "rain", "continuous_rain", "monsoon", "tropical_cyclone"}
GOOD_ACCURACY = {"exact", "1km", "5km", "10km"}
FIRST_YEAR, LAST_YEAR = 2007, 2023

random.seed(42)


def haversine_km(a_lat, a_lon, b_lat, b_lon):
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = p2 - p1, math.radians(b_lon - a_lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def get_json(url, tries=5):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LandSafe-Training/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print("Rate limited, waiting 65 s")
                time.sleep(65)
            elif e.code == 400:
                raise
            else:
                time.sleep(3 * (attempt + 1))
        except Exception:
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"Failed: {url}")


def load_catalog():
    """All India GLC events (any trigger), used for history counts; also saved for the live app."""
    if not os.path.exists(GLC_RAW):
        print("Downloading NASA Global Landslide Catalog...")
        urllib.request.urlretrieve(GLC_URL, GLC_RAW)
    events = []
    with open(GLC_RAW, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["country_code"] != "IN" or not row["latitude"] or not row["event_date"]:
                continue
            events.append({
                "event_id": row["event_id"],
                "date": datetime.strptime(row["event_date"].split(" ")[0], "%m/%d/%Y").date(),
                "latitude": float(row["latitude"]), "longitude": float(row["longitude"]),
                "trigger": row["landslide_trigger"], "accuracy": row["location_accuracy"],
                "title": row["event_title"], "state": row["admin_division_name"],
            })
    events.sort(key=lambda e: e["date"])
    with open(CATALOG_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["event_id", "event_date", "latitude", "longitude", "trigger", "location_accuracy", "state", "title"])
        for e in events:
            w.writerow([e["event_id"], e["date"].isoformat(), e["latitude"], e["longitude"],
                        e["trigger"], e["accuracy"], e["state"], e["title"]])
    return events


def near_event(events, lat, lon, d, km, days):
    return any(abs((e["date"] - d).days) <= days and haversine_km(lat, lon, e["latitude"], e["longitude"]) <= km
               for e in events)


def history_count(events, lat, lon, d, km=35.0):
    """Catalogued landslides within km, leaving out the 30 days around the sample date.
    Counting the whole catalogue (not only earlier events) matches what the live app sees
    and stops later-dated samples from getting larger counts just because of their date."""
    return sum(1 for e in events if abs((e["date"] - d).days) > 30
               and haversine_km(lat, lon, e["latitude"], e["longitude"]) <= km)


def build_samples(events):
    positives = []
    for e in events:
        if e["trigger"] not in RAIN_TRIGGERS or e["accuracy"] not in GOOD_ACCURACY:
            continue
        if not FIRST_YEAR <= e["date"].year <= LAST_YEAR:
            continue
        if any(p["date"] == e["date"] and haversine_km(p["latitude"], p["longitude"], e["latitude"], e["longitude"]) < 5
               for p in positives):
            continue  # one sample per place per day
        positives.append({"kind": "positive", "label": 1, "event_id": e["event_id"],
                          "latitude": e["latitude"], "longitude": e["longitude"], "date": e["date"]})

    samples = list(positives)
    for p in positives:
        # temporal negative: same place, same time of year, another year, no landslide nearby
        for _ in range(30):
            year = random.randint(FIRST_YEAR, LAST_YEAR)
            if year == p["date"].year:
                continue
            try:
                d = p["date"].replace(year=year) + timedelta(days=random.randint(-15, 15))
            except ValueError:
                continue
            if not near_event(events, p["latitude"], p["longitude"], d, 25, 15):
                samples.append({"kind": "temporal_negative", "label": 0, "event_id": p["event_id"],
                                "latitude": p["latitude"], "longitude": p["longitude"], "date": d})
                break
        # spatial negative: same day, 15-60 km away, no landslide nearby
        for _ in range(30):
            dist, bearing = random.uniform(15, 60), random.uniform(0, 2 * math.pi)
            lat = p["latitude"] + (dist / 111.0) * math.cos(bearing)
            lon = p["longitude"] + (dist / (111.0 * math.cos(math.radians(p["latitude"])))) * math.sin(bearing)
            if not (6.5 <= lat <= 37.0 and 68.0 <= lon <= 97.5):
                continue
            if not near_event(events, lat, lon, p["date"], 10, 30):
                samples.append({"kind": "spatial_negative", "label": 0, "event_id": p["event_id"],
                                "latitude": round(lat, 4), "longitude": round(lon, 4), "date": p["date"]})
                break
    return samples


def era5_features(lat, lon, d):
    """Rain on day d (24h) and days d-2..d (72h), and mean topsoil moisture on day d-1 (ERA5)."""
    start = d - timedelta(days=2)
    url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={lat:.4f}&longitude={lon:.4f}"
           f"&start_date={start.isoformat()}&end_date={d.isoformat()}"
           f"&daily=precipitation_sum&hourly=soil_moisture_0_to_7cm&timezone=Asia%2FKolkata")
    data = get_json(url)
    rain = data["daily"]["precipitation_sum"]
    soil = data["hourly"]["soil_moisture_0_to_7cm"][24:48]
    if len(rain) != 3 or any(v is None for v in rain) or len(soil) != 24 or any(v is None for v in soil):
        return None
    return {"rainfall_24h": round(rain[2], 1), "rainfall_72h": round(sum(rain), 1),
            "soil_moisture": round(sum(soil) / 24, 3)}


def terrain(lat, lon):
    for _ in range(4):
        t = get_terrain_elevation_and_slope(lat, lon)
        if t.get("is_dynamic") and t.get("slope_deg") is not None:
            return {"slope_deg": t["slope_deg"], "elevation_amsl": t["elevation_amsl"]}
        time.sleep(2)
    return None


def key(s):
    return f"{s['kind']}|{s['latitude']}|{s['longitude']}|{s['date'].isoformat()}"


def main():
    events = load_catalog()
    samples = build_samples(events)
    print(f"{len(events)} India catalogue events; {len(samples)} samples "
          f"({sum(s['label'] for s in samples)} landslides)")

    done = {}
    if os.path.exists(PROGRESS):
        with open(PROGRESS, encoding="utf-8") as f:
            for line in f:
                row = json.loads(line)
                done[row["key"]] = row

    def fetch(s):
        row = {"key": key(s), "ok": False}
        try:
            w = era5_features(s["latitude"], s["longitude"], s["date"])
            t = terrain(s["latitude"], s["longitude"]) if w else None
            if w and t:
                row.update(ok=True, **w, **t)
        except Exception as e:
            row["error"] = str(e)[:200]
        time.sleep(0.5)  # 4 workers stay well under Open-Meteo's 600 calls/minute
        return row

    todo = [s for s in samples if key(s) not in done]
    print(f"{len(todo)} samples left to fetch", flush=True)
    with open(PROGRESS, "a", encoding="utf-8") as out, ThreadPoolExecutor(max_workers=4) as pool:
        for i, row in enumerate(pool.map(fetch, todo)):
            out.write(json.dumps(row) + "\n")
            out.flush()
            done[row["key"]] = row
            if i % 50 == 0:
                print(f"{i}/{len(todo)}", flush=True)

    cols = ["kind", "event_id", "date", "latitude", "longitude", "rainfall_24h", "rainfall_72h",
            "soil_moisture", "slope_deg", "elevation_amsl", "historical_incidents", "landslide_occurrence"]
    kept = 0
    with open(DATASET_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for s in samples:
            r = done.get(key(s))
            if not r or not r["ok"]:
                continue
            w.writerow([s["kind"], s["event_id"], s["date"].isoformat(), s["latitude"], s["longitude"],
                        r["rainfall_24h"], r["rainfall_72h"], r["soil_moisture"], r["slope_deg"],
                        r["elevation_amsl"], history_count(events, s["latitude"], s["longitude"], s["date"]),
                        s["label"]])
            kept += 1
    print(f"Wrote {kept} samples to {DATASET_OUT}")


if __name__ == "__main__":
    main()
