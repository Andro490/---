/**
 * SocialProof.tsx
 * Animated statistics row — real data from /api/dashboard/public-stats.
 * Count-up numbers triggered on scroll via GSAP ScrollTrigger.
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Users, BookOpen, Clock, Star } from 'lucide-react';
import api from '../services/api';

gsap.registerPlugin(ScrollTrigger);

interface PlatformStats {
  totalStudents: number;
  totalCourses: number;
  totalHours: number;
  avgRating: number;
}

interface StatConfig {
  icon: React.ReactNode;
  getValue: (s: PlatformStats) => number;
  decimals: number;
  suffix: string;
  label: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
}

const STAT_CONFIGS: StatConfig[] = [
  {
    icon: <Users className="w-5 h-5" />,
    getValue: (s) => s?.totalStudents ?? 0,
    decimals: 0,
    suffix: '+',
    label: 'طالب مسجّل',
    gradientFrom: '#06b6d4',
    gradientTo: '#0891b2',
    glowColor: 'rgba(6,182,212,0.3)',
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    getValue: (s) => s?.totalCourses ?? 0,
    decimals: 0,
    suffix: '+',
    label: 'دورة متخصصة',
    gradientFrom: '#7c3aed',
    gradientTo: '#6d28d9',
    glowColor: 'rgba(124,58,237,0.3)',
  },
  {
    icon: <Clock className="w-5 h-5" />,
    getValue: (s) => s?.totalHours ?? 0,
    decimals: 0,
    suffix: 'ساعة',
    label: 'محتوى تعليمي',
    gradientFrom: '#d946ef',
    gradientTo: '#c026d3',
    glowColor: 'rgba(217,70,239,0.3)',
  },
  {
    icon: <Star className="w-5 h-5" />,
    getValue: (s) => s?.avgRating ?? 0,
    decimals: 1,
    suffix: '★',
    label: 'تقييم المتعلمين',
    gradientFrom: '#fbbf24',
    gradientTo: '#f59e0b',
    glowColor: 'rgba(251,191,36,0.3)',
  },
];

const SocialProof = () => {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const counterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);

  // ─── 1. Fetch real stats from backend ───────────────────────
  useEffect(() => {
    api.get<PlatformStats>('/dashboard/public-stats')
      .then((res) => setStats(res.data))
      .catch(() => {
        // Graceful fallback — keep zeros
        setStats({ totalStudents: 0, totalCourses: 0, totalHours: 0, avgRating: 0 });
      });
  }, []);

  // ─── 2. GSAP animations (run after data arrives) ─────────────
  useEffect(() => {
    if (!stats || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Stagger reveal for the cards
      gsap.fromTo(
        sectionRef.current!.children,
        { opacity: 0, y: 28, scale: 0.92 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.12,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 88%',
            once: true,
          },
        }
      );

      // Count-up for each number
      STAT_CONFIGS.forEach((cfg, i) => {
        const el = counterRefs.current[i];
        if (!el) return;

        const endValue = cfg.getValue(stats);
        const obj = { val: 0 };

        gsap.to(obj, {
          val: endValue,
          duration: 2.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 88%',
            once: true,
          },
          onUpdate() {
            el.textContent = cfg.decimals > 0
              ? obj.val.toFixed(cfg.decimals)
              : Math.round(obj.val).toString();
          },
          onComplete() {
            el.textContent = cfg.decimals > 0
              ? endValue.toFixed(cfg.decimals)
              : endValue.toString();
          },
        });
      });
    });

    return () => ctx.revert();
  }, [stats]); // re-run whenever data loads

  return (
    <div
      ref={sectionRef}
      className="flex flex-wrap justify-center gap-4 mt-10 w-full"
      aria-label="إحصائيات المنصة"
    >
      {STAT_CONFIGS.map((cfg, i) => (
        <div
          key={i}
          className="
            relative overflow-hidden
            glass-card rounded-2xl px-5 py-4
            flex items-center gap-3
            min-w-[150px] max-w-[190px] flex-1
            group hover:scale-[1.04] transition-transform duration-300 cursor-default
          "
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.06)` }}
        >
          {/* Glow shimmer on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${cfg.glowColor}, transparent 70%)`,
            }}
          />

          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${cfg.gradientFrom}22, ${cfg.gradientTo}44)`,
              border:      `1px solid ${cfg.gradientFrom}44`,
              color:       cfg.gradientFrom,
            }}
          >
            {cfg.icon}
          </div>

          {/* Text */}
          <div className="text-right leading-tight">
            <div className="flex items-baseline gap-1 justify-end">
              <span
                style={{ color: cfg.gradientFrom }}
                className="text-xs font-bold"
              >
                {cfg.suffix}
              </span>
              <span className="text-2xl font-extrabold text-body-primary tabular-nums">
                <span ref={(el) => { counterRefs.current[i] = el; }}>
                  {/* Show placeholder while loading */}
                  {stats ? (cfg.decimals > 0 ? cfg.getValue(stats).toFixed(cfg.decimals) : cfg.getValue(stats).toString()) : '—'}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-body-secondary mt-0.5">{cfg.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SocialProof;
