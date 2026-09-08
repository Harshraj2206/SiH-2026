"""
LANDSLIDEGUARD SIH26001 - Security & Authentication Engine
Implements JWT tokens, bcrypt password hashing, policy validation, and Role-Based Access Control (RBAC).
"""

import os
import re
import time
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple, Dict, Any
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.database.user_store import user_db, hash_pw, check_pw

from backend.app.core.config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

SECRET_KEY = JWT_SECRET
ALGORITHM = JWT_ALGORITHM

security_bearer = HTTPBearer(auto_error=False)


# ---------------- Password & Username Policy Validators ----------------

def validate_password_policy(password: str) -> Tuple[bool, Optional[str]]:
    """
    Validates that password meets enterprise security standards:
    - Minimum 8 characters, Maximum 128 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 numeric digit
    - At least 1 special character
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number (0-9)."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_+=\[\]\\/`~]", password):
        return False, "Password must contain at least one special character (e.g. !@#$%^&*)."
    return True, None


def validate_username_policy(username: str) -> Tuple[bool, Optional[str]]:
    """
    Validates username rules:
    - 3 to 30 characters
    - Letters, numbers, underscores, dots, hyphens
    - Linear non-backtracking bounded character class
    """
    if not username or len(username) < 3:
        return False, "Username must be at least 3 characters long."
    if len(username) > 30:
        return False, "Username cannot exceed 30 characters."
    if not re.match(r"^[a-zA-Z0-9._-]+$", username):
        return False, "Username can only contain letters, numbers, dots, underscores, and hyphens."
    return True, None


def validate_email_format(email: str) -> bool:
    """Validate RFC standard email format with strict length bounds (immune to ReDoS)."""
    if not email or len(email) > 254 or "@" not in email:
        return False
    # Strictly linear non-backtracking RFC pattern with bounded TLD length
    return bool(re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$", email))


# ---------------- Password Hashing & Verification ----------------

def hash_password(password: str) -> str:
    """Hash password securely using bcrypt."""
    return hash_pw(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password strictly against bcrypt hash."""
    return check_pw(plain_password, hashed_password)


# ---------------- JWT Token Management ----------------

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


import threading

# Thread-safe in-memory token revocation blacklist
_BLACKLIST_LOCK = threading.Lock()
_TOKEN_BLACKLIST: Dict[str, float] = {}  # token_hash -> expiration_timestamp


def blacklist_token(token: str) -> None:
    """Revoke a token immediately on logout."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        exp = payload.get("exp", time.time() + 3600)
    except Exception:
        exp = time.time() + 3600
    
    with _BLACKLIST_LOCK:
        _TOKEN_BLACKLIST[token] = exp
        # Prune expired tokens from blacklist memory
        now = time.time()
        expired_keys = [k for k, v in _TOKEN_BLACKLIST.items() if v < now]
        for k in expired_keys:
            del _TOKEN_BLACKLIST[k]


def is_token_blacklisted(token: str) -> bool:
    """Check if token was explicitly revoked via logout."""
    with _BLACKLIST_LOCK:
        if token in _TOKEN_BLACKLIST:
            if _TOKEN_BLACKLIST[token] > time.time():
                return True
            else:
                del _TOKEN_BLACKLIST[token]
    return False


def decode_token(token: str) -> Dict[str, Any]:
    if is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has been revoked / logged out.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"}
        )


# ---------------- FastAPI Dependencies ----------------

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> Optional[Dict[str, Any]]:
    """Optional auth dependency. Returns sanitized user record if valid token supplied."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub") or payload.get("id")
        if not user_id:
            return None
        user = user_db.get_by_id(user_id) or user_db.get_by_identifier(user_id)
        if user:
            # Strip password hash
            user.pop("password_hash", None)
        return user
    except Exception:
        return None


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> Dict[str, Any]:
    """Required auth dependency. Returns authenticated user or raises 401 Unauthorized."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to access this resource.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub") or payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user session payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = user_db.get_by_id(user_id) or user_db.get_by_identifier(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or has been disabled.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active", 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated."
        )

    # Clean sensitive hash
    sanitized = {k: v for k, v in user.items() if k != "password_hash"}
    return sanitized


def require_roles(allowed_roles: List[str]):
    """Role-Based Access Control decorator/dependency."""
    normalized_allowed = [r.upper() for r in allowed_roles]
    # Map synonyms: AUTHORITY includes ADMIN
    if "AUTHORITY" in normalized_allowed and "ADMIN" not in normalized_allowed:
        normalized_allowed.append("ADMIN")

    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "USER").upper()
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. This operation requires one of: {', '.join(allowed_roles)}. Your current role is '{user_role}'."
            )
        return current_user
    return role_checker
