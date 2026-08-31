"""
Landslide Early Warning System - Community Ground Reports API
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status
from backend.app.models.schemas import (
    CommunityReportCreate,
    CommunityReportResponse,
    CommunityReportVerification
)
from backend.app.core.security import get_current_user_optional, require_roles
from backend.app.database.store import db_store

router = APIRouter(prefix="/api/reports", tags=["Community Reports"])


@router.get("", response_model=List[CommunityReportResponse])
async def list_community_reports(
    status: Optional[str] = Query(None, description="Filter by status: PENDING, VERIFIED, REJECTED"),
    zone_id: Optional[str] = Query(None, description="Filter by zone ID")
):
    reports = db_store.get_all_reports(status_filter=status)
    if zone_id:
        reports = [r for r in reports if r.get("zone_id") == zone_id]
    return reports


@router.post("", response_model=CommunityReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_community_report(
    report_data: CommunityReportCreate,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    user_info = current_user or {
        "id": "usr-resident-crowd",
        "username": "community_reporter",
        "full_name": "Field Resident",
        "role": "RESIDENT"
    }

    new_report = db_store.add_community_report(
        report_data=report_data.model_dump(),
        user=user_info
    )
    return new_report


@router.patch("/{report_id}/verify", response_model=CommunityReportResponse)
async def verify_report_status(
    report_id: str,
    payload: CommunityReportVerification,
    current_user: dict = Depends(require_roles(["AUTHORITY", "ADMIN"]))
):
    """
    Authority / Admin endpoint to verify or reject field reports.
    Verifying reports dynamically triggers the AI + Community Fusion engine.
    """
    if payload.status.upper() not in ["VERIFIED", "REJECTED"]:
        raise HTTPException(
            status_code=400,
            detail="Verification status must be either 'VERIFIED' or 'REJECTED'."
        )

    try:
        updated_rep = db_store.verify_community_report(
            report_id=report_id,
            verification_status=payload.status,
            reviewer_user=current_user,
            reviewer_notes=payload.reviewer_notes
        )
        return updated_rep
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/poll", response_model=dict)
async def get_community_poll():
    """
    Get active daily community landslide poll and response tallies.
    """
    return db_store.get_community_poll()


@router.post("/poll/vote", response_model=dict)
async def vote_community_poll(payload: dict):
    """
    Vote on active community poll ('yes', 'no', 'unsure').
    """
    option_id = payload.get("option_id", "yes")
    return db_store.vote_community_poll(option_id)

