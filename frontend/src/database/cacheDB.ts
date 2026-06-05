import { initDB } from './indexedDB';

export const cacheDB = {
  async setApiCache(endpoint: string, data: any) {
    const db = await initDB();
    await db.put('api_cache', { endpoint, data, timestamp: Date.now() });
  },

  async getApiCache(endpoint: string) {
    const db = await initDB();
    const result = await db.get('api_cache', endpoint);
    return result ? result : null;
  },

  async addToOfflineQueue(request: { url: string; method: string; body?: any; headers?: any }) {
    const db = await initDB();
    await db.add('offline_queue', { request, timestamp: Date.now() });
  },

  async getOfflineQueue() {
    const db = await initDB();
    const tx = db.transaction('offline_queue', 'readonly');
    const index = tx.store.index('by-time');
    return index.getAll();
  },

  async removeOfflineQueueItem(id: number) {
    const db = await initDB();
    await db.delete('offline_queue', id);
  }
};
