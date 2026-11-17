import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Circle, 
  Polyline,
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { apiClient, resourcesApi, safeRouteApi } from '../services/api';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';
import { getNearbyEmergencyResources, calculateHaversineDistanceKm } from '../services/emergencyResourceService';
import { reverseGeocode } from '../services/reverseGeocodeService';
import { 
  Shield, 
  Ambulance, 
  Home, 
  MapPin, 
  Navigation, 
  Phone, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle, 
  Compass, 
  Crosshair, 
  Building, 
  Flame, 
  Radio, 
  Star, 
  Clock, 
  Key, 
  X, 
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Map as MapIcon,
  List,
  Layers,
  Mountain,
  Globe,
  Route,
  CornerUpRight,
  Play,
  Square,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Fix Leaflet's default marker asset URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Category definitions with icons and colors
const CATEGORIES = [
  { id: 'hospitals', label: 'Hospitals & Trauma', icon: Ambulance, color: 'emerald' },
  { id: 'police', label: 'Police Stations', icon: Shield, color: 'sky' },
  { id: 'fire', label: 'Fire & Rescue', icon: Flame, color: 'rose' },
  { id: 'shelters', label: 'Evacuation Shelters', icon: Home, color: 'amber' },
  { id: 'all', label: 'All Emergency', icon: Radio, color: 'purple' },
];

const SEARCH_RADII = [5, 10, 25, 50];

// Legitimate, supported basemap tile providers with full attribution (Google-Maps-Style switcher)
const MAP_TYPES = [
  {
    id: 'streets',
    label: 'Roadmap',
    subtitle: 'Streets & Roads',
    icon: MapIcon,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRC, METI, TomTom',
    maxNativeZoom: 17,
    maxZoom: 19
  },
  {
    id: 'satellite',
    label: 'Satellite',
    subtitle: 'Aerial Imagery',
    icon: Globe,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 18,
    maxZoom: 19
  },
  {
    id: 'terrain',
    label: 'Terrain',
    subtitle: 'Topography',
    icon: Mountain,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, Intermap',
    maxNativeZoom: 17,
    maxZoom: 19
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    subtitle: 'Satellite + Labels',
    icon: Layers,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 18,
    maxZoom: 19
  },
  {
    id: 'dark',
    label: 'Dark',
    subtitle: 'Night Canvas',
    icon: Compass,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap',
    maxNativeZoom: 16,
    maxZoom: 19
  }
];

// Custom Leaflet DivIcons for distinct facility types
const createMarkerIcon = (category, isSelected = false) => {
  let bgColor = '#6BBF8A'; // emerald
  let borderColor = '#6BBF8A';
  let glyph = '🏥';

  if (category === 'police') {
    bgColor = '#0284c7'; // sky
    borderColor = '#4A86E8';
    glyph = '👮';
  } else if (category === 'fire') {
    bgColor = '#E06C66'; // rose
    borderColor = '#E06C66';
    glyph = '🚒';
  } else if (category === 'shelters') {
    bgColor = '#D4B24C'; // amber
    borderColor = '#D4B24C';
    glyph = '⛺';
  } else if (category === 'user') {
    bgColor = '#4A86E8'; // blue
    borderColor = '#8AB4F8';
    glyph = '📍';
  }

  const size = isSelected ? 40 : 32;
  const borderSize = isSelected ? '3px' : '2px';
  const shadow = isSelected ? '0 0 15px rgba(255,255,255,0.8)' : '0 4px 8px rgba(0,0,0,0.5)';

  return L.divIcon({
    className: 'custom-emergency-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${bgColor};
        border: ${borderSize} solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${shadow};
        font-size: ${size * 0.45}px;
        color: white;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        ${glyph}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Geodesic distance calculation for off-route tracking
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getMinDistanceToRouteKm(userLat, userLng, coords) {
  if (!coords || coords.length === 0) return 0;
  let minDist = Infinity;
  for (const pt of coords) {
    const d = haversineDistanceKm(userLat, userLng, pt.lat, pt.lng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// Map View & Route Bounds Controller Helper
function MapRouteController({ center, zoom, routeCoords }) {
  const map = useMap();
  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      const bounds = L.latLngBounds(routeCoords.map((pt) => [pt.lat, pt.lng]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16, animate: true });
    } else if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], zoom || map.getZoom(), { animate: true });
    }
  }, [routeCoords, center, zoom, map]);
  return null;
}

export const ResourcesPage = () => {
  const navigate = useNavigate();
  const {
    location: unifiedLocation,
    requestLocation: requestUnifiedGps,
    searchLocation: searchUnifiedLocation
  } = useLocationIntelligence();

  // Location & Geolocation state
  const [geoState, setGeoState] = useState('checking'); // 'checking' | 'granted' | 'prompt' | 'denied' | 'unsupported'
  const [locationMode, setLocationMode] = useState('gps'); // 'gps' | 'manual'
  const [userCoords, setUserCoords] = useState(null); // { lat, lng, accuracy, locality, area }
  const [locationError, setLocationError] = useState(null);

  // Discovery parameters
  const [activeCategory, setActiveCategory] = useState('hospitals');
  const [radiusKm, setRadiusKm] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [manualQuery, setManualQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Discovered data & loading state
  const [places, setPlaces] = useState([]);
  const [dataSourceInfo, setDataSourceInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  // Master cumulative discovery pool per geographic coordinates and category
  // Guarantees monotonic expansion: Results(5km) ⊆ Results(10km) ⊆ Results(25km) ⊆ Results(50km)
  const discoveredPoolRef = useRef(new Map());

  const recomputeCumulativePlaces = useCallback((lat, lng, radius, category, incomingPlaces = []) => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return [];
    const poolKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${category.toLowerCase().trim()}`;
    
    if (!discoveredPoolRef.current.has(poolKey)) {
      discoveredPoolRef.current.set(poolKey, new Map());
    }
    const pool = discoveredPoolRef.current.get(poolKey);

    // Merge incoming places into pool
    for (const p of incomingPlaces) {
      const pid = p.place_id || p.id;
      const coordKey = `${Number(p.latitude).toFixed(4)},${Number(p.longitude).toFixed(4)}_${(p.name || '').trim().toLowerCase()}`;
      const uniqueKey = pid || coordKey;

      const distKm = calculateHaversineDistanceKm(lat, lng, p.latitude, p.longitude);
      const enrichedPlace = {
        ...p,
        distance_km: distKm
      };

      if (!pool.has(uniqueKey)) {
        pool.set(uniqueKey, enrichedPlace);
      } else {
        const existing = pool.get(uniqueKey);
        pool.set(uniqueKey, {
          ...existing,
          ...enrichedPlace,
          phone: enrichedPlace.phone || existing.phone,
          opening_hours: enrichedPlace.opening_hours || existing.opening_hours
        });
      }
    }

    // Recalculate distance for all items in pool from current center
    const allPlaces = Array.from(pool.values());
    for (const p of allPlaces) {
      p.distance_km = calculateHaversineDistanceKm(lat, lng, p.latitude, p.longitude);
    }

    // Mathematical rule: resource.distance <= selectedRadius (with 5% tolerance for boundary)
    const withinRadius = allPlaces.filter((p) => p.distance_km <= radius * 1.05);
    withinRadius.sort((a, b) => a.distance_km - b.distance_km);

    return withinRadius;
  }, []);

  // Map & Layout state
  const [viewLayout, setViewLayout] = useState('split'); // 'split' | 'cards' | 'map'
  const [mapCenter, setMapCenter] = useState({ lat: 12.6445, lng: 77.4365 });
  const [mapZoom, setMapZoom] = useState(13);

  // Map Type / Basemap Switcher State (persisted per session)
  const [selectedMapType, setSelectedMapType] = useState(() => {
    return sessionStorage.getItem('landsafe_resource_map_type') || 'dark';
  });
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const layerMenuRef = useRef(null);

  const activeMapConfig = useMemo(() => {
    return MAP_TYPES.find((m) => m.id === selectedMapType) || MAP_TYPES[4];
  }, [selectedMapType]);

  const handleSelectMapType = (typeId) => {
    setSelectedMapType(typeId);
    sessionStorage.setItem('landsafe_resource_map_type', typeId);
    setShowLayerMenu(false);
  };

  // Close layer menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (layerMenuRef.current && !layerMenuRef.current.contains(event.target)) {
        setShowLayerMenu(false);
      }
    };
    if (showLayerMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLayerMenu]);

  // In-App Navigation & Road Routing State
  const [activeRoute, setActiveRoute] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [showRouteSteps, setShowRouteSteps] = useState(false);
  const watchIdRef = useRef(null);

  // In-App Directions Trigger (No Google Maps Redirect)
  const handleGetDirections = async (place) => {
    if (!place || place.latitude === undefined || place.longitude === undefined) {
      setRouteError('Destination coordinates are unavailable for this facility.');
      return;
    }

    if (!userCoords?.lat || !userCoords?.lng) {
      setRouteError('Your current GPS location is required to calculate in-app directions.');
      return;
    }

    setIsCalculatingRoute(true);
    setRouteError(null);
    setSelectedPlaceId(place.id);

    try {
      const originName = userCoords.area || 'Your Location';
      const res = await safeRouteApi.calculateGlobalRoute(
        userCoords.lat,
        userCoords.lng,
        place.latitude,
        place.longitude,
        originName,
        place.name
      );

      const routeData = res.safe_route || res.fastest_route;
      if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
        setActiveRoute({
          destination: place,
          distance_km: routeData.distance_km,
          travel_time_min: routeData.travel_time_min,
          coordinates: routeData.coordinates,
          segments: routeData.segments || [],
          safety_level: routeData.safety_level || 'LOW RISK',
          slope_deg: routeData.slope_deg || 0,
          explanation: res.comparison?.explanation || ''
        });
        if (viewLayout === 'cards') {
          setViewLayout('split');
        }
      } else {
        setRouteError('Could not calculate an authentic road route to this facility.');
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      setRouteError(err?.response?.data?.detail || 'Unable to calculate road route right now. Please try again.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Start live in-app GPS navigation mode
  const handleStartNavigation = () => {
    if (!navigator.geolocation) return;
    setIsNavigating(true);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserCoords((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy)
        }));

        if (activeRoute?.coordinates) {
          const offDist = getMinDistanceToRouteKm(latitude, longitude, activeRoute.coordinates);
          setIsOffRoute(offDist > 0.15);
        }
      },
      (err) => {
        console.warn('In-app navigation GPS error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  };

  // Stop live navigation
  const handleStopNavigation = () => {
    setIsNavigating(false);
    setIsOffRoute(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Clear route completely and restore standard map
  const handleClearRoute = () => {
    handleStopNavigation();
    setActiveRoute(null);
    setRouteError(null);
    setIsOffRoute(false);
  };

  // Recalculate route from current GPS position
  const handleRecalculateRoute = () => {
    if (activeRoute?.destination) {
      setIsOffRoute(false);
      handleGetDirections(activeRoute.destination);
    }
  };

  // Clean up GPS watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Google Places API Key override modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('landsafe_google_maps_key') || '');
  const [keySavedMsg, setKeySavedMsg] = useState(null);

  // Refs
  const cardRefs = useRef({});

  // 1. Synchronize with Centralized Location State
  useEffect(() => {
    if (unifiedLocation?.latitude && unifiedLocation?.longitude) {
      const coords = {
        lat: unifiedLocation.latitude,
        lng: unifiedLocation.longitude,
        accuracy: unifiedLocation.accuracy || 25,
        area: unifiedLocation.displayName,
        isDefault: !unifiedLocation.isGps && (unifiedLocation.source || '').includes('Fallback')
      };
      setUserCoords(coords);
      setMapCenter({ lat: unifiedLocation.latitude, lng: unifiedLocation.longitude });
      setGeoState(unifiedLocation.permissionStatus || (unifiedLocation.isGps ? 'granted' : 'prompt'));
      fetchNearby(unifiedLocation.latitude, unifiedLocation.longitude, radiusKm, activeCategory, searchKeyword);
    }
  }, [unifiedLocation?.latitude, unifiedLocation?.longitude, unifiedLocation?.displayName]);

  // 2. Request Fresh GPS Location from Centralized Provider
  const requestGpsLocation = () => {
    setLocationMode('gps');
    requestUnifiedGps();
  };

  // 3. Query Real Emergency Resources with Two-Tier Fallback and Cumulative Pooling
  const fetchNearby = async (lat, lng, radius, category, keyword = '', forceRefresh = false) => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;
    setLoading(true);
    setLocationError(null);

    // Instant local evaluation from cumulative pool so inner resources NEVER vanish or flash
    const immediatePlaces = recomputeCumulativePlaces(lat, lng, radius, category, []);
    if (immediatePlaces.length > 0) {
      setPlaces(immediatePlaces);
    }

    try {
      const data = await getNearbyEmergencyResources(lat, lng, radius, category, keyword, forceRefresh);
      const discoveredPlaces = data.places || [];
      const updatedCumulative = recomputeCumulativePlaces(lat, lng, radius, category, discoveredPlaces);
      setPlaces(updatedCumulative);
      setDataSourceInfo(data.data_source || null);
      setLastRefreshed(new Date());

      if (updatedCumulative.length > 0) {
        setSelectedPlaceId((prev) => (updatedCumulative.some((p) => p.id === prev) ? prev : updatedCumulative[0].id));
      }
    } catch (err) {
      console.error('Failed to discover nearby resources:', err);
      const fallbackPool = recomputeCumulativePlaces(lat, lng, radius, category, []);
      if (fallbackPool.length > 0) {
        setPlaces(fallbackPool);
      } else {
        setLocationError(err?.message || 'Unable to contact emergency discovery service. Please check network and retry.');
        setPlaces([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger search when active category or radius changes
  useEffect(() => {
    if (userCoords?.lat && userCoords?.lng) {
      // Synchronously evaluate cumulative pool so 5 -> 10km immediately keeps 5km facilities,
      // and 50 -> 10km immediately filters out > 10km facilities
      const instant = recomputeCumulativePlaces(userCoords.lat, userCoords.lng, radiusKm, activeCategory, []);
      if (instant.length > 0) {
        setPlaces(instant);
      }
      fetchNearby(userCoords.lat, userCoords.lng, radiusKm, activeCategory, searchKeyword);
    }
  }, [activeCategory, radiusKm]);

  // 4. Manual Location Search using Unified Geocoding
  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    if (!manualQuery.trim()) return;

    setIsSearchingLocation(true);
    setLocationError(null);
    try {
      const res = await searchUnifiedLocation(manualQuery);
      if (res && res.latitude && res.longitude) {
        setLocationMode('manual');
        const newCoords = {
          lat: res.latitude,
          lng: res.longitude,
          accuracy: 25,
          area: res.displayName || manualQuery,
          isManual: true
        };
        setUserCoords(newCoords);
        setMapCenter({ lat: res.latitude, lng: res.longitude });
        setMapZoom(13);
        fetchNearby(res.latitude, res.longitude, radiusKm, activeCategory, searchKeyword, true);
      } else {
        setLocationError(`Could not find "${manualQuery}". Please try another city, landmark, or PIN code.`);
      }
    } catch (err) {
      console.error('Manual search failed:', err);
      setLocationError(`Unable to geocode "${manualQuery}". Please enter a valid Indian city, area, or PIN code.`);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // 5. Select & Synchronize Place on Map and Card List
  const handleSelectPlace = (place) => {
    setSelectedPlaceId(place.id);
    if (place.latitude && place.longitude) {
      setMapCenter({ lat: place.latitude, lng: place.longitude });
    }
    // Scroll card into view
    const cardEl = cardRefs.current[place.id];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // 6. Save Custom Google Maps API Key
  const handleSaveApiKey = () => {
    if (customApiKey.trim()) {
      localStorage.setItem('landsafe_google_maps_key', customApiKey.trim());
      setKeySavedMsg('Google Maps API Key saved! Refreshing places with Google Places API...');
    } else {
      localStorage.removeItem('landsafe_google_maps_key');
      setKeySavedMsg('API Key removed. Using verified open geospatial infrastructure.');
    }
    setTimeout(() => {
      setShowKeyModal(false);
      setKeySavedMsg(null);
      if (userCoords?.lat && userCoords?.lng) {
        fetchNearby(userCoords.lat, userCoords.lng, radiusKm, activeCategory);
      }
    }, 1200);
  };

  // Format "Updated X ago"
  const getUpdatedAgo = () => {
    if (!lastRefreshed) return 'Ready';
    const seconds = Math.floor((new Date() - lastRefreshed) / 1000);
    if (seconds < 20) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  return (
    <div className="space-y-4 w-full select-none pb-12">
      
      {/* 1. Header & Location Bar */}
      <div className="bg-surface border border-line p-4 sm:p-5 rounded-card shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Description */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-tile bg-risk-low/[0.12] border border-risk-low/30 flex items-center justify-center text-risk-low shrink-0">
              <Ambulance className="w-5 h-5 text-risk-low" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-label tracking-tight">Real-Time Emergency Resources</h1>
                <span className="text-xs px-2 py-0.5 rounded-full tabular-nums bg-risk-low/[0.12] border border-risk-low/30 text-risk-low font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-risk-low "></span>
                  LOCATION AWARE
                </span>
                {dataSourceInfo && (
                  <span 
                    onClick={() => setShowKeyModal(true)}
                    className="text-xs px-2 py-0.5 rounded-full tabular-nums bg-surface border border-line text-label-2 hover:text-label hover:border-line cursor-pointer transition-colors flex items-center gap-1"
                    title="Click to view or configure Google Places API key"
                  >
                    <Key className="w-2.5 h-2.5 text-risk-moderate" />
                    <span>{dataSourceInfo.is_google_configured ? 'Google Places Active' : 'Open Infrastructure'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-label-2 mt-0.5">
                Authentic certified hospitals, trauma centers, and disaster response units discovered near your current GPS position.
              </p>
            </div>
          </div>

          {/* Quick Controls: Refresh + GPS Reset + Layout Switcher */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
            {locationMode === 'manual' ? (
              <button
                onClick={() => requestGpsLocation()}
                className="px-3 py-1.5 bg-surface-2 hover:bg-surface-2 border border-line text-label-2 text-xs rounded-tile font-medium flex items-center gap-1.5 transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Use My Current Location</span>
              </button>
            ) : (
              <button
                onClick={() => userCoords && fetchNearby(userCoords.lat, userCoords.lng, radiusKm, activeCategory, searchKeyword)}
                disabled={loading}
                className="px-3 py-1.5 bg-surface-2 hover:bg-surface-2 border border-line text-label hover:text-label text-xs rounded-tile font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-risk-low ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh ({getUpdatedAgo()})</span>
              </button>
            )}

            {/* Layout Toggle */}
            <div className="bg-surface border border-[#222] p-1 rounded-tile flex items-center gap-1 text-xs">
              <button
                onClick={() => setViewLayout('split')}
                className={`p-1.5 rounded-lg transition-colors ${viewLayout === 'split' ? 'bg-surface-2 text-label' : 'text-label-2 hover:text-label'}`}
                title="Split Map + List View"
              >
                <MapIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewLayout('cards')}
                className={`p-1.5 rounded-lg transition-colors ${viewLayout === 'cards' ? 'bg-surface-2 text-label' : 'text-label-2 hover:text-label'}`}
                title="Card List Only"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Location Status Bar */}
        <div className="mt-4 pt-3 border-t border-line flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium text-label-2">
              <MapPin className="w-3.5 h-3.5 text-risk-low shrink-0" />
              <span className="text-label-2">Search Center:</span>
              <strong className="text-label truncate max-w-[320px] sm:max-w-md">
                {userCoords?.area || (geoState === 'checking' ? 'Acquiring GPS location...' : 'Location not set')}
              </strong>
            </div>

            {userCoords?.accuracy && (
              <span className={`text-xs px-2 py-0.5 rounded-md tabular-nums ${
                userCoords.accuracy <= 50 
                  ? 'bg-risk-low/[0.12] border border-risk-low/30 text-risk-low' 
                  : userCoords.accuracy <= 500
                    ? 'bg-surface-2 border border-line text-label-2'
                    : 'bg-risk-moderate/[0.12] border border-risk-moderate/30 text-risk-moderate'
              }`}>
                Accuracy: ±{userCoords.accuracy} m
              </span>
            )}

            {locationMode === 'manual' && (
              <span className="text-xs px-2 py-0.5 rounded bg-risk-moderate/[0.12] border border-risk-moderate/30 text-risk-moderate tabular-nums">
                Manual Selection Mode
              </span>
            )}
          </div>

          {/* Manual Location Search Bar */}
          <form onSubmit={handleManualSearch} className="flex items-center gap-1.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-label-3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search city, area, PIN code..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface border border-line rounded-tile text-xs text-label placeholder-label-3 focus:outline-none focus:border-risk-low/30 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingLocation || !manualQuery.trim()}
              className="px-3 py-1.5 bg-risk-low/[0.12] hover:bg-risk-low/[0.12] border border-risk-low/30 text-risk-low font-medium rounded-tile text-xs flex items-center gap-1 transition-colors disabled:opacity-40 shrink-0"
            >
              <span>{isSearchingLocation ? 'Searching...' : 'Go'}</span>
            </button>
          </form>
        </div>

        {/* Accuracy Warning Banner (if GPS accuracy > 500m) */}
        {userCoords?.accuracy > 500 && (
          <div className="mt-3 p-2.5 bg-risk-moderate/[0.12] border border-risk-moderate/30 rounded-tile text-risk-moderate text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-risk-moderate shrink-0" />
            <span>
              Location accuracy is low (±{userCoords.accuracy} m). Move outdoors or near a window for more accurate emergency facility discovery.
            </span>
          </div>
        )}
      </div>

      {/* 2. Geolocation Permission States (Prompt / Denied Banner) */}
      {geoState === 'prompt' && !userCoords && (
        <div className="bg-surface-2 border border-line p-4 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-tile bg-surface-2 border border-line flex items-center justify-center text-label-2 shrink-0">
              <Navigation className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-label">Allow location access to find emergency resources near you</h3>
              <p className="text-xs text-label-2 mt-0.5">
                We use your exact coordinates to calculate drive distance and discover trauma centers in your area.
              </p>
            </div>
          </div>
          <button
            onClick={() => requestGpsLocation()}
            className="px-4 py-2 bg-accent hover:bg-accent text-label font-semibold rounded-tile text-xs flex items-center justify-center gap-1.5 transition-all self-start sm:self-center shrink-0"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Enable Location</span>
          </button>
        </div>
      )}

      {geoState === 'denied' && (
        <div className="bg-surface-2 border border-risk-critical/30 p-4 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-tile bg-risk-critical/[0.12] border border-risk-critical/30 flex items-center justify-center text-risk-critical shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-label">Location access is required to find emergency resources near you</h3>
              <p className="text-xs text-label-2 mt-0.5">
                Browser geolocation was declined. Use the search bar above to type any Indian city, landmark, or PIN code.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setManualQuery('Bengaluru, Karnataka');
              handleManualSearch();
            }}
            className="px-3 py-1.5 bg-surface-2 hover:bg-surface-2 border border-[#333] text-label text-xs font-medium rounded-tile transition-colors self-start sm:self-center shrink-0"
          >
            Try Example: Bengaluru
          </button>
        </div>
      )}

      {/* 3. Category & Radius Selector Bar */}
      <div className="bg-surface border border-line p-3 rounded-card flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-2 rounded-tile text-xs font-medium flex items-center gap-2 transition-all shrink-0 ${
                  isActive
                    ? 'bg-surface-2 text-label font-semibold shadow-sm '
                    : 'bg-surface text-label-2 hover:text-label hover:bg-surface-2 border border-line'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-label-2'}`} />
                <span>{cat.label}</span>
                {isActive && places.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-xs bg-surface-2 text-black tabular-nums">
                    {places.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Radius Selector Pills */}
        <div className="flex items-center gap-2 self-start md:self-center text-xs">
          <span className="text-label-2 font-medium hidden sm:inline">Search Radius:</span>
          <div className="bg-surface border border-line p-1 rounded-tile flex items-center gap-1">
            {SEARCH_RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`px-2.5 py-1 rounded-lg transition-colors tabular-nums font-medium ${
                  radiusKm === r
                    ? 'bg-surface-2 text-risk-low font-semibold border border-risk-low/30'
                    : 'text-label-2 hover:text-label'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Radius context note */}
      <div className="flex items-center justify-between text-xs px-1 text-label-2">
        <span className="flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-label-2" />
          Showing {activeCategory === 'all' ? 'all emergency resources' : (CATEGORIES.find(c => c.id === activeCategory)?.label || activeCategory)} within <strong className="text-label tabular-nums">{radiusKm} km</strong> of your location
          {places.length > 0 && ` (${places.length} verified facilities)`}
        </span>
        {dataSourceInfo?.provider && (
          <span className="text-xs text-label-3 tabular-nums hidden sm:inline">
            Source: {dataSourceInfo.provider}
          </span>
        )}
      </div>

      {/* 4. Main Content Area: Interactive Map + Facilities Grid */}
      <div className={`grid gap-4 ${viewLayout === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        
        {/* Map View (shown in 'split' or 'map' mode) */}
        {(viewLayout === 'split' || viewLayout === 'map') && (
          <div className={`${viewLayout === 'split' ? 'lg:col-span-6 xl:col-span-5' : 'w-full'} h-[380px] lg:h-[640px] sticky top-4 rounded-card overflow-hidden border border-line bg-surface flex flex-col`}>
            
            {/* Map Sub-Header & In-App Navigation Panel */}
            {activeRoute ? (
              <div className="bg-surface-2 px-3.5 py-3 border-b border-risk-low/30 z-10 space-y-2.5">
                {/* Header row: destination title + Exit button */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-risk-low/[0.12] border border-risk-low/30 flex items-center justify-center text-risk-low shrink-0">
                      <Route className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs tabular-nums px-1.5 py-0.2 rounded bg-risk-low/[0.12] border border-risk-low/30 text-risk-low font-semibold">
                          IN-APP ROAD ROUTE
                        </span>
                        <span className="text-xs font-semibold text-label truncate">
                          {activeRoute.destination.name}
                        </span>
                      </div>
                      <p className="text-xs text-label-2 truncate">
                        Origin: {userCoords?.area || 'Your Location'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleClearRoute}
                    className="px-2 py-1 bg-surface hover:bg-surface-2 border border-line text-label-2 hover:text-label rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                    title="Exit in-app navigation and clear route"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>

                {/* Metric summary bar: Distance, ETA, and Landslide/Slope hazard grade */}
                <div className="grid grid-cols-3 gap-2 bg-surface p-2 rounded-tile border border-risk-low/30 text-center">
                  <div>
                    <span className="text-xs text-label-2 block font-medium">Road Distance</span>
                    <strong className="text-xs tabular-nums font-semibold text-label">{activeRoute.distance_km} km</strong>
                  </div>
                  <div>
                    <span className="text-xs text-label-2 block font-medium">Est. Drive Time</span>
                    <strong className="text-xs tabular-nums font-semibold text-risk-low">~{activeRoute.travel_time_min} mins</strong>
                  </div>
                  <div>
                    <span className="text-xs text-label-2 block font-medium">Hazard Profile</span>
                    <strong className={`text-xs tabular-nums font-semibold ${
                      activeRoute.safety_level === 'HIGH RISK' 
                        ? 'text-risk-critical' 
                        : activeRoute.safety_level === 'MODERATE RISK' 
                          ? 'text-risk-moderate' 
                          : 'text-risk-low'
                    }`}>
                      {activeRoute.safety_level}
                    </strong>
                  </div>
                </div>

                {/* Off-Route Alert Banner */}
                {isOffRoute && (
                  <div className="p-2 bg-risk-moderate/[0.12] border border-risk-moderate/30 rounded-tile text-risk-moderate text-xs flex items-center justify-between gap-2 ">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-risk-moderate shrink-0" />
                      <span>You appear to be off route (&gt;150m from road).</span>
                    </div>
                    <button
                      onClick={handleRecalculateRoute}
                      className="px-2 py-0.5 bg-risk-moderate hover:bg-risk-moderate text-black font-semibold rounded text-xs shrink-0"
                    >
                      Recalculate
                    </button>
                  </div>
                )}

                {/* Navigation Action Buttons & Step Toggle */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                  {isNavigating ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleStopNavigation}
                        className="px-3 py-1.5 bg-risk-critical hover:bg-risk-critical text-label rounded-tile text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Square className="w-3 h-3 fill-white" />
                        <span>Stop Navigation</span>
                      </button>
                      <span className="text-xs text-risk-low tabular-nums flex items-center gap-1 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-risk-low "></span>
                        Live GPS Tracking
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartNavigation}
                      className="px-3.5 py-1.5 bg-accent hover:opacity-90 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Play className="w-3 h-3 fill-black" />
                      <span>Start Navigation</span>
                    </button>
                  )}

                  {activeRoute.segments && activeRoute.segments.length > 0 && (
                    <button
                      onClick={() => setShowRouteSteps(!showRouteSteps)}
                      className="px-2.5 py-1.5 bg-surface-2 hover:bg-surface-2 border border-line text-label-2 hover:text-label rounded-tile text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>Steps ({activeRoute.segments.length})</span>
                      {showRouteSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Turn-by-Turn Maneuvers List (Accordion) */}
                {showRouteSteps && activeRoute.segments && activeRoute.segments.length > 0 && (
                  <div className="mt-2 max-h-44 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin border-t border-line pt-2">
                    {activeRoute.segments.map((seg, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-2 rounded-lg bg-surface border border-line text-xs flex items-start gap-2 text-label-2"
                      >
                        <span className="w-5 h-5 rounded bg-risk-low/[0.12] text-risk-low tabular-nums font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {seg.step_number || sIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-label font-medium text-xs leading-snug">{seg.instruction}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-label-2 tabular-nums">
                            {seg.distance_km > 0 && <span>{seg.distance_km} km</span>}
                            {seg.travel_time_min > 0 && <span>~{seg.travel_time_min} min</span>}
                            {seg.road_name && <span className="truncate text-label-3">{seg.road_name}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#111] px-4 py-2.5 border-b border-line flex items-center justify-between text-xs z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-risk-low "></span>
                  <span className="font-semibold text-label">Live Geospatial Radar</span>
                </div>
                <div className="flex items-center gap-2 text-label-2 tabular-nums text-xs">
                  <span>Center: {userCoords?.lat?.toFixed(3)}°N, {userCoords?.lng?.toFixed(3)}°E</span>
                </div>
              </div>
            )}

            {/* Route Calculation Progress / Error Notification */}
            {isCalculatingRoute && (
              <div className="bg-surface-2 border-b border-line px-4 py-2 text-xs text-label-2 flex items-center gap-2 z-10">
                <div className="w-3.5 h-3.5 border-2 border-line border-t-transparent rounded-full animate-spin"></div>
                <span>Calculating road route to selected facility...</span>
              </div>
            )}

            {routeError && (
              <div className="bg-risk-critical/[0.12] border-b border-risk-critical/30 px-4 py-2 text-xs text-risk-critical flex items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-1.5 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 text-risk-critical shrink-0" />
                  <span className="truncate">{routeError}</span>
                </div>
                <button
                  onClick={() => setRouteError(null)}
                  className="text-risk-critical hover:text-label p-0.5 text-xs font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Leaflet Map */}
            <div className="flex-1 w-full relative">
              {/* Live Turn-by-Turn HUD overlay inside map during Navigation */}
              {isNavigating && activeRoute && activeRoute.segments && activeRoute.segments[0] && (
                <div className="absolute top-3 left-3 right-14 z-[1000] pointer-events-none">
                  <div className="bg-surface-2 backdrop-blur-md border border-risk-low/30 p-2.5 rounded-card flex items-center gap-2.5 pointer-events-auto">
                    <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0 ">
                      <CornerUpRight className="w-5 h-5 font-semibold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-label truncate leading-tight">
                        {activeRoute.segments[0].instruction}
                      </p>
                      <p className="text-xs text-risk-low tabular-nums">
                        {activeRoute.distance_km} km remaining • ~{activeRoute.travel_time_min} mins
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {userCoords?.lat && userCoords?.lng ? (
                <MapContainer
                  center={[userCoords.lat, userCoords.lng]}
                  zoom={mapZoom}
                  style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
                  zoomControl={false}
                >
                  <MapRouteController 
                    center={mapCenter} 
                    zoom={mapZoom} 
                    routeCoords={activeRoute?.coordinates} 
                  />

                  {/* Basemap Tile Layer (Dynamically switched with zero reload / zero API calls) */}
                  <TileLayer
                    key={activeMapConfig.id}
                    url={activeMapConfig.url}
                    attribution={activeMapConfig.attribution}
                    maxNativeZoom={activeMapConfig.maxNativeZoom || 17}
                    maxZoom={activeMapConfig.maxZoom || 19}
                  />

                  {/* If Hybrid mode, add the reference labels & boundaries overlay */}
                  {activeMapConfig.id === 'hybrid' && activeMapConfig.overlayUrl && (
                    <TileLayer
                      key="hybrid-overlay"
                      url={activeMapConfig.overlayUrl}
                      attribution={activeMapConfig.attribution}
                      maxNativeZoom={18}
                      maxZoom={19}
                    />
                  )}

                  {/* In-App Road Route Geometry */}
                  {activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 0 && (
                    <>
                      {/* Route Outer Casing */}
                      <Polyline
                        positions={activeRoute.coordinates.map((pt) => [pt.lat, pt.lng])}
                        pathOptions={{
                          color: '#064e3b',
                          weight: 8,
                          opacity: 0.8,
                          lineCap: 'round',
                          lineJoin: 'round'
                        }}
                      />
                      {/* Route Active Foreground */}
                      <Polyline
                        positions={activeRoute.coordinates.map((pt) => [pt.lat, pt.lng])}
                        pathOptions={{
                          color: '#6BBF8A',
                          weight: 5,
                          opacity: 0.95,
                          lineCap: 'round',
                          lineJoin: 'round'
                        }}
                      />
                    </>
                  )}

                  {/* User Location Marker */}
                  <Marker
                    position={[userCoords.lat, userCoords.lng]}
                    icon={createMarkerIcon('user')}
                  >
                    <Popup className="custom-dark-popup">
                      <div className="p-2 text-xs text-label">
                        <strong className="text-label-2 flex items-center gap-1 font-semibold">
                          <Crosshair className="w-3.5 h-3.5" />
                          <span>Your Location</span>
                        </strong>
                        <p className="mt-1 text-label-2">{userCoords.area}</p>
                        <p className="text-xs text-label-2 tabular-nums mt-1">
                          Accuracy: ±{userCoords.accuracy} m
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Search Radius Circle Overlay */}
                  <Circle
                    center={[userCoords.lat, userCoords.lng]}
                    radius={radiusKm * 1000}
                    pathOptions={{
                      color: '#6BBF8A',
                      fillColor: '#6BBF8A',
                      fillOpacity: 0.04,
                      weight: 1.5,
                      dashArray: '4, 6'
                    }}
                  />

                  {/* Discovered Facility Markers */}
                  {places.map((place) => {
                    const isSelected = selectedPlaceId === place.id;
                    return (
                      <Marker
                        key={place.id}
                        position={[place.latitude, place.longitude]}
                        icon={createMarkerIcon(place.category || activeCategory, isSelected)}
                        eventHandlers={{
                          click: () => handleSelectPlace(place)
                        }}
                      >
                        <Popup className="custom-dark-popup">
                          <div className="p-2 text-xs text-label space-y-1.5 max-w-[240px]">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-label text-xs">{place.name}</h4>
                              <span className="text-xs text-risk-low tabular-nums font-semibold shrink-0">
                                {place.distance_km} km
                              </span>
                            </div>
                            <p className="text-xs text-label-2 leading-tight">{place.address}</p>
                            
                            <div className="pt-2 flex items-center gap-2 border-t border-line">
                              {place.phone ? (
                                <a
                                  href={`tel:${place.phone}`}
                                  className="px-2 py-1 bg-risk-low hover:bg-risk-low text-label rounded text-xs font-semibold flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>Call</span>
                                </a>
                              ) : (
                                <span className="text-xs text-label-2 tabular-nums">No phone</span>
                              )}
                              
                              <button
                                onClick={() => handleGetDirections(place)}
                                disabled={isCalculatingRoute}
                                className="px-2 py-1 bg-accent hover:bg-accent text-label rounded text-xs font-semibold flex items-center gap-1 ml-auto transition-colors disabled:opacity-50"
                                title="Compute road route and navigate inside LANDSLIDEGUARD"
                              >
                                <Navigation className="w-3 h-3 text-label" />
                                <span>{activeRoute?.destination?.id === place.id ? 'Routing' : 'Directions'}</span>
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-label-3 text-xs">
                  Loading map coordinates...
                </div>
              )}

              {/* Map Floating Control: Recenter Button (Top-Right) */}
              <button
                onClick={() => userCoords && setMapCenter({ lat: userCoords.lat, lng: userCoords.lng })}
                className="absolute top-3 right-3 z-[1000] p-2 bg-surface hover:bg-surface-2 text-label border border-line rounded-tile backdrop-blur-sm transition-colors"
                title="Recenter on My Location"
              >
                <Crosshair className="w-4 h-4 text-risk-low" />
              </button>

              {/* Google-Maps-Style Map Type / Basemap Switcher (Bottom-Left) */}
              <div 
                ref={layerMenuRef}
                className="absolute bottom-3 left-3 z-[1000] select-none"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {/* Expanded Layer Selection Menu */}
                {showLayerMenu && (
                  <div 
                    className="mb-2 bg-surface backdrop-blur-md border border-line p-2 rounded-card transition-all animate-in fade-in slide-in-from-bottom-2 duration-150"
                    role="region"
                    aria-label="Map type selection menu"
                  >
                    <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#222] mb-1.5">
                      <span className="text-xs font-semibold text-label-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-risk-low" />
                        <span>Map Type</span>
                      </span>
                      <button
                        onClick={() => setShowLayerMenu(false)}
                        className="text-label-3 hover:text-label p-0.5 rounded transition-colors"
                        aria-label="Close map type menu"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {MAP_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedMapType === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => handleSelectMapType(type.id)}
                            className={`flex flex-col items-center gap-1 p-1.5 rounded-tile transition-all ${
                              isSelected
                                ? 'bg-risk-low/[0.12] border-2 border-risk-low/30 text-risk-low shadow-sm  font-semibold'
                                : 'bg-surface-2 border border-line text-label-2 hover:text-label hover:border-line'
                            }`}
                            style={{ width: '58px' }}
                            title={`Switch to ${type.label} (${type.subtitle})`}
                            aria-label={`Switch to ${type.label} view`}
                            role="button"
                          >
                            <div className={`w-9 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-risk-low/[0.12] text-risk-low' : 'bg-[#222] text-label-2'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs leading-none truncate w-full text-center">
                              {type.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Compact Toggle Button (Google Maps Style) */}
                <button
                  onClick={() => setShowLayerMenu(!showLayerMenu)}
                  className={`px-3 py-1.5 bg-surface hover:bg-surface-2 backdrop-blur-md border rounded-tile flex items-center gap-2 text-xs font-semibold transition-all ${
                    showLayerMenu 
                      ? 'border-risk-low/30 text-risk-low ' 
                      : 'border-line hover:border-line text-label'
                  }`}
                  title="Change map style (Roadmap, Satellite, Terrain, Hybrid, Dark)"
                  aria-label="Map layers switcher"
                  aria-expanded={showLayerMenu}
                >
                  <Layers className="w-3.5 h-3.5 text-risk-low" />
                  <span className="text-xs font-medium">{activeMapConfig.label}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Facility Cards List (shown in 'split' or 'cards' mode) */}
        {(viewLayout === 'split' || viewLayout === 'cards') && (
          <div className={`${viewLayout === 'split' ? 'lg:col-span-6 xl:col-span-7' : 'w-full'} space-y-3`}>
            
            {/* Loading Indicator */}
            {loading && (
              <div className="bg-surface border border-line p-8 rounded-card flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-risk-low/30 border-t-transparent animate-spin"></div>
                <div>
                  <h3 className="text-sm font-semibold text-label">Finding emergency resources near you...</h3>
                  <p className="text-xs text-label-2 mt-1">
                    Querying live geospatial coordinates and calculating drive proximity.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {locationError && !loading && (
              <div className="p-4 bg-risk-critical/[0.12] border border-risk-critical/30 rounded-card text-risk-critical text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-risk-critical shrink-0" />
                  <span>{locationError}</span>
                </div>
                <button
                  onClick={() => requestGpsLocation()}
                  className="px-2.5 py-1 bg-risk-critical/[0.12] hover:bg-risk-critical/[0.12] text-risk-critical rounded-lg text-xs font-medium shrink-0"
                >
                  Retry GPS
                </button>
              </div>
            )}

            {/* Empty State: Zero Results in current radius */}
            {!loading && places.length === 0 && (
              <div className="bg-surface border border-line p-8 rounded-card text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-card bg-surface-2 border border-[#222] flex items-center justify-center text-label-2">
                  <Building className="w-6 h-6 text-label-3" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-label">No nearby facilities found within {radiusKm} km</h3>
                  <p className="text-xs text-label-2 max-w-md mx-auto mt-1">
                    No verified {activeCategory} were detected within the active radius of your current location. Expand your search boundary to discover regional facilities.
                  </p>
                </div>
                {radiusKm < 50 ? (
                  <button
                    onClick={() => setRadiusKm(radiusKm === 5 ? 10 : radiusKm === 10 ? 25 : 50)}
                    className="px-4 py-2 bg-accent hover:opacity-90 text-white font-semibold rounded-full text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Search Wider Area ({radiusKm === 5 ? '10 km' : radiusKm === 10 ? '25 km' : '50 km'})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setManualQuery('District Hospital');
                      handleManualSearch();
                    }}
                    className="px-4 py-2 bg-surface-2 hover:bg-surface-2 text-label font-medium rounded-tile text-xs inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Search by City Name</span>
                  </button>
                )}
              </div>
            )}

            {/* List of Normalized Facilities */}
            {!loading && places.map((place) => {
              const isSelected = selectedPlaceId === place.id;
              const hasPhone = Boolean(place.phone || place.international_phone);
              const phoneNumber = place.phone || place.international_phone;

              return (
                <div
                  key={place.id}
                  ref={(el) => (cardRefs.current[place.id] = el)}
                  onClick={() => handleSelectPlace(place)}
                  className={`bg-surface border rounded-card p-4 sm:p-5 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-risk-low/30 bg-surface-2    ' 
                      : 'border-line hover:border-line'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    
                    {/* Facility Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-label tracking-tight leading-snug truncate">
                          {place.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded tabular-nums font-semibold shrink-0 ${
                          place.category === 'police'
                            ? 'bg-surface-2 border border-line text-label-2'
                            : place.category === 'fire'
                              ? 'bg-risk-critical/[0.12] border border-risk-critical/30 text-risk-critical'
                              : place.category === 'shelters'
                                ? 'bg-risk-moderate/[0.12] border border-risk-moderate/30 text-risk-moderate'
                                : 'bg-risk-low/[0.12] border border-risk-low/30 text-risk-low'
                        }`}>
                          {place.type || 'Emergency Facility'}
                        </span>
                      </div>

                      {/* Distance & Address */}
                      <p className="text-xs text-label-2 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-label-3 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{place.address}</span>
                      </p>

                      {/* Status & Ratings Meta */}
                      <div className="flex items-center gap-3 pt-1 text-xs text-label-2 flex-wrap">
                        {place.opening_hours ? (
                          <span className="flex items-center gap-1 text-risk-low font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{place.opening_hours}</span>
                          </span>
                        ) : place.open_now !== null && place.open_now !== undefined ? (
                          <span className={`flex items-center gap-1 font-medium ${place.open_now ? 'text-risk-low' : 'text-label-3'}`}>
                            <Clock className="w-3 h-3" />
                            <span>{place.open_now ? 'Open Now' : 'Closed'}</span>
                          </span>
                        ) : (
                          <span className="text-label-3 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Hours unavailable</span>
                          </span>
                        )}

                        {place.rating ? (
                          <span className="flex items-center gap-1 text-risk-moderate tabular-nums">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{place.rating.toFixed(1)}</span>
                            {place.review_count && (
                              <span className="text-label-3">({place.review_count})</span>
                            )}
                          </span>
                        ) : null}

                        <span className="text-label-3 tabular-nums">
                          ID: {place.place_id ? place.place_id.slice(-6) : place.id.slice(-6)}
                        </span>
                      </div>
                    </div>

                    {/* Prominent Distance Badge */}
                    <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1">
                      <div className="px-2.5 py-1 rounded-tile bg-surface-2 border border-[#222] tabular-nums text-xs font-semibold text-risk-low flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        <span>{place.distance_km} km away</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2 flex-wrap">
                    
                    {/* Left: Call Action */}
                    <div className="flex items-center gap-2">
                      {hasPhone ? (
                        <a
                          href={`tel:${phoneNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 bg-risk-low hover:bg-risk-low text-label font-semibold rounded-tile text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call {phoneNumber}</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 bg-surface border border-line text-label-3 rounded-tile text-xs font-medium cursor-not-allowed flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-label-3" />
                          <span>Phone unavailable</span>
                        </button>
                      )}
                    </div>

                    {/* Right: Directions & Google Maps Links */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGetDirections(place);
                        }}
                        disabled={isCalculatingRoute}
                        className={`px-3 py-1.5 rounded-tile text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          activeRoute?.destination?.id === place.id
                            ? 'bg-surface-2 text-label   font-semibold'
                            : 'bg-surface-2 hover:bg-surface-2 border border-line text-label-2'
                        } disabled:opacity-50`}
                        title="Calculate road route and navigate inside LANDSLIDEGUARD"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>{activeRoute?.destination?.id === place.id ? 'Route Active' : 'Directions'}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/safe-route', {
                            state: {
                              destCoords: {
                                lat: place.latitude,
                                lng: place.longitude,
                                name: place.name
                              },
                              destQuery: place.address || place.name
                            }
                          });
                        }}
                        className="px-2.5 py-1.5 bg-risk-low/[0.12] hover:bg-risk-low/[0.12] border border-risk-low/30 text-risk-low rounded-tile text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Open in Landslide Evacuation Safe Route Planner"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Safe Route</span>
                      </button>

                      <a
                        href={place.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1.5 bg-surface-2 hover:bg-surface-2 border border-line text-label-2 hover:text-label rounded-tile text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Open exact facility location on Google Maps"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden sm:inline">Google Maps</span>
                      </a>

                      {place.website && (
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1.5 bg-surface-2 hover:bg-surface-2 border border-line text-label-2 hover:text-label rounded-tile text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <span>Website</span>
                        </a>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 5. Google Places API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-surface-2 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-card max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-tile bg-risk-moderate/[0.12] border border-risk-moderate/30 flex items-center justify-center text-risk-moderate">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-label">Google Maps Platform Integration</h3>
                  <p className="text-xs text-label-2">Places API & Places API (New) Configuration</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1 rounded-lg text-label-2 hover:text-label hover:bg-surface-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-label-2 leading-relaxed bg-surface-2 p-3.5 rounded-tile border border-line">
              <p>
                <strong>Architecture:</strong> When an API Key is present, LandSafe automatically connects to official <strong>Google Places API (New)</strong> (<code className="text-risk-low">places:searchNearby</code>) for verified facility coordinates, hours, ratings, and phone numbers.
              </p>
              <p className="text-label-2">
                When no key is configured in the environment, the system gracefully queries verified open geospatial infrastructure (OpenStreetMap / Overpass) so you get 100% real, authentic facilities for any location in India with zero fake data.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-label-2">
                Google Maps API Key (Optional Override)
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-tile text-xs text-label placeholder-label-3 focus:outline-none focus:border-risk-low/30 tabular-nums"
              />
              <p className="text-xs text-label-3">
                Key can also be defined via server environment variable <code className="text-label-2">GOOGLE_MAPS_API_KEY</code>.
              </p>
            </div>

            {keySavedMsg && (
              <div className="p-2.5 bg-risk-low/[0.12] border border-risk-low/30 rounded-tile text-risk-low text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-risk-low shrink-0" />
                <span>{keySavedMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 bg-surface-2 hover:bg-surface-2 text-label text-xs font-medium rounded-tile transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-accent hover:opacity-90 text-white font-semibold text-xs rounded-full transition-colors shadow-sm"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResourcesPage;
