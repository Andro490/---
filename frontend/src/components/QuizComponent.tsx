import { useState, useEffect } from 'react';
import api from '../services/api';
import { CheckCircle, XCircle, Award, RefreshCw, Maximize, ShieldAlert, Lock, Trophy, Clock, Camera, CameraOff, ArrowLeft } from 'lucide-react';
import { useQuizSecurity } from '../hooks/useQuizSecurity';
import CameraProctor from './CameraProctor';

interface Question {
  id: string;
  questionText: string;
  options: string[];
  shuffledOptions?: { text: string; originalIndex: number }[];
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  passScore: number;
  type?: 'practice' | 'exam' | 'dictation'; // نوع الاختبار
  questions: Question[];
}

interface QuizResult {
  score: number;
  passed: boolean;
  earnedPoints: number;
  totalPoints: number;
  results: {
    questionId: string;
    isCorrect: boolean;
    correctOption: number;
  }[];
}

interface PreviousResult {
  scorePercentage: number;
  passed: boolean;
  submittedAt: string;
}

interface QuizComponentProps {
  lessonId: string;
  onQuizComplete?: () => void;
  onNextLesson?: () => void;
  reviewAnswers?: Record<string, number | string>;
}

const QuizComponent = ({ lessonId, onQuizComplete, onNextLesson, reviewAnswers }: QuizComponentProps) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── حالة الامتحان النهائي المؤدى مسبقاً ──────────────────────────────────
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [previousResult, setPreviousResult] = useState<PreviousResult | null>(null);

  const [answers, setAnswers] = useState<Record<string, number | string>>(reviewAnswers || {});
  const [isSubmitting, setIsSubmitting] = useState(!!reviewAnswers);
  const [result, setResult] = useState<QuizResult | null>(null);

  // ─── حالة بدء الاختبار ───────────────────────────────────────────────────
  // في وضع المراجعة نتجاوز شاشة البداية مباشرةً
  const [quizStarted, setQuizStarted] = useState(!!reviewAnswers);

  // ─── خطوة الكاميرا (exam / dictation فقط) ───────────────────────────────
  // 'idle' → لم يُطلب بعد | 'requesting' → بانتظار الإذن | 'granted' | 'denied'
  const [cameraStep, setCameraStep] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  
  // ─── المؤقت ─────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const fetchQuiz = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers(reviewAnswers || {});
    setAlreadyTaken(false);
    setPreviousResult(null);
    try {
      const res = await api.get(`/courses/lessons/${lessonId}/quiz`);
      let fetchedQuiz = res.data.quiz;

      // ─── امتحان نهائي مؤدى مسبقاً: اعرض شاشة القفل فوراً ───────────────
      if (res.data.alreadyTaken) {
        setAlreadyTaken(true);
        setPreviousResult(res.data.previousResult);
        setQuiz(fetchedQuiz); // نحتاج quiz.passScore للعرض
        setLoading(false);
        if (onQuizComplete) onQuizComplete(); // Unlock next lesson if already taken
        return;
      }

      // ترتيب عشوائي للأسئلة والخيارات للامتحانات الجديدة فقط (وليس أثناء المراجعة)
      if (!reviewAnswers) {
        fetchedQuiz.questions = [...fetchedQuiz.questions].sort(() => Math.random() - 0.5);
        fetchedQuiz.questions.forEach((q: Question) => {
          q.shuffledOptions = q.options
            .map((text: string, originalIndex: number) => ({ text, originalIndex }))
            .sort(() => Math.random() - 0.5);
        });
      } else {
        fetchedQuiz.questions.forEach((q: Question) => {
          q.shuffledOptions = q.options.map((text: string, originalIndex: number) => ({ text, originalIndex }));
        });
      }

      setQuiz(fetchedQuiz);
      
      // إذا كان الاختبار "عادي" لا نعرض شاشة البداية ونبدأ فوراً
      if (fetchedQuiz.type !== 'exam' && fetchedQuiz.type !== 'dictation' && !reviewAnswers) {
        setQuizStarted(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'تعذر تحميل الاختبار');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [lessonId]);

  const submitQuizData = async (answersToSubmit: Record<string, number | string>) => {
    if (!quiz) return;
    setIsSubmitting(true);
    try {
      const payload = {
        answers: answersToSubmit,
        askedQuestionIds: quiz.questions.map((q: Question) => q.id)
      };
      const res = await api.post(`/courses/lessons/${lessonId}/quiz/submit`, payload);
      setResult(res.data);
      const isExamType = quiz.type === 'exam' || quiz.type === 'dictation';
      if ((res.data.passed || isExamType) && onQuizComplete && !reviewAnswers) {
        onQuizComplete();
      }
    } catch (err: any) {
      // 403 = الامتحان النهائي تم أداؤه مسبقاً
      if (err.response?.status === 403) {
        setAlreadyTaken(true);
        if (onQuizComplete) onQuizComplete(); // تأكد من فتحه للدرس التالي لأنه أداه مسبقاً
        // أعد جلب البيانات لعرض النتيجة السابقة
        fetchQuiz();
      } else {
        alert(err.response?.data?.message || 'حدث خطأ أثناء تحميل نتيجة الاختبار.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── دالة التسليم التلقائي (تُستدعى من الـ Hook عند تجاوز حد التبديل) ───
  const autoSubmit = async () => {
    if (result || isSubmitting) return; // تجنّب التكرار
    await submitQuizData(answers);
  };

  const isExam = quiz?.type === 'exam' || quiz?.type === 'dictation';
  
  const { startQuiz, resumeQuiz, isBlocked, switchCount, lookAwayCount, warningText, triggerLookAwayWarning } = useQuizSecurity({
    onAutoSubmit: autoSubmit,
    switchLimit: 3,
    enabled: isExam, // تفعيل الحماية فقط في الاختبار النهائي
  });

  // ─── بدء الاختبار (يُربط بزر "ابدأ الاختبار") ────────────────────────────
  const requestCameraAndStart = async () => {
    setIsRequestingCamera(true);
    setCameraStep('requesting');
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStep('granted');
    } catch {
      setCameraStep('denied');
    } finally {
      setIsRequestingCamera(false);
    }
  };

  const handleStartQuiz = () => {
    if (isExam) {
      startQuiz();         // يبدأ المراقبة
    }
    setQuizStarted(true);
    // تفعيل المؤقت فقط في حالة تسميع الكلمات بـ 10 دقائق (600 ثانية)
    if (quiz?.type === 'dictation') {
      setTimeLeft(10 * 60);
    }
  };

  // بعد منح الإذن أو رفضه → ابدأ الاختبار مباشرةً
  useEffect(() => {
    if (cameraStep === 'granted' || cameraStep === 'denied') {
      handleStartQuiz();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStep]);

  // معالجة المؤقت
  useEffect(() => {
    if (timeLeft === null || result || reviewAnswers || !quizStarted) return;

    if (timeLeft <= 0) {
      autoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result, reviewAnswers, quizStarted]);

  // If we are in review mode (reviewAnswers provided), we want to submit the answers 
  // immediately after loading the quiz to get the correct results.
  useEffect(() => {
    if (quiz && reviewAnswers && !result) {
      submitQuizData(reviewAnswers);
    }
  }, [quiz]);

  const handleOptionSelect = (questionId: string, value: number | string) => {
    if (result) return; // Prevent changing answer after submit
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    
    // Check if all questions are answered
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
      alert('الرجاء الإجابة على جميع الأسئلة قبل تسليم الاختبار.');
      return;
    }

    await submitQuizData(answers);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-theme-neonCyan">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
        <p>جاري تحميل الاختبار...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-red-400 gap-3">
        <XCircle className="w-12 h-12" />
        <p>{error || 'لم يتم العثور على الاختبار'}</p>
        <button onClick={fetchQuiz} className="mt-4 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white hover:bg-slate-700">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // ─── شاشة القفل: الامتحان النهائي أو التسميع مؤدى مسبقاً ────────────────────────────
  if (alreadyTaken && isExam && !reviewAnswers) {
    const score = previousResult?.scorePercentage ?? 0;
    const passed = previousResult?.passed ?? false;
    const date = previousResult?.submittedAt
      ? new Date(previousResult.submittedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] bg-slate-950 rounded-xl border border-white/10 shadow-glow-purple p-8 gap-6 text-center" dir="rtl">
        {/* أيقونة القفل */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${
          passed
            ? 'bg-emerald-500/20 border-emerald-500/50'
            : 'bg-red-500/20 border-red-500/50'
        }`}>
          {passed
            ? <Trophy className="w-12 h-12 text-emerald-400" />
            : <Lock className="w-12 h-12 text-red-400" />}
        </div>

        {/* العنوان */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{quiz.title}</h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400">
            <Lock className="w-3 h-3" />
            {quiz.type === 'dictation' ? 'تسميع كلمات — لا يمكن إعادته' : 'امتحان نهائي — لا يمكن إعادته'}
          </span>
        </div>

        {/* نتيجة سابقة */}
        <div className={`w-full max-w-sm rounded-2xl border p-6 ${
          passed
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <p className="text-slate-400 text-sm mb-3">نتيجتك السابقة</p>
          <p className={`text-5xl font-black mb-2 ${
            passed ? 'text-emerald-400' : 'text-red-400'
          }`}>{score}%</p>
          <p className={`text-sm font-semibold mb-1 ${
            passed ? 'text-emerald-300' : 'text-red-300'
          }`}>{passed ? '✅ ناجح' : '❌ راسب'}</p>
          {date && <p className="text-slate-500 text-xs">تاريخ التقديم: {date}</p>}
          <p className="text-slate-500 text-xs mt-1">درجة النجاح: {quiz.passScore}%</p>
        </div>

        <p className="text-slate-500 text-sm max-w-xs">
          لمراجعة إجاباتك بالتفصيل اذهب إلى
          <span className="text-theme-neonCyan font-semibold"> لوحة الطالب → Exam Results</span>
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl p-6 md:p-10 border border-slate-300 dark:border-white/10 shadow-glow-purple">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 border-4 ${result.passed ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
            {result.passed ? <Award className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {result.passed ? 'مبروك! لقد اجتزت الاختبار بنجاح' : 'للأسف لم تجتز الاختبار هذه المرة'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            لقد حصلت على <strong className="text-theme-neonCyan">{result.score}%</strong> (الدرجة المطلوبة: {quiz.passScore}%)
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            مجموع النقاط: {result.earnedPoints} من {result.totalPoints}
          </p>
        </div>

        {/* ✅ مراجعة الإجابات تظهر فقط في وضع المراجعة (من صفحة Exam Results) */}
        {reviewAnswers ? (
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/5 pb-3">مراجعة الإجابات:</h3>
            {quiz.questions.map((q, idx) => {
              const answerRes = result.results.find(r => r.questionId === q.id);
              const isCorrect = answerRes?.isCorrect;
              
              return (
                <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex gap-3 mb-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                      {idx + 1}
                    </span>
                    <p className="text-slate-900 dark:text-white font-medium">{q.questionText}</p>
                  </div>
                  
                  {quiz.type === 'dictation' ? (
                    <div className="pl-9 mt-3 flex flex-col gap-2">
                      <div className={`p-3 rounded-xl border flex items-center justify-between text-sm ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-500 dark:text-slate-400 text-xs">إجابتك:</span>
                          <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>{answers[q.id] || 'بدون إجابة'}</span>
                        </div>
                        {isCorrect ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                      {!isCorrect && (
                        <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-center justify-between text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-500 dark:text-slate-400 text-xs">الإجابة الصحيحة:</span>
                            <span className="font-bold text-emerald-400">{q.options[0]}</span>
                          </div>
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9 mt-3">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = answers[q.id] === optIdx;
                        const isActualCorrect = answerRes?.correctOption === optIdx;
                        
                        let bgClass = "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400";
                        if (isActualCorrect) bgClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold";
                        else if (isSelected && !isActualCorrect) bgClass = "bg-red-500/20 border-red-500/50 text-red-400";
                        
                        return (
                          <div key={optIdx} className={`p-2.5 rounded-lg border text-sm flex items-center justify-between ${bgClass}`}>
                            <span>{opt}</span>
                            {isActualCorrect && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                            {isSelected && !isActualCorrect && <XCircle className="w-4 h-4 text-red-400" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // ✅ بعد التسليم العادي: رسالة توجيهية بدلاً من الإجابات
          <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10">
            <Award className="w-12 h-12 text-theme-neonCyan mb-3 opacity-60" />
            <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
              لمراجعة إجاباتك والاطلاع على الإجابات الصحيحة،
            </p>
            <p className="text-theme-neonCyan font-semibold text-sm mt-1">
              اذهب إلى: لوحة الطالب → Exam Results → Review correct answers
            </p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-300 dark:border-white/10 flex justify-center gap-3 flex-wrap">
          {/* زر الإعادة: متاح فقط للكويز العادي (practice) */}
          {!reviewAnswers && quiz.type !== 'exam' && quiz.type !== 'dictation' && (
            <button
              onClick={fetchQuiz}
              className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl transition-all font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة الاختبار
            </button>
          )}
          {/* للامتحان النهائي والتسميع: زر الدرس التالي + رسالة قفل */}
          {!reviewAnswers && (quiz.type === 'exam' || quiz.type === 'dictation') && result && (
            <div className="flex flex-col items-center gap-3 w-full">
              {onNextLesson && (
                <button
                  onClick={onNextLesson}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-theme-accent to-theme-neonCyan text-slate-900 rounded-xl font-bold shadow-glow-cyan hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                  الدرس التالي
                </button>
              )}
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-semibold">
                <Lock className="w-4 h-4" />
                هذا الاختبار لا يمكن إعادته
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── شاشة البداية ────────────────────────────────────────────────────────
  if (!quizStarted) {
    // ── خطوة طلب الكاميرا (للامتحان النهائي والتسميع فقط) ──
    if (isExam && cameraStep === 'idle') {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[440px] bg-slate-950 rounded-xl border border-white/5 shadow-glow-purple p-8 gap-6 text-center" dir="rtl">

          {/* أيقونة الكاميرا */}
          <div className="w-24 h-24 rounded-full bg-theme-neonCyan/10 border-2 border-theme-neonCyan/40 flex items-center justify-center animate-pulse">
            <Camera className="w-12 h-12 text-theme-neonCyan" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">مطلوب وصول للكاميرا 📷</h2>
            <p className="text-slate-400 text-sm max-w-xs">
              هذا الاختبار يتطلب تشغيل الكاميرا لمراقبة الطالب وضمان نزاهة الامتحان.
              سيطلب المتصفح إذنك — اضغط <strong className="text-white">"Allow / السماح"</strong> عند ظهور النافذة.
            </p>
          </div>

          {/* تعليمة بصرية */}
          <div className="bg-slate-900 border border-theme-neonCyan/20 rounded-xl p-4 max-w-sm text-right space-y-2">
            <p className="text-theme-neonCyan font-semibold text-sm">📌 كيف تسمح بالكاميرا؟</p>
            <p className="text-slate-300 text-sm">① سيظهر مربع أذونات أعلى المتصفح</p>
            <p className="text-slate-300 text-sm">② اضغط على <span className="text-green-400 font-bold">Allow / السماح</span></p>
            <p className="text-slate-300 text-sm">③ ستبدأ الكاميرا وينطلق الاختبار تلقائياً</p>
          </div>

          {/* زر الطلب */}
          <button
            onClick={requestCameraAndStart}
            disabled={isRequestingCamera}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-theme-neonCyan to-emerald-400 text-slate-900 rounded-xl text-lg font-bold shadow-glow-cyan hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:cursor-wait"
          >
            {isRequestingCamera ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                جاري طلب الإذن...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                السماح بالكاميرا وبدء الاختبار
              </>
            )}
          </button>

          {/* زر تخطي (لو مش عنده كاميرا) */}
          <button
            onClick={() => setCameraStep('denied')}
            className="text-slate-500 hover:text-slate-300 text-xs underline transition-colors"
          >
            ليس لديّ كاميرا — ابدأ بدونها
          </button>
        </div>
      );
    }

    // ── شاشة البداية العادية (بعد الكاميرا أو للكويز العادي) ──
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-950 rounded-xl border border-white/5 shadow-glow-purple p-8 gap-6 text-center" dir="rtl">
        {/* أيقونة */}
        <div className="w-20 h-20 rounded-full bg-theme-accent/10 border border-theme-accent/30 flex items-center justify-center mb-2">
          <ShieldAlert className="w-10 h-10 text-theme-accent" />
        </div>

        {/* عنوان وتفاصيل الاختبار */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{quiz.title}</h2>
          <p className="text-slate-400 text-sm">
            {quiz.questions.length} أسئلة • درجة النجاح: {quiz.passScore}%
            {quiz.type === 'dictation' && ' • مدة الاختبار: 10 دقائق'}
          </p>
        </div>

        {/* تعليمات الأمان */}
        <div className="bg-slate-900/80 border border-yellow-500/20 rounded-xl p-4 max-w-sm text-right space-y-2">
          <p className="text-yellow-400 font-semibold text-sm mb-3 flex items-center gap-2 justify-end">
            <span>تعليمات مهمة قبل البدء</span>
            <ShieldAlert className="w-4 h-4" />
          </p>
          <p className="text-slate-300 text-sm">🔒 يجب إبقاء التركيز على صفحة الاختبار دائماً</p>
          <p className="text-slate-300 text-sm">👁️ أي تبديل للتبويبات سيُسجَّل كمحاولة غش</p>
          <p className="text-slate-300 text-sm">⚠️ بعد 3 تحذيرات سيُسلَّم الاختبار تلقائياً</p>
          <p className="text-slate-300 text-sm">🚫 النسخ واللصق وأدوات المطوّر معطّلة</p>
          {cameraStep === 'denied' && (
            <p className="text-orange-400 text-sm flex items-center gap-1 justify-end">
              <CameraOff className="w-3.5 h-3.5" />
              الكاميرا غير مفعّلة — سيعمل نظام المراقبة بدونها
            </p>
          )}
        </div>

        {/* زر البدء */}
        <button
          id="start-quiz-btn"
          onClick={handleStartQuiz}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-theme-accent to-theme-neonCyan text-slate-900 rounded-xl text-lg font-bold shadow-glow-cyan hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Maximize className="w-5 h-5" />
          ابدأ الاختبار الآن
        </button>
      </div>
    );
  }

  // ─── الاختبار الرئيسي ─────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col min-h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-glow-purple relative ${isExam ? 'select-none' : ''}`}>

      {/* ── كاميرا المراقبة ── */}
      {isExam && !isBlocked && !result && !reviewAnswers && quizStarted && (
        <CameraProctor onLookAway={triggerLookAwayWarning} enabled={true} />
      )}

      {/* ── الـ Overlay (يظهر عند محاولة الغش أو الخروج من الصفحة) ── */}
      {isBlocked && (
        <div className="absolute inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
          <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center mb-6 animate-pulse">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">تم إخفاء الاختبار</h2>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-lg mb-8">
            <p className="text-red-400 text-lg whitespace-pre-line leading-relaxed">
              {warningText}
            </p>
          </div>
          
          <button
            onClick={resumeQuiz}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
          >
            <Maximize className="w-5 h-5" />
            العودة للاختبار
          </button>
          
          <p className="mt-6 text-slate-400 text-sm animate-pulse">
            يُرجى الضغط على الزر للعودة للصفحة ليعود الاختبار للظهور...
          </p>
        </div>
      )}

      {/* ── شريط حالة الأمان والمؤقت ── */}
      {(isExam || timeLeft !== null) && (
        <div className="bg-slate-900/90 backdrop-blur border-b border-white/5 px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-xs" dir="rtl">
          <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3">
            {/* حالة المراقبة */}
            {isExam && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldAlert className="w-3 h-3" />
                المراقبة نشطة
              </span>
            )}
            
            {/* مؤقت التسميع */}
            {timeLeft !== null && (
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium tracking-widest ${
                timeLeft < 60 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                  : 'bg-theme-neonCyan/10 text-theme-neonCyan border border-theme-neonCyan/30'
              }`}>
                <Clock className="w-3 h-3" />
                <span className="font-mono text-[14px]">
                  {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </span>
            )}
          </div>

          {/* عداد التبديل والابتعاد */}
          {isExam && (
            <div className="flex flex-wrap justify-center items-center gap-2">
              {/* عداد تبديل التبويبات */}
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${
                switchCount === 0
                  ? 'bg-slate-800 text-slate-400 border border-white/5'
                  : switchCount >= 2
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                  : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
              }`}>
                <ShieldAlert className="w-3 h-3" />
                تحذيرات الخروج: {switchCount} / 3
              </span>

              {/* عداد ابتعاد الماوس/النظر */}
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${
                lookAwayCount === 0
                  ? 'bg-slate-800 text-slate-400 border border-white/5'
                  : lookAwayCount >= 2
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              }`}>
                <ShieldAlert className="w-3 h-3" />
                تشتت الانتباه: {lookAwayCount} / 3
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quiz Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-4 py-3 md:p-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base md:text-xl font-bold text-theme-neonCyan truncate">{quiz.title}</h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm mt-0.5">
            {quiz.questions.length} أسئلة • درجة النجاح: {quiz.passScore}%
          </p>
        </div>
        <div className="bg-theme-accent/10 border border-theme-accent/30 text-theme-accent px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold shrink-0">
          مجاب: {Object.keys(answers).length} / {quiz.questions.length}
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-8 custom-scrollbar">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-3 md:p-5 rounded-2xl">
            <div className="flex gap-3 mb-4">
              <span className="shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-theme-accent text-slate-900 dark:text-white flex items-center justify-center font-bold shadow-lg text-sm">
                {idx + 1}
              </span>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">{q.questionText}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">{q.points} نقاط</span>
              </div>
            </div>

            {quiz.type === 'dictation' ? (
              <div className="mt-3">
                <input
                  type="text"
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => handleOptionSelect(q.id, e.target.value)}
                  placeholder="اكتب الكلمة بالإنجليزية..."
                  dir="ltr"
                  className="w-full text-left bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-3 md:p-4 text-slate-900 dark:text-white focus:border-theme-neonCyan focus:ring-1 focus:ring-theme-neonCyan transition-all outline-none text-base md:text-lg font-medium"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 mt-3">
                {(q.shuffledOptions || []).map((opt) => {
                  const isSelected = answers[q.id] === opt.originalIndex;
                  return (
                    <button
                      key={opt.originalIndex}
                      onClick={() => handleOptionSelect(q.id, opt.originalIndex)}
                      className={`text-right p-3 md:p-4 rounded-xl border transition-all duration-300 ${
                        isSelected
                          ? 'bg-theme-accent/20 border-theme-accent text-slate-900 dark:text-white shadow-glow-purple'
                          : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-theme-neonCyan bg-theme-neonCyan/20' : 'border-slate-500'
                        }`}>
                          {isSelected && <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-theme-neonCyan" />}
                        </div>
                        <span className="font-medium text-sm md:text-base">{opt.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 p-3 md:p-4 flex justify-center md:justify-end">
        <button
          id="submit-quiz-btn"
          onClick={handleSubmit}
          disabled={isSubmitting || Object.keys(answers).length === 0}
          className="w-full md:w-auto bg-gradient-to-r from-theme-accent to-theme-neonCyan text-slate-900 dark:text-white px-6 md:px-8 py-3 rounded-xl font-bold shadow-glow-cyan hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جاري التسليم...
            </>
          ) : (
            'تسليم الاختبار'
          )}
        </button>
      </div>
    </div>
  );
};

export default QuizComponent;
