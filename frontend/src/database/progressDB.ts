import { initDB } from './indexedDB';

export const progressDB = {
  async cacheProgress(courseId: string, progressData: any) {
    const db = await initDB();
    await db.put('progress_cache', { id: `progress_${courseId}`, data: progressData, timestamp: Date.now() });
  },

  async getCachedProgress(courseId: string) {
    const db = await initDB();
    return db.get('progress_cache', `progress_${courseId}`);
  },

  async clearProgressCache() {
    const db = await initDB();
    await db.clear('progress_cache');
  }
};
