import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Circle, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { incidentsApi } from '../services/api';
import { formatDate } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  MapPin, 
  Users, 
  Shield, 
  Clock, 
  Calendar,
  CheckCircle2, 
  Flame, 
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Globe,
  Compass,
  Layers,
  Mountain,
  Map as MapIcon,
  Crosshair,
  Radio
} from 'lucide-react';

// Fix Leaflet's default marker asset URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom map marker icons
const createCustomIcon = (color, label = '') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px ${color}88, 0 2px 6px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const userLocationIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      position: relative;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #0284c7;
      border: 3px solid #ffffff;
      box-shadow: 0 0 16px #38bdf8;
    ">
      <div style="
        position: absolute;
        top: -6px;
        left: -6px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: rgba(56, 189, 248, 0.35);
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Supported Basemap Tile Providers
const MAP_TYPES = [
  {
    id: 'dark',
    label: 'Dark Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap',
    maxZoom: 18
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 18,
    maxZoom: 19
  },
  {
    id: 'terrain',
    label: 'Terrain / Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Intermap',
    maxNativeZoom: 17,
    maxZoom: 19
  },
  {
    id: 'streets',
    label: 'Roadmap',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, TomTom',
    maxNativeZoom: 17,
    maxZoom: 19
  }
];

// Helper Component to Pan/Fly Map
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 10, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

export const IncidentsExplorerPage = () => {
  const { t } = useLanguage();

  // State Data
  const [intelData, setIntelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState('confirmed'); // 'confirmed', 'forecast', 'all', 'simulation'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [expandWhyRisk, setExpandWhyRisk] = useState(true);

  // User GPS Location & Proximity
  const { location: unifiedLoc, requestLocation: requestUnifiedLocation } = useLocationIntelligence();
  const [userCoords, setUserCoords] = useState({ lat: 11.5320, lon: 76.1280 }); // Default or GPS
  const [proximityAdvisory, setProximityAdvisory] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Sync with unified location provider
  useEffect(() => {
    if (unifiedLoc?.latitude && unifiedLoc?.longitude) {
      setUserCoords({ lat: unifiedLoc.latitude, lon: unifiedLoc.longitude });
      fetchProximityAdvisory(unifiedLoc.latitude, unifiedLoc.longitude);
    }
  }, [unifiedLoc?.latitude, unifiedLoc?.longitude]);

  // Map Controls
  const [mapType, setMapType] = useState('dark');
  const [mapCenter, setMapCenter] = useState([22.5, 82.5]); // Center of India
  const [mapZoom, setMapZoom] = useState(5);

  // Filtration
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');

  // Initial Fetch & GPS
  useEffect(() => {
    fetchIntelligence(false);
    detectUserLocation();
  }, []);

  const detectUserLocation = () => {
    requestUnifiedLocation();
  };

  const fetchProximityAdvisory = async (lat, lon) => {
    try {
      const adv = await incidentsApi.getProximity(lat, lon);
      setProximityAdvisory(adv);
    } catch (e) {
      console.warn('Proximity check failed:', e);
    }
  };

  const fetchIntelligence = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setFetchError(null);

      const data = await incidentsApi.getIntelligence(forceRefresh);
      setIntelData(data);

      // Select initial event if none chosen
      if (!selectedEvent) {
        if (data.confirmed_incidents && data.confirmed_incidents.length > 0) {
          setSelectedEvent({ ...data.confirmed_incidents[0], _type: 'confirmed' });
          setMapCenter([data.confirmed_incidents[0].latitude, data.confirmed_incidents[0].longitude]);
          setMapZoom(9);
        } else if (data.forecast_risks && data.forecast_risks.length > 0) {
          setSelectedEvent({ ...data.forecast_risks[0], _type: 'forecast' });
          setMapCenter([data.forecast_risks[0].latitude, data.forecast_risks[0].longitude]);
          setMapZoom(9);
        }
      }
    } catch (err) {
      console.error('Failed to load landslide intelligence:', err);
      setFetchError(err?.message || 'Unable to connect to incident intelligence feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Compile active list based on active tab
  const displayedEvents = useMemo(() => {
    if (!intelData) return [];
    let list = [];

    if (activeTab === 'confirmed') {
      list = (intelData.confirmed_incidents || []).map(i => ({ ...i, _type: 'confirmed' }));
    } else if (activeTab === 'forecast') {
      list = (intelData.forecast_risks || []).map(f => ({ ...f, _type: 'forecast' }));
    } else if (activeTab === 'simulation') {
      list = (intelData.demo_simulations || []).map(d => ({ ...d, _type: 'simulation' }));
    } else {
      // 'all'
      const conf = (intelData.confirmed_incidents || []).map(i => ({ ...i, _type: 'confirmed' }));
      const fc = (intelData.forecast_risks || []).map(f => ({ ...f, _type: 'forecast' }));
      list = [...conf, ...fc];
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => {
        const title = (item.title || '').toLowerCase();
        const id = (item.incident_id || item.forecast_id || '').toLowerCase();
        const dist = (item.district || '').toLowerCase();
        const st = (item.state || '').toLowerCase();
        return title.includes(q) || id.includes(q) || dist.includes(q) || st.includes(q);
      });
    }

    // Filter by State
    if (stateFilter !== 'ALL') {
      list = list.filter(item => (item.state || '').toLowerCase() === stateFilter.toLowerCase());
    }

    // Filter by Severity / Risk
    if (severityFilter !== 'ALL') {
      list = list.filter(item => {
        const sev = (item.severity || item.risk_level || '').toUpperCase();
        return sev === severityFilter;
      });
    }

    // Filter by Verification Status
    if (verificationFilter !== 'ALL') {
      list = list.filter(item => {
        const ver = (item.verification_status || '').toUpperCase();
        return ver === verificationFilter;
      });
    }

    return list;
  }, [intelData, activeTab, searchQuery, stateFilter, severityFilter, verificationFilter]);

  // Handle Event Selection
  const handleSelectEvent = (ev) => {
    setSelectedEvent(ev);
    if (ev.latitude && ev.longitude) {
      setMapCenter([ev.latitude, ev.longitude]);
      setMapZoom(10);
    }
  };

  // Badges
  const getSeverityBadge = (sev) => {
    const s = (sev || '').toUpperCase();
    switch (s) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getVerificationBadge = (ver) => {
    const v = (ver || '').toUpperCase();
    if (v === 'OFFICIAL') {
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70';
    }
    if (v.includes('DEMO') || v.includes('SIMULATION')) {
      return 'bg-purple-950/80 text-purple-300 border-purple-700/70';
    }
    if (v === 'VERIFIED') {
      return 'bg-blue-950/80 text-blue-300 border-blue-700/70';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const activeTileConfig = useMemo(() => {
    return MAP_TYPES.find(m => m.id === mapType) || MAP_TYPES[0];
  }, [mapType]);

  // Unique list of states for filter dropdown
  const availableStates = useMemo(() => {
    if (!intelData?.coverage_summary?.states_breakdown) {
      return [
        'Himachal Pradesh', 'Uttarakhand', 'Kerala', 'Karnataka', 
        'Maharashtra', 'Sikkim', 'Meghalaya', 'Nagaland', 'West Bengal', 'Jammu & Kashmir'
      ];
    }
    return Object.keys(intelData.coverage_summary.states_breakdown).sort();
  }, [intelData]);

  if (fetchError && !intelData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4 my-12">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Incident Intelligence Feed Offline</h2>
        <p className="text-sm text-slate-400">{fetchError}</p>
        <button
          onClick={() => fetchIntelligence(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/70 text-cyan-400 border border-cyan-800/70 flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              AUTHORITATIVE INDIA-WIDE LANDSLIDE INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400 font-mono">GSI • ISRO • IMD • NDMA</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Disaster Incidents & Early-Warning Explorer</h1>
          <p className="text-xs text-slate-400">
            Multi-source verified landslide incidents, physical road blockades, and scientific early-warning forecast models across India.
          </p>
        </div>

        {/* Global KPI Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block font-mono">CONFIRMED INCIDENTS</span>
            <span className="text-sm font-mono font-bold text-rose-400">
              {intelData?.coverage_summary?.total_confirmed_incidents ?? '...'}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-amber-400 block font-mono">FORECAST RISK ZONES</span>
            <span className="text-sm font-mono font-bold text-amber-300">
              {intelData?.coverage_summary?.total_forecast_zones ?? '...'}
            </span>
          </div>
          <div className="bg-cyan-950/40 border border-cyan-800/40 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-cyan-400 block font-mono">MONITORED STATES</span>
            <span className="text-sm font-mono font-bold text-cyan-300">
              {intelData?.coverage_summary?.monitored_states_count ?? '...'}
            </span>
          </div>
        </div>
      </div>

      {/* Freshness & User Proximity Banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* User Proximity Statement */}
        <div className={`md:col-span-8 p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
          proximityAdvisory?.advisory_type === 'WARNING'
            ? 'bg-red-950/40 border-red-800/60 text-red-200'
            : proximityAdvisory?.advisory_type === 'NOTICE'
            ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
            : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {proximityAdvisory?.advisory_type === 'WARNING' ? (
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            ) : proximityAdvisory?.advisory_type === 'NOTICE' ? (
              <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            )}
            <div>
              <span className="font-bold block text-[11px] uppercase tracking-wider text-slate-300">
                Location Proximity Assessment
              </span>
              <p className="leading-snug">
                {proximityAdvisory?.advisory_text || 'Assessing proximity to nearest active landslide hazard zone...'}
              </p>
            </div>
          </div>

          <button
            onClick={detectUserLocation}
            disabled={locatingUser}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-[11px] text-slate-200 transition-colors flex-shrink-0"
            title="Recalculate with device GPS"
          >
            <Crosshair className={`w-3.5 h-3.5 text-cyan-400 ${locatingUser ? 'animate-spin' : ''}`} />
            {locatingUser ? 'Locating...' : 'My Location'}
          </button>
        </div>

        {/* Freshness Indicator & Manual Refresh */}
        <div className="md:col-span-4 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-mono">PIPELINE FRESHNESS</span>
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {intelData?.sync_status === 'ONLINE_SYNCED' ? 'Authoritative Feeds Live' : 'Cached Snapshot Active'}
            </div>
          </div>

          <button
            onClick={() => fetchIntelligence(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-300 rounded-xl font-bold text-xs transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Refresh Now'}
          </button>
        </div>
      </div>

      {/* Primary Categorization Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'confirmed'
              ? 'bg-rose-950/70 border border-rose-600 text-rose-200 shadow-lg shadow-rose-950/50'
              : 'bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          Confirmed Landslides ({intelData?.confirmed_incidents?.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'forecast'
              ? 'bg-amber-950/70 border border-amber-600 text-amber-200 shadow-lg shadow-amber-950/50'
              : 'bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Landslide Risk & Forecast ({intelData?.forecast_risks?.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'all'
              ? 'bg-cyan-950/70 border border-cyan-600 text-cyan-200 shadow-lg shadow-cyan-950/50'
              : 'bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          All India Monitored
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ml-auto ${
            activeTab === 'simulation'
              ? 'bg-purple-950/70 border border-purple-600 text-purple-200 shadow-lg shadow-purple-950/50'
              : 'bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
          title="Synthetic drill benchmarks for training and calibration"
        >
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          Simulation Drills ({intelData?.demo_simulations?.length ?? 0})
        </button>
      </div>

      {/* Interactive Map Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-2xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
            <MapIcon className="w-4 h-4 text-cyan-400" />
            <span>Interactive India Hazard Geointelligence Map</span>
            <span className="text-[10px] text-slate-400 font-normal">
              (Pins show confirmed landslides; circles depict early-warning forecast zones)
            </span>
          </div>

          {/* Basemap Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <span className="text-[10px] text-slate-400 px-2 font-mono uppercase">Map Type:</span>
            {MAP_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setMapType(t.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  mapType === t.id
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaflet Container */}
        <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-slate-800 relative z-0">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url={activeTileConfig.url}
              attribution={activeTileConfig.attribution}
              maxNativeZoom={activeTileConfig.maxNativeZoom || 17}
              maxZoom={activeTileConfig.maxZoom || 19}
            />
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* User GPS Pin */}
            {userCoords && userCoords.lat && (
              <Marker position={[userCoords.lat, userCoords.lon]} icon={userLocationIcon}>
                <Popup>
                  <div className="p-1 text-slate-900 text-xs">
                    <strong className="block text-sky-600">Your Monitored Coordinates</strong>
                    <span>{userCoords.lat.toFixed(4)}°N, {userCoords.lon.toFixed(4)}°E</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Confirmed Incident Pins */}
            {(intelData?.confirmed_incidents || []).map((inc) => {
              const isSelected = selectedEvent?.incident_id === inc.incident_id;
              const color = inc.severity === 'CRITICAL' ? '#f43f5e' : '#f97316';
              return (
                <Marker
                  key={inc.incident_id}
                  position={[inc.latitude, inc.longitude]}
                  icon={createCustomIcon(color, inc.incident_id)}
                  eventHandlers={{
                    click: () => handleSelectEvent({ ...inc, _type: 'confirmed' }),
                  }}
                >
                  <Popup>
                    <div className="p-1 text-slate-900 text-xs space-y-1">
                      <span className="font-mono text-[10px] font-bold text-rose-600 block">
                        {inc.incident_id} • CONFIRMED INCIDENT
                      </span>
                      <strong className="block text-sm">{inc.title}</strong>
                      <p className="text-slate-600">{inc.district}, {inc.state}</p>
                      <span className="text-[10px] text-slate-500 block">Source: {inc.source}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Forecast Risk Overlays */}
            {(intelData?.forecast_risks || []).map((fc) => {
              const isCrit = fc.risk_level === 'CRITICAL';
              const color = isCrit ? '#ef4444' : '#f59e0b';
              return (
                <React.Fragment key={fc.forecast_id}>
                  <Circle
                    center={[fc.latitude, fc.longitude]}
                    radius={(fc.radius_km || 15) * 1000}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.18,
                      weight: 1.5,
                      dashArray: '4, 6'
                    }}
                  />
                  <Marker
                    position={[fc.latitude, fc.longitude]}
                    icon={createCustomIcon(color, fc.forecast_id)}
                    eventHandlers={{
                      click: () => handleSelectEvent({ ...fc, _type: 'forecast' }),
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-slate-900 text-xs space-y-1">
                        <span className="font-mono text-[10px] font-bold text-amber-600 block">
                          {fc.forecast_id} • EARLY-WARNING FORECAST
                        </span>
                        <strong className="block text-sm">{fc.title}</strong>
                        <p className="text-slate-600">{fc.district}, {fc.state}</p>
                        <span className="text-[10px] text-amber-700 block font-semibold">
                          Risk Level: {fc.risk_level} ({fc.rainfall_trigger_mm}mm rain / {fc.slope_gradient_deg}° slope)
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}

            {/* Simulation Drills (if active) */}
            {activeTab === 'simulation' && (intelData?.demo_simulations || []).map((drill) => (
              <Marker
                key={drill.incident_id}
                position={[drill.latitude, drill.longitude]}
                icon={createCustomIcon('#a855f7', drill.incident_id)}
                eventHandlers={{
                  click: () => handleSelectEvent({ ...drill, _type: 'simulation' }),
                }}
              >
                <Popup>
                  <div className="p-1 text-slate-900 text-xs space-y-1">
                    <span className="font-mono text-[10px] font-bold text-purple-600 block">
                      {drill.incident_id} • SIMULATION DRILL
                    </span>
                    <strong className="block">{drill.title}</strong>
                    <span className="text-[10px] text-slate-500 block">Synthetic Benchmark Drill</span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Horizontal Interactive Timeline Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            Chronological Disaster Timeline & Early Warnings
          </span>
          <span className="text-[10px] font-mono text-slate-400">VERIFIED INCIDENT LOGS</span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {displayedEvents.map((ev) => {
            const evId = ev.incident_id || ev.forecast_id;
            const isSel = (selectedEvent?.incident_id || selectedEvent?.forecast_id) === evId;
            const isForecast = ev._type === 'forecast';

            return (
              <button
                key={evId}
                onClick={() => handleSelectEvent(ev)}
                className={`flex-shrink-0 p-3 rounded-xl border text-left transition-all max-w-[210px] ${
                  isSel 
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-lg shadow-cyan-950/50' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1 gap-1">
                  <span className="font-mono font-bold text-cyan-400 truncate">{evId}</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] border ${getSeverityBadge(ev.severity || ev.risk_level)}`}>
                    {ev.severity || ev.risk_level}
                  </span>
                </div>
                <div className="font-bold text-xs text-white truncate">{ev.title}</div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  {ev.district}, {ev.state}
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  {isForecast ? 'Forecast Model' : formatDate(ev.timestamp)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Parameter Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search district, highway, corridor..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* State Filter (All India) */}
        <div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Monitored States</option>
            {availableStates.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Severity / Risk Filter */}
        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Risk / Severity Levels</option>
            <option value="CRITICAL">🔴 CRITICAL</option>
            <option value="HIGH">🟠 HIGH</option>
            <option value="MODERATE">🟡 MODERATE</option>
            <option value="LOW">🟢 LOW</option>
          </select>
        </div>

        {/* Verification Status Filter */}
        <div>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Provenance Types</option>
            <option value="OFFICIAL">Official Government Record</option>
            <option value="VERIFIED">Satellite / Ground Verified</option>
            <option value="DEMO / SIMULATION">Simulation Drills</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Event Cards (Left) & Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Event Cards List */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading operational intelligence telemetry...</div>
          ) : displayedEvents.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="font-bold text-slate-200">No events found matching your criteria</div>
              <p className="text-slate-400">
                Try resetting state or severity filters to view events from other sectors.
              </p>
            </div>
          ) : (
            displayedEvents.map((ev) => {
              const evId = ev.incident_id || ev.forecast_id;
              const isSelected = (selectedEvent?.incident_id || selectedEvent?.forecast_id) === evId;
              const isForecast = ev._type === 'forecast';
              const isSim = ev._type === 'simulation' || ev.is_simulation;

              return (
                <div
                  key={evId}
                  onClick={() => handleSelectEvent(ev)}
                  className={`bg-slate-900/90 border rounded-2xl p-4 shadow-xl cursor-pointer transition-all hover:scale-[1.003] ${
                    isSelected ? 'border-cyan-500 shadow-cyan-950/40 bg-slate-900' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                        {evId}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getSeverityBadge(ev.severity || ev.risk_level)}`}>
                        {ev.severity || ev.risk_level}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getVerificationBadge(ev.verification_status)}`}>
                        {isSim ? 'DEMO / SIMULATION' : ev.verification_status}
                      </span>
                      {isForecast && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                          EARLY WARNING
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ev.freshness_label || formatDate(ev.timestamp)}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white mb-1.5 leading-snug">{ev.title}</h3>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {ev.description || ev.scientific_reason}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {ev.district}, {ev.state}
                    </span>

                    {isForecast ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        Trigger: {ev.rainfall_trigger_mm}mm rain • {ev.slope_gradient_deg}° slope
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-amber-500" />
                        {ev.estimated_population} at risk
                      </span>
                    )}

                    <span className="text-slate-400 text-[10px]">
                      Source: {ev.primary_source || ev.source}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Event Inspector Panel */}
        <div className="lg:col-span-5">
          {selectedEvent ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 sticky top-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {selectedEvent.incident_id || selectedEvent.forecast_id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2.5 py-0.5 rounded font-bold border ${getSeverityBadge(selectedEvent.severity || selectedEvent.risk_level)}`}>
                      {selectedEvent.severity || selectedEvent.risk_level}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getVerificationBadge(selectedEvent.verification_status)}`}>
                      {selectedEvent.is_simulation ? 'DEMO / SIMULATION' : selectedEvent.verification_status}
                    </span>
                  </div>
                </div>
                <h2 className="font-extrabold text-base text-white mt-1">{selectedEvent.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedEvent.district}, {selectedEvent.state} • Coordinates: {selectedEvent.latitude}°N, {selectedEvent.longitude}°E
                </p>
              </div>

              {/* Data Provenance & Source Block */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                    Authoritative Provenance
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedEvent.source_type || 'OFFICIAL_GOVERNMENT'}
                  </span>
                </div>
                <div className="text-slate-300 font-semibold">
                  {selectedEvent.primary_source || selectedEvent.source}
                </div>

                {selectedEvent.source_url && (
                  <a
                    href={selectedEvent.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline pt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Official Authority Bulletin / Source</span>
                  </a>
                )}
              </div>

              {/* Briefing */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {selectedEvent._type === 'forecast' ? 'Scientific Risk Forecast' : 'Incident Briefing'}
                </span>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  {selectedEvent.description || selectedEvent.scientific_reason}
                </p>
              </div>

              {/* Expandable "Why is this area at risk?" */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <button
                  onClick={() => setExpandWhyRisk(!expandWhyRisk)}
                  className="w-full p-3 flex items-center justify-between text-left text-xs font-bold text-slate-200 hover:bg-slate-900 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-cyan-400" />
                    Why is this area at risk? (Geotechnical Factors)
                  </span>
                  {expandWhyRisk ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandWhyRisk && (
                  <div className="p-3.5 pt-0 border-t border-slate-800/80 text-xs space-y-2 text-slate-300">
                    {selectedEvent.why_at_risk && (
                      <p className="text-cyan-300 bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/40 font-mono text-[11px]">
                        {selectedEvent.why_at_risk}
                      </p>
                    )}

                    {selectedEvent.reported_causes?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Reported Causes:</span>
                        <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                          {selectedEvent.reported_causes.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedEvent.contributing_factors?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Contributing Factors:</span>
                        <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5">
                          {selectedEvent.contributing_factors.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Casualty & Evacuation Telemetry */}
              {selectedEvent._type !== 'forecast' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-mono">INJURED</span>
                      <span className="text-base font-mono font-bold text-amber-400">{selectedEvent.injured_people ?? 0}</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-mono">EVACUATED</span>
                      <span className="text-base font-mono font-bold text-emerald-400">{selectedEvent.evacuated_people ?? 0}</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-mono">POP. AT RISK</span>
                      <span className="text-base font-mono font-bold text-rose-400">{selectedEvent.estimated_population ?? 0}</span>
                    </div>
                  </div>

                  {selectedEvent.casualties_info && (
                    <div className="text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
                      {selectedEvent.casualties_info}
                    </div>
                  )}
                </div>
              )}

              {/* Blocked Roads */}
              {selectedEvent.blocked_roads?.length > 0 && (
                <div className="bg-red-950/30 border border-red-800/40 p-3 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-red-400 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Confirmed Road Blockades
                  </span>
                  <ul className="list-disc list-inside text-red-200 text-[11px] space-y-0.5">
                    {selectedEvent.blocked_roads.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Assigned Response Unit */}
              {selectedEvent.assigned_team_name && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Response Force</span>
                  <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    {selectedEvent.assigned_team_name}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              Select an incident or forecast zone from the map or list to view complete telemetry and provenance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
