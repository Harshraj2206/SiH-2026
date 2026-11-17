import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polygon, 
  Marker, 
  Popup, 
  Polyline, 
  Circle,
  useMap,
  useMapEvents,
  Tooltip,
  CircleMarker,
  ZoomControl
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRiskScoreColor, formatDate, toLabel } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLocationIntelligence } from '../../context/LocationIntelligenceContext';
import { getLiveWeather } from '../../services/weatherService';
import { reverseGeocode, formatCoordinateFallback } from '../../services/reverseGeocodeService';
import { 
  Layers, 
  Navigation, 
  Crosshair, 
  Ambulance, 
  Home, 
  Shield, 
  Radio, 
  Compass, 
  X,
  MapPin,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { WorldBounds, WORLD_BOUNDS } from './WorldBounds';
import { PlaceSearch } from '../common/PlaceSearch';

// Fix default Leaflet marker icon URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 100% Free Public Basemap Tiles (Zero API key required, No watermarks)
const BASEMAP_TILES = {
  streets: {
    label: 'Street Map',
    name: 'ESRI World Street Map',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRC, METI, TomTom',
    maxNativeZoom: 17,
    maxZoom: 19
  },
  light: {
    label: 'Light Canvas',
    name: 'ESRI Light Gray Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, NAVTEQ',
    maxNativeZoom: 16,
    maxZoom: 19
  },
  dark: {
    label: 'Dark Canvas',
    name: 'ESRI Dark Gray (Dark Mode)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, NAVTEQ',
    maxNativeZoom: 16,
    maxZoom: 19
  },
  satellite: {
    label: 'Satellite',
    name: 'ESRI Satellite Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 18,
    maxZoom: 19
  },
  terrain: {
    label: 'Terrain',
    name: 'ESRI Topographic Relief',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, Intermap',
    maxNativeZoom: 17,
    maxZoom: 19
  },
  osm: {
    label: 'OpenStreetMap',
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxNativeZoom: 19,
    maxZoom: 19
  }
};

// Clean Operational Marker Pin Generators
const createIncidentIcon = (severity) => {
  const isCrit = severity === 'CRITICAL';
  const color = isCrit ? '#E06C66' : '#D4B24C';
  const html = `
    <div style="width:24px; height:24px; border-radius:50%; background:#1C1C1E; border:2px solid ${color}; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.6);">
      <span style="color:${color}; font-size:10px; font-weight:600;">▲</span>
    </div>
  `;
  return L.divIcon({ className: 'custom-incident-pin', html, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
};

const createSOSIcon = () => {
  const html = `
    <div style="width:26px; height:26px; border-radius:50%; background:#E06C66; border:2px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.4);">
      <span style="color:#ffffff; font-size:9px; font-weight:600; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,sans-serif;">SOS</span>
    </div>
  `;
  return L.divIcon({ className: 'custom-sos-pin', html, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13] });
};

const createHospitalIcon = () => {
  const html = `
    <div style="width:22px; height:22px; border-radius:50%; background:#2C2C2E; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.5); font-size:12px; font-weight:bold; color:white;">
      +
    </div>
  `;
  return L.divIcon({ className: 'custom-hosp-pin', html, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11] });
};

const createShelterIcon = () => {
  const html = `
    <div style="width:22px; height:22px; border-radius:50%; background:#2C2C2E; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.5); font-size:11px; color:white;">
      S
    </div>
  `;
  return L.divIcon({ className: 'custom-shelter-pin', html, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11] });
};

const createTeamIcon = () => {
  const html = `
    <div style="width:22px; height:22px; border-radius:50%; background:#2C2C2E; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.5); font-size:10px; color:white;">
      R
    </div>
  `;
  return L.divIcon({ className: 'custom-team-pin', html, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11] });
};

const createReportIcon = (status) => {
  const isVerified = status === 'VERIFIED';
  const color = isVerified ? '#6BBF8A' : '#D4B24C';
  const html = `
    <div style="width:18px; height:18px; background:#1C1C1E; border:2px solid ${color}; border-radius:50%; display:flex; align-items:center; justify-content:center;">
      <div style="width:6px; height:6px; border-radius:50%; background:${color};"></div>
    </div>
  `;
  return L.divIcon({ className: 'custom-report-pin', html, iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -9] });
};

// Map Recenter & Event Component - Rock-Solid Single-Execution Controller
const MapEventHandler = ({ onMapClick, centerTarget, zoomTarget, routeData }) => {
  const map = useMap();
  const lastFlownRef = React.useRef({ lat: null, lng: null, zoom: null, routeKey: null });

  // 1. Handle route fitting exactly once per route
  useEffect(() => {
    if (routeData && (routeData.safe_route?.coordinates?.length > 0 || routeData.fastest_route?.coordinates?.length > 0)) {
      const coords = [
        ...(routeData.safe_route?.coordinates || []),
        ...(routeData.fastest_route?.coordinates || [])
      ];
      const routeKey = `${coords.length}-${coords[0]?.lat}-${coords[coords.length - 1]?.lat}`;
      if (lastFlownRef.current.routeKey === routeKey) {
        return; // Route already framed, do not re-trigger fitBounds!
      }
      lastFlownRef.current.routeKey = routeKey;

      const allCoords = coords.map(c => [c.lat, c.lng]);
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.stop();
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true, duration: 0.8 });
        return;
      }
    }
  }, [routeData, map]);

  // 2. Handle coordinate centering with primitive dependencies and anti-drift guard
  const targetLat = centerTarget?.[0];
  const targetLng = centerTarget?.[1];

  useEffect(() => {
    if (typeof targetLat !== 'number' || typeof targetLng !== 'number' || isNaN(targetLat) || isNaN(targetLng)) return;
    if (targetLat < -90 || targetLat > 90 || targetLng < -180 || targetLng > 180) return;

    const zoom = zoomTarget || map.getZoom() || 10;
    const last = lastFlownRef.current;

    // Check if target matches last flown coordinates closely
    if (
      last.lat !== null &&
      Math.abs(targetLat - last.lat) < 0.0001 &&
      Math.abs(targetLng - last.lng) < 0.0001 &&
      Math.abs(zoom - last.zoom) < 0.1
    ) {
      return; // Already at target location, skip!
    }

    lastFlownRef.current = { lat: targetLat, lng: targetLng, zoom: zoom, routeKey: last.routeKey };

    // Stop any ongoing conflicting flight animation and execute clean transition
    map.stop();
    map.flyTo([targetLat, targetLng], zoom, {
      duration: 0.8,
      easeLinearity: 0.25
    });
  }, [targetLat, targetLng, zoomTarget, map]);

  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });

  return null;
};

export const LeafletRiskMap = ({
  zones = [],
  selectedZone = null,
  onSelectZone,
  reports = [],
  incidents = [],
  sosRequests = [],
  rescueTeams = [],
  hospitals = [],
  shelters = [],
  roads = [],
  routeData = null,
  mapCenter = null,
  mapZoom = null,
  height = '540px',
}) => {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const defaultCenter = [22.6, 79.0]; // centre of India
  const [activeCenter, setActiveCenter] = useState(mapCenter || (selectedZone?.center ? [selectedZone.center.lat, selectedZone.center.lng] : defaultCenter));
  const [activeZoom, setActiveZoom] = useState(mapZoom || (selectedZone ? 10 : 5));

  // Basemap & Layer Toggles (Adapts default tile provider to active Light / Dark theme)
  const [activeBasemap, setActiveBasemap] = useState(resolvedTheme === 'light' ? 'light' : 'dark');

  // Sync default basemap when user changes theme preference without moving camera
  useEffect(() => {
    setActiveBasemap(resolvedTheme === 'light' ? 'light' : 'dark');
  }, [resolvedTheme]);
  const [layers, setLayers] = useState({
    zones: true,
    rainfall: true,
    incidents: true,
    reports: true,
    sos: true,
    roads: true,
    rescueTeams: true,
    hospitals: true,
    shelters: true,
    routes: true
  });

  const {
    location: userLocation,
    weather: userWeather,
    requestLocation: requestContextLocation,
    setManualLocation: setContextManualLocation
  } = useLocationIntelligence();

  // Single Active Location Pin State (strictly one location marker at a time)
  const [activeLocationPin, setActiveLocationPin] = useState(null); // { lat, lng, type: 'gps' | 'manual', accuracy, name }
  const [geoLocating, setGeoLocating] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const latestInspectionRef = useRef(0);

  // Sync external mapCenter and mapZoom
  const mapCenterLat = mapCenter?.[0];
  const mapCenterLng = mapCenter?.[1];
  useEffect(() => {
    if (typeof mapCenterLat === 'number' && typeof mapCenterLng === 'number') {
      setActiveCenter([mapCenterLat, mapCenterLng]);
      if (typeof mapZoom === 'number') {
        setActiveZoom(mapZoom);
      }
    }
  }, [mapCenterLat, mapCenterLng, mapZoom]);

  // Fly to selected zone if changed externally
  const zoneCenterLat = selectedZone?.center?.lat;
  const zoneCenterLng = selectedZone?.center?.lng;
  const isLiveInspected = selectedZone?.is_live_inspected;
  useEffect(() => {
    if (typeof zoneCenterLat === 'number' && typeof zoneCenterLng === 'number') {
      setActiveCenter([zoneCenterLat, zoneCenterLng]);
      setActiveZoom(isLiveInspected ? 13 : 10);
    }
  }, [zoneCenterLat, zoneCenterLng, isLiveInspected]);

  // Sync location pin when user GPS is acquired or granted
  useEffect(() => {
    if (userLocation.isGps && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number') {
      setGeoLocating(false);
      setActiveCenter([userLocation.latitude, userLocation.longitude]);
      setActiveZoom(14);
      setActiveLocationPin({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        type: 'gps',
        accuracy: userLocation.accuracy || 25,
        name: userLocation.displayName || 'My GPS Location'
      });
    } else if (userLocation.error && geoLocating) {
      setGeoLocating(false);
    }
  }, [userLocation.isGps, userLocation.latitude, userLocation.longitude, userLocation.displayName, userLocation.accuracy, userLocation.error, geoLocating]);

  // Handle "Locate Me" button - requests high-accuracy location via unified provider
  const handleLocateMe = async () => {
    if (geoLocating) return; // Ignore concurrent clicks while active

    setGeoLocating(true);
    try {
      const res = await requestContextLocation(true);
      if (res?.success && res.location) {
        const { latitude, longitude, displayName, accuracy } = res.location;
        setActiveCenter([latitude, longitude]);
        setActiveZoom(14);
        setActiveLocationPin({
          lat: latitude,
          lng: longitude,
          type: 'gps',
          accuracy: accuracy || 25,
          name: displayName || 'My GPS Location'
        });
      } else if (res && !res.success && res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.warn('[LeafletRiskMap] Locate Me failed:', err);
      alert('Unable to determine your GPS location. Please check browser permissions and try again.');
    } finally {
      setGeoLocating(false);
    }
  };

  // Real weather + model inspection for one point; shared by search and map clicks.
  const inspectPoint = async (lat, lng, name) => {
    const reqId = ++latestInspectionRef.current;
    const fallbackName = name || formatCoordinateFallback(lat, lng);
    setActiveLocationPin({ lat, lng, type: 'manual', name: fallbackName });
    setContextManualLocation(lat, lng, name || undefined);
    if (onSelectZone) {
      onSelectZone({ latitude: lat, longitude: lng, center: { lat, lng }, name: fallbackName,
                     is_weather_loading: true, is_live_inspected: true });
    }

    const [weather, geo] = await Promise.all([
      getLiveWeather(lat, lng).catch(() => null),
      name ? Promise.resolve(null) : reverseGeocode(lat, lng).catch(() => null)
    ]);
    if (reqId !== latestInspectionRef.current) return;
    const backend = await api.inspectTelemetry(lat, lng).catch(() => null);
    if (reqId !== latestInspectionRef.current) return;
    // Place name: the search label, else the browser lookup, else the server's lookup, else coordinates
    const resolvedName = name || (!geo?.isFallback && geo?.displayName) || backend?.name || fallbackName;
    setActiveLocationPin((prev) => (prev ? { ...prev, name: resolvedName } : null));
    if (!onSelectZone) return;

    onSelectZone({
      ...(backend || {}),
      latitude: lat,
      longitude: lng,
      center: { lat, lng },
      name: resolvedName,
      state: geo?.state || backend?.state || '',
      district: geo?.city || backend?.district || '',
      temperature_c: weather?.temperature_c ?? backend?.temperature_c ?? null,
      humidity_pct: weather?.humidity_pct ?? backend?.humidity_pct ?? null,
      weather_code: weather?.weather_code ?? backend?.weather_code ?? null,
      condition: weather?.condition || backend?.condition || null,
      is_day: weather?.is_day ?? backend?.is_day ?? null,
      rainfall_24h: weather?.rainfall_24h ?? backend?.rainfall_24h ?? null,
      rainfall_1h: weather?.precipitation_mm ?? null,
      weather_source: weather?.source || backend?.weather_source || null,
      observation_time: weather?.observation_time || backend?.observation_time || null,
      is_weather_loading: false,
      is_live_inspected: true,
      risk_score: backend?.risk_score ?? null,
      risk_level: backend?.risk_level ?? null
    });
  };

  const handlePlaceSelect = (place) => {
    setActiveCenter([place.latitude, place.longitude]);
    setActiveZoom(12);
    inspectPoint(place.latitude, place.longitude, place.label);
  };

  const handleMapClick = (latlng) => {
    // Clicking the current pin again removes it
    if (activeLocationPin
        && Math.abs(latlng.lat - activeLocationPin.lat) < 0.005
        && Math.abs(latlng.lng - activeLocationPin.lng) < 0.005) {
      latestInspectionRef.current += 1;
      setActiveLocationPin(null);
      if (onSelectZone) onSelectZone(null);
      return;
    }
    inspectPoint(latlng.lat, latlng.lng, null);
  };

  return (
    <div className="relative isolate z-0 w-full h-full min-h-[480px] rounded-tile overflow-hidden bg-surface-2 flex flex-col" style={{ height: height || '100%' }}>
      
      {/* Top Search & Locate Bar - Fully Responsive with Glassmorphic Rounded-Full Radius */}
      <div 
        className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between gap-2 pointer-events-none"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {/* Left Search + Locate Group */}
        <div className="flex items-center gap-2 max-w-[calc(100%-80px)] sm:max-w-md w-full pointer-events-auto">
          <PlaceSearch
            onSelect={handlePlaceSelect}
            placeholder={t('search_place_placeholder') || 'Search a place'}
            className="flex-1 min-w-[120px]"
          />

          <button
            onClick={handleLocateMe}
            disabled={geoLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-surface-2 hover:bg-surface-2 text-label hover:border-risk-low/30 text-xs sm:text-xs font-medium rounded-full whitespace-nowrap transition-all flex-shrink-0 backdrop-blur-md active:scale-95"
            title="Detect GPS Location"
          >
            <Crosshair className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin text-risk-low' : 'text-label-2'}`} />
            <span className="hidden md:inline">{geoLocating ? (t('locating') || 'Locating...') : (t('locate_me') || 'Locate Me')}</span>
          </button>
        </div>

        {/* Top Right Basemap & Layers Trigger */}
        <div className="pointer-events-auto shrink-0">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-surface-2 text-label text-xs sm:text-xs font-medium rounded-full whitespace-nowrap transition-all backdrop-blur-md active:scale-95"
          >
            <Layers className="w-3.5 h-3.5 text-label-2" />
            <span className="hidden sm:inline">{t('gis_layers') || 'Layers'}</span>
          </button>
        </div>
      </div>

      {/* Layer Control Panel Flyout */}
      {showLayerPanel && (
        <div className="absolute top-14 right-3.5 z-[1001] bg-surface backdrop-blur-md p-4 rounded-card w-64 text-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <span className="text-xs font-semibold text-label flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-label-2" />
              {t('gis_overlays_basemap') || 'Map style and layers'}
            </span>
            <button onClick={() => setShowLayerPanel(false)} className="text-label-2 hover:text-label">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Basemap Selection */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-label-2 block">
              {t('basemap_provider') || 'Map style'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(BASEMAP_TILES).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => setActiveBasemap(key)}
                  className={`py-1 px-2 rounded-tile text-xs transition-colors text-left truncate ${
                    activeBasemap === key 
                      ? 'bg-surface-2 text-label-2 font-semibold' 
                      : 'bg-surface-2 text-label-2 hover:text-label'
                  }`}
                >
                  {item.label || item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Operational Overlays */}
          <div className="space-y-1 pt-2 border-t border-line">
            <span className="text-xs font-semibold text-label-2 block">
              {t('operational_layers') || 'Layers'}
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <label className="flex items-center gap-1.5 text-label-2 hover:text-label cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.zones}
                  onChange={(e) => setLayers({ ...layers, zones: e.target.checked })}
                  className="rounded bg-surface border-line text-risk-critical focus:ring-0"
                />
                <span>{t('layer_risk_zones') || 'Risk Zones'} ({zones.length})</span>
              </label>

              {incidents.length > 0 && (
              <label className="flex items-center gap-1.5 text-label-2 hover:text-label cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.incidents}
                  onChange={(e) => setLayers({ ...layers, incidents: e.target.checked })}
                  className="rounded bg-surface border-line text-risk-moderate focus:ring-0"
                />
                <span>{t('layer_incidents') || 'Incidents'} ({incidents.length})</span>
              </label>
              )}

              {sosRequests.length > 0 && (
              <label className="flex items-center gap-1.5 text-label-2 hover:text-label cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.sos}
                  onChange={(e) => setLayers({ ...layers, sos: e.target.checked })}
                  className="rounded bg-surface border-line text-risk-critical focus:ring-0"
                />
                <span>{t('layer_sos_alerts') || 'SOS Alerts'} ({sosRequests.length})</span>
              </label>
              )}

              {reports.length > 0 && (
              <label className="flex items-center gap-1.5 text-label-2 hover:text-label cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.reports}
                  onChange={(e) => setLayers({ ...layers, reports: e.target.checked })}
                  className="rounded bg-surface border-line text-risk-low focus:ring-0"
                />
                <span>{t('layer_reports') || 'Reports'} ({reports.length})</span>
              </label>
              )}

              {hospitals.length > 0 && (
              <label className="flex items-center gap-1.5 text-label-2 hover:text-label cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.hospitals}
                  onChange={(e) => setLayers({ ...layers, hospitals: e.target.checked })}
                  className="rounded bg-surface border-line text-label-2 focus:ring-0"
                />
                <span>{t('layer_hospitals') || 'Hospitals'} ({hospitals.length})</span>
              </label>
              )}

              {shelters.length > 0 && (
              <label className="flex items-center gap-1.5 text-label-2 hover:text-label cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.shelters}
                  onChange={(e) => setLayers({ ...layers, shelters: e.target.checked })}
                  className="rounded bg-surface border-line text-risk-low focus:ring-0"
                />
                <span>{t('layer_shelters') || 'Shelters'} ({shelters.length})</span>
              </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Leaflet Map Engine - zoomControl disabled in top-left to avoid overlap */}
      <MapContainer
        center={defaultCenter}
        zoom={6}
        maxZoom={19}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={true}
        className="w-full h-full"
      >
        {/* Dedicated Non-Overlapping Zoom Control placed cleanly at bottom-right */}
        <ZoomControl position="bottomright" />
        <WorldBounds />

        <MapEventHandler 
          onMapClick={handleMapClick} 
          centerTarget={activeCenter} 
          zoomTarget={activeZoom} 
          routeData={routeData}
        />

        {/* Selected Basemap Tile Provider with noWrap to prevent horizontal world repetition */}
        {(() => {
          const tile = BASEMAP_TILES[activeBasemap] || (resolvedTheme === 'light' ? BASEMAP_TILES.voyager : BASEMAP_TILES.dark) || BASEMAP_TILES.osm;
          return (
            <TileLayer
              key={activeBasemap}
              attribution={tile.attribution}
              url={tile.url}
              maxNativeZoom={tile.maxNativeZoom || 17}
              maxZoom={tile.maxZoom || 19}
              noWrap={true}
              bounds={WORLD_BOUNDS}
            />
          );
        })()}

        {/* Single Active Location Pin (GPS or Manual Clicked Point) */}
        {activeLocationPin && (
          <>
            {activeLocationPin.accuracy && (
              <Circle
                center={[activeLocationPin.lat, activeLocationPin.lng]}
                radius={Math.min(300, activeLocationPin.accuracy * 2)}
                pathOptions={{ color: '#6BBF8A', fillColor: '#6BBF8A', fillOpacity: 0.15, weight: 1.5 }}
              />
            )}
            <Marker 
              position={[activeLocationPin.lat, activeLocationPin.lng]}
              eventHandlers={{
                click: () => {
                  // Clicking on the active pin directly removes it (same as Google Maps!)
                  setActiveLocationPin(null);
                  if (onSelectZone) onSelectZone(null);
                }
              }}
            >
              <Popup autoPan={false}>
                <div className="p-2.5 text-xs space-y-1.5 min-w-[170px]">
                  <div className="flex items-center justify-between border-b border-line pb-1">
                    <span className="font-semibold text-risk-low">
                      {activeLocationPin.type === 'gps' ? ' GPS Location' : ' Selected Location'}
                    </span>
                  </div>
                  <div className="text-label-2 tabular-nums text-xs">
                    {activeLocationPin.lat.toFixed(4)}°N, {activeLocationPin.lng.toFixed(4)}°E
                  </div>
                  <div className="text-xs text-risk-low font-semibold">
                     Risk Telemetry Inspected
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLocationPin(null);
                      if (onSelectZone) onSelectZone(null);
                    }}
                    className="w-full mt-1.5 px-2 py-1 bg-surface-2 hover:bg-surface-2 text-label rounded-full text-xs font-semibold transition-colors"
                  >
                    Remove Pin
                  </button>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* 1. Risk Zone Polygons & Visible Corridor Beacons Layer */}
        {layers.zones && zones.map((zone) => {
          const isSelected = selectedZone?.zone_id === zone.zone_id;
          const riskColor = getRiskScoreColor(zone.risk_score);
          const hasCoords = zone.coordinates && Array.isArray(zone.coordinates) && zone.coordinates.length > 0;
          const polygonPositions = hasCoords ? zone.coordinates.map(c => [c.lat, c.lng]) : null;
          const centerPos = zone.center && typeof zone.center.lat === 'number' && typeof zone.center.lng === 'number' 
            ? [zone.center.lat, zone.center.lng] 
            : (hasCoords ? [zone.coordinates[0].lat, zone.coordinates[0].lng] : null);

          return (
            <React.Fragment key={zone.zone_id}>
              {polygonPositions && (
                <Polygon
                  positions={polygonPositions}
                  pathOptions={{
                    color: isSelected ? '#ffffff' : riskColor.hex,
                    weight: isSelected ? 3 : 1.5,
                    fillColor: riskColor.hex,
                    fillOpacity: isSelected ? 0.4 : 0.25,
                    dashArray: isSelected ? '4, 4' : null
                  }}
                  eventHandlers={{
                    click: () => {
                      if (onSelectZone) onSelectZone(zone);
                    }
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    <div className="text-xs p-1">
                      <div className="font-semibold text-label">{zone.zone_id}: {zone.name}</div>
                      <div className="text-xs text-label-2 mt-0.5">
                        Risk: <span className="tabular-nums font-semibold" style={{ color: riskColor.hex }}>{zone.risk_score}/100 ({zone.risk_level})</span>
                      </div>
                    </div>
                  </Tooltip>
                </Polygon>
              )}

              {centerPos && (
                <CircleMarker
                  center={centerPos}
                  radius={isSelected ? 10 : 7}
                  pathOptions={{
                    color: isSelected ? '#ffffff' : riskColor.hex,
                    fillColor: riskColor.hex,
                    fillOpacity: 0.85,
                    weight: isSelected ? 3 : 1.5
                  }}
                  eventHandlers={{
                    click: () => {
                      if (onSelectZone) onSelectZone(zone);
                    }
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                    <div className="text-xs p-1">
                      <div className="font-semibold text-label">{zone.name}</div>
                      <div className="text-xs text-label-2 tabular-nums">
                        {zone.state} • risk <span style={{ color: riskColor.hex }} className="font-semibold">{Math.round(zone.risk_score)}/100</span>
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              )}
            </React.Fragment>
          );
        })}

        {/* 2. Incidents Layer */}
        {layers.incidents && incidents.map((inc) => (
          <Marker
            key={inc.incident_id}
            position={[inc.latitude, inc.longitude]}
            icon={createIncidentIcon(inc.severity)}
          >
            <Popup>
              <div className="p-2 space-y-1 min-w-[200px]">
                <div className="flex items-center justify-between border-b border-line pb-1">
                  <span className="tabular-nums text-xs text-risk-moderate font-semibold">{inc.incident_id}</span>
                  <span className="text-xs px-1 py-0.5 rounded-full font-semibold bg-surface-2 text-label-2">
                    {toLabel(inc.status)}
                  </span>
                </div>
                <h4 className="font-semibold text-xs text-label">{inc.title}</h4>
                <p className="text-xs text-label-2">{inc.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 3. Emergency SOS Beacons */}
        {layers.sos && sosRequests.map((sos) => (
          <Marker
            key={sos.sos_id}
            position={[sos.latitude, sos.longitude]}
            icon={createSOSIcon()}
          >
            <Popup>
              <div className="p-2 space-y-1 min-w-[220px]">
                <div className="flex items-center justify-between border-b border-risk-critical/30 pb-1">
                  <span className="font-semibold text-risk-critical tabular-nums text-xs">SOS {sos.sos_id}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-risk-critical text-white tabular-nums">
                    {sos.triage_priority}
                  </span>
                </div>
                <div className="text-xs font-semibold text-label">{sos.user_name} ({sos.people_count} people)</div>
                <p className="text-xs text-label-2 italic">"{sos.message || 'Distress assistance requested'}"</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Community Ground Reports */}
        {layers.reports && reports.map((rep) => (
          <Marker
            key={rep.id}
            position={[rep.latitude, rep.longitude]}
            icon={createReportIcon(rep.status)}
          >
            <Popup>
              <div className="p-2 space-y-1 min-w-[180px]">
                <div className="flex justify-between text-xs border-b border-line pb-1">
                  <span className="tabular-nums text-label-2">{rep.id}</span>
                  <span className="font-semibold text-risk-moderate">{toLabel(rep.status)}</span>
                </div>
                <h4 className="font-semibold text-xs text-label">{toLabel(rep.report_type)}</h4>
                <p className="text-xs text-label-2 italic">"{rep.description}"</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 5. Hospitals */}
        {layers.hospitals && hospitals.map((hosp) => (
          <Marker
            key={hosp.hospital_id}
            position={[hosp.latitude, hosp.longitude]}
            icon={createHospitalIcon()}
          >
            <Popup>
              <div className="p-2 space-y-1 min-w-[200px]">
                <div className="font-semibold text-xs text-label-2 flex items-center gap-1">
                  <Ambulance className="w-3 h-3" />
                  {hosp.name}
                </div>
                <div className="text-xs text-label-2">Available Beds: <strong className="text-risk-low">{hosp.available_beds}</strong></div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 6. Shelters */}
        {layers.shelters && shelters.map((shelt) => (
          <Marker
            key={shelt.shelter_id}
            position={[shelt.latitude, shelt.longitude]}
            icon={createShelterIcon()}
          >
            <Popup>
              <div className="p-2 space-y-1 min-w-[200px]">
                <div className="font-semibold text-xs text-risk-low flex items-center gap-1">
                  <Home className="w-3 h-3" />
                  {shelt.name}
                </div>
                <div className="text-xs text-label-2">Capacity: {shelt.current_occupancy} / {shelt.capacity}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 7. Safe Route Engine Polyline Overlays & Waypoint Pins */}
        {layers.routes && routeData && (
          <>
            {/* Fastest Route (Red Dashed) */}
            {routeData.fastest_route && (
              <Polyline
                positions={routeData.fastest_route.coordinates.map(c => [c.lat, c.lng])}
                pathOptions={{ color: '#E06C66', weight: 3, dashArray: '6, 6', opacity: 0.75 }}
              />
            )}

            {/* Recommended Safe Route (Solid Vibrant Emerald) */}
            {routeData.safe_route && (
              <Polyline
                positions={routeData.safe_route.coordinates.map(c => [c.lat, c.lng])}
                pathOptions={{ color: '#6BBF8A', weight: 6, opacity: 0.95 }}
              />
            )}

            {/* Route Origin Marker */}
            {routeData.safe_route?.coordinates?.length > 0 && (() => {
              const startPt = routeData.safe_route.coordinates[0];
              const startName = routeData.start?.name || startPt.name || 'Origin';
              const startHtml = `
                <div style="display:flex; align-items:center; gap:4px; background:#1C1C1E; border:1.5px solid #4A86E8; border-radius:999px; padding:3px 10px; box-shadow:0 2px 8px rgba(0,0,0,0.4); white-space:nowrap;">
                  <span style="width:8px; height:8px; border-radius:50%; background:#4A86E8;"></span>
                  <span style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,sans-serif; font-weight:600; font-size:11px; color:#ffffff;">A: ${startName}</span>
                </div>
              `;
              const startIcon = L.divIcon({ className: 'route-start-pin', html: startHtml, iconSize: [140, 26], iconAnchor: [70, 13] });
              return (
                <Marker position={[startPt.lat, startPt.lng]} icon={startIcon}>
                  <Popup>
                    <div className="p-2 text-xs tabular-nums">
                      <strong className="text-label-2">ORIGIN: {startName}</strong>
                      <div className="text-label-2 text-xs mt-0.5">{startPt.lat.toFixed(4)}°N, {startPt.lng.toFixed(4)}°E</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })()}

            {/* Route Destination Marker */}
            {routeData.safe_route?.coordinates?.length > 1 && (() => {
              const endPt = routeData.safe_route.coordinates[routeData.safe_route.coordinates.length - 1];
              const destName = routeData.destination?.name || endPt.name || 'Destination';
              const endHtml = `
                <div style="display:flex; align-items:center; gap:4px; background:#1C1C1E; border:1.5px solid #6BBF8A; border-radius:999px; padding:3px 10px; box-shadow:0 2px 8px rgba(0,0,0,0.4); white-space:nowrap;">
                  <span style="width:8px; height:8px; border-radius:50%; background:#6BBF8A;"></span>
                  <span style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,sans-serif; font-weight:600; font-size:11px; color:#ffffff;">B: ${destName}</span>
                </div>
              `;
              const endIcon = L.divIcon({ className: 'route-end-pin', html: endHtml, iconSize: [140, 26], iconAnchor: [70, 13] });
              return (
                <Marker position={[endPt.lat, endPt.lng]} icon={endIcon}>
                  <Popup>
                    <div className="p-2 text-xs tabular-nums">
                      <strong className="text-risk-low">DESTINATION: {destName}</strong>
                      <div className="text-label-2 text-xs mt-0.5">{endPt.lat.toFixed(4)}°N, {endPt.lng.toFixed(4)}°E</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })()}
          </>
        )}
      </MapContainer>

      {/* Unified Compact Hazard Legend Bottom-Left - Fully Responsive */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-surface-2 backdrop-blur-md px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center gap-2.5 sm:gap-3.5 text-xs max-w-[calc(100%-75px)] overflow-x-auto whitespace-nowrap scrollbar-none">
          <span className="text-label-2 font-semibold text-xs sm:text-xs hidden lg:inline">
            {t('risk_threshold') || 'Risk Level'}:
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-risk-low shrink-0" />
            <span className="text-label text-xs sm:text-xs font-medium">Low <span className="text-label-3 tabular-nums text-xs sm:text-xs hidden sm:inline">(0–30)</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-risk-moderate shrink-0" />
            <span className="text-label text-xs sm:text-xs font-medium">Moderate <span className="text-label-3 tabular-nums text-xs sm:text-xs hidden sm:inline">(31–60)</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-risk-high shrink-0" />
            <span className="text-label text-xs sm:text-xs font-medium">High <span className="text-label-3 tabular-nums text-xs sm:text-xs hidden sm:inline">(61–80)</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-risk-critical shrink-0" />
            <span className="text-label text-xs sm:text-xs font-medium">Critical <span className="text-label-3 tabular-nums text-xs sm:text-xs hidden sm:inline">(81–100)</span></span>
          </div>
        </div>
      )}
    </div>
  );
};
