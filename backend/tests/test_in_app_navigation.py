import urllib.request
import json

def test_in_app_navigation_routes():
    url = "http://127.0.0.1:8000/api/safe-route/global"

    user_origin = {
        "lat": 12.6445,
        "lng": 77.4365,
        "name": "User Current GPS Location"
    }

    facilities = [
        {"name": "CD Simer Hospital", "lat": 12.66048, "lng": 77.44966, "type": "Hospital"},
        {"name": "Harohalli Police Station", "lat": 12.68028, "lng": 77.46939, "type": "Police"},
        {"name": "Ramanagara Fire Station", "lat": 12.7214, "lng": 77.2811, "type": "Fire"},
        {"name": "Dhalpur Evacuation Shelter", "lat": 31.9579, "lng": 77.1089, "type": "Shelter"}
    ]

    print("\n=======================================================")
    print("LANDSLIDEGUARD IN-APP ROAD NAVIGATION VERIFICATION SUITE")
    print("=======================================================")

    for fac in facilities:
        payload = {
            "start_lat": user_origin["lat"],
            "start_lng": user_origin["lng"],
            "dest_lat": fac["lat"],
            "dest_lng": fac["lng"],
            "start_name": user_origin["name"],
            "dest_name": fac["name"]
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            route = data.get("safe_route") or data.get("fastest_route")
            
            assert route is not None, f"No route returned for {fac['name']}"
            assert route["distance_km"] > 0, f"Distance must be > 0 for {fac['name']}"
            assert route["travel_time_min"] > 0, f"Travel time must be > 0 for {fac['name']}"
            assert len(route["coordinates"]) > 5, f"Road route coordinates must follow road network (>5 points) for {fac['name']}"
            assert len(route["segments"]) > 0, f"Step-by-step turns must be present for {fac['name']}"

            print(f"\n[OK] Route to {fac['type']}: {fac['name']}")
            print(f"     * Distance: {route['distance_km']} km")
            print(f"     * Drive Time: ~{route['travel_time_min']} mins")
            print(f"     * Waypoints Count: {len(route['coordinates'])} points")
            print(f"     * Hazard Grade: {route['safety_level']} (Avg Slope: {route['slope_deg']} deg)")
            print(f"     * First Instruction: {route['segments'][0]['instruction']} ({route['segments'][0]['distance_km']} km)")
            if len(route['segments']) > 1:
                print(f"     * Next Turn: {route['segments'][1]['instruction']}")

    print("\n=======================================================")
    print("ALL 4 IN-APP NAVIGATION ROAD ROUTES VERIFIED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_in_app_navigation_routes()
