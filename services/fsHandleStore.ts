const DB_NAME = 'PsychScribeFS';
const STORE_NAME = 'handles';
const PATIENTS_PARENT_KEY = 'patientsParent';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function runStoreRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then((db) => {
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    });
  });
}

export async function storePatientsParentHandle(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    await runStoreRequest('readwrite', (store) => store.put(handle, PATIENTS_PARENT_KEY));
    return true;
  } catch {
    // Some browsers cannot structured-clone FS handles; caller will re-prompt when needed.
    return false;
  }
}

export async function getStoredPatientsParentHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const result = await runStoreRequest<FileSystemDirectoryHandle | undefined>(
      'readonly',
      (store) => store.get(PATIENTS_PARENT_KEY),
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export async function clearStoredPatientsParentHandle(): Promise<void> {
  try {
    await runStoreRequest('readwrite', (store) => store.delete(PATIENTS_PARENT_KEY));
  } catch {
    // Best effort clear.
  }
}
