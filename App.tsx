import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DocumentWorkspace } from './components/DocumentWorkspace';
import { Vault } from './components/Vault';
import { BatchProcessing } from './components/BatchProcessing';
import { Documentation } from './components/Documentation';
import { Preceptor } from './components/Preceptor';
import { SafetyProtocols } from './components/SafetyProtocols';
import { HipaaCompliance } from './components/HipaaCompliance';
import { Support } from './components/Support';
import { ProgressBar } from './components/ProgressBar';
import { ChatBot } from './components/ChatBot';
import { Login } from './components/Login';
import { MfaChallenge } from './components/MfaChallenge';
import { MfaEnroll } from './components/MfaEnroll';
import { analyzeIntake } from './services/geminiService';
import { supabase, findOrCreatePatient, saveReport, getReports, deleteReport as deleteReportDb } from './services/supabaseService';
import type { Report } from './services/supabaseService';
import { FileData } from './types';
import type { DocumentType, AnalysisMetadata } from './services/geminiService';
import type { Session } from '@supabase/supabase-js';

export type Page = 'home' | 'vault' | 'batch' | 'preceptor' | 'safety' | 'hipaa' | 'support';
export type ReportTab = 'clinical-report' | 'extended-record' | 'treatment-plan' | 'pdf-view' | 'darp-data' | 'darp-assessment' | 'darp-response' | 'darp-plan' | 'darp-icd10' | 'darp-cpt';

export interface ReportHistoryItem {
  id: string;
  patientName: string;
  initials: string;
  date: string;
  content: string;
  isUrgent: boolean;
  documentType?: string;
}

const CLIENT_ID = "817289217448-m8t3lh9263b4mnu9cdsh4ki9kflgb0d0.apps.googleusercontent.com"; 
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive";

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

function reportToHistoryItem(report: Report): ReportHistoryItem {
  const patient = report.patient;
  return {
    id: report.id,
    patientName: patient?.full_name || 'Unknown Patient',
    initials: patient?.initials || 'XX',
    date: new Date(report.created_at).toLocaleDateString(),
    content: report.content,
    isUrgent: report.is_urgent,
    documentType: report.document_type,
  };
}

type AuthState = 'loading' | 'unauthenticated' | 'mfa_challenge' | 'mfa_enroll_prompt' | 'authenticated';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [session, setSession] = useState<Session | null>(null);

  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('clinical-report');
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [currentDocType, setCurrentDocType] = useState<DocumentType>('summary');
  const [error, setError] = useState<{ message: string; isQuota: boolean } | null>(null);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [isDriveLinked, setIsDriveLinked] = useState(() => !!localStorage.getItem('drive_access_token'));
  const [isLinking, setIsLinking] = useState(false);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(() => localStorage.getItem('drive_linked_email'));
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('drive_access_token'));
  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    let handled = false;

    const resolve = (state: AuthState, sess?: any) => {
      if (sess !== undefined) setSession(sess);
      if (!handled) {
        handled = true;
        setAuthState(state);
      } else {
        setAuthState(state);
      }
    };

    const checkMfa = async (): Promise<AuthState> => {
      try {
        const result = await Promise.race([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        const aal = (result as any)?.data;
        if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
          return 'mfa_challenge';
        }
        return 'authenticated';
      } catch {
        return 'authenticated';
      }
    };

    const init = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ]);
        const currentSession = (sessionResult as any)?.data?.session;
        if (!currentSession) {
          resolve('unauthenticated');
          return;
        }
        setSession(currentSession);
        const mfaState = await checkMfa();
        resolve(mfaState);
      } catch {
        resolve('unauthenticated');
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!newSession) {
        resolve('unauthenticated', null);
        return;
      }
      setSession(newSession);
      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
        const mfaState = await checkMfa();
        resolve(mfaState);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTotp = factors?.totp?.some(f => f.status === 'verified');
    if (!hasVerifiedTotp) {
      setAuthState('mfa_enroll_prompt');
    } else {
      setAuthState('authenticated');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthState('unauthenticated');
    setHistory([]);
    setReport(null);
    navigate('/');
  };

  const loadHistory = async () => {
    try {
      const reports = await getReports({ sortBy: 'newest' });
      setHistory(reports.map(reportToHistoryItem));
    } catch (e) {
      console.error("Failed to load history from database:", e);
    }
  };

  useEffect(() => {
    if (authState !== 'authenticated') return;
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
    loadHistory();

    const initGis = () => {
      if (window.google && window.google.accounts) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (response: any) => {
              if (response.error !== undefined) {
                console.error("Auth error:", response);
                setError({ message: "Authentication Error: " + (response.error_description || "Request denied."), isQuota: false });
                setIsLinking(false);
                return;
              }
              const token = response.access_token;
              setAccessToken(token);
              setIsDriveLinked(true);
              localStorage.setItem('drive_access_token', token);

              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: { Authorization: 'Bearer ' + token }
                });
                const info = await res.json();
                const email = info.email || 'support@drzelisko.com';
                setLinkedEmail(email);
                localStorage.setItem('drive_linked_email', email);
              } catch {
                setLinkedEmail('support@drzelisko.com');
                localStorage.setItem('drive_linked_email', 'support@drzelisko.com');
              }
              setIsLinking(false);
            },
          });
          setTokenClient(client);
        } catch (err) {
          console.error("GIS initialization failed", err);
        }
      }
    };

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

    const checkScripts = setInterval(() => {
      if (window.gapi && window.google?.accounts?.oauth2) {
        initGapi();
        initGis();
        clearInterval(checkScripts);
      }
    }, 500);
    
    return () => clearInterval(checkScripts);
  }, [authState]);

  useEffect(() => {
    const workspaceRoutes = ['/summary', '/treatment', '/darp'];
    if (workspaceRoutes.includes(location.pathname) && report) {
      setReport(null);
      setError(null);
    }
  }, [location.pathname]);

  const handleLinkDrive = () => {
    if (!tokenClient) {
      setError({ message: "Cloud sync library not yet ready. Please wait 2 seconds.", isQuota: false });
      return;
    }
    setIsLinking(true);
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setError(null);
    }
  };

  const saveToHistory = async (content: string, docType: DocumentType) => {
    const nameMatch = content.match(/PATIENT_NAME:\s*(.*)/i);
    const patientName = nameMatch ? nameMatch[1].trim().replace(/\*+/g, '') : "Unknown Patient";

    const clientIdMatch = content.match(/CLIENT_ID:\s*(.*)/i);
    const clientId = clientIdMatch ? clientIdMatch[1].trim().replace(/\*+/g, '') : undefined;

    const dobMatch = content.match(/DOB:\s*(.*)/i);
    const dob = dobMatch ? dobMatch[1].trim().replace(/\*+/g, '') : undefined;

    try {
      const patient = await findOrCreatePatient(patientName, dob, clientId);
      const savedReport = await saveReport(patient.id, docType, content, content.includes('🚨'));
      const newItem = reportToHistoryItem(savedReport);
      setHistory(prev => [newItem, ...prev]);
    } catch (e) {
      console.error("Failed to save to database, falling back to local:", e);
      const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      const newItem: ReportHistoryItem = {
        id: Date.now().toString(),
        patientName,
        initials,
        date: new Date().toLocaleDateString(),
        content,
        isUrgent: content.includes('🚨'),
        documentType: docType,
      };
      setHistory(prev => [newItem, ...prev]);
    }
  };

  const createProcessHandler = (docType: DocumentType) => {
    return async (input: string | FileData[], metadata?: AnalysisMetadata) => {
      setIsProcessing(true);
      setError(null);
      
      try {
        const result = typeof input === 'string' 
          ? await analyzeIntake(input, docType, metadata)
          : await analyzeIntake(input.map(f => ({ mimeType: f.mimeType, data: f.base64 })), docType, metadata);

        setReport(result);
        setCurrentDocType(docType);
        setActiveReportTab(docType === 'darp' ? 'darp-data' : 'clinical-report');
        await saveToHistory(result, docType);
      } catch (err: any) {
        const msg = err.message || "Synthesis failed. Please verify intake data quality.";
        const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Requested entity was not found');
        setError({ message: msg, isQuota });
      } finally {
        setIsProcessing(false);
      }
    };
  };

  const handleReset = () => {
    setReport(null);
    setError(null);
    navigate('/');
  };

  const openPastReport = (item: ReportHistoryItem) => {
    setReport(item.content);
    const docType = item.documentType || 'summary';
    setCurrentDocType(docType as DocumentType);
    setActiveReportTab(docType === 'darp' ? 'darp-data' : 'clinical-report');
    const route = docType === 'treatment' ? '/treatment' : docType === 'darp' ? '/darp' : '/summary';
    navigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteReportDb(id);
    } catch (err) {
      console.error("Failed to delete from database:", err);
    }
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const workspaceProps = {
    isProcessing,
    isDriveLinked,
    linkedEmail,
    accessToken,
    error,
    activeReportTab,
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <i className="fa-solid fa-circle-notch animate-spin text-teal-600 text-3xl"></i>
          <p className="font-bold text-teal-800/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <Login
        onLogin={handleLoginSuccess}
        onMfaRequired={() => setAuthState('mfa_challenge')}
      />
    );
  }

  if (authState === 'mfa_challenge') {
    return (
      <MfaChallenge
        onVerified={() => setAuthState('authenticated')}
        onCancel={() => setAuthState('unauthenticated')}
      />
    );
  }

  if (authState === 'mfa_enroll_prompt') {
    return (
      <MfaEnroll
        onComplete={() => setAuthState('authenticated')}
        onSkip={() => setAuthState('authenticated')}
      />
    );
  }

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
        hasApiKey={hasApiKey}
        isDriveLinked={isDriveLinked}
        linkedEmail={linkedEmail}
        onLinkDrive={handleLinkDrive}
        isLinking={isLinking}
        onSignOut={handleSignOut}
        userEmail={session?.user?.email || null}
      />
      
      <main className="flex-grow container mx-auto px-4 lg:px-10 py-12 relative">
        <Routes>
          <Route path="/" element={<Dashboard isDriveLinked={isDriveLinked} accessToken={accessToken} />} />
          <Route path="/summary" element={
            <DocumentWorkspace
              documentType="summary"
              report={report}
              onProcess={createProcessHandler('summary')}
              {...workspaceProps}
            />
          } />
          <Route path="/treatment" element={
            <DocumentWorkspace
              documentType="treatment"
              report={report}
              onProcess={createProcessHandler('treatment')}
              {...workspaceProps}
            />
          } />
          <Route path="/darp" element={
            <DocumentWorkspace
              documentType="darp"
              report={report}
              onProcess={createProcessHandler('darp')}
              {...workspaceProps}
            />
          } />
          <Route path="/vault" element={
            <Vault
              history={history}
              onOpenReport={openPastReport}
              onDeleteReport={deleteHistoryItem}
              onRefresh={loadHistory}
            />
          } />
          <Route path="/batch" element={
            <BatchProcessing
              isDriveLinked={isDriveLinked}
              accessToken={accessToken}
              onComplete={loadHistory}
            />
          } />
          <Route path="/preceptor" element={<Preceptor />} />
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
