import { jsPDF } from 'jspdf';
import {
  clearStoredPatientsParentHandle,
  getStoredPatientsParentHandle,
  storePatientsParentHandle,
} from './fsHandleStore';

type ZeliskoTripleBundleParams = {
  patientFirstInitial: string;
  patientLastName: string;
  date: Date;
  tripleDifferencesExplainer?: string;
  perfectCaseReviewEdits: string;
  pp2: string;
  superNote: string;
  mk3: string;
  diamondStandardTakeaway: string;
  title?: string;
};

type SaveParams = {
  pdfBytes: Uint8Array;
  filename: string;
  patientsParentDirHandle: FileSystemDirectoryHandle;
  patientFolderName: string;
};

const TOP_MARGIN = 20;
const SIDE_MARGIN = 16;
const LINE_HEIGHT = 6;
const TITLE_SIZE = 16;
const HEADER_SIZE = 12;
const BODY_SIZE = 10;

const SECTION_PREFACE: Record<string, string> = {
  'Front Page: Edits To Reach A Perfect Case Review': 'This front page lists high-yield edits to turn the generated bundle into a Diamond Standard case review.',
  'Psych Preceptor 2.0': 'Lean, boundary-heavy supervision with rapid safety framing and documentation tightening.',
  'SUPER': 'Comprehensive rubric with medication reality checks, today-vs-later sequencing, and a second diagnostic lens.',
  'MK3': 'Nine-section operational template emphasizing safety window, corrected plan, scripts, and next-visit decision branches.',
  'What to take from each prompt to make the Diamond Standard Note4': 'Synthesize the best signal from each template into one chart-ready note with clear risk logic and execution thresholds.',
};

function sanitizeNamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|\s]+/g, '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

function addDivider(doc: jsPDF, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setDrawColor(15, 105, 105);
  doc.setLineWidth(0.6);
  doc.line(SIDE_MARGIN, y, pageWidth - SIDE_MARGIN, y);
  return y + 8;
}

function ensurePageSpace(doc: jsPDF, y: number, linesNeeded = 1): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const needed = linesNeeded * LINE_HEIGHT;
  if (y + needed <= pageHeight - TOP_MARGIN) {
    return y;
  }
  doc.addPage();
  return TOP_MARGIN;
}

function writeWrappedText(doc: jsPDF, text: string, yStart: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - SIDE_MARGIN * 2;
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  let y = yStart;

  for (const line of lines) {
    y = ensurePageSpace(doc, y, 1);
    doc.text(line, SIDE_MARGIN, y);
    y += LINE_HEIGHT;
  }

  return y;
}

function writeSection(doc: jsPDF, title: string, body: string, forceNewPage: boolean): void {
  if (forceNewPage) {
    doc.addPage();
  }

  let y = TOP_MARGIN;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(HEADER_SIZE);
  doc.setTextColor(10, 63, 63);
  doc.text(title, SIDE_MARGIN, y);
  y += 4;
  y = addDivider(doc, y);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(33, 74, 74);
  const preface = SECTION_PREFACE[title] ?? 'What this section optimizes: structured clinical decision-making and educational clarity.';
  y = writeWrappedText(doc, preface, y);

  y += 2;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(26, 26, 26);
  writeWrappedText(doc, formatCaseReviewPdfText(body), y);
}

function getLocalMmDd(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}${dd}`;
}

export function formatCaseReviewPdfText(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/\[SECTION_\d+\]/gi, '')
    .replace(/`{1,3}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildFilename(patientFirstInitial: string, patientLastName: string, date: Date): string {
  const firstInitial = sanitizeNamePart(patientFirstInitial).slice(0, 1).toUpperCase() || 'X';
  const lastName = sanitizeNamePart(patientLastName) || 'Unknown';
  const mmdd = getLocalMmDd(date);
  const base = `${firstInitial}_${lastName}_${mmdd}_Case Review.pdf`;
  return base.includes(' ') ? base : base;
}

export function generateZeliskoTripleBundlePdf(params: ZeliskoTripleBundleParams): {
  doc: jsPDF;
  filename: string;
  pdfBytes: Uint8Array;
} {
  const {
    patientFirstInitial,
    patientLastName,
    date,
    tripleDifferencesExplainer = '',
    perfectCaseReviewEdits,
    pp2,
    superNote,
    mk3,
    diamondStandardTakeaway,
    title = 'Dr. Zelisko - Triple Output Case Review Bundle',
  } = params;

  const doc = new jsPDF();
  const displayDate = date.toLocaleDateString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(5, 57, 57);
  doc.text(title.replace(' - ', ' — '), SIDE_MARGIN, TOP_MARGIN);

  doc.setFontSize(BODY_SIZE);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(38, 72, 72);
  doc.text(`Patient: ${patientFirstInitial.toUpperCase()}. ${patientLastName}`, SIDE_MARGIN, TOP_MARGIN + 8);
  doc.text(`Date: ${displayDate}`, SIDE_MARGIN, TOP_MARGIN + 14);

  const sectionStartY = addDivider(doc, TOP_MARGIN + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(HEADER_SIZE);
  doc.text('Front Page: Edits To Reach A Perfect Case Review', SIDE_MARGIN, sectionStartY);

  let y = sectionStartY + 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(33, 74, 74);
  y = writeWrappedText(doc, SECTION_PREFACE['Front Page: Edits To Reach A Perfect Case Review'], y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(26, 26, 26);
  const frontPageBody = [
    tripleDifferencesExplainer ? `How PP2, SUPER, and MK3 differ:\n${tripleDifferencesExplainer}` : '',
    'Edits to make this a perfect case review:',
    perfectCaseReviewEdits || 'Unknown / Not Documented',
  ].filter(Boolean).join('\n\n');
  writeWrappedText(doc, formatCaseReviewPdfText(frontPageBody), y + 2);

  writeSection(doc, 'Psych Preceptor 2.0', pp2, true);
  writeSection(doc, 'SUPER', superNote, true);
  writeSection(doc, 'MK3', mk3, true);
  writeSection(
    doc,
    'What to take from each prompt to make the Diamond Standard Note4',
    diamondStandardTakeaway,
    true,
  );

  const filename = buildFilename(patientFirstInitial, patientLastName, date);
  const rawBytes = doc.output('arraybuffer');

  return {
    doc,
    filename,
    pdfBytes: new Uint8Array(rawBytes),
  };
}

export function triggerBrowserDownload(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

export async function savePdfToDirectory(params: SaveParams): Promise<string> {
  const { pdfBytes, filename, patientsParentDirHandle, patientFolderName } = params;

  const folderName = patientFolderName.trim() || 'Unknown';
  const patientDir = await patientsParentDirHandle.getDirectoryHandle(folderName, { create: true });
  const notesDir = await patientDir.getDirectoryHandle('ClientCaseNotes', { create: true });
  const fileHandle = await notesDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  await writable.write(arrayBuffer);
  await writable.close();

  return `${folderName}/ClientCaseNotes/${filename}`;
}

type PermissionCapableHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
};

async function requestReadWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const permissionHandle = handle as PermissionCapableHandle;
  if (typeof permissionHandle.queryPermission !== 'function' || typeof permissionHandle.requestPermission !== 'function') {
    return true;
  }

  const permission = await permissionHandle.queryPermission({ mode: 'readwrite' });
  if (permission === 'granted') {
    return true;
  }

  if (permission === 'prompt') {
    const requested = await permissionHandle.requestPermission({ mode: 'readwrite' });
    return requested === 'granted';
  }

  return false;
}

type ShowDirectoryPicker = () => Promise<FileSystemDirectoryHandle>;

function getShowDirectoryPicker(): ShowDirectoryPicker | null {
  const maybeWindow = window as Window & { showDirectoryPicker?: ShowDirectoryPicker };
  return typeof maybeWindow.showDirectoryPicker === 'function' ? maybeWindow.showDirectoryPicker : null;
}

export async function getOrRequestPatientsParentDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const showDirectoryPicker = getShowDirectoryPicker();
  if (!showDirectoryPicker) {
    return null;
  }

  const stored = await getStoredPatientsParentHandle();
  if (stored) {
    const granted = await requestReadWritePermission(stored);
    if (granted) {
      return stored;
    }
  }

  const pickedHandle = await showDirectoryPicker();
  await requestReadWritePermission(pickedHandle);
  await storePatientsParentHandle(pickedHandle);
  return pickedHandle;
}

export async function clearStoredDirectoryHandle(): Promise<void> {
  await clearStoredPatientsParentHandle();
}

export const supportsFileSystemAccess = (): boolean => {
  return getShowDirectoryPicker() !== null;
};
