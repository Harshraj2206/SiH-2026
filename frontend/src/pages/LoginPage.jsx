import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, PRESET_DEMO_ACCOUNTS } from '../context/AuthContext';
import { Terrain3DBackground } from '../components/common/Terrain3DBackground';
import { 
  Shield, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  KeyRound, 
  ChevronDown, 
  ChevronUp,
  ShieldCheck
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
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

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

  const handleQuickFill = (account) => {
    setIdentifier(account.identifier);
    setPassword(account.password);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center px-4 py-12 bg-[#070b14] text-slate-100 selection:bg-red-500 selection:text-white">
      {/* 3D Elevation Mesh Background */}
      <Terrain3DBackground />

      <div className="w-full max-w-md space-y-5 z-10 animate-in fade-in duration-200">
        
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="font-black text-lg tracking-wider text-white">LANDSAFE</span>
              <span className="block text-[10px] font-mono text-slate-400">SIH26001 • OPERATIONS CONSOLE</span>
            </div>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight pt-1">Sign In</h2>
        </div>

        {/* Login Form Card (Section 7) */}
        <div className="bg-[#0d1527] border border-[#1c2b48] rounded-xl p-6 shadow-xl space-y-4">
          
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Identifier */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-medium text-slate-300" htmlFor="identifier">
                Email / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@agency.gov.in or username"
                  autoComplete="username"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 bg-[#090f1d] border border-[#1c2b48] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors font-mono disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono font-medium text-slate-300" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full pl-9 pr-9 py-2 bg-[#090f1d] border border-[#1c2b48] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
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
              className="w-full py-2.5 px-4 bg-[#16243d] hover:bg-[#1f3254] text-white border border-cyan-500/40 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <span>Authenticating...</span> : <><span>Sign In</span><ArrowRight className="w-3.5 h-3.5 text-cyan-400" /></>}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="pt-2 border-t border-[#1c2b48] text-center">
            <Link
              to="/register"
              className="text-xs text-slate-400 hover:text-cyan-300 transition-colors font-mono"
            >
              New to LANDSAFE? <strong className="text-white underline">Create Account</strong>
            </Link>
          </div>
        </div>

        {/* Demo Quick-Fill Accordion */}
        <div className="bg-[#0d1527] border border-[#1c2b48] rounded-xl overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowDemoCredentials(!showDemoCredentials)}
            className="w-full p-2.5 flex items-center justify-between text-slate-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-[11px] font-bold text-slate-200">SIH 2026 Test Accounts</span>
            </div>
            {showDemoCredentials ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDemoCredentials && (
            <div className="p-2.5 pt-0 border-t border-[#1c2b48] space-y-1 animate-in fade-in">
              {PRESET_DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className="w-full p-1.5 rounded-lg bg-[#090f1d] hover:bg-[#121d33] border border-[#1c2b48] text-left flex items-center justify-between transition-colors font-mono text-[11px]"
                >
                  <span className="text-slate-200 font-semibold">{acc.role}</span>
                  <span className="text-cyan-400 text-[10px]">Fill Credentials</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Session (JWT HS256 + bcrypt)</span>
        </div>
      </div>
    </div>
  );
};
