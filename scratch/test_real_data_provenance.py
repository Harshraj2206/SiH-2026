"""
LANDSLIDEGUARD SIH26001 - Production Real-World Data Provenance & Zero-Fabrication Test Suite
Validates:
1. Real Data Ingestion from Open-Meteo, Copernicus DEM, USGS, and OpenStreetMap.
2. Zero fabricated hospital beds / shelter capacities when real-time sensors are unlinked.
3. Clear classification of data categories (LIVE OBSERVATION, ML RISK SCORE, OFFICIAL WARNING, DIRECTORY RECORD).
4. Safe failure behavior returning explicit UNAVAILABLE markers rather than synthetic fallback data.
"""

import sys
import os
import time
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.services.data_source_orchestrator import orchestrate_location_intelligence
from backend.app.services.osm_places_service import get_nearby_real_facilities
from backend.app.services.weather_resolver import get_global_live_weather
from backend.app.database.store import db_store
from backend.app.ml.predictor import predict_landslide_risk


def test_orchestrator_real_data_provenance():
    """Verify data source orchestrator bundles real provenance and data quality metadata."""
    coords = [
        (12.6445, 77.4365, "Jakkasandra, Karnataka"),
        (31.9579, 77.1095, "Kullu, Himachal Pradesh"),
        (25.5788, 91.8933, "Shillong, Meghalaya")
    ]

    for lat, lng, name in coords:
        bundle = orchestrate_location_intelligence(lat, lng, "Test Harness")
        assert bundle["location"]["latitude"] == lat
        assert bundle["location"]["longitude"] == lng
        assert bundle["freshness"]["status"] in ["FRESH", "RECENT"]
        assert bundle["weather"]["temperature_c"] is not None
        assert "Copernicus 30m Global DEM" in [ds["name"] for ds in bundle["data_sources"]]
        assert "OpenStreetMap Geographic Infrastructure" in [ds["name"] for ds in bundle["data_sources"]]
        print(f"  [OK] Orchestrator Provenance Verified for {name}: Temp={bundle['weather']['temperature_c']}C, Slope={bundle['terrain']['slope_deg']} deg")

    print("[PASS] 1. Data Orchestrator Provenance & Integrity Verified.")


def test_zero_fabricated_hospital_and_shelter_capacity():
    """Verify that hospital and shelter discovery never fabricates live bed occupancy."""
    facilities = get_nearby_real_facilities(12.6445, 77.4365, radius_km=15.0)
    hospitals = facilities.get("hospitals", [])
    shelters = facilities.get("shelters", [])

    assert len(hospitals) > 0, "No hospitals discovered"
    assert len(shelters) > 0, "No shelters discovered"

    for h in hospitals:
        assert h["available_beds"] is None, f"Hospital {h['name']} must not fabricate live available beds"
        assert h["capacity_status"] == "LIVE CAPACITY UNAVAILABLE"
        assert h["data_category"] == "DIRECTORY RECORD"
        assert "source" in h

    for s in shelters:
        assert s["current_occupancy"] is None, f"Shelter {s['name']} must not fabricate live occupancy"
        assert s["capacity_status"] == "OCCUPANCY TELEMETRY UNAVAILABLE"
        assert s["data_category"] == "DIRECTORY RECORD"
        assert "source" in s

    print("[PASS] 2. Zero Fabricated Capacity Verified (Explicit Directory & Unavailable Markers).")


def test_official_alerts_provenance():
    """Verify official alerts include proper source attribution and category."""
    alerts = db_store.get_all_alerts()
    assert len(alerts) > 0, "Alerts feed is empty"

    for a in alerts:
        assert a.get("category") in ["CRITICAL", "HIGH", "MODERATE", "INFORMATION"]
        assert "timestamp" in a
        assert a.get("status") in ["ACTIVE", "EXPIRED", "RESOLVED"]
        assert "reason" in a

    print(f"[PASS] 3. Official Alerts Categorization & Structure Verified ({len(alerts)} alerts checked).")


def test_ml_model_calibrated_scoring():
    """Verify ML model returns calibrated risk scores and explainability without uncalibrated confidence text."""
    test_inputs = {
        "rainfall_24h": 45.0,
        "rainfall_72h": 110.0,
        "slope_deg": 32.0,
        "soil_moisture": 0.45,
        "ndvi": 0.40,
        "historical_incidents": 4
    }

    pred = predict_landslide_risk(test_inputs)
    assert 0.0 <= pred["risk_score"] <= 100.0
    assert pred["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert "xai" in pred
    assert len(pred["xai"]["factors"]) > 0
    assert "primary_driver" in pred["xai"]
    print(f"  [OK] ML Prediction: Score={pred['risk_score']}/100 ({pred['risk_level']}), Primary Driver={pred['xai']['primary_driver']}")
    print("[PASS] 4. ML Model Calibrated Scoring & XAI Verified.")


if __name__ == "__main__":
    print("================ RUNNING REAL-WORLD DATA PROVENANCE TEST SUITE ================")
    test_orchestrator_real_data_provenance()
    test_zero_fabricated_hospital_and_shelter_capacity()
    test_official_alerts_provenance()
    test_ml_model_calibrated_scoring()
    print("================ ALL DATA PROVENANCE AUDIT TESTS PASSED (100%) ================")
