import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Navigation, ShieldCheck, X } from 'lucide-react';

export const LocationPermissionModal = () => {
  const { locationStatus, requestLocationPermission, dismissLocationPrompt, isAuthenticated } = useAuth();

  if (!isAuthenticated || locationStatus !== 'PROMPT') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-page backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-surface border border-line rounded-card p-6 shadow-slate-950 space-y-5">
        <button
          onClick={dismissLocationPrompt}
          className="absolute top-4 right-4 text-label-2 hover:text-label p-1 rounded-full hover:bg-surface-2 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-card bg-surface-2 border border-line flex items-center justify-center text-label-2 shrink-0">
            <Navigation className="w-6 h-6 " />
          </div>
          <div>
            <h3 className="text-base font-semibold text-label">Use your location</h3>
            <p className="text-xs text-label-2">High-Precision Geospatial Early Warning</p>
          </div>
        </div>

        <p className="text-xs text-label-2 leading-relaxed">
          <strong>LANDSLIDEGUARD</strong> uses your live GPS location to identify nearby terrain landslide risks, calculate safe evacuation bypass routes, and broadcast rapid emergency alerts in your immediate mountain sector.
        </p>

        <div className="p-3 rounded-tile bg-page border border-line space-y-1.5 text-xs text-label-2">
          <div className="flex items-center gap-1.5 text-label-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-semibold">Privacy First</span>
          </div>
          <p>Your coordinates are processed locally on your device for hazard triangulation and are never shared without your explicit consent.</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={dismissLocationPrompt}
            className="flex-1 py-2.5 px-4 rounded-full bg-surface-2 hover:opacity-90 text-xs font-semibold text-label-2 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={requestLocationPermission}
            className="flex-1 py-2.5 px-4 rounded-full bg-surface-2 text-xs font-semibold text-label flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
          >
            <MapPin className="w-4 h-4" />
            <span>Allow Location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
