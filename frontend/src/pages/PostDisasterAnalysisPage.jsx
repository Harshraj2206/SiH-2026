import React, { useState, useEffect } from 'react';
import { postDisasterApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  BrainCircuit,
  ArrowRight
} from 'lucide-react';

export const PostDisasterAnalysisPage = () => {
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await postDisasterApi.getEvents();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load post-disaster records:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/60 text-purple-400 border border-purple-800/60 flex items-center gap-1">
              <BrainCircuit className="w-3 h-3" />
              DISASTER AUDIT & CONTINUOUS LEARNING
            </span>
            <span className="text-xs text-slate-400 font-mono">SIH26001</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Post-Disaster Review & ML Calibration</h1>
          <p className="text-xs text-slate-400">
            Retrospective lifecycle tracking from initial ML risk prediction to ground truth verification, response time, evacuation efficiency, and future AI model tuning.
          </p>
        </div>
      </div>

      {/* Closed-Loop Workflow Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Continuous AI Learning Pipeline
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">1. PREDICTION</span>
            <strong className="text-cyan-400">Pre-Event ML Risk</strong>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">2. GROUND TRUTH</span>
            <strong className="text-amber-400">Field Reports</strong>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">3. DISPATCH</span>
            <strong className="text-indigo-400">Response Speed</strong>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">4. EVACUATION</span>
            <strong className="text-emerald-400">Shelter & Care</strong>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 font-mono block">5. CALIBRATION</span>
            <strong className="text-purple-400">Weight Tuning</strong>
          </div>
        </div>
      </div>

      {/* Historical Audit Records List */}
      <div className="space-y-4">
        {records.map((rec) => (
          <div
            key={rec.record_id}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                    {rec.record_id}
                  </span>
                  <span className="text-xs font-mono text-slate-400">INCIDENT: {rec.incident_id}</span>
                </div>
                <h3 className="font-extrabold text-base text-white mt-1">{rec.event_name}</h3>
                <p className="text-xs text-slate-400">{rec.district} • Occurred on {rec.date_occurred}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono block">FIRST RESPONDER TIME</span>
                <span className="text-sm font-mono font-bold text-emerald-400">{rec.time_to_first_response_min} minutes</span>
              </div>
            </div>

            {/* Metrics Comparison */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">PRE-EVENT ML RISK</span>
                <span className="font-mono font-bold text-sm text-cyan-400">{rec.pre_event_ml_risk}/100</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">24H RAINFALL RECORD</span>
                <span className="font-mono font-bold text-sm text-slate-100">{rec.actual_rainfall_24h_mm} mm</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">PEOPLE EVACUATED</span>
                <span className="font-mono font-bold text-sm text-emerald-400">{rec.total_people_evacuated} evacuated</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">CASUALTIES PREVENTED</span>
                <span className="font-mono font-bold text-sm text-emerald-300">0 Fatalities ({rec.injuries_treated} treated)</span>
              </div>
            </div>

            {/* Operational Review Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operational Logistics</span>
                <div className="text-slate-300">Primary Trauma Facility: <strong className="text-white">{rec.primary_hospital_used}</strong></div>
                <div className="text-slate-300">Evacuation Camp: <strong className="text-white">{rec.primary_shelter_used}</strong></div>
                <div className="text-slate-300">Safe Highway Diversion: <strong className="text-cyan-300">{rec.primary_road_diverted_to}</strong></div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Model Calibration Feedback
                </span>
                <p className="text-[11px] text-purple-200 italic leading-relaxed">
                  "{rec.model_calibration_feedback}"
                </p>
              </div>
            </div>

            {/* Lessons Learned */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Standard Operating Procedure Lessons</span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {rec.lessons_learned}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
