import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { useTheme } from '../context/ThemeContext';
import { LeafletRiskMap } from '../components/map/LeafletRiskMap';
import { 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight,
  Mountain,
  Navigation,
  MapPin,
  ChevronRight,
  Compass,
  Crosshair
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { normalizeWeather } from '../utils/weatherNormalizer';
import { DataSourcesPanel } from '../components/common/DataSourcesPanel';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';

export const OverviewPage = () => {
  const navigate = useNavigate();
  const { zones, reports, alerts, selectedZone, setSelectedZone } = useEmergency();
  const { location, weather: intelWeather, requestLocation } = useLocationIntelligence();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  const awarenessTips = [
    {
      title: 'Monsoon Precautions',
      text: 'Stay alert during heavy rainfall. Avoid steep slopes and follow regional safety advisories.'
    },
    {
      title: 'Structural Watch',
      text: 'Check for new tension cracks in building foundations, retaining walls, and mountain roadways.'
    },
    {
      title: 'Evacuation Readiness',
      text: 'Keep emergency grab-bags packed and identify high-elevation designated safe relief centers.'
    }
  ];

  return (
    <div className="space-y-5 w-full select-none pb-8">
      
      {/* Dynamic Weather & Atmospheric Condition Banner */}
      {(() => {
        const activeZone = selectedZone || (zones && zones[0]);
        const hasZoneWeather = activeZone && (typeof activeZone.temperature_c === 'number' || typeof activeZone.weather_code === 'number');
        const weather = hasZoneWeather ? normalizeWeather(activeZone) : (intelWeather?.normalized || normalizeWeather(activeZone));
        if (!weather) return null;

        const darkThemeStyles = {
          snow: {
            border: 'border-cyan-500/40 bg-gradient-to-r from-sky-950/80 via-[#0a1828]/90 to-[#050c14]/90 shadow-cyan-500/10',
            text: 'text-cyan-300',
            glow: 'bg-cyan-400/10'
          },
          clear_cold: {
            border: 'border-sky-400/40 bg-gradient-to-r from-slate-950/90 via-[#071322]/90 to-[#040810]/90 shadow-sky-400/10',
            text: 'text-sky-300',
            glow: 'bg-sky-400/10'
          },
          thunderstorm: {
            border: 'border-indigo-500/40 bg-gradient-to-r from-indigo-950/80 via-[#100824]/90 to-[#060310]/90 shadow-indigo-500/10',
            text: 'text-indigo-400',
            glow: 'bg-indigo-500/15'
          },
          rain: {
            border: 'border-sky-500/40 bg-gradient-to-r from-sky-950/80 via-[#071424]/90 to-[#030810]/90 shadow-sky-500/10',
            text: 'text-sky-400',
            glow: 'bg-sky-500/10'
          },
          cloudy: {
            border: 'border-slate-500/40 bg-gradient-to-r from-slate-900/80 via-[#121820]/90 to-[#0a0d12]/90',
            text: 'text-slate-300',
            glow: 'bg-slate-400/10'
          },
          fog: {
            border: 'border-slate-400/40 bg-gradient-to-r from-slate-900/80 via-[#14181c]/90 to-[#0a0c0e]/90',
            text: 'text-slate-200',
            glow: 'bg-slate-300/10'
          },
          clear_night: {
            border: 'border-indigo-500/30 bg-gradient-to-r from-indigo-950/70 via-[#080b18]/90 to-[#030408]/90',
            text: 'text-indigo-300',
            glow: 'bg-indigo-500/10'
          },
          sunny: {
            border: 'border-amber-500/40 bg-gradient-to-r from-amber-950/80 via-[#1c1206]/90 to-[#0c0803]/90 shadow-amber-500/10',
            text: 'text-amber-400',
            glow: 'bg-amber-500/15'
          },
          loading: {
            border: 'border-neutral-700/40 bg-neutral-900/60',
            text: 'text-neutral-400',
            glow: 'bg-neutral-500/5'
          },
          neutral: {
            border: 'border-neutral-700/40 bg-neutral-900/60',
            text: 'text-neutral-300',
            glow: 'bg-neutral-500/5'
          }
        };

        const lightThemeStyles = {
          snow: {
            border: 'border-cyan-300 bg-gradient-to-r from-cyan-50 via-sky-50 to-white shadow-sm',
            text: 'text-cyan-800',
            glow: 'bg-cyan-200/30'
          },
          clear_cold: {
            border: 'border-sky-300 bg-gradient-to-r from-sky-50 via-blue-50 to-white shadow-sm',
            text: 'text-sky-800',
            glow: 'bg-sky-200/30'
          },
          thunderstorm: {
            border: 'border-indigo-300 bg-gradient-to-r from-indigo-50 via-purple-50 to-white shadow-sm',
            text: 'text-indigo-900',
            glow: 'bg-indigo-200/30'
          },
          rain: {
            border: 'border-sky-300 bg-gradient-to-r from-sky-50 via-blue-50 to-white shadow-sm',
            text: 'text-sky-800',
            glow: 'bg-sky-200/30'
          },
          cloudy: {
            border: 'border-slate-300 bg-gradient-to-r from-slate-100 via-gray-50 to-white shadow-sm',
            text: 'text-slate-800',
            glow: 'bg-slate-200/30'
          },
          fog: {
            border: 'border-slate-300 bg-gradient-to-r from-slate-100 via-zinc-50 to-white shadow-sm',
            text: 'text-slate-800',
            glow: 'bg-slate-200/30'
          },
          clear_night: {
            border: 'border-indigo-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-white shadow-sm',
            text: 'text-indigo-900',
            glow: 'bg-indigo-200/30'
          },
          sunny: {
            border: 'border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50/50 shadow-sm',
            text: 'text-amber-800',
            glow: 'bg-amber-200/30'
          },
          loading: {
            border: 'border-slate-200 bg-slate-50',
            text: 'text-slate-600',
            glow: 'bg-slate-100'
          },
          neutral: {
            border: 'border-slate-200 bg-slate-50',
            text: 'text-slate-800',
            glow: 'bg-slate-100'
          }
        };

        const themeStyles = isLight ? lightThemeStyles : darkThemeStyles;
        const currentStyle = themeStyles[weather.theme] || themeStyles.neutral;
        const locationName = (hasZoneWeather && activeZone?.name) || location?.displayName || activeZone?.name || activeZone?.formatted_address || 'Selected Sector';

        return (
          <div className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md ${currentStyle.border}`}>
            
            {/* Ambient Weather Glow Particle in Corner */}
            <div className={`absolute -right-10 -top-10 w-64 h-64 rounded-full blur-3xl pointer-events-none ${currentStyle.glow}`} />

            {/* Subtle In-Banner Snow Particles for Snow/Cold */}
            {(weather.theme === 'snow' || weather.theme === 'clear_cold') && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-white animate-snow-fall shadow-[0_0_4px_white]"
                    style={{
                      left: `${(i * 8.5) % 100}%`,
                      top: `-10px`,
                      animationDuration: `${2.5 + (i % 4) * 0.7}s`,
                      animationDelay: `${(i * 0.2) % 2}s`,
                      animationIterationCount: 'infinite'
                    }}
                  />
                ))}
              </div>
            )}

            {/* Subtle In-Banner Rain Streaks for Rain */}
            {weather.theme === 'rain' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
                {[...Array(16)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[1px] h-6 bg-gradient-to-b from-transparent to-sky-300 rounded-full animate-rain-drop"
                    style={{
                      left: `${(i * 6.2) % 100}%`,
                      top: `-20px`,
                      animationDuration: `${0.6 + (i % 4) * 0.15}s`,
                      animationDelay: `${(i * 0.1) % 1.2}s`,
                      animationIterationCount: 'infinite'
                    }}
                  />
                ))}
              </div>
            )}

            {/* Subtle In-Banner Sun Disc for Clear Sunny */}
            {weather.theme === 'sunny' && (
              <div className="absolute top-2 right-4 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/20 via-orange-500/10 to-transparent blur-xl pointer-events-none animate-sun-pulse" />
            )}

            {/* Banner Left: Icon & Core Condition Telemetry */}
            <div className="relative z-10 flex items-center gap-3.5 sm:gap-4">
              <div className="text-3xl sm:text-4xl p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                {weather.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs sm:text-sm font-black uppercase tracking-wider ${currentStyle.text}`}>
                    {weather.label}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/60 border border-white/15 text-white font-mono font-bold tracking-tight shadow-sm">
                    {weather.tempFormatted}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium mt-1 flex-wrap">
                  <span>Location: <span className="text-white font-bold">{locationName}</span></span>
                  <button
                    onClick={requestLocation}
                    disabled={location?.loading}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] text-neutral-200 transition-colors font-sans"
                    title="Detect live browser GPS"
                  >
                    <Crosshair className={`w-3 h-3 ${location?.loading ? 'animate-spin text-amber-400' : (location?.isGps ? 'text-emerald-400' : 'text-neutral-300')}`} />
                    <span>{location?.loading ? 'Locating...' : (location?.isGps ? 'Live GPS' : 'Locate')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Banner Right: Precipitation, Humidity, and Telemetry Provenance */}
            <div className="relative z-10 flex items-center gap-4 text-xs text-neutral-400 self-start sm:self-center bg-black/40 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md shadow-sm">
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-medium">24h Precipitation</span>
                <span className={`font-mono font-bold ${weather.rain24h > 20 ? 'text-amber-400' : 'text-white'}`}>
                  {weather.rain24h.toFixed(1)} mm
                </span>
              </div>
              <div className="w-[1px] h-6 bg-white/10" />
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-medium">Humidity</span>
                <span className="font-mono font-bold text-white">
                  {weather.humidity !== null ? `${weather.humidity}%` : '—'}
                </span>
              </div>
              <div className="w-[1px] h-6 bg-white/10" />
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-medium">Satellite Grid</span>
                <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main 2-Column Balanced Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch w-full">
        
        {/* ═══════════════════════════════════════════════════════════
            LEFT COLUMN: GIS Map Overview & Recent Alerts (~ 65% width)
            ═══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* Card 1: GIS Map Overview */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 flex flex-col relative shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-bold text-white font-sans">
                  GIS Hazard Map Overview {selectedZone?.name ? `— ${selectedZone.name}` : ''}
                </h2>
              </div>
              <Link
                to="/risk-map"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <span>Full Screen Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Satellite / Terrain Heatmap Viewport (No API Key Required) */}
            <div className="w-full h-[480px] sm:h-[520px] rounded-xl overflow-hidden relative border border-[#1a1a1a]">
              <LeafletRiskMap
                zones={zones}
                selectedZone={selectedZone}
                onSelectZone={(zone) => setSelectedZone(zone)}
                reports={reports}
                alerts={alerts}
                height="100%"
              />
            </div>
          </div>

          {/* Card 2: Recent Alerts Card Below Map */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold text-white font-sans">
                  Active Threat Advisories
                </h2>
              </div>
              <Link
                to="/alerts"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View All Alerts
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Alert Card 1 */}
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] p-4 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      High Risk Alert
                    </span>
                    <span className="text-[10px] text-neutral-500">10m ago</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-snug">
                    Kangra Valley Road Section — Rock debris movement detected.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>Kangra, HP</span>
                  </span>
                  <Link
                    to="/risk-map"
                    className="px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg transition-colors"
                  >
                    View on Map
                  </Link>
                </div>
              </div>

              {/* Alert Card 2 */}
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] p-4 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Moderate Risk Advisory
                    </span>
                    <span className="text-[10px] text-neutral-500">25m ago</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-snug">
                    Shimla Bypass NH-5 — Heavy saturation on road shoulder.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    <span>Shimla, HP</span>
                  </span>
                  <button
                    onClick={() => navigate('/safe-route')}
                    className="px-3 py-1 bg-[#181818] hover:bg-[#222222] border border-[#262626] text-neutral-300 hover:text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Get Route
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            RIGHT COLUMN: ML Prediction & Monitored Zones (~ 35% width)
            ═══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          
          {/* Card A: ML Model Prediction (Dynamically synced to Selected Location) */}
          {(() => {
            const currentZone = selectedZone || (zones && zones[0]) || {
              name: 'Selected Sector',
              risk_score: 15.0,
              risk_level: 'Low Risk',
              rainfall_24h: 0.0,
              slope_deg: 5.0
            };

            const score = typeof currentZone.risk_score === 'number' 
              ? currentZone.risk_score 
              : (typeof currentZone.ml_base_score === 'number' ? currentZone.ml_base_score : 15.0);
            
            const isCrit = score >= 80;
            const isHigh = score >= 60 && score < 80;
            const isMod = score >= 35 && score < 60;
            
            const riskText = currentZone.risk_level || (isCrit ? 'Critical Risk' : isHigh ? 'High Risk' : isMod ? 'Moderate Risk' : 'Low Risk');
            const textColor = isCrit ? 'text-red-400' : isHigh ? 'text-orange-400' : isMod ? 'text-amber-400' : 'text-emerald-400';
            const bgColor = isCrit ? 'bg-red-500' : isHigh ? 'bg-orange-500' : isMod ? 'bg-amber-500' : 'bg-emerald-500';
            const pingBorder = isCrit ? 'bg-red-500/10 border-red-500/20' : isHigh ? 'bg-orange-500/10 border-orange-500/20' : isMod ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20';
            const circleBorder = isCrit ? 'bg-red-500/20 border-red-500/40' : isHigh ? 'bg-orange-500/20 border-orange-500/40' : isMod ? 'bg-amber-500/20 border-amber-500/40' : 'bg-emerald-500/20 border-emerald-500/40';

            const locName = currentZone.name || currentZone.formatted_address || currentZone.district || 'Selected Location';
            const rainVal = typeof currentZone.rainfall_24h === 'number' ? `${currentZone.rainfall_24h.toFixed(1)} mm` : '0.0 mm';
            const slopeVal = typeof currentZone.slope_deg === 'number' ? `${currentZone.slope_deg.toFixed(1)}°` : '0.0°';

            return (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#181818]">
                    <h2 className="text-sm font-bold text-white font-sans">
                      ML Risk Assessment
                    </h2>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                      Calibrated Model
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className={`text-base font-extrabold ${textColor} block font-sans`}>
                        {riskText}
                      </span>
                      <span className="text-[10px] text-neutral-400 block uppercase tracking-tight mt-0.5 font-medium">
                        System Landslide Risk Score
                      </span>
                      <span className="text-3xl font-black text-white font-sans mt-0.5 block font-mono">
                        {score.toFixed(1)} <span className="text-sm text-neutral-400 font-normal">/ 100</span>
                      </span>
                    </div>

                    {/* Radar / Pulse Graphic */}
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <span className={`absolute w-14 h-14 rounded-full border animate-ping ${pingBorder}`} />
                      <span className={`absolute w-10 h-10 rounded-full border ${circleBorder}`} />
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg ${bgColor}`}>
                        <Activity className="w-3 h-3 text-white" />
                      </span>
                    </div>
                  </div>

                  {/* Clean Label / Value List */}
                  <div className="mt-4 space-y-2.5 text-xs border-t border-[#181818] pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-400 shrink-0">Target Location</span>
                      <span className="font-semibold text-white truncate text-right">{locName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Rainfall (24h)</span>
                      <span className={`font-semibold font-mono ${currentZone.rainfall_24h > 30 ? 'text-amber-400' : 'text-neutral-200'}`}>{rainVal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Slope Gradient</span>
                      <span className={`font-semibold font-mono ${currentZone.slope_deg > 25 ? 'text-red-400' : 'text-neutral-200'}`}>{slopeVal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Model Architecture</span>
                      <span className="font-semibold text-neutral-200">Random Forest Regressor</span>
                    </div>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2 space-y-2">
                  <Link
                    to="/ml-model"
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.99]"
                  >
                    <span>View Full Factor Breakdown</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })()}

          {/* Card B: Monitored Risk Zones Quick Selector */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 space-y-3 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#181818]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Monitored Mountain Zones ({zones.length})
                </h3>
                <span className="text-[11px] text-emerald-400 font-medium font-mono">Live Radar Active</span>
              </div>

              <div className="space-y-2 mt-2 max-h-56 overflow-y-auto pr-1">
                {zones.slice(0, 5).map((zone) => {
                  const isHigh = zone.risk_score > 60;
                  const isCrit = zone.risk_score > 80;
                  return (
                    <div
                      key={zone.zone_id}
                      onClick={() => setSelectedZone(zone)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedZone?.zone_id === zone.zone_id
                          ? 'bg-[#181818] border-emerald-500 text-white'
                          : 'bg-[#0f0f0f] border-[#1e1e1e] text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-white">{zone.name}</div>
                        <div className="text-[10px] text-neutral-400">{zone.district ? `${zone.district}, ` : ''}{zone.state || 'Monitored Region'}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        isCrit ? 'bg-red-950/50 text-red-400' : isHigh ? 'bg-orange-950/50 text-orange-400' : 'bg-emerald-950/50 text-emerald-400'
                      }`}>
                        {zone.risk_score}/100
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => navigate('/safe-route')}
              className="w-full py-2.5 bg-[#121212] hover:bg-[#1a1a1a] border border-[#222222] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plan Safe Evacuation Route</span>
            </button>
          </div>

          {/* Card C: Awareness Advisory Card */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Mountain className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  {awarenessTips[activeTipIndex].title}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                  {awarenessTips[activeTipIndex].text}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {awarenessTips.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTipIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    activeTipIndex === idx ? 'w-3.5 bg-emerald-400' : 'bg-[#252525] hover:bg-[#333333]'
                  }`}
                  aria-label={`Tip ${idx + 1}`}
                />
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Authoritative Data Sources & Provenance Registry Panel */}
      <DataSourcesPanel />

    </div>
  );
};
