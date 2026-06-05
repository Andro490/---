import React, { useState } from 'react';
import { useAppSelector } from '../hooks/redux';
import { 
  User, CreditCard, Link as LinkIcon, Wallet, BookOpen, 
  Shield, Eye, FileText, Star, Award, CheckSquare, 
  ClipboardList, PenTool, Database, HelpCircle, PlayCircle, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import * as XLSX from 'xlsx';
import { Download, Filter, Zap, Trophy } from 'lucide-react';

interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string | null;
  category: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  enrolledAt: string;
}

interface ExamResult {
  id: string;
  quizId: string;
  courseId: string;
  lessonId: string;
  courseName: string;
  quizName: string;
  type: string;
  score: number;
  passed: boolean;
  date: string;
  answersJson: string;
}

interface HomeworkResult {
  id: string;
  homeworkId: string;
  courseId: string;
  lessonId: string;
  courseName: string;
  homeworkName: string;
  score: number;
  passed: boolean;
  date: string;
  answersJson: string;
}

const SIDEBAR_ITEMS = [
  { id: 'profile', label: 'My profile', icon: User, active: true },
  { id: 'my_courses', label: 'My Courses', icon: BookOpen },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'subscriptions', label: 'Subscriptions', icon: Star },
  { id: 'exam_results', label: 'Exam results', icon: Award },
  { id: 'eval_results', label: 'My Points', icon: Zap },
  { id: 'question_bank', label: 'Top 10', icon: Trophy },
  { id: 'hw_results', label: 'Homework results', icon: ClipboardList },
];

interface LeaderboardStudent {
  rank: number;
  id: string;
  name: string;
  points: number;
  type: string;
  grade: string;
  gov: string;
  dept: string;
}

const UserProfile = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [pointsFilter, setPointsFilter] = useState('all');
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [homeworkResults, setHomeworkResults] = useState<HomeworkResult[]>([]);
  const [totalExams, setTotalExams] = useState<number>(0);
  const [completedExams, setCompletedExams] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardStudent[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);

  React.useEffect(() => {
    const fetchStudentDashboard = async () => {
      setLoadingCourses(true);
      try {
        const res = await api.get('/dashboard/student');
        setCourses(res.data.enrolledCourses || []);
        setExamResults(res.data.examResults || []);
        setHomeworkResults(res.data.homeworkResults || []);
        setTotalExams(res.data.totalExams || 0);
        setCompletedExams(res.data.completedExams || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCourses(false);
      }
    };
    
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const res = await api.get('/dashboard/leaderboard');
        setLeaderboard(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchStudentDashboard();
    fetchLeaderboard();
  }, []);

  const downloadInvoice = (course: EnrolledCourse) => {
    if (!user) return;

    const invoiceData = [
      // 🏷️ WHITE-LABEL: قم بتغيير 'أكاديمية سينما' إلى اسم منصة العميل
      ['Cinemasters - Payment Invoice'],
      [],
      ['Invoice number:', `INV-${Math.floor(Math.random() * 1000000)}`],
      ['Invoice date:', new Date(course.enrolledAt || new Date()).toLocaleDateString('ar-EG')],
      ['Student name:', user.name],
      ['Email:', user.email],
      [],
      ['Payment details'],
      ['Course name', 'Category', 'Price'],
      [
        course.title,
        course.category || 'General',
        course.price === 0 ? 'Free' : `${course.price} $`
      ],
      [],
      ['Total:', course.price === 0 ? '0 $' : `${course.price} $`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(invoiceData);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    XLSX.writeFile(wb, `فاتورة_${course.title.replace(/\s+/g, '_')}.xlsx`);
  };

  // حساب الإحصائيات ديناميكياً
  const totalEnrolledLessons = courses.reduce((sum, c) => sum + c.totalLessons, 0);
  const totalCompletedLessons = courses.reduce((sum, c) => sum + c.completedLessons, 0);
  const videoProgress = totalEnrolledLessons > 0 ? Math.round((totalCompletedLessons / totalEnrolledLessons) * 100) : 0;
  
  // 💡 ربط الإحصائيات الخاصة بالامتحانات من الباك إند
  const examProgress = totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0;

  // المستوى العام للطالب
  const overallPerformance = totalEnrolledLessons > 0 
    ? Math.round((videoProgress + examProgress) / 2) 
    : 0;

  const renderProfileStats = () => (
    <>
      {/* Profile Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-theme-neonCyan rounded-full flex items-center justify-center text-slate-900 mb-4 shadow-glow-cyan border-4 border-theme-bg">
            <User className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{user?.name || 'اسم المستخدم'}</h2>
          <div className="flex flex-col items-center text-slate-600 dark:text-slate-400 text-sm gap-1">
            <span>{user?.email || 'user@example.com'}</span>
          </div>
        </div>

      

        {/* Stats 1 */}
        <div className="mb-12 relative">
          <div className="flex items-center justify-center gap-4 mb-8">
            <Star className="w-6 h-6 text-theme-neonCyan" />
            <h3 className="text-xl font-bold text-theme-neonCyan">Your video stats</h3>
            <Star className="w-6 h-6 text-theme-neonCyan" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-theme-neonPurple flex flex-col items-center justify-center mb-3 text-slate-900 dark:text-white">
                <span className="text-xl font-bold">{videoProgress} %</span>
                <span className="text-xs">From videos</span>
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold mb-2">Total watched</span>
              <span className="text-xs bg-theme-neonPurple text-slate-900 dark:text-white px-3 py-1 rounded-full">
                {totalCompletedLessons} videos - From {totalEnrolledLessons}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-theme-neonCyan flex flex-col items-center justify-center mb-3 text-slate-900 dark:text-white">
                <span className="text-xl font-bold">{examProgress} %</span>
                <span className="text-xs">From Exams</span>
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold mb-2">Completed exams</span>
              <span className="text-xs bg-theme-neonCyan text-slate-900 font-bold px-3 py-1 rounded-full">
                {completedExams} exams - From {totalExams}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-500 flex flex-col items-center justify-center mb-3 text-slate-900 dark:text-white">
                <span className="text-xl font-bold">{overallPerformance} %</span>
                <span className="text-xs">Level</span>
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold mb-2">Your general level</span>
              <span className="text-xs bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold px-3 py-1 rounded-full">
                {overallPerformance >= 80 ? 'Excellent 🚀' : overallPerformance >= 50 ? 'Very good 👍' : 'You need to work harder 🎯'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats 2 */}
        <div>
          <div className="flex items-center justify-center gap-4 mb-8">
            <Star className="w-6 h-6 text-theme-neonCyan" />
            <h3 className="text-xl font-bold text-theme-neonCyan">Your platform stats</h3>
            <Star className="w-6 h-6 text-theme-neonCyan" />
          </div>
          
          <div className="flex flex-col gap-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
              <span className="text-sm text-slate-700 dark:text-slate-300">Total videos in your courses</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full border border-rose-500 text-rose-500">{totalEnrolledLessons} lesson</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
              <span className="text-sm text-slate-700 dark:text-slate-300">Total completed</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full border border-yellow-500 text-yellow-500">{totalCompletedLessons} lesson</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
              <span className="text-sm text-slate-700 dark:text-slate-300">Completed courses (100%)</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full border border-theme-neonCyan text-theme-neonCyan">{courses.filter(c => c.progress === 100).length} course</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
              <span className="text-sm text-slate-700 dark:text-slate-300">In-progress courses</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full border border-theme-neonPurple text-theme-neonPurple">{courses.filter(c => c.progress > 0 && c.progress < 100).length} course</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
              <span className="text-sm text-slate-700 dark:text-slate-300">Passed exams</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full border border-emerald-500 text-emerald-500">{completedExams} exam</span>
            </div>
          </div>
        </div>
    </>
  );

  const renderSubscriptions = () => (
    <div>
      <div className="flex flex-col items-center justify-center mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">All Subscriptions</h2>
        <div className="h-1 w-24 bg-theme-neonCyan rounded-full mx-auto" />
      </div>

      {loadingCourses ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            // تحويل شكل البيانات لتتوافق مع مكون CourseCard
            const mappedCourse: any = {
              ...course,
              category: { name: course.category },
              lessons: new Array(course.totalLessons).fill(0)
            };
            
            return (
              <div key={course.id} className="relative group">
                <CourseCard course={mappedCourse} />
                
                {/* شريط نسبة الإنجاز والزر الإضافي فوق الكارت */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-end p-4 z-10">
                   <div className="bg-white dark:bg-slate-900/90 backdrop-blur-sm p-3 rounded-xl border border-slate-300 dark:border-white/10 pointer-events-auto transform translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                        <span>Progress</span>
                        <span className="text-theme-neonCyan font-bold">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 mb-3">
                        <div
                          className="bg-gradient-to-l from-theme-accent to-theme-neonCyan h-full rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <Link
                        to={`/courses/${course.id}/play`}
                        className="w-full bg-theme-accent hover:bg-theme-accent/80 text-slate-900 dark:text-white py-2 rounded-lg text-sm font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <PlayCircle className="w-4 h-4" />
                        الدخول للكورس
                      </Link>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <Clock className="w-12 h-12 text-slate-500 dark:text-slate-400 mb-4 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No active subscriptions</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">You haven't subscribed to any course yet.</p>
          <Link to="/courses" className="px-6 py-3 rounded-xl bg-theme-accent text-slate-900 dark:text-white font-bold text-sm">
            Browse courses
          </Link>
        </div>
      )}
    </div>
  );

  const renderExamResults = () => (
    <div>
      <div className="flex flex-col items-center justify-center mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Exam Results</h2>
        <div className="h-1 w-24 bg-theme-neonCyan rounded-full mx-auto" />
      </div>

      {examResults.length > 0 ? (
        <div className="flex flex-col gap-4">
          {examResults.map((result) => (
            <div key={result.id} className="glass-panel p-5 rounded-xl border border-slate-300 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${result.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'}`}>
                  {result.score}%
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{result.quizName}</h4>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{result.courseName} - {new Date(result.date).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.passed ? 'bg-emerald-500 text-slate-900 dark:text-white' : 'bg-rose-500 text-slate-900 dark:text-white'}`}>
                  {result.passed ? 'Passed' : 'Failed'}
                </span>
                {/* 
                  هذا الزر ينقل المستخدم لشاشة عرض الكورس وتحديداً لدرس الامتحان مع تمرير الإجابات المحفوظة كـ state
                  بحيث إذا استقبلت صفحة CoursePlayer هذه البيانات يمكنها عرض الامتحان كـ "مراجعة" فقط 
                */}
                <Link
                  to={`/courses/${result.courseId}/play`}
                  state={{ reviewQuizId: result.lessonId, answers: JSON.parse(result.answersJson) }}
                  className="px-4 py-2 bg-theme-accent/20 hover:bg-theme-accent/40 text-theme-neonCyan border border-theme-accent/50 rounded-lg text-sm transition-all flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Review correct answers
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Award className="w-12 h-12 text-slate-500 dark:text-slate-400 mb-4 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No exam results</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">You haven't taken any exams yet.</p>
        </div>
      )}
    </div>
  );

  const renderHomeworkResults = () => (
    <div>
      <div className="flex flex-col items-center justify-center mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 text-amber-400">Homework Results</h2>
        <div className="h-1 w-24 bg-amber-500 rounded-full mx-auto" />
      </div>

      {homeworkResults.length > 0 ? (
        <div className="flex flex-col gap-4">
          {homeworkResults.map((result) => (
            <div key={result.id} className="glass-panel p-5 rounded-xl border border-slate-300 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${result.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-amber-500/20 text-amber-400 border border-amber-500/50'}`}>
                  {result.score}%
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{result.homeworkName}</h4>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{result.courseName} - {new Date(result.date).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.passed ? 'bg-emerald-500 text-slate-900 dark:text-white' : 'bg-amber-500 text-slate-900 dark:text-white'}`}>
                  {result.passed ? 'Completed' : 'Completed (Below passing rate)'}
                </span>
                <Link
                  to={`/courses/${result.courseId}/play`}
                  state={{ reviewQuizId: result.lessonId, answers: JSON.parse(result.answersJson), isHomework: true }}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 border border-amber-500/50 rounded-lg text-sm transition-all flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Review correct answers
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <ClipboardList className="w-12 h-12 text-slate-500 dark:text-slate-400 mb-4 mx-auto" /> 
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No homework results</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">You haven't submitted any homework yet.</p>
        </div>
      )}
    </div>
  );

  const renderInvoices = () => (
    <div>
      <div className="flex flex-col items-center justify-center mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Invoices</h2>
        <div className="h-1 w-24 bg-theme-neonCyan rounded-full mx-auto" />
      </div>

      {loadingCourses ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length > 0 ? (
        <div className="flex flex-col gap-4">
          {courses.map((course) => (
            <div key={course.id} className="glass-panel p-5 rounded-xl border border-slate-300 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-theme-neonCyan/20 flex items-center justify-center text-theme-neonCyan border border-theme-neonCyan/50">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Invoice: {course.title}</h4>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Date: {new Date(course.enrolledAt || new Date()).toLocaleDateString('ar-EG')} • Price: {course.price === 0 ? 'Free' : `${course.price} $`}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => downloadInvoice(course)}
                  className="px-4 py-2 bg-theme-accent/20 hover:bg-theme-accent/40 text-theme-neonCyan border border-theme-accent/50 rounded-lg text-sm transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download (Excel)
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-500 dark:text-slate-400 mb-4 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No invoices</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">You haven't made any payments yet.</p>
        </div>
      )}
    </div>
  );

  const renderPoints = () => {
    const history: { id: string; title: string; points: number; type: string; date: string }[] = [];
    
    courses.forEach(course => {
      history.push({
        id: `sub_${course.id}`,
        title: `Subscription to course: ${course.title}`,
        points: 20,
        type: 'subscription',
        date: course.enrolledAt || new Date().toISOString()
      });
      if (course.completedLessons > 0) {
        history.push({
          id: `vid_${course.id}`,
          title: `Watching ${course.completedLessons} videos in: ${course.title}`,
          points: course.completedLessons * 5,
          type: 'videos',
          date: course.enrolledAt || new Date().toISOString()
        });
      }
    });

    examResults.forEach(exam => {
      const isExam = exam.type === 'exam';
      history.push({
        id: `exam_${exam.id}`,
        title: isExam ? `امتحان نهائي باسم المدرس: ${exam.quizName}` : `Solving exam: ${exam.quizName}`,
        points: isExam ? 20 : 10,
        type: isExam ? 'final_exam' : 'exam',
        date: exam.date
      });
    });

    homeworkResults.forEach(hw => {
      history.push({
        id: `hw_${hw.id}`,
        title: `Solving homework: ${hw.homeworkName}`,
        points: 5,
        type: 'homework',
        date: hw.date
      });
    });

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const filteredHistory = history.filter(item => pointsFilter === 'all' || item.type === pointsFilter);
    const totalPoints = history.reduce((acc, curr) => acc + curr.points, 0);

    return (
      <div className="animate-fade-in">
        <div className="flex flex-col items-center justify-center mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            My Points
            <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400" />
          </h2>
          <div className="h-1 w-24 bg-theme-neonCyan rounded-full mx-auto" />
        </div>

        <div className="glass-panel p-6 rounded-xl border border-slate-300 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 border border-yellow-500/50">
              <Star className="w-8 h-8 fill-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Total Points</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Points earned from your interaction</p>
            </div>
          </div>
          <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
            {totalPoints}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Point History ({filteredHistory.length})</h4>
          <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200 dark:border-white/5">
            <button onClick={() => setPointsFilter('all')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${pointsFilter === 'all' ? 'bg-theme-accent text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>All Points</button>
            <button onClick={() => setPointsFilter('videos')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${pointsFilter === 'videos' ? 'bg-theme-accent text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Watching Videos</button>
            <button onClick={() => setPointsFilter('exam')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${pointsFilter === 'exam' ? 'bg-theme-accent text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Exam</button>
            <button onClick={() => setPointsFilter('final_exam')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${pointsFilter === 'final_exam' ? 'bg-theme-accent text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>امتحان نهائي</button>
            <button onClick={() => setPointsFilter('homework')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${pointsFilter === 'homework' ? 'bg-theme-accent text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>واجب</button>
            <button onClick={() => setPointsFilter('subscription')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${pointsFilter === 'subscription' ? 'bg-theme-accent text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>اشتراك في كورس</button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredHistory.length > 0 ? (
            filteredHistory.map(item => (
              <div key={item.id} className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.type === 'subscription' ? 'bg-theme-neonPurple/20 text-theme-neonPurple' :
                    item.type === 'final_exam' ? 'bg-rose-500/20 text-rose-500' :
                    item.type === 'exam' ? 'bg-theme-neonCyan/20 text-theme-neonCyan' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {item.type === 'subscription' ? <Star className="w-5 h-5" /> : (item.type === 'exam' || item.type === 'final_exam') ? <Award className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h5 className="text-slate-900 dark:text-white font-semibold text-sm mb-1">{item.title}</h5>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.date).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-bold text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full">
                  <span>+</span>
                  <span>{item.points}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
              No matching point records found.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTop10 = () => (
    <div className="animate-fade-in">
      <div className="flex flex-col items-center justify-center mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
          Top 10
          <Trophy className="w-8 h-8 text-theme-neonCyan" />
        </h2>
        <div className="h-1 w-24 bg-theme-neonCyan rounded-full mx-auto" />
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl border border-slate-300 dark:border-white/10 shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-white/5 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-300 dark:border-white/10">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Education Type</th>
                <th className="px-6 py-4">Grade Level</th>
                <th className="px-6 py-4">Governorate</th>
                <th className="px-6 py-4">Section</th>
                <th className="px-6 py-4">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingLeaderboard ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="w-10 h-10 border-4 border-theme-neonCyan border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : leaderboard.length > 0 ? (
                leaderboard.map((student, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                        student.rank === 1 ? 'bg-yellow-500 text-slate-900 shadow-[0_0_10px_rgba(234,179,8,0.5)]' :
                        student.rank === 2 ? 'bg-slate-300 text-slate-900 shadow-[0_0_10px_rgba(203,213,225,0.5)]' :
                        student.rank === 3 ? 'bg-amber-600 text-slate-900 dark:text-white shadow-[0_0_10px_rgba(217,119,6,0.5)]' :
                        'bg-theme-neonCyan/20 text-theme-neonCyan'
                      }`}>
                        {student.rank}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{student.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{student.type}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">{student.grade}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                        {student.gov}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-theme-neonPurple/10 text-theme-neonPurple border border-theme-neonPurple/20 text-xs">
                        {student.dept}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 font-bold border border-yellow-500/30">
                        {student.points}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500 dark:text-slate-400">
                    No matching point records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 pt-32 pb-24 rtl flex flex-col md:flex-row gap-8">
      
      {/* Right Sidebar */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <div className="glass-panel p-4 rounded-xl flex items-center gap-3 mb-2 justify-center border border-slate-200 dark:border-white/5">
          <div className="w-12 h-12 rounded-full bg-theme-accent/20 border border-theme-accent/50 flex items-center justify-center text-theme-neonCyan">
            <User className="w-6 h-6" />
          </div>
        </div>
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 flex flex-col">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all duration-300 border-b border-slate-200 dark:border-white/5 last:border-0 ${
                  isActive 
                    ? 'bg-gradient-to-r from-theme-accent to-theme-neonCyan text-slate-900 dark:text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isActive ? null : <Icon className="w-4 h-4" />}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 glass-panel rounded-2xl border border-slate-300 dark:border-white/10 p-8 min-h-[500px]">
        {activeTab === 'profile' && renderProfileStats()}
        {activeTab === 'subscriptions' && renderSubscriptions()}
        {activeTab === 'my_courses' && renderSubscriptions()}
        {activeTab === 'exam_results' && renderExamResults()}
        {activeTab === 'invoices' && renderInvoices()}
        {activeTab === 'eval_results' && renderPoints()}
        {activeTab === 'question_bank' && renderTop10()}
        {activeTab === 'hw_results' && renderHomeworkResults()}
        {/* You can add more conditional renders for other tabs here */}
        {!['profile', 'subscriptions', 'my_courses', 'exam_results', 'invoices', 'eval_results', 'question_bank', 'hw_results'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 gap-4 mt-20">
            <HelpCircle className="w-12 h-12 opacity-50" />
            <p>This page is currently under development.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
