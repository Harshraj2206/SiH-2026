# LANDSLIDEGUARD SIH26001 — LOCATION SELECTION RESET FIX

## 1. Root Cause
The root cause was a re-triggering cascade of the auto-discovery geolocation effect combined with an ambiguous location ownership model:

1. **Unstable Dependency Chain**: The initial auto-discovery `useEffect` in `LocationIntelligenceContext.jsx` had `[requestLocation, updateWeatherForCoords]` in its dependency array.
   - `updateWeatherForCoords` had `[location.displayName, recomputeEnvironment]` in its dependency array.
   - `requestLocation` had `[updateWeatherForCoords, updateDeepIntelligence]` in its dependency array.
2. **Re-trigger on Manual Selection**: When a user selected a new location on the map or searched a place, `setManualLocation` updated `location.displayName`. This invalidated `updateWeatherForCoords`, which in turn re-instantiated `requestLocation`, causing the mount `useEffect` to re-execute `requestLocation()`.
3. **No Ownership Distinction**: `requestLocation` did not differentiate between an explicit user action (clicking "Locate Me") and background/automatic requests. When the browser's high-accuracy GPS hardware request resolved ~5–6 seconds later, its callback unconditionally invoked `setLocation({ ...gpsRecord })`, overwriting the user's manual selection.

---

## 2. File(s) Changed
- `frontend/src/context/LocationIntelligenceContext.jsx`
- `frontend/src/components/map/LeafletRiskMap.jsx`

---

## 3. Exact Fix Implemented
1. **Explicit Location Ownership State Model**:
   - Introduced `locationMode` state and `locationModeRef` with two distinct states:
     - `'selected'`: User explicitly chose coordinates via map click, zone pick, or search.
     - `'gps'`: Application actively follows live physical browser GPS.
   - Decoupled `userGpsLocation` (live hardware telemetry) from `location` (selected viewing location).
2. **Mount Effect Stabilization**:
   - Added `hasAutoDiscoveredRef` so the mount-time GPS auto-discovery effect executes strictly once and never re-runs on state changes.
   - Removed `location.displayName` from `updateWeatherForCoords` dependency array; it now reads from `locationRef.current.displayName`, stabilizing the function reference.
3. **Protected GPS Success Callback**:
   - Added `explicitUserAction` parameter to `requestLocation(explicitUserAction = false)` (which automatically detects both boolean `true` and React click events).
   - In `requestLocation`, the GPS callback **always** updates `userGpsLocation`.
   - The GPS callback **only** updates `location` if `locationModeRef.current === 'gps'`. If `locationModeRef.current === 'selected'`, the update is ignored, leaving the user-selected coordinates, weather, and pin intact.
4. **Locate Me Explicit Trigger**:
   - Updated `useLiveGps` and `LeafletRiskMap.jsx`'s `handleLocateMe` to pass `true` to `requestLocation(true)`, reliably switching `locationMode` back to `'gps'`.

---

## 4. Why the 5–6 Second Reset Occurred
1. The browser's `navigator.geolocation.getCurrentPosition` was invoked with `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }`.
2. Hardware satellite/Wi-Fi positioning takes approximately 4–5 seconds to acquire a high-accuracy fix on Windows/browsers.
3. Because selecting a map location triggered the mount effect to fire `getCurrentPosition`, the fix arrived 5–6 seconds after the user's click.
4. When the promise/callback completed at second 5–6, it executed `setLocation(gpsRecord)` with `isGps: true`, resetting both map and weather back to GPS.

---

## 5. Tests Performed
1. **Dependency Analysis & Closure Audit**: Inspected all hooks, timer intervals (10s celestial ticker), and callbacks in `LocationIntelligenceContext.jsx`.
2. **State Model Unit & Lifecycle Simulation**: Executed lifecycle simulation script testing:
   - Initial mount / auto-discovery setting GPS.
   - User map click switching `locationMode` to `'selected'`.
   - Simulated background GPS updates (at 5s and periodic intervals) confirming `userGpsLocation` updates while `location` remains untouched on Mumbai.
   - Multiple successive background ticks (>60s simulation) verifying zero reset.
   - Explicit "Locate Me" button returning to GPS.
3. **Frontend Production Build**: Ran `npm run build` in `frontend/` (built in 5.33s without errors).
4. **Backend Full Regression Suite**: Executed `python -m pytest backend/tests/ -v` (69/69 tests passed).

---

## 6. Test Results
- **Initial GPS Resolution**: PASS
- **Map Selection Retention**: PASS (Coordinates, name, weather remain selected indefinitely)
- **Background GPS Isolation**: PASS (`locationMode === 'selected'` blocks GPS overwrites)
- **Clock Ticker & Celestial Engine**: PASS (Recomputes astronomical day/night for selected location without triggering geolocation)
- **Locate Me Button**: PASS (Explicitly switches mode to `'gps'` and re-centers on GPS)

---

## 7. Regression Results
| Feature Area | Status | Verification Notes |
| :--- | :---: | :--- |
| **GPS Acquisition** | PASS | Operates via `userGpsLocation` independently |
| **Locate Me Action** | PASS | Restores `locationMode = 'gps'` and centers pin |
| **Map Click Selection** | PASS | Sets `locationMode = 'selected'`, persists permanently |
| **Search Selection** | PASS | Sets `locationMode = 'selected'`, persists permanently |
| **Weather Telemetry** | PASS | Reflects selected map coordinates without GPS reset |
| **Astronomical Background** | PASS | 10s ticker recalculates for selected coordinates |
| **Emergency Resources** | PASS | Works seamlessly with unified location context |
| **Risk Map & Routing** | PASS | All 69 backend integration tests PASSED |
