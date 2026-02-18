import React from 'react';

export const Documentation: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-3 px-5 py-1.5 bg-teal-50 text-teal-800 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-1 border border-teal-100">
          <i className="fa-solid fa-book-open-reader"></i>
          Clinical Engine Protocol
        </div>
        <h2 className="text-4xl font-black text-teal-950 tracking-tighter uppercase">System Documentation</h2>
        <p className="text-teal-800/60 text-base font-bold tracking-tight">Framework and logic for the Clinical Synthesis Engine.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white p-6 rounded-[2rem] border border-teal-50 shadow-2xl space-y-4 group hover:border-teal-200 transition-all">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-800 transition-transform group-hover:scale-110 shadow-inner">
            <i className="fa-solid fa-microscope text-2xl"></i>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-teal-900 uppercase tracking-tighter">Clinical Synthesis</h3>
            <p className="text-teal-800/60 leading-relaxed font-bold text-sm">
              Our holistic engine scans intake text and high-resolution PDF documents to identify critical psychiatric markers across all clinical domains.
            </p>
          </div>
          <ul className="space-y-2 text-xs font-black uppercase tracking-[0.3em] text-teal-800/40">
            <li className="flex items-center gap-3"><i className="fa-solid fa-circle-check text-emerald-600"></i> OCR-Ready Document Scanning</li>
            <li className="flex items-center gap-3"><i className="fa-solid fa-circle-check text-emerald-600"></i> Advanced Symptom Interpretation</li>
            <li className="flex items-center gap-3"><i className="fa-solid fa-circle-check text-emerald-600"></i> Longitudinal Narrative Continuity</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-teal-50 shadow-2xl space-y-4 group hover:border-teal-200 transition-all">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 transition-transform group-hover:scale-110 shadow-inner">
            <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-teal-900 uppercase tracking-tighter">Integrative Sync</h3>
            <p className="text-teal-800/60 leading-relaxed font-bold text-sm">
              Secure synchronization with private medical repositories. Export finalized clinical briefs directly into patient EMR records.
            </p>
          </div>
          <ul className="space-y-2 text-xs font-black uppercase tracking-[0.3em] text-teal-800/40">
            <li className="flex items-center gap-3"><i className="fa-solid fa-circle-check text-emerald-600"></i> Personal Drive Linkage</li>
            <li className="flex items-center gap-3"><i className="fa-solid fa-circle-check text-emerald-600"></i> Zero-Persistence PDF Export</li>
            <li className="flex items-center gap-3"><i className="fa-solid fa-circle-check text-emerald-600"></i> AES-256 Cloud Encryption</li>
          </ul>
        </div>
      </div>

      <div className="bg-teal-950 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ring-1 ring-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]"></div>
        <div className="relative z-10 space-y-6">
          <div className="space-y-1">
            <h3 className="text-3xl font-black uppercase tracking-tighter">Medical Informatics Workflow</h3>
            <p className="text-teal-400 font-black uppercase tracking-[0.5em] text-xs">Standard Processing Protocol</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="text-emerald-400 font-black text-4xl opacity-50 tracking-tighter">01</div>
              <h4 className="font-black uppercase text-sm tracking-[0.2em]">Data Ingestion</h4>
              <p className="text-teal-100/60 text-sm font-bold leading-relaxed">System consumes medical scans, legacy PDFs, or raw clinical observation notes.</p>
            </div>
            <div className="space-y-2">
              <div className="text-emerald-400 font-black text-4xl opacity-50 tracking-tighter">02</div>
              <h4 className="font-black uppercase text-sm tracking-[0.2em]">Marker Reasoning</h4>
              <p className="text-teal-100/60 text-sm font-bold leading-relaxed">AI evaluates history and proactively screens for high-priority safety markers.</p>
            </div>
            <div className="space-y-2">
              <div className="text-emerald-400 font-black text-4xl opacity-50 tracking-tighter">03</div>
              <h4 className="font-black uppercase text-sm tracking-[0.2em]">Clinical Archival</h4>
              <p className="text-teal-100/60 text-sm font-bold leading-relaxed">Finalized synthesis is generated as a secure PDF and linked to your cloud.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};