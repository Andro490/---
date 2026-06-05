import { Link } from 'react-router-dom';
import type { Course } from '../features/courses/coursesSlice';
import { BookOpen, Layers, DollarSign } from 'lucide-react';

interface CourseCardProps {
  course: Course;
}

const CourseCard = ({ course }: CourseCardProps) => {
  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-glass group flex flex-col h-full rtl">
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-tr from-theme-accent/20 to-theme-neonCyan/20 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-slate-500 dark:text-slate-400 opacity-40 animate-pulse" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-theme-bg to-transparent opacity-60" />
        
        {/* Category Tag */}
        <span className="absolute top-4 right-4 bg-theme-accent/80 backdrop-blur-md text-slate-900 dark:text-white text-xs px-3 py-1.5 rounded-full font-semibold border border-slate-300 dark:border-white/10">
          {course.category?.name || 'عام'}
        </span>
      </div>

      {/* Info Content */}
      <div className="p-6 flex flex-col grow">
        <h3 className="text-lg font-bold text-body-primary group-hover:text-theme-neonCyan transition-colors duration-300 line-clamp-1 mb-2">
          {course.title}
        </h3>
        
        <p className="text-body-secondary text-sm line-clamp-2 mb-6 leading-relaxed grow">
          {course.description}
        </p>

        {/* Course Statistics */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/5 pt-4 text-xs text-body-secondary">
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-theme-neonCyan" />
            {course.lessons?.length || 0} دروس
          </span>

          <span className="flex items-center gap-0.5 font-bold text-sm text-theme-neonCyan">
            {course.price === 0 ? (
              <span className="text-emerald-400 font-bold">مجاني</span>
            ) : (
              <>
                <span>{course.price}</span>
                <DollarSign className="w-3.5 h-3.5 inline" />
              </>
            )}
          </span>
        </div>

        {/* Explore Button */}
        <Link
          to={`/courses/${course.id}`}
          className="mt-5 w-full py-3 rounded-xl bg-theme-accent/10 border border-theme-accent/30 hover:bg-theme-accent hover:text-slate-900 dark:hover:text-white text-theme-neonCyan text-center text-sm font-semibold transition-all duration-300 hover:shadow-glow-purple block cursor-pointer"
        >
          تفاصيل الدورة
        </Link>
      </div>
    </div>
  );
};

export default CourseCard;
