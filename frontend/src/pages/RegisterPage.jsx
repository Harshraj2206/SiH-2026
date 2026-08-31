import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terrain3DBackground } from '../components/common/Terrain3DBackground';
import { 
  Shield, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HeartHandshake
} from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
    emergencyName: '',
    emergencyRelation: 'Family',
    emergencyPhone: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmergencySection, setShowEmergencySection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Password Strength Evaluation
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\/`~]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500', width: 'w-1/4' };
    if (score === 3) return { score: 2, label: 'Fair', color: 'bg-amber-500', width: 'w-2/4' };
    if (score === 4) return { score: 3, label: 'Good', color: 'bg-cyan-500', width: 'w-3/4' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
  };

  const strength = calculatePasswordStrength(formData.password);
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!formData.username.trim() || formData.username.length < 3) {
      setErrorMessage('Username must be at least 3 characters long.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('A valid email address is required.');
      return;
    }
    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!formData.termsAccepted) {
      setErrorMessage('You must accept the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        terms_accepted: formData.termsAccepted,
        emergency_contact: formData.emergencyPhone.trim() ? {
          name: formData.emergencyName.trim() || 'Primary Contact',
          relationship: formData.emergencyRelation,
          phone: formData.emergencyPhone.trim()
        } : null
      };

      await register(payload);
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center items-center px-4 py-12 bg-[#070b14] text-slate-100 selection:bg-red-500 selection:text-white">
        <Terrain3DBackground />
        <div className="w-full max-w-md bg-[#0d1527] border border-emerald-500/40 rounded-xl p-6 shadow-xl text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Account Created</h2>
            <p className="text-xs text-slate-300">
              Welcome to <strong>LANDSAFE</strong>, {formData.fullName}. Your citizen dashboard is ready.
            </p>
          </div>
          <button
            onClick={() => navigate('/overview', { replace: true })}
            className="w-full py-2.5 px-4 bg-[#16243d] hover:bg-[#1f3254] text-white border border-cyan-500/40 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center px-4 py-12 bg-[#070b14] text-slate-100 selection:bg-red-500 selection:text-white">
      <Terrain3DBackground />

      <div className="w-full max-w-lg space-y-5 z-10 animate-in fade-in duration-200">
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="font-black text-lg tracking-wider text-white">LANDSAFE</span>
              <span className="block text-[10px] font-mono text-slate-400">SIH26001 • CITIZEN ONBOARDING</span>
            </div>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight pt-1">Create Account</h2>
        </div>

        <div className="bg-[#0d1527] border border-[#1c2b48] rounded-xl p-6 shadow-xl space-y-4">
          
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-xs font-mono font-medium text-slate-300" htmlFor="fullName">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Rohan Lyngdoh"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-[#1c2b48] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono font-medium text-slate-300" htmlFor="username">
                  Username *
                </label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="rohan_lyngdoh"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-[#1c2b48] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-xs font-mono font-medium text-slate-300" htmlFor="email">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="rohan@example.com"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-[#1c2b48] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono font-medium text-slate-300" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98620-XXXXX"
                  disabled={loading}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-[#1c2b48] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-xs font-mono font-medium text-slate-300" htmlFor="password">
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Min 8 chars"
                    required
                    disabled={loading}
                    className="w-full pl-3 pr-8 py-2 bg-[#090f1d] border border-[#1c2b48] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono font-medium text-slate-300" htmlFor="confirmPassword">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Re-enter password"
                    required
                    disabled={loading}
                    className="w-full pl-3 pr-8 py-2 bg-[#090f1d] border border-[#1c2b48] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={(e) => handleChange('termsAccepted', e.target.checked)}
                className="mt-0.5 rounded bg-[#090f1d] border-[#1c2b48] text-cyan-600 focus:ring-0"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-300 font-mono">
                I accept the Terms of Service & Privacy Policy.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !formData.termsAccepted}
              className="w-full py-2.5 px-4 bg-[#16243d] hover:bg-[#1f3254] text-white border border-cyan-500/40 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <span>Creating Account...</span> : <><span>Create Account</span><ArrowRight className="w-3.5 h-3.5 text-cyan-400" /></>}
            </button>
          </form>

          <div className="pt-2 border-t border-[#1c2b48] text-center">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-cyan-300 transition-colors font-mono"
            >
              Already registered? <strong className="text-white underline">Sign In</strong>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
