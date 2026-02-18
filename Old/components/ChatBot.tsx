
import React, { useState, useRef, useEffect } from 'react';
import { startClinicalChat } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ isOpen, setIsOpen }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello. I am the Integrative Psychiatry Clinical Assistant. How can I assist with your intake analysis or treatment strategy today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInputValue('');
    setIsTyping(true);

    try {
      let session = chatSession;
      if (!session) {
        session = startClinicalChat();
        setChatSession(session);
      }

      const responseStream = await session.sendMessageStream({ message: userMessage });
      
      let assistantText = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text || '';
        assistantText += textChunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', text: assistantText };
          return updated;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Clinical assistant unavailable. Please check intake status.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-8 right-4 md:right-8 z-[200] flex flex-col items-end">
      <div className="w-[90vw] md:w-[420px] h-[70vh] md:h-[600px] bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(20,50,50,0.3)] border border-teal-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ring-1 ring-teal-50">
        <div className="bg-teal-800 p-4 md:p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/10">
              <i className="fa-solid fa-brain text-xs md:text-sm"></i>
            </div>
            <div>
              <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] leading-tight">Assistant</h3>
              <p className="text-[8px] md:text-[9px] opacity-60 uppercase tracking-[0.3em] font-black mt-1">Clinical Engine</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl transition-colors flex items-center justify-center">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 scroll-smooth bg-slate-50/30">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 md:p-4 rounded-[1.2rem] md:rounded-[1.5rem] text-xs md:text-sm leading-relaxed font-bold ${
                msg.role === 'user' 
                  ? 'bg-teal-800 text-white rounded-tr-none shadow-xl shadow-teal-900/10' 
                  : 'bg-white text-teal-900 rounded-tl-none border border-teal-50 shadow-sm'
              }`}>
                {msg.text || (isTyping && i === messages.length - 1 ? <div className="flex gap-1 py-1"><div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:200ms]"></div><div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:400ms]"></div></div> : null)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 md:p-6 border-t border-teal-50 bg-white flex gap-2 md:gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Query clarification..."
            className="flex-grow bg-teal-50/30 px-4 py-2.5 rounded-xl border border-teal-50 text-xs font-bold focus:ring-4 focus:ring-teal-100 focus:border-transparent outline-none transition-all placeholder:text-teal-800/20"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${
              !inputValue.trim() || isTyping ? 'bg-teal-50 text-teal-100' : 'bg-teal-800 text-white hover:bg-teal-900 shadow-xl shadow-teal-900/20'
            }`}
          >
            <i className={`fa-solid ${isTyping ? 'fa-spinner animate-spin text-xs' : 'fa-paper-plane text-xs'}`}></i>
          </button>
        </form>
      </div>
    </div>
  );
};
