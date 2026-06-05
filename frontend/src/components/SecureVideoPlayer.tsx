import { useRef, useEffect, type FC } from 'react';
import { useVideoProtection } from '../hooks/useVideoProtection';
import { Maximize, ShieldAlert } from 'lucide-react';
import DynamicWatermark from './DynamicWatermark';

interface SecureVideoPlayerProps {
  videoUrl: string;
  platformType?: string;
  onVideoEnd?: () => void;
}

const SecureVideoPlayer: FC<SecureVideoPlayerProps> = ({ videoUrl, platformType, onVideoEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isProtected } = useVideoProtection();

  // --- 🔒 منع كليك يمين واختصارات أدوات المطورين ---
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') e.preventDefault();
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
      if (e.ctrlKey && (e.key === 'u' || e.key === 's')) e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // --- إيقاف الفيديو المحلي عند تفعيل الحماية ---
  // ملاحظة: لا نوقف الـ iframe لأن ذلك سيتسبب في إعادة تحميله
  useEffect(() => {
    if (isProtected && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isProtected]);

  // --- التقاط حدث انتهاء الفيديو من مشغلات الـ iframe (Bunny.net / YouTube) ---
  useEffect(() => {
    if (!onVideoEnd) return;

    const handleMessage = (event: MessageEvent) => {
      // Bunny.net
      if (
        event.origin.includes('mediadelivery.net') ||
        event.origin.includes('b-cdn.net') ||
        event.origin.includes('bunny.net')
      ) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && (data.event === 'ended' || data.type === 'ended')) {
            onVideoEnd();
          }
        } catch {
          if (event.data === 'ended') onVideoEnd();
        }
      }

      // YouTube
      if (event.origin.includes('youtube.com') || event.origin.includes('youtube-nocookie.com')) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.event === 'infoDelivery' && data.info && data.info.playerState === 0) {
            onVideoEnd();
          }
        } catch {
          // تجاهل
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onVideoEnd]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error('Failed to exit fullscreen:', err));
    } else {
      containerRef.current.requestFullscreen().catch((err) => console.error('Failed to enter fullscreen:', err));
    }
  };

  // --- كشف نوع الفيديو ---
  const isYoutube =
    platformType === 'youtube' ||
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/.test(videoUrl);
  const ytMatch = videoUrl
    ? videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/)
    : null;

  const isBunny = videoUrl?.includes('mediadelivery.net');

  const renderVideo = () => {
    // --- مشغل YouTube ---
    if (isYoutube && ytMatch) {
      const embedSrc = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
      return (
        <iframe
          ref={iframeRef}
          className="w-full h-full"
          src={embedSrc}
          title="Secure YouTube Player"
          frameBorder="0"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms allow-popups-to-escape-sandbox"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => console.warn('⚠️ تعذّر تضمين الفيديو')}
        />
      );
    }

    // --- مشغل Bunny.net ---
    if (isBunny) {
      return (
        <iframe
          ref={iframeRef}
          className="w-full h-full"
          src={videoUrl}
          title="Bunny.net Secure Player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => console.warn('⚠️ تعذّر تضمين فيديو Bunny.net')}
        />
      );
    }

    // --- مشغل فيديو محلي ---
    const isLocal = !videoUrl.startsWith('http');
 const baseUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'https://backend-production-a4c41.up.railway.app';
    const videoSrc = isLocal ? `${baseUrl}${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}` : videoUrl;

    return (
      <video
        ref={videoRef}
        src={videoSrc}
        controls={!isProtected}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        className="w-full h-full object-contain"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onEnded={onVideoEnd}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-glow-purple group select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ✅ المشغل دائماً مرئي — لا نغير opacity أبداً لتجنب إيقاف تحميل الـ iframe */}
      <div className="absolute inset-0 w-full h-full z-10">
        {renderVideo()}
      </div>

      {/* 🔒 طبقة الحماية — تظهر فوق المشغل فقط عند تفعيل isProtected */}
      {isProtected && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm pointer-events-all">
          <ShieldAlert className="w-14 h-14 text-red-500 mb-4 animate-pulse" />
          <p className="text-slate-900 dark:text-white font-bold text-lg">تم إيقاف العرض لأسباب أمنية</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">يُرجى العودة إلى نافذة المتصفح للمتابعة.</p>
        </div>
      )}

      {/* 🌊 علامة مائية ديناميكية — فوق المشغل وتحت طبقة الحماية */}
      {!isProtected && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <DynamicWatermark />
        </div>
      )}

      {/* ⛶ زر ملء الشاشة */}
      {!isProtected && (
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-4 right-4 z-25 p-2 bg-black/60 hover:bg-black/90 text-slate-900 dark:text-white rounded-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 shadow-lg"
          title="ملء الشاشة"
        >
          <Maximize className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default SecureVideoPlayer;