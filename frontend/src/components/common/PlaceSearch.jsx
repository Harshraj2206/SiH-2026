import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

// ISO 3166-1 alpha-2 codes; names come from the browser (Intl.DisplayNames) in English.
const CODES = ('AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW').split(' ');
const regionName = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRIES = CODES.map((code) => ({ code, name: regionName.of(code) }))
  .sort((a, b) => (a.code === 'IN' ? -1 : b.code === 'IN' ? 1 : a.name.localeCompare(b.name)));

const COUNTRY_KEY = 'landsafe_search_country';

/**
 * Click: choose a country. Then type: places in that country, from the Open-Meteo geocoder.
 * onSelect({ name, label, latitude, longitude, timezone, countryCode })
 */
export const PlaceSearch = ({ onSelect, placeholder = 'Search a place', className = '' }) => {
  const [country, setCountry] = useState(() => {
    try { return COUNTRIES.find((c) => c.code === localStorage.getItem(COUNTRY_KEY)) || null; } catch { return null; }
  });
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const countryMatches = useMemo(() => {
    const q = text.trim().toLowerCase();
    return q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)) : COUNTRIES;
  }, [text]);

  // Place suggestions (only once a country is chosen)
  useEffect(() => {
    const q = text.trim();
    if (!country || q.length < 2) { setPlaces([]); setStatus('idle'); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json&countryCode=${country.code}`;
        const data = await (await fetch(url, { signal: ctrl.signal })).json();
        setPlaces(data.results || []);
        setActive(0);
        setStatus('done');
      } catch (e) {
        if (e.name !== 'AbortError') setStatus('error');
      }
    }, 250);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [text, country]);

  // Close on outside click
  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const chooseCountry = (c) => {
    setCountry(c);
    setText('');
    setActive(0);
    inputRef.current?.focus();
    try { localStorage.setItem(COUNTRY_KEY, c.code); } catch { /* storage unavailable */ }
  };

  const choosePlace = (p) => {
    const label = [p.name, p.admin1].filter(Boolean).join(', ');
    onSelect?.({
      name: p.name,
      label,
      latitude: p.latitude,
      longitude: p.longitude,
      timezone: p.timezone,
      countryCode: p.country_code
    });
    setText('');
    setPlaces([]);
    setOpen(false);
  };

  const items = country ? places : countryMatches;
  const onKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[active];
      if (it) (country ? choosePlace(it) : chooseCountry(it));
    } else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Backspace' && !text && country) setCountry(null);
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="flex items-center gap-1.5 bg-surface-2 rounded-full px-3 py-2 focus-within:ring-2 focus-within:ring-accent/40">
        <Search className="w-4 h-4 text-label-2 shrink-0" />
        {country && (
          <button
            type="button"
            onClick={() => { setCountry(null); setText(''); setOpen(true); inputRef.current?.focus(); }}
            className="flex items-center gap-1 text-xs text-label bg-surface rounded-full px-2 py-0.5 shrink-0"
            title="Change country"
          >
            {country.name}
            <X className="w-3 h-3 text-label-2" />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={country ? placeholder : 'Choose a country'}
          className="bg-transparent text-xs text-label placeholder-label-3 focus:outline-none w-full min-w-0"
          aria-label={country ? placeholder : 'Choose a country'}
        />
      </div>

      {open && (
        <ul className="absolute left-0 right-0 mt-1 z-[1100] bg-surface rounded-tile shadow-lg max-h-64 overflow-y-auto text-xs py-1">
          {!country && countryMatches.map((c, i) => (
            <li key={c.code}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); chooseCountry(c); }}
                className={`w-full text-left px-3 py-1.5 ${i === active ? 'bg-surface-2' : ''} text-label`}
              >
                {c.name}
              </button>
            </li>
          ))}
          {!country && countryMatches.length === 0 && <li className="px-3 py-1.5 text-label-2">No country matches.</li>}

          {country && text.trim().length < 2 && <li className="px-3 py-1.5 text-label-2">Type a place name in {country.name}.</li>}
          {country && status === 'loading' && places.length === 0 && <li className="px-3 py-1.5 text-label-2">Searching…</li>}
          {country && status === 'error' && <li className="px-3 py-1.5 text-label-2">Search is unavailable right now.</li>}
          {country && status === 'done' && places.length === 0 && <li className="px-3 py-1.5 text-label-2">No places found.</li>}
          {country && places.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); choosePlace(p); }}
                className={`w-full text-left px-3 py-1.5 ${i === active ? 'bg-surface-2' : ''}`}
              >
                <span className="text-label">{p.name}</span>
                <span className="text-label-2">{[p.admin2, p.admin1].filter(Boolean).length ? ` · ${[p.admin2, p.admin1].filter(Boolean).join(', ')}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
