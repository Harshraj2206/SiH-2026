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

  // Active Evacuation Mode State
  const [isEvacuating, setIsEvacuating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const routeLocation = useLocation();

  // Initialize with active GPS / Canonical Location
  useEffect(() => {
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      setOriginCoords({
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        name: selectedLocation.displayName || 'My Current Location'
      });
      setOriginQuery(selectedLocation.displayName || 'My Current GPS Location');
    }
    loadPresetResources();
  }, [selectedLocation]);

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
    setCalculating(true);
    setErrorMsg(null);

    try {
      let resolvedOrigin = originCoords;
      let resolvedDest = destCoords;

      // 1. Resolve Origin Coordinates
      const oTrimmed = oQuery.trim();
      if (oTrimmed.toLowerCase().includes('current') || oTrimmed.toLowerCase().includes('gps') || oTrimmed.toLowerCase().includes('my location')) {
        if (selectedLocation?.latitude) {
          resolvedOrigin = {
            lat: selectedLocation.latitude,
            lng: selectedLocation.longitude,
            name: selectedLocation.displayName || 'My Location'
          };
        }
      } else {
        try {
          const geoO = await safeRouteApi.geocodePlace(oTrimmed);
          if (geoO) {
            resolvedOrigin = geoO;
            setOriginCoords(geoO);
          }
        } catch {
          // Fallback to Nominatim if backend geocode encounters error
          try {
            const nomO = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(oTrimmed)}&limit=1`, {
              headers: { 'User-Agent': 'LandSafe-GlobalRouting/2.0' }
            });
            const nomOData = await nomO.json();
            if (nomOData && nomOData.length > 0) {
              const geoO = {
                lat: parseFloat(nomOData[0].lat),
                lng: parseFloat(nomOData[0].lon),
                name: nomOData[0].display_name
              };
              resolvedOrigin = geoO;
              setOriginCoords(geoO);
            }
          } catch {
            // Keep existing originCoords
          }
        }
      }

      // 2. Resolve Destination Coordinates
      const dTrimmed = dQuery.trim();
      if (dTrimmed) {
        try {
          const geoD = await safeRouteApi.geocodePlace(dTrimmed);
          if (geoD) {
            resolvedDest = geoD;
            setDestCoords(geoD);
          }
        } catch {
          // Graceful fallback to client-side Nominatim geocoding if backend is unreachable
          try {
            const nomResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dTrimmed)}&limit=1`, {
              headers: { 'User-Agent': 'LandSafe-GlobalRouting/2.0' }
            });
            const nomData = await nomResp.json();
            if (nomData && nomData.length > 0) {
              const geoD = {
                lat: parseFloat(nomData[0].lat),
                lng: parseFloat(nomData[0].lon),
                name: nomData[0].display_name
              };
              resolvedDest = geoD;
              setDestCoords(geoD);
            } else {
              throw new Error(`Destination "${dTrimmed}" could not be resolved. Please enter a valid city, town, or hospital name.`);
            }
          } catch {
            throw new Error(`Destination "${dTrimmed}" could not be resolved. Please enter a valid city, town, or hospital name.`);
          }
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

      setRouteResult(res);
      setCurrentStepIndex(0);
      setIsEvacuating(false);
    } catch (err) {
      console.error('Global routing error:', err);
      setErrorMsg(err?.response?.data?.detail || err.message || 'Unable to compute road route. Please verify place names.');
    } finally {
      setCalculating(false);
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
      <div className="bg-[#111111] border border-[#262626] p-3.5 rounded-lg space-y-3">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-100">
                {t('routing_title') || 'Safe Route Navigation & Hazard Avoidance'}
              </h1>
              <p className="text-xs text-neutral-400">
                {t('routing_subtitle') || 'Real-world road routing with real-time slope and geotechnical landslide risk assessment'}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#151515] p-0.5 rounded-md border border-[#262626] text-xs">
            <button
              onClick={() => { setRoutingMode('global'); setIsEvacuating(false); }}
              className={`px-3 py-1 rounded transition-colors ${
                routingMode === 'global' ? 'bg-[#222222] text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t('mode_worldwide') || 'Worldwide Search'}
            </button>
            <button
              onClick={() => { setRoutingMode('preset'); setIsEvacuating(false); }}
              className={`px-3 py-1 rounded transition-colors ${
                routingMode === 'preset' ? 'bg-[#222222] text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
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
              <div className="md:col-span-5 flex items-center bg-[#151515] border border-[#262626] focus-within:border-sky-500 rounded-md px-2.5 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={originQuery}
                  onChange={(e) => setOriginQuery(e.target.value)}
                  placeholder={t('start_location_placeholder') || 'Start location, GPS, city, village...'}
                  className="bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none w-full"
                />
              </div>

              {/* Swap Button */}
              <div className="md:col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="p-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#222222] text-neutral-300 hover:text-white border border-[#2A2A2A] transition-colors"
                  title={t('swap_locations') || 'Swap Origin and Destination'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Destination Input */}
              <div className="md:col-span-4 flex items-center bg-[#151515] border border-[#262626] focus-within:border-emerald-500 rounded-md px-2.5 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  placeholder={t('destination_placeholder') || 'Destination, hospital, shelter...'}
                  className="bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none w-full"
                />
              </div>

              {/* Route Action Button */}
              <div className="md:col-span-2 flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={calculating}
                  className="w-full py-1.5 px-3 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Navigation className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
                  <span>{calculating ? (t('routing_in_progress') || 'Calculating...') : (t('route_calculate_btn') || 'Route')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={calculating}
                  className="p-1.5 bg-[#1A1A1A] hover:bg-[#222222] text-neutral-300 hover:text-white border border-[#2A2A2A] rounded-md transition-colors shrink-0"
                  title={t('use_my_gps') || 'Use My Current GPS'}
                >
                  <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                </button>
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pt-1">
              <span className="text-slate-500 shrink-0 uppercase font-bold">Fast Corridors:</span>
              {quickCorridors.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setOriginQuery(c.o);
                    setDestQuery(c.d);
                    handleExecuteGlobalRoute(c.o, c.d);
                  }}
                  className="px-2 py-0.5 rounded bg-[#090f1d] hover:bg-[#121d33] text-slate-400 hover:text-slate-200 border border-[#1c2b48] shrink-0 transition-colors"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </form>
        ) : (
          /* Preset Corridor Dropdowns */
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-[#090f1d] px-2.5 py-1.5 rounded-lg border border-[#1c2b48]">
              <span className="text-slate-400 text-[10px]">ORIGIN:</span>
              <select
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none"
              >
                {waypoints.map((wp) => (
                  <option key={wp.id} value={wp.id} className="bg-[#0d1527]">
                    {wp.name} ({wp.region})
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />

            <div className="flex items-center gap-1.5 bg-[#090f1d] px-2.5 py-1.5 rounded-lg border border-[#1c2b48]">
              <span className="text-slate-400 text-[10px]">DESTINATION:</span>
              <select
                value={destNode}
                onChange={(e) => setDestNode(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none"
              >
                {waypoints.map((wp) => (
                  <option key={wp.id} value={wp.id} className="bg-[#0d1527]">
                    {wp.name} ({wp.region})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCalculatePresetRoute}
              disabled={calculating}
              className="px-4 py-1.5 bg-[#16243d] hover:bg-[#1f3254] text-white border border-cyan-500/40 rounded-lg text-xs font-bold transition-colors"
            >
              {calculating ? 'Analyzing...' : 'Recalculate'}
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Evacuation Guidance Mode HUD */}
      {isEvacuating && routeResult && (
        <div className="bg-[#0d1527] border-2 border-emerald-500/70 p-4 rounded-xl shadow-2xl animate-in fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-[#1c2b48] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block">
                  MOVE TOWARD SAFE ZONE • LIVE TURN GUIDANCE
                </span>
                <span className="text-white text-xs font-bold">
                  Destination: {routeResult.destination?.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                {routeResult.safe_route.distance_km} KM • ~{routeResult.safe_route.travel_time_min} MIN
              </span>
              <button
                onClick={() => setIsEvacuating(false)}
                className="p-1 text-slate-400 hover:text-white rounded bg-[#121d33] border border-[#1c2b48]"
                title="Exit Evacuation Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {currentSegment && (
            <div className="bg-[#090f1d] p-3 rounded-lg border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/40">
                    STEP {currentStepIndex + 1} OF {totalSegments}
                  </span>
                  <span className="text-emerald-400 font-bold text-xs">
                    {currentSegment.distance_km} km • ~{currentSegment.travel_time_min} mins
                  </span>
                </div>
                <h3 className="text-white font-bold text-sm">
                  {currentSegment.instruction}
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Hazard: <strong className="text-emerald-400">{currentSegment.risk_score}/100</strong> • Road: <strong className="text-slate-200">{currentSegment.road_name}</strong>
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                  disabled={currentStepIndex === 0}
                  className="px-2.5 py-1.5 bg-[#121d33] hover:bg-[#182744] text-slate-300 rounded border border-[#1c2b48] text-xs font-bold disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentStepIndex(Math.min(totalSegments - 1, currentStepIndex + 1))}
                  disabled={currentStepIndex === totalSegments - 1}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded border border-emerald-500/60 text-xs font-bold flex items-center gap-1 disabled:opacity-40"
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
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-3.5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-neutral-200 font-bold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Live Road Path & Hazard Overlay
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-3 h-1 bg-emerald-500 rounded" />
                  Navigation Route
                </span>
              </div>
            </div>

            <div className="w-full h-[460px] lg:h-[500px] xl:h-[540px] rounded-xl overflow-hidden border border-[#1a1a1a]">
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
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-white uppercase">ROUTE SUMMARY</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                    {routeResult.safe_route.safety_level}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#0f0f0f] p-2 rounded-xl border border-[#1e1e1e] text-center">
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-neutral-400 block">TOTAL DIST</span>
                    <strong className="text-xs sm:text-sm text-white">{routeResult.safe_route.distance_km} km</strong>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-neutral-400 block">EST. TIME</span>
                    <strong className="text-xs sm:text-sm text-white">{routeResult.safe_route.travel_time_min} min</strong>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-neutral-400 block">MAX SLOPE</span>
                    <strong className="text-xs sm:text-sm text-emerald-400">{routeResult.safe_route.max_slope_deg || 3.5}°</strong>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                  {routeResult.comparison.explanation}
                </p>

                {/* Evacuation Mode CTA */}
                <button
                  onClick={() => setIsEvacuating(true)}
                  className={`w-full py-2 rounded-xl text-xs font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                    isEvacuating
                      ? 'bg-[#181818] text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isEvacuating ? 'EVACUATION GUIDANCE ACTIVE' : 'START EVACUATION'}</span>
                </button>
              </div>

              {/* Turn Steps List */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-3.5 shadow-sm space-y-2 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase">
                  <span>Turn-by-Turn Maneuvers</span>
                  <span>{routeResult.safe_route.segments.length} STEPS</span>
                </div>

                <div className="space-y-1.5 max-h-[220px] lg:max-h-[260px] overflow-y-auto pr-1">
                  {routeResult.safe_route.segments.map((seg, idx) => (
                    <div
                      key={idx}
                      onClick={() => { setIsEvacuating(true); setCurrentStepIndex(idx); }}
                      className={`p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isEvacuating && currentStepIndex === idx
                          ? 'bg-[#181818] border-emerald-500 text-white'
                          : 'bg-[#0f0f0f] border-[#1e1e1e] hover:bg-[#151515]'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] px-1 bg-[#1a1a1a] text-emerald-400 rounded">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-neutral-200 truncate">{seg.instruction || `${seg.from_name} → ${seg.to_name}`}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 block pl-4 font-sans truncate">{seg.road_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-300 shrink-0 ml-2">
                        {seg.distance_km} km
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 h-full min-h-[460px] flex flex-col justify-center items-center text-center space-y-3 text-neutral-400 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#121212] border border-[#222222] flex items-center justify-center text-emerald-400">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Safe Route Planner Ready</h3>
              <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                Enter your start location and destination above, then click <strong>Calculate Safe Route</strong> to compute hazard-avoiding evacuation corridors.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
