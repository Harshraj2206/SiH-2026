import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import { Terrain3DBackground } from '../components/common/Terrain3DBackground';

export const TermsPage = () => {
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
            <FileText className="w-6 h-6 text-risk-critical" />
            <h1 className="text-2xl font-semibold text-label">Terms of Service</h1>
          </div>

          <div className="space-y-4 text-xs text-label-2 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-label">1. Purpose and Scope</h2>
              <p>
                LandSafe is a student prototype built for Smart India Hackathon 2026 (problem statement SIH26001). It shows landslide risk for places in India. It is not an official warning service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-label">2. Crowdsourced Ground Reports</h2>
              <p>
                Please report only what you have seen yourself (such as cracks, water seepage or falling rocks). Verified reports raise the risk score of nearby zones, so false reports can mislead other people.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-label">3. SOS requests</h2>
              <p>
                An SOS request is stored in LandSafe for local authorities to see. It is not sent to emergency services or rescue teams. In an emergency, call 112.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-label">4. Predictive Disclaimers</h2>
              <p>
                Risk scores and safe routes are model estimates and can be wrong. Landslides can happen where the score is low. Always follow local authorities.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
