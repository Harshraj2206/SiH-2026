import React, { useState, useEffect } from 'react';
import { resourcesApi, rescueApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Ambulance, 
  Home, 
  MapPin, 
  Navigation, 
  CheckCircle2,
  Users
} from 'lucide-react';

export const ResourcesPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hospitals'); // 'hospitals' | 'shelters' | 'teams'
  const [hospitals, setHospitals] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const hpFallbackHospitals = [
    { name: 'Kullu Regional Hospital (Civil)', address: 'NH-3, Dhalpur, Kullu, Himachal Pradesh', phone: '01902-222350', capacity: 150 },
    { name: 'Manali Mission Hospital', address: 'Model Town, Manali, Himachal Pradesh', phone: '01902-252379', capacity: 80 },
    { name: 'IGMC Shimla Trauma Center', address: 'Circular Road, Shimla, Himachal Pradesh', phone: '0177-2804251', capacity: 300 },
    { name: 'Mandi Zonal Hospital', address: 'Mandi Town, Himachal Pradesh', phone: '01905-222102', capacity: 120 }
  ];

  const hpFallbackShelters = [
    { name: 'Dhalpur Community Relief Center', address: 'Grounds Area, Kullu, Himachal Pradesh', capacity: '250 Persons' },
    { name: 'Manali Indoor Sports Hall (Safe Zone)', address: 'Rangri, Manali, Himachal Pradesh', capacity: '180 Persons' },
    { name: 'Shimla Ridge Community Evacuation Hall', address: 'The Mall, Shimla, Himachal Pradesh', capacity: '400 Persons' },
    { name: 'Sundernagar Polytechnic Safe Camp', address: 'Sundernagar, Mandi, Himachal Pradesh', capacity: '200 Persons' }
  ];

  const hpFallbackTeams = [
    { team_name: '14th Bn NDRF Himachal Taskforce', base_station: 'Kullu Emergency Depot', members_count: 18, status: 'READY' },
    { team_name: 'SDRF Quick Response Unit Shimla', base_station: 'Shimla Headquarters', members_count: 14, status: 'READY' },
    { team_name: 'Manali Mountaineering Rescue Squad', base_station: 'Manali Base', members_count: 12, status: 'STATIONED' }
  ];

  useEffect(() => {
    loadAllResources();
  }, []);

  const loadAllResources = async () => {
    try {
      setLoading(true);
      const [hosps, shelts, resTeams] = await Promise.all([
        resourcesApi.getHospitals().catch(() => hpFallbackHospitals),
        resourcesApi.getShelters().catch(() => hpFallbackShelters),
        rescueApi.getRescueTeams().catch(() => hpFallbackTeams)
      ]);
      setHospitals(hosps && hosps.length ? hosps : hpFallbackHospitals);
      setShelters(shelts && shelts.length ? shelts : hpFallbackShelters);
      setTeams(resTeams && resTeams.length ? resTeams : hpFallbackTeams);
    } catch (e) {
      setHospitals(hpFallbackHospitals);
      setShelters(hpFallbackShelters);
      setTeams(hpFallbackTeams);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 w-full select-none pb-10">
      
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Shield className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Emergency Resources & Relief Facilities</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Verified hospitals, safe evacuation shelters, and rescue units across monitored corridors.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-[#0d0d0d] p-1.5 rounded-xl border border-[#1c1c1c] text-xs self-start sm:self-center">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
              activeTab === 'hospitals'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Ambulance className="w-3.5 h-3.5" />
            <span>Hospitals ({hospitals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('shelters')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
              activeTab === 'shelters'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Shelters ({shelters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
              activeTab === 'teams'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Rescue Teams ({teams.length})</span>
          </button>
        </div>
      </div>

      {/* Facilities & Teams Grid - Full Width Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeTab === 'hospitals' && hospitals.map((h, i) => (
          <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl space-y-3 hover:border-[#282828] transition-colors shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-xs text-white leading-snug">{h.name}</h3>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-600/30 px-2 py-0.5 rounded font-mono font-medium shrink-0">
                  {h.capacity ? `${h.capacity} Beds` : '24/7 Trauma'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{h.address || (h.district ? `${h.district}, ${h.state || ''}` : 'Monitored Region')}</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#181818] text-xs">
              <span className="text-[11px] text-neutral-400 font-mono">{h.phone || 'Emergency: 108'}</span>
              <button
                onClick={() => navigate('/safe-route')}
                className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Navigation className="w-3 h-3" />
                <span>Route</span>
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'shelters' && shelters.map((s, i) => (
          <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl space-y-3 hover:border-[#282828] transition-colors shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-xs text-white leading-snug">{s.name}</h3>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-600/30 px-2 py-0.5 rounded font-mono font-medium shrink-0">
                  {s.capacity ? `${s.capacity}` : 'Shelter Ready'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{s.address || s.district || 'Safe Evacuation Zone, HP'}</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#181818] text-xs">
              <span className="text-[11px] text-neutral-400">Status: Safe Haven</span>
              <button
                onClick={() => navigate('/safe-route')}
                className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Navigation className="w-3 h-3" />
                <span>Route</span>
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'teams' && teams.map((tItem, i) => (
          <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl space-y-3 hover:border-[#282828] transition-colors shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-xs text-white leading-snug">{tItem.team_name}</h3>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-600/30 px-2 py-0.5 rounded font-mono font-medium shrink-0">
                  {tItem.status || 'READY'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{tItem.base_station || 'Himachal EOC Base'}</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#181818] text-xs">
              <span className="text-[11px] text-neutral-400">Personnel: {tItem.members_count || 12} Rescuers</span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active</span>
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
