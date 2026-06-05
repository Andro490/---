// ==========================================
// 🌟 إعدادات الموقع الأساسية (White-label Config)
// ==========================================
// هذا الملف يحتوي على جميع المتغيرات الخاصة بالعميل.
// لتغيير اسم الموقع، الألوان الأساسية، أو الروابط لعميل جديد، 
// قم بتعديل هذا الملف فقط وسينعكس التغيير في كل مكان.

export const siteConfig = {
  // 📌 1. المعلومات الأساسية (Basic Info)
  name: "Learning platform", // اسم المنصة بالكامل
  brandPrefix: "Learning", // الجزء الأول من الاسم
  brandHighlight: "platform", // الجزء المميز بلون مختلف
  instructorName: "Andro Emil", // اسم المدرس أو صاحب المنصة
  description: "An educational platform for learning programming at the highest level.", // وصف المنصة (يستخدم في الـ SEO)
  
  // 📌 2. الصفحة الرئيسية - Hero Section
  home: {
    heroBadge: "تعلم البرمجة بأعلى مستوى 🚀", // النص الصغير أعلى العنوان الرئيسي
    heroTitleLine1: "Create your educational path", // السطر الأول من العنوان الرئيسي الكبير
    heroTitleLine2: "in cinematic way", // السطر الثاني (يظهر بالألوان المتدرجة)
    heroDescription: "منصة تعليمية متكاملة لتقديم محتوى احترافي يسهل على الطلاب استيعاب المواد بأسلوب تفاعلي وحديث.", // الوصف تحت العنوان
    ctaPrimary: "تصفح الدورات المتاحة", // نص زر الاشتراك الرئيسي
    ctaSecondary: "ابدأ الآن مجاناً", // نص زر تسجيل الدخول الثانوي
  },

  // 📌 3. معلومات التواصل (Contact Info)
  supportEmail: "emelnasr@gmail.com",
  phoneNumber: "+20 1144231586",
  address: "Egypt",

  // 📌 4. روابط السوشيال ميديا (Social Media Links)
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100048978941379&locale=ar_AR",
    instagram: "https://www.instagram.com/androo_emil/",
    youtube: "https://www.youtube.com/@AndroEmil",
    linkedin: "https://www.linkedin.com/in/andro-emil/",
  },

  // 📌 5. إعدادات التصميم والألوان (Theme & Branding)
  // يتم استخدام هذه القيم للتحكم في الهوية البصرية (إذا كنت تستخدمها في الـ Tailwind)
  theme: {
    primaryColor: "#0ea5e9", // لون رئيسي (أزرق مثلاً)
    secondaryColor: "#10b981", // لون ثانوي (أخضر مثلاً)
    fontFamily: "'Tajawal', sans-serif", // الخط المستخدم
  },

  // 📌 6. إعدادات الميزات (Features Toggles)
  // لتفعيل أو تعطيل ميزات معينة بناءً على خطة العميل
  features: {
    enableBlog: true, // تفعيل المدونة
    enableLiveClasses: false, // تفعيل البث المباشر
    enableCertificates: true, // تفعيل الشهادات
  },

  // 📌 7. إعدادات الـ SEO
  seo: {
    defaultTitle: "أفضل منصة تعليمية",
    defaultDescription: "منصة تعليمية تقدم كورسات بمستوى عالمي وبطرق تفاعلية لضمان فهم واستيعاب الطلاب.",
    keywords: "تعليم, كورسات, أونلاين, منصة تعليمية",
  },

  // 📌 8. إعدادات السيرفر والـ API
  // ⚠️ هام جداً: عند نقل الموقع لاستضافة جديدة، قم بتغيير هذا الرابط إلى رابط الباك إند الجديد
  api: {
 baseUrl: import.meta.env.VITE_API_URL || "https://backend-production-a4c41.up.railway.app/api",  }
};
