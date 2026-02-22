export type VaultDocumentType = 'summary' | 'treatment' | 'darp' | 'preceptor';

export type VaultItem = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  documentType: VaultDocumentType;
  patient?: {
    firstInitial?: string;
    lastName?: string;
    folderName?: string;
  };
  sourceFileName?: string;
  sourceMimeType?: string;
  sourceText?: string;
  generatedText?: string;
  preceptorV1Text?: string;
  preceptorV2Text?: string;
  differencesExplainer?: string;
  perfectCaseReviewEdits?: string;
  lensReviews?: string[];
  finalReview?: string;
  lensExplainer?: string;
  title?: string;
  isUrgent?: boolean;
  dbReportId?: string;
};

const STORAGE_KEY = 'psychscribe.vault.items.v2';

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeDocumentType(value: unknown): VaultDocumentType {
  const text = String(value || '').toLowerCase();
  if (text === 'treatment' || text === 'darp' || text === 'preceptor') return text;
  return 'summary';
}

function parsePatientFromText(text: string): { firstInitial?: string; lastName?: string } {
  const patientNameMatch = text.match(/PATIENT_NAME:\s*(.*)/i);
  if (!patientNameMatch) return {};

  const clean = patientNameMatch[1].replace(/\*+/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};

  const firstInitial = parts[0][0]?.toUpperCase();
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return { firstInitial, lastName };
}

function migrateItem(input: any): VaultItem {
  const lensReviews = Array.isArray(input?.lensReviews)
    ? input.lensReviews.filter((x: unknown) => typeof x === 'string')
    : undefined;

  const preceptorV1Text = typeof input?.preceptorV1Text === 'string'
    ? input.preceptorV1Text
    : lensReviews?.[0];

  const preceptorV2Text = typeof input?.preceptorV2Text === 'string'
    ? input.preceptorV2Text
    : lensReviews?.[1];

  const differencesExplainer = typeof input?.differencesExplainer === 'string'
    ? input.differencesExplainer
    : typeof input?.lensExplainer === 'string'
      ? input.lensExplainer
      : undefined;
  const perfectCaseReviewEdits = typeof input?.perfectCaseReviewEdits === 'string'
    ? input.perfectCaseReviewEdits
    : undefined;

  const fallbackPreceptorText = [preceptorV1Text, preceptorV2Text].filter(Boolean).join('\n\n');
  const generatedText = typeof input?.generatedText === 'string'
    ? input.generatedText
    : typeof input?.content === 'string'
      ? input.content
      : fallbackPreceptorText;

  const patient = input?.patient || parsePatientFromText(generatedText);

  return {
    id: String(input?.id ?? `vault-${Date.now()}`),
    createdAt: String(input?.createdAt ?? input?.date ?? new Date().toISOString()),
    updatedAt: input?.updatedAt ? String(input.updatedAt) : undefined,
    documentType: normalizeDocumentType(input?.documentType),
    patient: {
      firstInitial: patient?.firstInitial,
      lastName: patient?.lastName,
      folderName: patient?.folderName,
    },
    sourceFileName: input?.sourceFileName,
    sourceMimeType: input?.sourceMimeType,
    sourceText: input?.sourceText,
    generatedText,
    preceptorV1Text,
    preceptorV2Text,
    differencesExplainer,
    perfectCaseReviewEdits,
    lensReviews,
    finalReview: typeof input?.finalReview === 'string' ? input.finalReview : undefined,
    lensExplainer: typeof input?.lensExplainer === 'string' ? input.lensExplainer : undefined,
    title: typeof input?.title === 'string' ? input.title : undefined,
    isUrgent: Boolean(input?.isUrgent),
    dbReportId: typeof input?.dbReportId === 'string' ? input.dbReportId : undefined,
  };
}

export function getVaultItems(): VaultItem[] {
  const parsed = safeJsonParse<any[]>(localStorage.getItem(STORAGE_KEY));
  if (!parsed || !Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((item) => migrateItem(item));
}

export function saveVaultItems(items: VaultItem[]): void {
  const normalized = items.map((item) => migrateItem(item));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function upsertVaultItem(item: VaultItem): VaultItem[] {
  const existing = getVaultItems();
  const normalized = migrateItem(item);
  const idx = existing.findIndex((entry) => entry.id === normalized.id);

  if (idx >= 0) {
    existing[idx] = {
      ...existing[idx],
      ...normalized,
      updatedAt: new Date().toISOString(),
    };
  } else {
    existing.unshift(normalized);
  }

  saveVaultItems(existing);
  return existing;
}

export function removeVaultItemById(id: string): VaultItem[] {
  const next = getVaultItems().filter((item) => item.id !== id);
  saveVaultItems(next);
  return next;
}

export function mergeVaultItemsWithUniqueKey(items: VaultItem[]): VaultItem[] {
  const map = new Map<string, VaultItem>();

  for (const item of items) {
    const key = item.id;
    if (!map.has(key)) {
      map.set(key, migrateItem(item));
    }
  }

  return [...map.values()].sort((a, b) => {
    const aDate = new Date(a.updatedAt || a.createdAt).getTime();
    const bDate = new Date(b.updatedAt || b.createdAt).getTime();
    return bDate - aDate;
  });
}
