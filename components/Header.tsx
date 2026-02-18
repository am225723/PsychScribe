
import React from 'react';
import { Page, ReportHistoryItem, ReportTab } from '../App';

interface HeaderProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
  history?: ReportHistoryItem[];
  onSelectHistoryItem?: (item: ReportHistoryItem) => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  reportActive: boolean;
  activeReportTab: ReportTab;
  onSelectReportTab: (tab: ReportTab) => void;
  onReset: () => void;
}

const LOGO_URL = "https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/1769462247681_90103e28-cdb1-49a9-a4c1-176a3ec95df2-1_all_5851.png";

export const Header: React.FC<HeaderProps> = ({ 
  onNavigate, 
  currentPage, 
  onToggleChat, 
  isChatOpen,
  reportActive,
  activeReportTab,
  onSelectReportTab,
  onReset
}) => {
  // Better refined icons
  const navItems: { label: string; icon: string; page: Page; color?: string }[] = [
    { label: 'Home', icon: 'fa-house', page: 'home' },
    { label: 'Vault', icon: 'fa-box-archive', page: 'vault' }, 
    { label: 'Docs', icon: 'fa-file-lines', page: 'docs' },
    { label: 'Safety', icon: 'fa-shield-heart', page: 'safety', color: 'text-red-600' },
  ];

  const reportNavItems: { label: string; icon: string; tab: ReportTab }[] = [
    { label: 'Home', icon: 'fa-house', tab: 'clinical-report' }, // Acts as "New Case" when Home is clicked in Report mode
    { label: 'Brief', icon: 'fa-id-card', tab: 'clinical-report' },
    { label: 'Record', icon: 'fa-dna', tab: 'extended-record' },
    { label: 'Plan', icon: 'fa-clipboard-user', tab: 'treatment-plan' },
    { label: 'PDF', icon: 'fa-file-circle-plus', tab: 'pdf-view' },
  ];

  const handleNavigate = (page: Page) => {
    if (reportActive && page === 'home') {
      onReset();
    } else {
      onNavigate(page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100 sticky top-0 z-[100] h-14 md:h-20 flex items-center shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => handleNavigate('home')}
          >
            <img 
              src={LOGO_URL} 
              alt="Logo" 
              className="h-8 md:h-12 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <div className="flex flex-col">
              <h1 className="text-[9px] md:text-sm font-black text-teal-900 tracking-[0.05em] leading-none uppercase">Integrative</h1>
              <h2 className="text-[9px] md:text-sm font-black text-teal-700 tracking-[0.05em] leading-none uppercase mt-0.5">Psychiatry</h2>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-400">
            {navItems.filter(i => i.label !== 'Vault').map((item) => (
              <button 
                key={item.page}
                onClick={() => handleNavigate(item.page)}
                className={`transition-colors flex items-center gap-2 ${currentPage === item.page && !reportActive ? (item.color || 'text-teal-800') : 'hover:text-teal-600'}`}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
             {/* CHAT BUTTON: Doubled the size as requested */}
             <button 
               onClick={onToggleChat}
               className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all border-2 ${
                 isChatOpen 
                   ? 'bg-teal-800 text-white border-teal-800 shadow-xl' 
                   : 'bg-teal-50 text-teal-800 border-teal-100 hover:bg-teal-100 hover:shadow-lg'
               }`}
               aria-label="Toggle Assistant"
             >
               <i className={`fa-solid ${isChatOpen ? 'fa-xmark' : 'fa-comment-dots'} text-lg md:text-2xl`}></i>
             </button>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV: Swaps content based on if a report is being viewed */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-teal-50 z-[100] flex justify-around items-center px-1 pb-6 pt-2 shadow-[0_-8px_25px_rgba(0,0,0,0.05)] h-20">
        {!reportActive ? (
          navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.page)}
                className={`flex flex-col items-center gap-1 min-w-[64px] transition-all ${
                  isActive ? (item.color || 'text-teal-800') : 'text-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-teal-50 text-teal-800 scale-110 shadow-sm' : 'bg-transparent'
                }`}>
                  <i className={`fa-solid ${item.icon} text-xl`}></i>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-[0.1em] transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
              </button>
            );
          })
        ) : (
          reportNavItems.map((item) => {
            const isHome = item.label === 'Home';
            const isActive = !isHome && activeReportTab === item.tab;
            return (
              <button
                key={item.label}
                onClick={() => isHome ? onReset() : onSelectReportTab(item.tab)}
                className={`flex flex-col items-center gap-1 min-w-[56px] transition-all ${
                  isActive ? 'text-teal-800' : 'text-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-teal-50 text-teal-800 scale-110 shadow-sm' : 'bg-transparent'
                }`}>
                  <i className={`fa-solid ${item.icon} text-lg`}></i>
                </div>
                <span className={`text-[7px] font-black uppercase tracking-[0.05em] transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
              </button>
            );
          })
        )}
      </nav>
    </>
  );
};
