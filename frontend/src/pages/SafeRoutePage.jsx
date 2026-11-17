import React, { useState, useEffect } from 'react';
import { toLabel } from '../utils/formatters';
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
import { PlaceSearch } from '../components/common/PlaceSearch';

export const SafeRoutePage = () => {
  const { t } = useLanguage();
  const { zones, reports } = useEmergency();
  const { userCoordinates } = useAuth();
  const { selectedLocation, requestLocation, location } = useLocationIntelligence();

  const [routingMode, setRoutingMode] = useState('global'); // 'global' | 'preset'
  
  // Start and destination: { lat, lng, name } chosen from the place search, or null
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);

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
      setDestCoords({ ...routeLocation.state.destCoords, name: routeLocation.state.destQuery || routeLocation.state.destCoords.name });
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

  // Road route between the chosen start and destination
  const handleExecuteGlobalRoute = async (origin = originCoords, dest = destCoords) => {
    if (!origin || !dest) {
      setErrorMsg('Choose a start and a destination.');
      return;
    }
    if (Math.abs(origin.lat - dest.lat) < 0.0001 && Math.abs(origin.lng - dest.lng) < 0.0001) {
      setErrorMsg('Start and destination are the same place.');
      return;
    }
    const seq = ++routeReqSeqRef.current;
    setCalculating(true);
    setErrorMsg(null);
    try {
      const res = await safeRouteApi.calculateGlobalRoute(origin.lat, origin.lng, dest.lat, dest.lng, origin.name, dest.name);
      if (seq !== routeReqSeqRef.current) return;
      setRouteResult(res);
      setCurrentStepIndex(0);
      setIsEvacuating(false);
    } catch (err) {
      if (seq !== routeReqSeqRef.current) return;
      setErrorMsg(err?.response?.data?.detail || err.message || 'Could not find a road route between these places.');
    } finally {
      if (seq === routeReqSeqRef.current) setCalculating(false);
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleExecuteGlobalRoute();
  };

  // Use the current location as the start
  const handleUseCurrentLocation = () => {
    if (location?.latitude && location?.longitude) {
      setOriginCoords({ lat: location.latitude, lng: location.longitude, name: location.displayName || 'My location' });
    } else {
      requestLocation();
    }
  };

  const handleSwapLocations = () => {
    setOriginCoords(destCoords);
    setDestCoords(originCoords);
  };

  // Start from the user's location when it is known
  useEffect(() => {
    if (!originCoords && location?.latitude && location?.longitude) {
      setOriginCoords({ lat: location.latitude, lng: location.longitude, name: location.displayName || 'My location' });
    }
  }, [location?.latitude, location?.longitude]);

  const toPoint = (p) => ({ lat: p.latitude, lng: p.longitude, name: p.label });

  const endpoint = (value, setValue, dotClass, placeholder) => (
    value ? (
      <div className="flex items-center gap-2 bg-surface-2 rounded-full px-3 py-2 min-w-0">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
        <span className="text-xs text-label truncate flex-1">{value.name}</span>
        <button type="button" onClick={() => setValue(null)} className="text-label-2 hover:text-label shrink-0" title="Change">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ) : (
      <PlaceSearch onSelect={(p) => setValue(toPoint(p))} placeholder={placeholder} />
    )
  );

  const currentSegment = routeResult?.safe_route?.segments?.[currentStepIndex];
  const totalSegments = routeResult?.safe_route?.segments?.length || 1;

  return (
    <div className="space-y-4">
      
      {/* Top Header & Search Console */}
      <div className="bg-surface-2 p-3.5 rounded-tile space-y-3">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-tile bg-risk-low/[0.12] border-risk-low/30 flex items-center justify-center text-risk-low">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-label">
                {t('routing_title') || 'Safe route'}
              </h1>
              <p className="text-xs text-label-2">
                {t('routing_subtitle') || 'Road routes, with the risk of monitored zones along the way'}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-surface-2 p-0.5 rounded-full text-xs">
            <button
              onClick={() => { setRoutingMode('global'); setIsEvacuating(false); }}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                routingMode === 'global' ? 'bg-label/[0.12] text-label font-semibold' : 'text-label-2 hover:text-label'
              }`}
            >
              {t('mode_worldwide') || 'Any place'}
            </button>
            <button
              onClick={() => { setRoutingMode('preset'); setIsEvacuating(false); }}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                routingMode === 'preset' ? 'bg-label/[0.12] text-label font-semibold' : 'text-label-2 hover:text-label'
              }`}
            >
              {t('mode_corridors') || 'Monitored roads'}
            </button>
          </div>
        </div>

        {/* Global Google Maps-Style Unified Route Search Bar */}
        {routingMode === 'global' ? (
          <form onSubmit={handleFormSubmit} className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              
              <div className="md:col-span-5 min-w-0">
                {endpoint(originCoords, setOriginCoords, 'bg-accent', t('start_location_placeholder') || 'Start')}
              </div>

              {/* Swap Button */}
              <div className="md:col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="p-1.5 rounded-full bg-surface-2 hover:bg-surface-2 text-label-2 hover:text-label transition-colors"
                  title={t('swap_locations') || 'Swap Origin and Destination'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="md:col-span-4 min-w-0">
                {endpoint(destCoords, setDestCoords, 'bg-risk-low', t('destination_placeholder') || 'Destination')}
              </div>

              {/* Route Action Button */}
              <div className="md:col-span-2 flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={calculating || !originCoords || !destCoords}
                  className="w-full py-1.5 px-3 bg-accent hover:opacity-90 disabled:opacity-50 text-white rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Navigation className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
                  <span>{calculating ? (t('routing_in_progress') || 'Calculating...') : (t('route_calculate_btn') || 'Route')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={calculating}
                  className="p-1.5 bg-surface-2 hover:bg-surface-2 text-label-2 hover:text-label rounded-full transition-colors shrink-0"
                  title={t('use_my_gps') || 'Use My Current GPS'}
                >
                  <Crosshair className="w-3.5 h-3.5 text-label-2" />
                </button>
              </div>
            </div>

          </form>
        ) : (
          /* Preset Corridor Dropdowns */
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-tile">
              <span className="text-label-2 text-xs">Origin:</span>
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

            <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1.5 rounded-tile">
              <span className="text-label-2 text-xs">Destination:</span>
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
              className="px-4 py-1.5 bg-surface-2 hover:opacity-90 text-label rounded-full whitespace-nowrap text-xs font-semibold transition-colors"
            >
              {calculating ? 'Analyzing...' : 'Recalculate'}
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-tile bg-risk-critical/[0.12] border-risk-critical/30 text-risk-critical text-xs tabular-nums flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-risk-critical shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Evacuation Guidance Mode HUD */}
      {isEvacuating && routeResult && (
        <div className="bg-surface-2 border-2 border-risk-low/30 p-4 rounded-tile animate-in fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-risk-low" />
              <div>
                <span className="text-xs font-semibold text-risk-low block">
                  Step-by-step guidance
                </span>
                <span className="text-label text-xs font-semibold">
                  Destination: {routeResult.destination?.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-risk-low/[0.12] text-risk-low border-risk-low/30">
                {routeResult.safe_route.distance_km} km • about {routeResult.safe_route.travel_time_min} min
              </span>
              <button
                onClick={() => setIsEvacuating(false)}
                className="p-1 text-label-2 hover:text-label rounded-full bg-surface-2"
                title="Exit Evacuation Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {currentSegment && (
            <div className="bg-surface-2 p-3 rounded-tile border-risk-low/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-surface-2 text-label-2">
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
                  Road: <strong className="text-label">{currentSegment.road_name}</strong>
                  {currentSegment.risk_score != null && <> • Risk: <strong className="text-label">{currentSegment.risk_score}/100</strong></>}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                  disabled={currentStepIndex === 0}
                  className="px-2.5 py-1.5 bg-surface-2 hover:opacity-90 text-label-2 rounded-full whitespace-nowrap text-xs font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentStepIndex(Math.min(totalSegments - 1, currentStepIndex + 1))}
                  disabled={currentStepIndex === totalSegments - 1}
                  className="px-3 py-1.5 bg-risk-low hover:opacity-90 text-white rounded-full whitespace-nowrap border-risk-low/30 text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                >
                  <span>Next step</span>
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
          <div className="bg-surface rounded-card p-3.5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-label font-semibold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-risk-low" />
                Route and risk zones
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-risk-low font-semibold">
                  <span className="w-3 h-1 bg-risk-low rounded" />
                  Navigation Route
                </span>
              </div>
            </div>

            <div className="w-full h-[460px] lg:h-[500px] xl:h-[540px] rounded-tile overflow-hidden">
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
              <div className="bg-surface rounded-card p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-risk-low" />
                    <span className="text-xs font-semibold text-label ">Route summary</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-risk-low/[0.12] text-risk-low border-risk-low/30">
                    {toLabel(routeResult.safe_route.safety_level)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-surface-2 p-2 rounded-tile text-center">
                  <div>
                    <span className="text-xs sm:text-xs text-label-2 block">Total dist</span>
                    <strong className="text-xs sm:text-sm text-label">{routeResult.safe_route.distance_km} km</strong>
                  </div>
                  <div>
                    <span className="text-xs sm:text-xs text-label-2 block">Est. time</span>
                    <strong className="text-xs sm:text-sm text-label">{routeResult.safe_route.travel_time_min} min</strong>
                  </div>
                  <div>
                    <span className="text-xs sm:text-xs text-label-2 block">Max slope</span>
                    <strong className="text-xs sm:text-sm text-label">{routeResult.safe_route.max_slope_deg != null ? `${routeResult.safe_route.max_slope_deg}°` : '—'}</strong>
                  </div>
                </div>

                <p className="text-xs text-label-2 font-sans leading-relaxed">
                  {routeResult.comparison.explanation}
                </p>

                {/* Evacuation Mode CTA */}
                {routeResult.safe_route.segments.length > 0 && <button
                  onClick={() => setIsEvacuating(true)}
                  className={`w-full py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isEvacuating
                      ? 'bg-surface-2 text-risk-low border border-accent/60'
                      : 'bg-accent hover:opacity-90 text-white '
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isEvacuating ? 'Guidance on' : 'Start step-by-step guidance'}</span>
                </button>}
              </div>

              {/* Turn Steps List */}
              <div className="bg-surface rounded-card p-3.5 space-y-2 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between text-xs text-label-2 font-semibold ">
                  <span>Turn-by-Turn Maneuvers</span>
                  <span>{routeResult.safe_route.segments.length} steps</span>
                </div>

                <div className="space-y-1.5 max-h-[220px] lg:max-h-[260px] overflow-y-auto pr-1">
                  {routeResult.safe_route.segments.length === 0 && (
                    <p className="text-xs text-label-2">Turn-by-turn steps are shown for routes up to 150 km.</p>
                  )}
                  {routeResult.safe_route.segments.map((seg, idx) => (
                    <div
                      key={idx}
                      onClick={() => { setIsEvacuating(true); setCurrentStepIndex(idx); }}
                      className={`p-2 rounded-tile border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isEvacuating && currentStepIndex === idx
                          ? 'bg-surface-2 border-risk-low/30 text-label'
                          : 'bg-surface-2 border-transparent hover:bg-surface-2'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="tabular-nums text-xs px-1 bg-surface-2 text-risk-low rounded-full">
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
            <div className="bg-surface rounded-card p-6 h-full min-h-[460px] flex flex-col justify-center items-center text-center space-y-3 text-label-2">
              <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-risk-low">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-label">Plan a route</h3>
              <p className="text-xs text-label-2 max-w-xs leading-relaxed">
                Choose a start and a destination above, then press <strong>Route</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
