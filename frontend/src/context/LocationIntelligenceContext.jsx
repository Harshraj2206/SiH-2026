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

  // 3. Authoritative Live Weather State
  const [weather, setWeather] = useState({
    temperature_c: null,
    apparent_temperature_c: null,
    humidity_pct: null,
    precipitation_mm: 0,
    rainfall_24h: 0,
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

  // 4. Consolidated Real-Time Environment State (Celestial + Meteorological)
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
    const updatedEnv = buildEnvironmentState({
      latitude: lat,
      longitude: lon,
      displayName: name,
      timezone: tz || 'Asia/Kolkata',
      timezoneAbbr: tzAbbr || 'UTC',
      utcOffsetSeconds: offsetSec || 0,
      weather: currentWeatherObj || {},
      currentDate: new Date()
    });
    setEnvironment(updatedEnv);
    return updatedEnv;
  }, []);

  /**
   * Fetch weather and update state with normalized attributes and environment state.
   */
  const updateWeatherForCoords = useCallback(async (lat, lon, forceRefresh = false, locationName = null) => {
    setWeather(prev => ({
      ...prev,
      loading: true,
      error: null,
      normalized: normalizeWeather({ is_weather_loading: true })
    }));

    try {
      const rawWeather = await getLiveWeather(lat, lon, forceRefresh);
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
        loading: false,
        error: null,
        normalized
      };

      setWeather(updatedWeather);

      // Recompute authoritative environment state
      recomputeEnvironment(
        lat,
        lon,
        locationName || location.displayName,
        targetTz,
        targetAbbr,
        targetOffset,
        updatedWeather
      );

      return rawWeather;
    } catch (err) {
      console.error('[LocationIntelligence] Weather update error:', err);
      setWeather(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Live weather temporarily unavailable',
        normalized: {
          type: 'UNKNOWN',
          label: 'Live weather temporarily unavailable',
          icon: '⚠️',
          temp: null,
          tempFormatted: '—',
          rain24h: 0,
          currentRain: 0,
          humidity: null,
          isDay: true,
          theme: 'neutral',
          source: 'Telemetry Offline',
          observationTime: null
        }
      }));

      // Recompute environment with fallback
      recomputeEnvironment(
        lat,
        lon,
        locationName || location.displayName,
        'Asia/Kolkata',
        'IST',
        19800,
        {}
      );
      return null;
    }
  }, [location.displayName, recomputeEnvironment]);

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
   * Request high-accuracy physical GPS location from user browser.
   * Updates userGpsLocation AND switches viewing location back to user's live GPS.
   */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        permissionStatus: 'unavailable',
        loading: false,
        error: 'Geolocation is not supported by this browser.'
      }));
      return;
    }

    const reqId = ++activeReqRef.current;
    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (reqId !== activeReqRef.current) return;
        const { latitude, longitude, accuracy } = pos.coords;

        // Concurrent: reverse geocode and fetch weather
        const [geoResult] = await Promise.all([
          reverseGeocode(latitude, longitude),
          updateWeatherForCoords(latitude, longitude, false, null)
        ]);

        if (reqId !== activeReqRef.current) return;

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

        setUserGpsLocation(gpsRecord);
        setLocation({
          ...gpsRecord,
          loading: false,
          error: null
        });

        updateDeepIntelligence(latitude, longitude, 'Live Browser GPS');
      },
      (err) => {
        if (reqId !== activeReqRef.current) return;
        console.warn('[LocationIntelligence] Geolocation error:', err.code, err.message);

        let status = 'unavailable';
        let friendlyError = 'Could not retrieve GPS coordinates.';

        if (err.code === 1) { // PERMISSION_DENIED
          status = 'denied';
          friendlyError = 'Location access was denied. Defaulting to sector centroid.';
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          status = 'unavailable';
          friendlyError = 'GPS position unavailable. Defaulting to sector centroid.';
        } else if (err.code === 3) { // TIMEOUT
          status = 'timeout';
          friendlyError = 'GPS position request timed out. Defaulting to sector centroid.';
        }

        setLocation(prev => ({
          ...prev,
          permissionStatus: status,
          loading: false,
          error: friendlyError
        }));

        // Fetch weather for fallback location if weather not yet loaded
        updateWeatherForCoords(DEFAULT_FALLBACK_LOCATION.latitude, DEFAULT_FALLBACK_LOCATION.longitude);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, [updateWeatherForCoords, updateDeepIntelligence]);

  /**
   * Search for a location by string query.
   */
  const searchLocation = useCallback(async (query) => {
    if (!query || !query.trim()) return null;
    const reqId = ++activeReqRef.current;
    setLocation(prev => ({ ...prev, loading: true, error: null }));

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LandSafe-Emergency-Risk-Platform/1.0'
        }
      });
      const data = await res.json();
      if (!data || data.length === 0) {
        throw new Error(`Location "${query}" could not be resolved.`);
      }

      const item = data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      const addr = item.address || {};
      const locality = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || '';
      const state = addr.state || '';
      const country = addr.country || '';
      const displayName = [locality, state, country].filter(Boolean).join(', ') || item.display_name.split(',').slice(0, 2).join(', ');

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
        source: `Search: ${query}`,
        permissionStatus: location.permissionStatus,
        loading: false,
        error: null
      };

      setLocation(newLoc);
      updateDeepIntelligence(lat, lon, `Search: ${query}`);
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
  }, [location.permissionStatus, updateWeatherForCoords, updateDeepIntelligence]);

  // Initial Auto-Discovery on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        if (status.state === 'granted' || status.state === 'prompt') {
          requestLocation();
        } else {
          setLocation(prev => ({
            ...prev,
            permissionStatus: 'denied',
            loading: false
          }));
          updateWeatherForCoords(DEFAULT_FALLBACK_LOCATION.latitude, DEFAULT_FALLBACK_LOCATION.longitude);
        }
      }).catch(() => {
        requestLocation();
      });
    } else {
      requestLocation();
    }
  }, [requestLocation, updateWeatherForCoords]);

  // High-Precision Real-Time Clock Ticker (Every 10 seconds)
  // Continuously recalculates celestial sun & moon positions and local time
  // without triggering excessive network requests.
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setEnvironment(prev => {
        return buildEnvironmentState({
          latitude: location.latitude,
          longitude: location.longitude,
          displayName: location.displayName,
          timezone: location.timezone || weather.timezone || 'Asia/Kolkata',
          timezoneAbbr: location.timezoneAbbr || weather.timezone_abbreviation || 'UTC',
          utcOffsetSeconds: location.utcOffsetSeconds ?? weather.utc_offset_seconds ?? 19800,
          weather,
          currentDate: new Date()
        });
      });
    }, 10000);

    return () => clearInterval(clockInterval);
  }, [location.latitude, location.longitude, location.displayName, location.timezone, location.timezoneAbbr, location.utcOffsetSeconds, weather]);

  const value = {
    location,
    userGpsLocation,
    weather,
    environment,
    intelligence,
    intelLoading,
    requestLocation,
    setManualLocation,
    searchLocation,
    refreshWeather: () => updateWeatherForCoords(location.latitude, location.longitude, true),
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
    useLiveGps: requestLocation,
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
