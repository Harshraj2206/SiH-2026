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
      <div className="bg-surface p-3.5 rounded-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-tile bg-surface-2 flex items-center justify-center text-label-2">
            <Ambulance className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-label">
              {t('hospitals_title') || 'Emergency Medical Hospitals & Relief Shelters'}
            </h1>
            <p className="text-xs text-label-2">
              {t('hospitals_subtitle') || 'Verified trauma care centers, bed capacities, and safe high-elevation evacuation shelters'}
            </p>
          </div>
        </div>

        {/* Global Location Search & Live GPS */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center bg-surface-2 px-3 py-1.5 rounded-full">
            <Search className="w-3.5 h-3.5 text-label-2 mr-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_place_placeholder') || 'Search city, hospital, or address...'}
              className="bg-transparent text-xs text-label placeholder-label-3 focus:outline-none w-44 sm:w-56"
            />
          </form>

          <button
            onClick={useLiveGps}
            disabled={loading}
            className="p-1.5 bg-surface-2 hover:opacity-80 text-label-2 hover:text-label rounded-full transition-colors"
            title={t('use_my_gps') || 'Use My GPS'}
          >
            <Crosshair className={`w-3.5 h-3.5 text-label-2 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 bg-surface p-1 rounded-full text-xs">
        <button
          onClick={() => setActiveTab('hospitals')}
          className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'hospitals'
              ? 'bg-surface-2 text-label font-semibold shadow-sm'
              : 'text-label-2 hover:text-label'
          }`}
        >
          <Ambulance className="w-3.5 h-3.5 text-label-2" />
          <span>{t('layer_hospitals') || 'Hospitals'} ({hospitals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('shelters')}
          className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'shelters'
              ? 'bg-surface-2 text-label font-semibold shadow-sm'
              : 'text-label-2 hover:text-label'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-risk-low" />
          <span>{t('layer_shelters') || 'Shelters'} ({shelters.length})</span>
        </button>
      </div>

      {/* List Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(activeTab === 'hospitals' ? hospitals : shelters).map((item, idx) => (
          <div
            key={idx}
            className="bg-surface p-3.5 rounded-card transition-colors space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-xs text-label">{item.name}</h3>
                <p className="text-xs text-label-2 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-label-2" />
                  <span>{item.address || `${Number(item.latitude ?? item.lat).toFixed(4)}°N, ${Number(item.longitude ?? item.lng).toFixed(4)}°E`}</span>
                </p>
              </div>
              <span className="text-xs text-risk-low bg-risk-low/[0.12] border-risk-low/30 px-1.5 py-0.5 rounded-full tabular-nums">
                {item.distance_km ? `${item.distance_km} km` : 'Near'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
              <span className="text-label-2 text-xs">
                {item.capacity ? `Capacity: ${item.capacity} beds` : 'Emergency 24/7'}
              </span>

              <button
                onClick={() => navigate('/safe-route')}
                className="px-2.5 py-1 bg-accent hover:opacity-90 text-white rounded-full whitespace-nowrap text-xs font-medium flex items-center gap-1 transition-colors"
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
