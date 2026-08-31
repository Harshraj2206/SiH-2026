import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { Terrain3DBackground } from '../components/common/Terrain3DBackground';

export const PrivacyPage = () => {
  return (
    <div className="min-h-screen relative text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      <Terrain3DBackground />

      <nav className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-black text-sm tracking-wider text-white">LAND<span className="text-rose-500">GUARD</span></span>
        </Link>
        <Link to="/login" className="text-xs text-slate-300 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Draft Document — Created for Smart India Hackathon 2026 (SIH26001) Prototype Review</span>
        </div>

        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-black text-white">Privacy Policy</h1>
          </div>

          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-white">1. Data Collected</h2>
              <p>
                LANDSLIDEGUARD collects essential profile information (Full Name, Username, Email, Phone), user-managed Emergency Contacts, and device GPS telemetry when explicitly permitted for hazard triangulation.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-bold text-white">2. Password Security & Hashing</h2>
              <p>
                Plaintext passwords are never logged, transmitted in unencrypted form, or stored in database tables. All authentication credentials are salted and hashed using enterprise-grade bcrypt algorithms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-bold text-white">3. Geolocation Privacy</h2>
              <p>
                Live GPS coordinates are processed for localized hazard assessment and dynamic route calculation. Location permissions can be enabled or dismissed at any time in user profile settings.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-bold text-white">4. Emergency Contacts</h2>
              <p>
                Stored emergency contacts are linked to your profile to assist first responders (NDRF / SDRF) during active SOS rescue missions.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
