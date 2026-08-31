import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EmergencyProvider } from './context/EmergencyContext';
import { LanguageProvider } from './context/LanguageContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ThemeProvider } from './context/ThemeContext';
import { LocationIntelligenceProvider } from './context/LocationIntelligenceContext';
import { LocationPermissionModal } from './components/common/LocationPermissionModal';

// Public & Auth Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';

import { OverviewPage } from './pages/OverviewPage';
import { CommunityPollPage } from './pages/CommunityPollPage';
import { GisMapPage } from './pages/GisMapPage';
import { MlModelPage } from './pages/MlModelPage';
import { AlertsPage } from './pages/AlertsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SafeRoutePage } from './pages/SafeRoutePage';
import { SosEmergencyPage } from './pages/SosEmergencyPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <LocationIntelligenceProvider>
            <EmergencyProvider>
              <BrowserRouter>
                {/* Location Modal */}
                <LocationPermissionModal />

                <Routes>
                  {/* Public Portal & Auth Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />

                  {/* Clean Dashboard Routes */}
                  <Route element={<DashboardLayout />}>
                    {/* 1. Dashboard */}
                    <Route path="/overview" element={<OverviewPage />} />
                    <Route path="/app" element={<Navigate to="/overview" replace />} />

                    {/* 2. Community Poll */}
                    <Route path="/community" element={<CommunityPollPage />} />
                    <Route path="/community-reports" element={<CommunityPollPage />} />

                    {/* 3. GIS Map */}
                    <Route path="/risk-map" element={<GisMapPage />} />

                    {/* 4. ML Model (Predictions & Contributing Factors) */}
                    <Route path="/ml-model" element={<MlModelPage />} />

                    {/* 4. Alerts */}
                    <Route path="/alerts" element={<AlertsPage />} />

                    {/* 5. Resources */}
                    <Route path="/resources" element={<ResourcesPage />} />
                    <Route path="/hospitals-shelters" element={<ResourcesPage />} />
                    <Route path="/rescue" element={<ResourcesPage />} />

                    {/* 6. Settings */}
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* Internal Operational Screens */}
                    <Route path="/safe-route" element={<SafeRoutePage />} />
                    <Route path="/sos" element={<SosEmergencyPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </EmergencyProvider>
          </LocationIntelligenceProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
