"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Demo Simulation Stepper & Alert Subscriptions API
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from backend.app.models.schemas import AlertSubscriptionRequest, AlertSubscriptionResponse
from backend.app.core.security import get_current_user, require_roles
from backend.app.database.store import db_store

router = APIRouter(prefix="/api/simulation", tags=["SIH Demo Simulation"])


@router.post("/step/{step_number}")
async def advance_simulation(
    step_number: int,
    current_user: dict = Depends(require_roles(["ADMIN", "AUTHORITY"]))
):
    """Restricted to Admin / Authority to prevent unauthorized global state manipulation."""
    if step_number < 1 or step_number > 12:
        raise HTTPException(status_code=400, detail="Step number must be between 1 and 12.")
    return db_store.run_simulation_step(step_number)


@router.post("/reset")
async def reset_simulation(
    current_user: dict = Depends(require_roles(["ADMIN", "AUTHORITY"]))
):
    """Restricted to Admin / Authority to prevent unauthorized global state reset."""
    return db_store.reset_demo_scenario()


@router.get("/subscription/{user_id}", response_model=AlertSubscriptionResponse)
async def get_user_subscription(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Protected against IDOR: Users can only retrieve their own subscription preferences."""
    if current_user["id"] != user_id and current_user.get("role") not in ["ADMIN", "AUTHORITY"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view another user's alert subscription."
        )
    return db_store.get_subscription(user_id)


@router.post("/subscription", response_model=AlertSubscriptionResponse)
async def save_user_subscription(
    payload: AlertSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Protected against IDOR: Users can only update their own subscription preferences."""
    target_user_id = payload.user_id
    if current_user["id"] != target_user_id and current_user.get("role") not in ["ADMIN", "AUTHORITY"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot modify another user's alert subscription."
        )
    return db_store.set_subscription(payload.model_dump())
