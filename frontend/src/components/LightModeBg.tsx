/**
 * LightModeBg.tsx
 * 
 * Clean, professional, and minimalist background for Light Mode.
 * Replaces the heavy Three.js scene with elegant CSS organic blobs and a soft pattern.
 * Inspired by premium platforms (e.g., Al-Qaisar) for maximum focus and readability.
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const LightModeBg = () => {
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subtle breathing/floating animation for the organic blobs
    const ctx = gsap.context(() => {
      gsap.to(blob1Ref.current, {
        x: 'random(-30, 30)',
        y: 'random(-30, 30)',
        scale: 'random(0.95, 1.05)',
        duration: 8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });

      gsap.to(blob2Ref.current, {
        x: 'random(-40, 40)',
        y: 'random(-40, 40)',
        scale: 'random(0.9, 1.1)',
        duration: 10,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1,
      });

      gsap.to(blob3Ref.current, {
        x: 'random(-20, 20)',
        y: 'random(-20, 20)',
        scale: 'random(0.95, 1.05)',
        duration: 12,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 2,
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#faf8f5] pointer-events-none transition-colors duration-500">
      
      {/* 1. Organic Glowing Blobs */}
      {/* Top Right: Soft Indigo */}
      <div 
        ref={blob1Ref}
        className="absolute -top-[15%] -right-[10%] w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full bg-indigo-200/40 blur-[120px] mix-blend-multiply" 
      />
      
      {/* Center Left: Soft Teal */}
      <div 
        ref={blob2Ref}
        className="absolute top-[20%] -left-[15%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full bg-teal-100/50 blur-[120px] mix-blend-multiply" 
      />

      {/* Bottom Center: Soft Amber/Purple */}
      <div 
        ref={blob3Ref}
        className="absolute -bottom-[20%] left-[20%] w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full bg-purple-100/40 blur-[120px] mix-blend-multiply" 
      />
      
      {/* 2. Premium Topography / Wave Pattern Overlay */}
      {/* Using overlapping concentric circles to create a clean, elegant contour-like pattern */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.5'%3E%3Ccircle cx='100' cy='100' r='20'/%3E%3Ccircle cx='100' cy='100' r='40'/%3E%3Ccircle cx='100' cy='100' r='60'/%3E%3Ccircle cx='100' cy='100' r='80'/%3E%3Ccircle cx='100' cy='100' r='100'/%3E%3Ccircle cx='100' cy='100' r='120'/%3E%3Ccircle cx='100' cy='100' r='140'/%3E%3Ccircle cx='100' cy='100' r='160'/%3E%3Ccircle cx='100' cy='100' r='180'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          backgroundPosition: 'center',
        }}
      />

      {/* 3. Soft Vignette / Blend Overlay to fade the edges smoothly */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(250,248,245,0.8)_100%)]" />
    </div>
  );
};

export default LightModeBg;
