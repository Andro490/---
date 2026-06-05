import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CameraOff, Loader2, Eye } from 'lucide-react';

interface CameraProctorProps {
  onLookAway: () => void;
  enabled: boolean;
}

// ─── نقطة مرجعية لحساب اتجاه الوجه ──────────────────────────────────────────
// Face landmarks indices:
//   Nose tip       = 30
//   Left eye left  = 36, Right eye right = 45
//   Chin           = 8

const MODEL_URL = '/models';
let modelsLoaded = false; // نحمل النماذج مرة واحدة فقط

const CameraProctor: React.FC<CameraProctorProps> = ({ onLookAway, enabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lookAwayFramesRef = useRef(0); // عدد الفريمات المتتالية اللي شاف فيها وش مائل

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [gazeWarning, setGazeWarning] = useState(false); // للإضاءة الحمراء

  // ─── تحميل النماذج ومعالجة الكاميرا ─────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const init = async () => {
      try {
        // 1) حمّل النماذج من public/models (مرة واحدة فقط)
        if (!modelsLoaded) {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          ]);
          modelsLoaded = true;
        }

        // 2) افتح الكاميرا
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus('ready');
      } catch (err: any) {
        console.error('[CameraProctor]', err);
        setStatus('error');
        setErrorMsg(
          err.name === 'NotAllowedError'
            ? 'الكاميرا محظورة من المتصفح'
            : `فشل تحميل الكاميرا: ${err.message}`
        );
      }
    };

    init();

    return () => {
      // cleanup عند إزالة الكومبوننت
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      modelsLoaded = modelsLoaded; // keep models cached
    };
  }, [enabled]);

  // ─── حلقة الكشف (تبدأ بعد تجهيز الكاميرا) ──────────────────────────────
  useEffect(() => {
    if (status !== 'ready') return;

    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended || video.readyState < 2) return;

      // كشف الوجه + 68 نقطة
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.35 }))
        .withFaceLandmarks(true); // true = tiny landmarks

      if (!detection) {
        // لا يوجد وجه → ربما بعيد تماماً
        lookAwayFramesRef.current += 1;
      } else {
        const pts = detection.landmarks.positions;

        // حساب مدى دوران الوجه:
        // نأخذ نقطة طرف الأنف (30) وطرفي العينين (36، 45)
        const noseTip   = pts[30];
        const leftEye   = pts[36];
        const rightEye  = pts[45];

        const eyeCenter = {
          x: (leftEye.x + rightEye.x) / 2,
          y: (leftEye.y + rightEye.y) / 2,
        };

        // الفرق الأفقي: لو الأنف انزاح كتير عن مركز العينين = الوش مائل
        const eyeWidth = Math.abs(rightEye.x - leftEye.x);
        const horizontalShift = Math.abs(noseTip.x - eyeCenter.x) / eyeWidth;

        // الفرق الرأسي: لو الأنف نزل كتير تحت مركز العينين = الوش بيبص تحت
        const faceHeight = Math.abs(pts[8].y - pts[27].y); // chin to nose bridge
        const verticalShift = (noseTip.y - eyeCenter.y) / faceHeight;

        // حدود الكشف:
        //  horizontalShift > 0.35  → الوش بيبص يمين أو شمال (ملزمة)
        //  verticalShift   > 0.55  → الوش بيبص تحت كتير
        const isLookingAway = horizontalShift > 0.35 || verticalShift > 0.55;

        if (isLookingAway) {
          lookAwayFramesRef.current += 1;
        } else {
          lookAwayFramesRef.current = 0; // عاد للشاشة → أعد العداد
          setGazeWarning(false);
        }
      }

      // 4 فريمات متتالية (≈ 2 ثانية) → أعطِ تحذير
      if (lookAwayFramesRef.current >= 4) {
        setGazeWarning(true);
        lookAwayFramesRef.current = 0;
        onLookAway();
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, onLookAway]);

  if (!enabled) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 w-44 h-36 rounded-xl overflow-hidden z-50 shadow-lg border-2 transition-all duration-300 ${
        gazeWarning
          ? 'border-red-500 shadow-red-500/40'
          : status === 'ready'
          ? 'border-emerald-500/60 shadow-emerald-500/20'
          : 'border-slate-600'
      } bg-slate-950`}
    >
      {/* ── شاشة التحميل ── */}
      {status === 'loading' && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-theme-neonCyan">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-[10px] font-semibold text-center px-2">جاري تحميل نظام المراقبة...</span>
        </div>
      )}

      {/* ── خطأ ── */}
      {status === 'error' && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 text-center text-red-400">
          <CameraOff className="w-7 h-7" />
          <span className="text-[9px] font-bold leading-tight">{errorMsg}</span>
        </div>
      )}

      {/* ── الكاميرا الحية ── */}
      {status === 'ready' && (
        <>
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* مؤشر الحالة */}
          <div className={`absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
            gazeWarning ? 'bg-red-500/80 text-white' : 'bg-emerald-500/80 text-white'
          }`}>
            {gazeWarning ? (
              <><span className="animate-ping w-1.5 h-1.5 rounded-full bg-white inline-block" />تحذير!</>
            ) : (
              <><Eye className="w-2.5 h-2.5" />مراقب</>
            )}
          </div>

          {/* أيقونة الكاميرا */}
          <div className="absolute bottom-1.5 right-1.5 bg-black/40 rounded-full p-1">
            <Camera className="w-3 h-3 text-white/60" />
          </div>
        </>
      )}
    </div>
  );
};

export default CameraProctor;
