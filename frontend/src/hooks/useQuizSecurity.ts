/**
 * useQuizSecurity Hook — v2
 * =========================
 * نظام حماية الاختبار المتكامل:
 *
 * 1. Fullscreen API  — إجبار المتصفح على ملء الشاشة
 * 2. Overlay System  — إخفاء الاختبار عند الخروج أو تبديل التبويب
 * 3. Warning Counter — عدّاد التحذيرات (يُسلَّم تلقائياً عند التجاوز)
 * 4. Anti-Cheat     — تعطيل النسخ/اللصق والنقر الأيمن وDevTools
 *
 * الـ States المُرجَعة:
 *   startQuiz()   — استدعِها عند الضغط على "ابدأ الاختبار"
 *   isBlocked     — true  → أظهر الـ Overlay
 *   isFullscreen  — true  → المتصفح في وضع ملء الشاشة
 *   switchCount   — عدد مرات الانتهاك المُسجَّلة
 *   warningText   — نص التحذير المناسب للعرض في الـ Overlay
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── الأنواع ────────────────────────────────────────────────────────────────

interface UseQuizSecurityOptions {
  /** الدالة التي تُستدعى تلقائياً عند تجاوز حد الانتهاكات */
  onAutoSubmit: () => void;
  /** عدد الانتهاكات المسموح بها قبل التسليم التلقائي (الافتراضي: 3) */
  switchLimit?: number;
  /** تفعيل أو تعطيل وضع الحماية (مفيد للاختبارات العادية التي لا تحتاج قيود) */
  enabled?: boolean;
}

interface UseQuizSecurityReturn {
  /** استدعاء هذه الدالة عند الضغط على زر "ابدأ الاختبار" */
  startQuiz: () => void;
  /** true = يجب إظهار الـ Overlay الآن */
  isBlocked: boolean;
  /** عدد مرات الانتهاك المُسجَّلة */
  switchCount: number;
  /** نص التحذير يُعرَض داخل الـ Overlay */
  warningText: string;
  /** إعادة محاولة دخول ملء الشاشة لإخفاء الـ Overlay */
  resumeQuiz: () => void;
}

// ─── الـ Hook الرئيسي ────────────────────────────────────────────────────────

export function useQuizSecurity({
  onAutoSubmit,
  switchLimit = 3,
  enabled = true,
}: UseQuizSecurityOptions): UseQuizSecurityReturn {

  const [isBlocked, setIsBlocked]     = useState(false);
  const [switchCount, setSwitchCount] = useState(0);
  const [warningText, setWarningText] = useState('');

  // Refs — نقرأ منها داخل event listeners بدون إعادة تسجيلها
  const isBlockedRef       = useRef(false);
  const switchCountRef     = useRef(0);
  const isQuizActiveRef    = useRef(false);
  const onAutoSubmitRef    = useRef(onAutoSubmit);
  const autoSubmitCalledRef = useRef(false); // منع التسليم المزدوج

  useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);

  // ─── تم إزالة Fullscreen API بناءً على طلبك ────────────────────────────────

  // ─── 2. منطق الـ Overlay (القلب الرئيسي) ────────────────────────────────

  /**
   * evaluateBlockState
   * ------------------
   * تُحدد إذا كان يجب إظهار الـ Overlay أم إخفاؤه.
   * تُستدعى من كل من visibilitychange و fullscreenchange.
   */
  const evaluateBlockState = useCallback(() => {
    if (!enabled || !isQuizActiveRef.current) return;

    const isTabHidden    = document.hidden;
    const isNotFocused    = !document.hasFocus();

    // يجب الحجب إذا كان التبويب مخفياً أو فقدت الصفحة التركيز
    const shouldBlock = isTabHidden || isNotFocused;

    if (shouldBlock && !isBlockedRef.current) {
      // ── انتقال جديد من مفتوح → محجوب: سجّل الانتهاك ──
      isBlockedRef.current = true;
      setIsBlocked(true);

      const newCount = switchCountRef.current + 1;
      switchCountRef.current = newCount;
      setSwitchCount(newCount);

      if (newCount >= switchLimit) {
        // آخر انتهاك → حجب نهائي + تسليم تلقائي بعد ثانيتين
        setWarningText(
          `⛔ تجاوزت الحد المسموح به (${switchLimit} انتهاكات)\n` +
          `سيتم تسليم اختبارك تلقائياً خلال ثانيتين...`
        );
        if (!autoSubmitCalledRef.current) {
          autoSubmitCalledRef.current = true;
          isQuizActiveRef.current = false;
          setTimeout(() => onAutoSubmitRef.current(), 2000);
        }
      } else {
        const remaining = switchLimit - newCount;
        setWarningText(
          `⚠️ انتهاك ${newCount} من ${switchLimit}\n` +
          `تم إخفاء الاختبار. يُرجى العودة للصفحة للمتابعة.\n` +
          `(متبقي: ${remaining} ${remaining === 1 ? 'محاولة' : 'محاولات'})`
        );
      }

    } else if (!shouldBlock && isBlockedRef.current) {
      // ── عاد الطالب: أزل الحجب ──
      isBlockedRef.current = false;
      setIsBlocked(false);
      setWarningText('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switchLimit, enabled]);

  // ─── 3. Page Visibility API و Window Focus ──────────────────────────────

  useEffect(() => {
    if (!enabled) return;
    
    const handleStateChange = () => {
      if (!isQuizActiveRef.current) return;
      evaluateBlockState();

      // لا نقوم بإعادة ملء الشاشة لأنه تم إزالة هذه الخاصية
    };

    document.addEventListener('visibilitychange', handleStateChange);
    window.addEventListener('blur', handleStateChange);
    window.addEventListener('focus', handleStateChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleStateChange);
      window.removeEventListener('blur', handleStateChange);
      window.removeEventListener('focus', handleStateChange);
    };
  }, [evaluateBlockState, enabled]);

  // ─── 4. تعطيل أدوات الغش ─────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) return;
    const preventContextMenu = (e: MouseEvent) => {
      if (isQuizActiveRef.current) e.preventDefault();
    };

    const preventShortcuts = (e: KeyboardEvent) => {
      if (!isQuizActiveRef.current) return;
      const blocked = ['c', 'v', 'x', 'u', 'a', 's', 'p'];
      if ((e.ctrlKey || e.metaKey) && blocked.includes(e.key.toLowerCase())) {
        e.preventDefault(); return;
      }
      if (e.key === 'F12' || e.key === 'F11') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    const preventDrag = (e: DragEvent) => {
      if (isQuizActiveRef.current) e.preventDefault();
    };

    const preventSelectAndCopy = (e: Event) => {
      if (isQuizActiveRef.current) e.preventDefault();
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown',     preventShortcuts);
    document.addEventListener('dragstart',   preventDrag);
    document.addEventListener('selectstart', preventSelectAndCopy);
    document.addEventListener('copy',        preventSelectAndCopy);
    document.addEventListener('cut',         preventSelectAndCopy);
    document.addEventListener('paste',       preventSelectAndCopy);
    
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown',     preventShortcuts);
      document.removeEventListener('dragstart',   preventDrag);
      document.removeEventListener('selectstart', preventSelectAndCopy);
      document.removeEventListener('copy',        preventSelectAndCopy);
      document.removeEventListener('cut',         preventSelectAndCopy);
      document.removeEventListener('paste',       preventSelectAndCopy);
    };
  }, [enabled]);

  // ─── 5. دالة البدء ───────────────────────────────────────────────────────

  const startQuiz = useCallback(() => {
    switchCountRef.current    = 0;
    autoSubmitCalledRef.current = false;
    isQuizActiveRef.current   = true;
    isBlockedRef.current      = false;
    setSwitchCount(0);
    setIsBlocked(false);
    setWarningText('');
  }, []);

  const resumeQuiz = useCallback(() => {
    isBlockedRef.current = false;
    setIsBlocked(false);
    setWarningText('');
  }, []);

  return { startQuiz, resumeQuiz, isBlocked, switchCount, warningText };
}
