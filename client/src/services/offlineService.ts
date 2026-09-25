import { DecisionSnapshot, FullAnalysisBundle } from '../types/orca.js';

const DB_NAME = 'orca_marine_db';
const DB_VERSION = 1;
const STORE_ANALYSIS = 'analyses';
const STORE_SNAPSHOTS = 'snapshots';
const STORE_QUEUE = 'offline_queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ANALYSIS)) {
        db.createObjectStore(STORE_ANALYSIS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { autoIncrement: true });
      }
    };
  });
}

export class OfflineService {
  static async cacheAnalysis(bundle: FullAnalysisBundle): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_ANALYSIS, 'readwrite');
      tx.objectStore(STORE_ANALYSIS).put(bundle);
      // Also cache as 'latest' for quick offline boot
      tx.objectStore(STORE_ANALYSIS).put({ ...bundle, id: 'latest' });
    } catch (err) {
      console.warn('Could not cache analysis to IndexedDB:', err);
    }
  }

  static async getCachedLatestAnalysis(): Promise<FullAnalysisBundle | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_ANALYSIS, 'readonly');
        const req = tx.objectStore(STORE_ANALYSIS).get('latest');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  static async saveOfflineSnapshot(snapshot: DecisionSnapshot): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      tx.objectStore(STORE_SNAPSHOTS).put(snapshot);
      // Also push to sync queue
      const qtx = db.transaction(STORE_QUEUE, 'readwrite');
      qtx.objectStore(STORE_QUEUE).add({ type: 'SAVE_SNAPSHOT', payload: snapshot, queuedAt: new Date().toISOString() });
    } catch (err) {
      console.warn('Failed to store snapshot offline:', err);
    }
  }

  static async getOfflineSnapshots(): Promise<DecisionSnapshot[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
        const req = tx.objectStore(STORE_SNAPSHOTS).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  static async processSyncQueue(): Promise<number> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const itemsReq = store.getAll();

      return new Promise((resolve) => {
        itemsReq.onsuccess = async () => {
          const items = itemsReq.result || [];
          let syncedCount = 0;
          for (const item of items) {
            if (item.type === 'SAVE_SNAPSHOT') {
              try {
                await fetch('/api/snapshots', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(item.payload)
                });
                syncedCount++;
              } catch {
                // Keep in queue if still failing
              }
            }
          }
          if (syncedCount > 0) {
            store.clear();
          }
          resolve(syncedCount);
        };
        itemsReq.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }
}
