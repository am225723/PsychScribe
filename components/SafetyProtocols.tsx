
import React from 'react';

export const SafetyProtocols: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-1 border border-red-200 shadow-sm">
          <i className="fa-solid fa-shield-halved"></i>
          Clinical Escalation Guidelines
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-teal-950 tracking-tight uppercase">Clinical Safety Screening</h2>
        <p className="text-teal-800/60 text-xs md:text-sm font-bold">Mandatory risk detection and crisis protocols.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-red-50 overflow-hidden shadow-xl shadow-red-900/5">
        <div className="p-8 md:p-14 space-y-10">
          <section className="space-y-4">
            <h3 className="text-lg md:text-xl font-black text-teal-950 flex items-center gap-3 uppercase tracking-tighter">
              <i className="fa-solid fa-magnifying-glass-chart text-red-600"></i>
              Automated Risk Detection
            </h3>
            <p className="text-teal-900/70 leading-relaxed font-bold text-xs">
              Every case processed undergoes a proprietary safety-marker scan. Our engine isolates specific linguistic cues indicating acute crisis.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {['Suicidal Ideation', 'Self-Harm Indicators', 'Severe Psychosis', 'Crisis Flags'].map(item => (
                <div key={item} className="flex items-center gap-3 p-3 bg-teal-50/30 rounded-xl border border-teal-50 font-black text-teal-900 uppercase tracking-widest text-[8px] md:text-[9px]">
                  <i className="fa-solid fa-circle-exclamation text-red-600"></i>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <div className="h-[1px] bg-slate-100"></div>

          <section className="space-y-6">
            <h3 className="text-lg md:text-xl font-black text-teal-950 flex items-center gap-3 uppercase tracking-tighter">
              <i className="fa-solid fa-tower-broadcast text-red-600"></i>
              Clinical Escalation
            </h3>
            <div className="space-y-6">
              <div className="flex gap-6 items-start">
                <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-red-600 text-white rounded-xl flex items-center justify-center font-black text-base shadow-lg shadow-red-100">1</div>
                <div>
                  <h4 className="font-black text-teal-950 uppercase text-xs tracking-tight">Visual Alert Trigger</h4>
                  <p className="text-teal-900/60 font-bold text-[10px] md:text-xs mt-1 leading-relaxed">Persistent red safety banner is hard-coded into the Brief if acute risk is detected.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-teal-800 text-white rounded-xl flex items-center justify-center font-black text-base shadow-lg shadow-teal-100">2</div>
                <div>
                  <h4 className="font-black text-teal-950 uppercase text-xs tracking-tight">Contextual Isolation</h4>
                  <p className="text-teal-900/60 font-bold text-[10px] md:text-xs mt-1 leading-relaxed">AI engine highlights verbatim quotes that triggered flags for immediate manual verification.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-teal-950 text-white rounded-xl flex items-center justify-center font-black text-base shadow-lg shadow-teal-200">3</div>
                <div>
                  <h4 className="font-black text-teal-950 uppercase text-xs tracking-tight">Treatment Plan Guardrails</h4>
                  <p className="text-teal-900/60 font-bold text-[10px] md:text-xs mt-1 leading-relaxed">Safety cases require a mandatory stabilization plan in the TX planning facilitator.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div className="bg-red-50 p-6 text-center border-t border-red-100">
          <p className="text-red-900 font-black text-[9px] uppercase tracking-[0.2em] max-w-xl mx-auto leading-relaxed">
            Legal: AI is an assistive tool and does not supersede professional medical judgement.
          </p>
        </div>
      </div>
    </div>
  );
};
