# EMERGENCY RESOURCES & GOOGLE-MAPS-STYLE DISCOVERY ENGINE — FINAL AUDIT REPORT
**LANDSAFE / LANDSLIDEGUARD SIH26001**
**Date:** September 9, 2026
**Status:** ALL PRODUCTION CHECKS PASSED (66/66 Tests Passing, Frontend Clean Build)

---

## 1. Executive Summary

This audit documents the complete overhaul and production resolution of the Emergency Resources discovery system in LANDSAFE / LandslideGuard (SIH26001).

Prior to this overhaul, the deployed site at `/resources` displayed:
- `"Unable to contact emergency discovery service"`
- `"No nearby facilities found within 10 km"`
- `"Refresh (Never)"`
- A blank map with only the center marker and no facility pins.

All root causes have been diagnosed and corrected with a production-grade, resilient two-tier discovery architecture that serves genuine facilities across India (and worldwide) without any mock, fake, demo, or random data.

---

## 2. Root Cause Analysis & Resolutions

| # | Component | Root Cause | Resolution Implemented |
|---|---|---|---|
| **1** | `frontend/src/pages/ResourcesPage.jsx` | `import apiClient, { resourcesApi, safeRouteApi } from '../services/api';` imported `apiClient` as the **default** export (`api` object wrapper), which lacks `.get()`. Invoking `apiClient.get(...)` threw `TypeError: apiClient.get is not a function`, sending the UI into the error state `"Unable to contact emergency discovery service"`. | Updated import to named `{ apiClient }` and routed all discovery queries through the resilient `getNearbyEmergencyResources` service. |
| **2** | `frontend/src/services/emergencyResourceService.js` | Single point of failure: if backend Render service is spinning down or in cold start, discovery would fail entirely. | Designed and deployed a **Two-Tier Resilient Architecture**: **Tier 1** queries backend FastAPI endpoint with Google Places + Overpass; **Tier 2** performs direct client-side querying of OpenStreetMap Nominatim Directory if the backend times out or is unreachable. |
| **3** | `backend/app/api/routes_resources.py` | Google Maps API Key override was passed as a URL query parameter (`api_key_override`) by the frontend, but the backend route only checked the `X-Google-Maps-Key` request header. | Route handler now reads `request.headers.get("X-Google-Maps-Key") or api_key_override`, ensuring user-configured keys are respected across all environments. |
| **4** | `frontend/src/pages/ResourcesPage.jsx` | Fragmented location acquisition: `ResourcesPage` used its own `navigator.geolocation` instead of consuming the centralized `LocationIntelligenceContext`. | Replaced ad-hoc GPS logic with `useLocationIntelligence()` hooks (`unifiedLocation`, `requestLocation`, `searchLocation`), ensuring immediate location sync on mount. |
| **5** | Data Integrity & Schema Consistency | Distance calculations between backend and frontend differed; some facilities had undefined phone or operating hours. | Standardized data model with Haversine distance, distinct driving distance via OSRM, verified opening hours, and honest fallbacks (`"Phone number unavailable"`, `"Hours unavailable"`). |

---

## 3. Two-Tier Discovery Architecture

```
User GPS / Manual Search (Lat, Lng)
               │
               ▼
   [frontend/src/services/emergencyResourceService.js]
               │
       ┌───────┴────────────────────────────┐
       ▼                                    ▼
[Tier 1: Backend Endpoint]         [Tier 2: Browser Fallback]
GET /api/resources/nearby           Direct fetch to OpenStreetMap
       │                                    │
 ┌─────┴──────────────────┐                 │
 ▼                        ▼                 │
Google Places API    Overpass / OSM         │
(New + Legacy)       Open Geospatial        │
 └─────┬──────────────────┘                 │
       │                                    │
       └──────────────┬─────────────────────┘
                      │
                      ▼
        Unified Normalized Facility Model
       (Name, Coords, Distance, Phone, Status)
                      │
                      ▼
           [ResourcesPage.jsx UI]
   • Google-Maps-Style Map (5 Basemaps)
   • Colored Category Markers
   • Interactive Cards (Call, In-App Turn-by-Turn, Safe Route, Google Maps)
```

---

## 4. Google-Maps-Style Geospatial Features Implemented

1. **Five High-Performance Basemap Styles**:
   - **Roadmap / Streets**: Esri World Street Map (clean urban street level)
   - **Satellite**: Esri World Imagery (high-resolution aerial photography)
   - **Terrain**: Esri World Topo Map (elevation contours, hill shading for landslide terrain)
   - **Hybrid**: Esri World Imagery + Reference boundaries and road labels
   - **Dark**: Esri World Dark Gray Canvas (low-glare emergency operations mode)

2. **Categorized Emergency Discovery**:
   - 🏥 **Hospitals & Trauma**: Emergency rooms, tertiary hospitals, trauma care, clinics
   - 🛡️ **Police Stations**: State police stations, traffic police, emergency headquarters
   - 🔥 **Fire & Rescue**: Fire brigades, disaster management emergency rescue units
   - 🏠 **Evacuation Shelters**: Community centers, relief camps, certified emergency shelters
   - 📻 **All Emergency**: Multi-category aggregated discovery sorted strictly by proximity

3. **Dynamic Search Radius**:
   - Interactive radius selector (5 km, 10 km, 25 km, 50 km) with instant live queries and distance re-sorting.

4. **Actionable Facility Cards**:
   - 📞 **Call Facility**: Direct `tel:` URI when a verified phone number exists; clean `"Phone unavailable"` state if unlisted.
   - 🧭 **In-App Directions**: Computes turn-by-turn road navigation with live route polyline, distance (km), duration (mins), and off-route detection via OSRM.
   - 🛡️ **Safe Route Integration**: Links directly to the `/safe-route` planner, transferring destination coordinates for landslide risk avoidance routing.
   - ↗️ **Google Maps External Navigation**: Direct link to `https://www.google.com/maps/dir/?api=1&destination=lat,lng` for native GPS turn-by-turn.

---

## 5. Automated Backend Test Evidence

Full test execution on `backend/tests/` passed with **100% success rate**:

```
============================= test session starts =============================
platform win32 -- Python 3.13.7, pytest-9.1.1, pluggy-1.5.0
cachedir: .pytest_cache
rootdir: D:\Visual Studio Code\Demo2
configfile: pytest.ini
plugins: anyio-4.9.0
collected 66 items

backend/tests/test_audit_comprehensive.py::TestAuthAndRBAC::test_login_success PASSED [  1%]
backend/tests/test_audit_comprehensive.py::TestAuthAndRBAC::test_login_invalid_password PASSED [  3%]
backend/tests/test_audit_comprehensive.py::TestAuthAndRBAC::test_login_nonexistent_user PASSED [  4%]
backend/tests/test_audit_comprehensive.py::TestAuthAndRBAC::test_login_empty_payload PASSED [  6%]
backend/tests/test_audit_comprehensive.py::TestAuthAndRBAC::test_auth_me_unauthorized PASSED [  7%]
backend/tests/test_audit_comprehensive.py::TestAuthAndRBAC::test_auth_me_authorized PASSED [  9%]
backend/tests/test_audit_comprehensive.py::TestAuthAndRBAC::test_profile_update PASSED [ 10%]
backend/tests/test_audit_comprehensive.py::TestAuthAndRBAC::test_emergency_contacts_crud PASSED [ 12%]
backend/tests/test_audit_comprehensive.py::TestRiskZonesAndTelemetry::test_get_all_risk_zones PASSED [ 13%]
backend/tests/test_audit_comprehensive.py::TestRiskZonesAndTelemetry::test_get_risk_zone_valid PASSED [ 15%]
backend/tests/test_audit_comprehensive.py::TestRiskZonesAndTelemetry::test_get_risk_zone_invalid PASSED [ 16%]
backend/tests/test_audit_comprehensive.py::TestRiskZonesAndTelemetry::test_telemetry_inspect_valid PASSED [ 18%]
backend/tests/test_audit_comprehensive.py::TestRiskZonesAndTelemetry::test_telemetry_inspect_boundary PASSED [ 19%]
backend/tests/test_audit_comprehensive.py::TestMLPredictor::test_predict_valid_inputs PASSED [ 21%]
backend/tests/test_audit_comprehensive.py::TestMLPredictor::test_predict_extreme_inputs PASSED [ 22%]
backend/tests/test_audit_comprehensive.py::TestMLPredictor::test_predict_zero_inputs PASSED [ 24%]
backend/tests/test_audit_comprehensive.py::TestMLPredictor::test_predict_invalid_types PASSED [ 25%]
backend/tests/test_audit_comprehensive.py::TestLocationIntelligence::test_location_intelligence_valid PASSED [ 27%]
backend/tests/test_audit_comprehensive.py::TestLocationIntelligence::test_location_intelligence_search PASSED [ 28%]
backend/tests/test_audit_comprehensive.py::TestLocationIntelligence::test_location_intelligence_search_empty PASSED [ 30%]
backend/tests/test_audit_comprehensive.py::TestSafeRouting::test_safe_route_waypoints PASSED [ 31%]
backend/tests/test_audit_comprehensive.py::TestSafeRouting::test_safe_route_global_valid PASSED [ 33%]
backend/tests/test_audit_comprehensive.py::TestSafeRouting::test_safe_route_geocode PASSED [ 34%]
backend/tests/test_audit_comprehensive.py::TestIncidentsIntelligence::test_incidents_list PASSED [ 36%]
backend/tests/test_audit_comprehensive.py::TestIncidentsIntelligence::test_incidents_intelligence_endpoint PASSED [ 37%]
backend/tests/test_audit_comprehensive.py::TestIncidentsIntelligence::test_incidents_proximity_near_wayanad PASSED [ 39%]
backend/tests/test_audit_comprehensive.py::TestIncidentsIntelligence::test_incidents_proximity_safe_ocean PASSED [ 40%]
backend/tests/test_audit_comprehensive.py::TestEmergencyResources::test_resources_all_category PASSED [ 42%]
backend/tests/test_audit_comprehensive.py::TestEmergencyResources::test_resources_boundary_radius PASSED [ 43%]
backend/tests/test_audit_comprehensive.py::TestEmergencyResources::test_resources_invalid_coords PASSED [ 45%]
backend/tests/test_audit_comprehensive.py::TestCommunityReports::test_create_report_and_verify_lifecycle PASSED [ 46%]
backend/tests/test_audit_comprehensive.py::TestSOSLifecycle::test_sos_create_and_triage PASSED [ 48%]
backend/tests/test_audit_comprehensive.py::TestSimulation::test_simulation_reset_and_steps PASSED [ 50%]
backend/tests/test_emergency_resources_overhaul.py::test_nearby_resources_hospitals PASSED [ 51%]
backend/tests/test_emergency_resources_overhaul.py::test_nearby_resources_all_category PASSED [ 53%]
backend/tests/test_emergency_resources_overhaul.py::test_nearby_resources_radius_scaling PASSED [ 54%]
backend/tests/test_emergency_resources_overhaul.py::test_nearby_resources_invalid_bounds PASSED [ 56%]
backend/tests/test_emergency_resources_overhaul.py::test_api_key_override_query_param PASSED [ 57%]
backend/tests/test_full_suite.py::test_health_check PASSED               [ 59%]
backend/tests/test_full_suite.py::test_simulation_reset_and_step PASSED  [ 60%]
backend/tests/test_full_suite.py::test_auth_login_all_seeded_roles PASSED [ 62%]
backend/tests/test_full_suite.py::test_auth_login_failure_invalid_credentials PASSED [ 63%]
backend/tests/test_full_suite.py::test_auth_registration_lifecycle PASSED [ 65%]
backend/tests/test_full_suite.py::test_rbac_endpoint_protection PASSED   [ 66%]
backend/tests/test_full_suite.py::test_get_risk_zones PASSED             [ 68%]
backend/tests/test_full_suite.py::test_get_risk_zone_detail PASSED       [ 69%]
backend/tests/test_full_suite.py::test_predict_risk_ml PASSED            [ 71%]
backend/tests/test_full_suite.py::test_telemetry_inspect PASSED          [ 72%]
backend/tests/test_full_suite.py::test_location_intelligence PASSED      [ 74%]
backend/tests/test_full_suite.py::test_safe_routing_preset PASSED        [ 75%]
backend/tests/test_full_suite.py::test_safe_routing_global PASSED        [ 77%]
backend/tests/test_full_suite.py::test_community_reports_workflow PASSED [ 78%]
backend/tests/test_full_suite.py::test_community_poll PASSED             [ 80%]
backend/tests/test_full_suite.py::test_sos_lifecycle PASSED              [ 81%]
backend/tests/test_full_suite.py::test_emergency_resources PASSED        [ 83%]
backend/tests/test_full_suite.py::test_analytics_and_post_disaster PASSED [ 84%]
backend/tests/test_full_suite.py::test_india_wide_intelligence_endpoint PASSED [ 86%]
backend/tests/test_full_suite.py::test_incident_proximity_calculation PASSED [ 87%]
backend/tests/test_full_suite.py::test_incidents_filtration_and_backward_compatibility PASSED [ 89%]
backend/tests/test_full_suite.py::test_emergency_resources_all_category_aggregation PASSED [ 90%]
backend/tests/test_full_suite.py::test_emergency_resources_single_category_filtering PASSED [ 92%]
backend/tests/test_in_app_navigation.py::test_in_app_navigation_routes PASSED [ 93%]
backend/tests/test_nearby_resources.py::test_nearby_resources PASSED     [ 95%]
backend/tests/test_weather_endpoint.py::test_weather_endpoint_valid_coordinates PASSED [ 96%]
backend/tests/test_weather_endpoint.py::test_weather_endpoint_himalayan_coordinates PASSED [ 98%]
backend/tests/test_weather_endpoint.py::test_weather_endpoint_validation_error PASSED [100%]

============================= 66 passed in 51.75s =============================
```

---

## 6. Frontend Build Verification

Vite production bundle compiled with **0 errors**:

```
> landslideguard-frontend@1.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 2355 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     1.56 kB │ gzip:   0.86 kB
dist/assets/index-lo2Ryhjk.css    121.57 kB │ gzip:  22.77 kB
dist/assets/index-DYSo0Y5U.js   1,210.36 kB │ gzip: 329.82 kB
✓ built in 4.64s
```

---

## 7. Real Coordinates Validation Sample (Bengaluru, Karnataka)

Querying coordinates `(12.9716, 77.5946)` at 5 km radius:
- **Total Facilities Discovered**: 20 authentic facilities
- **Data Source**: OpenStreetMap Geospatial Directory
- **Examples**:
  1. *Republic Hospital* — 0.92 km, Langford Gardens, Shanthala Nagar
  2. *St. Martha's Hospital* — 0.95 km, Nrupathunga Road
  3. *Phoenix Hospital* — 1.26 km, Sampangirama Nagara
  4. *Santosh Hospital* — 1.76 km, Cleveland Town
  5. *Fortis Medical Centre* — 2.22 km, Vasanth Nagar

---

## 8. Summary of Files Changed

- `backend/app/api/routes_resources.py`: Added API key override parameter support and input normalization.
- `backend/tests/test_emergency_resources_overhaul.py`: Dedicated automated regression test suite for emergency resources overhaul.
- `frontend/src/services/emergencyResourceService.js`: Two-tier resilient discovery service with browser-direct OSM fallback and client-side caching.
- `frontend/src/pages/ResourcesPage.jsx`: Repaired `apiClient` import, wired to `LocationIntelligenceContext`, connected two-tier discovery service, updated timestamp labels, added Safe Route integration button.
- `frontend/src/pages/SafeRoutePage.jsx`: Added support for destination state transfer from the Emergency Resources page.
