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
import { getRiskScoreColor } from '../utils/formatters';

export const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getAnalytics();
        setAnalytics(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Activity className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-3" />
        <p className="text-sm font-semibold">Aggregating Regional Landslide Telemetry & ML Metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-white">Disaster Telemetry & Model Analytics</h1>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Simulated DEM / IMD Datasets
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Statistical correlations between intense precipitation, slope morphology, community signals, and AI predictions across the North Eastern Region.
          </p>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          Updated: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Risk Distribution Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Regional Risk Classification Breakdown
            </h3>
            <span className="text-xs font-mono text-slate-400">{analytics.total_zones} Monitored Zones</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.risk_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="level" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {analytics.risk_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Rainfall vs Risk Score Correlation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              Rainfall (24h) vs Final Landslide Risk Score
            </h3>
            <span className="text-xs font-mono text-slate-400">Physics Correlation</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.rainfall_vs_risk} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                />
                <Line type="monotone" dataKey="risk_score" stroke="#ef4444" strokeWidth={2.5} name="Risk Score (0-100)" dot={{ r: 4, fill: '#ef4444' }} />
                <Line type="monotone" dataKey="rainfall_24h" stroke="#38bdf8" strokeWidth={2} name="Rainfall 24h (mm)" dot={{ r: 3, fill: '#38bdf8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Community Reports Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Crowdsourced Ground Observations Timeline (24h)
            </h3>
            <span className="text-xs font-mono text-emerald-400">{analytics.verified_reports} Verified</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.reports_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="reports" stroke="#f59e0b" fillOpacity={1} fill="url(#colorReports)" name="Total Reports" />
                <Area type="monotone" dataKey="verified" stroke="#10b981" fillOpacity={1} fill="url(#colorVerified)" name="Verified Reports" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Global Random Forest Feature Importance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Random Forest Global Feature Importance
            </h3>
            <span className="text-xs font-mono text-slate-400">Trained Model Weights</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.feature_importance} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 50]} unit="%" />
                <YAxis dataKey="factor" type="category" tick={{ fill: '#94a3b8', fontSize: 9 }} width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                />
                <Bar dataKey="weight" fill="#a855f7" radius={[0, 6, 6, 0]} name="Weight (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Critical Slopes Ranking Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-rose-400" />
          Highest Vulnerability Sector Rankings (North Eastern Region)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">Zone ID & Location</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">ML Base</th>
                <th className="py-2.5 px-3">Community Boost</th>
                <th className="py-2.5 px-3">Final Risk Score</th>
                <th className="py-2.5 px-3">Rainfall / Slope</th>
                <th className="py-2.5 px-3">Verified Ground Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {analytics.top_critical_zones.map((zone, idx) => {
                const riskCol = getRiskScoreColor(zone.risk_score);
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-cyan-400 block">{zone.zone_id}</span>
                      <span className="text-slate-200">{zone.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{zone.state}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{zone.ml_base}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                      {zone.community_boost > 0 ? `+${zone.community_boost}` : '+0'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-extrabold text-sm" style={{ color: riskCol.hex }}>
                      {zone.risk_score}/100
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {zone.rainfall_24h} mm • {zone.slope_deg}°
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <span className="font-mono font-bold text-emerald-400">{zone.verified_reports} verified</span>
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
