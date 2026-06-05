import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchCourseById, fetchCourseProgress, toggleLessonProgress, clearCurrentCourse } from '../features/courses/coursesSlice';
import { PlayCircle, CheckCircle, Circle, ArrowRight, Menu, BookOpen, Lock } from 'lucide-react';
import SecureVideoPlayer from '../components/SecureVideoPlayer';
import QuizComponent from '../components/QuizComponent';
import HomeworkComponent from '../components/HomeworkComponent';
import api from '../services/api';

const CoursePlayer = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const reviewQuizId = location.state?.reviewQuizId;
  const reviewAnswers = location.state?.answers;
  const isHomework = location.state?.isHomework;

  const { currentCourse, progress, loading } = useAppSelector((state) => state.courses);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [secureVideoUrl, setSecureVideoUrl] = useState<string | null>(null);
  const [isSecureLoading, setIsSecureLoading] = useState<boolean>(false);
  const [secureError, setSecureError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Load Course and Progress
  useEffect(() => {
    if (id) {
      dispatch(fetchCourseById(id));
      dispatch(fetchCourseProgress(id));
    }
    return () => {
      dispatch(clearCurrentCourse());
    };
  }, [id, dispatch]);

  // Handle active lesson selection from Query Params or select first lesson by default
  useEffect(() => {
    if (currentCourse && currentCourse.lessons && currentCourse.lessons.length > 0) {
      const lessonParam = searchParams.get('lesson');
      
      const checkIsLocked = (targetId: string) => {
        const targetIdx = currentCourse.lessons!.findIndex(l => l.id === targetId);
        if (targetIdx <= 0) return false;
        for (let i = 0; i < targetIdx; i++) {
          const prev = currentCourse.lessons![i];
          if ((prev.platformType === 'quiz' || prev.platformType === 'exam' || prev.platformType === 'homework') && !isLessonCompleted(prev.id)) {
            return true;
          }
        }
        return false;
      };

      if (lessonParam && !checkIsLocked(lessonParam)) {
        setActiveLessonId(lessonParam);
      } else if (reviewQuizId && !checkIsLocked(reviewQuizId)) {
        setActiveLessonId(reviewQuizId);
      } else {
        // Default to first lesson (or keep current if locked via URL)
        setActiveLessonId(currentCourse.lessons[0].id);
      }
    }
  }, [currentCourse, searchParams, progress]);

  const activeLesson = currentCourse?.lessons?.find((l) => l.id === activeLessonId);

  // Fetch Secure Video URL when lesson changes
  useEffect(() => {
    if (activeLesson?.platformType === 'secure') {
      setIsSecureLoading(true);
      setSecureError(null);
      setSecureVideoUrl(null); // تفريغ الرابط القديم فوراً
      
      api.get(`/courses/lessons/${activeLesson.id}/secure-url`)
        .then((res) => {
          setSecureVideoUrl(res.data.url);
          setIsSecureLoading(false);
        })
        .catch((err) => {
          console.error('Failed to get secure video URL', err);
          setSecureError('لا تملك صلاحية الوصول لهذا الفيديو أو انتهت الجلسة.');
          setIsSecureLoading(false);
        });
    } else {
      setSecureVideoUrl(null);
      setSecureError(null);
    }
  }, [activeLesson?.id, activeLesson?.platformType]);

  const handleLessonChange = (lessonId: string) => {
    // التحقق مما إذا كان الدرس مغلقاً (يسبقه كويز لم يتم اجتيازه)
    if (currentCourse && currentCourse.lessons) {
      const targetIdx = currentCourse.lessons.findIndex(l => l.id === lessonId);
      if (targetIdx > 0) {
        for (let i = 0; i < targetIdx; i++) {
          const prev = currentCourse.lessons[i];
          if ((prev.platformType === 'quiz' || prev.platformType === 'exam' || prev.platformType === 'homework') && !isLessonCompleted(prev.id)) {
            alert('🔒 عذراً، لا يمكنك فتح هذا الدرس. يجب عليك أولاً اجتياز الاختبار/الواجب السابق بنسبة نجاح 50% على الأقل.');
            return;
          }
        }
      }
    }

    setActiveLessonId(lessonId);
    setSearchParams({ lesson: lessonId });
  };

  const handleProgressToggle = async (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    try {
      await dispatch(toggleLessonProgress({ lessonId, courseId: id })).unwrap();
    } catch (err: any) {
      alert(err || 'فشل تحديث التقدم.');
    }
  };

  // مساعد: التحقق من اكتمال الدرس — تعريفها قبل الـ useEffect لكي تعمل بشكل صحيح
  const isLessonCompleted = (lessonId: string) => {
    if (!progress || !progress.progressList) return false;
    const found = progress.progressList.find((p) => p.lessonId === lessonId);
    return found ? found.completed : false;
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    // ✅ الإكمال التلقائي فقط لدروس الفيديو — الكويزات والواجبات تُكتمل فقط بعد التسليم الناجح
    const isInteractiveLesson = activeLesson?.platformType === 'quiz' || activeLesson?.platformType === 'exam' || activeLesson?.platformType === 'homework';

    if (activeLesson && id && progress && progress.progressList && !isInteractiveLesson) {
      const isCompleted = progress.progressList.find(p => p.lessonId === activeLesson.id)?.completed;
      if (!isCompleted) {
        timer = setTimeout(() => {
          dispatch(toggleLessonProgress({ lessonId: activeLesson.id, courseId: id }))
            .unwrap()
            .then(() => dispatch(fetchCourseProgress(id)))
            .catch(err => console.error(err));
        }, 2000);
      }
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [activeLesson?.id, id, dispatch]);

  // --- عرض شاشة التحميل إذا لم يكتمل جلب البيانات بعد --- 
  if (loading || !currentCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center rtl">
        <div className="w-12 h-12 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const lessons = currentCourse.lessons || [];

  const handleVideoFinished = async () => {
    if (!activeLesson || !id) return;
    if (isLessonCompleted(activeLesson.id)) return;
    try {
      await dispatch(toggleLessonProgress({ 
        lessonId: activeLesson.id, 
        courseId: id,
        forceComplete: true
      })).unwrap();
      dispatch(fetchCourseProgress(id));
    } catch (error) {
      console.error('حدث خطأ أثناء حفظ تقدمك', error);
    }
  };

  return (
    <div className="relative z-10 min-h-screen pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col gap-6 rtl">
      {/* Back to Course details bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2.5 rounded-lg bg-theme-card border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white lg:hidden cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{currentCourse.title}</h1>
            {progress && (
              <span className="text-xs text-theme-neonCyan font-semibold">
                تم إكمال {progress.percentage}% من المنهج ({progress.completedCount}/{progress.totalCount} دروس)
              </span>
            )}
          </div>
        </div>
        <Link
          to={`/courses/${id}`}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 border border-slate-200 dark:border-white/5 px-3 py-2 rounded-lg bg-theme-card/40 transition-colors"
        >
          العودة للتفاصيل
          <ArrowRight className="w-4.5 h-4.5" />
        </Link>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Active Player Panel (Center) */}
        <div className="lg:col-span-3 space-y-6">
          {activeLesson ? (
            <>
              {/* Conditional rendering for Quiz vs Video Player */}
              {activeLesson.platformType === 'quiz' || activeLesson.platformType === 'exam' ? (
                <div className="w-full aspect-video md:aspect-auto md:min-h-[500px]">
                  <QuizComponent 
                    key={activeLesson.id} 
                    lessonId={activeLesson.id} 
                    onQuizComplete={handleVideoFinished} 
                    reviewAnswers={activeLesson.id === reviewQuizId && !isHomework ? reviewAnswers : undefined}
                  />
                </div>
              ) : activeLesson.platformType === 'homework' ? (
                <div className="w-full">
                  <HomeworkComponent
                    key={activeLesson.id}
                    lessonId={activeLesson.id}
                    onComplete={handleVideoFinished}
                    reviewAnswers={activeLesson.id === reviewQuizId && isHomework ? reviewAnswers : undefined}
                  />
                </div>
              ) : activeLesson.platformType === 'secure' ? (
                isSecureLoading ? (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 dark:border-white/10 relative shadow-glow-purple flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-2 border-theme-neonCyan border-t-transparent rounded-full animate-spin mb-4" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">جاري تشفير وبناء المشغل الآمن...</span>
                  </div>
                ) : secureError ? (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-red-500/20 relative flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 gap-3">
                    <Lock className="w-12 h-12 text-red-500/50 mb-2" />
                    <span className="text-sm text-red-400">{secureError}</span>
                  </div>
                ) : secureVideoUrl ? (
                  <SecureVideoPlayer key={secureVideoUrl} videoUrl={secureVideoUrl} platformType="secure" onVideoEnd={handleVideoFinished} />
                ) : (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 dark:border-white/10 relative shadow-glow-purple flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
                    <PlayCircle className="w-16 h-16 animate-pulse text-theme-accent" />
                    <span className="text-sm">عفواً، لا يمكننا عرض الفيديو.</span>
                  </div>
                )
              ) : activeLesson.videoUrl || activeLesson.platformType === 'youtube' ? (
                <SecureVideoPlayer key={activeLesson.id} videoUrl={activeLesson.videoUrl || ''} platformType={activeLesson.platformType} onVideoEnd={handleVideoFinished} />
              ) : activeLesson.platformType === 'pdf' ? (
                <div className="w-full bg-slate-950 border border-slate-300 dark:border-white/10 rounded-2xl overflow-hidden shadow-glow-purple flex flex-col" style={{ minHeight: '600px' }}>
                  <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> عرض ملف PDF
                    </span>
                    {(activeLesson as any).pdfUrl && (
                      <a
                        href={(activeLesson as any).pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                      >
                        تحميل الملف
                      </a>
                    )}
                  </div>
                  {(activeLesson as any).pdfUrl ? (
                    <iframe
                      src={(activeLesson as any).pdfUrl}
                      className="w-full flex-1"
                      title="PDF Viewer"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                      <BookOpen className="w-12 h-12 text-slate-600" />
                      <span className="text-sm">لم يتم إرفاق ملف PDF لهذا الدرس.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 dark:border-white/10 relative shadow-glow-purple">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
                    <PlayCircle className="w-16 h-16 animate-pulse text-theme-accent" />
                    <span className="text-sm">لا يتوفر رابط فيديو لهذا الدرس حالياً.</span>
                  </div>
                </div>
              )}

              {/* Lesson Instructions */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeLesson.title}</h2>

                  {/* للكويزات والواجبات: شارة قراءة فقط بدون زر ضغط */}
                  {(activeLesson.platformType === 'quiz' || activeLesson.platformType === 'exam' || activeLesson.platformType === 'homework') ? (
                    isLessonCompleted(activeLesson.id) ? (
                      <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5 fill-emerald-500/20" />
                        تم إنجاز الدرس
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border ${
                        activeLesson.platformType === 'homework'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-theme-neonPurple/10 border-theme-neonPurple/30 text-theme-neonPurple'
                      }`}>
                        <Circle className="w-3.5 h-3.5" />
                        {activeLesson.platformType === 'homework' ? 'يتطلب تسليم الواجب' : 'يتطلب اجتياز الاختبار'}
                      </span>
                    )
                  ) : (
                    /* لدروس الفيديو: زر يدوي قابل للضغط */
                    <button
                      onClick={(e) => handleProgressToggle(activeLesson.id, e)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isLessonCompleted(activeLesson.id)
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-theme-accent/10 border-theme-accent/30 text-theme-neonCyan'
                      }`}
                    >
                      {isLessonCompleted(activeLesson.id) ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 fill-emerald-500/20" />
                          تم إنجاز الدرس
                        </>
                      ) : (
                        <>
                          <Circle className="w-3.5 h-3.5" />
                          تحديد كـ منجز
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {activeLesson.content || 'لم تتم كتابة تعليمات نصية إضافية لهذا الدرس بعد.'}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel p-16 text-center rounded-2xl flex flex-col items-center justify-center min-h-[40vh]">
              <BookOpen className="w-12 h-12 text-slate-500 dark:text-slate-400 mb-4 animate-bounce" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">اختر درساً للبدء</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">يرجى تحديد أحد الدروس المعروضة في القائمة الجانبية لتشغيل المحتوى.</p>
            </div>
          )}
        </div>

        {/* Lessons List Panel (Sidebar) */}
        <div
          className={`${
            sidebarOpen ? 'block' : 'hidden'
          } lg:block lg:col-span-1 glass-panel p-4 rounded-2xl border border-slate-300 dark:border-white/10 space-y-4`}
        >
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-white/5 pb-3">فهرس المحتوى</h3>
          
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {lessons.map((lesson, idx) => {
              const isActive = lesson.id === activeLessonId;
              const isDone = isLessonCompleted(lesson.id);
              
              // تحديد ما إذا كان الدرس مغلقاً بسبب اختبار لم يتم اجتيازه
              let isLocked = false;
              for (let i = 0; i < idx; i++) {
                if ((lessons[i].platformType === 'quiz' || lessons[i].platformType === 'exam' || lessons[i].platformType === 'homework') && !isLessonCompleted(lessons[i].id)) {
                  isLocked = true;
                  break;
                }
              }

              return (
                <div
                  key={lesson.id}
                  onClick={() => handleLessonChange(lesson.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    isLocked ? 'cursor-not-allowed opacity-50 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/5' : 'cursor-pointer'
                  } ${
                    isActive && !isLocked
                      ? 'bg-theme-accent/20 border-theme-accent text-slate-900 dark:text-white shadow-glow-purple'
                      : !isLocked ? 'bg-theme-card/30 border-slate-200 dark:border-white/5 hover:bg-theme-card/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold font-mono opacity-60">#{idx + 1}</span>
                    <span className="text-xs font-medium truncate max-w-[130px]">{lesson.title}</span>
                  </div>

                  {isLocked ? (
                    <Lock className="w-4 h-4 text-red-500/50" />
                  ) : (lesson.platformType === 'quiz' || lesson.platformType === 'exam' || lesson.platformType === 'homework') ? (
                    /* للكويزات والواجبات: أيقونة قراءة فقط بدون إمكانية الضغط */
                    isDone ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 fill-emerald-500/10" />
                    ) : (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        lesson.platformType === 'homework'
                          ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                          : 'text-theme-neonPurple border-theme-neonPurple/30 bg-theme-neonPurple/10'
                      }`}>
                        {lesson.platformType === 'homework' ? 'واجب' : lesson.platformType === 'exam' ? 'نهائي' : 'كويز'}
                      </span>
                    )
                  ) : (
                    /* لدروس الفيديو: زر قابل للضغط */
                    <button
                      onClick={(e) => handleProgressToggle(lesson.id, e)}
                      className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      {isDone ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 fill-emerald-500/10" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600 hover:text-theme-neonCyan" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;