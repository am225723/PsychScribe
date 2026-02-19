import React from 'react';
import { useNavigate } from 'react-router-dom';

const LOGO_URL = "https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/1769462247681_90103e28-cdb1-49a9-a4c1-176a3ec95df2-1_all_5851.png";

const documentTypes = [
  {
    title: 'Intake Summary',
    subtitle: 'Clinical Synthesis Report',
    description: 'Transform raw intake data into an exhaustive clinical synthesis report with safety screening and treatment planning.',
    icon: 'fa-solid fa-file-medical',
    path: '/summary',
    color: 'bg-teal-50',
    iconColor: 'text-teal-700',
    borderColor: 'border-teal-100',
    hoverBorder: 'hover:border-teal-300',
    accentBg: 'bg-teal-600',
  },
  {
    title: 'Treatment Plan',
    subtitle: 'Clinical Mental Health Plan',
    description: 'Generate professional treatment plans with goals, objectives, MDM documentation, and prescription planning.',
    icon: 'fa-solid fa-clipboard-list',
    path: '/treatment',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    borderColor: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-300',
    accentBg: 'bg-emerald-600',
  },
  {
    title: 'Session Note',
    subtitle: 'DARP Progress Note',
    description: 'Create structured DARP session notes from audio transcripts, provider notes, or clinical observations.',
    icon: 'fa-solid fa-notes-medical',
    path: '/darp',
    color: 'bg-sky-50',
    iconColor: 'text-sky-700',
    borderColor: 'border-sky-100',
    hoverBorder: 'hover:border-sky-300',
    accentBg: 'bg-sky-600',
  },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3 pt-4">
        <div className="relative group inline-block">
          <div className="absolute inset-0 bg-teal-400 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <img src={LOGO_URL} alt="Dr. Zelisko Logo" className="w-20 h-20 mx-auto relative z-10 drop-shadow-2xl transition-transform group-hover:scale-110 duration-700" />
        </div>
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-teal-950 tracking-tighter uppercase lg:text-5xl">Dr. Zelisko Intake</h2>
          <p className="text-teal-800/60 max-w-xl mx-auto text-xs font-bold leading-relaxed uppercase tracking-[0.4em]">Clinical Synthesis Engine: drz.services</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-teal-800/40">Select Document Type</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 px-2">
        {documentTypes.map((doc) => (
          <button
            key={doc.path}
            onClick={() => navigate(doc.path)}
            className={`group relative bg-white p-6 rounded-[2rem] border-2 ${doc.borderColor} ${doc.hoverBorder} shadow-lg hover:shadow-2xl transition-all text-left flex flex-col gap-4 active:scale-[0.98] cursor-pointer`}
          >
            <div className={`w-14 h-14 ${doc.color} rounded-2xl flex items-center justify-center ${doc.iconColor} transition-transform group-hover:scale-110`}>
              <i className={`${doc.icon} text-2xl`}></i>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-teal-950 uppercase tracking-tight">{doc.title}</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40">{doc.subtitle}</p>
            </div>

            <p className="text-sm text-teal-800/60 font-bold leading-relaxed">{doc.description}</p>

            <div className="mt-auto pt-3 border-t border-teal-50 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/30 group-hover:text-teal-800 transition-colors flex items-center gap-2">
                Open <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
              </span>
              <div className={`w-8 h-8 ${doc.accentBg} rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all`}>
                <i className="fa-solid fa-chevron-right text-white text-xs"></i>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="px-2 pt-2">
        <button
          onClick={() => navigate('/batch')}
          className="group w-full bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-[2rem] border-2 border-amber-100 hover:border-amber-300 shadow-lg hover:shadow-2xl transition-all text-left flex items-center gap-6 active:scale-[0.99] cursor-pointer"
        >
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 transition-transform group-hover:scale-110 flex-shrink-0">
            <i className="fa-solid fa-layer-group text-2xl"></i>
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-black text-teal-950 uppercase tracking-tight">Batch Processing</h3>
            <p className="text-sm text-teal-800/60 font-bold leading-relaxed mt-1">Upload multiple patient files and process them all at once. Results are saved automatically to the patient database.</p>
          </div>
          <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
            <i className="fa-solid fa-chevron-right text-white text-sm"></i>
          </div>
        </button>
      </div>
    </div>
  );
};
