"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Demo Simulation Stepper & Alert Subscriptions API
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Query
from backend.app.models.schemas import AlertSubscriptionRequest, AlertSubscriptionResponse
from backend.app.database.store import db_store

router = APIRouter(prefix="/api/simulation", tags=["SIH Demo Simulation"])


@router.post("/step/{step_number}")
async def advance_simulation(step_number: int):
    if step_number < 1 or step_number > 12:
        raise HTTPException(status_code=400, detail="Step number must be between 1 and 12.")
    return db_store.run_simulation_step(step_number)


@router.post("/reset")
async def reset_simulation():
    return db_store.reset_demo_scenario()


@router.get("/subscription/{user_id}", response_model=AlertSubscriptionResponse)
async def get_user_subscription(user_id: str):
    return db_store.get_subscription(user_id)


@router.post("/subscription", response_model=AlertSubscriptionResponse)
async def save_user_subscription(payload: AlertSubscriptionRequest):
    return db_store.set_subscription(payload.model_dump())
