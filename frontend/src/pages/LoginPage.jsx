import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terrain3DBackground } from '../components/common/Terrain3DBackground';
import { 
  Shield, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle
} from 'lucide-react';

export const LoginPage = () => {
  const { login, getRoleDefaultRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fromPath = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your email/username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await login(identifier.trim(), password);
      const targetRoute = fromPath || getRoleDefaultRoute(result.user.role);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Invalid username/email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative isolate flex flex-col justify-center items-center px-4 py-12 text-label selection:bg-accent/30">
      {/* 3D Elevation Mesh Background */}
      <Terrain3DBackground />

      <div className="w-full max-w-md space-y-5 z-10 animate-in fade-in duration-200">
        
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-field bg-surface-2 flex items-center justify-center text-label">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-lg text-label">LandSafe</span>
              
            </div>
          </Link>
          <h2 className="text-xl font-semibold text-label tracking-tight pt-1">Sign In</h2>
        </div>

        {/* Login Form Card (Section 7) */}
        <div className="bg-surface rounded-card p-6 space-y-4">
          
          {errorMessage && (
            <div className="p-3 rounded-tile bg-risk-critical/[0.12] border-risk-critical/30 flex items-start gap-2.5 text-xs text-risk-critical">
              <AlertCircle className="w-4 h-4 text-risk-critical shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Identifier */}
            <div className="space-y-1">
              <label className="block text-xs tabular-nums font-medium text-label-2" htmlFor="identifier">
                Email / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-label-2">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or username"
                  autoComplete="username"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 bg-surface-2 rounded-field text-xs text-label placeholder-label-3 focus:outline-none transition-colors tabular-nums disabled:opacity-50 focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs tabular-nums font-medium text-label-2" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-label-2 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-label-2">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-9 py-2 bg-surface-2 rounded-field text-xs text-label placeholder-label-3 focus:outline-none transition-colors disabled:opacity-50 tabular-nums focus:ring-2 focus:ring-accent/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-label-2 hover:text-label"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-accent hover:opacity-90 text-white rounded-full text-xs tabular-nums font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <span>Signing in…</span> : <><span>Sign In</span><ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="pt-2 border-t border-line text-center">
            <Link
              to="/register"
              className="text-xs text-label-2 hover:text-label-2 transition-colors tabular-nums"
            >
              New to LandSafe? <strong className="text-label underline">Create Account</strong>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
