import { initDB } from './indexedDB';

export const settingsDB = {
  async setSetting(key: string, value: any) {
    const db = await initDB();
    await db.put('settings', { key, value });
  },

  async getSetting(key: string): Promise<any> {
    const db = await initDB();
    const result = await db.get('settings', key);
    return result ? result.value : null;
  }
};
