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
import { AboutPage } from './pages/AboutPage';

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
import { AnalyticsPage } from './pages/AnalyticsPage';
import { IncidentsExplorerPage } from './pages/IncidentsExplorerPage';
import { DataSourcesPage } from './pages/DataSourcesPage';

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
                  <Route path="/about" element={<AboutPage />} />

                  {/* Clean Dashboard Routes */}
                  <Route element={<DashboardLayout />}>
                    {/* 1. Dashboard */}
                    <Route path="/overview" element={<OverviewPage />} />
                    <Route path="/app" element={<Navigate to="/overview" replace />} />

                    {/* 2. Community Poll & Field Reports */}
                    <Route path="/community" element={<CommunityPollPage />} />
                    <Route path="/community-poll" element={<CommunityPollPage />} />
                    <Route path="/community-reports" element={<Navigate to="/community" replace />} />
                    <Route path="/reports" element={<Navigate to="/community" replace />} />

                    {/* 3. GIS Hazard Map */}
                    <Route path="/risk-map" element={<GisMapPage />} />
                    <Route path="/gis-map" element={<GisMapPage />} />

                    {/* 4. ML Model Predictions */}
                    <Route path="/ml-model" element={<MlModelPage />} />

                    {/* 5. Safe Routing */}
                    <Route path="/safe-route" element={<SafeRoutePage />} />

                    {/* 6. Alerts & Advisories */}
                    <Route path="/alerts" element={<AlertsPage />} />

                    {/* 7. Incidents Explorer */}
                    <Route path="/incidents" element={<IncidentsExplorerPage />} />
                    <Route path="/explore-incidents" element={<IncidentsExplorerPage />} />

                    {/* 8. Emergency SOS */}
                    <Route path="/sos" element={<SosEmergencyPage />} />

                    {/* 10. Emergency Resources, Hospitals & Shelters */}
                    <Route path="/resources" element={<ResourcesPage />} />
                    <Route path="/hospitals-shelters" element={<Navigate to="/resources" replace />} />

                    {/* 11. Regional Analytics & Telemetry */}
                    <Route path="/analytics" element={<AnalyticsPage />} />

                    {/* 13. Data Sources & Provenance */}
                    <Route path="/data-sources" element={<DataSourcesPage />} />

                    {/* 15. User Profile & Settings */}
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
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
