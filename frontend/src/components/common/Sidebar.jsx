import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { 
  LayoutDashboard, 
  Users,
  Map, 
  BrainCircuit, 
  Bell, 
  Shield, 
  Navigation, 
  Radio, 
  User, 
  Settings, 
  PhoneCall,
  Mountain,
  BarChart3,
  AlertTriangle,
  X
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  // Core functional navigation items (Clean, human-readable & robust)
  const navItems = [
    { to: '/overview', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/community', label: 'Community Poll', icon: Users },
    { to: '/risk-map', label: 'GIS Hazard Map', icon: Map },
    { to: '/ml-model', label: 'ML Predictions', icon: BrainCircuit },
    { to: '/safe-route', label: 'Safe Route', icon: Navigation },
    { to: '/alerts', label: 'Alerts & Advisories', icon: Bell },
    { to: '/incidents', label: 'Incident Events', icon: AlertTriangle },
    { to: '/analytics', label: 'Telemetry & Analytics', icon: BarChart3 },
    { to: '/resources', label: 'Emergency Resources', icon: Shield },
    { to: '/sos', label: 'Emergency SOS', icon: Radio },
    { to: '/profile', label: 'Profile & Contacts', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile-only backdrop: strictly hidden on desktop (lg:hidden) with z-40 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-surface/80 backdrop-blur-xl backdrop-saturate-150 border-r border-line flex flex-col justify-between z-50 transition-transform duration-200 ease-out lg:translate-x-0 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-default">
            <div className="w-8 h-8 rounded-field bg-surface-2 flex items-center justify-center">
              <Mountain className="w-4 h-4 text-label" strokeWidth={1.75} />
            </div>
            <div className="leading-tight">
              <span className="text-[15px] font-semibold text-label block">LandSafe</span>
              <span className="text-[11px] text-label-2 block">Predict. Alert. Protect.</span>
            </div>
          </div>

          {/* Mobile close button (hidden on desktop) */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-full text-label-2 hover:text-label hover:bg-surface-2 transition-colors shrink-0"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="px-3 py-2 space-y-0.5 flex-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                    isActive
                      ? 'bg-surface-2 text-label font-medium'
                      : 'text-label-2 hover:bg-surface-2/60 hover:text-label'
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Emergency Call 112 */}
        <div className="p-3 border-t border-line">
          <div className="p-3 rounded-tile bg-surface-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PhoneCall className="w-4 h-4 text-label-2 shrink-0" strokeWidth={1.75} />
              <div className="leading-tight">
                <span className="text-[11px] text-label-2 block">Emergency?</span>
                <a href="tel:112" className="text-[13px] font-medium text-label hover:text-accent-text transition-colors">
                  Call 112
                </a>
              </div>
            </div>
            <NavLink
              to="/sos"
              className="px-3 py-1 rounded-full bg-risk-critical text-white text-xs font-semibold hover:opacity-90 active:opacity-80 transition-opacity"
            >
              SOS
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
};
