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

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
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
  }, []);

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
      const msg = err.message || "Failed to process the intake form.";
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
          <div className="max-w-5xl mx-auto space-y-6">
            <div className={`space-y-6 transition-opacity duration-300 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="text-center space-y-4 pt-6">
                <div className="relative group inline-block">
                  <div className="absolute inset-0 bg-teal-400 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  <img src={LOGO_URL} alt="Logo" className="w-28 h-28 mx-auto relative z-10 drop-shadow-2xl transition-transform group-hover:scale-110 duration-700" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-teal-950 tracking-tight uppercase">Intake Center</h2>
                  <p className="text-teal-800/60 max-w-sm mx-auto text-xs font-bold leading-relaxed uppercase tracking-widest">Evidence-based synthesis for integrative professionals.</p>
                </div>
              </div>

              {!hasApiKey && window.aistudio && (
                <div className="max-w-md mx-auto bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 shrink-0">
                      <i className="fa-solid fa-key text-[10px]"></i>
                    </div>
                    <div>
                      <h4 className="font-black text-amber-900 uppercase text-[9px] tracking-widest">Key Required</h4>
                    </div>
                  </div>
                  <button 
                    onClick={handleOpenKeySelector}
                    className="bg-amber-700 text-white px-4 py-2 rounded-lg font-black uppercase text-[8px] tracking-widest hover:bg-amber-800 transition-all shadow-sm"
                  >
                    Select Key
                  </button>
                </div>
              )}
              
              <div className="max-w-2xl mx-auto w-full">
                <IntakeForm onProcess={handleProcess} isProcessing={isProcessing} />
              </div>

              {error && (
                <div className="max-w-md mx-auto p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                  <div className="flex items-start gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-red-500 text-lg mt-0.5"></i>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black uppercase tracking-widest">{error.isQuota ? "Quota Exceeded" : "Error"}</p>
                      <p className="text-[9px] font-bold opacity-80 leading-tight">{error.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-5xl mx-auto">
            <ReportView report={report} activeTab={activeReportTab} />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FBFDFF] pb-24 overflow-x-hidden">
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
      
      <main className="flex-grow container mx-auto px-4 py-8 relative">
        {renderContent()}
      </main>

      <ProgressBar isProcessing={isProcessing} />
      <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
    </div>
  );
};

export default App;