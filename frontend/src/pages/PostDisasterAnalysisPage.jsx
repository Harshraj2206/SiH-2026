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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-2 text-label-2 flex items-center gap-1">
              <BrainCircuit className="w-3 h-3" />
              Disaster audit & continuous learning
            </span>
            <span className="text-xs text-label-2 tabular-nums">SIH26001</span>
          </div>
          <h1 className="text-2xl font-semibold text-label mt-1">Post-Disaster Review & ML Calibration</h1>
          <p className="text-xs text-label-2">
            Retrospective lifecycle tracking from initial ML risk prediction to ground truth verification, response time, evacuation efficiency, and future AI model tuning.
          </p>
        </div>
      </div>

      {/* Closed-Loop Workflow Banner */}
      <div className="bg-surface rounded-card p-4 text-xs">
        <span className="text-xs font-semibold text-label-2 block mb-2">
          Continuous AI Learning Pipeline
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <div className="bg-surface-2 p-2.5 rounded-tile">
            <span className="text-xs text-label-3 tabular-nums block">1. Prediction</span>
            <strong className="text-label-2">Pre-Event ML Risk</strong>
          </div>
          <div className="bg-surface-2 p-2.5 rounded-tile">
            <span className="text-xs text-label-3 tabular-nums block">2. Ground truth</span>
            <strong className="text-risk-moderate">Field Reports</strong>
          </div>
          <div className="bg-surface-2 p-2.5 rounded-tile">
            <span className="text-xs text-label-3 tabular-nums block">3. Dispatch</span>
            <strong className="text-label-2">Response Speed</strong>
          </div>
          <div className="bg-surface-2 p-2.5 rounded-tile">
            <span className="text-xs text-label-3 tabular-nums block">4. Evacuation</span>
            <strong className="text-risk-low">Shelter & Care</strong>
          </div>
          <div className="bg-surface-2 p-2.5 rounded-tile col-span-2 sm:col-span-1">
            <span className="text-xs text-label-3 tabular-nums block">5. Calibration</span>
            <strong className="text-label-2">Weight Tuning</strong>
          </div>
        </div>
      </div>

      {/* Historical Audit Records List */}
      <div className="space-y-4">
        {records.map((rec) => (
          <div
            key={rec.record_id}
            className="bg-surface rounded-card p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-xs font-semibold text-label-2 bg-surface-2 px-2 py-0.5 rounded-full">
                    {rec.record_id}
                  </span>
                  <span className="text-xs tabular-nums text-label-2">INCIDENT: {rec.incident_id}</span>
                </div>
                <h3 className="font-semibold text-base text-label mt-1">{rec.event_name}</h3>
                <p className="text-xs text-label-2">{rec.district} • Occurred on {rec.date_occurred}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-label-3 tabular-nums block">First responder time</span>
                <span className="text-sm tabular-nums font-semibold text-risk-low">{rec.time_to_first_response_min} minutes</span>
              </div>
            </div>

            {/* Metrics Comparison */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-surface-2 p-2.5 rounded-tile">
                <span className="text-xs text-label-2 block tabular-nums">Pre-event ML risk</span>
                <span className="tabular-nums font-semibold text-sm text-label-2">{rec.pre_event_ml_risk}/100</span>
              </div>

              <div className="bg-surface-2 p-2.5 rounded-tile">
                <span className="text-xs text-label-2 block tabular-nums">24H rainfall record</span>
                <span className="tabular-nums font-semibold text-sm text-label">{rec.actual_rainfall_24h_mm} mm</span>
              </div>

              <div className="bg-surface-2 p-2.5 rounded-tile">
                <span className="text-xs text-label-2 block tabular-nums">People evacuated</span>
                <span className="tabular-nums font-semibold text-sm text-risk-low">{rec.total_people_evacuated} evacuated</span>
              </div>

              <div className="bg-surface-2 p-2.5 rounded-tile">
                <span className="text-xs text-label-2 block tabular-nums">Casualties prevented</span>
                <span className="tabular-nums font-semibold text-sm text-risk-low">0 Fatalities ({rec.injuries_treated} treated)</span>
              </div>
            </div>

            {/* Operational Review Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-surface-2 p-3 rounded-tile space-y-1">
                <span className="text-xs font-semibold text-label-2 block">Operational Logistics</span>
                <div className="text-label-2">Primary Trauma Facility: <strong className="text-label">{rec.primary_hospital_used}</strong></div>
                <div className="text-label-2">Evacuation Camp: <strong className="text-label">{rec.primary_shelter_used}</strong></div>
                <div className="text-label-2">Safe Highway Diversion: <strong className="text-label-2">{rec.primary_road_diverted_to}</strong></div>
              </div>

              <div className="bg-surface-2 p-3 rounded-tile space-y-1">
                <span className="text-xs font-semibold text-label-2 block flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Model Calibration Feedback
                </span>
                <p className="text-xs text-label-2 italic leading-relaxed">
                  "{rec.model_calibration_feedback}"
                </p>
              </div>
            </div>

            {/* Lessons Learned */}
            <div className="bg-surface-2 p-3 rounded-tile text-xs">
              <span className="text-xs font-semibold text-label-2 block mb-1">Standard Operating Procedure Lessons</span>
              <p className="text-label-2 leading-relaxed text-xs">
                {rec.lessons_learned}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
