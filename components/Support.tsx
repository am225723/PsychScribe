
import React from 'react';

export const Support: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-teal-50 text-teal-800 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4 border border-teal-100">
          <i className="fa-solid fa-headset"></i>
          Clinical Success Center
        </div>
        <h2 className="text-4xl font-black text-teal-950 tracking-tight uppercase">Platform Support</h2>
        <p className="text-teal-800/60 text-lg font-bold">Dedicated assistance for integrative clinical operations.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white p-12 rounded-[3rem] border border-teal-50 shadow-2xl shadow-teal-900/5 space-y-10">
              <h3 className="text-2xl font-black text-teal-950 uppercase tracking-tighter">Frequently Asked Questions</h3>
              <div className="space-y-8">
                <div className="space-y-2">
                  <h4 className="font-black text-teal-900 uppercase text-xs tracking-widest">How accurate is the OCR for medical scans?</h4>
                  <p className="text-teal-900/60 text-sm font-bold leading-relaxed">Our engine uses multi-layer visual analysis. For best results, ensure scans are 300DPI+ and not tilted. High-res images from phones are fully supported.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-teal-900 uppercase text-xs tracking-widest">What if the AI makes a mistake in the brief?</h4>
                  <p className="text-teal-900/60 text-sm font-bold leading-relaxed">The AI synthesis is assistive. Clinicians should use the "Manual Entry" tab to correct specific nuances or use the ChatBot to clarify synthesis logic.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-teal-900 uppercase text-xs tracking-widest">Can I customize the report format?</h4>
                  <p className="text-teal-900/60 text-sm font-bold leading-relaxed">The current structure follows the gold standard Integrative Psychiatry format. Customized templates are available for Enterprise portal users.</p>
                </div>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-teal-900 p-10 rounded-[3rem] shadow-xl text-white space-y-8">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-teal-400">
                <i className="fa-solid fa-envelope-open-text text-3xl"></i>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight">Need Assistance?</h3>
                <p className="text-teal-100/60 text-xs font-bold leading-relaxed">Our clinical support team typically responds within 4 business hours.</p>
              </div>
              <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/20">
                Contact Support
              </button>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-teal-50 shadow-xl space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-800">
                    <i className="fa-solid fa-flask-vial"></i>
                 </div>
                 <h3 className="font-black text-teal-950 uppercase text-xs tracking-widest">Clinical Loop</h3>
              </div>
              <p className="text-teal-900/50 text-[11px] font-bold leading-relaxed">
                Report a "Hallucination" or AI synthesis error to help us refine the clinical reasoning engine.
              </p>
              <button className="w-full py-3 border-2 border-teal-50 hover:border-teal-200 hover:bg-teal-50/30 transition-all rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-teal-800">
                Submit Feedback
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
