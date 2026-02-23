import React, { useMemo, useRef, useState, useEffect } from 'react';
import { FileData } from '../types';
import {
  analyzeIntake,
  generateTripleDifferencesExplainer,
  generateZeliskoTripleOutputNotes,
} from '../services/geminiService';
import { findOrCreatePatient, saveReport, getPatients } from '../services/supabaseService';
import type { Patient } from '../services/supabaseService';

interface BatchProcessingProps {
  isDriveLinked: boolean;
  accessToken: string | null;
  onComplete: () => void;
}

type BatchDocType = 'summary' | 'treatment' | 'darp' | 'preceptor';
type BatchStepStatus = 'queued' | 'running' | 'done' | 'error';

type BatchStep = {
  enabled: boolean;
  status: BatchStepStatus;
  progress: number;
  outputText?: string;
  error?: string;
};

type BatchJob = {
  jobId: string;
  patient: { firstInitial: string; lastName: string; folderName?: string };
  source: { files: FileData[]; extractedText?: string; sourceName?: string };
  clientId?: string;
  dateOfService?: string;
  steps: Record<BatchDocType, BatchStep>;
  createdAt: string;
  driveFolderId?: string;
  driveFolderName?: string;
};

type CarryForwardOptions = {
  includeSummaryInTreatment: boolean;
  includeSummaryInDarp: boolean;
  includeTreatmentInDarp: boolean;
};

const STEP_ORDER: BatchDocType[] = ['summary', 'treatment', 'darp', 'preceptor'];

const STEP_LABEL: Record<BatchDocType, string> = {
  summary: 'Summary',
  treatment: 'Treatment',
  darp: 'DARP',
  preceptor: 'Preceptor',
};

function createInitialStep(enabled = false): BatchStep {
  return {
    enabled,
    status: 'queued',
    progress: 0,
  };
}

function createNewJob(): BatchJob {
  const now = Date.now();
  return {
    jobId: `job-${now}`,
    patient: {
      firstInitial: '',
      lastName: '',
      folderName: '',
    },
    source: {
      files: [],
      extractedText: '',
      sourceName: '',
    },
    clientId: '',
    dateOfService: '',
    steps: {
      summary: createInitialStep(true),
      treatment: createInitialStep(false),
      darp: createInitialStep(false),
      preceptor: createInitialStep(false),
    },
    createdAt: new Date().toISOString(),
  };
}

function extractPatientNameFromText(text: string, fallbackFirstInitial: string, fallbackLastName: string): string {
  const patientMatch = text.match(/PATIENT_NAME:\s*(.*)/i);
  if (patientMatch?.[1]) {
    return patientMatch[1].trim().replace(/\*+/g, '');
  }

  const first = fallbackFirstInitial.trim().toUpperCase();
  const last = fallbackLastName.trim();
  if (first && last) {
    return `${first}. ${last}`;
  }
  if (last) {
    return last;
  }
  return 'Unknown Patient';
}

function splitPatientName(name: string): { firstInitial: string; lastName: string } {
  const cleaned = name.replace(/\*+/g, '').trim();
  if (!cleaned) return { firstInitial: '', lastName: '' };
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const firstInitial = parts[0]?.[0]?.toUpperCase() || '';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return { firstInitial, lastName };
}

function getOverallJobStatus(job: BatchJob): BatchStepStatus {
  const enabledSteps = STEP_ORDER.filter((step) => job.steps[step].enabled);
  if (enabledSteps.length === 0) return 'queued';

  if (enabledSteps.some((step) => job.steps[step].status === 'running')) return 'running';
  if (enabledSteps.some((step) => job.steps[step].status === 'error')) return 'error';
  if (enabledSteps.every((step) => job.steps[step].status === 'done')) return 'done';
  return 'queued';
}

export const BatchProcessing: React.FC<BatchProcessingProps> = ({ accessToken, onComplete }) => {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [carryForward, setCarryForward] = useState<CarryForwardOptions>({
    includeSummaryInTreatment: true,
    includeSummaryInDarp: true,
    includeTreatmentInDarp: true,
  });
  const [batchMessage, setBatchMessage] = useState('');
  const [currentJobIndex, setCurrentJobIndex] = useState<number>(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [dbPatients, setDbPatients] = useState<Patient[]>([]);
  const [driveBrowseJobId, setDriveBrowseJobId] = useState<string | null>(null);
  const [driveFolders, setDriveFolders] = useState<{ id: string; name: string }[]>([]);
  const [driveFiles, setDriveFiles] = useState<{ id: string; name: string; mimeType: string }[]>([]);
  const [driveBreadcrumbs, setDriveBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveDownloading, setDriveDownloading] = useState<string | null>(null);

  useEffect(() => {
    getPatients().then(setDbPatients).catch(() => {});
  }, []);

  const addJob = () => {
    setJobs((prev) => [...prev, createNewJob()]);
  };

  const removeJob = (jobId: string) => {
    if (isRunning) return;
    setJobs((prev) => prev.filter((job) => job.jobId !== jobId));
  };

  const openDriveBrowser = async (jobId: string) => {
    if (!accessToken) return;
    setDriveBrowseJobId(jobId);
    const startId = localStorage.getItem('drive_patient_folder_id') || 'root';
    const startName = localStorage.getItem('drive_patient_folder_name') || 'My Drive';
    setDriveBreadcrumbs([{ id: startId, name: startName }]);
    await loadDriveFolder(startId);
  };

  const loadDriveFolder = async (folderId: string) => {
    if (!accessToken) return;
    setDriveLoading(true);
    try {
      const folderQuery = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id,name)&orderBy=name&pageSize=100`,
        { headers: { Authorization: 'Bearer ' + accessToken } },
      );
      const folderData = await folderRes.json();
      setDriveFolders(folderData.files || []);

      const fileQuery = `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`;
      const fileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQuery)}&fields=files(id,name,mimeType)&orderBy=name&pageSize=100`,
        { headers: { Authorization: 'Bearer ' + accessToken } },
      );
      const fileData = await fileRes.json();
      setDriveFiles(fileData.files || []);
    } catch (err) {
      console.error('Failed to load Drive folder', err);
    } finally {
      setDriveLoading(false);
    }
  };

  const navigateDriveFolder = (folderId: string, folderName: string) => {
    setDriveBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
    loadDriveFolder(folderId);
  };

  const navigateDriveBreadcrumb = (index: number) => {
    const crumb = driveBreadcrumbs[index];
    setDriveBreadcrumbs((prev) => prev.slice(0, index + 1));
    loadDriveFolder(crumb.id);
  };

  const downloadDriveFile = async (fileId: string, fileName: string, mimeType: string): Promise<FileData | null> => {
    if (!accessToken) return null;
    try {
      let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      if (mimeType === 'application/vnd.google-apps.document') {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
        mimeType = 'application/pdf';
        if (!fileName.endsWith('.pdf')) fileName += '.pdf';
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        return null;
      }

      const res = await fetch(downloadUrl, {
        headers: { Authorization: 'Bearer ' + accessToken },
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsDataURL(blob);
      });
      return { name: fileName, mimeType: blob.type || mimeType, base64 };
    } catch (err) {
      console.error(`Failed to download ${fileName}:`, err);
      return null;
    }
  };

  const importAllFilesFromDriveFolder = async (jobId: string) => {
    if (!accessToken || driveFiles.length === 0) return;
    const currentFolderId = driveBreadcrumbs[driveBreadcrumbs.length - 1]?.id;
    const currentFolderName = driveBreadcrumbs[driveBreadcrumbs.length - 1]?.name || '';

    setDriveDownloading('all');
    const downloadedFiles: FileData[] = [];

    for (const file of driveFiles) {
      const result = await downloadDriveFile(file.id, file.name, file.mimeType);
      if (result) downloadedFiles.push(result);
    }

    if (downloadedFiles.length > 0) {
      const guessed = splitPatientName(currentFolderName.replace(/[_-]+/g, ' '));

      setJobs((prev) =>
        prev.map((job) => {
          if (job.jobId !== jobId) return job;
          const taggedFiles = downloadedFiles.map((f) => ({
            ...f,
            docTypes: {
              summary: job.steps.summary.enabled,
              treatment: job.steps.treatment.enabled,
              darp: job.steps.darp.enabled,
              preceptor: job.steps.preceptor.enabled,
            },
          }));
          return {
            ...job,
            source: { ...job.source, files: [...job.source.files, ...taggedFiles], sourceName: currentFolderName },
            patient: {
              ...job.patient,
              firstInitial: job.patient.firstInitial || guessed.firstInitial,
              lastName: job.patient.lastName || guessed.lastName,
              folderName: job.patient.folderName || currentFolderName,
            },
            driveFolderId: currentFolderId,
            driveFolderName: currentFolderName,
          };
        }),
      );
    }

    setDriveDownloading(null);
    setDriveBrowseJobId(null);
  };

  const importSingleDriveFile = async (jobId: string, fileId: string, fileName: string, mimeType: string) => {
    setDriveDownloading(fileId);
    const result = await downloadDriveFile(fileId, fileName, mimeType);
    if (result) {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.jobId !== jobId) return job;
          const taggedFile = {
            ...result,
            docTypes: {
              summary: job.steps.summary.enabled,
              treatment: job.steps.treatment.enabled,
              darp: job.steps.darp.enabled,
              preceptor: job.steps.preceptor.enabled,
            },
          };
          const currentFolderId = driveBreadcrumbs[driveBreadcrumbs.length - 1]?.id;
          const currentFolderName = driveBreadcrumbs[driveBreadcrumbs.length - 1]?.name || '';
          return {
            ...job,
            source: { ...job.source, files: [...job.source.files, taggedFile] },
            driveFolderId: job.driveFolderId || currentFolderId,
            driveFolderName: job.driveFolderName || currentFolderName,
          };
        }),
      );
    }
    setDriveDownloading(null);
  };

  const saveToDriveFolder = async (folderId: string, fileName: string, content: string): Promise<boolean> => {
    if (!accessToken) return false;
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const metadata = {
        name: fileName,
        mimeType: 'text/plain',
        parents: [folderId],
      };
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken },
        body: formData,
      });
      return response.ok;
    } catch (err) {
      console.error('Drive save failed:', err);
      return false;
    }
  };

  const updateJob = (jobId: string, patch: Partial<BatchJob>) => {
    setJobs((prev) => prev.map((job) => (job.jobId === jobId ? { ...job, ...patch } : job)));
  };

  const updateJobPatient = (jobId: string, patch: Partial<BatchJob['patient']>) => {
    setJobs((prev) => prev.map((job) => (job.jobId === jobId ? { ...job, patient: { ...job.patient, ...patch } } : job)));
  };

  const updateJobSource = (jobId: string, patch: Partial<BatchJob['source']>) => {
    setJobs((prev) => prev.map((job) => (job.jobId === jobId ? { ...job, source: { ...job.source, ...patch } } : job)));
  };

  const updateStep = (jobId: string, stepType: BatchDocType, patch: Partial<BatchStep>) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.jobId === jobId
          ? {
              ...job,
              steps: {
                ...job.steps,
                [stepType]: {
                  ...job.steps[stepType],
                  ...patch,
                },
              },
            }
          : job,
      ),
    );
  };

  const readFilesToFileData = async (selectedFiles: FileList): Promise<FileData[]> => {
    const nextFiles: FileData[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      });

      nextFiles.push({
        name: file.name,
        mimeType: file.type,
        base64,
      });
    }

    return nextFiles;
  };

  const handleFilePick = async (jobId: string, selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const files = await readFilesToFileData(selectedFiles);

    const firstFile = selectedFiles[0];
    const guessed = splitPatientName(firstFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));

    setJobs((prev) =>
      prev.map((job) => {
        if (job.jobId !== jobId) return job;

        const taggedFiles = files.map((f) => ({
          ...f,
          docTypes: {
            summary: job.steps.summary.enabled,
            treatment: job.steps.treatment.enabled,
            darp: job.steps.darp.enabled,
            preceptor: job.steps.preceptor.enabled,
          },
        }));

        return {
          ...job,
          source: {
            ...job.source,
            files: [...job.source.files, ...taggedFiles],
            sourceName: firstFile.name,
          },
          patient: {
            ...job.patient,
            firstInitial: job.patient.firstInitial || guessed.firstInitial,
            lastName: job.patient.lastName || guessed.lastName,
            folderName: job.patient.folderName || (guessed.lastName ? `${guessed.lastName}_${guessed.firstInitial || 'X'}` : ''),
          },
        };
      }),
    );

    if (fileInputRefs.current[jobId]) {
      fileInputRefs.current[jobId]!.value = '';
    }
  };

  const removeSourceFile = (jobId: string, index: number) => {
    updateJobSource(jobId, {
      files: jobs.find((job) => job.jobId === jobId)?.source.files.filter((_, i) => i !== index) || [],
    });
  };

  const toggleFileDocType = (jobId: string, fileIndex: number, docType: BatchDocType) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.jobId !== jobId) return job;
        const updatedFiles = job.source.files.map((f, i) => {
          if (i !== fileIndex) return f;
          const current = f.docTypes || { summary: true, treatment: true, darp: true, preceptor: false };
          return { ...f, docTypes: { ...current, [docType]: !current[docType] } };
        });
        return { ...job, source: { ...job.source, files: updatedFiles } };
      }),
    );
  };

  const toggleStepEnabled = (jobId: string, stepType: BatchDocType, enabled: boolean) => {
    updateStep(jobId, stepType, {
      enabled,
      status: 'queued',
      progress: 0,
      error: undefined,
    });
  };

  const clearAll = () => {
    if (isRunning) return;
    setJobs([]);
    setBatchMessage('');
  };

  const duplicateJobForSamePatient = (sourceJob: BatchJob) => {
    if (isRunning) return;
    const now = Date.now();
    const newJob: BatchJob = {
      jobId: `job-${now}`,
      patient: { ...sourceJob.patient },
      source: { files: [], extractedText: '', sourceName: '' },
      clientId: sourceJob.clientId,
      dateOfService: '',
      steps: {
        summary: createInitialStep(false),
        treatment: createInitialStep(false),
        darp: createInitialStep(true),
        preceptor: createInitialStep(false),
      },
      createdAt: new Date().toISOString(),
      driveFolderId: sourceJob.driveFolderId,
      driveFolderName: sourceJob.driveFolderName,
    };
    setJobs((prev) => [...prev, newJob]);
  };

  const selectPatientForJob = (jobId: string, patientId: string) => {
    const patient = dbPatients.find((p) => p.id === patientId);
    if (!patient) return;
    const firstInitial = patient.first_name?.[0]?.toUpperCase() || '';
    const lastName = patient.last_name || patient.first_name || '';
    setJobs((prev) =>
      prev.map((job) =>
        job.jobId === jobId
          ? {
              ...job,
              patient: { firstInitial, lastName, folderName: `${lastName}_${firstInitial}` },
              clientId: patient.client_id || job.clientId || '',
            }
          : job,
      ),
    );
  };

  const buildCarryForwardContext = (
    stepType: BatchDocType,
    outputs: Partial<Record<BatchDocType, string>>,
  ): string => {
    const blocks: string[] = [];

    if (stepType === 'treatment' && carryForward.includeSummaryInTreatment && outputs.summary) {
      blocks.push(`CASE SUMMARY (GENERATED IN THIS BATCH):\n${outputs.summary}`);
    }

    if (stepType === 'darp') {
      if (carryForward.includeSummaryInDarp && outputs.summary) {
        blocks.push(`CASE SUMMARY (GENERATED IN THIS BATCH):\n${outputs.summary}`);
      }
      if (carryForward.includeTreatmentInDarp && outputs.treatment) {
        blocks.push(`TREATMENT PLAN (GENERATED IN THIS BATCH):\n${outputs.treatment}`);
      }
    }

    if (blocks.length === 0) return '';

    // Carry-forward is explicitly labeled so the downstream note can separate generated context from source material.
    return `${blocks.join('\n\n')}\n\nINSTRUCTIONS: Use the carry-forward context when clinically relevant, but keep source-grounded accuracy.`;
  };

  const runSingleStep = async (
    job: BatchJob,
    stepType: BatchDocType,
    outputs: Partial<Record<BatchDocType, string>>,
  ): Promise<string> => {
    const filteredFiles = job.source.files.filter((f) => {
      if (!f.docTypes) return true;
      return (f.docTypes as any)[stepType] === true;
    });
    const filesAsInline = filteredFiles.map((f) => ({ mimeType: f.mimeType, data: f.base64 }));
    const hasText = Boolean(job.source.extractedText?.trim());
    const content = hasText ? (job.source.extractedText || '') : filesAsInline;

    if (stepType === 'preceptor') {
      updateStep(job.jobId, 'preceptor', { status: 'running', progress: 20 });
      const notes = await generateZeliskoTripleOutputNotes(content);

      updateStep(job.jobId, 'preceptor', { progress: 60 });
      const differences = await generateTripleDifferencesExplainer();

      updateStep(job.jobId, 'preceptor', { progress: 80 });

      return [
        '## Psych Preceptor 2.0',
        notes.pp2,
        '',
        '## SUPER',
        notes.super,
        '',
        '## MK3',
        notes.mk3,
        '',
        '## DIAMOND STANDARD CASE REVIEW',
        notes.diamond,
        '',
        '## Differences Between PP2, SUPER, MK3, and Diamond',
        differences,
      ].join('\n');
    }

    const metadata =
      (stepType === 'treatment' || stepType === 'darp') && (job.clientId || job.dateOfService)
        ? {
            clientId: job.clientId || undefined,
            dateOfService: job.dateOfService || undefined,
          }
        : undefined;

    const context = buildCarryForwardContext(stepType, outputs);

    updateStep(job.jobId, stepType, { status: 'running', progress: 10 });
    const text = await analyzeIntake(content, stepType, metadata, context || undefined);
    updateStep(job.jobId, stepType, { progress: 90 });

    return text;
  };

  const processBatch = async () => {
    if (jobs.length === 0 || isRunning) return;

    setIsRunning(true);
    setBatchMessage('Batch processing started.');

    setJobs((prev) =>
      prev.map((job) => ({
        ...job,
        steps: {
          summary: job.steps.summary.enabled ? { ...job.steps.summary, status: 'queued', progress: 0, outputText: undefined, error: undefined } : job.steps.summary,
          treatment: job.steps.treatment.enabled ? { ...job.steps.treatment, status: 'queued', progress: 0, outputText: undefined, error: undefined } : job.steps.treatment,
          darp: job.steps.darp.enabled ? { ...job.steps.darp, status: 'queued', progress: 0, outputText: undefined, error: undefined } : job.steps.darp,
          preceptor: job.steps.preceptor.enabled ? { ...job.steps.preceptor, status: 'queued', progress: 0, outputText: undefined, error: undefined } : job.steps.preceptor,
        },
      })),
    );

    const snapshot = [...jobs];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < snapshot.length; i++) {
      const job = snapshot[i];
      setCurrentJobIndex(i + 1);

      if (job.source.files.length === 0 && !job.source.extractedText?.trim()) {
        for (const stepType of STEP_ORDER) {
          if (!job.steps[stepType].enabled) continue;
          updateStep(job.jobId, stepType, {
            status: 'error',
            progress: 100,
            error: 'No source input provided',
          });
        }
        failureCount++;
        continue;
      }

      const stepOutputs: Partial<Record<BatchDocType, string>> = {};
      let jobFailed = false;

      for (const stepType of STEP_ORDER) {
        if (!job.steps[stepType].enabled) continue;

        try {
          const outputText = await runSingleStep(job, stepType, stepOutputs);
          stepOutputs[stepType] = outputText;

          if (stepType !== 'preceptor') {
            const patientName = extractPatientNameFromText(outputText, job.patient.firstInitial, job.patient.lastName);
            const clientIdMatch = outputText.match(/CLIENT_ID:\s*(.*)/i);
            const clientId = clientIdMatch ? clientIdMatch[1].trim().replace(/\*+/g, '') : job.clientId || undefined;
            const dobMatch = outputText.match(/DOB:\s*(.*)/i);
            const dob = dobMatch ? dobMatch[1].trim().replace(/\*+/g, '') : undefined;

            try {
              const patient = await findOrCreatePatient(patientName, dob, clientId);
              await saveReport(patient.id, stepType, outputText, outputText.includes('🚨'));
            } catch (saveError) {
              console.error('Failed to save report to database (continuing batch):', saveError);
            }
          }

          updateStep(job.jobId, stepType, {
            status: 'done',
            progress: 100,
            outputText,
            error: undefined,
          });

          if (job.driveFolderId && stepType !== 'preceptor') {
            const dateStr = job.dateOfService || new Date().toISOString().split('T')[0];
            const patientLabel = `${job.patient.firstInitial}${job.patient.lastName ? '_' + job.patient.lastName : ''}`;
            const docLabel = stepType === 'summary' ? 'CaseSummary' : stepType === 'treatment' ? 'TreatmentPlan' : 'SessionNote';
            const driveFileName = `${patientLabel}_${docLabel}_${dateStr}.txt`;
            try {
              const saved = await saveToDriveFolder(job.driveFolderId, driveFileName, outputText);
              if (saved) {
                console.log(`[Batch] Auto-saved ${driveFileName} to Drive folder ${job.driveFolderName}`);
              }
            } catch (driveErr) {
              console.error('Drive auto-save failed (continuing batch):', driveErr);
            }
          }

          if (stepType === 'summary' || stepType === 'treatment') {
            const generatedFile: FileData = {
              name: stepType === 'summary' ? 'Generated Case Summary.txt' : 'Generated Treatment Plan.txt',
              mimeType: 'text/plain',
              base64: btoa(unescape(encodeURIComponent(outputText))),
              docTypes: {
                summary: false,
                treatment: stepType === 'summary',
                darp: stepType === 'treatment',
                preceptor: false,
              },
            };

            setJobs((prev) =>
              prev.map((j) => {
                if (j.jobId !== job.jobId) return j;
                const alreadyHas = j.source.files.some((f) => f.name === generatedFile.name);
                if (alreadyHas) return j;
                return {
                  ...j,
                  source: {
                    ...j.source,
                    files: [...j.source.files, generatedFile],
                  },
                };
              }),
            );

            job.source.files = [...job.source.files, generatedFile];
          }
        } catch (error: any) {
          jobFailed = true;
          updateStep(job.jobId, stepType, {
            status: 'error',
            progress: 100,
            error: error?.message || `${STEP_LABEL[stepType]} failed`,
          });
        }
      }

      if (jobFailed) {
        failureCount++;
      } else {
        successCount++;
      }
    }

    setBatchMessage(`Batch finished. Success: ${successCount}. Failed: ${failureCount}.`);
    setIsRunning(false);
    onComplete();
  };

  const summaryCounts = useMemo(() => {
    const counts = {
      totalSteps: 0,
      completedSteps: 0,
      stepGroups: {
        summary: { enabled: 0, done: 0 },
        treatment: { enabled: 0, done: 0 },
        darp: { enabled: 0, done: 0 },
        preceptor: { enabled: 0, done: 0 },
      } as Record<BatchDocType, { enabled: number; done: number }>,
    };

    for (const job of jobs) {
      for (const stepType of STEP_ORDER) {
        const step = job.steps[stepType];
        if (!step.enabled) continue;
        counts.totalSteps += 1;
        counts.stepGroups[stepType].enabled += 1;

        if (step.status === 'done') {
          counts.completedSteps += 1;
          counts.stepGroups[stepType].done += 1;
        }
      }
    }

    return counts;
  }, [jobs]);

  const overallProgress = summaryCounts.totalSteps > 0 ? (summaryCounts.completedSteps / summaryCounts.totalSteps) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-28">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-amber-50 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-1 border border-amber-100 shadow-inner">
          <i className="fa-solid fa-layer-group text-sm"></i>
          Batch Engine
        </div>
        <h2 className="text-4xl font-black text-teal-950 tracking-tighter uppercase lg:text-5xl">Batch Processing</h2>
        <p className="text-teal-800/60 text-base font-bold tracking-tight max-w-3xl mx-auto">
          Multi-step pipeline per patient case with optional carry-forward context and per-note progress tracking.
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-teal-50 p-6 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/40">Carry-Forward Options</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-2 font-bold text-teal-900">
            <input
              type="checkbox"
              checked={carryForward.includeSummaryInTreatment}
              onChange={(e) => setCarryForward((prev) => ({ ...prev, includeSummaryInTreatment: e.target.checked }))}
              disabled={isRunning}
            />
            Include generated Case Summary in Treatment Plan input
          </label>
          <label className="flex items-center gap-2 font-bold text-teal-900">
            <input
              type="checkbox"
              checked={carryForward.includeSummaryInDarp}
              onChange={(e) => setCarryForward((prev) => ({ ...prev, includeSummaryInDarp: e.target.checked }))}
              disabled={isRunning}
            />
            Include generated Case Summary in DARP input
          </label>
          <label className="flex items-center gap-2 font-bold text-teal-900">
            <input
              type="checkbox"
              checked={carryForward.includeTreatmentInDarp}
              onChange={(e) => setCarryForward((prev) => ({ ...prev, includeTreatmentInDarp: e.target.checked }))}
              disabled={isRunning}
            />
            Include generated Treatment Plan in DARP input
          </label>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-teal-50 p-6 space-y-4">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
          <span className="text-teal-800/50">Overall Batch Progress</span>
          <span className="text-teal-800">{summaryCounts.completedSteps} / {summaryCounts.totalSteps} steps complete</span>
        </div>
        <div className="h-3 bg-teal-50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 transition-all" style={{ width: `${overallProgress}%` }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STEP_ORDER.map((stepType) => {
            const enabled = summaryCounts.stepGroups[stepType].enabled;
            const done = summaryCounts.stepGroups[stepType].done;
            const progress = enabled > 0 ? (done / enabled) * 100 : 0;
            const remaining = Math.max(enabled - done, 0);

            return (
              <div key={stepType} className="bg-slate-50 rounded-xl p-3 border border-teal-50 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                  <span className="text-teal-800">{STEP_LABEL[stepType]} Group</span>
                  <span className="text-teal-700">{done} / {enabled}</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden border border-teal-50">
                  <div className="h-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-[10px] font-bold text-teal-800/60 uppercase tracking-wider">Remaining: {remaining}</div>
              </div>
            );
          })}
        </div>

        {isRunning && (
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Processing batch group {currentJobIndex} of {jobs.length}</p>
        )}
        {batchMessage && <p className="text-xs font-bold text-teal-900/70">{batchMessage}</p>}
      </div>

      <div className="space-y-4">
        {jobs.map((job, index) => {
          const status = getOverallJobStatus(job);

          return (
            <div key={job.jobId} className={`bg-white/80 backdrop-blur-xl rounded-[2rem] border-2 p-6 space-y-5 ${
              status === 'running'
                ? 'border-amber-300'
                : status === 'done'
                  ? 'border-emerald-300'
                  : status === 'error'
                    ? 'border-red-300'
                    : 'border-teal-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-teal-950">Batch Group {index + 1}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800/40">
                    {status === 'running' ? 'Processing' : status === 'done' ? 'Complete' : status === 'error' ? 'Completed with errors' : 'Queued'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isRunning && (
                    <button
                      onClick={() => duplicateJobForSamePatient(job)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[9px] font-black uppercase tracking-widest transition-all"
                      title="Add another note for this same patient with different files and date"
                    >
                      <i className="fa-solid fa-copy"></i>
                      Same Patient, New Note
                    </button>
                  )}
                  {!isRunning && (
                    <button onClick={() => removeJob(job.jobId)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>

              {dbPatients.length > 0 && !isRunning && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-1">Select Patient from Database</label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) selectPatientForJob(job.jobId, e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/50 text-sm font-bold text-teal-950 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 outline-none"
                  >
                    <option value="">— Pick a patient to auto-fill fields —</option>
                    {dbPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}{p.client_id ? ` (${p.client_id})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-1">First Initial</label>
                  <input
                    value={job.patient.firstInitial}
                    onChange={(e) => updateJobPatient(job.jobId, { firstInitial: e.target.value.toUpperCase().slice(0, 1) })}
                    disabled={isRunning}
                    className="w-full px-3 py-2 rounded-xl border border-teal-100 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-1">Last Name</label>
                  <input
                    value={job.patient.lastName}
                    onChange={(e) => updateJobPatient(job.jobId, { lastName: e.target.value })}
                    disabled={isRunning}
                    className="w-full px-3 py-2 rounded-xl border border-teal-100 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-1">Client ID</label>
                  <input
                    value={job.clientId || ''}
                    onChange={(e) => updateJob(job.jobId, { clientId: e.target.value })}
                    disabled={isRunning}
                    className="w-full px-3 py-2 rounded-xl border border-teal-100 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-1">Date of Service</label>
                  <input
                    type="date"
                    value={job.dateOfService || ''}
                    onChange={(e) => updateJob(job.jobId, { dateOfService: e.target.value })}
                    disabled={isRunning}
                    className="w-full px-3 py-2 rounded-xl border border-teal-100 text-sm font-bold text-teal-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <div
                    onClick={() => fileInputRefs.current[job.jobId]?.click()}
                    className="flex-1 border-2 border-dashed border-teal-100 rounded-2xl p-4 text-center cursor-pointer hover:border-teal-300 hover:bg-teal-50/30"
                  >
                    <input
                      ref={(el) => {
                        fileInputRefs.current[job.jobId] = el;
                      }}
                      type="file"
                      multiple
                      accept=".pdf,image/*,.doc,.docx,.txt,audio/*"
                      onChange={(e) => handleFilePick(job.jobId, e.target.files)}
                      className="hidden"
                    />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-800"><i className="fa-solid fa-upload mr-2"></i>Upload Files</p>
                    <p className="text-[10px] font-bold text-teal-800/40 uppercase tracking-wider mt-1">From your device</p>
                  </div>
                  {accessToken && (
                    <div
                      onClick={() => !isRunning && openDriveBrowser(job.jobId)}
                      className="flex-1 border-2 border-dashed border-blue-100 rounded-2xl p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800"><i className="fa-brands fa-google-drive mr-2"></i>Pick from Drive</p>
                      <p className="text-[10px] font-bold text-blue-800/40 uppercase tracking-wider mt-1">Browse patient folders</p>
                    </div>
                  )}
                </div>

                {job.driveFolderId && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl">
                    <i className="fa-brands fa-google-drive text-blue-600 text-sm"></i>
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                      Source: {job.driveFolderName} — reports will auto-save here
                    </span>
                  </div>
                )}

                {job.source.files.length > 0 && (
                  <div className="space-y-2">
                    {job.source.files.map((file, fileIndex) => (
                      <div key={`${file.name}-${fileIndex}`} className="bg-slate-50 rounded-xl px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                              <i className={`fa-solid ${file.mimeType.startsWith('audio/') ? 'fa-waveform' : file.mimeType.startsWith('image/') ? 'fa-image' : 'fa-file-pdf'} text-teal-700 text-[10px]`}></i>
                            </div>
                            <span className="text-xs font-bold text-teal-900 truncate">{file.name}</span>
                          </div>
                          {!isRunning && (
                            <button onClick={() => removeSourceFile(job.jobId, fileIndex)} className="text-red-400 hover:text-red-600 p-1">
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pl-9">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-teal-800/30 mr-1">Use for:</span>
                          {STEP_ORDER.map((dt) => {
                            const isChecked = (file.docTypes as any)?.[dt] === true;
                            const colors: Record<BatchDocType, { on: string; label: string }> = {
                              summary: { on: 'bg-teal-50 border-teal-200 text-teal-700', label: 'Summary' },
                              treatment: { on: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Treatment' },
                              darp: { on: 'bg-sky-50 border-sky-200 text-sky-700', label: 'DARP' },
                              preceptor: { on: 'bg-amber-50 border-amber-200 text-amber-700', label: 'Preceptor' },
                            };
                            return (
                              <button
                                key={dt}
                                type="button"
                                disabled={isRunning}
                                onClick={() => toggleFileDocType(job.jobId, fileIndex, dt)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                                  isChecked ? colors[dt].on : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                              >
                                <i className={`fa-solid ${isChecked ? 'fa-square-check' : 'fa-square'} text-[10px]`}></i>
                                {colors[dt].label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-teal-800/40 mb-1">Optional Source Text</label>
                  <textarea
                    value={job.source.extractedText || ''}
                    onChange={(e) => updateJobSource(job.jobId, { extractedText: e.target.value })}
                    disabled={isRunning}
                    rows={3}
                    placeholder="Optional: paste source text. If provided, this is used as the primary source input."
                    className="w-full px-3 py-2 rounded-xl border border-teal-100 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {STEP_ORDER.map((stepType) => (
                  <label key={stepType} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-teal-800">
                    <input
                      type="checkbox"
                      checked={job.steps[stepType].enabled}
                      disabled={isRunning}
                      onChange={(e) => toggleStepEnabled(job.jobId, stepType, e.target.checked)}
                    />
                    {STEP_LABEL[stepType]}
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STEP_ORDER.map((stepType) => {
                  const step = job.steps[stepType];
                  const disabled = !step.enabled;

                  return (
                    <div key={stepType} className="bg-slate-50 rounded-xl p-3 border border-teal-50">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                        <span className="text-teal-800">{STEP_LABEL[stepType]}</span>
                        <span className="text-teal-700">{disabled ? '—' : `${step.progress}%`}</span>
                      </div>
                      <div className="h-2 bg-white rounded-full border border-teal-50 overflow-hidden">
                        <div
                          className={`h-full transition-all ${step.status === 'error' ? 'bg-red-500' : step.status === 'done' ? 'bg-emerald-600' : 'bg-teal-600'}`}
                          style={{ width: `${disabled ? 0 : step.progress}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-teal-800/70 uppercase tracking-wider">
                        {disabled ? 'Disabled' : step.status}
                        {step.error ? ` • ${step.error}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!isRunning && (
        <button
          onClick={addJob}
          className="w-full py-5 rounded-[2rem] border-2 border-dashed border-teal-200 hover:border-teal-400 bg-white/50 hover:bg-teal-50/30 text-teal-600 font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
        >
          <i className="fa-solid fa-plus text-lg"></i>
          Add Batch Group
        </button>
      )}

      <div className="flex gap-3">
        <button
          onClick={processBatch}
          disabled={isRunning || jobs.length === 0}
          className={`flex-1 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] text-white shadow-2xl transition-all flex items-center justify-center gap-4 ${
            isRunning || jobs.length === 0 ? 'bg-teal-100 cursor-not-allowed text-teal-800/30' : 'bg-teal-900 hover:bg-black'
          }`}
        >
          <i className="fa-solid fa-bolt text-teal-400 text-lg"></i>
          Process Batch
        </button>
        {!isRunning && jobs.length > 0 && (
          <button
            onClick={clearAll}
            className="px-6 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-600 hover:bg-red-50 border-2 border-red-100 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {driveBrowseJobId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDriveBrowseJobId(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-teal-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-teal-900">
                  <i className="fa-brands fa-google-drive mr-2 text-blue-600"></i>
                  Browse Google Drive
                </h3>
                <p className="text-[10px] font-bold text-teal-800/40 uppercase tracking-wider mt-1">
                  Select files or import all from a folder
                </p>
              </div>
              <button onClick={() => setDriveBrowseJobId(null)} className="text-teal-400 hover:text-teal-700 p-2">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-b border-teal-50 flex items-center gap-1 flex-wrap">
              {driveBreadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  {idx > 0 && <i className="fa-solid fa-chevron-right text-[8px] text-teal-400 mx-1"></i>}
                  <button
                    onClick={() => navigateDriveBreadcrumb(idx)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-all ${
                      idx === driveBreadcrumbs.length - 1 ? 'bg-teal-100 text-teal-800' : 'text-teal-600 hover:bg-teal-50'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-1">
              {driveLoading ? (
                <div className="text-center py-10">
                  <i className="fa-solid fa-spinner fa-spin text-teal-400 text-2xl"></i>
                  <p className="text-[10px] font-bold text-teal-800/40 uppercase tracking-wider mt-3">Loading...</p>
                </div>
              ) : (
                <>
                  {driveFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => navigateDriveFolder(folder.id, folder.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-teal-50 transition-all text-left"
                    >
                      <i className="fa-solid fa-folder text-amber-400 text-lg"></i>
                      <span className="text-xs font-bold text-teal-900 truncate flex-1">{folder.name}</span>
                      <i className="fa-solid fa-chevron-right text-[10px] text-teal-300"></i>
                    </button>
                  ))}

                  {driveFiles.length > 0 && driveFolders.length > 0 && (
                    <div className="border-t border-teal-50 my-2"></div>
                  )}

                  {driveFiles.map((file) => {
                    const isDownloading = driveDownloading === file.id;
                    const icon = file.mimeType.includes('pdf') ? 'fa-file-pdf text-red-400' :
                      file.mimeType.includes('image') ? 'fa-image text-purple-400' :
                      file.mimeType.includes('audio') ? 'fa-waveform text-blue-400' :
                      file.mimeType.includes('document') ? 'fa-file-word text-blue-500' :
                      'fa-file text-teal-400';
                    return (
                      <div
                        key={file.id}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 transition-all"
                      >
                        <i className={`fa-solid ${icon} text-lg`}></i>
                        <span className="text-xs font-bold text-teal-900 truncate flex-1">{file.name}</span>
                        <button
                          onClick={() => importSingleDriveFile(driveBrowseJobId, file.id, file.name, file.mimeType)}
                          disabled={isDownloading || driveDownloading === 'all'}
                          className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all disabled:opacity-50"
                        >
                          {isDownloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-plus mr-1"></i>Add</>}
                        </button>
                      </div>
                    );
                  })}

                  {driveFolders.length === 0 && driveFiles.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-[10px] font-bold text-teal-800/40 uppercase tracking-wider">This folder is empty</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-teal-100 flex items-center gap-3">
              {driveFiles.length > 0 && (
                <button
                  onClick={() => importAllFilesFromDriveFolder(driveBrowseJobId)}
                  disabled={driveDownloading !== null}
                  className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {driveDownloading === 'all' ? (
                    <><i className="fa-solid fa-spinner fa-spin"></i> Downloading...</>
                  ) : (
                    <><i className="fa-solid fa-download"></i> Import All {driveFiles.length} File{driveFiles.length !== 1 ? 's' : ''}</>
                  )}
                </button>
              )}
              <button
                onClick={() => setDriveBrowseJobId(null)}
                className="px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider text-teal-600 hover:bg-teal-50 border border-teal-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
