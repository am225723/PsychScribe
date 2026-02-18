
import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
  isProcessing: boolean;
}

const LOGO_URL = "https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/1769462247681_90103e28-cdb1-49a9-a4c1-176a3ec95df2-1_all_5851.png";

export const ProgressBar: React.FC<ProgressBarProps> = ({ isProcessing }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isProcessing) {
      setProgress(0);
      interval = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) return prev;
          // Slowly increment to simulate progress
          const increment = prev < 30 ? 2 : prev < 70 ? 0.5 : 0.1;
          return Math.min(prev + increment, 99);
        });
      }, 100);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 bg-teal-950/80 backdrop-blur-2xl z-[200] flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-700">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-[0_64px_128px_-24px_rgba(0,0,0,0.5)] border border-teal-50 p-10 md:p-16 space-y-12 relative overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-100/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-100/30 rounded-full blur-3xl"></div>

        <div className="relative space-y-8">
          <div className="w-24 h-24 bg-teal-50 rounded-[2.5rem] flex items-center justify-center text-teal-800 mx-auto shadow-inner relative group">
            <div className="absolute inset-0 bg-teal-400/20 animate-ping rounded-[2.5rem] opacity-20"></div>
            <img src={LOGO_URL} className="w-16 h-16 relative z-10 transition-transform duration-1000 group-hover:rotate-12" alt="Processing" />
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-black text-teal-950 uppercase tracking-tighter">Clinical Synthesis</h3>
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <p className="text-teal-800/40 font-black uppercase tracking-[0.3em] text-[9px]">Processing Patient History...</p>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="relative">
              <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden border border-slate-200 shadow-inner p-1">
                <div 
                  className="h-full bg-gradient-to-r from-teal-900 via-emerald-600 to-teal-800 rounded-full shadow-lg transition-all duration-300 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-black text-teal-900/60 uppercase tracking-widest">
                {Math.floor(progress)}% Complete
              </div>
            </div>
            
            {/* CENTERED BOTTOM INDICATORS */}
            <div className="flex justify-center items-center gap-8 md:gap-12 pt-2">
               {[
                 { label: 'Extraction', icon: 'fa-file-import' },
                 { label: 'Reasoning', icon: 'fa-brain' },
                 { label: 'Formatting', icon: 'fa-file-signature' }
               ].map((step, idx) => {
                 const isCompleted = (idx === 0 && progress > 33) || (idx === 1 && progress > 66) || (idx === 2 && progress > 90);
                 return (
                   <div key={idx} className="flex flex-col items-center gap-2.5 group">
                     <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] transition-all duration-500 border shadow-sm ${
                       isCompleted 
                         ? 'bg-teal-800 text-white border-teal-900 scale-110' 
                         : 'bg-teal-50/50 text-teal-800/20 border-teal-50'
                     }`}>
                       <i className={`fa-solid ${step.icon}`}></i>
                     </div>
                     <span className={`text-[8px] uppercase font-black tracking-[0.2em] transition-colors duration-500 ${
                       isCompleted ? 'text-teal-900' : 'text-teal-900/10'
                     }`}>
                       {step.label}
                     </span>
                   </div>
                 );
               })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
