import React, { useMemo } from 'react';
import { useLocationIntelligence } from '../../context/LocationIntelligenceContext';
import { useEmergency } from '../../context/EmergencyContext';
import { useTheme } from '../../context/ThemeContext';
import { normalizeWeather, WEATHER_TYPES } from '../../utils/weatherNormalizer';

/**
 * LANDSAFE SIH 2026 - Real Weather-Driven Dynamic Atmospheric Background
 * Dynamically reflects the real meteorological conditions and astronomical day/night state
 * of the currently selected location (GPS or user-clicked map coordinates).
 * 
 * Features:
 * - 100% synchronized with LocationIntelligenceContext authoritative state
 * - Distinct Day and Night visual environments for Clear, Cloudy, Fog, Rain, Heavy Rain, Storm, Snow
 * - Smooth GPU-accelerated crossfade transitions
 * - Accessible: respects prefers-reduced-motion
 * - Sleek fallback ensuring screen is never a blank black void
 */
export const WeatherAtmosphericBackground = () => {
  const { weather: intelWeather, location } = useLocationIntelligence();
  const { selectedZone, zones } = useEmergency();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  // Authoritative weather: prioritize LocationIntelligenceContext (follows map-selected coordinates & GPS)
  const weather = useMemo(() => {
    if (intelWeather?.normalized && intelWeather.normalized.type !== WEATHER_TYPES.UNKNOWN) {
      return intelWeather.normalized;
    }
    const activeZone = selectedZone || (zones && zones[0]) || null;
    return normalizeWeather(activeZone);
  }, [intelWeather?.normalized, selectedZone, zones]);

  const isDay = weather.isDay !== undefined ? weather.isDay : true;
  const category = weather.category || 'unknown';

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-1000 ease-in-out"
      aria-hidden="true"
    >
      {/* Baseline Ambient Layer: Sleek modern atmospheric canvas so the app is NEVER a stark blank void */}
      <div 
        className={`absolute inset-0 transition-colors duration-1000 ${
          isLight 
            ? 'bg-gradient-to-b from-[#f1f5f9] via-[#f8fafc] to-[#ffffff]' 
            : isDay 
              ? 'bg-gradient-to-b from-[#0d1624] via-[#090f18] to-[#05080e]' 
              : 'bg-gradient-to-b from-[#090d18] via-[#050810] to-[#020308]'
        }`} 
      />

      {/* ═════════════════════════════════════════════════════════════════════
          1. CLEAR / SUNNY DAYLIGHT ENVIRONMENT
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'clear' && isDay && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className={`absolute inset-0 bg-gradient-to-br ${isLight ? 'from-[#fef3c7]/60 via-[#fffbeb]/40 to-transparent' : 'from-[#381e05]/70 via-[#1e1002]/80 to-[#080501]/90'}`} />
          <div className={`absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b ${isLight ? 'from-amber-300/30 via-amber-100/15 to-transparent' : 'from-orange-500/20 via-amber-500/10 to-transparent'}`} />

          {/* Luminous Solar Disc & Pulsing Corona at Top Right */}
          <div className="absolute -top-16 -right-16 w-96 h-96 flex items-center justify-center pointer-events-none">
            <div className={`absolute w-full h-full rounded-full bg-gradient-to-br ${isLight ? 'from-amber-300/50 via-yellow-200/40 to-transparent' : 'from-amber-400/40 via-orange-500/25 to-transparent'} blur-3xl animate-sun-pulse`} />
            <div className={`absolute w-72 h-72 rounded-full ${isLight ? 'bg-amber-300/40' : 'bg-amber-400/25'} blur-2xl`} />
            <div className="w-44 h-44 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-100 shadow-[0_0_120px_rgba(251,191,36,0.7)] opacity-90" />
          </div>

          {/* Floating Golden Dust Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fde047] animate-float-particle"
                style={{
                  left: `${(i * 5.1) % 100}%`,
                  top: `${12 + (i * 4.3) % 70}%`,
                  animationDuration: `${3.5 + (i % 4)}s`,
                  animationDelay: `${(i * 0.22) % 3}s`
                }}
              />
            ))}
          </div>

          <div className={`absolute top-12 left-12 w-[600px] h-32 ${isLight ? 'bg-white/40' : 'bg-amber-500/5'} rounded-full blur-3xl animate-cloud-drift`} />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          2. CLEAR NIGHT ENVIRONMENT (Moon & 48 Twinkling Stars)
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'clear' && !isDay && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1738] via-[#070c20] to-[#02040a]" />
          <div className="absolute top-10 right-1/4 w-[650px] h-[450px] bg-indigo-500/15 rounded-full blur-[130px]" />

          {/* Glowing Luminous Crescent Moon at Top Right */}
          <div className="absolute top-10 right-16 w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-200 to-white shadow-[0_0_70px_rgba(224,231,255,0.7)] opacity-90 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#070c20] -translate-x-2.5 -translate-y-1" />
          </div>

          {/* 48 Twinkling Stars */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(48)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-indigo-100 animate-star-twinkle shadow-[0_0_6px_#e0e7ff]"
                style={{
                  left: `${(i * 2.15) % 100}%`,
                  top: `${3 + (i * 2.1) % 85}%`,
                  animationDelay: `${(i * 0.15) % 3}s`,
                  animationDuration: `${2.8 + (i % 4) * 0.6}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          3. PARTLY CLOUDY DAY
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'partly_cloudy' && isDay && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-[#e0f2fe] via-[#f1f5f9] to-[#ffffff]' : 'from-[#142338] via-[#0d1624] to-[#060a12]'}`} />
          
          {/* Peeking Soft Sun Disc */}
          <div className="absolute top-4 right-20 w-44 h-44 rounded-full bg-amber-400/30 blur-2xl animate-sun-pulse" />
          <div className="absolute top-10 right-28 w-24 h-24 rounded-full bg-amber-200/50 blur-xl" />

          {/* Drifting Cloud Layers */}
          <div className={`absolute -top-10 -left-10 w-[750px] h-[320px] ${isLight ? 'bg-sky-200/50' : 'bg-slate-400/20'} rounded-full blur-[80px] animate-cloud-drift`} />
          <div className={`absolute top-20 right-10 w-[800px] h-[360px] ${isLight ? 'bg-slate-200/60' : 'bg-slate-500/15'} rounded-full blur-[90px] animate-cloud-drift-reverse`} />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          4. PARTLY CLOUDY NIGHT
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'partly_cloudy' && !isDay && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1329] via-[#060a18] to-[#020409]" />
          
          {/* Faint Moon Halo through Clouds */}
          <div className="absolute top-12 right-24 w-28 h-28 rounded-full bg-indigo-300/25 blur-2xl" />

          {/* Few Peek-Through Stars */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-indigo-200/70 animate-star-twinkle shadow-[0_0_4px_#c7d2fe]"
                style={{
                  left: `${(i * 4.2) % 100}%`,
                  top: `${5 + (i * 3.7) % 75}%`,
                  animationDelay: `${(i * 0.2) % 3}s`
                }}
              />
            ))}
          </div>

          {/* Dark Nocturnal Cloud Silhouettes */}
          <div className="absolute top-0 -left-20 w-[850px] h-[380px] bg-slate-900/60 rounded-full blur-[85px] animate-cloud-drift" />
          <div className="absolute top-28 right-0 w-[800px] h-[400px] bg-[#0c1328]/70 rounded-full blur-[100px] animate-cloud-drift-reverse" />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          5. CLOUDY / OVERCAST DAY
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'cloudy' && isDay && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-[#cbd5e1] via-[#e2e8f0] to-[#f8fafc]' : 'from-[#192433] via-[#0f1724] to-[#080d14]'}`} />
          <div className={`absolute -top-10 -left-20 w-[850px] h-[380px] ${isLight ? 'bg-slate-300/50' : 'bg-slate-400/25'} rounded-full blur-[90px] animate-cloud-drift`} />
          <div className={`absolute top-16 right-0 w-[900px] h-[420px] ${isLight ? 'bg-sky-200/40' : 'bg-slate-500/20'} rounded-full blur-[100px] animate-cloud-drift-reverse`} />
          <div className={`absolute bottom-0 inset-x-0 h-48 ${isLight ? 'bg-slate-200/40' : 'bg-slate-900/50'} blur-xl`} />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          6. CLOUDY / OVERCAST NIGHT
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'cloudy' && !isDay && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1d] via-[#060914] to-[#020308]" />
          <div className="absolute -top-20 inset-x-0 h-[450px] bg-slate-900/70 rounded-full blur-[110px] animate-cloud-drift" />
          <div className="absolute top-36 -right-20 w-[850px] h-[400px] bg-[#0c1424]/60 rounded-full blur-[100px] animate-cloud-drift-reverse" />
          <div className="absolute bottom-0 inset-x-0 h-48 bg-slate-950/80 blur-xl" />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          7. FOG / MIST (Day vs Night)
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'fog' && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className={`absolute inset-0 bg-gradient-to-b ${
            isDay 
              ? (isLight ? 'from-[#cbd5e1] via-[#e2e8f0] to-[#f8fafc]' : 'from-[#1c2633] via-[#121922] to-[#090e14]')
              : 'from-[#101620] via-[#090d14] to-[#030508]'
          }`} />
          <div className={`absolute top-10 inset-x-0 h-96 ${isDay ? 'bg-slate-300/30' : 'bg-slate-600/15'} blur-[100px] animate-cloud-drift`} />
          <div className={`absolute bottom-10 inset-x-0 h-80 ${isDay ? 'bg-slate-400/25' : 'bg-slate-700/15'} blur-[90px] animate-cloud-drift-reverse`} />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          8. RAIN / DRIZZLE (Day vs Night with 64 Falling Drops)
          ═════════════════════════════════════════════════════════════════════ */}
      {(category === 'rain' || category === 'drizzle') && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className={`absolute inset-0 bg-gradient-to-b ${
            isDay
              ? (isLight ? 'from-[#e0f2fe] via-[#e2e8f0] to-[#f8fafc]' : 'from-[#0e2c4a] via-[#081b2e] to-[#030a13]')
              : 'from-[#08182b] via-[#050e1a] to-[#02050b]'
          }`} />
          <div className={`absolute -top-20 left-1/3 w-[850px] h-[550px] ${isDay ? 'bg-sky-500/20' : 'bg-sky-700/15'} rounded-full blur-[140px]`} />

          {/* 64 Visible Falling Rain Streaks */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(64)].map((_, i) => {
              const leftPos = (i * 1.58) % 100;
              const duration = 0.65 + (i % 5) * 0.12;
              const delay = (i * 0.05) % 1.5;
              const height = 36 + (i % 6) * 14;
              return (
                <div
                  key={i}
                  className={`absolute w-[2px] ${
                    isDay 
                      ? (isLight ? 'bg-gradient-to-b from-transparent via-sky-500 to-sky-600 shadow-[0_0_4px_rgba(14,165,233,0.8)]' : 'bg-gradient-to-b from-transparent via-sky-300 to-sky-100 shadow-[0_0_5px_rgba(56,189,248,0.9)]')
                      : 'bg-gradient-to-b from-transparent via-sky-400/80 to-sky-200 shadow-[0_0_4px_rgba(56,189,248,0.7)]'
                  } rounded-full animate-rain-drop`}
                  style={{
                    height: `${height}px`,
                    left: `${leftPos}%`,
                    top: `-${height + 20}px`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    animationIterationCount: 'infinite'
                  }}
                />
              );
            })}
          </div>

          <div className={`absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t ${isDay ? 'from-sky-950/40' : 'from-slate-950/70'} to-transparent blur-md`} />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          9. HEAVY RAIN (Day vs Night with 72 Rapid Rain Streaks)
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'heavy_rain' && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className={`absolute inset-0 bg-gradient-to-b ${
            isDay 
              ? 'from-[#0a233b] via-[#061626] to-[#02070e]' 
              : 'from-[#05111e] via-[#030a13] to-[#010307]'
          }`} />
          <div className="absolute -top-20 left-1/4 w-[900px] h-[600px] bg-sky-700/20 rounded-full blur-[140px]" />

          {/* 72 Fast Torrential Rain Streaks */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(72)].map((_, i) => {
              const leftPos = (i * 1.39) % 100;
              const duration = 0.48 + (i % 4) * 0.08;
              const delay = (i * 0.035) % 1.2;
              const height = 50 + (i % 6) * 16;
              return (
                <div
                  key={i}
                  className="absolute w-[2.2px] bg-gradient-to-b from-transparent via-sky-300 to-white shadow-[0_0_5px_rgba(186,230,253,0.9)] rounded-full animate-rain-drop"
                  style={{
                    height: `${height}px`,
                    left: `${leftPos}%`,
                    top: `-${height + 30}px`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    animationIterationCount: 'infinite'
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          10. THUNDERSTORM (Day vs Night with Animated Lightning Flashes)
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'thunderstorm' && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className={`absolute inset-0 bg-gradient-to-b ${
            isDay 
              ? 'from-[#241148] via-[#140a2b] to-[#05020d]' 
              : 'from-[#170933] via-[#0c041c] to-[#030108]'
          }`} />
          <div className="absolute -top-32 left-1/4 w-[900px] h-[600px] bg-indigo-600/30 rounded-full blur-[150px]" />
          
          {/* Animated Atmospheric Lightning Flash */}
          <div className="absolute inset-0 bg-indigo-200/40 animate-lightning pointer-events-none" />

          {/* Heavy Storm Rain Streaks */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(72)].map((_, i) => {
              const leftPos = (i * 1.4) % 100;
              const duration = 0.42 + (i % 4) * 0.08;
              const delay = (i * 0.04) % 1.1;
              const height = 48 + (i % 6) * 18;
              return (
                <div
                  key={i}
                  className="absolute w-[2.5px] bg-gradient-to-b from-transparent via-indigo-200 to-white shadow-[0_0_6px_rgba(199,210,254,1)] rounded-full animate-rain-drop"
                  style={{
                    height: `${height}px`,
                    left: `${leftPos}%`,
                    top: `-${height + 30}px`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    animationIterationCount: 'infinite'
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          11. SNOWFALL / ARCTIC COLD (56 Animated Snowflakes)
          ═════════════════════════════════════════════════════════════════════ */}
      {category === 'snow' && (
        <div className="absolute inset-0 animate-in fade-in duration-1000 transition-opacity">
          <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-[#e0f2fe] via-[#f0f9ff] to-[#f8fafc]' : 'from-[#0e2a44] via-[#08182b] to-[#030912]'}`} />
          <div className={`absolute -top-20 left-10 w-[600px] h-[400px] ${isLight ? 'bg-sky-400/20' : 'bg-cyan-400/20'} rounded-full blur-[100px]`} />
          <div className={`absolute top-0 right-10 w-[700px] h-[450px] ${isLight ? 'bg-cyan-300/25' : 'bg-sky-300/15'} rounded-full blur-[120px]`} />

          {/* 56 Animated Falling Snowflakes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(56)].map((_, i) => {
              const leftPos = (i * 1.8) % 100;
              const duration = 3.2 + (i % 6) * 0.7;
              const delay = (i * 0.12) % 2.5;
              const size = 3 + (i % 5) * 1.8;
              return (
                <div
                  key={i}
                  className={`absolute rounded-full ${isLight ? 'bg-sky-500/80 shadow-[0_0_6px_rgba(14,165,233,0.6)]' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,1)]'} animate-snow-fall`}
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    left: `${leftPos}%`,
                    top: `-20px`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    animationIterationCount: 'infinite'
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          12. High-Tech Geodetic Grid Mesh Overlay (Preserves Legibility)
          ═════════════════════════════════════════════════════════════════════ */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.45) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  );
};

export default WeatherAtmosphericBackground;
