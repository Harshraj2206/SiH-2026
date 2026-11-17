import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { formatDate, toLabel } from '../utils/formatters';
import { 
  Bell, 
  MapPin,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const AlertsPage = () => {
  const { alerts, alertsError, zones, refreshAllData } = useEmergency();
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const getLocationName = (alert) => {
    if (alert.location) return alert.location;
    const match = (zones || []).find(z => z.zone_id === alert.zone_id);
    if (match) return [match.name, match.district, match.state].filter(Boolean).join(', ');
    return alert.zone_name || null;
  };

  const filteredAlerts = (alerts || []).filter(
    a => categoryFilter === 'ALL' || a.category === categoryFilter
  );

  return (
    <div className="space-y-5 w-full select-none pb-10">
      
      {/* Header */}
      <div className="bg-surface p-5 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tile bg-risk-critical/[0.12] border-risk-critical/30 flex items-center justify-center text-risk-critical shrink-0">
            <Bell className="w-5 h-5 text-risk-critical" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-label">Alerts</h1>
            <p className="text-xs text-label-2 mt-0.5">
              Monitored zones the LandSafe model scores as high or critical risk, or moderate with verified ground reports. These are not official government warnings.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-surface-2 p-1.5 rounded-full text-xs self-start sm:self-center">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'CRITICAL', label: 'Critical' },
            { id: 'HIGH', label: 'High' },
            { id: 'MODERATE', label: 'Moderate' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors font-medium ${
                categoryFilter === cat.id
                  ? 'bg-surface-2 text-label font-semibold'
                  : 'text-label-2 hover:text-label'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advisory Error Banner */}
      {alertsError && (
        <div className="bg-risk-critical/[0.12] border-risk-critical/30 p-4 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-risk-critical">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-risk-critical shrink-0" />
            <div>
              <span className="font-semibold block">Alerts could not be loaded</span>
              <span className="text-label-2 text-xs">{alertsError}</span>
            </div>
          </div>
          <button
            onClick={() => refreshAllData()}
            className="px-3.5 py-1.5 bg-risk-critical/[0.12] hover:bg-risk-critical/20 border-risk-critical/30 rounded-full whitespace-nowrap font-semibold text-label text-xs transition shrink-0 self-start sm:self-auto flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Alerts List - Full Width */}
      <div className="bg-surface rounded-card divide-y divide-line overflow-hidden">
        {filteredAlerts.map((alert) => {
          const isCritical = alert.category === 'CRITICAL';
          const isHigh = alert.category === 'HIGH';
          const badgeCol = isCritical 
            ? 'bg-risk-critical/[0.12] text-risk-critical border-risk-critical/30' 
            : isHigh 
            ? 'bg-risk-high/[0.12] text-risk-high border-risk-high/30' 
            : 'bg-risk-moderate/[0.12] text-risk-moderate border-risk-moderate/30';

          return (
            <div
              key={alert.id}
              className="p-5 rounded-tile hover:bg-surface-2/60 transition-colors space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-2.5 h-2.5 rounded-full ${isCritical ? 'bg-risk-critical' : isHigh ? 'bg-risk-high' : 'bg-risk-moderate'}`} />
                  <span className="font-semibold text-sm text-label">{alert.title}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${badgeCol}`}>
                    {toLabel(alert.category)}
                  </span>
                </div>
                <span className="text-xs text-label-3 font-medium">{formatDate(alert.timestamp)}</span>
              </div>

              <p className="text-xs text-label-2 leading-relaxed">
                {alert.reason}
              </p>

              {alert.recommended_action && <p className="text-xs text-label">{alert.recommended_action}</p>}
              {getLocationName(alert) && (
                <div className="flex items-center gap-1.5 text-xs text-label-2 pt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium text-label">{getLocationName(alert)}</span>
                </div>
              )}
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="p-12 text-center text-xs text-label-2">
            {alertsError ? 'Alerts are unavailable right now.' : 'No zone is at high or critical risk right now.'}
          </div>
        )}
      </div>

    </div>
  );
};
