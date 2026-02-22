import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';

const LOGO_URL = "https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/1769462247681_90103e28-cdb1-49a9-a4c1-176a3ec95df2-1_all_5851.png";

interface LoginProps {
  onLogin: () => void;
  onMfaRequired: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onMfaRequired }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Account created successfully. You can now sign in.');
        setIsSignUp(false);
        setPassword('');
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!signInData?.session) throw new Error('No session returned');

        const mfaCheck = await Promise.race([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 3000)),
        ]);
        const aal = (mfaCheck as any)?.data;
        if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
          onMfaRequired();
        } else {
          onLogin();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="relative group inline-block mb-4">
            <div className="absolute inset-0 bg-teal-400 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <img src={LOGO_URL} alt="Dr. Zelisko Logo" className="w-24 h-24 mx-auto relative z-10 drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-black text-teal-950 tracking-tighter uppercase">Dr. Zelisko</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-800/40 mt-1">Integrative Psychiatry</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-black text-teal-950 uppercase tracking-tight">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/40 mt-1">
              {isSignUp ? 'Set up your credentials' : 'Enter your credentials to continue'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation text-red-500"></i>
              <span className="text-sm font-bold text-red-700">{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <i className="fa-solid fa-circle-check text-emerald-500"></i>
              <span className="text-sm font-bold text-emerald-700">{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.com"
                required
                className="w-full px-5 py-4 rounded-2xl border border-teal-100 bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15 transition-all"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
                className="w-full px-5 py-4 rounded-2xl border border-teal-100 bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] text-white shadow-2xl transition-all flex items-center justify-center gap-3 ${
                loading
                  ? 'bg-teal-300 cursor-not-allowed'
                  : 'bg-teal-900 hover:bg-black hover:-translate-y-1 shadow-teal-900/20 active:translate-y-0'
              }`}
            >
              {loading ? (
                <i className="fa-solid fa-circle-notch animate-spin"></i>
              ) : (
                <i className={`fa-solid ${isSignUp ? 'fa-user-plus' : 'fa-right-to-bracket'}`}></i>
              )}
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        <p className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-teal-800/20 mt-6">
          Clinical Synthesis Engine — drz.services
        </p>
      </div>
    </div>
  );
};
