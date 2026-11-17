import React, { useState, useEffect, useCallback } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { api } from '../services/api';
import { ZoneTelemetryDrawer } from '../components/map/ZoneTelemetryDrawer';
import { formatDate, toLabel } from '../utils/formatters';
import { BrainCircuit, RefreshCw } from 'lucide-react';

const FEATURE_LABELS = {
  rainfall_24h: 'Rain, last 24 h',
  rainfall_72h: 'Rain, last 72 h',
  antecedent_rain_index: 'Recent rain index',
  slope_deg: 'Slope',
  soil_moisture: 'Soil moisture',
  pore_slope_interaction: 'Soil moisture × slope',
  historical_incidents: 'Past landslides nearby',
  elevation_amsl: 'Elevation'
};

export const MlModelPage = () => {
  const { zones, selectedZone } = useEmergency();
  const [metrics, setMetrics] = useState(null);
  const [cv, setCv] = useState(null);
  const [replays, setReplays] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [zoneId, setZoneId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [m, s, r] = await Promise.all([api.getModelMetrics(), api.getSpatialMetrics(), api.getHistoricalReplay()]);
      setMetrics(m);
      setCv(s);
      setReplays(r || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sortedZones = [...(zones || [])].sort((a, b) => b.risk_score - a.risk_score);
  const zone = sortedZones.find((z) => z.zone_id === zoneId)
    || (selectedZone?.zone_id && sortedZones.find((z) => z.zone_id === selectedZone.zone_id))
    || sortedZones[0]
    || null;

  const importances = metrics
    ? Object.entries(metrics.feature_importances || {}).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-5 w-full pb-10">
      <div className="bg-surface p-5 rounded-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-tile bg-surface-2 flex items-center justify-center text-label shrink-0">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-label">Risk model</h1>
          <p className="text-xs text-label-2 mt-0.5">How LandSafe scores landslide risk, and how well it does.</p>
        </div>
      </div>

      {/* Model facts */}
      <div className="bg-surface rounded-card p-5 space-y-4">
        {loading && <p className="text-xs text-label-2">Loading model details…</p>}
        {loadError && (
          <div className="flex items-center gap-3 text-xs text-label-2">
            <span>Model details could not be loaded.</span>
            <button onClick={load} className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-2 text-label">
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        )}
        {metrics && cv && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-surface-2 rounded-tile p-3">
                <span className="text-label-2 block">Model</span>
                <span className="text-label font-semibold">Random forest, {metrics.n_estimators} trees</span>
              </div>
              <div className="bg-surface-2 rounded-tile p-3">
                <span className="text-label-2 block">Trained on</span>
                <span className="text-label font-semibold">
                  {metrics.dataset_size.toLocaleString('en-IN')} cases ({metrics.positives} landslides)
                </span>
              </div>
              <div className="bg-surface-2 rounded-tile p-3">
                <span className="text-label-2 block">Landslides caught (recall)</span>
                <span className="text-label font-semibold">{cv.recall.toFixed(1)}%</span>
              </div>
              <div className="bg-surface-2 rounded-tile p-3">
                <span className="text-label-2 block">ROC-AUC</span>
                <span className="text-label font-semibold">{cv.roc_auc.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-label-2 leading-relaxed">
              Trained on rain-triggered landslides in India from the NASA Global Landslide Catalog, with ERA5 rain and
              soil moisture and Copernicus terrain for each case. Accuracy is measured on whole regions the model never
              saw ({cv.evaluation}). Of every 100 warnings it raises, about {Math.round(cv.precision)} were real landslides.
              The score is a relative risk from 0 to 100, not a probability. Trained {formatDate(metrics.trained_date)}.
            </p>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-label block">What the model relies on most</span>
              {importances.map(([key, val]) => (
                <div key={key} className="flex items-center gap-3 text-xs">
                  <span className="w-44 text-label-2 shrink-0">{FEATURE_LABELS[key] || key}</span>
                  <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-label-2 rounded-full" style={{ width: `${(val * 100) / importances[0][1]}%` }} />
                  </div>
                  <span className="w-12 text-right text-label">{(val * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* A zone's current score */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-surface rounded-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-label">Current score for a zone</h2>
          {sortedZones.length === 0 ? (
            <p className="text-xs text-label-2">Zone scores are loading.</p>
          ) : (
            <select
              value={zone?.zone_id || ''}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full bg-surface-2 rounded-field px-3 py-2 text-xs text-label focus:outline-none"
            >
              {sortedZones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.name} ({z.state}) · {Math.round(z.risk_score)}
                </option>
              ))}
            </select>
          )}
          {zone?.last_updated && <p className="text-xs text-label-2">Updated {formatDate(zone.last_updated)}</p>}
        </div>
        <div className="lg:col-span-7">{zone && <ZoneTelemetryDrawer zone={zone} />}</div>
      </div>

      {/* Past landslides scored from their real conditions */}
      {replays.length > 0 && (
        <div className="bg-surface rounded-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-label">Past landslides, scored by this model</h2>
            <p className="text-xs text-label-2">Using the recorded rain, soil moisture and terrain before each event.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {replays.map((r) => {
              const c = r.historical_conditions;
              return (
                <div key={r.scenario_id} className="bg-surface-2 rounded-tile p-3 text-xs space-y-1.5">
                  <div className="font-semibold text-label">{r.location_name}</div>
                  <div className="text-label-2">{r.district}, {r.state} · {formatDate(r.event_time)}</div>
                  <div className="text-label">
                    Score {Math.round(r.model_prediction.risk_score)} / 100 ({toLabel(r.model_prediction.risk_level)})
                  </div>
                  <div className="text-label-2">
                    Rain {c.rainfall_24h_mm} mm (24 h), {c.rainfall_72h_mm} mm (72 h) · slope {c.slope_deg}° · {Math.round(c.elevation_amsl_m)} m
                  </div>
                  {r.source_url && (
                    <a href={r.source_url} target="_blank" rel="noreferrer" className="underline text-label-2">Source</a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
