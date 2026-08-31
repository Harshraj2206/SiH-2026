import React, { useState, useEffect } from 'react';
import { incidentsApi } from '../services/api';
import { formatDate } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  MapPin, 
  Users, 
  Shield, 
  Clock, 
  Calendar,
  CheckCircle2, 
  Flame, 
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export const IncidentsExplorerPage = () => {
  const { t } = useLanguage();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');

  useEffect(() => {
    fetchIncidents();
  }, [severityFilter, statusFilter]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const data = await incidentsApi.getIncidents(params);
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = inc.title.toLowerCase().includes(q) || 
                    inc.incident_id.toLowerCase().includes(q) ||
                    inc.district.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (districtFilter !== 'ALL' && inc.district !== districtFilter) {
      return false;
    }
    return true;
  });

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'DETECTED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'VERIFIED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'RESPONDING':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'EVACUATING':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
              GDACS-STYLE GEOSPATIAL INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400 font-mono">SIH26001</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Disaster Incidents & Events Explorer</h1>
          <p className="text-xs text-slate-400">
            Multi-parameter filtration, chronological event logs, road blockades, and live responder dispatch tracking.
          </p>
        </div>

        {/* Global KPI Pills */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block font-mono">TOTAL EVENTS</span>
            <span className="text-sm font-mono font-bold text-white">{incidents.length}</span>
          </div>
          <div className="bg-red-950/40 border border-red-800/40 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-red-400 block font-mono">CRITICAL HAZARDS</span>
            <span className="text-sm font-mono font-bold text-red-300">
              {incidents.filter(i => i.severity === 'CRITICAL').length}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Interactive Timeline Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            Chronological Disaster Timeline (Last 48 Hours)
          </span>
          <span className="text-[10px] font-mono text-slate-500">REAL-TIME TELEMETRY</span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {incidents.map((inc) => {
            const isSel = selectedIncident?.incident_id === inc.incident_id;
            return (
              <button
                key={inc.incident_id}
                onClick={() => setSelectedIncident(inc)}
                className={`flex-shrink-0 p-3 rounded-xl border text-left transition-all max-w-[200px] ${
                  isSel 
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-lg shadow-cyan-950/50' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-mono font-bold text-cyan-400">{inc.incident_id}</span>
                  <span className={`px-1 py-0.2 rounded font-bold ${getSeverityBadge(inc.severity)}`}>
                    {inc.severity}
                  </span>
                </div>
                <div className="font-bold text-xs text-white truncate">{inc.title}</div>
                <div className="text-[10px] text-slate-400 mt-1">{inc.district} • {formatDate(inc.timestamp)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident ID, highway, village..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Severity Levels</option>
            <option value="CRITICAL">🔴 CRITICAL</option>
            <option value="HIGH">🟠 HIGH</option>
            <option value="MODERATE">🟡 MODERATE</option>
            <option value="LOW">🟢 LOW</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Incident States</option>
            <option value="DETECTED">DETECTED</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="RESPONDING">RESPONDING</option>
            <option value="EVACUATING">EVACUATING</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>

        {/* District Filter */}
        <div>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Districts</option>
            <option value="Ri Bhoi">Ri Bhoi (Meghalaya)</option>
            <option value="East Khasi Hills">East Khasi Hills</option>
            <option value="East Sikkim">East Sikkim</option>
            <option value="Kohima">Kohima (Nagaland)</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Event Cards (Left) & Detailed Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Event Cards List */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading operational incidents...</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              No matching incidents found with current filter parameters.
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.incident_id === inc.incident_id;
              return (
                <div
                  key={inc.incident_id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`bg-slate-900/90 border rounded-2xl p-4 shadow-xl cursor-pointer transition-all hover:scale-[1.005] ${
                    isSelected ? 'border-cyan-500 shadow-cyan-950/40 bg-slate-900' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                        {inc.incident_id}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getSeverityBadge(inc.severity)}`}>
                        {inc.severity}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getStatusBadge(inc.status)}`}>
                        {inc.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{formatDate(inc.timestamp)}</span>
                  </div>

                  <h3 className="font-bold text-sm text-white mb-1.5 leading-snug">{inc.title}</h3>
                  <p className="text-xs text-slate-300 line-clamp-2">{inc.description}</p>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {inc.district}, {inc.state}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      {inc.estimated_population} at risk
                    </span>
                    {inc.assigned_team_name && (
                      <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                        <Shield className="w-3.5 h-3.5" />
                        {inc.assigned_team_name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Event Inspector Panel */}
        <div className="lg:col-span-5">
          {selectedIncident ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 sticky top-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-cyan-400">{selectedIncident.incident_id}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded font-bold border ${getSeverityBadge(selectedIncident.severity)}`}>
                    {selectedIncident.severity}
                  </span>
                </div>
                <h2 className="font-extrabold text-base text-white mt-1">{selectedIncident.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedIncident.district}, {selectedIncident.state}</p>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Incident Briefing</span>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  {selectedIncident.description}
                </p>
              </div>

              {/* Casualty & Evacuation Telemetry */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">INJURED</span>
                  <span className="text-base font-mono font-bold text-amber-400">{selectedIncident.injured_people}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">EVACUATED</span>
                  <span className="text-base font-mono font-bold text-emerald-400">{selectedIncident.evacuated_people}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">POP. AT RISK</span>
                  <span className="text-base font-mono font-bold text-rose-400">{selectedIncident.estimated_population}</span>
                </div>
              </div>

              {/* Blocked Road Sections */}
              {selectedIncident.blocked_roads?.length > 0 && (
                <div className="bg-red-950/30 border border-red-800/40 p-3 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-red-400 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Confirmed Road Blockades
                  </span>
                  <ul className="list-disc list-inside text-red-200 text-[11px] space-y-0.5">
                    {selectedIncident.blocked_roads.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Assigned Responder Unit */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Response Force</span>
                <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  {selectedIncident.assigned_team_name || 'No response unit assigned yet'}
                </div>
                <div className="text-[10px] text-slate-400">
                  Source: {selectedIncident.source} • Coords: {selectedIncident.latitude}°N, {selectedIncident.longitude}°E
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              Select an incident from the timeline or list to view complete GDACS telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
