import jwt from 'jsonwebtoken';

// ✅ SECURITY: Use environment variables, support multiple keys (comma-separated) for Zero-Downtime Rotation
// Example in .env: JWT_SECRETS="new_key_v2,old_key_v1"
const accessSecretsStr = process.env.JWT_SECRETS || process.env.JWT_SECRET || '';
const refreshSecretsStr = process.env.JWT_REFRESH_SECRETS || process.env.JWT_REFRESH_SECRET || '';

// ✅ Validate that secrets are set
if (accessSecretsStr.length < 32) {
  console.error('⚠️ CRITICAL: JWT_SECRET or JWT_SECRETS must be set and at least 32 characters long in .env');
  if (process.env.NODE_ENV === 'production') throw new Error('JWT configuration missing. Server cannot start.');
}

if (refreshSecretsStr.length < 32) {
  console.error('⚠️ CRITICAL: JWT_REFRESH_SECRET or JWT_REFRESH_SECRETS must be set and at least 32 characters long in .env');
  if (process.env.NODE_ENV === 'production') throw new Error('JWT Refresh configuration missing. Server cannot start.');
}

// Convert string to array. First element [0] is ALWAYS the primary (active) key for signing new tokens.
const accessSecrets = accessSecretsStr.split(',').map(s => s.trim());
const refreshSecrets = refreshSecretsStr.split(',').map(s => s.trim());

interface TokenPayload {
  userId: string;
  role: string;
  jti?: string;
  deviceId?: string;
}

export const generateAccessToken = (payload: TokenPayload, jti?: string): string => {
  const options: jwt.SignOptions = { expiresIn: '15m' };
  if (jti) options.jwtid = jti;
  // التوقيع دائماً يتم باستخدام المفتاح الأحدث (أول مفتاح في المصفوفة)
  return jwt.sign(payload, accessSecrets[0], options);
};

export const generateRefreshToken = (payload: TokenPayload, jti?: string): string => {
  const options: jwt.SignOptions = { expiresIn: '7d' };
  if (jti) options.jwtid = jti;
  // التوقيع دائماً يتم باستخدام المفتاح الأحدث
  return jwt.sign(payload, refreshSecrets[0], options);
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  // للتحقق، نجرب كل المفاتيح (الجديد ثم القديم) لضمان عدم طرد المستخدمين القدامى
  for (const secret of accessSecrets) {
    try {
      return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
      // إذا فشل مفتاح، نستمر في المحاولة مع المفتاح الأقدم
      continue;
    }
  }
  // إذا فشلت جميع المفاتيح، فالتوكن غير صالح أو منتهي الصلاحية
  return null;
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  for (const secret of refreshSecrets) {
    try {
      return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
      continue;
    }
  }
  return null;
};
