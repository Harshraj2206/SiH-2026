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
    <div className="min-h-screen relative isolate flex flex-col justify-center items-center px-4 py-12 selection:bg-accent/30">
      <Terrain3DBackground />

      <div className="w-full max-w-md space-y-6 z-10 animate-in fade-in zoom-in-95">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-field bg-surface-2 flex items-center justify-center text-label">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg text-label">LandSafe</span>
          </Link>
          <h2 className="text-2xl font-semibold text-label">Forgot password</h2>
        </div>

        <div className="bg-surface backdrop-blur-xl rounded-card p-6 sm:p-8 space-y-6">
          
          {/* Explicit Delivery Status Notice */}
          <div className="p-3.5 rounded-card bg-risk-moderate/[0.12] border-risk-moderate/30 flex items-start gap-3 text-xs text-risk-moderate">
            <Info className="w-4 h-4 text-risk-moderate shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Reset emails are not available yet</span>
              <span>LandSafe cannot send email yet. To reset your password, contact the LandSafe administrator.</span>
            </div>
          </div>

          {result ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-label-2 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs text-label-2 leading-relaxed">
                {result.message}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap bg-surface-2 hover:bg-surface-2 text-xs font-semibold text-label transition-colors"
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
                    className="w-full pl-10 pr-4 py-3 bg-surface-2 rounded-field text-sm text-label placeholder-label-3 focus:outline-none tabular-nums focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-accent hover:opacity-90 text-white rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
