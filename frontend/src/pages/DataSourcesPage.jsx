import React, { useState, useEffect } from 'react';
import { api, riskZonesApi } from '../services/api';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';
import { PlaceSearch } from '../components/common/PlaceSearch';
import { ZoneTelemetryDrawer } from '../components/map/ZoneTelemetryDrawer';
import { Database, ExternalLink, Crosshair, RefreshCw } from 'lucide-react';

export const DataSourcesPage = () => {
  const { userGpsLocation, requestLocation } = useLocationIntelligence();
  const [sources, setSources] = useState(null);
  const [inputs, setInputs] = useState([]);
  const [error, setError] = useState(false);
  const [place, setPlace] = useState(null); // { lat, lng, name }
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);

  const load = async () => {
    setError(false);
    try {
      const [src, prov] = await Promise.all([api.getDataSources(), riskZonesApi.getFeatureProvenance()]);
      setSources(src?.sources || []);
      setInputs(prov?.features || []);
    } catch {
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  // Start with the user's own location when it is known
  useEffect(() => {
    if (!place && userGpsLocation?.latitude != null) {
      setPlace({ lat: userGpsLocation.latitude, lng: userGpsLocation.longitude, name: userGpsLocation.displayName || 'Your location' });
    }
  }, [userGpsLocation?.latitude, userGpsLocation?.longitude]);

  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    setChecking(true);
    setCheckError(null);
    setResult(null);
    api.inspectTelemetry(place.lat, place.lng)
      .then((d) => { if (!cancelled) setResult({ ...d, name: place.name }); })
      .catch(() => { if (!cancelled) setCheckError('This place could not be checked right now.'); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [place]);

  return (
    <div className="space-y-5 w-full pb-10">
      <div className="bg-surface p-5 rounded-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-tile bg-surface-2 flex items-center justify-center text-label shrink-0">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-label">Data sources</h1>
          <p className="text-xs text-label-2 mt-0.5">Where every number in LandSafe comes from.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-xs text-label-2 bg-surface rounded-card p-4">
          <span>Sources could not be loaded.</span>
          <button onClick={load} className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-2 text-label">
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      )}

      {sources && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sources.map((s) => (
            <div key={s.id} className="bg-surface rounded-card p-4 space-y-1.5 text-xs">
              <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-label inline-flex items-center gap-1 hover:underline">
                {s.name} <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-label">{s.category}</p>
              <p className="text-label-2">{s.data_type}</p>
              <p className="text-label-2">{s.spatial_resolution} · {s.update_frequency}</p>
            </div>
          ))}
        </div>
      )}

      {inputs.length > 0 && (
        <div className="bg-surface rounded-card p-5 space-y-2">
          <h2 className="text-sm font-semibold text-label">Model inputs</h2>
          <p className="text-xs text-label-2">Each input is fetched live for the place being scored. If any one is missing, no score is given.</p>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-line">
              {inputs.map((f) => (
                <tr key={f.feature}>
                  <td className="py-2 pr-3 text-label">{f.label} ({f.unit})</td>
                  <td className="py-2 text-label-2">{f.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-surface rounded-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-label">Check any place</h2>
          <p className="text-xs text-label-2">See the live inputs and score for a place, straight from the sources above.</p>
          <PlaceSearch onSelect={(p) => setPlace({ lat: p.latitude, lng: p.longitude, name: p.label })} placeholder="Search a place" />
          <button
            onClick={async () => {
              const res = await requestLocation(true);
              if (res?.success) setPlace({ lat: res.location.latitude, lng: res.location.longitude, name: res.location.displayName || 'Your location' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 text-xs text-label"
          >
            <Crosshair className="w-3.5 h-3.5" /> Use my location
          </button>
          {place && <p className="text-xs text-label-2">{place.name} ({place.lat.toFixed(4)}, {place.lng.toFixed(4)})</p>}
        </div>
        <div className="lg:col-span-7">
          {checking && <div className="bg-surface rounded-card p-5 text-xs text-label-2">Checking live data…</div>}
          {checkError && <div className="bg-surface rounded-card p-5 text-xs text-risk-critical">{checkError}</div>}
          {result && <ZoneTelemetryDrawer zone={result} />}
          {!place && !checking && (
            <div className="bg-surface rounded-card p-5 text-xs text-label-2">Choose a place or use your location.</div>
          )}
        </div>
      </div>
    </div>
  );
};
