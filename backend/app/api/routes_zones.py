"""
LANDSLIDEGUARD SIH26001 - Real-Time Dynamic Risk Zones API
Scores monitored zones from live rainfall, soil moisture and terrain.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from backend.app.database.store import db_store
from backend.app.models.schemas import RiskZoneSummary
from backend.app.services.weather_service import fetch_live_meteorology
from backend.app.ml.predictor import predict_landslide_risk, categorize_risk_level, get_recommended_action

router = APIRouter(prefix="/api/risk-zones", tags=["Risk Zones"])


from backend.app.services.zone_refresh import refresh_zone
import concurrent.futures


@router.get("", response_model=List[RiskZoneSummary])
def list_risk_zones(
    level: Optional[str] = Query(None, description="Filter by level: LOW, MODERATE, HIGH, CRITICAL"),
    state: Optional[str] = Query(None, description="Filter by state: Meghalaya, Sikkim, Nagaland, etc.")
):
    zones = db_store.get_all_zones()

    # Ingest real-time meteorology concurrently for monitored zones (bounded workers to prevent rate-limiting)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        list(executor.map(refresh_zone, zones))
    db_store.refresh_fusion_and_alerts()
    zones = db_store.get_scored_zones()  # zones still waiting for live data are not shown

    if level:
        zones = [z for z in zones if z["risk_level"] == level.upper()]
    if state:
        zones = [z for z in zones if z["state"].lower() == state.lower()]

    # Sort with highest risk first (safe handling of DATA_INSUFFICIENT / None scores)
    zones.sort(key=lambda x: (x.get("risk_score") is not None, x.get("risk_score") or 0.0), reverse=True)
    return zones


@router.get("/{zone_id}")
def get_risk_zone_detail(zone_id: str):
    zone = db_store.get_zone_by_id(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Risk zone '{zone_id}' not found.")

    # Refresh the stored zone with live data, then return a fresh copy
    refresh_zone(db_store.zones[zone_id])
    zone = db_store.get_zone_by_id(zone_id)

    all_reports = db_store.get_all_reports()
    zone_reports = [r for r in all_reports if r.get("zone_id") == zone_id]

    return {
        "zone": zone,
        "recent_reports": zone_reports,
        "xai": zone.get("xai")
    }
