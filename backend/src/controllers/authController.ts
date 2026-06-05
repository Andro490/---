import { Request, Response } from 'express';
import prisma from '../config/db';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';

// خيارات إعداد الكوكيز الآمنة لعدم تكرار الكود
// ✅ ملاحظة: عند استخدام cross-origin (مثلاً Vercel frontend + hosted backend)
// يجب أن يكون sameSite: 'none' و secure: true عشان المتصفح يبعت الكوكيز
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true, // 🔒 تمنع الجافا سكريبت تماماً من قراءتها وسرقتها عبر الـ XSS
  secure: isProduction, // تعمل فقط على HTTPS في السيرفر الحقيقي
  sameSite: isProduction ? ('none' as const) : ('lax' as const), // 'none' للـ cross-origin في الإنتاج
};

/**
 * دالة تسجيل مستخدم جديد
 * @param req طلب الـ Express يحتوي على بيانات المستخدم (الاسم، البريد، كلمة المرور، والدور)
 * @param res استجابة الـ Express
 * وظيفتها: التحقق من عدم وجود البريد مسبقاً، تشفير كلمة المرور، إنشاء الحساب، توليد الـ Tokens، وتخزينها في الـ Cookies
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, specialization, bio, avatarUrl, firstName, lastName, mobile, governorate, educationType, gradeLevel, section, deviceId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'STUDENT';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
        firstName: firstName || null,
        lastName: lastName || null,
        mobile: mobile || null,
        governorate: governorate || null,
        educationType: educationType || null,
        gradeLevel: gradeLevel || null,
        section: section || null,
        specialization: assignedRole === 'ADMIN' ? specialization : undefined,
        bio: assignedRole === 'ADMIN' ? bio : undefined,
        avatarUrl: assignedRole === 'ADMIN' ? avatarUrl : undefined,
        activeDeviceId: deviceId || null,
      },
    });

    const jti = crypto.randomUUID();
    const accessToken = generateAccessToken({ userId: user.id, role: user.role, deviceId }, jti);
    const refreshToken = generateRefreshToken({ userId: user.id, role: user.role, deviceId });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // 🍪 وضع التوكنز في كوكيز محمية
    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 دقيقة
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 أيام

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * دالة تسجيل الدخول
 * @param req طلب الـ Express يحتوي على البريد وكلمة المرور
 * @param res استجابة الـ Express
 * وظيفتها: التحقق من صحة البريد وكلمة المرور عبر المقارنة مع قاعدة البيانات، 
 * توليد الـ Access Token و Refresh Token وتعيينها في الـ Cookies
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, deviceId } = req.body;
    
    // 1. تتبع البيانات الواصلة للباك إند
    console.log("-----------------------------------------");
    console.log("📥 محاولة دخول جديدة:");
    console.log("البريد المستلم:", email);
    console.log("كلمة المرور المستلمة:", password);
    console.log("-----------------------------------------");

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log("❌ خطأ: المستخدم غير موجود في قاعدة البيانات");
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.password);
    
    // 2. تتبع نتيجة مقارنة التشفير
    console.log("🔐 نتيجة مقارنة التشفير (Bcrypt):", isMatch);

    if (!isMatch) {
      console.log("❌ خطأ: كلمة المرور غير مطابقة للمستخدم المختار");
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // تحديث activeDeviceId في قاعدة البيانات للجهاز الجديد
    if (deviceId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activeDeviceId: deviceId },
      });
    }

    const jti = crypto.randomUUID();
    const accessToken = generateAccessToken({ userId: user.id, role: user.role, deviceId }, jti);
    const refreshToken = generateRefreshToken({ userId: user.id, role: user.role, deviceId });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    console.log("✅ تم تسجيل الدخول بنجاح للمستخدم:", user.email);
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("🔥 خطأ كارثي في السيرفر:", error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * دالة تجديد التوكن (Refresh Token)
 * @param req طلب الـ Express لاستخراج الـ refreshToken من الكوكيز
 * @param res استجابة الـ Express
 * وظيفتها: يتم استدعاؤها عند انتهاء صلاحية الـ accessToken للحصول على واحد جديد دون الحاجة لتسجيل الدخول مرة أخرى
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    // 🍪 قراءة الـ Refresh Token من الكوكيز بدلاً من الـ body لقفل الثغرة
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Refresh Token Rotation: Delete old, issue new
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const jti = crypto.randomUUID();
    const newAccessToken = generateAccessToken({ userId: user.id, role: user.role, deviceId: decoded.deviceId }, jti);
    const newRefreshToken = generateRefreshToken({ userId: user.id, role: user.role, deviceId: decoded.deviceId });

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: newExpiresAt,
      },
    });

    // تحديث الكوكيز بالتوكنز الجديدة
    res.cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * دالة تسجيل الخروج لمسح الكوكيز تماماً من المتصفح عند المغادرة
 * وظيفتها: تنظيف المتصفح من رموز الدخول لمنع أي وصول غير مصرح به
 */
export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  const accessToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  // 1. Blacklist Access Token (jti)
  if (accessToken) {
    try {
      import('jsonwebtoken').then(async (jwt) => {
        const decoded: any = jwt.decode(accessToken);
        if (decoded && decoded.jti && decoded.exp) {
          await prisma.blacklistedToken.create({
            data: {
              jti: decoded.jti,
              expiresAt: new Date(decoded.exp * 1000),
            },
          });
        }
      });
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  // 2. Remove the Refresh Token from DB
  if (refreshToken) {
    try {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    } catch (error) {
      console.error('Error removing refresh token:', error);
    }
  }

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.status(200).json({ message: 'Logged out successfully' });
};

/**
 * دالة جلب بيانات المستخدم الحالي
 * @param req طلب الـ Express (AuthenticatedRequest) يحتوي على بيانات المستخدم المستخرجة من التوكن
 * @param res استجابة الـ Express لإرجاع بيانات المستخدم من قاعدة البيانات
 */
export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        governorate: true,
        educationType: true,
        gradeLevel: true,
        section: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * دالة إنشاء مدير النظام الافتراضي (Seed Admin)
 * وظيفتها: إعداد حساب المشرف الرئيسي للتطبيق في حالة عدم وجود مشرفين لتتمكن من إدارة النظام
 */
export const seedAdmin = async (req: Request, res: Response) => {
  try {
    // التحقق من عدم وجود أي حساب مدير في النظام لتجنب التكرار
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (existingAdmin) {
      return res.status(400).json({ message: 'An admin user already exists in the system' });
    }

    const adminEmail = 'admin@cinematic.com';

    const hashedPassword = await hashPassword('admin123');
    const admin = await prisma.user.create({
      data: {
        name: 'Cinematic Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    res.status(201).json({
      message: 'Admin account seeded successfully',
      email: admin.email,
      password: 'admin123 (Please change this in production!)',
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};