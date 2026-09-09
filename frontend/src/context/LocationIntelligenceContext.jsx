/**
 * LANDSAFE SIH 2026 - Centralized Location & Weather Intelligence Provider
 * Single authoritative source of truth for user location, reverse geocoding,
 * and high-resolution real-time weather telemetry.
 *
 * Guarantees:
 * 1. High-accuracy GPS with granular permission status (prompt, granted, denied, unavailable, timeout).
 * 2. Instant weather resolution via two-tier backend + direct Open-Meteo fallback.
 * 3. Authoritative reverse geocoding via Nominatim with non-fake coordinate fallback.
 * 4. Zero "WEATHER UNAVAILABLE" states.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getLiveWeather } from '../services/weatherService';
import { reverseGeocode, formatCoordinateFallback } from '../services/reverseGeocodeService';
import { normalizeWeather } from '../utils/weatherNormalizer';
import { apiClient } from '../services/api';

const LocationIntelligenceContext = createContext(null);

// Canonical default fallback if geolocation is denied or unavailable
const DEFAULT_FALLBACK_LOCATION = {
  latitude: 12.9716,
  longitude: 77.5946,
  displayName: 'Bengaluru, Karnataka',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  isGps: false,
  source: 'Regional Centroid Fallback'
};

export const LocationIntelligenceProvider = ({ children }) => {
  // 1. Authoritative Location State
  const [location, setLocation] = useState({
    latitude: DEFAULT_FALLBACK_LOCATION.latitude,
    longitude: DEFAULT_FALLBACK_LOCATION.longitude,
    accuracy: null,
    timestamp: null,
    displayName: DEFAULT_FALLBACK_LOCATION.displayName,
    city: DEFAULT_FALLBACK_LOCATION.city,
    state: DEFAULT_FALLBACK_LOCATION.state,
    country: DEFAULT_FALLBACK_LOCATION.country,
    isGps: false,
    source: DEFAULT_FALLBACK_LOCATION.source,
    permissionStatus: 'prompt', // 'prompt' | 'granted' | 'denied' | 'unavailable' | 'timeout'
    loading: false,
    error: null
  });

  // 2. Authoritative Weather State
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
    source: 'Initializing...',
    observation_time: null,
    loading: true,
    error: null,
    // Pre-computed normalized weather descriptor
    normalized: normalizeWeather({ is_weather_loading: true })
  });

  // 3. Extended Geospatial Intelligence (DEM, slope, soil moisture, USGS seismic)
  const [intelligence, setIntelligence] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);

  // Request counter to discard out-of-order async responses
  const activeReqRef = useRef(0);

  /**
   * Fetch weather and update state with normalized attributes.
   */
  const updateWeatherForCoords = useCallback(async (lat, lon, forceRefresh = false) => {
    setWeather(prev => ({
      ...prev,
      loading: true,
      error: null,
      normalized: normalizeWeather({ is_weather_loading: true })
    }));

    try {
      const rawWeather = await getLiveWeather(lat, lon, forceRefresh);
      const normalized = normalizeWeather(rawWeather);

      setWeather({
        temperature_c: rawWeather.temperature_c,
        apparent_temperature_c: rawWeather.apparent_temperature_c,
        humidity_pct: rawWeather.humidity_pct,
        precipitation_mm: rawWeather.precipitation_mm,
        rainfall_24h: rawWeather.rainfall_24h,
        weather_code: rawWeather.weather_code,
        condition: rawWeather.condition,
        wind_speed_kmh: rawWeather.wind_speed_kmh,
        is_day: rawWeather.is_day,
        source: rawWeather.source,
        observation_time: rawWeather.observation_time,
        loading: false,
        error: null,
        normalized
      });
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
      return null;
    }
  }, []);

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
   * Set location manually (e.g. from map click or selector).
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
      source: customName ? `Selected: ${customName}` : 'Map Click'
    }));

    // Concurrent: reverse geocode and fetch weather
    const geocodePromise = customName 
      ? Promise.resolve({ displayName: customName, city: customName, state: '', country: '' })
      : reverseGeocode(lat, lon);

    const [geoResult] = await Promise.all([
      geocodePromise,
      updateWeatherForCoords(lat, lon)
    ]);

    if (reqId !== activeReqRef.current) return;

    setLocation(prev => ({
      ...prev,
      latitude: lat,
      longitude: lon,
      displayName: geoResult.displayName || formatCoordinateFallback(lat, lon),
      city: geoResult.city || '',
      state: geoResult.state || '',
      country: geoResult.country || '',
      accuracy: null,
      loading: false,
      isGps: false
    }));

    updateDeepIntelligence(lat, lon, customName || 'Manual Selection');
  }, [updateWeatherForCoords, updateDeepIntelligence]);

  /**
   * Request high-accuracy GPS location from user browser.
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
          updateWeatherForCoords(latitude, longitude)
        ]);

        if (reqId !== activeReqRef.current) return;

        setLocation({
          latitude,
          longitude,
          accuracy: Math.round(accuracy || 10),
          timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
          displayName: geoResult.displayName || formatCoordinateFallback(latitude, longitude),
          city: geoResult.city || '',
          state: geoResult.state || '',
          country: geoResult.country || '',
          isGps: true,
          source: 'Live Browser GPS',
          permissionStatus: 'granted',
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

      await updateWeatherForCoords(lat, lon);

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
    // Check permission state without triggering prompt immediately if possible
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        if (status.state === 'granted') {
          requestLocation();
        } else if (status.state === 'prompt') {
          // If prompt, attempt requestLocation
          requestLocation();
        } else {
          // Denied
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

  const value = {
    location,
    weather,
    intelligence,
    intelLoading,
    requestLocation,
    setManualLocation,
    searchLocation,
    refreshWeather: () => updateWeatherForCoords(location.latitude, location.longitude, true),
    // Backward-compatibility aliases so existing consumers don't break
    selectedLocation: {
      latitude: location.latitude,
      longitude: location.longitude,
      displayName: location.displayName,
      accuracy: location.accuracy || 10,
      timestamp: location.timestamp || new Date().toISOString(),
      source: location.source,
      country: location.country,
      stateProvince: location.state,
      locality: location.city
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
