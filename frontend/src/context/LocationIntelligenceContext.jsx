/**
 * LANDSAFE SIH 2026 - Centralized Location, Astronomical & Weather Intelligence Provider
 * Single authoritative source of truth for:
 * 1. Live User GPS Location vs. Currently Inspected / Selected Map Location.
 * 2. Real-time Astronomical Environment Engine (true local time, sunrise, sunset, sun/moon positions, moon phase).
 * 3. Verified live WMO meteorological telemetry from Open-Meteo & IMD reanalysis grids.
 * 4. Authoritative reverse geocoding with zero fake/hardcoded fallbacks.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getLiveWeather } from '../services/weatherService';
import { reverseGeocode, formatCoordinateFallback } from '../services/reverseGeocodeService';
import { normalizeWeather } from '../utils/weatherNormalizer';
import { buildEnvironmentState } from '../utils/astronomicalEngine';
import { apiClient } from '../services/api';

const LocationIntelligenceContext = createContext(null);

// Default reference location (Regional Centroid Fallback)
const DEFAULT_FALLBACK_LOCATION = {
  latitude: 12.9716,
  longitude: 77.5946,
  displayName: 'Bengaluru, Karnataka',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  timezone: 'Asia/Kolkata',
  timezoneAbbr: 'IST',
  utcOffsetSeconds: 19800,
  isGps: false,
  source: 'Regional Centroid Fallback'
};

export const LocationIntelligenceProvider = ({ children }) => {
  // 1. Live Physical User GPS Location (stored independently)
  const [userGpsLocation, setUserGpsLocation] = useState(null);

  // 1b. Location Mode: 'gps' (following live GPS) | 'selected' (user intentionally selected on map/search)
  const [locationMode, setLocationMode] = useState('gps');
  const locationModeRef = useRef('gps');

  // Keep ref to latest location to prevent callback instability and stale closures
  const locationRef = useRef(null);

  // Keep ref to ensure auto-discovery runs strictly once on mount
  const hasAutoDiscoveredRef = useRef(false);

  // 2. Authoritative Currently Selected / Inspected Location
  const [location, setLocation] = useState({
    latitude: DEFAULT_FALLBACK_LOCATION.latitude,
    longitude: DEFAULT_FALLBACK_LOCATION.longitude,
    accuracy: null,
    timestamp: null,
    displayName: DEFAULT_FALLBACK_LOCATION.displayName,
    city: DEFAULT_FALLBACK_LOCATION.city,
    state: DEFAULT_FALLBACK_LOCATION.state,
    country: DEFAULT_FALLBACK_LOCATION.country,
    timezone: DEFAULT_FALLBACK_LOCATION.timezone,
    timezoneAbbr: DEFAULT_FALLBACK_LOCATION.timezoneAbbr,
    utcOffsetSeconds: DEFAULT_FALLBACK_LOCATION.utcOffsetSeconds,
    isGps: false,
    source: DEFAULT_FALLBACK_LOCATION.source,
    permissionStatus: 'prompt', // 'prompt' | 'granted' | 'denied' | 'unavailable' | 'timeout'
    loading: false,
    error: null
  });

  // Keep locationRef current
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // 3. Authoritative Live Weather State
  const [weather, setWeather] = useState({
    temperature_c: null,
    apparent_temperature_c: null,
    humidity_pct: null,
    precipitation_mm: null,
    rainfall_24h: null,
    weather_code: null,
    condition: 'Updating...',
    wind_speed_kmh: null,
    is_day: true,
    cloud_cover_pct: 0,
    timezone: DEFAULT_FALLBACK_LOCATION.timezone,
    timezone_abbreviation: DEFAULT_FALLBACK_LOCATION.timezoneAbbr,
    utc_offset_seconds: DEFAULT_FALLBACK_LOCATION.utcOffsetSeconds,
    sunrise: null,
    sunset: null,
    source: 'Initializing...',
    observation_time: null,
    loading: true,
    error: null,
    normalized: normalizeWeather({ is_weather_loading: true })
  });

  // 4. Simulated time offset in hours (0 = Live Real-Time Clock)
  const [timeOffsetHours, setTimeOffsetHoursState] = useState(0);
  const timeOffsetRef = useRef(0);

  // Consolidated Real-Time Environment State (Celestial + Meteorological)
  const [environment, setEnvironment] = useState(() =>
    buildEnvironmentState({
      latitude: DEFAULT_FALLBACK_LOCATION.latitude,
      longitude: DEFAULT_FALLBACK_LOCATION.longitude,
      displayName: DEFAULT_FALLBACK_LOCATION.displayName,
      timezone: DEFAULT_FALLBACK_LOCATION.timezone,
      timezoneAbbr: DEFAULT_FALLBACK_LOCATION.timezoneAbbr,
      utcOffsetSeconds: DEFAULT_FALLBACK_LOCATION.utcOffsetSeconds,
      weather: {},
      currentDate: new Date()
    })
  );

  // 5. Extended Geospatial Intelligence (DEM, slope, soil moisture, USGS seismic)
  const [intelligence, setIntelligence] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);

  // Request counter to discard out-of-order async responses
  const activeReqRef = useRef(0);

  /**
   * Recalculate environment state with latest timestamp or coordinates.
   */
  const recomputeEnvironment = useCallback((lat, lon, name, tz, tzAbbr, offsetSec, currentWeatherObj) => {
    const targetDate = new Date(Date.now() + timeOffsetRef.current * 3600 * 1000);
    const updatedEnv = buildEnvironmentState({
      latitude: lat,
      longitude: lon,
      displayName: name,
      timezone: tz || 'Asia/Kolkata',
      timezoneAbbr: tzAbbr || 'UTC',
      utcOffsetSeconds: offsetSec || 0,
      weather: currentWeatherObj || {},
      currentDate: targetDate
    });
    setEnvironment(updatedEnv);
    return updatedEnv;
  }, []);

  const setTimeOffsetHours = useCallback((offset) => {
    const num = typeof offset === 'number' ? offset : 0;
    timeOffsetRef.current = num;
    setTimeOffsetHoursState(num);
    const targetDate = new Date(Date.now() + num * 3600 * 1000);
    setEnvironment(() => {
      const loc = locationRef.current || DEFAULT_FALLBACK_LOCATION;
      return buildEnvironmentState({
        latitude: loc.latitude,
        longitude: loc.longitude,
        displayName: loc.displayName,
        timezone: loc.timezone || 'Asia/Kolkata',
        timezoneAbbr: loc.timezoneAbbr || 'IST',
        utcOffsetSeconds: loc.utcOffsetSeconds ?? 19800,
        weather,
        currentDate: targetDate
      });
    });
  }, [weather]);

  const weatherReqSeqRef = useRef(0);

  /**
   * Fetch weather and update state with normalized attributes and environment state.
   */
  const updateWeatherForCoords = useCallback(async (lat, lon, forceRefresh = false, locationName = null) => {
    const reqSeq = ++weatherReqSeqRef.current;

    setWeather(prev => ({
      ...prev,
      loading: true,
      error: null,
      normalized: prev.normalized && prev.normalized.type !== 'LOADING' 
        ? prev.normalized 
        : normalizeWeather({ is_weather_loading: true })
    }));

    try {
      const rawWeather = await getLiveWeather(lat, lon, forceRefresh);
      if (reqSeq !== weatherReqSeqRef.current) return null;

      const normalized = normalizeWeather(rawWeather);

      const targetTz = rawWeather.timezone || 'Asia/Kolkata';
      const targetAbbr = rawWeather.timezone_abbreviation || 'UTC';
      const targetOffset = rawWeather.utc_offset_seconds ?? 19800;

      const updatedWeather = {
        temperature_c: rawWeather.temperature_c,
        apparent_temperature_c: rawWeather.apparent_temperature_c,
        humidity_pct: rawWeather.humidity_pct,
        precipitation_mm: rawWeather.precipitation_mm,
        rainfall_24h: rawWeather.rainfall_24h,
        weather_code: rawWeather.weather_code,
        condition: rawWeather.condition,
        wind_speed_kmh: rawWeather.wind_speed_kmh,
        is_day: rawWeather.is_day,
        cloud_cover_pct: rawWeather.cloud_cover_pct ?? 0,
        timezone: targetTz,
        timezone_abbreviation: targetAbbr,
        utc_offset_seconds: targetOffset,
        sunrise: rawWeather.sunrise,
        sunset: rawWeather.sunset,
        source: rawWeather.source,
        observation_time: rawWeather.observation_time,
        status: rawWeather.status || 'LIVE',
        data_age_minutes: rawWeather.data_age_minutes || 0,
        loading: false,
        error: null,
        normalized
      };

      setWeather(updatedWeather);

      // Recompute authoritative environment state using current location name if not provided
      const resolvedDisplayName = locationName || (locationRef.current ? locationRef.current.displayName : '');
      recomputeEnvironment(
        lat,
        lon,
        resolvedDisplayName,
        targetTz,
        targetAbbr,
        targetOffset,
        updatedWeather
      );

      return rawWeather;
    } catch (err) {
      if (reqSeq !== weatherReqSeqRef.current) return null;
      console.error('[LocationIntelligence] Weather update error:', err);
      const unavailableNormalized = normalizeWeather({ status: 'UNAVAILABLE' });
      setWeather(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Live weather temporarily unavailable',
        normalized: unavailableNormalized
      }));

      // Recompute environment with fallback
      const resolvedDisplayName = locationName || (locationRef.current ? locationRef.current.displayName : '');
      recomputeEnvironment(
        lat,
        lon,
        resolvedDisplayName,
        'Asia/Kolkata',
        'IST',
        19800,
        {}
      );
      return null;
    }
  }, [recomputeEnvironment]);

  /**
   * Asynchronously load deep geospatial intelligence (DEM, slope, risk prediction).
   */
  const updateDeepIntelligence = useCallback(async (lat, lon, sourceLabel) => {
    setIntelLoading(true);
    try {
      const res = await apiClient.get('/location-intelligence', {
        params: { lat, lng: lon, source: sourceLabel },
        timeout: 10000
      });
      if (res.data) {
        setIntelligence(res.data);
      }
    } catch (err) {
      console.warn('[LocationIntelligence] Deep intelligence endpoint not responding:', err.message);
    } finally {
      setIntelLoading(false);
    }
  }, []);

  /**
   * Set location manually (from map click, zone select, or coordinate inspection).
   * Switches authoritative viewing location away from GPS to the selected map coordinates.
   */
  const setManualLocation = useCallback(async (lat, lon, customName = null) => {
    // Explicit user action: user chose a specific place on map
    locationModeRef.current = 'selected';
    setLocationMode('selected');

    const reqId = ++activeReqRef.current;
    setLocation(prev => ({
      ...prev,
      latitude: lat,
      longitude: lon,
      loading: true,
      error: null,
      isGps: false,
      source: customName ? `Selected: ${customName}` : 'Map Selection'
    }));

    // Concurrent: reverse geocode and fetch weather
    const geocodePromise = customName 
      ? Promise.resolve({ displayName: customName, city: customName, state: '', country: '' })
      : reverseGeocode(lat, lon);

    const [geoResult] = await Promise.all([
      geocodePromise,
      updateWeatherForCoords(lat, lon, false, customName)
    ]);

    if (reqId !== activeReqRef.current) return;

    const finalName = geoResult.displayName || formatCoordinateFallback(lat, lon);

    setLocation(prev => ({
      ...prev,
      latitude: lat,
      longitude: lon,
      displayName: finalName,
      city: geoResult.city || '',
      state: geoResult.state || '',
      country: geoResult.country || '',
      accuracy: null,
      loading: false,
      isGps: false,
      source: customName ? `Selected: ${customName}` : 'Map Selection'
    }));

    updateDeepIntelligence(lat, lon, customName || 'Map Selection');
  }, [updateWeatherForCoords, updateDeepIntelligence]);

  /**
   * Request physical GPS location from user browser.
   * If explicitUserAction is true (e.g. user clicked "Locate Me"), switches locationMode to 'gps'
   * and updates both userGpsLocation AND location.
   * If explicitUserAction is false (background / mount check), ONLY updates userGpsLocation,
   * and only updates location if locationMode is currently 'gps'.
   * Returns a Promise resolving to { success: boolean, location?: object, error?: string }.
   */
  const requestLocation = useCallback((explicitUserAction = false) => {
    return new Promise((resolve) => {
      const isExplicit = explicitUserAction === true || 
        (explicitUserAction && typeof explicitUserAction === 'object' && ('nativeEvent' in explicitUserAction || 'type' in explicitUserAction));

      if (isExplicit) {
        locationModeRef.current = 'gps';
        setLocationMode('gps');
      }

      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by this browser.';
        if (isExplicit || locationModeRef.current === 'gps') {
          setLocation(prev => ({
            ...prev,
            permissionStatus: 'unavailable',
            loading: false,
            error: errorMsg
          }));
        }
        resolve({ success: false, error: errorMsg, code: 'UNSUPPORTED' });
        return;
      }

      const reqId = ++activeReqRef.current;
      if (isExplicit || locationModeRef.current === 'gps') {
        setLocation(prev => ({ ...prev, loading: true, error: null }));
      }

      const attemptGeolocation = (highAccuracy = true) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;

            // Concurrent: reverse geocode and fetch weather
            const [geoResult] = await Promise.all([
              reverseGeocode(latitude, longitude),
              updateWeatherForCoords(latitude, longitude, false, null)
            ]);

            const resolvedName = geoResult.displayName || formatCoordinateFallback(latitude, longitude);

            const gpsRecord = {
              latitude,
              longitude,
              accuracy: Math.round(accuracy || 10),
              timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
              displayName: resolvedName,
              city: geoResult.city || '',
              state: geoResult.state || '',
              country: geoResult.country || '',
              isGps: true,
              source: 'Live Browser GPS',
              permissionStatus: 'granted'
            };

            // Always update live physical GPS state
            setUserGpsLocation(gpsRecord);

            // Discard out-of-order responses
            if (reqId !== activeReqRef.current) {
              resolve({ success: true, location: gpsRecord, stale: true });
              return;
            }

            // CRITICAL: If the user has intentionally selected another location,
            // DO NOT let background GPS overwrite the user's selected map location!
            if (locationModeRef.current !== 'gps') {
              resolve({ success: true, location: gpsRecord, preservedSelection: true });
              return;
            }

            setLocation({
              ...gpsRecord,
              loading: false,
              error: null
            });

            updateDeepIntelligence(latitude, longitude, 'Live Browser GPS');
            resolve({ success: true, location: gpsRecord });
          },
          (err) => {
            // If high accuracy timed out or was unavailable on this device, gracefully retry once with standard accuracy
            if (highAccuracy && (err.code === 2 || err.code === 3)) {
              console.warn('[LocationIntelligence] High accuracy geolocation unavailable/timed out, retrying with standard accuracy...');
              attemptGeolocation(false);
              return;
            }

            if (reqId !== activeReqRef.current) {
              resolve({ success: false, error: 'Request superseded', code: 'SUPERSEDED' });
              return;
            }
            console.warn('[LocationIntelligence] Geolocation error:', err.code, err.message);

            let status = 'unavailable';
            let friendlyError = 'Could not retrieve GPS coordinates.';

            if (err.code === 1) { // PERMISSION_DENIED
              status = 'denied';
              friendlyError = 'Location permission was denied. Please allow location access in your browser.';
            } else if (err.code === 2) { // POSITION_UNAVAILABLE
              status = 'unavailable';
              friendlyError = 'Unable to determine your current location. Please check your device network/GPS connection.';
            } else if (err.code === 3) { // TIMEOUT
              status = 'timeout';
              friendlyError = 'GPS position request timed out. Please try again.';
            }

            if (isExplicit || locationModeRef.current === 'gps') {
              setLocation(prev => ({
                ...prev,
                permissionStatus: status,
                loading: false,
                error: friendlyError
              }));
              updateWeatherForCoords(DEFAULT_FALLBACK_LOCATION.latitude, DEFAULT_FALLBACK_LOCATION.longitude);
            }

            resolve({ success: false, error: friendlyError, code: status, rawCode: err.code });
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 10000 : 8000,
            maximumAge: isExplicit ? 0 : 30000
          }
        );
      };

      attemptGeolocation(true);
    });
  }, [updateWeatherForCoords, updateDeepIntelligence]);

  /**
   * Search for a location by string query.
   */
  const searchLocation = useCallback(async (query) => {
    if (!query || !query.trim()) return null;
    const cleanQuery = query.trim();

    // Explicit user action: user searched for a specific place
    locationModeRef.current = 'selected';
    setLocationMode('selected');

    const reqId = ++activeReqRef.current;
    setLocation(prev => ({ ...prev, loading: true, error: null }));

    try {
      let lat = null;
      let lon = null;
      let displayName = '';
      let locality = '';
      let state = '';
      let country = '';

      // Check if query is coordinates format (e.g. "31.1048, 77.1734")
      const coordMatch = cleanQuery.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/);
      if (coordMatch) {
        const parts = cleanQuery.split(/[,\s]+/).filter(Boolean);
        lat = parseFloat(parts[0]);
        lon = parseFloat(parts[1]);
        const rev = await reverseGeocode(lat, lon).catch(() => null);
        displayName = rev?.displayName || formatCoordinateFallback(lat, lon);
        locality = rev?.city || '';
        state = rev?.state || '';
        country = rev?.country || '';
      } else {
        // Try backend geocode endpoint first (avoids browser CORS and custom header limitations)
        let resolved = null;
        try {
          const geoRes = await apiClient.post('/safe-route/geocode', { query: cleanQuery }, { timeout: 8000 });
          if (geoRes.data && typeof geoRes.data.lat === 'number' && typeof geoRes.data.lng === 'number') {
            resolved = {
              lat: geoRes.data.lat,
              lon: geoRes.data.lng,
              displayName: geoRes.data.full_name || geoRes.data.name
            };
          }
        } catch {
          // Backend geocode fallback
        }

        if (resolved) {
          lat = resolved.lat;
          lon = resolved.lon;
          displayName = resolved.displayName;
        } else {
          // Fallback to client-side Nominatim search
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&limit=1&addressdetails=1`;
          const res = await fetch(url, {
            headers: {
              'Accept': 'application/json'
            }
          });
          const data = await res.json();
          if (!data || data.length === 0) {
            throw new Error(`Location "${cleanQuery}" could not be resolved. Please enter a valid city, town, or district.`);
          }

          const item = data[0];
          lat = parseFloat(item.lat);
          lon = parseFloat(item.lon);
          const addr = item.address || {};
          locality = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || '';
          state = addr.state || '';
          country = addr.country || '';
          displayName = [locality, state, country].filter(Boolean).join(', ') || item.display_name.split(',').slice(0, 2).join(', ');
        }
      }

      if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
        throw new Error(`Location "${cleanQuery}" could not be resolved.`);
      }

      if (reqId !== activeReqRef.current) return null;

      await updateWeatherForCoords(lat, lon, false, displayName);

      if (reqId !== activeReqRef.current) return null;

      const newLoc = {
        latitude: lat,
        longitude: lon,
        accuracy: null,
        timestamp: new Date().toISOString(),
        displayName,
        city: locality,
        state,
        country,
        isGps: false,
        source: `Search: ${cleanQuery}`,
        permissionStatus: locationRef.current ? locationRef.current.permissionStatus : 'prompt',
        loading: false,
        error: null
      };

      setLocation(newLoc);
      updateDeepIntelligence(lat, lon, `Search: ${cleanQuery}`);
      return newLoc;
    } catch (err) {
      if (reqId !== activeReqRef.current) return null;
      console.warn('[LocationIntelligence] Search failed:', err.message);
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Search failed'
      }));
      return null;
    }
  }, [updateWeatherForCoords, updateDeepIntelligence]);

  // Initial Auto-Discovery on mount (strictly runs once)
  useEffect(() => {
    if (hasAutoDiscoveredRef.current) return;
    hasAutoDiscoveredRef.current = true;

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        if (status.state === 'granted' || status.state === 'prompt') {
          requestLocation(false);
        } else {
          setLocation(prev => ({
            ...prev,
            permissionStatus: 'denied',
            loading: false
          }));
          updateWeatherForCoords(DEFAULT_FALLBACK_LOCATION.latitude, DEFAULT_FALLBACK_LOCATION.longitude);
        }
      }).catch(() => {
        requestLocation(false);
      });
    } else {
      requestLocation(false);
    }
  }, [requestLocation, updateWeatherForCoords]);

  // High-Precision Real-Time Clock Ticker (Every 3 seconds)
  // Continuously recalculates celestial sun & moon positions and local time
  // without triggering excessive network requests.
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const targetDate = new Date(Date.now() + timeOffsetRef.current * 3600 * 1000);
      setEnvironment(prev => {
        return buildEnvironmentState({
          latitude: location.latitude,
          longitude: location.longitude,
          displayName: location.displayName,
          timezone: location.timezone || weather.timezone || 'Asia/Kolkata',
          timezoneAbbr: location.timezoneAbbr || weather.timezone_abbreviation || 'UTC',
          utcOffsetSeconds: location.utcOffsetSeconds ?? weather.utc_offset_seconds ?? 19800,
          weather,
          currentDate: targetDate
        });
      });
    }, 3000);

    return () => clearInterval(clockInterval);
  }, [location.latitude, location.longitude, location.displayName, location.timezone, location.timezoneAbbr, location.utcOffsetSeconds, weather]);

  const value = {
    location,
    userGpsLocation,
    liveGpsLocation: userGpsLocation,
    selectedMapLocation: location,
    locationMode,
    weather,
    environment,
    intelligence,
    intelLoading,
    requestLocation,
    setManualLocation,
    searchLocation,
    timeOffsetHours,
    setTimeOffsetHours,
    refreshWeather: () => updateWeatherForCoords(
      locationRef.current ? locationRef.current.latitude : location.latitude,
      locationRef.current ? locationRef.current.longitude : location.longitude,
      true
    ),
    // Backward-compatibility aliases
    selectedLocation: {
      latitude: location.latitude,
      longitude: location.longitude,
      displayName: location.displayName,
      accuracy: location.accuracy || 10,
      timestamp: location.timestamp || new Date().toISOString(),
      source: location.source,
      country: location.country,
      stateProvince: location.state,
      locality: location.city,
      timezone: location.timezone,
      utcOffsetSeconds: location.utcOffsetSeconds
    },
    useLiveGps: () => requestLocation(true),
    inspectCoordinates: (lat, lng, label) => setManualLocation(lat, lng, label),
    searchPlace: searchLocation,
    loading: location.loading || weather.loading,
    error: location.error || weather.error
  };

  return (
    <LocationIntelligenceContext.Provider value={value}>
      {children}
    </LocationIntelligenceContext.Provider>
  );
};

export const useLocationIntelligence = () => {
  const context = useContext(LocationIntelligenceContext);
  if (!context) {
    throw new Error('useLocationIntelligence must be used within a LocationIntelligenceProvider');
  }
  return context;
};

export default LocationIntelligenceContext;
