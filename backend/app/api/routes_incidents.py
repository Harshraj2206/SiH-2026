"""
LANDSAFE - Landslide Early Warning & Emergency Response System
GDACS-Style Incidents & Event Explorer API
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from backend.app.models.schemas import (
    IncidentCreate, 
    IncidentUpdate, 
    IncidentResponse, 
    LandslideRiskForecast, 
    IndiaWideIntelligenceResponse
)
from backend.app.core.security import get_current_user_optional, require_roles
from backend.app.database.store import db_store
from backend.app.services.landslide_intelligence_service import landslide_intelligence_pipeline

router = APIRouter(prefix="/api/incidents", tags=["Incidents & Events"])


@router.get("/intelligence", response_model=IndiaWideIntelligenceResponse)
def get_india_wide_intelligence(
    force_refresh: bool = Query(False, description="Bypass cache and poll live authoritative sources")
):
    """
    Unified India-Wide Landslide Intelligence Feed.
    Aggregates GSI / NLFC, ISRO / NRSC NDEM, IMD Severe Weather Warnings, and GDACS/NASA EONET.
    Provides verified confirmed incidents, predictive forecast risks, historical records, and demo drills.
    """
    return landslide_intelligence_pipeline.get_unified_intelligence(force_refresh=force_refresh)


@router.get("/proximity")
def get_user_proximity_advisory(
    lat: float = Query(..., ge=-90.0, le=90.0, description="User latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="User longitude")
):
    """
    Calculate proximity to nearest verified landslide incident or forecast risk zone.
    Returns scientifically grounded advisory without false reassurances.
    """
    return landslide_intelligence_pipeline.calculate_user_proximity_advisory(user_lat=lat, user_lon=lon)


@router.post("/refresh")
def refresh_intelligence_pipeline(
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Manually trigger authoritative pipeline refresh and sync latest telemetries.
    """
    return landslide_intelligence_pipeline.get_unified_intelligence(force_refresh=True)


@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status: DETECTED, VERIFIED, RESPONDING, EVACUATING, RESOLVED"),
    severity: Optional[str] = Query(None, description="Filter by severity: CRITICAL, HIGH, MODERATE, LOW"),
    category: Optional[str] = Query(None, description="Filter by category: CONFIRMED_INCIDENT, FORECAST_RISK, DEMO_SIMULATION"),
    state: Optional[str] = Query(None, description="Filter by state name"),
    include_simulations: bool = Query(True, description="Whether to include pre-seeded simulation records")
):
    """
    List incidents with multi-parameter filtration.
    Combines verified confirmed incidents with pre-seeded simulations if requested.
    """
    # Fetch verified live incidents from authoritative pipeline
    intel = landslide_intelligence_pipeline.get_unified_intelligence()
    confirmed = intel.get("confirmed_incidents", [])

    # Seeded/stored incidents
    stored = db_store.get_all_incidents(
        status_filter=status, 
        severity_filter=severity,
        category_filter=category,
        state_filter=state,
        include_simulations=include_simulations
    )

    # Merge and deduplicate by incident_id
    seen_ids = set()
    combined: List[Dict[str, Any]] = []

    # If asking for simulation only
    if category and category.upper() == "DEMO_SIMULATION":
        return stored

    # Add verified confirmed first
    for c in confirmed:
        if c["incident_id"] not in seen_ids:
            if status and status.upper() != "ALL" and c.get("status") != status.upper():
                continue
            if severity and severity.upper() != "ALL" and c.get("severity") != severity.upper():
                continue
            if state and state.upper() != "ALL" and c.get("state", "").lower() != state.lower():
                continue
            seen_ids.add(c["incident_id"])
            combined.append(c)

    # Add stored simulation scenarios if enabled
    if include_simulations:
        for s in stored:
            if s["incident_id"] not in seen_ids:
                seen_ids.add(s["incident_id"])
                combined.append(s)

    return combined


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str):
    # Check in stored
    inc = db_store.get_incident_by_id(incident_id)
    if not inc:
        # Check in authoritative pipeline
        intel = landslide_intelligence_pipeline.get_unified_intelligence()
        for c in intel.get("confirmed_incidents", []):
            if c["incident_id"] == incident_id:
                return c
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
