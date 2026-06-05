import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-cbc';

// Helper to get a 32-byte key
const getKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default_secret_key_needs_change_in_prod';
  return crypto.createHash('sha256').update(secret).digest();
};

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV along with encrypted data (iv:encrypted)
  return `${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  // Use indexOf to split only on the FIRST colon
  // This prevents corruption when encrypted data contains colons
  const colonIndex = encryptedText.indexOf(':');
  
  if (colonIndex === -1) {
    throw new Error('Invalid encrypted format. Expected iv:encrypted_data');
  }

  const ivHex = encryptedText.substring(0, colonIndex);
  const encrypted = encryptedText.substring(colonIndex + 1);
  
  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted format. IV or encrypted data is empty');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  // CRITICAL: trim the decrypted result to remove any hidden whitespace
  return decrypted.trim();
};

