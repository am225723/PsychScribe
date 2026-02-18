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
  hasApiKey: boolean;
  isDriveLinked: boolean;
  linkedEmail: string | null;
  onLinkDrive: () => void;
  isLinking: boolean;
}

const LOGO_URL = "https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/1769462247681_90103e28-cdb1-49a9-a4c1-176a3ec95df2-1_all_5851.png";

export const Header: React.FC<HeaderProps> = ({ 
  onToggleChat, 
  isChatOpen,
  reportActive,
  activeReportTab,
  onSelectReportTab,
  onReset,
  hasApiKey,
  isDriveLinked,
  linkedEmail,
  onLinkDrive,
  isLinking,
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
    if (page === 'home') {
      return location.pathname === '/' || location.pathname === '/summary' || location.pathname === '/treatment' || location.pathname === '/darp';
    }
    return location.pathname === path;
  };

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100 sticky top-0 z-[100] shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-20">
            <div 
              className="flex items-center gap-2 md:gap-4 cursor-pointer group"
              onClick={() => handleNavigate('home')}
            >
              <img 
                src={LOGO_URL} 
                alt="Dr. Zelisko Logo" 
                className="h-8 md:h-14 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col">
                <h1 className="text-[9px] md:text-base font-black text-teal-900 tracking-[0.05em] leading-none uppercase">Dr. Zelisko</h1>
                <h2 className="text-[9px] md:text-base font-black text-teal-700 tracking-[0.05em] leading-none uppercase mt-0.5">Integrative Psych</h2>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
                hasApiKey ? 'bg-teal-50/60 border-teal-100/60' : 'bg-amber-50 border-amber-200'
              }`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  hasApiKey ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <i className={`fa-solid ${hasApiKey ? 'fa-circle-check' : 'fa-key'} text-[10px]`}></i>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${
                  hasApiKey ? 'text-teal-700' : 'text-amber-700'
                }`}>
                  {hasApiKey ? 'System Ready' : 'Key Required'}
                </span>
              </div>

              <div 
                onClick={!isDriveLinked ? onLinkDrive : undefined}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
                  isDriveLinked 
                    ? 'bg-emerald-50/60 border-emerald-200/60' 
                    : 'bg-white border-teal-100 hover:border-teal-300 cursor-pointer hover:shadow-md'
                } ${isLinking ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                  isDriveLinked ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isLinking 
                    ? <i className="fa-solid fa-circle-notch animate-spin text-[10px]"></i>
                    : <i className="fa-brands fa-google-drive text-[10px]"></i>
                  }
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${
                  isDriveLinked ? 'text-emerald-700' : 'text-slate-400'
                }`}>
                  {isLinking ? 'Linking...' : isDriveLinked ? 'Drive Synced' : 'Link Drive'}
                </span>
                {isDriveLinked && linkedEmail && (
                  <span className="text-[8px] font-bold text-emerald-600/50 truncate max-w-[120px]">{linkedEmail}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex md:hidden items-center gap-1.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  hasApiKey ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <i className={`fa-solid ${hasApiKey ? 'fa-circle-check' : 'fa-key'} text-[9px]`}></i>
                </div>
                <div 
                  onClick={!isDriveLinked ? onLinkDrive : undefined}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isDriveLinked ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                  } ${!isDriveLinked ? 'cursor-pointer' : ''}`}
                >
                  {isLinking 
                    ? <i className="fa-solid fa-circle-notch animate-spin text-[9px]"></i>
                    : <i className="fa-brands fa-google-drive text-[9px]"></i>
                  }
                </div>
              </div>
              <button 
                onClick={onToggleChat}
                className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all border-2 ${
                  isChatOpen 
                    ? 'bg-teal-800 text-white border-teal-800 shadow-xl' 
                    : 'bg-teal-50 text-teal-800 border-teal-100 hover:bg-teal-100 hover:shadow-lg'
                }`}
                aria-label="Toggle Dr. Zelisko AI Assistant"
              >
                <i className={`fa-solid ${isChatOpen ? 'fa-xmark' : 'fa-comment-dots'} text-lg md:text-2xl`}></i>
              </button>
            </div>
          </div>
        </div>
      </header>

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
