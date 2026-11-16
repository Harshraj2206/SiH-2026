"""Regression tests for Phase 1 fixes (zone IDs, routing, honest labels)."""
import itertools

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.store import db_store
from backend.app.routing.road_network import NODES_DATA, EDGES_DATA

client = TestClient(app)


def test_every_referenced_zone_exists():
    referenced = {e["zone_id"] for e in EDGES_DATA if e.get("zone_id")}
    referenced |= {n["zone_id"] for n in NODES_DATA.values() if n.get("zone_id")}
    referenced |= {r["zone_id"] for r in db_store.reports.values() if r.get("zone_id")}
    assert referenced - set(db_store.zones) == set()


def test_verified_reports_boost_their_zone():
    boosted = [z for z in db_store.zones.values() if z["verified_report_count"] > 0]
    assert boosted and all(z["community_boost"] > 0 for z in boosted)


def test_safe_route_uses_real_zone_risk():
    res = client.post("/api/safe-route", json={"start_node": "SILIGURI_HUB", "destination_node": "GANGTOK_RIDGE", "avoid_blocked_roads": True})
    assert res.status_code == 200
    zone_scores = {z["risk_score"] for z in db_store.zones.values()}
    assert res.json()["safe_route"]["max_risk"] in zone_scores


def test_all_pairs_in_same_network_are_routable():
    waypoints = client.get("/api/safe-route/waypoints").json()
    assert all(w["network"] is not None for w in waypoints)
    for a, b in itertools.permutations(waypoints, 2):
        if a["network"] == b["network"]:
            res = client.post("/api/safe-route", json={"start_node": a["id"], "destination_node": b["id"], "avoid_blocked_roads": False})
            assert res.status_code == 200, (a["id"], b["id"])


def test_seeded_facilities_are_labelled_demo_without_fake_capacity():
    for h in client.get("/api/resources/hospitals").json():
        assert h["is_demo"] is True
        assert h["available_beds"] is None and h["icu_available"] is None
    for s in client.get("/api/resources/shelters").json():
        assert s["is_demo"] is True
        assert s["current_occupancy"] is None


def test_forgot_password_never_returns_token():
    res = client.post("/api/auth/forgot-password", json={"email": "resident@landslideguard.gov.in"})
    assert "reset_token" not in res.json()
