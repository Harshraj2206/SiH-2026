import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const EmergencyContext = createContext(null);

export const EmergencyProvider = ({ children }) => {
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
