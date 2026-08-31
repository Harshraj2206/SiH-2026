"""
LANDSAFE - Unified Location Intelligence API Routes
Single source of truth endpoint returning validated, normalized, source-attributed data
for any geographic location on Earth.
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Query, HTTPException
from backend.app.services.data_source_orchestrator import orchestrate_location_intelligence
from backend.app.services.global_routing_service import get_coordinates_from_query

router = APIRouter(prefix="/api/location-intelligence", tags=["Location Intelligence"])


class LocationSearchRequest(BaseModel):
    query: str


@router.get("")
def get_location_intelligence(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude coordinate on Earth (-90.0 to 90.0)"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude coordinate on Earth (-180.0 to 180.0)"),
    source: Optional[str] = Query("Map Inspection / GPS", description="Origin of the coordinates")
):
    try:
        data = orchestrate_location_intelligence(lat, lng, source=source)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Location Intelligence error: {str(e)}")


@router.post("/search")
def search_and_get_intelligence(payload: LocationSearchRequest):
    geo = get_coordinates_from_query(payload.query)
    if not geo:
        raise HTTPException(status_code=404, detail=f"Location '{payload.query}' could not be resolved.")
    
    try:
        data = orchestrate_location_intelligence(geo["lat"], geo["lng"], source=f"Search: {payload.query}")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Location Intelligence error: {str(e)}")

