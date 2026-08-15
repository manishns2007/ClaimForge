import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Building2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authMode, 
    openAuthModal, 
    signInWithGoogle, 
    signInWithEmail, 
    signInAsDemo,
    isLoading 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGoogleAuth = async () => {
    try {
      setError(null);
      await signInWithGoogle();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in with Google');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid work email');
      return;
    }
    try {
      setError(null);
      await signInWithEmail(email, password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    }
  };

  const handleDemoAuth = async () => {
    try {
      setError(null);
      await signInAsDemo();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Demo sign in failed');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white border border-[#E5E5E2] rounded-3xl shadow-2xl overflow-hidden z-10 font-body text-[#20242A]"
        >
          {/* Close Button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-[#737A80] hover:text-[#20242A] p-2 rounded-full hover:bg-[#F7F7F5] transition-colors border-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="pt-8 pb-4 px-8 text-center border-b border-[#F0F0EE]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6C63E6]/10 text-[#6C63E6] border border-[#6C63E6]/20 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autonomous Pre-Dispute Intelligence</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-[#20242A] tracking-tight">
              {authMode === 'signup' ? 'Create ClaimForge Account' : 'Sign in to ClaimForge'}
            </h3>
            <p className="text-xs text-[#737A80] mt-1 max-w-xs mx-auto">
              Access your executive claims portfolio, telemetry audits, and automated dispute packages.
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#F7F7F5] p-1 rounded-xl border border-[#E5E5E2] mt-4">
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all border-none cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-white text-[#20242A] shadow-xs'
                    : 'text-[#737A80] hover:text-[#20242A] bg-transparent'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all border-none cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-white text-[#20242A] shadow-xs'
                    : 'text-[#737A80] hover:text-[#20242A] bg-transparent'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-8 space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3">
                {error}
              </div>
            )}

            {/* 1. PRIMARY: Sign In With Google */}
            <button
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#F7F7F5] text-[#20242A] border border-[#D4D4D0] hover:border-[#6C63E6] rounded-xl py-3 px-4 text-xs font-semibold shadow-xs transition-all cursor-pointer group"
            >
              {/* Google 4-Color 'G' SVG Logo */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-3">
              <div className="w-full border-t border-[#E5E5E2]" />
              <span className="bg-white px-3 text-[10px] uppercase tracking-wider text-[#737A80] font-medium absolute">
                or with work email
              </span>
            </div>

            {/* 2. Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#737A80] mb-1">
                    Company / Organization
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#737A80] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Apex Infrastructure Corp"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl text-[#20242A] focus:outline-none focus:border-[#6C63E6] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#737A80] mb-1">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#737A80] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="alex.morgan@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl text-[#20242A] focus:outline-none focus:border-[#6C63E6] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#737A80]">
                    Password
                  </label>
                  {authMode === 'signin' && (
                    <button type="button" className="text-[10px] text-[#6C63E6] hover:underline bg-transparent border-none p-0 cursor-pointer">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#737A80] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl text-[#20242A] focus:outline-none focus:border-[#6C63E6] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold mt-2 cursor-pointer shadow-xs"
              >
                <span>{authMode === 'signup' ? 'Create Enterprise Account' : 'Sign in with Email'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* 3. Demo Quick Login for Instant Evaluation */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDemoAuth}
                disabled={isLoading}
                className="w-full bg-[#6C63E6]/10 hover:bg-[#6C63E6]/20 text-[#6C63E6] border border-[#6C63E6]/30 rounded-xl py-2 px-3 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Quick Demo Login as Lead Investigator (Alex Morgan)</span>
              </button>
            </div>

            {/* Security Guarantee Footer */}
            <div className="pt-2 border-t border-[#F0F0EE] flex items-center justify-center gap-4 text-[10px] text-[#737A80]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> 256-Bit Encrypted
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SOC 2 Type II
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> GDPR Ready
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
