"""
Unit tests for the dedicated /api/weather endpoint.
Validates parameter constraints, response schemas, and real meteorological telemetry extraction.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_weather_endpoint_valid_coordinates():
    """Test retrieving live weather for Bengaluru coordinates (12.9716, 77.5946)."""
    response = client.get("/api/weather?lat=12.9716&lon=77.5946")
    assert response.status_code == 200
    data = response.json()
    assert data["latitude"] == 12.9716
    assert data["longitude"] == 77.5946
    assert "temperature_c" in data
    assert "humidity_pct" in data
    assert "weather_code" in data
    assert "condition" in data
    assert "precipitation_1h_mm" in data
    assert "precipitation_24h_mm" in data
    assert "wind_speed_kmh" in data
    assert "source" in data


def test_weather_endpoint_himalayan_coordinates():
    """Test retrieving live weather for Shimla coordinates (31.1048, 77.1734)."""
    response = client.get("/api/weather?lat=31.1048&lon=77.1734")
    assert response.status_code == 200
    data = response.json()
    assert data["latitude"] == 31.1048
    assert data["longitude"] == 77.1734
    assert isinstance(data["weather_code"], int)
def test_weather_endpoint_is_day_telemetry():
    """Test retrieving astronomical day/night telemetry."""
    response = client.get("/api/weather?lat=12.9716&lon=77.5946")
    assert response.status_code == 200
    data = response.json()
    assert "is_day" in data
    assert isinstance(data["is_day"], (bool, int))


def test_weather_endpoint_validation_error():
    """Test rejection of out-of-bounds latitude/longitude values."""
    # Latitude > 90
    res_lat = client.get("/api/weather?lat=95.0&lon=77.0")
    assert res_lat.status_code == 422

    # Longitude < -180
    res_lon = client.get("/api/weather?lat=12.0&lon=-190.0")
    assert res_lon.status_code == 422

    # Missing parameters
    res_missing = client.get("/api/weather")
    assert res_missing.status_code == 422
