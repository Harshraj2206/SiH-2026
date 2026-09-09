/**
 * LANDSAFE SIH 2026 - Real-Time Astronomical & Meteorological Environment Engine
 *
 * Dynamically transforms the entire application's visual atmosphere based on:
 * 1. REAL SELECTED COORDINATES (Map Click, Searched Location, Mountain Zone, or Live GPS)
 * 2. REAL LOCAL TIMEZONE & TIME (calculated independently of the user's computer clock)
 * 3. REAL SOLAR POSITION (Continuous azimuth & elevation angle calculated via NOAA formulas)
 * 4. REAL LUNAR POSITION & PHASE (Meeus lunar calculations, moon altitude, illumination %)
 * 5. REAL WMO WEATHER (Open-Meteo & IMD reanalysis grid)
 *
 * Visually supports all combined diurnal/meteorological environments:
 * - CLEAR: Morning Dawn / Golden Sunrise, Midday Azure Daylight, Late Afternoon, Sunset Dusk, Starry Midnight
 * - PARTLY CLOUDY: Drifting cloud banks with real sun/moon shining through
 * - CLOUDY / OVERCAST: Diffuse silver-slate daylight sky (never a dark void) / Nocturnal overcast
 * - RAIN & HEAVY RAIN: High-performance angled rain streaks with water impact ripples
 * - THUNDERSTORM: Atmospheric bruised storm skies with periodic electric lightning discharges
 * - SNOW: Drifting crystalline snowflakes with rotational physics
 * - FOG: Low-visibility luminous morning mist / deep nocturnal haze
 *
 * Accessible: Respects @media (prefers-reduced-motion: reduce).
 */

import React, { useMemo, useState } from 'react';
import { useLocationIntelligence } from '../../context/LocationIntelligenceContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Cloud, Wind, Compass, Clock, RefreshCw } from 'lucide-react';

export const WeatherAtmosphericBackground = () => {
  const { environment, location, timeOffsetHours = 0, setTimeOffsetHours } = useLocationIntelligence();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [showTimeMenu, setShowTimeMenu] = useState(false);

  const {
    isDay,
    dayPhase,
    solarElevation,
    solarAzimuth,
    sunScreenX,
    sunScreenY,
    isSunVisible,
    sunGlowOpacity,
    sunWeatherFactor = 1.0,
    isSunHorizon = false,
    sunColorTheme = 'zenith',
    moonElevation,
    moonAzimuth,
    moonScreenX,
    moonScreenY,
    isMoonVisible,
    moonWeatherFactor = 1.0,
    moonPhaseName,
    moonPhaseFraction,
    moonIlluminationPct,
    isWaxing = true,
    weatherCategory,
    weatherCondition,
    temperatureC,
    precipitationMm,
    cloudCoverPct,
    localTimeString,
    localHour = 12,
    timezoneAbbr,
    displayName
  } = environment;

  // Determine Sky Gradient based on real astronomical daylight phase and weather category
  const skyTheme = useMemo(() => {
    if (isDay) {
      // ═════════════════════════════════════════════════════════════════════
      // DAYLIGHT ENVIRONMENTS
      // ═════════════════════════════════════════════════════════════════════
      switch (weatherCategory) {
        case 'clear':
          if (dayPhase === 'dawn' || dayPhase === 'morning') {
            // Golden Sunrise / Early Morning
            return {
              bg: isLight
                ? 'from-[#fef08a]/70 via-[#fde047]/40 to-[#e0f2fe]'
                : 'from-[#1e3a8a]/70 via-[#2563eb]/45 to-[#f59e0b]/40',
              glow: 'bg-amber-400/25',
              ambientHaze: 'bg-gradient-to-t from-amber-500/20 via-orange-400/10 to-transparent'
            };
          } else if (dayPhase === 'dusk') {
            // Twilight / Sunset
            return {
              bg: isLight
                ? 'from-[#fbcfe8]/70 via-[#fed7aa]/50 to-[#bae6fd]'
                : 'from-[#312e81]/80 via-[#701a75]/60 to-[#ea580c]/50',
              glow: 'bg-orange-500/30',
              ambientHaze: 'bg-gradient-to-t from-rose-500/25 via-amber-500/15 to-transparent'
            };
          } else {
            // Midday Azure Daylight
            return {
              bg: isLight
                ? 'from-[#bae6fd]/80 via-[#e0f2fe]/60 to-[#ffffff]'
                : 'from-[#0284c7]/80 via-[#0369a1]/60 to-[#38bdf8]/35',
              glow: 'bg-sky-400/30',
              ambientHaze: 'bg-gradient-to-t from-sky-400/15 via-cyan-400/10 to-transparent'
            };
          }

        case 'partly_cloudy':
          return {
            bg: isLight
              ? 'from-[#e0f2fe]/80 via-[#f1f5f9]/60 to-[#ffffff]'
              : 'from-[#0369a1]/75 via-[#0c4a6e]/60 to-[#0284c7]/30',
            glow: 'bg-amber-300/20',
            ambientHaze: 'bg-gradient-to-t from-sky-300/15 via-slate-400/10 to-transparent'
          };

        case 'cloudy':
          // Overcast / Gloomy Daylight (Clearly Daytime, not black!)
          return {
            bg: isLight
              ? 'from-[#cbd5e1]/80 via-[#e2e8f0]/60 to-[#f8fafc]'
              : 'from-[#334155]/85 via-[#475569]/70 to-[#64748b]/40',
            glow: 'bg-slate-400/15',
            ambientHaze: 'bg-gradient-to-t from-slate-500/20 via-slate-600/10 to-transparent'
          };

        case 'rain':
        case 'heavy_rain':
          // Daylight Rainstorm
          return {
            bg: isLight
              ? 'from-[#94a3b8]/80 via-[#cbd5e1]/60 to-[#f1f5f9]'
              : 'from-[#1e293b]/90 via-[#334155]/75 to-[#475569]/45',
            glow: 'bg-sky-500/20',
            ambientHaze: 'bg-gradient-to-t from-cyan-600/20 via-sky-500/10 to-transparent'
          };

        case 'thunderstorm':
          // Bruised Violent Daytime Storm
          return {
            bg: isLight
              ? 'from-[#64748b]/90 via-[#475569]/70 to-[#e2e8f0]'
              : 'from-[#1e1b4b]/95 via-[#0f172a]/85 to-[#020617]/70',
            glow: 'bg-indigo-500/30',
            ambientHaze: 'bg-gradient-to-t from-indigo-600/25 via-purple-600/10 to-transparent'
          };

        case 'snow':
          // Crisp Glacial Frost Daylight
          return {
            bg: isLight
              ? 'from-[#e0f2fe]/90 via-[#f0f9ff]/70 to-[#ffffff]'
              : 'from-[#1e3a5f]/80 via-[#0369a1]/50 to-[#bae6fd]/35',
            glow: 'bg-cyan-300/25',
            ambientHaze: 'bg-gradient-to-t from-cyan-400/20 via-sky-300/10 to-transparent'
          };

        case 'fog':
          // Luminous Pearlescent Mist
          return {
            bg: isLight
              ? 'from-[#e2e8f0]/85 via-[#f1f5f9]/70 to-[#ffffff]'
              : 'from-[#334155]/75 via-[#475569]/55 to-[#94a3b8]/35',
            glow: 'bg-slate-300/20',
            ambientHaze: 'bg-gradient-to-t from-slate-400/25 via-slate-300/10 to-transparent'
          };

        default:
          return {
            bg: isLight
              ? 'from-[#e0f2fe]/80 via-[#f8fafc]/60 to-[#ffffff]'
              : 'from-[#0369a1]/70 via-[#0c4a6e]/55 to-[#1e293b]/50',
            glow: 'bg-sky-400/20',
            ambientHaze: 'bg-transparent'
          };
      }
    } else {
      // ═════════════════════════════════════════════════════════════════════
      // NOCTURNAL / NIGHT ENVIRONMENTS
      // ═════════════════════════════════════════════════════════════════════
      switch (weatherCategory) {
        case 'clear':
          return {
            bg: 'from-[#060914] via-[#04060d] to-[#010206]',
            glow: 'bg-indigo-500/15',
            ambientHaze: 'bg-gradient-to-t from-indigo-950/20 via-blue-950/10 to-transparent'
          };

        case 'partly_cloudy':
          return {
            bg: 'from-[#070c1a] via-[#030610] to-[#010206]',
            glow: 'bg-indigo-400/10',
            ambientHaze: 'bg-gradient-to-t from-slate-900/30 via-indigo-950/15 to-transparent'
          };

        case 'cloudy':
          return {
            bg: 'from-[#0b0e14] via-[#07090f] to-[#030408]',
            glow: 'bg-slate-500/10',
            ambientHaze: 'bg-gradient-to-t from-neutral-900/40 via-neutral-950/20 to-transparent'
          };

        case 'rain':
        case 'heavy_rain':
          return {
            bg: 'from-[#090d16] via-[#05070d] to-[#020306]',
            glow: 'bg-sky-500/15',
            ambientHaze: 'bg-gradient-to-t from-sky-950/30 via-slate-950/20 to-transparent'
          };

        case 'thunderstorm':
          return {
            bg: 'from-[#120a24] via-[#090514] to-[#030208]',
            glow: 'bg-purple-500/25',
            ambientHaze: 'bg-gradient-to-t from-purple-950/40 via-indigo-950/20 to-transparent'
          };

        case 'snow':
          return {
            bg: 'from-[#071322] via-[#040a14] to-[#02050a]',
            glow: 'bg-cyan-500/15',
            ambientHaze: 'bg-gradient-to-t from-cyan-950/30 via-slate-950/20 to-transparent'
          };

        case 'fog':
          return {
            bg: 'from-[#0a0d12] via-[#06080c] to-[#020306]',
            glow: 'bg-slate-400/10',
            ambientHaze: 'bg-gradient-to-t from-slate-900/40 via-slate-950/20 to-transparent'
          };

        default:
          return {
            bg: 'from-[#060914] via-[#04060d] to-[#010206]',
            glow: 'bg-indigo-500/10',
            ambientHaze: 'bg-transparent'
          };
      }
    }
  }, [isDay, dayPhase, weatherCategory, isLight]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-1000 ease-in-out"
      aria-hidden="true"
    >
      {/* ═════════════════════════════════════════════════════════════════════
          LAYER 1: DYNAMIC SKY GRADIENT (Smooth 1.5s Crossfade)
          ═════════════════════════════════════════════════════════════════════ */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${skyTheme.bg} transition-colors duration-1000 ease-in-out`}
      />

      {/* Atmospheric Horizon Haze Glow */}
      <div className={`absolute inset-0 ${skyTheme.ambientHaze} pointer-events-none transition-opacity duration-1000`} />

      {/* Ambient Celestial Glow */}
      <div
        className={`absolute -top-10 -right-10 w-[700px] h-[500px] rounded-full blur-[140px] pointer-events-none ${skyTheme.glow} transition-colors duration-1000`}
      />

      {/* ═════════════════════════════════════════════════════════════════════
          LAYER 2: REAL-TIME SOLAR DISC & SOLAR CORONA
          Rendered at the EXACT calculated solar azimuth and elevation angle!
          ═════════════════════════════════════════════════════════════════════ */}
      {isSunVisible && (
        <div
          className="absolute pointer-events-none transition-all duration-1000 ease-out"
          style={{
            left: `${sunScreenX}%`,
            top: `${sunScreenY}%`,
            transform: 'translate(-50%, -50%)',
            opacity: Math.max(0.04, sunGlowOpacity)
          }}
        >
          {/* Luminous Outer Corona Flare (Attenuated in heavy clouds/storms) */}
          {sunWeatherFactor > 0.35 && (
            <div
              className={`absolute -inset-24 rounded-full blur-3xl animate-sun-pulse pointer-events-none ${
                isSunHorizon
                  ? 'bg-gradient-to-r from-amber-500/40 via-orange-400/25 to-rose-500/10'
                  : 'bg-gradient-to-r from-amber-300/35 via-yellow-200/20 to-transparent'
              }`}
            />
          )}

          {/* Middle Diffuse Solar Aura */}
          <div
            className={`absolute -inset-10 rounded-full blur-xl pointer-events-none ${
              isSunHorizon ? 'bg-orange-500/35' : 'bg-amber-400/30'
            }`}
          />

          {/* Core Sun Disc */}
          <div
            className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-colors duration-1000 ${
              isSunHorizon
                ? 'bg-gradient-to-tr from-amber-500 via-orange-400 to-rose-400 shadow-[0_0_90px_rgba(249,115,22,0.85)]'
                : 'bg-gradient-to-tr from-amber-300 via-amber-100 to-white shadow-[0_0_80px_rgba(251,191,36,0.85)]'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-full blur-[2px] ${
                isSunHorizon ? 'bg-orange-100/80' : 'bg-white/80'
              }`}
            />
          </div>

          {/* Horizon Atmospheric Glow Bar when close to horizon (Dawn / Sunset) */}
          {isSunHorizon && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-3 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent blur-md pointer-events-none" />
          )}

          {/* Golden Floating Daylight Dust Particles (Only clear/partly cloudy skies) */}
          {sunWeatherFactor > 0.7 && (
            <div className="absolute -inset-32 overflow-visible pointer-events-none">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fde047] animate-float-particle"
                  style={{
                    left: `${(i * 18.5) % 180 - 40}px`,
                    top: `${(i * 22.3) % 160 - 30}px`,
                    animationDuration: `${3.2 + (i % 4) * 0.7}s`,
                    animationDelay: `${(i * 0.2) % 2.5}s`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LAYER 3: REAL-TIME LUNAR DISC & ACCURATE MOON PHASE
          Rendered at the EXACT calculated lunar azimuth and elevation angle!
          Supports all 8 distinct lunar phases with exact terminator curvature!
          ═════════════════════════════════════════════════════════════════════ */}
      {isMoonVisible && (
        <div
          className="absolute pointer-events-none transition-all duration-1000 ease-out"
          style={{
            left: `${moonScreenX}%`,
            top: `${moonScreenY}%`,
            transform: 'translate(-50%, -50%)',
            opacity: isDay ? Math.max(0.04, 0.40 * moonWeatherFactor) : Math.max(0.05, 0.95 * moonWeatherFactor)
          }}
        >
          {/* Soft Lunar Halo */}
          <div className="absolute -inset-14 rounded-full bg-indigo-200/20 blur-2xl pointer-events-none" />

          {/* Realistic SVG Moon with Illuminated Phase Arc */}
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-slate-950/70 shadow-[0_0_50px_rgba(224,231,255,0.5)] flex items-center justify-center border border-indigo-200/20">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full transform -rotate-12 drop-shadow-[0_0_8px_rgba(224,231,255,0.8)]"
            >
              {/* Moon Dark Side Basemap */}
              <circle cx="50" cy="50" r="46" fill="#0b1120" opacity="0.85" />
              
              {/* Moon Surface Craters & Maria */}
              <circle cx="38" cy="42" r="7" fill="#1e293b" opacity="0.6" />
              <circle cx="62" cy="35" r="9" fill="#1e293b" opacity="0.5" />
              <circle cx="50" cy="68" r="11" fill="#1e293b" opacity="0.55" />
              <circle cx="32" cy="62" r="5" fill="#1e293b" opacity="0.5" />

              {/* Dynamic Illuminated Crescent / Gibbous Phase Path */}
              {moonPhaseFraction > 0.03 && (
                moonPhaseFraction >= 0.97 ? (
                  // Full Moon
                  <circle cx="50" cy="50" r="46" fill="url(#lunarGradient)" />
                ) : isWaxing ? (
                  // Waxing Moon (illuminated on the right)
                  <path
                    d={
                      moonPhaseFraction <= 0.5
                        ? `M 50 4 A 46 46 0 0 1 50 96 A ${Math.max(1, Math.abs(46 * (1 - 2 * moonPhaseFraction)))} 46 0 0 0 50 4 Z`
                        : `M 50 4 A 46 46 0 0 1 50 96 A ${Math.max(1, Math.abs(46 * (2 * moonPhaseFraction - 1)))} 46 0 0 1 50 4 Z`
                    }
                    fill="url(#lunarGradient)"
                  />
                ) : (
                  // Waning Moon (illuminated on the left)
                  <path
                    d={
                      moonPhaseFraction <= 0.5
                        ? `M 50 4 A 46 46 0 0 0 50 96 A ${Math.max(1, Math.abs(46 * (1 - 2 * moonPhaseFraction)))} 46 0 0 1 50 4 Z`
                        : `M 50 4 A 46 46 0 0 0 50 96 A ${Math.max(1, Math.abs(46 * (2 * moonPhaseFraction - 1)))} 46 0 0 0 50 4 Z`
                    }
                    fill="url(#lunarGradient)"
                  />
                )
              )}

              <defs>
                <linearGradient id="lunarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#e0e7ff" />
                  <stop offset="100%" stopColor="#c7d2fe" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Phase Badge Tag (Subtle) */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-indigo-200/70 whitespace-nowrap tracking-wider uppercase bg-black/40 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm">
            {moonPhaseName} ({moonIlluminationPct}%)
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LAYER 4: 48 TWINKLING STARS (Nocturnal Clear & Partly Cloudy Sky)
          ═════════════════════════════════════════════════════════════════════ */}
      {!isDay && cloudCoverPct < 80 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(48)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-star-twinkle shadow-[0_0_4px_#ffffff]"
              style={{
                width: `${1 + (i % 3) * 0.6}px`,
                height: `${1 + (i % 3) * 0.6}px`,
                left: `${(i * 2.13) % 100}%`,
                top: `${2 + (i * 2.19) % 88}%`,
                animationDelay: `${(i * 0.17) % 3.5}s`,
                animationDuration: `${2.5 + (i % 4) * 0.7}s`,
                opacity: 0.2 + (i % 5) * 0.15
              }}
            />
          ))}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LAYER 5: DRIFTING CLOUDS (Partly Cloudy, Cloudy, Overcast)
          ═════════════════════════════════════════════════════════════════════ */}
      {(weatherCategory === 'partly_cloudy' || weatherCategory === 'cloudy' || cloudCoverPct > 35) && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-70">
          <div
            className={`absolute -top-12 -left-20 w-[900px] h-[340px] rounded-full blur-[90px] animate-cloud-drift ${
              isDay
                ? isLight
                  ? 'bg-white/60'
                  : 'bg-slate-300/25'
                : 'bg-slate-800/40'
            }`}
          />
          <div
            className={`absolute top-24 -right-16 w-[850px] h-[380px] rounded-full blur-[100px] animate-cloud-drift-reverse ${
              isDay
                ? isLight
                  ? 'bg-sky-100/50'
                  : 'bg-slate-400/20'
                : 'bg-slate-900/50'
            }`}
          />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LAYER 6: HIGH-PERFORMANCE PRECIPITATION (Rain & Heavy Rain)
          ═════════════════════════════════════════════════════════════════════ */}
      {(weatherCategory === 'rain' || weatherCategory === 'heavy_rain') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(weatherCategory === 'heavy_rain' ? 72 : 54)].map((_, i) => (
            <div
              key={i}
              className={`absolute rounded-full animate-rain-drop ${
                isDay ? 'bg-gradient-to-b from-transparent to-sky-300/70' : 'bg-gradient-to-b from-transparent to-sky-400/60'
              }`}
              style={{
                width: weatherCategory === 'heavy_rain' ? '1.5px' : '1px',
                height: `${22 + (i % 4) * 8}px`,
                left: `${(i * 1.45) % 100}%`,
                top: `-40px`,
                animationDuration: `${0.55 + (i % 4) * 0.12}s`,
                animationDelay: `${(i * 0.08) % 1.2}s`,
                animationIterationCount: 'infinite'
              }}
            />
          ))}
          {/* Ground Mist Ripple */}
          <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-sky-400/10 to-transparent pointer-events-none blur-xl" />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LAYER 7: THUNDERSTORM (Dynamic Lightning Flashes)
          ═════════════════════════════════════════════════════════════════════ */}
      {weatherCategory === 'thunderstorm' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-indigo-200/20 animate-lightning-flash pointer-events-none" />
          {[...Array(64)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[1.5px] h-9 bg-gradient-to-b from-transparent to-indigo-200 rounded-full animate-rain-drop"
              style={{
                left: `${(i * 1.6) % 100}%`,
                top: `-30px`,
                animationDuration: `${0.5 + (i % 3) * 0.1}s`,
                animationDelay: `${(i * 0.07) % 1.1}s`,
                animationIterationCount: 'infinite'
              }}
            />
          ))}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LAYER 8: SNOW / BLIZZARD (56 Drifting Snowflakes)
          ═════════════════════════════════════════════════════════════════════ */}
      {weatherCategory === 'snow' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(56)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-snow-fall shadow-[0_0_5px_white]"
              style={{
                width: `${2 + (i % 4) * 1.2}px`,
                height: `${2 + (i % 4) * 1.2}px`,
                left: `${(i * 1.8) % 100}%`,
                top: `-20px`,
                animationDuration: `${3.5 + (i % 4) * 0.9}s`,
                animationDelay: `${(i * 0.18) % 3}s`,
                animationIterationCount: 'infinite'
              }}
            />
          ))}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          LAYER 9: FOG / MIST (Oscillating Ambient Haze)
          ═════════════════════════════════════════════════════════════════════ */}
      {weatherCategory === 'fog' && (
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute inset-0 bg-slate-300/25 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute bottom-0 inset-x-0 h-96 bg-gradient-to-t from-slate-400/30 to-transparent blur-2xl" />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          ASTRONOMICAL PROVENANCE & CELESTIAL TIME SIMULATOR (Bottom Left)
          Transparently demonstrates real-time connection to:
          Exact Coordinates, Local Timezone, Solar Altitude, and Live WMO Weather!
          ═════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block absolute bottom-3 left-4 z-20 pointer-events-auto">
        {/* Time Simulator Panel */}
        {showTimeMenu && (
          <div className="mb-2 p-3 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-xl shadow-2xl text-xs text-neutral-200 w-80 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
              <span className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Celestial Time Simulator
              </span>
              <button
                onClick={() => setShowTimeMenu(false)}
                className="text-neutral-400 hover:text-white px-1 text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[10px] text-neutral-400 mb-2.5 leading-relaxed">
              Verify how the Sun and Moon move across the sky at this location across different times of day.
            </p>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              <button
                onClick={() => {
                  const diff = 6 - localHour;
                  setTimeOffsetHours(diff);
                }}
                className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-center border border-white/10 font-mono transition-all cursor-pointer hover:border-amber-400/50"
                title="Simulate Dawn (06:00)"
              >
                🌅 Dawn
              </button>
              <button
                onClick={() => {
                  const diff = 12 - localHour;
                  setTimeOffsetHours(diff);
                }}
                className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-center border border-white/10 font-mono transition-all cursor-pointer hover:border-amber-400/50"
                title="Simulate Solar Noon (12:00)"
              >
                ☀️ Noon
              </button>
              <button
                onClick={() => {
                  const diff = 18 - localHour;
                  setTimeOffsetHours(diff);
                }}
                className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-center border border-white/10 font-mono transition-all cursor-pointer hover:border-orange-400/50"
                title="Simulate Sunset/Dusk (18:00)"
              >
                🌇 Dusk
              </button>
              <button
                onClick={() => {
                  const diff = 0 - localHour;
                  setTimeOffsetHours(diff);
                }}
                className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-center border border-white/10 font-mono transition-all cursor-pointer hover:border-indigo-400/50"
                title="Simulate Night (00:00)"
              >
                🌙 Night
              </button>
            </div>

            {/* Continuous 24h Slider & Reset */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <span className="text-[9px] text-neutral-400 font-mono">-12h</span>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={timeOffsetHours}
                onChange={(e) => setTimeOffsetHours(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
              />
              <span className="text-[9px] text-neutral-400 font-mono">+12h</span>
              <button
                onClick={() => setTimeOffsetHours(0)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                  timeOffsetHours === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                }`}
                title="Reset to live real-time clock"
              >
                {timeOffsetHours === 0 ? 'LIVE' : 'RESET'}
              </button>
            </div>
          </div>
        )}

        {/* Trigger Badge */}
        <button
          onClick={() => setShowTimeMenu(prev => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 border border-white/10 hover:border-white/25 backdrop-blur-md text-[10px] text-neutral-300 font-mono shadow-md transition-all cursor-pointer group"
          title="Click to toggle Celestial Time Simulator"
        >
          <div className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ASTRO-ENV</span>
          </div>
          <span className="text-neutral-500">•</span>
          <span className="text-white font-semibold truncate max-w-[130px]">{displayName}</span>
          <span className="text-neutral-500">•</span>
          <span className={`font-bold transition-colors ${timeOffsetHours !== 0 ? 'text-amber-400 underline decoration-dotted' : 'text-amber-300'}`}>
            {localTimeString} {timezoneAbbr}
          </span>
          <span className="text-neutral-500">•</span>
          <span className="flex items-center gap-0.5 text-sky-300">
            {isDay ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-300" />}
            <span>{isDay ? `Sun Alt: ${solarElevation}°` : `Moon Alt: ${moonElevation}°`}</span>
          </span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-300 uppercase">{weatherCondition}</span>
          <span className="ml-1 text-[9px] text-neutral-400 group-hover:text-emerald-400 transition-colors">
            {timeOffsetHours !== 0 ? `(${timeOffsetHours > 0 ? '+' : ''}${timeOffsetHours}h)` : '⚙️'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default WeatherAtmosphericBackground;
