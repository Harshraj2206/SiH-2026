"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Analytics & Operational Metrics API
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from backend.app.models.schemas import AnalyticsSummary
from backend.app.database.store import db_store
from backend.app.ml.predictor import get_model

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsSummary)
async def get_analytics_overview():
    zones = db_store.get_scored_zones()
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

    valid_risks = [z["risk_score"] for z in zones if z.get("risk_score") is not None]
    avg_risk = round(sum(valid_risks) / max(1, len(valid_risks)), 1) if valid_risks else 0.0

    # Risk distribution
    risk_distribution = [
        {"level": "CRITICAL (81-100)", "count": crit_cnt, "color": "#ef4444"},
        {"level": "HIGH (61-80)", "count": high_cnt, "color": "#f97316"},
        {"level": "MODERATE (31-60)", "count": mod_cnt, "color": "#eab308"},
        {"level": "LOW (0-30)", "count": low_cnt, "color": "#22c55e"}
    ]

    # Rainfall vs Risk (Safe handling of missing/None observations)
    rainfall_vs_risk = [
        {
            "zone_id": z["zone_id"],
            "name": z["name"].split(" ")[0],
            "rainfall_24h": z["rainfall_24h"] if z.get("rainfall_24h") is not None else 0.0,
            "slope_deg": z["slope_deg"],
            "soil_moisture": round(z["soil_moisture"] * 100) if z.get("soil_moisture") is not None else 0,
            "risk_score": z["risk_score"] if z.get("risk_score") is not None else 0.0,
            "level": z["risk_level"]
        }
        for z in sorted(zones, key=lambda x: (x.get("rainfall_24h") is None, x.get("rainfall_24h") or 0.0))
    ]

    # Reports submitted in the last 24 hours, in 4-hour buckets (UTC times; the UI shows local time)
    now = datetime.now(timezone.utc)
    buckets = []
    for b in range(6):
        start = now - timedelta(hours=24 - 4 * b)
        end = start + timedelta(hours=4)
        in_bucket = []
        for r in reports:
            try:
                created = datetime.fromisoformat(str(r.get("created_at")).replace("Z", "+00:00"))
            except ValueError:
                continue
            if start < created <= end:
                in_bucket.append(r)
        buckets.append({
            "time": end.isoformat(),
            "reports": len(in_bucket),
            "verified": sum(1 for r in in_bucket if r.get("status") == "VERIFIED"),
        })
    reports_timeline = buckets

    # Top critical zones (Safe sorting on optional risk scores)
    top_critical_zones = [
        {
            "zone_id": z["zone_id"],
            "name": z["name"],
            "state": z["state"],
            "risk_score": z["risk_score"] if z.get("risk_score") is not None else 0.0,
            "ml_base": z.get("ml_base_score"),
            "community_boost": z.get("community_boost", 0.0),
            "rainfall_24h": z.get("rainfall_24h"),
            "slope_deg": z["slope_deg"],
            "soil_moisture": z.get("soil_moisture"),
            "verified_reports": z.get("verified_report_count", 0)
        }
        for z in sorted(zones, key=lambda x: (x.get("risk_score") is not None, x.get("risk_score") or 0.0), reverse=True)[:5]
    ]

    # Feature importance
    feature_importance_list = []
    if metadata and "feature_importances" in metadata:
        feat_names = {
            "slope_deg": "Slope",
            "pore_slope_interaction": "Soil moisture × slope",
            "historical_incidents": "Past landslides nearby",
            "elevation_amsl": "Elevation",
            "rainfall_72h": "Rain, 72 h",
            "rainfall_24h": "Rain, 24 h",
            "antecedent_rain_index": "Recent rain index",
            "soil_moisture": "Soil moisture",
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
