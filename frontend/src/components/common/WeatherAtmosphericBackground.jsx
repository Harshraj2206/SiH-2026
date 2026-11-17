/**
 * Live weather background.
 * The sky follows the real weather and local time of the selected location
 * (zone, map click, search or GPS) and cross-fades when that location changes.
 * Kept deliberately soft so content stays readable.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocationIntelligence } from '../../context/LocationIntelligenceContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

// Muted sky gradients, top -> bottom
const SKIES = {
  clear: {
    dawn: ['#232945', '#5b4d66', '#a9786a'],
    day: ['#14305a', '#2a5788', '#4d7bab'],
    dusk: ['#1d2140', '#523a59', '#9c6656'],
    night: ['#04060c', '#0a1120', '#131b2c'],
  },
  partly_cloudy: {
    day: ['#1a2e4c', '#335276', '#5a7898'],
    night: ['#07090f', '#10161f', '#1a212c'],
  },
  cloudy: { day: ['#262b33', '#373e48', '#4e5662'], night: ['#0a0c10', '#14171c', '#1d2127'] },
  rain: { day: ['#1a222b', '#28323c', '#38434e'], night: ['#05070a', '#0d1217', '#161c22'] },
  heavy_rain: { day: ['#141a21', '#202830', '#2d3640'], night: ['#040508', '#0a0e12', '#12171c'] },
  thunderstorm: { day: ['#181926', '#272839', '#36364c'], night: ['#040408', '#0c0c15', '#151526'] },
  snow: { day: ['#364250', '#546273', '#7c8c9e'], night: ['#0c1117', '#17202a', '#242f3b'] },
  fog: { day: ['#36393e', '#4f5359', '#6a6e74'], night: ['#0d0e10', '#17181b', '#212226'] },
};

const skyFor = (category, isDay, dayPhase) => {
  const set = SKIES[category] || SKIES.clear;
  if (!isDay) return set.night;
  if (set.dawn && (dayPhase === 'dawn' || dayPhase === 'morning')) return set.dawn;
  if (set.dusk && dayPhase === 'dusk') return set.dusk;
  return set.day;
};

// Deterministic pseudo-random so particles don't jump on every render
const rand = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const WeatherAtmosphericBackground = () => {
  const { environment, timeOffsetHours = 0, setTimeOffsetHours } = useLocationIntelligence();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [showTimeMenu, setShowTimeMenu] = useState(false);

  const {
    isDay, dayPhase, weatherCategory = 'clear', weatherCondition,
    sunScreenX, sunScreenY, isSunVisible, sunGlowOpacity = 0, isSunHorizon,
    moonScreenX, moonScreenY, isMoonVisible, moonIlluminationPct = 50,
    localTimeString, localHour = 12, timezoneAbbr, displayName,
  } = environment;

  const colors = skyFor(weatherCategory, isDay, dayPhase);
  const gradient = `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 55%, ${colors[2]} 100%)`;

  // Cross-fade: keep the previous sky underneath while the new one fades in
  const [layers, setLayers] = useState([{ id: 0, gradient }]);
  useEffect(() => {
    setLayers(prev => (prev[prev.length - 1].gradient === gradient
      ? prev
      : [...prev.slice(-1), { id: prev[prev.length - 1].id + 1, gradient }]));
    const t = setTimeout(() => setLayers(prev => prev.slice(-1)), 1600);
    return () => clearTimeout(t);
  }, [gradient]);

  const isRain = ['rain', 'heavy_rain', 'thunderstorm'].includes(weatherCategory);
  const isSnow = weatherCategory === 'snow';
  const hasClouds = ['partly_cloudy', 'cloudy', 'rain', 'heavy_rain', 'thunderstorm', 'snow'].includes(weatherCategory);
  const showStars = !isDay && ['clear', 'partly_cloudy'].includes(weatherCategory);

  const rainDrops = useMemo(() => {
    const n = weatherCategory === 'heavy_rain' || weatherCategory === 'thunderstorm' ? 110 : 60;
    return Array.from({ length: n }, (_, i) => ({
      left: rand(i, 1) * 100, delay: rand(i, 2) * 2, duration: 0.7 + rand(i, 3) * 0.5, height: 14 + rand(i, 4) * 12,
    }));
  }, [weatherCategory]);

  const snowFlakes = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    left: rand(i, 5) * 100, delay: rand(i, 6) * 6, duration: 6 + rand(i, 7) * 6, size: 2 + rand(i, 8) * 2.5,
  })), []);

  const stars = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    left: rand(i, 9) * 100, top: rand(i, 10) * 60, size: rand(i, 11) > 0.85 ? 2 : 1, twinkle: rand(i, 12) > 0.7, delay: rand(i, 13) * 4,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" aria-hidden="true">
      {/* Sky */}
      {layers.map((l, i) => (
        <div
          key={l.id}
          className="absolute inset-0"
          style={{ background: l.gradient, animation: i > 0 ? 'sky-fade 1.5s ease forwards' : undefined }}
        />
      ))}

      {/* Sun glow */}
      {isDay && isSunVisible && (
        <div
          className="absolute rounded-full transition-all duration-[1500ms] ease-out"
          style={{
            left: `${sunScreenX}%`, top: `${sunScreenY}%`, width: 640, height: 640, transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${isSunHorizon ? 'rgba(255,190,140,0.35)' : 'rgba(255,236,200,0.28)'} 0%, transparent 65%)`,
            opacity: Math.min(1, 0.4 + sunGlowOpacity),
          }}
        />
      )}

      {/* Stars */}
      {showStars && stars.map((s, i) => (
        <span
          key={i}
          className={`absolute rounded-full bg-white ${s.twinkle ? 'animate-star-twinkle' : ''}`}
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: s.twinkle ? undefined : 0.45, animationDelay: `${s.delay}s` }}
        />
      ))}

      {/* Moon */}
      {!isDay && isMoonVisible && (
        <div
          className="absolute transition-all duration-[1500ms] ease-out"
          style={{ left: `${moonScreenX}%`, top: `${moonScreenY}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="absolute -inset-16 rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,228,255,0.12) 0%, transparent 70%)' }} />
          <div
            className="w-11 h-11 rounded-full"
            style={{ background: '#E8ECF4', opacity: 0.35 + (moonIlluminationPct / 100) * 0.5, boxShadow: '0 0 30px rgba(220,228,255,0.25)' }}
          />
        </div>
      )}

      {/* Clouds */}
      {hasClouds && (
        <>
          <div className="absolute -top-24 -left-32 w-[900px] h-[360px] rounded-full blur-[100px] animate-cloud-drift"
            style={{ background: `rgba(255,255,255,${weatherCategory === 'partly_cloudy' ? 0.05 : 0.08})` }} />
          <div className="absolute top-32 -right-40 w-[800px] h-[340px] rounded-full blur-[110px] animate-cloud-drift-reverse"
            style={{ background: `rgba(255,255,255,${weatherCategory === 'partly_cloudy' ? 0.04 : 0.07})` }} />
        </>
      )}

      {/* Rain */}
      {isRain && rainDrops.map((d, i) => (
        <span
          key={i}
          className="absolute top-0 w-px rounded-full animate-rain-drop"
          style={{
            left: `${d.left}%`, height: d.height, animationDelay: `${d.delay}s`, animationDuration: `${d.duration}s`,
            background: 'linear-gradient(to bottom, transparent, rgba(200,220,240,0.35))',
          }}
        />
      ))}

      {/* Lightning: a rare, faint flash */}
      {weatherCategory === 'thunderstorm' && <div className="absolute inset-0 bg-white/[0.05] animate-lightning" />}

      {/* Snow */}
      {isSnow && snowFlakes.map((f, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-full bg-white/60 animate-snow-fall"
          style={{ left: `${f.left}%`, width: f.size, height: f.size, animationDelay: `${f.delay}s`, animationDuration: `${f.duration}s` }}
        />
      ))}

      {/* Fog */}
      {weatherCategory === 'fog' && (
        <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(200,200,205,0.18), transparent)' }} />
      )}

      {/* Keeps text readable: darken in dark mode, wash out to a pale sky in light mode */}
      <div className="absolute inset-0" style={{ background: isLight ? 'rgba(245,245,247,0.72)' : 'rgba(0,0,0,0.35)' }} />

      {/* Local time & conditions, with the time-of-day preview */}
      <div className="hidden lg:block absolute bottom-4 left-[calc(16rem+1.5rem)] z-20 pointer-events-auto">
        {showTimeMenu && (
          <div className="mb-2 p-4 rounded-tile bg-surface/90 backdrop-blur-xl border border-line text-[13px] text-label w-80">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Preview time of day</span>
              <button onClick={() => setShowTimeMenu(false)} className="text-label-2 hover:text-label text-xs">Close</button>
            </div>
            <p className="text-xs text-label-2 mb-3">See how the sky looks at this location at other times.</p>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {[['Dawn', 6], ['Noon', 12], ['Dusk', 18], ['Night', 0]].map(([label, hour]) => (
                <button
                  key={label}
                  onClick={() => setTimeOffsetHours(hour - localHour)}
                  className="py-1.5 rounded-full bg-surface-2 hover:opacity-80 text-xs transition-opacity"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range" min="-12" max="12" step="0.5" value={timeOffsetHours}
                onChange={(e) => setTimeOffsetHours(parseFloat(e.target.value))}
                className="w-full accent-[rgb(var(--rgb-accent))] cursor-pointer"
              />
              <button
                onClick={() => setTimeOffsetHours(0)}
                className="px-2.5 py-0.5 rounded-full text-xs bg-surface-2 hover:opacity-80 shrink-0"
              >
                {timeOffsetHours === 0 ? 'Live' : 'Reset'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowTimeMenu(prev => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/70 hover:bg-surface/90 backdrop-blur-xl text-xs text-label-2 transition-colors"
          title="Preview time of day"
        >
          {isDay ? <Sun className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.75} />}
          <span className="text-label truncate max-w-[160px]">{displayName}</span>
          <span>·</span>
          <span className="tabular-nums">{localTimeString} {timezoneAbbr}</span>
          <span>·</span>
          <span>{weatherCondition}</span>
          {timeOffsetHours !== 0 && <span className="text-accent-text">({timeOffsetHours > 0 ? '+' : ''}{timeOffsetHours}h)</span>}
        </button>
      </div>
    </div>
  );
};

export default WeatherAtmosphericBackground;
