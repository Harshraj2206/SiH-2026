import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Navigation, ShieldCheck, X } from 'lucide-react';

export const LocationPermissionModal = () => {
  const { locationStatus, requestLocationPermission, dismissLocationPrompt, isAuthenticated } = useAuth();

  if (!isAuthenticated || locationStatus !== 'PROMPT') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl shadow-slate-950 space-y-5">
        <button
          onClick={dismissLocationPrompt}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Use your location</h3>
            <p className="text-xs text-slate-400">High-Precision Geospatial Early Warning</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>LANDSLIDEGUARD</strong> uses your live GPS location to identify nearby terrain landslide risks, calculate safe evacuation bypass routes, and broadcast rapid emergency alerts in your immediate mountain sector.
        </p>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-cyan-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-semibold">Privacy First</span>
          </div>
          <p>Your coordinates are processed locally on your device for hazard triangulation and are never shared without your explicit consent.</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={dismissLocationPrompt}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={requestLocationPermission}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
          >
            <MapPin className="w-4 h-4" />
            <span>Allow Location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
