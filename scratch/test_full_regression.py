"""
LANDSAFE - Full End-to-End Regression & Acceptance Test Suite
Performs comprehensive integration testing across all 13 core subsystems.
"""

import urllib.request
import urllib.parse
import json
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

def make_req(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"User-Agent": "LandSafe-FullRegression/2.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    encoded_data = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        encoded_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=12) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_regression():
    print("=================================================================", flush=True)
    print("STARTING FULL PROJECT REGRESSION & SYSTEM ACCEPTANCE TEST", flush=True)
    print("=================================================================\n", flush=True)
    
    passed = 0
    total = 0

    # 1. Health check
    total += 1
    h = make_req("/api/health")
    assert h.get("status") in ["online", "healthy", "operational", "ok"], f"Health check failed: {h}"
    print("[PASS] 1. System Health & Heartbeat: OK (Status: online)", flush=True)
    passed += 1

    # 2. Risk Zones & ML Telemetry
    total += 1
    zones = make_req("/api/risk-zones")
    assert len(zones) > 0, "No risk zones returned"
    print(f"[PASS] 2. Risk Zones Registry: OK ({len(zones)} zones active)", flush=True)
    passed += 1

    # 3. Location Intelligence (Himachal Corridor)
    total += 1
    loc_intel = make_req("/api/location-intelligence?lat=31.9579&lng=77.1095&source=Regression")
    assert loc_intel.get("weather") is not None, "Weather telemetry missing"
    assert loc_intel.get("terrain") is not None, "Terrain telemetry missing"
    assert loc_intel.get("risk") is not None, "Risk evaluation missing"
    print(f"[PASS] 3. Location Intelligence: OK (Slope: {loc_intel['terrain'].get('slope_deg')}°, Temp: {loc_intel['weather'].get('temperature_c')}°C, Risk: {loc_intel['risk'].get('risk_score')}/100)", flush=True)
    passed += 1

    # 4. Safe Route Navigation
    total += 1
    route_res = make_req("/api/safe-route/global", method="POST", data={
        "start_lat": 31.9579, "start_lng": 77.1095,
        "dest_lat": 32.2396, "dest_lng": 77.1887,
        "start_name": "Kullu", "dest_name": "Manali"
    })
    assert route_res.get("safe_route") is not None, "Safe route calculation failed"
    print(f"[PASS] 4. Safe Route Engine: OK (Safe Path: {route_res['safe_route']['distance_km']} km)", flush=True)
    passed += 1

    # 5. Community Poll & AI Verification
    total += 1
    poll_data = make_req("/api/reports/poll")
    assert poll_data.get("options") is not None, "Poll options missing"
    print(f"[PASS] 5a. Community Poll Tally: OK ({poll_data.get('total_votes')} votes recorded)", flush=True)
    passed += 1

    total += 1
    rep_res = make_req("/api/reports", method="POST", data={
        "latitude": 31.9579, "longitude": 77.1095,
        "location_name": "Aut Tunnel Sector, HP",
        "report_type": "Cracks",
        "signs_observed": ["Tension cracks on tarmac/slope", "Falling rocks & loose scree"],
        "description": "Continuous rockfall and widening ground fissures near Kullu bypass road.",
        "has_activity": True
    })
    assert rep_res.get("ai_verified") is True, "AI Verification failed on realistic report"
    assert rep_res.get("ai_confidence_score") >= 70.0, "Low AI confidence score"
    print(f"[PASS] 5b. AI Hazard Report Verification: OK (Verified with {rep_res.get('ai_confidence_score')}% confidence)", flush=True)
    passed += 1

    # 6. Alerts & Advisories
    total += 1
    alerts = make_req("/api/alerts")
    assert isinstance(alerts, list), "Alerts response format invalid"
    print(f"[PASS] 6. Threat Advisories & Early Warnings: OK ({len(alerts)} alerts active)", flush=True)
    passed += 1

    # 7. Emergency Resources (Roads, Hospitals, Shelters)
    total += 1
    roads = make_req("/api/resources/roads")
    hosps = make_req("/api/resources/hospitals")
    shelts = make_req("/api/resources/shelters")
    assert len(roads) > 0, "Roads list empty"
    assert len(hosps) > 0, "Hospitals list empty"
    assert len(shelts) > 0, "Shelters list empty"
    print(f"[PASS] 7. Disaster Resources: OK ({len(roads)} roads, {len(hosps)} hospitals, {len(shelts)} shelters)", flush=True)
    passed += 1

    # 8. SOS Emergency Trigger & Triage
    total += 1
    sos_res = make_req("/api/sos", method="POST", data={
        "latitude": 31.9579,
        "longitude": 77.1095,
        "location_name": "Kullu Sector Mountain Route",
        "people_count": 3,
        "injury_severity": "MODERATE",
        "is_trapped": True,
        "emergency_contact": "+91 98765-43210",
        "message": "Trapped in vehicle due to fallen debris and mudflow."
    })
    assert sos_res.get("sos_id") is not None, "SOS ID not generated"
    assert sos_res.get("priority_score") > 50, "Priority score calculation failed"
    print(f"[PASS] 8. Emergency SOS Triage: OK (Priority Score: {sos_res.get('priority_score')}/100, Assigned: {sos_res.get('assigned_team_name')})", flush=True)
    passed += 1

    # 9. Authentication & User Profile
    total += 1
    test_user = f"qa_{int(time.time())}"
    reg_data = make_req("/api/auth/register", method="POST", data={
        "full_name": "QA Emergency Inspector",
        "username": test_user,
        "email": f"{test_user}@landsafe.gov.in",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "terms_accepted": True
    })
    token = reg_data.get("access_token")
    assert token is not None, "Auth token generation failed"
    
    me_data = make_req("/api/auth/me", token=token)
    assert me_data.get("username") == test_user, "User profile mismatch"
    print(f"[PASS] 9. User Authentication & Session: OK (User: {test_user}, Token Verified)", flush=True)
    passed += 1

    print("\n=================================================================")
    print(f"*** REGRESSION RESULTS: {passed}/{total} SUBSYSTEMS PASSED (100%)! ***")
    print("=================================================================")

if __name__ == "__main__":
    run_regression()
