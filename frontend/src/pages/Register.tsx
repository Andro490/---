import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { registerUser, clearError } from '../features/auth/authSlice';
import { Mail, KeyRound, User, AlertTriangle, Phone, Briefcase, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(2, { message: 'الاسم الأول يجب أن يكون حرفين على الأقل' }),
  lastName: z.string().min(2, { message: 'الاسم الأخير يجب أن يكون حرفين على الأقل' }),
  email: z.string().email({ message: 'البريد الإلكتروني غير صالح' }),
  mobile: z.string().regex(/^01[0-9]{9}$/, { message: 'رقم الموبايل يجب أن يكون مصري صحيح (01xxxxxxxxx)' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
  role: z.enum(['STUDENT', 'ADMIN']),
  specialization: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url({ message: 'رابط الصورة غير صالح' }).optional().or(z.literal('')),
  governorate: z.string().optional(),
  educationType: z.string().optional(),
  gradeLevel: z.string().optional(),
  section: z.string().optional(),
});

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    role: 'STUDENT' as 'STUDENT' | 'ADMIN',
    specialization: '',
    bio: '',
    avatarUrl: '',
    governorate: '',
    educationType: '',
    gradeLevel: '',
    section: '',
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (validationErrors[e.target.name]) {
      setValidationErrors({ ...validationErrors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    try {
      const validatedData = registerSchema.parse(formData);
      // Combine firstName + lastName into name for backward compatibility
      const payload = { ...validatedData, name: `${validatedData.firstName} ${validatedData.lastName}` };

      const resultAction = await dispatch(registerUser(payload));

      if (registerUser.fulfilled.match(resultAction)) {
        toast.success('تم إنشاء الحساب بنجاح! مرحباً بك 🚀');
      } else {
        toast.error((resultAction.payload as string) || 'حدث خطأ أثناء التسجيل');
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const errors: { [key: string]: string } = {};
        (err as any).errors.forEach((e: any) => {
          if (e.path[0]) errors[e.path[0].toString()] = e.message;
        });
        setValidationErrors(errors);
        toast.error('يرجى مراجعة الحقول وإصلاح الأخطاء');
      }
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-slate-950 border ${validationErrors[field] ? 'border-rose-500' : 'border-slate-300 dark:border-white/10'} rounded-xl pr-11 pl-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all`;

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-24 pb-12 rtl">
      <div className="absolute w-[300px] h-[300px] bg-theme-accent/25 rounded-full blur-[80px] -z-10 pointer-events-none" />

      <div className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-slate-300 dark:border-white/10 shadow-glass space-y-6 my-8">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">إنشاء حساب جديد ✨</h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-1.5">ابدأ رحلتك التعليمية معنا اليوم</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">نوع الحساب</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all cursor-pointer"
            >
              <option value="STUDENT">طالب (Student)</option>
              <option value="ADMIN">مدرس / مدير لوحة التحكم (Admin)</option>
            </select>
          </div>

          {/* First + Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">الاسم الأول</label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                  placeholder="أحمد" className={inputClass('firstName')} />
              </div>
              {validationErrors.firstName && <p className="text-rose-500 text-xs">{validationErrors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">الاسم الأخير</label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                  placeholder="علي" className={inputClass('lastName')} />
              </div>
              {validationErrors.lastName && <p className="text-rose-500 text-xs">{validationErrors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="ahmed@email.com"
                className={`${inputClass('email')} text-left ltr`} />
            </div>
            {validationErrors.email && <p className="text-rose-500 text-xs">{validationErrors.email}</p>}
          </div>

          {/* Mobile */}
          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">رقم الموبايل</label>
            <div className="relative">
              <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange}
                placeholder="01xxxxxxxxx"
                className={`${inputClass('mobile')} text-left ltr`} />
            </div>
            {validationErrors.mobile && <p className="text-rose-500 text-xs">{validationErrors.mobile}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">كلمة المرور</label>
            <div className="relative">
              <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input type="password" name="password" value={formData.password} onChange={handleChange}
                placeholder="••••••••"
                className={`${inputClass('password')} text-left ltr`} />
            </div>
            {validationErrors.password && <p className="text-rose-500 text-xs">{validationErrors.password}</p>}
          </div>

          {/* Student extra fields */}
          {formData.role === 'STUDENT' && (
            <div className="space-y-4 pt-4 border-t border-slate-300 dark:border-white/10 animate-fade-in">
              <h3 className="text-theme-neonCyan font-semibold text-sm">بيانات إضافية لتصدر الترتيب (اختياري)</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">المحافظة</label>
                  <select name="governorate" value={formData.governorate} onChange={handleChange} className={inputClass('governorate')}>
                    <option value="">اختر المحافظة...</option>
                    <option value="القاهرة">القاهرة</option>
                    <option value="الجيزة">الجيزة</option>
                    <option value="الإسكندرية">الإسكندرية</option>
                    <option value="الدقهلية">الدقهلية</option>
                    <option value="البحر الأحمر">البحر الأحمر</option>
                    <option value="البحيرة">البحيرة</option>
                    <option value="الفيوم">الفيوم</option>
                    <option value="الغربية">الغربية</option>
                    <option value="الإسماعيلية">الإسماعيلية</option>
                    <option value="المنوفية">المنوفية</option>
                    <option value="المنيا">المنيا</option>
                    <option value="القليوبية">القليوبية</option>
                    <option value="الوادي الجديد">الوادي الجديد</option>
                    <option value="السويس">السويس</option>
                    <option value="أسوان">أسوان</option>
                    <option value="أسيوط">أسيوط</option>
                    <option value="بني سويف">بني سويف</option>
                    <option value="بورسعيد">بورسعيد</option>
                    <option value="دمياط">دمياط</option>
                    <option value="جنوب سيناء">جنوب سيناء</option>
                    <option value="كفر الشيخ">كفر الشيخ</option>
                    <option value="مطروح">مطروح</option>
                    <option value="الأقصر">الأقصر</option>
                    <option value="قنا">قنا</option>
                    <option value="شمال سيناء">شمال سيناء</option>
                    <option value="سوهاج">سوهاج</option>
                    <option value="الشرقية">الشرقية</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">نوع التعليم</label>
                  <select name="educationType" value={formData.educationType} onChange={handleChange} className={inputClass('educationType')}>
                    <option value="">اختر...</option>
                    <option value="عام">عام</option>
                    <option value="لغات">لغات</option>
                    <option value="أزهري">أزهري</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">الصف الدراسي</label>
                  <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className={inputClass('gradeLevel')}>
                    <option value="">اختر...</option>
                    <option value="الأول الثانوي">الأول الثانوي</option>
                    <option value="الثاني الثانوي">الثاني الثانوي</option>
                    <option value="الثالث الثانوي">الثالث الثانوي</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">الشعبة</label>
                  <select name="section" value={formData.section} onChange={handleChange} className={inputClass('section')}>
                    <option value="">اختر...</option>
                    <option value="علمي علوم">علمي علوم</option>
                    <option value="علمي رياضة">علمي رياضة</option>
                    <option value="أدبي">أدبي</option>
                    <option value="عام">عام</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Admin extra fields */}
          {formData.role === 'ADMIN' && (
            <div className="space-y-4 pt-4 border-t border-slate-300 dark:border-white/10 animate-fade-in">
              <h3 className="text-theme-neonCyan font-semibold text-sm">معلومات المدرس (اختياري)</h3>

              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">التخصص</label>
                <div className="relative">
                  <Briefcase className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <input type="text" name="specialization" value={formData.specialization} onChange={handleChange}
                    placeholder="مثال: مدرس فيزياء"
                    className="w-full bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl pr-11 pl-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">نبذة تعريفية</label>
                <div className="relative">
                  <FileText className="absolute right-3.5 top-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <textarea name="bio" value={formData.bio} onChange={handleChange}
                    placeholder="اكتب نبذة عن خبراتك..." rows={3}
                    className="w-full bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl pr-11 pl-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all resize-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">رابط الصورة الشخصية</label>
                <div className="relative">
                  <ImageIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <input type="text" name="avatarUrl" value={formData.avatarUrl} onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                    className={`${inputClass('avatarUrl')} text-left ltr`} />
                </div>
                {validationErrors.avatarUrl && <p className="text-rose-500 text-xs">{validationErrors.avatarUrl}</p>}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-theme-accent via-theme-neonPurple to-theme-neonCyan text-slate-900 dark:text-white font-bold hover:shadow-glow-purple transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'تأكيد التسجيل'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-4">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="text-theme-neonCyan hover:underline font-semibold">سجل دخولك</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
