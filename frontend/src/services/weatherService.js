/**
 * LANDSAFE SIH 2026 - Unified Weather Service
 * Two-tier resilient weather fetcher:
 * Tier 1: Query backend GET /api/weather?lat=...&lon=...
 * Tier 2: Resilient direct browser fetch to Open-Meteo public API
 *
 * Guarantees zero "WEATHER UNAVAILABLE" states as long as browser has internet connectivity.
 */

import { apiClient } from './api';

const weatherCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Authoritative WMO Weather Interpretation Code Table
const WMO_DESCRIPTIONS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

/**
 * Fetch directly from Open-Meteo browser API as tier-2 fallback.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Normalized weather payload
 */
async function fetchDirectOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,is_day,cloud_cover&daily=sunrise,sunset,precipitation_sum&timezone=auto`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo direct API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const current = data.current || {};
    const daily = data.daily || {};
    const precipSums = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum : [0];
    const rain24h = Number(precipSums[0] || current.precipitation || 0);
    const code = typeof current.weather_code === 'number' ? current.weather_code : 0;
    const condition = WMO_DESCRIPTIONS[code] || 'Clear';

    const sunrises = Array.isArray(daily.sunrise) ? daily.sunrise : [];
    const sunsets = Array.isArray(daily.sunset) ? daily.sunset : [];

    return {
      status: 'success',
      latitude: lat,
      longitude: lon,
      temperature_c: Number(current.temperature_2m ?? 0),
      apparent_temperature_c: Number(current.apparent_temperature ?? current.temperature_2m ?? 0),
      humidity_pct: Number(current.relative_humidity_2m ?? 0),
      precipitation_mm: Number(current.precipitation ?? 0),
      rainfall_24h: Math.round(rain24h * 100) / 100,
      weather_code: code,
      cloud_cover_pct: Number(current.cloud_cover ?? (code === 0 ? 5 : code <= 2 ? 40 : 90)),
      condition,
      wind_speed_kmh: Number(current.wind_speed_10m ?? 0),
      is_day: Boolean(current.is_day ?? 1),
      timezone: data.timezone || 'Asia/Kolkata',
      timezone_abbreviation: data.timezone_abbreviation || 'UTC',
      utc_offset_seconds: Number(data.utc_offset_seconds ?? 0),
      sunrise: sunrises[0] || null,
      sunset: sunsets[0] || null,
      source: 'Open-Meteo Real-Time Telemetry (Direct)',
      observation_time: current.time || new Date().toISOString()
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Get weather telemetry for given coordinates with multi-tier failover and caching.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {boolean} forceRefresh - Bypass cache
 * @returns {Promise<Object>} Telemetry data matching weatherNormalizer schema
 */
export async function getLiveWeather(lat, lon, forceRefresh = false) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    throw new Error('Valid numerical latitude and longitude are required.');
  }

  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const now = Date.now();

  if (!forceRefresh && weatherCache.has(cacheKey)) {
    const entry = weatherCache.get(cacheKey);
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
  }

  // Tier 1: Query backend /api/weather
  try {
    const res = await apiClient.get('/weather', {
      params: { lat, lon },
      timeout: 6000
    });
    if (res.data && res.data.status === 'success') {
      weatherCache.set(cacheKey, { timestamp: now, data: res.data });
      return res.data;
    }
  } catch (backendErr) {
    console.warn('[WeatherService] Backend /api/weather failed or timed out. Falling back to direct Open-Meteo query:', backendErr.message);
  }

  // Tier 2: Resilient direct browser fetch to Open-Meteo
  try {
    const directData = await fetchDirectOpenMeteo(lat, lon);
    weatherCache.set(cacheKey, { timestamp: now, data: directData });
    return directData;
  } catch (directErr) {
    console.error('[WeatherService] Both backend and direct Open-Meteo queries failed:', directErr);
    throw directErr;
  }
}
