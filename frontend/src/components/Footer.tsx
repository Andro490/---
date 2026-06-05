import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-md pt-16 pb-8 mt-24 rtl">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Info Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-theme-accent to-theme-neonCyan flex items-center justify-center text-white">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {siteConfig.brandPrefix} <span className="text-theme-neonCyan">{siteConfig.brandHighlight}</span>
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
            {siteConfig.description}
          </p>
        </div>

        {/* Links Column */}
        <div>
          <h4 className="text-slate-900 dark:text-white font-bold mb-4">روابط سريعة</h4>
          <ul className="space-y-3 text-sm">
            <li>
              <Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-theme-neonCyan transition-colors">
                الصفحة الرئيسية
              </Link>
            </li>
            <li>
              <Link to="/courses" className="text-slate-600 dark:text-slate-400 hover:text-theme-neonCyan transition-colors">
                جميع الدورات
              </Link>
            </li>
          </ul>
        </div>

        {/* Tech Stack Column */}
        <div>
          <h4 className="text-slate-900 dark:text-white font-bold mb-4 font-sans">التقنيات المستخدمة</h4>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            مبني باستخدام React + TypeScript، ومزود برسوميات Three.js و GSAP لتفاعلات سريعة كالحرير ومظهر مستقبلي.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 border-t border-slate-300 dark:border-white/5 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} {siteConfig.name}. جميع الحقوق محفوظة.</span>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-theme-neonCyan transition-colors">سياسة الخصوصية</a>
          <a href="#" className="hover:text-theme-neonCyan transition-colors">شروط الاستخدام</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
