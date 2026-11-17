import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { LeafletRiskMap } from '../components/map/LeafletRiskMap';
import { ZoneTelemetryDrawer } from '../components/map/ZoneTelemetryDrawer';
import { 
  Map, 
  Layers, 
  Navigation, 
  MapPin, 
  Compass,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const GisMapPage = () => {
  const navigate = useNavigate();
  const { zones, selectedZone, setSelectedZone, reports, alerts } = useEmergency();

  return (
    <div className="space-y-4 w-full select-none">
      
      {/* Header Bar */}
      <div className="bg-surface border border-line p-4 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tile bg-risk-low/[0.12] border border-risk-low/30 flex items-center justify-center text-risk-low shrink-0">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-label">GIS Hazard Map & Satellite Monitoring</h1>
            <p className="text-xs text-label-2">
              Interactive terrain layers, real-time risk heat zones, and road blockages across monitored corridors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => navigate('/safe-route')}
            className="px-3.5 py-2 bg-accent hover:opacity-90 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all "
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Plan Safe Route</span>
          </button>
        </div>
      </div>

      {/* Main Map & Drawer Layout - Full Width */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[640px]">
        
        {/* Map Viewport (8 Columns on desktop) */}
        <div className="lg:col-span-8 bg-surface border border-line rounded-card p-3 flex flex-col shadow-sm">
          <div className="flex-1 w-full rounded-tile overflow-hidden h-[640px] min-h-[580px]">
            <LeafletRiskMap
              zones={zones}
              selectedZone={selectedZone}
              onSelectZone={(zone) => setSelectedZone(zone)}
              reports={reports}
              alerts={alerts}
              height="100%"
            />
          </div>
        </div>

        {/* Selected Zone Detail Drawer (4 Columns on desktop) */}
        <div className="lg:col-span-4 flex flex-col">
          {selectedZone ? (
            <ZoneTelemetryDrawer
              zone={selectedZone}
              onClose={() => setSelectedZone(null)}
            />
          ) : (
            <div className="bg-surface border border-line rounded-card p-6 h-full flex flex-col justify-center items-center text-center space-y-3 text-label-2 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-surface border border-line flex items-center justify-center text-label-3">
                <Compass className="w-7 h-7 text-risk-low" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-label">Select Any Zone On Map</h3>
                <p className="text-xs text-label-2 max-w-xs leading-relaxed mt-1">
                  Click any zone marker or heat polygon on the map to inspect slope risk, rainfall data, and evacuation options.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
