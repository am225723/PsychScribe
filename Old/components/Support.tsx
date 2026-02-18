import React from 'react';

export const Support: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-3 px-8 py-3 bg-teal-50 text-teal-800 rounded-full text-xs font-black uppercase tracking-[0.4em] mb-4 border border-teal-100">
          <i className="fa-solid fa-headset"></i>
          Clinical Success Center
        </div>
        <h2 className="text-5xl font-black text-teal-950 tracking-tighter uppercase">Platform Support</h2>
        <p className="text-teal-800/60 text-xl font-bold tracking-tight">Dedicated assistance for your integrative practice.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-12 rounded-[3rem] border border-teal-50 shadow-2xl space-y-10">
          <h3 className="text-3xl font-black text-teal-950 uppercase tracking-tighter">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="space-y-2">
              <h4 className="font-black text-teal-900 uppercase text-sm tracking-[0.2em]">Synthesis Accuracy</h4>
              <p className="text-teal-900/60 text-base font-bold leading-relaxed">Our engine uses multi-layer semantic analysis. Ensure scans are 300DPI+ for optimal medical recognition.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-black text-teal-900 uppercase text-sm tracking-[0.2em]">Clinical Nuance</h4>
              <p className="text-teal-900/60 text-base font-bold leading-relaxed">AI is assistive. Use "Manual Entry" for complex patient histories or use the ChatBot to clarify logic.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-black text-teal-900 uppercase text-sm tracking-[0.2em]">Drive Integration</h4>
              <p className="text-teal-900/60 text-base font-bold leading-relaxed">You must connect a personal Google Drive account to archive reports. This ensures PHI stays in your control.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-black text-teal-900 uppercase text-sm tracking-[0.2em]">Custom Templates</h4>
              <p className="text-teal-900/60 text-base font-bold leading-relaxed">Our structure follows gold standards. Custom psychiatric templates are available for Enterprise portal users.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-teal-900 p-10 rounded-[3rem] shadow-2xl text-white space-y-8 ring-1 ring-white/10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-teal-400 shadow-inner">
              <i className="fa-solid fa-envelope-open-text text-3xl"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Need Help?</h3>
              <p className="text-teal-100/60 text-sm font-bold leading-relaxed">Our clinical support team responds within 4 business hours.</p>
            </div>
            <button className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 transition-all rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-emerald-950/20">
              Open Support Ticket
            </button>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-teal-50 shadow-2xl space-y-6">
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-800 shadow-inner">
                  <i className="fa-solid fa-flask-vial text-xl"></i>
               </div>
               <h3 className="font-black text-teal-950 uppercase text-sm tracking-widest">Feedback Loop</h3>
            </div>
            <p className="text-teal-900/50 text-sm font-bold leading-relaxed">
              Report synthesis errors or request new features to help us refine the clinical engine.
            </p>
            <button className="w-full py-4 border-2 border-teal-50 hover:border-teal-200 transition-all rounded-2xl text-xs font-black uppercase tracking-[0.3em] text-teal-800">
              Submit Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};