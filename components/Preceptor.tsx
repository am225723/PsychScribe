import React, { useState, useRef, useEffect } from 'react';
import { preceptorAnalyze, startPreceptorChat } from '../services/geminiService';
import type { Chat } from '@google/genai';
import { jsPDF } from 'jspdf';

type Phase = 'upload' | 'processing' | 'review' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const PERSPECTIVE_NAMES = ['Preceptor Template', 'Super Preceptor', 'Pharmacology-First'];
const PERSPECTIVE_ICONS = ['fa-clipboard-list', 'fa-shield-heart', 'fa-pills'];
const PERSPECTIVE_COLORS = ['teal', 'indigo', 'emerald'];

export const Preceptor: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState('');
  const [reviews, setReviews] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [processing, setProcessing] = useState<number>(-1);
  const [error, setError] = useState('');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const [finalReview, setFinalReview] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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

  const handleGenerate = async () => {
    if (files.length === 0 && !textInput.trim()) {
      setError('Please upload a PDF or paste case text.');
      return;
    }

    setError('');
    setPhase('processing');
    const newReviews: string[] = [];

    try {
      let content: string | { mimeType: string; data: string }[];
      if (files.length > 0) {
        content = await Promise.all(files.map(readFileAsBase64));
      } else {
        content = textInput;
      }

      for (let i = 0; i < 3; i++) {
        setProcessing(i);
        const result = await preceptorAnalyze(content, i);
        newReviews.push(result);
      }

      setReviews(newReviews);
      setProcessing(-1);
      setPhase('review');
    } catch (err: any) {
      setError(err.message || 'Failed to generate case reviews.');
      setPhase('upload');
      setProcessing(-1);
    }
  };

  const startChat = () => {
    if (reviews.length < 3) return;
    const chat = startPreceptorChat(reviews);
    setChatInstance(chat);
    setChatMessages([{
      role: 'assistant',
      text: `I've analyzed all three case review perspectives. I can help you:\n\n- **Compare specific sections** across the three reviews\n- **Identify the strongest version** of each section\n- **Combine elements** from multiple reviews\n- **Refine or rewrite** any section based on your feedback\n- **Create the final polished review** when you're ready\n\nWhat would you like to start with?`
    }]);
    setPhase('chat');
  };

  const compileFinalReview = async () => {
    if (!chatInstance || chatSending) return;
    const compileMsg = 'Please compile the best elements from all three reviews into one polished, comprehensive final case review. Use the strongest sections from each perspective.';
    setChatMessages(prev => [...prev, { role: 'user', text: compileMsg }]);
    setChatSending(true);

    try {
      const response = await chatInstance.sendMessage({ message: compileMsg });
      const text = response.text || 'No response generated.';
      setChatMessages(prev => [...prev, { role: 'assistant', text }]);
      setFinalReview(text);
      setActiveTab(3);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setChatSending(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !chatInstance || chatSending) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatSending(true);

    try {
      const response = await chatInstance.sendMessage({ message: userMsg });
      const text = response.text || 'No response generated.';
      setChatMessages(prev => [...prev, { role: 'assistant', text }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
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

  const exportPdf = (content: string | undefined, title: string) => {
    if (!content) return;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Dr. Zelisko - Preceptor Case Review', margin, margin);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, margin, margin + 8);
    doc.text(new Date().toLocaleDateString(), margin, margin + 14);

    doc.setDrawColor(0, 128, 128);
    doc.line(margin, margin + 18, pageWidth - margin, margin + 18);

    const cleanText = content
      .replace(/\*\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[SECTION_\d+\]/g, '');

    const lines = doc.splitTextToSize(cleanText, maxWidth);
    let y = margin + 26;

    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5;
    }

    doc.save(`Case_Review_${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const resetAll = () => {
    setPhase('upload');
    setFiles([]);
    setTextInput('');
    setReviews([]);
    setActiveTab(0);
    setError('');
    setChatMessages([]);
    setChatInput('');
    setChatInstance(null);
    setFinalReview('');
    setProcessing(-1);
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
                <strong className="text-teal-900">{parts[0]}</strong>{parts.slice(1).join('')}
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

  if (phase === 'processing') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-user-graduate text-2xl text-teal-700"></i>
            </div>
            <h2 className="text-xl font-black text-teal-950 uppercase tracking-tight">Generating Case Reviews</h2>
            <p className="text-xs text-teal-800/40 font-bold uppercase tracking-widest mt-1">Three Perspectives</p>
          </div>

          <div className="space-y-4">
            {PERSPECTIVE_NAMES.map((name, i) => (
              <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                processing === i ? 'bg-teal-50 border-teal-200 shadow-md' :
                i < processing || (processing === -1 && reviews.length === 3) ? 'bg-emerald-50 border-emerald-200' :
                'bg-slate-50 border-slate-100'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  processing === i ? 'bg-teal-200 text-teal-800' :
                  i < processing || (processing === -1 && reviews.length === 3) ? 'bg-emerald-200 text-emerald-800' :
                  'bg-slate-200 text-slate-400'
                }`}>
                  {processing === i ? (
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                  ) : i < processing || (processing === -1 && reviews.length === 3) ? (
                    <i className="fa-solid fa-check"></i>
                  ) : (
                    <i className={`fa-solid ${PERSPECTIVE_ICONS[i]}`}></i>
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">{name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {processing === i ? 'Analyzing...' : i < processing ? 'Complete' : 'Waiting...'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'review' || phase === 'chat') {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-teal-950 uppercase tracking-tight">Case Review Results</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-800/40 mt-1">Three perspectives generated</p>
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
              onClick={resetAll}
              className="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-white text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-rotate-left"></i>
              New Case
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {PERSPECTIVE_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === i
                  ? 'bg-teal-800 text-white shadow-lg'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-teal-200 hover:text-teal-700'
              }`}
            >
              <i className={`fa-solid ${PERSPECTIVE_ICONS[i]}`}></i>
              {name}
            </button>
          ))}
          {finalReview && (
            <button
              onClick={() => setActiveTab(3)}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 3
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <i className="fa-solid fa-crown"></i>
              Final Review
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${phase === 'chat' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-teal-50 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-teal-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 3 ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                  }`}>
                    <i className={`fa-solid ${activeTab === 3 ? 'fa-crown' : PERSPECTIVE_ICONS[activeTab]}`}></i>
                  </div>
                  <span className="font-black text-sm text-teal-900 uppercase tracking-tight">
                    {activeTab === 3 ? 'Final Compiled Review' : PERSPECTIVE_NAMES[activeTab]}
                  </span>
                </div>
                <button
                  onClick={() => exportPdf(
                    activeTab === 3 ? finalReview : reviews[activeTab],
                    activeTab === 3 ? 'Final_Review' : PERSPECTIVE_NAMES[activeTab]
                  )}
                  disabled={activeTab === 3 ? !finalReview : !reviews[activeTab]}
                  className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 font-bold text-xs hover:bg-teal-100 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="fa-solid fa-file-pdf"></i>
                  Export PDF
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {activeTab === 3 && finalReview ? renderMarkdown(finalReview) : reviews[activeTab] ? renderMarkdown(reviews[activeTab]) : null}
              </div>
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
                      <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-teal-800 text-white'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        <div className="text-xs leading-relaxed whitespace-pre-wrap">
                          {msg.role === 'assistant' ? (
                            <div dangerouslySetInnerHTML={{
                              __html: msg.text
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\n/g, '<br/>')
                            }} />
                          ) : msg.text}
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
                      placeholder="Compare sections, pick the best, compile final..."
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
                    {['Compare all sections', 'Which review is strongest?'].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setChatInput(q); }}
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
                      Compile Final Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-user-graduate text-2xl text-teal-700"></i>
        </div>
        <h2 className="text-2xl font-black text-teal-950 uppercase tracking-tight">Preceptor</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-800/40 mt-1">Case Review Generator</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-teal-50 p-8 space-y-6">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-3 ml-2">Upload Case PDF</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-teal-200 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-all group"
          >
            <i className="fa-solid fa-cloud-arrow-up text-3xl text-teal-300 group-hover:text-teal-500 transition-colors mb-3"></i>
            <p className="text-sm font-bold text-teal-800/60">Click to upload PDF files</p>
            <p className="text-[10px] text-teal-800/30 mt-1">PDF, images, or audio files accepted</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-teal-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-file-pdf text-teal-600"></i>
                    <span className="text-sm font-bold text-teal-800 truncate max-w-[300px]">{file.name}</span>
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
            placeholder="Paste the student's case notes, clinical documentation, or session transcript here..."
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

        <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-teal-800/40 mb-3">Three Review Perspectives</p>
          {PERSPECTIVE_NAMES.map((name, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                <i className={`fa-solid ${PERSPECTIVE_ICONS[i]} text-xs`}></i>
              </div>
              <div>
                <p className="text-xs font-bold text-teal-900">{name}</p>
                <p className="text-[9px] text-slate-400">
                  {i === 0 ? '8-section structured case review with scripts & teaching pearls' :
                   i === 1 ? 'Safety-forward with priority problem list, decision trees & reality checks' :
                   'Medication-first deep dive with corrected plan & next-visit agenda'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={files.length === 0 && !textInput.trim()}
          className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] text-white shadow-2xl transition-all flex items-center justify-center gap-3 ${
            files.length === 0 && !textInput.trim()
              ? 'bg-teal-300 cursor-not-allowed'
              : 'bg-teal-900 hover:bg-black hover:-translate-y-1 shadow-teal-900/20 active:translate-y-0'
          }`}
        >
          <i className="fa-solid fa-wand-magic-sparkles"></i>
          Generate 3 Case Reviews
        </button>
      </div>
    </div>
  );
};
