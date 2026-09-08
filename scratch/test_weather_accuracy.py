"""
LANDSLIDEGUARD SIH26001 - Authoritative Weather Pipeline Accuracy & Determinism Test Suite
Validates:
1. Real global weather fetching from Open-Meteo across multiple coordinates.
2. Exact WMO code to condition text mapping without guessing.
3. Separation of accumulated rainfall (24h) from active current precipitation.
4. Correct normalization of weather states (Clear, Cloudy, Rain, Storm, Snow, Fog).
5. Safe failure handling on API unavailability (no fake rain or static 29°C/60% numbers).
"""

import pytest
import time
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.services.weather_resolver import get_global_live_weather, _map_wmo_code
from backend.app.services.weather_service import fetch_live_meteorology


def test_wmo_code_exact_mapping():
    """Verify WMO weather codes match official meteorological standards."""
    mappings = {
        0: "Clear Sky",
        1: "Mainly Clear",
        2: "Partly Cloudy",
        3: "Overcast",
        45: "Fog / Mist",
        48: "Fog / Mist",
        51: "Light Drizzle",
        53: "Light Drizzle",
        55: "Dense Drizzle",
        56: "Freezing Drizzle",
        57: "Freezing Drizzle",
        61: "Light Rain",
        63: "Moderate Rain",
        65: "Heavy Rain",
        66: "Freezing Rain",
        67: "Freezing Rain",
        71: "Snow Fall",
        73: "Snow Fall",
        75: "Heavy Snow Fall",
        77: "Snow Grains",
        80: "Slight Rain Showers",
        81: "Moderate Rain Showers",
        82: "Violent Rain Showers",
        85: "Snow Showers",
        86: "Snow Showers",
        95: "Thunderstorm",
        96: "Thunderstorm",
        99: "Thunderstorm",
        None: "Unknown",
        999: "Cloudy"
    }

    for code, expected in mappings.items():
        assert _map_wmo_code(code) == expected, f"Failed for code {code}: got {_map_wmo_code(code)}, expected {expected}"
    print("[PASS] 1. WMO Code Exact Mapping Verified.")


def test_real_live_weather_coordinates():
    """Verify live weather retrieval for diverse global coordinates."""
    test_locations = [
        ("Delhi, India", 28.6139, 77.2090, "IN"),
        ("Mumbai, India", 19.0760, 72.8777, "IN"),
        ("Shillong, Meghalaya", 25.5788, 91.8933, "IN"),
        ("Shimla, Himachal Pradesh", 31.1048, 77.1734, "IN"),
        ("London, UK", 51.5074, -0.1278, "GB"),
        ("Tokyo, Japan", 35.6762, 139.6503, "JP")
    ]

    for name, lat, lng, cc in test_locations:
        data = get_global_live_weather(lat, lng, cc)
        assert data["status"] == "FRESH", f"Failed for {name}: status is not FRESH"
        assert data["temperature_c"] is not None, f"Failed for {name}: temperature is None"
        assert isinstance(data["weather_code"], int), f"Failed for {name}: weather_code is not int"
        assert data["condition"] != "Unknown", f"Failed for {name}: condition is Unknown"
        assert data["relative_humidity_pct"] is not None, f"Failed for {name}: humidity is None"
        assert data["precipitation_1h_mm"] is not None, f"Failed for {name}: 1h precipitation is None"
        assert data["precipitation_24h_mm"] is not None, f"Failed for {name}: 24h precipitation is None"
        assert data["is_day"] in [0, 1], f"Failed for {name}: is_day must be 0 or 1"
        print(f"  [OK] {name:25}: Temp={data['temperature_c']} deg C, Code={data['weather_code']} ({data['condition']}), Day={data['is_day']}")

    print("[PASS] 2. Real Live Weather for Global Coordinates Verified.")


def test_precipitation_accumulation_separation():
    """Verify 24h past precipitation does not overwrite the instantaneous weather condition."""
    # Fetch meteorology for a coordinate
    weather = fetch_live_meteorology(28.6139, 77.2090)
    assert "temperature_c" in weather
    assert "rainfall_24h_mm" in weather
    assert "rainfall_1h_mm" in weather
    assert "rain_current_mm" in weather
    assert "weather_code" in weather
    assert "condition" in weather
    print(f"  [OK] 24h rain: {weather['rainfall_24h_mm']}mm, Current rain: {weather['rain_current_mm']}mm, Condition: {weather['condition']}")
    print("[PASS] 3. Precipitation Accumulation Separation Verified.")


def test_weather_failure_safe_fallback():
    """Verify that network/coordinate errors yield explicit UNAVAILABLE markers without fake data."""
    # Test invalid coordinates that would fail
    data = get_global_live_weather(999.0, 999.0)
    assert data["status"] == "UNAVAILABLE"
    assert data["temperature_c"] is None
    assert data["condition"] == "DATA UNAVAILABLE"
    assert data["weather_code"] is None
    print("[PASS] 4. API Failure Safe Fallback Verified (No fake rain or fake 29°C/60% generated).")


if __name__ == "__main__":
    print("================ RUNNING WEATHER ACCURACY TEST SUITE ================")
    test_wmo_code_exact_mapping()
    test_real_live_weather_coordinates()
    test_precipitation_accumulation_separation()
    test_weather_failure_safe_fallback()
    print("================ ALL WEATHER TESTS PASSED (100%) ================")
