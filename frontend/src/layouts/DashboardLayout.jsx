import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Sidebar } from '../components/common/Sidebar';
import { WeatherAtmosphericBackground } from '../components/common/WeatherAtmosphericBackground';
import { useEmergency } from '../context/EmergencyContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { actionMessage } = useEmergency();
  const location = useLocation();

  // Automatically dismiss mobile sidebar on page navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Automatically reset mobile drawer state when resized to desktop (>= 1000px) or on Escape
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1000) {
        setSidebarOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen relative text-neutral-100 flex flex-col bg-transparent selection:bg-emerald-500/30 selection:text-white">
      {/* Dynamic Weather-Adaptive Atmospheric Background */}
      <WeatherAtmosphericBackground />

      <div className="flex flex-1 pt-0 relative z-10">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 lg:pl-64 flex flex-col min-w-0 bg-transparent">
          <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          {/* Action Notification Toast Banner */}
          {actionMessage && (
            <div className="px-4 py-2.5 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#1f1f1f] animate-in fade-in">
              <div className="w-full px-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  {actionMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {actionMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  {actionMessage.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
                  <span className="text-neutral-200 font-medium">{actionMessage.message}</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area - Full Width & Responsive Padding */}
          <main className="flex-1 p-3.5 sm:p-5 lg:p-7 overflow-x-hidden w-full bg-transparent">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

