"""
LANDSAFE - Landslide Early Warning & Emergency Response Platform
SIH Problem Statement: SIH26001 (North Eastern Region & Himalayan Belt)
Disaster Management Triad: PREDICT -> ROUTE -> VERIFY -> RESCUE
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.routes_auth import router as auth_router
from backend.app.api.routes_zones import router as zones_router
from backend.app.api.routes_predict import router as predict_router
from backend.app.api.routes_routing import router as routing_router
from backend.app.api.routes_reports import router as reports_router
from backend.app.api.routes_incidents import router as incidents_router
from backend.app.api.routes_sos import router as sos_router
from backend.app.api.routes_rescue import router as rescue_router
from backend.app.api.routes_resources import router as resources_router
from backend.app.api.routes_post_disaster import router as post_disaster_router
from backend.app.api.routes_alerts import router as alerts_router
from backend.app.api.routes_analytics import router as analytics_router
from backend.app.api.routes_simulation import router as simulation_router
from backend.app.api.routes_data_sources import router as data_sources_router
from backend.app.api.routes_location_intelligence import router as location_intelligence_router
from backend.app.database.store import db_store

app = FastAPI(
    title="LANDSAFE API - SIH 2026",
    description="AI-Assisted Landslide Early Warning, Dynamic Safe Routing, GDACS-Style Event Explorer, Emergency SOS Triage & Rescue Command Platform (SIH26001)",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth_router)
app.include_router(zones_router)
app.include_router(predict_router)
app.include_router(routing_router)
app.include_router(reports_router)
app.include_router(incidents_router)
app.include_router(sos_router)
app.include_router(rescue_router)
app.include_router(resources_router)
app.include_router(post_disaster_router)
app.include_router(alerts_router)
app.include_router(analytics_router)
app.include_router(simulation_router)
app.include_router(data_sources_router)
app.include_router(location_intelligence_router)


@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "online",
        "system": "LANDSAFE",
        "tagline": "Predict Early. Warn Faster. Rescue Smarter.",
        "sih_problem_code": "SIH26001",
        "region": "North Eastern Region (NER) & Himalayan Belt",
        "theme": "Disaster Management",
        "ml_engine": "RandomForestRegressor (Loaded)",
        "routing_engine": "NetworkX Risk & Blockage-Weighted Dijkstra (Ready)",
        "active_zones_monitored": len(db_store.get_all_zones()),
        "active_incidents": len(db_store.get_all_incidents()),
        "active_sos_requests": len(db_store.get_all_sos()),
        "active_rescue_teams": len(db_store.get_all_rescue_teams()),
        "hospitals_cataloged": len(db_store.get_all_hospitals()),
        "shelters_cataloged": len(db_store.get_all_shelters()),
        "active_alerts": len(db_store.get_all_alerts()),
        "demo_mode": True
    }


@app.post("/api/demo/reset", tags=["System"])
async def reset_demo_state():
    return db_store.reset_demo_scenario()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
