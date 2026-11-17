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
import { formatDate, toLabel } from '../utils/formatters';
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
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
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
      background: #4A86E8;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    ">
      <div style="
        position: absolute;
        top: -6px;
        left: -6px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: rgba(74, 134, 232, 0.3);
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
        return 'bg-risk-critical/[0.12] text-risk-critical border-risk-critical/30';
      case 'HIGH':
        return 'bg-risk-high/[0.12] text-risk-high border-risk-high/30';
      case 'MODERATE':
        return 'bg-risk-moderate/[0.12] text-risk-moderate border-risk-moderate/30';
      default:
        return 'bg-risk-low/[0.12] text-risk-low border-risk-low/30';
    }
  };

  const getVerificationBadge = (ver) => {
    const v = (ver || '').toUpperCase();
    if (v === 'OFFICIAL') {
      return 'bg-surface-2 text-label-2 border-line';
    }
    if (v.includes('DEMO') || v.includes('SIMULATION')) {
      return 'bg-surface-2 text-label-2 border-line';
    }
    if (v === 'VERIFIED') {
      return 'bg-surface-2 text-label-2 border-line';
    }
    return 'bg-surface-2 text-label-2 border-line';
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
      <div className="bg-surface rounded-card p-8 max-w-xl mx-auto text-center space-y-4 my-12">
        <AlertTriangle className="w-10 h-10 text-risk-critical mx-auto" />
        <h2 className="text-lg font-semibold text-label">Incident Intelligence Feed Offline</h2>
        <p className="text-sm text-label-2">{fetchError}</p>
        <button
          onClick={() => fetchIntelligence(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:opacity-90 text-white text-xs font-semibold rounded-full whitespace-nowrap transition"
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-2 text-label-2 flex items-center gap-1">
              <Radio className="w-3 h-3 text-label-2 " />
              Authoritative India-wide landslide intelligence
            </span>
            <span className="text-xs text-label-2 tabular-nums">GSI • ISRO • IMD • NDMA</span>
          </div>
          <h1 className="text-2xl font-semibold text-label mt-1">Disaster Incidents & Early-Warning Explorer</h1>
          <p className="text-xs text-label-2">
            Multi-source verified landslide incidents, physical road blockades, and scientific early-warning forecast models across India.
          </p>
        </div>

        {/* Global KPI Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-surface-2 px-3 py-1.5 rounded-tile text-center">
            <span className="text-xs text-label-2 block tabular-nums">Confirmed incidents</span>
            <span className="text-sm tabular-nums font-semibold text-risk-critical">
              {fetchError ? '—' : (intelData?.coverage_summary?.total_confirmed_incidents ?? '...')}
            </span>
          </div>
          <div className="bg-surface-2 px-3 py-1.5 rounded-tile text-center">
            <span className="text-xs text-risk-moderate block tabular-nums">Forecast risk zones</span>
            <span className="text-sm tabular-nums font-semibold text-risk-moderate">
              {fetchError ? '—' : (intelData?.coverage_summary?.total_forecast_zones ?? '...')}
            </span>
          </div>
          <div className="bg-surface-2 px-3 py-1.5 rounded-tile text-center">
            <span className="text-xs text-label-2 block tabular-nums">Monitored states</span>
            <span className="text-sm tabular-nums font-semibold text-label-2">
              {fetchError ? '—' : (intelData?.coverage_summary?.monitored_states_count ?? '...')}
            </span>
          </div>
        </div>
      </div>

      {/* API Error Notification */}
      {fetchError && (
        <div className="bg-risk-critical/[0.12] border-risk-critical/30 p-4 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-risk-critical">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-risk-critical shrink-0" />
            <div>
              <span className="font-semibold block">Incident Geointelligence Service Unavailable</span>
              <span className="text-label-2 text-xs">{fetchError}</span>
            </div>
          </div>
          <button
            onClick={() => fetchIntelligence(true)}
            className="px-3.5 py-1.5 bg-risk-critical/[0.12] hover:bg-risk-critical/20 border-risk-critical/30 rounded-full whitespace-nowrap font-semibold text-label text-xs transition shrink-0 self-start sm:self-auto flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Feed
          </button>
        </div>
      )}

      {/* Freshness & User Proximity Banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* User Proximity Statement */}
        <div className={`md:col-span-8 p-3 rounded-card flex items-center justify-between gap-3 text-xs ${
 proximityAdvisory?.advisory_type === 'WARNING'
 ? 'bg-risk-critical/[0.12] text-risk-critical'
 : proximityAdvisory?.advisory_type === 'NOTICE'
 ? 'bg-risk-moderate/[0.12] text-risk-moderate'
 : 'bg-risk-low/[0.12] text-risk-low'
 }`}>
          <div className="flex items-center gap-2.5">
            {proximityAdvisory?.advisory_type === 'WARNING' ? (
              <AlertTriangle className="w-5 h-5 text-risk-critical flex-shrink-0" />
            ) : proximityAdvisory?.advisory_type === 'NOTICE' ? (
              <Info className="w-5 h-5 text-risk-moderate flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-risk-low flex-shrink-0" />
            )}
            <div>
              <span className="font-semibold block text-xs text-label-2">
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap bg-surface-2 text-xs text-label transition-colors flex-shrink-0"
            title="Recalculate with device GPS"
          >
            <Crosshair className={`w-3.5 h-3.5 text-label-2 ${locatingUser ? 'animate-spin' : ''}`} />
            {locatingUser ? 'Locating...' : 'My Location'}
          </button>
        </div>

        {/* Freshness Indicator & Manual Refresh */}
        <div className="md:col-span-4 bg-surface p-3 rounded-card flex items-center justify-between text-xs">
          <div>
            <span className="text-xs text-label-2 block tabular-nums">Pipeline freshness</span>
            <div className="flex items-center gap-1.5 text-label font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-risk-low"></span>
              {intelData?.sync_status === 'ONLINE_SYNCED' ? 'Authoritative Feeds Live' : 'Cached Snapshot Active'}
            </div>
          </div>

          <button
            onClick={() => fetchIntelligence(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 hover:bg-surface-2 text-label-2 rounded-full whitespace-nowrap font-semibold text-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Refresh Now'}
          </button>
        </div>
      </div>

      {/* Primary Categorization Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-semibold text-xs transition-all ${
            activeTab === 'confirmed'
              ? 'bg-risk-critical/[0.12] border border-risk-critical/30 text-risk-critical '
              : 'bg-surface-2 border border-transparent text-label-2 hover:text-label '
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-risk-critical"></span>
          Confirmed Landslides ({fetchError ? '—' : (intelData?.confirmed_incidents?.length ?? 0)})
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-semibold text-xs transition-all ${
            activeTab === 'forecast'
              ? 'bg-risk-moderate/[0.12] border border-risk-moderate/30 text-risk-moderate '
              : 'bg-surface-2 border border-transparent text-label-2 hover:text-label '
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-risk-moderate"></span>
          Landslide Risk & Forecast ({fetchError ? '—' : (intelData?.forecast_risks?.length ?? 0)})
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-semibold text-xs transition-all ${
            activeTab === 'all'
              ? 'bg-surface-2 text-label-2 '
              : 'bg-surface-2 text-label-2 hover:text-label '
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-label-2" />
          All India Monitored
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-semibold text-xs transition-all ml-auto ${
            activeTab === 'simulation'
              ? 'bg-surface-2 text-label-2 '
              : 'bg-surface-2 text-label-2 hover:text-label '
          }`}
          title="Synthetic drill benchmarks for training and calibration"
        >
          <span className="w-2 h-2 rounded-full bg-accent"></span>
          Simulation Drills ({fetchError ? '—' : (intelData?.demo_simulations?.length ?? 0)})
        </button>
      </div>

      {/* Interactive Map Section */}
      <div className="bg-surface rounded-card p-3.5 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-label-2 font-semibold">
            <MapIcon className="w-4 h-4 text-label-2" />
            <span>Interactive India Hazard Geointelligence Map</span>
            <span className="text-xs text-label-2 font-normal">
              (Pins show confirmed landslides; circles depict early-warning forecast zones)
            </span>
          </div>

          {/* Basemap Switcher */}
          <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-full self-start sm:self-auto">
            <span className="text-xs text-label-2 px-2 tabular-nums ">Map Type:</span>
            {MAP_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setMapType(t.id)}
                className={`px-2 py-1 rounded-full whitespace-nowrap text-xs font-semibold transition-all ${
                  mapType === t.id
                    ? 'bg-surface-2 text-label-2 '
                    : 'text-label-2 hover:text-label'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaflet Container */}
        <div className="w-full h-80 sm:h-96 rounded-tile overflow-hidden relative z-0">
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
                  <div className="p-1 text-label-3 text-xs">
                    <strong className="block text-label-2">Your Monitored Coordinates</strong>
                    <span>{userCoords.lat.toFixed(4)}°N, {userCoords.lon.toFixed(4)}°E</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Confirmed Incident Pins */}
            {(intelData?.confirmed_incidents || []).map((inc) => {
              const isSelected = selectedEvent?.incident_id === inc.incident_id;
              const color = inc.severity === 'CRITICAL' ? '#E06C66' : '#DB8E55';
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
                    <div className="p-1 text-label-3 text-xs space-y-1">
                      <span className="tabular-nums text-xs font-semibold text-risk-critical block">
                        {inc.incident_id} • CONFIRMED INCIDENT
                      </span>
                      <strong className="block text-sm">{inc.title}</strong>
                      <p className="text-label-3">{inc.district}, {inc.state}</p>
                      <span className="text-xs text-label-3 block">Source: {inc.source}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Forecast Risk Overlays */}
            {(intelData?.forecast_risks || []).map((fc) => {
              const isCrit = fc.risk_level === 'CRITICAL';
              const color = isCrit ? '#E06C66' : '#D4B24C';
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
                      <div className="p-1 text-label-3 text-xs space-y-1">
                        <span className="tabular-nums text-xs font-semibold text-risk-moderate block">
                          {fc.forecast_id} • EARLY-WARNING FORECAST
                        </span>
                        <strong className="block text-sm">{fc.title}</strong>
                        <p className="text-label-3">{fc.district}, {fc.state}</p>
                        <span className="text-xs text-risk-moderate block font-semibold">
                          Risk Level: {toLabel(fc.risk_level)} ({fc.rainfall_trigger_mm}mm rain / {fc.slope_gradient_deg}° slope)
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
                icon={createCustomIcon('#4A86E8', drill.incident_id)}
                eventHandlers={{
                  click: () => handleSelectEvent({ ...drill, _type: 'simulation' }),
                }}
              >
                <Popup>
                  <div className="p-1 text-label-3 text-xs space-y-1">
                    <span className="tabular-nums text-xs font-semibold text-label-2 block">
                      {drill.incident_id} • SIMULATION DRILL
                    </span>
                    <strong className="block">{drill.title}</strong>
                    <span className="text-xs text-label-3 block">Synthetic Benchmark Drill</span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Horizontal Interactive Timeline Bar */}
      <div className="bg-surface rounded-card p-4">
        <div className="flex items-center justify-between text-xs text-label-2 mb-3">
          <span className="font-semibold text-label flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-label-2" />
            Chronological Disaster Timeline & Early Warnings
          </span>
          <span className="text-xs tabular-nums text-label-2">Verified incident logs</span>
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
                className={`flex-shrink-0 p-3 rounded-tile text-left transition-all max-w-[210px] ${
                  isSel 
                    ? 'bg-surface-2 ' 
                    : 'bg-surface-2 '
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1 gap-1">
                  <span className="tabular-nums font-semibold text-label-2 truncate">{evId}</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-semibold text-xs ${getSeverityBadge(ev.severity || ev.risk_level)}`}>
                    {toLabel(ev.severity || ev.risk_level)}
                  </span>
                </div>
                <div className="font-semibold text-xs text-label truncate">{ev.title}</div>
                <div className="text-xs text-label-2 mt-1 truncate">
                  {ev.district}, {ev.state}
                </div>
                <div className="text-xs text-label-3 tabular-nums mt-0.5">
                  {isForecast ? 'Forecast Model' : formatDate(ev.timestamp)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Parameter Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-surface p-3.5 rounded-card">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-label-2 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search district, highway, corridor..."
            className="w-full pl-9 pr-3 py-2 bg-surface-2 rounded-full text-xs text-label placeholder-label-3 focus:outline-none"
          />
        </div>

        {/* State Filter (All India) */}
        <div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full py-2 px-3 bg-surface-2 rounded-full text-xs text-label focus:outline-none focus:ring-2 focus:ring-accent/40"
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
            className="w-full py-2 px-3 bg-surface-2 rounded-full text-xs text-label focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="ALL">All Risk / Severity Levels</option>
            <option value="CRITICAL"> Critical</option>
            <option value="HIGH"> High</option>
            <option value="MODERATE"> Moderate</option>
            <option value="LOW"> LOW</option>
          </select>
        </div>

        {/* Verification Status Filter */}
        <div>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="w-full py-2 px-3 bg-surface-2 rounded-full text-xs text-label focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="ALL">All Provenance Types</option>
            <option value="OFFICIAL">Official Government Record</option>
            <option value="VERIFIED">Satellite / Ground Verified</option>
            <option value="DEMO / SIMULATION">Simulation Drills</option>
            <option value="MODEL FORECAST">LandSafe Model Forecast</option>
            <option value="DEMO SEED">Demo Seed Records</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Event Cards (Left) & Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Event Cards List */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-label-2 text-xs">Loading operational intelligence telemetry...</div>
          ) : displayedEvents.length === 0 ? (
            <div className="bg-surface rounded-card p-8 text-center text-label-2 text-xs space-y-2">
              <AlertTriangle className="w-8 h-8 text-risk-moderate mx-auto" />
              <div className="font-semibold text-label">No events found matching your criteria</div>
              <p className="text-label-2">
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
                  className={`bg-surface rounded-card p-4 cursor-pointer transition-all hover:scale-[1.003] ${
                    isSelected ? ' bg-surface' : ' '
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums text-xs font-semibold text-label-2 bg-surface-2 px-2 py-0.5 rounded-full">
                        {evId}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getSeverityBadge(ev.severity || ev.risk_level)}`}>
                        {toLabel(ev.severity || ev.risk_level)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getVerificationBadge(ev.verification_status)}`}>
                        {isSim ? 'Demo / simulation' : toLabel(ev.verification_status)}
                      </span>
                      {isForecast && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-risk-moderate/[0.12] text-risk-moderate border-risk-moderate/30">
                          Early warning
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-label-2 tabular-nums">
                      {ev.freshness_label || formatDate(ev.timestamp)}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-label mb-1.5 leading-snug">{ev.title}</h3>
                  <p className="text-xs text-label-2 line-clamp-2">
                    {ev.description || ev.scientific_reason}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-line flex flex-wrap items-center justify-between text-xs text-label-2 gap-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-label-3" />
                      {ev.district}, {ev.state}
                    </span>

                    {isForecast ? (
                      <span className="text-risk-moderate font-semibold flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-risk-moderate" />
                        Trigger: {ev.rainfall_trigger_mm}mm rain • {ev.slope_gradient_deg}° slope
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-risk-moderate" />
                        {ev.estimated_population} at risk
                      </span>
                    )}

                    <span className="text-label-2 text-xs">
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
            <div className="bg-surface rounded-card p-5 space-y-4 sticky top-4">
              <div className="border-b border-line pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="tabular-nums text-xs font-semibold text-label-2">
                    {selectedEvent.incident_id || selectedEvent.forecast_id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getSeverityBadge(selectedEvent.severity || selectedEvent.risk_level)}`}>
                      {toLabel(selectedEvent.severity || selectedEvent.risk_level)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getVerificationBadge(selectedEvent.verification_status)}`}>
                      {selectedEvent.is_simulation ? 'Demo / simulation' : toLabel(selectedEvent.verification_status)}
                    </span>
                  </div>
                </div>
                <h2 className="font-semibold text-base text-label mt-1">{selectedEvent.title}</h2>
                <p className="text-xs text-label-2 mt-0.5">
                  {selectedEvent.district}, {selectedEvent.state} • Coordinates: {selectedEvent.latitude}°N, {selectedEvent.longitude}°E
                </p>
              </div>

              {/* Data Provenance & Source Block */}
              <div className="bg-surface-2 p-3.5 rounded-tile space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-label-2 block">
                    Authoritative Provenance
                  </span>
                  <span className="text-xs tabular-nums text-label-3">
                    {toLabel(selectedEvent.source_type || 'OFFICIAL_GOVERNMENT')}
                  </span>
                </div>
                <div className="text-label-2 font-semibold">
                  {selectedEvent.primary_source || selectedEvent.source}
                </div>

                {selectedEvent.source_url && (
                  <a
                    href={selectedEvent.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-label-2 hover:text-label-2 hover:underline pt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Official Authority Bulletin / Source</span>
                  </a>
                )}
              </div>

              {/* Briefing */}
              <div>
                <span className="text-xs font-semibold text-label-2 block mb-1">
                  {selectedEvent._type === 'forecast' ? 'Scientific Risk Forecast' : 'Incident Briefing'}
                </span>
                <p className="text-xs text-label leading-relaxed bg-surface-2 p-3 rounded-tile">
                  {selectedEvent.description || selectedEvent.scientific_reason}
                </p>
              </div>

              {/* Expandable "Why is this area at risk?" */}
              <div className="rounded-tile overflow-hidden bg-surface-2">
                <button
                  onClick={() => setExpandWhyRisk(!expandWhyRisk)}
                  className="w-full p-3 rounded-tile flex items-center justify-between text-left text-xs font-semibold text-label hover:bg-surface-2 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-label-2" />
                    Why is this area at risk? (Geotechnical Factors)
                  </span>
                  {expandWhyRisk ? <ChevronUp className="w-4 h-4 text-label-2" /> : <ChevronDown className="w-4 h-4 text-label-2" />}
                </button>

                {expandWhyRisk && (
                  <div className="p-3.5 pt-0 border-t border-line text-xs space-y-2 text-label-2">
                    {selectedEvent.why_at_risk && (
                      <p className="text-label-2 bg-surface-2 p-2.5 rounded-tile tabular-nums text-xs">
                        {selectedEvent.why_at_risk}
                      </p>
                    )}

                    {selectedEvent.reported_causes?.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-label-2 block mb-1">Reported Causes:</span>
                        <ul className="list-disc list-inside text-label-2 text-xs space-y-0.5">
                          {selectedEvent.reported_causes.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedEvent.contributing_factors?.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-label-2 block mb-1">Contributing Factors:</span>
                        <ul className="list-disc list-inside text-label-2 text-xs space-y-0.5">
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
                    <div className="bg-surface-2 p-2.5 rounded-tile">
                      <span className="text-xs text-label-2 block tabular-nums">Injured</span>
                      <span className="text-base tabular-nums font-semibold text-risk-moderate">{selectedEvent.injured_people ?? 0}</span>
                    </div>
                    <div className="bg-surface-2 p-2.5 rounded-tile">
                      <span className="text-xs text-label-2 block tabular-nums">Evacuated</span>
                      <span className="text-base tabular-nums font-semibold text-risk-low">{selectedEvent.evacuated_people ?? 0}</span>
                    </div>
                    <div className="bg-surface-2 p-2.5 rounded-tile">
                      <span className="text-xs text-label-2 block tabular-nums">Pop. at risk</span>
                      <span className="text-base tabular-nums font-semibold text-risk-critical">{selectedEvent.estimated_population ?? 0}</span>
                    </div>
                  </div>

                  {selectedEvent.casualties_info && (
                    <div className="text-xs text-label-2 bg-surface-2 px-3 py-1.5 rounded-tile tabular-nums">
                      {selectedEvent.casualties_info}
                    </div>
                  )}
                </div>
              )}

              {/* Blocked Roads */}
              {selectedEvent.blocked_roads?.length > 0 && (
                <div className="bg-risk-critical/[0.12] border-risk-critical/30 p-3 rounded-tile space-y-1 text-xs">
                  <span className="font-semibold text-risk-critical text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Confirmed Road Blockades
                  </span>
                  <ul className="list-disc list-inside text-risk-critical text-xs space-y-0.5">
                    {selectedEvent.blocked_roads.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Assigned Response Unit */}
              {selectedEvent.assigned_team_name && (
                <div className="bg-surface-2 p-3 rounded-tile text-xs space-y-1">
                  <span className="text-xs font-semibold text-label-2 block">Assigned Response Force</span>
                  <div className="font-semibold text-label flex items-center gap-1.5 text-sm">
                    <Shield className="w-4 h-4 text-label-2" />
                    {selectedEvent.assigned_team_name}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface rounded-card p-8 text-center text-label-2 text-xs">
              Select an incident or forecast zone from the map or list to view complete telemetry and provenance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
