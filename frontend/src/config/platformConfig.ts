/**
 * إعدادات المنصة (White-Label Config)
 * 
 * هذا الملف مخصص لتسهيل بيع المنصة لمدرسين آخرين.
 * بدلاً من البحث في الكود لتغيير الاسم، الصور، أو الروابط،
 * قم فقط بتغيير القيم الموجودة في هذا الملف قبل تسليم المنصة للعميل الجديد.
 */

export const platformConfig = {
  // 1. البيانات الأساسية
  platformName: "Learning Platform", // اسم المنصة (مثال: أكاديمية الفيزياء، منصة الأستاذ فلان)
  instructorName: "Andro Emil", // اسم المدرس أو المؤسس
  
  // 2. بيانات التواصل (ستظهر في الفوتر وصفحة التواصل)
  contactEmail: "support@learningplatform.com",
  contactPhone: "+201000000000",
  address: "القاهرة، جمهورية مصر العربية",

  // 3. نصوص الصفحة الرئيسية (Hero Section)
  home: {
    heroBadge: "تعلم البرمجة بأعلى مستوى 🚀", // النص الصغير أعلى العنوان
    heroTitleLine1: "Create your educational path", // السطر الأول من العنوان الرئيسي
    heroTitleLine2: "in cinematic way", // السطر الثاني (الملون)
    heroDescription: "منصة تعليمية متكاملة لتقديم محتوى احترافي يسهل على الطلاب استيعاب المواد بأسلوب تفاعلي وحديث.",
    ctaPrimary: "تصفح الدورات المتاحة",
    ctaSecondary: "ابدأ الآن مجاناً"
  },

  // 4. نصوص الـ SEO الافتراضية
  seo: {
    defaultTitle: "أفضل منصة تعليمية",
    defaultDescription: "منصة تعليمية تقدم كورسات بمستوى عالمي وبطرق تفاعلية لضمان فهم واستيعاب الطلاب.",
    keywords: "تعليم, كورسات, أونلاين, منصة تعليمية"
  },

  // 5. روابط السوشيال ميديا (الفوتر)
  socialLinks: {
    facebook: "https://facebook.com",
    twitter: "https://twitter.com",
    instagram: "https://instagram.com",
    youtube: "https://youtube.com"
  }
};
