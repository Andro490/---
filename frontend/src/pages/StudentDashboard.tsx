import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import api from '../services/api';
import { Award, BookOpen, Clock, PlayCircle } from 'lucide-react';

interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string | null;
  category: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  enrolledAt: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchStudentDashboard = async () => {
      try {
        const res = await api.get('/dashboard/student');
        setCourses(res.data.enrolledCourses || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDashboard();
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center rtl">
        <div className="w-12 h-12 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate statistics
  const totalCourses = courses.length;
  const completedCourses = courses.filter((c) => c.progress === 100).length;

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 rtl">
      {/* Welcome Banner */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-300 dark:border-white/10 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-theme-accent/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div>
          <span className="text-theme-neonCyan text-xs font-bold uppercase tracking-wider">لوحة التحكم الشخصية</span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1">أهلاً بك، {user?.name} 👋</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1.5 leading-relaxed">
            استمر في تطوير مهاراتك ومتابعة دروسك اليومية لتصل إلى الاحتراف وتنهي مشاريعك الإبداعية.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="glass-card px-5 py-4 rounded-xl border border-slate-200 dark:border-white/5 text-center min-w-[100px]">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold block">المساقات</span>
            <span className="text-2xl font-extrabold text-theme-neonCyan mt-0.5 block">{totalCourses}</span>
          </div>
          <div className="glass-card px-5 py-4 rounded-xl border border-slate-200 dark:border-white/5 text-center min-w-[100px]">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold block">الشهادات</span>
            <span className="text-2xl font-extrabold text-theme-neonPurple mt-0.5 block">{completedCourses}</span>
          </div>
        </div>
      </div>

      {/* Grid of Courses */}
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-theme-neonCyan" />
        متابعة التعلم
      </h2>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <div key={course.id} className="glass-card rounded-2xl overflow-hidden shadow-glass border border-slate-200 dark:border-white/5 flex flex-col h-full">
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-theme-accent/20 to-theme-neonCyan/20 flex items-center justify-center" />
                )}
                <span className="absolute top-4 right-4 bg-theme-bg/80 backdrop-blur-md text-slate-900 dark:text-white text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200 dark:border-white/5">
                  {course.category}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 line-clamp-1">
                  {course.title}
                </h3>

                {/* Progress bar */}
                <div className="space-y-1.5 flex-grow mb-6">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>نسبة الإنجاز</span>
                    <span className="font-semibold text-theme-neonCyan">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                    <div
                      className="bg-gradient-to-l from-theme-accent to-theme-neonCyan h-full rounded-full transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    تم إنجاز {course.completedLessons} من أصل {course.totalLessons} دروس.
                  </span>
                </div>

                {/* Button */}
                <Link
                  to={`/courses/${course.id}/play`}
                  className="w-full py-3 rounded-xl bg-theme-accent/10 border border-theme-accent/30 hover:bg-theme-accent hover:text-slate-900 dark:hover:text-white text-theme-neonCyan text-center text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlayCircle className="w-4.5 h-4.5" />
                  متابعة الدرس
                </Link>

                {course.progress === 100 && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold justify-center">
                    <Award className="w-4 h-4" />
                    مبارك! لقد استحققت شهادة إتمام هذا المساق.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-16 rounded-2xl border border-slate-200 dark:border-white/5 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
          <Clock className="w-12 h-12 text-slate-500 dark:text-slate-400 mb-4 animate-spin-slow" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">أنت غير مشترك في أي دورة بعد</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            انطلق الآن واكتشف مجموعتنا المميزة من المساقات ثلاثية الأبعاد والتفاعلية لتشعل شغفك بالتعلم.
          </p>
          <Link
            to="/courses"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-theme-accent to-theme-neonPurple text-slate-900 dark:text-white text-sm font-semibold hover:shadow-glow-purple transition-all duration-300 cursor-pointer"
          >
            استعرض كتالوج الدورات
          </Link>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
