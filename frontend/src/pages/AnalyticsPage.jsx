import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  Sparkles, 
  Activity, 
  CloudRain, 
  Users, 
  TrendingUp, 
  ShieldAlert,
  Layers
} from 'lucide-react';
import { getRiskScoreColor, getRiskLevelColor } from '../utils/formatters';

export const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error('Analytics aggregation error:', e);
      setError(e?.response?.data?.detail || e.message || 'Unable to aggregate regional landslide telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-label-2">
        <Activity className="w-8 h-8 animate-spin mx-auto text-label-2 mb-3" />
        <p className="text-sm font-semibold">Aggregating Regional Landslide Telemetry & ML Metrics...</p>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="bg-surface border border-line rounded-card p-8 max-w-xl mx-auto text-center space-y-4 my-12">
        <ShieldAlert className="w-10 h-10 text-risk-critical mx-auto" />
        <h2 className="text-lg font-semibold text-label">Telemetry Aggregation Unavailable</h2>
        <p className="text-sm text-label-2">{error}</p>
        <button
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent text-label text-xs font-semibold rounded-full transition"
        >
          <Activity className="w-4 h-4" />
          Retry Aggregation
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-surface border border-line p-5 rounded-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-tile bg-surface-2 border border-line flex items-center justify-center text-label-2">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold text-label">Disaster Telemetry & Model Analytics</h1>
            <span className="text-xs px-2 py-0.5 rounded-full tabular-nums font-semibold bg-risk-low/[0.12] text-risk-low border border-risk-low/30">
              Authoritative WMO & Copernicus Telemetry
            </span>
          </div>
          <p className="text-xs text-label-2 mt-1">
            Statistical correlations between intense precipitation, slope morphology, community signals, and AI predictions across monitored mountain sectors.
          </p>
        </div>

        <span className="text-xs text-label-3 tabular-nums">
          Updated: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Risk Distribution Bar Chart */}
        <div className="bg-surface border border-line rounded-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h3 className="text-sm font-semibold text-label flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-risk-critical" />
              Regional Risk Classification Breakdown
            </h3>
            <span className="text-xs tabular-nums text-label-2">{analytics.total_zones} Monitored Zones</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.risk_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
                <XAxis dataKey="level" tick={{ fill: '#98989F', fontSize: 10 }} />
                <YAxis tick={{ fill: '#98989F', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C1C1E', borderColor: '#38383A', borderRadius: '12px', color: '#FFFFFF' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {analytics.risk_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getRiskLevelColor(String(entry.level).split(' ')[0]).hex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Rainfall vs Risk Score Correlation */}
        <div className="bg-surface border border-line rounded-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h3 className="text-sm font-semibold text-label flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-label-2" />
              Rainfall (24h) vs Final Landslide Risk Score
            </h3>
            <span className="text-xs tabular-nums text-label-2">Physics Correlation</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.rainfall_vs_risk} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
                <XAxis dataKey="name" tick={{ fill: '#98989F', fontSize: 10 }} />
                <YAxis tick={{ fill: '#98989F', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C1C1E', borderColor: '#38383A', borderRadius: '12px', color: '#FFFFFF' }}
                />
                <Line type="monotone" dataKey="risk_score" stroke="#4A86E8" strokeWidth={2} name="Risk Score (0-100)" dot={{ r: 3, fill: '#4A86E8' }} />
                <Line type="monotone" dataKey="rainfall_24h" stroke="#98989F" strokeWidth={1.5} name="Rainfall 24h (mm)" dot={{ r: 2.5, fill: '#98989F' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Community Reports Timeline */}
        <div className="bg-surface border border-line rounded-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h3 className="text-sm font-semibold text-label flex items-center gap-2">
              <Users className="w-4 h-4 text-risk-moderate" />
              Crowdsourced Ground Observations Timeline (24h)
            </h3>
            <span className="text-xs tabular-nums text-risk-low">{analytics.verified_reports} Verified</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.reports_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#98989F" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#98989F" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A86E8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4A86E8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
                <XAxis dataKey="time" tick={{ fill: '#98989F', fontSize: 10 }} />
                <YAxis tick={{ fill: '#98989F', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C1C1E', borderColor: '#38383A', borderRadius: '12px', color: '#FFFFFF' }}
                />
                <Area type="monotone" dataKey="reports" stroke="#98989F" fillOpacity={1} fill="url(#colorReports)" name="Total Reports" />
                <Area type="monotone" dataKey="verified" stroke="#4A86E8" fillOpacity={1} fill="url(#colorVerified)" name="Verified Reports" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Global Random Forest Feature Importance */}
        <div className="bg-surface border border-line rounded-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h3 className="text-sm font-semibold text-label flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-label-2" />
              Random Forest Global Feature Importance
            </h3>
            <span className="text-xs tabular-nums text-label-2">Trained Model Weights</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.feature_importance} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
                <XAxis type="number" tick={{ fill: '#98989F', fontSize: 10 }} domain={[0, 50]} unit="%" />
                <YAxis dataKey="factor" type="category" tick={{ fill: '#98989F', fontSize: 9 }} width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C1C1E', borderColor: '#38383A', borderRadius: '12px', color: '#FFFFFF' }}
                />
                <Bar dataKey="weight" fill="#4A86E8" radius={[0, 6, 6, 0]} name="Weight (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Critical Slopes Ranking Table */}
      <div className="bg-surface border border-line rounded-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-label flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-risk-critical" />
          Highest Vulnerability Sector Rankings (Operational Telemetry)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line text-label-2 tabular-nums text-xs">
                <th className="py-2.5 px-3">Zone ID & Location</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">ML Base</th>
                <th className="py-2.5 px-3">Community Boost</th>
                <th className="py-2.5 px-3">Final Risk Score</th>
                <th className="py-2.5 px-3">Rainfall / Slope</th>
                <th className="py-2.5 px-3">Verified Ground Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium">
              {analytics.top_critical_zones.map((zone, idx) => {
                const riskCol = getRiskScoreColor(zone.risk_score);
                return (
                  <tr key={idx} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="tabular-nums font-semibold text-label-2 block">{zone.zone_id}</span>
                      <span className="text-label">{zone.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-label-2">{zone.state}</td>
                    <td className="py-2.5 px-3 tabular-nums text-label-2">{zone.ml_base}</td>
                    <td className="py-2.5 px-3 tabular-nums font-semibold text-risk-moderate">
                      {zone.community_boost > 0 ? `+${zone.community_boost}` : '+0'}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-semibold text-sm" style={{ color: riskCol.hex }}>
                      {zone.risk_score}/100
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-label-2">
                      {zone.rainfall_24h} mm • {zone.slope_deg}°
                    </td>
                    <td className="py-2.5 px-3 text-label-2">
                      <span className="tabular-nums font-semibold text-risk-low">{zone.verified_reports} verified</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
