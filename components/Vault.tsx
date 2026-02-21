import React, { useEffect, useMemo, useState } from 'react';
import type { VaultItem } from '../services/vaultService';

interface VaultProps {
  history: VaultItem[];
  onOpenReport: (item: VaultItem) => void;
  onDeleteReport: (e: React.MouseEvent, id: string) => void;
  onRefresh: () => void;
}

const DOC_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  summary: { label: 'Intake Summary', icon: 'fa-solid fa-file-medical', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  treatment: { label: 'Treatment Plan', icon: 'fa-solid fa-clipboard-list', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  darp: { label: 'Session Note', icon: 'fa-solid fa-notes-medical', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  preceptor: { label: 'Preceptor Bundle', icon: 'fa-solid fa-user-graduate', color: 'bg-amber-50 text-amber-700 border-amber-100' },
};

function getPatientName(item: VaultItem): string {
  const first = item.patient?.firstInitial?.trim();
  const last = item.patient?.lastName?.trim();
  if (first && last) return `${first}. ${last}`;
  if (last) return last;

  const patientNameMatch = item.generatedText?.match(/PATIENT_NAME:\s*(.*)/i);
  if (patientNameMatch?.[1]) {
    return patientNameMatch[1].trim().replace(/\*+/g, '');
  }
  return 'Unknown Patient';
}

function getInitials(item: VaultItem): string {
  const first = item.patient?.firstInitial?.toUpperCase().slice(0, 1) || 'X';
  const last = item.patient?.lastName?.toUpperCase().slice(0, 1) || 'X';
  return `${first}${last}`;
}

function getItemDate(item: VaultItem): Date {
  return new Date(item.updatedAt || item.createdAt);
}

export const Vault: React.FC<VaultProps> = ({ history, onOpenReport, onDeleteReport, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  useEffect(() => {
    onRefresh();
    // Load vault list once on mount; parent refreshes after saves/deletes.
  }, []);

  const filtered = useMemo(() => {
    let next = history.filter((item) => {
      const name = getPatientName(item).toLowerCase();
      if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
      if (docTypeFilter !== 'all' && item.documentType !== docTypeFilter) return false;

      const itemDate = getItemDate(item);
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (itemDate < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        if (itemDate >= to) return false;
      }
      return true;
    });

    if (sortBy === 'name') {
      next = [...next].sort((a, b) => getPatientName(a).localeCompare(getPatientName(b)));
    } else if (sortBy === 'oldest') {
      next = [...next].sort((a, b) => getItemDate(a).getTime() - getItemDate(b).getTime());
    } else {
      next = [...next].sort((a, b) => getItemDate(b).getTime() - getItemDate(a).getTime());
    }

    return next;
  }, [history, searchQuery, docTypeFilter, dateFrom, dateTo, sortBy]);

  const hasFilters = searchQuery || docTypeFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery('');
    setDocTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-teal-50 text-teal-800 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-1 border border-teal-100 shadow-inner">
          <i className="fa-solid fa-box-archive text-sm"></i>
          Encrypted Medical Vault
        </div>
        <h2 className="text-4xl font-black text-teal-950 tracking-tighter uppercase lg:text-5xl">Patient Archives</h2>
        <p className="text-teal-800/60 text-base font-bold tracking-tight max-w-2xl mx-auto">Select a vault item to rehydrate it directly into the correct workspace view.</p>
      </div>

      <div className="space-y-4">
        <div className="max-w-5xl mx-auto relative group">
          <div className="absolute inset-0 bg-teal-500 blur-[80px] opacity-0 group-focus-within:opacity-10 transition-opacity duration-1000"></div>
          <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-teal-300 text-lg z-10"></i>
          <input
            type="text"
            placeholder="Search by patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-8 py-4 rounded-[1.5rem] border-2 border-teal-50 bg-white shadow-2xl shadow-teal-900/5 focus:ring-8 focus:ring-teal-50 focus:border-teal-200 outline-none transition-all font-bold text-teal-950 text-base placeholder:text-teal-800/10"
          />
        </div>

        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3 px-2">
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-teal-50 shadow-md p-1">
            {['all', 'summary', 'treatment', 'darp', 'preceptor'].map((type) => (
              <button
                key={type}
                onClick={() => setDocTypeFilter(type)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                  docTypeFilter === type ? 'bg-teal-900 text-white shadow-md' : 'text-slate-400 hover:text-teal-800 hover:bg-teal-50'
                }`}
              >
                {type === 'all' ? 'All Types' : DOC_TYPE_LABELS[type]?.label || type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-2xl border border-teal-50 shadow-md px-4 py-2">
            <i className="fa-regular fa-calendar text-teal-300 text-xs"></i>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-[10px] font-bold text-teal-800 bg-transparent outline-none uppercase tracking-wider"
            />
            <span className="text-teal-200 text-xs">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-[10px] font-bold text-teal-800 bg-transparent outline-none uppercase tracking-wider"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
            className="bg-white rounded-2xl border border-teal-50 shadow-md px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-teal-800 outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Alphabetical</option>
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] text-red-500 hover:bg-red-50 transition-all border border-red-100"
            >
              <i className="fa-solid fa-xmark mr-1"></i> Clear
            </button>
          )}

          <div className="ml-auto text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/30">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item) => {
              const docInfo = DOC_TYPE_LABELS[item.documentType || 'summary'];
              const dateLabel = getItemDate(item).toLocaleDateString();
              return (
                <div
                  key={item.id}
                  onClick={() => onOpenReport(item)}
                  className="group relative bg-white p-6 rounded-[2rem] border-2 border-teal-50 shadow-xl hover:shadow-[0_40px_100px_-15px_rgba(20,50,50,0.15)] hover:border-teal-200 transition-all cursor-pointer flex flex-col gap-4 ring-1 ring-transparent hover:ring-teal-100 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl shadow-inner ${
                      item.isUrgent ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-teal-50 text-teal-800 border border-teal-100'
                    }`}>
                      {getInitials(item)}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {item.isUrgent && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse shadow-xl shadow-red-200">
                          <i className="fa-solid fa-triangle-exclamation"></i>
                          Risk
                        </div>
                      )}
                      {docInfo && (
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${docInfo.color}`}>
                          <i className={`${docInfo.icon} text-[10px]`}></i>
                          {docInfo.label}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-black text-teal-950 uppercase text-sm tracking-widest group-hover:text-teal-600 transition-colors leading-tight">{getPatientName(item)}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-black text-teal-800/30 uppercase tracking-[0.3em]">
                      <i className="fa-regular fa-calendar-check text-sm"></i>
                      {dateLabel}
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-teal-50 flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-800/40 group-hover:text-teal-800 transition-colors flex items-center gap-2">
                      Open Record <i className="fa-solid fa-chevron-right text-[10px] group-hover:translate-x-2 transition-transform"></i>
                    </span>
                    <button
                      onClick={(e) => onDeleteReport(e, item.id)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-teal-100 hover:text-red-600 hover:bg-red-50 transition-all active:scale-90"
                      title="Remove from Archives"
                    >
                      <i className="fa-solid fa-trash-can text-base"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 space-y-6 bg-teal-50/10 rounded-[3rem] border-4 border-dashed border-teal-50/30">
            <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center text-teal-100 mx-auto shadow-xl border border-teal-50">
              <i className="fa-solid fa-folder-tree text-4xl"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-teal-950 uppercase tracking-tighter">
                {hasFilters ? 'No Matching Records' : 'Vault Empty'}
              </h3>
              <p className="text-teal-800/40 font-bold text-base max-w-lg mx-auto leading-relaxed">
                {hasFilters ? 'No records match your current filters. Try adjusting your search criteria.' : 'No generated records found. New results will appear here.'}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-4 px-6 py-3 bg-teal-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
