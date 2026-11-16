"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Thread-Safe In-Memory Operational State Store
Covers complete disaster lifecycle:
PREDICT -> PREPARE -> DETECT -> CONNECT -> PRIORITIZE -> RESCUE -> EVACUATE -> TREAT/SHELTER -> LEARN
"""

import copy
import math
import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from backend.app.ml.predictor import predict_landslide_risk, categorize_risk_level, get_recommended_action
from backend.app.ml.verifier import verify_landslide_report


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
            "description": "Daily citizen situational monitoring across Himachal Pradesh mountain sectors.",
            "votes": {
                "yes": 0,
                "no": 0,
                "unsure": 0
            }
        }
        self.poll_voters: Dict[str, str] = {}  # user_id -> date (YYYY-MM-DD) of last vote
        self.simulation_step: int = 1
        self._init_data()

    def _init_data(self):
        # 1. User Accounts (RBAC Metadata)
        self.users = {
            "usr-resident-01": {
                "id": "usr-resident-01",
                "username": "resident_nongpoh",
                "email": "resident@landslideguard.gov.in",
                "role": "RESIDENT",
                "full_name": "Tariang Lyngdoh",
                "agency": "Ri-Bhoi Community Watch",
                "created_at": "2026-08-01T10:00:00Z"
            },
            "usr-auth-01": {
                "id": "usr-auth-01",
                "username": "officer_sdma",
                "email": "officer@sdim.ner.gov.in",
                "role": "AUTHORITY",
                "full_name": "Dr. Anamika Sharma",
                "agency": "State Disaster Management Authority (SDMA - NER)",
                "created_at": "2026-08-01T09:00:00Z"
            },
            "usr-admin-01": {
                "id": "usr-admin-01",
                "username": "ndma_admin",
                "email": "admin@ndma.gov.in",
                "role": "ADMIN",
                "full_name": "Col. Rajesh Barua",
                "agency": "National Disaster Management Authority (NDMA HQ)",
                "created_at": "2026-08-01T08:00:00Z"
            }
        }

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

        self.zones = {}
        for z in raw_zones:
            z["is_demo"] = True
            pred_result = predict_landslide_risk({
                "rainfall_24h": z["rainfall_24h"],
                "rainfall_72h": z["rainfall_72h"],
                "slope_deg": z["slope_deg"],
                "soil_moisture": z["soil_moisture"],
                "ndvi": z["ndvi"],
                "historical_incidents": z["historical_incidents"]
            })

            ml_score = pred_result["risk_score"]

            # Forecast Trend for 6h, 12h, 24h
            forecast_trend = [
                {"timeframe": "Current", "hour_offset": 0, "predicted_rainfall_mm": z["rainfall_24h"], "predicted_risk_score": ml_score, "risk_level": categorize_risk_level(ml_score)},
                {"timeframe": "+6h", "hour_offset": 6, "predicted_rainfall_mm": round(z["rainfall_24h"] * 1.15, 1), "predicted_risk_score": round(min(100.0, ml_score * 1.12), 1), "risk_level": categorize_risk_level(min(100.0, ml_score * 1.12))},
                {"timeframe": "+12h", "hour_offset": 12, "predicted_rainfall_mm": round(z["rainfall_24h"] * 1.35, 1), "predicted_risk_score": round(min(100.0, ml_score * 1.25), 1), "risk_level": categorize_risk_level(min(100.0, ml_score * 1.25))},
                {"timeframe": "+24h", "hour_offset": 24, "predicted_rainfall_mm": round(z["rainfall_24h"] * 1.55, 1), "predicted_risk_score": round(min(100.0, ml_score * 1.38), 1), "risk_level": categorize_risk_level(min(100.0, ml_score * 1.38))}
            ]

            z_entry = {
                **z,
                "ml_base_score": ml_score,
                "community_boost": 0.0,
                "risk_score": ml_score,
                "risk_level": categorize_risk_level(ml_score),
                "community_report_count": 0,
                "verified_report_count": 0,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "recommended_action": pred_result["xai"]["recommended_action"],
                "xai": pred_result["xai"],
                "forecast_trend": forecast_trend,
                "alert_status": "CRITICAL WARNING" if ml_score > 80 else ("HIGH ADVISORY" if ml_score > 60 else None),
                "model_confidence": pred_result.get("model_confidence", 85.0),
                "tree_variance": pred_result.get("tree_variance", 0.05),
                "data_quality": pred_result.get("data_quality", "HIGH (WMO / Copernicus DEM Calibrated)"),
                "provenance": {
                    "rainfall_source": "IMD / Open-Meteo WMO High-Res Grid (0.1°)",
                    "dem_source": "SRTM 30m Global Digital Elevation Model",
                    "soil_source": "NASA SMAP / ERA5-Land (9 km Grid)",
                    "landslide_source": "Geological Survey of India (GSI) NLSM",
                    "freshness_status": "DEMO_SEED",
                    "rainfall_status": "DEMO_SEED",
                    "is_demo": True
                }
            }
            self.zones[z["zone_id"]] = z_entry

        # 3. Community Reports
        self.reports = {
            "rep-001": {
                "id": "rep-001",
                "user_id": "usr-resident-01",
                "user_name": "Tariang Lyngdoh",
                "user_role": "RESIDENT",
                "zone_id": "NER-042",
                "zone_name": "Nongpoh - Umsning Hill Cut (NH-6)",
                "latitude": 25.8950,
                "longitude": 91.8820,
                "location_name": "NH-6 KM 48 Milestone, Nongpoh Ghat",
                "report_type": "Cracks",
                "signs_observed": ["Tension cracks on tarmac", "Subsurface soil shifting"],
                "has_activity": True,
                "description": "Noticed 3-inch wide tension cracks opening along the outer retaining wall after 6 hours of continuous downpour.",
                "photo_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
                "status": "VERIFIED",
                "created_at": "2026-08-25T14:30:00Z",
                "verified_at": "2026-08-25T15:10:00Z",
                "verified_by": "Dr. Anamika Sharma (SDMA)",
                "reviewer_notes": "Confirmed on site by Ri Bhoi field engineers. Retaining wall showing lateral displacement."
            },
            "rep-002": {
                "id": "rep-002",
                "user_id": "usr-resident-01",
                "user_name": "Tariang Lyngdoh",
                "user_role": "RESIDENT",
                "zone_id": "NER-042",
                "zone_name": "Nongpoh - Umsning Hill Cut (NH-6)",
                "latitude": 25.8720,
                "longitude": 91.8890,
                "location_name": "Umsning Hill Curve 4",
                "report_type": "Water seepage",
                "signs_observed": ["Turbid water bubbling from toe of slope", "Muddy discharge across lane"],
                "has_activity": True,
                "description": "Heavy muddy water bubbling vigorously from the cut slope toe. Signs of pore pressure blowout.",
                "photo_url": "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?auto=format&fit=crop&w=600&q=80",
                "status": "VERIFIED",
                "created_at": "2026-08-25T16:15:00Z",
                "verified_at": "2026-08-25T16:45:00Z",
                "verified_by": "Dr. Anamika Sharma (SDMA)",
                "reviewer_notes": "SDRF rapid unit flagged high pore-water saturation."
            },
            "rep-003": {
                "id": "rep-003",
                "user_id": "usr-resident-01",
                "user_name": "Bimal Chettri",
                "user_role": "RESIDENT",
                "zone_id": "NER-011",
                "zone_name": "Gangtok - Ranipool Canyon (NH-10)",
                "latitude": 27.2910,
                "longitude": 88.5620,
                "location_name": "Ranipool Bridge Approach",
                "report_type": "Falling rocks",
                "signs_observed": ["Intermittent boulder fall", "Damaged guard rails"],
                "has_activity": True,
                "description": "Continuous small debris and rock fragments rolling down onto NH-10. Vehicles moving with high caution.",
                "photo_url": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80",
                "status": "VERIFIED",
                "created_at": "2026-08-25T17:00:00Z",
                "verified_at": "2026-08-25T17:30:00Z",
                "verified_by": "Dr. Anamika Sharma (SDMA)",
                "reviewer_notes": "Broader rockfall net required. Traffic police posted."
            },
            "rep-004": {
                "id": "rep-004",
                "user_id": "usr-resident-01",
                "user_name": "Lalthan Sanga",
                "user_role": "RESIDENT",
                "zone_id": "NER-077",
                "zone_name": "Kohima - Paglapahar Sinking Zone (NH-29)",
                "latitude": 25.7180,
                "longitude": 94.0210,
                "location_name": "Paglapahar Ghat Milestone 12",
                "report_type": "Slope movement",
                "signs_observed": ["Tilted trees", "Road subsidence of 15cm"],
                "has_activity": True,
                "description": "Noticeable road sag and trees tilting downhill at approx 20 degrees. Heavy mud creeping toward edge.",
                "photo_url": "https://images.unsplash.com/photo-1542314831-c6a4d2757276?auto=format&fit=crop&w=600&q=80",
                "status": "PENDING",
                "created_at": "2026-08-25T18:40:00Z",
                "verified_at": None,
                "verified_by": None,
                "reviewer_notes": None
            }
        }

        # 4. Roads Database with Real-Time Obstruction Overrides
        self.roads = {
            "road-nh6-sec1": {
                "road_id": "road-nh6-sec1",
                "name": "GS Road Highway Sector 1",
                "highway_code": "NH-6",
                "from_junction": "GHY_HUB",
                "to_junction": "BYR_JUNCT",
                "distance_km": 14.5,
                "status": "OPEN",
                "obstruction_reason": None,
                "zone_id": None,
                "speed_limit_kmh": 65,
                "last_updated": "2026-08-25T10:00:00Z"
            },
            "road-nh6-nongpoh": {
                "road_id": "road-nh6-nongpoh",
                "name": "NH-6 Nongpoh Ghat Cut",
                "highway_code": "NH-6",
                "from_junction": "BYR_JUNCT",
                "to_junction": "NONGPOH_MID",
                "distance_km": 24.0,
                "status": "DANGEROUS",
                "obstruction_reason": "Continuous debris slide at KM 48. Heavy vehicles restricted.",
                "zone_id": "NER-042",
                "speed_limit_kmh": 30,
                "last_updated": "2026-08-25T16:00:00Z"
            },
            "road-nh6-umsning": {
                "road_id": "road-nh6-umsning",
                "name": "NH-6 Umsning Hill Pass",
                "highway_code": "NH-6",
                "from_junction": "NONGPOH_MID",
                "to_junction": "UMSNING_CUT",
                "distance_km": 18.5,
                "status": "BLOCKED",
                "obstruction_reason": "Major 40-meter mudflow across highway. Excavators deployed.",
                "zone_id": "NER-042",
                "speed_limit_kmh": 0,
                "last_updated": "2026-08-25T17:30:00Z"
            },
            "road-nh6-umiam": {
                "road_id": "road-nh6-umiam",
                "name": "Umiam Gorge Expressway",
                "highway_code": "NH-6",
                "from_junction": "UMSNING_CUT",
                "to_junction": "UMIAM_LAKE",
                "distance_km": 16.0,
                "status": "OPEN",
                "obstruction_reason": None,
                "zone_id": "NER-024",
                "speed_limit_kmh": 55,
                "last_updated": "2026-08-25T10:00:00Z"
            },
            "road-shl-ascent": {
                "road_id": "road-shl-ascent",
                "name": "Shillong City Ascent",
                "highway_code": "SH-1",
                "from_junction": "UMIAM_LAKE",
                "to_junction": "SHL_CENTER",
                "distance_km": 15.2,
                "status": "OPEN",
                "obstruction_reason": None,
                "zone_id": "NER-024",
                "speed_limit_kmh": 40,
                "last_updated": "2026-08-25T10:00:00Z"
            },
            "road-mawhati-bypass": {
                "road_id": "road-mawhati-bypass",
                "name": "Mawhati Valley Rural Bypass",
                "highway_code": "SH-14",
                "from_junction": "BYR_JUNCT",
                "to_junction": "MAWHATI_VALLEY",
                "distance_km": 28.0,
                "status": "OPEN",
                "obstruction_reason": "Safe alternative valley corridor",
                "zone_id": "NER-045",
                "speed_limit_kmh": 55,
                "last_updated": "2026-08-25T10:00:00Z"
            },
            "road-bhoirymbong-link": {
                "road_id": "road-bhoirymbong-link",
                "name": "Bhoirymbong Airport Link Road",
                "highway_code": "SH-14",
                "from_junction": "MAWHATI_VALLEY",
                "to_junction": "BHOIRYMBONG_BYPASS",
                "distance_km": 26.5,
                "status": "OPEN",
                "obstruction_reason": None,
                "zone_id": "NER-045",
                "speed_limit_kmh": 55,
                "last_updated": "2026-08-25T10:00:00Z"
            },
            "road-neigrihms-bypass": {
                "road_id": "road-neigrihms-bypass",
                "name": "NEIGRIHMS Shillong East Bypass",
                "highway_code": "SH-14B",
                "from_junction": "BHOIRYMBONG_BYPASS",
                "to_junction": "SHL_CENTER",
                "distance_km": 18.2,
                "status": "OPEN",
                "obstruction_reason": None,
                "zone_id": "NER-024",
                "speed_limit_kmh": 45,
                "last_updated": "2026-08-25T10:00:00Z"
            },
            "road-nh10-teesta": {
                "road_id": "road-nh10-teesta",
                "name": "NH-10 Teesta Canyon Road",
                "highway_code": "NH-10",
                "from_junction": "SILIGURI_HUB",
                "to_junction": "RANGPO_CHECKPOST",
                "distance_km": 68.0,
                "status": "SLOW",
                "obstruction_reason": "Single-lane traffic due to minor rockfall clearance",
                "zone_id": "NER-011",
                "speed_limit_kmh": 25,
                "last_updated": "2026-08-25T15:00:00Z"
            },
            "road-nh10-ranipool": {
                "road_id": "road-nh10-ranipool",
                "name": "NH-10 Ranipool - Gangtok Ascent",
                "highway_code": "NH-10",
                "from_junction": "SINGTAM_JUNCT",
                "to_junction": "GANGTOK_RIDGE",
                "distance_km": 28.0,
                "status": "DANGEROUS",
                "obstruction_reason": "Sinking road shoulder at 9th Mile",
                "zone_id": "NER-011",
                "speed_limit_kmh": 20,
                "last_updated": "2026-08-25T16:30:00Z"
            },
            "road-nh29-paglapahar": {
                "road_id": "road-nh29-paglapahar",
                "name": "NH-29 Paglapahar Landslide Ghat",
                "highway_code": "NH-29",
                "from_junction": "MEDZIPHEMA_FOOTHILLS",
                "to_junction": "KOHIMA_CITY",
                "distance_km": 48.0,
                "status": "BLOCKED",
                "obstruction_reason": "Massive mud-rock slide at Old Paglapahar. All traffic diverted.",
                "zone_id": "NER-077",
                "speed_limit_kmh": 0,
                "last_updated": "2026-08-25T18:00:00Z"
            }
        }

        # 5. GDACS-Style Active Incidents Database (Pre-seeded Training Scenarios)
        self.incidents = {
            "LS-2026-NE-0042": {
                "incident_id": "LS-2026-NE-0042",
                "title": "Major Highway Blockade & Mudflow at Nongpoh Hill Cut",
                "district": "Ri Bhoi",
                "state": "Meghalaya",
                "latitude": 25.8620,
                "longitude": 91.8910,
                "timestamp": "2026-08-25T16:30:00Z",
                "severity": "CRITICAL",
                "status": "RESPONDING",
                "affected_zone_id": "NER-042",
                "zone_name": "Nongpoh - Umsning Hill Cut (NH-6)",
                "estimated_population": 4200,
                "blocked_roads": ["NH-6 Umsning Hill Pass (KM 48-52)"],
                "injured_people": 3,
                "missing_people": 0,
                "evacuated_people": 140,
                "source": "Synthetic Scenario Dataset (NER Benchmark Drill)",
                "assigned_team_id": "team-sdrf-01",
                "assigned_team_name": "SDRF Ri-Bhoi Fast Response Unit",
                "description": "Prolonged rainfall of 85.2mm caused sudden slope failure of 150m retaining section across NH-6. 2 vehicles partially buried, passengers rescued.",
                "updated_at": "2026-08-25T18:00:00Z",
                "verification_status": "DEMO / SIMULATION",
                "category": "DEMO_SIMULATION",
                "source_type": "SIMULATION",
                "source_priority_level": 5,
                "casualties_info": "Injured: 3 (Simulated Exercise)",
                "reported_causes": ["Simulated Heavy Rainfall (>85mm)", "Synthetic Slope Cut"],
                "contributing_factors": ["Simulation Calibration Model"],
                "why_at_risk": "Pre-seeded drill scenario for testing multi-agency response dispatch. Not an active real-world landslide event.",
                "freshness_label": "Simulated Drill Scenario",
                "is_simulation": True
            },
            "LS-2026-NE-0043": {
                "incident_id": "LS-2026-NE-0043",
                "title": "Ranipool Riverbank Debris Slide on NH-10",
                "district": "East Sikkim",
                "state": "Sikkim",
                "latitude": 27.2840,
                "longitude": 88.5520,
                "timestamp": "2026-08-25T15:10:00Z",
                "severity": "HIGH",
                "status": "VERIFIED",
                "affected_zone_id": "NER-011",
                "zone_name": "Gangtok - Ranipool Canyon (NH-10)",
                "estimated_population": 6800,
                "blocked_roads": ["NH-10 Ranipool 9th Mile"],
                "injured_people": 1,
                "missing_people": 0,
                "evacuated_people": 65,
                "source": "Synthetic Scenario Dataset (NER Benchmark Drill)",
                "assigned_team_id": "team-police-01",
                "assigned_team_name": "Sikkim Traffic & Mountain Police Unit",
                "description": "Continuous rockfall and slush flow encroaching on left carriageway. Heavy machinery clearing single-lane corridor.",
                "updated_at": "2026-08-25T17:15:00Z",
                "verification_status": "DEMO / SIMULATION",
                "category": "DEMO_SIMULATION",
                "source_type": "SIMULATION",
                "source_priority_level": 5,
                "casualties_info": "Injured: 1 (Simulated Exercise)",
                "reported_causes": ["Riverbank Toe Erosion (Simulated)"],
                "contributing_factors": ["Simulation Calibration Model"],
                "why_at_risk": "Pre-seeded drill scenario for testing mountain traffic diversion. Not an active real-world landslide event.",
                "freshness_label": "Simulated Drill Scenario",
                "is_simulation": True
            },
            "LS-2026-NE-0044": {
                "incident_id": "LS-2026-NE-0044",
                "title": "Paglapahar Ghat Subsidence & Sinking Roadbed",
                "district": "Kohima",
                "state": "Nagaland",
                "latitude": 25.7210,
                "longitude": 94.0080,
                "timestamp": "2026-08-25T17:45:00Z",
                "severity": "CRITICAL",
                "status": "EVACUATING",
                "affected_zone_id": "NER-077",
                "zone_name": "Kohima - Paglapahar Sinking Zone (NH-29)",
                "estimated_population": 2900,
                "blocked_roads": ["NH-29 Paglapahar Ghat"],
                "injured_people": 0,
                "missing_people": 0,
                "evacuated_people": 85,
                "source": "Synthetic Scenario Dataset (NER Benchmark Drill)",
                "assigned_team_id": "team-ndrf-01",
                "assigned_team_name": "12th Battalion NDRF Unit C",
                "description": "Severe 30cm vertical road drop with creeping embankment. Preventative evacuation of 24 downhill settlement homes underway.",
                "updated_at": "2026-08-25T18:45:00Z",
                "verification_status": "DEMO / SIMULATION",
                "category": "DEMO_SIMULATION",
                "source_type": "SIMULATION",
                "source_priority_level": 5,
                "casualties_info": "Casualties: None reported (Simulated Exercise)",
                "reported_causes": ["Roadbed Embankment Creep (Simulated)"],
                "contributing_factors": ["Simulation Calibration Model"],
                "why_at_risk": "Pre-seeded drill scenario for testing rapid NDRF evacuation. Not an active real-world landslide event.",
                "freshness_label": "Simulated Drill Scenario",
                "is_simulation": True
            }
        }

        # 6. Emergency SOS Requests Database with Triage Prioritization
        self.sos_requests = {
            "SOS-2026-00981": {
                "sos_id": "SOS-2026-00981",
                "user_id": "usr-citizen-981",
                "user_name": "Mawlong & Family",
                "emergency_contact": "+91 98620-11234",
                "latitude": 25.8640,
                "longitude": 91.8930,
                "location_name": "Nongpoh Ghat Cut, near KM 49 milestone",
                "zone_id": "NER-042",
                "timestamp": "2026-08-25T17:10:00Z",
                "people_count": 4,
                "injury_severity": "SEVERE",
                "is_trapped": True,
                "priority_score": 96.5,
                "triage_priority": "CRITICAL",
                "status": "DISPATCHED",
                "message": "Vehicle hit by sudden boulder slide on mountain cut. Two adults with head/limb injuries. Mud creeping into car doors. Need immediate extraction.",
                "photo_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
                "assigned_team_id": "team-sdrf-01",
                "assigned_team_name": "SDRF Ri-Bhoi Fast Response Unit",
                "destination_hospital_id": "hosp-nongpoh-civil",
                "destination_hospital_name": "Civil Hospital Nongpoh (Trauma Care)",
                "destination_shelter_id": "shelter-nongpoh-comm",
                "destination_shelter_name": "Nongpoh Community Relief Center",
                "triage_notes": "Immediate hydraulic cutter extraction required. 108 Ambulance en route.",
                "updated_at": "2026-08-25T17:35:00Z"
            },
            "SOS-2026-00982": {
                "sos_id": "SOS-2026-00982",
                "user_id": "usr-citizen-982",
                "user_name": "Dorjee Tamang",
                "emergency_contact": "+91 94340-88712",
                "latitude": 27.2880,
                "longitude": 88.5580,
                "location_name": "Ranipool Foothills settlement",
                "zone_id": "NER-011",
                "timestamp": "2026-08-25T17:40:00Z",
                "people_count": 6,
                "injury_severity": "MINOR",
                "is_trapped": False,
                "priority_score": 68.0,
                "triage_priority": "EVACUATION",
                "status": "IN_PROGRESS",
                "message": "Water and silt entering home ground floor. Elderly grandmother needs transport to relief center.",
                "photo_url": None,
                "assigned_team_id": "team-volunteers-01",
                "assigned_team_name": "Ri-Bhoi / Gangtok Youth Volunteer Corps",
                "destination_hospital_id": None,
                "destination_hospital_name": None,
                "destination_shelter_id": "shelter-singtam-hs",
                "destination_shelter_name": "Singtam Higher Secondary Safe Haven",
                "triage_notes": "Assigned evacuation shuttle to community relief camp.",
                "updated_at": "2026-08-25T18:00:00Z"
            }
        }

        # 7. Rescue Teams Directory (Multi-Agency)
        self.rescue_teams = {
            "team-ndrf-01": {
                "team_id": "team-ndrf-01",
                "name": "12th Battalion NDRF Unit Alpha",
                "team_type": "NDRF",
                "base_location": "Guwahati Regional Base / Shillong Forward Post",
                "members_count": 24,
                "leader_name": "Inspector Vikram Negi",
                "contact_phone": "+91 361-2244001",
                "vehicle": "All-Terrain Heavy Rescue 4x4 + Earthmover",
                "equipment": ["Hydraulic Cutters", "Search Dogs", "Inflatable Rafts", "Satellite Comms", "Life Detectors"],
                "status": "DISPATCHED",
                "current_assignment_id": "LS-2026-NE-0044",
                "current_assignment_title": "Paglapahar Embankment Evacuation",
                "latitude": 25.7350,
                "longitude": 93.9800,
                "eta_minutes": 15
            },
            "team-sdrf-01": {
                "team_id": "team-sdrf-01",
                "name": "SDRF Ri-Bhoi Fast Response Unit",
                "team_type": "SDRF",
                "base_location": "Nongpoh District Headquarters",
                "members_count": 14,
                "leader_name": "Sub-Inspector Wanbah Khonglah",
                "contact_phone": "+91 3638-232100",
                "vehicle": "Mountain Quick Response Troop Carrier (4WD)",
                "equipment": ["Chainsaws", "Spreader Cutters", "Rope Rescue Rigs", "Trauma Stretchers", "Heavy Winch"],
                "status": "ON_SITE",
                "current_assignment_id": "SOS-2026-00981",
                "current_assignment_title": "Nongpoh KM 49 Vehicle Extraction",
                "latitude": 25.8640,
                "longitude": 91.8930,
                "eta_minutes": 0
            },
            "team-police-01": {
                "team_id": "team-police-01",
                "name": "Highway Patrol & Traffic Command Unit 4",
                "team_type": "Police",
                "base_location": "Umiam Checkpost",
                "members_count": 8,
                "leader_name": "Sub-Inspector S. Sangma",
                "contact_phone": "+91 364-2591000",
                "vehicle": "Interceptor Gypsies & Traffic Diversion Vans",
                "equipment": ["Barricades", "Loudspeakers", "First Aid", "Variable Message Boards"],
                "status": "AVAILABLE",
                "current_assignment_id": None,
                "current_assignment_title": None,
                "latitude": 25.6600,
                "longitude": 91.9100,
                "eta_minutes": 8
            },
            "team-medical-01": {
                "team_id": "team-medical-01",
                "name": "108 Advance Life Support Mobile ICU",
                "team_type": "Medical",
                "base_location": "Civil Hospital Nongpoh",
                "members_count": 4,
                "leader_name": "Dr. Prabal Das (Emergency Med)",
                "contact_phone": "108 / +91 3638-232108",
                "vehicle": "4x4 Advance Life Support Ambulance",
                "equipment": ["Defibrillator", "Portable Ventilator", "Oxygen Rigs", "Splints & Trauma Kits"],
                "status": "DISPATCHED",
                "current_assignment_id": "SOS-2026-00981",
                "current_assignment_title": "Nongpoh Slide Trauma Transport",
                "latitude": 25.8800,
                "longitude": 91.8850,
                "eta_minutes": 6
            },
            "team-volunteers-01": {
                "team_id": "team-volunteers-01",
                "name": "Ri-Bhoi Community Youth Responders",
                "team_type": "Volunteers",
                "base_location": "Bhoirymbong Youth Center",
                "members_count": 30,
                "leader_name": "Bah K. Marbaniang",
                "contact_phone": "+91 98560-44211",
                "vehicle": "Pickup 4x4s & Local Vans",
                "equipment": ["Hand Tools", "Tarpaulins", "Drinking Water Cans", "First Aid Boxes"],
                "status": "AVAILABLE",
                "current_assignment_id": None,
                "current_assignment_title": None,
                "latitude": 25.7100,
                "longitude": 92.0000,
                "eta_minutes": 10
            }
        }

        # 8. Hospitals Directory with Real Capacity Telemetry
        self.hospitals = {
            "hosp-nongpoh-civil": {
                "hospital_id": "hosp-nongpoh-civil",
                "name": "Civil Hospital Nongpoh (District Emergency Center)",
                "type": "District Hospital",
                "district": "Ri Bhoi",
                "state": "Meghalaya",
                "latitude": 25.9050,
                "longitude": 91.8810,
                "source": "Demo seed (name and location only)",
                "is_demo": True,
                "trauma_center": True,
                "blood_bank": True,
                "contact_phone": "108",
            },
            "hosp-neigrihms-shl": {
                "hospital_id": "hosp-neigrihms-shl",
                "name": "NEIGRIHMS Super-Specialty Medical Institute",
                "type": "Apex Trauma Institute",
                "district": "East Khasi Hills",
                "state": "Meghalaya",
                "latitude": 25.5920,
                "longitude": 91.9380,
                "source": "Demo seed (name and location only)",
                "is_demo": True,
                "trauma_center": True,
                "blood_bank": True,
                "contact_phone": "108",
            },
            "hosp-stnm-gangtok": {
                "hospital_id": "hosp-stnm-gangtok",
                "name": "STNM Multi-Specialty Hospital Gangtok",
                "type": "State Apex Hospital",
                "district": "East Sikkim",
                "state": "Sikkim",
                "latitude": 27.3210,
                "longitude": 88.5980,
                "source": "Demo seed (name and location only)",
                "is_demo": True,
                "trauma_center": True,
                "blood_bank": True,
                "contact_phone": "108",
            },
            "hosp-naga-kohima": {
                "hospital_id": "hosp-naga-kohima",
                "name": "Naga Hospital Authority Kohima",
                "type": "District Apex Hospital",
                "district": "Kohima",
                "state": "Nagaland",
                "latitude": 25.6680,
                "longitude": 94.1020,
                "source": "Demo seed (name and location only)",
                "is_demo": True,
                "trauma_center": True,
                "blood_bank": True,
                "contact_phone": "108",
            }
        }

        # 9. Emergency Relief Shelters & Evacuation Camps
        self.shelters = {
            "shelter-nongpoh-comm": {
                "shelter_id": "shelter-nongpoh-comm",
                "name": "Nongpoh Community Hall & Relief Camp",
                "type": "Designated Evacuation Shelter",
                "district": "Ri Bhoi",
                "state": "Meghalaya",
                "latitude": 25.9080,
                "longitude": 91.8750,
                "facilities": [],
                "source": "Demo seed (name and location only)",
                "is_demo": True,
                "medical_station": True,
                "contact_phone": "1070",
                "accessibility": "Direct Valley Access via Mawhati Route"
            },
            "shelter-shillong-stadium": {
                "shelter_id": "shelter-shillong-stadium",
                "name": "JN Indoor Stadium Shillong Relief Hub",
                "type": "Major Regional Camp",
                "district": "East Khasi Hills",
                "state": "Meghalaya",
                "latitude": 25.5860,
                "longitude": 91.8890,
                "facilities": [],
                "source": "Demo seed (name and location only)",
                "is_demo": True,
                "medical_station": True,
                "contact_phone": "1070",
                "accessibility": "High Capacity Highway Link"
            },
            "shelter-singtam-hs": {
                "shelter_id": "shelter-singtam-hs",
                "name": "Singtam Higher Secondary Safe Haven",
                "type": "Safe Hill School Camp",
                "district": "East Sikkim",
                "state": "Sikkim",
                "latitude": 27.2360,
                "longitude": 88.5020,
                "facilities": [],
                "source": "Demo seed (name and location only)",
                "is_demo": True,
                "medical_station": True,
                "contact_phone": "1070",
                "accessibility": "Low Slope Elevation"
            },
            "shelter-kohima-hall": {
                "shelter_id": "shelter-kohima-hall",
                "name": "Kohima Multipurpose Indoor Relief Camp",
                "type": "Designated Evacuation Complex",
                "district": "Kohima",
                "state": "Nagaland",
                "latitude": 25.6720,
                "longitude": 94.1080,
                "facilities": [],
                "source": "Demo seed (name and location only)",
                "is_demo": True,
                "medical_station": True,
                "contact_phone": "1070",
                "accessibility": "Direct NH-29 Bypass Road"
            }
        }

        # 10. Post-Disaster Analysis & Machine Learning Retrospective Records
        self.post_disaster_events = {
            "pda-2026-001": {
                "record_id": "pda-2026-001",
                "incident_id": "LS-2026-NE-0038",
                "event_name": "Cherrapunji Escarpment Slope Failure Event",
                "date_occurred": "2026-07-14",
                "district": "East Khasi Hills",
                "pre_event_ml_risk": 74.5,
                "actual_rainfall_24h_mm": 192.0,
                "actual_slope_deg": 36.5,
                "community_reports_prior": 5,
                "time_to_first_response_min": 18,
                "total_people_evacuated": 310,
                "casualties": 0,
                "injuries_treated": 4,
                "primary_hospital_used": "NEIGRIHMS Shillong",
                "primary_shelter_used": "JN Indoor Stadium Shillong",
                "primary_road_diverted_to": "Mawkdok Valley Link",
                "lessons_learned": "Early alert issued 4 hours prior prevented tourist traffic from entering the canyon. Pre-positioned SDRF saved response time.",
                "model_calibration_feedback": "Increased rainfall weight on limestone karst terrain by 4.2% based on moisture saturation curve."
            },
            "pda-2026-002": {
                "record_id": "pda-2026-002",
                "incident_id": "LS-2026-NE-0029",
                "event_name": "NH-10 Ranipool Debris Chute Collapse",
                "date_occurred": "2026-06-22",
                "district": "East Sikkim",
                "pre_event_ml_risk": 82.0,
                "actual_rainfall_24h_mm": 160.0,
                "actual_slope_deg": 39.0,
                "community_reports_prior": 4,
                "time_to_first_response_min": 14,
                "total_people_evacuated": 180,
                "casualties": 0,
                "injuries_treated": 2,
                "primary_hospital_used": "STNM Hospital Gangtok",
                "primary_shelter_used": "Singtam Community Relief Camp",
                "primary_road_diverted_to": "Dikchu Hydel Bypass",
                "lessons_learned": "Dikchu alternate route successfully absorbed 85% of commuter load without bottleneck.",
                "model_calibration_feedback": "Adjusted historical incident prior factor for NH-10 corridor."
            }
        }

        # 11. Alert Subscriptions
        self.subscriptions = {
            "sub-default": {
                "subscription_id": "sub-default",
                "user_id": "usr-resident-01",
                "selected_districts": ["Ri Bhoi", "East Khasi Hills", "East Sikkim", "Kohima"],
                "risk_threshold": "HIGH",
                "channels": ["IN_APP", "EMAIL", "SMS_DEMO"],
                "preferred_language": "en",
                "status": "ACTIVE"
            }
        }

        # Every seeded record above is demo data; tag it so the UI can label it.
        for collection in (self.reports, self.incidents, self.rescue_teams, self.hospitals,
                           self.shelters, self.post_disaster_events):
            for record in collection.values():
                record["is_demo"] = True

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

            final_score = round(min(100.0, z["ml_base_score"] + boost), 1)
            level = categorize_risk_level(final_score)

            z["community_report_count"] = tot_count
            z["verified_report_count"] = ver_count
            z["community_boost"] = boost
            z["risk_score"] = final_score
            z["risk_level"] = level
            z["last_updated"] = datetime.now(timezone.utc).isoformat()
            z["recommended_action"] = get_recommended_action(level, "heavy rainfall and verified ground instability")

    def _regenerate_alerts_internal(self):
        self.alerts = {}
        alert_idx = 1
        for zid, z in self.zones.items():
            score = z["risk_score"]
            level = z["risk_level"]

            if score >= 80.0:
                aid = f"ALT-{alert_idx:03d}"
                self.alerts[aid] = {
                    "id": aid,
                    "zone_id": zid,
                    "zone_name": z["name"],
                    "category": "CRITICAL",
                    "risk_score": score,
                    "title": f"CRITICAL LANDSLIDE WARNING: {z['name']}",
                    "reason": f"Rainfall {z['rainfall_24h']} mm in 24h + steep terrain ({z['slope_deg']}°) + {z['verified_report_count']} verified ground instability reports.",
                    "recommended_action": "Evacuate non-essential personnel and divert all heavy transport through alternate valley bypass.",
                    "timestamp": z["last_updated"],
                    "status": "ACTIVE",
                    "affected_highway": z["name"]
                }
                alert_idx += 1
            elif score >= 60.0:
                aid = f"ALT-{alert_idx:03d}"
                self.alerts[aid] = {
                    "id": aid,
                    "zone_id": zid,
                    "zone_name": z["name"],
                    "category": "HIGH",
                    "risk_score": score,
                    "title": f"HIGH RISK ADVISORY: {z['name']}",
                    "reason": f"Elevated saturation ({int(z['soil_moisture']*100)}% moisture) with ongoing monsoon front.",
                    "recommended_action": "Activate road clearing teams, restrict night convoy movements, monitor inclinometer telemetry.",
                    "timestamp": z["last_updated"],
                    "status": "ACTIVE",
                    "affected_highway": z["name"]
                }
                alert_idx += 1
            elif score >= 35.0 and z["verified_report_count"] > 0:
                aid = f"ALT-{alert_idx:03d}"
                self.alerts[aid] = {
                    "id": aid,
                    "zone_id": zid,
                    "zone_name": z["name"],
                    "category": "MODERATE",
                    "risk_score": score,
                    "title": f"CAUTION: Verified Ground Movement in {z['name']}",
                    "reason": f"Ground reports verified. Moderate slope destabilization under observation.",
                    "recommended_action": "Drive with vigilance. Watch for loose debris on sharp turns.",
                    "timestamp": z["last_updated"],
                    "status": "ACTIVE",
                    "affected_highway": z["name"]
                }
                alert_idx += 1

    # ---------------- SOS Triage Scoring Engine ----------------
    def calculate_sos_priority(self, people: int, severity: str, is_trapped: bool, zone_risk: float) -> tuple[float, str]:
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

    def get_zone_by_id(self, zone_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return copy.deepcopy(self.zones.get(zone_id))

    def get_zone_risk_map(self) -> Dict[str, float]:
        with self.lock:
            return {zid: z["risk_score"] for zid, z in self.zones.items()}

    def get_all_reports(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.lock:
            reports_list = list(self.reports.values())
            if status_filter:
                reports_list = [r for r in reports_list if r.get("status") == status_filter.upper()]
            reports_list.sort(key=lambda x: x["created_at"], reverse=True)
            return reports_list

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

            # Execute Multi-Agent AI Verification & Cross-Checking Engine
            ai_result = verify_landslide_report(report_data, matched_zone)

            new_rep = {
                "id": rep_id,
                "user_id": user.get("id", "usr-anonymous"),
                "user_name": user.get("full_name", user.get("username", "Local Resident")),
                "user_role": user.get("role", "RESIDENT"),
                "zone_id": zone_id,
                "zone_name": zone_name,
                "latitude": report_data["latitude"],
                "longitude": report_data["longitude"],
                "location_name": report_data.get("location_name") or f"Near {zone_name or 'Himalayan Ridge'}",
                "report_type": report_data["report_type"],
                "signs_observed": report_data.get("signs_observed", []),
                "has_activity": report_data.get("has_activity", True),
                "description": report_data["description"],
                "photo_url": report_data.get("photo_url") or "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
                "status": ai_result["status"],
                "ai_verified": ai_result["ai_verified"],
                "ai_confidence_score": ai_result["ai_confidence_score"],
                "ai_verification_checks": ai_result["ai_verification_checks"],
                "ai_summary": ai_result["ai_summary"],
                "upvotes": 1,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "verified_at": datetime.now(timezone.utc).isoformat() if ai_result["ai_verified"] else None,
                "verified_by": "AI Multi-Agent Verification Pipeline" if ai_result["ai_verified"] else None,
                "reviewer_notes": ai_result["ai_summary"] if ai_result["ai_verified"] else None
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

    def add_sos_request(self, data: Dict[str, Any], user: Optional[dict] = None) -> Dict[str, Any]:
        with self.lock:
            sos_id = f"SOS-2026-{uuid.uuid4().hex[:5].upper()}"
            lat, lng = data["latitude"], data["longitude"]
            
            # Find nearest zone risk
            best_dist = 999999.0
            zone_id = None
            zone_risk = 50.0
            for zid, z in self.zones.items():
                clat, clng = z["center"]["lat"], z["center"]["lng"]
                d = (lat - clat) ** 2 + (lng - clng) ** 2
                if d < best_dist:
                    best_dist = d
                    zone_id = zid
                    zone_risk = z["risk_score"]

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

    # ---------------- 12-Step Demo Scenario Stepper ----------------
    def run_simulation_step(self, target_step: int) -> Dict[str, Any]:
        with self.lock:
            self.simulation_step = target_step

            # Step 1: Baseline Weather increase
            if target_step >= 1:
                z = self.zones.get("NER-042")
                if z:
                    z["rainfall_24h"] = 105.0
                    z["soil_moisture"] = 0.52
                    z["ml_base_score"] = 68.5

            # Step 2: High Advisory Alert Triggered
            if target_step >= 2:
                self._recalculate_all_fusion_internal()
                self._regenerate_alerts_internal()

            # Step 3 & 4: Community slope movement reports arrive -> CRITICAL fusion
            if target_step >= 4:
                # Add 3 verified reports to trigger full +15 boost
                for rep in self.reports.values():
                    if rep.get("zone_id") == "NER-042":
                        rep["status"] = "VERIFIED"
                self._recalculate_all_fusion_internal()
                self._regenerate_alerts_internal()

            # Step 5: Road Blockage on NH-6
            if target_step >= 5:
                if "road-nh6-umsning" in self.roads:
                    self.roads["road-nh6-umsning"]["status"] = "BLOCKED"
                    self.roads["road-nh6-umsning"]["obstruction_reason"] = "Massive mudflow across NH-6 KM 49. Complete road blockage."

            # Step 8: SOS Request arrives
            if target_step >= 8:
                if "SOS-2026-00981" in self.sos_requests:
                    self.sos_requests["SOS-2026-00981"]["status"] = "DISPATCHED"

            # Step 9: Rescue Team assigned
            if target_step >= 9:
                if "team-sdrf-01" in self.rescue_teams:
                    self.rescue_teams["team-sdrf-01"]["status"] = "ON_SITE"

            # Step 11: Incident Resolved
            if target_step >= 11:
                if "LS-2026-NE-0042" in self.incidents:
                    self.incidents["LS-2026-NE-0042"]["status"] = "RESOLVED"

            return {
                "step": target_step,
                "status": "success",
                "message": f"Simulation stepped to Step {target_step}",
                "zone_NER042_risk": self.zones.get("NER-042", {}).get("risk_score"),
                "road_nh6_status": self.roads.get("road-nh6-umsning", {}).get("status"),
                "active_alerts_count": len(self.alerts)
            }

    def reset_demo_scenario(self):
        with self.lock:
            self._init_data()
            self.simulation_step = 1
            return {"status": "success", "message": "Demo state successfully reset to initial scenario."}


# Global Singleton Store Instance
db_store = StateStore()
