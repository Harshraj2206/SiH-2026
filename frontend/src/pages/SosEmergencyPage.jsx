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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-card border border-line shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tile bg-risk-critical/[0.12] border border-risk-critical/30 flex items-center justify-center text-risk-critical">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-label">Emergency SOS Distress Beacon</h1>
            <p className="text-xs text-label-2 mt-0.5">Immediate multi-agency emergency response and rescue dispatch.</p>
          </div>
        </div>

        <div className="flex items-center bg-surface border border-line rounded-tile p-1 text-xs self-start sm:self-center">
          <button
            onClick={() => setActiveTab('citizen')}
            className={`px-3.5 py-1.5 rounded-full transition-colors font-medium ${
              activeTab === 'citizen' ? 'bg-risk-critical text-label font-semibold' : 'text-label-2 hover:text-label'
            }`}
          >
            Citizen Distress
          </button>
          <button
            onClick={() => setActiveTab('authority')}
            className={`px-3.5 py-1.5 rounded-full transition-colors font-medium ${
              activeTab === 'authority' ? 'bg-surface-2 text-label font-semibold' : 'text-label-2 hover:text-label'
            }`}
          >
            Rescue Queue ({sosList.length})
          </button>
        </div>
      </div>

      {activeTab === 'citizen' ? (
        /* Section 12: Focused Emergency SOS Request Experience */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-surface border border-line rounded-card p-6 shadow-sm space-y-4">
            
            {/* Status Telemetry Strip */}
            <div className="grid grid-cols-3 gap-2 bg-surface p-3 rounded-tile border border-line text-xs">
              <div className="flex items-center gap-1.5 text-label-2">
                <MapPin className="w-3.5 h-3.5 text-risk-low shrink-0" />
                <span className="truncate">GPS: {(gpsLocation?.lat ?? 31.958).toFixed(3)}°, {(gpsLocation?.lng ?? 77.110).toFixed(3)}°</span>
              </div>
              <div className="flex items-center gap-1.5 text-label-2">
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-risk-low shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-risk-moderate shrink-0" />}
                <span>{isOnline ? 'ONLINE' : 'OFFLINE (QUEUED)'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-label-2">
                <Clock className="w-3.5 h-3.5 text-label-2 shrink-0" />
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {submittedSOS ? (
              /* Post-Dispatch Status Pipeline (Section 12) */
              <div className="bg-surface-2 border border-line p-5 rounded-tile space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-risk-low" />
                    <div>
                      <h3 className="tabular-nums font-semibold text-sm text-label">SOS BEACON ACTIVE</h3>
                      <span className="tabular-nums text-xs text-label-2">Incident #{submittedSOS.sos_id}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full tabular-nums font-semibold bg-risk-critical/[0.12] text-risk-critical border border-risk-critical/30">
                    {submittedSOS.triage_priority}
                  </span>
                </div>

                {/* Status Pipeline Step Indicator */}
                <div className="space-y-1.5 tabular-nums text-xs">
                  <span className="text-label-2 block font-semibold text-xs">Dispatch Pipeline</span>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <div className="p-1.5 rounded-tile bg-risk-low/[0.12] border border-risk-low/30 text-risk-low font-semibold">1. SENT</div>
                    <div className="p-1.5 rounded-tile bg-risk-low/[0.12] border border-risk-low/30 text-risk-low font-semibold">2. ACKNOWLEDGED</div>
                    <div className="p-1.5 rounded-tile bg-surface-2 border border-line text-label-2 font-semibold">3. ASSIGNED</div>
                    <div className="p-1.5 rounded-tile bg-surface-2 text-label-2">4. EN ROUTE</div>
                    <div className="p-1.5 rounded-tile bg-surface-2 text-label-2">5. RESCUED</div>
                  </div>
                </div>

                <div className="bg-surface-2 p-3 rounded-tile border border-line text-xs tabular-nums space-y-1 text-label-2">
                  <div>Assigned Response Team: <strong className="text-label">{submittedSOS.assigned_team_name || 'NDRF 1st Bn (Dispatched)'}</strong></div>
                  <div>Trauma Center: <strong className="text-label">{submittedSOS.destination_hospital_name || 'Designated District Civil Hospital'}</strong></div>
                </div>

                <button
                  onClick={() => setSubmittedSOS(null)}
                  className="w-full py-2 bg-surface-2 hover:bg-[#182744] text-label rounded-full text-xs tabular-nums transition-colors"
                >
                  Send Follow-up Emergency Note
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitSOS} className="space-y-4">
                
                {/* Situation Severity (Section 12) */}
                <div className="space-y-1.5">
                  <label className="block text-xs tabular-nums font-semibold text-label-2 ">
                    How serious is the situation?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'CRITICAL', label: 'CRITICAL', desc: 'Trapped / Danger', border: 'border-risk-critical/30', text: 'text-risk-critical' },
                      { id: 'INJURED', label: 'INJURED', desc: 'Severe trauma', border: 'border-risk-moderate/30', text: 'text-risk-moderate' },
                      { id: 'MINOR', label: 'MINOR', desc: 'Cuts / Mobility ok', border: 'border-line', text: 'text-label-2' },
                      { id: 'NO INJURY', label: 'NO INJURY', desc: 'Stranded / Evac', border: 'border-risk-low/30', text: 'text-risk-low' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSeverityOption(opt.id)}
                        className={`p-2.5 rounded-tile border text-left tabular-nums transition-colors ${
                          severityOption === opt.id 
                            ? `bg-surface-2 ${opt.border} ` 
                            : 'bg-surface-2 border-line hover:bg-surface-2'
                        }`}
                      >
                        <span className={`block font-semibold text-xs ${opt.text}`}>{opt.label}</span>
                        <span className="text-xs text-label-2 block mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of People & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                  <div>
                    <label className="block text-xs font-semibold text-label-2 mb-1">Number of People</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(e.target.value)}
                      className="w-full bg-surface-2 border border-line rounded-field px-3 py-2 text-xs text-label focus:outline-none focus:border-line tabular-nums"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-label-2 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Name"
                      className="w-full bg-surface-2 border border-line rounded-field px-3 py-2 text-xs text-label placeholder-label-3 focus:outline-none focus:border-line tabular-nums"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-label-2 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98000-XXXXX"
                      className="w-full bg-surface-2 border border-line rounded-field px-3 py-2 text-xs text-label placeholder-label-3 focus:outline-none focus:border-line tabular-nums"
                      required
                    />
                  </div>
                </div>

                {/* Landmark or Distress Note */}
                <div className="space-y-1">
                  <label className="block text-xs tabular-nums font-semibold text-label-2">
                    Location Landmark / Medical Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Near milestone 42 on NH-6, white SUV, mud covering road..."
                    className="w-full bg-surface-2 border border-line rounded-field p-2.5 text-xs text-label placeholder-label-3 focus:outline-none focus:border-line tabular-nums"
                  />
                </div>

                {/* Dominant SEND SOS Action (Section 12) */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-risk-critical hover:bg-risk-critical text-label rounded-full text-sm tabular-nums font-semibold flex items-center justify-center gap-2 border border-risk-critical/30 transition-colors disabled:opacity-50"
                >
                  <Radio className="w-4 h-4 text-label" />
                  <span>{submitting ? 'TRANSMITTING BEACON...' : 'SEND SOS'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right: Emergency Helplines & Self Protection */}
          <div className="lg:col-span-4 space-y-3 tabular-nums">
            <div className="bg-surface-2 border border-line rounded-tile p-4 space-y-2.5">
              <h3 className="font-semibold text-xs text-label flex items-center gap-1.5 ">
                <PhoneCall className="w-3.5 h-3.5 text-risk-low" />
                Direct Helplines
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="bg-surface-2 p-2 rounded-tile border border-line flex justify-between items-center">
                  <span className="text-label-2">National Emergency</span>
                  <strong className="text-risk-low text-sm">112</strong>
                </div>
                <div className="bg-surface-2 p-2 rounded-tile border border-line flex justify-between items-center">
                  <span className="text-label-2">Disaster Management</span>
                  <strong className="text-label-2 text-sm">1070 / 1077</strong>
                </div>
                <div className="bg-surface-2 p-2 rounded-tile border border-line flex justify-between items-center">
                  <span className="text-label-2">Ambulance Service</span>
                  <strong className="text-risk-moderate text-sm">108</strong>
                </div>
              </div>
            </div>

            <div className="bg-surface-2 border border-line rounded-tile p-4 space-y-2 text-xs text-label-2">
              <h4 className="font-semibold text-label text-xs flex items-center gap-1.5 ">
                <Shield className="w-3.5 h-3.5 text-label-2" />
                Self-Protection Rules
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-label-2 font-sans">
                <li>Move perpendicular to the direction of the landslide slide path.</li>
                <li>Avoid river valleys, low bridge passes, and steep road shoulders.</li>
                <li>Conserve phone battery for responder triangulation calls.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Section 23: Clean Authority Rescue Priority Queue */
        <div className="space-y-3 tabular-nums">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-surface-2 border border-line p-2.5 rounded-tile">
              <span className="text-xs text-risk-critical block font-semibold">P1 — CRITICAL</span>
              <span className="text-lg font-semibold text-label">
                {sosList.filter(s => s.triage_priority === 'CRITICAL').length}
              </span>
            </div>
            <div className="bg-surface-2 border border-line p-2.5 rounded-tile">
              <span className="text-xs text-risk-moderate block font-semibold">P2 — URGENT</span>
              <span className="text-lg font-semibold text-label">
                {sosList.filter(s => s.triage_priority === 'URGENT').length}
              </span>
            </div>
            <div className="bg-surface-2 border border-line p-2.5 rounded-tile">
              <span className="text-xs text-label-2 block font-semibold">P3 — EVACUATION</span>
              <span className="text-lg font-semibold text-label">
                {sosList.filter(s => s.triage_priority === 'EVACUATION').length}
              </span>
            </div>
            <div className="bg-surface-2 border border-line p-2.5 rounded-tile">
              <span className="text-xs text-risk-low block font-semibold">P4 — SAFE</span>
              <span className="text-lg font-semibold text-label">
                {sosList.filter(s => s.status === 'RESCUED' || s.triage_priority === 'ROUTINE').length}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {sosList.map((sos) => (
              <div
                key={sos.sos_id}
                className="bg-surface-2 border border-line rounded-tile p-3.5 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-risk-critical bg-risk-critical/[0.12] px-1.5 py-0.5 rounded-full border border-risk-critical/30">
                      {sos.sos_id}
                    </span>
                    <span className="text-xs font-semibold text-label">{sos.user_name} ({sos.people_count} victims)</span>
                    <span className="text-xs text-label-2">Tel: {sos.emergency_contact}</span>
                  </div>
                  <span className="text-xs text-label-2">{formatDate(sos.timestamp)}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-surface-2 p-2 rounded-tile border border-line">
                    <span className="text-xs text-label-3 block ">Location</span>
                    <span className="text-label-2 font-semibold">{sos.location_name}</span>
                  </div>

                  <div className="bg-surface-2 p-2 rounded-tile border border-line">
                    <span className="text-xs text-label-3 block ">Notes</span>
                    <span className="text-label-2 italic">"{sos.message || 'Assistance requested'}"</span>
                  </div>

                  <div className="bg-surface-2 p-2 rounded-tile border border-line flex items-center justify-between">
                    <div>
                      <span className="text-xs text-label-3 block ">Status</span>
                      <span className="text-risk-low font-semibold">{sos.assigned_team_name || 'Unassigned'}</span>
                    </div>
                    {!sos.assigned_team_name && (
                      <select
                        onChange={(e) => e.target.value && handleAssignTeam(sos.sos_id, e.target.value)}
                        defaultValue=""
                        className="bg-surface-2 border border-line rounded-field px-2 py-1 text-xs text-label"
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
