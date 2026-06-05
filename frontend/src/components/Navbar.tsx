import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { logoutUser } from '../features/auth/authSlice';
import { toggleTheme } from '../features/theme/themeSlice';
import { BookOpen, User, LogOut, LayoutDashboard, Shield, Sun, Moon } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

const Navbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const themeMode = useAppSelector((state) => state.theme.mode);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const isDark = themeMode === 'dark';

  return (
    <nav
      className="fixed top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 z-50 glass-panel rounded-2xl shadow-glass max-w-7xl mx-auto rtl"
      style={{ background: 'var(--navbar-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 md:px-6 md:py-4">

        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-1.5 md:gap-2 group flex-shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-linear-to-tr from-theme-accent to-theme-neonCyan flex items-center justify-center text-slate-900 dark:text-white shadow-glow-cyan transition-transform group-hover:rotate-12 duration-300">
            <BookOpen className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </div>
          {/* اسم المنصة — يظهر بحجم صغير جداً على الموبايل */}
          <span className="block text-[11px] xs:text-xs sm:text-base md:text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-slate-300 group-hover:to-theme-neonCyan transition-all duration-300 whitespace-nowrap">
            {siteConfig.brandPrefix} <span className="text-theme-neonCyan">{siteConfig.brandHighlight}</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="hover:text-theme-neonCyan transition-colors font-medium" style={{ color: 'var(--text-secondary)' }}>
            الرئيسية
          </Link>
          <Link to="/courses" className="hover:text-theme-neonCyan transition-colors font-medium" style={{ color: 'var(--text-secondary)' }}>
            الدورات التعليمية
          </Link>
          {isAuthenticated && (
            <Link to="/dashboard" className="hover:text-theme-neonCyan transition-colors font-medium flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <LayoutDashboard className="w-4 h-4" />
              لوحة الطالب
            </Link>
          )}
          {isAuthenticated && user?.role === 'ADMIN' && (
            <Link to="/admin" className="text-theme-neonPurple hover:text-white transition-colors font-semibold flex items-center gap-1 border border-theme-neonPurple/30 bg-theme-neonPurple/5 px-3 py-1 rounded-full text-sm">
              <Shield className="w-3.5 h-3.5" />
              لوحة الإدارة
            </Link>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">

          {/* Dark Mode Toggle */}
          <button
            onClick={handleToggleTheme}
            className="theme-toggle-btn flex-shrink-0"
            title={isDark ? 'تفعيل الوضع المضيء' : 'تفعيل الوضع الداكن'}
            aria-label="تبديل الوضع"
          >
            <div className="theme-toggle-knob">
              {isDark ? (
                <Moon className="w-3 h-3 text-indigo-600" />
              ) : (
                <Sun className="w-3 h-3 text-yellow-500" />
              )}
            </div>
          </button>

          {/* Auth Actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {/* اسم المستخدم — مخفي على الموبايل */}
              <div className="hidden md:flex flex-col text-left items-end">
                <span className="text-xs text-theme-neonCyan font-semibold">
                  {user.role === 'ADMIN' ? 'مدير النظام' : 'طالب'}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {user.name}
                </span>
              </div>

              <Link
                to="/profile"
                className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-theme-accent/20 border border-theme-accent/50 flex items-center justify-center text-theme-neonCyan hover:bg-theme-accent/40 transition-colors"
              >
                <User className="w-4 h-4" />
              </Link>

              <button
                onClick={handleLogout}
                className="p-1.5 md:p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 transition-all duration-300 cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 md:gap-3">
              <Link
                to="/login"
                className="px-2 py-1.5 md:px-4 md:py-2 hover:text-theme-neonCyan transition-colors font-medium text-xs md:text-sm whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                تسجيل الدخول
              </Link>
              <Link
                to="/register"
                className="px-2.5 py-1.5 md:px-5 md:py-2.5 rounded-xl bg-linear-to-r from-theme-accent to-theme-neonPurple text-slate-900 dark:text-white text-xs md:text-sm font-semibold hover:shadow-glow-purple transition-all whitespace-nowrap"
              >
                <span className="hidden sm:inline">انضم إلينا مجاناً</span>
                <span className="sm:hidden">تسجيل</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
