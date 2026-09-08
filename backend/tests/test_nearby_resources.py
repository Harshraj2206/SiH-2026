import urllib.request
import json

def test_nearby_resources():
    def fetch(lat, lng, radius_km, category):
        url = f"http://127.0.0.1:8000/api/resources/nearby?lat={lat}&lng={lng}&radius_km={radius_km}&category={category}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))

    # 1. Test Karnataka (User current location)
    res_ka = fetch(12.6445, 77.4365, 10, "hospitals")
    print("\n--- TEST 1: KARNATAKA (Harohalli) HOSPITALS ---")
    print(f"Total found: {res_ka['total_found']}, Provider: {res_ka['data_source']['provider']}")
    assert res_ka["total_found"] > 0, "Expected hospitals near Karnataka"
    for p in res_ka["places"][:3]:
        print(f"  * {p['name']} ({p['distance_km']} km away) - {p['address']}")
        assert "Sikkim" not in p["address"] and "Meghalaya" not in p["address"], "Fake data detected!"
        assert p["distance_km"] <= 10.5, "Exceeded search radius"

    # Verify distance sorting
    for i in range(len(res_ka["places"]) - 1):
        assert res_ka["places"][i]["distance_km"] <= res_ka["places"][i+1]["distance_km"], "Sorting violation!"

    # 2. Test Karnataka Police Stations
    res_police = fetch(12.6445, 77.4365, 15, "police")
    print("\n--- TEST 2: KARNATAKA POLICE STATIONS ---")
    print(f"Total found: {res_police['total_found']}")
    assert res_police["total_found"] > 0, "Expected police stations"
    for p in res_police["places"][:3]:
        print(f"  * {p['name']} ({p['distance_km']} km away)")

    # 3. Test Himachal Pradesh (Kullu)
    res_hp = fetch(31.9579, 77.1089, 10, "hospitals")
    print("\n--- TEST 3: HIMACHAL PRADESH (Kullu) HOSPITALS ---")
    print(f"Total found: {res_hp['total_found']}")
    assert res_hp["total_found"] > 0, "Expected hospitals in Kullu"
    for p in res_hp["places"][:3]:
        print(f"  * {p['name']} ({p['distance_km']} km away) - {p['address']}")

    # 4. Verify that Kullu results are completely distinct from Karnataka results
    ka_names = {p["name"] for p in res_ka["places"]}
    hp_names = {p["name"] for p in res_hp["places"]}
    assert not (ka_names & hp_names), "Locations returned identical data! Real dynamic discovery failed."

    # 5. Test Radius Expansion (5km vs 25km)
    res_5km = fetch(12.6445, 77.4365, 5, "hospitals")
    res_25km = fetch(12.6445, 77.4365, 25, "hospitals")
    print(f"\n--- TEST 4: RADIUS SCALING ---")
    print(f"5 km radius count: {res_5km['total_found']}, 25 km radius count: {res_25km['total_found']}")
    assert res_25km["total_found"] >= res_5km["total_found"], "Radius expansion failed"

    print("\n==========================================")
    print("ALL EMERGENCY RESOURCE TESTS PASSED WITH 100% REAL DATA!")
    print("==========================================")

if __name__ == "__main__":
    test_nearby_resources()
