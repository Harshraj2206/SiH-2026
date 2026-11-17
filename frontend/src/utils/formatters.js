/**
 * LANDSAFE - Professional GIS Utility Helpers
 * Formats risk levels, status indicators, badges, and timestamps.
 */

// Soft Apple-style risk colours (tokens defined in index.css / tailwind.config.js).
// Class names are written out in full so Tailwind can find them.
const TONES = {
  CRITICAL: { bg: 'bg-risk-critical/[0.12]', text: 'text-risk-critical', border: 'border-risk-critical/30', badge: 'bg-risk-critical/[0.12] text-risk-critical', hex: '#E06C66', indicator: 'bg-risk-critical' },
  HIGH: { bg: 'bg-risk-high/[0.12]', text: 'text-risk-high', border: 'border-risk-high/30', badge: 'bg-risk-high/[0.12] text-risk-high', hex: '#DB8E55', indicator: 'bg-risk-high' },
  MODERATE: { bg: 'bg-risk-moderate/[0.12]', text: 'text-risk-moderate', border: 'border-risk-moderate/30', badge: 'bg-risk-moderate/[0.12] text-risk-moderate', hex: '#D4B24C', indicator: 'bg-risk-moderate' },
  LOW: { bg: 'bg-risk-low/[0.12]', text: 'text-risk-low', border: 'border-risk-low/30', badge: 'bg-risk-low/[0.12] text-risk-low', hex: '#6BBF8A', indicator: 'bg-risk-low' },
};

export const getRiskLevelColor = (level) => TONES[level?.toUpperCase()] || TONES.LOW;

export const getRiskScoreColor = (score) => {
  // Same bands as the model: <=30 low, <=60 moderate, <=80 high, above 80 critical
  if (score > 80) return getRiskLevelColor('CRITICAL');
  if (score > 60) return getRiskLevelColor('HIGH');
  if (score > 30) return getRiskLevelColor('MODERATE');
  return getRiskLevelColor('LOW');
};

export const formatScore = (score) => {
  if (score === undefined || score === null) return '—';
  return Number(score).toFixed(1);
};

export const formatDate = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  // Date-only values (e.g. "2024-07-30") have no time of day to show
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};

export const getReportTypeIconName = (type) => {
  switch (type?.toLowerCase()) {
    case 'cracks':
      return 'Activity';
    case 'water seepage':
      return 'Droplets';
    case 'slope movement':
      return 'TrendingDown';
    case 'falling rocks':
      return 'Mountain';
    default:
      return 'AlertCircle';
  }
};

// "OFFICIAL_GOVERNMENT" -> "Official government", "CRITICAL" -> "Critical".
// Leaves mixed-case text and acronyms (SOS, GPS…) as they are.
const KEEP_UPPER = new Set(['SOS', 'GPS', 'ML', 'GSI', 'NASA', 'DEM', 'SDRF', 'NDRF', 'NDMA', 'SDMA', 'IMD', 'AI', 'ID', 'NH']);
export const toLabel = (value) => {
  if (typeof value !== 'string' || !/^[A-Z0-9_ \-/]+$/.test(value) || !/[A-Z]{3}/.test(value)) return value;
  const words = value.replace(/_/g, ' ').split(' ').filter(Boolean)
    .map((w) => (KEEP_UPPER.has(w) ? w : w.toLowerCase()));
  if (words.length && !KEEP_UPPER.has(words[0])) words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  return words.join(' ');
};
