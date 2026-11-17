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
    <div className="min-h-screen relative text-label flex flex-col bg-surface-2 selection:bg-risk-critical selection:text-label">
      {/* 3D Subtle Topographic Elevation Contour Background */}
      <Terrain3DBackground />

      {/* Top Navbar */}
      <nav className="h-14 border-b border-line px-6 lg:px-12 flex items-center justify-between sticky top-0 bg-surface-2 backdrop-blur-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-tile bg-risk-critical/[0.12] border border-risk-critical/30 flex items-center justify-center text-risk-critical">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-semibold text-sm text-label">LANDSAFE</span>
              <span className="text-xs px-1.5 py-0.2 rounded-full tabular-nums font-semibold bg-surface-2 text-label-2 border border-line">
                SIH26001
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/sos"
            className="px-3 py-1 bg-risk-critical/[0.12] hover:bg-risk-critical/[0.12] text-risk-critical border border-risk-critical/30 rounded-full text-xs font-semibold tabular-nums flex items-center gap-1.5 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-risk-critical" />
            <span>SOS</span>
          </Link>

          <Link
            to="/overview"
            className="px-3.5 py-1.5 bg-surface-2 hover:bg-[#182744] text-label hover:text-label rounded-full text-xs tabular-nums font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Command Center</span>
            <ChevronRight className="w-3.5 h-3.5 text-label-2" />
          </Link>
        </div>
      </nav>

      {/* Hero Section (Section 6: Spacious, Clean, Restrained) */}
      <section className="relative px-6 lg:px-12 pt-20 pb-20 max-w-5xl mx-auto flex flex-col items-center text-center">
        
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-line text-xs tabular-nums font-semibold text-label-2 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-critical" />
          <span>PREDICT • PREPARE • RESCUE</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-label tracking-tight max-w-3xl leading-[1.15]">
          Landslide Early Warning & Emergency Response
        </h1>

        {/* Supporting Text */}
        <p className="mt-5 text-base sm:text-lg text-label-2 max-w-2xl font-normal leading-relaxed">
          Predict risk. Locate people in danger. Coordinate rescue. Find the safest way to safety.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            to="/overview"
            className="px-6 py-2.5 bg-surface-2 hover:bg-[#1f3254] text-label rounded-full text-sm tabular-nums font-semibold flex items-center gap-2 transition-colors"
          >
            <span>GET STARTED</span>
            <ArrowRight className="w-4 h-4 text-label-2" />
          </Link>

          <Link
            to="/sos"
            className="px-6 py-2.5 bg-risk-critical/[0.12] hover:bg-risk-critical/[0.12] text-risk-critical hover:text-label border border-risk-critical/30 rounded-full text-sm tabular-nums font-semibold flex items-center gap-2 transition-colors"
          >
            <Radio className="w-4 h-4 text-risk-critical" />
            <span>EMERGENCY SOS</span>
          </Link>
        </div>
      </section>

      {/* 3 Spacious Pillars (Clean, Restrained) */}
      <section className="px-6 lg:px-12 py-16 bg-surface-2 border-t border-line">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-1">
            <span className="text-xs tabular-nums font-semibold text-label-2">
              Operational Framework
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-label">
              Intelligent Hazard Response Architecture
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Predict */}
            <div className="bg-surface-2 border border-line p-5 rounded-tile space-y-2.5">
              <div className="w-9 h-9 rounded-tile bg-surface-2 border border-line flex items-center justify-center text-label-2">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-label">AI Hazard Prediction</h3>
              <p className="text-xs text-label-2 leading-relaxed">
                Physics-informed machine learning evaluates live rainfall, terrain slope gradients, and soil moisture saturation.
              </p>
            </div>

            {/* 2. Route */}
            <div className="bg-surface-2 border border-line p-5 rounded-tile space-y-2.5">
              <div className="w-9 h-9 rounded-tile bg-surface-2 border border-line flex items-center justify-center text-risk-low">
                <Navigation className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-label">Safe Route Planner</h3>
              <p className="text-xs text-label-2 leading-relaxed">
                Network graph routing calculates low-risk evacuation paths around active slope movements and blocked road corridors.
              </p>
            </div>

            {/* 3. Rescue */}
            <div className="bg-surface-2 border border-line p-5 rounded-tile space-y-2.5">
              <div className="w-9 h-9 rounded-tile bg-surface-2 border border-line flex items-center justify-center text-risk-critical">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-label">Emergency Coordination</h3>
              <p className="text-xs text-label-2 leading-relaxed">
                Prioritized SOS triage connects distress beacons directly with NDRF and SDRF multi-agency response teams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-line py-6 px-6 lg:px-12 text-center text-xs text-label-2 tabular-nums">
        <p>Smart India Hackathon 2026 • Problem Statement SIH26001 • Landslide Early Warning System</p>
      </footer>
    </div>
  );
};
