import React, { useState, useRef } from 'react';
import { ReportView } from './ReportView';
import { FileData } from '../types';
import { ReportTab } from '../App';

export type DocumentType = 'summary' | 'treatment' | 'darp';

interface DocumentWorkspaceProps {
  documentType: DocumentType;
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
  onProcess: (input: string | FileData[]) => void;
  error: { message: string; isQuota: boolean } | null;
  activeReportTab: ReportTab;
}

const CONFIG: Record<DocumentType, {
  title: string;
  subtitle: string;
  badge: string;
  badgeIcon: string;
  badgeColor: string;
  buttonLabel: string;
  buttonIcon: string;
  acceptTypes: string;
  inputTabs: { id: string; label: string; icon: string }[];
}> = {
  summary: {
    title: 'Intake Summary',
    subtitle: 'Clinical Synthesis Report',
    badge: 'Intake Analysis',
    badgeIcon: 'fa-solid fa-file-medical',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-100',
    buttonLabel: 'Generate Integrative Brief',
    buttonIcon: 'fa-solid fa-bolt-lightning',
    acceptTypes: 'application/pdf,image/*',
    inputTabs: [
      { id: 'file', label: 'Document Intake', icon: 'fa-solid fa-file-medical' },
      { id: 'text', label: 'Manual Entry', icon: 'fa-solid fa-keyboard' },
    ],
  },
  treatment: {
    title: 'Treatment Plan',
    subtitle: 'Clinical Mental Health Plan',
    badge: 'Treatment Documentation',
    badgeIcon: 'fa-solid fa-clipboard-list',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    buttonLabel: 'Generate Treatment Plan',
    buttonIcon: 'fa-solid fa-wand-magic-sparkles',
    acceptTypes: 'application/pdf,image/*,audio/*,video/*',
    inputTabs: [
      { id: 'file', label: 'Document Upload', icon: 'fa-solid fa-file-arrow-up' },
      { id: 'text', label: 'Text Entry', icon: 'fa-solid fa-keyboard' },
      { id: 'audio', label: 'Audio Upload', icon: 'fa-solid fa-microphone' },
    ],
  },
  darp: {
    title: 'Session Note',
    subtitle: 'DARP Progress Note',
    badge: 'Session Documentation',
    badgeIcon: 'fa-solid fa-notes-medical',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-100',
    buttonLabel: 'Generate Session Note',
    buttonIcon: 'fa-solid fa-wand-magic-sparkles',
    acceptTypes: 'application/pdf,image/*,audio/*,video/*',
    inputTabs: [
      { id: 'file', label: 'Document Upload', icon: 'fa-solid fa-file-arrow-up' },
      { id: 'text', label: 'Text Entry', icon: 'fa-solid fa-keyboard' },
      { id: 'audio', label: 'Audio Upload', icon: 'fa-solid fa-microphone' },
    ],
  },
};

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({
  documentType,
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
  const config = CONFIG[documentType];
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState(config.inputTabs[0].id);
  const [files, setFiles] = useState<FileData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: FileData[] = [];
    const readPromises = Array.from(selectedFiles).map(selectedFile => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          newFiles.push({
            name: selectedFile.name,
            mimeType: selectedFile.type,
            base64: base64,
          });
          resolve();
        };
        reader.readAsDataURL(selectedFile);
      });
    });

    await Promise.all(readPromises);
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'text' && text.trim()) {
      onProcess(text);
    } else if ((activeTab === 'file' || activeTab === 'audio') && files.length > 0) {
      onProcess(files);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getAcceptForTab = () => {
    if (activeTab === 'audio') return 'audio/*';
    return config.acceptTypes;
  };

  const getUploadLabel = () => {
    if (activeTab === 'audio') return 'Upload Audio';
    return 'Upload Form';
  };

  const getUploadHint = () => {
    if (activeTab === 'audio') return 'MP3, WAV, M4A, or WebM';
    return 'PDF, Image, or Scanned Doc';
  };

  if (report) {
    return (
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
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className={`space-y-6 transition-opacity duration-300 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="text-center space-y-3 pt-2">
          <div className={`inline-flex items-center gap-3 px-5 py-1.5 ${config.badgeColor} rounded-full text-[10px] font-black uppercase tracking-[0.3em] border`}>
            <i className={config.badgeIcon}></i>
            {config.badge}
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-teal-950 tracking-tighter uppercase lg:text-4xl">{config.title}</h2>
            <p className="text-teal-800/60 max-w-xl mx-auto text-xs font-bold leading-relaxed uppercase tracking-[0.3em]">{config.subtitle}</p>
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
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 overflow-hidden ring-1 ring-teal-50">
            <div className="flex bg-slate-50/50 p-1.5 border-b border-teal-50">
              {config.inputTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); clearFiles(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-all rounded-2xl ${
                    activeTab === tab.id ? 'text-teal-900 bg-white shadow-md border border-teal-50' : 'text-slate-400 hover:text-teal-800'
                  }`}
                >
                  <i className={`${tab.icon} text-sm`}></i> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'text' ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-3 ml-2">Observations & Notes</label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Verbatim clinical responses or clinical notes..."
                      className="w-full h-48 md:h-64 p-6 rounded-[2rem] border border-teal-50 bg-teal-50/5 focus:bg-white focus:ring-8 focus:ring-teal-50/50 focus:border-teal-200 resize-none transition-all placeholder:text-teal-800/10 outline-none text-teal-950 font-medium text-sm leading-relaxed shadow-inner"
                      disabled={isProcessing}
                    />
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-2">{activeTab === 'audio' ? 'Audio Recording' : 'Intake Form'}</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-[2.5rem] p-10 md:p-12 flex flex-col items-center justify-center transition-all cursor-pointer group ${
                        files.length > 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 hover:border-teal-400 hover:bg-teal-50/30'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept={getAcceptForTab()}
                        multiple
                        className="hidden"
                      />
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-md transition-all ${
                        files.length > 0 ? 'bg-emerald-600 text-white ring-4 ring-emerald-50 shadow-xl' : 'bg-white text-teal-100 ring-1 ring-teal-50 group-hover:scale-110 group-hover:text-teal-600'
                      }`}>
                        <i className={`${files.length > 0 ? 'fa-solid fa-check' : (activeTab === 'audio' ? 'fa-solid fa-microphone' : 'fa-solid fa-file-arrow-up')} text-2xl`}></i>
                      </div>
                      <p className="text-lg font-black text-teal-950 uppercase tracking-tight">
                        {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''} Selected` : getUploadLabel()}
                      </p>
                      <p className="text-teal-800/30 font-bold mt-1 uppercase tracking-[0.2em] text-[10px]">
                        {files.length > 0 ? 'Click to add more' : getUploadHint()}
                      </p>
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {files.map((f, index) => (
                          <div key={index} className="flex items-center justify-between bg-teal-50/50 border border-teal-100/50 rounded-2xl px-5 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                                <i className={`fa-solid ${f.mimeType.startsWith('audio/') ? 'fa-waveform' : f.mimeType.startsWith('image/') ? 'fa-image' : 'fa-file-pdf'} text-teal-700 text-xs`}></i>
                              </div>
                              <span className="text-xs font-bold text-teal-900 truncate">{f.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-300 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all shrink-0"
                            >
                              <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={clearFiles}
                          className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest flex items-center gap-2 py-2 px-4 rounded-xl hover:bg-red-50 transition-all mx-auto"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                          Remove All
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || (activeTab === 'text' && !text.trim()) || ((activeTab === 'file' || activeTab === 'audio') && files.length === 0)}
                  className={`w-full py-4 md:py-6 rounded-[2rem] font-black text-xs md:text-sm uppercase tracking-[0.2em] text-white shadow-2xl transition-all flex items-center justify-center gap-4 overflow-hidden relative group ${
                    isProcessing
                      ? 'bg-teal-100 cursor-not-allowed text-teal-800/30'
                      : 'bg-teal-900 hover:bg-black hover:-translate-y-1 shadow-teal-900/20 active:translate-y-0'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <i className="fa-solid fa-dna animate-spin text-lg"></i>
                      SYNTHESIZING...
                    </>
                  ) : (
                    <>
                      <i className={`${config.buttonIcon} text-teal-400 text-lg group-hover:scale-125 transition-transform`}></i>
                      {config.buttonLabel}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
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
  );
};
