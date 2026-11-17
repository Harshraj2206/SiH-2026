import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('landslideguard_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Location Permission State (Polite Prompt after login)
  const [locationStatus, setLocationStatus] = useState(() => {
    return localStorage.getItem('landslideguard_location_status') || 'PROMPT'; // 'PROMPT', 'GRANTED', 'DENIED', 'DISMISSED'
  });
  const [userCoordinates, setUserCoordinates] = useState(null);

  // 1. Session Restoration on Initial App Load
  const restoreSession = useCallback(async () => {
    const savedToken = localStorage.getItem('landslideguard_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userProfile = await authApi.getProfile();
      setCurrentUser(userProfile);
      setToken(savedToken);
    } catch (err) {
      console.warn('Session restoration failed or token expired:', err?.response?.data?.detail || err.message);
      localStorage.removeItem('landslideguard_token');
      setToken(null);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoordinates({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {},
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  }, [restoreSession]);

  // 2. Real Login (Supports Email OR Username)
  const login = async (identifier, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await authApi.login(identifier, password);
      setToken(data.access_token);
      setCurrentUser(data.user);
      localStorage.setItem('landslideguard_token', data.access_token);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid username/email or password.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Real Registration (Strictly creates role='USER')
  const register = async (formData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await authApi.register(formData);
      setToken(data.access_token);
      setCurrentUser(data.user);
      localStorage.setItem('landslideguard_token', data.access_token);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please review your input.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 4. Logout
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('landslideguard_token');
    localStorage.removeItem('landsafe_token');
    localStorage.removeItem('landslide_auth_token');
    setToken(null);
    setCurrentUser(null);
    setAuthError(null);
  };

  // 5. Update Profile
  const updateProfile = async (profileData) => {
    try {
      const updated = await authApi.updateProfile(profileData);
      setCurrentUser(updated);
      return updated;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update profile.';
      throw new Error(msg);
    }
  };

  // 6. Emergency Contacts CRUD
  const addEmergencyContact = async (contactData) => {
    try {
      const contacts = await authApi.addEmergencyContact(contactData);
      setCurrentUser(prev => prev ? { ...prev, emergency_contacts: contacts } : null);
      return contacts;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to add emergency contact.';
      throw new Error(msg);
    }
  };

  const deleteEmergencyContact = async (contactId) => {
    try {
      const contacts = await authApi.deleteEmergencyContact(contactId);
      setCurrentUser(prev => prev ? { ...prev, emergency_contacts: contacts } : null);
      return contacts;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete emergency contact.';
      throw new Error(msg);
    }
  };

  // 7. Location Permission Handlers
  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      setLocationStatus('DENIED');
      localStorage.setItem('landslideguard_location_status', 'DENIED');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationStatus('GRANTED');
        localStorage.setItem('landslideguard_location_status', 'GRANTED');
      },
      (error) => {
        console.warn('Geolocation denied or unavailable:', error.message);
        setLocationStatus('DENIED');
        localStorage.setItem('landslideguard_location_status', 'DENIED');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const dismissLocationPrompt = () => {
    setLocationStatus('DISMISSED');
    localStorage.setItem('landslideguard_location_status', 'DISMISSED');
  };

  // 8. Role Helpers & Route Mapping
  const getRoleDefaultRoute = (role) => {
    switch (role?.toUpperCase()) {
      case 'AUTHORITY':
        return '/explore-incidents';
      case 'MEDICAL_CENTER':
        return '/resources';
      case 'ADMIN':
        return '/analytics';
      case 'USER':
      default:
        return '/overview';
    }
  };

  const isAuthenticated = !!token && !!currentUser;
  const isAuthority = currentUser?.role === 'AUTHORITY' || currentUser?.role === 'ADMIN';
  const isRescue = currentUser?.role === 'RESCUE_TEAM' || isAuthority;
  const isMedical = currentUser?.role === 'MEDICAL_CENTER' || isAuthority;
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        loading,
        authError,
        isAuthenticated,
        isAuthority,
        isRescue,
        isMedical,
        isAdmin,
        login,
        register,
        logout,
        updateProfile,
        addEmergencyContact,
        deleteEmergencyContact,
        getRoleDefaultRoute,
        locationStatus,
        userCoordinates,
        requestLocationPermission,
        dismissLocationPrompt
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
