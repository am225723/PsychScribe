import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import { loadUnicodeFont } from './pdf/loadUnicodeFont';
import {
  clearStoredPatientsParentHandle,
  getStoredPatientsParentHandle,
  storePatientsParentHandle,
} from './fsHandleStore';

type ZeliskoTripleBundleParams = {
  patientFirstInitial: string;
  patientLastName: string;
  date: Date;
  pp2: string;
  superNote: string;
  mk3: string;
  diamond: string;
  title?: string;
};

export type GeneratedNotes = {
  pp2: string;
  super: string;
  mk3: string;
  diamond: string;
};

export type CaseMeta = {
  patientFirstInitial: string;
  patientLastName: string;
  date: Date;
  filename?: string;
};

type SaveParams = {
  pdfBytes: Uint8Array;
  filename: string;
  patientsParentDirHandle: FileSystemDirectoryHandle;
  patientFolderName: string;
};

type PageSize = { w: number; h: number };

const PAGE_SIZE: PageSize = { w: 612, h: 792 }; // Letter
const MARGIN = 48;
const TITLE_SIZE = 14;
const SECTION_TITLE_SIZE = 14;
const BODY_SIZE = 10;
const LINE_HEIGHT = 12;

function sanitizeNamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|\s]+/g, '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

function getLocalMmDd(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}${dd}`;
}

function normalizeLineForPdf(raw: string): string {
  return raw
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/→/g, '->')
    .replace(/[•●▪◦]/g, '-')
    .replace(/…/g, '...')
    .replace(/\t/g, '  ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

function wrapLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    const normalizedRaw = normalizeLineForPdf(rawLine).trimEnd();
    const words = normalizedRaw.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let cur = '';
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (next.length > maxChars) {
        if (cur) lines.push(cur);
        cur = word;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

function getDiamondSummaryText(diamond: string): string {
  const safeDiamond = formatCaseReviewPdfText(diamond || '');
  const match = safeDiamond.match(/Executive Summary([\s\S]*?)(\n{2,}|$)/i);
  if (match?.[1]) {
    return `Executive Summary\n${match[1].trim()}`;
  }
  return safeDiamond
    .split('\n')
    .slice(0, 80)
    .join('\n')
    .trim();
}

async function addOnePageSummary(
  pdf: PDFDocument,
  title: string,
  body: string,
  font: PDFFont,
): Promise<void> {
  const page = pdf.addPage([PAGE_SIZE.w, PAGE_SIZE.h]);
  let y = PAGE_SIZE.h - MARGIN;

  page.drawText(normalizeLineForPdf(title), {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font,
    color: rgb(0.09, 0.23, 0.23),
  });
  y -= TITLE_SIZE + 10;

  const minTextSize = 7;
  const maxTextSize = 11;
  const lineHeightFactor = 1.2;
  const availableHeight = y - MARGIN;

  let chosenSize = minTextSize;
  let chosenLines: string[] = [];

  for (let size = maxTextSize; size >= minTextSize; size--) {
    const lineHeight = size * lineHeightFactor;
    const maxChars = Math.floor(85 + (maxTextSize - size) * 6);
    const lines = wrapLines(body, maxChars);
    const neededHeight = lines.length * lineHeight;

    if (neededHeight <= availableHeight) {
      chosenSize = size;
      chosenLines = lines;
      break;
    }
  }

  if (chosenLines.length === 0) {
    const size = minTextSize;
    const lineHeight = size * lineHeightFactor;
    const maxChars = Math.floor(85 + (maxTextSize - size) * 6);
    const lines = wrapLines(body, maxChars);

    const maxLines = Math.floor(availableHeight / lineHeight) - 2;
    const clipped = lines.slice(0, Math.max(0, maxLines));
    clipped.push('');
    clipped.push('...(summary truncated to fit one page; see Diamond/MK3 for full detail)');
    chosenSize = size;
    chosenLines = clipped;
  }

  const lineHeight = chosenSize * lineHeightFactor;
  for (const line of chosenLines) {
    page.drawText(normalizeLineForPdf(line), {
      x: MARGIN,
      y,
      size: chosenSize,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= lineHeight;
  }
}

async function addSection(
  pdf: PDFDocument,
  title: string,
  body: string,
  font: PDFFont,
  startOnNewPage: boolean,
): Promise<void> {
  let page = startOnNewPage
    ? pdf.addPage([PAGE_SIZE.w, PAGE_SIZE.h])
    : (pdf.getPages().at(-1) ?? pdf.addPage([PAGE_SIZE.w, PAGE_SIZE.h]));

  let y = PAGE_SIZE.h - MARGIN;
  page.drawText(normalizeLineForPdf(title), {
    x: MARGIN,
    y,
    size: SECTION_TITLE_SIZE,
    font,
    color: rgb(0.09, 0.23, 0.23),
  });
  y -= SECTION_TITLE_SIZE + 10;

  const wrapped = wrapLines(body, 105);
  for (const line of wrapped) {
    if (y < MARGIN + LINE_HEIGHT) {
      page = pdf.addPage([PAGE_SIZE.w, PAGE_SIZE.h]);
      y = PAGE_SIZE.h - MARGIN;
    }

    page.drawText(normalizeLineForPdf(line), {
      x: MARGIN,
      y,
      size: BODY_SIZE,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= LINE_HEIGHT;
  }
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
  return `${firstInitial}_${lastName}_${mmdd}_Case Review.pdf`;
}

export async function buildBundledCaseReviewPdf(meta: CaseMeta, notes: GeneratedNotes): Promise<{
  pdfBytes: Uint8Array;
  filename: string;
}> {
  const pdf = await PDFDocument.create();
  const font = await loadUnicodeFont(pdf);

  const safeNotes: GeneratedNotes = {
    pp2: formatCaseReviewPdfText(notes.pp2 || ''),
    super: formatCaseReviewPdfText(notes.super || ''),
    mk3: formatCaseReviewPdfText(notes.mk3 || ''),
    diamond: formatCaseReviewPdfText(notes.diamond || ''),
  };

  const summaryText = getDiamondSummaryText(
    safeNotes.diamond || safeNotes.mk3 || safeNotes.pp2 || safeNotes.super,
  );

  await addOnePageSummary(pdf, 'Case Summary (1-page)', summaryText, font);
  await addSection(pdf, 'Psych Preceptor 2.0', safeNotes.pp2, font, true);
  await addSection(pdf, 'Zelisko SUPER', safeNotes.super, font, true);
  await addSection(pdf, 'MK3 Case Review', safeNotes.mk3, font, true);
  await addSection(pdf, 'Diamond Standard Case Review', safeNotes.diamond, font, true);

  const pdfBytes = await pdf.save();
  const filename = meta.filename || buildFilename(meta.patientFirstInitial, meta.patientLastName, meta.date);

  return { pdfBytes, filename };
}

export async function generateZeliskoTripleBundlePdf(params: ZeliskoTripleBundleParams): Promise<{
  doc: PDFDocument;
  filename: string;
  pdfBytes: Uint8Array;
}> {
  const {
    patientFirstInitial,
    patientLastName,
    date,
    pp2,
    superNote,
    mk3,
    diamond,
  } = params;

  const filename = buildFilename(patientFirstInitial, patientLastName, date);
  const { pdfBytes } = await buildBundledCaseReviewPdf(
    {
      patientFirstInitial,
      patientLastName,
      date,
      filename,
    },
    {
      pp2,
      super: superNote,
      mk3,
      diamond,
    },
  );

  const doc = await PDFDocument.load(pdfBytes);
  return { doc, filename, pdfBytes };
}

export function triggerBrowserDownload(pdfBytes: Uint8Array, filename: string): void {
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
