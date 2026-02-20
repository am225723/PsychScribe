import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LOGO_URL = "https://hqlqtnjnyhafdnfetjac.supabase.co/storage/v1/object/public/logos/1ddf6eac-dd67-4615-83b7-937d71361e5b/1769462247681_90103e28-cdb1-49a9-a4c1-176a3ec95df2-1_all_5851.png";

const documentTypes = [
  {
    title: 'Intake Summary',
    subtitle: 'Clinical Synthesis Report',
    description: 'Transform raw intake data into an exhaustive clinical synthesis report with safety screening and treatment planning.',
    icon: 'fa-solid fa-file-medical',
    path: '/summary',
    color: 'bg-teal-50',
    iconColor: 'text-teal-700',
    borderColor: 'border-teal-100',
    hoverBorder: 'hover:border-teal-300',
    accentBg: 'bg-teal-600',
  },
  {
    title: 'Treatment Plan',
    subtitle: 'Clinical Mental Health Plan',
    description: 'Generate professional treatment plans with goals, objectives, MDM documentation, and prescription planning.',
    icon: 'fa-solid fa-clipboard-list',
    path: '/treatment',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    borderColor: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-300',
    accentBg: 'bg-emerald-600',
  },
  {
    title: 'Session Note',
    subtitle: 'DARP Progress Note',
    description: 'Create structured DARP session notes from audio transcripts, provider notes, or clinical observations.',
    icon: 'fa-solid fa-notes-medical',
    path: '/darp',
    color: 'bg-sky-50',
    iconColor: 'text-sky-700',
    borderColor: 'border-sky-100',
    hoverBorder: 'hover:border-sky-300',
    accentBg: 'bg-sky-600',
  },
];

interface DashboardProps {
  isDriveLinked?: boolean;
  accessToken?: string | null;
}

interface DriveFolder {
  id: string;
  name: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ isDriveLinked, accessToken }) => {
  const navigate = useNavigate();
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentParentId, setCurrentParentId] = useState('root');
  const [currentParentName, setCurrentParentName] = useState('My Drive');
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'My Drive' }]);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(() => localStorage.getItem('drive_patient_folder_name'));
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => localStorage.getItem('drive_patient_folder_id'));
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  const extractFolderIdFromUrl = (url: string): string | null => {
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const lookupFolderName = async (folderId: string): Promise<string> => {
    if (!accessToken) throw new Error("Not authenticated with Drive");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=name&supportsAllDrives=true`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const reason = errorData?.error?.message || '';
      if (res.status === 404) {
        throw new Error("Folder not found. Make sure your Google Drive is linked with the same account that owns this folder. The URL has /u/2/ which means a different account.");
      }
      throw new Error(reason || "Could not access that folder");
    }
    const data = await res.json();
    return data.name;
  };

  const handlePasteUrl = async () => {
    setUrlError('');
    const folderId = extractFolderIdFromUrl(urlInput.trim());
    if (!folderId) {
      setUrlError('Please paste a valid Google Drive folder URL');
      return;
    }
    setUrlLoading(true);
    try {
      const name = await lookupFolderName(folderId);
      setSelectedFolderId(folderId);
      setSelectedFolderName(name);
      localStorage.setItem('drive_patient_folder_id', folderId);
      localStorage.setItem('drive_patient_folder_name', name);
      setShowFolderBrowser(false);
      setUrlInput('');
    } catch (err: any) {
      setUrlError(err.message || 'Failed to look up folder');
    } finally {
      setUrlLoading(false);
    }
  };

  const setFolderDirectly = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    localStorage.setItem('drive_patient_folder_id', folderId);
    localStorage.setItem('drive_patient_folder_name', folderName);
  };

  const loadFolders = async (parentId: string) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name&pageSize=100`, {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      const data = await res.json();
      setFolders(data.files || []);
    } catch (err) {
      console.error("Failed to load Drive folders", err);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const openFolderBrowser = () => {
    setShowFolderBrowser(true);
    setCurrentParentId('root');
    setCurrentParentName('My Drive');
    setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    loadFolders('root');
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentParentId(folderId);
    setCurrentParentName(folderName);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
    loadFolders(folderId);
  };

  const navigateToBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    setCurrentParentId(crumb.id);
    setCurrentParentName(crumb.name);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    loadFolders(crumb.id);
  };

  const selectCurrentFolder = () => {
    setSelectedFolderId(currentParentId);
    setSelectedFolderName(currentParentName);
    localStorage.setItem('drive_patient_folder_id', currentParentId);
    localStorage.setItem('drive_patient_folder_name', currentParentName);
    setShowFolderBrowser(false);
  };

  const selectSpecificFolder = (folder: DriveFolder) => {
    setSelectedFolderId(folder.id);
    setSelectedFolderName(folder.name);
    localStorage.setItem('drive_patient_folder_id', folder.id);
    localStorage.setItem('drive_patient_folder_name', folder.name);
    setShowFolderBrowser(false);
  };

  const clearSelection = () => {
    setSelectedFolderId(null);
    setSelectedFolderName(null);
    localStorage.removeItem('drive_patient_folder_id');
    localStorage.removeItem('drive_patient_folder_name');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3 pt-4">
        <div className="relative group inline-block">
          <div className="absolute inset-0 bg-teal-400 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <img src={LOGO_URL} alt="Dr. Zelisko Logo" className="w-20 h-20 mx-auto relative z-10 drop-shadow-2xl transition-transform group-hover:scale-110 duration-700" />
        </div>
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-teal-950 tracking-tighter uppercase lg:text-5xl">Dr. Zelisko Intake</h2>
          <p className="text-teal-800/60 max-w-xl mx-auto text-xs font-bold leading-relaxed uppercase tracking-[0.4em]">Clinical Synthesis Engine: drz.services</p>
        </div>
      </div>

      {isDriveLinked && (
        <div className="px-2">
          <div className="bg-white rounded-[2rem] border-2 border-indigo-100 shadow-lg p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <i className="fa-solid fa-folder-tree text-xl"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-teal-950 uppercase tracking-tight">Patient Folder Location</h3>
                  {selectedFolderName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <i className="fa-brands fa-google-drive text-indigo-500 text-xs"></i>
                      <span className="text-sm font-bold text-indigo-700">{selectedFolderName}</span>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-teal-800/40 mt-1">No folder selected — saves will search for "PatientForms" in Drive root</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedFolderName && (
                  <button
                    onClick={clearSelection}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={openFolderBrowser}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  {selectedFolderName ? 'Change Folder' : 'Select Folder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFolderBrowser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-teal-50 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-black text-teal-950 uppercase tracking-tight">Select Patient Folder</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40 mt-1">Browse to the folder that contains all patient subfolders</p>
              </div>
              <button
                onClick={() => setShowFolderBrowser(false)}
                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="px-6 py-3 border-b border-teal-50 flex-shrink-0 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
                  placeholder="Paste a Google Drive folder URL here..."
                  className="flex-grow px-4 py-2.5 rounded-xl border border-teal-100 bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 outline-none text-sm font-bold text-teal-950 placeholder:text-teal-800/20 transition-all"
                />
                <button
                  onClick={handlePasteUrl}
                  disabled={!urlInput.trim() || urlLoading}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    urlInput.trim() && !urlLoading
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  {urlLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-link"></i>}
                  Set
                </button>
              </div>
              {urlError && (
                <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-exclamation"></i> {urlError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <div className="flex-grow h-px bg-teal-100"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-teal-800/30">or browse</span>
                <div className="flex-grow h-px bg-teal-100"></div>
              </div>
            </div>

            <div className="px-6 py-3 border-b border-teal-50 flex items-center gap-1 flex-wrap flex-shrink-0">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.id}>
                  {i > 0 && <i className="fa-solid fa-chevron-right text-[8px] text-teal-300 mx-1"></i>}
                  <button
                    onClick={() => navigateToBreadcrumb(i)}
                    className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${
                      i === breadcrumbs.length - 1
                        ? 'text-teal-900 bg-teal-50'
                        : 'text-teal-600 hover:bg-teal-50'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-1 min-h-[200px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <i className="fa-solid fa-circle-notch animate-spin text-teal-600 text-xl mr-3"></i>
                  <span className="text-sm font-bold text-teal-800/60">Loading folders...</span>
                </div>
              ) : folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <i className="fa-solid fa-folder-open text-teal-200 text-4xl mb-3"></i>
                  <p className="text-sm font-bold text-teal-800/40">No subfolders found</p>
                  <p className="text-xs text-teal-800/30 mt-1">You can select this folder as your patient folder</p>
                </div>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 flex-shrink-0">
                      <i className="fa-solid fa-folder text-lg"></i>
                    </div>
                    <span className="text-sm font-bold text-teal-950 flex-grow truncate">{folder.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => selectSpecificFolder(folder)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                        title="Use this folder as the patient folder"
                      >
                        Select
                      </button>
                      <button
                        onClick={() => navigateToFolder(folder.id, folder.name)}
                        className="px-3 py-1.5 rounded-lg bg-teal-100 text-teal-700 text-[9px] font-black uppercase tracking-widest hover:bg-teal-200 transition-colors"
                        title="Open this folder"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-teal-50 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
              <div className="text-xs font-bold text-teal-800/40 flex items-center gap-2">
                <i className="fa-solid fa-folder-open text-teal-400"></i>
                Current: <span className="text-teal-700">{currentParentName}</span>
              </div>
              <button
                onClick={selectCurrentFolder}
                className="px-6 py-3 rounded-2xl bg-teal-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-[0.98]"
              >
                Use This Folder
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-teal-800/40">Select Document Type</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 px-2">
        {documentTypes.map((doc) => (
          <button
            key={doc.path}
            onClick={() => navigate(doc.path)}
            className={`group relative bg-white p-6 rounded-[2rem] border-2 ${doc.borderColor} ${doc.hoverBorder} shadow-lg hover:shadow-2xl transition-all text-left flex flex-col gap-4 active:scale-[0.98] cursor-pointer`}
          >
            <div className={`w-14 h-14 ${doc.color} rounded-2xl flex items-center justify-center ${doc.iconColor} transition-transform group-hover:scale-110`}>
              <i className={`${doc.icon} text-2xl`}></i>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-teal-950 uppercase tracking-tight">{doc.title}</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40">{doc.subtitle}</p>
            </div>

            <p className="text-sm text-teal-800/60 font-bold leading-relaxed">{doc.description}</p>

            <div className="mt-auto pt-3 border-t border-teal-50 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/30 group-hover:text-teal-800 transition-colors flex items-center gap-2">
                Open <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
              </span>
              <div className={`w-8 h-8 ${doc.accentBg} rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all`}>
                <i className="fa-solid fa-chevron-right text-white text-xs"></i>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="px-2 pt-2">
        <button
          onClick={() => navigate('/batch')}
          className="group w-full bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-[2rem] border-2 border-amber-100 hover:border-amber-300 shadow-lg hover:shadow-2xl transition-all text-left flex items-center gap-6 active:scale-[0.99] cursor-pointer"
        >
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 transition-transform group-hover:scale-110 flex-shrink-0">
            <i className="fa-solid fa-layer-group text-2xl"></i>
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-black text-teal-950 uppercase tracking-tight">Batch Processing</h3>
            <p className="text-sm text-teal-800/60 font-bold leading-relaxed mt-1">Upload multiple patient files and process them all at once. Results are saved automatically to the patient database.</p>
          </div>
          <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
            <i className="fa-solid fa-chevron-right text-white text-sm"></i>
          </div>
        </button>
      </div>
    </div>
  );
};
