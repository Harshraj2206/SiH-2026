import React, { useState, useEffect } from 'react';
import { sosApi } from '../services/api';
import { offlineQueue } from '../services/offlineQueue';
import { formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';
import { Radio, MapPin, CheckCircle2, PhoneCall, Shield, AlertTriangle, Crosshair } from 'lucide-react';

const SEVERITY = [
  { id: 'CRITICAL', label: 'Trapped or in danger', send: 'CRITICAL', trapped: true },
  { id: 'INJURED', label: 'Badly injured', send: 'SEVERE', trapped: false },
  { id: 'MINOR', label: 'Minor injuries', send: 'MINOR', trapped: false },
  { id: 'NONE', label: 'No injuries, stranded', send: 'NONE', trapped: false }
];

export const SosEmergencyPage = () => {
  const { currentUser, isAuthority } = useAuth();
  const { userGpsLocation, requestLocation } = useLocationIntelligence();

  const [userName, setUserName] = useState(currentUser?.full_name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [peopleCount, setPeopleCount] = useState(1);
  const [severity, setSeverity] = useState('CRITICAL');
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [requests, setRequests] = useState([]);

  const gps = userGpsLocation?.latitude != null ? userGpsLocation : null;

  useEffect(() => {
    if (currentUser?.full_name && !userName) setUserName(currentUser.full_name);
    if (currentUser?.phone && !phone) setPhone(currentUser.phone);
  }, [currentUser]);

  useEffect(() => {
    if (isAuthority) sosApi.getSOSRequests().then((d) => setRequests(d || [])).catch(() => setRequests([]));
  }, [isAuthority, submitted]);

  const handleLocate = async () => {
    setLocating(true);
    setLocError(null);
    const res = await requestLocation(true);
    if (!res?.success) setLocError(res?.error || 'Could not get your location.');
    setLocating(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !gps) return;
    setSubmitting(true);
    setSendError(null);
    const opt = SEVERITY.find((s) => s.id === severity);
    const payload = {
      user_name: userName.trim(),
      emergency_contact: phone.trim(),
      latitude: gps.latitude,
      longitude: gps.longitude,
      location_name: gps.displayName || null,
      people_count: parseInt(peopleCount, 10) || 1,
      injury_severity: opt.send,
      is_trapped: opt.trapped,
      message: message.trim() || null
    };
    try {
      if (navigator.onLine) {
        setSubmitted(await sosApi.triggerSOS(payload));
      } else {
        const queued = offlineQueue.enqueueSOS(payload);
        setSubmitted({ sos_id: queued.offline_id, offline: true });
      }
    } catch (err) {
      setSendError(err?.response?.data?.detail || 'Could not send. Call 112.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 w-full pb-10">
      <div className="bg-surface p-5 rounded-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-tile bg-risk-critical/[0.12] flex items-center justify-center text-risk-critical">
          <Radio className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-label">Emergency SOS</h1>
          <p className="text-xs text-label-2 mt-0.5">Send your location and situation to LandSafe.</p>
        </div>
      </div>

      <div className="p-3 rounded-tile bg-risk-critical/[0.12] text-risk-critical text-xs flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          This does not contact emergency services. If you or anyone is in danger, call{' '}
          <a href="tel:112" className="font-semibold underline">112</a> now.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-surface rounded-card p-6 space-y-4">
          {submitted ? (
            <div className="bg-surface-2 p-5 rounded-tile space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-risk-low" />
                <div>
                  <h3 className="font-semibold text-sm text-label">
                    {submitted.offline ? 'Saved — will send when you are back online' : 'Request sent'}
                  </h3>
                  <span className="text-xs text-label-2">Reference {submitted.sos_id}</span>
                </div>
              </div>
              <p className="text-xs text-label-2">
                Your request is in the LandSafe list for local authorities. No rescue team is connected to
                LandSafe, so call <a href="tel:112" className="underline">112</a> for help.
              </p>
              <button
                onClick={() => setSubmitted(null)}
                className="w-full py-2 bg-surface hover:opacity-90 text-label rounded-full text-xs"
              >
                Send another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Location */}
              <div className="bg-surface-2 p-3 rounded-tile text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-label-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {gps ? (
                    <span className="truncate">
                      {gps.displayName || 'Your location'} ({gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)})
                      {gps.accuracy ? ` · ±${gps.accuracy} m` : ''}
                    </span>
                  ) : (
                    <span>{locError || 'Your location is needed to send an SOS.'}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleLocate}
                  disabled={locating}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface text-label shrink-0 disabled:opacity-50"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  {locating ? 'Locating…' : gps ? 'Update' : 'Use my location'}
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-label-2">How serious is it?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SEVERITY.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSeverity(opt.id)}
                      className={`p-2.5 rounded-tile border text-left text-xs ${
                        severity === opt.id ? 'bg-surface-2 border-label/40 text-label font-semibold' : 'bg-surface-2 border-transparent text-label-2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-label-2 mb-1">Number of people</label>
                  <input
                    type="number" min="1" max="100" required value={peopleCount}
                    onChange={(e) => setPeopleCount(e.target.value)}
                    className="w-full bg-surface-2 rounded-field px-3 py-2 text-xs text-label focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-label-2 mb-1">Your name</label>
                  <input
                    type="text" required value={userName} placeholder="Name"
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-surface-2 rounded-field px-3 py-2 text-xs text-label placeholder-label-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-label-2 mb-1">Phone number</label>
                  <input
                    type="tel" required value={phone} placeholder="Phone"
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-surface-2 rounded-field px-3 py-2 text-xs text-label placeholder-label-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-label-2">Landmark or notes (optional)</label>
                <textarea
                  rows={2} value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nearby landmark, injuries, anything responders should know"
                  className="w-full bg-surface-2 rounded-field p-2.5 text-xs text-label placeholder-label-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              {sendError && <p className="text-xs text-risk-critical">{sendError}</p>}

              <button
                type="submit"
                disabled={submitting || !gps}
                className="w-full py-3.5 bg-risk-critical hover:opacity-90 text-white rounded-full text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Radio className="w-4 h-4" />
                <span>{submitting ? 'Sending…' : gps ? 'Send SOS' : 'Share your location to send'}</span>
              </button>
            </form>
          )}
        </div>

        <div className="lg:col-span-4 space-y-3">
          <div className="bg-surface-2 rounded-tile p-4 space-y-2.5">
            <h3 className="font-semibold text-xs text-label flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5" />
              Helplines (India)
            </h3>
            <div className="space-y-1.5 text-xs">
              {[['Emergency', '112'], ['Disaster helpline', '1070 / 1077'], ['Ambulance', '108']].map(([label, num]) => (
                <div key={label} className="bg-surface p-2 rounded-tile flex justify-between items-center">
                  <span className="text-label-2">{label}</span>
                  <a href={`tel:${num.split(' ')[0]}`} className="text-label text-sm font-semibold">{num}</a>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-2 rounded-tile p-4 space-y-2 text-xs text-label-2">
            <h4 className="font-semibold text-label text-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Stay safe
            </h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Move away from the path of the slide, to the side, not downhill.</li>
              <li>Keep away from river channels and steep road edges.</li>
              <li>Save your phone battery for calls.</li>
            </ul>
          </div>
        </div>
      </div>

      {isAuthority && (
        <div className="bg-surface rounded-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-label">SOS requests ({requests.length})</h2>
          {requests.length === 0 && <p className="text-xs text-label-2">No requests yet.</p>}
          {requests.map((sos) => (
            <div key={sos.sos_id} className="bg-surface-2 rounded-tile p-3 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-label">
                  {sos.user_name || 'Unnamed'} · {sos.people_count} {sos.people_count === 1 ? 'person' : 'people'} · {sos.triage_priority}
                </span>
                <span className="text-label-2">{formatDate(sos.timestamp)}</span>
              </div>
              <div className="text-label-2">
                {sos.location_name || `${sos.latitude.toFixed(4)}, ${sos.longitude.toFixed(4)}`}
                {sos.emergency_contact && <> · <a href={`tel:${sos.emergency_contact}`} className="underline">{sos.emergency_contact}</a></>}
              </div>
              {sos.message && <div className="text-label-2">{sos.message}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
