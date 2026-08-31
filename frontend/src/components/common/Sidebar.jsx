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
  ChevronRight
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
    { to: '/resources', label: 'Emergency Resources', icon: Shield },
    { to: '/sos', label: 'Emergency SOS', icon: Radio },
    { to: '/profile', label: 'Profile & Contacts', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#050505] border-r border-[#1a1a1a] flex flex-col justify-between z-40 transition-transform duration-200 ease-out lg:translate-x-0 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2.5 group cursor-default">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 transition-transform duration-200 group-hover:scale-105">
              <Mountain className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wide text-emerald-400 font-sans block leading-none">
                LANDSAFE
              </span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-tight mt-1 block">
                Predict. Alert. Protect.
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List with Subtle Pop Interaction */}
        <div className="px-3 py-4 space-y-1.5 flex-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 active:scale-[0.985] active:translate-y-[1px] motion-reduce:transform-none motion-reduce:transition-none ${
                    isActive
                      ? 'bg-emerald-500 text-black font-bold border-emerald-400/50 shadow-md shadow-emerald-500/20 translate-x-[3px]'
                      : 'text-neutral-400 bg-transparent border-transparent hover:bg-[#161616] hover:border-[#262626] hover:text-neutral-100 hover:translate-x-[3px] hover:shadow-sm hover:shadow-black/40'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon with Subtle Shift and Brightening on Hover */}
                      <Icon 
                        className={`w-4 h-4 shrink-0 transition-all duration-150 ease-out ${
                          isActive 
                            ? 'text-black stroke-[2.5]' 
                            : 'text-neutral-400 group-hover:text-neutral-100 group-hover:translate-x-[1.5px]'
                        }`} 
                      />

                      {/* Clean Navigation Label */}
                      <span className={`truncate transition-colors duration-150 ${isActive ? 'text-black font-extrabold' : 'group-hover:text-neutral-100'}`}>
                        {item.label}
                      </span>
                    </div>

                    {/* Subtle Right Arrow Indicator on Hover (Non-active only) */}
                    {!isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-500 opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 transition-all duration-150 ease-out shrink-0" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Emergency Call 112 Box at Bottom */}
        <div className="p-4 border-t border-[#1a1a1a] bg-[#030303]">
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-[#0a0a0a] flex items-center justify-between transition-all duration-150 hover:bg-[#0e0e0e] hover:border-emerald-500/50 hover:shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <PhoneCall className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-[11px] text-neutral-400 block leading-tight font-medium">Emergency?</span>
                <a
                  href="tel:112"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors block leading-tight mt-0.5"
                >
                  Call 112
                </a>
              </div>
            </div>
            <NavLink
              to="/sos"
              className="px-2.5 py-1 rounded bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-400 active:scale-95 transition-all shadow-sm"
            >
              SOS
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
};
