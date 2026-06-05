import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchCourses, fetchCategories } from '../features/courses/coursesSlice';
import CourseCard from '../components/CourseCard';
import { BookOpen, Search, X, TrendingUp, Clock, Star, Sparkles } from 'lucide-react';

// ---- Types ----
interface Suggestion {
  id: string;
  title: string;
  meta: string;
  tag: string;
  tagColor: string;
  icon: React.ReactNode;
  iconBg: string;
}

// ---- Helper: highlight matched text ----
const HighlightText = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ background: 'rgba(124,58,237,0.25)', color: 'inherit', borderRadius: '3px', padding: '0 2px' }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

// ---- Main Component ----
const Courses = () => {
  const dispatch = useAppDispatch();
  const { courses, categories, loading } = useAppSelector((state) => state.courses);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Debounce search input
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setActiveIndex(-1);
    }, 220);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---- Build suggestions from courses + static popular topics ----
  const buildSuggestions = useCallback((): Suggestion[] => {
    const q = debouncedQuery.toLowerCase().trim();

    if (!q) {
      // Show actual courses from the database as suggestions
      return courses.slice(0, 4).map((c) => ({
        id: c.id,
        title: c.title,
        meta: c.category?.name || 'دورة مميزة',
        tag: c.price === 0 ? 'مجاني' : `${c.price} ج.م`,
        tagColor: c.price === 0 ? '#10b981' : '#7c3aed',
        icon: <BookOpen className="w-4 h-4 text-purple-400" />,
        iconBg: 'rgba(124,58,237,0.15)',
      }));
    }

    // Filter actual courses
    const matched = courses
      .filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.name?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        title: c.title,
        meta: c.category?.name || 'دورة تعليمية',
        tag: c.price === 0 ? 'مجاني' : `${c.price} ج.م`,
        tagColor: c.price === 0 ? '#10b981' : '#7c3aed',
        icon: <BookOpen className="w-4 h-4 text-purple-400" />,
        iconBg: 'rgba(124,58,237,0.15)',
      }));

    if (matched.length === 0) {
      return [
        {
          id: 'no-result', title: `بحث عن: "${debouncedQuery}"`, meta: 'اضغط Enter للبحث في كل النتائج', tag: '',
          tagColor: '', icon: <Search className="w-4 h-4 text-slate-600 dark:text-slate-400" />, iconBg: 'rgba(100,116,139,0.15)',
        },
      ];
    }

    return matched;
  }, [debouncedQuery, courses]);

  const suggestions = buildSuggestions();

  // ---- Filtered courses list ----
  const filteredCourses = courses.filter(c => {
    const matchCat = selectedCategory === 'all' || c.categoryId === selectedCategory;
    const matchSearch = debouncedQuery.trim() === '' ||
      c.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      c.category?.name?.toLowerCase().includes(debouncedQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // ---- Keyboard Navigation ----
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        setSearchQuery(suggestions[activeIndex].title.replace(/^بحث عن: "(.+)"$/, '$1'));
      }
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (s: Suggestion) => {
    const text = s.title.replace(/^بحث عن: "(.+)"$/, '$1');
    setSearchQuery(text);
    setDebouncedQuery(text);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 rtl">

      {/* ===== Header ===== */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-theme-neonCyan text-xs font-bold uppercase tracking-wider">كتالوج البرامج</span>
        <h1
          className="text-3xl sm:text-5xl font-extrabold mt-2 mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          استكشف جميع مساقاتنا
        </h1>
        <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          اختر الدورة المناسبة لمستواك، وابدأ فوراً في تطبيق المشاريع العملية بمساعدة مدربين محترفين.
        </p>
      </div>

      {/* ===== Smart Search Bar ===== */}
      <div className="max-w-2xl mx-auto mb-10" ref={searchRef}>
        <div className="search-wrapper">
          <div className="search-input-container">
            {/* Search Icon */}
            <span className="search-icon">
              <Search className="w-5 h-5" />
            </span>

            {/* Input */}
            <input
              ref={inputRef}
              id="courses-search-input"
              type="text"
              className="search-input"
              placeholder="ابحث عن دورة، مهارة، أو موضوع..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />

            {/* Clear Button */}
            {searchQuery && (
              <button className="search-clear-btn" onClick={clearSearch} title="مسح البحث">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ===== Suggestions Dropdown ===== */}
          {showSuggestions && (
            <div className="search-suggestions">
              {/* Header label */}
              <div className="suggestions-header">
                {debouncedQuery.trim()
                  ? `نتائج البحث عن "${debouncedQuery}"`
                  : '📚 دورات مقترحة لك'}
              </div>

              {/* Suggestion Items */}
              {suggestions.map((s, i) => (
                <div
                  key={s.id}
                  className={`suggestion-item ${i === activeIndex ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  onMouseDown={() => handleSuggestionClick(s)}
                >
                  {/* Icon */}
                  <div
                    className="suggestion-icon"
                    style={{ background: s.iconBg }}
                  >
                    {s.icon}
                  </div>

                  {/* Text */}
                  <div className="suggestion-text">
                    <div className="suggestion-title">
                      <HighlightText text={s.title} query={debouncedQuery} />
                    </div>
                    {s.meta && (
                      <div className="suggestion-meta">{s.meta}</div>
                    )}
                  </div>

                  {/* Tag */}
                  {s.tag && (
                    <span
                      className="suggestion-tag"
                      style={{
                        background: `${s.tagColor}18`,
                        color: s.tagColor,
                      }}
                    >
                      {s.tag}
                    </span>
                  )}
                </div>
              ))}

              {/* Footer: show all */}
              {debouncedQuery.trim() && filteredCourses.length > 0 && (
                <div
                  className="suggestions-footer"
                  onMouseDown={() => setShowSuggestions(false)}
                >
                  عرض جميع النتائج ({filteredCourses.length} دورة) ↓
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active search indicator */}
        {debouncedQuery.trim() && (
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {filteredCourses.length === 0
                ? 'لا توجد نتائج مطابقة'
                : `${filteredCourses.length} نتيجة لـ "${debouncedQuery}"`}
            </span>
            <button
              onClick={clearSearch}
              className="text-xs text-theme-neonPurple hover:text-theme-accent transition-colors font-medium"
            >
              مسح البحث
            </button>
          </div>
        )}
      </div>

      {/* ===== Categories Filter Tabs ===== */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
        <button
          id="category-all"
          onClick={() => setSelectedCategory('all')}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-theme-accent text-slate-900 dark:text-white border-theme-accent shadow-glow-purple'
              : 'border-slate-200 dark:border-white/5 hover:border-white/10'
          }`}
          style={selectedCategory !== 'all' ? {
            background: 'var(--bg-glass-card)',
            color: 'var(--text-secondary)',
          } : {}}
        >
          الكل ({courses.length})
        </button>

        {categories.map((cat) => {
          const count = courses.filter(c => c.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              id={`category-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-theme-accent text-slate-900 dark:text-white border-theme-accent shadow-glow-purple'
                  : 'border-slate-200 dark:border-white/5 hover:border-white/10'
              }`}
              style={selectedCategory !== cat.id ? {
                background: 'var(--bg-glass-card)',
                color: 'var(--text-secondary)',
              } : {}}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* ===== Courses Grid ===== */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="glass-card rounded-2xl h-[420px] animate-pulse border"
              style={{ background: 'var(--bg-glass)', borderColor: 'var(--border-subtle)' }}
            />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <>
          {debouncedQuery.trim() && (
            <div className="mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-theme-neonCyan" />
              <span className="text-sm font-semibold text-theme-neonCyan">
                نتائج البحث
              </span>
              <span className="text-xs px-3 py-1 rounded-full ml-2" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                {filteredCourses.length} دورة
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </>
      ) : (
        <div
          className="glass-panel rounded-2xl p-16 text-center max-w-md mx-auto flex flex-col items-center"
        >
          {debouncedQuery.trim() ? (
            <>
              <Search className="w-12 h-12 mb-4" style={{ color: 'var(--text-tertiary)' }} />
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                لا توجد نتائج لـ "{debouncedQuery}"
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                جرب كلمات بحث مختلفة أو تصفح التصنيفات أدناه.
              </p>
              <button
                onClick={clearSearch}
                className="px-5 py-2 rounded-full bg-theme-accent text-slate-900 dark:text-white text-sm font-semibold hover:shadow-glow-purple transition-all duration-300 cursor-pointer"
              >
                مسح البحث
              </button>
            </>
          ) : (
            <>
              <BookOpen className="w-12 h-12 mb-4" style={{ color: 'var(--text-tertiary)' }} />
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                لا توجد مساقات في هذا القسم
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                سنقوم بإدراج دورات جديدة في هذا التصنيف قريباً، يرجى تصفح بقية التصنيفات.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Courses;
