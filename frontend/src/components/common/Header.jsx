import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEmergency } from '../../context/EmergencyContext';
import { 
  Bell, 
  Menu, 
  ChevronDown, 
  User, 
  LogOut
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLocationIntelligence } from '../../context/LocationIntelligenceContext';
import { WeatherIcon } from './WeatherIcon';

export const Header = ({ onToggleSidebar }) => {
  const { currentUser, logout } = useAuth();
  const { alerts } = useEmergency();
  const { location, weather: intelWeather } = useLocationIntelligence();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const PAGE_TITLES = {
    '/overview': ['Dashboard', 'Live landslide risk and safety advisories.'],
    '/community': ['Community', 'Daily poll and ground reports from residents.'],
    '/risk-map': ['Risk map', 'Monitored zones and any place you check.'],
    '/ml-model': ['Risk model', 'How the score works and how well it does.'],
    '/safe-route': ['Safe route', 'Road routes and the risk along them.'],
    '/alerts': ['Alerts', 'Zones at high risk now.'],
    '/incidents': ['Landslides', 'Major events, zone risk and NASA records.'],
    '/analytics': ['Analytics', 'Risk across zones, rain and reports.'],
    '/resources': ['Emergency resources', 'Hospitals, police, fire and shelters nearby.'],
    '/sos': ['Emergency SOS', 'Request help and share your location.'],
    '/profile': ['Profile', 'Your details and emergency contacts.'],
    '/settings': ['Settings', 'Appearance.'],
    '/community-poll': ['Community', 'Daily poll and ground reports from residents.'],
    '/gis-map': ['Risk map', 'Monitored zones and any place you check.'],
    '/explore-incidents': ['Landslides', 'Major events, zone risk and NASA records.'],
    '/data-sources': ['Data Sources', 'Where each data feed comes from.'],
    '/about': ['About', 'What LandSafe is and how it works.'],
  };
  const [pageTitle, pageSubtitle] = PAGE_TITLES[pathname] || ['LandSafe', ''];
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const criticalAlertsCount = (alerts || []).filter(a => a.category === 'CRITICAL' || a.category === 'HIGH').length;

  return (
    <header className="h-16 bg-page/75 backdrop-blur-xl backdrop-saturate-150 border-b border-line px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Navigation Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-full text-label-2 hover:text-label hover:bg-surface-2 transition-colors shrink-0"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </button>

        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold text-label leading-tight truncate">
            {pageTitle}
          </h1>
          <p className="hidden sm:block text-xs text-label-2 leading-none mt-1 truncate">
            {pageSubtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Weather, Alerts & User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {(() => {
          const weather = intelWeather?.normalized || null;
          if (!weather || weather.temp == null) return null;
          const locationName = location?.displayName || '';

          return (
            <div
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 text-xs text-label-2"
              title={`${locationName}: ${weather.label}, ${weather.tempFormatted}`}
            >
              <WeatherIcon theme={weather.theme} className="w-3.5 h-3.5" />
              <span className="font-medium text-label tabular-nums">{weather.tempFormatted}</span>
              <span className="truncate max-w-[140px]">{locationName}</span>
            </div>
          );
        })()}

        <Link
          to="/alerts"
          className="relative p-2 rounded-full text-label-2 hover:text-label hover:bg-surface-2 transition-colors"
          title="Active Alerts"
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
          {criticalAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-risk-critical" />
          )}
        </Link>

        {!currentUser ? (
          <Link to="/login" className="px-3 py-1.5 rounded-full bg-surface-2 text-[13px] text-label hover:opacity-80">Sign in</Link>
        ) : (
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 py-1 pl-1 pr-3 rounded-full hover:bg-surface-2 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-label/[0.12] flex items-center justify-center text-xs font-semibold text-label">
              {currentUser.full_name?.charAt(0)}
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="text-[13px] font-medium text-label block">
                {currentUser.full_name}
              </span>
              <span className="text-[11px] text-label-2 block capitalize">
                {currentUser.role === 'USER' ? 'Resident' : currentUser.role.toLowerCase().replace('_', ' ')}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-label-2" strokeWidth={1.75} />
          </button>

          {userDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-tile bg-surface-2 shadow-lg p-1.5 z-50"
              onMouseLeave={() => setUserDropdownOpen(false)}
            >
              <div className="px-2.5 py-2 border-b border-line">
                <span className="text-[13px] font-medium text-label block">{currentUser.full_name}</span>
                <span className="text-[11px] text-label-2">{currentUser.email}</span>
              </div>
              <Link
                to="/profile"
                onClick={() => setUserDropdownOpen(false)}
                className="mt-1 w-full px-2.5 py-1.5 rounded-full text-[13px] flex items-center gap-2 text-label hover:bg-surface-2 transition-colors"
              >
                <User className="w-4 h-4 text-label-2" strokeWidth={1.75} />
                <span>Profile & Contacts</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  setUserDropdownOpen(false);
                  navigate('/login');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-tile text-[13px] flex items-center gap-2 text-risk-critical hover:bg-risk-critical/10 transition-colors"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </header>
  );
};
