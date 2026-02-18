
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
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-teal-50 text-teal-800 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4 border border-teal-100">
          <i className="fa-solid fa-box-archive"></i>
          Secure Archives
        </div>
        <h2 className="text-4xl font-black text-teal-950 tracking-tight uppercase">Clinical Record Vault</h2>
        <p className="text-teal-800/60 text-lg font-bold">Encrypted history of synthesized patient intakes.</p>
      </div>

      <div className="space-y-8">
        <div className="relative max-w-xl mx-auto">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-teal-200"></i>
          <input 
            type="text" 
            placeholder="Search patient records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-[1.5rem] border border-teal-50 bg-white shadow-xl shadow-teal-900/5 focus:ring-4 focus:ring-teal-50 focus:border-teal-200 outline-none transition-all font-bold text-teal-900 placeholder:text-teal-800/20"
          />
        </div>

        {filteredHistory.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHistory.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onOpenReport(item)}
                className="group relative bg-white p-6 rounded-[2rem] border border-teal-50 shadow-xl shadow-teal-900/5 hover:shadow-2xl hover:border-teal-200 transition-all cursor-pointer flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${
                    item.isUrgent ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-teal-50 text-teal-800 border border-teal-100'
                  }`}>
                    {item.initials}
                  </div>
                  {item.isUrgent && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-[8px] font-black uppercase tracking-widest border border-red-100 animate-pulse">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      Urgent
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-black text-teal-950 uppercase text-xs tracking-widest group-hover:text-teal-600 transition-colors">{item.patientName}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-teal-800/40 uppercase">
                    <i className="fa-regular fa-calendar text-[8px]"></i>
                    {item.date}
                  </div>
                </div>

                <div className="pt-4 border-t border-teal-50 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 group-hover:text-teal-800 transition-colors">
                    Review Brief <i className="fa-solid fa-arrow-right ml-1 group-hover:translate-x-1 transition-transform"></i>
                  </span>
                  <button 
                    onClick={(e) => onDeleteReport(e, item.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-teal-100 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Delete Record"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-6 bg-teal-50/20 rounded-[3rem] border-2 border-dashed border-teal-50/50">
            <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center text-teal-100 mx-auto shadow-sm">
              <i className="fa-solid fa-folder-open text-3xl"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-teal-950 uppercase tracking-tight">No Records Found</h3>
              <p className="text-teal-800/40 font-bold text-sm max-w-xs mx-auto">Either the vault is empty or your search clinical filters yielded no results.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
