/**
 * CameraProctor v3 — كشف الوجه بالكاميرا
 * ==========================================
 * - Video دايماً موجود في الـ DOM (مخفي لحين التجهيز)
 * - يكشف إذا الوجه غاب أو انزاح → يعطي تحذير
 * - يستخدم النماذج المحلية من /public/models
 */
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CameraOff, Loader2, Eye } from 'lucide-react';

interface CameraProctorProps {
  onLookAway: () => void;
  enabled: boolean;
}

const MODEL_URL = '/models';
let modelsLoaded = false;

const CameraProctor: React.FC<CameraProctorProps> = ({ onLookAway, enabled }) => {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const missedRef = useRef(0); // فريمات غياب الوجه المتتالية
  const lastWarnRef = useRef(0); // وقت آخر تحذير (ms)

  const [status, setStatus]           = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg]       = useState('');
  const [gazeWarn, setGazeWarn]       = useState(false);
  const [debugScore, setDebugScore]   = useState<string>('—');

  // ─── Step 1: حمّل النماذج ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const loadModels = async () => {
      if (!modelsLoaded) {
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          modelsLoaded = true;
          console.log('[CameraProctor] ✅ models loaded');
        } catch (e) {
          console.error('[CameraProctor] model load error:', e);
          setStatus('error');
          setErrorMsg('فشل تحميل نماذج الكشف');
        }
      }
    };

    loadModels();
  }, [enabled]);

  // ─── Step 2: بعد ما يُعرض الـ video في DOM → شغّل الكاميرا ────────────────
  useEffect(() => {
    if (!enabled || !modelsLoaded) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;

        // الـ video دايماً موجود في الـ DOM لأننا بنعرضه دايماً
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current!.play().then(() => {
              console.log('[CameraProctor] ✅ camera playing');
              setStatus('ready');
            });
          };
        }
      } catch (err: any) {
        console.error('[CameraProctor] camera error:', err);
        setStatus('error');
        setErrorMsg(
          err.name === 'NotAllowedError'
            ? 'الكاميرا محظورة — اسمح لها من إعدادات المتصفح'
            : `خطأ: ${err.message}`
        );
      }
    };

    startCamera();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [enabled]);

  // ─── Step 3: حلقة الكشف ────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'ready') return;

    timerRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended || video.readyState < 3) return;

      try {
        const result = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
        );

        if (!result) {
          // لا يوجد وجه (غاب أو التفت جداً)
          missedRef.current += 1;
          setDebugScore('❌ لا وجه');
        } else {
          const score = Math.round(result.score * 100);
          setDebugScore(`✅ ${score}%`);

          // لو نتيجة الكشف منخفضة جداً = الوش بيتلوي بعيد
          if (result.score < 0.42) {
            missedRef.current += 1;
          } else {
            // وجه واضح → أعد العداد
            missedRef.current = 0;
            setGazeWarn(false);
          }
        }

        // 4 فريمات متتالية (~2 ثانية) بدون وجه واضح → تحذير
        // ونمنع تكرار التحذير خلال 5 ثوانٍ
        if (missedRef.current >= 4) {
          const now = Date.now();
          if (now - lastWarnRef.current > 5000) {
            lastWarnRef.current = now;
            missedRef.current = 0;
            setGazeWarn(true);
            onLookAway();
            // ابقَ أحمر لمدة 2 ثانية ثم ارجع
            setTimeout(() => setGazeWarn(false), 2000);
          } else {
            missedRef.current = 0; // أعد العداد دون تحذير جديد
          }
        }
      } catch (e) {
        console.warn('[CameraProctor] detect error:', e);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, onLookAway]);

  if (!enabled) return null;

  return (
    <div className={`fixed bottom-4 right-4 w-44 rounded-xl overflow-hidden z-50 shadow-xl border-2 transition-all duration-300 ${
      gazeWarn
        ? 'border-red-500 shadow-red-500/50 animate-pulse'
        : status === 'ready'
        ? 'border-emerald-500/70 shadow-emerald-500/20'
        : 'border-slate-600'
    } bg-slate-950`}>

      {/* ── الفيديو — دايماً موجود في DOM ── */}
      <video
        ref={videoRef}
        muted
        playsInline
        className={`w-full object-cover scale-x-[-1] transition-opacity duration-300 ${
          status === 'ready' ? 'opacity-100 h-36' : 'opacity-0 h-0'
        }`}
      />

      {/* ── Loading ── */}
      {status === 'loading' && (
        <div className="h-36 flex flex-col items-center justify-center gap-2 text-theme-neonCyan">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-[9px] font-semibold text-center px-2 leading-tight">
            جاري تهيئة نظام المراقبة...
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {status === 'error' && (
        <div className="h-36 flex flex-col items-center justify-center gap-2 p-2 text-center text-red-400">
          <CameraOff className="w-7 h-7" />
          <span className="text-[9px] font-bold leading-tight">{errorMsg}</span>
        </div>
      )}

      {/* ── مؤشرات الحالة فوق الفيديو ── */}
      {status === 'ready' && (
        <>
          {/* حالة الكشف */}
          <div className={`absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-sm ${
            gazeWarn
              ? 'bg-red-600/90 text-white'
              : 'bg-emerald-600/80 text-white'
          }`}>
            {gazeWarn
              ? <><span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping" />تحذير!</>
              : <><Eye className="w-2.5 h-2.5" />مراقب</>
            }
          </div>

          {/* نتيجة الكشف (debug صغير) */}
          <div className="absolute bottom-1 left-1 text-[8px] text-white/40 font-mono">
            {debugScore}
          </div>

          {/* أيقونة الكاميرا */}
          <div className="absolute bottom-1.5 right-1.5 bg-black/40 rounded-full p-0.5">
            <Camera className="w-3 h-3 text-white/50" />
          </div>
        </>
      )}
    </div>
  );
};

export default CameraProctor;
