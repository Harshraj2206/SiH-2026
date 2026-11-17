import { createPortal } from 'react-dom';
import React, { useState } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { useLocationIntelligence } from '../../context/LocationIntelligenceContext';
import { X, MapPin, Crosshair } from 'lucide-react';

export const REPORT_SIGNS = [
  { label: 'Cracks in the ground, road or walls', type: 'Cracks' },
  { label: 'Water seeping or muddy water from a slope', type: 'Water seepage' },
  { label: 'Tilting trees, poles or fences', type: 'Slope movement' },
  { label: 'Road or ground sinking', type: 'Slope movement' },
  { label: 'Falling rocks or loose stones', type: 'Falling rocks' }
];

export const ReportSubmissionModal = ({ isOpen, onClose }) => {
  const { handleCreateReport } = useEmergency();
  const { userGpsLocation, requestLocation } = useLocationIntelligence();

  const [signs, setSigns] = useState([]);
  const [description, setDescription] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const gps = userGpsLocation?.latitude != null ? userGpsLocation : null;

  const toggleSign = (label) =>
    setSigns((prev) => (prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]));

  const handleLocate = async () => {
    setLocating(true);
    setLocError(null);
    const res = await requestLocation(true);
    if (!res?.success) setLocError(res?.error || 'Could not get your location.');
    setLocating(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !gps || signs.length === 0 || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await handleCreateReport({
        latitude: gps.latitude,
        longitude: gps.longitude,
        location_name: gps.displayName || null,
        report_type: REPORT_SIGNS.find((s) => s.label === signs[0]).type,
        signs_observed: signs,
        has_activity: true,
        description: description.trim()
      });
      setSigns([]);
      setDescription('');
      onClose();
    } catch {
      setError('Could not send the report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-surface rounded-card max-w-xl w-full p-6 space-y-4 text-label my-8">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-base font-semibold">Report what you see</h2>
            <p className="text-xs text-label-2">Reports are shown as unverified until an official reviews them.</p>
          </div>
          <button type="button" onClick={onClose} className="text-label-2 hover:text-label" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-surface-2 p-3 rounded-tile text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-label-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {gps
                ? `${gps.displayName || 'Your location'} (${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)})`
                : locError || 'Your location is needed for a report.'}
            </span>
          </div>
          <button
            type="button" onClick={handleLocate} disabled={locating}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface text-label shrink-0 disabled:opacity-50"
          >
            <Crosshair className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
            {locating ? 'Locating…' : gps ? 'Update' : 'Use my location'}
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-label-2">What did you see?</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REPORT_SIGNS.map((s) => (
              <label key={s.label} className="flex items-center gap-2 p-2 rounded-tile bg-surface-2 text-xs cursor-pointer">
                <input type="checkbox" checked={signs.includes(s.label)} onChange={() => toggleSign(s.label)} />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-label-2" htmlFor="report-description">Details</label>
          <textarea
            id="report-description" rows={3} required minLength={5} value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Where exactly, how big, when you noticed it"
            className="w-full bg-surface-2 rounded-field p-2.5 text-xs text-label placeholder-label-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {error && <p className="text-xs text-risk-critical">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !gps || signs.length === 0 || !description.trim()}
          className="w-full py-2.5 bg-accent hover:opacity-90 text-white rounded-full text-xs font-semibold disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send report'}
        </button>
      </form>
    </div>,
    document.body
  );
};
