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
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-3 px-8 py-3 bg-teal-50 text-teal-800 rounded-full text-xs font-black uppercase tracking-[0.4em] mb-4 border border-teal-100 shadow-sm">
          <i className="fa-solid fa-box-archive"></i>
          Secure Clinical Archives
        </div>
        <h2 className="text-5xl font-black text-teal-950 tracking-tighter uppercase">Patient Vault</h2>
        <p className="text-teal-800/60 text-lg font-bold tracking-tight">Full-spectrum history of intake syntheses.</p>
      </div>

      <div className="space-y-10">
        <div className="max-w-2xl mx-auto relative group">
          <div className="absolute inset-0 bg-teal-400 blur-2xl opacity-0 group-focus-within:opacity-10 transition-opacity"></div>
          <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-teal-300 text-lg"></i>
          <input 
            type="text" 
            placeholder="Search patient medical records by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-8 py-6 rounded-[2rem] border-2 border-teal-50 bg-white shadow-2xl shadow-teal-900/5 focus:ring-8 focus:ring-teal-50 focus:border-teal-200 outline-none transition-all font-bold text-teal-950 text-lg placeholder:text-teal-800/20"
          />
        </div>

        {filteredHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredHistory.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onOpenReport(item)}
                className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-teal-50 shadow-xl hover:shadow-2xl hover:border-teal-200 transition-all cursor-pointer flex flex-col gap-8 ring-1 ring-transparent hover:ring-teal-100"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-inner ${
                    item.isUrgent ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-teal-50 text-teal-800 border border-teal-100'
                  }`}>
                    {item.initials}
                  </div>
                  {item.isUrgent && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-red-200">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      Urgent
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-black text-teal-950 uppercase text-base tracking-widest group-hover:text-teal-600 transition-colors">{item.patientName}</h4>
                  <div className="flex items-center gap-3 text-xs font-black text-teal-800/40 uppercase tracking-widest">
                    <i className="fa-regular fa-calendar text-[10px]"></i>
                    {item.date}
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-teal-50 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-800/40 group-hover:text-teal-800 transition-colors">
                    Review Record <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-2 transition-transform"></i>
                  </span>
                  <button 
                    onClick={(e) => onDeleteReport(e, item.id)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-teal-100 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Permanently Delete Record"
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 space-y-8 bg-teal-50/10 rounded-[4rem] border-4 border-dashed border-teal-50/30">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-teal-100 mx-auto shadow-inner">
              <i className="fa-solid fa-folder-open text-4xl"></i>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black text-teal-950 uppercase tracking-tight">Archives Unavailable</h3>
              <p className="text-teal-800/40 font-bold text-lg max-w-md mx-auto">Patient records could not be found with current search parameters.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};