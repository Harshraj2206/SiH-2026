import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from backend.app.models.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserProfileResponse,
    UserProfileUpdateRequest,
    EmergencyContactCreate,
    EmergencyContactItem,
    AuthTokenResponse,
    ForgotPasswordRequest,
    PasswordResetConfirmRequest
)
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    blacklist_token,
    security_bearer,
    validate_password_policy,
    validate_username_policy,
    validate_email_format
)
from backend.app.core.rate_limiter import check_auth_rate_limit, DEFAULT_LOGIN_LIMIT, DEFAULT_REGISTER_LIMIT
from backend.app.database.user_store import user_db

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegisterRequest, request: Request):
    """
    Public User Registration Endpoint (Rate-limited: 5 attempts/min).
    """
    check_auth_rate_limit(request, max_attempts=DEFAULT_REGISTER_LIMIT, window_seconds=60, action_name="registration")

    # 1. Check Terms Acceptance
    if not payload.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the Terms of Service and Privacy Policy to create an account."
        )

    # 2. Check Password Match
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    # 3. Validate Password Policy
    is_valid_pw, pw_err = validate_password_policy(payload.password)
    if not is_valid_pw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pw_err
        )

    # 4. Validate Username Policy
    is_valid_user, user_err = validate_username_policy(payload.username)
    if not is_valid_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=user_err
        )

    # 5. Validate Email Format
    if not validate_email_format(payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address."
        )

    # 6. Check Username Uniqueness
    existing_username = user_db.get_by_username(payload.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That username is already in use."
        )

    # 7. Check Email Uniqueness
    existing_email = user_db.get_by_email(payload.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # 8. Hash Password securely via bcrypt
    pw_hash = hash_password(payload.password)

    # 9. Create User in SQLite Database (Strictly role='USER')
    new_user = user_db.create_user(
        full_name=payload.full_name,
        username=payload.username,
        email=payload.email,
        phone=payload.phone,
        password_hash=pw_hash,
        emergency_contact=payload.emergency_contact,
        role="USER"
    )

    # 10. Generate JWT Session Token
    token_data = {
        "sub": new_user["id"],
        "id": new_user["id"],
        "username": new_user["username"],
        "email": new_user["email"],
        "role": new_user["role"],
        "full_name": new_user["full_name"]
    }
    access_token = create_access_token(data=token_data)

    user_resp = UserProfileResponse(
        id=new_user["id"],
        full_name=new_user["full_name"],
        username=new_user["username"],
        email=new_user["email"],
        phone=new_user.get("phone"),
        role=new_user["role"],
        is_active=bool(new_user.get("is_active", 1)),
        emergency_contacts=[EmergencyContactItem(**c) for c in new_user.get("emergency_contacts", [])],
        created_at=new_user["created_at"],
        updated_at=new_user["updated_at"]
    )

    return AuthTokenResponse(access_token=access_token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=AuthTokenResponse)
async def login(credentials: UserLoginRequest, request: Request):
    """
    Dual-Identifier Login Endpoint (Rate-limited: 5 attempts/min per IP).
    """
    check_auth_rate_limit(request, max_attempts=DEFAULT_LOGIN_LIMIT, window_seconds=60, action_name="login")

    clean_identifier = credentials.identifier.strip()
    if not clean_identifier or not credentials.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifier and password are required."
        )

    # Look up user by identifier (Email OR Username)
    user = user_db.get_by_identifier(clean_identifier)

    # Generic failure message if user does not exist or password mismatch
    generic_error = "Invalid username/email or password."
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=generic_error,
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Verify bcrypt password hash
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=generic_error,
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Check if account is active
    if not user.get("is_active", 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled. Please contact system administrator."
        )

    # Generate JWT Token
    token_data = {
        "sub": user["id"],
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "full_name": user["full_name"]
    }
    access_token = create_access_token(data=token_data)

    user_resp = UserProfileResponse(
        id=user["id"],
        full_name=user["full_name"],
        username=user["username"],
        email=user["email"],
        phone=user.get("phone"),
        role=user["role"],
        is_active=bool(user.get("is_active", 1)),
        emergency_contacts=[EmergencyContactItem(**c) for c in user.get("emergency_contacts", [])],
        created_at=user["created_at"],
        updated_at=user["updated_at"]
    )

    return AuthTokenResponse(access_token=access_token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Get Current Authenticated User Profile.
    Restores session from bearer token.
    """
    return UserProfileResponse(
        id=current_user["id"],
        full_name=current_user["full_name"],
        username=current_user["username"],
        email=current_user["email"],
        phone=current_user.get("phone"),
        role=current_user["role"],
        is_active=bool(current_user.get("is_active", 1)),
        emergency_contacts=[EmergencyContactItem(**c) for c in current_user.get("emergency_contacts", [])],
        created_at=current_user["created_at"],
        updated_at=current_user["updated_at"]
    )


@router.patch("/profile", response_model=UserProfileResponse)
async def update_profile(
    payload: UserProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update profile information (Full Name, Phone)."""
    updated_user = user_db.update_profile(
        user_id=current_user["id"],
        full_name=payload.full_name,
        phone=payload.phone
    )
    if not updated_user:
        raise HTTPException(status_code=404, detail="User account not found.")

    return UserProfileResponse(
        id=updated_user["id"],
        full_name=updated_user["full_name"],
        username=updated_user["username"],
        email=updated_user["email"],
        phone=updated_user.get("phone"),
        role=updated_user["role"],
        is_active=bool(updated_user.get("is_active", 1)),
        emergency_contacts=[EmergencyContactItem(**c) for c in updated_user.get("emergency_contacts", [])],
        created_at=updated_user["created_at"],
        updated_at=updated_user["updated_at"]
    )


@router.post("/emergency-contacts", response_model=List[EmergencyContactItem])
async def add_emergency_contact(
    payload: EmergencyContactCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a new emergency contact to user profile."""
    contacts = user_db.add_emergency_contact(
        user_id=current_user["id"],
        contact_data=payload.model_dump()
    )
    return [EmergencyContactItem(**c) for c in contacts]


@router.delete("/emergency-contacts/{contact_id}", response_model=List[EmergencyContactItem])
async def delete_emergency_contact(
    contact_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an emergency contact from user profile."""
    contacts = user_db.delete_emergency_contact(
        user_id=current_user["id"],
        contact_id=contact_id
    )
    return [EmergencyContactItem(**c) for c in contacts]


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    """
    Forgot Password Request Endpoint (Rate-limited: 3 attempts/hour per IP).
    Generates a cryptographically random, single-use, 15-minute time-limited reset token.
    """
    check_auth_rate_limit(request, max_attempts=3, window_seconds=3600, action_name="password-reset")
    
    token = user_db.create_password_reset_token(payload.email, ttl_minutes=15)
    # Generic security message (prevents account enumeration attacks)
    return {
        "status": "info",
        "email": payload.email,
        "message": "If that email address is registered, password reset instructions have been queued.",
        # Expose token for local demo/testing if in development environment
        "reset_token": token if os.environ.get("ENVIRONMENT", "development").lower() != "production" else None
    }


@router.post("/reset-password")
async def reset_password(payload: PasswordResetConfirmRequest, request: Request):
    """
    Password Reset Confirmation Endpoint.
    - Validates token authenticity, single-use, and expiration (< 15 mins).
    - Enforces password complexity policy and matching confirmation.
    - Updates user password and immediately invalidates the reset token.
    """
    check_auth_rate_limit(request, max_attempts=5, window_seconds=60, action_name="password-reset-confirm")

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    is_valid_pw, pw_err = validate_password_policy(payload.new_password)
    if not is_valid_pw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pw_err or "Password does not meet enterprise security standards."
        )

    new_hash = hash_password(payload.new_password)
    success = user_db.verify_and_consume_reset_token(payload.token, new_hash)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or previously used password reset token."
        )

    return {
        "status": "success",
        "message": "Your password has been successfully reset. You may now log in with your new credentials."
    }


@router.post("/logout")
async def logout(
    current_user: Optional[dict] = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
):
    """Acknowledge client logout and revoke JWT token immediately in server-side blacklist."""
    if credentials and credentials.credentials:
        blacklist_token(credentials.credentials)
    return {"status": "success", "message": "Successfully logged out. Token revoked."}
