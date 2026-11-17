import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { safeRouteApi, resourcesApi } from '../services/api';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';
import { useLanguage } from '../context/LanguageContext';
import { LeafletRiskMap } from '../components/map/LeafletRiskMap';
import { 
  Navigation, 
  MapPin, 
  Search,
  ArrowRight,
  ArrowUpDown,
  Crosshair,
  Compass,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  X,
  RefreshCw,
  Sparkles,
  Route
} from 'lucide-react';

export const SafeRoutePage = () => {
  const { t } = useLanguage();
  const { zones, reports } = useEmergency();
  const { userCoordinates } = useAuth();
  const { selectedLocation, requestLocation, location } = useLocationIntelligence();

  const [routingMode, setRoutingMode] = useState('global'); // 'global' | 'preset'
  
  // Origin & Destination query inputs (Himachal Pradesh)
  const [originQuery, setOriginQuery] = useState('Kullu, Himachal Pradesh');
  const [destQuery, setDestQuery] = useState('Manali, Himachal Pradesh');
  
  const [originCoords, setOriginCoords] = useState({ 
    lat: 31.9579, 
    lng: 77.1095, 
    name: 'Kullu Center, HP' 
  });
  
  const [destCoords, setDestCoords] = useState({ 
    lat: 32.2432, 
    lng: 77.1892, 
    name: 'Manali Safe Evacuation Center, HP' 
  });
  
  // Preset Corridors State
  const [waypoints, setWaypoints] = useState([]);
  const [roads, setRoads] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [startNode, setStartNode] = useState('SILIGURI_HUB');
  const [destNode, setDestNode] = useState('GANGTOK_RIDGE');
  const [avoidBlockedRoads, setAvoidBlockedRoads] = useState(true);

  const [routeResult, setRouteResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [isEvacuating, setIsEvacuating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const routeLocation = useLocation();
  const routeReqSeqRef = React.useRef(0);

  // Load preset corridor resources once on component mount
  useEffect(() => {
    loadPresetResources();
  }, []);

  // Synchronize destination when navigated from Resources or other pages
  useEffect(() => {
    if (routeLocation?.state?.destCoords) {
      setDestCoords(routeLocation.state.destCoords);
      if (routeLocation.state.destQuery) {
        setDestQuery(routeLocation.state.destQuery);
      }
      setRoutingMode('global');
    }
  }, [routeLocation?.state]);

  const loadPresetResources = async () => {
    try {
      const [wp, rd, hosps, shelts] = await Promise.all([
        safeRouteApi.getWaypoints(),
        resourcesApi.getRoads(),
        resourcesApi.getHospitals(),
        resourcesApi.getShelters()
      ]);
      setWaypoints(wp || []);
      setRoads(rd || []);
      setHospitals(hosps || []);
      setShelters(shelts || []);
    } catch (e) {
      console.error('Failed to load preset resources:', e);
    }
  };

  // Unified Google Maps-Style Route Calculation
  const handleExecuteGlobalRoute = async (oQuery = originQuery, dQuery = destQuery) => {
    const seq = ++routeReqSeqRef.current;
    setCalculating(true);
    setErrorMsg(null);

    try {
      let resolvedOrigin = originCoords;
      let resolvedDest = destCoords;

      // 1. Resolve Origin Coordinates
      const oTrimmed = oQuery.trim();
      const oCoordMatch = oTrimmed.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/);
      if (oCoordMatch) {
        const parts = oTrimmed.split(/[,\s]+/).filter(Boolean);
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        resolvedOrigin = { lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
        setOriginCoords(resolvedOrigin);
      } else if (oTrimmed.toLowerCase().includes('current') || oTrimmed.toLowerCase().includes('gps') || oTrimmed.toLowerCase().includes('my location')) {
        if (selectedLocation?.latitude) {
          resolvedOrigin = {
            lat: selectedLocation.latitude,
            lng: selectedLocation.longitude,
            name: selectedLocation.displayName || 'My Location'
          };
        }
      } else {
        let geoO = null;
        try {
          geoO = await safeRouteApi.geocodePlace(oTrimmed);
        } catch {
          // Fallback to client-side Nominatim if backend geocode encounters error
          try {
            const nomO = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(oTrimmed)}&limit=1`, {
              headers: { 'Accept': 'application/json' }
            });
            const nomOData = await nomO.json();
            if (nomOData && nomOData.length > 0) {
              geoO = {
                lat: parseFloat(nomOData[0].lat),
                lng: parseFloat(nomOData[0].lon),
                name: nomOData[0].display_name
              };
            }
          } catch {
            // Unresolved
          }
        }

        if (geoO && typeof geoO.lat === 'number' && typeof geoO.lng === 'number') {
          resolvedOrigin = geoO;
          setOriginCoords(geoO);
        } else {
          throw new Error(`Start location "${oTrimmed}" could not be resolved. Please enter a valid city, town, or coordinates.`);
        }
      }

      // 2. Resolve Destination Coordinates
      const dTrimmed = dQuery.trim();
      const dCoordMatch = dTrimmed.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/);
      if (dCoordMatch) {
        const parts = dTrimmed.split(/[,\s]+/).filter(Boolean);
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        resolvedDest = { lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
        setDestCoords(resolvedDest);
      } else if (dTrimmed) {
        let geoD = null;
        try {
          geoD = await safeRouteApi.geocodePlace(dTrimmed);
        } catch {
          // Graceful fallback to client-side Nominatim geocoding if backend is unreachable
          try {
            const nomResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dTrimmed)}&limit=1`, {
              headers: { 'Accept': 'application/json' }
            });
            const nomData = await nomResp.json();
            if (nomData && nomData.length > 0) {
              geoD = {
                lat: parseFloat(nomData[0].lat),
                lng: parseFloat(nomData[0].lon),
                name: nomData[0].display_name
              };
            }
          } catch {
            // Unresolved
          }
        }

        if (geoD && typeof geoD.lat === 'number' && typeof geoD.lng === 'number') {
          resolvedDest = geoD;
          setDestCoords(geoD);
        } else {
          throw new Error(`Destination "${dTrimmed}" could not be resolved. Please enter a valid city, town, or hospital name.`);
        }
      }

      if (
        Math.abs(resolvedOrigin.lat - resolvedDest.lat) < 0.0001 &&
        Math.abs(resolvedOrigin.lng - resolvedDest.lng) < 0.0001
      ) {
        throw new Error('Start location and Destination cannot be identical. Please specify a different destination.');
      }

      // 3. Compute Worldwide Road Route
      const res = await safeRouteApi.calculateGlobalRoute(
        resolvedOrigin.lat,
        resolvedOrigin.lng,
        resolvedDest.lat,
        resolvedDest.lng,
        resolvedOrigin.name || 'Origin',
        resolvedDest.name || 'Destination'
      );
 
      if (seq !== routeReqSeqRef.current) return;
      setRouteResult(res);
      setCurrentStepIndex(0);
      setIsEvacuating(false);
    } catch (err) {
      if (seq !== routeReqSeqRef.current) return;
      console.error('Global routing error:', err);
      setErrorMsg(err?.response?.data?.detail || err.message || 'Unable to compute road route. Please verify place names.');
    } finally {
      if (seq === routeReqSeqRef.current) {
        setCalculating(false);
      }
    }
  };

  // Preset Corridor Calculation
  const handleCalculatePresetRoute = async () => {
    if (startNode === destNode) {
      setErrorMsg('Start location and Destination cannot be identical.');
      return;
    }
    setCalculating(true);
    setErrorMsg(null);
    try {
      const res = await safeRouteApi.calculateSafeRoute(startNode, destNode, avoidBlockedRoads);
      setRouteResult(res);
      setCurrentStepIndex(0);
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || 'Unable to compute corridor route.');
    } finally {
      setCalculating(false);
    }
  };

  // Form Submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleExecuteGlobalRoute(originQuery, destQuery);
  };

  // Use Current Live GPS
  const handleUseCurrentLocation = () => {
    requestLocation();
    if (location?.latitude && location?.longitude) {
      const coords = {
        lat: location.latitude,
        lng: location.longitude,
        name: location.displayName || 'My Current Location'
      };
      setOriginCoords(coords);
      setOriginQuery(location.displayName || 'My Current GPS Location');
      handleExecuteGlobalRoute(location.displayName || 'My Current GPS Location', destQuery);
    }
  };

  // Swap Origin and Destination
  const handleSwapLocations = () => {
    const tempCoords = originCoords;
    const tempQuery = originQuery;
    setOriginCoords(destCoords);
    setOriginQuery(destQuery);
    setDestCoords(tempCoords);
    setDestQuery(tempQuery);
    handleExecuteGlobalRoute(destQuery, tempQuery);
  };

  // Initial calculation on mount
  useEffect(() => {
    handleExecuteGlobalRoute(originQuery, destQuery);
  }, []);

  // Quick Corridors
  const quickCorridors = [
    { label: 'Sikkim NH-10 (Siliguri → Gangtok)', o: 'Siliguri, West Bengal', d: 'Gangtok, Sikkim' },
    { label: 'Meghalaya NH-6 (Guwahati → Shillong)', o: 'Guwahati, Assam', d: 'Shillong, Meghalaya' },
    { label: 'Himachal (Chandigarh → Shimla)', o: 'Chandigarh', d: 'Shimla, Himachal Pradesh' },
    { label: 'Uttarakhand (Rishikesh → Badrinath)', o: 'Rishikesh, Uttarakhand', d: 'Badrinath, Uttarakhand' },
    { label: 'Kerala Ghats (Kochi → Munnar)', o: 'Kochi, Kerala', d: 'Munnar, Kerala' },
    { label: 'Karnataka (Harohalli → Patna)', o: 'Harohalli, Karnataka', d: 'Patna, Bihar' }
  ];

  const currentSegment = routeResult?.safe_route?.segments?.[currentStepIndex];
  const totalSegments = routeResult?.safe_route?.segments?.length || 1;

  return (
    <div className="space-y-4">
      
      {/* Top Header & Search Console */}
      <div className="bg-surface border border-line p-3.5 rounded-lg space-y-3">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-risk-low/[0.12] border border-risk-low/30 flex items-center justify-center text-risk-low">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-label">
                {t('routing_title') || 'Safe Route Navigation & Hazard Avoidance'}
              </h1>
              <p className="text-xs text-label-2">
                {t('routing_subtitle') || 'Real-world road routing with real-time slope and geotechnical landslide risk assessment'}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-surface-2 p-0.5 rounded-md border border-line text-xs">
            <button
              onClick={() => { setRoutingMode('global'); setIsEvacuating(false); }}
              className={`px-3 py-1 rounded transition-colors ${
                routingMode === 'global' ? 'bg-surface-2 text-label font-semibold' : 'text-label-2 hover:text-label'
              }`}
            >
              {t('mode_worldwide') || 'Worldwide Search'}
            </button>
            <button
              onClick={() => { setRoutingMode('preset'); setIsEvacuating(false); }}
              className={`px-3 py-1 rounded transition-colors ${
                routingMode === 'preset' ? 'bg-surface-2 text-label font-semibold' : 'text-label-2 hover:text-label'
              }`}
            >
              {t('mode_corridors') || 'Disaster Corridors'}
            </button>
          </div>
        </div>

        {/* Global Google Maps-Style Unified Route Search Bar */}
        {routingMode === 'global' ? (
          <form onSubmit={handleFormSubmit} className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              
              {/* Origin Input */}
              <div className="md:col-span-5 flex items-center bg-surface-2 border border-line focus-within:border-line rounded-md px-2.5 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent mr-2 shrink-0" />
                <input
                  type="text"
                  value={originQuery}
                  onChange={(e) => setOriginQuery(e.target.value)}
                  placeholder={t('start_location_placeholder') || 'Start location, GPS, city, village...'}
                  className="bg-transparent text-xs text-label placeholder-label-3 focus:outline-none w-full"
                />
              </div>

              {/* Swap Button */}
              <div className="md:col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="p-1.5 rounded-md bg-surface-2 hover:bg-surface-2 text-label-2 hover:text-label border border-line transition-colors"
                  title={t('swap_locations') || 'Swap Origin and Destination'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Destination Input */}
              <div className="md:col-span-4 flex items-center bg-surface-2 border border-line focus-within:border-risk-low/30 rounded-md px-2.5 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-risk-low mr-2 shrink-0" />
                <input
                  type="text"
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  placeholder={t('destination_placeholder') || 'Destination, hospital, shelter...'}
                  className="bg-transparent text-xs text-label placeholder-label-3 focus:outline-none w-full"
                />
              </div>

              {/* Route Action Button */}
              <div className="md:col-span-2 flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={calculating}
                  className="w-full py-1.5 px-3 bg-accent hover:bg-accent disabled:opacity-50 text-label rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Navigation className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
                  <span>{calculating ? (t('routing_in_progress') || 'Calculating...') : (t('route_calculate_btn') || 'Route')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={calculating}
                  className="p-1.5 bg-surface-2 hover:bg-surface-2 text-label-2 hover:text-label border border-line rounded-md transition-colors shrink-0"
                  title={t('use_my_gps') || 'Use My Current GPS'}
                >
                  <Crosshair className="w-3.5 h-3.5 text-label-2" />
                </button>
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-1">
              <span className="text-label-3 shrink-0 font-semibold">Fast Corridors:</span>
              {quickCorridors.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setOriginQuery(c.o);
                    setDestQuery(c.d);
                    handleExecuteGlobalRoute(c.o, c.d);
                  }}
                  className="px-2 py-0.5 rounded bg-surface-2 hover:bg-surface-2 text-label-2 hover:text-label border border-line shrink-0 transition-colors"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </form>
        ) : (
          /* Preset Corridor Dropdowns */
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-lg border border-line">
              <span className="text-label-2 text-xs">ORIGIN:</span>
              <select
                value={startNode}
                onChange={(e) => {
                  const start = e.target.value;
                  setStartNode(start);
                  const net = waypoints.find((w) => w.id === start)?.network;
                  const dest = waypoints.find((w) => w.id === destNode);
                  if (dest && dest.network !== net) {
                    const first = waypoints.find((w) => w.network === net && w.id !== start);
                    if (first) setDestNode(first.id);
                  }
                }}
                className="bg-transparent text-label font-semibold focus:outline-none"
              >
                {waypoints.map((wp) => (
                  <option key={wp.id} value={wp.id} className="bg-surface-2">
                    {wp.name} ({wp.region})
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-label-3 hidden sm:block" />

            <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-lg border border-line">
              <span className="text-label-2 text-xs">DESTINATION:</span>
              <select
                value={destNode}
                onChange={(e) => setDestNode(e.target.value)}
                className="bg-transparent text-label font-semibold focus:outline-none"
              >
                {waypoints
                  .filter((wp) => wp.network === waypoints.find((w) => w.id === startNode)?.network)
                  .map((wp) => (
                  <option key={wp.id} value={wp.id} className="bg-surface-2">
                    {wp.name} ({wp.region})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCalculatePresetRoute}
              disabled={calculating}
              className="px-4 py-1.5 bg-surface-2 hover:bg-[#1f3254] text-label border border-line rounded-lg text-xs font-semibold transition-colors"
            >
              {calculating ? 'Analyzing...' : 'Recalculate'}
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-risk-critical/[0.12] border border-risk-critical/30 text-risk-critical text-xs tabular-nums flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-risk-critical shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Evacuation Guidance Mode HUD */}
      {isEvacuating && routeResult && (
        <div className="bg-surface-2 border-2 border-risk-low/30 p-4 rounded-tile animate-in fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-risk-low " />
              <div>
                <span className="text-xs font-semibold text-risk-low block">
                  MOVE TOWARD SAFE ZONE • TURN-BY-TURN ROAD GUIDANCE
                </span>
                <span className="text-label text-xs font-semibold">
                  Destination: {routeResult.destination?.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-risk-low/[0.12] text-risk-low border border-risk-low/30">
                {routeResult.safe_route.distance_km} KM • ~{routeResult.safe_route.travel_time_min} MIN
              </span>
              <button
                onClick={() => setIsEvacuating(false)}
                className="p-1 text-label-2 hover:text-label rounded bg-surface-2 border border-line"
                title="Exit Evacuation Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {currentSegment && (
            <div className="bg-surface-2 p-3 rounded-lg border border-risk-low/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.2 rounded font-semibold bg-surface-2 text-label-2 border border-line">
                    STEP {currentStepIndex + 1} OF {totalSegments}
                  </span>
                  <span className="text-risk-low font-semibold text-xs">
                    {currentSegment.distance_km} km • ~{currentSegment.travel_time_min} mins
                  </span>
                </div>
                <h3 className="text-label font-semibold text-sm">
                  {currentSegment.instruction}
                </h3>
                <p className="text-xs text-label-2 font-sans">
                  Hazard: <strong className="text-risk-low">{currentSegment.risk_score}/100</strong> • Road: <strong className="text-label">{currentSegment.road_name}</strong>
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                  disabled={currentStepIndex === 0}
                  className="px-2.5 py-1.5 bg-surface-2 hover:bg-[#182744] text-label-2 rounded border border-line text-xs font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentStepIndex(Math.min(totalSegments - 1, currentStepIndex + 1))}
                  disabled={currentStepIndex === totalSegments - 1}
                  className="px-3 py-1.5 bg-risk-low hover:bg-risk-low text-label rounded border border-risk-low/30 text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                >
                  <span>NEXT STEP</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Map & Maneuvers Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Map (65%) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-surface border border-line rounded-card p-3.5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-label font-semibold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-risk-low" />
                Live Road Path & Hazard Overlay
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-risk-low font-semibold">
                  <span className="w-3 h-1 bg-risk-low rounded" />
                  Navigation Route
                </span>
              </div>
            </div>

            <div className="w-full h-[460px] lg:h-[500px] xl:h-[540px] rounded-tile overflow-hidden border border-line">
              <LeafletRiskMap
                zones={zones}
                reports={reports}
                hospitals={hospitals}
                shelters={shelters}
                roads={roads}
                routeData={routeResult}
                height="100%"
              />
            </div>
          </div>
        </div>

        {/* Turn Maneuvers & Hazard Summary (35%) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          {routeResult ? (
            <>
              {/* Route Summary Card */}
              <div className="bg-surface border border-line rounded-card p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-risk-low" />
                    <span className="text-xs font-semibold text-label ">ROUTE SUMMARY</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-semibold bg-risk-low/[0.12] text-risk-low border border-risk-low/30">
                    {routeResult.safe_route.safety_level}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-surface p-2 rounded-tile border border-line text-center">
                  <div>
                    <span className="text-xs sm:text-xs text-label-2 block">TOTAL DIST</span>
                    <strong className="text-xs sm:text-sm text-label">{routeResult.safe_route.distance_km} km</strong>
                  </div>
                  <div>
                    <span className="text-xs sm:text-xs text-label-2 block">EST. TIME</span>
                    <strong className="text-xs sm:text-sm text-label">{routeResult.safe_route.travel_time_min} min</strong>
                  </div>
                  <div>
                    <span className="text-xs sm:text-xs text-label-2 block">MAX SLOPE</span>
                    <strong className="text-xs sm:text-sm text-risk-low">{routeResult.safe_route.max_slope_deg || 3.5}°</strong>
                  </div>
                </div>

                <p className="text-xs text-label-2 font-sans leading-relaxed">
                  {routeResult.comparison.explanation}
                </p>

                {/* Evacuation Mode CTA */}
                <button
                  onClick={() => setIsEvacuating(true)}
                  className={`w-full py-2 rounded-tile text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isEvacuating
                      ? 'bg-surface-2 text-risk-low border border-risk-low/30'
                      : 'bg-accent hover:opacity-90 text-white  '
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isEvacuating ? 'EVACUATION GUIDANCE ACTIVE' : 'START EVACUATION'}</span>
                </button>
              </div>

              {/* Turn Steps List */}
              <div className="bg-surface border border-line rounded-card p-3.5 shadow-sm space-y-2 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between text-xs text-label-2 font-semibold ">
                  <span>Turn-by-Turn Maneuvers</span>
                  <span>{routeResult.safe_route.segments.length} STEPS</span>
                </div>

                <div className="space-y-1.5 max-h-[220px] lg:max-h-[260px] overflow-y-auto pr-1">
                  {routeResult.safe_route.segments.map((seg, idx) => (
                    <div
                      key={idx}
                      onClick={() => { setIsEvacuating(true); setCurrentStepIndex(idx); }}
                      className={`p-2 rounded-tile border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isEvacuating && currentStepIndex === idx
                          ? 'bg-surface-2 border-risk-low/30 text-label'
                          : 'bg-surface border-line hover:bg-surface-2'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="tabular-nums text-xs px-1 bg-surface-2 text-risk-low rounded">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-label truncate">{seg.instruction || `${seg.from_name} → ${seg.to_name}`}</span>
                        </div>
                        <span className="text-xs text-label-2 block pl-4 font-sans truncate">{seg.road_name}</span>
                      </div>
                      <span className="text-xs tabular-nums text-label-2 shrink-0 ml-2">
                        {seg.distance_km} km
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-surface border border-line rounded-card p-6 h-full min-h-[460px] flex flex-col justify-center items-center text-center space-y-3 text-label-2 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-surface border border-line flex items-center justify-center text-risk-low">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-label">Safe Route Planner Ready</h3>
              <p className="text-xs text-label-2 max-w-xs leading-relaxed">
                Enter your start location and destination above, then click <strong>Calculate Safe Route</strong> to compute hazard-avoiding evacuation corridors.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
