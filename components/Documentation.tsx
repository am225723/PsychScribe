
import React from 'react';

export const Documentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 text-teal-800 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-1 border border-teal-100">
          <i className="fa-solid fa-book-open-reader"></i>
          System Guidelines
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-teal-950 tracking-tight uppercase">Integrative Documentation</h2>
        <p className="text-teal-800/60 text-xs md:text-sm font-bold">Understanding the Clinical Synthesis Engine.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white p-6 md:p-10 rounded-[2rem] border border-teal-50 shadow-xl shadow-teal-900/5 space-y-6 group hover:border-teal-200 transition-colors">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-800 transition-transform group-hover:scale-110">
            <i className="fa-solid fa-microscope text-2xl"></i>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-teal-900 uppercase tracking-tight">Clinical Synthesis</h3>
            <p className="text-teal-800/60 leading-relaxed font-bold text-xs">
              Holistic engine scans verbatim intake text and PDF documents to identify key psychiatric markers across HPI and wellness domains.
            </p>
          </div>
          <ul className="space-y-3 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">
            <li className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-emerald-600"></i> OCR-Ready Scanning</li>
            <li className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-emerald-600"></i> Symptom Interpretation</li>
            <li className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-emerald-600"></i> Narrative Consistency</li>
          </ul>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[2rem] border border-teal-50 shadow-xl shadow-teal-900/5 space-y-6 group hover:border-teal-200 transition-colors">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-800 transition-transform group-hover:scale-110">
            <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-teal-900 uppercase tracking-tight">Integration</h3>
            <p className="text-teal-800/60 leading-relaxed font-bold text-xs">
              Synchronization with clinical folders. Securely import medical scans and export finalized briefs directly into records.
            </p>
          </div>
          <ul className="space-y-3 text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40">
            <li className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-emerald-600"></i> Secure Handshake</li>
            <li className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-emerald-600"></i> Automated Export</li>
            <li className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-emerald-600"></i> HIPAA Encryption</li>
          </ul>
        </div>
      </div>

      <div className="bg-teal-900 text-white p-8 md:p-12 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10 space-y-8">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-tighter">Clinical Workflow</h3>
            <p className="text-teal-400 font-black uppercase tracking-[0.3em] text-[8px]">Standard Processing</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-2">
              <div className="text-emerald-400 font-black text-2xl opacity-50">01</div>
              <h4 className="font-black uppercase text-[10px] tracking-widest">Ingestion</h4>
              <p className="text-teal-100/60 text-[10px] font-bold leading-relaxed">Upload medical scans, PDFs, or verbatim notes.</p>
            </div>
            <div className="space-y-2">
              <div className="text-emerald-400 font-black text-2xl opacity-50">02</div>
              <h4 className="font-black uppercase text-[10px] tracking-widest">Reasoning</h4>
              <p className="text-teal-100/60 text-[10px] font-bold leading-relaxed">AI analyzes history and screens for safety markers.</p>
            </div>
            <div className="space-y-2">
              <div className="text-emerald-400 font-black text-2xl opacity-50">03</div>
              <h4 className="font-black uppercase text-[10px] tracking-widest">Archival</h4>
              <p className="text-teal-100/60 text-[10px] font-bold leading-relaxed">Download PDF or sync to clinical cloud.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
