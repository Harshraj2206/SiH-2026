"""
Landslide events and risk for the Incidents page.

Everything here comes from a real source:
- Past events: a short list of major Indian landslides, with figures taken from the cited reports.
- Live events: NASA EONET (open landslide/flood events inside India).
- Risk now: the monitored zones, scored by the LandSafe model from live rain, soil moisture and terrain.
- History: the NASA Global Landslide Catalog (India, 2007-2016).
"""

import math
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests

# Major past landslides. Only figures stated in the linked source are filled in; anything the
# source does not give is left as None. Times are UTC (IST = UTC + 5:30).
PAST_EVENTS: List[Dict[str, Any]] = [
    {
        "incident_id": "IN-2024-WAYANAD",
        "title": "Mundakkai - Chooralmala landslides",
        "district": "Wayanad",
        "state": "Kerala",
        "latitude": 11.4646,
        "longitude": 76.1348,
        "timestamp": "2024-07-29T20:30:00Z",
        "severity": "CRITICAL",
        "description": "Rain-triggered debris flows struck Mundakkai, Chooralmala and Punchirimattom "
                       "in the early hours of 30 July 2024, between about 1 AM and 4:30 AM.",
        "deaths": 251,
        "missing_people": 47,
        "source": "International Consortium on Landslides - landslide record",
        "source_url": "https://www.landslides.org/report/mundakkai-landslide-wayanad/",
        "trigger": "Rainfall",
    },
    {
        "incident_id": "IN-2023-SHIMLA",
        "title": "Summer Hill (Shiv Bawadi) landslide",
        "district": "Shimla",
        "state": "Himachal Pradesh",
        "latitude": 31.1040,
        "longitude": 77.1430,
        "timestamp": "2023-08-14T01:45:00Z",
        "severity": "CRITICAL",
        "description": "A landslide after heavy rain buried the Shiv temple at Summer Hill on the morning "
                       "of 14 August 2023 while devotees were inside.",
        "deaths": 20,
        "missing_people": None,
        "source": "The Tribune",
        "source_url": "https://www.tribuneindia.com/news/himachal/homage-paid-to-victims-of-summer-hill-tragedy",
        "trigger": "Rainfall",
    },
    {
        "incident_id": "IN-2023-IRSHALWADI",
        "title": "Irshalwadi landslide",
        "district": "Raigad",
        "state": "Maharashtra",
        "latitude": 18.9339,
        "longitude": 73.2358,
        "timestamp": "2023-07-19T17:00:00Z",
        "severity": "CRITICAL",
        "description": "A landslide during heavy rain buried much of the hamlet of Irshalwadi on the slopes "
                       "of Irshalgad hill at about 10:30 PM on 19 July 2023.",
        "deaths": 27,
        "missing_people": 57,
        "source": "Deccan Herald (PTI)",
        "source_url": "https://www.deccanherald.com/india/maharashtra/raigad-tragedy-ndrf-calls-off-operation-says-minister-no-body-found-on-sunday-toll-stays-at-27-1239894.html",
        "trigger": "Rainfall",
    },
    {
        "incident_id": "IN-2023-JOSHIMATH",
        "title": "Joshimath land subsidence",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "latitude": 30.5550,
        "longitude": 79.5650,
        "timestamp": "2023-01-02T00:00:00Z",
        "severity": "HIGH",
        "description": "From 2-3 January 2023 cracks spread through homes and roads as the town sank. "
                       "A district bulletin of 21 January listed 863 buildings with visible cracks and 181 as unsafe.",
        "deaths": None,
        "missing_people": None,
        "source": "People's Archive of Rural India",
        "source_url": "https://ruralindiaonline.org/article/in-joshimath-sinking-town-sinking-hopes",
        "trigger": "Subsidence (not rain-triggered)",
    },
    {
        "incident_id": "IN-2023-SIKKIM-GLOF",
        "title": "South Lhonak glacial lake outburst flood",
        "district": "Mangan",
        "state": "Sikkim",
        "latitude": 27.6000,
        "longitude": 88.6450,
        "timestamp": "2023-10-03T18:30:00Z",
        "severity": "CRITICAL",
        "description": "On the night of 3-4 October 2023 South Lhonak lake burst, most likely after a landslide "
                       "fell into it. The flood swept down the Teesta valley and destroyed the Chungthang dam.",
        "deaths": 40,
        "missing_people": None,
        "source": "Eos (American Geophysical Union)",
        "source_url": "https://eos.org/thelandslideblog/sikkim-flood-1",
        "trigger": "Glacial lake outburst (flood)",
    },
]

# Rough India bounding box used only to pre-filter NASA EONET events (exact check is coverage.in_india).
_INDIA_BBOX = (6.0, 37.6, 68.0, 97.5)

_CACHE: Dict[str, Any] = {"data": None, "at": 0.0, "ttl": 600.0}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def compute_freshness_label(timestamp_str: Optional[str]) -> Optional[str]:
    """'Updated 4 min ago' style label for live data (not used for past events)."""
    try:
        dt = datetime.fromisoformat(str(timestamp_str).replace("Z", "+00:00"))
    except ValueError:
        return None
    diff = (datetime.now(timezone.utc) - dt).total_seconds()
    if diff < 60:
        return "Updated just now"
    if diff < 3600:
        return f"Updated {int(diff // 60)} min ago"
    if diff < 86400:
        hours = int(diff // 3600)
        return f"Updated {hours} hour{'s' if hours != 1 else ''} ago"
    days = int(diff // 86400)
    return f"Updated {days} day{'s' if days != 1 else ''} ago"


def _past_event_record(e: Dict[str, Any]) -> Dict[str, Any]:
    parts = []
    if e.get("deaths") is not None:
        parts.append(f"{e['deaths']} deaths")
    if e.get("missing_people") is not None:
        parts.append(f"{e['missing_people']} missing")
    return {
        **e,
        "status": "PAST_EVENT",
        "category": "CONFIRMED_INCIDENT",
        "verification_status": "REPORTED",
        "source_type": "PUBLISHED_REPORT",
        "source_priority_level": 1,
        "updated_at": e["timestamp"],
        "casualties_info": ", ".join(parts) if parts else None,
        "reported_causes": [e["trigger"]] if e.get("trigger") else [],
        "contributing_factors": [],
        "why_at_risk": None,
        "injured_people": None,
        "evacuated_people": None,
        "estimated_population": None,
        "blocked_roads": [],
        "is_simulation": False,
        "all_sources": [{"source": e["source"], "source_url": e["source_url"]}],
    }


class LandslideIntelligencePipeline:
    def __init__(self):
        self.eonet_status = "NOT_CHECKED"

    def fetch_eonet_events(self) -> List[Dict[str, Any]]:
        """Open NASA EONET landslide/flood events located in India."""
        from backend.app.services.coverage import in_india
        events_out = []
        try:
            resp = requests.get(
                "https://eonet.gsfc.nasa.gov/api/v3/events?category=landslides,floods&status=open&limit=50",
                timeout=4,
            )
            resp.raise_for_status()
            self.eonet_status = "OK"
            for ev in resp.json().get("events", []):
                geoms = ev.get("geometry") or []
                if not geoms or len(geoms[-1].get("coordinates", [])) < 2:
                    continue
                lon, lat = geoms[-1]["coordinates"][:2]
                lo_lat, hi_lat, lo_lon, hi_lon = _INDIA_BBOX
                if not (lo_lat <= lat <= hi_lat and lo_lon <= lon <= hi_lon) or not in_india(lat, lon):
                    continue
                src = (ev.get("sources") or [{}])[0]
                events_out.append({
                    "incident_id": f"EONET-{ev.get('id')}",
                    "title": ev.get("title") or "Event reported by NASA EONET",
                    "district": "",
                    "state": "",
                    "latitude": lat,
                    "longitude": lon,
                    "timestamp": geoms[-1].get("date") or datetime.now(timezone.utc).isoformat(),
                    "severity": "UNKNOWN",
                    "status": "OPEN",
                    "category": "CONFIRMED_INCIDENT",
                    "verification_status": "REPORTED",
                    "source": "NASA EONET",
                    "source_type": "NASA_EONET",
                    "source_priority_level": 2,
                    "source_url": src.get("url") or "https://eonet.gsfc.nasa.gov",
                    "description": ev.get("title") or "",
                    "updated_at": geoms[-1].get("date") or "",
                    "casualties_info": None,
                    "reported_causes": [c.get("title") for c in ev.get("categories", []) if c.get("title")],
                    "contributing_factors": [],
                    "why_at_risk": None,
                    "deaths": None,
                    "injured_people": None,
                    "missing_people": None,
                    "evacuated_people": None,
                    "estimated_population": None,
                    "blocked_roads": [],
                    "is_simulation": False,
                    "all_sources": [{"source": "NASA EONET", "source_url": src.get("url")}],
                })
        except Exception:
            self.eonet_status = "UNAVAILABLE"
        return events_out

    def zone_risks(self) -> List[Dict[str, Any]]:
        """Monitored zones with a live (or last known) model score, highest first."""
        from backend.app.database.store import db_store
        out = []
        for z in db_store.get_scored_zones():
            out.append({
                "forecast_id": z["zone_id"],
                "title": z["name"],
                "location_name": z["name"],
                "district": z.get("district") or "",
                "state": z.get("state") or "",
                "latitude": z["center"]["lat"],
                "longitude": z["center"]["lng"],
                "risk_level": z["risk_level"],
                "risk_score": z["risk_score"],
                "scientific_reason": (z.get("xai") or {}).get("summary") or "",
                "forecast_window_hours": 24,
                "rainfall_trigger_mm": z.get("rainfall_24h"),
                "slope_gradient_deg": z.get("slope_deg"),
                "primary_source": "LandSafe model (Open-Meteo rain and soil moisture, Copernicus DEM, NASA landslide catalog)",
                "source_url": None,
                "source_type": "LANDSAFE_MODEL",
                "verification_status": "MODEL_SCORE",
                "category": "FORECAST_RISK",
                "reported_causes": [],
                "contributing_factors": [f["name"] + ": " + f["value"] for f in (z.get("xai") or {}).get("factors", [])],
                "why_at_risk": (z.get("xai") or {}).get("summary") or "",
                "timestamp": z.get("last_updated") or "",
                "freshness_label": compute_freshness_label(z.get("last_updated")),
                "radius_km": 5.0,
            })
        out.sort(key=lambda f: f["risk_score"], reverse=True)
        return out

    def get_unified_intelligence(self, force_refresh: bool = False) -> Dict[str, Any]:
        now = time.time()
        if not force_refresh and _CACHE["data"] is not None and now - _CACHE["at"] < _CACHE["ttl"]:
            # zone scores change with every refresh; past events and EONET are cached
            data = dict(_CACHE["data"])
            data["forecast_risks"] = self.zone_risks()
            return data

        from backend.app.services.landslide_catalog import get_historical_landslides

        confirmed = [_past_event_record(e) for e in PAST_EVENTS] + self.fetch_eonet_events()
        confirmed.sort(key=lambda e: e["timestamp"], reverse=True)
        forecasts = self.zone_risks()
        history = [{**h, "category": "HISTORICAL_INCIDENT"} for h in get_historical_landslides()]

        states = {}
        for kind, items in (("confirmed", confirmed), ("forecast", forecasts)):
            for item in items:
                st = item.get("state") or "Other"
                states.setdefault(st, {"confirmed": 0, "forecast": 0, "critical": 0})
                states[st][kind] += 1
                if item.get("severity") == "CRITICAL" or item.get("risk_level") == "CRITICAL":
                    states[st]["critical"] += 1

        payload = {
            "confirmed_incidents": confirmed,
            "forecast_risks": forecasts,
            "historical_incidents": history,
            "demo_simulations": [],
            "monitored_authorities": [
                {"code": "EONET", "name": "NASA EONET", "type": "Open natural events", "status": self.eonet_status,
                 "portal_url": "https://eonet.gsfc.nasa.gov"},
                {"code": "GLC", "name": "NASA Global Landslide Catalog", "type": "Past landslides (India, 2007-2016)",
                 "status": "OK", "portal_url": "https://catalog.data.gov/dataset/global-landslide-catalog-export"},
                {"code": "OPEN-METEO", "name": "Open-Meteo", "type": "Rain, soil moisture, elevation",
                 "status": "OK", "portal_url": "https://open-meteo.com"},
            ],
            "last_synced": datetime.now(timezone.utc).isoformat(),
            "sync_status": "OK" if self.eonet_status == "OK" else "PARTIAL",
            "coverage_summary": {
                "monitored_states_count": len({f["state"] for f in forecasts if f["state"]}),
                "states_breakdown": states,
                "total_confirmed_incidents": len(confirmed),
                "total_forecast_zones": len(forecasts),
                "total_historical_records": len(history),
                "total_demo_scenarios": 0,
            },
        }
        _CACHE["data"] = payload
        _CACHE["at"] = now
        return payload

    def calculate_user_proximity_advisory(self, user_lat: float, user_lon: float) -> Dict[str, Any]:
        """Nearest monitored zone at high or critical risk, if any is within 50 km."""
        forecasts = self.zone_risks()
        nearest, nearest_km = None, None
        for f in forecasts:
            if f["risk_level"] not in ("HIGH", "CRITICAL"):
                continue
            d = haversine_distance_km(user_lat, user_lon, f["latitude"], f["longitude"])
            if nearest_km is None or d < nearest_km:
                nearest, nearest_km = f, d
        if nearest is not None and nearest_km <= 50.0:
            return {
                "advisory_type": "WARNING",
                "advisory_text": f"{nearest['location_name']} ({nearest['state']}), {int(nearest_km)} km away, "
                                 f"is at {nearest['risk_level'].lower()} risk right now.",
                "user_coordinates": {"latitude": user_lat, "longitude": user_lon},
                "nearest_hazard": nearest,
                "nearest_distance_km": nearest_km,
                "assessed_at": datetime.now(timezone.utc).isoformat(),
            }
        return {
            "advisory_type": "SAFE",
            "advisory_text": "No monitored zone within 50 km of you is at high risk right now.",
            "user_coordinates": {"latitude": user_lat, "longitude": user_lon},
            "nearest_hazard": None,
            "nearest_distance_km": None,
            "assessed_at": datetime.now(timezone.utc).isoformat(),
        }


landslide_intelligence_pipeline = LandslideIntelligencePipeline()
