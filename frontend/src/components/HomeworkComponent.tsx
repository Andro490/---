import { useState, useEffect } from 'react';
import api from '../services/api';
import { CheckCircle, XCircle, BookMarked, RefreshCw } from 'lucide-react';

interface Question {
  id: string;
  questionText: string;
  options: string[];
  points: number;
}

interface Homework {
  id: string;
  title: string;
  passScore: number;
  questions: Question[];
}

interface HomeworkResult {
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

interface HomeworkComponentProps {
  lessonId: string;
  onComplete?: () => void;
  reviewAnswers?: Record<string, number>;
}

const HomeworkComponent = ({ lessonId, onComplete, reviewAnswers }: HomeworkComponentProps) => {
  const [homework, setHomework] = useState<Homework | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>(reviewAnswers || {});
  const [isSubmitting, setIsSubmitting] = useState(!!reviewAnswers);
  const [result, setResult] = useState<HomeworkResult | null>(null);

  const fetchHomework = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});
    try {
      const res = await api.get(`/courses/lessons/${lessonId}/homework`);
      setHomework(res.data.homework);
    } catch (err: any) {
      setError(err.response?.data?.message || 'تعذر تحميل الواجب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHomework(); }, [lessonId]);

  const handleOptionSelect = (questionId: string, optionIndex: number) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };


  useEffect(() => {
    if (homework && reviewAnswers && !result) {
      submitHomeworkData(reviewAnswers);
    }
  }, [homework]);

  const submitHomeworkData = async (answersToSubmit: Record<string, number>) => {
    if (!homework) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/courses/lessons/${lessonId}/homework/submit`, { answers: answersToSubmit });
      setResult(res.data);
      if (onComplete && !reviewAnswers) onComplete();
    } catch {
      alert('حدث خطأ أثناء تحميل نتيجة الواجب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!homework) return;
    if (Object.keys(answers).length < homework.questions.length) {
      alert('الرجاء الإجابة على جميع أسئلة الواجب قبل التسليم.');
      return;
    }
    await submitHomeworkData(answers);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-amber-400">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
        <p>جاري تحميل الواجب...</p>
      </div>
    );
  }

  if (error || !homework) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-400 gap-3">
        <XCircle className="w-12 h-12" />
        <p>{error || 'لم يتم العثور على الواجب'}</p>
        <button onClick={fetchHomework} className="mt-4 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white hover:bg-slate-700">إعادة المحاولة</button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex flex-col bg-white dark:bg-slate-900 rounded-xl p-6 md:p-10 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 border-4 ${result.passed ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
            {result.passed ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {result.passed ? 'أحسنت! تم تسليم الواجب بنجاح' : 'للأسف لم تجتز الواجب هذه المرة'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            لقد حصلت على <strong className="text-amber-400">{result.score}%</strong> (الدرجة المطلوبة: {homework.passScore}%)
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">مجموع النقاط: {result.earnedPoints} من {result.totalPoints}</p>
        </div>

        {/* ✅ مراجعة الإجابات تظهر فقط في وضع المراجعة (من صفحة Exam Results) */}
        {reviewAnswers ? (
          <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/5 pb-3">مراجعة الإجابات:</h3>
            {homework.questions.map((q, idx) => {
              const answerRes = result.results.find(r => r.questionId === q.id);
              const isCorrect = answerRes?.isCorrect;
              return (
                <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex gap-3 mb-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">{idx + 1}</span>
                    <p className="text-slate-900 dark:text-white font-medium">{q.questionText}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = answers[q.id] === optIdx;
                      const isActualCorrect = answerRes?.correctOption === optIdx;
                      let bgClass = 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400';
                      if (isActualCorrect) bgClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold';
                      else if (isSelected && !isActualCorrect) bgClass = 'bg-red-500/20 border-red-500/50 text-red-400';
                      return (
                        <div key={optIdx} className={`p-2.5 rounded-lg border text-sm flex items-center justify-between ${bgClass}`}>
                          <span>{opt}</span>
                          {isActualCorrect && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                          {isSelected && !isActualCorrect && <XCircle className="w-4 h-4 text-red-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ✅ بعد التسليم العادي: رسالة توجيهية بدلاً من الإجابات
          <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10">
            <CheckCircle className="w-12 h-12 text-amber-400 mb-3 opacity-60" />
            <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
              لمراجعة إجاباتك والاطلاع على الإجابات الصحيحة،
            </p>
            <p className="text-amber-400 font-semibold text-sm mt-1">
              اذهب إلى: لوحة الطالب → Homework Results → Review correct answers
            </p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-300 dark:border-white/10 flex justify-center">
          {!reviewAnswers && (
            <button
              onClick={fetchHomework}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl transition-all font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة الواجب
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.08)]">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-amber-500/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookMarked className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-amber-400">{homework.title}</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            يحتوي هذا الواجب على {homework.questions.length} أسئلة • درجة النجاح: {homework.passScore}%
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-lg text-sm font-bold shrink-0 text-center">
          مجاب: {Object.keys(answers).length} / {homework.questions.length}
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {homework.questions.map((q, idx) => (
          <div key={q.id} className="bg-white dark:bg-slate-900/50 border border-amber-500/10 p-5 rounded-2xl">
            <div className="flex gap-4 mb-5">
              <span className="shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-bold shadow-lg">
                {idx + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">{q.questionText}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 block">{q.points} نقاط</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
              {q.options.map((opt, optIdx) => {
                const isSelected = answers[q.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleOptionSelect(q.id, optIdx)}
                    className={`text-right p-4 rounded-xl border transition-all duration-300 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-[1.02]'
                        : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-amber-400 bg-amber-400/20' : 'border-slate-500'}`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
                      </div>
                      <span className="font-medium">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-slate-900 border-t border-amber-500/10 p-4 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || Object.keys(answers).length === 0}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 dark:text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جاري التسليم...
            </>
          ) : 'تسليم الواجب'}
        </button>
      </div>
    </div>
  );
};

export default HomeworkComponent;
