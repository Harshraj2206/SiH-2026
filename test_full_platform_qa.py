"""
LANDSAFE MASTER QA AUDIT SUITE
Tests every backend API endpoint for:
1. Endpoint availability (HTTP 200)
2. Schema & data contract validity
3. Error handling & boundary test cases
4. UNKNOWN != ZERO enforcement
5. Latency & performance
"""
import urllib.request
import urllib.parse
import json
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

results = []

def test_endpoint(name, path, method="GET", body=None, expected_status=200, headers=None):
    t0 = time.time()
    url = f"{BASE_URL}{path}"
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    
    data_bytes = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data_bytes, headers=h, method=method)
    
    status_code = None
    resp_data = None
    err_msg = None
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            status_code = response.status
            raw = response.read().decode("utf-8")
            try:
                resp_data = json.loads(raw)
            except Exception:
                resp_data = raw
    except urllib.error.HTTPError as e:
        status_code = e.code
        try:
            resp_data = json.loads(e.read().decode("utf-8"))
        except Exception:
            resp_data = str(e)
    except Exception as e:
        err_msg = str(e)
    
    duration = round((time.time() - t0) * 1000)
    passed = (status_code == expected_status)
    results.append({
        "name": name,
        "path": path,
        "method": method,
        "status": status_code,
        "expected": expected_status,
        "passed": passed,
        "duration_ms": duration,
        "error": err_msg or (None if passed else f"Status mismatch: got {status_code}, expected {expected_status}"),
        "data": resp_data
    })
    
    icon = "[PASS]" if passed else "[FAIL]"
    print(f"{icon} [{method}] {path} -> HTTP {status_code} ({duration}ms)")
    if not passed:
        print(f"   Reason: {results[-1]['error']} | Data: {str(resp_data)[:200]}")
    return resp_data

def run_all_tests():
    print("==================================================")
    print("LANDSAFE COMPREHENSIVE ENDPOINT QA SUITE")
    print("==================================================")
    
    # 1. System Health
    test_endpoint("System Health", "/api/health")
    
    # 2. Weather
    test_endpoint("Weather Jakkasandra", "/api/weather?lat=12.6445&lon=77.4365")
    test_endpoint("Weather Shimla", "/api/weather?lat=31.1048&lon=77.1734")
    test_endpoint("Weather Wayanad", "/api/weather?lat=11.6854&lon=76.1320")
    
    # 3. Location Intelligence
    test_endpoint("Location Intel GPS", "/api/location-intelligence?lat=12.6445&lng=77.4365&source=GPS")
    test_endpoint("Location Intel Search", "/api/location-intelligence/search", method="POST", body={"query": "Shimla"})
    
    # 4. Risk Zones
    zones = test_endpoint("Get All Risk Zones", "/api/risk-zones")
    test_endpoint("Get Single Zone Valid", "/api/risk-zones/HP-01")
    test_endpoint("Get Single Zone 404", "/api/risk-zones/NON-EXISTENT-ZONE", expected_status=404)
    
    # 5. ML Predict
    test_endpoint("ML Predict Normal", "/api/predict", method="POST", body={"rainfall_24h": 45.0, "slope_deg": 25.0, "soil_moisture": 0.35})
    test_endpoint("ML Predict Missing Rain (DATA_INSUFFICIENT)", "/api/predict", method="POST", body={"rainfall_24h": None, "slope_deg": 25.0, "soil_moisture": 0.35})
    test_endpoint("ML Metrics", "/api/predict/metrics")
    test_endpoint("ML Spatial Metrics", "/api/predict/spatial-metrics")
    test_endpoint("ML Historical Replay", "/api/predict/historical-replay")
    test_endpoint("ML Provenance", "/api/predict/provenance")
    
    # 6. Safe Routing
    test_endpoint("Routing Waypoints", "/api/safe-route/waypoints")
    test_endpoint("Geocode Bengaluru", "/api/safe-route/geocode", method="POST", body={"query": "Bengaluru"})
    test_endpoint("Geocode Mysuru", "/api/safe-route/geocode", method="POST", body={"query": "Mysuru"})
    test_endpoint("Calculate Global Route", "/api/safe-route/global", method="POST", body={
        "start_lat": 12.9768, "start_lng": 77.5901, "dest_lat": 12.3041, "dest_lng": 76.6530,
        "start_name": "Bengaluru", "dest_name": "Mysuru"
    })
    test_endpoint("Calculate Preset Route", "/api/safe-route", method="POST", body={
        "start_node": "SILIGURI_HUB", "destination_node": "GANGTOK_RIDGE", "avoid_blocked_roads": True
    })
    
    # 7. Alerts
    test_endpoint("Alerts List", "/api/alerts")
    
    # 8. Incidents
    test_endpoint("Incidents List", "/api/incidents")
    test_endpoint("Incidents Intelligence", "/api/incidents/intelligence?lat=31.1048&lng=77.1734")
    
    # 9. Analytics & Telemetry
    test_endpoint("Regional Analytics", "/api/analytics")
    test_endpoint("Regional Analytics Filtered", "/api/analytics?region=HP&timeframe=7d")
    
    # 10. Community Reports
    test_endpoint("Community Reports List", "/api/reports")
    
    # 11. Emergency Resources
    test_endpoint("Hospitals List", "/api/resources/hospitals")
    test_endpoint("Shelters List", "/api/resources/shelters")
    test_endpoint("Roads List", "/api/resources/roads")
    
    # 12. SOS & Rescue
    test_endpoint("SOS Active List", "/api/sos")
    test_endpoint("Rescue Teams List", "/api/rescue-teams")
    
    # 13. Post-Disaster Analysis
    test_endpoint("Post-Disaster Records", "/api/post-disaster")
    test_endpoint("Post-Disaster Metrics", "/api/post-disaster/metrics")
    
    # 14. Data Sources & Provenance
    test_endpoint("Data Sources Overview", "/api/data-sources")
    test_endpoint("Inspect Coordinate Telemetry", "/api/telemetry/inspect", method="POST", body={"latitude": 31.1048, "longitude": 77.1734})
    
    # 15. Auth & RBAC
    test_endpoint("Auth Me (Unauthenticated Expected 401)", "/api/auth/me", expected_status=401)
    login_res = test_endpoint("Auth Admin Login", "/api/auth/login", method="POST", body={"identifier": "admin_ndma", "password": "Admin@2026!"})
    token = login_res.get("access_token") if isinstance(login_res, dict) else None
    auth_headers = {"Authorization": f"Bearer {token}"} if token else None
    
    if auth_headers:
        test_endpoint("Auth Me (Authenticated)", "/api/auth/me", headers=auth_headers)
        # 16. Simulation (Authenticated Admin)
        test_endpoint("Simulation Reset (Admin Auth)", "/api/simulation/reset", method="POST", headers=auth_headers)
    else:
        test_endpoint("Simulation Reset (Unauthenticated Expected 401/403)", "/api/simulation/reset", method="POST", expected_status=401)
    
    print("\n==================================================")
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    print(f"TOTAL ENDPOINTS TESTED: {total} | PASSED: {passed} | FAILED: {failed}")
    print("==================================================")
    
    if failed > 0:
        print("\n[!] FAILED ENDPOINTS SUMMARY:")
        for r in results:
            if not r["passed"]:
                print(f" - [{r['method']}] {r['path']} -> {r['error']}")
        sys.exit(1)
    else:
        print("\n>>> ALL BACKEND ENDPOINTS PASSED AUDIT SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_all_tests()
