import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { gsap } from 'gsap';
import patternImg from '../assets/pattern.png';

const ThreeBg = () => {
  const isDark = useAppSelector((state) => state.theme.mode === 'dark');
  const location = useLocation();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (location.pathname !== '/' || !imgRef.current) return;

    const ctx = gsap.context(() => {
      // تظهر وتختفي — slow breathing pulse
      gsap.fromTo(
        imgRef.current,
        { opacity: 0 },
        {
          opacity: isDark ? 0.12 : 0.22,
          duration: 3.5,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        }
      );
    });

    return () => ctx.revert();
  }, [location.pathname, isDark]);

  // Other pages — solid background only
  if (location.pathname !== '/') {
    return (
      <div
        className={`fixed inset-0 -z-10 transition-colors duration-500 ${
          isDark ? 'bg-[#050212]' : 'bg-[#faf8f5]'
        }`}
      />
    );
  }

  return (
    <>
      {/* Solid base background */}
      <div
        className={`fixed inset-0 -z-20 transition-colors duration-500 ${
          isDark ? 'bg-[#050212]' : 'bg-[#faf8f5]'
        }`}
      />

      {/* Full-width pattern background — covers all screen sizes */}
      <div
        className="absolute top-0 left-0 w-full h-[110vh] overflow-hidden pointer-events-none -z-10"
        style={{
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
        }}
      >
        {/* The pattern — object-cover fills the entire hero area */}
        <img
          ref={imgRef}
          src={patternImg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{
            opacity: 0,
            filter: isDark
              ? 'invert(1) hue-rotate(180deg) brightness(2) saturate(0.5)'
              : 'none',
          }}
        />

        {/* Radial vignette — keeps center clear, darkens edges for readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, transparent 30%, ${
              isDark ? 'rgba(5,2,18,0.88)' : 'rgba(250,248,245,0.88)'
            } 100%)`,
          }}
        />
      </div>
    </>
  );
};

export default ThreeBg;
