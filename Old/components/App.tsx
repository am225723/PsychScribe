import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { IntakeForm } from './components/IntakeForm';
import { ReportView } from './components/ReportView';
import { ChatBot } from './components/ChatBot';
import { Documentation } from './components/Documentation';
import { SafetyProtocols } from './components/SafetyProtocols';
import { HipaaCompliance } from './components/HipaaCompliance';
import { Support } from './components/Support';
import { Vault } from './components/Vault';
import { ProgressBar } from './components/ProgressBar';
import { analyzeIntake } from './services/geminiService';
import { FileData } from './types';

export type Page = 'home' | 'vault' | 'docs' | 'safety' | 'hipaa' | 'support';
export type ReportTab = 'clinical-report' | 'extended-record' | 'treatment-plan' | 'pdf-view';

export interface ReportHistoryItem {
  id: string;
  patientName: string;
  initials: string;
  date: string;
  content: string;
  isUrgent: boolean;
}

const LOGO_URL = "https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/1769462247681_90103e28-cdb1-49a9-a4c1-176a3ec95df2-1_all_5851.png";
const STORAGE_KEY = 'integrative_psych_history_v1';

// Your Verified Client ID from Google Cloud Console
const CLIENT_ID = "817289217448-m8t3lh9263b4mnu9cdsh4ki9kflgb0d0.apps.googleusercontent.com"; 
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.file";

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
    gapi: any;
    google: any;
  }
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('clinical-report');
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; isQuota: boolean } | null>(null);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Google Drive State
  const [isDriveLinked, setIsDriveLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    // Init Google Identity Services
    const initGis = () => {
      if (window.google && window.google.accounts) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response: any) => {
              if (response.error !== undefined) {
                console.error("Auth error:", response);
                setError({ message: "Authentication Error: " + (response.error_description || "Request denied."), isQuota: false });
                setIsLinking(false);
                return;
              }
              setAccessToken(response.access_token);
              setIsDriveLinked(true);
              setLinkedEmail("support@drzelisko.com");
              setIsLinking(false);
            },
          });
          setTokenClient(client);
        } catch (err) {
          console.error("GIS initialization failed", err);
        }
      }
    };

    // Init Google API Client
    const initGapi = () => {
      if (window.gapi) {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: DISCOVERY_DOCS,
            });
          } catch (err) {
            console.error("GAPI initialization failed", err);
          }
        });
      }
    };

    // Retry logic for script loading
    const checkScripts = setInterval(() => {
      if (window.gapi && window.google?.accounts?.oauth2) {
        initGapi();
        initGis();
        clearInterval(checkScripts);
      }
    }, 500);
    
    return () => clearInterval(checkScripts);
  }, []);

  const handleLinkDrive = () => {
    if (!tokenClient) {
      setError({ message: "Cloud sync library not yet ready. Please wait 2 seconds.", isQuota: false });
      return;
    }
    setIsLinking(true);
    // requestAccessToken starts the popup flow
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleUnlinkDrive = () => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setIsDriveLinked(false);
        setLinkedEmail(null);
        setAccessToken(null);
      });
    } else {
      setIsDriveLinked(false);
      setLinkedEmail(null);
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setError(null);
    }
  };

  const saveToHistory = (content: string) => {
    const nameMatch = content.match(/PATIENT_NAME:\s*(.*)/i);
    const patientName = nameMatch ? nameMatch[1].trim() : "Unknown Patient";
    const initials = patientName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 3);

    const newItem: ReportHistoryItem = {
      id: Date.now().toString(),
      patientName,
      initials,
      date: new Date().toLocaleDateString(),
      content,
      isUrgent: content.includes('🚨')
    };

    const updated = [newItem, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleProcess = useCallback(async (input: string | FileData) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = typeof input === 'string' 
        ? await analyzeIntake(input)
        : await analyzeIntake({ mimeType: input.mimeType, data: input.base64 });

      setReport(result);
      setActiveReportTab('clinical-report');
      saveToHistory(result);
      setCurrentPage('home');
    } catch (err: any) {
      const msg = err.message || "Synthesis failed. Please verify intake data quality.";
      const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Requested entity was not found');
      setError({ message: msg, isQuota });
    } finally {
      setIsProcessing(false);
    }
  }, [history]);

  const handleReset = () => {
    setReport(null);
    setError(null);
    setCurrentPage('home');
  };

  const openPastReport = (item: ReportHistoryItem) => {
    setReport(item.content);
    setActiveReportTab('clinical-report');
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'docs': return <Documentation />;
      case 'safety': return <SafetyProtocols />;
      case 'hipaa': return <HipaaCompliance />;
      case 'support': return <Support />;
      case 'vault': return <Vault history={history} onOpenReport={openPastReport} onDeleteReport={deleteHistoryItem} />;
      default:
        return !report ? (
          <div className="max-w-7xl mx-auto space-y-12">
            <div className={`space-y-12 transition-opacity duration-300 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="text-center space-y-6 pt-10">
                <div className="relative group inline-block">
                  <div className="absolute inset-0 bg-teal-400 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  <img src={LOGO_URL} alt="Dr. Zelisko Logo" className="w-32 h-32 mx-auto relative z-10 drop-shadow-2xl transition-transform group-hover:scale-110 duration-700" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-5xl font-black text-teal-950 tracking-tighter uppercase lg:text-6xl">Dr. Zelisko Intake</h2>
                  <p className="text-teal-800/60 max-w-xl mx-auto text-sm font-bold leading-relaxed uppercase tracking-[0.4em]">Clinical Synthesis Engine: drz.services</p>
                </div>
              </div>

              <div className="max-w-4xl mx-auto px-4 grid md:grid-cols-2 gap-6">
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
                      onClick={handleOpenKeySelector}
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
                      onClick={handleLinkDrive}
                      disabled={isLinking}
                      className="bg-teal-950 text-teal-50 px-6 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 disabled:opacity-50"
                    >
                      {isLinking ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-link"></i>}
                      {isLinking ? 'Authenticating' : 'Link Drive'}
                    </button>
                  ) : (
                    <button 
                      onClick={handleUnlinkDrive}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-all p-3 rounded-xl"
                      title="Disconnect Drive"
                    >
                      <i className="fa-solid fa-link-slash"></i>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="max-w-4xl mx-auto w-full px-4">
                <IntakeForm onProcess={handleProcess} isProcessing={isProcessing} />
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
              onLinkDrive={handleLinkDrive}
              onUnlinkDrive={handleUnlinkDrive}
              isLinking={isLinking}
              accessToken={accessToken}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FBFDFF] pb-32 overflow-x-hidden">
      <Header 
        onNavigate={setCurrentPage} 
        currentPage={currentPage} 
        history={history} 
        onSelectHistoryItem={openPastReport}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        reportActive={!!report}
        activeReportTab={activeReportTab}
        onSelectReportTab={setActiveReportTab}
        onReset={handleReset}
      />
      
      <main className="flex-grow container mx-auto px-4 lg:px-10 py-12 relative">
        {renderContent()}
      </main>

      <ProgressBar isProcessing={isProcessing} />
      <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
    </div>
  );
};

export default App;