
import React from 'react';

export const HipaaCompliance: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4 border border-emerald-100">
          <i className="fa-solid fa-lock"></i>
          Regulatory Data Standards
        </div>
        <h2 className="text-4xl font-black text-teal-950 tracking-tight uppercase">HIPAA Compliance</h2>
        <p className="text-teal-800/60 text-lg font-bold">Securing Protected Health Information (PHI) with Integrity.</p>
      </div>

      <div className="bg-white rounded-[3rem] border border-teal-50 overflow-hidden shadow-2xl shadow-teal-900/5">
        <div className="p-12 md:p-20 space-y-16">
          <section className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-teal-950 uppercase tracking-tighter">Data Encryption</h3>
              <p className="text-teal-900/70 leading-relaxed font-bold text-sm">
                All patient data, whether in transit or at rest, is secured using industry-standard AES-256 encryption. Our infrastructure is designed to prevent unauthorized access to sensitive medical records.
              </p>
              <div className="flex gap-4">
                <div className="px-4 py-2 bg-teal-50 rounded-xl text-[10px] font-black text-teal-800 uppercase tracking-widest border border-teal-100">In Transit: TLS 1.3</div>
                <div className="px-4 py-2 bg-teal-50 rounded-xl text-[10px] font-black text-teal-800 uppercase tracking-widest border border-teal-100">At Rest: AES-256</div>
              </div>
            </div>
            <div className="bg-teal-50/50 p-10 rounded-[2.5rem] flex items-center justify-center">
              <i className="fa-solid fa-vault text-7xl text-teal-800/20"></i>
            </div>
          </section>

          <div className="h-[2px] bg-slate-50"></div>

          <section className="space-y-10">
            <h3 className="text-2xl font-black text-teal-950 uppercase tracking-tighter text-center">Core Security Pillars</h3>
            <div className="grid sm:grid-cols-3 gap-8">
              <div className="bg-slate-50 p-8 rounded-3xl space-y-4 text-center">
                <i className="fa-solid fa-file-contract text-emerald-600 text-3xl"></i>
                <h4 className="font-black text-teal-900 uppercase text-xs tracking-widest">BAA Execution</h4>
                <p className="text-[10px] font-bold text-teal-800/50 leading-relaxed">Full Business Associate Agreements provided for all clinical practices.</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-3xl space-y-4 text-center">
                <i className="fa-solid fa-user-shield text-emerald-600 text-3xl"></i>
                <h4 className="font-black text-teal-900 uppercase text-xs tracking-widest">Zero-Persistence</h4>
                <p className="text-[10px] font-bold text-teal-800/50 leading-relaxed">Patient data is processed without global training persistence.</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-3xl space-y-4 text-center">
                <i className="fa-solid fa-list-check text-emerald-600 text-3xl"></i>
                <h4 className="font-black text-teal-900 uppercase text-xs tracking-widest">Audit Logs</h4>
                <p className="text-[10px] font-bold text-teal-800/50 leading-relaxed">Comprehensive tracking of all data access and synthesis events.</p>
              </div>
            </div>
          </section>
        </div>
        <div className="bg-teal-950 p-12 text-white text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60 mb-4">Integrative Psychiatry Security Promise</p>
          <p className="font-bold text-sm max-w-2xl mx-auto leading-relaxed">
            Our platform is purpose-built to exceed HIPAA requirements, ensuring that digital clinical tools respect the sanctity of the patient-doctor relationship.
          </p>
        </div>
      </div>
    </div>
  );
};
