import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { incidentsApi } from '../services/api';
import { formatDate, toLabel, getRiskLevelColor } from '../utils/formatters';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';
import { AlertTriangle, Search, MapPin, RefreshCw, ExternalLink } from 'lucide-react';
import { WorldBounds, WORLD_BOUNDS } from '../components/map/WorldBounds';
import { useTheme } from '../context/ThemeContext';

const TILES = {
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
};

const TABS = [
  { id: 'events', label: 'Major landslides', key: 'confirmed_incidents' },
  { id: 'zones', label: 'Zone risk now', key: 'forecast_risks' },
  { id: 'records', label: 'NASA records 2007–2016', key: 'historical_incidents' }
];

const FlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 9, { duration: 1 }); }, [center, map]);
  return null;
};

const titleOf = (e) => e.title || e.location_name;
const dateOf = (e) => e.timestamp || e.event_date;

export const IncidentsExplorerPage = () => {
  const { resolvedTheme } = useTheme();
  const { userGpsLocation } = useLocationIntelligence();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('events');
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [advisory, setAdvisory] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await incidentsApi.getIntelligence(false));
    } catch (e) {
      setError(e?.message || 'The server did not respond.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (userGpsLocation?.latitude != null) {
      incidentsApi.getProximity(userGpsLocation.latitude, userGpsLocation.longitude).then(setAdvisory).catch(() => setAdvisory(null));
    }
  }, [userGpsLocation?.latitude, userGpsLocation?.longitude]);

  const listKey = TABS.find((t) => t.id === tab).key;
  const all = data?.[listKey] || [];

  const states = useMemo(() => [...new Set(all.map((e) => e.state).filter(Boolean))].sort(), [all]);
  const names = useMemo(() => [...new Set(all.flatMap((e) => [titleOf(e), e.district, e.state]).filter(Boolean))].sort(), [all]);

  const list = all.filter((e) => {
    if (stateFilter !== 'ALL' && e.state !== stateFilter) return false;
    const q = query.trim().toLowerCase();
    return !q || [titleOf(e), e.district, e.state].some((v) => (v || '').toLowerCase().includes(q));
  });

  const switchTab = (id) => {
    setTab(id);
    setSelected(null);
    setStateFilter('ALL');
    setQuery('');
  };

  const colorOf = (e) => (tab === 'zones' ? getRiskLevelColor(e.risk_level).hex : tab === 'events' ? '#E06C66' : '#98989F');

  return (
    <div className="space-y-5 w-full pb-10">
      <div className="bg-surface p-5 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-label">Landslides in India</h1>
          <p className="text-xs text-label-2 mt-0.5">
            Major recent landslides from published reports, current model risk for monitored zones, and past records from the NASA Global Landslide Catalog.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 text-xs text-label self-start disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {advisory && (
        <div className="p-3 rounded-tile bg-surface text-xs text-label flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-label-2" />
          <span>{advisory.advisory_text}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-tile bg-risk-critical/[0.12] text-risk-critical text-xs">
          Could not load landslide data: {error}
        </div>
      )}

      <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-full text-xs w-fit max-w-full overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap ${tab === t.id ? 'bg-surface text-label font-semibold' : 'text-label-2'}`}
          >
            {t.label} ({data ? (data[t.key] || []).length : '…'})
          </button>
        ))}
      </div>

      {tab === 'zones' && data && all.length === 0 && (
        <p className="text-xs text-label-2">No zone has a live score yet.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-surface rounded-card p-3">
          <div className="w-full h-96 rounded-tile overflow-hidden relative z-0">
            <MapContainer center={[22.6, 79.0]} zoom={5} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
              <TileLayer
                url={resolvedTheme === 'light' ? TILES.light : TILES.dark}
                attribution="&copy; Esri, HERE, Garmin, OpenStreetMap"
                maxZoom={16}
                noWrap
                bounds={WORLD_BOUNDS}
              />
              <WorldBounds />
              <FlyTo center={selected ? [selected.latitude, selected.longitude] : null} />
              {list.map((e) => (
                <CircleMarker
                  key={e.incident_id || e.forecast_id}
                  center={[e.latitude, e.longitude]}
                  radius={tab === 'records' ? 3 : 7}
                  pathOptions={{ color: colorOf(e), fillColor: colorOf(e), fillOpacity: 0.8, weight: 1 }}
                  eventHandlers={{ click: () => setSelected(e) }}
                />
              ))}
              {userGpsLocation?.latitude != null && (
                <CircleMarker
                  center={[userGpsLocation.latitude, userGpsLocation.longitude]}
                  radius={6}
                  pathOptions={{ color: '#ffffff', fillColor: '#4A86E8', fillOpacity: 1, weight: 2 }}
                />
              )}
            </MapContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface rounded-card p-4 space-y-3">
          {selected ? (
            <div className="space-y-2 text-xs">
              <button onClick={() => setSelected(null)} className="text-label-2 underline">Back to list</button>
              <h2 className="text-sm font-semibold text-label">{titleOf(selected)}</h2>
              <p className="text-label-2">
                {[selected.district, selected.state].filter(Boolean).join(', ')}
                {dateOf(selected) && ` · ${formatDate(dateOf(selected))}`}
              </p>
              {tab === 'zones' ? (
                <>
                  <p className="text-label">Risk score {Math.round(selected.risk_score)} / 100 ({toLabel(selected.risk_level)})</p>
                  {selected.why_at_risk && <p className="text-label-2">{selected.why_at_risk}</p>}
                  {selected.contributing_factors?.length > 0 && (
                    <ul className="list-disc list-inside text-label-2">
                      {selected.contributing_factors.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  )}
                </>
              ) : (
                <>
                  {selected.description && <p className="text-label">{selected.description}</p>}
                  <div className="flex flex-wrap gap-3 text-label">
                    {selected.deaths != null && <span>{selected.deaths} deaths</span>}
                    {selected.missing_people != null && <span>{selected.missing_people} missing</span>}
                    {selected.injured_people != null && <span>{selected.injured_people} injured</span>}
                    {selected.evacuated_people != null && <span>{selected.evacuated_people} evacuated</span>}
                  </div>
                  {selected.trigger && <p className="text-label-2">Cause: {selected.trigger}</p>}
                  {selected.location_accuracy && <p className="text-label-2">Location accurate to {selected.location_accuracy}</p>}
                </>
              )}
              {selected.source && (
                <p className="text-label-2">
                  Source: {selected.source_url
                    ? <a href={selected.source_url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">{selected.source}<ExternalLink className="w-3 h-3" /></a>
                    : selected.source}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-label-2 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search place, district or state" list="incident-place-names"
                    className="w-full pl-8 pr-3 py-2 bg-surface-2 rounded-full text-xs text-label placeholder-label-3 focus:outline-none"
                  />
                  <datalist id="incident-place-names">
                    {names.map((n) => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <select
                  value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}
                  className="py-2 px-3 bg-surface-2 rounded-full text-xs text-label focus:outline-none"
                >
                  <option value="ALL">All states</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="text-xs text-label-2">{list.length} shown</div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {list.slice(0, 300).map((e) => (
                  <button
                    key={e.incident_id || e.forecast_id}
                    onClick={() => setSelected(e)}
                    className="w-full text-left bg-surface-2 rounded-tile p-2.5 text-xs flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-label font-medium block truncate">{titleOf(e)}</span>
                      <span className="text-label-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{[e.district, e.state].filter(Boolean).join(', ')}</span>
                      </span>
                    </div>
                    <span className="text-label-2 shrink-0">
                      {tab === 'zones' ? Math.round(e.risk_score) : formatDate(dateOf(e)).split(',')[0]}
                    </span>
                  </button>
                ))}
                {list.length > 300 && <p className="text-xs text-label-2">Showing the first 300. Search or pick a state to narrow down.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
