# تصميم نظام مصادقة (Authentication) آمن باستخدام JWT و RSA/ECDSA

هذا الدليل يوضح كيفية تصميم وبناء نظام مصادقة آمن باستخدام Node.js و Express و Prisma، مع تطبيق أفضل الممارسات الأمنية للحماية من ثغرات مثل XSS و CSRF.

## 1. الهيكلية (Database Schema) باستخدام Prisma
نحتاج إلى ثلاثة جداول أساسية:
1. `User`: لتخزين بيانات المستخدم.
2. `RefreshToken`: لتخزين الـ Refresh Tokens طويلة الأمد وإدارتها (مثل الإلغاء Revocation).
3. `BlacklistedToken`: لتخزين مُعرّف `jti` الخاص بالـ Access Tokens التي تم إبطالها (مثلاً عند تسجيل الخروج) لمنع استخدامها قبل انتهاء وقتها الفعلي.

```prisma
// schema.prisma

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  password      String
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id          String   @id @default(uuid())
  token       String   @unique // يفضل عمل Hash لهذا التوكن قبل تخزينه لمزيد من الأمان
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  revoked     Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model BlacklistedToken {
  id        String   @id @default(uuid())
  jti       String   @unique
  expiresAt DateTime // لتسهيل عملية التنظيف التلقائي (Cron Job) للتوكنز المنتهية
  createdAt DateTime @default(now())
}
```

---

## 2. البرمجة والمنطق (Node.js & Express)

### 2.1 إنشاء التوكنز (Tokens Generation)
سنقوم بإنشاء `Access Token` قصير الأمد باستخدام `RSA256` وإضافة `jti` (JWT ID).
وسننشئ `Refresh Token` كـ Opaque Token (نص عشوائي غير مشفر مثل UUID) ونخزنه في قاعدة البيانات.

```typescript
// auth.service.ts
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const privateKey = process.env.JWT_PRIVATE_KEY!; 

export const generateTokens = async (userId: string) => {
  const jti = uuidv4();
  
  // 1. Access Token (مثال: 15 دقيقة)
  const accessToken = jwt.sign({ userId }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '15m',
    jwtid: jti, // تضمين المعرف الفريد للـ Blacklisting
  });

  // 2. Refresh Token (مثال: 7 أيام)
  const refreshToken = uuidv4(); // Opaque Token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken, 
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};
```

### 2.2 تسجيل الدخول (Login) وإرسال الـ Cookies
لتجنب ثغرة **XSS (Cross-Site Scripting)**، لا يجب أبداً تخزين الـ `Refresh Token` في `localStorage`. بدلاً من ذلك، نرسله كـ `HttpOnly Cookie`. 

```typescript
// auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
// ... استدعاء prisma و generateTokens

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const { accessToken, refreshToken } = await generateTokens(user.id);

  // تخزين Refresh Token في HttpOnly Cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // يمنع جافاسكريبت (المتصفح) من الوصول إليه، يحمي من XSS
    secure: process.env.NODE_ENV === 'production', // يجب أن يكون true في الإنتاج (HTTPS)
    sameSite: 'strict', // يحمي من هجمات CSRF (Cross-Site Request Forgery)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  });

  // الـ Access Token يتم إرساله في الـ Body
  // ويمكن للفرونت اند تخزينه في الـ Memory (مثل Redux أو Zustand)
  res.json({ accessToken }); 
};
```

### 2.3 تجديد التوكن (Refresh Token Route)
يتم استدعاء هذا المسار عندما تنتهي صلاحية الـ `Access Token`. يقوم المتصفح بإرسال الـ Cookie تلقائياً.

```typescript
export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) return res.status(401).json({ message: 'Refresh token missing' });

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  // التحقق من صلاحية التوكن (موجود، غير ملغى، غير منتهي)
  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }

  // Refresh Token Rotation (دوران التوكن) 
  // نحذف التوكن القديم ونصدر واحد جديد لزيادة الأمان (تمنع سرقة التوكن)
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });
  
  const { accessToken, refreshToken: newRefreshToken } = await generateTokens(storedToken.userId);

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true, secure: true, sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken });
};
```

### 2.4 تسجيل الخروج (Logout) و Blacklisting الـ Access Token
عندما يسجل المستخدم خروجه، نقوم بـ:
1. حذف הـ `Refresh Token` من الـ Database و الـ Cookie.
2. إضافة `jti` الخاص بالـ `Access Token` إلى قائمة الـ Blacklist.

```typescript
export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  const authHeader = req.headers.authorization;

  // 1. Blacklist Access Token (jti)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const accessToken = authHeader.split(' ')[1];
    const decoded: any = jwt.decode(accessToken);
    if (decoded && decoded.jti && decoded.exp) {
      await prisma.blacklistedToken.create({
        data: {
          jti: decoded.jti,
          expiresAt: new Date(decoded.exp * 1000), // وقت انتهاء الـ Access Token
        },
      });
    }
  }

  // 2. حذف Refresh Token من الداتا بيز
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  // 3. مسح الـ Cookie من المتصفح
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};
```

### 2.5 الـ Middleware للتحقق من الـ Access Token
هذا الـ Middleware سيتأكد أن التوكن صالح، وأن الـ `jti` الخاص به لم يتم إدراجه في القائمة السوداء.

```typescript
// auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const publicKey = process.env.JWT_PUBLIC_KEY!;

export const verifyAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. التحقق من التوقيع (باستخدام RSA/ECDSA) وصلاحية الوقت
    const decoded: any = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

    // 2. التحقق من الـ Blacklist باستخدام jti
    const isBlacklisted = await prisma.blacklistedToken.findUnique({
      where: { jti: decoded.jti },
    });

    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    // 3. تمرير بيانات المستخدم للمسارات اللاحقة
    req.user = decoded; 
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
```

---

## 3. دورة حياة الـ Token بالكامل (Workflow)

1. **الـ Login**: المستخدم يرسل بيانات الاعتماد، السيرفر يتحقق ويُرجع `Access Token` (مثلاً في الجسم JSON) و `Refresh Token` في `HttpOnly Cookie`. الفرونت اند يحفظ הـ `Access Token` في الـ State Manager (مثل Redux) ولا يستخدم `localStorage`.
2. **الاستدعاء (API Calls)**: الفرونت اند يرسل הـ `Access Token` في الـ `Authorization Header (Bearer)` مع كل طلب.
3. **انتهاء الـ Access Token**: إذا انتهت صلاحية `Access Token` (يرد السيرفر بـ 401)، يقوم الفرونت اند (عبر Axios Interceptor مثلاً) بعمل طلب صامت إلى مسار `/api/auth/refresh`. يقوم المتصفح بإرسال الـ `Cookie` تلقائياً.
4. **التجديد (Refresh)**: يتأكد السيرفر من صحة الـ `Refresh Token` في الداتا بيز. إذا كان صحيحاً، يحذفه وينشئ واحداً جديداً (Refresh Token Rotation) ويرسله كـ `Cookie` جديد مع `Access Token` جديد في הـ JSON.
5. **الـ Logout / Blacklist**: إذا قام المستخدم بتسجيل الخروج، يتم مسح الـ Cookie، وإلغاء הـ `Refresh Token` في الداتا بيز، وتسجيل الـ `jti` الخاص بالـ `Access Token` الحالي في `BlacklistedToken` لمنع استخدامه حتى لو لم ينتهي وقته الفعلي.

## 4. الحماية من الثغرات
- **الحماية من XSS**: الـ `Refresh Token` محفوظ في `HttpOnly Cookie` فلا تستطيع أي جافاسكريبت خبيثة (Malicious Script) قراءته. والـ `Access Token` محفوظ في الذاكرة (Memory/State) ويزول بمجرد تحديث الصفحة، ثم يتم استعادته عبر مسار الـ `/refresh`.
- **الحماية من CSRF**: استخدام `sameSite: 'strict'` للـ Cookie يعني أن المتصفح سيرسله فقط إذا كان الطلب من نفس الموقع الذي أنشأه، مما يمنع الطلبات المزورة من مواقع أخرى.
- **Refresh Token Rotation**: في حال تم سرقة الـ `Refresh Token` واستُخدم من قبل مخترق، فعندما يستخدمه المستخدم الأصلي، سيكتشف السيرفر محاولة الاستخدام المزدوج (بناءً على التوكن القديم المحذوف/الملغى) ويمكنه حينها إبطال جميع جلسات المستخدم كإجراء احترازي.
