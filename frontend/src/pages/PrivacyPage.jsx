import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { Terrain3DBackground } from '../components/common/Terrain3DBackground';

export const PrivacyPage = () => {
  return (
    <div className="min-h-screen relative isolate text-label flex flex-col selection:bg-accent/30">
      <Terrain3DBackground />

      <nav className="h-16 border-b border-line px-6 flex items-center justify-between bg-page/75 backdrop-blur-xl sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-field bg-surface-2 flex items-center justify-center text-label">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-label">LandSafe</span>
        </Link>
        <Link to="/login" className="text-xs text-label-2 hover:text-label flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <div className="p-3.5 rounded-card bg-risk-moderate/[0.12] border-risk-moderate/30 flex items-center gap-3 text-xs text-risk-moderate">
          <AlertCircle className="w-4 h-4 text-risk-moderate shrink-0" />
          <span>Draft Document — Created for Smart India Hackathon 2026 (SIH26001) Prototype Review</span>
        </div>

        <div className="bg-surface backdrop-blur-md rounded-card p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <ShieldCheck className="w-6 h-6 text-risk-low" />
            <h1 className="text-2xl font-semibold text-label">Privacy Policy</h1>
          </div>

          <div className="space-y-4 text-xs text-label-2 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-label">1. Data Collected</h2>
              <p>
                When you create an account LandSafe stores your name, username, email, phone number and any emergency contacts you add. Reports and SOS requests you send are stored with their location.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-label">2. Password Security & Hashing</h2>
              <p>
                Passwords are stored only as salted bcrypt hashes, never as plain text.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-label">3. Geolocation Privacy</h2>
              <p>
                If you allow location, your coordinates are sent to the LandSafe server and to Open-Meteo and OpenStreetMap to look up weather, terrain and place names. They are not stored unless you send a report or an SOS. You can block location in your browser at any time.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-label">4. Emergency Contacts</h2>
              <p>
                Emergency contacts are stored with your profile so you can reach them quickly. LandSafe does not message them for you.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
