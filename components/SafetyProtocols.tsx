import React from 'react';

export const SafetyProtocols: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-red-100 text-red-700 rounded-full text-xs font-black uppercase tracking-[0.3em] mb-2 border border-red-200 shadow-sm">
          <i className="fa-solid fa-shield-halved"></i>
          Risk Escalation Guidelines
        </div>
        <h2 className="text-5xl font-black text-teal-950 tracking-tighter uppercase">Clinical Safety Standards</h2>
        <p className="text-teal-800/60 text-lg font-bold tracking-tight">Mandatory acute risk detection and escalation protocols.</p>
      </div>

      <div className="bg-white rounded-[3rem] border-2 border-red-50 overflow-hidden shadow-2xl">
        <div className="p-10 md:p-16 space-y-16">
          <section className="space-y-8">
            <h3 className="text-3xl font-black text-teal-950 flex items-center gap-4 uppercase tracking-tighter">
              <i className="fa-solid fa-magnifying-glass-chart text-red-600 text-4xl"></i>
              Proactive Risk Detection
            </h3>
            <div className="grid md:grid-cols-2 gap-10">
              <p className="text-teal-900/70 leading-relaxed font-bold text-lg">
                Every synthesis cycle undergoes a proprietary multi-layer safety-marker scan. Our reasoning engine is trained to isolate specific linguistic and contextual cues indicating clinical crisis.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {['Suicidal Ideation', 'Self-Harm Markers', 'Acute Psychosis', 'Crisis Flags'].map(item => (
                  <div key={item} className="flex items-center gap-3 p-4 bg-red-50/30 rounded-2xl border border-red-100 font-black text-teal-900 uppercase tracking-widest text-[10px]">
                    <i className="fa-solid fa-circle-exclamation text-red-600"></i>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="h-[2px] bg-slate-100"></div>

          <section className="space-y-10">
            <h3 className="text-3xl font-black text-teal-950 flex items-center gap-4 uppercase tracking-tighter">
              <i className="fa-solid fa-tower-broadcast text-red-600 text-4xl"></i>
              Escalation Matrix
            </h3>
            <div className="grid md:grid-cols-3 gap-10">
              <div className="flex flex-col gap-6">
                <div className="w-16 h-16 shrink-0 bg-red-600 text-white rounded-3xl flex items-center justify-center font-black text-2xl shadow-xl shadow-red-200">1</div>
                <div>
                  <h4 className="font-black text-teal-950 uppercase text-lg tracking-tighter">Visual Alerting</h4>
                  <p className="text-teal-900/60 font-bold text-sm mt-2 leading-relaxed">Persistent red safety banners and pulse animations are hard-coded into the record upon detection.</p>
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <div className="w-16 h-16 shrink-0 bg-teal-800 text-white rounded-3xl flex items-center justify-center font-black text-2xl shadow-xl shadow-teal-200">2</div>
                <div>
                  <h4 className="font-black text-teal-950 uppercase text-lg tracking-tighter">Verbatim Isolation</h4>
                  <p className="text-teal-900/60 font-bold text-sm mt-2 leading-relaxed">The engine isolates and highlights verbatim quotes that triggered the alert for immediate human verification.</p>
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <div className="w-16 h-16 shrink-0 bg-teal-950 text-white rounded-3xl flex items-center justify-center font-black text-2xl shadow-xl shadow-teal-300">3</div>
                <div>
                  <h4 className="font-black text-teal-950 uppercase text-lg tracking-tighter">Safety Guardrails</h4>
                  <p className="text-teal-900/60 font-bold text-sm mt-2 leading-relaxed">Safety-flagged cases require a mandatory stabilization strategy in the generated Treatment Plan section.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div className="bg-red-50 p-8 text-center border-t-2 border-red-100">
          <p className="text-red-900 font-black text-xs uppercase tracking-[0.3em] leading-relaxed max-w-3xl mx-auto">
            IMPORTANT: Artificial Intelligence is a clinical decision support tool and does not supersede the medical judgement of a licensed provider.
          </p>
        </div>
      </div>
    </div>
  );
};