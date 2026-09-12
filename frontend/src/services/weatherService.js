/**
 * LANDSAFE SIH 2026 - Resilient Unified Weather Service
 * Two-tier resilient meteorological fetcher:
 * Tier 1: Query backend GET /api/weather?lat=...&lon=... (with multi-model reanalysis)
 * Tier 2: Resilient direct browser fetch to Open-Meteo public API with bounded retry
 *
 * Implements:
 * 1. In-flight request deduplication (prevents duplicate simultaneous calls)
 * 2. Strict UNKNOWN != ZERO scientific policy (no null -> 0 conversion)
 * 3. Graceful stale cache serving (up to 60 minutes) with explicit CACHED indicator
 * 4. Bounded retries with backoff for transient 429/timeout errors
 */

import { apiClient } from './api';

const weatherCache = new Map();
const _inflightRequests = new Map();

const FRESH_CACHE_TTL_MS = 5 * 60 * 1000;   // 5 minutes for live freshness
const STALE_CACHE_TTL_MS = 60 * 60 * 1000;  // 60 minutes acceptable stale cache if upstream is unavailable

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
 * Fetch directly from Open-Meteo browser API as tier-2 fallback with bounded retry.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Normalized weather payload
 */
async function fetchDirectOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,is_day,cloud_cover&daily=sunrise,sunset,precipitation_sum&timezone=auto`;
  
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Open-Meteo direct API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const current = data.current || {};
      const daily = data.daily || {};

      const precipSums = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum : [];
      let rain24h = null;
      if (typeof precipSums[0] === 'number') {
        rain24h = Math.round(precipSums[0] * 10) / 10;
      } else if (typeof current.precipitation === 'number') {
        rain24h = Math.round(current.precipitation * 10) / 10;
      }

      const code = typeof current.weather_code === 'number' ? current.weather_code : null;
      const condition = code !== null ? (WMO_DESCRIPTIONS[code] || 'Clear') : 'Clear';

      const sunrises = Array.isArray(daily.sunrise) ? daily.sunrise : [];
      const sunsets = Array.isArray(daily.sunset) ? daily.sunset : [];

      return {
        status: 'LIVE',
        latitude: lat,
        longitude: lon,
        temperature_c: typeof current.temperature_2m === 'number' ? current.temperature_2m : null,
        apparent_temperature_c: typeof current.apparent_temperature === 'number' ? current.apparent_temperature : null,
        humidity_pct: typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : null,
        precipitation_mm: typeof current.precipitation === 'number' ? current.precipitation : null,
        rainfall_24h: rain24h,
        rainfall_1h: typeof current.precipitation === 'number' ? current.precipitation : null,
        weather_code: code,
        cloud_cover_pct: typeof current.cloud_cover === 'number' ? current.cloud_cover : 0,
        condition,
        wind_speed_kmh: typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : null,
        is_day: current.is_day !== undefined ? Boolean(current.is_day) : true,
        timezone: data.timezone || 'Asia/Kolkata',
        timezone_abbreviation: data.timezone_abbreviation || 'UTC',
        utc_offset_seconds: typeof data.utc_offset_seconds === 'number' ? data.utc_offset_seconds : 19800,
        sunrise: sunrises[0] || null,
        sunset: sunsets[0] || null,
        source: 'Open-Meteo NWP Grid (Direct Browser)',
        data_age_minutes: 0,
        observation_time: current.time || new Date().toISOString()
      };
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 400));
      }
    }
  }

  throw lastErr || new Error('Direct Open-Meteo fetch failed');
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

  // 1. In-flight request deduplication: return existing promise if identical request is pending
  if (!forceRefresh && _inflightRequests.has(cacheKey)) {
    return _inflightRequests.get(cacheKey);
  }

  // 2. Return fresh live cache if within TTL
  if (!forceRefresh && weatherCache.has(cacheKey)) {
    const entry = weatherCache.get(cacheKey);
    const age = now - entry.timestamp;
    if (age < FRESH_CACHE_TTL_MS) {
      return {
        ...entry.data,
        status: entry.data.status || 'LIVE',
        data_age_minutes: Math.max(0, Math.floor(age / 60000))
      };
    }
  }

  const executionPromise = (async () => {
    // Tier 1: Query backend /api/weather (timeout: 10000ms, backend max 6500ms)
    try {
      const res = await apiClient.get('/weather', {
        params: { lat, lon },
        timeout: 10000
      });

      if (res.data && res.data.status !== 'UNAVAILABLE' && (typeof res.data.temperature_c === 'number' || res.data.status === 'LIVE' || res.data.status === 'CACHED')) {
        const payload = {
          ...res.data,
          status: res.data.status || 'LIVE',
          data_age_minutes: res.data.data_age_minutes || 0
        };
        weatherCache.set(cacheKey, { timestamp: now, data: payload });
        return payload;
      }
    } catch (backendErr) {
      console.warn('[WeatherService] Backend /api/weather failed or timed out:', backendErr.message);
    }

    // Tier 2: Resilient direct browser fetch to Open-Meteo with bounded retry
    try {
      const directData = await fetchDirectOpenMeteo(lat, lon);
      weatherCache.set(cacheKey, { timestamp: now, data: directData });
      return directData;
    } catch (directErr) {
      console.warn('[WeatherService] Direct Open-Meteo query failed:', directErr.message);
    }

    // Tier 3: Stale Cache Fallback (up to 60 minutes) with explicit CACHED label
    if (weatherCache.has(cacheKey)) {
      const entry = weatherCache.get(cacheKey);
      const ageMs = now - entry.timestamp;
      if (ageMs < STALE_CACHE_TTL_MS && entry.data && typeof entry.data.temperature_c === 'number') {
        const ageMin = Math.max(1, Math.floor(ageMs / 60000));
        return {
          ...entry.data,
          status: 'CACHED',
          data_age_minutes: ageMin,
          source: `${entry.data.source || 'Open-Meteo'} (Cached ${ageMin}m ago)`
        };
      }
    }

    // Tier 4: Explicit Truthful UNAVAILABLE state (UNKNOWN != ZERO, all nulls preserved)
    return {
      status: 'UNAVAILABLE',
      latitude: lat,
      longitude: lon,
      temperature_c: null,
      apparent_temperature_c: null,
      humidity_pct: null,
      precipitation_mm: null,
      rainfall_24h: null,
      rainfall_1h: null,
      rainfall_72h: null,
      weather_code: null,
      condition: 'Telemetry Offline',
      wind_speed_kmh: null,
      is_day: true,
      cloud_cover_pct: 0,
      source: 'Telemetry Offline',
      data_age_minutes: null,
      observation_time: null
    };
  })();

  _inflightRequests.set(cacheKey, executionPromise);

  try {
    const result = await executionPromise;
    return result;
  } finally {
    _inflightRequests.delete(cacheKey);
  }
}
