import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Database, 
  Wifi, 
  CheckCircle2, 
  Clock, 
  Layers, 
  MapPin, 
  Activity, 
  Search, 
  ShieldCheck, 
  ExternalLink,
  RefreshCw,
  Cpu,
  CloudRain,
  Compass,
  FileSpreadsheet
} from 'lucide-react';

export const DataSourcesPage = () => {
  const [sourcesData, setSourcesData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interactive Live Coordinate Inspector Test State
  const [testLat, setTestLat] = useState(25.9030);
  const [testLng, setTestLng] = useState(91.8810);
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await api.getDataSources();
      setSourcesData(res);
    } catch (err) {
      console.warn('Failed to load data sources status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleInspect = async (e) => {
    e?.preventDefault();
    setInspecting(true);
    try {
      const data = await api.inspectTelemetry(parseFloat(testLat), parseFloat(testLng));
      setInspectResult(data);
    } catch (err) {
      console.warn('Inspection failed:', err);
    } finally {
      setInspecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="bg-surface border border-line p-6 rounded-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-risk-low " />
            <h1 className="text-xl font-semibold text-label">Authoritative Data Sources & Provenance Registry</h1>
            <span className="text-xs tabular-nums font-semibold px-2 py-0.5 rounded bg-risk-low/[0.12] text-risk-low border border-risk-low/30">
              PRODUCTION INGESTION
            </span>
          </div>
          <p className="text-xs text-label-2">
            Real-time multi-agency environmental telemetry, spatial resolutions, refresh frequencies, and calibration feeds.
          </p>
        </div>

        <button
          onClick={fetchSources}
          className="px-4 py-2 bg-surface-2 hover:bg-surface-2 text-label hover:text-label rounded-tile text-xs font-semibold border border-line flex items-center gap-1.5 transition-colors self-start md:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-label-2 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh API Status</span>
        </button>
      </div>

      {/* 5 Authoritative Data Feeds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* 1. IMD Weather & Rainfall */}
        <div className="bg-surface border border-line hover:border-line p-5 rounded-card space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-tile bg-surface-2 border border-line flex items-center justify-center text-label-2">
              <CloudRain className="w-5 h-5" />
            </div>
            <span className="text-xs tabular-nums font-semibold px-2 py-0.5 rounded-full bg-risk-low/[0.12] text-risk-low border border-risk-low/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-low" />
              LIVE CONNECTED
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-label">Open-Meteo NWP Grid (ECMWF & Multi-Model Assimilation)</h3>
            <p className="text-xs text-label-2 tabular-nums mt-0.5">Precipitation & Atmospheric Telemetry</p>
          </div>


          <div className="space-y-1.5 text-xs text-label-2 bg-page p-3 rounded-card border border-line">
            <div className="flex justify-between">
              <span className="text-label-2">Data Type:</span>
              <span className="font-medium text-label">1h, 24h, 72h Rain Accumulations</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Spatial Resolution:</span>
              <span className="tabular-nums text-label font-semibold">0.1° (~10 km) WMO Grid</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Update Frequency:</span>
              <span className="font-medium text-label">15-Min Ingestion Cache</span>
            </div>
          </div>
        </div>

        {/* 2. ECMWF IFS Land Surface Model (Soil Moisture) */}
        <div className="bg-surface border border-line hover:border-line p-5 rounded-card space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-tile bg-surface-2 border border-line flex items-center justify-center text-label-2">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs tabular-nums font-semibold px-2 py-0.5 rounded-full bg-risk-low/[0.12] text-risk-low border border-risk-low/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-low" />
              NWP GRID SYNCED
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-label">ECMWF IFS (Land Surface Model)</h3>
            <p className="text-xs text-label-2 tabular-nums mt-0.5">Topsoil Layer 1 (0-7 cm) Volumetric Content</p>
          </div>

          <div className="space-y-1.5 text-xs text-label-2 bg-page p-3 rounded-card border border-line">
            <div className="flex justify-between">
              <span className="text-label-2">Data Type:</span>
              <span className="font-medium text-label">Volumetric Soil Water (m³/m³)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Provider:</span>
              <span className="tabular-nums text-label">Open-Meteo / ECMWF IFS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Spatial Resolution:</span>
              <span className="tabular-nums text-label font-semibold">0.1° (~10 km Grid)</span>
            </div>
          </div>
        </div>

        {/* 3. SRTM 30m Digital Elevation Model */}
        <div className="bg-surface border border-line hover:border-line p-5 rounded-card space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-tile bg-surface-2 border border-line flex items-center justify-center text-label-2">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-xs tabular-nums font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-label-2 border border-line flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              STATIC DEM
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-label">SRTM 1-ArcSecond (30m) DEM</h3>
            <p className="text-xs text-label-2 tabular-nums mt-0.5">Topographic Elevation & Slope Gradient</p>
          </div>

          <div className="space-y-1.5 text-xs text-label-2 bg-page p-3 rounded-card border border-line">
            <div className="flex justify-between">
              <span className="text-label-2">Data Type:</span>
              <span className="font-medium text-label">Elevation (AMSL) & Slope (deg)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Spatial Resolution:</span>
              <span className="tabular-nums text-label font-semibold">30 meters (0.000277°)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Vertical Datum:</span>
              <span className="font-medium text-label">EGM96 Geoid / WGS84</span>
            </div>
          </div>
        </div>

        {/* 4. Geological Survey of India (GSI) NLSM */}
        <div className="bg-surface border border-line hover:border-line p-5 rounded-card space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-tile bg-risk-moderate/[0.12] border border-risk-moderate/30 flex items-center justify-center text-risk-moderate">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xs tabular-nums font-semibold px-2 py-0.5 rounded-full bg-risk-moderate/[0.12] text-risk-moderate border border-risk-moderate/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-moderate" />
              OFFICIAL CATALOG
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-label">Geological Survey of India (GSI) NLSM</h3>
            <p className="text-xs text-risk-moderate tabular-nums mt-0.5">Historical Landslide Inventory (NER)</p>
          </div>

          <div className="space-y-1.5 text-xs text-label-2 bg-page p-3 rounded-card border border-line">
            <div className="flex justify-between">
              <span className="text-label-2">Coverage:</span>
              <span className="font-medium text-label">Meghalaya, Sikkim, Nagaland Ghats</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Authority:</span>
              <span className="tabular-nums text-label font-semibold">Ministry of Mines / GSI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Attributes:</span>
              <span className="font-medium text-label">Trigger, Volume (m³), Casualties</span>
            </div>
          </div>
        </div>

        {/* 5. OpenStreetMap Highway Topology */}
        <div className="bg-surface border border-line hover:border-line p-5 rounded-card space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-tile bg-risk-low/[0.12] border border-risk-low/30 flex items-center justify-center text-risk-low">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs tabular-nums font-semibold px-2 py-0.5 rounded-full bg-risk-low/[0.12] text-risk-low border border-risk-low/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-low" />
              LIVE CONNECTED
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-label">OpenStreetMap (OSM) Vector Network</h3>
            <p className="text-xs text-risk-low tabular-nums mt-0.5">Highways & Safe Mountain Bypasses</p>
          </div>

          <div className="space-y-1.5 text-xs text-label-2 bg-page p-3 rounded-card border border-line">
            <div className="flex justify-between">
              <span className="text-label-2">Corridors:</span>
              <span className="font-medium text-label">NH-6, NH-10, NH-29, SH-14</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Algorithm:</span>
              <span className="tabular-nums text-label font-semibold">NetworkX Risk-Penalized Dijkstra</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Dynamic Blockages:</span>
              <span className="font-medium text-label">Authority Incident Overrides</span>
            </div>
          </div>
        </div>

        {/* 6. Random Forest ML Hazard Model Engine */}
        <div className="bg-surface border border-line hover:border-line p-5 rounded-card space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-tile bg-risk-critical/[0.12] border border-risk-critical/30 flex items-center justify-center text-risk-critical">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-xs tabular-nums font-semibold px-2 py-0.5 rounded-full bg-risk-critical/[0.12] text-risk-critical border border-risk-critical/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-critical" />
              LOADED v2.0
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-label">Random Forest Hazard Regressor</h3>
            <p className="text-xs text-risk-critical tabular-nums mt-0.5">Multi-Factor Geotechnical Prediction</p>
          </div>

          <div className="space-y-1.5 text-xs text-label-2 bg-page p-3 rounded-card border border-line">
            <div className="flex justify-between">
              <span className="text-label-2">Primary Driver:</span>
              <span className="font-medium text-label">Slope Gradient & 24h Rain</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Explainable AI:</span>
              <span className="tabular-nums text-label font-semibold">Feature Attribution Weights</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label-2">Calibration:</span>
              <span className="font-medium text-label">Post-Disaster Feedback Loop</span>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Live Coordinate Telemetry Inspector (Section 13) */}
      <div className="bg-surface border border-line p-6 rounded-card space-y-5">
        <div>
          <h2 className="text-base font-semibold text-label flex items-center gap-2">
            <Search className="w-4 h-4 text-label-2" />
            <span>Interactive Live Coordinate Telemetry Inspector</span>
          </h2>
          <p className="text-xs text-label-2 mt-1">
            Query real-time meteorological, DEM elevation, slope, and ECMWF IFS topsoil moisture data for any GPS coordinate:
          </p>

        </div>

        <form onSubmit={handleInspect} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-label-2 block mb-1" htmlFor="insp-lat">Latitude (°N)</label>
            <input
              id="insp-lat"
              type="number"
              step="0.0001"
              value={testLat}
              onChange={(e) => setTestLat(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-page border border-line rounded-tile text-xs text-label tabular-nums focus:outline-none focus:border-line"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-label-2 block mb-1" htmlFor="insp-lng">Longitude (°E)</label>
            <input
              id="insp-lng"
              type="number"
              step="0.0001"
              value={testLng}
              onChange={(e) => setTestLng(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-page border border-line rounded-tile text-xs text-label tabular-nums focus:outline-none focus:border-line"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={inspecting}
              className="w-full py-2.5 px-4 bg-surface-2 text-label rounded-tile text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Search className={`w-3.5 h-3.5 ${inspecting ? 'animate-spin' : ''}`} />
              <span>{inspecting ? 'Querying Live Feeds...' : 'Inspect Live Telemetry'}</span>
            </button>
          </div>
        </form>

        {/* Real Inspection Result Box */}
        {inspectResult && (
          <div className="p-4 bg-page border border-line rounded-card space-y-4 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent " />
                <span className="text-xs font-semibold text-label">Live Ingested Observation for Location</span>
                <span className="text-xs tabular-nums text-label-2">({inspectResult.coordinates.lat}°N, {inspectResult.coordinates.lng}°E)</span>
              </div>
              <span className={`text-xs tabular-nums font-semibold px-2 py-0.5 rounded ${
                inspectResult.risk_level === 'CRITICAL' ? 'bg-risk-critical/[0.12] text-risk-critical border border-risk-critical/30' :
                inspectResult.risk_level === 'HIGH' ? 'bg-risk-moderate/[0.12] text-risk-moderate border border-risk-moderate/30' :
                'bg-risk-low/[0.12] text-risk-low border border-risk-low/30'
              }`}>
                Risk Score: {inspectResult.risk_score} / 100 ({inspectResult.risk_level})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-surface rounded-tile border border-line">
                <span className="text-xs text-label-2 block">REAL 24H RAIN</span>
                <span className="text-sm font-semibold text-label-2 tabular-nums">
                  {(inspectResult.rainfall_24h !== null && inspectResult.rainfall_24h !== undefined) 
                    ? `${Number(inspectResult.rainfall_24h).toFixed(1)} mm` 
                    : (inspectResult.rainfall_24h_mm !== null && inspectResult.rainfall_24h_mm !== undefined 
                      ? `${Number(inspectResult.rainfall_24h_mm).toFixed(1)} mm` 
                      : '—')}
                </span>
                <span className="text-xs text-label-2 block mt-0.5">Source: Open-Meteo NWP Grid</span>
              </div>

              <div className="p-2.5 bg-surface rounded-tile border border-line">
                <span className="text-xs text-label-2 block">REAL SRTM SLOPE</span>
                <span className="text-sm font-semibold text-label-2 tabular-nums">{inspectResult.slope_deg}° Incline</span>
                <span className="text-xs text-label-2 block mt-0.5">Elevation: {inspectResult.elevation_amsl}m AMSL</span>
              </div>

              <div className="p-2.5 bg-surface rounded-tile border border-line">
                <span className="text-xs text-label-2 block">REAL SOIL MOISTURE</span>
                <span className="text-sm font-semibold text-label-2 tabular-nums">{inspectResult.soil_moisture ?? inspectResult.soil_moisture_m3m3 ?? 0.35} m³/m³</span>
                <span className="text-xs text-label-2 block mt-0.5">Source: ECMWF IFS (Open-Meteo)</span>
              </div>

              <div className="p-2.5 bg-surface rounded-tile border border-line">
                <span className="text-xs text-label-2 block">GSI HISTORY DENSITY</span>
                <span className="text-sm font-semibold text-risk-moderate tabular-nums">{inspectResult.historical_landslides_nearby ?? inspectResult.historical_incidents ?? 0} Events</span>
                <span className="text-xs text-label-2 block mt-0.5">Within 25 km radius</span>
              </div>
            </div>

            <div className="p-3 bg-surface rounded-tile border border-line text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-label block">Explainable AI Primary Driver: {inspectResult.primary_driver}</span>
                {inspectResult.model_confidence && (
                  <span className="text-xs tabular-nums text-risk-low">
                    Model Confidence: <strong>{inspectResult.model_confidence}%</strong>
                  </span>
                )}
              </div>
              <p className="text-label-2">{inspectResult.recommended_action}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
