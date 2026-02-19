import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseService';

interface MfaEnrollProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const MfaEnroll: React.FC<MfaEnrollProps> = ({ onComplete, onSkip }) => {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    startEnrollment();
  }, []);

  const startEnrollment = async () => {
    setEnrolling(true);
    setError('');
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp) {
        for (const f of factors.totp) {
          if (f.status === 'unverified') {
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          }
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Google Authenticator',
      });
      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (err: any) {
      setError(err.message || 'Failed to start enrollment');
    } finally {
      setEnrolling(false);
    }
  };

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
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: fullCode,
      });
      if (verifyError) throw verifyError;

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6 && factorId) {
      handleVerify();
    }
  }, [code]);

  if (enrolling) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <i className="fa-solid fa-circle-notch animate-spin text-teal-600 text-3xl"></i>
          <p className="font-bold text-teal-800/60">Setting up two-step verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
              <i className="fa-solid fa-shield-halved text-teal-600 text-2xl"></i>
            </div>
            <h2 className="text-xl font-black text-teal-950 uppercase tracking-tight">Set Up Two-Step Verification</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40">Google Authenticator</p>
          </div>

          <div className="space-y-4">
            <div className="bg-teal-50/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-teal-700">1</span>
                </div>
                <p className="text-sm font-bold text-teal-900">Open Google Authenticator on your phone</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-teal-700">2</span>
                </div>
                <p className="text-sm font-bold text-teal-900">Tap the + button and scan the QR code below</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-teal-700">3</span>
                </div>
                <p className="text-sm font-bold text-teal-900">Enter the 6-digit code that appears</p>
              </div>
            </div>

            {qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-2xl border border-teal-100">
                <img src={qrCode} alt="Scan this QR code with Google Authenticator" className="w-48 h-48" />
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 hover:text-teal-800 transition-colors"
              >
                {showSecret ? 'Hide' : 'Show'} manual entry key
              </button>
              {showSecret && secret && (
                <div className="mt-2 bg-slate-50 rounded-xl p-3 font-mono text-sm text-teal-950 font-bold tracking-widest break-all select-all">
                  {secret}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation text-red-500"></i>
              <span className="text-sm font-bold text-red-700">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-3 text-center">Enter verification code</label>
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
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 text-teal-600">
              <i className="fa-solid fa-circle-notch animate-spin"></i>
              <span className="text-sm font-bold">Verifying...</span>
            </div>
          )}

          <button
            onClick={onSkip}
            className="w-full py-3 text-center text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};
