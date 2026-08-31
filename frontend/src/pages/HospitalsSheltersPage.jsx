import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocationIntelligence } from '../context/LocationIntelligenceContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Ambulance, 
  Home, 
  Navigation, 
  MapPin, 
  PhoneCall, 
  Search, 
  Crosshair, 
  ShieldCheck, 
  Building2, 
  RefreshCw 
} from 'lucide-react';

export const HospitalsSheltersPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedLocation, intelligence, loading, searchPlace, useLiveGps, refreshIntelligence } = useLocationIntelligence();
  const [activeTab, setActiveTab] = useState('hospitals');
  const [searchQuery, setSearchQuery] = useState('');

  const hospitals = intelligence?.nearby_hospitals || [];
  const shelters = intelligence?.nearby_shelters || [];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchPlace(searchQuery);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      
      {/* Top Header & Search Console */}
      <div className="bg-[#111111] border border-[#262626] p-3.5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Ambulance className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-neutral-100">
              {t('hospitals_title') || 'Emergency Medical Hospitals & Relief Shelters'}
            </h1>
            <p className="text-xs text-neutral-400">
              {t('hospitals_subtitle') || 'Verified trauma care centers, bed capacities, and safe high-elevation evacuation shelters'}
            </p>
          </div>
        </div>

        {/* Global Location Search & Live GPS */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center bg-[#151515] px-2.5 py-1.5 rounded-md border border-[#262626]">
            <Search className="w-3.5 h-3.5 text-neutral-400 mr-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_place_placeholder') || 'Search city, hospital, or address...'}
              className="bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none w-44 sm:w-56"
            />
          </form>

          <button
            onClick={useLiveGps}
            disabled={loading}
            className="p-1.5 bg-[#151515] hover:bg-[#1C1C1C] text-neutral-300 hover:text-white border border-[#262626] rounded-md transition-colors"
            title={t('use_my_gps') || 'Use My GPS'}
          >
            <Crosshair className={`w-3.5 h-3.5 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#151515] p-1 rounded-md border border-[#262626] text-xs">
        <button
          onClick={() => setActiveTab('hospitals')}
          className={`px-4 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            activeTab === 'hospitals'
              ? 'bg-[#1C1C1C] text-white font-semibold border border-sky-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Ambulance className="w-3.5 h-3.5 text-sky-400" />
          <span>{t('layer_hospitals') || 'Hospitals'} ({hospitals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('shelters')}
          className={`px-4 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            activeTab === 'shelters'
              ? 'bg-[#1C1C1C] text-white font-semibold border border-sky-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('layer_shelters') || 'Shelters'} ({shelters.length})</span>
        </button>
      </div>

      {/* List Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(activeTab === 'hospitals' ? hospitals : shelters).map((item, idx) => (
          <div
            key={idx}
            className="bg-[#111111] border border-[#262626] p-3.5 rounded-lg hover:border-neutral-500 transition-colors space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs text-neutral-100">{item.name}</h3>
                <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-sky-400" />
                  <span>{item.address || `${item.lat?.toFixed(4)}°N, ${item.lng?.toFixed(4)}°E`}</span>
                </p>
              </div>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-600/30 px-1.5 py-0.2 rounded font-mono">
                {item.distance_km ? `${item.distance_km} km` : 'Near'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1C1C1C] text-xs">
              <span className="text-neutral-400 text-[11px]">
                {item.capacity ? `Capacity: ${item.capacity} beds` : 'Emergency 24/7'}
              </span>

              <button
                onClick={() => navigate('/safe-route')}
                className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Navigation className="w-3 h-3" />
                <span>{t('safe_route') || 'Route'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
