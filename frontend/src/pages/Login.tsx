import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { loginUser, clearError } from '../features/auth/authSlice';
import { KeyRound, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Clear errors on mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Redirect on successful auth
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(loginUser({ email, password }));
  };

  const handlePreFill = (role: 'STUDENT' | 'ADMIN') => {
    if (role === 'ADMIN') {
      setEmail('admin@cinematic.com');
      setPassword('admin123');
    } else {
      setEmail('student@cinematic.com');
      setPassword('student123');
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-24 pb-12 rtl">
      {/* Ambient background glows */}
      <div className="absolute w-[300px] h-[300px] bg-theme-accent/25 rounded-full blur-[80px] -z-10 pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-300 dark:border-white/10 shadow-glass space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">تسجيل الدخول 👋</h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-1.5">أدخل بياناتك للمتابعة والوصول لمقاعد الدراسة</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl pr-11 pl-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all text-left ltr"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">كلمة المرور</label>
            <div className="relative">
              <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl pr-11 pl-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all text-left ltr"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-theme-accent via-theme-neonPurple to-theme-neonCyan text-slate-900 dark:text-white font-bold hover:shadow-glow-purple transition-all duration-300 transform hover:scale-[1.01] cursor-pointer disabled:opacity-50"
          >
            {loading ? 'جاري التحقق...' : 'دخول للمنصة'}
          </button>
        </form>


        <div className="text-center text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-4">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="text-theme-neonCyan hover:underline font-semibold">
            سجل معنا الآن
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
