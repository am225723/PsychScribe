import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabaseService';

const LOGO_URL = "https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/1769462247681_90103e28-cdb1-49a9-a4c1-176a3ec95df2-1_all_5851.png";

interface MfaChallengeProps {
  onVerified: () => void;
  onCancel: () => void;
}

export const MfaChallenge: React.FC<MfaChallengeProps> = ({ onVerified, onCancel }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors?.totp?.find((factor: any) => factor.status === 'verified');
      if (!totpFactor) {
        throw new Error('No verified authenticator found. Please sign out and set up Google Authenticator again.');
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) throw challengeError;

      const verifyResult = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: fullCode,
      });

      if (verifyResult.error) {
        throw new Error(verifyResult.error.message || 'Invalid verification code');
      }

      let reachedAal2 = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === 'aal2') {
          reachedAal2 = true;
          break;
        }
        await wait(120);
      }

      if (!reachedAal2) {
        console.warn('MFA verification succeeded but AAL did not immediately report aal2');
      }

      localStorage.setItem('mfa_verified_at', Date.now().toString());
      onVerified();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      handleVerify();
    }
  }, [code]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Dr. Zelisko Logo" className="w-20 h-20 mx-auto drop-shadow-2xl mb-4" />
          <h1 className="text-2xl font-black text-teal-950 tracking-tighter uppercase">Two-Step Verification</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-800/40 mt-1">Google Authenticator</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
              <i className="fa-solid fa-shield-halved text-teal-600 text-2xl"></i>
            </div>
            <p className="text-sm font-bold text-teal-800/60">Enter the 6-digit code from your Google Authenticator app</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation text-red-500"></i>
              <span className="text-sm font-bold text-red-700">{error}</span>
            </div>
          )}

          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 transition-all outline-none ${
                  digit
                    ? 'border-teal-300 bg-teal-50 text-teal-950'
                    : 'border-teal-100 bg-white text-teal-950 focus:border-teal-300 focus:ring-4 focus:ring-teal-50'
                } ${loading ? 'opacity-50' : ''}`}
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 text-teal-600">
              <i className="fa-solid fa-circle-notch animate-spin"></i>
              <span className="text-sm font-bold">Verifying...</span>
            </div>
          )}

          <button
            onClick={async () => { await supabase.auth.signOut(); onCancel(); }}
            className="w-full py-3 text-center text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors"
          >
            Cancel and sign out
          </button>
        </div>
      </div>
    </div>
  );
};
