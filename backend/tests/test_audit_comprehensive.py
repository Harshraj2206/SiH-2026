import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.database.user_store import user_db

client = TestClient(app)

# Helper tokens
def get_token(email: str, role: str) -> dict:
    token = create_access_token({"sub": email, "email": email, "role": role})
    return {"Authorization": f"Bearer {token}"}

RESIDENT_HEADERS = get_token("resident@landslideguard.gov.in", "USER")
AUTHORITY_HEADERS = get_token("officer@sdim.ner.gov.in", "AUTHORITY")
ADMIN_HEADERS = get_token("admin@landslideguard.gov.in", "ADMIN")


# ============================================================
# 1. AUTHENTICATION & RBAC TESTS
# ============================================================
class TestAuthAndRBAC:
    def test_login_success(self):
        res = client.post("/api/auth/login", json={"email": "resident@landslideguard.gov.in", "password": "Resident@2026!"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["role"] in ["USER", "resident"]

    def test_login_invalid_password(self):
        res = client.post("/api/auth/login", json={"email": "resident@landslideguard.gov.in", "password": "WrongPassword!"})
        assert res.status_code in [400, 401]

    def test_login_nonexistent_user(self):
        res = client.post("/api/auth/login", json={"email": "nonexistent@landsafe.org", "password": "AnyPassword123"})
        assert res.status_code in [400, 401, 404]

    def test_login_empty_payload(self):
        res = client.post("/api/auth/login", json={})
        assert res.status_code == 422

    def test_auth_me_unauthorized(self):
        res = client.get("/api/auth/me")
        assert res.status_code == 401

    def test_auth_me_authorized(self):
        res = client.get("/api/auth/me", headers=RESIDENT_HEADERS)
        assert res.status_code == 200
        assert res.json()["email"] == "resident@landslideguard.gov.in"

    def test_profile_update(self):
        res = client.patch(
            "/api/auth/profile",
            headers=RESIDENT_HEADERS,
            json={"full_name": "Updated Citizen Name", "phone": "+919876543210"}
        )
        assert res.status_code == 200
        assert res.json()["full_name"] == "Updated Citizen Name"

    def test_emergency_contacts_crud(self):
        # Add contact
        add_res = client.post(
            "/api/auth/emergency-contacts",
            headers=RESIDENT_HEADERS,
            json={"name": "Doctor Kumar", "phone": "+919876500000", "relationship": "Physician"}
        )
        assert add_res.status_code == 200
        contacts = add_res.json()
        assert any(c["name"] == "Doctor Kumar" for c in contacts)

        # Delete contact
        contact_id = contacts[-1]["id"]
        del_res = client.delete(f"/api/auth/emergency-contacts/{contact_id}", headers=RESIDENT_HEADERS)
        assert del_res.status_code == 200


# ============================================================
# 2. RISK ZONES & TELEMETRY
# ============================================================
class TestRiskZonesAndTelemetry:
    def test_get_all_risk_zones(self):
        res = client.get("/api/risk-zones")
        assert res.status_code == 200
        zones = res.json()
        assert len(zones) >= 4
        for z in zones:
            assert "zone_id" in z
            assert "name" in z
            assert "risk_score" in z
            assert 0 <= z["risk_score"] <= 100

    def test_get_risk_zone_valid(self):
        res = client.get("/api/risk-zones/HP-01")
        assert res.status_code == 200
        data = res.json()
        assert data["zone"]["zone_id"] == "HP-01"

    def test_get_risk_zone_invalid(self):
        res = client.get("/api/risk-zones/INVALID-ZONE-999")
        assert res.status_code == 404

    def test_telemetry_inspect_valid(self):
        res = client.post("/api/telemetry/inspect", json={"latitude": 31.9579, "longitude": 77.1095})
        assert res.status_code == 200
        data = res.json()
        assert "risk_score" in data
        assert "elevation_amsl" in data

    def test_telemetry_inspect_boundary(self):
        # Latitude out of range
        res = client.post("/api/telemetry/inspect", json={"latitude": 95.0, "longitude": 77.0})
        assert res.status_code in [400, 422]


# ============================================================
# 3. ML PREDICTOR & XAI
# ============================================================
class TestMLPredictor:
    def test_predict_valid_inputs(self):
        payload = {
            "rainfall_24h": 120.0,
            "rainfall_72h": 220.0,
            "slope_deg": 42.0,
            "soil_moisture": 0.55,
            "ndvi": 0.28,
            "historical_incidents": 6
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert 0 <= data["risk_score"] <= 100
        assert data["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        assert "xai" in data
        assert "factors" in data["xai"]
        assert "summary" in data["xai"]

    def test_predict_extreme_inputs(self):
        payload = {
            "rainfall_24h": 500.0,
            "rainfall_72h": 900.0,
            "slope_deg": 85.0,
            "soil_moisture": 1.0,
            "ndvi": 0.05,
            "historical_incidents": 20
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 200
        assert res.json()["risk_level"] in ["HIGH", "CRITICAL"]

    def test_predict_zero_inputs(self):
        payload = {
            "rainfall_24h": 0.0,
            "rainfall_72h": 0.0,
            "slope_deg": 0.0,
            "soil_moisture": 0.0,
            "ndvi": 1.0,
            "historical_incidents": 0
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 200
        assert res.json()["risk_score"] < 50.0

    def test_predict_invalid_types(self):
        res = client.post("/api/predict", json={"rainfall_24h": "not_a_number"})
        assert res.status_code == 422


# ============================================================
# 4. LOCATION INTELLIGENCE & WEATHER
# ============================================================
class TestLocationIntelligence:
    def test_location_intelligence_valid(self):
        res = client.get("/api/location-intelligence?lat=12.6445&lng=77.4365")
        assert res.status_code == 200
        data = res.json()
        assert "location" in data
        assert "weather" in data or "precipitation" in data

    def test_location_intelligence_search(self):
        res = client.post("/api/location-intelligence/search", json={"query": "Shimla, Himachal Pradesh"})
        assert res.status_code == 200
        data = res.json()
        assert "location" in data
        assert abs(data["location"]["latitude"] - 31.1) < 1.0

    def test_location_intelligence_search_empty(self):
        res = client.post("/api/location-intelligence/search", json={"query": ""})
        assert res.status_code in [400, 422]


# ============================================================
# 5. SAFE ROUTING & NAVIGATION
# ============================================================
class TestSafeRouting:
    def test_safe_route_waypoints(self):
        res = client.get("/api/safe-route/waypoints")
        assert res.status_code == 200
        waypoints = res.json()
        assert len(waypoints) >= 2

    def test_safe_route_global_valid(self):
        payload = {
            "start_lat": 31.9579,
            "start_lng": 77.1095,
            "dest_lat": 31.9800,
            "dest_lng": 77.1300,
            "start_name": "Start Point",
            "dest_name": "End Point"
        }
        res = client.post("/api/safe-route/global", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "safe_route" in data
        assert "distance_km" in data["safe_route"]
        assert "travel_time_min" in data["safe_route"]

    def test_safe_route_geocode(self):
        res = client.post("/api/safe-route/geocode", json={"query": "Manali, Himachal Pradesh"})
        assert res.status_code == 200
        data = res.json()
        assert "lat" in data
        assert "lng" in data


# ============================================================
# 6. INCIDENTS & REAL-TIME INTELLIGENCE
# ============================================================
class TestIncidentsIntelligence:
    def test_incidents_list(self):
        res = client.get("/api/incidents")
        assert res.status_code == 200
        assert isinstance(res.json(), list)
        assert len(res.json()) > 0

    def test_incidents_intelligence_endpoint(self):
        res = client.get("/api/incidents/intelligence")
        assert res.status_code == 200
        data = res.json()
        assert "confirmed_incidents" in data
        assert "coverage_summary" in data
        assert data["coverage_summary"]["total_confirmed_incidents"] > 0

    def test_incidents_proximity_near_wayanad(self):
        res = client.get("/api/incidents/proximity?lat=11.53&lon=76.12")
        assert res.status_code == 200
        data = res.json()
        assert data["advisory_type"] in ["WARNING", "NOTICE"]

    def test_incidents_proximity_safe_ocean(self):
        res = client.get("/api/incidents/proximity?lat=0.0&lon=80.0")
        assert res.status_code == 200
        data = res.json()
        assert data["advisory_type"] == "SAFE"


# ============================================================
# 7. EMERGENCY RESOURCES DISCOVERY & AGGREGATION
# ============================================================
class TestEmergencyResources:
    def test_resources_all_category(self):
        res = client.get("/api/resources/nearby?lat=12.644465&lng=77.436542&radius_km=10&category=all")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["total_found"] >= 5
        categories = {p["category"] for p in data["places"]}
        assert "hospitals" in categories
        assert "police" in categories

    def test_resources_boundary_radius(self):
        # 1 km vs 50 km radius bounds
        res_min = client.get("/api/resources/nearby?lat=12.644465&lng=77.436542&radius_km=1&category=all")
        assert res_min.status_code == 200
        assert res_min.json()["search_radius_km"] == 1.0

        res_max = client.get("/api/resources/nearby?lat=12.644465&lng=77.436542&radius_km=50&category=all")
        assert res_max.status_code == 200
        assert res_max.json()["search_radius_km"] == 50.0

        # Out of bounds (>50km) correctly returns 422
        res_oob = client.get("/api/resources/nearby?lat=12.644465&lng=77.436542&radius_km=100&category=all")
        assert res_oob.status_code == 422

    def test_resources_invalid_coords(self):
        res = client.get("/api/resources/nearby?lat=999&lng=77.4365&radius_km=10&category=all")
        assert res.status_code in [400, 422]


# ============================================================
# 8. COMMUNITY REPORTS & AUTHORITY VERIFICATION
# ============================================================
class TestCommunityReports:
    def test_create_report_and_verify_lifecycle(self):
        # Create report as resident
        payload = {
            "report_type": "Slope movement",
            "description": "Loose rocks and debris observed near km 42.",
            "location_name": "Solan By-pass",
            "latitude": 30.9045,
            "longitude": 77.0967
        }
        res = client.post("/api/reports", headers=RESIDENT_HEADERS, json=payload)
        assert res.status_code in [200, 201]
        report = res.json()
        report_id = report["id"]
        assert report["status"] in ["PENDING", "VERIFIED"]

        # Resident attempts to verify report -> Forbidden
        res_fail = client.patch(
            f"/api/reports/{report_id}/verify",
            headers=RESIDENT_HEADERS,
            json={"status": "REJECTED"}
        )
        assert res_fail.status_code == 403

        # Authority verifies or rejects report -> Success
        res_ok = client.patch(
            f"/api/reports/{report_id}/verify",
            headers=AUTHORITY_HEADERS,
            json={"status": "REJECTED"}
        )
        assert res_ok.status_code == 200
        assert res_ok.json()["status"] == "REJECTED"


# ============================================================
# 9. SOS LIFECYCLE & EMERGENCY DISPATCH
# ============================================================
class TestSOSLifecycle:
    def test_sos_create_and_triage(self):
        payload = {
            "latitude": 31.9579,
            "longitude": 77.1095,
            "location_name": "Kullu Valley Emergency Point",
            "injury_severity": "MODERATE",
            "people_count": 3,
            "message": "Elderly person stranded after debris fall."
        }
        res = client.post("/api/sos", headers=RESIDENT_HEADERS, json=payload)
        assert res.status_code in [200, 201]
        sos = res.json()
        sos_id = sos["sos_id"]
        assert sos["status"] in ["PENDING", "ACTIVE", "DISPATCHED"]

        # Resident attempts to triage -> Forbidden
        res_forbidden = client.patch(
            f"/api/sos/{sos_id}/triage",
            headers=RESIDENT_HEADERS,
            json={"status": "DISPATCHED", "triage_priority": "CRITICAL"}
        )
        assert res_forbidden.status_code == 403

        # Authority triages SOS -> Success
        res_triaged = client.patch(
            f"/api/sos/{sos_id}/triage",
            headers=AUTHORITY_HEADERS,
            json={"status": "DISPATCHED", "triage_priority": "CRITICAL"}
        )
        assert res_triaged.status_code == 200
        assert res_triaged.json()["status"] == "DISPATCHED"


# ============================================================
# 10. SIMULATION LIFECYCLE & RESET
# ============================================================
class TestSimulation:
    def test_simulation_reset_and_steps(self):
        res_reset = client.post("/api/simulation/reset", headers=ADMIN_HEADERS)
        assert res_reset.status_code == 200
        assert res_reset.json()["status"] == "success"

        # Step 1
        res_step1 = client.post("/api/simulation/step/1", headers=ADMIN_HEADERS)
        assert res_step1.status_code == 200
        assert res_step1.json()["step"] == 1

        # Reset back
        client.post("/api/simulation/reset", headers=ADMIN_HEADERS)
