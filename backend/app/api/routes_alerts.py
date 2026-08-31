"""
Landslide Early Warning System - Alerts API
"""

from typing import List, Optional
from fastapi import APIRouter, Query
from backend.app.models.schemas import AlertItem
from backend.app.database.store import db_store

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertItem])
async def list_active_alerts(
    category: Optional[str] = Query(None, description="CRITICAL, HIGH, MODERATE, INFORMATION")
):
    alerts = db_store.get_all_alerts(category_filter=category)
    return alerts
