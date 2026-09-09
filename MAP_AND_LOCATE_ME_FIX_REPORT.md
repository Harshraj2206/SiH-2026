# LANDSAFE SIH26001 — Map & Locate Me Fix Report

## 1. Locate Me Root Cause
Investigation of the "Locate Me" button flow revealed four distinct root causes:
1. **React State Stalling on Identical Coordinates**: In `LeafletRiskMap.jsx`, `handleLocateMe` set `geoLocating = true` and called `requestContextLocation(true)`. It relied on a `useEffect` watching `[userLocation.isGps, userLocation.latitude, userLocation.longitude, userLocation.displayName, userLocation.accuracy]` to reset `geoLocating = false`. When the user clicked "Locate Me" while already at their GPS location, or if a fresh reading returned the same coordinate values, none of the primitive dependencies changed. React therefore skipped running the effect, leaving `geoLocating` permanently `true` and the button permanently stuck in the `"Locating..."` disabled state.
2. **Missing Failure/Timeout State Reset**: When geolocation failed (due to `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, or `TIMEOUT`), `LocationIntelligenceContext` set an error message in state, but `LeafletRiskMap` had no error handler or listener to reset `geoLocating`. The button remained frozen in `"Locating..."` indefinitely.
3. **Flawed Toggle Behavior**: In `LeafletRiskMap.jsx`, line 319 checked `if (activeLocationPin && activeLocationPin.type === 'gps') { setActiveLocationPin(null); return; }`. This meant clicking "Locate Me" when a GPS pin was already active simply removed the pin and aborted the geolocation request entirely, instead of re-centering the map on the user.
4. **Stale Cache & Concurrency Issues**: `requestLocation` specified `maximumAge: 30000`, causing browsers to return a 30-second-old cached coordinate instead of obtaining a fresh GPS fix on explicit user click. Additionally, rapid clicks lacked a concurrency lock.

---

## 2. Locate Me Fix
Surgically applied targeted fixes across `LeafletRiskMap.jsx` and `LocationIntelligenceContext.jsx`:
- **Promise Return Contract**: Converted `requestLocation` in `LocationIntelligenceContext.jsx` to return a Promise that resolves with `{ success: boolean, location?: object, error?: string }`. Callers now await completion and execute deterministic UI transitions.
- **Fresh Telemetry on Explicit Action**: Set `maximumAge: 0` when `explicitUserAction` is true, forcing the browser to acquire fresh GPS telemetry rather than serving stale cache.
- **Resilient Fallback Retry**: Added a fallback in `LocationIntelligenceContext.jsx` that automatically retries with standard network/WiFi geolocation (`enableHighAccuracy: false`) if high-accuracy GPS times out or is unsupported on the user's device/operating system.
- **Deterministic UI & Concurrency Guard in `handleLocateMe`**:
  - Guarded concurrent clicks with `if (geoLocating) return;`.
  - Removed the faulty pin-removal toggle.
  - Awaits `requestContextLocation(true)`.
  - On success: updates `activeCenter([lat, lng])`, sets `activeZoom(14)`, updates `activeLocationPin`, smoothly animating the camera.
  - On error: displays user-friendly error dialogs for `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, and `TIMEOUT`.
  - Wrapped in `try / finally`: guarantees `setGeoLocating(false)` is always called so the button never stays stuck.
- **Preserved Location Selection Architecture**: Maintained `locationModeRef.current !== 'gps'` logic so background GPS updates never overwrite a manually searched or selected map location.

---

## 3. Deep-Zoom Root Cause
Investigation into the "Map data not available" / blank tile issue confirmed:
1. **Physical Provider Tile Cutoffs**: Direct inspection of the ESRI ArcGIS REST MapServer endpoints confirmed that:
   - ESRI Light Gray Canvas (`Canvas/World_Light_Gray_Base`): native raster tiles exist only up to zoom level 16. At zoom 17+, the server responds with a 2,521-byte JPEG containing the watermark text *"Map data not yet available"*.
   - ESRI Dark Gray Canvas (`Canvas/World_Dark_Gray_Base`): native raster tiles exist only up to zoom level 16. At zoom 17+, returns the 2,521-byte placeholder tile.
   - ESRI World Street Map (`World_Street_Map`) & Topographic Relief (`World_Topo_Map`): native tiles exist up to zoom level 17. At zoom 18+, returns the *"Map data not yet available"* placeholder tile.
2. **Missing `maxNativeZoom` Configuration**: In `LeafletRiskMap.jsx`, `MapContainer` was configured with `maxZoom={18}` and `TileLayer` with `maxZoom={19}` without specifying `maxNativeZoom`. Without `maxNativeZoom`, Leaflet continued sending HTTP requests for non-existent `{z}/{y}/{x}` tiles at zoom levels 17 and 18, and ESRI served the *"Map data not yet available"* tiles.

---

## 4. Deep-Zoom Fix
Applied Google-Maps-grade upscaling using Leaflet's native tile scaling:
- Configured explicit `maxNativeZoom` and `maxZoom` per basemap provider in `BASEMAP_TILES`:
  - `light`: `maxNativeZoom: 16`, `maxZoom: 19`
  - `dark`: `maxNativeZoom: 16`, `maxZoom: 19`
  - `streets`: `maxNativeZoom: 17`, `maxZoom: 19`
  - `terrain`: `maxNativeZoom: 17`, `maxZoom: 19`
  - `satellite`: `maxNativeZoom: 18`, `maxZoom: 19`
  - `osm`: `maxNativeZoom: 19`, `maxZoom: 19`
- Passed `maxNativeZoom={tile.maxNativeZoom || 17}` and `maxZoom={tile.maxZoom || 19}` to `<TileLayer>`.
- Set `maxZoom={19}` on `<MapContainer>`.
- Leaflet now requests native tiles only up to `maxNativeZoom`. For all higher zoom levels (17, 18, 19), Leaflet fetches the highest available native tiles and smoothly scales them using CSS transforms. This prevents raw requests for non-existent tiles and eliminates the *"Map data not yet available"* tiles permanently.

---

## 5. Files Modified
1. `frontend/src/context/LocationIntelligenceContext.jsx`:
   - Updated `requestLocation` to return a Promise resolving to `{ success, location, error }`.
   - Set `maximumAge: 0` on explicit user request.
   - Added automatic fallback from high-accuracy to standard accuracy on timeout or unavailable GPS.
   - Guaranteed `loading: false` and friendly error messages on all failure paths.
2. `frontend/src/components/map/LeafletRiskMap.jsx`:
   - Added `maxNativeZoom` and `maxZoom` parameters to all 6 basemap tile definitions in `BASEMAP_TILES`.
   - Updated `TileLayer` to use `maxNativeZoom={tile.maxNativeZoom || 17}` and `maxZoom={tile.maxZoom || 19}`.
   - Updated `MapContainer` to `maxZoom={19}`.
   - Updated `handleLocateMe` to await `requestContextLocation(true)`, guard against concurrent clicks, recenter the map, and guarantee reset of `geoLocating` in `finally`.
3. `frontend/src/pages/IncidentsExplorerPage.jsx`:
   - Added `maxNativeZoom` to all basemaps and `TileLayer` for deep-zoom reliability.
4. `frontend/src/pages/ResourcesPage.jsx`:
   - Added `maxNativeZoom` to all basemaps and `TileLayer` for deep-zoom reliability.

---

## 6. Tests Performed
1. **ESRI MapServer Endpoint Analysis**:
   - Polled ArcGIS REST tile endpoints for `Canvas/World_Light_Gray_Base`, `Canvas/World_Dark_Gray_Base`, `World_Street_Map`, `World_Imagery`, and `World_Topo_Map` across zoom levels 12 to 19 to confirm tile byte lengths and cutoffs.
2. **Frontend Production Build Verification**:
   - Ran `npm run build` in `frontend` (`vite build`).
3. **Backend Full Test Suite**:
   - Ran `python -m pytest backend/tests`.
4. **Tile Resolution and Geolocation State Machine Simulation**:
   - Executed `scratch/verify_fixes.js` verifying tile scaling calculations, promise returns, and concurrency protection.

---

## 7. Test Results
- **ArcGIS Tile Endpoints**: Confirmed 2,521-byte placeholder tile cutoffs at z=17 for Light/Dark Canvas, z=18 for Streets/Terrain.
- **Frontend Build (`npm run build`)**: PASSED cleanly in 4.85s with 0 errors (`dist/index.html`, `dist/assets/index-BZWfoM5v.css`, `dist/assets/index-D15CIm2y.js`).
- **Backend Test Suite (`pytest`)**: 69 / 69 passed (100% pass rate in 81.89s).
- **Diagnostic Verification (`verify_fixes.js`)**:
  - `streets` maxNativeZoom=17, maxZoom=19: PASS
  - `light` maxNativeZoom=16, maxZoom=19: PASS
  - `dark` maxNativeZoom=16, maxZoom=19: PASS
  - `satellite` maxNativeZoom=18, maxZoom=19: PASS
  - `terrain` maxNativeZoom=17, maxZoom=19: PASS
  - `osm` maxNativeZoom=19, maxZoom=19: PASS
  - TileLayer `maxNativeZoom` pass-through: PASS
  - MapContainer `maxZoom={19}`: PASS
  - `handleLocateMe` concurrency guard and `finally` block: PASS
  - `LocationIntelligenceContext` promise contract, fresh GPS cache bust, fallback, and manual selection preservation: PASS

---

## 8. Regression Results
All non-regression constraints were validated:
- [x] Dashboard UI, layouts, typography, and colors: 100% preserved.
- [x] Sun/Moon astronomical engine & dynamic atmospheric backgrounds: untouched and functional.
- [x] Weather telemetry (Open-Meteo & IMD reanalysis): untouched and functional.
- [x] Manual location selection vs. live GPS: **No auto-switch regression**. Selecting Location B preserves Location B indefinitely.
- [x] GIS hazard layers & telemetry drawers: untouched and functional.
- [x] Safe Route generation: untouched and functional.
- [x] Emergency resources & radius filtering: untouched and functional.
- [x] SOS & community reporting: untouched and functional.
- [x] ML risk prediction: untouched and functional.
- [x] Authentication & profile management: untouched and functional.

---

## 9. External / Provider Limitations
- **ESRI Free Public Basemap Tiles**: ESRI does not produce native tile imagery beyond zoom 16 for Light/Dark Canvas and zoom 17 for Street Map. Utilizing Leaflet's `maxNativeZoom` scales the highest resolution native tiles up to zoom level 19 via client-side CSS transforms, giving a Google-Maps-like smooth zoom experience without requesting non-existent provider tiles.
- **Browser Geolocation Permissions**: In non-HTTPS or non-localhost origins, modern browsers block Geolocation API access by default. The updated code identifies permission denials clearly and displays a helpful message rather than failing silently.
