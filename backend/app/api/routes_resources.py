"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Emergency Resources API: Roads & Blockages, Hospitals, and Evacuation Shelters
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from backend.app.models.schemas import (
    RoadResponse,
    RoadStatusUpdate,
    HospitalResponse,
    ShelterResponse
)
from backend.app.core.security import require_roles
from backend.app.database.store import db_store
from backend.app.services.google_places_service import discover_nearby_emergency_resources

router = APIRouter(prefix="/api/resources", tags=["Emergency Resources"])


# ---------------- Live Location-Aware Emergency Resource Discovery ----------------
@router.get("/nearby")
def get_nearby_emergency_resources(
    request: Request,
    lat: float = Query(..., ge=-90.0, le=90.0, description="User latitude"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="User longitude"),
    radius_km: float = Query(5.0, ge=1.0, le=50.0, description="Search radius in kilometers (1 to 50)"),
    category: str = Query("hospitals", description="hospitals, police, fire, shelters, ambulance, blood_bank, all"),
    keyword: Optional[str] = Query(None, description="Optional search filter keyword"),
    api_key_override: Optional[str] = Query(None, description="Optional client-provided Google Maps API key")
):
    """
    Search real emergency facilities (hospitals, trauma centers, police, fire stations, shelters)
    near ANY GPS coordinates in India or worldwide using Google Places API (New) with authentic
    open geospatial fallback. Never returns fake or static out-of-region data.
    """
    effective_key = request.headers.get("X-Google-Maps-Key") or api_key_override

    clean_category = category.lower().strip()
    valid_categories = {
        "hospitals", "hospital", "police", "fire", "shelters",
        "shelter", "ambulance", "blood_bank", "all", "all emergency", "all_emergency"
    }
    if clean_category not in valid_categories:
        clean_category = "hospitals"

    try:
        data = discover_nearby_emergency_resources(
            latitude=lat,
            longitude=lng,
            radius_km=radius_km,
            category=clean_category,
            keyword=keyword,
            api_key_override=effective_key
        )
        return data
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Emergency resource discovery failed: {str(e)}")


# ---------------- Roads & Blockages ----------------
@router.get("/roads", response_model=List[RoadResponse])
async def list_all_roads():
    return db_store.get_all_roads()


@router.patch("/roads/{road_id}", response_model=RoadResponse)
async def update_road_obstruction(
    road_id: str,
    payload: RoadStatusUpdate,
    current_user: dict = Depends(require_roles(["AUTHORITY", "ADMIN"]))
):
    try:
        updated = db_store.update_road_status(
            road_id=road_id,
            status=payload.status,
            reason=payload.obstruction_reason
        )
        return updated
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------------- Hospitals ----------------
@router.get("/hospitals", response_model=List[HospitalResponse])
async def list_all_hospitals():
    return db_store.get_all_hospitals()


# ---------------- Shelters ----------------
@router.get("/shelters", response_model=List[ShelterResponse])
async def list_all_shelters():
    return db_store.get_all_shelters()
