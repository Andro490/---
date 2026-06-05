import { initDB } from './indexedDB';

import CryptoJS from 'crypto-js';

// ✅ SECURITY: Using AES Encryption for tokens
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'cinematic-edu-fallback-secure-key-2024';

const encodeToken = (token: string): string => {
  try {
    return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
  } catch (e) {
    return token;
  }
};

const decodeToken = (encoded: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encoded, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || encoded;
  } catch (e) {
    return encoded;
  }
};

export const authDB = {
  async setToken(key: 'accessToken' | 'refreshToken', token: string) {
    const db = await initDB();
    // ✅ Encode token before storing
    const encodedToken = encodeToken(token);
    await db.put('auth', { key, value: encodedToken });
  },

  async getToken(key: 'accessToken' | 'refreshToken'): Promise<string | null> {
    const db = await initDB();
    const result = await db.get('auth', key);
    if (result) {
      // ✅ Decode token when retrieving
      return decodeToken(result.value);
    }
    return null;
  },

  async removeToken(key: 'accessToken' | 'refreshToken') {
    const db = await initDB();
    await db.delete('auth', key);
  },

  async clearAuth() {
    const db = await initDB();
    await db.clear('auth');
  }
};
