import React, { useState, useEffect } from 'react';
import { rescueApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  Shield, 
  Users, 
  Truck, 
  Wrench, 
  Clock, 
  PhoneCall, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Radio,
  Sparkles
} from 'lucide-react';

export const RescueOperationsPage = () => {
  const { t } = useLanguage();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const data = await rescueApi.getRescueTeams();
      setTeams(data);
    } catch (err) {
      console.error('Failed to load rescue teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (teamId, status) => {
    try {
      await rescueApi.updateTeamStatus(teamId, { status });
      fetchTeams();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getStatusColor = (st) => {
    switch (st) {
      case 'AVAILABLE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'DISPATCHED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'ON_SITE':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              MULTI-AGENCY RESCUE COMMAND
            </span>
            <span className="text-xs text-slate-400 font-mono">SIH26001</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Disaster Response & Rescue Teams</h1>
          <p className="text-xs text-slate-400">
            Real-time status tracking for NDRF battalions, SDRF mountain units, emergency medical services, and local volunteer corps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block font-mono">TOTAL UNITS</span>
            <span className="text-sm font-mono font-bold text-white">{teams.length}</span>
          </div>
          <div className="bg-emerald-950/40 border border-emerald-800/40 px-3.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-emerald-400 block font-mono">STANDBY READY</span>
            <span className="text-sm font-mono font-bold text-emerald-300">
              {teams.filter(t => t.status === 'AVAILABLE').length}
            </span>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team) => (
          <div
            key={team.team_id}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition-all"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                    {team.team_id}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getStatusColor(team.status)}`}>
                    {team.status}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-white mt-1.5">{team.name}</h3>
                <p className="text-xs text-slate-400">{team.team_type} • {team.base_location}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono block">PERSONNEL</span>
                <span className="text-sm font-mono font-bold text-white">{team.members_count} Members</span>
              </div>
            </div>

            {/* Current Assignment */}
            {team.current_assignment_title && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Assignment</span>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  {team.current_assignment_title}
                </div>
                <div className="text-[10px] text-slate-400">
                  Estimated ETA to Site: <strong className="text-cyan-300">{team.eta_minutes} minutes</strong>
                </div>
              </div>
            )}

            {/* Vehicle & Equipment */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] mb-0.5">
                  <Truck className="w-3 h-3 text-cyan-400" />
                  <span>Deployment Vehicle</span>
                </div>
                <span className="text-slate-200 font-medium text-[11px] block truncate">{team.vehicle}</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] mb-0.5">
                  <PhoneCall className="w-3 h-3 text-emerald-400" />
                  <span>Command Contact</span>
                </div>
                <span className="text-slate-200 font-mono text-[11px] block">{team.contact_phone}</span>
              </div>
            </div>

            {/* Equipment Chips */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Specialized Gear</span>
              <div className="flex flex-wrap gap-1.5">
                {team.equipment.map((eq, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-slate-300">
                    {eq}
                  </span>
                ))}
              </div>
            </div>

            {/* Status Change Buttons (Authority Action) */}
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              {team.status !== 'AVAILABLE' && (
                <button
                  onClick={() => handleUpdateStatus(team.team_id, 'AVAILABLE')}
                  className="w-full py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-bold transition-colors"
                >
                  Mark Standby Ready
                </button>
              )}
              {team.status !== 'DISPATCHED' && (
                <button
                  onClick={() => handleUpdateStatus(team.team_id, 'DISPATCHED')}
                  className="w-full py-1.5 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 rounded-xl text-xs font-bold transition-colors"
                >
                  Dispatch to Sector
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
