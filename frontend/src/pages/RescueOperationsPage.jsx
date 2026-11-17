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
        return 'bg-risk-low/[0.12] text-risk-low border-risk-low/30';
      case 'DISPATCHED':
        return 'bg-risk-moderate/[0.12] text-risk-moderate border-risk-moderate/30 ';
      case 'ON_SITE':
        return 'bg-risk-critical/[0.12] text-risk-critical border-risk-critical/30';
      default:
        return 'bg-surface-2 text-label-2 border-line';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-2 text-label-2 border border-line flex items-center gap-1">
              <Shield className="w-3 h-3" />
              MULTI-AGENCY RESCUE COMMAND
            </span>
            <span className="text-xs text-label-2 tabular-nums">SIH26001</span>
          </div>
          <h1 className="text-2xl font-semibold text-label mt-1">Disaster Response & Rescue Teams</h1>
          <p className="text-xs text-label-2">
            Real-time status tracking for NDRF battalions, SDRF mountain units, emergency medical services, and local volunteer corps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-surface border border-line px-3.5 py-1.5 rounded-tile text-center">
            <span className="text-xs text-label-2 block tabular-nums">TOTAL UNITS</span>
            <span className="text-sm tabular-nums font-semibold text-label">{teams.length}</span>
          </div>
          <div className="bg-risk-low/[0.12] border border-risk-low/30 px-3.5 py-1.5 rounded-tile text-center">
            <span className="text-xs text-risk-low block tabular-nums">STANDBY READY</span>
            <span className="text-sm tabular-nums font-semibold text-risk-low">
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
            className="bg-surface border border-line rounded-card p-5 space-y-4 hover:border-line transition-all"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-xs font-semibold text-label-2 bg-surface-2 px-2 py-0.5 rounded-full border border-line">
                    {team.team_id}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${getStatusColor(team.status)}`}>
                    {team.status}
                  </span>
                </div>
                <h3 className="font-semibold text-base text-label mt-1.5">{team.name}</h3>
                <p className="text-xs text-label-2">{team.team_type} • {team.base_location}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-label-3 tabular-nums block">PERSONNEL</span>
                <span className="text-sm tabular-nums font-semibold text-label">{team.members_count} Members</span>
              </div>
            </div>

            {/* Current Assignment */}
            {team.current_assignment_title && (
              <div className="bg-page p-3 rounded-tile border border-line space-y-1 text-xs">
                <span className="text-xs font-semibold text-label-2 block">Current Assignment</span>
                <div className="font-semibold text-label flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-risk-critical " />
                  {team.current_assignment_title}
                </div>
                <div className="text-xs text-label-2">
                  Estimated ETA to Site: <strong className="text-label-2">{team.eta_minutes} minutes</strong>
                </div>
              </div>
            )}

            {/* Vehicle & Equipment */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-page p-2.5 rounded-tile border border-line">
                <div className="flex items-center gap-1 text-label-2 text-xs mb-0.5">
                  <Truck className="w-3 h-3 text-label-2" />
                  <span>Deployment Vehicle</span>
                </div>
                <span className="text-label font-medium text-xs block truncate">{team.vehicle}</span>
              </div>

              <div className="bg-page p-2.5 rounded-tile border border-line">
                <div className="flex items-center gap-1 text-label-2 text-xs mb-0.5">
                  <PhoneCall className="w-3 h-3 text-risk-low" />
                  <span>Command Contact</span>
                </div>
                <span className="text-label tabular-nums text-xs block">{team.contact_phone}</span>
              </div>
            </div>

            {/* Equipment Chips */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-label-3 block">Specialized Gear</span>
              <div className="flex flex-wrap gap-1.5">
                {team.equipment.map((eq, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-page border border-line rounded-full text-label-2">
                    {eq}
                  </span>
                ))}
              </div>
            </div>

            {/* Status Change Buttons (Authority Action) */}
            <div className="pt-2 border-t border-line flex gap-2">
              {team.status !== 'AVAILABLE' && (
                <button
                  onClick={() => handleUpdateStatus(team.team_id, 'AVAILABLE')}
                  className="w-full py-1.5 bg-risk-low/[0.12] hover:bg-risk-low/[0.12] text-risk-low border border-risk-low/30 rounded-full text-xs font-semibold transition-colors"
                >
                  Mark Standby Ready
                </button>
              )}
              {team.status !== 'DISPATCHED' && (
                <button
                  onClick={() => handleUpdateStatus(team.team_id, 'DISPATCHED')}
                  className="w-full py-1.5 bg-risk-moderate/[0.12] hover:bg-risk-moderate/[0.12] text-risk-moderate border border-risk-moderate/30 rounded-full text-xs font-semibold transition-colors"
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
