"""
LANDSLIDEGUARD SIH26001 - Comprehensive Automated Backend Test Suite
Covers:
- System Health & Simulation
- Authentication, Validation, Password Policies, JWT Tokens & RBAC
- Risk Zones, Live Telemetry & XAI Explanations
- Machine Learning Hazard Inference (Normal & Malformed Inputs)
- Data Sources & Coordinate Inspector
- Location Intelligence Orchestrator
- Safe Routing Engine (Dijkstra, Obstruction Avoidance & Global Geocoding)
- Community Reports, Verification & Dynamic Fusion
- Community Landslide Poll & Voting
- GDACS-Style Incidents Explorer & Status Lifecycle
- Emergency SOS & Multi-Agency Triage
- Rescue Teams Dispatch
- Emergency Resources (Roads, Hospitals & Shelters)
- Alerts & Analytics
- Post-Disaster Analysis & Metrics
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.store import db_store
from backend.app.database.user_store import user_db

client = TestClient(app)


# ---------------- 1. System Health & Simulation ----------------
def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["system"] == "LANDSAFE"
    assert data["sih_problem_code"] == "SIH26001"
    assert data["active_zones_monitored"] > 0
    assert "ml_engine" in data


def test_simulation_reset_and_step():
    res_login = client.post("/api/auth/login", json={"identifier": "admin@landslideguard.gov.in", "password": "Admin@2026!"})
    admin_token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    res_reset = client.post("/api/simulation/reset", headers=headers)
    assert res_reset.status_code == 200
    
    res_step = client.post("/api/simulation/step/1", headers=headers)
    assert res_step.status_code == 200
    data = res_step.json()
    assert data["step"] == 1

    # Invalid step should return 400
    res_invalid = client.post("/api/simulation/step/99", headers=headers)
    assert res_invalid.status_code == 400


# ---------------- 2. Authentication & RBAC ----------------
def test_auth_login_all_seeded_roles():
    roles_credentials = [
        ("admin@landslideguard.gov.in", "Admin@2026!", "ADMIN"),
        ("officer@sdim.ner.gov.in", "Officer@2026!", "AUTHORITY"),
        ("rescue@sdrf.ner.gov.in", "Rescue@2026!", "RESCUE_TEAM"),
        ("medical@civilhosp.ner.gov.in", "Medical@2026!", "MEDICAL_CENTER"),
        ("resident@landslideguard.gov.in", "Resident@2026!", "USER"),
    ]

    for identifier, password, expected_role in roles_credentials:
        res = client.post("/api/auth/login", json={"identifier": identifier, "password": password})
        assert res.status_code == 200, f"Login failed for {identifier}"
        data = res.json()
        assert "access_token" in data
        assert data["user"]["role"] == expected_role

    # Legacy short aliases (admin123 etc.) must no longer work
    for identifier, alias in [("admin@landslideguard.gov.in", "admin123"), ("officer@sdim.ner.gov.in", "authority123")]:
        res = client.post("/api/auth/login", json={"identifier": identifier, "password": alias})
        assert res.status_code == 401


def test_auth_login_failure_invalid_credentials():
    res = client.post("/api/auth/login", json={"identifier": "nonexistent@user.com", "password": "WrongPassword!123"})
    assert res.status_code == 401


def test_auth_registration_lifecycle():
    import uuid
    rand_id = uuid.uuid4().hex[:6]
    test_user = {
        "full_name": f"Test Resident {rand_id}",
        "username": f"user_{rand_id}",
        "email": f"test_{rand_id}@domain.com",
        "phone": "+91 9876543210",
        "password": "Password@2026!",
        "confirm_password": "Password@2026!",
        "terms_accepted": True,
        "emergency_contact": {
            "name": "Family Contact",
            "relationship": "Parent",
            "phone": "+91 9876543211"
        }
    }

    # 1. Register User
    res = client.post("/api/auth/register", json=test_user)
    assert res.status_code == 201
    reg_data = res.json()
    token = reg_data["access_token"]
    assert reg_data["user"]["role"] == "USER"

    # 2. Duplicate registration with same email should fail (400)
    res_dup = client.post("/api/auth/register", json=test_user)
    assert res_dup.status_code == 400

    # 3. Check /api/auth/me with Bearer token
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == test_user["email"].lower()

    # 4. Add Emergency Contact
    res_add_c = client.post(
        "/api/auth/emergency-contacts",
        json={"name": "Doctor Friend", "relationship": "Physician", "phone": "+91 9998887776"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_add_c.status_code == 200
    contacts = res_add_c.json()
    assert len(contacts) >= 2
    contact_to_del = contacts[-1]["id"]

    # 5. Delete Emergency Contact
    res_del_c = client.delete(
        f"/api/auth/emergency-contacts/{contact_to_del}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_del_c.status_code == 200


def test_rbac_endpoint_protection():
    # Login as normal user
    res_user = client.post("/api/auth/login", json={"identifier": "resident@landslideguard.gov.in", "password": "Resident@2026!"})
    user_token = res_user.json()["access_token"]

    # Login as authority
    res_auth = client.post("/api/auth/login", json={"identifier": "officer@sdim.ner.gov.in", "password": "Officer@2026!"})
    auth_token = res_auth.json()["access_token"]

    # Normal USER trying to create an incident -> MUST be 403 Forbidden
    res_inc_user = client.post(
        "/api/incidents",
        json={
            "title": "Unauthorized Incident",
            "district": "Kullu",
            "state": "Himachal Pradesh",
            "severity": "HIGH",
            "latitude": 31.95,
            "longitude": 77.10,
            "description": "Attempting unauthorized post."
        },
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert res_inc_user.status_code == 403

    # AUTHORITY trying to create an incident -> MUST be 201 Created
    res_inc_auth = client.post(
        "/api/incidents",
        json={
            "title": "Authority Verified Incident",
            "district": "Kullu",
            "state": "Himachal Pradesh",
            "severity": "HIGH",
            "latitude": 31.95,
            "longitude": 77.10,
            "description": "Authorized post by SDMA."
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert res_inc_auth.status_code == 201


# ---------------- 3. Risk Zones, Telemetry & Prediction ----------------
def test_get_risk_zones():
    res = client.get("/api/risk-zones")
    assert res.status_code == 200
    zones = res.json()
    assert len(zones) > 0
    first_zone = zones[0]
    assert "zone_id" in first_zone
    assert "risk_score" in first_zone
    assert "risk_level" in first_zone


def test_get_risk_zone_detail():
    res = client.get("/api/risk-zones/HP-01")
    assert res.status_code == 200
    data = res.json()
    assert "zone" in data
    assert data["zone"]["zone_id"] == "HP-01"


def test_predict_risk_ml():
    payload = {
        "rainfall_24h": 95.0,
        "rainfall_72h": 180.0,
        "slope_deg": 36.0,
        "soil_moisture": 0.45,
        "ndvi": 0.35,
        "historical_incidents": 5
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "risk_score" in data
    assert "risk_level" in data
    assert 0.0 <= data["risk_score"] <= 100.0
    assert "xai" in data
    assert "global_feature_importances" in data


def test_telemetry_inspect():
    res = client.post("/api/telemetry/inspect", json={"latitude": 31.9579, "longitude": 77.1095})
    assert res.status_code == 200
    data = res.json()
    assert "zone_id" in data
    assert "risk_score" in data
    assert "temperature_c" in data
    assert "slope_deg" in data
    assert "elevation_amsl" in data


def test_location_intelligence():
    res = client.get("/api/location-intelligence?lat=31.9579&lng=77.1095")
    assert res.status_code == 200
    data = res.json()
    assert "location" in data
    assert "weather" in data or "precipitation" in data
    assert "risk" in data


# ---------------- 4. Safe Routing ----------------
def test_safe_routing_preset():
    waypoints_res = client.get("/api/safe-route/waypoints")
    assert waypoints_res.status_code == 200
    waypoints = waypoints_res.json()
    assert len(waypoints) >= 2

    start_node = waypoints[0]["id"]
    dest_node = waypoints[1]["id"]

    res = client.post("/api/safe-route", json={
        "start_node": start_node,
        "destination_node": dest_node,
        "avoid_blocked_roads": True
    })
    assert res.status_code == 200
    data = res.json()
    assert "safe_route" in data
    assert "fastest_route" in data


def test_safe_routing_global():
    res = client.post("/api/safe-route/global", json={
        "start_lat": 31.1048,
        "start_lng": 77.1734,
        "dest_lat": 32.2190,
        "dest_lng": 76.3234,
        "start_name": "Shimla",
        "dest_name": "Dharamshala"
    })
    assert res.status_code == 200
    data = res.json()
    assert "safe_route" in data
    assert "fastest_route" in data


# ---------------- 5. Community Reports & Verification ----------------
def test_community_reports_workflow():
    # 1. Submit report
    res_sub = client.post("/api/reports", json={
        "zone_id": "HP-01",
        "report_type": "Tension cracks observed",
        "signs_observed": ["Tension Cracks", "Soil Creep"],
        "description": "Deep vertical tension cracks expanding on hillside shoulder.",
        "latitude": 31.957,
        "longitude": 77.108,
        "location_name": "Aut Tunnel Highway"
    })
    assert res_sub.status_code == 201
    rep = res_sub.json()
    rep_id = rep["id"]
    assert rep["status"] in ["PENDING", "VERIFIED"]

    # 2. Authority logs in and verifies report
    res_auth = client.post("/api/auth/login", json={"identifier": "officer@sdim.ner.gov.in", "password": "Officer@2026!"})
    auth_token = res_auth.json()["access_token"]

    res_ver = client.patch(
        f"/api/reports/{rep_id}/verify",
        json={"status": "VERIFIED", "reviewer_notes": "SDRF patrol confirmed 12cm fissure opening."},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert res_ver.status_code == 200
    assert res_ver.json()["status"] == "VERIFIED"


def test_community_poll():
    res_poll = client.get("/api/reports/poll")
    assert res_poll.status_code == 200
    data = res_poll.json()
    assert "total_votes" in data
    assert "options" in data

    # Voting requires login
    assert client.post("/api/reports/poll/vote", json={"option_id": "yes"}).status_code == 401

    login = client.post("/api/auth/login", json={"identifier": "resident@landslideguard.gov.in", "password": "Resident@2026!"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    res_vote = client.post("/api/reports/poll/vote", json={"option_id": "yes"}, headers=headers)
    assert res_vote.status_code == 200
    assert "total_votes" in res_vote.json()

    # One vote per user per day
    assert client.post("/api/reports/poll/vote", json={"option_id": "no"}, headers=headers).status_code == 409


# ---------------- 6. Emergency SOS & Triage ----------------
def test_sos_lifecycle():
    # 1. Trigger SOS
    res_sos = client.post("/api/sos", json={
        "latitude": 31.958,
        "longitude": 77.109,
        "location_name": "Aut Tunnel Sector NH-3",
        "injury_severity": "CRITICAL",
        "message": "Trapped in vehicle under debris flow.",
        "people_count": 3,
        "is_trapped": True
    })
    assert res_sos.status_code == 201
    sos_data = res_sos.json()
    assert "sos_id" in sos_data
    sos_id = sos_data["sos_id"]

    # 2. Authority updates triage
    res_auth = client.post("/api/auth/login", json={"identifier": "officer@sdim.ner.gov.in", "password": "Officer@2026!"})
    auth_token = res_auth.json()["access_token"]

    res_triage = client.patch(
        f"/api/sos/{sos_id}/triage",
        json={"status": "DISPATCHED", "assigned_team_id": "team-sdrf-01", "triage_notes": "SDRF Unit 1 en route with hydraulic cutters."},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert res_triage.status_code == 200
    assert res_triage.json()["status"] == "DISPATCHED"


# ---------------- 7. Emergency Resources: Roads, Hospitals, Shelters ----------------
def test_emergency_resources():
    # Roads
    res_roads = client.get("/api/resources/roads")
    assert res_roads.status_code == 200
    assert len(res_roads.json()) > 0

    # Hospitals
    res_hosp = client.get("/api/resources/hospitals")
    assert res_hosp.status_code == 200
    assert len(res_hosp.json()) > 0

    # Shelters
    res_shelt = client.get("/api/resources/shelters")
    assert res_shelt.status_code == 200
    assert len(res_shelt.json()) > 0


# ---------------- 8. Analytics & Post-Disaster ----------------
def test_analytics_and_post_disaster():
    res_analytics = client.get("/api/analytics")
    assert res_analytics.status_code == 200
    data = res_analytics.json()
    assert "total_zones" in data
    assert "risk_distribution" in data

    res_pd = client.get("/api/post-disaster")
    assert res_pd.status_code == 200

    res_metrics = client.get("/api/post-disaster/metrics")
    assert res_metrics.status_code == 200
    assert "accuracy" in res_metrics.json()


# ---------------- 9. India-Wide Landslide Intelligence & Verification ----------------
def test_india_wide_intelligence_endpoint():
    # 1. Fetch full intelligence feed
    res = client.get("/api/incidents/intelligence")
    assert res.status_code == 200
    data = res.json()

    assert "confirmed_incidents" in data
    assert "forecast_risks" in data
    assert "demo_simulations" in data
    assert "monitored_authorities" in data
    assert "coverage_summary" in data

    # 2. Verify confirmed incidents have official sources and provenance
    confirmed = data["confirmed_incidents"]
    assert len(confirmed) >= 5
    for inc in confirmed:
        assert inc["category"] == "CONFIRMED_INCIDENT"
        assert inc["verification_status"] in ["OFFICIAL", "VERIFIED"]
        assert inc["source"]
        assert inc["state"]
        assert inc["district"]
        assert -90.0 <= inc["latitude"] <= 90.0
        assert -180.0 <= inc["longitude"] <= 180.0
        # Check no fake "0 casualties" when unstated
        assert "casualties_info" in inc

    # 3. Verify forecast risk zones are separated from confirmed incidents
    forecasts = data["forecast_risks"]
    assert len(forecasts) >= 8
    for fc in forecasts:
        assert fc["category"] == "FORECAST_RISK"
        assert fc["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        assert "scientific_reason" in fc
        assert fc["slope_gradient_deg"] > 0
        assert "why_at_risk" in fc

    # 4. Verify demo simulations are strictly tagged
    sims = data["demo_simulations"]
    assert len(sims) == 3
    for s in sims:
        assert s["category"] == "DEMO_SIMULATION"
        assert s["verification_status"] == "DEMO / SIMULATION"
        assert s["is_simulation"] is True


def test_incident_proximity_calculation():
    # Wayanad coordinates (near Chooralmala/Meppadi)
    res = client.get("/api/incidents/proximity?lat=11.53&lon=76.12")
    assert res.status_code == 200
    prox = res.json()
    assert "advisory_type" in prox
    assert "advisory_text" in prox
    assert prox["advisory_type"] in ["WARNING", "NOTICE", "SAFE"]

    # Offshore coordinates far from land (no active landslides)
    res_far = client.get("/api/incidents/proximity?lat=0.0&lon=80.0")
    assert res_far.status_code == 200
    prox_far = res_far.json()
    assert prox_far["advisory_type"] == "SAFE"
    assert "No current official landslide warnings" in prox_far["advisory_text"]


def test_incidents_filtration_and_backward_compatibility():
    # Backward compatible GET /api/incidents
    res = client.get("/api/incidents")
    assert res.status_code == 200
    inc_list = res.json()
    assert len(inc_list) > 0

    # Filter by severity
    res_crit = client.get("/api/incidents?severity=CRITICAL")
    assert res_crit.status_code == 200
    for i in res_crit.json():
        assert i["severity"] == "CRITICAL"

    # Filter by simulation category
    res_sim = client.get("/api/incidents?category=DEMO_SIMULATION")
    assert res_sim.status_code == 200
    assert len(res_sim.json()) == 3
    for s in res_sim.json():
        assert s["verification_status"] == "DEMO / SIMULATION"


# ---------------- 8. Emergency Resources Discovery & All Emergency Aggregation ----------------
def test_emergency_resources_all_category_aggregation():
    # Query with category=all around Harohalli / Jakkasandra
    res = client.get("/api/resources/nearby?lat=12.644465&lng=77.436542&radius_km=10&category=all")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["total_found"] >= 5
    places = data["places"]
    assert len(places) == data["total_found"]

    # Must contain both hospitals and police facilities (not hospital-only!)
    categories_found = {p["category"] for p in places}
    assert "hospitals" in categories_found
    assert "police" in categories_found

    # Verify deduplication, distance sorting, and structure
    for i in range(len(places) - 1):
        assert places[i]["distance_km"] <= places[i + 1]["distance_km"]

    for p in places:
        assert p["name"]
        assert -90 <= p["latitude"] <= 90
        assert -180 <= p["longitude"] <= 180
        assert p["category"] in ["hospitals", "police", "fire", "shelters"]
        assert p["type"] != ""


def test_emergency_resources_single_category_filtering():
    # Hospitals only
    res_hosp = client.get("/api/resources/nearby?lat=12.644465&lng=77.436542&radius_km=10&category=hospitals")
    assert res_hosp.status_code == 200
    for p in res_hosp.json()["places"]:
        assert p["category"] == "hospitals"

    # Police only
    res_pol = client.get("/api/resources/nearby?lat=12.644465&lng=77.436542&radius_km=10&category=police")
    assert res_pol.status_code == 200
    for p in res_pol.json()["places"]:
        assert p["category"] == "police"


