"""
Landslide Early Warning System - Road Network Graph
North Eastern Region (NER) Topography & Intercity Road Corridors
"""

import math
from typing import Dict, List, Any, Optional
import networkx as nx

# Predefined Waypoints & Towns in North Eastern Region
NODES_DATA = {
    # ------------------ Assam - Meghalaya Corridors (NH-6 / GS Road) ------------------
    "GHY_HUB": {
        "id": "GHY_HUB",
        "name": "Guwahati Khanapara Hub",
        "lat": 26.1264,
        "lng": 91.8082,
        "region": "Assam",
        "elevation_m": 54,
        "type": "terminal"
    },
    "BYR_JUNCT": {
        "id": "BYR_JUNCT",
        "name": "Byrnihat Junction",
        "lat": 26.0482,
        "lng": 91.8590,
        "region": "Meghalaya Border",
        "elevation_m": 120,
        "type": "waypoint"
    },
    "NONGPOH_MID": {
        "id": "NONGPOH_MID",
        "name": "Nongpoh Central (NH-6)",
        "lat": 25.9032,
        "lng": 91.8795,
        "region": "Meghalaya - Ri Bhoi",
        "elevation_m": 485,
        "type": "waypoint",
        "zone_id": "NER-042"  # Vulnerable landslide zone
    },
    "UMSNING_CUT": {
        "id": "UMSNING_CUT",
        "name": "Umsning Hill Stretch",
        "lat": 25.7510,
        "lng": 91.8980,
        "region": "Meghalaya - Ri Bhoi",
        "elevation_m": 760,
        "type": "waypoint",
        "zone_id": "NER-042"
    },
    "UMIAM_LAKE": {
        "id": "UMIAM_LAKE",
        "name": "Umiam Lake Pass",
        "lat": 25.6620,
        "lng": 91.9160,
        "region": "Meghalaya - East Khasi Hills",
        "elevation_m": 1020,
        "type": "waypoint",
        "zone_id": "NER-024"
    },
    "SHL_CENTER": {
        "id": "SHL_CENTER",
        "name": "Shillong City Center",
        "lat": 25.5788,
        "lng": 91.8933,
        "region": "Meghalaya - Capital",
        "elevation_m": 1496,
        "type": "terminal"
    },
    # Alternative Eastern Bypass Route (Mawhati - Bhoirymbong Valley)
    "MAWHATI_VALLEY": {
        "id": "MAWHATI_VALLEY",
        "name": "Mawhati Valley Road",
        "lat": 25.9420,
        "lng": 92.0520,
        "region": "Meghalaya - Eastern Ridge",
        "elevation_m": 310,
        "type": "waypoint",
        "zone_id": "NER-045"  # Low risk valley
    },
    "BHOIRYMBONG_BYPASS": {
        "id": "BHOIRYMBONG_BYPASS",
        "name": "Bhoirymbong Airport Link",
        "lat": 25.7050,
        "lng": 92.0100,
        "region": "Meghalaya",
        "elevation_m": 880,
        "type": "waypoint",
        "zone_id": "NER-045"
    },
    # ------------------ Southern Meghalaya (Cherrapunji & Jowai) ------------------
    "CHERRA_CLIFF": {
        "id": "CHERRA_CLIFF",
        "name": "Sohra (Cherrapunji) Escarpment",
        "lat": 25.2702,
        "lng": 91.7323,
        "region": "Meghalaya",
        "elevation_m": 1430,
        "type": "terminal",
        "zone_id": "NER-018"
    },
    "JOWAI_RIDGE": {
        "id": "JOWAI_RIDGE",
        "name": "Jowai Highway Cut",
        "lat": 25.4510,
        "lng": 92.2040,
        "region": "Meghalaya - West Jaintia",
        "elevation_m": 1380,
        "type": "terminal",
        "zone_id": "NER-063"
    },
    # ------------------ Sikkim Himalayan Corridor (NH-10) ------------------
    "SILIGURI_HUB": {
        "id": "SILIGURI_HUB",
        "name": "Siliguri / Sevoke Bridge",
        "lat": 26.8830,
        "lng": 88.4710,
        "region": "West Bengal Foothills",
        "elevation_m": 160,
        "type": "terminal"
    },
    "RANGPO_CHECKPOST": {
        "id": "RANGPO_CHECKPOST",
        "name": "Rangpo Sikkim Gate",
        "lat": 27.1764,
        "lng": 88.5312,
        "region": "Sikkim Border",
        "elevation_m": 330,
        "type": "waypoint",
        "zone_id": "NER-011"
    },
    "SINGTAM_JUNCT": {
        "id": "SINGTAM_JUNCT",
        "name": "Singtam Teesta Junction",
        "lat": 27.2345,
        "lng": 88.4980,
        "region": "Sikkim",
        "elevation_m": 420,
        "type": "waypoint",
        "zone_id": "NER-011"
    },
    "GANGTOK_RIDGE": {
        "id": "GANGTOK_RIDGE",
        "name": "Gangtok Capital Hub",
        "lat": 27.3389,
        "lng": 88.6065,
        "region": "East Sikkim",
        "elevation_m": 1650,
        "type": "terminal",
        "zone_id": "NER-011"
    },
    "MANGAN_PASS": {
        "id": "MANGAN_PASS",
        "name": "Mangan North Sikkim Corridor",
        "lat": 27.5120,
        "lng": 88.5320,
        "region": "North Sikkim",
        "elevation_m": 1310,
        "type": "terminal",
        "zone_id": "NER-055"
    },
    "DIKCHU_BYPASS": {
        "id": "DIKCHU_BYPASS",
        "name": "Dikchu Hydel Bypass",
        "lat": 27.3820,
        "lng": 88.5210,
        "region": "East Sikkim",
        "elevation_m": 650,
        "type": "waypoint",
        "zone_id": "NER-012"
    },
    # ------------------ Nagaland & Assam Hill Link (NH-29) ------------------
    "DIMAPUR_PLAINS": {
        "id": "DIMAPUR_PLAINS",
        "name": "Dimapur Commercial Hub",
        "lat": 25.9060,
        "lng": 93.7270,
        "region": "Nagaland Plains",
        "elevation_m": 145,
        "type": "terminal"
    },
    "MEDZIPHEMA_FOOTHILLS": {
        "id": "MEDZIPHEMA_FOOTHILLS",
        "name": "Medziphema Foothills",
        "lat": 25.7560,
        "lng": 93.8740,
        "region": "Nagaland",
        "elevation_m": 360,
        "type": "waypoint",
        "zone_id": "NER-077"
    },
    "KOHIMA_CITY": {
        "id": "KOHIMA_CITY",
        "name": "Kohima Capital Ridge",
        "lat": 25.6740,
        "lng": 94.1086,
        "region": "Nagaland",
        "elevation_m": 1444,
        "type": "terminal",
        "zone_id": "NER-077"
    },
    "DZUKOU_BYPASS": {
        "id": "DZUKOU_BYPASS",
        "name": "Pfutsero - Dzukou Valley Link",
        "lat": 25.5680,
        "lng": 94.2800,
        "region": "Nagaland",
        "elevation_m": 1820,
        "type": "waypoint",
        "zone_id": "NER-078"
    },
    # ------------------ Mizoram (Aizawl) ------------------
    "AIZAWL_CITY": {
        "id": "AIZAWL_CITY",
        "name": "Aizawl Ridge Center",
        "lat": 23.7271,
        "lng": 92.7176,
        "region": "Mizoram",
        "elevation_m": 1132,
        "type": "terminal",
        "zone_id": "NER-033"
    },
    "LENGPUI_AIRPORT": {
        "id": "LENGPUI_AIRPORT",
        "name": "Lengpui Valley Hub",
        "lat": 23.8390,
        "lng": 92.6280,
        "region": "Mizoram",
        "elevation_m": 420,
        "type": "terminal",
        "zone_id": "NER-034"
    }
}

# Road segments (edges) connecting the waypoints
EDGES_DATA = [
    # Guwahati -> Shillong Main NH-6 Highway (Fastest but cuts through high landslide terrain)
    {"u": "GHY_HUB", "v": "BYR_JUNCT", "distance_km": 14.5, "speed_kmh": 65, "name": "GS Road Highway Sector 1", "road_type": "4-lane"},
    {"u": "BYR_JUNCT", "v": "NONGPOH_MID", "distance_km": 24.0, "speed_kmh": 50, "name": "NH-6 Nongpoh Ghat Cut", "zone_id": "NER-042", "road_type": "Mountain Highway"},
    {"u": "NONGPOH_MID", "v": "UMSNING_CUT", "distance_km": 18.5, "speed_kmh": 45, "name": "NH-6 Umsning Hill Pass", "zone_id": "NER-042", "road_type": "Mountain Highway"},
    {"u": "UMSNING_CUT", "v": "UMIAM_LAKE", "distance_km": 16.0, "speed_kmh": 55, "name": "Umiam Gorge Expressway", "zone_id": "NER-024", "road_type": "Expressway"},
    {"u": "UMIAM_LAKE", "v": "SHL_CENTER", "distance_km": 15.2, "speed_kmh": 40, "name": "Shillong City Ascent", "zone_id": "NER-024", "road_type": "Urban Hill Road"},

    # Guwahati -> Shillong Alternative Eastern Valley Bypass (Longer but low-risk valley route)
    {"u": "BYR_JUNCT", "v": "MAWHATI_VALLEY", "distance_km": 28.0, "speed_kmh": 55, "name": "Mawhati Valley Rural Bypass", "zone_id": "NER-045", "road_type": "State Highway"},
    {"u": "MAWHATI_VALLEY", "v": "BHOIRYMBONG_BYPASS", "distance_km": 26.5, "speed_kmh": 55, "name": "Bhoirymbong Airport Link Road", "zone_id": "NER-045", "road_type": "State Highway"},
    {"u": "BHOIRYMBONG_BYPASS", "v": "SHL_CENTER", "distance_km": 18.2, "speed_kmh": 45, "name": "NEIGRIHMS Shillong East Bypass", "zone_id": "NER-024", "road_type": "2-lane Hill Road"},
    {"u": "UMSNING_CUT", "v": "BHOIRYMBONG_BYPASS", "distance_km": 13.0, "speed_kmh": 45, "name": "Umsning-Bhoirymbong Cross Link", "zone_id": "NER-045", "road_type": "Link Road"},

    # Shillong to Sohra / Cherrapunji
    {"u": "SHL_CENTER", "v": "CHERRA_CLIFF", "distance_km": 53.0, "speed_kmh": 42, "name": "Sohra Scenic Hill Highway", "zone_id": "NER-018", "road_type": "Mountain Road"},

    # Shillong to Jowai
    {"u": "SHL_CENTER", "v": "JOWAI_RIDGE", "distance_km": 64.0, "speed_kmh": 45, "name": "NH-6 Jowai Plateau Corridor", "zone_id": "NER-063", "road_type": "Highway"},
    {"u": "BHOIRYMBONG_BYPASS", "v": "JOWAI_RIDGE", "distance_km": 58.0, "speed_kmh": 50, "name": "Ri Bhoi - Jaintia Bypass Road", "zone_id": "NER-063", "road_type": "State Road"},

    # Sikkim Corridors (Siliguri - Rangpo - Singtam - Gangtok - Mangan)
    {"u": "SILIGURI_HUB", "v": "RANGPO_CHECKPOST", "distance_km": 68.0, "speed_kmh": 45, "name": "NH-10 Teesta Canyon Road", "zone_id": "NER-011", "road_type": "Ghat Highway"},
    {"u": "RANGPO_CHECKPOST", "v": "SINGTAM_JUNCT", "distance_km": 12.5, "speed_kmh": 40, "name": "Singtam River Road", "zone_id": "NER-011", "road_type": "2-lane Hill Road"},
    {"u": "SINGTAM_JUNCT", "v": "GANGTOK_RIDGE", "distance_km": 28.0, "speed_kmh": 35, "name": "NH-10 Ranipool - Gangtok Ascent", "zone_id": "NER-011", "road_type": "Steep Hill Road"},
    {"u": "SINGTAM_JUNCT", "v": "DIKCHU_BYPASS", "distance_km": 22.0, "speed_kmh": 38, "name": "Dikchu Hydel Low-Slope Route", "zone_id": "NER-012", "road_type": "Paved Link Road"},
    {"u": "DIKCHU_BYPASS", "v": "GANGTOK_RIDGE", "distance_km": 19.5, "speed_kmh": 35, "name": "Penlong La Alternate Approach", "zone_id": "NER-012", "road_type": "Paved Link Road"},
    {"u": "GANGTOK_RIDGE", "v": "MANGAN_PASS", "distance_km": 58.0, "speed_kmh": 30, "name": "North Sikkim Highway", "zone_id": "NER-055", "road_type": "Fragile High-Altitude Cut"},
    {"u": "DIKCHU_BYPASS", "v": "MANGAN_PASS", "distance_km": 42.0, "speed_kmh": 35, "name": "Dikchu-Mangan Lower Ridge Bypass", "zone_id": "NER-012", "road_type": "Alternate Link"},

    # Nagaland (Dimapur -> Kohima)
    {"u": "DIMAPUR_PLAINS", "v": "MEDZIPHEMA_FOOTHILLS", "distance_km": 24.0, "speed_kmh": 60, "name": "NH-29 4-Lane Plain Section", "road_type": "Highway"},
    {"u": "MEDZIPHEMA_FOOTHILLS", "v": "KOHIMA_CITY", "distance_km": 48.0, "speed_kmh": 38, "name": "NH-29 Paglapahar Landslide Ghat", "zone_id": "NER-077", "road_type": "Steep Ghat Road"},
    {"u": "MEDZIPHEMA_FOOTHILLS", "v": "DZUKOU_BYPASS", "distance_km": 56.0, "speed_kmh": 40, "name": "Southern Angami Stable Valley Route", "zone_id": "NER-078", "road_type": "State Road"},
    {"u": "DZUKOU_BYPASS", "v": "KOHIMA_CITY", "distance_km": 21.0, "speed_kmh": 36, "name": "Pfutsero-Kohima Ridge Entry", "zone_id": "NER-078", "road_type": "Hill Road"},

    # Mizoram (Lengpui -> Aizawl)
    {"u": "LENGPUI_AIRPORT", "v": "AIZAWL_CITY", "distance_km": 32.0, "speed_kmh": 35, "name": "Lengpui-Aizawl Mountain Highway", "zone_id": "NER-033", "road_type": "Hill Highway"}
]


def build_road_graph() -> nx.Graph:
    G = nx.Graph()
    for node_id, data in NODES_DATA.items():
        G.add_node(node_id, **data)

    for edge in EDGES_DATA:
        u = edge["u"]
        v = edge["v"]
        dist = edge["distance_km"]
        speed = edge.get("speed_kmh", 45)
        travel_time_min = round((dist / speed) * 60, 1)
        
        G.add_edge(
            u, v,
            distance_km=dist,
            travel_time_min=travel_time_min,
            speed_kmh=speed,
            name=edge.get("name", f"{u} to {v}"),
            road_type=edge.get("road_type", "Standard"),
            zone_id=edge.get("zone_id", None)
        )
    return G


def get_available_waypoints() -> List[Dict[str, Any]]:
    return [
        {
            "id": node_id,
            "name": data["name"],
            "lat": data["lat"],
            "lng": data["lng"],
            "region": data.get("region", "NER"),
            "type": data.get("type", "waypoint"),
            "zone_id": data.get("zone_id")
        }
        for node_id, data in NODES_DATA.items()
    ]
