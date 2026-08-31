/**
 * LANDSAFE - Professional GIS Utility Helpers
 * Formats risk levels, status indicators, badges, and timestamps.
 */

export const getRiskLevelColor = (level) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return {
        bg: 'bg-red-950/40',
        text: 'text-red-400',
        border: 'border-red-500/40',
        badge: 'bg-red-950/60 text-red-300 border border-red-500/50',
        hex: '#ef4444',
        indicator: 'bg-red-500',
      };
    case 'HIGH':
      return {
        bg: 'bg-amber-950/40',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        badge: 'bg-amber-950/60 text-amber-300 border border-amber-500/50',
        hex: '#f59e0b',
        indicator: 'bg-amber-500',
      };
    case 'MODERATE':
      return {
        bg: 'bg-amber-950/30',
        text: 'text-amber-300',
        border: 'border-amber-600/30',
        badge: 'bg-amber-950/40 text-amber-300 border border-amber-500/40',
        hex: '#d97706',
        indicator: 'bg-amber-500',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-emerald-950/30',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40',
        hex: '#10b981',
        indicator: 'bg-emerald-500',
      };
  }
};

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
