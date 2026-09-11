import React from 'react';
import { 
  Info, 
  Shield, 
  Cpu, 
  Navigation, 
  Users, 
  Database, 
  ExternalLink, 
  CheckCircle2,
  Sparkles,
  Layers,
  FileText,
  Radio,
  Ambulance,
  BrainCircuit,
  Compass
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const AboutPage = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-xs">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-black text-white">Smart India Hackathon 2026 Reference & Architecture</h1>
          <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            SIH26001
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm">
          <strong>LANDSAFE</strong> (<em>"Predict Early. Warn Faster. Rescue Smarter."</em>) is an AI-assisted disaster-management and early warning platform designed for North Eastern India and the Himalayan belt, drawing on UX concepts from Google Flood Hub and GDACS.
        </p>
      </div>

      {/* SIH Metadata & 9-Stage Lifecycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* SIH Metadata */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Hackathon Problem Specifications
          </h2>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Problem Statement ID:</span>
              <span className="font-mono font-bold text-cyan-400">SIH26001</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Core Theme:</span>
              <span className="font-bold text-white">Disaster Management</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Target Geography:</span>
              <span className="font-bold text-emerald-400">North Eastern Region (NER) & Himalayan Belt</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Critical Highway Corridors:</span>
              <span className="font-bold text-slate-200">NH-6 (Meghalaya), NH-10 (Sikkim), NH-29 (Nagaland)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400 font-medium">Core Paradigm:</span>
              <span className="font-mono font-bold text-rose-400">PREDICT → ROUTE → VERIFY → RESCUE</span>
            </div>
          </div>
        </div>

        {/* 9-Stage Lifecycle */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-amber-400" />
            9-Stage Disaster Lifecycle
          </h2>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <strong className="text-cyan-400 block font-mono">1. PREDICT</strong>
              <span className="text-slate-400">AI RF Risk Model</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <strong className="text-cyan-400 block font-mono">2. PREPARE</strong>
              <span className="text-slate-400">Early Bulletins</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <strong className="text-amber-400 block font-mono">3. DETECT</strong>
              <span className="text-slate-400">Rain Thresholds</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <strong className="text-amber-400 block font-mono">4. CONNECT</strong>
              <span className="text-slate-400">Field Observers</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <strong className="text-rose-400 block font-mono">5. PRIORITIZE</strong>
              <span className="text-slate-400">SOS Triage Score</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <strong className="text-rose-400 block font-mono">6. RESCUE</strong>
              <span className="text-slate-400">NDRF/SDRF Force</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <strong className="text-emerald-400 block font-mono">7. EVACUATE</strong>
              <span className="text-slate-400">Safe Highway Paths</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <strong className="text-emerald-400 block font-mono">8. SHELTER</strong>
              <span className="text-slate-400">Hospital & Camp</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <strong className="text-purple-400 block font-mono">9. LEARN</strong>
              <span className="text-slate-400">ML Calibration</span>
            </div>
          </div>
        </div>

      </div>

      {/* Mathematical Formulations */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Mathematical & Algorithmic Formulations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Safe Route Weight Formulation */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-bold text-slate-200 block text-xs">Safe Route Edge Cost Weight Formulation:</span>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
              weighted_cost = distance × (1.0 + penalty(risk_score))<br/><br/>
              where BLOCKED edge weight = 1000.0 × distance (strictly bypassed)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Forces Dijkstra shortest-path algorithms to route civil traffic through low-hazard valleys whenever a primary hill corridor reaches High/Critical hazard or is blocked by debris.
            </p>
          </div>

          {/* Fusion Formula */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-bold text-slate-200 block text-xs">AI + Human Ground Truth Fusion Formula:</span>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto">
              community_boost = min(15.0, verified_reports × 5.0)<br/><br/>
              final_risk_score = min(100.0, ML_Score + community_boost)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Bridges automated satellite and weather data with real-time on-the-ground observations from verified local observers.
            </p>
          </div>

        </div>
      </div>

      {/* External Government / Satellite Data Readiness */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          National & Global Data Integration Readiness
        </h2>
        <p className="text-xs text-slate-400">
          The modular backend service layer is architected for plug-and-play REST/GeoJSON ingest from official disaster monitoring APIs:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="font-bold text-slate-200 block">Open-Meteo WMO Meteorological Grid</span>
            <p className="text-[11px] text-slate-400 mt-0.5">High-resolution Numerical Weather Prediction (NWP) 24h/72h rainfall accumulations.</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="font-bold text-slate-200 block">Copernicus / SRTM 30m Global DEM</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Digital Elevation Models (DEM) for baseline slope gradient & elevation profiles.</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="font-bold text-slate-200 block">ECMWF IFS Land Surface Model</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Volumetric soil water content (0-7 cm topsoil layer) via Open-Meteo grid reanalysis.</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="font-bold text-slate-200 block">GSI Landslide Inventory & Reports</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Geological Survey of India historical landslide records and regional lithology estimates.</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="font-bold text-slate-200 block">Regional Climatological NDVI Baselines</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Normalized Difference Vegetation Index (NDVI) estimates for slope vegetative cohesion.</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="font-bold text-slate-200 block">OpenStreetMap Road Network</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Highway topologies (NH-3, NH-5) and mountain bypass corridors for evacuation routing.</p>
          </div>
        </div>
      </div>

    </div>
  );
};
