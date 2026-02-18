import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { Vault } from './components/Vault';
import { Documentation } from './components/Documentation';
import { SafetyProtocols } from './components/SafetyProtocols';
import { HipaaCompliance } from './components/HipaaCompliance';
import { Support } from './components/Support';
import { ProgressBar } from './components/ProgressBar';
import { ChatBot } from './components/ChatBot';
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
  const navigate = useNavigate();
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
      navigate('/');
    } catch (err: any) {
      const msg = err.message || "Synthesis failed. Please verify intake data quality.";
      const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Requested entity was not found');
      setError({ message: msg, isQuota });
    } finally {
      setIsProcessing(false);
    }
  }, [history, navigate]);

  const handleReset = () => {
    setReport(null);
    setError(null);
    navigate('/');
  };

  const openPastReport = (item: ReportHistoryItem) => {
    setReport(item.content);
    setActiveReportTab('clinical-report');
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FBFDFF] pb-32 overflow-x-hidden">
      <Header 
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
        <Routes>
          <Route path="/" element={
            <Home
              report={report}
              isProcessing={isProcessing}
              hasApiKey={hasApiKey}
              onOpenKeySelector={handleOpenKeySelector}
              isDriveLinked={isDriveLinked}
              linkedEmail={linkedEmail}
              onLinkDrive={handleLinkDrive}
              onUnlinkDrive={handleUnlinkDrive}
              isLinking={isLinking}
              accessToken={accessToken}
              onProcess={handleProcess}
              error={error}
              activeReportTab={activeReportTab}
            />
          } />
          <Route path="/vault" element={
            <Vault
              history={history}
              onOpenReport={openPastReport}
              onDeleteReport={deleteHistoryItem}
            />
          } />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/safety" element={<SafetyProtocols />} />
          <Route path="/hipaa" element={<HipaaCompliance />} />
          <Route path="/support" element={<Support />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <ProgressBar isProcessing={isProcessing} />
      <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
    </div>
  );
};

export default App;
