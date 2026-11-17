import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { Terrain3DBackground } from '../components/common/Terrain3DBackground';
import { Shield, Mail, ArrowLeft, Send, Info, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await authApi.forgotPassword(email.trim());
      setResult(res);
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Failed to submit reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center px-4 py-12 selection:bg-risk-critical selection:text-label">
      <Terrain3DBackground />

      <div className="w-full max-w-md space-y-6 z-10 animate-in fade-in zoom-in-95">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-card bg-risk-critical/[0.12] border border-risk-critical/30 flex items-center justify-center text-risk-critical ">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg text-label">LAND<span className="text-risk-critical">GUARD</span></span>
          </Link>
          <h2 className="text-2xl font-semibold text-label">Password Recovery</h2>
          <p className="text-xs text-label-2">Enter your registered email address to request account recovery instructions</p>
        </div>

        <div className="bg-surface backdrop-blur-xl border border-line rounded-card p-6 sm:p-8 shadow-slate-950 space-y-6">
          
          {/* Explicit Delivery Status Notice */}
          <div className="p-3.5 rounded-card bg-risk-moderate/[0.12] border border-risk-moderate/30 flex items-start gap-3 text-xs text-risk-moderate">
            <Info className="w-4 h-4 text-risk-moderate shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Prototype Environment Notice:</span>
              <span>SMTP / External email delivery is <strong>NOT CONFIGURED</strong> in this offline hackathon build. For testing, please use the pre-created jury credentials on the login screen.</span>
            </div>
          </div>

          {result ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-2 border border-line flex items-center justify-center text-label-2 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs text-label-2 leading-relaxed">
                {result.message}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-tile bg-surface-2 hover:bg-surface-2 text-xs font-semibold text-label transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-label" htmlFor="email">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-label-2 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@sdim.ner.gov.in or resident@..."
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-page border border-line rounded-tile text-sm text-label placeholder-label-3 focus:outline-none focus:border-risk-critical/30 tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-surface-2 text-label rounded-tile text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <span>Submitting...</span> : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reset Request</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-label-2 hover:text-label inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
