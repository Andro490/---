import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchCourseById, enrollInCourse, addReview } from '../features/courses/coursesSlice';
import api from '../services/api';
import { BookOpen, Calendar, Star, Send, ShieldAlert, Award, PlayCircle } from 'lucide-react';
import { SEO } from '../components/SEO';

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { currentCourse, loading } = useAppSelector((state) => state.courses);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Check enrollment
  useEffect(() => {
    if (id) {
      dispatch(fetchCourseById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      if (!isAuthenticated || !id) return;
      if (user?.role === 'ADMIN') {
        setIsEnrolled(true);
        return;
      }
      
      setCheckingEnrollment(true);
      try {
        const res = await api.get('/dashboard/student');
        const enrolledCourses = res.data.enrolledCourses || [];
        const found = enrolledCourses.some((c: any) => c.id === id);
        setIsEnrolled(found);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingEnrollment(false);
      }
    };
    checkEnrollmentStatus();
  }, [id, isAuthenticated, user]);

  const handleEnrollment = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!id) return;

    navigate(`/checkout/${id}`);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!comment.trim()) {
      setReviewError('الرجاء كتابة تعليق');
      return;
    }

    try {
      await dispatch(addReview({ courseId: id, rating, comment })).unwrap();
      setComment('');
      setRating(5);
      setReviewError(null);
      alert('تمت إضافة تقييمك بنجاح!');
    } catch (err: any) {
      setReviewError(err || 'فشلت إضافة التقييم.');
    }
  };

  if (loading || !currentCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center rtl">
        <div className="w-12 h-12 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate average rating
  const reviewsCount = currentCourse.reviews?.length || 0;
  const averageRating = reviewsCount > 0
    ? (currentCourse.reviews!.reduce((acc, r) => acc + r.rating, 0) / reviewsCount).toFixed(1)
    : '5.0';

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 rtl">
      <SEO 
        title={currentCourse.title} 
        description={currentCourse.description} 
        image={currentCourse.thumbnail || undefined}
      />
      {/* Course Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <span className="bg-theme-neonCyan/10 border border-theme-neonCyan/30 text-theme-neonCyan px-3 py-1.5 rounded-full text-xs font-semibold">
            {currentCourse.category?.name || 'عام'}
          </span>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
            {currentCourse.title}
          </h1>

          <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base sm:text-lg">
            {currentCourse.description}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-theme-accent" />
              تاريخ الإدراج: {new Date(currentCourse.createdAt || '').toLocaleDateString('ar-EG')}
            </span>
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              التقييم العام: {averageRating} ({reviewsCount} تقييمات)
            </span>
          </div>

          {/* Curriculum */}
          <div className="pt-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">منهج الدورة التعليمية</h2>
            <div className="space-y-4">
              {currentCourse.lessons && currentCourse.lessons.length > 0 ? (
                currentCourse.lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="glass-card p-5 rounded-xl border border-slate-200 dark:border-white/5 hover:border-theme-neonCyan/30 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-theme-bg flex items-center justify-center font-bold text-theme-neonCyan">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-slate-900 dark:text-white font-semibold text-sm sm:text-base">{lesson.title}</h4>
                        <span className="text-xs text-slate-600 dark:text-slate-400">المدة: {Math.round(lesson.duration / 60)} دقيقة</span>
                      </div>
                    </div>
                    {isEnrolled ? (
                      <Link
                        to={`/courses/${id}/play?lesson=${lesson.id}`}
                        className="text-theme-neonCyan hover:underline text-xs flex items-center gap-1"
                      >
                        تشغيل
                        <PlayCircle className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">مغلق 🔒</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-slate-600 dark:text-slate-400 text-sm">لم يتم رفع أي دروس بعد في هذا الكورس.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Sticky Panel */}
        <div className="lg:sticky lg:top-28 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-300 dark:border-white/10 shadow-glass text-center space-y-6">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950">
              {currentCourse.thumbnail ? (
                <img
                  src={currentCourse.thumbnail}
                  alt={currentCourse.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-theme-accent/20 to-theme-neonCyan/20 flex items-center justify-center" />
              )}
            </div>

            {/* Price */}
            <div className="flex items-center justify-between border-t border-b border-slate-200 dark:border-white/5 py-4">
              <span className="text-slate-600 dark:text-slate-400 text-sm">سعر المساق</span>
              <span className="text-2xl font-extrabold text-theme-neonCyan">
                {currentCourse.price === 0 ? (
                  <span className="text-emerald-400 font-bold">مجاني</span>
                ) : (
                  `${currentCourse.price} $`
                )}
              </span>
            </div>

            {/* CTA */}
            {checkingEnrollment ? (
              <div className="w-full py-4 text-center text-slate-600 dark:text-slate-400">جاري التحقق...</div>
            ) : isEnrolled ? (
              <Link
                to={`/courses/${id}/play`}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-theme-accent to-theme-neonPurple text-slate-900 dark:text-white font-bold hover:shadow-glow-purple transition-all duration-300 block cursor-pointer"
              >
                دخول قاعة الدرس والتعلم 🎓
              </Link>
            ) : (
              <button
                onClick={handleEnrollment}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-theme-accent via-theme-neonPurple to-theme-neonCyan text-slate-900 dark:text-white font-bold hover:shadow-glow-purple transition-all duration-300 transform hover:scale-[1.01] cursor-pointer"
              >
                {isAuthenticated ? 'اشترك في الدورة الآن' : 'سجل دخولك للاشتراك'}
              </button>
            )}

            <div className="space-y-3 pt-2 text-right">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Award className="w-4 h-4 text-theme-neonCyan" />
                شهادة إتمام بعد إنهاء كامل الفصول.
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <BookOpen className="w-4 h-4 text-theme-neonCyan" />
                ولوج مدى الحياة للملفات والبرمجيات والمشاريع.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-20 border-t border-slate-200 dark:border-white/5 pt-16 max-w-4xl">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">آراء الطلاب وتقييماتهم</h2>

        {/* Form Review (if enrolled) */}
        {isAuthenticated && isEnrolled ? (
          <form onSubmit={handleReviewSubmit} className="glass-card p-6 rounded-xl border border-slate-200 dark:border-white/5 space-y-4 mb-8">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm">شاركنا رأيك في الدورة:</h4>
            
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">التقييم:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="اكتب تعليقك هنا..."
                rows={3}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonCyan transition-all"
              />
              <button
                type="submit"
                className="absolute left-3 bottom-4 p-2 rounded-lg bg-theme-accent/20 border border-theme-accent/30 hover:bg-theme-accent hover:text-slate-900 dark:hover:text-white text-theme-neonCyan transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {reviewError && <p className="text-xs text-rose-400 font-semibold">{reviewError}</p>}
          </form>
        ) : (
          <div className="glass-card p-4 rounded-xl border border-yellow-500/10 bg-yellow-500/5 text-yellow-400/80 text-xs flex items-center gap-2 mb-8">
            <ShieldAlert className="w-4 h-4" />
            يرجى الاشتراك في الدورة لكتابة تقييم ومشاركة رأيك.
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-6">
          {currentCourse.reviews && currentCourse.reviews.length > 0 ? (
            currentCourse.reviews.map((rev) => (
              <div key={rev.id} className="border-b border-slate-200 dark:border-white/5 pb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {rev.user?.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h5 className="text-slate-900 dark:text-white text-sm font-semibold">{rev.user?.name}</h5>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                        {new Date(rev.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed pr-11">
                  {rev.comment}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm">لا توجد تقييمات مكتوبة حتى الآن. كن أول من يكتب تقييماً!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
