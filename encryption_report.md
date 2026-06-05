# تقرير التشفير لموقع التعليمي

## مقدمة
هذا التقرير يوضح تفاصيل **آلية التشفير** المتبعة في بناء منصة تعليمية متكاملة وفقاً للمتطلبات المذكورة، مع التركيز على الأمان أثناء النقل وفي حالة التخزين.

## 1. بنية التقنية العامة
- **الواجهة الأمامية**: React.js + TypeScript, Vite, TailwindCSS, Redux Toolkit، GSAP, Three.js، Framer Motion.
- **الخلفية**: Node.js + Express.js، TypeScript، REST API.
- **قاعدة البيانات**: PostgreSQL مع Prisma (بديل MongoDB مع Mongoose).
- **المصادقة**: JWT مع توقيع RSA/ECDSA، تخزين كلمة المرور باستخدام bcrypt.

## 2. التشفير أثناء النقل (In‑Transit)
| العنصر | التقنية | الفائدة |
|--------|----------|----------|
| **الاتصالات بين المتصفح والخادم** | **HTTPS (TLS 1.3)** مع شهادة SSL صادرة من CA موثوق | حماية جميع البيانات المتبادلة من التنصت والهجمات Man‑in‑the‑Middle. |
| **الاتصالات بين الخدمات** (مثال: خادم API ↔ قاعدة بيانات) | **TLS داخل الشبكة** أو **VPN** عند الحاجة | ضمان أن القنوات الداخلية مشفرة أيضاً. |
| **الموارد الثابتة** (CSS, JS, Images) | **HTTP Strict Transport Security (HSTS)** + **Content‑Security‑Policy (CSP)** | منع استدعاء موارد عبر HTTP ويقلل من XSS. |

**إعدادات الخادم** (Express):
```ts
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  }),
});
app.use((req, res, next) => {
  if (req.secure) return next();
  res.redirect(`https://${req.headers.host}${req.url}`);
});
```

## 3. التشفير في حالة التخزين (At‑Rest)
- **كلمات المرور**: تخزين تجزئة bcrypt (cost = 12) مع إضافة "salt" تلقائي.
- **JWT**: توقيع باستخدام مفاتيح RSA 2048‑bit أو ECDSA P‑256 المخزَّنة في متغيّرات البيئة `JWT_PRIVATE_KEY` و`JWT_PUBLIC_KEY`.
- **البيانات الحساسة** (مثلاً رقم الهوية أو معلومات الدفع): تشفير AES‑256‑GCM عبر Prisma middleware.
```ts
// prisma/middleware.ts
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
const algorithm = 'aes-256-gcm';
const secretKey = Buffer.from(process.env.DATA_ENCRYPTION_KEY!, 'hex');
export const encryptionMiddleware: Prisma.Middleware = async (params, next) => {
  if (params.model === 'User' && params.action === 'create') {
    const plain = params.args.data.ssn;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    params.args.data.ssn = Buffer.concat([iv, tag, encrypted]).toString('hex');
  }
  return next(params);
};
```
- **PostgreSQL**: تشغيل **Transparent Data Encryption (TDE)** على مستوى الـ tablespace إذا كان مزوداً، وإعداد **pgcrypto** لتشفير الحقول الحساسة إن لزم.

## 4. إدارة المفاتيح السرية
- جميع المفاتيح (TLS certificates, JWT private key, AES key) مخزَّنة في **متغيّرات البيئة** ولا تُدرج في الشيفرة.
- عند استخدام Docker/Kubernetes، تُستَخدم **Secrets** لتوزيع المفاتيح.
- تفعيل **rotation** دوري للمفاتيح كل 90 يوماً.

## 5. تدابير إضافية للسلامة
| التدبير | الوصف |
|----------|-------|
| **Rate limiting** (express‑rate‑limit) | منع هجمات الـ brute‑force على نقاط الدخول. |
| **Account lockout** بعد عدة محاولات فاشلة | تقليل خطر تخمين كلمات المرور. |
| **Logging & Auditing** باستخدام Winston + Winston‑daily‑rotate | سجل جميع طلبات الـ API مع masked data. |
| **Input validation** عبر Zod أو Joi | تجنّب حقن SQL/NoSQL. |
| **CORS** مُقيد على الـ origins الموثوقة فقط. |

## 6. مخطط توزيع الشهادات TLS
```mermaid
flowchart LR
    subgraph Client[متصفح العميل]
        A[طلب HTTPS] --> B[TLS Handshake]
    end
    subgraph Server[خادم التطبيق]
        B --> C[الشهادة (TLS Cert + Private Key)]
        C --> D[Express + Helmet]
    end
    D --> E[API]
    E --> F[PostgreSQL (TLS)]
```

## 7. الخلاصة
- **TLS 1.3 + HSTS** يضمن تشفير جميع الاتصالات.
- **JWT + RSA/ECDSA** يقدم توثيقاً موثوقاً مع توقيع غير قابل للتزوير.
- **bcrypt** لتخزين كلمات المرور بأمان.
- **AES‑256‑GCM** من خلال Prisma يحمي البيانات الحساسة في قاعدة البيانات.
- **إدارة المفاتيح** عبر بيئة آمنة وتدوير دوري.
- **التحكم في الوصول** بدوري (role‑based) يفضي إلى نظام مرن وآمن.

> **توصية**: دمج **Web Application Firewall (WAF)** في المستوى الـ CDN (مثل Cloudflare) لتقليل هجمات الـ OWASP Top 10.
