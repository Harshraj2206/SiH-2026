"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Rescue Operations & Multi-Agency Dispatch Center API
"""

from typing import List
from fastapi import APIRouter, HTTPException, Depends
from backend.app.models.schemas import RescueTeamUpdate, RescueTeamResponse
from backend.app.core.security import require_roles
from backend.app.database.store import db_store

router = APIRouter(prefix="/api/rescue-teams", tags=["Rescue Operations"])


@router.get("", response_model=List[RescueTeamResponse])
async def list_rescue_teams():
    return db_store.get_all_rescue_teams()


@router.patch("/{team_id}", response_model=RescueTeamResponse)
async def update_team_mission(
    team_id: str,
    payload: RescueTeamUpdate,
    current_user: dict = Depends(require_roles(["AUTHORITY", "ADMIN"]))
):
    try:
        updated = db_store.update_rescue_team(team_id, payload.model_dump(exclude_unset=True))
        return updated
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
