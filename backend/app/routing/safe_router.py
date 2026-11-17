"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Risk-Aware & Blockage-Aware Graph Routing Engine using NetworkX
Dijkstra / A* path computation with dynamic terrain risk and road obstruction penalties
"""

from typing import Dict, List, Any, Optional
import networkx as nx
from backend.app.routing.road_network import build_road_graph, NODES_DATA


def calculate_segment_risk(edge_data: Dict[str, Any], zone_risks: Dict[str, float]) -> Optional[float]:
    """Risk score of the zone this road passes through, or None when it has no score."""
    score = zone_risks.get(edge_data.get("zone_id"))
    return None if score is None else float(score)


def compute_route_details(
    G: nx.Graph,
    path_nodes: List[str],
    zone_risks: Dict[str, float],
    road_statuses: Optional[Dict[str, Dict[str, Any]]] = None
) -> Dict[str, Any]:
    total_dist = 0.0
    total_time = 0.0
    risk_scores = []
    zones_crossed = []
    blocked_roads_avoided = []
    coordinates = []
    segments = []

    for i in range(len(path_nodes)):
        u = path_nodes[i]
        u_data = G.nodes[u]
        coordinates.append({"lat": u_data["lat"], "lng": u_data["lng"], "name": u_data["name"], "id": u})

        if i < len(path_nodes) - 1:
            v = path_nodes[i + 1]
            edge = G[u][v]
            dist = edge["distance_km"]
            time_m = edge["travel_time_min"]
            total_dist += dist
            total_time += time_m

            seg_risk = calculate_segment_risk(edge, zone_risks)
            if seg_risk is not None:
                risk_scores.append(seg_risk)

            zone_id = edge.get("zone_id")
            if zone_id and zone_id not in zones_crossed:
                zones_crossed.append(zone_id)

            # Check road status
            status = "OPEN"
            road_id = None
            if road_statuses:
                key1 = f"{u}_{v}"
                key2 = f"{v}_{u}"
                r_info = road_statuses.get(key1) or road_statuses.get(key2)
                if r_info:
                    status = r_info.get("status", "OPEN")
                    road_id = r_info.get("road_id")

            segments.append({
                "from_node": u,
                "to_node": v,
                "from_name": u_data["name"],
                "to_name": G.nodes[v]["name"],
                "road_id": road_id,
                "road_name": edge.get("name", "Corridor"),
                "distance_km": dist,
                "travel_time_min": time_m,
                "risk_score": seg_risk,
                "road_status": status,
                "zone_id": zone_id
            })

    avg_risk = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else None
    max_risk = max(risk_scores) if risk_scores else None

    if avg_risk is None:
        safety_level = "NO RISK DATA"
    elif avg_risk <= 30.0:
        safety_level = "LOW RISK"
    elif avg_risk <= 60.0:
        safety_level = "MODERATE RISK"
    elif avg_risk <= 80.0:
        safety_level = "HIGH RISK"
    else:
        safety_level = "CRITICAL RISK"

    return {
        "nodes": path_nodes,
        "distance_km": round(total_dist, 1),
        "travel_time_min": round(total_time),
        "average_risk": avg_risk,
        "max_risk": max_risk,
        "safety_level": safety_level,
        "zones_crossed": zones_crossed,
        "blocked_roads_avoided": blocked_roads_avoided,
        "coordinates": coordinates,
        "segments": segments
    }


def find_safe_and_fastest_routes(
    start_node: str,
    dest_node: str,
    zone_risks: Optional[Dict[str, float]] = None,
    road_statuses: Optional[Dict[str, Dict[str, Any]]] = None
) -> Dict[str, Any]:
    if zone_risks is None:
        zone_risks = {}
    if road_statuses is None:
        road_statuses = {}

    G = build_road_graph()

    if start_node not in G.nodes:
        raise ValueError(f"Start location '{start_node}' is not in the road network.")
    if dest_node not in G.nodes:
        raise ValueError(f"Destination location '{dest_node}' is not in the road network.")
    if start_node == dest_node:
        raise ValueError("Start and destination cannot be identical.")

    if not nx.has_path(G, start_node, dest_node):
        raise ValueError(f"No reachable road path found between {start_node} and {dest_node}.")

    # 1. Fastest Route (Unweighted distance baseline)
    fastest_path_nodes = nx.shortest_path(G, source=start_node, target=dest_node, weight="distance_km")
    fastest_route = compute_route_details(G, fastest_path_nodes, zone_risks, road_statuses)

    # 2. Risk-Aware & Blockage-Aware Weight Function
    def safe_route_weight_func(u, v, d):
        base_dist = d["distance_km"]
        seg_risk = calculate_segment_risk(d, zone_risks) or 0.0

        # Check real-time road obstruction status
        key1 = f"{u}_{v}"
        key2 = f"{v}_{u}"
        r_info = road_statuses.get(key1) or road_statuses.get(key2)
        r_status = r_info.get("status", "OPEN") if r_info else "OPEN"

        # Complete blockade penalty
        if r_status == "BLOCKED":
            return base_dist * 1000.0  # Massive penalty forcing avoidance
        elif r_status == "DANGEROUS":
            penalty_status = 8.0
        elif r_status == "SLOW":
            penalty_status = 2.0
        else:
            penalty_status = 0.0

        # Terrain Risk non-linear penalty factor
        if seg_risk >= 80.0:
            penalty_risk = 30.0 * ((seg_risk / 100.0) ** 2)
        elif seg_risk >= 60.0:
            penalty_risk = 8.0 * ((seg_risk / 100.0) ** 2)
        elif seg_risk >= 30.0:
            penalty_risk = 2.5 * ((seg_risk / 100.0) ** 2)
        else:
            penalty_risk = 0.2 * (seg_risk / 100.0)

        return base_dist * (1.0 + penalty_risk + penalty_status)

    try:
        safe_path_nodes = nx.shortest_path(G, source=start_node, target=dest_node, weight=safe_route_weight_func)
    except nx.NetworkXNoPath:
        safe_path_nodes = fastest_path_nodes

    safe_route = compute_route_details(G, safe_path_nodes, zone_risks, road_statuses)

    # Calculate differences
    dist_delta = round(safe_route["distance_km"] - fastest_route["distance_km"], 1)
    time_delta = safe_route["travel_time_min"] - fastest_route["travel_time_min"]
    if fastest_route["average_risk"] is None or safe_route["average_risk"] is None:
        risk_reduction = None
    else:
        risk_reduction = round(fastest_route["average_risk"] - safe_route["average_risk"], 1)

    # Avoided high risk zones
    fastest_high_risk = [z for z in fastest_route["zones_crossed"] if zone_risks.get(z, 0) >= 60.0]
    safe_high_risk = [z for z in safe_route["zones_crossed"] if zone_risks.get(z, 0) >= 60.0]
    avoided_zones = [z for z in fastest_high_risk if z not in safe_high_risk]

    # Blocked roads avoided
    avoided_blocked_roads = []
    for seg in fastest_route["segments"]:
        if seg.get("road_status") == "BLOCKED":
            avoided_blocked_roads.append(seg.get("road_name"))

    is_fallback = False
    if safe_route["average_risk"] is None:
        explanation = "No risk score is available yet for the zones on this route, so the shortest road is shown."
    elif safe_route["average_risk"] >= 60.0:
        is_fallback = True
        explanation = (
            f"Every route here passes through high-risk ground. "
            f"Showing the lowest-risk option (average risk {safe_route['average_risk']}/100)."
        )
    elif fastest_path_nodes == safe_path_nodes:
        explanation = (
            f"The shortest road ({safe_route['distance_km']} km) is also the lowest-risk one."
        )
    else:
        avoid_str = ""
        if avoided_blocked_roads:
            avoid_str = f"bypasses {len(avoided_blocked_roads)} blocked road section(s) ({', '.join(avoided_blocked_roads)}) and "
        avoid_str += f"avoids {len(avoided_zones)} high-risk zone(s)" + (f" ({', '.join(avoided_zones)})" if avoided_zones else "")

        explanation = (
            f"The safer route is {abs(dist_delta)} km {'longer' if dist_delta > 0 else 'shorter'} "
            f"({abs(time_delta)} min difference) and {avoid_str}, lowering average risk by {max(0.0, risk_reduction or 0.0)} points."
        )

    return {
        "start": {
            "id": start_node,
            "name": NODES_DATA[start_node]["name"],
            "lat": NODES_DATA[start_node]["lat"],
            "lng": NODES_DATA[start_node]["lng"]
        },
        "destination": {
            "id": dest_node,
            "name": NODES_DATA[dest_node]["name"],
            "lat": NODES_DATA[dest_node]["lat"],
            "lng": NODES_DATA[dest_node]["lng"]
        },
        "fastest_route": fastest_route,
        "safe_route": safe_route,
        "comparison": {
            "distance_delta_km": dist_delta,
            "time_delta_min": time_delta,
            "risk_reduction_points": risk_reduction,
            "avoided_zones_count": len(avoided_zones),
            "avoided_zones": avoided_zones,
            "avoided_blocked_roads": avoided_blocked_roads,
            "is_identical": fastest_path_nodes == safe_path_nodes,
            "is_fallback": is_fallback,
            "explanation": explanation
        }
    }
