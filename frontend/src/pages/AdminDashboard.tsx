import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { fetchCategories, createCategory } from '../features/courses/coursesSlice';
import api from '../services/api';
import * as xlsx from 'xlsx';
import { Shield, BookOpen, Users, DollarSign, Layers, PlusCircle, Trash2, Tag, PlayCircle, Clock, FolderPlus, CheckCircle, XCircle, CreditCard, MessageSquare, Search, Download, FileSpreadsheet } from 'lucide-react';
import { PaymentSettings } from '../components/PaymentSettings';


interface StatsSummary {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  unregisteredVisitors?: number;
}

interface CourseItem {
  id: string;
  title: string;
  price: number;
  categoryId: string;
  lessons: { id: string }[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { categories } = useAppSelector((state) => state.courses);

  const [activeTab, setActiveTab] = useState<'stats' | 'courses' | 'lessons' | 'payments' | 'support' | 'exam_results'>('stats');
  
  // Stats states
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  // Form states for new course
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [coursePrice, setCoursePrice] = useState('0');
  const [courseCat, setCourseCat] = useState('');
  const [courseThumb, setCourseThumb] = useState('');

  // Category creation state
  const [newCatName, setNewCatName] = useState('');
  const [catLoading, setCatLoading] = useState(false);
  const [catMessage, setCatMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [lessonCourseId, setLessonCourseId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonVideo, setLessonVideo] = useState('');
  const [lessonPlatformType, setLessonPlatformType] = useState('youtube');
  const [lessonLibraryId, setLessonLibraryId] = useState('');
  const [lessonTokenKey, setLessonTokenKey] = useState('');
  const [lessonDuration, setLessonDuration] = useState('600');
  const [lessonOrder, setLessonOrder] = useState('1');

  // Quiz states
  const [quizFile, setQuizFile] = useState<File | null>(null);
  const [quizPreview, setQuizPreview] = useState<any[]>([]);

  // Homework states
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);
  const [homeworkPreview, setHomeworkPreview] = useState<any[]>([]);

  // PDF states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  // Cloudinary config (stored in state so admin can enter once per session)
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState(
    localStorage.getItem('cld_cloud_name') || ''
  );
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState(
    localStorage.getItem('cld_upload_preset') || ''
  );

  // Course accordion state
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Exam Results state
  const [selectedExamLessonId, setSelectedExamLessonId] = useState('');
  const [examResultsData, setExamResultsData] = useState<{ quiz: any; results: any[] } | null>(null);
  const [loadingExamResults, setLoadingExamResults] = useState(false);

  // User Search State
  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user && user.role !== 'ADMIN') {
      navigate('/');
      return;
    }

    dispatch(fetchCategories());
    fetchAdminData();
  }, [isAuthenticated, user, navigate, dispatch]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get('/dashboard/admin');
      setSummary(statsRes.data.summary);
      setRecentUsers(statsRes.data.recentUsers || []);
      setRecentPayments(statsRes.data.recentPayments || []);

      const coursesRes = await api.get('/courses');
      setCoursesList(coursesRes.data || []);
      if (coursesRes.data.length > 0) {
        setLessonCourseId(coursesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportMessages = async () => {
    try {
      const res = await api.get('/support');
      setSupportMessages(res.data);
    } catch (error) {
      console.error('Failed to fetch support messages', error);
    }
  };

  const fetchExamResults = async () => {
    if (!selectedExamLessonId) return;
    setLoadingExamResults(true);
    setExamResultsData(null);
    try {
      const res = await api.get(`/courses/lessons/${selectedExamLessonId}/quiz/results`);
      setExamResultsData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل جلب نتائج الامتحان');
    } finally {
      setLoadingExamResults(false);
    }
  };

  const exportExamResultsToExcel = () => {
    if (!examResultsData) return;
    const { quiz, results } = examResultsData;

    const header = [
      ['نتائج امتحان: ' + quiz.title],
      ['نوع الامتحان: ' + (quiz.type === 'exam' ? 'امتحان نهائي' : 'تدريبي'), 'درجة النجاح: ' + quiz.passScore + '%'],
      [],
      ['الترتيب', 'اسم الطالب', 'المحافظة', 'المرحلة الدراسية', 'الشعبة', 'نوع التعليم', 'الدرجة (%)', 'الدرجة / 20', 'الحالة', 'تاريخ التسليم'],
    ];

    const rows = results.map(r => [
      r.rank,
      r.studentName,
      r.governorate,
      r.grade,
      r.section,
      r.educationType,
      r.scorePercentage,
      r.scoreOutOf20,
      r.passed,
      r.submittedAt,
    ]);

    const ws = xlsx.utils.aoa_to_sheet([...header, ...rows]);
    ws['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 15 }];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'نتائج الامتحان');
    xlsx.writeFile(wb, `نتائج_${quiz.title.replace(/\s+/g, '_')}.xlsx`);
  };

  useEffect(() => {
    if (activeTab === 'support') {
      fetchSupportMessages();
    }
  }, [activeTab]);

  const handleDeleteAllStudents = async () => {
    const confirmDelete = window.confirm("هل أنت متأكد من أنك تريد حذف جميع الطلاب من النظام؟ (هذا الإجراء لا يمكن التراجع عنه وسيحذف كل بيانات الطلاب واشتراكاتهم)");
    if (!confirmDelete) return;

    try {
      await api.delete('/dashboard/admin/students');
      alert('تم حذف جميع حسابات الطلاب بنجاح. عام دراسي جديد سعيد!');
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف الطلاب');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (user?.id === userId) {
      alert("لا يمكنك حذف حسابك الشخصي لتجنب فقدان صلاحيات الإدارة.");
      return;
    }
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف المستخدم "${userName}" نهائياً؟`);
    if (!confirmDelete) return;

    try {
      await api.delete(`/dashboard/admin/users/${userId}`);
      alert('تم حذف المستخدم بنجاح.');
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف المستخدم');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatLoading(true);
    setCatMessage(null);
    try {
      await dispatch(createCategory(newCatName.trim())).unwrap();
      setCatMessage({ type: 'success', text: `تم إضافة “${newCatName.trim()}” بنجاح!` });
      setNewCatName('');
    } catch (err: any) {
      setCatMessage({ type: 'error', text: err || 'فشل إنشاء التصنيف' });
    } finally {
      setCatLoading(false);
      setTimeout(() => setCatMessage(null), 3500);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف تصنيف "${catName}"؟`)) return;
    try {
      await api.delete(`/courses/categories/${catId}`);
      dispatch(fetchCategories());
      setCatMessage({ type: 'success', text: `تم حذف "${catName}" بنجاح` });
      setTimeout(() => setCatMessage(null), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'فشل حذف التصنيف';
      setCatMessage({ type: 'error', text: msg });
      setTimeout(() => setCatMessage(null), 4000);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!courseTitle || !courseDesc || !courseCat) {
      alert('الرجاء تعبئة الحقول الأساسية للدورة');
      return;
    }

    try {
      await api.post('/courses', {
        title: courseTitle,
        description: courseDesc,
        price: parseFloat(coursePrice),
        categoryId: courseCat,
        thumbnail: courseThumb || undefined,
      });

      alert('تم إنشاء الدورة بنجاح!');
      // Reset Form
      setCourseTitle('');
      setCourseDesc('');
      setCoursePrice('0');
      setCourseThumb('');
      
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إنشاء الدورة');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه الدورة بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      await api.delete(`/courses/${courseId}`);
      alert('تم حذف الدورة بنجاح.');
      if (expandedCourseId === courseId) setExpandedCourseId(null);
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف الدورة');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الدرس نهائياً؟')) return;
    try {
      await api.delete(`/courses/lessons/${lessonId}`);
      alert('تم حذف الدرس بنجاح.');
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف الدرس');
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonCourseId || !lessonTitle) {
      alert('الرجاء اختيار الدورة وكتابة عنوان الدرس');
      return;
    }

    try {
      const res = await api.post('/courses/lessons', {
        courseId: lessonCourseId,
        title: lessonTitle,
        content: lessonContent || undefined,
        videoUrl: (lessonPlatformType === 'quiz' || lessonPlatformType === 'exam' || lessonPlatformType === 'homework' || lessonPlatformType === 'pdf') ? undefined : (lessonVideo || undefined),
        pdfUrl: pdfUrl || undefined,
        platformType: lessonPlatformType,
        libraryId: lessonPlatformType === 'secure' && lessonLibraryId ? lessonLibraryId : undefined,
        tokenKey: lessonPlatformType === 'secure' && lessonTokenKey ? lessonTokenKey : undefined,
        duration: parseInt(lessonDuration),
        order: parseInt(lessonOrder),
      });

      // If it's a quiz or exam, upload the file
      if ((lessonPlatformType === 'quiz' || lessonPlatformType === 'exam') && quizFile) {
        const lessonId = res.data?.id;
        console.log('=== Quiz Upload Debug ===');
        console.log('Full res.data:', res.data);
        console.log('lessonId to send:', lessonId);
        if (!lessonId) {
          alert('خطأ: لم يتم استلام ID الدرس من السيرفر.\nالبيانات: ' + JSON.stringify(res.data));
          return;
        }
        const formData = new FormData();
        formData.append('file', quizFile);
        formData.append('lessonId', lessonId);
        formData.append('title', lessonTitle);
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://backend-production-a4c41.up.railway.app/api';
        const uploadRes = await fetch(`${apiBaseUrl}/courses/quiz/upload`, {
        method: 'POST',
          body: formData,
          credentials: 'include',
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({ message: 'Upload failed' }));
          throw new Error(errData.message || `Upload error: ${uploadRes.status}`);
        }
      }

      // If it's a homework, upload the file
      if (lessonPlatformType === 'homework' && homeworkFile) {
        const lessonId = res.data?.id;
        if (!lessonId) {
          alert('خطأ: لم يتم استلام ID الدرس.');
          return;
        }
        const formData = new FormData();
        formData.append('file', homeworkFile);
        formData.append('lessonId', lessonId);
        formData.append('title', lessonTitle);
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://backend-production-a4c41.up.railway.app/api';
        const uploadRes = await fetch(`${apiBaseUrl}/courses/homework/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({ message: 'Upload failed' }));
          throw new Error(errData.message || `Upload error: ${uploadRes.status}`);
        }
      }

      alert('تمت إضافة الدرس بنجاح!');
      // Reset Form
      setLessonTitle('');
      setLessonContent('');
      setLessonVideo('');
      setLessonLibraryId('');
      setLessonTokenKey('');
      setLessonDuration('600');
      setLessonOrder((parseInt(lessonOrder) + 1).toString());
      setQuizFile(null);
      setQuizPreview([]);
      setHomeworkFile(null);
      setHomeworkPreview([]);
      setPdfFile(null);
      setPdfUrl('');

      fetchAdminData();
    } catch (err: any) {
      console.error('Full Upload Error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'فشلت إضافة الدرس';
      const received = err.response?.data?.received 
        ? '\nما استلمه السيرفر: ' + JSON.stringify(err.response.data.received)
        : '';
      alert(`تفاصيل الخطأ:\n${errorMsg}${received}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setQuizFile(null);
      setQuizPreview([]);
      return;
    }
    setQuizFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);
        setQuizPreview(data.slice(0, 5));
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('خطأ في قراءة ملف الإكسيل.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleHomeworkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setHomeworkFile(null); setHomeworkPreview([]); return; }
    setHomeworkFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws);
        setHomeworkPreview(data.slice(0, 5));
      } catch { alert('خطأ في قراءة ملف الإكسيل.'); }
    };
    reader.readAsBinaryString(file);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setPdfFile(null); setPdfUrl(''); return; }
    if (file.type !== 'application/pdf') { alert('يرجى اختيار ملف PDF فقط.'); return; }
    if (!cloudinaryCloudName.trim() || !cloudinaryUploadPreset.trim()) {
      alert('ملاحظة: يرجى إدخال Cloud Name و Upload Preset أولاً.');
      return;
    }
    // Persist to localStorage so admin doesn’t re-enter every time
    localStorage.setItem('cld_cloud_name', cloudinaryCloudName.trim());
    localStorage.setItem('cld_upload_preset', cloudinaryUploadPreset.trim());

    setPdfFile(file);
    setPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryUploadPreset.trim());
      // Use 'auto' to let Cloudinary figure out the best handling (supports PDFs well)
      formData.append('resource_type', 'auto'); 

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName.trim()}/auto/upload`,
        { method: 'POST', body: formData }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'فشل رفع الملف لـ Cloudinary');
      }
      const data = await res.json();
      setPdfUrl(data.secure_url); // This is the permanent Cloudinary URL
    } catch (err: any) {
      alert('خطأ في رفع PDF: ' + err.message);
      setPdfFile(null);
    } finally {
      setPdfUploading(false);
    }
  };

  if (loading || !categories) {
    return (
      <div className="min-h-screen flex items-center justify-center rtl">
        <div className="w-12 h-12 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Pre-fill categories select box on mount
  if (categories.length > 0 && !courseCat) {
    setCourseCat(categories[0].id);
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 rtl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/5 pb-6 mb-10">
        <div className="w-11 h-11 rounded-xl bg-theme-neonPurple/10 border border-theme-neonPurple/30 flex items-center justify-center text-theme-neonPurple shadow-glow-purple">
          <Shield className="w-5.5 h-5.5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">لوحة الإدارة والمحتوى 🛠️</h1>
          <span className="text-xs text-theme-neonCyan font-semibold">بوابة المشرفين - تحكم شامل بالمنصة</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-white/5 gap-6 mb-10 text-sm">
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-4 font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'stats' ? 'border-theme-neonCyan text-theme-neonCyan' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          لوحة الإحصائيات
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-4 font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'courses' ? 'border-theme-neonCyan text-theme-neonCyan' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          إدارة الدورات
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          className={`pb-4 font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'lessons' ? 'border-theme-neonCyan text-theme-neonCyan' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          إضافة الدروس
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-4 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'payments' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          بوابات الدفع
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`pb-4 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'support' ? 'border-blue-400 text-blue-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          الدعم الفني
          {supportMessages.filter(m => !m.isRead).length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {supportMessages.filter(m => !m.isRead).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('exam_results')}
          className={`pb-4 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'exam_results' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          نتائج الامتحانات
        </button>
      </div>


      {activeTab === 'stats' && (
        <div className="space-y-12">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold">المستخدمين المسجلين</span>
                <Users className="w-5 h-5 text-theme-neonCyan" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white block">{summary?.totalUsers}</span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold">زوار لم يسجلوا</span>
                <Users className="w-5 h-5 text-slate-600 dark:text-slate-400 opacity-50" />
              </div>
              <span className="text-3xl font-extrabold text-slate-700 dark:text-slate-300 block">{summary?.unregisteredVisitors || 0}</span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold">الدورات الفعالة</span>
                <BookOpen className="w-5 h-5 text-theme-accent" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white block">{summary?.totalCourses}</span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold">الاشتراكات</span>
                <Layers className="w-5 h-5 text-theme-neonPurple" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white block">{summary?.totalEnrollments}</span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold">الأرباح الإجمالية</span>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-3xl font-extrabold text-emerald-400 block">{summary?.totalRevenue?.toFixed(2)} $</span>
            </div>
          </div>

          {/* Grids for listings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Registrations */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4 flex flex-col max-h-[500px]">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">إدارة المستخدمين</h3>
                  <button
                    onClick={handleDeleteAllStudents}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف جميع الطلاب
                  </button>
                </div>
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ابحث باسم الطالب (لحذف الحساب أو المراجعة)..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                {recentUsers
                  .filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()))
                  .map((u) => (
                  <div key={u.id} className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3 last:border-0 last:pb-0 text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-900 dark:text-white font-semibold block">{u.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px]">عنوان محمي 🔒</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-theme-neonPurple/20 text-theme-neonPurple' : 'bg-theme-neonCyan/20 text-theme-neonCyan'
                      }`}>
                        {u.role}
                      </span>
                      {user?.id !== u.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {recentUsers.filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    لا يوجد طالب بهذا الاسم.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Payments */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">العمليات والمدفوعات الأخيرة</h3>
              <div className="space-y-4">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3 last:border-0 last:pb-0 text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-900 dark:text-white font-semibold block">{p.user?.name}</span>
                      <span className="text-slate-600 dark:text-slate-400 text-xs line-clamp-1">{p.course?.title}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-emerald-400 font-bold block">{p.amount} $</span>
                      <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-[10px]">{p.transactionId}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="space-y-8">
          {/* ✅ Category Creator Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-theme-neonCyan/10">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <FolderPlus className="w-4 h-4 text-theme-neonCyan" />
              إدارة التصنيفات
            </h3>
            <form onSubmit={handleAddCategory} className="flex items-center gap-3">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="مثال: تطوير الويب، الذكاء الاصطناعي, Adobe..."
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-theme-neonCyan transition-all"
              />
              <button
                type="submit"
                disabled={catLoading || !newCatName.trim()}
                className="px-5 py-2.5 rounded-xl bg-theme-neonCyan/15 border border-theme-neonCyan/30 hover:bg-theme-neonCyan hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white text-theme-neonCyan font-bold text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {catLoading ? 'جاري...' : '+ إضافة تصنيف'}
              </button>
            </form>

            {catMessage && (
              <div className={`mt-2 flex items-center gap-2 text-xs font-semibold ${
                catMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {catMessage.type === 'success'
                  ? <CheckCircle className="w-3.5 h-3.5" />
                  : <XCircle className="w-3.5 h-3.5" />}
                {catMessage.text}
              </div>
            )}

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-white/5">
                {categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-theme-card border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 group"
                  >
                    {cat.name}
                    {cat._count && <span className="mr-1 text-theme-neonCyan opacity-60">({cat._count.courses})</span>}
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      title="حذف التصنيف"
                      className="mr-1 w-4 h-4 flex items-center justify-center rounded-full bg-rose-500/0 hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Create course Form */}
          <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-3">
              <PlusCircle className="w-5 h-5 text-theme-neonCyan" />
              إضافة دورة جديدة
            </h3>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">عنوان الدورة</label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="مثال: أساسيات Three.js"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">تصنيف الدورة</label>
                <select
                  value={courseCat}
                  onChange={(e) => setCourseCat(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">سعر الدورة ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={coursePrice}
                  onChange={(e) => setCoursePrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">رابط صورة مصغرة (Thumbnail)</label>
                <input
                  type="text"
                  value={courseThumb}
                  onChange={(e) => setCourseThumb(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">الوصف التفصيلي</label>
                <textarea
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  rows={4}
                  placeholder="اكتب تفاصيل الدورة..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-theme-neonCyan/15 border border-theme-neonCyan/30 hover:bg-theme-neonCyan hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white text-theme-neonCyan font-bold transition-all duration-300 shadow-glow-cyan cursor-pointer"
              >
                تأكيد إنشاء الدورة
              </button>
            </form>
          </div>

          {/* Courses List */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">الدورات الحالية المدرجة بالمنصة</h3>
            
            <div className="space-y-3">
              {coursesList.map((course) => (
                <div key={course.id} className="rounded-xl bg-theme-card/30 border border-slate-200 dark:border-white/5 overflow-hidden">
                  <div 
                    className="p-4 flex items-center justify-between text-xs sm:text-sm cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}
                  >
                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold text-sm">{course.title}</h4>
                      <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {course.lessons?.length || 0} دروس
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Tag className="w-3.5 h-3.5" />
                          {categories.find(c => c.id === course.categoryId)?.name || 'عام'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-theme-neonCyan font-bold">{course.price} $</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(course.id);
                        }}
                        className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="حذف الدورة بالكامل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* الدروس التابعة لهذه الدورة */}
                  {expandedCourseId === course.id && (
                    <div className="bg-white dark:bg-slate-900/50 p-4 border-t border-slate-200 dark:border-white/5 space-y-2">
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-200 dark:border-white/5 pb-2">دروس الدورة:</h5>
                      {course.lessons && course.lessons.length > 0 ? (
                        course.lessons.map((lesson: any, idx: number) => (
                          <div key={lesson.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 dark:text-slate-400">#{idx + 1}</span>
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{lesson.title}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                lesson.platformType === 'secure' ? 'bg-theme-neonPurple/20 text-theme-neonPurple' :
                                lesson.platformType === 'pdf' ? 'bg-blue-500/20 text-blue-400' :
                                lesson.platformType === 'quiz' || lesson.platformType === 'exam' ? 'bg-amber-500/20 text-amber-400' :
                                lesson.platformType === 'homework' ? 'bg-green-500/20 text-green-400' :
                                'bg-rose-500/20 text-rose-400'
                              }`}>
                                {lesson.platformType === 'secure' ? 'فيديو محمي' :
                                 lesson.platformType === 'pdf' ? 'PDF' :
                                 lesson.platformType === 'quiz' ? 'اختبار' :
                                 lesson.platformType === 'exam' ? 'اختبار نهائي' :
                                 lesson.platformType === 'homework' ? 'واجب' : 'يوتيوب'}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLesson(lesson.id);
                              }}
                              className="text-rose-400 hover:text-rose-500 transition-colors p-1"
                              title="حذف الدرس"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 text-center py-2">لا توجد دروس في هذه الدورة.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'lessons' && (
        <div className="max-w-2xl mx-auto glass-panel p-8 rounded-2xl border border-slate-200 dark:border-white/5 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-3">
            <PlayCircle className="w-6 h-6 text-theme-neonPurple" />
            إضافة درس جديد لمنهج دراسي
          </h3>

          <form onSubmit={handleCreateLesson} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">اختر الدورة التعليمية</label>
              <select
                value={lessonCourseId}
                onChange={(e) => setLessonCourseId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all cursor-pointer"
              >
                {coursesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">ترتيب الدرس (Order)</label>
                <input
                  type="number"
                  value={lessonOrder}
                  onChange={(e) => setLessonOrder(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">المدة التقديرية بالثواني</label>
                <input
                  type="number"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">عنوان الدرس</label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="مثال: مقدمة في الإضاءة ثلاثية الأبعاد"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">نوع المنصة</label>
                <select
                  value={lessonPlatformType}
                  onChange={(e) => setLessonPlatformType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all cursor-pointer"
                >
                  <option value="youtube">يوتيوب (YouTube)</option>
                  <option value="secure">فيديو محمي (Bunny.net)</option>
                  <option value="pdf">📄 رفع محاضرات (PDF)</option>
                  <option value="quiz">اختبار (Quiz Excel)</option>
                  <option value="exam">اختبار نهائي (Exam Excel)</option>
                  <option value="homework">واجب (Homework Excel)</option>
                </select>
              </div>

              {lessonPlatformType === 'secure' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">رقم المكتبة (Library ID)</label>
                    <input
                      type="text"
                      value={lessonLibraryId}
                      onChange={(e) => setLessonLibraryId(e.target.value)}
                      placeholder="مثال: 669586"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">Token Key (اختياري)</label>
                    <input
                      type="text"
                      value={lessonTokenKey}
                      onChange={(e) => setLessonTokenKey(e.target.value)}
                      placeholder="اتركه فارغاً لاستخدام المفتاح الافتراضي"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
                    />
                  </div>
                </>
              )}

              {/* Quiz and Exam Upload Section */}
              {(lessonPlatformType === 'quiz' || lessonPlatformType === 'exam') && (
                <div className="col-span-1 sm:col-span-2 space-y-1.5 p-4 border border-dashed border-theme-neonCyan rounded-xl bg-theme-neonCyan/5">
                  <label className="text-theme-neonCyan text-xs font-semibold">ارفع ملف الأسئلة (Excel)</label>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    className="w-full text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-theme-neonCyan/20 file:text-theme-neonCyan hover:file:bg-theme-neonCyan/30 cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">
                    يجب أن يحتوي الملف على الأعمدة: Question, Option1, Option2, Option3, Option4, CorrectOption, Points
                  </p>
                  
                  {quizPreview.length > 0 && (
                    <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/5">
                      <h4 className="text-theme-neonCyan text-xs mb-2">معاينة البيانات (أول 5 صفوف):</h4>
                      <pre className="text-[10px] text-slate-700 dark:text-slate-300 overflow-auto max-h-40 custom-scrollbar">
                        {JSON.stringify(quizPreview, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {lessonPlatformType === 'homework' && (
                <div className="col-span-1 sm:col-span-2 space-y-1.5 p-4 border border-dashed border-amber-500 rounded-xl bg-amber-500/5">
                  <label className="text-amber-400 text-xs font-semibold">ارفع ملف الواجب (Excel)</label>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleHomeworkFileUpload}
                    className="w-full text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30 cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">
                    يجب أن يحتوي الملف على الأعمدة: Question, Option1, Option2, Option3, Option4, CorrectOption, Points
                  </p>
                  {homeworkPreview.length > 0 && (
                    <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/5">
                      <h4 className="text-amber-400 text-xs mb-2">معاينة البيانات (أول 5 صفوف):</h4>
                      <pre className="text-[10px] text-slate-700 dark:text-slate-300 overflow-auto max-h-40 custom-scrollbar">
                        {JSON.stringify(homeworkPreview, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {lessonPlatformType !== 'quiz' && lessonPlatformType !== 'exam' && lessonPlatformType !== 'homework' && lessonPlatformType !== 'pdf' && (
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                  {lessonPlatformType === 'secure' ? 'معرف الفيديو (Video ID/GUID)' : 'رابط الفيديو (YouTube)'}
                </label>
                <input
                  type="text"
                  value={lessonVideo}
                  onChange={(e) => setLessonVideo(e.target.value)}
                  placeholder={lessonPlatformType === 'secure' ? "مثال: c97f708a-8ce9-46ee-b7a4-6882d56d4f40" : "https://www.youtube.com/watch?v=..."}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
                />
              </div>
            )}

            {/* PDF Upload Section — يظهر فقط عند اختيار "رفع محاضرات (PDF)" */}
            {lessonPlatformType === 'pdf' && (
              <div className="space-y-3 p-4 border border-dashed border-rose-400/40 rounded-xl bg-rose-500/5">
                <label className="text-rose-400 text-xs font-semibold flex items-center gap-2">
                  📄 رفع ملف PDF عبر Cloudinary (محاضرات / مذكرات)
                </label>

                {/* Cloudinary credentials inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Cloud Name</label>
                    <input
                      type="text"
                      value={cloudinaryCloudName}
                      onChange={(e) => setCloudinaryCloudName(e.target.value)}
                      placeholder="مثال: my-cloud"
                      className="w-full bg-white dark:bg-slate-900 border border-rose-400/30 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-rose-400 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Upload Preset (Unsigned)</label>
                    <input
                      type="text"
                      value={cloudinaryUploadPreset}
                      onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
                      placeholder="مثال: edu_pdfs"
                      className="w-full bg-white dark:bg-slate-900 border border-rose-400/30 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-rose-400 transition-all font-mono"
                    />
                  </div>
                </div>

                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={!cloudinaryCloudName.trim() || !cloudinaryUploadPreset.trim()}
                  className="w-full text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-500/20 file:text-rose-400 hover:file:bg-rose-500/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                />
                {(!cloudinaryCloudName.trim() || !cloudinaryUploadPreset.trim()) && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">⚠️ أدخل Cloud Name و Upload Preset أولاً لتفعيل الرفع.</p>
                )}
                {pdfUploading && (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-rose-400">جاري الرفع إلى Cloudinary...</p>
                  </div>
                )}
                {pdfUrl && !pdfUploading && (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      ✅ تم الرفع بنجاح: <span className="font-mono truncate max-w-[180px]">{pdfFile?.name}</span>
                    </p>
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 hover:underline">فتح</a>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold">المحتوى النصي أو الشروحات</label>
              <textarea
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                rows={4}
                placeholder="اكتب التوجيهات البرمجية أو النص المساعد هنا..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-theme-neonPurple/15 border border-theme-neonPurple/30 hover:bg-theme-neonPurple hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white text-theme-neonPurple font-bold transition-all duration-300 shadow-glow-purple cursor-pointer"
            >
              إدراج الدرس وتحديث المنهج الدراسي
            </button>
          </form>
        </div>
      )}

      {activeTab === 'payments' && (
        <PaymentSettings />
      )}

      {activeTab === 'support' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            رسائل المستخدمين وطلبات الدعم
          </h3>
          <div className="space-y-4">
            {supportMessages.length === 0 ? (
              <p className="text-slate-500 text-center">لا توجد رسائل دعم فني حالياً.</p>
            ) : (
              supportMessages.map(msg => (
                <div key={msg.id} className={`p-4 rounded-xl border ${msg.isRead ? 'border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50' : 'border-blue-400/30 bg-blue-400/5'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {msg.name}
                        {!msg.isRead && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">جديد</span>}
                      </h4>
                      <a href={`mailto:${msg.email}`} className="text-xs text-blue-500 hover:underline">{msg.email}</a>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] text-slate-500">{new Date(msg.createdAt).toLocaleString('ar-EG')}</span>
                      <button
                        onClick={async () => {
                          if (!window.confirm('هل أنت متأكد من إخفاء هذه الرسالة من لوحة الإدارة؟')) return;
                          try {
                            await api.delete(`/support/${msg.id}`);
                            fetchSupportMessages();
                          } catch (error) {
                            console.error('Failed to delete message', error);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="حذف الرسالة من لوحة الإدارة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200/50 dark:border-white/5 whitespace-pre-wrap mb-4">
                    {msg.message}
                  </p>
                  
                  {msg.reply ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-sm">
                      <strong className="text-emerald-500 text-xs block mb-1">تم الرد:</strong>
                      <p className="text-slate-800 dark:text-slate-200">{msg.reply}</p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <textarea
                        value={replyText[msg.id] || ''}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        placeholder="اكتب ردك هنا (سيتم إرسال الرد بالإيميل مستقبلاً وتحديث الحالة)..."
                        rows={2}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={async () => {
                            await api.patch(`/support/${msg.id}/read`);
                            fetchSupportMessages();
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                        >
                          تحديد كمقروء
                        </button>
                        <button
                          onClick={async () => {
                            if (!replyText[msg.id]) return;
                            await api.post(`/support/${msg.id}/reply`, { reply: replyText[msg.id] });
                            fetchSupportMessages();
                          }}
                          disabled={!replyText[msg.id]}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                          إرسال الرد
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── تاب نتائج الامتحانات ─── */}
      {activeTab === 'exam_results' && (
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">نتائج الامتحانات</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">اختر درساً لعرض نتائج طلابه مرتبة حسب الدرجة</p>
            </div>
          </div>

          {/* Lesson Selector */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-8 p-4 bg-white/5 rounded-xl border border-amber-500/10">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">اختر الكورس</label>
              <select
                value={lessonCourseId}
                onChange={(e) => { setLessonCourseId(e.target.value); setSelectedExamLessonId(''); setExamResultsData(null); }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-400"
              >
                {coursesList.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">اختر درس الامتحان</label>
              <select
                value={selectedExamLessonId}
                onChange={(e) => { setSelectedExamLessonId(e.target.value); setExamResultsData(null); }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="">— اختر درساً —</option>
                {coursesList
                  .find(c => c.id === lessonCourseId)
                  ?.lessons.filter((l: any) => l.platformType === 'quiz' || l.platformType === 'exam')
                  .map((l: any) => (
                    <option key={l.id} value={l.id}>{l.title || l.id}</option>
                  ))}
              </select>
            </div>
            <button
              onClick={fetchExamResults}
              disabled={!selectedExamLessonId || loadingExamResults}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loadingExamResults ? (
                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              جلب النتائج
            </button>
          </div>

          {/* Results Table */}
          {examResultsData && (
            <>
              {/* Summary Bar */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{examResultsData.quiz.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      examResultsData.quiz.type === 'exam' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {examResultsData.quiz.type === 'exam' ? 'امتحان نهائي' : 'تدريبي'}
                    </span>
                    <span className="text-xs text-slate-400">عدد الطلاب: <strong className="text-white">{examResultsData.results.length}</strong></span>
                    <span className="text-xs text-slate-400">درجة النجاح: <strong className="text-amber-400">{examResultsData.quiz.passScore}%</strong></span>
                  </div>
                </div>
                <button
                  onClick={exportExamResultsToExcel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all"
                >
                  <Download className="w-4 h-4" />
                  تحميل Excel
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-right">
                  <thead className="bg-amber-500/10 text-amber-400 border-b border-amber-500/20">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">اسم الطالب</th>
                      <th className="px-4 py-3">المحافظة</th>
                      <th className="px-4 py-3">المرحلة</th>
                      <th className="px-4 py-3">الشعبة</th>
                      <th className="px-4 py-3">الدرجة %</th>
                      <th className="px-4 py-3">درجة / 20</th>
                      <th className="px-4 py-3">الحالة</th>
                      <th className="px-4 py-3">تاريخ التسليم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {examResultsData.results.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-slate-500">لا يوجد طلاب حلوا هذا الامتحان بعد.</td>
                      </tr>
                    ) : (
                      examResultsData.results.map((r: any) => (
                        <tr key={r.rank} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs ${
                              r.rank === 1 ? 'bg-yellow-500 text-slate-900' :
                              r.rank === 2 ? 'bg-slate-300 text-slate-900' :
                              r.rank === 3 ? 'bg-amber-600 text-white' :
                              'bg-white/10 text-slate-300'
                            }`}>{r.rank}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{r.studentName}</td>
                          <td className="px-4 py-3 text-slate-400">{r.governorate}</td>
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.grade}</td>
                          <td className="px-4 py-3 text-slate-400">{r.section}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${
                              r.scorePercentage >= examResultsData.quiz.passScore ? 'text-emerald-400' : 'text-rose-400'
                            }`}>{r.scorePercentage}%</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold text-lg ${
                              r.scorePercentage >= examResultsData.quiz.passScore ? 'text-emerald-400' : 'text-rose-400'
                            }`}>{r.scoreOutOf20}</span>
                            <span className="text-slate-500 text-xs"> / 20</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              r.passed === 'نجح' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}>{r.passed}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{r.submittedAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
