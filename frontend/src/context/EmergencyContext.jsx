import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useLocationIntelligence } from './LocationIntelligenceContext';

const EmergencyContext = createContext(null);

export const EmergencyProvider = ({ children }) => {
  const locationIntel = useLocationIntelligence();
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  // Show a temporary banner notification
  const showToast = (message, type = 'info') => {
    setActionMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setActionMessage(null);
    }, 4500);
  };

  const refreshAllData = useCallback(async () => {
    try {
      const [zonesData, reportsData, alertsData, analyticsData, healthData] = await Promise.all([
        api.getRiskZones(),
        api.getCommunityReports(),
        api.getAlerts(),
        api.getAnalytics(),
        api.checkHealth()
      ]);

      setZones(zonesData || []);
      setReports(reportsData || []);
      setAlerts(alertsData || []);
      setAnalytics(analyticsData || null);
      setSystemHealth(healthData || null);

      // Keep selectedZone in sync if already selected, without overwriting live user location
      setSelectedZone((prevSelected) => {
        if (prevSelected) {
          if (prevSelected.is_live_inspected) {
            return prevSelected; // Keep user's live inspected location intact!
          }
          const updated = (zonesData || []).find(z => z.zone_id === prevSelected.zone_id);
          return updated || prevSelected;
        }
        return zonesData && zonesData.length > 0 ? (zonesData.find(z => z.zone_id === 'HP-01') || zonesData[0]) : null;
      });
    } catch (err) {
      console.error('Error loading landslide emergency data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
    // Periodic refresh every 30s
    const interval = setInterval(refreshAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sync selectedZone when user's location or weather updates
  useEffect(() => {
    if (locationIntel?.location?.latitude && locationIntel?.weather && !locationIntel.weather.loading) {
      const loc = locationIntel.location;
      const w = locationIntel.weather;
      const intel = locationIntel.intelligence || {};
      const t = intel.terrain || {};
      const r = intel.risk || {};

      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);

      setSelectedZone(prev => ({
        ...prev,
        zone_id: `GPS-${lat.toFixed(2)}-${lng.toFixed(2)}`,
        name: loc.displayName || `Sector (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        state: loc.state || loc.country || '',
        district: loc.city || '',
        formatted_address: loc.displayName,
        center: { lat, lng },
        coordinates: { lat, lng },
        temperature_c: w.temperature_c,
        humidity_pct: w.humidity_pct,
        weather_code: w.weather_code,
        condition: w.condition,
        is_day: w.is_day,
        rainfall_1h: w.precipitation_mm || 0,
        rain_current_mm: w.precipitation_mm || 0,
        rainfall_24h: w.rainfall_24h || 0,
        soil_moisture: intel.soil_moisture?.volumetric_m3m3 || 0.35,
        slope_deg: t.slope_deg || 3.5,
        risk_score: r.risk_score || 12.0,
        risk_level: r.risk_level || 'LOW',
        weather_source: w.source,
        is_live_inspected: true,
        is_weather_loading: false
      }));
    }
  }, [locationIntel?.location?.latitude, locationIntel?.location?.longitude, locationIntel?.location?.displayName, locationIntel?.weather, locationIntel?.intelligence]);

  const selectZoneById = (zoneId) => {
    const found = zones.find(z => z.zone_id === zoneId);
    if (found) {
      setSelectedZone(found);
    }
  };

  const handleCreateReport = async (reportPayload) => {
    try {
      const created = await api.submitCommunityReport(reportPayload);
      showToast('Ground report submitted successfully.', 'success');
      await refreshAllData();
      return created;
    } catch (err) {
      showToast('Failed to submit report. Please check the required fields.', 'error');
      throw err;
    }
  };

  const handleVerifyReport = async (reportId, status, notes = '') => {
    try {
      const res = await api.verifyCommunityReport(reportId, status, notes);
      showToast(
        status.toUpperCase() === 'VERIFIED'
          ? 'Report verified successfully.'
          : 'Report marked as unverified.',
        'success'
      );
      await refreshAllData();
      return res;
    } catch (err) {
      showToast('Error updating report status.', 'error');
      throw err;
    }
  };

  const handleResetDemo = async () => {
    showToast('Resetting simulation state to baseline demonstration...', 'info');
    try {
      await api.resetDemo();
      await refreshAllData();
      showToast('Simulation state reset to pristine demo scenario.', 'success');
    } catch (err) {
      showToast('Failed to reset demo state.', 'error');
    }
  };

  return (
    <EmergencyContext.Provider
      value={{
        zones,
        selectedZone,
        setSelectedZone,
        selectZoneById,
        reports,
        alerts,
        analytics,
        systemHealth,
        loading,
        actionMessage,
        showToast,
        refreshAllData,
        refreshData: refreshAllData,
        handleCreateReport,
        handleVerifyReport,
        handleResetDemo
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency must be used within an EmergencyProvider');
  return ctx;
};
