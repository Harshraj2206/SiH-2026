"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Analytics & Operational Metrics API
"""

from fastapi import APIRouter
from backend.app.models.schemas import AnalyticsSummary
from backend.app.database.store import db_store
from backend.app.ml.predictor import get_model

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsSummary)
async def get_analytics_overview():
    zones = db_store.get_all_zones()
    reports = db_store.get_all_reports()
    alerts = db_store.get_all_alerts()
    incidents = db_store.get_all_incidents()
    sos_list = db_store.get_all_sos()
    roads = db_store.get_all_roads()
    teams = db_store.get_all_rescue_teams()
    _, metadata = get_model()

    crit_cnt = sum(1 for z in zones if z["risk_level"] == "CRITICAL")
    high_cnt = sum(1 for z in zones if z["risk_level"] == "HIGH")
    mod_cnt = sum(1 for z in zones if z["risk_level"] == "MODERATE")
    low_cnt = sum(1 for z in zones if z["risk_level"] == "LOW")

    ver_reports = sum(1 for r in reports if r.get("status") == "VERIFIED")
    pen_reports = sum(1 for r in reports if r.get("status") == "PENDING")

    active_incidents = sum(1 for i in incidents if i.get("status") != "RESOLVED")
    active_sos = sum(1 for s in sos_list if s.get("status") in ["RESPONSE_REQUESTED", "DISPATCHED", "IN_PROGRESS"])
    blocked_roads = sum(1 for rd in roads if rd.get("status") == "BLOCKED")
    deployed_teams = sum(1 for tm in teams if tm.get("status") in ["DISPATCHED", "ON_SITE"])

    avg_risk = round(sum(z["risk_score"] for z in zones) / max(1, len(zones)), 1)

    # Risk distribution
    risk_distribution = [
        {"level": "CRITICAL (81-100)", "count": crit_cnt, "color": "#ef4444"},
        {"level": "HIGH (61-80)", "count": high_cnt, "color": "#f97316"},
        {"level": "MODERATE (31-60)", "count": mod_cnt, "color": "#eab308"},
        {"level": "LOW (0-30)", "count": low_cnt, "color": "#22c55e"}
    ]

    # Rainfall vs Risk
    rainfall_vs_risk = [
        {
            "zone_id": z["zone_id"],
            "name": z["name"].split(" ")[0],
            "rainfall_24h": z["rainfall_24h"],
            "slope_deg": z["slope_deg"],
            "soil_moisture": round(z["soil_moisture"] * 100),
            "risk_score": z["risk_score"],
            "level": z["risk_level"]
        }
        for z in sorted(zones, key=lambda x: x["rainfall_24h"])
    ]

    # Reports timeline
    reports_timeline = [
        {"time": "06:00", "reports": 1, "verified": 1},
        {"time": "09:00", "reports": 2, "verified": 2},
        {"time": "12:00", "reports": 4, "verified": 3},
        {"time": "15:00", "reports": 6, "verified": 4},
        {"time": "18:00", "reports": max(8, len(reports)), "verified": ver_reports},
        {"time": "Current", "reports": len(reports), "verified": ver_reports}
    ]

    # Top critical zones
    top_critical_zones = [
        {
            "zone_id": z["zone_id"],
            "name": z["name"],
            "state": z["state"],
            "risk_score": z["risk_score"],
            "ml_base": z["ml_base_score"],
            "community_boost": z["community_boost"],
            "rainfall_24h": z["rainfall_24h"],
            "slope_deg": z["slope_deg"],
            "soil_moisture": z["soil_moisture"],
            "verified_reports": z["verified_report_count"]
        }
        for z in sorted(zones, key=lambda x: x["risk_score"], reverse=True)[:5]
    ]

    # Feature importance
    feature_importance_list = []
    if metadata and "feature_importances" in metadata:
        feat_names = {
            "slope_deg": "Slope Angle (°)",
            "rainfall_72h": "72h Antecedent Rainfall (mm)",
            "rainfall_24h": "24h Intense Precipitation (mm)",
            "soil_moisture": "Volumetric Soil Moisture (%)",
            "historical_incidents": "Historical Incident Frequency",
            "ndvi": "Vegetation Cover (NDVI Proxy)"
        }
        for k, v in metadata["feature_importances"].items():
            feature_importance_list.append({
                "factor": feat_names.get(k, k),
                "weight": round(v * 100, 1)
            })
        feature_importance_list.sort(key=lambda x: x["weight"], reverse=True)

    return AnalyticsSummary(
        total_zones=len(zones),
        critical_zones_count=crit_cnt,
        high_risk_zones_count=high_cnt,
        moderate_zones_count=mod_cnt,
        low_risk_zones_count=low_cnt,
        total_reports=len(reports),
        verified_reports=ver_reports,
        pending_reports=pen_reports,
        active_alerts=len(alerts),
        active_incidents_count=active_incidents,
        active_sos_count=active_sos,
        blocked_roads_count=blocked_roads,
        deployed_rescue_teams_count=deployed_teams,
        average_region_risk=avg_risk,
        risk_distribution=risk_distribution,
        rainfall_vs_risk=rainfall_vs_risk,
        reports_timeline=reports_timeline,
        top_critical_zones=top_critical_zones,
        feature_importance=feature_importance_list
    )
