"""
LANDSAFE - Landslide Early Warning & Emergency Response System
GDACS-Style Incidents & Event Explorer API
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status
from backend.app.models.schemas import IncidentCreate, IncidentUpdate, IncidentResponse
from backend.app.core.security import get_current_user_optional, require_roles
from backend.app.database.store import db_store

router = APIRouter(prefix="/api/incidents", tags=["Incidents & Events"])


@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status: DETECTED, VERIFIED, RESPONDING, EVACUATING, RESOLVED"),
    severity: Optional[str] = Query(None, description="Filter by severity: CRITICAL, HIGH, MODERATE, LOW")
):
    return db_store.get_all_incidents(status_filter=status, severity_filter=severity)


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: str):
    inc = db_store.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return inc


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_new_incident(
    payload: IncidentCreate,
    current_user: dict = Depends(require_roles(["AUTHORITY", "ADMIN"]))
):
    return db_store.create_incident(payload.model_dump())


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident_status(
    incident_id: str,
    payload: IncidentUpdate,
    current_user: dict = Depends(require_roles(["AUTHORITY", "ADMIN"]))
):
    try:
        updated = db_store.update_incident(incident_id, payload.model_dump(exclude_unset=True))
        return updated
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
