"""
LANDSLIDEGUARD SIH26001 - Application Configuration & Environment Validator
Validates critical environment variables and enforces production security constraints.
"""

import os
import sys
import secrets
from typing import List

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT in ["production", "prod"]

# Database Path Configuration
DATA_DIR = os.environ.get("DATA_DIR") or os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
DATABASE_PATH = os.environ.get("DATABASE_PATH") or os.environ.get("SQLITE_DB_PATH") or os.path.join(DATA_DIR, "landslideguard_users.db")

# JWT Authentication Secret Validation
_RAW_JWT_SECRET = os.environ.get("JWT_SECRET") or os.environ.get("SECRET_KEY")

if IS_PRODUCTION:
    if not _RAW_JWT_SECRET or len(_RAW_JWT_SECRET.strip()) < 32 or "placeholder" in _RAW_JWT_SECRET.lower() or "change_this" in _RAW_JWT_SECRET.lower():
        raise RuntimeError(
            "FATAL SECURITY ERROR: In production mode (ENVIRONMENT=production), "
            "a cryptographically secure JWT_SECRET (minimum 32 characters) must be explicitly configured."
        )
    JWT_SECRET = _RAW_JWT_SECRET.strip()
else:
    # Development fallback with ephemeral random generation
    JWT_SECRET = _RAW_JWT_SECRET.strip() if _RAW_JWT_SECRET else secrets.token_urlsafe(32)

JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))

# CORS Configuration
_RAW_CORS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5177,http://127.0.0.1:5177,http://localhost:5178,http://127.0.0.1:5178,http://localhost:3000,http://127.0.0.1:3000")
if _RAW_CORS.strip() == "*":
    if IS_PRODUCTION:
        ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    else:
        ALLOWED_ORIGINS: List[str] = ["*"]
else:
    ALLOWED_ORIGINS = [orig.strip() for orig in _RAW_CORS.split(",") if orig.strip()]
