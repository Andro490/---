import { useEffect, useState, useRef, type FC } from 'react';
import { useAppSelector } from '../hooks/redux';

const DynamicWatermark: FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ dx: 1.5, dy: 1.5 });


  // Ping-pong animation via requestAnimationFrame for smooth hardware-accelerated movement
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (containerRef.current && textRef.current) {
        const containerBounds = containerRef.current.getBoundingClientRect();
        const textBounds = textRef.current.getBoundingClientRect();

        setPosition((prevPos) => {
          let newX = prevPos.x + velocity.dx;
          let newY = prevPos.y + velocity.dy;
          let newDx = velocity.dx;
          let newDy = velocity.dy;

          // Bounce off Left/Right boundaries
          if (newX <= 0) {
            newDx = Math.abs(newDx); // Move right
            newX = 0;
          } else if (newX + textBounds.width >= containerBounds.width) {
            newDx = -Math.abs(newDx); // Move left
            newX = containerBounds.width - textBounds.width;
          }

          // Bounce off Top/Bottom boundaries
          if (newY <= 0) {
            newDy = Math.abs(newDy); // Move down
            newY = 0;
          } else if (newY + textBounds.height >= containerBounds.height) {
            newDy = -Math.abs(newDy); // Move up
            newY = containerBounds.height - textBounds.height;
          }

          // Update velocity only if direction changed
          if (newDx !== velocity.dx || newDy !== velocity.dy) {
            setVelocity({ dx: newDx, dy: newDy });
          }

          return { x: newX, y: newY };
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [velocity]);

  // Use actual user name and mobile if logged in to track leaked videos
  const identifier = user ? `${user.name} - ${user.mobile || user.id}` : 'Guest User';

  return (
    <div ref={containerRef} className="absolute inset-0 z-9999 pointer-events-none overflow-hidden">
      <div
        ref={textRef}
        dir="ltr"
        className="absolute top-0 left-0 font-mono text-slate-900 dark:text-white/20 select-none flex flex-col whitespace-nowrap text-sm sm:text-lg font-bold drop-shadow-md"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          willChange: 'transform'
        }}
      >
        <span>{identifier}</span>
      </div>
    </div>
  );
};

export default DynamicWatermark;
