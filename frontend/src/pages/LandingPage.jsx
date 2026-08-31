import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Navigation, 
  Users, 
  Cpu, 
  ArrowRight, 
  Radio, 
  ChevronRight,
  MapPin,
  Compass
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Terrain3DBackground } from '../components/common/Terrain3DBackground';

export const LandingPage = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen relative text-slate-100 flex flex-col bg-[#070b14] selection:bg-red-500 selection:text-white">
      {/* 3D Subtle Topographic Elevation Contour Background */}
      <Terrain3DBackground />

      {/* Top Navbar */}
      <nav className="h-14 border-b border-[#1c2b48] px-6 lg:px-12 flex items-center justify-between sticky top-0 bg-[#070b14]/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-sm tracking-wider text-white">LANDSAFE</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-[#121d33] text-cyan-400 border border-[#1c2b48]">
                SIH26001
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/sos"
            className="px-3 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/40 rounded-md text-xs font-bold font-mono flex items-center gap-1.5 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span>SOS</span>
          </Link>

          <Link
            to="/overview"
            className="px-3.5 py-1.5 bg-[#121d33] hover:bg-[#182744] text-slate-200 hover:text-white border border-[#1c2b48] rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Command Center</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </nav>

      {/* Hero Section (Section 6: Spacious, Clean, Restrained) */}
      <section className="relative px-6 lg:px-12 pt-20 pb-20 max-w-5xl mx-auto flex flex-col items-center text-center">
        
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d1527] border border-[#1c2b48] text-[11px] font-mono font-bold text-slate-400 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span>PREDICT • PREPARE • RESCUE</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-3xl leading-[1.15]">
          Landslide Early Warning & Emergency Response
        </h1>

        {/* Supporting Text */}
        <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
          Predict risk. Locate people in danger. Coordinate rescue. Find the safest way to safety.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            to="/overview"
            className="px-6 py-2.5 bg-[#16243d] hover:bg-[#1f3254] text-white border border-cyan-500/40 rounded-lg text-sm font-mono font-bold flex items-center gap-2 shadow-lg transition-colors"
          >
            <span>GET STARTED</span>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </Link>

          <Link
            to="/sos"
            className="px-6 py-2.5 bg-red-950/60 hover:bg-red-900/60 text-red-200 hover:text-white border border-red-500/50 rounded-lg text-sm font-mono font-bold flex items-center gap-2 transition-colors"
          >
            <Radio className="w-4 h-4 text-red-400" />
            <span>EMERGENCY SOS</span>
          </Link>
        </div>
      </section>

      {/* 3 Spacious Pillars (Clean, Restrained) */}
      <section className="px-6 lg:px-12 py-16 bg-[#090f1d] border-t border-[#1c2b48]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Operational Framework
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Intelligent Hazard Response Architecture
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Predict */}
            <div className="bg-[#0d1527] border border-[#1c2b48] p-5 rounded-xl space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#121d33] border border-[#1c2b48] flex items-center justify-center text-cyan-400">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">AI Hazard Prediction</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Physics-informed machine learning evaluates live rainfall, terrain slope gradients, and soil moisture saturation.
              </p>
            </div>

            {/* 2. Route */}
            <div className="bg-[#0d1527] border border-[#1c2b48] p-5 rounded-xl space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#121d33] border border-[#1c2b48] flex items-center justify-center text-emerald-400">
                <Navigation className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Safe Route Planner</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Network graph routing calculates low-risk evacuation paths around active slope movements and blocked road corridors.
              </p>
            </div>

            {/* 3. Rescue */}
            <div className="bg-[#0d1527] border border-[#1c2b48] p-5 rounded-xl space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#121d33] border border-[#1c2b48] flex items-center justify-center text-red-400">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Emergency Coordination</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Prioritized SOS triage connects distress beacons directly with NDRF and SDRF multi-agency response teams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-[#1c2b48] py-6 px-6 lg:px-12 text-center text-xs text-slate-400 font-mono">
        <p>Smart India Hackathon 2026 • Problem Statement SIH26001 • Landslide Early Warning System</p>
      </footer>
    </div>
  );
};
