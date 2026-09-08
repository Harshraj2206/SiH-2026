"""
LANDSAFE - Landslide Early Warning & Emergency Response Platform
SIH Problem Statement: SIH26001 (North Eastern Region & Himalayan Belt)
Disaster Management Triad: PREDICT -> ROUTE -> VERIFY -> RESCUE
"""

import sys
import os
import uuid
import logging

# Ensure both backend and workspace root directories are in sys.path for universal imports
_APP_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_APP_DIR)
_ROOT_DIR = os.path.dirname(_BACKEND_DIR)
for _p in [_ROOT_DIR, _BACKEND_DIR, _APP_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.core.config import (
    ENVIRONMENT,
    IS_PRODUCTION,
    ALLOWED_ORIGINS
)
from backend.app.core.security_headers import SecurityHeadersMiddleware

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

# Configure Structured Server-Side Logging
logging.basicConfig(
    level=logging.INFO if IS_PRODUCTION else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] [CorrID: %(correlation_id)s] %(message)s" if IS_PRODUCTION else "%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("landslideguard")

app = FastAPI(
    title="LANDSAFE API - SIH 2026",
    description="AI-Assisted Landslide Early Warning, Dynamic Safe Routing, Emergency SOS Triage & Rescue Command Platform (SIH26001)",
    version="2.0.0",
    docs_url="/docs" if not IS_PRODUCTION else None,
    redoc_url="/redoc" if not IS_PRODUCTION else None,
    openapi_url="/openapi.json" if not IS_PRODUCTION else None
)

# 1. Attach Security Headers Middleware (Nosniff, HSTS, CSP, X-Frame-Options)
app.add_middleware(SecurityHeadersMiddleware)

# 2. Strict Production CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "X-Forwarded-For"],
)

# 3. Global Sanitized Exception Handlers (No stack traces or database info leaked to client)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status": exc.status_code}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "status": 422}
    )

@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    correlation_id = str(uuid.uuid4())
    logger.error(
        f"Unhandled server exception on {request.method} {request.url.path} - Correlation-ID: {correlation_id}",
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please contact system support with your correlation ID.",
            "correlation_id": correlation_id,
            "status": 500
        }
    )

# 4. Mount Domain Routers
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
        "environment": ENVIRONMENT,
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
        "active_alerts": len(db_store.get_all_alerts())
    }


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=False)
