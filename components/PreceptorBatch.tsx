import React, { useMemo, useRef, useState } from 'react';
import {
  generateV1V2DifferencesExplainer,
  generateZeliskoSuperPreceptorV1,
  generateZeliskoSuperPreceptorV2,
} from '../services/geminiService';
import {
  clearStoredDirectoryHandle,
  generateZeliskoBundlePdf,
  getOrRequestPatientsParentDirectoryHandle,
  savePdfToDirectory,
  supportsFileSystemAccess,
  triggerBrowserDownload,
} from '../services/preceptorPdfService';
import type { VaultItem } from '../services/vaultService';

interface PreceptorBatchProps {
  onSaveVaultItem?: (item: VaultItem) => void;
  patientsParentHandle: FileSystemDirectoryHandle | null;
  onPatientsParentHandleChange: (handle: FileSystemDirectoryHandle | null) => void;
}

type BatchStatus = 'queued' | 'running' | 'done' | 'error';

type BatchRow = {
  id: string;
  file: File;
  firstInitial: string;
  lastName: string;
  patientFolderName: string;
  status: BatchStatus;
  progress: number;
  message: string;
  v1Progress: number;
  v2Progress: number;
  pdfProgress: number;
  savedPath?: string;
  error?: string;
};

function toBase64Part(file: File): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve({ mimeType: file.type || 'application/pdf', data: result.split(',')[1] ?? '' });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function sanitizeNamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

function guessPatientFromFileName(name: string): { firstInitial: string; lastName: string; patientFolderName: string } {
  const baseName = name.replace(/\.[^/.]+$/, '');
  const tokens = baseName.split(/[_\-\s]+/).filter(Boolean);

  const guessedLastName = sanitizeNamePart(tokens[tokens.length - 1] ?? 'Unknown') || 'Unknown';
  const firstToken = sanitizeNamePart(tokens[0] ?? 'X') || 'X';
  const guessedFirstInitial = firstToken[0]?.toUpperCase() ?? 'X';
  const folder = `${guessedLastName}_${guessedFirstInitial}`;

  return {
    firstInitial: guessedFirstInitial,
    lastName: guessedLastName,
    patientFolderName: folder,
  };
}

export const PreceptorBatch: React.FC<PreceptorBatchProps> = ({
  onSaveVaultItem,
  patientsParentHandle,
  onPatientsParentHandleChange,
}) => {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [downloadPdfs, setDownloadPdfs] = useState(false);
  const [autoSaveToFolder, setAutoSaveToFolder] = useState(supportsFileSystemAccess());
  const [batchMessage, setBatchMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const supportsFS = supportsFileSystemAccess();

  const totals = useMemo(() => {
    const done = rows.filter((r) => r.status === 'done').length;
    const failed = rows.filter((r) => r.status === 'error').length;
    return { total: rows.length, done, failed };
  }, [rows]);

  const updateRow = (id: string, patch: Partial<BatchRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const next: BatchRow[] = Array.from(fileList).map((file, index) => {
      const guessed = guessPatientFromFileName(file.name);
      return {
        id: `${Date.now()}-${index}`,
        file,
        firstInitial: guessed.firstInitial,
        lastName: guessed.lastName,
        patientFolderName: guessed.patientFolderName,
        status: 'queued',
        progress: 0,
        message: 'Waiting',
        v1Progress: 0,
        v2Progress: 0,
        pdfProgress: 0,
      };
    });

    setRows((prev) => [...prev, ...next]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSetFolder = async () => {
    try {
      const handle = await getOrRequestPatientsParentDirectoryHandle();
      onPatientsParentHandleChange(handle);
      if (handle) {
        setBatchMessage('Patients folder set for batch auto-save.');
      }
    } catch (error: any) {
      setBatchMessage(error?.message || 'Folder permission request failed.');
    }
  };

  const handleClearFolder = async () => {
    await clearStoredDirectoryHandle();
    onPatientsParentHandleChange(null);
    setBatchMessage('Stored folder permission cleared.');
  };

  const processBatch = async () => {
    if (rows.length === 0 || isRunning) return;

    setIsRunning(true);
    setBatchMessage('Batch processing started.');

    let activeHandle = patientsParentHandle;
    if (autoSaveToFolder && supportsFS && !activeHandle) {
      activeHandle = await getOrRequestPatientsParentDirectoryHandle();
      onPatientsParentHandleChange(activeHandle);
    }

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      setCurrentIndex(index + 1);

      try {
        updateRow(row.id, {
          status: 'running',
          progress: 5,
          message: 'Reading file...',
          v1Progress: 0,
          v2Progress: 0,
          pdfProgress: 0,
        });

        const part = await toBase64Part(row.file);

        updateRow(row.id, { progress: 20, message: 'Generating Zelisko v1...', v1Progress: 15, v2Progress: 0 });
        const v1 = await generateZeliskoSuperPreceptorV1([part]);
        updateRow(row.id, { progress: 40, v1Progress: 100, message: 'Generating Zelisko v2...', v2Progress: 20 });
        const v2 = await generateZeliskoSuperPreceptorV2([part]);
        updateRow(row.id, { progress: 55, v2Progress: 100 });

        updateRow(row.id, { progress: 65, message: 'Generating v1/v2 differences...' });
        const differencesExplainer = await generateV1V2DifferencesExplainer();

        updateRow(row.id, { progress: 75, message: 'Creating bundle PDF...', pdfProgress: 35 });
        const { doc, filename, pdfBytes } = generateZeliskoBundlePdf({
          patientFirstInitial: row.firstInitial,
          patientLastName: row.lastName,
          date: new Date(),
          differencesExplainer,
          v1,
          v2,
        });

        if (downloadPdfs) {
          triggerBrowserDownload(doc, filename);
        }
        updateRow(row.id, { progress: 85, pdfProgress: 70 });

        let savedPath: string | undefined;
        if (autoSaveToFolder && supportsFS) {
          if (!activeHandle) {
            activeHandle = await getOrRequestPatientsParentDirectoryHandle();
            onPatientsParentHandleChange(activeHandle);
          }

          if (activeHandle) {
            savedPath = await savePdfToDirectory({
              pdfBytes,
              filename,
              patientsParentDirHandle: activeHandle,
              patientFolderName: row.patientFolderName,
            });
          }
        }

        const vaultItem: VaultItem = {
          id: `preceptor-batch-${Date.now()}-${row.id}`,
          createdAt: new Date().toISOString(),
          documentType: 'preceptor',
          patient: {
            firstInitial: row.firstInitial,
            lastName: row.lastName,
            folderName: row.patientFolderName,
          },
          sourceFileName: row.file.name,
          sourceMimeType: row.file.type,
          generatedText: [v1, v2].join('\n\n'),
          preceptorV1Text: v1,
          preceptorV2Text: v2,
          differencesExplainer,
          title: 'Dr. Zelisko — Super Preceptor Case Review Bundle',
        };
        onSaveVaultItem?.(vaultItem);

        const resultMessage = savedPath
          ? downloadPdfs
            ? 'Done (downloaded + saved)'
            : 'Done (saved)'
          : downloadPdfs
            ? 'Done (downloaded)'
            : autoSaveToFolder && supportsFS
              ? 'Done (folder permission missing)'
              : 'Done';

        updateRow(row.id, {
          status: 'done',
          progress: 100,
          message: resultMessage,
          savedPath,
          error: undefined,
          pdfProgress: 100,
        });
      } catch (error: any) {
        updateRow(row.id, {
          status: 'error',
          progress: 100,
          message: 'Failed',
          error: error?.message || 'Batch item failed',
        });
      }
    }

    setBatchMessage('Batch complete. Review success/failure states below.');
    setIsRunning(false);
  };

  const clearRows = () => {
    if (isRunning) return;
    setRows([]);
    setBatchMessage('');
    setCurrentIndex(0);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-teal-50 p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40">Batch Intake</p>
            <h3 className="text-lg font-black text-teal-950 uppercase tracking-tight">Preceptor Batch Mode</h3>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a"
            onChange={(e) => handleAddFiles(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
            className="px-5 py-3 rounded-2xl bg-teal-900 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50"
          >
            <i className="fa-solid fa-plus mr-2"></i>
            Add Files
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-teal-900">
            <input
              type="checkbox"
              checked={downloadPdfs}
              onChange={(e) => setDownloadPdfs(e.target.checked)}
              className="w-4 h-4"
              disabled={isRunning}
            />
            Download PDFs (optional)
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-teal-900">
            <input
              type="checkbox"
              checked={autoSaveToFolder}
              onChange={(e) => setAutoSaveToFolder(e.target.checked)}
              className="w-4 h-4"
              disabled={!supportsFS || isRunning}
            />
            Auto-save PDFs to ClientCaseNotes
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSetFolder}
            disabled={!supportsFS || isRunning}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Set Patients Folder
          </button>
          <button
            onClick={handleClearFolder}
            disabled={!supportsFS || isRunning}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Clear Folder Permission
          </button>
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-800/50">
            {supportsFS ? (patientsParentHandle ? 'Folder set' : 'Folder not set') : 'Auto-save unavailable in this browser.'}
          </span>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-teal-50 p-4 space-y-3 overflow-auto">
          <table className="w-full min-w-[920px] text-xs">
            <thead>
              <tr className="text-teal-800/50 uppercase tracking-[0.15em] text-[10px]">
                <th className="text-left py-2">File</th>
                <th className="text-left py-2">First Initial</th>
                <th className="text-left py-2">Last Name</th>
                <th className="text-left py-2">Patient Folder</th>
                <th className="text-left py-2">Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-teal-50">
                  <td className="py-2 font-bold text-teal-900 max-w-[220px] truncate" title={row.file.name}>{row.file.name}</td>
                  <td className="py-2">
                    <input
                      value={row.firstInitial}
                      disabled={isRunning}
                      onChange={(e) => updateRow(row.id, { firstInitial: e.target.value.toUpperCase().slice(0, 1) })}
                      className="w-14 px-2 py-1 border border-teal-100 rounded"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      value={row.lastName}
                      disabled={isRunning}
                      onChange={(e) => {
                        const lastName = e.target.value;
                        updateRow(row.id, {
                          lastName,
                          patientFolderName: `${sanitizeNamePart(lastName) || 'Unknown'}_${row.firstInitial || 'X'}`,
                        });
                      }}
                      className="w-36 px-2 py-1 border border-teal-100 rounded"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      value={row.patientFolderName}
                      disabled={isRunning}
                      onChange={(e) => updateRow(row.id, { patientFolderName: e.target.value })}
                      className="w-44 px-2 py-1 border border-teal-100 rounded"
                    />
                  </td>
                  <td className="py-2">
                    <div className="space-y-2">
                      <div className="h-2 bg-teal-50 rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${row.status === 'error' ? 'bg-red-500' : 'bg-teal-600'}`}
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <div className="font-bold text-teal-800/70 mb-1 uppercase tracking-wider">v1</div>
                          <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                            <div className="h-full bg-teal-500" style={{ width: `${row.v1Progress}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-teal-800/70 mb-1 uppercase tracking-wider">v2</div>
                          <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${row.v2Progress}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-teal-800/70 mb-1 uppercase tracking-wider">pdf</div>
                          <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${row.pdfProgress}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-teal-800/70">
                        {row.message}{row.error ? `: ${row.error}` : ''}
                      </div>
                      {row.savedPath && <div className="text-[10px] text-emerald-700">Saved: {row.savedPath}</div>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-teal-50 p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em]">
            <span className="text-teal-800/50">Overall Progress</span>
            <span className="text-teal-900">{totals.done + totals.failed} / {totals.total}</span>
          </div>
          <div className="h-3 bg-teal-50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 transition-all"
              style={{ width: `${totals.total > 0 ? ((totals.done + totals.failed) / totals.total) * 100 : 0}%` }}
            />
          </div>
          {isRunning && (
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
              Processing patient {currentIndex} of {totals.total}
            </p>
          )}
          {batchMessage && <p className="text-xs font-bold text-teal-900/70">{batchMessage}</p>}

          <div className="flex gap-2">
            <button
              onClick={processBatch}
              disabled={isRunning || rows.length === 0}
              className="flex-1 py-3 rounded-xl bg-teal-900 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-black disabled:opacity-40"
            >
              Run Batch
            </button>
            <button
              onClick={clearRows}
              disabled={isRunning}
              className="px-4 py-3 rounded-xl border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-wider hover:bg-red-50 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
