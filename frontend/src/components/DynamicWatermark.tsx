import { useEffect, useRef, type FC } from 'react';
import { useAppSelector } from '../hooks/redux';

/**
 * DynamicWatermark — علامة مائية متحركة.
 * تستخدم useRef + DOM مباشرة بدلاً من useState لتجنب إعادة الـ render المستمرة (60fps)
 * وبالتالي لا تؤثر على مشغّل الفيديو.
 */
const DynamicWatermark: FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // استخدام refs للموضع والسرعة — لا state هنا
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ dx: 1.2, dy: 1.2 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const cW = container.offsetWidth;
      const cH = container.offsetHeight;
      const tW = text.offsetWidth;
      const tH = text.offsetHeight;

      let { x, y } = posRef.current;
      let { dx, dy } = velRef.current;

      x += dx;
      y += dy;

      // ارتداد من الحواف
      if (x <= 0) { dx = Math.abs(dx); x = 0; }
      else if (x + tW >= cW) { dx = -Math.abs(dx); x = cW - tW; }

      if (y <= 0) { dy = Math.abs(dy); y = 0; }
      else if (y + tH >= cH) { dy = -Math.abs(dy); y = cH - tH; }

      posRef.current = { x, y };
      velRef.current = { dx, dy };

      // تحديث DOM مباشرة — لا setState
      text.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // يعمل مرة واحدة فقط

  const identifier = user
    ? `${user.name} - ${user.mobile || user.id}`
    : 'Guest User';

  return (
    <div ref={containerRef} className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <div
        ref={textRef}
        dir="ltr"
        className="absolute top-0 left-0 font-mono text-white/20 select-none whitespace-nowrap text-sm sm:text-base font-bold"
        style={{ willChange: 'transform' }}
      >
        {identifier}
      </div>
    </div>
  );
};

export default DynamicWatermark;
