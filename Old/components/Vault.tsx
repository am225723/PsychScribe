import React, { useState } from 'react';
import { ReportHistoryItem } from '../App';

interface VaultProps {
  history: ReportHistoryItem[];
  onOpenReport: (item: ReportHistoryItem) => void;
  onDeleteReport: (e: React.MouseEvent, id: string) => void;
}

export const Vault: React.FC<VaultProps> = ({ history, onOpenReport, onDeleteReport }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter(item => 
    item.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-8">
        <div className="inline-flex items-center gap-4 px-10 py-4 bg-teal-50 text-teal-800 rounded-full text-xs font-black uppercase tracking-[0.5em] mb-4 border border-teal-100 shadow-inner">
          <i className="fa-solid fa-box-archive text-lg"></i>
          Encrypted Medical Vault
        </div>
        <h2 className="text-6xl font-black text-teal-950 tracking-tighter uppercase lg:text-7xl">Patient Archives</h2>
        <p className="text-teal-800/60 text-xl font-bold tracking-tight max-w-2xl mx-auto">Historical synthesis index for longitudinal clinical tracking.</p>
      </div>

      <div className="space-y-12">
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute inset-0 bg-teal-500 blur-[80px] opacity-0 group-focus-within:opacity-10 transition-opacity duration-1000"></div>
          <i className="fa-solid fa-magnifying-glass absolute left-8 top-1/2 -translate-y-1/2 text-teal-300 text-xl"></i>
          <input 
            type="text" 
            placeholder="Search patient record repository..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-20 pr-10 py-8 rounded-[2.5rem] border-2 border-teal-50 bg-white shadow-2xl shadow-teal-900/5 focus:ring-12 focus:ring-teal-50 focus:border-teal-200 outline-none transition-all font-bold text-teal-950 text-xl placeholder:text-teal-800/10"
          />
        </div>

        {filteredHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredHistory.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onOpenReport(item)}
                className="group relative bg-white p-10 rounded-[3rem] border-2 border-teal-50 shadow-xl hover:shadow-[0_40px_100px_-15px_rgba(20,50,50,0.15)] hover:border-teal-200 transition-all cursor-pointer flex flex-col gap-10 ring-1 ring-transparent hover:ring-teal-100 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-inner ${
                    item.isUrgent ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-teal-50 text-teal-800 border border-teal-100'
                  }`}>
                    {item.initials}
                  </div>
                  {item.isUrgent && (
                    <div className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse shadow-xl shadow-red-200">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      Risk Alert
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-black text-teal-950 uppercase text-lg tracking-widest group-hover:text-teal-600 transition-colors leading-tight">{item.patientName}</h4>
                  <div className="flex items-center gap-4 text-xs font-black text-teal-800/30 uppercase tracking-[0.3em]">
                    <i className="fa-regular fa-calendar-check text-base"></i>
                    {item.date}
                  </div>
                </div>

                <div className="pt-8 border-t-2 border-teal-50 flex items-center justify-between mt-auto">
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-teal-800/40 group-hover:text-teal-800 transition-colors flex items-center gap-2">
                    Review Record <i className="fa-solid fa-chevron-right text-[10px] group-hover:translate-x-2 transition-transform"></i>
                  </span>
                  <button 
                    onClick={(e) => onDeleteReport(e, item.id)}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-teal-100 hover:text-red-600 hover:bg-red-50 transition-all active:scale-90"
                    title="Remove from Archives"
                  >
                    <i className="fa-solid fa-trash-can text-base"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-40 space-y-10 bg-teal-50/10 rounded-[5rem] border-4 border-dashed border-teal-50/30">
            <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center text-teal-100 mx-auto shadow-xl border border-teal-50">
              <i className="fa-solid fa-folder-tree text-6xl"></i>
            </div>
            <div className="space-y-4">
              <h3 className="text-4xl font-black text-teal-950 uppercase tracking-tighter">Vault Empty</h3>
              <p className="text-teal-800/40 font-bold text-xl max-w-lg mx-auto leading-relaxed">No matching clinical intake syntheses found in the encrypted archive.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};