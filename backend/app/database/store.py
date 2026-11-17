"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Thread-Safe In-Memory Operational State Store
Covers complete disaster lifecycle:
PREDICT -> PREPARE -> DETECT -> CONNECT -> PRIORITIZE -> RESCUE -> EVACUATE -> TREAT/SHELTER -> LEARN
"""

import copy
import functools
import logging
import math
import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from backend.app.ml.predictor import predict_landslide_risk, categorize_risk_level, get_recommended_action
from backend.app.database.persistence import RecordStore

logger = logging.getLogger("landslideguard")

# Collections that change at runtime and must survive restarts.
PERSISTED_COLLECTIONS = ("reports", "incidents", "sos_requests", "rescue_teams", "roads", "subscriptions")

# Sample records seeded by earlier versions. They were made up, so they are removed from saved
# state on load; anything people actually submitted is kept.
_OLD_SEED_IDS = {
    "reports": {"rep-001", "rep-002", "rep-003", "rep-004"},
    "roads": {"road-nh6-sec1", "road-nh6-nongpoh", "road-nh6-umsning", "road-nh6-umiam", "road-shl-ascent",
              "road-mawhati-bypass", "road-bhoirymbong-link", "road-neigrihms-bypass", "road-nh10-teesta",
              "road-nh10-ranipool", "road-nh29-paglapahar"},
    "incidents": {"LS-2026-NE-0042", "LS-2026-NE-0043", "LS-2026-NE-0044"},
    "sos_requests": {"SOS-2026-00981", "SOS-2026-00982"},
    "rescue_teams": {"team-ndrf-01", "team-sdrf-01", "team-police-01", "team-medical-01", "team-volunteers-01"},
}

# Live zone values kept across restarts, so a restart shows the last real readings, not nothing.
_ZONE_LIVE_FIELDS = (
    "rainfall_24h", "rainfall_72h", "slope_deg", "soil_moisture", "ndvi", "historical_incidents",
    "elevation_amsl", "temperature_c", "humidity_pct", "weather_code", "condition", "is_day",
    "cloud_cover_pct", "snowfall_cm", "rainfall_1h", "weather_source", "weather_status",
    "weather_observation_time", "ml_base_score", "forecast_trend", "xai", "recommended_action",
    "model_confidence", "tree_variance", "data_quality", "precision_context", "inference_status",
    "provenance", "last_updated",
)


def persists(method):
    """Save runtime state after a mutating StateStore method returns."""
    @functools.wraps(method)
    def wrapper(self, *args, **kwargs):
        result = method(self, *args, **kwargs)
        self._persist()
        return result
    return wrapper


class StateStore:
    def __init__(self):
        self.lock = threading.RLock()
        self.users: Dict[str, Dict[str, Any]] = {}
        self.zones: Dict[str, Dict[str, Any]] = {}
        self.reports: Dict[str, Dict[str, Any]] = {}
        self.alerts: Dict[str, Dict[str, Any]] = {}
        self.incidents: Dict[str, Dict[str, Any]] = {}
        self.sos_requests: Dict[str, Dict[str, Any]] = {}
        self.rescue_teams: Dict[str, Dict[str, Any]] = {}
        self.roads: Dict[str, Dict[str, Any]] = {}
        self.hospitals: Dict[str, Dict[str, Any]] = {}
        self.shelters: Dict[str, Dict[str, Any]] = {}
        self.post_disaster_events: Dict[str, Dict[str, Any]] = {}
        self.subscriptions: Dict[str, Dict[str, Any]] = {}
        self.poll_data: Dict[str, Any] = {
            "id": "poll-landslide-signs-today",
            "question": "Have you noticed any signs of active landslide or ground movement near your district today?",
            "description": "Answer once a day for the area around you.",
            "votes": {
                "yes": 0,
                "no": 0,
                "unsure": 0
            }
        }
        self.poll_voters: Dict[str, str] = {}  # user_id -> date (YYYY-MM-DD) of last vote
        self.simulation_step: int = 1
        self._init_data()
        self._records = RecordStore()
        self._load_or_seed()

    # ---------------- Persistence ----------------
    def _persist(self):
        """Write runtime collections to durable storage. Failures are logged, never raised,
        so a storage problem cannot break a live request (data stays in memory)."""
        with self.lock:
            try:
                for name in PERSISTED_COLLECTIONS:
                    self._records.replace(name, getattr(self, name))
                self._records.replace("meta", {
                    "poll_data": self.poll_data,
                    "poll_voters": self.poll_voters,
                    "simulation_step": self.simulation_step,
                })
                self._records.replace("zones_live", {
                    zid: {k: z.get(k) for k in _ZONE_LIVE_FIELDS}
                    for zid, z in self.zones.items() if z.get("ml_base_score") is not None
                })
            except Exception as e:
                logger.error("State persistence failed: %s", e)

    def _load_or_seed(self):
        """Load saved state if any exists; otherwise save the seeded demo state."""
        with self.lock:
            if self._records.is_empty():
                self._persist()
                return
            for name in PERSISTED_COLLECTIONS:
                loaded = self._records.load(name)
                seeds = _OLD_SEED_IDS.get(name, set())
                setattr(self, name, {k: v for k, v in loaded.items()
                                     if k not in seeds and not (isinstance(v, dict) and v.get("is_demo"))})
            if not self.subscriptions.get("sub-default"):
                self._init_default_subscription()
            for zid, live in (self._records.load("zones_live") or {}).items():
                if zid in self.zones and live.get("ml_base_score") is not None:
                    self.zones[zid].update(live)
                    self.zones[zid]["inference_status"] = "STALE_LAST_KNOWN"
            meta = self._records.load("meta")
            self.poll_data = meta.get("poll_data", self.poll_data)
            self.poll_voters = meta.get("poll_voters", self.poll_voters)
            self.simulation_step = meta.get("simulation_step", self.simulation_step)
            self._recalculate_all_fusion_internal()
            self._regenerate_alerts_internal()
        self._persist()  # write back without the removed sample records

    def _init_default_subscription(self):
        self.subscriptions["sub-default"] = {
            "subscription_id": "sub-default",
            "user_id": None,
            "selected_districts": [],
            "risk_threshold": "HIGH",
            "channels": ["IN_APP"],
            "preferred_language": "en",
            "status": "ACTIVE"
        }

    def _init_data(self):
        # 1. User Accounts (RBAC Metadata)
        self.users = {}

        # 2. Risk Zones with Polygon Boundaries & Forecast Trends (Himachal Pradesh)
        raw_zones = [
            {
                "zone_id": "HP-01",
                "name": "Kullu - Aut Tunnel Sector (NH-3)",
                "state": "Himachal Pradesh",
                "district": "Kullu",
                "rainfall_24h": 85.2,
                "rainfall_72h": 165.0,
                "slope_deg": 34.0,
                "soil_moisture": 0.42,
                "ndvi": 0.38,
                "land_cover": "Steep Beas River Gorge & Highway Escarpment",
                "historical_incidents": 6,
                "center": {"lat": 31.9579, "lng": 77.1095},
                "coordinates": [
                    {"lat": 32.0500, "lng": 77.0200},
                    {"lat": 32.0500, "lng": 77.2000},
                    {"lat": 31.8500, "lng": 77.2000},
                    {"lat": 31.8500, "lng": 77.0200}
                ]
            },
            {
                "zone_id": "HP-02",
                "name": "Manali - Solang Valley Pass",
                "state": "Himachal Pradesh",
                "district": "Kullu",
                "rainfall_24h": 112.5,
                "rainfall_72h": 220.0,
                "slope_deg": 38.5,
                "soil_moisture": 0.58,
                "ndvi": 0.45,
                "land_cover": "Alpine Moraine & Active Scree Slopes",
                "historical_incidents": 8,
                "center": {"lat": 32.2432, "lng": 77.1892},
                "coordinates": [
                    {"lat": 32.3200, "lng": 77.1000},
                    {"lat": 32.3200, "lng": 77.2600},
                    {"lat": 32.1600, "lng": 77.2600},
                    {"lat": 32.1600, "lng": 77.1000}
                ]
            },
            {
                "zone_id": "HP-03",
                "name": "Shimla - Tara Devi Ridge (NH-5)",
                "state": "Himachal Pradesh",
                "district": "Shimla",
                "rainfall_24h": 45.0,
                "rainfall_72h": 90.0,
                "slope_deg": 22.0,
                "soil_moisture": 0.32,
                "ndvi": 0.62,
                "land_cover": "Pine Forest & Stepped Urban Slopes",
                "historical_incidents": 2,
                "center": {"lat": 31.1048, "lng": 77.1734},
                "coordinates": [
                    {"lat": 31.1800, "lng": 77.1000},
                    {"lat": 31.1800, "lng": 77.2500},
                    {"lat": 31.0200, "lng": 77.2500},
                    {"lat": 31.0200, "lng": 77.1000}
                ]
            },
            {
                "zone_id": "HP-04",
                "name": "Dharamshala - McLeod Ganj Escarpment",
                "state": "Himachal Pradesh",
                "district": "Kangra",
                "rainfall_24h": 128.0,
                "rainfall_72h": 255.0,
                "slope_deg": 41.0,
                "soil_moisture": 0.62,
                "ndvi": 0.31,
                "land_cover": "Steep Dhauladhar Foothill & Fault Zone",
                "historical_incidents": 11,
                "center": {"lat": 32.2190, "lng": 76.3234},
                "coordinates": [
                    {"lat": 32.3000, "lng": 76.2400},
                    {"lat": 32.3000, "lng": 76.4000},
                    {"lat": 32.1400, "lng": 76.4000},
                    {"lat": 32.1400, "lng": 76.2400}
                ]
            },
            {
                "zone_id": "HP-05",
                "name": "Mandi - Pandoh Dam Corridor",
                "state": "Himachal Pradesh",
                "district": "Mandi",
                "rainfall_24h": 65.0,
                "rainfall_72h": 120.0,
                "slope_deg": 24.5,
                "soil_moisture": 0.38,
                "ndvi": 0.58,
                "land_cover": "Reservoir Embankment & Mixed Scrub Slope",
                "historical_incidents": 4,
                "center": {"lat": 31.5892, "lng": 76.9182},
                "coordinates": [
                    {"lat": 31.6800, "lng": 76.8200},
                    {"lat": 31.6800, "lng": 77.0000},
                    {"lat": 31.5000, "lng": 77.0000},
                    {"lat": 31.5000, "lng": 76.8200}
                ]
            },
            {
                "zone_id": "HP-06",
                "name": "Kinnaur - Nigulsari Sliding Zone (NH-5)",
                "state": "Himachal Pradesh",
                "district": "Kinnaur",
                "rainfall_24h": 95.0,
                "rainfall_72h": 180.0,
                "slope_deg": 37.0,
                "soil_moisture": 0.55,
                "ndvi": 0.36,
                "land_cover": "Fractured Gneiss Cliff & Satluj Gorge",
                "historical_incidents": 9,
                "center": {"lat": 31.5376, "lng": 78.2562},
                "coordinates": [
                    {"lat": 31.6200, "lng": 78.1600},
                    {"lat": 31.6200, "lng": 78.3400},
                    {"lat": 31.4500, "lng": 78.3400},
                    {"lat": 31.4500, "lng": 78.1600}
                ]
            },
            {
                "zone_id": "HP-07",
                "name": "Solan - Kumarhatti Hill Cut",
                "state": "Himachal Pradesh",
                "district": "Solan",
                "rainfall_24h": 38.0,
                "rainfall_72h": 70.0,
                "slope_deg": 18.0,
                "soil_moisture": 0.28,
                "ndvi": 0.72,
                "land_cover": "Managed Terrace Slopes & Highway Cut",
                "historical_incidents": 1,
                "center": {"lat": 30.9045, "lng": 77.0967},
                "coordinates": [
                    {"lat": 30.9800, "lng": 77.0200},
                    {"lat": 30.9800, "lng": 77.1800},
                    {"lat": 30.8200, "lng": 77.1800},
                    {"lat": 30.8200, "lng": 77.0200}
                ]
            },
            {
                "zone_id": "HP-08",
                "name": "Bilaspur - Swarghat Slope (NH-205)",
                "state": "Himachal Pradesh",
                "district": "Bilaspur",
                "rainfall_24h": 32.0,
                "rainfall_72h": 60.0,
                "slope_deg": 14.0,
                "soil_moisture": 0.26,
                "ndvi": 0.74,
                "land_cover": "Lowland Scrub & Stable Valley Floor",
                "historical_incidents": 0,
                "center": {"lat": 31.3260, "lng": 76.7600},
                "coordinates": [
                    {"lat": 31.4000, "lng": 76.6800},
                    {"lat": 31.4000, "lng": 76.8400},
                    {"lat": 31.2500, "lng": 76.8400},
                    {"lat": 31.2500, "lng": 76.6800}
                ]
            },
            {
                "zone_id": "HP-09",
                "name": "Chamba - Ravi Gorge Valley",
                "state": "Himachal Pradesh",
                "district": "Chamba",
                "rainfall_24h": 78.0,
                "rainfall_72h": 145.0,
                "slope_deg": 32.0,
                "soil_moisture": 0.44,
                "ndvi": 0.48,
                "land_cover": "Steep River Canyons & Debris Scree",
                "historical_incidents": 5,
                "center": {"lat": 32.5534, "lng": 76.1258},
                "coordinates": [
                    {"lat": 32.6400, "lng": 76.0400},
                    {"lat": 32.6400, "lng": 76.2200},
                    {"lat": 32.4600, "lng": 76.2200},
                    {"lat": 32.4600, "lng": 76.0400}
                ]
            },
            {
                "zone_id": "HP-10",
                "name": "Kangra - Nurpur Foothills",
                "state": "Himachal Pradesh",
                "district": "Kangra",
                "rainfall_24h": 28.0,
                "rainfall_72h": 50.0,
                "slope_deg": 14.0,
                "soil_moisture": 0.22,
                "ndvi": 0.78,
                "land_cover": "Broad Valley Agricultural Plains",
                "historical_incidents": 0,
                "center": {"lat": 32.0998, "lng": 76.2691},
                "coordinates": [
                    {"lat": 32.1800, "lng": 76.1800},
                    {"lat": 32.1800, "lng": 76.3500},
                    {"lat": 32.0200, "lng": 76.3500},
                    {"lat": 32.0200, "lng": 76.1800}
                ]
            },
            {
                "zone_id": "HP-11",
                "name": "Sirmaur - Paonta Valley Sector",
                "state": "Himachal Pradesh",
                "district": "Sirmaur",
                "rainfall_24h": 35.0,
                "rainfall_72h": 65.0,
                "slope_deg": 16.0,
                "soil_moisture": 0.28,
                "ndvi": 0.70,
                "land_cover": "Foothill Forest & River Basin",
                "historical_incidents": 1,
                "center": {"lat": 30.5500, "lng": 77.3000},
                "coordinates": [
                    {"lat": 30.6400, "lng": 77.2200},
                    {"lat": 30.6400, "lng": 77.3800},
                    {"lat": 30.4600, "lng": 77.3800},
                    {"lat": 30.4600, "lng": 77.2200}
                ]
            },
            {
                "zone_id": "HP-12",
                "name": "Lahaul - Sissu Glacier Basin",
                "state": "Himachal Pradesh",
                "district": "Lahaul and Spiti",
                "rainfall_24h": 60.0,
                "rainfall_72h": 110.0,
                "slope_deg": 28.0,
                "soil_moisture": 0.35,
                "ndvi": 0.52,
                "land_cover": "High-Altitude Glacial Moraine & Valley Floor",
                "historical_incidents": 3,
                "center": {"lat": 32.4800, "lng": 77.1200},
                "coordinates": [
                    {"lat": 32.5600, "lng": 77.0400},
                    {"lat": 32.5600, "lng": 77.2000},
                    {"lat": 32.4000, "lng": 77.2000},
                    {"lat": 32.4000, "lng": 77.0400}
                ]
            }
        ]

        # North-East zones referenced by the road network and community reports.
        # Seed values only (DEMO_SEED) until live refresh replaces them.
        ner_seed = [
            # zone_id, name, state, district, lat, lng, rain24, rain72, slope, soil, ndvi, incidents, land_cover
            ("NER-042", "Nongpoh - Umsning Hill Cut (NH-6)", "Meghalaya", "Ri Bhoi", 25.83, 91.89, 70.0, 140.0, 32.0, 0.45, 0.55, 4, "NH-6 hill cuts"),
            ("NER-024", "Umiam - Shillong Ascent", "Meghalaya", "East Khasi Hills", 25.62, 91.90, 55.0, 110.0, 26.0, 0.40, 0.60, 2, "Hill road and urban slopes"),
            ("NER-045", "Mawhati - Bhoirymbong Valley", "Meghalaya", "Ri Bhoi", 25.82, 92.03, 40.0, 80.0, 12.0, 0.30, 0.70, 0, "Valley floor"),
            ("NER-018", "Sohra (Cherrapunji) Escarpment", "Meghalaya", "East Khasi Hills", 25.27, 91.73, 120.0, 260.0, 30.0, 0.55, 0.50, 3, "Plateau escarpment"),
            ("NER-063", "Jowai Plateau Corridor", "Meghalaya", "West Jaintia Hills", 25.45, 92.20, 45.0, 90.0, 18.0, 0.33, 0.62, 1, "Plateau highway"),
            ("NER-011", "Gangtok - Ranipool Canyon (NH-10)", "Sikkim", "East Sikkim", 27.25, 88.55, 75.0, 150.0, 35.0, 0.48, 0.50, 5, "Teesta valley ghat road"),
            ("NER-012", "Dikchu Low-Slope Route", "Sikkim", "East Sikkim", 27.38, 88.52, 50.0, 100.0, 16.0, 0.35, 0.68, 1, "River terrace road"),
            ("NER-055", "Mangan North Sikkim Corridor", "Sikkim", "Mangan", 27.51, 88.53, 80.0, 170.0, 40.0, 0.50, 0.40, 6, "High-altitude road cuts"),
            ("NER-077", "Kohima - Paglapahar Sinking Zone (NH-29)", "Nagaland", "Kohima", 25.72, 93.99, 65.0, 130.0, 33.0, 0.46, 0.52, 4, "NH-29 ghat section"),
            ("NER-078", "Pfutsero - Dzukou Valley Link", "Nagaland", "Kohima", 25.62, 94.19, 40.0, 85.0, 15.0, 0.30, 0.72, 0, "Valley state road"),
            ("NER-033", "Aizawl Ridge", "Mizoram", "Aizawl", 23.73, 92.72, 60.0, 120.0, 30.0, 0.44, 0.55, 3, "Ridge-top town slopes"),
            ("NER-034", "Lengpui Valley", "Mizoram", "Mamit", 23.84, 92.63, 45.0, 90.0, 18.0, 0.34, 0.66, 1, "Valley hub"),
        ]
        for zid, name, state, district, lat, lng, r24, r72, slope, soil, ndvi, hist, cover in ner_seed:
            raw_zones.append({
                "zone_id": zid, "name": name, "state": state, "district": district,
                "rainfall_24h": r24, "rainfall_72h": r72, "slope_deg": slope,
                "soil_moisture": soil, "ndvi": ndvi, "land_cover": cover,
                "historical_incidents": hist,
                "center": {"lat": lat, "lng": lng},
                "coordinates": [
                    {"lat": lat + 0.06, "lng": lng - 0.06},
                    {"lat": lat + 0.06, "lng": lng + 0.06},
                    {"lat": lat - 0.06, "lng": lng + 0.06},
                    {"lat": lat - 0.06, "lng": lng - 0.06}
                ]
            })

        # Hill corridors elsewhere in India (Western Ghats, Uttarakhand, J&K, Darjeeling)
        for zid, name, state, district, lat, lng in [
            ("IN-KER-01", "Meppadi - Vythiri Ghat", "Kerala", "Wayanad", 11.605, 76.082),
            ("IN-KER-02", "Munnar Gap Road (NH-85)", "Kerala", "Idukki", 9.851, 76.972),
            ("IN-UK-01", "Rishikesh - Badrinath Highway", "Uttarakhand", "Chamoli", 30.407, 79.328),
            ("IN-JK-01", "Ramban - Banihal (NH-44)", "Jammu & Kashmir", "Ramban", 33.242, 75.241),
            ("IN-KA-01", "Madikeri - Sampaje Ghat (NH-275)", "Karnataka", "Kodagu", 12.424, 75.738),
            ("IN-MH-01", "Varandha Ghat", "Maharashtra", "Raigad", 18.516, 73.181),
            ("IN-WB-01", "Kurseong - Paglajhora (NH-110)", "West Bengal", "Darjeeling", 27.036, 88.263),
        ]:
            raw_zones.append({"zone_id": zid, "name": name, "state": state, "district": district,
                              "center": {"lat": lat, "lng": lng}})

        # Zones are real places, but every measurement and score comes only from the live
        # refresh (Open-Meteo, Copernicus DEM, NASA landslide catalog). Until a zone has live
        # data it is PENDING and is not shown or used for alerts.
        _MEASURED = ("rainfall_24h", "rainfall_72h", "slope_deg", "soil_moisture", "ndvi",
                     "historical_incidents", "land_cover", "coordinates")
        self.zones = {}
        for z in raw_zones:
            base = {k: v for k, v in z.items() if k not in _MEASURED}
            self.zones[z["zone_id"]] = {
                **base,
                "rainfall_24h": None, "rainfall_72h": None, "slope_deg": None,
                "soil_moisture": None, "historical_incidents": None, "elevation_amsl": None,
                "ml_base_score": None,
                "community_boost": 0.0,
                "risk_score": None,
                "risk_level": "PENDING",
                "community_report_count": 0,
                "verified_report_count": 0,
                "last_updated": None,
                "recommended_action": None,
                "xai": {},
                "forecast_trend": [],
                "alert_status": None,
                "inference_status": "PENDING",
                "provenance": {},
            }

        # 3. Community Reports
        self.reports = {}

        # 4. Roads Database with Real-Time Obstruction Overrides
        self.roads = {}

        # 5. GDACS-Style Active Incidents Database (Pre-seeded Training Scenarios)
        self.incidents = {}

        # 6. Emergency SOS Requests Database with Triage Prioritization
        self.sos_requests = {}

        # 7. Rescue Teams Directory (Multi-Agency)
        self.rescue_teams = {}

        # 8. Hospitals Directory with Real Capacity Telemetry
        self.hospitals = {}

        # 9. Emergency Relief Shelters & Evacuation Camps
        self.shelters = {}

        # 10. Post-Disaster Analysis & Machine Learning Retrospective Records
        self.post_disaster_events = {}

        # 11. Alert Subscriptions
        self.subscriptions = {
            "sub-default": {
                "subscription_id": "sub-default",
                "user_id": None,
                "selected_districts": [],
                "risk_threshold": "HIGH",
                "channels": ["IN_APP"],
                "preferred_language": "en",
                "status": "ACTIVE"
            }
        }

        # Calculate initial fusion and alerts
        self._recalculate_all_fusion_internal()
        self._regenerate_alerts_internal()

    def _recalculate_all_fusion_internal(self):
        zone_report_counts: Dict[str, int] = {}
        zone_verified_counts: Dict[str, int] = {}

        for rep in self.reports.values():
            zid = rep.get("zone_id")
            if zid:
                zone_report_counts[zid] = zone_report_counts.get(zid, 0) + 1
                if rep.get("status") == "VERIFIED":
                    zone_verified_counts[zid] = zone_verified_counts.get(zid, 0) + 1

        for zid, z in self.zones.items():
            tot_count = zone_report_counts.get(zid, 0)
            ver_count = zone_verified_counts.get(zid, 0)

            # AI + Community Fusion logic
            if ver_count >= 3:
                boost = 15.0
            elif ver_count > 0:
                boost = ver_count * 5.0
            else:
                boost = 0.0

            z["community_report_count"] = tot_count
            z["verified_report_count"] = ver_count
            z["community_boost"] = boost
            if z.get("ml_base_score") is None:  # no live data yet
                continue
            final_score = round(min(100.0, z["ml_base_score"] + boost), 1)
            level = categorize_risk_level(final_score)
            z["risk_score"] = final_score
            z["risk_level"] = level
            if boost > 0:
                z["recommended_action"] = get_recommended_action(level, "rainfall and verified ground reports")

    def _regenerate_alerts_internal(self):
        """Alerts come only from zones scored with live data, using their real values."""
        self.alerts = {}
        alert_idx = 1
        for zid, z in self.zones.items():
            score = z.get("risk_score")
            if score is None:
                continue
            rain = z.get("rainfall_24h")
            slope = z.get("slope_deg")
            soil = z.get("soil_moisture")
            verified = z.get("verified_report_count", 0)
            facts = []
            if rain is not None:
                facts.append(f"{rain:g} mm rain in 24 h")
            if slope is not None:
                facts.append(f"slope {slope:g}°")
            if soil is not None:
                facts.append(f"soil moisture {round(soil * 100)}%")
            if verified:
                facts.append(f"{verified} verified ground report{'s' if verified != 1 else ''}")
            reason = ", ".join(facts).capitalize() + "." if facts else ""

            if score >= 80.0:
                category, title = "CRITICAL", f"Critical landslide risk: {z['name']}"
                action = "Avoid travel through this area and follow local authority instructions."
            elif score >= 60.0:
                category, title = "HIGH", f"High landslide risk: {z['name']}"
                action = "Avoid travel at night and watch for falling debris and cracks."
            elif score >= 35.0 and verified > 0:
                category, title = "MODERATE", f"Ground movement reported: {z['name']}"
                action = "Drive carefully and watch for loose debris on sharp turns."
            else:
                continue
            aid = f"ALT-{alert_idx:03d}"
            self.alerts[aid] = {
                "id": aid,
                "zone_id": zid,
                "zone_name": z["name"],
                "category": category,
                "risk_score": score,
                "title": title,
                "reason": reason,
                "recommended_action": action,
                "timestamp": z.get("last_updated"),
                "status": "ACTIVE",
                "affected_highway": z["name"]
            }
            alert_idx += 1

    # ---------------- SOS Triage Scoring Engine ----------------
    def calculate_sos_priority(self, people: int, severity: str, is_trapped: bool, zone_risk: Optional[float]) -> tuple[float, str]:
        """
        Computes dynamic SOS Priority Score (0-100) and Triage Classification:
        CRITICAL | URGENT | EVACUATION | SAFE
        """
        score = 20.0
        
        # Severity weights
        sev_weights = {"NONE": 0, "MINOR": 15, "MODERATE": 30, "SEVERE": 50, "CRITICAL": 60}
        score += sev_weights.get(severity.upper(), 20)

        # Trapped status bonus
        if is_trapped:
            score += 25.0

        # Multi-victim scale
        score += min(15.0, (people - 1) * 3.5)

        # Environmental risk multiplier
        if zone_risk is not None:
            score += (zone_risk / 100.0) * 15.0

        final_score = round(min(100.0, score), 1)

        if final_score >= 80.0 or is_trapped or severity.upper() in ["CRITICAL", "SEVERE"]:
            category = "CRITICAL"
        elif final_score >= 60.0:
            category = "URGENT"
        elif final_score >= 35.0:
            category = "EVACUATION"
        else:
            category = "SAFE"

        return final_score, category

    # ---------------- Public Thread-Safe API Methods ----------------

    def get_all_zones(self) -> List[Dict[str, Any]]:
        with self.lock:
            return list(self.zones.values())

    def get_scored_zones(self) -> List[Dict[str, Any]]:
        """Zones that have real (live or last-known) data; PENDING zones are left out."""
        with self.lock:
            return [z for z in self.zones.values() if z.get("risk_score") is not None]

    def refresh_fusion_and_alerts(self):
        """Recompute community fusion and alerts after zone scores change (e.g. live refresh)."""
        with self.lock:
            self._recalculate_all_fusion_internal()
            self._regenerate_alerts_internal()

    def get_zone_by_id(self, zone_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return copy.deepcopy(self.zones.get(zone_id))

    def get_zone_risk_map(self) -> Dict[str, float]:
        with self.lock:
            return {zid: z["risk_score"] for zid, z in self.zones.items() if z.get("risk_score") is not None}

    def get_all_reports(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.lock:
            reports_list = list(self.reports.values())
            if status_filter:
                reports_list = [r for r in reports_list if r.get("status") == status_filter.upper()]
            reports_list.sort(key=lambda x: x["created_at"], reverse=True)
            return reports_list

    @persists
    def add_community_report(self, report_data: Dict[str, Any], user: dict) -> Dict[str, Any]:
        with self.lock:
            rep_id = f"rep-{uuid.uuid4().hex[:6]}"
            zone_id = report_data.get("zone_id")
            zone_name = None
            if not zone_id:
                lat, lng = report_data["latitude"], report_data["longitude"]
                best_dist = 999999.0
                for zid, z in self.zones.items():
                    clat, clng = z["center"]["lat"], z["center"]["lng"]
                    d = (lat - clat) ** 2 + (lng - clng) ** 2
                    if d < best_dist:
                        best_dist = d
                        zone_id = zid
            
            matched_zone = self.zones.get(zone_id)
            if matched_zone:
                zone_name = matched_zone["name"]

            new_rep = {
                "id": rep_id,
                "user_id": user.get("id", "usr-anonymous"),
                "user_name": user.get("full_name", user.get("username", "Local Resident")),
                "user_role": user.get("role", "RESIDENT"),
                "zone_id": zone_id,
                "zone_name": zone_name,
                "latitude": report_data["latitude"],
                "longitude": report_data["longitude"],
                "location_name": report_data.get("location_name") or (f"Near {zone_name}" if zone_name else None),
                "report_type": report_data["report_type"],
                "signs_observed": report_data.get("signs_observed", []),
                "has_activity": report_data.get("has_activity", True),
                "description": report_data["description"],
                "photo_url": report_data.get("photo_url"),
                "status": "PENDING",
                "upvotes": 1,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "verified_at": None,
                "verified_by": None,
                "reviewer_notes": None
            }

            self.reports[rep_id] = new_rep
            self._recalculate_all_fusion_internal()
            self._regenerate_alerts_internal()
            return new_rep

    # ---------------- Community Poll API ----------------
    def get_community_poll(self) -> Dict[str, Any]:
        with self.lock:
            total = sum(self.poll_data["votes"].values())
            tot = total or 1  # avoid division by zero in percentages
            return {
                "id": self.poll_data["id"],
                "question": self.poll_data["question"],
                "description": self.poll_data["description"],
                "total_votes": total,
                "options": [
                    {
                        "id": "yes",
                        "label": "Yes (Observed Rockfall / Tension Cracks)",
                        "votes": self.poll_data["votes"]["yes"],
                        "percentage": round((self.poll_data["votes"]["yes"] / tot) * 100, 1)
                    },
                    {
                        "id": "no",
                        "label": "No (Terrain Appears Stable)",
                        "votes": self.poll_data["votes"]["no"],
                        "percentage": round((self.poll_data["votes"]["no"] / tot) * 100, 1)
                    },
                    {
                        "id": "unsure",
                        "label": "Not Sure / Low Visibility",
                        "votes": self.poll_data["votes"]["unsure"],
                        "percentage": round((self.poll_data["votes"]["unsure"] / tot) * 100, 1)
                    }
                ]
            }

    @persists
    def vote_community_poll(self, option_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Returns updated poll, or None if this user already voted today."""
        with self.lock:
            today = datetime.now(timezone.utc).date().isoformat()
            if self.poll_voters.get(user_id) == today:
                return None
            opt = option_id.lower().strip()
            if opt in self.poll_data["votes"]:
                self.poll_data["votes"][opt] += 1
                self.poll_voters[user_id] = today
            return self.get_community_poll()

    @persists
    def verify_community_report(
        self,
        report_id: str,
        verification_status: str,
        reviewer_user: dict,
        reviewer_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        with self.lock:
            if report_id not in self.reports:
                raise KeyError(f"Community report with ID '{report_id}' not found.")

            rep = self.reports[report_id]
            rep["status"] = verification_status.upper()
            rep["verified_at"] = datetime.now(timezone.utc).isoformat()
            rep["verified_by"] = f"{reviewer_user.get('full_name')} ({reviewer_user.get('agency', 'Authority')})"
            rep["reviewer_notes"] = reviewer_notes or ("Field verified by disaster officer" if verification_status.upper() == "VERIFIED" else "Rejected - insufficient evidence")

            self._recalculate_all_fusion_internal()
            self._regenerate_alerts_internal()
            return rep

    # ---------------- Incidents API ----------------
    def get_all_incidents(
        self, 
        status_filter: Optional[str] = None, 
        severity_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        state_filter: Optional[str] = None,
        include_simulations: bool = True
    ) -> List[Dict[str, Any]]:
        with self.lock:
            inc_list = list(self.incidents.values())
            if not include_simulations:
                inc_list = [i for i in inc_list if not i.get("is_simulation", False)]
            if category_filter:
                inc_list = [i for i in inc_list if i.get("category", "").upper() == category_filter.upper()]
            if state_filter and state_filter.upper() != "ALL":
                inc_list = [i for i in inc_list if i.get("state", "").lower() == state_filter.lower()]
            if status_filter and status_filter.upper() != "ALL":
                inc_list = [i for i in inc_list if i.get("status") == status_filter.upper()]
            if severity_filter and severity_filter.upper() != "ALL":
                inc_list = [i for i in inc_list if i.get("severity") == severity_filter.upper()]
            inc_list.sort(key=lambda x: x["timestamp"], reverse=True)
            return inc_list

    def get_incident_by_id(self, incident_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return copy.deepcopy(self.incidents.get(incident_id))

    @persists
    def create_incident(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with self.lock:
            inc_id = f"LS-2026-NE-{uuid.uuid4().hex[:4].upper()}"
            zid = data.get("affected_zone_id")
            zname = self.zones[zid]["name"] if zid in self.zones else "North Eastern Sector"

            new_inc = {
                "incident_id": inc_id,
                "title": data["title"],
                "district": data.get("district", "Ri Bhoi"),
                "state": data.get("state", "Meghalaya"),
                "latitude": data["latitude"],
                "longitude": data["longitude"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "severity": data["severity"],
                "status": "DETECTED",
                "affected_zone_id": zid,
                "zone_name": zname,
                "estimated_population": data.get("estimated_population_at_risk", 1000),
                "blocked_roads": data.get("blocked_roads", []),
                "injured_people": data.get("injured_people", 0),
                "missing_people": data.get("missing_people", 0),
                "evacuated_people": data.get("evacuated_people", 0),
                "source": data.get("source", "FIELD_REPORT"),
                "assigned_team_id": None,
                "assigned_team_name": None,
                "description": data["description"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            self.incidents[inc_id] = new_inc
            return new_inc

    @persists
    def update_incident(self, incident_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        with self.lock:
            if incident_id not in self.incidents:
                raise KeyError(f"Incident '{incident_id}' not found.")
            inc = self.incidents[incident_id]
            for k, v in update_data.items():
                if v is not None:
                    inc[k] = v
            
            if "assigned_team_id" in update_data and update_data["assigned_team_id"]:
                tid = update_data["assigned_team_id"]
                if tid in self.rescue_teams:
                    inc["assigned_team_name"] = self.rescue_teams[tid]["name"]
                    self.rescue_teams[tid]["current_assignment_id"] = incident_id
                    self.rescue_teams[tid]["current_assignment_title"] = inc["title"]
                    self.rescue_teams[tid]["status"] = "DISPATCHED"

            inc["updated_at"] = datetime.now(timezone.utc).isoformat()
            return inc

    # ---------------- SOS Requests API ----------------
    def get_all_sos(self, triage_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.lock:
            sos_list = list(self.sos_requests.values())
            if triage_filter:
                sos_list = [s for s in sos_list if s.get("triage_priority") == triage_filter.upper()]
            sos_list.sort(key=lambda x: x["priority_score"], reverse=True)
            return sos_list

    @persists
    def add_sos_request(self, data: Dict[str, Any], user: Optional[dict] = None) -> Dict[str, Any]:
        with self.lock:
            sos_id = f"SOS-2026-{uuid.uuid4().hex[:5].upper()}"
            lat, lng = data["latitude"], data["longitude"]
            
            # Find nearest zone risk
            best_dist = 999999.0
            zone_id = None
            zone_risk = None
            for zid, z in self.zones.items():
                clat, clng = z["center"]["lat"], z["center"]["lng"]
                d = (lat - clat) ** 2 + (lng - clng) ** 2
                if d < best_dist:
                    best_dist = d
                    zone_id = zid
                    zone_risk = z.get("risk_score")

            score, triage_cat = self.calculate_sos_priority(
                people=data.get("people_count", 1),
                severity=data.get("injury_severity", "NONE"),
                is_trapped=data.get("is_trapped", False),
                zone_risk=zone_risk
            )

            # Recommend nearest hospital and shelter
            best_hosp_id, best_hosp_name = None, None
            best_hosp_dist = 999999.0
            for hid, h in self.hospitals.items():
                d = (lat - h["latitude"]) ** 2 + (lng - h["longitude"]) ** 2
                if d < best_hosp_dist:
                    best_hosp_dist = d
                    best_hosp_id = hid
                    best_hosp_name = h["name"]

            best_shelt_id, best_shelt_name = None, None
            best_shelt_dist = 999999.0
            for sid, s in self.shelters.items():
                d = (lat - s["latitude"]) ** 2 + (lng - s["longitude"]) ** 2
                if d < best_shelt_dist:
                    best_shelt_dist = d
                    best_shelt_id = sid
                    best_shelt_name = s["name"]

            # Automatically match closest available rescue team
            matched_team_id, matched_team_name = None, None
            for tid, t in self.rescue_teams.items():
                if t["status"] == "AVAILABLE":
                    matched_team_id = tid
                    matched_team_name = t["name"]
                    break

            new_sos = {
                "sos_id": sos_id,
                "user_id": user.get("id", "usr-anonymous") if user else "usr-citizen",
                "user_name": data.get("user_name") or (user.get("full_name") if user else "Citizen in Need"),
                "emergency_contact": data.get("emergency_contact") or "+91 98000-00000",
                "latitude": lat,
                "longitude": lng,
                "location_name": data.get("location_name") or f"Emergency Location near {zone_id or 'Mountain Route'}",
                "zone_id": zone_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "people_count": data.get("people_count", 1),
                "injury_severity": data.get("injury_severity", "NONE"),
                "is_trapped": data.get("is_trapped", False),
                "priority_score": score,
                "triage_priority": triage_cat,
                "status": "RESPONSE_REQUESTED" if not matched_team_id else "DISPATCHED",
                "message": data.get("message"),
                "photo_url": data.get("photo_url"),
                "assigned_team_id": matched_team_id,
                "assigned_team_name": matched_team_name,
                "destination_hospital_id": best_hosp_id,
                "destination_hospital_name": best_hosp_name,
                "destination_shelter_id": best_shelt_id,
                "destination_shelter_name": best_shelt_name,
                "triage_notes": f"Auto-triaged: Priority Score {score}/100. Nearest trauma: {best_hosp_name}",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            self.sos_requests[sos_id] = new_sos
            return new_sos

    @persists
    def triage_sos_request(self, sos_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        with self.lock:
            if sos_id not in self.sos_requests:
                raise KeyError(f"SOS request '{sos_id}' not found.")
            sos = self.sos_requests[sos_id]
            for k, v in update_data.items():
                if v is not None:
                    sos[k] = v

            if "assigned_team_id" in update_data and update_data["assigned_team_id"]:
                tid = update_data["assigned_team_id"]
                if tid in self.rescue_teams:
                    sos["assigned_team_name"] = self.rescue_teams[tid]["name"]
                    self.rescue_teams[tid]["current_assignment_id"] = sos_id
                    self.rescue_teams[tid]["current_assignment_title"] = f"SOS #{sos_id} Rescue"
                    self.rescue_teams[tid]["status"] = "DISPATCHED"

            sos["updated_at"] = datetime.now(timezone.utc).isoformat()
            return sos

    # ---------------- Rescue Teams API ----------------
    def get_all_rescue_teams(self) -> List[Dict[str, Any]]:
        with self.lock:
            return list(self.rescue_teams.values())

    @persists
    def update_rescue_team(self, team_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        with self.lock:
            if team_id not in self.rescue_teams:
                raise KeyError(f"Rescue team '{team_id}' not found.")
            team = self.rescue_teams[team_id]
            for k, v in update_data.items():
                if v is not None:
                    team[k] = v
            return team

    # ---------------- Roads API ----------------
    def get_all_roads(self) -> List[Dict[str, Any]]:
        with self.lock:
            return list(self.roads.values())

    @persists
    def update_road_status(self, road_id: str, status: str, reason: Optional[str] = None) -> Dict[str, Any]:
        with self.lock:
            if road_id not in self.roads:
                raise KeyError(f"Road '{road_id}' not found.")
            road = self.roads[road_id]
            road["status"] = status.upper()
            road["obstruction_reason"] = reason or f"Status marked as {status.upper()} by Traffic Command"
            road["last_updated"] = datetime.now(timezone.utc).isoformat()
            return road

    def get_road_status_map(self) -> Dict[str, Dict[str, Any]]:
        with self.lock:
            return {
                f"{r['from_junction']}_{r['to_junction']}": r
                for r in self.roads.values()
            }

    # ---------------- Hospitals & Shelters API ----------------
    def get_all_hospitals(self) -> List[Dict[str, Any]]:
        with self.lock:
            return list(self.hospitals.values())

    def get_all_shelters(self) -> List[Dict[str, Any]]:
        with self.lock:
            return list(self.shelters.values())

    # ---------------- Post-Disaster Events API ----------------
    def get_all_post_disaster_events(self) -> List[Dict[str, Any]]:
        with self.lock:
            return list(self.post_disaster_events.values())

    # ---------------- Alerts API ----------------
    def get_all_alerts(self, category_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.lock:
            alerts_list = list(self.alerts.values())
            if category_filter:
                alerts_list = [a for a in alerts_list if a.get("category") == category_filter.upper()]
            alerts_list.sort(key=lambda x: x["risk_score"], reverse=True)
            return alerts_list

    # ---------------- Subscriptions API ----------------
    def get_subscription(self, user_id: str) -> Dict[str, Any]:
        with self.lock:
            return self.subscriptions.get(f"sub-{user_id}", self.subscriptions["sub-default"])

    @persists
    def set_subscription(self, data: Dict[str, Any]) -> Dict[str, Any]:
        with self.lock:
            uid = data.get("user_id", "usr-citizen-default")
            sub_id = f"sub-{uid}"
            sub = {
                "subscription_id": sub_id,
                "user_id": uid,
                "selected_districts": data.get("selected_districts", []),
                "risk_threshold": data.get("risk_threshold", "HIGH"),
                "channels": data.get("channels", ["IN_APP"]),
                "preferred_language": data.get("preferred_language", "en"),
                "status": "ACTIVE"
            }
            self.subscriptions[sub_id] = sub
            return sub

    # ---------------- Users Auth ----------------
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            for u in self.users.values():
                if u["email"].lower() == email.lower():
                    return copy.deepcopy(u)
            return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return copy.deepcopy(self.users.get(user_id))



# Global Singleton Store Instance
db_store = StateStore()
