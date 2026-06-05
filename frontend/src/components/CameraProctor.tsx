/**
 * CameraProctor v5 — كشف اتجاه الوجه (يمين / شمال / تحت)
 * يستخدم Face Landmarks لحساب زاوية الرأس بدقة
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
  onLookRef.current = onLookAway;

  const [phase, setPhase]         = useState<'init' | 'ready' | 'error'>('init');
  const [errorMsg, setErrorMsg]   = useState('');
  const [gazeWarn, setGazeWarn]   = useState(false);
  const [debugText, setDebugText] = useState('...');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = async () => {
      // ─── 1) تحميل النموذجين ───────────────────────────────────────────────
      try {
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        }
        if (!faceapi.nets.faceLandmark68TinyNet.isLoaded) {
          await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
        }
      } catch (e: any) {
        if (!cancelled) { setPhase('error'); setErrorMsg('فشل تحميل النماذج'); }
        return;
      }

      // ─── 2) فتح الكاميرا ─────────────────────────────────────────────────
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
          setErrorMsg(e.name === 'NotAllowedError'
            ? 'الكاميرا محظورة — اسمح لها من المتصفح'
            : `خطأ: ${e.message}`
          );
        }
        return;
      }

      // ─── 3) تشغيل الفيديو ────────────────────────────────────────────────
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      const video = videoRef.current!;
      video.srcObject = stream;
      await new Promise<void>(res => { video.onloadedmetadata = () => res(); });
      await video.play();
      if (cancelled) return;
      setPhase('ready');

      // ─── 4) حلقة الكشف ───────────────────────────────────────────────────
      timerRef.current = setInterval(async () => {
        if (cancelled || !video || video.paused || video.readyState < 3) return;

        try {
          const result = await faceapi
            .detectSingleFace(video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
            )
            .withFaceLandmarks(true); // true = tiny 68-point model

          if (!result) {
            missedRef.current += 1;
            setDebugText(`❌ لا وجه`);
          } else {
            const pts = result.landmarks.positions;

            // ── حساب YAW ──
            const faceLeft   = pts[0].x;
            const faceRight  = pts[16].x;
            const faceWidth  = faceRight - faceLeft;
            const faceCenter = (faceLeft + faceRight) / 2;
            const noseTip    = pts[30];
            const yaw = Math.abs((noseTip.x - faceCenter) / (faceWidth / 2));

            // ── حساب PITCH ──
            const chinY  = pts[8].y;
            const browY  = pts[27].y;
            const faceH  = chinY - browY;
            const pitch  = (noseTip.y - browY) / faceH;

            // ── حساب EAR ──
            const eyeH = (p: faceapi.Point, q: faceapi.Point) =>
              Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);

            const earLeft = (
              eyeH(pts[37], pts[41]) + eyeH(pts[38], pts[40])
            ) / (2 * eyeH(pts[36], pts[39]));

            const earRight = (
              eyeH(pts[43], pts[47]) + eyeH(pts[44], pts[46])
            ) / (2 * eyeH(pts[42], pts[45]));

            const ear = (earLeft + earRight) / 2;

            // تحديد الحالة - حساسية مفرطة جداً
            const headTurned  = yaw > 0.10;
            const lookingDown = pitch > 0.51; 
            const eyesSquint  = ear < 0.22; 

            const lookingAway = headTurned || lookingDown || eyesSquint;

            if (lookingAway) {
              missedRef.current += 1;
            } else {
              missedRef.current = 0;
              setGazeWarn(false);
            }

            const dir = headTurned  ? `👁 يمين/شمال y=${yaw.toFixed(2)}`
                      : lookingDown  ? `👇 تحت p=${pitch.toFixed(2)}`
                      : eyesSquint   ? `😑 عين ضيقة e=${ear.toFixed(2)}`
                      : `✅ y=${yaw.toFixed(2)} p=${pitch.toFixed(2)}`;

            setDebugText(dir);
          }

          // بمجرد ما يلتفت مرة واحدة (فوري) -> تحذير
          if (missedRef.current >= 1) {
            const now = Date.now();
            if (now - lastWarnRef.current > 4000) {
              lastWarnRef.current = now;
              missedRef.current   = 0;
              setGazeWarn(true);
              onLookRef.current();
              setTimeout(() => setGazeWarn(false), 2500);
            } else {
              missedRef.current = 0;
            }
          }
        } catch (e) {
          console.warn('[CameraProctor] detect:', e);
        }
      }, 250);
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
    <div className={`fixed bottom-4 right-4 w-44 rounded-xl overflow-hidden z-50 shadow-xl border-2 transition-all duration-300 ${
      gazeWarn
        ? 'border-red-500 shadow-red-500/60 scale-105'
        : phase === 'ready'
        ? 'border-emerald-500/70 shadow-emerald-500/20'
        : 'border-slate-600'
    } bg-slate-950`}>

      {/* الفيديو — دايماً في DOM */}
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ display: phase === 'ready' ? 'block' : 'none' }}
        className="w-full h-36 object-cover scale-x-[-1]"
      />

      {phase === 'init' && (
        <div className="h-36 flex flex-col items-center justify-center gap-2 text-theme-neonCyan">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-[9px] font-semibold text-center px-2 leading-tight">
            جاري تهيئة الكاميرا...
          </span>
        </div>
      )}

      {phase === 'error' && (
        <div className="h-36 flex flex-col items-center justify-center gap-2 p-2 text-center text-red-400">
          <CameraOff className="w-7 h-7" />
          <span className="text-[9px] font-bold leading-tight">{errorMsg}</span>
        </div>
      )}

      {phase === 'ready' && (
        <>
          <div className={`absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-sm ${
            gazeWarn ? 'bg-red-600/90 text-white' : 'bg-emerald-600/80 text-white'
          }`}>
            {gazeWarn
              ? <><span className="w-1.5 h-1.5 bg-white rounded-full animate-ping inline-block mr-0.5" />تحذير!</>
              : <><Eye className="w-2.5 h-2.5" />&nbsp;مراقب</>
            }
          </div>

          {/* debug — يُحذف في الإنتاج */}
          <div className="absolute bottom-1 left-1 right-1 text-[7px] text-white/50 font-mono leading-tight truncate">
            {debugText}
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
