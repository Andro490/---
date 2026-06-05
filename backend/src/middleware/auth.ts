import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    deviceId?: string;
  };
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // 🍪 التعديل الأمني: قراءة التوكن من الكوكيز المحمية أولاً، وإذا لم يجدها يقرأ من الهيدر التقليدي
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  // لو مفيش توكن خالص لا في الكوكي ولا في الهيدر
  if (!token) {
    console.error('Auth Error: No token provided in cookies or headers');
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  // التحقق من صحة التوكن وصلاحيته
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    console.error('Auth Error: Invalid or expired token', token.substring(0, 10) + '...');
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  // التحقق مما إذا كان التوكن مدرجاً في القائمة السوداء (Blacklisted)
  if (decoded.jti) {
    const isBlacklisted = await prisma.blacklistedToken.findUnique({
      where: { jti: decoded.jti },
    });
    if (isBlacklisted) {
      console.error('Auth Error: Token is blacklisted', decoded.jti);
      return res.status(401).json({ message: 'Token has been revoked.' });
      
    }
  }

  // التحقق من Single Device Session (الأداء عالي بفضل اختيار حقل واحد فقط select)
  if (decoded.deviceId) {
    const userSession = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { activeDeviceId: true },
    });

    if (userSession && userSession.activeDeviceId !== decoded.deviceId) {
      console.error('Auth Error: Logged in from another device', decoded.userId);
      return res.status(403).json({ message: 'تم تسجيل الدخول من جهاز آخر. يرجى تسجيل الدخول مجدداً.' });
    }
  }

  // تمرير البيانات المفكوكة للـ Controllers
  req.user = decoded;
  next();
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      if (decoded.jti) {
        const isBlacklisted = await prisma.blacklistedToken.findUnique({
          where: { jti: decoded.jti },
        });
        if (!isBlacklisted) {
          // التحقق من الجهاز هنا اختياري، لكن نطبقه لضمان الاتساق
          if (decoded.deviceId) {
            const userSession = await prisma.user.findUnique({
              where: { id: decoded.userId },
              select: { activeDeviceId: true },
            });
            if (!userSession || userSession.activeDeviceId === decoded.deviceId) {
              req.user = decoded;
            }
          } else {
            req.user = decoded;
          }
        }
      } else {
        req.user = decoded;
      }
    }
  }
  next();
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    // الأمان الحقيقي ضد تزوير الصلاحيات: التحقق من الـ role القادم من التوكن المشفر
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden. You do not have permission.' });
    }

    next();
  };
};
