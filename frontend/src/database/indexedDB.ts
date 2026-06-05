import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface EduPlatformDB extends DBSchema {
  auth: {
    key: string;
    value: { key: string; value: string };
  };
  settings: {
    key: string;
    value: { key: string; value: any };
  };
  courses_cache: {
    key: string; // courseId or 'all_courses'
    value: { id: string; data: any; timestamp: number };
  };
  progress_cache: {
    key: string; // courseId
    value: { id: string; data: any; timestamp: number };
  };
  api_cache: {
    key: string; // endpoint
    value: { endpoint: string; data: any; timestamp: number };
  };
  offline_queue: {
    key: number;
    value: { id?: number; request: { url: string; method: string; body?: any; headers?: any }; timestamp: number };
    indexes: { 'by-time': number };
  };
}

let dbPromise: Promise<IDBPDatabase<EduPlatformDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<EduPlatformDB>('edu-platform-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('auth')) db.createObjectStore('auth', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('courses_cache')) db.createObjectStore('courses_cache', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('progress_cache')) db.createObjectStore('progress_cache', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('api_cache')) db.createObjectStore('api_cache', { keyPath: 'endpoint' });
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('by-time', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
};

export const clearDatabase = async () => {
  const db = await initDB();
  const tx = db.transaction(db.objectStoreNames, 'readwrite');
  const stores = Array.from(tx.objectStoreNames);
  for (const store of stores) {
    tx.objectStore(store as any).clear();
  }
  await tx.done;
};
