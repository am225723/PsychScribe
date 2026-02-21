import React, { useEffect, useRef, useState } from 'react';
import type { Chat } from '@google/genai';
import {
  generateFinalCaseReview,
  generateLensDifferencesExplainer,
  PRECEPTOR_LENS_NAMES,
  preceptorAnalyze,
  startPreceptorChat,
} from '../services/geminiService';
import {
  clearStoredDirectoryHandle,
  generatePreceptorBundlePdf,
  getOrRequestPatientsParentDirectoryHandle,
  savePdfToDirectory,
  supportsFileSystemAccess,
  triggerBrowserDownload,
} from '../services/preceptorPdfService';
import type { VaultItem } from '../services/vaultService';
import { PreceptorBatch } from './PreceptorBatch';

type Phase = 'upload' | 'processing' | 'review' | 'chat';
type Mode = 'single' | 'batch';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface PreceptorProps {
  initialVaultItem?: VaultItem | null;
  onSaveVaultItem?: (item: VaultItem) => void;
}

const LENS_ICONS = ['fa-heart-pulse', 'fa-scale-balanced', 'fa-seedling'];

function sanitizeNamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

function defaultPatientFolder(lastName: string, firstInitial: string): string {
  const cleanLast = sanitizeNamePart(lastName) || 'Unknown';
  const cleanInitial = (sanitizeNamePart(firstInitial)[0] || 'X').toUpperCase();
  return `${cleanLast}_${cleanInitial}`;
}

function getTabBadgeColor(tabIndex: number): string {
  if (tabIndex === 4) return 'bg-amber-100 text-amber-700';
  if (tabIndex === 2) return 'bg-indigo-100 text-indigo-700';
  if (tabIndex === 3) return 'bg-emerald-100 text-emerald-700';
  return 'bg-teal-100 text-teal-700';
}

export const Preceptor: React.FC<PreceptorProps> = ({ initialVaultItem, onSaveVaultItem }) => {
  const [mode, setMode] = useState<Mode>('single');
  const [phase, setPhase] = useState<Phase>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState('');
  const [reviews, setReviews] = useState<string[]>([]);
  const [lensExplainer, setLensExplainer] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [processing, setProcessing] = useState<number>(-1);
  const [error, setError] = useState('');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const [finalReview, setFinalReview] = useState('');

  const [patientFirstInitial, setPatientFirstInitial] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [patientFolderName, setPatientFolderName] = useState('');

  const [patientsParentHandle, setPatientsParentHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [autoSaveToFolder, setAutoSaveToFolder] = useState(supportsFileSystemAccess());
  const [exportMessage, setExportMessage] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportsFS = supportsFileSystemAccess();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!initialVaultItem || initialVaultItem.documentType !== 'preceptor') return;

    setMode('single');
    setFiles([]);
    setTextInput(initialVaultItem.sourceText || '');
    setReviews(initialVaultItem.lensReviews || []);
    setFinalReview(initialVaultItem.finalReview || initialVaultItem.generatedText || '');
    setLensExplainer(initialVaultItem.lensExplainer || '');
    setPatientFirstInitial((initialVaultItem.patient?.firstInitial || '').toUpperCase().slice(0, 1));
    setPatientLastName(initialVaultItem.patient?.lastName || '');
    setPatientFolderName(
      initialVaultItem.patient?.folderName ||
      defaultPatientFolder(initialVaultItem.patient?.lastName || '', initialVaultItem.patient?.firstInitial || ''),
    );
    setActiveTab(initialVaultItem.finalReview || initialVaultItem.generatedText ? 4 : 0);
    setPhase('review');
    setError('');
    setExportMessage('Vault item loaded. Upload step was bypassed.');
  }, [initialVaultItem]);

  const handleFirstInitialChange = (next: string) => {
    const clean = next.toUpperCase().slice(0, 1);
    const currentDefault = defaultPatientFolder(patientLastName, patientFirstInitial || 'X');
    const shouldSyncFolder = !patientFolderName || patientFolderName === currentDefault;

    setPatientFirstInitial(clean);
    if (shouldSyncFolder) {
      setPatientFolderName(defaultPatientFolder(patientLastName, clean));
    }
  };

  const handleLastNameChange = (next: string) => {
    const currentDefault = defaultPatientFolder(patientLastName, patientFirstInitial || 'X');
    const shouldSyncFolder = !patientFolderName || patientFolderName === currentDefault;

    setPatientLastName(next);
    if (shouldSyncFolder) {
      setPatientFolderName(defaultPatientFolder(next, patientFirstInitial || 'X'));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const readFileAsBase64 = (file: File): Promise<{ mimeType: string; data: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({ mimeType: file.type, data: base64 });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const setPatientsFolder = async () => {
    try {
      const handle = await getOrRequestPatientsParentDirectoryHandle();
      setPatientsParentHandle(handle);
      if (handle) {
        setExportMessage('Patients parent folder set. Auto-save is ready.');
      }
    } catch (err: any) {
      setExportMessage(err?.message || 'Failed to set patients folder.');
    }
  };

  const clearFolderPermission = async () => {
    await clearStoredDirectoryHandle();
    setPatientsParentHandle(null);
    setExportMessage('Stored folder permission cleared.');
  };

  const buildVaultItem = (
    lenses: string[],
    finalText: string,
    explainer: string,
    sourceText: string,
  ): VaultItem => ({
    id: `preceptor-${Date.now()}`,
    createdAt: new Date().toISOString(),
    documentType: 'preceptor',
    patient: {
      firstInitial: patientFirstInitial,
      lastName: patientLastName,
      folderName: patientFolderName || defaultPatientFolder(patientLastName, patientFirstInitial),
    },
    sourceText,
    generatedText: finalText,
    lensReviews: lenses,
    finalReview: finalText,
    lensExplainer: explainer,
    title: 'Dr. Zelisko — Preceptor Case Review Bundle',
  });

  const exportBundlePdf = async (
    lensesInput = reviews,
    finalInput = finalReview,
    explainerInput = lensExplainer,
  ) => {
    if (lensesInput.length < 3 || !finalInput) {
      setExportMessage('Bundle export requires all three lens reviews and final synthesis.');
      return;
    }

    const lensResults = PRECEPTOR_LENS_NAMES.map((name, index) => ({
      name,
      content: lensesInput[index] || '',
    }));

    const folderName = patientFolderName || defaultPatientFolder(patientLastName, patientFirstInitial);
    const { doc, filename, pdfBytes } = generatePreceptorBundlePdf({
      patientFirstInitial,
      patientLastName,
      date: new Date(),
      lensExplainer: explainerInput,
      lenses: lensResults,
      finalReview: finalInput,
      title: 'Dr. Zelisko — Preceptor Case Review Bundle',
    });

    triggerBrowserDownload(doc, filename);

    if (autoSaveToFolder && supportsFS) {
      // Browser apps need explicit user-granted permission before writing to local folders.
      let handle = patientsParentHandle;
      if (!handle) {
        handle = await getOrRequestPatientsParentDirectoryHandle();
        setPatientsParentHandle(handle);
      }

      if (handle) {
        const savedPath = await savePdfToDirectory({
          pdfBytes,
          filename,
          patientsParentDirHandle: handle,
          patientFolderName: folderName,
        });
        setExportMessage(`Downloaded and saved to ${savedPath}`);
      } else {
        setExportMessage('Downloaded only. Folder permission not granted.');
      }
    } else {
      setExportMessage(
        supportsFS
          ? 'Downloaded only. Auto-save is disabled.'
          : 'Downloaded only (Auto-save unavailable in this browser).',
      );
    }
  };

  const handleGenerate = async () => {
    if (files.length === 0 && !textInput.trim()) {
      setError('Please upload case material or paste case text.');
      return;
    }
    if (!patientFirstInitial.trim() || !patientLastName.trim()) {
      setError('Patient first initial and last name are required for filename and folder save.');
      return;
    }

    setError('');
    setExportMessage('');
    setPhase('processing');

    try {
      let content: string | { mimeType: string; data: string }[];
      if (files.length > 0) {
        content = await Promise.all(files.map(readFileAsBase64));
      } else {
        content = textInput;
      }

      const newReviews: string[] = [];

      for (let i = 0; i < 3; i++) {
        setProcessing(i);
        const result = await preceptorAnalyze(content, i);
        newReviews.push(result);
      }

      setProcessing(3);
      const synthesizedFinal = await generateFinalCaseReview(newReviews);

      setProcessing(4);
      const differencesExplainer = await generateLensDifferencesExplainer(newReviews);

      setReviews(newReviews);
      setFinalReview(synthesizedFinal);
      setLensExplainer(differencesExplainer);

      setProcessing(5);
      await exportBundlePdf(newReviews, synthesizedFinal, differencesExplainer);

      const sourceText = typeof content === 'string' ? content : '';
      onSaveVaultItem?.(buildVaultItem(newReviews, synthesizedFinal, differencesExplainer, sourceText));

      setProcessing(-1);
      setActiveTab(4);
      setPhase('review');
    } catch (err: any) {
      setError(err?.message || 'Failed to generate case review bundle.');
      setPhase('upload');
      setProcessing(-1);
    }
  };

  const startChat = () => {
    if (reviews.length < 3) return;

    if (!chatInstance) {
      const chat = startPreceptorChat(reviews);
      setChatInstance(chat);
      setChatMessages([
        {
          role: 'assistant',
          text: `I can help compare the three lens reviews, tighten sections, and refine the final synthesis.\n\nWhat would you like to improve first?`,
        },
      ]);
    }

    setPhase('chat');
  };

  const compileFinalReview = async () => {
    if (!chatInstance || chatSending) return;
    const compileMsg = 'Refine the final case review using the strongest content from all three lenses. Keep it concise and clinically actionable.';
    setChatMessages((prev) => [...prev, { role: 'user', text: compileMsg }]);
    setChatSending(true);

    try {
      const response = await chatInstance.sendMessage({ message: compileMsg });
      const text = response.text || 'No response generated.';
      setChatMessages((prev) => [...prev, { role: 'assistant', text }]);
      setFinalReview(text);
      setActiveTab(4);
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setChatSending(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !chatInstance || chatSending) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setChatSending(true);

    try {
      const response = await chatInstance.sendMessage({ message: userMsg });
      const text = response.text || 'No response generated.';
      setChatMessages((prev) => [...prev, { role: 'assistant', text }]);
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setChatSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const resetAll = () => {
    setPhase('upload');
    setFiles([]);
    setTextInput('');
    setReviews([]);
    setLensExplainer('');
    setActiveTab(0);
    setError('');
    setChatMessages([]);
    setChatInput('');
    setChatInstance(null);
    setFinalReview('');
    setProcessing(-1);
    setExportMessage('');
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\[SECTION_\d+\]/g, '')
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-black text-teal-900 mt-6 mb-2 uppercase tracking-tight">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-base font-bold text-teal-800 mt-4 mb-1">{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('- **')) {
          const parts = line.replace('- **', '').split('**');
          return (
            <div key={i} className="flex gap-2 ml-4 my-1">
              <span className="text-teal-400 mt-1">&#8226;</span>
              <span className="text-sm text-slate-700">
                <strong className="text-teal-900">{parts[0]}</strong>
                {parts.slice(1).join('')}
              </span>
            </div>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 ml-4 my-1">
              <span className="text-teal-400 mt-1">&#8226;</span>
              <span className="text-sm text-slate-700">{line.replace('- ', '')}</span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-2" />;
        const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-teal-900">$1</strong>');
        return <p key={i} className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
      });
  };

  const processingStages = [
    ...PRECEPTOR_LENS_NAMES,
    'Final Case Review',
    'Lens Differences Explainer',
    'Bundle PDF Export',
  ];

  const tabItems = [
    { label: 'Lens Differences', icon: 'fa-diagram-project' },
    ...PRECEPTOR_LENS_NAMES.map((name, idx) => ({ label: name, icon: LENS_ICONS[idx] })),
    { label: 'Final Case Review', icon: 'fa-crown' },
  ];

  const activeContent = (() => {
    if (activeTab === 0) return lensExplainer;
    if (activeTab >= 1 && activeTab <= 3) return reviews[activeTab - 1] || '';
    return finalReview;
  })();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2 bg-white/80 border border-teal-50 rounded-2xl p-2 w-fit">
        <button
          onClick={() => setMode('single')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${mode === 'single' ? 'bg-teal-900 text-white' : 'text-teal-700 hover:bg-teal-50'}`}
        >
          Single Case
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${mode === 'batch' ? 'bg-teal-900 text-white' : 'text-teal-700 hover:bg-teal-50'}`}
        >
          Batch
        </button>
      </div>

      {mode === 'batch' ? (
        <PreceptorBatch
          onSaveVaultItem={onSaveVaultItem}
          patientsParentHandle={patientsParentHandle}
          onPatientsParentHandleChange={setPatientsParentHandle}
        />
      ) : null}

      {mode === 'single' && phase === 'processing' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-user-graduate text-2xl text-teal-700"></i>
              </div>
              <h2 className="text-xl font-black text-teal-950 uppercase tracking-tight">Generating Case Review Bundle</h2>
              <p className="text-xs text-teal-800/40 font-bold uppercase tracking-widest mt-1">3 Lenses + Final + Explainer + PDF</p>
            </div>

            <div className="space-y-4">
              {processingStages.map((stage, index) => (
                <div
                  key={stage}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    processing === index
                      ? 'bg-teal-50 border-teal-200 shadow-md'
                      : index < processing
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      processing === index
                        ? 'bg-teal-200 text-teal-800'
                        : index < processing
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {processing === index ? (
                      <i className="fa-solid fa-circle-notch animate-spin"></i>
                    ) : index < processing ? (
                      <i className="fa-solid fa-check"></i>
                    ) : (
                      <span className="text-xs font-black">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{stage}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {processing === index ? 'Running...' : index < processing ? 'Complete' : 'Waiting...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'single' && (phase === 'review' || phase === 'chat') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-teal-950 uppercase tracking-tight">Case Review Results</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-800/40 mt-1">Bundle-ready with lens differences + final synthesis</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startChat}
                className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                  phase === 'chat'
                    ? 'bg-teal-800 text-white shadow-xl'
                    : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                }`}
              >
                <i className="fa-solid fa-comments"></i>
                AI Advisor
              </button>
              <button
                onClick={() => exportBundlePdf()}
                disabled={!finalReview || reviews.length < 3}
                className="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-file-pdf"></i>
                Export PDF
              </button>
              <button
                onClick={resetAll}
                className="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-white text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-rotate-left"></i>
                New Case
              </button>
            </div>
          </div>

          <div className="bg-white/80 border border-teal-50 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-1">First Initial</label>
                <input value={patientFirstInitial} onChange={(e) => handleFirstInitialChange(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-teal-100 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-1">Last Name</label>
                <input value={patientLastName} onChange={(e) => handleLastNameChange(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-teal-100 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-1">Patient Folder</label>
                <input value={patientFolderName} onChange={(e) => setPatientFolderName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-teal-100 text-sm font-bold" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs font-bold text-teal-900 pb-2">
                  <input
                    type="checkbox"
                    checked={autoSaveToFolder}
                    onChange={(e) => setAutoSaveToFolder(e.target.checked)}
                    disabled={!supportsFS}
                  />
                  Auto-save to ClientCaseNotes
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={setPatientsFolder}
                disabled={!supportsFS}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                Set Patients Folder
              </button>
              <button
                onClick={clearFolderPermission}
                disabled={!supportsFS}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Clear Folder Permission
              </button>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800/50">
                {supportsFS ? (patientsParentHandle ? 'Folder set' : 'Folder not set') : 'Auto-save unavailable in this browser.'}
              </span>
            </div>

            {exportMessage && <p className="text-xs font-bold text-emerald-700">{exportMessage}</p>}
          </div>

          <div className="flex gap-2 mb-1 overflow-x-auto pb-2">
            {tabItems.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeTab === i
                    ? i === 4
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'bg-teal-800 text-white shadow-lg'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-teal-200 hover:text-teal-700'
                }`}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`${phase === 'chat' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-teal-50 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-teal-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTabBadgeColor(activeTab)}`}>
                      <i className={`fa-solid ${tabItems[activeTab]?.icon || 'fa-file-lines'}`}></i>
                    </div>
                    <span className="font-black text-sm text-teal-900 uppercase tracking-tight">{tabItems[activeTab]?.label}</span>
                  </div>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">{activeContent ? renderMarkdown(activeContent) : <p className="text-sm text-slate-400">No content available.</p>}</div>
              </div>
            </div>

            {phase === 'chat' && (
              <div className="lg:col-span-1">
                <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-teal-50 overflow-hidden flex flex-col" style={{ height: 'calc(60vh + 73px)' }}>
                  <div className="px-5 py-3 border-b border-teal-50 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-800 text-white flex items-center justify-center">
                      <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                    </div>
                    <span className="font-black text-xs text-teal-900 uppercase tracking-tight">Preceptor AI Advisor</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-800'}`}>
                          <div className="text-xs leading-relaxed whitespace-pre-wrap">
                            {msg.role === 'assistant' ? (
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>'),
                                }}
                              />
                            ) : (
                              msg.text
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {chatSending && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 rounded-2xl px-4 py-3">
                          <i className="fa-solid fa-circle-notch animate-spin text-teal-600 text-xs"></i>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-3 border-t border-teal-50">
                    <div className="flex gap-2">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Compare sections, tighten language, refine final..."
                        className="flex-1 px-4 py-3 rounded-xl border border-teal-100 bg-white text-sm focus:ring-2 focus:ring-teal-100 focus:border-teal-200 outline-none resize-none"
                        rows={2}
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={chatSending || !chatInput.trim()}
                        className="w-11 h-11 rounded-xl bg-teal-800 text-white flex items-center justify-center hover:bg-teal-900 transition-all disabled:opacity-40 self-end"
                      >
                        <i className="fa-solid fa-paper-plane text-sm"></i>
                      </button>
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {['Compare all sections', 'Which lens is strongest for compliance?'].map((q, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setChatInput(q);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-[9px] font-bold uppercase tracking-wider hover:bg-teal-100 transition-all"
                        >
                          {q}
                        </button>
                      ))}
                      <button
                        onClick={compileFinalReview}
                        disabled={chatSending}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-wider hover:bg-amber-100 transition-all border border-amber-200 flex items-center gap-1"
                      >
                        <i className="fa-solid fa-crown text-[8px]"></i>
                        Refine Final
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'single' && phase === 'upload' && (
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-user-graduate text-2xl text-teal-700"></i>
            </div>
            <h2 className="text-2xl font-black text-teal-950 uppercase tracking-tight">Preceptor</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-800/40 mt-1">Auto Bundle + Auto Save</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-2">Patient First Initial</label>
                <input
                  type="text"
                  value={patientFirstInitial}
                  onChange={(e) => handleFirstInitialChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-white text-sm font-bold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder="J"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-2">Patient Last Name</label>
                <input
                  type="text"
                  value={patientLastName}
                  onChange={(e) => handleLastNameChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-white text-sm font-bold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder="Smith"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-2">Patient Folder Name</label>
                <input
                  type="text"
                  value={patientFolderName}
                  onChange={(e) => setPatientFolderName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-teal-100 bg-white text-sm font-bold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder="Smith_J"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={setPatientsFolder}
                disabled={!supportsFS}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                Set Patients Folder
              </button>
              <button
                onClick={clearFolderPermission}
                disabled={!supportsFS}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Clear Folder Permission
              </button>
              <label className="flex items-center gap-2 text-xs font-bold text-teal-900">
                <input
                  type="checkbox"
                  checked={autoSaveToFolder}
                  onChange={(e) => setAutoSaveToFolder(e.target.checked)}
                  disabled={!supportsFS}
                />
                Auto-save PDF to ClientCaseNotes
              </label>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800/50">
                {supportsFS ? (patientsParentHandle ? 'Folder set' : 'Folder not set') : 'Auto-save unavailable in this browser.'}
              </span>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-3 ml-2">Upload Case Files</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-200 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-all group"
              >
                <i className="fa-solid fa-cloud-arrow-up text-3xl text-teal-300 group-hover:text-teal-500 transition-colors mb-3"></i>
                <p className="text-sm font-bold text-teal-800/60">Click to upload PDF/text/media files</p>
                <p className="text-[10px] text-teal-800/30 mt-1">PDF, images, audio, and document files accepted</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-teal-50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <i className="fa-solid fa-file-lines text-teal-600"></i>
                        <span className="text-sm font-bold text-teal-800 truncate max-w-[360px]">{file.name}</span>
                        <span className="text-[9px] font-bold text-teal-500 uppercase">{(file.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-teal-100"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-teal-800/20">Or paste text</span>
              <div className="flex-1 h-px bg-teal-100"></div>
            </div>

            <div>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste case notes or clinical documentation here..."
                className="w-full px-5 py-4 rounded-2xl border border-teal-100 bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-200 outline-none text-teal-950 font-medium text-sm placeholder:text-teal-800/15 transition-all resize-none"
                rows={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                <span className="text-sm font-bold text-red-700">{error}</span>
              </div>
            )}

            {exportMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                <span className="text-sm font-bold text-emerald-700">{exportMessage}</span>
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-teal-800/40 mb-3">Three Lenses + Deterministic Final</p>
              {PRECEPTOR_LENS_NAMES.map((name, i) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                    <i className={`fa-solid ${LENS_ICONS[i]} text-xs`}></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-teal-900">{name}</p>
                    <p className="text-[9px] text-slate-400">
                      {i === 0
                        ? 'Differential + physiology-first reasoning.'
                        : i === 1
                          ? 'Defensible language + compliance quality.'
                          : 'Biopsychosocial + lifestyle treatment targets.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={(files.length === 0 && !textInput.trim()) || !patientFirstInitial || !patientLastName}
              className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] text-white shadow-2xl transition-all flex items-center justify-center gap-3 ${
                (files.length === 0 && !textInput.trim()) || !patientFirstInitial || !patientLastName
                  ? 'bg-teal-300 cursor-not-allowed'
                  : 'bg-teal-900 hover:bg-black hover:-translate-y-1 shadow-teal-900/20 active:translate-y-0'
              }`}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              Generate & Auto Export Bundle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
