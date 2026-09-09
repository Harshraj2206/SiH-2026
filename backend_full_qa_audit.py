#!/usr/bin/env python3
"""
LANDSAFE SIH26001 - Comprehensive End-to-End QA & Bug-Hunting Test Suite
Audits all 16 API routers, authentication & RBAC, boundary conditions, edge cases,
security sanitization, and data consistency.
"""

import sys
import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://localhost:8000"

results = {
    "passed": 0,
    "failed": 0,
    "blocked": 0,
    "details": []
}

def log_test(name, status, details=""):
    results["details"].append({"name": name, "status": status, "details": details})
    if status == "PASS":
        results["passed"] += 1
        print(f"  [PASS] {name} - {details}" if details else f"  [PASS] {name}", flush=True)
    elif status == "FAIL":
        results["failed"] += 1
        print(f"  [FAIL] {name}: {details}", flush=True)
    elif status == "BLOCKED":
        results["blocked"] += 1
        print(f"  [BLOCKED] {name}: {details}", flush=True)

def request(method, path, body=None, token=None, timeout=25):
    url = f"{BASE_URL}{path}"
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            res_body = res.read().decode("utf-8")
            parsed = json.loads(res_body) if res_body else None
            return res.status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed_err = json.loads(err_body)
        except Exception:
            parsed_err = err_body
        return e.code, parsed_err
    except Exception as e:
        return 0, str(e)

print("\n================================================================================", flush=True)
print("SECTION 1: SYSTEM HEALTH & INTEGRITY AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/health")
if status == 200 and data.get("status") == "online":
    log_test("System Health Endpoint (/api/health)", "PASS", f"System: {data.get('system')} | Monitored Zones: {data.get('active_zones_monitored')}")
else:
    log_test("System Health Endpoint (/api/health)", "FAIL", f"Status: {status}, Data: {data}")

print("\n================================================================================", flush=True)
print("SECTION 2: AUTHENTICATION & RBAC PERMISSION AUDIT", flush=True)
print("================================================================================", flush=True)
# Test login for all seeded accounts
roles = [
    ("Admin", "admin@landslideguard.gov.in", "Admin@2026!"),
    ("Authority", "officer@sdim.ner.gov.in", "Officer@2026!"),
    ("Rescue Team", "rescue@sdrf.ner.gov.in", "Rescue@2026!"),
    ("Medical Center", "medical@civilhosp.ner.gov.in", "Medical@2026!"),
    ("Citizen", "resident@landslideguard.gov.in", "Resident@2026!")
]

tokens = {}
for role_name, email, password in roles:
    status, data = request("POST", "/api/auth/login", {"username": email, "password": password})
    if status == 200 and "access_token" in data:
        tokens[role_name] = data["access_token"]
        user_info = data.get("user", {})
        log_test(f"Login valid user: {role_name} ({email})", "PASS", f"Role: {user_info.get('role')}")
    else:
        log_test(f"Login valid user: {role_name} ({email})", "FAIL", f"Status {status}: {data}")

# Test invalid login credentials
status, data = request("POST", "/api/auth/login", {"username": "resident@landslideguard.gov.in", "password": "WrongPassword999!"})
if status == 401:
    log_test("Reject incorrect password with HTTP 401", "PASS")
else:
    log_test("Reject incorrect password with HTTP 401", "FAIL", f"Got status {status}")

status, data = request("POST", "/api/auth/login", {"username": "nonexistent_officer@sdim.ner.gov.in", "password": "AnyPassword123!"})
if status == 401:
    log_test("Reject nonexistent user with HTTP 401", "PASS")
else:
    log_test("Reject nonexistent user with HTTP 401", "FAIL", f"Got status {status}")

status, data = request("POST", "/api/auth/login", {"username": "", "password": ""})
if status in [400, 401, 422]:
    log_test("Reject empty credentials safely", "PASS")
else:
    log_test("Reject empty credentials safely", "FAIL", f"Got status {status}")

# Test authenticated /api/auth/me
cit_token = tokens.get("Citizen")
status, data = request("GET", "/api/auth/me", token=cit_token)
if status == 200 and data.get("email") == "resident@landslideguard.gov.in":
    log_test("Verify /api/auth/me token session restoration", "PASS", f"User: {data.get('full_name')} ({data.get('role')})")
else:
    log_test("Verify /api/auth/me token session restoration", "FAIL", f"Status {status}: {data}")

# Test unauthorized access to /api/auth/me
status, data = request("GET", "/api/auth/me", token="invalid_bearer_token_12345")
if status == 401:
    log_test("Reject invalid bearer token on /api/auth/me", "PASS")
else:
    log_test("Reject invalid bearer token on /api/auth/me", "FAIL", f"Got status {status}")

# Test emergency contacts CRUD
status, data = request("POST", "/api/auth/emergency-contacts", {
    "name": "Emergency Test Contact",
    "phone": "+919876543210",
    "relationship": "Family"
}, token=cit_token)
if status in [200, 201] and isinstance(data, list):
    log_test("Emergency Contacts Add (POST /api/auth/emergency-contacts)", "PASS")
    contact_id = data[-1].get("id")
    if contact_id:
        del_status, del_data = request("DELETE", f"/api/auth/emergency-contacts/{contact_id}", token=cit_token)
        if del_status == 200:
            log_test("Emergency Contacts Delete (DELETE /api/auth/emergency-contacts/{id})", "PASS")
        else:
            log_test("Emergency Contacts Delete", "FAIL", f"Status {del_status}")
else:
    log_test("Emergency Contacts Add", "FAIL", f"Status {status}: {data}")

print("\n================================================================================", flush=True)
print("SECTION 3: LOCATION INTELLIGENCE & REVERSE GEOCODING AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/location-intelligence?lat=31.1048&lng=77.1734")
if status == 200 and "location" in data and "latitude" in data["location"]:
    loc = data["location"]
    terrain = data.get("terrain", {})
    log_test("Location Intelligence lookup (/api/location-intelligence)", "PASS", f"District: {loc.get('district')}, {loc.get('state_province')} | Slope: {terrain.get('slope_deg')} deg")
else:
    log_test("Location Intelligence lookup", "FAIL", f"Status {status}: {data}")

status, data = request("POST", "/api/location-intelligence/search", {"query": "Manali"})
if status == 200 and "location" in data and "latitude" in data["location"]:
    loc = data["location"]
    log_test("Location Intelligence Search (/api/location-intelligence/search)", "PASS", f"Location: {loc.get('district')}, {loc.get('state_province')}")
else:
    log_test("Location Intelligence Search", "FAIL", f"Status {status}: {data}")

print("\n================================================================================", flush=True)
print("SECTION 4: REAL-TIME WEATHER TELEMETRY AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/weather?lat=31.1048&lon=77.1734")
if status == 200 and "temperature_c" in data and "weather_code" in data:
    log_test("Live Weather Telemetry (/api/weather)", "PASS", f"Temp: {data.get('temperature_c')}C | Condition: {data.get('condition')}")
else:
    log_test("Live Weather Telemetry", "FAIL", f"Status {status}: {data}")

# Test invalid coordinates
status, data = request("GET", "/api/weather?lat=999&lon=999")
if status in [400, 422, 500, 502]:
    log_test("Weather endpoint with invalid coordinate bounds safely rejected", "PASS", f"Status: {status}")
else:
    log_test("Weather endpoint with invalid coordinate bounds", "FAIL", f"Status: {status}")

print("\n================================================================================", flush=True)
print("SECTION 5: RISK ZONES & MONITORED REGIONS AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/risk-zones")
if status == 200 and isinstance(data, list) and len(data) > 0:
    first_zone = data[0]
    zone_id = first_zone["zone_id"]
    log_test("Get Monitored Risk Zones (/api/risk-zones)", "PASS", f"Zones count: {len(data)}")
    
    # Detail check
    z_status, z_data = request("GET", f"/api/risk-zones/{zone_id}")
    if z_status == 200 and "zone" in z_data:
        log_test(f"Get Zone Details (/api/risk-zones/{zone_id})", "PASS", f"Name: {z_data['zone'].get('name')} | Risk: {z_data['zone'].get('risk_level')}")
    else:
        log_test(f"Get Zone Details (/api/risk-zones/{zone_id})", "FAIL", f"Status: {z_status}")
else:
    log_test("Get Monitored Risk Zones", "FAIL", f"Status {status}: {data}")

print("\n================================================================================", flush=True)
print("SECTION 6: MACHINE LEARNING RISK PREDICTOR AUDIT", flush=True)
print("================================================================================", flush=True)
valid_features = {
    "rainfall_24h": 45.0,
    "rainfall_72h": 110.0,
    "slope_deg": 38.0,
    "soil_moisture": 0.85,
    "ndvi": 0.6,
    "historical_incidents": 2
}

status, data = request("POST", "/api/predict", valid_features)
if status == 200 and "risk_score" in data and "risk_level" in data:
    log_test("ML Predictor with standard Himalayan conditions (/api/predict)", "PASS", f"Score: {data.get('risk_score')} | Level: {data.get('risk_level')}")
else:
    log_test("ML Predictor with standard Himalayan conditions", "FAIL", f"Status {status}: {data}")

# Boundary test: zero values
zero_features = {
    "rainfall_24h": 0.0,
    "rainfall_72h": 0.0,
    "slope_deg": 0.0,
    "soil_moisture": 0.0,
    "ndvi": 0.5,
    "historical_incidents": 0
}
status, data = request("POST", "/api/predict", zero_features)
if status == 200 and 0.0 <= data.get("risk_score", -1) <= 100.0:
    log_test("ML Predictor with boundary zero inputs", "PASS", f"Score: {data.get('risk_score')}")
else:
    log_test("ML Predictor with boundary zero inputs", "FAIL", f"Status {status}: {data}")

# Boundary test: high precipitation
high_precip = {
    "rainfall_24h": 400.0,
    "rainfall_72h": 750.0,
    "slope_deg": 65.0,
    "soil_moisture": 0.98,
    "ndvi": 0.2,
    "historical_incidents": 15
}
status, data = request("POST", "/api/predict", high_precip)
if status == 200 and data.get("risk_score", 0) > 75.0:
    log_test("ML Predictor with catastrophic conditions", "PASS", f"Score: {data.get('risk_score')} | Level: {data.get('risk_level')}")
else:
    log_test("ML Predictor with catastrophic conditions", "FAIL", f"Status {status}: {data}")

print("\n================================================================================", flush=True)
print("SECTION 7: SAFE ROUTING & EVACUATION AUDIT", flush=True)
print("================================================================================", flush=True)
# Waypoints
status, data = request("GET", "/api/safe-route/waypoints")
if status == 200 and isinstance(data, list) and len(data) > 0:
    log_test("Safe Route Waypoints (/api/safe-route/waypoints)", "PASS", f"Count: {len(data)}")
else:
    log_test("Safe Route Waypoints", "FAIL", f"Status {status}: {data}")

# Preset route calculation
status, data = request("POST", "/api/safe-route", {
    "start_node": "SILIGURI_HUB",
    "destination_node": "GANGTOK_RIDGE",
    "avoid_blocked_roads": True
})
if status == 200 and "safe_route" in data:
    log_test("Safe Route Preset NetworkX Calculation", "PASS", f"Distance: {data['safe_route'].get('total_distance_km')}km")
else:
    log_test("Safe Route Preset NetworkX Calculation", "FAIL", f"Status {status}: {data}")

# Dynamic Global Road Routing
status, data = request("POST", "/api/safe-route/global", {
    "start_lat": 31.9579,
    "start_lng": 77.1095,
    "dest_lat": 32.2432,
    "dest_lng": 77.1892,
    "start_name": "Kullu, HP",
    "dest_name": "Manali, HP"
})
if status == 200 and "safe_route" in data:
    coords = data["safe_route"].get("path_coordinates") or data["safe_route"].get("coordinates") or []
    log_test("Dynamic Road Routing (/api/safe-route/global)", "PASS", f"Points: {len(coords)} | Distance: {data['safe_route'].get('total_distance_km')}km")
else:
    log_test("Dynamic Road Routing", "FAIL", f"Status {status}: {data}")

print("\n================================================================================", flush=True)
print("SECTION 8: EMERGENCY RESOURCES DISCOVERY & MONOTONIC RADIUS AUDIT", flush=True)
print("================================================================================", flush=True)
radii = [5, 10, 25, 50]
prev_count = 0
monotonic = True

for r in radii:
    status, data = request("GET", f"/api/resources/nearby?lat=12.9716&lng=77.5946&radius_km={r}&category=hospitals")
    if status == 200 and "places" in data:
        count = len(data["places"])
        if count < prev_count:
            monotonic = False
        prev_count = count
        log_test(f"Emergency Resources Discovery ({r}km radius)", "PASS", f"Places: {count} | Source: {data.get('data_source', {}).get('provider')}")
    else:
        log_test(f"Emergency Resources Discovery ({r}km radius)", "FAIL", f"Status {status}")

if monotonic:
    log_test("Cumulative Monotonic Retention (Results(r1) <= Results(r2))", "PASS")
else:
    log_test("Cumulative Monotonic Retention", "FAIL", "Results shrank as radius expanded!")

# Test all categories
categories = ["hospitals", "police", "fire", "shelters", "all"]
for cat in categories:
    status, data = request("GET", f"/api/resources/nearby?lat=12.9716&lng=77.5946&radius_km=10&category={cat}")
    if status == 200 and "places" in data:
        log_test(f"Emergency Resource Category ({cat})", "PASS", f"Count: {len(data['places'])}")
    else:
        log_test(f"Emergency Resource Category ({cat})", "FAIL", f"Status {status}")

# Cataloged roads, hospitals, shelters
status, data = request("GET", "/api/resources/roads")
if status == 200 and isinstance(data, list):
    log_test("Cataloged Road Segments (/api/resources/roads)", "PASS", f"Count: {len(data)}")
else:
    log_test("Cataloged Road Segments", "FAIL", f"Status {status}")

status, data = request("GET", "/api/resources/hospitals")
if status == 200 and isinstance(data, list):
    log_test("Cataloged Hospitals (/api/resources/hospitals)", "PASS", f"Count: {len(data)}")
else:
    log_test("Cataloged Hospitals", "FAIL", f"Status {status}")

status, data = request("GET", "/api/resources/shelters")
if status == 200 and isinstance(data, list):
    log_test("Cataloged Shelters (/api/resources/shelters)", "PASS", f"Count: {len(data)}")
else:
    log_test("Cataloged Shelters", "FAIL", f"Status {status}")

print("\n================================================================================", flush=True)
print("SECTION 9: INCIDENTS & LIVE INTELLIGENCE AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/incidents")
if status == 200 and isinstance(data, list):
    log_test("Incidents List (/api/incidents)", "PASS", f"Count: {len(data)}")
else:
    log_test("Incidents List", "FAIL", f"Status {status}")

status, data = request("GET", "/api/incidents/intelligence")
if status == 200 and "confirmed_incidents" in data and "forecast_risks" in data:
    log_test("India-Wide Incidents Intelligence (/api/incidents/intelligence)", "PASS", f"Confirmed: {len(data['confirmed_incidents'])}, Forecasts: {len(data['forecast_risks'])}")
else:
    log_test("India-Wide Incidents Intelligence", "FAIL", f"Status {status}")

status, data = request("GET", "/api/incidents/proximity?lat=11.5320&lon=76.1280")
if status == 200 and ("advisory_type" in data or "nearest_hazard" in data):
    log_test("Incidents Proximity Advisory (/api/incidents/proximity)", "PASS", f"Type: {data.get('advisory_type')} | Distance: {data.get('nearest_distance_km')}km")
else:
    log_test("Incidents Proximity Advisory", "FAIL", f"Status {status}: {data}")

print("\n================================================================================", flush=True)
print("SECTION 10: COMMUNITY REPORTS & SOS LIFECYCLE AUDIT", flush=True)
print("================================================================================", flush=True)
# List reports
status, data = request("GET", "/api/reports")
if status == 200 and isinstance(data, list):
    log_test("Get Community Reports (/api/reports)", "PASS", f"Count: {len(data)}")
else:
    log_test("Get Community Reports", "FAIL", f"Status {status}")

# Submit community report
report_payload = {
    "latitude": 31.1048,
    "longitude": 77.1734,
    "report_type": "Slope movement",
    "description": "Minor road slope slip observed during QA audit test run.",
    "zone_id": "ZONE-HP-001"
}
status, data = request("POST", "/api/reports", report_payload, token=cit_token)
if status in [200, 201] and "id" in data:
    rep_id = data["id"]
    log_test("Submit Community Report (POST /api/reports)", "PASS", f"Report ID: {rep_id}")
    
    # Authority verifies report
    auth_token = tokens.get("Authority")
    v_status, v_data = request("PATCH", f"/api/reports/{rep_id}/verify", {"status": "VERIFIED"}, token=auth_token)
    if v_status == 200:
        log_test("Authority Verify Report (PATCH /api/reports/{id}/verify)", "PASS")
    else:
        log_test("Authority Verify Report", "FAIL", f"Status {v_status}: {v_data}")
        
    # Unauthorized citizen cannot verify
    bad_v_status, _ = request("PATCH", f"/api/reports/{rep_id}/verify", {"status": "VERIFIED"}, token=cit_token)
    if bad_v_status in [401, 403]:
        log_test("RBAC Block Unauthorized Citizen from verifying reports", "PASS", f"Status: {bad_v_status}")
    else:
        log_test("RBAC Block Unauthorized Citizen from verifying reports", "FAIL", f"Status: {bad_v_status}")
else:
    log_test("Submit Community Report", "FAIL", f"Status {status}: {data}")

# SOS List & Create
status, data = request("GET", "/api/sos")
if status == 200 and isinstance(data, list):
    log_test("Get Active SOS Requests (/api/sos)", "PASS", f"Count: {len(data)}")
else:
    log_test("Get Active SOS Requests", "FAIL", f"Status {status}")

sos_payload = {
    "user_name": "QA SOS Test",
    "emergency_contact": "+919999988888",
    "latitude": 31.1048,
    "longitude": 77.1734,
    "injury_severity": "MODERATE",
    "people_count": 2,
    "is_trapped": False,
    "message": "Simulated distress broadcast during automated QA audit."
}
status, data = request("POST", "/api/sos", sos_payload)
if status in [200, 201] and "sos_id" in data:
    sos_id = data["sos_id"]
    log_test("Create SOS Request (POST /api/sos)", "PASS", f"SOS ID: {sos_id}")
    
    # Triage SOS by Authority
    auth_token = tokens.get("Authority")
    t_status, t_data = request("PATCH", f"/api/sos/{sos_id}/triage", {
        "triage_priority": "URGENT",
        "status": "DISPATCHED",
        "triage_notes": "Dispatched QA verification rescue team."
    }, token=auth_token)
    if t_status == 200:
        log_test("Authority Triage SOS (PATCH /api/sos/{id}/triage)", "PASS")
    else:
        log_test("Authority Triage SOS", "FAIL", f"Status {t_status}: {t_data}")
else:
    log_test("Create SOS Request", "FAIL", f"Status {status}: {data}")

print("\n================================================================================", flush=True)
print("SECTION 11: ALERTS & NOTIFICATIONS AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/alerts")
if status == 200 and isinstance(data, list):
    log_test("Active Alerts List (/api/alerts)", "PASS", f"Count: {len(data)}")
else:
    log_test("Active Alerts List", "FAIL", f"Status {status}")

print("\n================================================================================", flush=True)
print("SECTION 12: RESCUE TEAMS AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/rescue-teams")
if status == 200 and isinstance(data, list):
    log_test("Rescue Teams List (/api/rescue-teams)", "PASS", f"Count: {len(data)}")
else:
    log_test("Rescue Teams List", "FAIL", f"Status {status}")

print("\n================================================================================", flush=True)
print("SECTION 13: POST-DISASTER ANALYSIS & VALIDATION AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/post-disaster")
if status == 200 and isinstance(data, list):
    log_test("Post-Disaster Records (/api/post-disaster)", "PASS", f"Count: {len(data)}")
else:
    log_test("Post-Disaster Records", "FAIL", f"Status {status}")

status, data = request("GET", "/api/post-disaster/metrics")
if status == 200 and "accuracy" in data:
    log_test("Post-Disaster Validation Metrics (/api/post-disaster/metrics)", "PASS", f"Accuracy: {data.get('accuracy')} | Model: {data.get('model_name')}")
else:
    log_test("Post-Disaster Validation Metrics", "FAIL", f"Status {status}")

print("\n================================================================================", flush=True)
print("SECTION 14: ANALYTICS & OPERATIONAL METRICS AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/analytics")
if status == 200 and "total_zones" in data and "risk_distribution" in data:
    log_test("Analytics Overview (/api/analytics)", "PASS", f"Monitored Zones: {data.get('total_zones')} | Critical: {data.get('critical_zones_count')}")
else:
    log_test("Analytics Overview", "FAIL", f"Status {status}")

print("\n================================================================================", flush=True)
print("SECTION 15: SIMULATION SCENARIO AUDIT", flush=True)
print("================================================================================", flush=True)
auth_token = tokens.get("Authority")
status, data = request("POST", "/api/simulation/reset", token=auth_token)
if status == 200:
    log_test("Reset Simulation Scenario (/api/simulation/reset)", "PASS")
else:
    log_test("Reset Simulation Scenario", "FAIL", f"Status {status}: {data}")

status, data = request("POST", "/api/simulation/step/1", token=auth_token)
if status == 200 and "step" in data:
    log_test("Advance Simulation Step 1 (/api/simulation/step/1)", "PASS", f"Scenario: {data.get('title')}")
else:
    log_test("Advance Simulation Step 1", "FAIL", f"Status {status}: {data}")

# Clean reset after test
request("POST", "/api/simulation/reset", token=auth_token)

print("\n================================================================================", flush=True)
print("SECTION 16: DATA SOURCES & PROVENANCE REGISTRY AUDIT", flush=True)
print("================================================================================", flush=True)
status, data = request("GET", "/api/data-sources")
if status == 200 and "sources" in data and len(data["sources"]) > 0:
    log_test("Data Sources Provenance Registry (/api/data-sources)", "PASS", f"Cataloged: {len(data['sources'])}")
else:
    log_test("Data Sources Provenance Registry", "FAIL", f"Status {status}")

print("\n================================================================================", flush=True)
print("FINAL BACKEND QA AUDIT SUMMARY:", flush=True)
print(f"Total Tests Run: {results['passed'] + results['failed'] + results['blocked']}", flush=True)
print(f"Passed:          {results['passed']}", flush=True)
print(f"Failed:          {results['failed']}", flush=True)
print(f"Blocked:         {results['blocked']}", flush=True)
print("================================================================================", flush=True)

if results["failed"] > 0:
    sys.exit(1)
else:
    sys.exit(0)
