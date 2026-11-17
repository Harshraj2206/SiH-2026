import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocationIntelligence } from '../../context/LocationIntelligenceContext';
import { MapPin, Navigation, ShieldCheck, X } from 'lucide-react';

export const LocationPermissionModal = () => {
  const { locationStatus, requestLocationPermission, dismissLocationPrompt, isAuthenticated } = useAuth();
  const { requestLocation } = useLocationIntelligence();

  if (!isAuthenticated || locationStatus !== 'PROMPT') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-surface rounded-card p-6 shadow-slate-950 space-y-5">
        <button
          onClick={dismissLocationPrompt}
          className="absolute top-4 right-4 text-label-2 hover:text-label p-1 rounded-full hover:bg-surface-2 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-card bg-surface flex items-center justify-center text-label-2 shrink-0">
            <Navigation className="w-6 h-6 " />
          </div>
          <div>
            <h3 className="text-base font-semibold text-label">Use your location</h3>
            <p className="text-xs text-label-2">For the risk and services near you</p>
          </div>
        </div>

        <p className="text-xs text-label-2 leading-relaxed">
          LandSafe uses your location to show landslide risk, weather and emergency services near you, and to send your position if you raise an SOS.
        </p>

        <div className="p-3 rounded-tile bg-surface-2 space-y-1.5 text-xs text-label-2">
          <div className="flex items-center gap-1.5 text-label-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-semibold">What is shared</span>
          </div>
          <p>Your coordinates are sent to the LandSafe server and to Open-Meteo and OpenStreetMap to look up weather, terrain and place names. They are only stored if you send an SOS or a report.</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={dismissLocationPrompt}
            className="flex-1 py-2.5 px-4 rounded-full bg-surface-2 hover:opacity-90 text-xs font-semibold text-label-2 transition-colors"
          >
            Not now
          </button>
          <button
            onClick={() => { requestLocation(true); requestLocationPermission(); }}
            className="flex-1 py-2.5 px-4 rounded-full bg-surface-2 text-xs font-semibold text-label flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
          >
            <MapPin className="w-4 h-4" />
            <span>Allow location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
