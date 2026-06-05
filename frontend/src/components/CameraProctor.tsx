import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CameraOff, Loader2 } from 'lucide-react';

interface CameraProctorProps {
  onLookAway: () => void;
  enabled: boolean;
}

const CameraProctor: React.FC<CameraProctorProps> = ({ onLookAway, enabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const trackingIntervalRef = useRef<any>(null);
  const faceLostFramesRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const initModelsAndCamera = async () => {
      try {
        setIsInitializing(true);
        // Load the tiny face detector model from CDN
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (err) {
        console.error("Camera access denied or model load failed:", err);
        setHasCameraPermission(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initModelsAndCamera();

    return () => {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled]);

  const handleVideoPlay = () => {
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);

    trackingIntervalRef.current = setInterval(async () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        try {
          const detection = await faceapi.detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })
          );

          if (!detection) {
            faceLostFramesRef.current += 1;
            // 3 frames (approx 1.5 seconds) without detecting a face
            if (faceLostFramesRef.current >= 3) {
              onLookAway();
              faceLostFramesRef.current = 0; // Reset after firing
            }
          } else {
            faceLostFramesRef.current = 0; // Reset if face is found
          }
        } catch (e) {
          console.error("Face detection error", e);
        }
      }
    }, 500);
  };

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 w-40 h-32 bg-slate-900 border-2 border-theme-neonCyan rounded-xl overflow-hidden shadow-glow-cyan z-50 flex items-center justify-center">
      {isInitializing ? (
        <div className="flex flex-col items-center text-theme-neonCyan gap-2 p-2 text-center">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-[10px] font-semibold">جاري تهيئة الكاميرا...</span>
        </div>
      ) : hasCameraPermission === false ? (
        <div className="flex flex-col items-center text-red-400 gap-2 p-2 text-center">
          <CameraOff className="w-6 h-6" />
          <span className="text-[10px] font-semibold">تأكد من تفعيل الكاميرا</span>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onPlay={handleVideoPlay}
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <div className="absolute top-2 left-2 bg-emerald-500/20 text-emerald-400 p-1 rounded-full">
            <Camera className="w-3 h-3" />
          </div>
        </>
      )}
    </div>
  );
};

export default CameraProctor;
