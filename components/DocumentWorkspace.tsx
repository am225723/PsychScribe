import React, { useState, useRef, useEffect } from 'react';
import { ReportView } from './ReportView';
import { FileData } from '../types';
import { ReportTab } from '../App';
import type { AnalysisMetadata } from '../services/geminiService';
import { getPatients, getFullName } from '../services/supabaseService';
import type { Patient } from '../services/supabaseService';

export type DocumentType = 'summary' | 'treatment' | 'darp';

interface DocumentWorkspaceProps {
  documentType: DocumentType;
  report: string | null;
  isProcessing: boolean;
  isDriveLinked: boolean;
  linkedEmail: string | null;
  accessToken: string | null;
  onProcess: (input: string | FileData[], metadata?: AnalysisMetadata) => void;
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

const DOC_TYPE_LABELS: Record<DocumentType, { label: string; color: string; bg: string }> = {
  summary: { label: 'Intake', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  treatment: { label: 'Treatment', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  darp: { label: 'DARP', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
};

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({
  documentType,
  report,
  isProcessing,
  isDriveLinked,
  linkedEmail,
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
  const [clientId, setClientId] = useState('');
  const [dateOfService, setDateOfService] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPatients().then(setPatients).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPatients = patients.filter(p => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    const fullName = getFullName(p).toLowerCase();
    return fullName.includes(q) || (p.client_id || '').toLowerCase().includes(q);
  });

  const selectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setPatientSearch(getFullName(patient));
    setClientId(patient.client_id || '');
    setShowPatientDropdown(false);
  };

  const clearPatientSelection = () => {
    setSelectedPatientId('');
    setPatientSearch('');
    setClientId('');
  };

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
            docTypes: { summary: documentType === 'summary', treatment: documentType === 'treatment', darp: documentType === 'darp' },
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

  const toggleFileDocType = (fileIndex: number, docType: DocumentType) => {
    setFiles(prev => prev.map((f, i) => {
      if (i !== fileIndex) return f;
      const current = f.docTypes || { summary: false, treatment: false, darp: false };
      return { ...f, docTypes: { ...current, [docType]: !current[docType] } };
    }));
  };

  const filesForCurrentType = files.filter(f => f.docTypes?.[documentType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const metadata: AnalysisMetadata | undefined = (documentType === 'treatment' || documentType === 'darp') && (clientId.trim() || dateOfService.trim())
      ? { clientId: clientId.trim() || undefined, dateOfService: dateOfService.trim() || undefined }
      : undefined;
    if (activeTab === 'text' && text.trim()) {
      onProcess(text, metadata);
    } else if ((activeTab === 'file' || activeTab === 'audio') && filesForCurrentType.length > 0) {
      onProcess(filesForCurrentType, metadata);
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
          accessToken={accessToken}
          documentType={documentType}
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
                <div className="bg-teal-50/30 rounded-[2rem] border border-teal-100/50 p-6 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center">
                      <i className="fa-solid fa-user-doctor text-teal-700 text-xs"></i>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/50">Patient Selection</span>
                  </div>
                  <div className="relative" ref={patientDropdownRef}>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={(e) => {
                            setPatientSearch(e.target.value);
                            setSelectedPatientId('');
                            setShowPatientDropdown(true);
                          }}
                          onFocus={() => setShowPatientDropdown(true)}
                          placeholder="Search by name or Client ID..."
                          className="w-full px-5 py-3 rounded-xl border border-teal-100 bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15 transition-all pr-10"
                          disabled={isProcessing}
                        />
                        {selectedPatientId && (
                          <button
                            type="button"
                            onClick={clearPatientSelection}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        )}
                      </div>
                    </div>
                    {showPatientDropdown && filteredPatients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-teal-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {filteredPatients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selectPatient(p)}
                            className={`w-full text-left px-5 py-3 hover:bg-teal-50 transition-colors flex items-center justify-between gap-3 ${
                              selectedPatientId === p.id ? 'bg-teal-50' : ''
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-sm font-bold text-teal-950 block truncate">{getFullName(p)}</span>
                              {p.client_id && (
                                <span className="text-[10px] text-teal-600 font-semibold">ID: {p.client_id}</span>
                              )}
                            </div>
                            {selectedPatientId === p.id && (
                              <i className="fa-solid fa-check text-teal-600 shrink-0"></i>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {showPatientDropdown && patientSearch.trim() && filteredPatients.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-teal-100 rounded-xl shadow-xl p-4">
                        <p className="text-xs text-slate-400 font-semibold text-center">No patients found</p>
                      </div>
                    )}
                  </div>
                  {selectedPatientId && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(() => {
                        const p = patients.find(pt => pt.id === selectedPatientId);
                        if (!p) return null;
                        return (
                          <>
                            {p.client_id && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-bold text-emerald-700">
                                <i className="fa-solid fa-id-card"></i> {p.client_id}
                              </span>
                            )}
                            {p.dob && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                                <i className="fa-solid fa-calendar"></i> DOB: {p.dob}
                              </span>
                            )}
                            {p.email && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                                <i className="fa-solid fa-envelope"></i> {p.email}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

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
                        {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''} Uploaded` : getUploadLabel()}
                      </p>
                      <p className="text-teal-800/30 font-bold mt-1 uppercase tracking-[0.2em] text-[10px]">
                        {files.length > 0 ? 'Click to add more' : getUploadHint()}
                      </p>
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-3 mt-3">
                        <div className="flex items-center justify-between px-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40">
                            {filesForCurrentType.length} of {files.length} file{files.length !== 1 ? 's' : ''} assigned to {CONFIG[documentType].title}
                          </span>
                        </div>
                        {files.map((f, index) => (
                          <div key={index} className="bg-teal-50/50 border border-teal-100/50 rounded-2xl px-5 py-3 space-y-2">
                            <div className="flex items-center justify-between">
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
                            <div className="flex items-center gap-2 pl-11">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-teal-800/30 mr-1">Use for:</span>
                              {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((dt) => {
                                const isChecked = f.docTypes?.[dt] || false;
                                const label = DOC_TYPE_LABELS[dt];
                                return (
                                  <button
                                    key={dt}
                                    type="button"
                                    onClick={() => toggleFileDocType(index, dt)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                      isChecked
                                        ? `${label.bg} ${label.color}`
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                    }`}
                                  >
                                    <i className={`fa-solid ${isChecked ? 'fa-square-check' : 'fa-square'} text-xs`}></i>
                                    {label.label}
                                  </button>
                                );
                              })}
                            </div>
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

                {(documentType === 'treatment' || documentType === 'darp') && (
                  <div className="bg-teal-50/30 rounded-[2rem] border border-teal-100/50 p-6 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <i className="fa-solid fa-id-card text-emerald-700 text-xs"></i>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/50">Service Identification</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-2">Client ID Number</label>
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          placeholder="Enter Client ID..."
                          className="w-full px-5 py-3 rounded-xl border border-teal-100 bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15 transition-all"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-2">Date of Service</label>
                        <input
                          type="date"
                          value={dateOfService}
                          onChange={(e) => setDateOfService(e.target.value)}
                          className="w-full px-5 py-3 rounded-xl border border-teal-100 bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-200 outline-none text-teal-950 font-bold text-sm placeholder:text-teal-800/15 transition-all"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || (activeTab === 'text' && !text.trim()) || ((activeTab === 'file' || activeTab === 'audio') && filesForCurrentType.length === 0)}
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
