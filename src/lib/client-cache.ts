/**
 * Dropza Client Storage & Cache Service
 * Powered by IndexedDB for zero-size-limit binary File & Blob persistence
 * Keeps staged files, active uploads, and recent shares persistent across page refreshes
 */

const DB_NAME = "dropza_client_cache";
const DB_VERSION = 1;

export interface StagedItem {
  id: string;
  file: File;
  addedAt: number;
}

export interface RecentShareItem {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  shareUrl: string;
  token: string;
  expiresAt?: string;
  previewUrl?: string;
  completedAt: number;
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("staged_files")) {
          db.createObjectStore("staged_files", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("recent_shares")) {
          db.createObjectStore("recent_shares", { keyPath: "token" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn("IndexedDB failed to open, running without client cache");
        resolve(null);
      };
    } catch (e) {
      console.warn("IndexedDB error:", e);
      resolve(null);
    }
  });
}

/**
 * Save files that user has selected into IndexedDB so they survive page refreshes
 */
export async function saveStagedFiles(items: { id: string; file: File }[]): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction("staged_files", "readwrite");
      const store = tx.objectStore("staged_files");

      for (const item of items) {
        store.put({
          id: item.id,
          file: item.file,
          addedAt: Date.now(),
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Retrieve all staged files previously selected
 */
export async function getStagedFiles(): Promise<StagedItem[]> {
  const db = await openDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction("staged_files", "readonly");
      const store = tx.objectStore("staged_files");
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result || []) as StagedItem[];
        // Sort by addedAt ascending
        results.sort((a, b) => a.addedAt - b.addedAt);
        resolve(results);
      };
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Remove a single staged file after deletion or upload completion
 */
export async function removeStagedFile(id: string): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction("staged_files", "readwrite");
      tx.objectStore("staged_files").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Clear all staged files from cache
 */
export async function clearStagedFiles(): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction("staged_files", "readwrite");
      tx.objectStore("staged_files").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Save completed share link into recent shares
 */
export async function saveRecentShare(item: {
  id?: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  shareUrl: string;
  token: string;
  expiresAt?: string;
  previewUrl?: string;
}): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction("recent_shares", "readwrite");
      const store = tx.objectStore("recent_shares");
      store.put({
        id: item.id || Math.random().toString(36).substring(2, 9),
        name: item.name,
        sizeBytes: item.sizeBytes,
        mimeType: item.mimeType,
        shareUrl: item.shareUrl,
        token: item.token,
        expiresAt: item.expiresAt,
        previewUrl: item.previewUrl,
        completedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Retrieve all recent shares generated on this client device
 */
export async function getRecentShares(): Promise<RecentShareItem[]> {
  const db = await openDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction("recent_shares", "readonly");
      const store = tx.objectStore("recent_shares");
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result || []) as RecentShareItem[];
        // Sort descending (most recent first)
        results.sort((a, b) => b.completedAt - a.completedAt);
        resolve(results.slice(0, 20));
      };
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Remove a recent share record from client device cache
 */
export async function removeRecentShare(token: string): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction("recent_shares", "readwrite");
      tx.objectStore("recent_shares").delete(token);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
