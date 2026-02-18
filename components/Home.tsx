import React from 'react';
import { IntakeForm } from './IntakeForm';
import { ReportView } from './ReportView';
import { FileData } from '../types';
import { ReportTab } from '../App';

const LOGO_URL = "https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/1769462247681_90103e28-cdb1-49a9-a4c1-176a3ec95df2-1_all_5851.png";

interface HomeProps {
  report: string | null;
  isProcessing: boolean;
  hasApiKey: boolean;
  onOpenKeySelector: () => void;
  isDriveLinked: boolean;
  linkedEmail: string | null;
  onLinkDrive: () => void;
  onUnlinkDrive: () => void;
  isLinking: boolean;
  accessToken: string | null;
  onProcess: (input: string | FileData) => void;
  error: { message: string; isQuota: boolean } | null;
  activeReportTab: ReportTab;
}

export const Home: React.FC<HomeProps> = ({
  report,
  isProcessing,
  hasApiKey,
  onOpenKeySelector,
  isDriveLinked,
  linkedEmail,
  onLinkDrive,
  onUnlinkDrive,
  isLinking,
  accessToken,
  onProcess,
  error,
  activeReportTab,
}) => {
  return !report ? (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className={`space-y-6 transition-opacity duration-300 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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

        <div className="max-w-4xl mx-auto px-4 grid md:grid-cols-2 gap-4">
          {!hasApiKey && window.aistudio ? (
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-center justify-between gap-6 shadow-xl animate-in slide-in-from-top-6 duration-500">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 shrink-0">
                  <i className="fa-solid fa-key text-xl"></i>
                </div>
                <div>
                  <h4 className="font-black text-amber-900 uppercase text-xs tracking-widest leading-none">Security Key</h4>
                  <p className="text-[9px] font-bold text-amber-800/60 mt-1">Config required for processing</p>
                </div>
              </div>
              <button
                onClick={onOpenKeySelector}
                className="bg-amber-700 text-white px-5 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-amber-800 transition-all shadow-lg shadow-amber-900/20 active:scale-95"
              >
                Initialize
              </button>
            </div>
          ) : (
            <div className="bg-teal-50/50 border border-teal-100/50 p-6 rounded-[2rem] flex items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-800 shrink-0">
                  <i className="fa-solid fa-circle-check text-xl"></i>
                </div>
                <div>
                  <h4 className="font-black text-teal-950 uppercase text-xs tracking-widest leading-none">System Ready</h4>
                  <p className="text-[9px] font-bold text-teal-800/40 mt-1 uppercase tracking-tighter">Clinical engine operational</p>
                </div>
              </div>
            </div>
          )}

          <div className={`p-6 rounded-[2rem] border flex items-center justify-between gap-6 shadow-xl transition-all duration-500 ${isDriveLinked ? 'bg-emerald-50 border-emerald-100 ring-2 ring-emerald-200' : 'bg-white border-teal-50 hover:border-teal-100'}`}>
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isDriveLinked ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 rotate-[360deg]' : 'bg-slate-50 text-slate-400'}`}>
                <i className="fa-brands fa-google-drive text-xl"></i>
              </div>
              <div className="overflow-hidden">
                <h4 className="font-black text-teal-950 uppercase text-xs tracking-widest leading-none">Archival Sync</h4>
                <p className={`text-[9px] font-bold mt-1 uppercase truncate tracking-tighter ${isDriveLinked ? 'text-emerald-700' : 'text-teal-800/30'}`}>
                  {isDriveLinked ? linkedEmail : 'Link Google Drive'}
                </p>
              </div>
            </div>
            {!isDriveLinked ? (
              <button
                onClick={onLinkDrive}
                disabled={isLinking}
                className="bg-teal-950 text-teal-50 px-6 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 disabled:opacity-50"
              >
                {isLinking ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-link"></i>}
                {isLinking ? 'Authenticating' : 'Link Drive'}
              </button>
            ) : (
              <button
                onClick={onUnlinkDrive}
                className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-all p-3 rounded-xl"
                title="Disconnect Drive"
              >
                <i className="fa-solid fa-link-slash"></i>
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full px-4">
          <IntakeForm onProcess={onProcess} isProcessing={isProcessing} />
        </div>

        {error && (
          <div className="max-w-xl mx-auto p-6 bg-red-50 border border-red-100 text-red-700 rounded-[2rem] flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <i className="fa-solid fa-triangle-exclamation text-red-600 text-xl"></i>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest">{error.isQuota ? "Capacity Warning" : "System Error"}</p>
                <p className="text-sm font-bold opacity-80 leading-snug">{error.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      <ReportView
        report={report}
        activeTab={activeReportTab}
        isDriveLinked={isDriveLinked}
        linkedEmail={linkedEmail}
        onLinkDrive={onLinkDrive}
        onUnlinkDrive={onUnlinkDrive}
        isLinking={isLinking}
        accessToken={accessToken}
      />
    </div>
  );
};
