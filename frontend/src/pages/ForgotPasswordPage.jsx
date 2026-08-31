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
    <div className="min-h-screen relative flex flex-col justify-center items-center px-4 py-12 selection:bg-rose-500 selection:text-white">
      <Terrain3DBackground />

      <div className="w-full max-w-md space-y-6 z-10 animate-in fade-in zoom-in-95">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shadow-xl">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-black text-lg tracking-wider text-white">LAND<span className="text-rose-500">GUARD</span></span>
          </Link>
          <h2 className="text-2xl font-black text-white">Password Recovery</h2>
          <p className="text-xs text-slate-300">Enter your registered email address to request account recovery instructions</p>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950 space-y-6">
          
          {/* Explicit Delivery Status Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Prototype Environment Notice:</span>
              <span>SMTP / External email delivery is <strong>NOT CONFIGURED</strong> in this offline hackathon build. For testing, please use the pre-created jury credentials on the login screen.</span>
            </div>
          </div>

          {result ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {result.message}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200" htmlFor="email">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@sdim.ner.gov.in or resident@..."
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <span>Submitting...</span> : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reset Request</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1">
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
