import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const getStudentDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all enrollments for this user
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            lessons: true,
            category: true,
            _count: {
              select: { lessons: true }
            }
          }
        }
      }
    });

    // Calculate progress for each course
    let userTotalExams = 0;
    let userCompletedExams = 0;

    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const course = enrollment.course;
        const totalLessons = course.lessons.length;

        // Get completed lessons
        const lessonIds = course.lessons.map((lesson: any) => lesson.id);
        const completedCount = await prisma.progress.count({
          where: {
            userId,
            lessonId: { in: lessonIds },
            completed: true
          }
        });

        // 💡 إحصائيات الامتحانات: حساب الكويزات الموجودة والمنجزة
        const quizLessons = course.lessons.filter((l: any) => l.platformType === 'quiz');
        userTotalExams += quizLessons.length;
        
        if (quizLessons.length > 0) {
          const quizLessonIds = quizLessons.map((l: any) => l.id);
          const completedQuizCount = await prisma.progress.count({
            where: {
              userId,
              lessonId: { in: quizLessonIds },
              completed: true
            }
          });
          userCompletedExams += completedQuizCount;
        }

        const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

        return {
          id: course.id,
          title: course.title,
          description: course.description,
          price: course.price,
          thumbnail: course.thumbnail,
          category: course.category.name,
          progress: progressPercent,
          completedLessons: completedCount,
          totalLessons: totalLessons,
          enrolledAt: enrollment.createdAt
        };
      })
    );

    // Fetch Quiz Results for this user
    const quizResults = await prisma.quizResult.findMany({
      where: { userId },
      include: {
        quiz: {
          include: {
            lesson: {
              include: { course: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedExamResults = quizResults.map((result: any) => ({
      id: result.id,
      quizId: result.quizId,
      courseId: result.quiz.lesson.course.id,
      lessonId: result.quiz.lesson.id,
      courseName: result.quiz.lesson.course.title,
      quizName: result.quiz.title,
      type: result.quiz.type,
      score: result.scorePercentage,
      passed: result.passed,
      date: result.createdAt,
      answersJson: result.answersJson
    }));

    // Fetch Homework Results for this user
    const homeworkResultsData = await prisma.homeworkResult.findMany({
      where: { userId },
      include: {
        homework: {
          include: {
            lesson: {
              include: { course: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedHomeworkResults = homeworkResultsData.map((result: any) => ({
      id: result.id,
      homeworkId: result.homeworkId,
      courseId: result.homework.lesson.course.id,
      lessonId: result.homework.lesson.id,
      courseName: result.homework.lesson.course.title,
      homeworkName: result.homework.title,
      score: result.scorePercentage,
      passed: result.passed,
      date: result.createdAt,
      answersJson: result.answersJson
    }));

    res.status(200).json({
      enrolledCourses: coursesWithProgress,
      totalExams: userTotalExams,
      completedExams: userCompletedExams,
      examResults: formattedExamResults,
      homeworkResults: formattedHomeworkResults
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving student dashboard', error: error.message });
  }
};

export const deleteAllStudents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await prisma.user.deleteMany({
      where: { role: 'STUDENT' }
    });

    res.status(200).json({ 
      message: 'All student accounts have been permanently deleted.',
      count: result.count
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting students', error: error.message });
  }
};

export const deleteUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // You can add logic to prevent deleting yourself if needed, but since it's just an admin action:
    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

export const getAdminStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // ✅ VERIFY ADMIN ROLE
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }

    const totalUsers = await prisma.user.count();
    const totalCourses = await prisma.course.count();
    const totalEnrollments = await prisma.enrollment.count();
    const totalUniqueVisitors = await prisma.visitor.count();
    
    // Calculate unregistered visitors by subtracting registered users from total visitors
    // Using Math.max(0, ...) ensures it doesn't show negative numbers for old users who registered before tracking started.
    const unregisteredVisitors = Math.max(0, totalUniqueVisitors - totalUsers);

    const payments = await prisma.payment.findMany({
      where: { status: 'SUCCESS' },
      select: { amount: true }
    });
    const totalRevenue = payments.reduce((acc: any, current: any) => acc + current.amount, 0);

    // ✅ DO NOT EXPOSE EMAIL ADDRESSES
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true, 
        name: true, 
        // ❌ REMOVED: email: true - sensitive data
        role: true, 
        createdAt: true 
      }
    });

    const recentPayments = await prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } }
      }
    });

    // Generate mock monthly sales data for the dashboard chart
    const monthlySales = [
      { month: 'Jan', sales: totalRevenue * 0.1 },
      { month: 'Feb', sales: totalRevenue * 0.15 },
      { month: 'Mar', sales: totalRevenue * 0.2 },
      { month: 'Apr', sales: totalRevenue * 0.25 },
      { month: 'May', sales: totalRevenue * 0.3 }
    ];

    res.status(200).json({
      summary: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalRevenue,
        unregisteredVisitors
      },
      recentUsers,
      recentPayments,
      monthlySales
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving admin stats', error: error.message });
  }
};

// ============================================================
// PUBLIC STATS — No authentication required
// Powers the SocialProof section on the homepage
// ============================================================
export const getPublicStats = async (_req: Request, res: Response) => {
  try {
    // 1. عدد الطلاب المسجلين فعلياً
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT' }
    });

    // 2. عدد الكورسات المتاحة
    const totalCourses = await prisma.course.count();

    // 3. مجموع ساعات الدروس (duration مخزّن بالثواني → نحوّله لساعات)
    const durationAgg = await prisma.lesson.aggregate({
      _sum: { duration: true }
    });
    const totalSeconds = durationAgg._sum.duration ?? 0;
    const totalHours = Math.round(totalSeconds / 3600);

    // 4. متوسط تقييمات الكورسات من جدول Reviews
    const ratingAgg = await prisma.review.aggregate({
      _avg: { rating: true }
    });
    const avgRating = ratingAgg._avg.rating
      ? parseFloat(ratingAgg._avg.rating.toFixed(1))
      : 0;

    res.status(200).json({
      totalStudents,
      totalCourses,
      totalHours,
      avgRating
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving public stats', error: error.message });
  }
};

export const getLeaderboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get recent/top students
    const topUsers = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        governorate: true,
        educationType: true,
        gradeLevel: true,
        section: true,
        _count: {
          select: {
            enrollments: true,
            progresses: { where: { completed: true } },
            quizResults: { where: { passed: true } },
            homeworkResults: { where: { passed: true } }
          }
        }
      }
    });

    const leaderboard = topUsers.map((u) => {
      // Calculate points based on the same logic: enrollments * 20, progress * 5, quizzes * 10, homeworks * 5
      let points = (u._count.enrollments * 20) + (u._count.progresses * 5) + (u._count.quizResults * 10) + (u._count.homeworkResults * 5);
      
      return {
        id: u.id,
        name: u.name,
        points: points,
        type: u.educationType || 'عام',
        grade: u.gradeLevel || 'غير محدد',
        gov: u.governorate || 'غير محدد',
        dept: u.section || 'غير محدد'
      };
    });

    // Sort by points descending and add rank
    leaderboard.sort((a, b) => b.points - a.points);
    // Take top 10 after sort
    const rankedLeaderboard = leaderboard.slice(0, 10).map((u, i) => ({ ...u, rank: i + 1 }));

    res.status(200).json(rankedLeaderboard);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving leaderboard', error: error.message });
  }
};
