// ==========================================
// 🌟 إعدادات الموقع الأساسية (White-label Config)
// ==========================================
// هذا الملف يحتوي على جميع المتغيرات الخاصة بالعميل.
// لتغيير اسم الموقع، الألوان الأساسية، أو الروابط لعميل جديد، 
// قم بتعديل هذا الملف فقط وسينعكس التغيير في كل مكان.

export const siteConfig = {
  // 📌 1. المعلومات الأساسية (Basic Info)
  name: "English Academy", // اسم المنصة بالكامل
  brandPrefix: "Yasser", // الجزء الأول من الاسم
  brandHighlight: "English", // الجزء المميز بلون مختلف
  instructorName: "Yasser", // اسم المدرس أو صاحب المنصة
  description: "A modern educational platform for mastering English language skills, grammar, conversation, and exam preparation.", // وصف المنصة (يستخدم في الـ SEO)
  
  // 📌 2. الصفحة الرئيسية - Hero Section
  home: {
    heroBadge: "Speak English Like a Pro 🚀", // النص الصغير أعلى العنوان الرئيسي
    heroTitleLine1: "Build Your English Skills", // السطر الأول من العنوان الرئيسي الكبير
    heroTitleLine2: "Step by Step", // السطر الثاني (يظهر بالألوان المتدرجة)
    heroDescription: "Join interactive English courses designed to improve your grammar, vocabulary, speaking, and listening skills with practical lessons and real-world examples.", // الوصف تحت العنوان
    ctaPrimary: "Explore Courses", // نص زر الاشتراك الرئيسي
    ctaSecondary: "Start Learning Today", // نص زر تسجيل الدخول الثانوي
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
    defaultTitle: "English Academy | Learn English Online",
    defaultDescription: "Master English with Yasser through interactive courses, practical exercises, and structured lessons designed to improve speaking, listening, reading, and writing skills.",
    keywords: "learn english, english courses, online english classes, english speaking, english grammar, english vocabulary, english learning platform, yasser english academy, english for beginners, english fluency",
  },

  // 📌 8. إعدادات السيرفر والـ API
  // ⚠️ هام جداً: عند نقل الموقع لاستضافة جديدة، قم بتغيير هذا الرابط إلى رابط الباك إند الجديد
  api: {
    baseUrl: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api"),
  },
};

