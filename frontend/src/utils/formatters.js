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
  if (score >= 81) return getRiskLevelColor('CRITICAL');
  if (score >= 61) return getRiskLevelColor('HIGH');
  if (score >= 31) return getRiskLevelColor('MODERATE');
  return getRiskLevelColor('LOW');
};

export const formatScore = (score) => {
  if (score === undefined || score === null) return '0.0';
  return Number(score).toFixed(1);
};

export const formatDate = (isoString) => {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
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
