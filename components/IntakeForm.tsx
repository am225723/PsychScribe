
import React, { useState, useRef } from 'react';
import { FileData } from '../types';

interface IntakeFormProps {
  onProcess: (input: string | FileData) => void;
  isProcessing: boolean;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({ onProcess, isProcessing }) => {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<FileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFile({
        name: selectedFile.name,
        mimeType: selectedFile.type,
        base64: base64
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'text' && text.trim()) {
      onProcess(text);
    } else if (activeTab === 'file' && file) {
      onProcess(file);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 overflow-hidden ring-1 ring-teal-50">
      <div className="flex bg-slate-50/50 p-1.5 border-b border-teal-50">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-all rounded-2xl ${
            activeTab === 'file' ? 'text-teal-900 bg-white shadow-md border border-teal-50' : 'text-slate-400 hover:text-teal-800'
          }`}
        >
          <i className="fa-solid fa-file-medical text-sm"></i> DOCUMENT INTAKE
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-all rounded-2xl ${
            activeTab === 'text' ? 'text-teal-900 bg-white shadow-md border border-teal-50' : 'text-slate-400 hover:text-teal-800'
          }`}
        >
          <i className="fa-solid fa-keyboard text-sm"></i> MANUAL ENTRY
        </button>
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
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-2 ml-2 uppercase">Intake Form</label>
              <div 
                onClick={() => !file && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[2.5rem] p-10 md:p-16 flex flex-col items-center justify-center transition-all cursor-pointer group ${
                  file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 hover:border-teal-400 hover:bg-teal-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="application/pdf,image/*"
                  className="hidden"
                />
                {!file ? (
                  <>
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-teal-100 mb-6 shadow-md ring-1 ring-teal-50 group-hover:scale-110 group-hover:text-teal-600 transition-all">
                      <i className="fa-solid fa-file-arrow-up text-2xl"></i>
                    </div>
                    <p className="text-lg font-black text-teal-950 uppercase tracking-tight">Upload Form</p>
                    <p className="text-teal-800/30 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">PDF or Scanned Doc</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl ring-4 ring-emerald-50">
                      <i className="fa-solid fa-check text-2xl"></i>
                    </div>
                    <p className="text-sm font-black text-teal-950 uppercase tracking-tight truncate max-w-[280px]">{file.name}</p>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="text-[10px] font-black text-red-400 hover:text-red-600 mt-4 uppercase tracking-widest flex items-center gap-2 py-2 px-4 rounded-xl hover:bg-red-50 transition-all"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                      Remove File
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isProcessing || (activeTab === 'text' && !text.trim()) || (activeTab === 'file' && !file)}
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
                <i className="fa-solid fa-bolt-lightning text-teal-400 text-lg group-hover:scale-125 transition-transform"></i>
                GENERATE INTEGRATIVE BRIEF
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
