import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { formatDate } from '../utils/formatters';
import { 
  Bell, 
  MapPin
} from 'lucide-react';

export const AlertsPage = () => {
  const { alerts, zones } = useEmergency();
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const getLocationName = (alert) => {
    if (alert.location) return alert.location;
    const match = (zones || []).find(z => z.zone_id === alert.zone_id);
    if (match) return `${match.name}, ${match.district}`;
    return alert.zone_id ? alert.zone_id.replace('NER-', 'Himachal Sector ') : 'Kullu Corridor, HP';
  };

  const filteredAlerts = (alerts || []).filter(
    a => categoryFilter === 'ALL' || a.category === categoryFilter
  );

  return (
    <div className="space-y-5 w-full select-none pb-10">
      
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <Bell className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Active Alerts & Warnings</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Active landslide advisories, meteorological early warnings, and critical slope alerts across monitored corridors.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#0d0d0d] p-1.5 rounded-xl border border-[#1c1c1c] text-xs self-start sm:self-center">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'CRITICAL', label: 'Critical' },
            { id: 'HIGH', label: 'High' },
            { id: 'MODERATE', label: 'Moderate' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium ${
                categoryFilter === cat.id
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List - Full Width */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl divide-y divide-[#181818] overflow-hidden shadow-sm">
        {filteredAlerts.map((alert) => {
          const isCritical = alert.category === 'CRITICAL';
          const isHigh = alert.category === 'HIGH';
          const badgeCol = isCritical 
            ? 'bg-red-950/50 text-red-400 border-red-600/30' 
            : isHigh 
            ? 'bg-orange-950/50 text-orange-400 border-orange-600/30' 
            : 'bg-amber-950/50 text-amber-400 border-amber-600/30';

          return (
            <div
              key={alert.id}
              className="p-5 hover:bg-[#0f0f0f] transition-colors space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-2.5 h-2.5 rounded-full ${isCritical ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-amber-500'}`} />
                  <span className="font-bold text-sm text-white">{alert.title}</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase border ${badgeCol}`}>
                    {alert.category}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 font-medium">{formatDate(alert.timestamp)}</span>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                {alert.reason}
              </p>

              <div className="flex items-center gap-1.5 text-xs text-neutral-400 pt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium text-neutral-200">{getLocationName(alert)}</span>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="p-12 text-center text-xs text-neutral-400">
            No active alerts found for this category.
          </div>
        )}
      </div>

    </div>
  );
};
