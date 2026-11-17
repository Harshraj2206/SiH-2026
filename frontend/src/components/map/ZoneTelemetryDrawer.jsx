import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getRiskScoreColor, toLabel } from '../../utils/formatters';
import { Navigation, X } from 'lucide-react';

const fmt = (v, unit, digits = 1) => (typeof v === 'number' ? `${v.toFixed(digits)}${unit}` : '—');

export const ZoneTelemetryDrawer = ({ zone, onClose }) => {
  const navigate = useNavigate();
  if (!zone) return null;

  const hasScore = typeof zone.risk_score === 'number';
  const riskColor = getRiskScoreColor(zone.risk_score);
  const factors = zone.xai?.factors || [];
  const place = [zone.district, zone.state].filter(Boolean).join(', ');

  return (
    <div className="bg-surface rounded-card p-5 flex flex-col justify-between space-y-4 h-full">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-line pb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-label leading-snug">{zone.name}</h3>
            {place && <p className="text-xs text-label-2">{place}</p>}
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-full text-label-2 hover:text-label" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {zone.is_weather_loading ? (
          <p className="text-xs text-label-2">Loading live data…</p>
        ) : (
          <>
            <div className="bg-surface-2 rounded-tile p-3.5">
              <span className="text-xs text-label-2 block">Landslide risk</span>
              {hasScore ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-label">{Math.round(zone.risk_score)}</span>
                  <span className="text-xs text-label-3">/ 100</span>
                  <span className={`text-xs font-semibold ml-1 ${riskColor.text}`}>{toLabel(zone.risk_level)}</span>
                </div>
              ) : (
                <p className="text-xs text-label mt-1">
                  {zone.unavailability_reason || 'No score yet: live rain or terrain data is not available for this place.'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-surface-2 rounded-tile p-2">
                <span className="text-label-2 block">Rain, 24 h</span>
                <span className="text-label">{fmt(zone.rainfall_24h, ' mm')}</span>
              </div>
              <div className="bg-surface-2 rounded-tile p-2">
                <span className="text-label-2 block">Temperature</span>
                <span className="text-label">{fmt(zone.temperature_c, '°C')}</span>
              </div>
              <div className="bg-surface-2 rounded-tile p-2">
                <span className="text-label-2 block">Slope</span>
                <span className="text-label">{fmt(zone.slope_deg, '°')}</span>
              </div>
            </div>

            {hasScore && factors.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-label block">What drives this score</span>
                {factors.map((f) => (
                  <div key={f.name} className="bg-surface-2 p-2.5 rounded-tile text-xs space-y-1">
                    <div className="flex justify-between text-label gap-2">
                      <span>{f.name}</span>
                      <span className="text-label-2">{f.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-label-2 rounded-full" style={{ width: `${f.importance_pct}%` }} />
                      </div>
                      <span className="text-label-2 w-14 text-right">{f.net_delta >= 0 ? 'raises' : 'lowers'}</span>
                    </div>
                  </div>
                ))}
                {zone.xai?.recommended_action && <p className="text-xs text-label-2">{zone.xai.recommended_action}</p>}
              </div>
            )}
          </>
        )}
      </div>

      <div className="pt-2 border-t border-line">
        <button
          onClick={() => navigate('/safe-route')}
          className="w-full py-2.5 bg-accent hover:opacity-90 text-white rounded-full text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Plan a safe route</span>
        </button>
      </div>
    </div>
  );
};
