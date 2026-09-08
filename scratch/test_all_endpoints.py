import urllib.request
import json

def test_endpoint(name, url, method="GET", data=None, headers=None):
    headers = headers or {}
    req = urllib.request.Request(url, method=method, headers=headers)
    body = json.dumps(data).encode("utf-8") if data else None
    try:
        with urllib.request.urlopen(req, data=body, timeout=8) as resp:
            status = resp.status
            res = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] {name} ({method} {url}) -> HTTP {status}")
            return True, res
    except urllib.error.HTTPError as e:
        print(f"[FAIL] {name} ({method} {url}) -> HTTP {e.code}: {e.read().decode('utf-8')[:200]}")
        return False, None
    except Exception as e:
        print(f"[ERR] {name} ({method} {url}) -> {e}")
        return False, None

print("Testing live endpoints against http://127.0.0.1:8000...")
base = "http://127.0.0.1:8000/api"

# Health
test_endpoint("Health", f"{base}/health")

# Login
ok, auth = test_endpoint("Auth Login", f"{base}/auth/login", method="POST", data={"identifier": "admin@landslideguard.gov.in", "password": "Admin@2026!"}, headers={"Content-Type": "application/json"})
token = auth.get("access_token") if ok else ""
auth_hdr = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Me
test_endpoint("Auth Me", f"{base}/auth/me", headers=auth_hdr)

# Risk Zones
test_endpoint("Risk Zones List", f"{base}/risk-zones")
test_endpoint("Risk Zone Detail", f"{base}/risk-zones/HP-01")

# Predict
test_endpoint("Predict Risk", f"{base}/predict", method="POST", data={"rainfall_24h": 90.0, "slope_deg": 35.0, "soil_moisture": 0.45}, headers=auth_hdr)

# Safe Route
test_endpoint("Safe Route Waypoints", f"{base}/safe-route/waypoints")
test_endpoint("Safe Route Preset", f"{base}/safe-route", method="POST", data={"start_node": "GHY_HUB", "destination_node": "SHL_CENTER", "avoid_blocked_roads": True}, headers={"Content-Type": "application/json"})

# Reports
test_endpoint("Reports List", f"{base}/reports")
test_endpoint("Reports Poll", f"{base}/reports/poll")
test_endpoint("Reports Poll Vote", f"{base}/reports/poll/vote", method="POST", data={"option_id": "yes"}, headers={"Content-Type": "application/json"})

# Incidents
test_endpoint("Incidents List", f"{base}/incidents")

# SOS
test_endpoint("SOS List", f"{base}/sos")

# Rescue Teams
test_endpoint("Rescue Teams List", f"{base}/rescue-teams")

# Resources
test_endpoint("Resources Roads", f"{base}/resources/roads")
test_endpoint("Resources Hospitals", f"{base}/resources/hospitals")
test_endpoint("Resources Shelters", f"{base}/resources/shelters")

# Analytics & Post Disaster
test_endpoint("Analytics Overview", f"{base}/analytics")
test_endpoint("Post Disaster Events", f"{base}/post-disaster")
test_endpoint("Post Disaster Metrics", f"{base}/post-disaster/metrics")

# Alerts
test_endpoint("Alerts List", f"{base}/alerts")

# Data Sources & Telemetry
test_endpoint("Data Sources Status", f"{base}/data-sources")
test_endpoint("Telemetry Inspect", f"{base}/telemetry/inspect", method="POST", data={"latitude": 31.9579, "longitude": 77.1095}, headers={"Content-Type": "application/json"})
test_endpoint("Location Intelligence", f"{base}/location-intelligence?lat=31.9579&lng=77.1095&source=Test")

# Simulation
test_endpoint("Simulation Step", f"{base}/simulation/step/1", method="POST", headers=auth_hdr)
test_endpoint("Simulation Reset", f"{base}/simulation/reset", method="POST", headers=auth_hdr)

print("All endpoint smoke tests completed.")
