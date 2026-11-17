"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Emergency SOS & Multi-Agency Triage Dispatch API
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status, Request
from backend.app.models.schemas import SOSCreate, SOSTriageUpdate, SOSResponse
from backend.app.core.security import get_current_user_optional, require_roles
from backend.app.core.rate_limiter import check_auth_rate_limit
from backend.app.database.store import db_store

router = APIRouter(prefix="/api/sos", tags=["Emergency SOS & Triage"])


@router.get("", response_model=List[SOSResponse])
async def list_sos_requests(
    triage: Optional[str] = Query(None, description="Filter by triage priority: CRITICAL, URGENT, EVACUATION, SAFE"),
    current_user: dict = Depends(require_roles(["AUTHORITY", "ADMIN"]))
):
    return db_store.get_all_sos(triage_filter=triage)


@router.post("", response_model=SOSResponse, status_code=status.HTTP_201_CREATED)
async def trigger_emergency_sos(
    payload: SOSCreate,
    request: Request,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Rate-limited: 5 distress broadcasts/minute per IP to prevent flood attacks."""
    check_auth_rate_limit(request, max_attempts=5, window_seconds=60, action_name="sos-broadcast")
    return db_store.add_sos_request(payload.model_dump(), user=current_user)


@router.patch("/{sos_id}/triage", response_model=SOSResponse)
async def triage_sos(
    sos_id: str,
    payload: SOSTriageUpdate,
    current_user: dict = Depends(require_roles(["AUTHORITY", "ADMIN"]))
):
    try:
        updated = db_store.triage_sos_request(sos_id, payload.model_dump(exclude_unset=True))
        return updated
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
