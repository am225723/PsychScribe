import React, { useState, useRef } from 'react';
import { FileData } from '../types';
import { analyzeIntake } from '../services/geminiService';
import { findOrCreatePatient, saveReport } from '../services/supabaseService';
import type { DocumentType, AnalysisMetadata } from '../services/geminiService';

interface BatchProcessingProps {
  isDriveLinked: boolean;
  accessToken: string | null;
  onComplete: () => void;
}

interface GroupFile {
  id: string;
  fileName: string;
  fileData: FileData;
}

interface Session {
  id: string;
  dateOfService: string;
  files: GroupFile[];
  status: 'queued' | 'processing' | 'completed' | 'error';
  patientName?: string;
  error?: string;
}

interface ClientGroup {
  id: string;
  documentType: DocumentType;
  files: GroupFile[];
  clientId: string;
  dateOfService: string;
  sessions: Session[];
  status: 'queued' | 'processing' | 'completed' | 'error';
  patientName?: string;
  error?: string;
}

export const BatchProcessing: React.FC<BatchProcessingProps> = ({ onComplete }) => {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const abortRef = useRef(false);

  const addGroup = () => {
    const newGroup: ClientGroup = {
      id: `group-${Date.now()}`,
      documentType: 'summary',
      files: [],
      clientId: '',
      dateOfService: '',
      sessions: [],
      status: 'queued',
    };
    setGroups(prev => [...prev, newGroup]);
  };

  const removeGroup = (groupId: string) => {
    if (!isRunning) {
      setGroups(prev => prev.filter(g => g.id !== groupId));
    }
  };

  const updateGroup = (groupId: string, updates: Partial<ClientGroup>) => {
    if (updates.documentType === 'darp') {
      const group = groups.find(g => g.id === groupId);
      if (group && group.documentType !== 'darp' && group.sessions.length === 0) {
        updates.sessions = [{
          id: `session-${Date.now()}`,
          dateOfService: '',
          files: [],
          status: 'queued',
        }];
      }
    } else if (updates.documentType && updates.documentType !== 'darp') {
      updates.sessions = [];
    }
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g));
  };

  const addSession = (groupId: string) => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      dateOfService: '',
      files: [],
      status: 'queued',
    };
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, sessions: [...g.sessions, newSession] } : g
    ));
  };

  const removeSession = (groupId: string, sessionId: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, sessions: g.sessions.filter(s => s.id !== sessionId) } : g
    ));
  };

  const updateSession = (groupId: string, sessionId: string, updates: Partial<Session>) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, sessions: g.sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s) }
        : g
    ));
  };

  const readFilesToGroupFiles = async (selectedFiles: FileList): Promise<GroupFile[]> => {
    const newFiles: GroupFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });
      newFiles.push({
        id: `file-${Date.now()}-${i}`,
        fileName: file.name,
        fileData: { mimeType: file.type, base64, name: file.name },
      });
    }
    return newFiles;
  };

  const handleFilesForGroup = async (groupId: string, selectedFiles: FileList) => {
    const newFiles = await readFilesToGroupFiles(selectedFiles);
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, files: [...g.files, ...newFiles] } : g
    ));
    const ref = fileInputRefs.current[groupId];
    if (ref) ref.value = '';
  };

  const handleFilesForSession = async (groupId: string, sessionId: string, selectedFiles: FileList) => {
    const newFiles = await readFilesToGroupFiles(selectedFiles);
    setGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, sessions: g.sessions.map(s => s.id === sessionId ? { ...s, files: [...s.files, ...newFiles] } : s) }
        : g
    ));
    const ref = fileInputRefs.current[`${groupId}-${sessionId}`];
    if (ref) ref.value = '';
  };

  const removeFileFromGroup = (groupId: string, fileId: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, files: g.files.filter(f => f.id !== fileId) } : g
    ));
  };

  const removeFileFromSession = (groupId: string, sessionId: string, fileId: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, sessions: g.sessions.map(s => s.id === sessionId ? { ...s, files: s.files.filter(f => f.id !== fileId) } : s) }
        : g
    ));
  };

  const clearAll = () => {
    if (!isRunning) {
      setGroups([]);
      setCompletedCount(0);
    }
  };

  const processOneReport = async (
    fileParts: { mimeType: string; data: string }[],
    documentType: DocumentType,
    metadata?: AnalysisMetadata
  ) => {
    const result = await analyzeIntake(fileParts, documentType, metadata);
    const nameMatch = result.match(/PATIENT_NAME:\s*(.*)/i);
    const patientName = nameMatch ? nameMatch[1].trim().replace(/\*+/g, '') : 'Unknown Patient';
    const clientIdMatch = result.match(/CLIENT_ID:\s*(.*)/i);
    const clientId = clientIdMatch ? clientIdMatch[1].trim().replace(/\*+/g, '') : metadata?.clientId || undefined;
    const dobMatch = result.match(/DOB:\s*(.*)/i);
    const dob = dobMatch ? dobMatch[1].trim().replace(/\*+/g, '') : undefined;

    try {
      const patient = await findOrCreatePatient(patientName, dob, clientId);
      await saveReport(patient.id, documentType, result, result.includes('🚨'));
    } catch (dbErr) {
      console.error('Database save error (report still generated):', dbErr);
    }

    return patientName;
  };

  const processBatch = async () => {
    setIsRunning(true);
    abortRef.current = false;
    setCompletedCount(0);
    let completed = 0;

    for (let i = 0; i < groups.length; i++) {
      if (abortRef.current) break;
      const group = groups[i];

      if (group.documentType === 'darp') {
        const validSessions = group.sessions.filter(s => s.files.length > 0);
        if (validSessions.length === 0 || group.status === 'completed') {
          if (group.status === 'completed') completed++;
          continue;
        }

        setGroups(prev => prev.map(g => g.id === group.id ? { ...g, status: 'processing' } : g));
        let allSessionsDone = true;
        let lastPatientName = '';

        for (let j = 0; j < group.sessions.length; j++) {
          if (abortRef.current) { allSessionsDone = false; break; }
          const session = group.sessions[j];
          if (session.files.length === 0 || session.status === 'completed') continue;

          setGroups(prev => prev.map(g =>
            g.id === group.id
              ? { ...g, sessions: g.sessions.map(s => s.id === session.id ? { ...s, status: 'processing' } : s) }
              : g
          ));

          try {
            const fileParts = session.files.map(f => ({ mimeType: f.fileData.mimeType, data: f.fileData.base64 }));
            const metadata: AnalysisMetadata | undefined = session.dateOfService
              ? { dateOfService: session.dateOfService }
              : undefined;
            const patientName = await processOneReport(fileParts, 'darp', metadata);
            lastPatientName = patientName;

            setGroups(prev => prev.map(g =>
              g.id === group.id
                ? { ...g, sessions: g.sessions.map(s => s.id === session.id ? { ...s, status: 'completed', patientName } : s) }
                : g
            ));
          } catch (err: any) {
            allSessionsDone = false;
            setGroups(prev => prev.map(g =>
              g.id === group.id
                ? { ...g, sessions: g.sessions.map(s => s.id === session.id ? { ...s, status: 'error', error: err.message || 'Processing failed' } : s) }
                : g
            ));
          }
        }

        const finalStatus = allSessionsDone ? 'completed' : 'error';
        if (allSessionsDone) completed++;
        setCompletedCount(completed);
        setGroups(prev => prev.map(g => g.id === group.id ? { ...g, status: finalStatus, patientName: lastPatientName } : g));
      } else {
        if (group.status === 'completed' || group.files.length === 0) {
          if (group.status === 'completed') completed++;
          continue;
        }

        setGroups(prev => prev.map(g => g.id === group.id ? { ...g, status: 'processing' } : g));

        try {
          const fileParts = group.files.map(f => ({ mimeType: f.fileData.mimeType, data: f.fileData.base64 }));
          const metadata: AnalysisMetadata | undefined =
            group.documentType === 'treatment' && (group.clientId || group.dateOfService)
              ? { clientId: group.clientId || undefined, dateOfService: group.dateOfService || undefined }
              : undefined;

          const patientName = await processOneReport(fileParts, group.documentType, metadata);
          completed++;
          setCompletedCount(completed);
          setGroups(prev => prev.map(g => g.id === group.id ? { ...g, status: 'completed', patientName } : g));
        } catch (err: any) {
          setGroups(prev => prev.map(g => g.id === group.id ? { ...g, status: 'error', error: err.message || 'Processing failed' } : g));
        }
      }
    }

    setIsRunning(false);
    onComplete();
  };

  const stopBatch = () => {
    abortRef.current = true;
  };

  const getTotalReportCount = () => {
    let count = 0;
    for (const g of groups) {
      if (g.documentType === 'darp') {
        count += g.sessions.filter(s => s.files.length > 0).length;
      } else if (g.files.length > 0) {
        count += 1;
      }
    }
    return count;
  };

  const getQueuedCount = () => {
    let count = 0;
    for (const g of groups) {
      if (g.status !== 'queued') continue;
      if (g.documentType === 'darp') {
        count += g.sessions.filter(s => s.files.length > 0 && s.status === 'queued').length > 0 ? 1 : 0;
      } else if (g.files.length > 0) {
        count += 1;
      }
    }
    return count;
  };

  const doneCount = groups.filter(g => g.status === 'completed').length;
  const errorCount = groups.filter(g => g.status === 'error').length;
  const validGroupCount = groups.filter(g => {
    if (g.documentType === 'darp') return g.sessions.some(s => s.files.length > 0);
    return g.files.length > 0;
  }).length;
  const progress = validGroupCount > 0 ? (doneCount / validGroupCount) * 100 : 0;
  const queuedCount = getQueuedCount();

  const docTypeLabel = (dt: DocumentType) => {
    switch (dt) {
      case 'summary': return 'Intake Summary';
      case 'treatment': return 'Treatment Plan';
      case 'darp': return 'Session Note';
    }
  };

  const docTypeIcon = (dt: DocumentType) => {
    switch (dt) {
      case 'summary': return 'fa-file-medical';
      case 'treatment': return 'fa-clipboard-list';
      case 'darp': return 'fa-notes-medical';
    }
  };

  const docTypeColor = (dt: DocumentType) => {
    switch (dt) {
      case 'summary': return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
      case 'treatment': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'darp': return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' };
    }
  };

  const renderFileUpload = (refKey: string, onFiles: (files: FileList) => void, hint: string) => (
    <div
      onClick={() => fileInputRefs.current[refKey]?.click()}
      className="border-2 border-dashed border-teal-100 hover:border-teal-300 hover:bg-teal-50/20 rounded-2xl p-5 text-center cursor-pointer group/upload transition-all"
    >
      <input
        ref={(el) => { fileInputRefs.current[refKey] = el; }}
        type="file"
        multiple
        accept=".pdf,image/*,.doc,.docx"
        onChange={(e) => { if (e.target.files && e.target.files.length > 0) onFiles(e.target.files); }}
        className="hidden"
      />
      <div className="space-y-1">
        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center mx-auto group-hover/upload:scale-110 transition-transform">
          <i className="fa-solid fa-cloud-arrow-up text-teal-400 text-lg"></i>
        </div>
        <p className="font-black text-teal-950 uppercase text-xs tracking-widest">Add Documents</p>
        <p className="text-[10px] font-bold text-teal-800/30 uppercase tracking-[0.2em]">{hint}</p>
      </div>
    </div>
  );

  const renderFileList = (files: GroupFile[], onRemove: (fileId: string) => void) => (
    files.length > 0 && (
      <div className="space-y-1.5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40">
          {files.length} document{files.length !== 1 ? 's' : ''} attached
        </span>
        {files.map(file => (
          <div key={file.id} className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-xl">
            <i className="fa-solid fa-file text-teal-300 text-sm"></i>
            <span className="flex-grow text-sm font-bold text-teal-950 truncate">{file.fileName}</span>
            <button
              onClick={() => onRemove(file.id)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-teal-200 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-28">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-amber-50 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-1 border border-amber-100 shadow-inner">
          <i className="fa-solid fa-layer-group text-sm"></i>
          Batch Engine
        </div>
        <h2 className="text-4xl font-black text-teal-950 tracking-tighter uppercase lg:text-5xl">Batch Processing</h2>
        <p className="text-teal-800/60 text-base font-bold tracking-tight max-w-2xl mx-auto">Group documents by client, select the document type for each, and process them all sequentially.</p>
      </div>

      <div className="space-y-4">
        {groups.map((group, groupIndex) => {
          const colors = docTypeColor(group.documentType);
          const statusBorder =
            group.status === 'processing' ? 'border-amber-300 shadow-lg shadow-amber-100' :
            group.status === 'completed' ? 'border-emerald-300' :
            group.status === 'error' ? 'border-red-300' :
            'border-teal-50';

          return (
            <div
              key={group.id}
              className={`bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl border-2 ${statusBorder} overflow-hidden transition-all`}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${
                      group.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                      group.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      group.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-teal-50 text-teal-600'
                    }`}>
                      {group.status === 'processing' ? (
                        <i className="fa-solid fa-dna animate-spin"></i>
                      ) : group.status === 'completed' ? (
                        <i className="fa-solid fa-check"></i>
                      ) : group.status === 'error' ? (
                        <i className="fa-solid fa-xmark"></i>
                      ) : (
                        <span>{groupIndex + 1}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-teal-950 text-sm uppercase tracking-tight">
                        {group.status === 'completed' && group.patientName
                          ? group.patientName
                          : `Client Group ${groupIndex + 1}`}
                      </h3>
                      {group.status === 'error' && (
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{group.error || 'Some sessions failed'}</p>
                      )}
                      {group.status === 'processing' && (
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                          {group.documentType === 'darp'
                            ? `Processing ${group.sessions.length} session note${group.sessions.length !== 1 ? 's' : ''}...`
                            : `Synthesizing ${group.files.length} document${group.files.length !== 1 ? 's' : ''}...`}
                        </p>
                      )}
                      {group.status === 'completed' && (
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                          {group.documentType === 'darp'
                            ? `${group.sessions.filter(s => s.status === 'completed').length} session note${group.sessions.filter(s => s.status === 'completed').length !== 1 ? 's' : ''} saved`
                            : 'Saved to database'}
                        </p>
                      )}
                    </div>
                  </div>
                  {group.status === 'queued' && !isRunning && (
                    <button
                      onClick={() => removeGroup(group.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-teal-200 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      <i className="fa-solid fa-trash text-sm"></i>
                    </button>
                  )}
                </div>

                {group.status === 'queued' && !isRunning && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {(['summary', 'treatment', 'darp'] as DocumentType[]).map(dt => {
                        const dtColors = docTypeColor(dt);
                        return (
                          <button
                            key={dt}
                            onClick={() => updateGroup(group.id, { documentType: dt })}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 border ${
                              group.documentType === dt
                                ? `${dtColors.bg} ${dtColors.text} ${dtColors.border} shadow-sm`
                                : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <i className={`fa-solid ${docTypeIcon(dt)} text-xs`}></i>
                            {docTypeLabel(dt)}
                          </button>
                        );
                      })}
                    </div>

                    {group.documentType === 'treatment' && (
                      <>
                        <div className="flex flex-wrap gap-3">
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40 block mb-1">Client ID</label>
                            <input
                              type="text"
                              value={group.clientId}
                              onChange={(e) => updateGroup(group.id, { clientId: e.target.value })}
                              placeholder="Enter Client ID"
                              className="w-full px-4 py-2.5 rounded-xl border border-teal-100 bg-white text-sm font-bold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 placeholder:text-teal-300"
                            />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40 block mb-1">Date of Service</label>
                            <input
                              type="date"
                              value={group.dateOfService}
                              onChange={(e) => updateGroup(group.id, { dateOfService: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-teal-100 bg-white text-sm font-bold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                            />
                          </div>
                        </div>
                        {renderFileUpload(group.id, (files) => handleFilesForGroup(group.id, files), '2-5 documents typical')}
                        {renderFileList(group.files, (fileId) => removeFileFromGroup(group.id, fileId))}
                      </>
                    )}

                    {group.documentType === 'summary' && (
                      <>
                        {renderFileUpload(group.id, (files) => handleFilesForGroup(group.id, files), '2-3 documents typical')}
                        {renderFileList(group.files, (fileId) => removeFileFromGroup(group.id, fileId))}
                      </>
                    )}

                    {group.documentType === 'darp' && (
                      <div className="space-y-3">
                        {group.sessions.map((session, sIdx) => (
                          <div key={session.id} className="bg-sky-50/40 rounded-2xl border border-sky-100 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center">
                                  <span className="text-[10px] font-black text-sky-700">{sIdx + 1}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-800/60">Session {sIdx + 1}</span>
                              </div>
                              {group.sessions.length > 1 && (
                                <button
                                  onClick={() => removeSession(group.id, session.id)}
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-sky-200 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                  <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                              )}
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40 block mb-1">Date of Service</label>
                              <input
                                type="date"
                                value={session.dateOfService}
                                onChange={(e) => updateSession(group.id, session.id, { dateOfService: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-sky-100 bg-white text-sm font-bold text-teal-950 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
                              />
                            </div>
                            {renderFileUpload(
                              `${group.id}-${session.id}`,
                              (files) => handleFilesForSession(group.id, session.id, files),
                              '1-3 documents typical'
                            )}
                            {renderFileList(session.files, (fileId) => removeFileFromSession(group.id, session.id, fileId))}
                          </div>
                        ))}
                        <button
                          onClick={() => addSession(group.id)}
                          className="w-full py-3 rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-white/50 hover:bg-sky-50/30 text-sky-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                        >
                          <i className="fa-solid fa-plus text-xs"></i>
                          Add Another Session
                        </button>
                      </div>
                    )}
                  </>
                )}

                {group.status !== 'queued' && group.documentType === 'darp' && (
                  <div className="space-y-2">
                    {group.sessions.map((session, sIdx) => {
                      if (session.files.length === 0) return null;
                      return (
                        <div key={session.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                          session.status === 'processing' ? 'bg-amber-50 border-amber-200' :
                          session.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                          session.status === 'error' ? 'bg-red-50 border-red-200' :
                          'bg-sky-50 border-sky-100'
                        }`}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${
                            session.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                            session.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            session.status === 'error' ? 'bg-red-100 text-red-700' :
                            'bg-sky-100 text-sky-700'
                          }`}>
                            {session.status === 'processing' ? <i className="fa-solid fa-dna animate-spin text-[10px]"></i> :
                             session.status === 'completed' ? <i className="fa-solid fa-check text-[10px]"></i> :
                             session.status === 'error' ? <i className="fa-solid fa-xmark text-[10px]"></i> :
                             <span>{sIdx + 1}</span>}
                          </div>
                          <div className="flex-grow">
                            <span className="text-xs font-black text-teal-950">Session {sIdx + 1}</span>
                            <span className="text-[10px] font-bold text-teal-800/40 ml-2">
                              {session.dateOfService || 'No date'} — {session.files.length} doc{session.files.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {session.status === 'completed' && session.patientName && (
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{session.patientName}</span>
                          )}
                          {session.status === 'error' && (
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{session.error}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {(group.status === 'completed' || group.status === 'error') && group.documentType !== 'darp' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                      <i className={`fa-solid ${docTypeIcon(group.documentType)} mr-1`}></i>
                      {docTypeLabel(group.documentType)}
                    </span>
                    <span className="text-[10px] font-bold text-teal-800/30 uppercase tracking-wider">
                      {group.files.length} document{group.files.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isRunning && (
        <button
          onClick={addGroup}
          className="w-full py-5 rounded-[2rem] border-2 border-dashed border-teal-200 hover:border-teal-400 bg-white/50 hover:bg-teal-50/30 text-teal-600 font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
        >
          <i className="fa-solid fa-plus text-lg"></i>
          Add Client Group
        </button>
      )}

      {isRunning && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-teal-50 p-6 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
            <span className="text-teal-800/50">Processing Groups</span>
            <span className="text-teal-800">{doneCount} / {validGroupCount}</span>
          </div>
          <div className="h-3 bg-teal-50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!isRunning ? (
          <>
            <button
              onClick={processBatch}
              disabled={queuedCount === 0}
              className={`flex-1 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] text-white shadow-2xl transition-all flex items-center justify-center gap-4 ${
                queuedCount === 0
                  ? 'bg-teal-100 cursor-not-allowed text-teal-800/30'
                  : 'bg-teal-900 hover:bg-black hover:-translate-y-1 shadow-teal-900/20 active:translate-y-0'
              }`}
            >
              <i className="fa-solid fa-bolt text-teal-400 text-lg"></i>
              Process {queuedCount} Client Group{queuedCount !== 1 ? 's' : ''}
            </button>
            {groups.length > 0 && (
              <button onClick={clearAll} className="px-6 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-600 hover:bg-red-50 border-2 border-red-100 transition-all">
                Clear
              </button>
            )}
          </>
        ) : (
          <button
            onClick={stopBatch}
            className="flex-1 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] text-white bg-red-600 hover:bg-red-700 shadow-2xl transition-all flex items-center justify-center gap-4 active:translate-y-0"
          >
            <i className="fa-solid fa-stop text-lg"></i>
            Stop After Current
          </button>
        )}
      </div>

      {doneCount > 0 && !isRunning && (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <i className="fa-solid fa-circle-check text-emerald-600 text-2xl"></i>
          </div>
          <p className="font-black text-emerald-800 uppercase text-sm tracking-widest">Batch Complete</p>
          <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-wider">
            {doneCount} group{doneCount !== 1 ? 's' : ''} processed ({getTotalReportCount()} total reports){errorCount > 0 ? ` • ${errorCount} had errors` : ''} — All saved to patient database
          </p>
        </div>
      )}
    </div>
  );
};
