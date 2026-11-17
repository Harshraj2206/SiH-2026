import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 12000,
});

// The server's shared IP can be rate-limited by Open-Meteo, so the browser fetches the
// same forecast from its own IP and sends it along; the server uses it only as a fallback.
export const fetchOpenMeteoRaw = async (lat, lon) => {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,is_day,cloud_cover'
    + '&daily=sunrise,sunset,precipitation_sum'
    + '&hourly=temperature_2m,precipitation,precipitation_probability,soil_moisture_0_to_7cm'
    + '&timezone=auto&past_days=3&forecast_days=3';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
};

// Elevation at the point and ~110 m north and east, used by the server for slope
// (same request the server makes, fetched here for the same reason as above).
export const fetchOpenMeteoElevation = async (lat, lon) => {
  const la = Number(lat), lo = Number(lon), d = 0.001;
  const url = 'https://api.open-meteo.com/v1/elevation'
    + `?latitude=${la.toFixed(5)},${(la + d).toFixed(5)},${la.toFixed(5)}`
    + `&longitude=${lo.toFixed(5)},${lo.toFixed(5)},${(lo + d).toFixed(5)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok ? (await res.json()).elevation || null : null;
  } catch {
    return null;
  }
};

export const fetchBrowserInputs = async (lat, lon) => {
  const [weather, elevation] = await Promise.all([fetchOpenMeteoRaw(lat, lon), fetchOpenMeteoElevation(lat, lon)]);
  return { weather, elevation };
};

// Intercept requests to attach Bearer token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('landsafe_token') || localStorage.getItem('landslide_auth_token') || localStorage.getItem('landslideguard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for unified error logging
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Authentication expired or unauthorized access.');
    }
    return Promise.reject(error);
  }
);

// ---------------- System Health ----------------
export const systemApi = {
  getHealth: async () => {
    const res = await apiClient.get('/health');
    return res.data;
  }
};

// ---------------- Authentication & User Profile ----------------
export const authApi = {
  register: async (registerData) => {
    const res = await apiClient.post('/auth/register', registerData);
    return res.data;
  },
  login: async (identifier, password) => {
    const res = await apiClient.post('/auth/login', { identifier, password });
    return res.data;
  },
  getProfile: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  updateProfile: async (profileData) => {
    const res = await apiClient.patch('/auth/profile', profileData);
    return res.data;
  },
  addEmergencyContact: async (contactData) => {
    const res = await apiClient.post('/auth/emergency-contacts', contactData);
    return res.data;
  },
  deleteEmergencyContact: async (contactId) => {
    const res = await apiClient.delete(`/auth/emergency-contacts/${contactId}`);
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },
  logout: async () => {
    try {
      const res = await apiClient.post('/auth/logout');
      return res.data;
    } catch {
      return { status: 'success' };
    }
  },
};

// ---------------- Risk Zones & ML Telemetry ----------------
export const riskZonesApi = {
  getZones: async (params = {}) => {
    const res = await apiClient.get('/risk-zones', { params });
    return res.data;
  },
  getZoneDetail: async (zoneId) => {
    const res = await apiClient.get(`/risk-zones/${zoneId}`);
    return res.data;
  },
  predictRisk: async (payload) => {
    const res = await apiClient.post('/predict', payload);
    return res.data;
  },
  getModelMetrics: async () => {
    const res = await apiClient.get('/predict/metrics');
    return res.data;
  },
  getSpatialMetrics: async () => {
    const res = await apiClient.get('/predict/spatial-metrics');
    return res.data;
  },
  getFeatureProvenance: async () => {
    const res = await apiClient.get('/predict/provenance');
    return res.data;
  },
  getHistoricalReplay: async () => {
    const res = await apiClient.get('/predict/historical-replay');
    return res.data;
  },
};


// ---------------- Safe Route Engine ----------------
export const safeRouteApi = {
  getWaypoints: async () => {
    const res = await apiClient.get('/safe-route/waypoints');
    return res.data;
  },
  calculateSafeRoute: async (startNode, destNode, avoidBlockedRoads = true) => {
    const res = await apiClient.post('/safe-route', {
      start_node: startNode,
      destination_node: destNode,
      avoid_blocked_roads: avoidBlockedRoads
    }, { timeout: 30000 });
    return res.data;
  },
  calculateGlobalRoute: async (startLat, startLng, destLat, destLng, startName = 'Origin', destName = 'Destination') => {
    const res = await apiClient.post('/safe-route/global', {
      start_lat: startLat,
      start_lng: startLng,
      dest_lat: destLat,
      dest_lng: destLng,
      start_name: startName,
      dest_name: destName
    }, { timeout: 30000 });
    return res.data;
  },
  geocodePlace: async (query) => {
    const res = await apiClient.post('/safe-route/geocode', { query }, { timeout: 10000 });
    return res.data;
  },
};

// ---------------- Community Ground Reports ----------------
export const reportsApi = {
  getReports: async (params = {}) => {
    const res = await apiClient.get('/reports', { params });
    return res.data;
  },
  submitReport: async (reportData) => {
    const res = await apiClient.post('/reports', reportData);
    return res.data;
  },
  verifyReport: async (reportId, status, reviewerNotes = '') => {
    const res = await apiClient.patch(`/reports/${reportId}/verify`, {
      status,
      reviewer_notes: reviewerNotes,
    });
    return res.data;
  },
  getPoll: async () => {
    const res = await apiClient.get('/reports/poll');
    return res.data;
  },
  votePoll: async (optionId) => {
    const res = await apiClient.post('/reports/poll/vote', { option_id: optionId });
    return res.data;
  },
};

// ---------------- GDACS-Style Incidents & Events ----------------
export const incidentsApi = {
  getIncidents: async (params = {}) => {
    const res = await apiClient.get('/incidents', { params });
    return res.data;
  },
  getIntelligence: async (forceRefresh = false) => {
    const res = await apiClient.get('/incidents/intelligence', { params: { force_refresh: forceRefresh } });
    return res.data;
  },
  getProximity: async (lat, lon) => {
    const res = await apiClient.get('/incidents/proximity', { params: { lat, lon } });
    return res.data;
  },
  refreshIntelligence: async () => {
    const res = await apiClient.post('/incidents/refresh');
    return res.data;
  },
  getIncidentDetail: async (incidentId) => {
    const res = await apiClient.get(`/incidents/${incidentId}`);
    return res.data;
  },
  createIncident: async (payload) => {
    const res = await apiClient.post('/incidents', payload);
    return res.data;
  },
  updateIncident: async (incidentId, payload) => {
    const res = await apiClient.patch(`/incidents/${incidentId}`, payload);
    return res.data;
  }
};

// ---------------- Emergency SOS & Triage ----------------
export const sosApi = {
  getSOSRequests: async (params = {}) => {
    const res = await apiClient.get('/sos', { params });
    return res.data;
  },
  triggerSOS: async (payload) => {
    const res = await apiClient.post('/sos', payload);
    return res.data;
  },
  triageSOS: async (sosId, payload) => {
    const res = await apiClient.patch(`/sos/${sosId}/triage`, payload);
    return res.data;
  }
};

// ---------------- Emergency Resources (Roads, Hospitals, Shelters) ----------------
export const resourcesApi = {
  getRoads: async () => {
    const res = await apiClient.get('/resources/roads');
    return res.data;
  },
  updateRoadStatus: async (roadId, status, reason = '') => {
    const res = await apiClient.patch(`/resources/roads/${roadId}`, {
      status,
      obstruction_reason: reason
    });
    return res.data;
  },
  getHospitals: async () => {
    const res = await apiClient.get('/resources/hospitals');
    return res.data;
  },
  getShelters: async () => {
    const res = await apiClient.get('/resources/shelters');
    return res.data;
  },
  getNearbyResources: async (lat, lng, radiusKm = 5, category = 'hospitals', keyword = '') => {
    const res = await apiClient.get('/resources/nearby', {
      params: {
        lat,
        lng,
        radius_km: radiusKm,
        category,
        keyword: keyword || undefined
      }
    });
    return res.data;
  }
};

// ---------------- Alerts & Subscriptions ----------------
export const alertsApi = {
  getAlerts: async (params = {}) => {
    const res = await apiClient.get('/alerts', { params });
    return res.data;
  },
  getSubscription: async (userId = 'default') => {
    const res = await apiClient.get(`/simulation/subscription/${userId}`);
    return res.data;
  },
  saveSubscription: async (payload) => {
    const res = await apiClient.post('/simulation/subscription', payload);
    return res.data;
  }
};

// ---------------- Analytics ----------------
export const analyticsApi = {
  getOverview: async () => {
    const res = await apiClient.get('/analytics');
    return res.data;
  },
};

// ---------------- Unified Composite API ----------------
export const api = {
  checkHealth: systemApi.getHealth,
  getHealth: systemApi.getHealth,

  login: authApi.login,
  getProfile: authApi.getProfile,

  getRiskZones: riskZonesApi.getZones,
  getZones: riskZonesApi.getZones,
  getZoneDetail: riskZonesApi.getZoneDetail,
  predictRisk: riskZonesApi.predictRisk,
  getModelMetrics: riskZonesApi.getModelMetrics,
  getSpatialMetrics: riskZonesApi.getSpatialMetrics,
  getFeatureProvenance: riskZonesApi.getFeatureProvenance,
  getHistoricalReplay: riskZonesApi.getHistoricalReplay,


  getWaypoints: safeRouteApi.getWaypoints,
  calculateSafeRoute: safeRouteApi.calculateSafeRoute,

  getCommunityReports: reportsApi.getReports,
  getReports: reportsApi.getReports,
  submitCommunityReport: reportsApi.submitReport,
  submitReport: reportsApi.submitReport,
  verifyCommunityReport: reportsApi.verifyReport,
  verifyReport: reportsApi.verifyReport,

  getIncidents: incidentsApi.getIncidents,
  getIncidentDetail: incidentsApi.getIncidentDetail,
  createIncident: incidentsApi.createIncident,
  updateIncident: incidentsApi.updateIncident,

  getSOSRequests: sosApi.getSOSRequests,
  triggerSOS: sosApi.triggerSOS,
  triageSOS: sosApi.triageSOS,

  getRoads: resourcesApi.getRoads,
  updateRoadStatus: resourcesApi.updateRoadStatus,
  getHospitals: resourcesApi.getHospitals,
  getShelters: resourcesApi.getShelters,
  getNearbyResources: resourcesApi.getNearbyResources,

  getAlerts: alertsApi.getAlerts,
  getAnalytics: analyticsApi.getOverview,

  inspectTelemetry: async (latitude, longitude) => {
    const inputs = await fetchBrowserInputs(latitude, longitude);
    const res = await apiClient.post('/telemetry/inspect', { latitude, longitude, ...inputs });
    return res.data;
  },

  getDataSources: async () => {
    const res = await apiClient.get('/data-sources');
    return res.data;
  },

  getWeather: async (lat, lon) => {
    const res = await apiClient.get('/weather', { params: { lat, lon } });
    return res.data;
  }
};

export default api;
