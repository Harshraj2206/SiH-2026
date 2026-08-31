import React, { useState, useEffect } from 'react';
import { sosApi, rescueApi } from '../services/api';
import { offlineQueue } from '../services/offlineQueue';
import { formatDate } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { 
  Radio, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Crosshair,
  PhoneCall,
  Shield,
  Wifi,
  WifiOff,
  Clock,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export const SosEmergencyPage = () => {
  const { t } = useLanguage();
  const [sosList, setSosList] = useState([]);
  const [rescueTeams, setRescueTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('citizen'); // 'citizen' | 'authority'

  // Citizen Form State (Section 12)
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [severityOption, setSeverityOption] = useState('CRITICAL'); // 'CRITICAL' | 'INJURED' | 'MINOR' | 'NO INJURY'
  const [message, setMessage] = useState('');
  const [gpsLocation, setGpsLocation] = useState({ lat: 31.9579, lng: 77.1095 });
  const [submitting, setSubmitting] = useState(false);
  const [submittedSOS, setSubmittedSOS] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    fetchData();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sosData, teamsData] = await Promise.all([
        sosApi.getSOSRequests(),
        rescueApi.getRescueTeams()
      ]);
      setSosList(sosData || []);
      setRescueTeams(teamsData || []);
    } catch (err) {
      console.error('Failed to load SOS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  };

  const handleSubmitSOS = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      user_name: userName || 'Citizen in Distress',
      emergency_contact: phone || '+91 98000-00000',
      latitude: gpsLocation?.lat || 25.8640,
      longitude: gpsLocation?.lng || 91.8930,
      location_name: `Hazard Sector (${(gpsLocation?.lat ?? 25.8640).toFixed(4)}°N, ${(gpsLocation?.lng ?? 91.8930).toFixed(4)}°E)`,
      people_count: parseInt(peopleCount, 10),
      injury_severity: severityOption === 'CRITICAL' ? 'CRITICAL' : severityOption === 'INJURED' ? 'SEVERE' : severityOption === 'MINOR' ? 'MINOR' : 'NONE',
      is_trapped: severityOption === 'CRITICAL',
      message: message || `Emergency assistance requested for ${peopleCount} people.`
    };

    try {
      if (navigator.onLine) {
        const res = await sosApi.triggerSOS(payload);
        setSubmittedSOS(res);
      } else {
        const queued = offlineQueue.enqueueSOS(payload);
        setSubmittedSOS({
          ...queued,
          sos_id: queued.offline_id,
          triage_priority: severityOption === 'CRITICAL' || severityOption === 'INJURED' ? 'CRITICAL' : 'URGENT',
          status: 'QUEUED_OFFLINE'
        });
      }
      fetchData();
    } catch (err) {
      console.error('Failed to submit SOS:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTeam = async (sosId, teamId) => {
    try {
      await sosApi.triageSOS(sosId, {
        status: 'DISPATCHED',
        assigned_team_id: teamId,
        triage_notes: 'Responder unit dispatched.'
      });
      fetchData();
    } catch (err) {
      console.error('Failed to assign team:', err);
    }
  };

  return (
    <div className="space-y-5 w-full select-none pb-10">
      
      {/* Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0a0a] p-5 rounded-2xl border border-[#1a1a1a] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Emergency SOS Distress Beacon</h1>
            <p className="text-xs text-neutral-400 mt-0.5">Immediate multi-agency emergency response and rescue dispatch.</p>
          </div>
        </div>

        <div className="flex items-center bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-1 text-xs self-start sm:self-center">
          <button
            onClick={() => setActiveTab('citizen')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium ${
              activeTab === 'citizen' ? 'bg-red-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Citizen Distress
          </button>
          <button
            onClick={() => setActiveTab('authority')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium ${
              activeTab === 'authority' ? 'bg-[#181818] text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Rescue Queue ({sosList.length})
          </button>
        </div>
      </div>

      {activeTab === 'citizen' ? (
        /* Section 12: Focused Emergency SOS Request Experience */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 shadow-sm space-y-4">
            
            {/* Status Telemetry Strip */}
            <div className="grid grid-cols-3 gap-2 bg-[#0f0f0f] p-3 rounded-xl border border-[#1e1e1e] text-xs">
              <div className="flex items-center gap-1.5 text-neutral-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">GPS: {(gpsLocation?.lat ?? 31.958).toFixed(3)}°, {(gpsLocation?.lng ?? 77.110).toFixed(3)}°</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-300">
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                <span>{isOnline ? 'ONLINE' : 'OFFLINE (QUEUED)'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-300">
                <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {submittedSOS ? (
              /* Post-Dispatch Status Pipeline (Section 12) */
              <div className="bg-[#090f1d] border border-[#1c2b48] p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#1c2b48] pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white">SOS BEACON ACTIVE</h3>
                      <span className="font-mono text-xs text-cyan-400">Incident #{submittedSOS.sos_id}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-red-950/60 text-red-300 border border-red-500/40">
                    {submittedSOS.triage_priority}
                  </span>
                </div>

                {/* Status Pipeline Step Indicator */}
                <div className="space-y-1.5 font-mono text-[11px]">
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Dispatch Pipeline</span>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold">1. SENT</div>
                    <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold">2. ACKNOWLEDGED</div>
                    <div className="p-1.5 rounded bg-[#16243d] border border-cyan-500/40 text-cyan-300 font-bold">3. ASSIGNED</div>
                    <div className="p-1.5 rounded bg-[#121d33] text-slate-400">4. EN ROUTE</div>
                    <div className="p-1.5 rounded bg-[#121d33] text-slate-400">5. RESCUED</div>
                  </div>
                </div>

                <div className="bg-[#0d1527] p-3 rounded-lg border border-[#1c2b48] text-xs font-mono space-y-1 text-slate-300">
                  <div>Assigned Response Team: <strong className="text-white">{submittedSOS.assigned_team_name || 'NDRF 1st Bn (Dispatched)'}</strong></div>
                  <div>Trauma Center: <strong className="text-white">{submittedSOS.destination_hospital_name || 'Designated District Civil Hospital'}</strong></div>
                </div>

                <button
                  onClick={() => setSubmittedSOS(null)}
                  className="w-full py-2 bg-[#121d33] hover:bg-[#182744] text-slate-200 border border-[#1c2b48] rounded-lg text-xs font-mono transition-colors"
                >
                  Send Follow-up Emergency Note
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitSOS} className="space-y-4">
                
                {/* Situation Severity (Section 12) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    How serious is the situation?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'CRITICAL', label: 'CRITICAL', desc: 'Trapped / Danger', border: 'border-red-500/60', text: 'text-red-300' },
                      { id: 'INJURED', label: 'INJURED', desc: 'Severe trauma', border: 'border-amber-500/60', text: 'text-amber-300' },
                      { id: 'MINOR', label: 'MINOR', desc: 'Cuts / Mobility ok', border: 'border-cyan-500/60', text: 'text-cyan-300' },
                      { id: 'NO INJURY', label: 'NO INJURY', desc: 'Stranded / Evac', border: 'border-emerald-500/60', text: 'text-emerald-300' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSeverityOption(opt.id)}
                        className={`p-2.5 rounded-lg border text-left font-mono transition-colors ${
                          severityOption === opt.id 
                            ? `bg-[#16243d] ${opt.border} shadow-md` 
                            : 'bg-[#090f1d] border-[#1c2b48] hover:bg-[#121d33]'
                        }`}
                      >
                        <span className={`block font-bold text-xs ${opt.text}`}>{opt.label}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of People & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Number of People</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(e.target.value)}
                      className="w-full bg-[#090f1d] border border-[#1c2b48] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Name"
                      className="w-full bg-[#090f1d] border border-[#1c2b48] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98000-XXXXX"
                      className="w-full bg-[#090f1d] border border-[#1c2b48] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Landmark or Distress Note */}
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-slate-300">
                    Location Landmark / Medical Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Near milestone 42 on NH-6, white SUV, mud covering road..."
                    className="w-full bg-[#090f1d] border border-[#1c2b48] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                {/* Dominant SEND SOS Action (Section 12) */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-mono font-black tracking-wider flex items-center justify-center gap-2 shadow-xl border border-red-500/60 transition-colors disabled:opacity-50"
                >
                  <Radio className="w-4 h-4 text-white" />
                  <span>{submitting ? 'TRANSMITTING BEACON...' : 'SEND SOS'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right: Emergency Helplines & Self Protection */}
          <div className="lg:col-span-4 space-y-3 font-mono">
            <div className="bg-[#0d1527] border border-[#1c2b48] rounded-xl p-4 shadow-xl space-y-2.5">
              <h3 className="font-bold text-xs text-white flex items-center gap-1.5 uppercase tracking-wider">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                Direct Helplines
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="bg-[#090f1d] p-2 rounded-lg border border-[#1c2b48] flex justify-between items-center">
                  <span className="text-slate-300">National Emergency</span>
                  <strong className="text-emerald-400 text-sm">112</strong>
                </div>
                <div className="bg-[#090f1d] p-2 rounded-lg border border-[#1c2b48] flex justify-between items-center">
                  <span className="text-slate-300">Disaster Management</span>
                  <strong className="text-cyan-400 text-sm">1070 / 1077</strong>
                </div>
                <div className="bg-[#090f1d] p-2 rounded-lg border border-[#1c2b48] flex justify-between items-center">
                  <span className="text-slate-300">Ambulance Service</span>
                  <strong className="text-amber-400 text-sm">108</strong>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1527] border border-[#1c2b48] rounded-xl p-4 shadow-xl space-y-2 text-xs text-slate-300">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Self-Protection Rules
              </h4>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 font-sans">
                <li>Move perpendicular to the direction of the landslide slide path.</li>
                <li>Avoid river valleys, low bridge passes, and steep road shoulders.</li>
                <li>Conserve phone battery for responder triangulation calls.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Section 23: Clean Authority Rescue Priority Queue */
        <div className="space-y-3 font-mono">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#0d1527] border border-[#1c2b48] p-2.5 rounded-lg">
              <span className="text-[10px] text-red-400 block font-bold">P1 — CRITICAL</span>
              <span className="text-lg font-bold text-white">
                {sosList.filter(s => s.triage_priority === 'CRITICAL').length}
              </span>
            </div>
            <div className="bg-[#0d1527] border border-[#1c2b48] p-2.5 rounded-lg">
              <span className="text-[10px] text-amber-400 block font-bold">P2 — URGENT</span>
              <span className="text-lg font-bold text-white">
                {sosList.filter(s => s.triage_priority === 'URGENT').length}
              </span>
            </div>
            <div className="bg-[#0d1527] border border-[#1c2b48] p-2.5 rounded-lg">
              <span className="text-[10px] text-cyan-400 block font-bold">P3 — EVACUATION</span>
              <span className="text-lg font-bold text-white">
                {sosList.filter(s => s.triage_priority === 'EVACUATION').length}
              </span>
            </div>
            <div className="bg-[#0d1527] border border-[#1c2b48] p-2.5 rounded-lg">
              <span className="text-[10px] text-emerald-400 block font-bold">P4 — SAFE</span>
              <span className="text-lg font-bold text-white">
                {sosList.filter(s => s.status === 'RESCUED' || s.triage_priority === 'ROUTINE').length}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {sosList.map((sos) => (
              <div
                key={sos.sos_id}
                className="bg-[#0d1527] border border-[#1c2b48] rounded-xl p-3.5 shadow-xl space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c2b48] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-500/40">
                      {sos.sos_id}
                    </span>
                    <span className="text-xs font-bold text-white">{sos.user_name} ({sos.people_count} victims)</span>
                    <span className="text-[10px] text-slate-400">Tel: {sos.emergency_contact}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{formatDate(sos.timestamp)}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-[#090f1d] p-2 rounded-lg border border-[#1c2b48]">
                    <span className="text-[10px] text-slate-500 block uppercase">Location</span>
                    <span className="text-slate-300 font-semibold">{sos.location_name}</span>
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-[#1c2b48]">
                    <span className="text-[10px] text-slate-500 block uppercase">Notes</span>
                    <span className="text-slate-300 italic">"{sos.message || 'Assistance requested'}"</span>
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-[#1c2b48] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Status</span>
                      <span className="text-emerald-400 font-bold">{sos.assigned_team_name || 'Unassigned'}</span>
                    </div>
                    {!sos.assigned_team_name && (
                      <select
                        onChange={(e) => e.target.value && handleAssignTeam(sos.sos_id, e.target.value)}
                        defaultValue=""
                        className="bg-[#121d33] border border-[#1c2b48] rounded px-2 py-1 text-[11px] text-white"
                      >
                        <option value="" disabled>Assign Team...</option>
                        {rescueTeams.map((t) => (
                          <option key={t.team_id} value={t.team_id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
