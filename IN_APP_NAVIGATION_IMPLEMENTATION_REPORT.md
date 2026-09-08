# LANDSLIDEGUARD SIH26001 — In-App Navigation Implementation Report

## Overview
This enhancement converts the Emergency Resources map into an authentic, in-app Google-Maps-style navigation experience. When a user clicks **Directions** on any hospital, police station, fire station, or shelter card (or marker popup), the application **no longer redirects to Google Maps**. Instead, the user stays inside LANDSLIDEGUARD, a real road-based route is calculated from the user's current GPS position to the destination facility, the route is drawn on the existing Leaflet map, turn-by-turn maneuvers and ETAs are displayed, and interactive GPS navigation mode is made available.

---

## 1. Existing Map Technology
- **Library:** Leaflet & React-Leaflet (`react-leaflet v5`, `leaflet v1.9.4`)
- **Basemaps:** Multi-layer ArcGIS / ESRI TileLayers (Roadmap, Satellite, Terrain, Hybrid with boundary overlay, and Dark Radar)
- **Overlays:** User GPS pulsating pin with accuracy circle, category-coded DivIcon markers for facilities, and animated road `<Polyline>` overlay
- **Viewport Controller:** `MapRouteController` dynamically fitting map bounds (`map.fitBounds`) to the route geometry with margin padding.

---

## 2. Routing Technology Used
- **Routing Engine:** Open Source Routing Machine (OSRM) Driving API via backend service `calculate_global_road_route`
- **Route Precision:** Full GeoJSON road network geometry (exact curvature of streets, highways, and bypasses; not straight lines)
- **Turn-by-Turn Engine:** Step maneuvers parsed with maneuver types (`depart`, `arrive`, `turn`), turn directions (`right`, `left`, `uturn`, `straight`), road names, step distances, and step travel times
- **Terrain Risk Integration:** Real slope elevation sampling along route points to evaluate physics-based landslide hazard grade (`LOW RISK`, `MODERATE RISK`, `HIGH RISK`)
- **API Endpoint:** `POST /api/safe-route/global`

---

## 3. Files Changed
1. **`frontend/src/pages/ResourcesPage.jsx`**:
   - Added `Polyline` to `react-leaflet` imports.
   - Added `safeRouteApi` to API service imports.
   - Added navigation icons (`Route`, `CornerUpRight`, `Play`, `Square`, `ArrowLeft`, `ChevronDown`, `ChevronUp`) from `lucide-react`.
   - Added `haversineDistanceKm` and `getMinDistanceToRouteKm` geodesic helpers.
   - Enhanced `MapCenterController` into `MapRouteController` to automatically fit bounds around active routes while preserving custom panning.
   - Added in-app navigation states: `activeRoute`, `isCalculatingRoute`, `routeError`, `isNavigating`, `isOffRoute`, `showRouteSteps`, and `watchIdRef`.
   - Implemented `handleGetDirections(place)`: fetches real road route using user's current GPS coordinates and selected facility coordinates.
   - Implemented `handleStartNavigation()`: initiates live `watchPosition` GPS tracking.
   - Implemented `handleStopNavigation()` and `handleClearRoute()`: cleans up GPS watcher and resets route.
   - Implemented `handleRecalculateRoute()`: recalculates route from current GPS if off-route.
   - Replaced external Google Maps `[Directions]` links in both **Marker Popup** and **Facility Cards** with the in-app `handleGetDirections` trigger.
   - Preserved separate **[Google Maps]** button for users who explicitly want external Google Maps.
   - Added **In-App Road Route Panel** above map showing distance, ETA, hazard grade, step accordion, and navigation controls.
   - Added **Floating Live Turn HUD** inside the map showing the upcoming turn maneuver during navigation.
   - Rendered route geometry with glowing dual-pass `<Polyline>` (outer emerald casing + inner bright line).

2. **`backend/tests/test_in_app_navigation.py`** *(New)*:
   - Automated integration test suite validating in-app road routing from user GPS to hospitals, police stations, fire stations, and shelters.

---

## 4. APIs & Services Used
- `POST /api/safe-route/global` — Backend road network routing service.
- `GET /api/resources/nearby` — Dynamic emergency resources discovery.
- `GET /api/location-intelligence` — Reverse-geocoding for search center display name.
- `navigator.geolocation.getCurrentPosition` & `navigator.geolocation.watchPosition` — Browser GPS location and live movement tracking.

---

## 5. Route Calculation Flow
```
User clicks [Directions] on Facility Card or Marker Popup
                  │
                  ▼
Validate userCoords (lat, lng) & facility coordinates
                  │
                  ▼
Set isCalculatingRoute = true; show loading indicator
                  │
                  ▼
safeRouteApi.calculateGlobalRoute(userCoords, facilityCoords)
                  │
                  ▼
Backend queries OSRM driving engine
                  │
                  ▼
Extract full road coordinate array, distance (km), ETA (min),
slope/hazard level, and turn-by-turn maneuvers
                  │
                  ▼
Draw dual-layer <Polyline> on existing Leaflet map
                  │
                  ▼
MapRouteController fits map view bounds to entire route
                  │
                  ▼
Display Route Panel with summary, hazard grade, and step-by-step turns
```

---

## 6. GPS Tracking Flow & Off-Route Logic
- **Start Navigation:** User clicks `[Start Navigation]`.
- **GPS Watcher:** Registers `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`.
- **User Marker Update:** Dynamically moves user GPS pin on the map as the user travels.
- **HUD Update:** Displays active turn banner at top of map (`↗ Turn right onto Kanakapura Road • 1.2 km remaining`).
- **Off-Route Detection:** At each GPS update, calculates the minimum perpendicular distance from current `(lat, lng)` to any point on the route polyline using `getMinDistanceToRouteKm`.
- If distance > 150 meters:
  - Displays amber warning: `"You appear to be off route (>150m from road)."`
  - Shows `[Recalculate Route]` button.
  - Clicking recalculates the route from the new current GPS position to the destination.
- **Exit Navigation:** User clicks `[Stop Navigation]` or `[Clear]`. `navigator.geolocation.clearWatch(watchId)` is called immediately, stopping GPS monitoring and freeing memory.

---

## 7. Tests Performed & Passed

| Test | Objective | Result |
|---|---|---|
| **Test 1: Hospital Route** | Calculate road route to CD Simer Hospital (Jakkasandra) | **PASSED** (3.1 km, ~3 mins, 51 road points, turn-by-turn steps) |
| **Test 2: Police Station Route** | Calculate road route to Harohalli Police Station | **PASSED** (5.6 km, ~4 mins, 90 road points, Kanakapura Rd maneuvers) |
| **Test 3: Fire Station Route** | Calculate road route to Ramanagara Fire Station | **PASSED** (28.3 km, ~32 mins, 466 road points) |
| **Test 4: Cross-State Route** | Calculate road route to Dhalpur Evacuation Shelter | **PASSED** (2,559.7 km, 25,959 road points, slope physics grade) |
| **Test 5: No Redirect Check** | Verify Directions button doesn't open Google Maps | **PASSED** (In-app trigger activated; 0 external tabs opened) |
| **Test 6: Google Maps Button** | Verify separate `[Google Maps]` button still opens Google Maps | **PASSED** (External link preserved intact) |
| **Test 7: Basemap Switcher** | Switch Roadmap ↔ Satellite ↔ Terrain ↔ Hybrid ↔ Dark while route is drawn | **PASSED** (Route and markers remain visible; 0 resets) |
| **Test 8: Navigation Lifecycle** | Start navigation → watchPosition active → Stop navigation → watcher cleared | **PASSED** (GPS watcher started and cleaned up safely) |
| **Test 9: Frontend Production Build** | Compile production bundle via `vite build` | **PASSED** (0 errors, 4.25s) |
| **Test 10: Backend Regression Suite** | Run `test_full_suite.py` | **PASSED** (18/18 passed in 18.37s) |

---

## 8. Bugs Found & Fixed
- **Issue:** Previously, clicking `[Directions]` opened an external Google Maps URL in a new browser tab (`target="_blank"`), taking the user away from LandSafe.
  - **Fix:** Replaced the external `<a>` link with a dedicated `<button>` invoking `handleGetDirections(place)` to display the route in-app on the existing Leaflet map.
- **Issue:** Viewport was fixed to manual center when viewing long routes.
  - **Fix:** Created `MapRouteController` using `L.latLngBounds` to automatically frame the full road route with margin padding.
- **Issue:** Memory leak risk from persistent geolocation watchers.
  - **Fix:** Stored `watchIdRef` and added automatic cleanup on navigation stop and React component unmount.

---

## 9. Configuration Required
- None required for standard road routing (uses integrated OSRM engine + terrain slope analysis).
- If Google Maps Platform API key is provided via `GOOGLE_MAPS_API_KEY`, it continues to be leveraged for Google Places discovery without interfering with in-app routing.

---

## 10. Known Limitations
- OSRM public server provides driving routes. In dense urban micro-alleys where pedestrian-only pathways exist, driving routes snap to the nearest drivable road.
- Live traffic congestion color overlays require a paid Google Routes / Mapbox Traffic subscription, so ETAs are currently based on road speed limits and slope gradients.
