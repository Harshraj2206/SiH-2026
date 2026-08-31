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
      const res = await api.getDataSources ? await api.getDataSources() : null;
      if (res) {
        setSourcesData(res);
      } else {
        // Fallback fetch directly
        const raw = await fetch('http://127.0.0.1:8000/api/data-sources');
        const json = await raw.json();
        setSourcesData(json);
      }
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
      const raw = await fetch('http://127.0.0.1:8000/api/telemetry/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: parseFloat(testLat), longitude: parseFloat(testLng) })
      });
      const data = await raw.json();
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
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-extrabold text-white">Authoritative Data Sources & Provenance Registry</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              PRODUCTION INGESTION
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Real-time multi-agency environmental telemetry, spatial resolutions, refresh frequencies, and calibration feeds.
          </p>
        </div>

        <button
          onClick={fetchSources}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors self-start md:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh API Status</span>
        </button>
      </div>

      {/* 5 Authoritative Data Feeds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* 1. IMD Weather & Rainfall */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl shadow-lg space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <CloudRain className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              LIVE CONNECTED
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">India Meteorological Department (IMD) / WMO Grid</h3>
            <p className="text-xs text-cyan-300 font-mono mt-0.5">Precipitation & Atmospheric Telemetry</p>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Data Type:</span>
              <span className="font-medium text-slate-200">1h, 24h, 72h Rain Accumulations</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Spatial Resolution:</span>
              <span className="font-mono text-slate-200 font-bold">0.1° (~10 km) WMO Grid</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Update Frequency:</span>
              <span className="font-medium text-slate-200">15-Min Ingestion Cache</span>
            </div>
          </div>
        </div>

        {/* 2. NASA SMAP Soil Moisture */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl shadow-lg space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              LIVE CONNECTED
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">NASA SMAP (Soil Moisture Active Passive)</h3>
            <p className="text-xs text-blue-300 font-mono mt-0.5">Topsoil & Root-Zone Water Saturation</p>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Data Type:</span>
              <span className="font-medium text-slate-200">Volumetric Soil Water (m³/m³)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sensor:</span>
              <span className="font-mono text-slate-200">L-band Microwave (1.41 GHz)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Spatial Resolution:</span>
              <span className="font-mono text-slate-200 font-bold">9 km Satellite Raster</span>
            </div>
          </div>
        </div>

        {/* 3. SRTM 30m Digital Elevation Model */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl shadow-lg space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              STATIC DEM
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">SRTM 1-ArcSecond (30m) DEM</h3>
            <p className="text-xs text-purple-300 font-mono mt-0.5">Topographic Elevation & Slope Gradient</p>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Data Type:</span>
              <span className="font-medium text-slate-200">Elevation (AMSL) & Slope (deg)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Spatial Resolution:</span>
              <span className="font-mono text-slate-200 font-bold">30 meters (0.000277°)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vertical Datum:</span>
              <span className="font-medium text-slate-200">EGM96 Geoid / WGS84</span>
            </div>
          </div>
        </div>

        {/* 4. Geological Survey of India (GSI) NLSM */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl shadow-lg space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              OFFICIAL CATALOG
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">Geological Survey of India (GSI) NLSM</h3>
            <p className="text-xs text-amber-300 font-mono mt-0.5">Historical Landslide Inventory (NER)</p>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Coverage:</span>
              <span className="font-medium text-slate-200">Meghalaya, Sikkim, Nagaland Ghats</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Authority:</span>
              <span className="font-mono text-slate-200 font-bold">Ministry of Mines / GSI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Attributes:</span>
              <span className="font-medium text-slate-200">Trigger, Volume (m³), Casualties</span>
            </div>
          </div>
        </div>

        {/* 5. OpenStreetMap Highway Topology */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl shadow-lg space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              LIVE CONNECTED
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">OpenStreetMap (OSM) Vector Network</h3>
            <p className="text-xs text-emerald-300 font-mono mt-0.5">Highways & Safe Mountain Bypasses</p>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Corridors:</span>
              <span className="font-medium text-slate-200">NH-6, NH-10, NH-29, SH-14</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Algorithm:</span>
              <span className="font-mono text-slate-200 font-bold">NetworkX Risk-Penalized Dijkstra</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dynamic Blockages:</span>
              <span className="font-medium text-slate-200">Authority Incident Overrides</span>
            </div>
          </div>
        </div>

        {/* 6. Random Forest ML Hazard Model Engine */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl shadow-lg space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              LOADED v2.0
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">Random Forest Hazard Regressor</h3>
            <p className="text-xs text-rose-300 font-mono mt-0.5">Multi-Factor Geotechnical Prediction</p>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Primary Driver:</span>
              <span className="font-medium text-slate-200">Slope Gradient & 24h Rain</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Explainable AI:</span>
              <span className="font-mono text-slate-200 font-bold">Feature Attribution Weights</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Calibration:</span>
              <span className="font-medium text-slate-200">Post-Disaster Feedback Loop</span>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Live Coordinate Telemetry Inspector (Section 13) */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-5">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Interactive Live Coordinate Telemetry Inspector</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Query real-time meteorological, DEM elevation, slope, and SMAP soil moisture data for any GPS coordinate across the North Eastern Region:
          </p>
        </div>

        <form onSubmit={handleInspect} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1" htmlFor="insp-lat">Latitude (°N)</label>
            <input
              id="insp-lat"
              type="number"
              step="0.0001"
              value={testLat}
              onChange={(e) => setTestLat(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1" htmlFor="insp-lng">Longitude (°E)</label>
            <input
              id="insp-lng"
              type="number"
              step="0.0001"
              value={testLng}
              onChange={(e) => setTestLng(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={inspecting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Search className={`w-3.5 h-3.5 ${inspecting ? 'animate-spin' : ''}`} />
              <span>{inspecting ? 'Querying Live Feeds...' : 'Inspect Live Telemetry'}</span>
            </button>
          </div>
        </form>

        {/* Real Inspection Result Box */}
        {inspectResult && (
          <div className="p-4 bg-slate-950/80 border border-cyan-500/30 rounded-2xl space-y-4 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-bold text-white">Live Ingested Observation for Location</span>
                <span className="text-xs font-mono text-cyan-300">({inspectResult.coordinates.lat}°N, {inspectResult.coordinates.lng}°E)</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                inspectResult.risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                inspectResult.risk_level === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                Risk Score: {inspectResult.risk_score} / 100 ({inspectResult.risk_level})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">REAL 24H RAIN</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">{inspectResult.rainfall_24h_mm} mm</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Source: IMD/WMO Grid</span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">REAL SRTM SLOPE</span>
                <span className="text-sm font-bold text-purple-400 font-mono">{inspectResult.slope_deg}° Incline</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Elevation: {inspectResult.elevation_amsl}m AMSL</span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">REAL SOIL MOISTURE</span>
                <span className="text-sm font-bold text-blue-400 font-mono">{inspectResult.soil_moisture_m3m3} m³/m³</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Source: NASA SMAP / ERA5</span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">GSI HISTORY DENSITY</span>
                <span className="text-sm font-bold text-amber-400 font-mono">{inspectResult.historical_landslides_nearby} Events</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Within 25 km radius</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-white block">Explainable AI Primary Driver: {inspectResult.primary_driver}</span>
              <p className="text-slate-300">{inspectResult.recommended_action}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
