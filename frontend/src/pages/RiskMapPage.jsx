import React, { useState, useEffect } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';
import { LeafletRiskMap } from '../components/map/LeafletRiskMap';
import { ZoneTelemetryDrawer } from '../components/map/ZoneTelemetryDrawer';
import { GLOBAL_GEOGRAPHY } from '../data/globalGeographicHierarchy';
import { api } from '../services/api';
import { 
  Map as MapIcon, 
  Search, 
  Globe, 
  Compass, 
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { getRiskScoreColor } from '../utils/formatters';

export const RiskMapPage = () => {
  const { zones, selectedZone, setSelectedZone, reports } = useEmergency();
  const { inspectCoordinates } = useLocationIntelligence();

  // Hierarchy filter state
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [selectedState, setSelectedState] = useState('Meghalaya');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Map camera state
  const [mapCenter, setMapCenter] = useState([25.5788, 91.8933]); // Meghalaya default
  const [mapZoom, setMapZoom] = useState(9);

  const countriesList = Object.keys(GLOBAL_GEOGRAPHY);
  const currentStates = GLOBAL_GEOGRAPHY[selectedCountry]?.states || {};
  const statesList = Object.keys(currentStates);
  const levelsList = ['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

  // Handle Country selection change
  const handleCountryChange = (countryName) => {
    setSelectedCountry(countryName);
    const countryData = GLOBAL_GEOGRAPHY[countryName];
    if (countryData) {
      const firstStateName = Object.keys(countryData.states || {})[0] || 'ALL';
      setSelectedState(firstStateName);

      if (firstStateName !== 'ALL' && countryData.states[firstStateName]) {
        const sData = countryData.states[firstStateName];
        setMapCenter(sData.center);
        setMapZoom(sData.zoom);
        triggerLocationInspection(sData.center[0], sData.center[1], `${firstStateName}, ${countryName}`);
      } else {
        setMapCenter(countryData.center);
        setMapZoom(countryData.zoom);
      }
    }
  };

  // Handle State selection change
  const handleStateChange = (stateName) => {
    setSelectedState(stateName);
    const stateData = currentStates[stateName];
    if (stateData) {
      setMapCenter(stateData.center);
      setMapZoom(stateData.zoom);
      triggerLocationInspection(stateData.center[0], stateData.center[1], `${stateName}, ${selectedCountry}`);
    }
  };

  // Query live real-world telemetry for the selected state and show in drawer
  const triggerLocationInspection = async (lat, lng, label) => {
    try {
      if (inspectCoordinates) {
        inspectCoordinates(lat, lng, label);
      }
      const liveData = await api.inspectTelemetry(lat, lng);
      if (liveData) {
        setSelectedZone(liveData);
      }
    } catch (e) {
      console.warn('Could not inspect telemetry for state:', label, e);
    }
  };

  // Initial load: center on Meghalaya and inspect telemetry
  useEffect(() => {
    const defaultState = GLOBAL_GEOGRAPHY['India']?.states['Meghalaya'];
    if (defaultState) {
      setMapCenter(defaultState.center);
      setMapZoom(defaultState.zoom);
      triggerLocationInspection(defaultState.center[0], defaultState.center[1], 'Meghalaya, India');
    }
  }, []);

  // Filtered zones matching search / state / level
  const filteredZones = zones.filter((z) => {
    const matchesSearch = !searchQuery.trim() || 
      z.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      z.zone_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.district?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesState = selectedState === 'ALL' || 
      z.state?.toLowerCase().includes(selectedState.toLowerCase()) ||
      selectedState.toLowerCase().includes(z.state?.toLowerCase() || '');

    const matchesLevel = selectedLevel === 'ALL' || z.risk_level === selectedLevel;

    return matchesSearch && (selectedCountry !== 'India' || matchesState) && matchesLevel;
  });

  return (
    <div className="space-y-4">
      {/* Top Filter Console */}
      <div className="bg-[#111111] border border-[#262626] p-3.5 rounded-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#262626] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-100">
                Landslide Hazard GIS Risk Map
              </h1>
              <p className="text-xs text-neutral-400">
                Geographic hierarchy filters, machine learning hazard polygons, and real-time environmental satellite telemetry
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search zone, road, district..."
              className="bg-[#151515] border border-[#262626] rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-sky-500 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Cascade Dropdowns: Country -> State -> Risk Level */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          
          {/* 1. Country Selector */}
          <div className="flex items-center gap-1.5 bg-[#151515] px-2.5 py-1.5 rounded-md border border-[#262626]">
            <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-neutral-400 text-xs font-medium">Country:</span>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="bg-transparent text-neutral-100 font-semibold focus:outline-none cursor-pointer"
            >
              {countriesList.map((c) => (
                <option key={c} value={c} className="bg-[#161B22] text-neutral-100">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-neutral-600 hidden sm:block" />

          {/* 2. State / Province Selector */}
          <div className="flex items-center gap-1.5 bg-[#151515] px-2.5 py-1.5 rounded-md border border-[#262626]">
            <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-neutral-400 text-xs font-medium">State:</span>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="bg-transparent text-neutral-100 font-semibold focus:outline-none cursor-pointer max-w-[200px]"
            >
              {statesList.map((s) => (
                <option key={s} value={s} className="bg-[#161B22] text-neutral-100">
                  {s} {currentStates[s]?.region ? `(${currentStates[s].region.split(' ')[0]})` : ''}
                </option>
              ))}
            </select>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-neutral-600 hidden sm:block" />

          {/* 3. Risk Level Filter */}
          <div className="flex items-center gap-1.5 bg-[#151515] px-2.5 py-1.5 rounded-md border border-[#262626]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-neutral-400 text-xs font-medium">Risk Level:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-transparent text-amber-400 font-semibold focus:outline-none cursor-pointer"
            >
              {levelsList.map((lvl) => (
                <option key={lvl} value={lvl} className="bg-[#161B22] text-neutral-100">
                  {lvl === 'ALL' ? 'All Risk Levels' : `${lvl} Level`}
                </option>
              ))}
            </select>
          </div>

          {/* Active Target Label */}
          <div className="ml-auto hidden xl:flex items-center gap-1.5 text-xs text-sky-400 bg-sky-950/30 border border-sky-600/30 px-2.5 py-1 rounded-md">
            <span>Target: <strong>{selectedState}, {selectedCountry}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Map & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Main GIS Map (67%) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-[#111111] border border-[#262626] rounded-2xl p-3.5 flex flex-col shadow-sm h-full">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-neutral-200 font-semibold flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Geospatial Risk Layer & Hazard Zones</span>
              </span>
              <span className="text-xs text-neutral-400">
                Click map or sector polygon to inspect
              </span>
            </div>

            <div className="w-full h-[460px] lg:h-[500px] xl:h-[540px] rounded-xl overflow-hidden">
              <LeafletRiskMap
                zones={filteredZones}
                selectedZone={selectedZone}
                onSelectZone={(zone) => setSelectedZone(zone)}
                reports={reports}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                height="100%"
              />
            </div>
          </div>
        </div>

        {/* Side Inspector Drawer (33%) */}
        <div className="lg:col-span-4 flex flex-col h-[460px] lg:h-[500px] xl:h-[540px]">
          {selectedZone ? (
            <div className="h-full overflow-y-auto">
              <ZoneTelemetryDrawer
                zone={selectedZone}
                onClose={() => setSelectedZone(null)}
              />
            </div>
          ) : (
            <div className="bg-[#111111] border border-[#262626] rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-neutral-500" />
              <h3 className="text-xs font-semibold text-neutral-200">No Sector Selected</h3>
              <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                Select a state from the dropdown or click anywhere on the GIS map to inspect live environmental telemetry.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Matching Zones Selection Strip */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold text-neutral-200">
            Monitored Hazard Corridors in {selectedState} ({filteredZones.length})
          </span>
          <span className="text-xs text-neutral-500">Click any sector to focus</span>
        </div>
        
        {filteredZones.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filteredZones.map((zone) => {
              const riskColor = getRiskScoreColor(zone.risk_score);
              const isSelected = selectedZone?.zone_id === zone.zone_id;
              return (
                <button
                  key={zone.zone_id}
                  onClick={() => {
                    setSelectedZone(zone);
                    if (zone.center) {
                      setMapCenter([zone.center.lat, zone.center.lng]);
                      setMapZoom(11);
                    }
                  }}
                  className={`px-3 py-2 rounded-md text-left border shrink-0 transition-all ${
                    isSelected
                      ? 'bg-[#1C1C1C] border-sky-400 text-white'
                      : 'bg-[#151515] border-[#262626] text-neutral-300 hover:bg-[#181818] hover:border-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-sky-400">{zone.zone_id}</span>
                    <span className="font-medium text-neutral-200">{zone.name.split(' ')[0]}</span>
                    <span className="font-mono font-bold" style={{ color: riskColor.hex }}>
                      {zone.risk_score}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-[140px]">
                    {zone.district} • {zone.state}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-neutral-400 py-1">
            No pre-defined risk corridors in {selectedState}. You can click anywhere on the map or use the search bar to query real-time satellite telemetry.
          </div>
        )}
      </div>
    </div>
  );
};
