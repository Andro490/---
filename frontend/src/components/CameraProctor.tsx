/**
 * CameraProctor v4 — نظام مراقبة الكاميرا
 * الإصلاح: كل المنطق في useEffect واحد متسلسل
 */
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CameraOff, Loader2, Eye } from 'lucide-react';

interface CameraProctorProps {
  onLookAway: () => void;
  enabled: boolean;
}

const MODEL_URL = '/models';

const CameraProctor: React.FC<CameraProctorProps> = ({ onLookAway, enabled }) => {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const missedRef   = useRef(0);
  const lastWarnRef = useRef(0);
  const onLookRef   = useRef(onLookAway);
  onLookRef.current = onLookAway; // always fresh

  const [phase, setPhase]           = useState<'init'|'ready'|'error'>('init');
  const [errorMsg, setErrorMsg]     = useState('');
  const [gazeWarn, setGazeWarn]     = useState(false);
  const [scoreText, setScoreText]   = useState('...');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = async () => {
      // 1️⃣ تحميل النماذج
      try {
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        }
      } catch (e: any) {
        if (!cancelled) { setPhase('error'); setErrorMsg('فشل تحميل نموذج الكشف'); }
        return;
      }

      // 2️⃣ فتح الكاميرا
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
      } catch (e: any) {
        if (!cancelled) {
          setPhase('error');
          setErrorMsg(e.name === 'NotAllowedError' ? 'الكاميرا محظورة — اسمح لها من المتصفح' : `خطأ: ${e.message}`);
        }
        return;
      }

      // 3️⃣ ربط الكاميرا بعنصر الفيديو
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

      const video = videoRef.current!;
      video.srcObject = stream;
      await new Promise<void>((res) => { video.onloadedmetadata = () => res(); });
      await video.play();
      if (cancelled) return;

      setPhase('ready');

      // 4️⃣ حلقة الكشف كل 500ms
      timerRef.current = setInterval(async () => {
        if (cancelled) return;
        if (!video || video.paused || video.ended || video.readyState < 3) return;

        try {
          const det = await faceapi.detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.25 })
          );

          if (!det) {
            missedRef.current += 1;
            setScoreText('❌ لا وجه');
          } else {
            const pct = Math.round(det.score * 100);
            setScoreText(`✅ ${pct}%`);
            // score منخفض = الوش بيتلوي = احتمال غش
            if (det.score < 0.40) {
              missedRef.current += 1;
            } else {
              missedRef.current = 0;
              setGazeWarn(false);
            }
          }

          // 4 فريمات متتالية (~2 ثانية) → تحذير (وانتظر 5 ثوانٍ قبل التالي)
          if (missedRef.current >= 4) {
            const now = Date.now();
            if (now - lastWarnRef.current > 5000) {
              lastWarnRef.current = now;
              missedRef.current = 0;
              setGazeWarn(true);
              onLookRef.current();
              setTimeout(() => setGazeWarn(false), 2500);
            } else {
              missedRef.current = 0;
            }
          }
        } catch {
          // تجاهل أخطاء عابرة في الكشف
        }
      }, 500);
    };

    run();

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className={`fixed bottom-4 right-4 w-44 rounded-xl overflow-hidden z-50 shadow-xl border-2 transition-all duration-500 ${
      gazeWarn
        ? 'border-red-500 shadow-red-500/60 scale-105'
        : phase === 'ready'
        ? 'border-emerald-500/70 shadow-emerald-500/20'
        : 'border-slate-600'
    } bg-slate-950`}>

      {/* ─── الفيديو — دايماً في DOM ─────────────────────────────── */}
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ display: phase === 'ready' ? 'block' : 'none' }}
        className="w-full h-36 object-cover scale-x-[-1]"
      />

      {/* ─── Loading ─────────────────────────────────────────────── */}
      {phase === 'init' && (
        <div className="h-36 flex flex-col items-center justify-center gap-2 text-theme-neonCyan">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-[9px] font-semibold text-center px-2 leading-tight">
            جاري تهيئة الكاميرا...
          </span>
        </div>
      )}

      {/* ─── Error ───────────────────────────────────────────────── */}
      {phase === 'error' && (
        <div className="h-36 flex flex-col items-center justify-center gap-2 p-2 text-center text-red-400">
          <CameraOff className="w-7 h-7" />
          <span className="text-[9px] font-bold leading-tight">{errorMsg}</span>
        </div>
      )}

      {/* ─── Overlays فوق الفيديو ────────────────────────────────── */}
      {phase === 'ready' && (
        <>
          {/* شارة الحالة */}
          <div className={`absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-sm ${
            gazeWarn ? 'bg-red-600/90 text-white' : 'bg-emerald-600/80 text-white'
          }`}>
            {gazeWarn
              ? <><span className="w-1.5 h-1.5 bg-white rounded-full animate-ping inline-block mr-0.5" />تحذير!</>
              : <><Eye className="w-2.5 h-2.5" />&nbsp;مراقب</>
            }
          </div>

          {/* نتيجة الكشف (للتطوير) */}
          <div className="absolute bottom-1 left-1 text-[8px] text-white/40 font-mono select-none">
            {scoreText}
          </div>

          <div className="absolute bottom-1.5 right-1.5 bg-black/40 rounded-full p-0.5">
            <Camera className="w-3 h-3 text-white/50" />
          </div>
        </>
      )}
    </div>
  );
};

export default CameraProctor;
