"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Emergency Resources API: Roads & Blockages, Hospitals, and Evacuation Shelters
"""

from typing import List
from fastapi import APIRouter, HTTPException, Depends
from backend.app.models.schemas import (
    RoadResponse,
    RoadStatusUpdate,
    HospitalResponse,
    ShelterResponse
)
from backend.app.core.security import require_roles
from backend.app.database.store import db_store

router = APIRouter(prefix="/api/resources", tags=["Emergency Resources"])


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
