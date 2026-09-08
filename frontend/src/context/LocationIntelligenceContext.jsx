import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const LocationIntelligenceContext = createContext();

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const LocationIntelligenceProvider = ({ children }) => {
  // Default canonical location (Harohalli / Jakkasandra Karnataka initially or user GPS)
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 12.6445,
    longitude: 77.4365,
    displayName: 'Harohalli / Jakkasandra, Karnataka',
    country: 'India',
    countryCode: 'IN',
    stateProvince: 'Karnataka',
    district: 'Ramanagara',
    locality: 'Harohalli',
    timestamp: new Date().toISOString(),
    accuracy: 10,
    source: 'Default Location'
  });

  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch unified location intelligence from backend orchestrator
  const fetchIntelligence = useCallback(async (lat, lng, sourceLabel = 'Map / User Inspection') => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/location-intelligence`, {
        params: { lat, lng, source: sourceLabel }
      });
      const data = res.data;
      setIntelligence(data);
      if (data.location) {
        setSelectedLocation({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          displayName: data.location.display_name,
          country: data.location.country,
          countryCode: data.location.country_code,
          stateProvince: data.location.state_province,
          district: data.location.district,
          locality: data.location.locality,
          timestamp: data.location.timestamp,
          accuracy: data.location.accuracy || 10,
          source: sourceLabel
        });
      }
      return data;
    } catch (err) {
      console.error('Location intelligence fetch failed:', err);
      setError(err?.response?.data?.detail || 'Failed to retrieve location intelligence');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search by place query string
  const searchPlace = async (query) => {
    if (!query || !query.trim()) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/location-intelligence/search`, { query });
      const data = res.data;
      setIntelligence(data);
      if (data.location) {
        setSelectedLocation({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          displayName: data.location.display_name,
          country: data.location.country,
          countryCode: data.location.country_code,
          stateProvince: data.location.state_province,
          district: data.location.district,
          locality: data.location.locality,
          timestamp: data.location.timestamp,
          accuracy: data.location.accuracy || 10,
          source: `Search: ${query}`
        });
      }
      return data;
    } catch (err) {
      console.error('Place search failed:', err);
      setError(err?.response?.data?.detail || `Location "${query}" could not be found.`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Inspect any clicked or target coordinates
  const inspectCoordinates = (lat, lng, sourceLabel = 'Map Pin') => {
    return fetchIntelligence(lat, lng, sourceLabel);
  };

  // Use browser GPS
  const useLiveGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        fetchIntelligence(latitude, longitude, 'Live Browser GPS');
      },
      (err) => {
        console.warn('GPS position error:', err);
        setLoading(false);
        setError('Unable to access GPS location. Please check browser permissions.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Initial load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchIntelligence(pos.coords.latitude, pos.coords.longitude, 'Live Browser GPS');
        },
        () => {
          fetchIntelligence(12.6445, 77.4365, 'Initial Centroid');
        },
        { timeout: 4000 }
      );
    } else {
      fetchIntelligence(12.6445, 77.4365, 'Initial Centroid');
    }
  }, [fetchIntelligence]);

  return (
    <LocationIntelligenceContext.Provider
      value={{
        selectedLocation,
        intelligence,
        loading,
        error,
        inspectCoordinates,
        searchPlace,
        useLiveGps,
        refreshIntelligence: () => fetchIntelligence(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.source)
      }}
    >
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
