import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Page, ReportHistoryItem, ReportTab } from '../App';

interface HeaderProps {
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
  onToggleChat, 
  isChatOpen,
  reportActive,
  activeReportTab,
  onSelectReportTab,
  onReset
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getPath = (page: Page): string => {
    switch (page) {
      case 'home': return '/';
      case 'vault': return '/vault';
      case 'docs': return '/docs';
      case 'safety': return '/safety';
      case 'hipaa': return '/hipaa';
      case 'support': return '/support';
      default: return '/';
    }
  };

  const navItems: { label: string; icon: string; page: Page; color?: string }[] = [
    { label: 'Home', icon: 'fa-house', page: 'home' },
    { label: 'Vault', icon: 'fa-box-archive', page: 'vault' }, 
    { label: 'Docs', icon: 'fa-file-lines', page: 'docs' },
    { label: 'Safety', icon: 'fa-shield-heart', page: 'safety', color: 'text-red-600' },
  ];

  const reportNavItems: { label: string; icon: string; tab: ReportTab }[] = [
    { label: 'Home', icon: 'fa-house', tab: 'clinical-report' },
    { label: 'Brief', icon: 'fa-id-card', tab: 'clinical-report' },
    { label: 'Record', icon: 'fa-dna', tab: 'extended-record' },
    { label: 'Plan', icon: 'fa-clipboard-user', tab: 'treatment-plan' },
    { label: 'PDF', icon: 'fa-file-circle-plus', tab: 'pdf-view' },
  ];

  const handleNavigate = (page: Page) => {
    const path = getPath(page);
    if (reportActive && page === 'home') {
      onReset();
      navigate('/');
    } else {
      navigate(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isCurrentPage = (page: Page) => {
    const path = getPath(page);
    return location.pathname === path;
  };

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100 sticky top-0 z-[100] h-14 flex items-center shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => handleNavigate('home')}
          >
            <img 
              src={LOGO_URL} 
              alt="Dr. Zelisko Logo" 
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <div className="flex flex-col">
              <h1 className="text-[9px] font-black text-teal-900 tracking-[0.05em] leading-none uppercase">Dr. Zelisko</h1>
              <h2 className="text-[9px] font-black text-teal-700 tracking-[0.05em] leading-none uppercase mt-0.5">Integrative Psych</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button 
               onClick={onToggleChat}
               className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${
                 isChatOpen 
                   ? 'bg-teal-800 text-white border-teal-800 shadow-xl' 
                   : 'bg-teal-50 text-teal-800 border-teal-100 hover:bg-teal-100 hover:shadow-lg'
               }`}
               aria-label="Toggle Dr. Zelisko AI Assistant"
             >
               <i className={`fa-solid ${isChatOpen ? 'fa-xmark' : 'fa-comment-dots'} text-lg`}></i>
             </button>
          </div>
        </div>
      </header>

      {/* FIXED BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-teal-50 z-[100] flex justify-around items-center px-1 pb-6 pt-2 shadow-[0_-8px_25px_rgba(0,0,0,0.05)] h-20">
        {!reportActive ? (
          navItems.map((item) => {
            const isActive = isCurrentPage(item.page);
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
                onClick={() => {
                   if (isHome) {
                     onReset();
                     navigate('/');
                   } else {
                     onSelectReportTab(item.tab);
                   }
                }}
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
