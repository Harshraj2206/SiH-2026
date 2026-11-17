"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Safe Routing API with worldwide real road networks and hazard avoidance
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from backend.app.routing.road_network import get_available_waypoints
from backend.app.routing.safe_router import find_safe_and_fastest_routes
from backend.app.services.global_routing_service import calculate_global_road_route, get_coordinates_from_query
from backend.app.database.store import db_store

router = APIRouter(prefix="/api/safe-route", tags=["Safe Routing"])


class PresetRouteRequest(BaseModel):
    start_node: str
    destination_node: str
    avoid_blocked_roads: bool = True


class GlobalRouteRequest(BaseModel):
    start_lat: float = Field(..., ge=-90.0, le=90.0)
    start_lng: float = Field(..., ge=-180.0, le=180.0)
    dest_lat: float = Field(..., ge=-90.0, le=90.0)
    dest_lng: float = Field(..., ge=-180.0, le=180.0)
    start_name: Optional[str] = "Origin"
    dest_name: Optional[str] = "Destination"


class GeocodeRequest(BaseModel):
    query: str


@router.get("/waypoints", response_model=List[Dict[str, Any]])
def list_routing_waypoints():
    return get_available_waypoints()


@router.post("/geocode")
def geocode_place(payload: GeocodeRequest):
    result = get_coordinates_from_query(payload.query)
    if not result:
        raise HTTPException(status_code=404, detail=f"Location '{payload.query}' not found.")
    return result


@router.post("/global")
def compute_global_route(payload: GlobalRouteRequest):
    try:
        res = calculate_global_road_route(
            start_lat=payload.start_lat,
            start_lng=payload.start_lng,
            dest_lat=payload.dest_lat,
            dest_lng=payload.dest_lng,
            start_name=payload.start_name or "Origin",
            dest_name=payload.dest_name or "Destination"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Global routing error: {str(e)}")



@router.post("")
async def calculate_safe_route(payload: PresetRouteRequest):
    try:
        active_zone_risks = db_store.get_zone_risk_map()
        active_road_statuses = db_store.get_road_status_map()
        route_result = find_safe_and_fastest_routes(
            start_node=payload.start_node,
            dest_node=payload.destination_node,
            zone_risks=active_zone_risks,
            road_statuses=active_road_statuses if payload.avoid_blocked_roads else {}
        )
        return route_result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing computation error: {str(e)}")
