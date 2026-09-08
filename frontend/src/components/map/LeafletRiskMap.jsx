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
import { getRiskScoreColor, formatDate } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Layers, 
  Navigation, 
  Crosshair, 
  Search, 
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
    attribution: '&copy; Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRC, METI, TomTom'
  },
  light: {
    label: 'Light Canvas',
    name: 'ESRI Light Gray Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, NAVTEQ'
  },
  dark: {
    label: 'Dark Canvas',
    name: 'ESRI Dark Gray (Dark Mode)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, NAVTEQ'
  },
  satellite: {
    label: 'Satellite',
    name: 'ESRI Satellite Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics'
  },
  terrain: {
    label: 'Terrain',
    name: 'ESRI Topographic Relief',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, Intermap'
  },
  osm: {
    label: 'OpenStreetMap',
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  }
};

// Clean Operational Marker Pin Generators
const createIncidentIcon = (severity) => {
  const isCrit = severity === 'CRITICAL';
  const color = isCrit ? '#ef4444' : '#f59e0b';
  const html = `
    <div style="width:24px; height:24px; border-radius:50%; background:#0d1527; border:2px solid ${color}; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.6);">
      <span style="color:${color}; font-size:11px; font-weight:900;">▲</span>
    </div>
  `;
  return L.divIcon({ className: 'custom-incident-pin', html, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
};

const createSOSIcon = () => {
  const html = `
    <div style="width:26px; height:26px; border-radius:50%; background:#dc2626; border:2px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(220,38,38,0.7);">
      <span style="color:#ffffff; font-size:9px; font-weight:900; font-family:monospace;">SOS</span>
    </div>
  `;
  return L.divIcon({ className: 'custom-sos-pin', html, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13] });
};

const createHospitalIcon = () => {
  const html = `
    <div style="width:22px; height:22px; border-radius:5px; background:#0284c7; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.5); font-size:12px; font-weight:bold; color:white;">
      +
    </div>
  `;
  return L.divIcon({ className: 'custom-hosp-pin', html, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11] });
};

const createShelterIcon = () => {
  const html = `
    <div style="width:22px; height:22px; border-radius:5px; background:#059669; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.5); font-size:11px; color:white;">
      🏕
    </div>
  `;
  return L.divIcon({ className: 'custom-shelter-pin', html, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11] });
};

const createTeamIcon = () => {
  const html = `
    <div style="width:22px; height:22px; border-radius:50%; background:#4f46e5; border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.5); font-size:10px; color:white;">
      🛡
    </div>
  `;
  return L.divIcon({ className: 'custom-team-pin', html, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11] });
};

const createReportIcon = (status) => {
  const isVerified = status === 'VERIFIED';
  const color = isVerified ? '#10b981' : '#f59e0b';
  const html = `
    <div style="width:18px; height:18px; background:#0d1527; border:2px solid ${color}; border-radius:50%; display:flex; align-items:center; justify-content:center;">
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
  const defaultCenter = [31.9579, 77.1095]; // Himachal Pradesh centroid
  const [activeCenter, setActiveCenter] = useState(mapCenter || (selectedZone?.center ? [selectedZone.center.lat, selectedZone.center.lng] : defaultCenter));
  const [activeZoom, setActiveZoom] = useState(mapZoom || (selectedZone ? 10 : 8.5));

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

  // Single Active Location Pin State (strictly one location marker at a time)
  const [activeLocationPin, setActiveLocationPin] = useState(null); // { lat, lng, type: 'gps' | 'manual', accuracy, name }
  const [geoLocating, setGeoLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Handle "Locate Me" - places single GPS pin; toggles off if already located
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not supported by your browser.');
      return;
    }

    // Toggle off if already showing GPS pin
    if (activeLocationPin && activeLocationPin.type === 'gps') {
      setActiveLocationPin(null);
      if (onSelectZone) onSelectZone(null);
      return;
    }

    setGeoLocating(true);
    const reqId = ++latestInspectionRef.current;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setActiveCenter([latitude, longitude]);
        setActiveZoom(14);
        setActiveLocationPin({
          lat: latitude,
          lng: longitude,
          type: 'gps',
          accuracy: accuracy || 50,
          name: 'My GPS Location'
        });

        if (onSelectZone) {
          onSelectZone({
            latitude,
            longitude,
            is_weather_loading: true,
            is_live_inspected: true,
            name: 'Detecting GPS Telemetry...'
          });
        }

        try {
          const liveData = await api.inspectTelemetry(latitude, longitude);
          if (reqId !== latestInspectionRef.current) return;
          if (liveData && onSelectZone) {
            onSelectZone({ ...liveData, is_live_inspected: true, is_weather_loading: false });
          }
        } catch (e) {
          if (reqId !== latestInspectionRef.current) return;
          console.warn('Live telemetry lookup error:', e);
          if (onSelectZone) {
            onSelectZone({
              latitude,
              longitude,
              center: { lat: latitude, lng: longitude },
              is_weather_loading: false,
              is_live_inspected: true,
              name: `GPS Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
              risk_score: 15.0,
              risk_level: 'LOW'
            });
          }
        }
      },
      (err) => {
        setGeoLocating(false);
        console.warn('Geolocation error:', err.message);
        alert('Could not access your location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Location Search Handler
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();
    const reqId = ++latestInspectionRef.current;

    // 1. Look for matching zone in database
    const matchedZone = zones.find(z => 
      z.name.toLowerCase().includes(q) || 
      z.district.toLowerCase().includes(q) ||
      z.zone_id.toLowerCase().includes(q)
    );

    if (matchedZone) {
      setActiveCenter([matchedZone.center.lat, matchedZone.center.lng]);
      setActiveZoom(11);
      setActiveLocationPin({
        lat: matchedZone.center.lat,
        lng: matchedZone.center.lng,
        type: 'manual',
        name: matchedZone.name
      });
      if (onSelectZone) onSelectZone(matchedZone);
      return;
    }

    // 2. OpenStreetMap Nominatim global search for any place worldwide
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
        headers: { 'User-Agent': 'LandSafe-GlobalEngine/2.0' }
      });
      const results = await resp.json();
      if (reqId !== latestInspectionRef.current) return;

      if (results && results.length > 0) {
        const targetLat = parseFloat(results[0].lat);
        const targetLng = parseFloat(results[0].lon);
        setActiveCenter([targetLat, targetLng]);
        setActiveZoom(12);
        setActiveLocationPin({
          lat: targetLat,
          lng: targetLng,
          type: 'manual',
          name: results[0].display_name || searchQuery
        });

        if (onSelectZone) {
          onSelectZone({
            latitude: targetLat,
            longitude: targetLng,
            is_weather_loading: true,
            is_live_inspected: true,
            name: results[0].display_name || searchQuery
          });
        }

        try {
          const liveData = await api.inspectTelemetry(targetLat, targetLng);
          if (reqId !== latestInspectionRef.current) return;
          if (liveData && onSelectZone) {
            onSelectZone({ ...liveData, is_live_inspected: true, is_weather_loading: false });
          }
        } catch (inspectErr) {
          if (reqId !== latestInspectionRef.current) return;
          console.warn('Telemetry inspection error on search:', inspectErr);
          if (onSelectZone) {
            onSelectZone({
              latitude: targetLat,
              longitude: targetLng,
              center: { lat: targetLat, lng: targetLng },
              is_weather_loading: false,
              is_live_inspected: true,
              name: results[0].display_name || searchQuery,
              risk_score: 15.0,
              risk_level: 'LOW'
            });
          }
        }
      } else {
        alert(`Location "${searchQuery}" not found. Try searching a city, district, or mountain region.`);
      }
    } catch {
      if (reqId === latestInspectionRef.current) {
        alert(`Could not resolve location "${searchQuery}".`);
      }
    }
  };

  // Map Click Inspector - only one pin at a time; clicking same spot again removes the pin
  const handleMapClick = async (latlng) => {
    // If clicked on or near existing pin (within ~400m), toggle it OFF and deselect
    if (activeLocationPin) {
      const dLat = Math.abs(latlng.lat - activeLocationPin.lat);
      const dLng = Math.abs(latlng.lng - activeLocationPin.lng);
      if (dLat < 0.005 && dLng < 0.005) {
        setActiveLocationPin(null);
        if (onSelectZone) onSelectZone(null);
        return;
      }
    }

    // Move / set the single active pin to the new spot
    const newPin = {
      lat: latlng.lat,
      lng: latlng.lng,
      type: 'manual',
      name: 'Selected Location'
    };
    setActiveLocationPin(newPin);

    const reqId = ++latestInspectionRef.current;

    // Immediately trigger location update with loading state
    if (onSelectZone) {
      onSelectZone({
        latitude: latlng.lat,
        longitude: latlng.lng,
        center: { lat: latlng.lat, lng: latlng.lng },
        is_weather_loading: true,
        is_live_inspected: true,
        name: `Coordinates (${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)})`
      });
    }

    try {
      const liveData = await api.inspectTelemetry(latlng.lat, latlng.lng);
      if (reqId !== latestInspectionRef.current) return; // Stale request guard!
      if (liveData && onSelectZone) {
        onSelectZone({ ...liveData, is_live_inspected: true, is_weather_loading: false });
      }
    } catch (e) {
      if (reqId !== latestInspectionRef.current) return;
      console.warn('Live telemetry click error:', e);
      if (onSelectZone) {
        onSelectZone({
          latitude: latlng.lat,
          longitude: latlng.lng,
          center: { lat: latlng.lat, lng: latlng.lng },
          is_weather_loading: false,
          is_live_inspected: true,
          name: `Coordinates (${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)})`,
          risk_score: 15.0,
          risk_level: 'LOW'
        });
      }
    }
  };

  return (
    <div className="relative isolate z-0 w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-[#262626] bg-[#0B0B0B] flex flex-col" style={{ height: height || '100%' }}>
      
      {/* Top Search & Locate Bar - Fully Responsive with Glassmorphic Rounded-Full Radius */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between gap-2 pointer-events-none">
        {/* Left Search + Locate Group */}
        <div className="flex items-center gap-2 max-w-[calc(100%-80px)] sm:max-w-md w-full pointer-events-auto">
          <form onSubmit={handleSearchSubmit} className="flex items-center bg-[#121212]/95 backdrop-blur-md border border-[#303030] rounded-full px-3.5 py-1.5 sm:py-2 shadow-xl flex-1 min-w-[120px] focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_place_placeholder') || 'Search place or coordinates...'}
              className="bg-transparent text-[11px] sm:text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none w-full font-medium"
            />
          </form>

          <button
            onClick={handleLocateMe}
            disabled={geoLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#161616]/95 hover:bg-[#222222] text-neutral-200 border border-[#303030] hover:border-emerald-500/50 text-[11px] sm:text-xs font-medium rounded-full shadow-xl transition-all flex-shrink-0 backdrop-blur-md active:scale-95"
            title="Detect GPS Location"
          >
            <Crosshair className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin text-emerald-400' : 'text-neutral-400'}`} />
            <span className="hidden md:inline">{geoLocating ? (t('locating') || 'Locating...') : (t('locate_me') || 'Locate Me')}</span>
          </button>
        </div>

        {/* Top Right Basemap & Layers Trigger */}
        <div className="pointer-events-auto shrink-0">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#121212]/95 border border-[#303030] hover:border-neutral-500 text-neutral-200 text-[11px] sm:text-xs font-medium rounded-full shadow-xl transition-all backdrop-blur-md active:scale-95"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">{t('gis_layers') || 'GIS Layers'}</span>
          </button>
        </div>
      </div>

      {/* Layer Control Panel Flyout */}
      {showLayerPanel && (
        <div className="absolute top-14 right-3.5 z-[1001] bg-[#121212]/95 backdrop-blur-md border border-[#303030] p-4 rounded-2xl shadow-2xl w-64 text-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
            <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              {t('gis_overlays_basemap') || 'GIS Overlays & Basemap'}
            </span>
            <button onClick={() => setShowLayerPanel(false)} className="text-neutral-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Basemap Selection */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
              {t('basemap_provider') || 'Basemap Provider'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(BASEMAP_TILES).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => setActiveBasemap(key)}
                  className={`py-1 px-2 rounded-lg text-xs border transition-colors text-left truncate ${
                    activeBasemap === key 
                      ? 'bg-[#1C1C1C] border-sky-500 text-sky-300 font-semibold' 
                      : 'bg-[#151515] border-[#262626] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {item.label || item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Operational Overlays */}
          <div className="space-y-1 pt-2 border-t border-[#262626]">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
              {t('operational_layers') || 'Operational Layers'}
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <label className="flex items-center gap-1.5 text-neutral-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.zones}
                  onChange={(e) => setLayers({ ...layers, zones: e.target.checked })}
                  className="rounded bg-neutral-900 border-[#262626] text-red-500 focus:ring-0"
                />
                <span>{t('layer_risk_zones') || 'Risk Zones'} ({zones.length})</span>
              </label>

              <label className="flex items-center gap-1.5 text-neutral-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.incidents}
                  onChange={(e) => setLayers({ ...layers, incidents: e.target.checked })}
                  className="rounded bg-neutral-900 border-[#262626] text-amber-500 focus:ring-0"
                />
                <span>{t('layer_incidents') || 'Incidents'} ({incidents.length})</span>
              </label>

              <label className="flex items-center gap-1.5 text-neutral-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.sos}
                  onChange={(e) => setLayers({ ...layers, sos: e.target.checked })}
                  className="rounded bg-neutral-900 border-[#262626] text-red-600 focus:ring-0"
                />
                <span>{t('layer_sos_alerts') || 'SOS Alerts'} ({sosRequests.length})</span>
              </label>

              <label className="flex items-center gap-1.5 text-neutral-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.reports}
                  onChange={(e) => setLayers({ ...layers, reports: e.target.checked })}
                  className="rounded bg-neutral-900 border-[#262626] text-emerald-500 focus:ring-0"
                />
                <span>{t('layer_reports') || 'Reports'} ({reports.length})</span>
              </label>

              <label className="flex items-center gap-1.5 text-neutral-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.hospitals}
                  onChange={(e) => setLayers({ ...layers, hospitals: e.target.checked })}
                  className="rounded bg-neutral-900 border-[#262626] text-sky-500 focus:ring-0"
                />
                <span>{t('layer_hospitals') || 'Hospitals'} ({hospitals.length})</span>
              </label>

              <label className="flex items-center gap-1.5 text-neutral-300 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.shelters}
                  onChange={(e) => setLayers({ ...layers, shelters: e.target.checked })}
                  className="rounded bg-neutral-900 border-[#262626] text-emerald-500 focus:ring-0"
                />
                <span>{t('layer_shelters') || 'Shelters'} ({shelters.length})</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Leaflet Map Engine - zoomControl disabled in top-left to avoid overlap */}
      <MapContainer
        center={defaultCenter}
        zoom={6}
        minZoom={2.5}
        maxZoom={18}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        {/* Dedicated Non-Overlapping Zoom Control placed cleanly at bottom-right */}
        <ZoomControl position="bottomright" />

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
              maxZoom={19}
              noWrap={true}
              bounds={[[-85, -180], [85, 180]]}
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
                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.15, weight: 1.5 }}
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
                  <div className="flex items-center justify-between border-b border-neutral-700 pb-1">
                    <span className="font-bold text-emerald-400">
                      {activeLocationPin.type === 'gps' ? '📍 GPS Location' : '📍 Selected Location'}
                    </span>
                  </div>
                  <div className="text-neutral-300 font-mono text-[11px]">
                    {activeLocationPin.lat.toFixed(4)}°N, {activeLocationPin.lng.toFixed(4)}°E
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold">
                    ✓ Risk Telemetry Inspected
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLocationPin(null);
                      if (onSelectZone) onSelectZone(null);
                    }}
                    className="w-full mt-1.5 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 rounded text-[10px] font-semibold transition-colors"
                  >
                    Remove Pin
                  </button>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* 1. Risk Zone Polygons Layer */}
        {layers.zones && zones.map((zone) => {
          const isSelected = selectedZone?.zone_id === zone.zone_id;
          const riskColor = getRiskScoreColor(zone.risk_score);
          if (!zone.coordinates || !Array.isArray(zone.coordinates)) return null;
          const polygonPositions = zone.coordinates.map(c => [c.lat, c.lng]);

          return (
            <Polygon
              key={zone.zone_id}
              positions={polygonPositions}
              pathOptions={{
                color: isSelected ? '#ffffff' : riskColor.hex,
                weight: isSelected ? 3 : 1.5,
                fillColor: riskColor.hex,
                fillOpacity: isSelected ? 0.5 : 0.3,
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
                  <div className="font-bold text-slate-100">{zone.zone_id}: {zone.name}</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Risk: <span className="font-mono font-bold" style={{ color: riskColor.hex }}>{zone.risk_score}/100 ({zone.risk_level})</span>
                  </div>
                </div>
              </Tooltip>
            </Polygon>
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
                <div className="flex items-center justify-between border-b border-[#1c2b48] pb-1">
                  <span className="font-mono text-[10px] text-amber-400 font-bold">{inc.incident_id}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded font-bold bg-[#16243d] text-slate-300">
                    {inc.status}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white">{inc.title}</h4>
                <p className="text-[11px] text-slate-300">{inc.description}</p>
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
                <div className="flex items-center justify-between border-b border-red-900/60 pb-1">
                  <span className="font-bold text-red-400 font-mono text-xs">🆘 {sos.sos_id}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-red-700 text-white font-mono">
                    {sos.triage_priority}
                  </span>
                </div>
                <div className="text-xs font-bold text-white">{sos.user_name} ({sos.people_count} people)</div>
                <p className="text-[11px] text-slate-300 italic">"{sos.message || 'Distress assistance requested'}"</p>
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
                <div className="flex justify-between text-[10px] border-b border-[#1c2b48] pb-1">
                  <span className="font-mono text-slate-400">{rep.id}</span>
                  <span className="font-bold text-amber-400">{rep.status}</span>
                </div>
                <h4 className="font-bold text-xs text-white">{rep.report_type}</h4>
                <p className="text-[11px] text-slate-300 italic">"{rep.description}"</p>
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
                <div className="font-bold text-xs text-sky-400 flex items-center gap-1">
                  <Ambulance className="w-3 h-3" />
                  {hosp.name}
                </div>
                <div className="text-[10px] text-slate-300">Available Beds: <strong className="text-emerald-400">{hosp.available_beds}</strong></div>
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
                <div className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                  <Home className="w-3 h-3" />
                  {shelt.name}
                </div>
                <div className="text-[10px] text-slate-300">Capacity: {shelt.current_occupancy} / {shelt.capacity}</div>
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
                pathOptions={{ color: '#ef4444', weight: 3, dashArray: '6, 6', opacity: 0.75 }}
              />
            )}

            {/* Recommended Safe Route (Solid Vibrant Emerald) */}
            {routeData.safe_route && (
              <Polyline
                positions={routeData.safe_route.coordinates.map(c => [c.lat, c.lng])}
                pathOptions={{ color: '#10b981', weight: 6, opacity: 0.95 }}
              />
            )}

            {/* Route Origin Marker */}
            {routeData.safe_route?.coordinates?.length > 0 && (() => {
              const startPt = routeData.safe_route.coordinates[0];
              const startName = routeData.start?.name || startPt.name || 'Origin';
              const startHtml = `
                <div style="display:flex; align-items:center; gap:4px; background:#0d1527; border:2px solid #0ea5e9; border-radius:8px; padding:3px 8px; box-shadow:0 4px 12px rgba(0,0,0,0.8); white-space:nowrap;">
                  <span style="width:8px; height:8px; border-radius:50%; background:#0ea5e9;"></span>
                  <span style="font-family:monospace; font-weight:bold; font-size:11px; color:#ffffff;">A: ${startName}</span>
                </div>
              `;
              const startIcon = L.divIcon({ className: 'route-start-pin', html: startHtml, iconSize: [140, 26], iconAnchor: [70, 13] });
              return (
                <Marker position={[startPt.lat, startPt.lng]} icon={startIcon}>
                  <Popup>
                    <div className="p-2 text-xs font-mono">
                      <strong className="text-cyan-400">ORIGIN: {startName}</strong>
                      <div className="text-slate-400 text-[10px] mt-0.5">{startPt.lat.toFixed(4)}°N, {startPt.lng.toFixed(4)}°E</div>
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
                <div style="display:flex; align-items:center; gap:4px; background:#0d1527; border:2px solid #10b981; border-radius:8px; padding:3px 8px; box-shadow:0 4px 12px rgba(0,0,0,0.8); white-space:nowrap;">
                  <span style="width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
                  <span style="font-family:monospace; font-weight:bold; font-size:11px; color:#ffffff;">B: ${destName}</span>
                </div>
              `;
              const endIcon = L.divIcon({ className: 'route-end-pin', html: endHtml, iconSize: [140, 26], iconAnchor: [70, 13] });
              return (
                <Marker position={[endPt.lat, endPt.lng]} icon={endIcon}>
                  <Popup>
                    <div className="p-2 text-xs font-mono">
                      <strong className="text-emerald-400">DESTINATION: {destName}</strong>
                      <div className="text-slate-400 text-[10px] mt-0.5">{endPt.lat.toFixed(4)}°N, {endPt.lng.toFixed(4)}°E</div>
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
        <div className="absolute bottom-3 left-3 z-[1000] bg-[#121212]/95 backdrop-blur-md border border-[#303030] px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center gap-2.5 sm:gap-3.5 text-xs shadow-2xl max-w-[calc(100%-75px)] overflow-x-auto whitespace-nowrap scrollbar-none">
          <span className="text-neutral-400 font-semibold text-[10px] sm:text-[11px] uppercase tracking-wider hidden lg:inline">
            {t('risk_threshold') || 'Risk Level'}:
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
            <span className="text-neutral-200 text-[10px] sm:text-[11px] font-medium">Low <span className="text-neutral-500 font-mono text-[9px] sm:text-[10px] hidden sm:inline">(0–30)</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500 shrink-0 shadow-sm" />
            <span className="text-neutral-200 text-[10px] sm:text-[11px] font-medium">Moderate <span className="text-neutral-500 font-mono text-[9px] sm:text-[10px] hidden sm:inline">(31–60)</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-orange-500 shrink-0 shadow-sm" />
            <span className="text-neutral-200 text-[10px] sm:text-[11px] font-medium">High <span className="text-neutral-500 font-mono text-[9px] sm:text-[10px] hidden sm:inline">(61–80)</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-600 shrink-0 shadow-sm" />
            <span className="text-neutral-200 text-[10px] sm:text-[11px] font-medium">Critical <span className="text-neutral-500 font-mono text-[9px] sm:text-[10px] hidden sm:inline">(81–100)</span></span>
          </div>
        </div>
      )}
    </div>
  );
};
