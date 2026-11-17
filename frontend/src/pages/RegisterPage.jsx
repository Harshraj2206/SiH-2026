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
    if (!pwd) return { score: 0, label: 'None', color: 'bg-surface-2' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\/`~]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-risk-critical', width: 'w-1/4' };
    if (score === 3) return { score: 2, label: 'Fair', color: 'bg-risk-moderate', width: 'w-2/4' };
    if (score === 4) return { score: 3, label: 'Good', color: 'bg-accent', width: 'w-3/4' };
    return { score: 4, label: 'Strong', color: 'bg-risk-low', width: 'w-full' };
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
      <div className="min-h-screen relative isolate flex flex-col justify-center items-center px-4 py-12 text-label selection:bg-accent/30">
        <Terrain3DBackground />
        <div className="w-full max-w-md bg-surface rounded-card p-6 text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-risk-low/[0.12] border-risk-low/30 flex items-center justify-center text-risk-low mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-label">Account Created</h2>
            <p className="text-xs text-label-2">
              Welcome to <strong>LandSafe</strong>, {formData.fullName}. Your citizen dashboard is ready.
            </p>
          </div>
          <button
            onClick={() => navigate('/overview', { replace: true })}
            className="w-full py-2.5 px-4 bg-accent hover:opacity-90 text-white rounded-full text-xs tabular-nums font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4 text-label-2" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative isolate flex flex-col justify-center items-center px-4 py-12 text-label selection:bg-accent/30">
      <Terrain3DBackground />

      <div className="w-full max-w-lg space-y-5 z-10 animate-in fade-in duration-200">
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-field bg-surface-2 flex items-center justify-center text-label">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-lg text-label">LandSafe</span>

            </div>
          </Link>
          <h2 className="text-xl font-semibold text-label tracking-tight pt-1">Create Account</h2>
        </div>

        <div className="bg-surface rounded-card p-6 space-y-4">
          
          {errorMessage && (
            <div className="p-3 rounded-tile bg-risk-critical/[0.12] border-risk-critical/30 flex items-start gap-2.5 text-xs text-risk-critical">
              <AlertCircle className="w-4 h-4 text-risk-critical shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-xs tabular-nums font-medium text-label-2" htmlFor="fullName">
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
                  className="w-full px-3 py-2 bg-surface-2 rounded-field text-xs text-label placeholder-label-3 focus:outline-none tabular-nums disabled:opacity-50 focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs tabular-nums font-medium text-label-2" htmlFor="username">
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
                  className="w-full px-3 py-2 bg-surface-2 rounded-field text-xs text-label placeholder-label-3 focus:outline-none tabular-nums disabled:opacity-50 focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-xs tabular-nums font-medium text-label-2" htmlFor="email">
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
                  className="w-full px-3 py-2 bg-surface-2 rounded-field text-xs text-label placeholder-label-3 focus:outline-none tabular-nums disabled:opacity-50 focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs tabular-nums font-medium text-label-2" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98620-XXXXX"
                  disabled={loading}
                  className="w-full px-3 py-2 bg-surface-2 rounded-field text-xs text-label placeholder-label-3 focus:outline-none tabular-nums disabled:opacity-50 focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-xs tabular-nums font-medium text-label-2" htmlFor="password">
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
                    className="w-full pl-3 pr-8 py-2 bg-surface-2 rounded-field text-xs text-label placeholder-label-3 focus:outline-none tabular-nums disabled:opacity-50 focus:ring-2 focus:ring-accent/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-label-2 hover:text-label"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs tabular-nums font-medium text-label-2" htmlFor="confirmPassword">
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
                    className="w-full pl-3 pr-8 py-2 bg-surface-2 rounded-field text-xs text-label placeholder-label-3 focus:outline-none tabular-nums disabled:opacity-50 focus:ring-2 focus:ring-accent/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-label-2 hover:text-label"
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
                className="mt-0.5 rounded bg-surface-2 border-line text-label-2 focus:ring-0"
              />
              <label htmlFor="terms" className="text-xs text-label-2 tabular-nums">
                I accept the Terms of Service & Privacy Policy.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !formData.termsAccepted}
              className="w-full py-2.5 px-4 bg-accent hover:opacity-90 text-white rounded-full text-xs tabular-nums font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <span>Creating Account...</span> : <><span>Create Account</span><ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>

          <div className="pt-2 border-t border-line text-center">
            <Link
              to="/login"
              className="text-xs text-label-2 hover:text-label-2 transition-colors tabular-nums"
            >
              Already registered? <strong className="text-label underline">Sign In</strong>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
