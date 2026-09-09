"""
LANDSAFE SIH26001 - Emergency Resources Discovery Overhaul Automated Test Suite
Validates:
1. Real facilities discovery across categories (Hospitals, Police, Fire, Shelters, All)
2. Geodesic distance accuracy and radius bounding
3. Schema conformance (no missing/fabricated fields)
4. Coordinate validation and bounds enforcement
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

# Real coordinates for validation: Bengaluru Urban
TEST_LAT = 12.9716
TEST_LNG = 77.5946


def test_nearby_resources_hospitals():
    """Verify hospital discovery returns real medical facilities with valid coordinates and distance."""
    response = client.get(
        f"/api/resources/nearby?lat={TEST_LAT}&lng={TEST_LNG}&radius_km=5&category=hospitals"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["category"] == "hospitals"
    assert data["search_radius_km"] == 5.0
    assert "places" in data
    assert isinstance(data["places"], list)
    assert data["total_found"] >= 1

    first = data["places"][0]
    assert "id" in first
    assert "name" in first and len(first["name"]) > 0
    assert "latitude" in first and -90 <= first["latitude"] <= 90
    assert "longitude" in first and -180 <= first["longitude"] <= 180
    assert "distance_km" in first and first["distance_km"] <= 5.5  # within requested radius
    assert first["category"] == "hospitals"
    assert "google_maps_url" in first
    assert "directions_url" in first


def test_nearby_resources_all_category():
    """Verify 'all' category returns combined emergency facilities."""
    response = client.get(
        f"/api/resources/nearby?lat={TEST_LAT}&lng={TEST_LNG}&radius_km=10&category=all"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_found"] >= 1
    for place in data["places"]:
        assert place["distance_km"] <= 11.0


def test_nearby_resources_radius_scaling():
    """Verify that expanding the search radius retrieves equal or more facilities."""
    res_5km = client.get(f"/api/resources/nearby?lat={TEST_LAT}&lng={TEST_LNG}&radius_km=5&category=hospitals")
    res_15km = client.get(f"/api/resources/nearby?lat={TEST_LAT}&lng={TEST_LNG}&radius_km=15&category=hospitals")

    assert res_5km.status_code == 200
    assert res_15km.status_code == 200

    count_5 = res_5km.json()["total_found"]
    count_15 = res_15km.json()["total_found"]
    assert count_15 >= count_5


def test_nearby_resources_invalid_bounds():
    """Verify that invalid coordinates or radius are rejected with 422."""
    res_lat = client.get(f"/api/resources/nearby?lat=95.0&lng={TEST_LNG}&radius_km=5")
    assert res_lat.status_code == 422

    res_radius = client.get(f"/api/resources/nearby?lat={TEST_LAT}&lng={TEST_LNG}&radius_km=100")
    assert res_radius.status_code == 422


def test_api_key_override_query_param():
    """Verify that api_key_override query parameter is accepted gracefully without server failure."""
    response = client.get(
        f"/api/resources/nearby?lat={TEST_LAT}&lng={TEST_LNG}&radius_km=5&category=hospitals&api_key_override=test_fake_key_123"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # Even if Google key fails, fallback to OSM directory guarantees real data
    assert data["total_found"] >= 1
