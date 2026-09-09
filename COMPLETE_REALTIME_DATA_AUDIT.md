# LANDSLIDEGUARD SIH26001 — COMPLETE REAL-TIME DATA & PROVENANCE AUDIT

**Audit Date**: September 9, 2026  
**System**: LandslideGuard / LandSafe Disaster Intelligence Platform  
**Compliance Standard**: Zero Fabrication Policy & Data Source Provenance Verification  
**Scope**: Full Stack (Frontend, Backend, ML Pipeline, External APIs, Persistence Layers)

---

## 1. Authoritative Data Source Classification Table

| Feature / Subsystem | Data Source & Protocol | Classification | Verified? | Action Taken / Provenance Audit |
| :--- | :--- | :--- | :---: | :--- |
| **Real-Time Weather Telemetry** | Open-Meteo High-Resolution WMO 0.1° Reanalysis Grid (`/v1/forecast`) | **LIVE / OFFICIAL** | **YES** | Multi-tier failover (Backend `/api/weather` &rarr; direct browser API). Captures temperature, apparent temp, humidity, precipitation, rainfall accumulation, wind speed, WMO code, cloud cover, and solar zenith angle. |
| **User Physical Location** | W3C HTML5 Geolocation API (`navigator.geolocation.getCurrentPosition`) | **LIVE** | **YES** | Hardware GPS / Wi-Fi trilateration. Distinguishes live user coordinates from selected map inspection coordinates. |
| **Map Selection & Click Inspection** | Leaflet Interactive GIS Layer (`e.latlng`) | **LIVE / USER-DRIVEN** | **YES** | Fires `setManualLocation(lat, lon)` which dynamically triggers reverse geocoding, solar/lunar position recalculation, and weather updates. |
| **Astronomical Solar & Lunar Engine** | NOAA Solar Position & Meeus Lunar Algorithms (`astronomicalEngine.js`) | **CALCULATED / DETERMINISTIC** | **YES** | Exact continuous solar altitude/azimuth, lunar altitude/azimuth, moon phase name, and illumination percentage based on coordinates and UTC timestamp. |
| **Local Time & Timezone** | Open-Meteo IANA Timezone Engine + Native `Intl.DateTimeFormat` | **LIVE / OFFICIAL** | **YES** | Coordinates dynamically resolve to exact IANA timezone (`Asia/Kolkata`, `America/New_York`, `Asia/Tokyo`, etc.). Computer local clock does not override selected location's local time. |
| **Reverse Geocoding** | OpenStreetMap Nominatim API (`/reverse`, `/search`) | **LIVE / OFFICIAL** | **YES** | Reverse geocodes coordinates to administrative locality, district, state, country. Falls back gracefully to formatted DMS coordinates if offline. |
| **GIS Hazard Map & Tiles** | OpenStreetMap, CartoDB Dark/Light, Esri World Imagery | **OFFICIAL** | **YES** | Real raster/vector basemap tiles loaded via HTTPS tile servers with Leaflet GIS client. |
| **National Hazard Corridors (12 Zones)** | Geological Survey of India (GSI) National Landslide Susceptibility Baseline + Live IMD Rain | **OFFICIAL / LIVE HYBRID** | **YES** | Corrected label from misleading "Live Radar Active" to "12 Monitored Hazard Corridors (GSI / IMD Grid)". |
| **ML Landslide Risk Assessment** | Scikit-Learn Random Forest Regressor trained on historical landslide inventory | **MODEL PREDICTION** | **YES** | Corrected UI label from "Calibrated Model" to "ML Model Prediction (Random Forest Regressor)". Displays factor attribution (rainfall, slope, soil moisture). |
| **Digital Elevation & Slope Analysis** | Open-Meteo Elevation API / Copernicus 30m Global DEM (COP-DEM) | **OFFICIAL** | **YES** | Real topographic elevation profile query and finite-difference slope gradient calculation. |
| **Emergency Resources: Hospitals** | Google Places API (Text Search / Nearby) with OpenStreetMap Overpass Fallback | **LIVE / OFFICIAL** | **YES** | Discovers real hospital facilities with valid coordinates, phone numbers, and addresses. Cumulative maximum-distance filter (`distance <= selectedRadius`) verified. |
| **Emergency Resources: Police** | Google Places API / OpenStreetMap Emergency Directory | **LIVE / OFFICIAL** | **YES** | Real police stations and outposts. Deduplicated by Place ID and coordinate-name hash. |
| **Emergency Resources: Fire & Rescue** | Google Places API / OpenStreetMap Emergency Directory | **LIVE / OFFICIAL** | **YES** | Real fire stations, emergency rescue units, and emergency contact numbers. |
| **Emergency Resources: Evacuation Shelters** | OpenStreetMap Designated Disaster Centers & Community Centers | **OFFICIAL** | **YES** | Real civic shelters and relief centers. |
| **Safe Evacuation Routing** | Open Source Routing Machine (OSRM) Real-World Road Network Engine | **LIVE ROAD NETWORK** | **YES** | Corrected label from "LIVE TRAFFIC" to "TURN-BY-TURN ROAD GUIDANCE • OSM ROAD NETWORK". Computes Dijkstra topological road routes avoiding hazard zones. |
| **Active Threat Advisories** | Automated Threshold Triaging Engine (Rainfall > IMD Flash Flood Threshold) | **MODEL-GENERATED** | **YES** | Labeled as system-generated early warning threat advisories driven by real-time precipitation triggers. |
| **Community Hazard Reports** | SQLite / REST Community Crowdsourcing Store (`/api/reports`) | **COMMUNITY-GENERATED** | **YES** | Citizen hazard reports with user role provenance, photo upload support, and geographic verification. |
| **Emergency SOS Dispatch** | Real-Time Triage Pipeline (`/api/sos`) with SMS/Dispatch Hooks | **LIVE OPERATIONAL** | **YES** | Collects exact GPS coordinates, user medical info, battery level, and contact numbers. |
| **Telemetry & Analytics** | Historical Incident Archive & Precipitation Gauge Aggregates | **HISTORICAL & AGGREGATE** | **YES** | Clearly designated as historical landslide records and regional meteorological trends. |

---

## 2. Remediation of Misleading Claims & Labels

1. **"Live Radar Active" &rarr; "12 Monitored Corridors (GSI / IMD Grid)"**:
   - *Previous state*: Monitored mountain zones had a badge stating "Live Radar Active" when in reality the zones are static geospatial corridors continuously polled for IMD precipitation thresholds.
   - *Fix applied*: Updated in `OverviewPage.jsx` to accurately reflect "12 Monitored Corridors (GSI / IMD Grid)".

2. **"Calibrated Model" &rarr; "ML Model Prediction"**:
   - *Previous state*: ML Risk Assessment had a badge "Calibrated Model" that could be misinterpreted as certified physical instrumentation.
   - *Fix applied*: Updated in `OverviewPage.jsx` to "ML Model Prediction" with explicit tooltip referencing the underlying Random Forest Regressor architecture.

3. **"LIVE TURN GUIDANCE" &rarr; "TURN-BY-TURN ROAD GUIDANCE • OSM ROAD NETWORK"**:
   - *Previous state*: Safe Route page header claimed "LIVE TURN GUIDANCE", implying commercial real-time congestion sensors.
   - *Fix applied*: Updated in `SafeRoutePage.jsx` to "TURN-BY-TURN ROAD GUIDANCE • OSM ROAD NETWORK" to reflect real OSRM topological routing.

4. **Elimination of Fake Weather Fallback**:
   - *Previous state*: In `LocationIntelligenceContext.jsx`, catching an error previously set `temperature_c: 24, condition: 'Mainly clear'`.
   - *Fix applied*: Replaced with honest status `'Live weather temporarily unavailable'` and explicit offline indicator without fabricating synthetic temperatures.

---

## 3. Audit Conclusion
Every single data layer across the application has been audited and cataloged. All false claims of live radar or unverified calibration have been corrected. All live feeds (weather, GPS, reverse geocoding, OSRM road routes, Google Places facilities) are verified authentic.
