"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Pydantic Data Models & Schemas (SIH26001 - North Eastern Region)
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ---------------- Auth & User Profile Schemas ----------------
class EmergencyContactItem(BaseModel):
    id: str
    name: str
    relationship: str
    phone: str


class EmergencyContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    relationship: str = Field(..., min_length=2, max_length=50)
    phone: str = Field(..., min_length=7, max_length=20)


class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=30)
    email: str = Field(..., min_length=5, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    emergency_contact: Optional[Dict[str, str]] = None
    terms_accepted: bool = Field(..., description="Must accept Terms of Service & Privacy Policy")


class UserLoginRequest(BaseModel):
    identifier: str = Field(..., description="Email address OR Username")
    password: str = Field(..., min_length=1)


class UserProfileResponse(BaseModel):
    id: str
    full_name: str
    username: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool = True
    emergency_contacts: List[EmergencyContactItem] = []
    created_at: str
    updated_at: str


class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=150)


# ---------------- Risk Prediction Schemas ----------------
class PredictionInput(BaseModel):
    zone_id: Optional[str] = "NER-CUSTOM"
    rainfall_24h: float = Field(..., ge=0.0, le=500.0, description="24-hour rainfall in mm")
    rainfall_72h: Optional[float] = Field(None, ge=0.0, le=1000.0, description="72-hour rainfall in mm")
    slope_deg: float = Field(..., ge=0.0, le=90.0, description="Slope gradient in degrees")
    soil_moisture: float = Field(..., ge=0.0, le=1.0, description="Volumetric soil moisture (0.0 to 1.0)")
    ndvi: Optional[float] = Field(0.55, ge=0.0, le=1.0, description="Vegetation index (0.0 to 1.0)")
    historical_incidents: Optional[int] = Field(1, ge=0, le=50, description="Past landslide incidents")


class XAIFactor(BaseModel):
    name: str
    importance_pct: float
    value: str


class XAIExplanation(BaseModel):
    factors: List[XAIFactor]
    summary: str
    recommended_action: str
    primary_driver: str


class PredictionResponse(BaseModel):
    zone_id: str
    risk_score: float
    risk_level: str
    features: Dict[str, Any]
    xai: XAIExplanation
    global_feature_importances: Dict[str, float]


# ---------------- Risk Zone Schemas ----------------
class CoordinatePoint(BaseModel):
    lat: float
    lng: float


class ForecastPoint(BaseModel):
    timeframe: str
    hour_offset: int
    predicted_rainfall_mm: float
    predicted_risk_score: float
    risk_level: str


class RiskZoneSummary(BaseModel):
    zone_id: str
    name: str
    state: str
    district: str
    risk_score: float
    risk_level: str
    ml_base_score: float
    community_boost: float
    rainfall_24h: float
    rainfall_72h: float
    slope_deg: float
    soil_moisture: float
    ndvi: float
    land_cover: str
    historical_incidents: int
    community_report_count: int
    verified_report_count: int
    coordinates: List[CoordinatePoint]
    center: CoordinatePoint
    last_updated: str
    alert_status: Optional[str] = None
    recommended_action: str
    forecast_trend: Optional[List[ForecastPoint]] = None


# ---------------- Safe Route Schemas ----------------
class RouteRequest(BaseModel):
    start_node: str = Field(..., description="ID of start waypoint, e.g. GHY_HUB")
    destination_node: str = Field(..., description="ID of destination waypoint, e.g. SHL_CENTER")
    avoid_blocked_roads: bool = True


class RouteSegment(BaseModel):
    from_node: str
    to_node: str
    from_name: str
    to_name: str
    road_id: Optional[str] = None
    road_name: str
    distance_km: float
    travel_time_min: float
    risk_score: float
    road_status: str = "OPEN"
    zone_id: Optional[str] = None


class RoutePathDetails(BaseModel):
    nodes: List[str]
    distance_km: float
    travel_time_min: int
    average_risk: float
    max_risk: float
    safety_level: str
    zones_crossed: List[str]
    blocked_roads_avoided: List[str] = []
    coordinates: List[Dict[str, Any]]
    segments: List[RouteSegment]


class RouteComparison(BaseModel):
    distance_delta_km: float
    time_delta_min: int
    risk_reduction_points: float
    avoided_zones_count: int
    avoided_zones: List[str]
    avoided_blocked_roads: List[str] = []
    is_identical: bool
    is_fallback: bool
    explanation: str


class RouteResponse(BaseModel):
    start: Dict[str, Any]
    destination: Dict[str, Any]
    fastest_route: RoutePathDetails
    safe_route: RoutePathDetails
    comparison: RouteComparison


# ---------------- Community Reports Schemas ----------------
class CommunityReportCreate(BaseModel):
    zone_id: Optional[str] = None
    latitude: float
    longitude: float
    report_type: str = Field(..., description="Cracks, Water seepage, Slope movement, Falling rocks, Other")
    signs_observed: List[str] = []
    has_activity: bool = True
    description: str
    photo_url: Optional[str] = None
    location_name: Optional[str] = None


class CommunityReportVerification(BaseModel):
    status: str = Field(..., description="VERIFIED or REJECTED")
    reviewer_notes: Optional[str] = None


class CommunityReportResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_role: str
    zone_id: Optional[str]
    zone_name: Optional[str]
    latitude: float
    longitude: float
    location_name: str
    report_type: str
    signs_observed: List[str]
    description: str
    photo_url: Optional[str]
    status: str
    created_at: str
    verified_at: Optional[str] = None
    verified_by: Optional[str] = None
    reviewer_notes: Optional[str] = None
    ai_verified: Optional[bool] = True
    ai_confidence_score: Optional[float] = 92.0
    ai_verification_checks: Optional[Dict[str, Any]] = None
    ai_summary: Optional[str] = None
    upvotes: Optional[int] = 0


# ---------------- Community Poll Schemas ----------------
class CommunityPollVote(BaseModel):
    poll_id: str = "poll-landslide-signs-today"
    option_id: str = Field(..., description="'yes', 'no', 'unsure'")


class CommunityPollOption(BaseModel):
    id: str
    label: str
    votes: int
    percentage: float


class CommunityPollResponse(BaseModel):
    id: str
    question: str
    description: str
    total_votes: int
    options: List[CommunityPollOption]
    user_voted_option: Optional[str] = None


# ---------------- Incident Management Schemas (GDACS Style) ----------------
class IncidentCreate(BaseModel):
    title: str
    district: str
    state: str = "Meghalaya"
    latitude: float
    longitude: float
    severity: str = Field(..., description="CRITICAL, HIGH, MODERATE, LOW")
    affected_zone_id: Optional[str] = None
    estimated_population_at_risk: int = 0
    blocked_roads: List[str] = []
    injured_people: int = 0
    missing_people: int = 0
    evacuated_people: int = 0
    description: str
    source: str = "FIELD_REPORT"


class IncidentUpdate(BaseModel):
    status: Optional[str] = Field(None, description="DETECTED, VERIFIED, RESPONDING, EVACUATING, RESOLVED")
    severity: Optional[str] = None
    assigned_team_id: Optional[str] = None
    injured_people: Optional[int] = None
    missing_people: Optional[int] = None
    evacuated_people: Optional[int] = None
    notes: Optional[str] = None


class IncidentResponse(BaseModel):
    incident_id: str
    title: str
    district: str
    state: str
    latitude: float
    longitude: float
    timestamp: str
    severity: str
    status: str
    affected_zone_id: Optional[str]
    zone_name: Optional[str]
    estimated_population: int
    blocked_roads: List[str]
    injured_people: int
    missing_people: int
    evacuated_people: int
    source: str
    assigned_team_id: Optional[str] = None
    assigned_team_name: Optional[str] = None
    description: str
    updated_at: str


# ---------------- Emergency SOS Schemas ----------------
class SOSCreate(BaseModel):
    user_name: Optional[str] = "Citizen"
    emergency_contact: Optional[str] = None
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    people_count: int = Field(1, ge=1, le=100)
    injury_severity: str = Field(..., description="NONE, MINOR, MODERATE, SEVERE, CRITICAL")
    is_trapped: bool = False
    message: Optional[str] = None
    photo_url: Optional[str] = None


class SOSTriageUpdate(BaseModel):
    triage_priority: Optional[str] = Field(None, description="CRITICAL, URGENT, EVACUATION, SAFE")
    status: Optional[str] = Field(None, description="DISPATCHED, IN_PROGRESS, RESCUED, CANCELLED")
    assigned_team_id: Optional[str] = None
    destination_hospital_id: Optional[str] = None
    destination_shelter_id: Optional[str] = None
    triage_notes: Optional[str] = None


class SOSResponse(BaseModel):
    sos_id: str
    user_id: str
    user_name: str
    emergency_contact: Optional[str]
    latitude: float
    longitude: float
    location_name: str
    zone_id: Optional[str]
    timestamp: str
    people_count: int
    injury_severity: str
    is_trapped: bool
    priority_score: float
    triage_priority: str
    status: str
    message: Optional[str]
    photo_url: Optional[str]
    assigned_team_id: Optional[str] = None
    assigned_team_name: Optional[str] = None
    destination_hospital_id: Optional[str] = None
    destination_hospital_name: Optional[str] = None
    destination_shelter_id: Optional[str] = None
    destination_shelter_name: Optional[str] = None
    triage_notes: Optional[str] = None
    updated_at: str


# ---------------- Rescue Team Schemas ----------------
class RescueTeamUpdate(BaseModel):
    status: Optional[str] = Field(None, description="AVAILABLE, DISPATCHED, ON_SITE, RETURNING, OFFLINE")
    current_assignment_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    eta_minutes: Optional[int] = None


class RescueTeamResponse(BaseModel):
    team_id: str
    name: str
    team_type: str = Field(..., description="NDRF, SDRF, Police, Fire & Rescue, Medical, Volunteers")
    base_location: str
    members_count: int
    leader_name: str
    contact_phone: str
    vehicle: str
    equipment: List[str]
    status: str
    current_assignment_id: Optional[str] = None
    current_assignment_title: Optional[str] = None
    latitude: float
    longitude: float
    eta_minutes: int


# ---------------- Roads & Blockages Schemas ----------------
class RoadStatusUpdate(BaseModel):
    status: str = Field(..., description="OPEN, SLOW, DANGEROUS, BLOCKED")
    obstruction_reason: Optional[str] = None


class RoadResponse(BaseModel):
    road_id: str
    name: str
    highway_code: str
    from_junction: str
    to_junction: str
    distance_km: float
    status: str
    obstruction_reason: Optional[str] = None
    zone_id: Optional[str] = None
    speed_limit_kmh: int
    last_updated: str


# ---------------- Hospitals & Shelters Schemas ----------------
class HospitalResponse(BaseModel):
    hospital_id: str
    name: str
    type: str = "Civil / District Hospital"
    district: str
    state: str
    latitude: float
    longitude: float
    total_beds: int
    available_beds: int
    icu_available: int
    trauma_center: bool
    blood_bank: bool
    contact_phone: str
    emergency_ambulance_count: int


class ShelterResponse(BaseModel):
    shelter_id: str
    name: str
    type: str = "Relief Camp / Community Hall"
    district: str
    state: str
    latitude: float
    longitude: float
    capacity: int
    current_occupancy: int
    facilities: List[str]
    food_supply_days: int
    medical_station: bool
    contact_person: str
    contact_phone: str
    accessibility: str


# ---------------- Post-Disaster Analysis Schemas ----------------
class PostDisasterEventResponse(BaseModel):
    record_id: str
    incident_id: str
    event_name: str
    date_occurred: str
    district: str
    pre_event_ml_risk: float
    actual_rainfall_24h_mm: float
    actual_slope_deg: float
    community_reports_prior: int
    time_to_first_response_min: int
    total_people_evacuated: int
    casualties: int
    injuries_treated: int
    primary_hospital_used: str
    primary_shelter_used: str
    primary_road_diverted_to: str
    lessons_learned: str
    model_calibration_feedback: str


# ---------------- Alert & Subscription Schemas ----------------
class AlertItem(BaseModel):
    id: str
    zone_id: str
    zone_name: str
    category: str = Field(..., description="CRITICAL, HIGH, MODERATE, INFORMATION")
    risk_score: float
    title: str
    reason: str
    recommended_action: str
    timestamp: str
    status: str = "ACTIVE"
    affected_highway: Optional[str] = None


class AlertSubscriptionRequest(BaseModel):
    user_id: Optional[str] = "usr-citizen-default"
    selected_districts: List[str] = ["Ri Bhoi", "East Khasi Hills", "East Sikkim", "Kohima"]
    risk_threshold: str = Field("HIGH", description="MODERATE, HIGH, CRITICAL")
    channels: List[str] = ["IN_APP", "EMAIL", "SMS_DEMO"]
    preferred_language: str = "en"


class AlertSubscriptionResponse(BaseModel):
    subscription_id: str
    user_id: str
    selected_districts: List[str]
    risk_threshold: str
    channels: List[str]
    preferred_language: str
    status: str = "ACTIVE"


# ---------------- Analytics Schemas ----------------
class AnalyticsSummary(BaseModel):
    total_zones: int
    critical_zones_count: int
    high_risk_zones_count: int
    moderate_zones_count: int
    low_risk_zones_count: int
    total_reports: int
    verified_reports: int
    pending_reports: int
    active_alerts: int
    active_incidents_count: int
    active_sos_count: int
    blocked_roads_count: int
    deployed_rescue_teams_count: int
    average_region_risk: float
    risk_distribution: List[Dict[str, Any]]
    rainfall_vs_risk: List[Dict[str, Any]]
    reports_timeline: List[Dict[str, Any]]
    top_critical_zones: List[Dict[str, Any]]
    feature_importance: List[Dict[str, Any]]
