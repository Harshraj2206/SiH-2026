import React, { useMemo } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { normalizeWeather, WEATHER_TYPES } from '../../utils/weatherNormalizer';

/**
 * LANDSAFE - Full-App Weather Atmospheric Background
 * Immediately and visibly transforms the visual environment according to the
 * real-time weather condition of the exact selected location.
 */
export const WeatherAtmosphericBackground = () => {
  const { selectedZone, zones } = useEmergency();

  const activeZone = selectedZone || (zones && zones[0]) || null;

  const weather = useMemo(() => {
    return normalizeWeather(activeZone);
  }, [activeZone]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-all duration-700 ease-in-out select-none">
      
      {/* ═════════════════════════════════════════════════════════════
          1. SNOWFALL / ARCTIC FREEZE / SUB-ZERO ENVIRONMENT
          (Antarctica, sub-zero regions, snowfall, blizzard)
          ═════════════════════════════════════════════════════════════ */}
      {(weather.type === WEATHER_TYPES.SNOW || 
        weather.type === WEATHER_TYPES.HEAVY_SNOW || 
        weather.type === WEATHER_TYPES.FREEZING_RAIN ||
        weather.type === WEATHER_TYPES.CLEAR_COLD) && (
        <div className="absolute inset-0 animate-in fade-in duration-700">
          {/* Glacial Ice Frost & Arctic Sky Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0e2a44] via-[#08182b] to-[#030912]" />
          
          {/* Aurora-like Cyan Frost Corona in Top Corners */}
          <div className="absolute -top-20 left-10 w-[600px] h-[400px] bg-cyan-400/20 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-10 w-[700px] h-[450px] bg-sky-300/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-cyan-950/40 via-sky-950/20 to-transparent blur-2xl" />

          {/* 50+ Real Visible Animated Falling Snowflakes */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(56)].map((_, i) => {
              const leftPos = (i * 1.8) % 100;
              const duration = 3.2 + (i % 6) * 0.7;
              const delay = (i * 0.12) % 2.5;
              const size = 3 + (i % 5) * 1.8;
              return (
                <div
                  key={i}
                  className="absolute rounded-full bg-white animate-snow-fall shadow-[0_0_8px_rgba(255,255,255,1)]"
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

          {/* Arctic Cold Ice Horizon Glow */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-cyan-300/20 via-sky-200/5 to-transparent blur-md" />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          2. OVERCAST & CLOUDY ENVIRONMENT
          (Overcast, dense cloud cover, partly cloudy)
          ═════════════════════════════════════════════════════════════ */}
      {(weather.type === WEATHER_TYPES.OVERCAST || 
        weather.type === WEATHER_TYPES.CLOUDY || 
        weather.type === WEATHER_TYPES.PARTLY_CLOUDY) && (
        <div className="absolute inset-0 animate-in fade-in duration-700">
          {/* Moody Slate Overcast Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#182333] via-[#0f1724] to-[#070b12]" />
          
          {/* Large Visible Drifting Cumulus Cloud Layers */}
          <div className="absolute -top-10 -left-20 w-[800px] h-[350px] bg-slate-400/25 rounded-full blur-[90px] animate-cloud-drift" />
          <div className="absolute top-16 right-0 w-[850px] h-[400px] bg-slate-300/20 rounded-full blur-[100px] animate-cloud-drift-reverse" />
          <div className="absolute top-48 left-1/4 w-[650px] h-[300px] bg-slate-500/20 rounded-full blur-[80px] animate-cloud-drift" />
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-slate-900/50 to-transparent blur-xl" />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          3. SUNNY & CLEAR DAYLIGHT ENVIRONMENT
          (Clear skies, sunny daylight)
          ═════════════════════════════════════════════════════════════ */}
      {weather.type === WEATHER_TYPES.CLEAR_DAY && (
        <div className="absolute inset-0 animate-in fade-in duration-700">
          {/* Warm Amber Solar Daylight Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#301a04] via-[#1a0f02] to-[#080501]" />
          <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-orange-500/25 via-amber-500/10 to-transparent" />

          {/* Glowing Solar Disc & Corona Rays at Top Right */}
          <div className="absolute -top-16 -right-16 w-96 h-96 flex items-center justify-center">
            <div className="absolute w-full h-full rounded-full bg-gradient-to-br from-amber-400/40 via-orange-500/25 to-transparent blur-3xl animate-sun-pulse" />
            <div className="absolute w-72 h-72 rounded-full bg-amber-400/30 blur-2xl" />
            <div className="w-44 h-44 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-100 shadow-[0_0_120px_rgba(251,191,36,0.8)] opacity-90" />
          </div>

          {/* Sunbeams and Floating Golden Shimmer */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fde047] animate-float-particle"
                style={{
                  left: `${(i * 4.3) % 100}%`,
                  top: `${10 + (i * 3.7) % 75}%`,
                  animationDuration: `${3.5 + (i % 4)}s`,
                  animationDelay: `${(i * 0.25) % 3}s`
                }}
              />
            ))}
          </div>

          <div className="absolute top-12 left-12 w-[600px] h-32 bg-white/10 rounded-full blur-3xl animate-cloud-drift" />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          4. CLEAR NIGHT / COSMIC STARLIGHT ENVIRONMENT
          (Clear night hours, polar night)
          ═════════════════════════════════════════════════════════════ */}
      {weather.type === WEATHER_TYPES.CLEAR_NIGHT && (
        <div className="absolute inset-0 animate-in fade-in duration-700">
          {/* Deep Cosmic Indigo Sky */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#141b3a] via-[#090d1f] to-[#030408]" />
          <div className="absolute top-10 right-1/4 w-[650px] h-[450px] bg-indigo-500/20 rounded-full blur-[130px]" />

          {/* Crescent Moon Glow at Top Right */}
          <div className="absolute top-10 right-16 w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-200 to-white shadow-[0_0_60px_rgba(224,231,255,0.6)] opacity-85 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#090d1f] -translate-x-2.5 -translate-y-1" />
          </div>

          {/* 40+ Twinkling Stars */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(42)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-indigo-100 animate-star-twinkle shadow-[0_0_6px_#e0e7ff]"
                style={{
                  left: `${(i * 2.45) % 100}%`,
                  top: `${4 + (i * 2.3) % 85}%`,
                  animationDelay: `${(i * 0.18) % 3}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          5. RAIN & PRECIPITATION ENVIRONMENT
          (Rain showers, heavy rain, drizzle)
          ═════════════════════════════════════════════════════════════ */}
      {(weather.type === WEATHER_TYPES.RAIN || 
        weather.type === WEATHER_TYPES.HEAVY_RAIN || 
        weather.type === WEATHER_TYPES.DRIZZLE) && (
        <div className="absolute inset-0 animate-in fade-in duration-700">
          {/* Deep Ocean Storm Sky */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c2742] via-[#071729] to-[#020710]" />
          <div className="absolute -top-20 left-1/3 w-[850px] h-[550px] bg-sky-600/25 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-10 w-[700px] h-[450px] bg-cyan-700/20 rounded-full blur-[130px]" />

          {/* 64+ Visible Falling Rain Streaks */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(64)].map((_, i) => {
              const leftPos = (i * 1.58) % 100;
              const duration = 0.6 + (i % 5) * 0.12;
              const delay = (i * 0.06) % 1.5;
              const height = 40 + (i % 6) * 16;
              return (
                <div
                  key={i}
                  className="absolute w-[2px] bg-gradient-to-b from-transparent via-sky-300 to-sky-100 rounded-full animate-rain-drop shadow-[0_0_5px_rgba(56,189,248,0.9)]"
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

          <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-sky-950/50 via-slate-900/25 to-transparent blur-md" />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          6. THUNDERSTORM ENVIRONMENT
          (Thunderstorm, electrical activity)
          ═════════════════════════════════════════════════════════════ */}
      {weather.type === WEATHER_TYPES.THUNDERSTORM && (
        <div className="absolute inset-0 animate-in fade-in duration-700">
          <div className="absolute inset-0 bg-gradient-to-b from-[#221045] via-[#12082b] to-[#04020c]" />
          <div className="absolute -top-32 left-1/4 w-[900px] h-[600px] bg-indigo-600/35 rounded-full blur-[150px]" />
          
          {/* Animated Lightning Flash */}
          <div className="absolute inset-0 bg-indigo-200/40 animate-lightning" />
          
          {/* Heavy Storm Rain Streaks */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(72)].map((_, i) => {
              const leftPos = (i * 1.4) % 100;
              const duration = 0.45 + (i % 4) * 0.1;
              const delay = (i * 0.04) % 1.1;
              const height = 50 + (i % 6) * 18;
              return (
                <div
                  key={i}
                  className="absolute w-[2.5px] bg-gradient-to-b from-transparent via-indigo-200 to-sky-100 rounded-full animate-rain-drop shadow-[0_0_6px_rgba(165,180,252,1)]"
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

      {/* ═════════════════════════════════════════════════════════════
          7. FOGGY ENVIRONMENT
          (Fog, mist, low visibility)
          ═════════════════════════════════════════════════════════════ */}
      {weather.type === WEATHER_TYPES.FOG && (
        <div className="absolute inset-0 animate-in fade-in duration-700">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1c242c] via-[#10161d] to-[#070a0d]" />
          <div className="absolute top-10 inset-x-0 h-96 bg-slate-300/30 blur-[100px] animate-cloud-drift" />
          <div className="absolute bottom-10 inset-x-0 h-80 bg-slate-400/25 blur-[90px] animate-cloud-drift-reverse" />
        </div>
      )}

      {/* High-Tech Geodetic Grid Mesh Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.45) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  );
};
