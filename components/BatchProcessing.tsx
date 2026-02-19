import React, { useState, useRef } from 'react';
import { FileData } from '../types';
import { analyzeIntake } from '../services/geminiService';
import { findOrCreatePatient, saveReport } from '../services/supabaseService';
import type { DocumentType } from '../services/geminiService';

interface BatchProcessingProps {
  isDriveLinked: boolean;
  accessToken: string | null;
  onComplete: () => void;
}

interface BatchItem {
  id: string;
  fileName: string;
  fileData: FileData;
  status: 'queued' | 'processing' | 'completed' | 'error';
  patientName?: string;
  error?: string;
  documentType: DocumentType;
}

export const BatchProcessing: React.FC<BatchProcessingProps> = ({ onComplete }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('summary');
  const [completedCount, setCompletedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newItems: BatchItem[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      newItems.push({
        id: `${Date.now()}-${i}`,
        fileName: file.name,
        fileData: { mimeType: file.type, base64, name: file.name },
        status: 'queued',
        documentType,
      });
    }

    setItems(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearAll = () => {
    if (!isRunning) {
      setItems([]);
      setCompletedCount(0);
    }
  };

  const processBatch = async () => {
    setIsRunning(true);
    abortRef.current = false;
    setCompletedCount(0);
    let completed = 0;

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) break;
      const item = items[i];
      if (item.status === 'completed') {
        completed++;
        continue;
      }

      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'processing' } : it));

      try {
        const result = await analyzeIntake(
          [{ mimeType: item.fileData.mimeType, data: item.fileData.base64 }],
          item.documentType
        );

        const nameMatch = result.match(/PATIENT_NAME:\s*(.*)/i);
        const patientName = nameMatch ? nameMatch[1].trim().replace(/\*+/g, '') : 'Unknown Patient';

        const clientIdMatch = result.match(/CLIENT_ID:\s*(.*)/i);
        const clientId = clientIdMatch ? clientIdMatch[1].trim().replace(/\*+/g, '') : undefined;
        const dobMatch = result.match(/DOB:\s*(.*)/i);
        const dob = dobMatch ? dobMatch[1].trim().replace(/\*+/g, '') : undefined;

        try {
          const patient = await findOrCreatePatient(patientName, dob, clientId);
          await saveReport(patient.id, item.documentType, result, result.includes('🚨'));
        } catch (dbErr) {
          console.error('Database save error (report still generated):', dbErr);
        }

        completed++;
        setCompletedCount(completed);
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'completed', patientName } : it));
      } catch (err: any) {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: err.message || 'Processing failed' } : it));
      }
    }

    setIsRunning(false);
    onComplete();
  };

  const stopBatch = () => {
    abortRef.current = true;
  };

  const queuedCount = items.filter(i => i.status === 'queued').length;
  const processingItem = items.find(i => i.status === 'processing');
  const errorCount = items.filter(i => i.status === 'error').length;
  const doneCount = items.filter(i => i.status === 'completed').length;
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-amber-50 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-1 border border-amber-100 shadow-inner">
          <i className="fa-solid fa-layer-group text-sm"></i>
          Batch Engine
        </div>
        <h2 className="text-4xl font-black text-teal-950 tracking-tighter uppercase lg:text-5xl">Batch Processing</h2>
        <p className="text-teal-800/60 text-base font-bold tracking-tight max-w-2xl mx-auto">Upload multiple patient files and process them sequentially through the AI engine.</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 overflow-hidden ring-1 ring-teal-50">
        <div className="p-8 space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40">Document Type:</span>
              <div className="flex bg-slate-50 rounded-xl p-1 border border-teal-50">
                {[
                  { value: 'summary', label: 'Intake Summary', icon: 'fa-solid fa-file-medical' },
                  { value: 'treatment', label: 'Treatment Plan', icon: 'fa-solid fa-clipboard-list' },
                  { value: 'darp', label: 'Session Note', icon: 'fa-solid fa-notes-medical' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => !isRunning && setDocumentType(opt.value as DocumentType)}
                    disabled={isRunning}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${
                      documentType === opt.value
                        ? 'bg-teal-900 text-white shadow-md'
                        : 'text-slate-400 hover:text-teal-800'
                    } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <i className={`${opt.icon} text-xs`}></i>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            onClick={() => !isRunning && fileInputRef.current?.click()}
            className={`border-[3px] border-dashed rounded-[2rem] p-10 text-center transition-all ${
              isRunning
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
                : 'border-teal-100 hover:border-teal-300 hover:bg-teal-50/20 cursor-pointer group'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
              disabled={isRunning}
            />
            <div className="space-y-3">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-cloud-arrow-up text-teal-400 text-2xl"></i>
              </div>
              <div>
                <p className="font-black text-teal-950 uppercase text-sm tracking-widest">Drop Files or Click to Upload</p>
                <p className="text-[10px] font-bold text-teal-800/30 uppercase tracking-[0.2em] mt-1">PDF, images, or scanned documents — multiple files supported</p>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40">
                  Queue ({items.length} file{items.length !== 1 ? 's' : ''})
                </span>
                <div className="flex gap-2">
                  {!isRunning && items.length > 0 && (
                    <button onClick={clearAll} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {isRunning && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                    <span className="text-teal-800/50">Progress</span>
                    <span className="text-teal-800">{doneCount} / {items.length}</span>
                  </div>
                  <div className="h-3 bg-teal-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      item.status === 'processing' ? 'bg-amber-50 border-amber-200 shadow-lg' :
                      item.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                      item.status === 'error' ? 'bg-red-50 border-red-200' :
                      'bg-white border-teal-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${
                      item.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                      item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-teal-50 text-teal-400'
                    }`}>
                      {item.status === 'processing' ? (
                        <i className="fa-solid fa-dna animate-spin"></i>
                      ) : item.status === 'completed' ? (
                        <i className="fa-solid fa-check"></i>
                      ) : item.status === 'error' ? (
                        <i className="fa-solid fa-xmark"></i>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <p className="font-black text-sm text-teal-950 truncate">{item.fileName}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5">
                        {item.status === 'processing' && <span className="text-amber-600">Synthesizing...</span>}
                        {item.status === 'completed' && <span className="text-emerald-600">{item.patientName || 'Completed'}</span>}
                        {item.status === 'error' && <span className="text-red-600">{item.error}</span>}
                        {item.status === 'queued' && <span className="text-teal-400">Waiting in queue</span>}
                      </p>
                    </div>

                    {item.status === 'queued' && !isRunning && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-teal-200 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={processBatch}
                disabled={queuedCount === 0}
                className={`flex-1 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] text-white shadow-2xl transition-all flex items-center justify-center gap-4 ${
                  queuedCount === 0
                    ? 'bg-teal-100 cursor-not-allowed text-teal-800/30'
                    : 'bg-teal-900 hover:bg-black hover:-translate-y-1 shadow-teal-900/20 active:translate-y-0'
                }`}
              >
                <i className="fa-solid fa-bolt text-teal-400 text-lg"></i>
                Process {queuedCount} File{queuedCount !== 1 ? 's' : ''}
              </button>
            ) : (
              <button
                onClick={stopBatch}
                className="flex-1 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] text-white bg-red-600 hover:bg-red-700 shadow-2xl transition-all flex items-center justify-center gap-4 active:translate-y-0"
              >
                <i className="fa-solid fa-stop text-lg"></i>
                Stop After Current
              </button>
            )}
          </div>

          {doneCount > 0 && !isRunning && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                <i className="fa-solid fa-circle-check text-emerald-600 text-2xl"></i>
              </div>
              <p className="font-black text-emerald-800 uppercase text-sm tracking-widest">Batch Complete</p>
              <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-wider">
                {doneCount} processed successfully{errorCount > 0 ? ` • ${errorCount} failed` : ''} — All saved to patient database
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
