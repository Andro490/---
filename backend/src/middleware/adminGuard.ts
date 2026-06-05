import { Request, Response, NextFunction } from 'express';

export const adminGuard = (req: Request, res: Response, next: NextFunction) => {
  // السماح بالوصول المباشر في بيئة التطوير
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // في بيئة الإنتاج، التحقق من وجود المفتاح السري في الهيدر
  if (process.env.NODE_ENV === 'production') {
    const providedSecret = req.headers['x-seed-secret'];
    const expectedSecret = process.env.SEED_SECRET;

    if (!expectedSecret) {
      console.error('Security Error: SEED_SECRET is not defined in environment variables.');
      return res.status(403).json({ message: 'Forbidden: Security misconfiguration.' });
    }

    if (providedSecret === expectedSecret) {
      return next();
    }
  }

  // منع أي طلب لا يستوفي الشروط السابقة
  return res.status(403).json({ message: 'Forbidden: Invalid or missing security credentials.' });
};
