import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getRiskScoreColor } from '../../utils/formatters';
import { 
  CloudRain, 
  Mountain, 
  Droplets, 
  Navigation, 
  X,
  MapPin
} from 'lucide-react';

export const ZoneTelemetryDrawer = ({ zone, onClose }) => {
  const navigate = useNavigate();
  if (!zone) return null;

  const riskColor = getRiskScoreColor(zone.risk_score);

  // Local factor contributions
  const factors = zone.xai?.factors || [
    { name: 'Slope Gradient Angle', importance_pct: 44.0, value: `${zone.slope_deg || 34}°` },
    { name: '24h Cumulative Rainfall', importance_pct: 34.0, value: (zone.rainfall_24h !== null && zone.rainfall_24h !== undefined) ? `${zone.rainfall_24h} mm` : 'Unavailable' },
    { name: 'Soil Moisture Saturation', importance_pct: 12.0, value: `${typeof zone.soil_moisture === 'number' ? (zone.soil_moisture <= 1 ? Math.round(zone.soil_moisture * 100) : zone.soil_moisture) : 'Unavailable'}` },
    { name: 'Vegetation Canopy (NDVI)', importance_pct: 7.0, value: `${zone.ndvi || 0.40}` },
    { name: 'Historical Incidents', importance_pct: 3.0, value: `${zone.historical_incidents || 2} events` }
  ];

  return (
    <div className="bg-surface border border-line rounded-card p-5 flex flex-col justify-between space-y-4 select-none h-full shadow-sm">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-line pb-3">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${riskColor.badge}`}>
                {zone.risk_level} Risk
              </span>
            </div>
            <h3 className="font-semibold text-sm text-label mt-1 leading-snug">{zone.name}</h3>
            <p className="text-xs text-label-2">
              {zone.district ? `${zone.district}, ` : ''}{zone.state || (zone.country || 'Monitored Sector')}
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full text-label-2 hover:text-label hover:bg-surface-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Hazard Score Summary */}
        <div className="mt-3 bg-surface border border-line rounded-tile p-3.5 space-y-1">
          <span className="text-xs text-label-2 block font-medium">Risk Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-label font-sans">
              {zone.risk_score}
            </span>
            <span className="text-xs text-label-3">/ 100</span>
            <span className={`text-xs font-semibold ml-1 ${riskColor.text}`}>
              ({zone.risk_level})
            </span>
          </div>
        </div>

        {/* Contributing Factors */}
        <div className="mt-4 space-y-2.5">
          <span className="text-xs font-semibold text-label block">
            Contributing Factors
          </span>

          <div className="space-y-2">
            {factors.map((factor, idx) => (
              <div key={idx} className="bg-surface border border-line p-2.5 rounded-tile text-xs space-y-1">
                <div className="flex justify-between text-label">
                  <span className="font-medium">{factor.name}</span>
                  <span className="tabular-nums text-label-2">{factor.value}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-risk-low rounded-full"
                    style={{ width: `${factor.importance_pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2 border-t border-line">
        <button
          onClick={() => navigate('/safe-route')}
          className="w-full py-2.5 bg-accent hover:opacity-90 text-white rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all "
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Get Safe Evacuation Route</span>
        </button>
      </div>
    </div>
  );
};
