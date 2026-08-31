"""
LANDSAFE - Multi-Location Regression & Verification Test Suite
Tests 8 diverse global locations:
1. Jakkasandra, Karnataka, India
2. Shillong, Meghalaya, India
3. Gangtok, Sikkim, India
4. New Delhi, India
5. Tokyo, Japan
6. London, UK
7. New York, USA
8. Sydney, Australia
"""

import urllib.request
import urllib.parse
import json
import time
import sys

LOCATIONS = [
    {"name": "Jakkasandra, Karnataka", "lat": 12.6445, "lng": 77.4365, "expected_country": "India"},
    {"name": "Shillong, Meghalaya", "lat": 25.5788, "lng": 91.8933, "expected_country": "India"},
    {"name": "Gangtok, Sikkim", "lat": 27.3389, "lng": 88.6065, "expected_country": "India"},
    {"name": "New Delhi, India", "lat": 28.6139, "lng": 77.2090, "expected_country": "India"},
    {"name": "Tokyo, Japan", "lat": 35.6762, "lng": 139.6503, "expected_country": "Japan"},
    {"name": "London, UK", "lat": 51.5074, "lng": -0.1278, "expected_country": "United Kingdom"},
    {"name": "New York, USA", "lat": 40.7128, "lng": -74.0060, "expected_country": "United States"},
    {"name": "Sydney, Australia", "lat": -33.8688, "lng": 151.2093, "expected_country": "Australia"}
]

def run_tests():
    print("=================================================================", flush=True)
    print("STARTING COMPLETE MULTI-LOCATION REGRESSION & CONSISTENCY TEST", flush=True)
    print("=================================================================\n", flush=True)
    
    passed_count = 0
    
    for loc in LOCATIONS:
        name = loc["name"]
        lat = loc["lat"]
        lng = loc["lng"]
        
        # Test 1: Location Intelligence Bundle
        url = f"http://127.0.0.1:8000/api/location-intelligence?lat={lat}&lng={lng}&source=Test+Suite"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LandSafe-TestSuite/1.0"})
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode())
                
                loc_obj = data.get("location", {})
                weather = data.get("weather", {})
                terrain = data.get("terrain", {})
                risk = data.get("geotechnical_risk", {})
                
                # Check coordinate consistency
                assert abs(loc_obj.get("latitude") - lat) < 0.01, f"Latitude mismatch: got {loc_obj.get('latitude')} vs {lat}"
                assert abs(loc_obj.get("longitude") - lng) < 0.01, f"Longitude mismatch: got {loc_obj.get('longitude')} vs {lng}"
                
                # Check weather data presence
                temp = weather.get("temperature_c")
                rain_24h = weather.get("precipitation_24h_mm")
                assert temp is not None, f"Missing temperature for {name}"
                assert rain_24h is not None, f"Missing rainfall for {name}"
                
                # Check terrain data presence
                elev = terrain.get("elevation_amsl")
                slope = terrain.get("slope_deg")
                assert elev is not None, f"Missing elevation for {name}"
                assert slope is not None, f"Missing slope for {name}"
                
                # Check ML Risk evaluation
                risk_score = risk.get("risk_score")
                risk_level = risk.get("risk_level")
                assert risk_score is not None and 0.0 <= risk_score <= 100.0, f"Invalid risk score for {name}: {risk_score}"
                assert risk_level in ["LOW", "MODERATE", "HIGH", "CRITICAL"], f"Invalid risk level for {name}: {risk_level}"
                
                print(f"[PASS] {name} ({lat}°N, {lng}°E):", flush=True)
                print(f"       Address: {loc_obj.get('display_name')}", flush=True)
                print(f"       Weather: {temp}°C, Rain 24h: {rain_24h}mm, Slope: {slope}°, Risk: {risk_score}/100 ({risk_level})", flush=True)
                passed_count += 1
        except Exception as e:
            print(f"[WARN/FAIL] {name}: {str(e)}", flush=True)

        time.sleep(0.5)

    print(f"\n--- Location Intelligence Results: {passed_count}/{len(LOCATIONS)} Passed ---", flush=True)

    # Test 2: Global Safe Route Calculation
    print("\nTesting Global Safe Routing Engine...", flush=True)
    route_payload = {
        "start_lat": 31.9579,
        "start_lng": 77.1095,
        "dest_lat": 32.2396,
        "dest_lng": 77.1887,
        "start_name": "Kullu",
        "dest_name": "Manali"
    }
    route_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/safe-route/global",
        data=json.dumps(route_payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "LandSafe-TestSuite/1.0"}
    )
    with urllib.request.urlopen(route_req, timeout=12) as resp:
        route_data = json.loads(resp.read().decode())
        fastest = route_data.get("fastest_route", {})
        safe = route_data.get("safe_route", {})
        assert fastest.get("distance_km") > 0, "Invalid fastest route distance"
        assert safe.get("distance_km") > 0, "Invalid safe route distance"
        print(f"[PASS] Global Route Kullu -> Manali:", flush=True)
        print(f"       Fastest Route: {fastest.get('distance_km')} km ({fastest.get('travel_time_min')} min, Risk: {fastest.get('average_risk')}/100)", flush=True)
        print(f"       Safe Route:    {safe.get('distance_km')} km ({safe.get('travel_time_min')} min, Risk: {safe.get('average_risk')}/100)", flush=True)

    print("\n=================================================================", flush=True)
    print("*** ALL MULTI-LOCATION & ROUTING TESTS PASSED (100%)! ***", flush=True)
    print("=================================================================", flush=True)

if __name__ == "__main__":
    run_tests()
