import React from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { LeafletRiskMap } from '../components/map/LeafletRiskMap';
import { Navigation, ChevronRight, Crosshair } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';
import { WeatherIcon } from '../components/common/WeatherIcon';

export const OverviewPage = () => {
  const navigate = useNavigate();
  const { zones, reports, alerts, selectedZone, setSelectedZone } = useEmergency();
  const { location, weather: intelWeather, environment, requestLocation, setManualLocation } = useLocationIntelligence();
  // Soft risk colours: text + faint tint, never a solid block
  const riskTone = (level) => {
    switch ((level || '').toUpperCase()) {
      case 'CRITICAL': return { text: 'text-risk-critical', tint: 'bg-risk-critical/[0.12]', dot: 'bg-risk-critical', label: 'Critical' };
      case 'HIGH': return { text: 'text-risk-high', tint: 'bg-risk-high/[0.12]', dot: 'bg-risk-high', label: 'High' };
      case 'MODERATE': return { text: 'text-risk-moderate', tint: 'bg-risk-moderate/[0.12]', dot: 'bg-risk-moderate', label: 'Moderate' };
      case 'LOW': return { text: 'text-risk-low', tint: 'bg-risk-low/[0.12]', dot: 'bg-risk-low', label: 'Low' };
      default: return { text: 'text-label-2', tint: 'bg-surface-2', dot: 'bg-label-3', label: 'No data' };
    }
  };

  const topAlerts = [...(alerts || [])].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 2);

  return (
    <div className="space-y-6 w-full select-none pb-8">

      {/* Current conditions */}
      {(() => {
        const weather = intelWeather?.normalized || null;
        if (!weather) return null;
        const locationName = location?.displayName || '';
        const isLive = !(weather.status === 'CACHED' || weather.type === 'UNKNOWN' || weather.status === 'UNAVAILABLE');

        return (
          <div className="bg-surface rounded-card px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-tile bg-surface-2 flex items-center justify-center text-label shrink-0">
                <WeatherIcon theme={weather.theme} className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[17px] font-semibold text-label">{weather.label}</span>
                  <span className="text-[17px] text-label-2 tabular-nums">{weather.tempFormatted}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-label-2 mt-0.5 flex-wrap">
                  <span>{locationName}</span>
                  {environment?.localTimeFormatted && (
                    <>
                      <span>·</span>
                      <span className="tabular-nums">{environment.localTimeFormatted} {environment.timezoneAbbr}</span>
                    </>
                  )}
                  <span>·</span>
                  <button
                    onClick={requestLocation}
                    disabled={location?.loading}
                    className="inline-flex items-center gap-1 text-accent-text hover:opacity-80 transition-opacity"
                    title="Use my location"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${location?.loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                    <span>{location?.loading ? 'Locating…' : (location?.isGps ? 'Using GPS' : 'Use my location')}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-[13px]">
              <div>
                <span className="text-label-2 block text-xs">Rain, 24h</span>
                <span className="text-label font-medium tabular-nums">
                  {weather.rain24h !== null && weather.rain24h !== undefined ? `${weather.rain24h.toFixed(1)} mm` : '—'}
                </span>
              </div>
              <div>
                <span className="text-label-2 block text-xs">Humidity</span>
                <span className="text-label font-medium tabular-nums">
                  {weather.humidity !== null && weather.humidity !== undefined ? `${weather.humidity}%` : '—'}
                </span>
              </div>
              <div>
                <span className="text-label-2 block text-xs">Data</span>
                <span className="text-label font-medium flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-risk-low' : 'bg-risk-moderate'}`} />
                  {weather.status === 'CACHED' ? `Cached${weather.dataAgeMinutes ? ` ${weather.dataAgeMinutes}m` : ''}` : isLive ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">

        {/* Left: map and advisories */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          <section className="bg-surface rounded-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-label">
                Hazard map{selectedZone?.name ? <span className="text-label-2 font-normal"> · {selectedZone.name}</span> : null}
              </h2>
              <Link to="/risk-map" className="text-[13px] text-accent-text hover:opacity-80 flex items-center gap-0.5 transition-opacity">
                Full screen <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Link>
            </div>
            <div className="w-full h-[480px] sm:h-[520px] rounded-tile overflow-hidden relative">
              <LeafletRiskMap
                zones={zones}
                selectedZone={selectedZone}
                onSelectZone={(zone) => setSelectedZone(zone)}
                reports={reports}
                alerts={alerts}
                height="100%"
              />
            </div>
          </section>

          <section className="bg-surface rounded-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-label">Active advisories</h2>
              <Link to="/alerts" className="text-[13px] text-accent-text hover:opacity-80 flex items-center gap-0.5 transition-opacity">
                View all <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Link>
            </div>

            {topAlerts.length === 0 ? (
              <p className="text-[13px] text-label-2 py-6 text-center">No active advisories right now.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topAlerts.map((alert) => {
                  const tone = riskTone(alert.category);
                  return (
                    <div key={alert.id} className="bg-surface-2 rounded-tile p-4 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${tone.tint} ${tone.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                          {tone.label} risk
                        </span>
                        <p className="text-[15px] font-medium text-label leading-snug">{alert.zone_name}</p>
                        <p className="text-[13px] text-label-2 leading-snug">{alert.reason}</p>
                      </div>
                      <div className="flex items-center gap-4 pt-1">
                        <Link to="/risk-map" className="text-[13px] text-accent-text hover:opacity-80 transition-opacity">View on map</Link>
                        <button onClick={() => navigate('/safe-route')} className="text-[13px] text-accent-text hover:opacity-80 transition-opacity">Get route</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: model assessment, zones, tip */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {(() => {
            const currentZone = selectedZone || {};
            const loadingZone = !selectedZone || currentZone.is_weather_loading;
            const score = typeof currentZone.risk_score === 'number' ? currentZone.risk_score : null;
            const tone = riskTone(score === null ? null : currentZone.risk_level);
            const locName = currentZone.name || '—';
            const rainVal = typeof currentZone.rainfall_24h === 'number' ? `${currentZone.rainfall_24h.toFixed(1)} mm` : '—';
            const slopeVal = typeof currentZone.slope_deg === 'number' ? `${currentZone.slope_deg.toFixed(1)}°` : '—';

            return (
              <section className="bg-surface rounded-card p-5 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-semibold text-label">Risk assessment</h2>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${tone.tint} ${tone.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                    {loadingZone ? 'Loading' : score === null ? 'No score' : tone.label}
                  </span>
                </div>

                <div>
                  {score === null ? (
                    <>
                      <span className="text-[44px] font-semibold text-label-3 leading-none">–</span>
                      <p className="text-[13px] text-label-2 mt-2">
                        {loadingZone
                          ? 'Checking your location…'
                          : currentZone.unavailability_reason || 'No score: live rain or terrain data is missing for this place.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="text-[44px] font-semibold text-label leading-none tabular-nums tracking-tight">
                        {Math.round(score)}
                      </span>
                      <span className="text-[15px] text-label-2 ml-1">/ 100</span>
                      <p className="text-[13px] text-label-2 mt-2">Landslide risk score</p>
                    </>
                  )}
                </div>

                <dl className="text-[13px] divide-y divide-line">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-label-2 shrink-0">Location</dt>
                    <dd className="text-label truncate text-right">{locName}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-label-2">Rain, 24h</dt>
                    <dd className="text-label tabular-nums">{rainVal}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-label-2">Slope</dt>
                    <dd className="text-label tabular-nums">{slopeVal}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-label-2">Model</dt>
                    <dd className="text-label">Random Forest</dd>
                  </div>
                </dl>

                <Link
                  to="/ml-model"
                  className="w-full h-11 bg-accent hover:opacity-90 active:opacity-80 text-white rounded-full text-[15px] font-medium flex items-center justify-center gap-1.5 transition-opacity"
                >
                  See what drives this score
                </Link>
              </section>
            );
          })()}

          <section className="bg-surface rounded-card p-5 flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-label">Monitored zones</h2>
              <span className="text-[13px] text-label-2 tabular-nums">{zones.length}</span>
            </div>

            <div className="flex flex-col max-h-64 overflow-y-auto -mx-2">
              {zones.length === 0 && <p className="text-[13px] text-label-2 px-2">Zone scores are loading.</p>}
              {[...zones].sort((a, b) => b.risk_score - a.risk_score).map((zone) => {
                const tone = riskTone(zone.risk_level);
                const active = selectedZone?.zone_id === zone.zone_id;
                return (
                  <button
                    key={zone.zone_id}
                    onClick={() => {
                      setSelectedZone(zone);
                      if (zone.center?.lat && zone.center?.lng) {
                        setManualLocation(zone.center.lat, zone.center.lng, zone.name);
                      }
                    }}
                    className={`px-2 py-2.5 rounded-tile flex items-center justify-between gap-3 text-left transition-colors ${active ? 'bg-surface-2' : 'hover:bg-surface-2/60'}`}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-label truncate">{zone.name}</div>
                      <div className="text-xs text-label-2 truncate">{[zone.district, zone.state].filter(Boolean).join(', ')}</div>
                    </div>
                    <span className={`text-xs font-medium tabular-nums px-2 py-0.5 rounded-full shrink-0 ${tone.tint} ${tone.text}`}>
                      {typeof zone.risk_score === 'number' ? zone.risk_score.toFixed(0) : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => navigate('/safe-route')}
              className="mt-auto w-full h-11 bg-surface-2 hover:opacity-90 active:opacity-80 text-label rounded-full text-[15px] font-medium flex items-center justify-center gap-2 transition-opacity"
            >
              <Navigation className="w-4 h-4" strokeWidth={1.75} />
              Plan a safe route
            </button>
          </section>

        </div>
      </div>

    </div>
  );
};
