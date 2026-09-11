"""
LANDSAFE - Landslide Early Warning & Emergency Response System
Pydantic Data Models & Schemas (SIH26001 - North Eastern Region)
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator
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
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    emergency_contact: Optional[Dict[str, str]] = None
    terms_accepted: bool = Field(..., description="Must accept Terms of Service & Privacy Policy")


class UserLoginRequest(BaseModel):
    identifier: Optional[str] = Field(None, description="Email address OR Username")
    email: Optional[str] = None
    username: Optional[str] = None
    password: str = Field(..., min_length=1, max_length=128)

    @model_validator(mode="after")
    def populate_identifier(self):
        if not self.identifier:
            self.identifier = self.email or self.username
        if not self.identifier:
            raise ValueError("Identifier, email, or username is required.")
        return self


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


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=100, description="Cryptographic single-use reset token")
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)


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
    rawValue: Optional[str] = None
    net_delta: Optional[float] = None
    color: Optional[str] = None


class XAIExplanation(BaseModel):
    factors: List[XAIFactor]
    summary: str
    recommended_action: str
    primary_driver: str
    base_hazard_bias: Optional[float] = None
    raw_tree_contributions: Optional[Dict[str, float]] = None


class PredictionResponse(BaseModel):
    zone_id: str
    risk_score: float
    risk_level: str
    features: Dict[str, Any]
    xai: XAIExplanation
    global_feature_importances: Dict[str, float]
    model_confidence: Optional[float] = None
    tree_variance: Optional[float] = None
    data_quality: Optional[str] = None
    model_metadata: Optional[Dict[str, Any]] = None
    baseline_ml_level: Optional[str] = None
    precision_context: Optional[Dict[str, Any]] = None


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
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    weather_code: Optional[int] = None
    condition: Optional[str] = None
    is_day: Optional[int] = 1
    cloud_cover_pct: Optional[int] = 0
    snowfall_cm: Optional[float] = 0.0
    rainfall_1h: Optional[float] = 0.0
    model_confidence: Optional[float] = None
    tree_variance: Optional[float] = None
    data_quality: Optional[str] = None
    xai: Optional[Any] = None


# ---------------- Routing Schemas ----------------
class RouteRequest(BaseModel):
    start_zone_id: str
    end_zone_id: str
    risk_weight: float = Field(1.0, ge=0.0, le=5.0)


class GlobalRouteRequest(BaseModel):
    origin: Dict[str, float] = Field(..., description="Origin {lat: float, lng: float}")
    destination: Dict[str, float] = Field(..., description="Destination {lat: float, lng: float}")
    origin_name: Optional[str] = Field(None, max_length=200)
    dest_name: Optional[str] = Field(None, max_length=200)
    risk_weight: float = Field(1.0, ge=0.0, le=5.0)
    vehicle_type: Optional[str] = Field("car", max_length=50)


class GeocodeRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=200)
    limit: int = Field(5, ge=1, le=10)


class RouteStep(BaseModel):
    instruction: str
    distance_km: float
    time_min: int
    hazard_level: str
    zone_id: Optional[str] = None
    road_segment: Optional[str] = None
    is_blocked: bool = False
    blockage_reason: Optional[str] = None


class RoutePathDetails(BaseModel):
    total_distance_km: float
    total_time_min: int
    risk_exposure_score: float
    average_hazard_level: str
    path_nodes: List[str]
    path_coordinates: List[List[float]]
    steps: List[RouteStep]
    zones_traversed: List[str]
    blocked_roads_encountered: List[str] = []


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
    report_type: str = Field(..., max_length=50, description="Cracks, Water seepage, Slope movement, Falling rocks, Other")
    signs_observed: List[str] = []
    has_activity: bool = True
    description: str = Field(..., min_length=5, max_length=2000)
    photo_url: Optional[str] = Field(None, max_length=500)
    location_name: Optional[str] = Field(None, max_length=200)


class CommunityReportVerification(BaseModel):
    status: str = Field(..., description="VERIFIED or REJECTED")
    reviewer_notes: Optional[str] = Field(None, max_length=1000)


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
    title: str = Field(..., min_length=3, max_length=200)
    district: str = Field(..., min_length=2, max_length=100)
    state: str = Field("Meghalaya", max_length=100)
    latitude: float
    longitude: float
    severity: str = Field(..., description="CRITICAL, HIGH, MODERATE, LOW")
    affected_zone_id: Optional[str] = None
    estimated_population_at_risk: int = 0
    blocked_roads: List[str] = []
    injured_people: int = 0
    missing_people: int = 0
    evacuated_people: int = 0
    description: str = Field(..., min_length=5, max_length=3000)
    source: str = "FIELD_REPORT"


class IncidentUpdate(BaseModel):
    status: Optional[str] = Field(None, description="DETECTED, VERIFIED, RESPONDING, EVACUATING, RESOLVED")
    severity: Optional[str] = None
    assigned_team_id: Optional[str] = None
    injured_people: Optional[int] = None
    missing_people: Optional[int] = None
    evacuated_people: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=2000)


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
    affected_zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    estimated_population: int = 0
    blocked_roads: List[str] = []
    injured_people: int = 0
    missing_people: int = 0
    evacuated_people: int = 0
    source: str
    assigned_team_id: Optional[str] = None
    assigned_team_name: Optional[str] = None
    description: str
    updated_at: str
    # Verified India-Wide Landslide Intelligence Extensions
    verification_status: Optional[str] = "VERIFIED"
    category: Optional[str] = "CONFIRMED_INCIDENT"
    source_url: Optional[str] = None
    source_type: Optional[str] = "OFFICIAL"
    source_priority_level: Optional[int] = 1
    casualties_info: Optional[str] = "Casualties: Not reported"
    reported_causes: Optional[List[str]] = []
    contributing_factors: Optional[List[str]] = []
    why_at_risk: Optional[str] = None
    freshness_label: Optional[str] = None
    is_simulation: Optional[bool] = False
    all_sources: Optional[List[Dict[str, Any]]] = []


class LandslideRiskForecast(BaseModel):
    forecast_id: str
    title: str
    location_name: str
    district: str
    state: str
    latitude: float
    longitude: float
    risk_level: str  # LOW, MODERATE, HIGH, CRITICAL
    scientific_reason: str
    forecast_window_hours: int = 24
    rainfall_trigger_mm: float = 0.0
    slope_gradient_deg: float = 0.0
    gsi_susceptibility: str = "HIGH"
    official_warning_level: str = "ORANGE_ALERT"
    primary_source: str
    source_url: Optional[str] = None
    source_type: str = "OFFICIAL_MET_GEOLOGICAL"
    verification_status: str = "OFFICIAL"
    category: str = "FORECAST_RISK"
    reported_causes: List[str] = []
    contributing_factors: List[str] = []
    why_at_risk: str
    timestamp: str
    freshness_label: str
    radius_km: float = 15.0


class IndiaWideIntelligenceResponse(BaseModel):
    confirmed_incidents: List[IncidentResponse]
    forecast_risks: List[LandslideRiskForecast]
    historical_incidents: List[Dict[str, Any]]
    demo_simulations: List[IncidentResponse]
    monitored_authorities: List[Dict[str, Any]]
    last_synced: str
    sync_status: str
    coverage_summary: Dict[str, Any]



# ---------------- Emergency SOS Schemas ----------------
class SOSCreate(BaseModel):
    user_name: Optional[str] = Field("Citizen", max_length=100)
    emergency_contact: Optional[str] = Field(None, max_length=50)
    latitude: float
    longitude: float
    location_name: Optional[str] = Field(None, max_length=200)
    people_count: int = Field(1, ge=1, le=100)
    injury_severity: str = Field(..., description="NONE, MINOR, MODERATE, SEVERE, CRITICAL")
    is_trapped: bool = False
    message: Optional[str] = Field(None, max_length=1000)
    photo_url: Optional[str] = Field(None, max_length=500)


class SOSTriageUpdate(BaseModel):
    triage_priority: Optional[str] = Field(None, description="CRITICAL, URGENT, EVACUATION, SAFE")
    status: Optional[str] = Field(None, description="DISPATCHED, IN_PROGRESS, RESCUED, CANCELLED")
    assigned_team_id: Optional[str] = None
    destination_hospital_id: Optional[str] = None
    destination_shelter_id: Optional[str] = None
    triage_notes: Optional[str] = Field(None, max_length=1000)


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
    total_beds: Optional[int] = None
    available_beds: Optional[int] = None
    icu_available: Optional[int] = None
    capacity_status: Optional[str] = "LIVE CAPACITY UNAVAILABLE"
    trauma_center: bool = True
    blood_bank: bool = True
    contact_phone: str = "108"
    emergency_ambulance_count: Optional[int] = None
    source: Optional[str] = "OpenStreetMap Geographic Directory"
    data_category: Optional[str] = "DIRECTORY RECORD"


class ShelterResponse(BaseModel):
    shelter_id: str
    name: str
    type: str = "Relief Camp / Community Hall"
    district: str
    state: str
    latitude: float
    longitude: float
    capacity: Optional[int] = None
    current_occupancy: Optional[int] = None
    capacity_status: Optional[str] = "OCCUPANCY TELEMETRY UNAVAILABLE"
    facilities: List[str] = ["High-Ground Assembly", "Potable Water Supply"]
    food_supply_days: Optional[int] = None
    medical_station: bool = True
    contact_person: str = "Designated Relief Warden / SDMA Liaison"
    contact_phone: str = "1070"
    accessibility: str = "Paved Road Access"
    source: Optional[str] = "OpenStreetMap Geographic Directory"
    data_category: Optional[str] = "DIRECTORY RECORD"


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
    source: Optional[str] = "State Disaster Management Authority (SDMA) / NDMA SACHET"
    data_category: Optional[str] = "OFFICIAL WARNING"
    issued_at: Optional[str] = None
    expires_at: Optional[str] = None


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
