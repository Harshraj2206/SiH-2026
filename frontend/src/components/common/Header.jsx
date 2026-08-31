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
import { Link, useNavigate } from 'react-router-dom';
import { normalizeWeather } from '../../utils/weatherNormalizer';

export const Header = ({ onToggleSidebar }) => {
  const { currentUser, logout, login, PRESET_DEMO_ACCOUNTS } = useAuth();
  const { alerts, selectedZone, zones } = useEmergency();
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const criticalAlertsCount = (alerts || []).filter(a => a.category === 'CRITICAL' || a.category === 'HIGH').length;

  const handleQuickSwitch = async (account) => {
    try {
      await login(account.identifier, account.password);
      setUserDropdownOpen(false);
    } catch (e) {
      console.warn('Switch failed:', e);
    }
  };

  return (
    <header className="h-16 bg-[#050505] border-b border-[#1a1a1a] px-3.5 sm:px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Navigation Toggle & Page Title + Subtitle */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-neutral-300 hover:text-white bg-[#0d0d0d] hover:bg-[#181818] border border-[#222222] transition-colors shrink-0"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white leading-tight truncate">
            Dashboard
          </h1>
          <p className="hidden xs:block sm:block text-[10px] sm:text-xs text-neutral-400 leading-none mt-0.5 truncate">
            Real-time overview of landslide risk and safety advisories.
          </p>
        </div>
      </div>

      {/* Right Controls: Weather Telemetry Badge, Bell & User Profile Block */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* Live Location Weather Atmospheric Indicator */}
        {(() => {
          const activeZone = selectedZone || (zones && zones[0]);
          if (!activeZone) return null;
          const weather = normalizeWeather(activeZone);
          const locationName = activeZone.name || activeZone.formatted_address || activeZone.district || 'Selected Sector';
          
          return (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d0d0d]/80 border border-[#202020] text-xs backdrop-blur-sm shadow-sm">
              <span className="text-sm">{weather.icon}</span>
              <span className="font-semibold text-neutral-200 font-mono">{weather.tempFormatted}</span>
              <span className="text-[10px] text-neutral-400 font-medium truncate max-w-[120px]">
                {locationName}
              </span>
            </div>
          );
        })()}

        {/* Notification Bell with Red Dot */}
        <Link
          to="/alerts"
          className="relative p-2 rounded-full bg-[#0d0d0d] hover:bg-[#181818] text-neutral-400 hover:text-white border border-[#202020] transition-colors"
          title="Active Alerts"
        >
          <Bell className="w-4 h-4" />
          {criticalAlertsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#050505]" />
          )}
        </Link>

        {/* User Persona Block */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1 pl-1.5 pr-2 rounded-xl bg-[#0d0d0d] hover:bg-[#181818] border border-[#202020] transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-400">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="text-xs font-bold text-neutral-100 block">
                {currentUser?.full_name || 'User'}
              </span>
              <span className="text-[10px] text-emerald-400 block font-medium capitalize">
                {currentUser?.role ? currentUser.role.toLowerCase().replace('_', ' ') : 'Citizen'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {userDropdownOpen && (
            <div 
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-2xl p-2 z-50 animate-in fade-in"
              onMouseLeave={() => setUserDropdownOpen(false)}
            >
              <div className="px-2.5 py-2 border-b border-[#1c1c1c] text-xs">
                <span className="font-bold text-neutral-100 block">{currentUser?.full_name || 'Citizen'}</span>
                <span className="text-[11px] text-emerald-400 font-medium">{currentUser?.agency || 'Disaster Management Network'}</span>
              </div>

              <div className="py-1 border-b border-[#1c1c1c]">
                <Link
                  to="/profile"
                  onClick={() => setUserDropdownOpen(false)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-[#181818] transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Profile & Contacts</span>
                </Link>
              </div>

              {/* Quick Role Switcher */}
              <div className="p-1 border-b border-[#1c1c1c]">
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                  Switch Account:
                </span>
                <div className="space-y-0.5">
                  {PRESET_DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.role}
                      onClick={() => handleQuickSwitch(acc)}
                      className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between ${
                        currentUser?.role === acc.role
                          ? 'bg-[#181818] text-emerald-400 font-semibold'
                          : 'text-neutral-400 hover:bg-[#141414] hover:text-neutral-200'
                      }`}
                    >
                      <span>{acc.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    logout();
                    setUserDropdownOpen(false);
                    navigate('/login');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-red-400 hover:bg-red-950/20 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
