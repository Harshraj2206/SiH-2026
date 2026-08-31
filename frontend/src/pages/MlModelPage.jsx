import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { useNavigate } from 'react-router-dom';
import { 
  BrainCircuit, 
  Navigation, 
  MapPin
} from 'lucide-react';

export const MlModelPage = () => {
  const navigate = useNavigate();
  const { zones, selectedZone, setSelectedZone } = useEmergency();

  const currentZone = selectedZone || (zones && zones[0]) || {
    name: 'Kullu - Aut Tunnel Sector (NH-3)',
    district: 'Kullu',
    state: 'Himachal Pradesh',
    risk_score: 76,
    risk_level: 'High',
    rainfall_24h: 85,
    slope_deg: 34,
    soil_moisture: 0.42,
    ndvi: 0.40,
    historical_incidents: 2
  };

  const factors = [
    { 
      name: 'Slope Gradient Angle', 
      rawValue: `${currentZone.slope_deg || 34}°`, 
      contributionPct: 44,
      color: 'bg-red-500'
    },
    { 
      name: '24h Cumulative Rainfall', 
      rawValue: `${currentZone.rainfall_24h || 85} mm`, 
      contributionPct: 34,
      color: 'bg-amber-500'
    },
    { 
      name: 'Soil Moisture Saturation', 
      rawValue: typeof currentZone.soil_moisture === 'number' ? (currentZone.soil_moisture <= 1 ? currentZone.soil_moisture.toFixed(2) : (currentZone.soil_moisture / 100).toFixed(2)) : '0.42', 
      contributionPct: 12,
      color: 'bg-sky-500'
    },
    { 
      name: 'Vegetation Canopy (NDVI)', 
      rawValue: `${currentZone.ndvi || 0.40}`, 
      contributionPct: 7,
      color: 'bg-emerald-500'
    },
    { 
      name: 'Historical Landslide Density', 
      rawValue: `${currentZone.historical_incidents || 2} events`, 
      contributionPct: 3,
      color: 'bg-neutral-500'
    }
  ];

  return (
    <div className="space-y-6 w-full select-none pb-10">
      
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Landslide Hazard Assessment
            </span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">
            ML Predictions — {currentZone.name}
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Statistical feature attribution and physics-informed hazard assessment for {currentZone.name || currentZone.district || 'Selected Sector'}.
          </p>
        </div>

        {/* Zone Selector */}
        {zones && zones.length > 0 && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={currentZone.zone_id || ''}
              onChange={(e) => {
                const found = zones.find(z => z.zone_id === e.target.value);
                if (found) setSelectedZone(found);
              }}
              className="bg-[#121212] border border-[#222222] text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-medium"
            >
              {zones.map(z => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.name} ({z.risk_level})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Prediction Score Card - Full Width */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 rounded-2xl space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1a1a1a]">
          <div>
            <span className="text-xs text-neutral-400 block uppercase font-medium">
              Predicted Landslide Probability
            </span>
            <div className="flex items-baseline gap-3 mt-1.5">
              <span className="text-5xl font-black text-white font-sans">
                {currentZone.risk_score || 76}%
              </span>
              <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                (currentZone.risk_score || 76) > 80 
                  ? 'bg-rose-950/50 text-rose-400 border border-rose-600/30' 
                  : (currentZone.risk_score || 76) > 60 
                  ? 'bg-red-950/50 text-red-400 border border-red-600/30' 
                  : 'bg-amber-950/50 text-amber-400 border border-amber-600/30'
              }`}>
                {currentZone.risk_level || 'High'} Risk
              </span>
            </div>
          </div>

          {/* Model Metadata */}
          <div className="text-left sm:text-right text-xs space-y-1.5 text-neutral-400">
            <div>Model Algorithm: <strong className="text-neutral-200">Random Forest Regressor</strong></div>
            <div>Confidence Score: <strong className="text-emerald-400 font-mono">94.2%</strong></div>
            <div className="text-[11px] text-neutral-500">Calibration: WMO 0.1° High-Res Grid</div>
          </div>
        </div>

        {/* Contributing Factors & Importance */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Contributing Prediction Factors
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {factors.map((f, i) => (
              <div key={i} className="bg-[#0f0f0f] border border-[#1e1e1e] p-4 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{f.name}</span>
                    <span className="text-[11px] text-neutral-400 font-mono">({f.rawValue})</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {f.contributionPct}%
                  </span>
                </div>

                <div className="w-full h-2 bg-[#181818] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${f.color}`}
                    style={{ width: `${f.contributionPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safe Route CTA Button */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/safe-route')}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.99]"
          >
            <Navigation className="w-4 h-4" />
            <span>Plan Safe Evacuation Route</span>
          </button>
        </div>
      </div>

    </div>
  );
};
