/**
 * QuizSecurityWrapper Component
 * ==============================
 * مثال كامل يوضح كيفية ربط useQuizSecurity بزر "ابدأ الاختبار"
 * ودالة التسليم التلقائي.
 *
 * قم باستيراد هذا الـ wrapper في صفحة الاختبار الخاصة بك وأحطه
 * بمحتوى الاختبار.
 */

import React, { useState } from 'react';
import { useQuizSecurity } from '../hooks/useQuizSecurity';

// ─── نوع الخاصيات ────────────────────────────────────────────────────────────

interface QuizSecurityWrapperProps {
  /** المحتوى الذي يظهر أثناء الاختبار (الأسئلة، إلخ) */
  children: React.ReactNode;
  /** دالة التسليم الرسمية (ترسل الإجابات للـ API) */
  onSubmit: () => void | Promise<void>;
}

// ─── المكوّن ─────────────────────────────────────────────────────────────────

export const QuizSecurityWrapper: React.FC<QuizSecurityWrapperProps> = ({
  children,
  onSubmit,
}) => {
  const [quizStarted, setQuizStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── دالة التسليم المشتركة (يدوية أو تلقائية) ──────────────────────────────
  const handleAutoSubmit = async () => {
    if (submitted) return; // منع التسليم المزدوج
    setSubmitted(true);
    await onSubmit();
  };

  // ── تفعيل الـ Hook ─────────────────────────────────────────────────────────
  const { startQuiz, switchCount } = useQuizSecurity({
    onAutoSubmit: handleAutoSubmit,
    switchLimit: 3, // غيّر هذا الرقم حسب احتياجك
  });

  // ── بدء الاختبار ───────────────────────────────────────────────────────────
  const handleStartQuiz = () => {
    startQuiz();       // يدخل في وضع ملء الشاشة ويبدأ المراقبة
    setQuizStarted(true);
  };

  // ── التسليم اليدوي ─────────────────────────────────────────────────────────
  const handleManualSubmit = async () => {
    if (submitted) return;
    const confirmed = window.confirm('هل أنت متأكد من تسليم الاختبار الآن؟');
    if (confirmed) {
      setSubmitted(true);
      await onSubmit();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-gray-900 text-white" dir="rtl">

      {/* ── شاشة البداية ── */}
      {!quizStarted && !submitted && (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
          <h1 className="text-4xl font-bold text-purple-400">جاهز للاختبار؟</h1>
          <p className="text-gray-300 text-center max-w-md">
            يجب إبقاء التركيز على صفحة الاختبار دائماً. أي محاولة للخروج أو التبديل
            بين النوافذ ستُسجَّل وقد تؤدي إلى تسليم اختبارك تلقائياً.
          </p>

          {/* ── زر "ابدأ الاختبار" ── */}
          <button
            id="start-quiz-btn"
            onClick={handleStartQuiz}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-xl
                       font-bold transition-all duration-300 hover:scale-105 active:scale-95
                       shadow-lg shadow-purple-900/50"
          >
            🚀 ابدأ الاختبار
          </button>
        </div>
      )}

      {/* ── محتوى الاختبار ── */}
      {quizStarted && !submitted && (
        <>
          {/* شريط الحالة العلوي */}
          <div
            className="sticky top-0 z-50 flex items-center justify-between
                        bg-gray-800/80 backdrop-blur px-6 py-3 border-b border-gray-700"
          >
            <div className="flex items-center gap-3">
              {/* حالة المراقبة */}
              <span className="text-sm px-3 py-1 rounded-full bg-green-900/50 text-green-400">
                🔒 المراقبة نشطة
              </span>

              {/* عداد التبديل */}
              <span className="text-sm px-3 py-1 rounded-full bg-red-900/50 text-red-400">
                تحذيرات: {switchCount} / 3
              </span>
            </div>

            {/* زر التسليم اليدوي */}
            <button
              id="submit-quiz-btn"
              onClick={handleManualSubmit}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm
                         font-semibold transition-all duration-200"
            >
              تسليم الاختبار
            </button>
          </div>

          {/* محتوى الأسئلة */}
          <div className="p-6">{children}</div>
        </>
      )}

      {/* ── شاشة ما بعد التسليم ── */}
      {submitted && (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="text-6xl">✅</div>
          <h2 className="text-3xl font-bold text-green-400">تم تسليم الاختبار</h2>
          <p className="text-gray-400">سيتم مراجعة إجاباتك قريباً.</p>
        </div>
      )}
    </div>
  );
};

export default QuizSecurityWrapper;
