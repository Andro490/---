import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchCourses } from '../features/courses/coursesSlice';
import CourseCard from '../components/CourseCard';
import SocialProof from '../components/SocialProof';
import { SEO } from '../components/SEO';
import { siteConfig } from '../config/siteConfig';
import heroPersonImg from '../assets/Gemini_Generated_Image_oy52dloy52dloy52.png'; // 🏷️ WHITE-LABEL: استبدل هذه الصورة بصورة مدرب/شخصية العميل الجديد
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, Play, Cpu, Palette, Sparkles, BookOpen } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// Helper removed: splitting Arabic text into inline-block spans breaks shaping 
// and causes background-clip:text gradients to become invisible in Chrome.

const Home = () => {
  const dispatch = useAppDispatch();
  const { courses, loading } = useAppSelector((state) => state.courses);

  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);
  const heroImgRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  useEffect(() => {
    // Scroll to top on mount when navigating from other pages
    window.scrollTo(0, 0);

    if (!heroRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Badge bounce-in
      if (badgeRef.current) {
        tl.fromTo(badgeRef.current, { opacity: 0, scale: 0.7, y: -12 }, { opacity: 1, scale: 1, y: 0, duration: 0.6 });
      }

      // Headline animation (animate the headline lines instead of chars to preserve Arabic shaping and gradient)
      if (headlineRef.current) {
        const lines = headlineRef.current.children;
        tl.fromTo(headlineRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.2');
        if (lines.length > 0) {
          tl.fromTo(lines, { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.15, duration: 0.6 }, '-=0.4');
        }
      }

      // Subtext
      if (subtextRef.current) {
        tl.fromTo(subtextRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.4');
      }

      // CTA buttons
      if (ctaRef.current) {
        tl.fromTo(ctaRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.5');
      }

      // Hero image — slide in from right + fade
      if (heroImgRef.current) {
        tl.fromTo(
          heroImgRef.current,
          { opacity: 0, x: 60, scale: 0.9 },
          { opacity: 1, x: 0, scale: 1, duration: 1.1, ease: 'power3.out' },
          '-=0.8'
        );
        // Continuous gentle float after entrance
        gsap.to(heroImgRef.current, {
          y: '-18px',
          duration: 3.2,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 1.2,
        });
      }

      // Glow pulse behind the image
      if (glowRef.current) {
        gsap.fromTo(
          glowRef.current,
          { scale: 0.85, opacity: 0.3 },
          { scale: 1.15, opacity: 0.7, duration: 3, ease: 'sine.inOut', repeat: -1, yoyo: true }
        );
      }

      // Feature cards — scroll-triggered
      if (featuresRef.current && featuresRef.current.children.length > 0) {
        gsap.fromTo(featuresRef.current.children,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.15,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: featuresRef.current,
              start: 'top 85%',
              once: true,
            },
          }
        );
      }

      // Courses section
      if (coursesRef.current) {
        gsap.fromTo(coursesRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: coursesRef.current,
              start: 'top 80%',
              once: true,
            },
          }
        );
      }

      // Refresh ScrollTrigger after DOM stabilizes
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={heroRef} className="relative z-10 max-w-7xl mx-auto px-6 pb-24 rtl" style={{ paddingTop: '10rem' }}>
      <SEO 
        title="الصفحة الرئيسية" 
        description={siteConfig.seo.defaultDescription} 
      />

      {/* ═══════════════════════════════════════════════════════
          1. CINEMATIC HERO — Two-column layout
         ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-12 min-h-[75vh]">

        {/* Left column — text content */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-right flex-1 max-w-2xl">

          {/* Ambient glows */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-theme-accent/15 rounded-full blur-[120px] -z-10 pointer-events-none animate-pulse" />
          <div className="absolute bottom-20 right-1/3 w-[300px] h-[300px] bg-theme-neonCyan/10 rounded-full blur-[90px] -z-10 pointer-events-none" />

          {/* Badge */}
          <span
            ref={badgeRef}
            className="text-theme-neonCyan text-xs sm:text-sm font-bold tracking-widest uppercase
                       border border-theme-neonCyan/30 bg-theme-neonCyan/5 px-5 py-2 rounded-full
                       mb-7 inline-flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-theme-neonCyan animate-ping inline-block" />
            {siteConfig.home.heroBadge}
          </span>

          {/* Headline */}
          <h1
            ref={headlineRef}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white
                       tracking-tight leading-[1.18] mb-5"
          >
            <span className="block dark:text-white">{siteConfig.home.heroTitleLine1}</span>
            <span className="text-gradient-purple-cyan font-extrabold block mt-2">
              {siteConfig.home.heroTitleLine2}
            </span>
          </h1>

          {/* Subtext */}
          <p
            ref={subtextRef}
            className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed mb-9"
          >
            {siteConfig.home.heroDescription}
          </p>

          {/* CTA Buttons */}
          <div
            ref={ctaRef}
            className="flex flex-col sm:flex-row items-center gap-5"
          >
            {/* 🏷️ WHITE-LABEL: غيّر نص زر CTA الأول (الأساسي) */}
            <Link
              to="/courses"
              className="
                relative px-8 py-4 rounded-xl font-bold text-slate-900 dark:text-white overflow-hidden group
                bg-gradient-to-r from-theme-accent via-theme-neonPurple to-theme-neonCyan
                hover:shadow-[0_0_35px_rgba(124,58,237,0.55)] transition-all duration-300
                hover:scale-[1.03] flex items-center gap-2 cursor-pointer
              "
            >
              {/* Shimmer sweep */}
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full" style={{ transition: 'transform 0.7s ease, opacity 0.3s ease' }} />
              {siteConfig.home.ctaPrimary}
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform" />
            </Link>

            {/* 🏷️ WHITE-LABEL: غيّر نص زر CTA الثاني (الفرعي) */}
            <Link
              to="/login"
              className="
                px-8 py-4 rounded-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer
                bg-white dark:bg-slate-900/60 border border-slate-300 dark:border-white/10
                hover:border-theme-neonCyan/50 hover:bg-slate-900/90
                hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300
              "
            >
              <Play className="w-4 h-4 text-theme-neonCyan fill-theme-neonCyan" />
              {siteConfig.home.ctaSecondary}
            </Link>
          </div>

          {/* Social Proof stats */}
          <SocialProof />
        </div>

        {/* Right column — Hero Person Image */}
        <div className="relative flex-shrink-0 w-full lg:w-[420px] xl:w-[500px] h-[420px] lg:h-[560px] hidden sm:flex items-end justify-center">

          {/* Animated glow blob behind the person */}
          <div
            ref={glowRef}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 80%, rgba(124,58,237,0.35) 0%, rgba(6,182,212,0.15) 50%, transparent 75%)',
              filter: 'blur(32px)',
            }}
          />

          {/* Spinning ring decoration */}
          <div
            className="absolute inset-8 rounded-full border border-theme-neonCyan/15 animate-spin-slow pointer-events-none"
            style={{ animationDuration: '20s' }}
          />
          <div
            className="absolute inset-16 rounded-full border border-theme-accent/10 animate-spin-slow pointer-events-none"
            style={{ animationDuration: '14s', animationDirection: 'reverse' }}
          />

          <img
            ref={heroImgRef}
            src={heroPersonImg}
            alt={siteConfig.instructorName}
            className="relative z-10 w-full h-full object-contain object-bottom drop-shadow-2xl select-none"
            style={{ opacity: 0 }}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          2. PLATFORM VALUE PROPOSITIONS
         ═══════════════════════════════════════════════════════ */}
      <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full" style={{ marginTop: '7rem' }}>

        <div className="glass-card rounded-2xl p-8 flex flex-col items-start group">
          <div className="w-12 h-12 rounded-xl bg-theme-accent/15 border border-theme-accent/30
                          flex items-center justify-center text-theme-accent mb-6
                          shadow-glow-purple group-hover:scale-110 transition-transform duration-300">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">3D technologies</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
           pratical curricula focused on designing and developing fully interactive three-dimensional websites 
            using Three.js and shaders.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 flex flex-col items-start group">
          <div className="w-12 h-12 rounded-xl bg-theme-neonCyan/15 border border-theme-neonCyan/30
                          flex items-center justify-center text-theme-neonCyan mb-6
                          shadow-glow-cyan group-hover:scale-110 transition-transform duration-300">
            <Palette className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">excellent visual aesthetics</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
             We don't just teach code; we teach the philosophy of beauty and glass effects (Glassmorphism)
            to make your designs look luxurious and attractive.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 flex flex-col items-start group">
          <div className="w-12 h-12 rounded-xl bg-theme-neonPurple/15 border border-theme-neonPurple/30
                          flex items-center justify-center text-theme-neonPurple mb-6
                          group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">ultra-smooth animations</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Get animations that depend on mouse movement and scrolling using integrated GSAP libraries
            that amaze your site visitors.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          3. FEATURED COURSES SECTION
         ═══════════════════════════════════════════════════════ */}
      <div ref={coursesRef} className="mt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-theme-neonCyan text-xs font-bold uppercase tracking-wider">The selected programs</span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">Start your educational journey today</h2>
          </div>
          <Link
            to="/courses"
            className="text-theme-neonCyan hover:underline text-sm font-semibold flex items-center gap-1
                       hover:text-theme-accent transition-colors duration-200"
          >
            Explore all courses
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card rounded-2xl h-[420px] animate-pulse bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5" />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.slice(0, 3).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <BookOpen className="w-12 h-12 text-slate-500 dark:text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No courses available at the moment</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Please check back later or log in and activate the data server.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
