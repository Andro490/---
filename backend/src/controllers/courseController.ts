import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// --- إعدادات Bunny.net (يتم قراءتها من متغيرات البيئة) ---
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || '669586'; // المكتبة الافتراضية
const BUNNY_TOKEN_KEY = process.env.BUNNY_TOKEN_KEY || '';       // المفتاح الافتراضي
const BUNNY_URL_EXPIRY = parseInt(process.env.BUNNY_URL_EXPIRY || '0'); // 4 ساعات

/**
 * يجلب الـ Token Key الخاص بكل مكتبة تلقائياً.
 * لو عندك مكتبة بمفتاح خاص، حط في الـ .env:
 *   BUNNY_TOKEN_KEY_669586 = مفتاح_المكتبة_الأولى
 *   BUNNY_TOKEN_KEY_123456 = مفتاح_المكتبة_الثانية
 * والكود هيجيبلك المفتاح الصح تلقائياً بدون أي تعديل في الكود.
 */
const getBunnyTokenKey = (libId: string): string => {
  // ابحث أولاً عن مفتاح خاص بهذه المكتبة تحديداً
  const specificKey = process.env[`BUNNY_TOKEN_KEY_${libId}`];
  if (specificKey) return specificKey;
  // إذا ما كان لا يوجد مفتاح خاص، استخدم الافتراضي
  return BUNNY_TOKEN_KEY;
};

// --- VALIDATION HELPERS ---

const validateString = (value: any, minLength: number = 1, maxLength: number = 500): boolean => {
  return typeof value === 'string' && value.trim().length >= minLength && value.length <= maxLength;
};

const validatePrice = (value: any): boolean => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
};

// --- CATEGORIES ---

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { courses: true }
        }
      }
    });
    res.status(200).json(categories);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving categories', error: error.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // ✅ INPUT VALIDATION
    if (!validateString(name, 1, 100)) {
      return res.status(400).json({ message: 'Category name is required (1-100 characters)' });
    }

    // ✅ توليد الـ Slug تلقائياً من الاسم
    const slug = name.trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0621-\u064a-]/g, '') // دعم الحروف العربية والإنجليزية
      .slice(0, 100);

    // ✅ التحقق من عدم وجود تصنيف بنفس الاسم مسبقاً
    const existing = await prisma.category.findFirst({ where: { slug } });
    if (existing) {
      return res.status(409).json({ message: 'هذا التصنيف موجود بالفعل' });
    }

    const category = await prisma.category.create({
      data: { name: name.trim(), slug },
      include: { _count: { select: { courses: true } } }
    });

    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { courses: true } } }
    });

    if (!category) {
      return res.status(404).json({ message: 'التصنيف غير موجود' });
    }

    if (category._count.courses > 0) {
      return res.status(400).json({
        message: `لا يمكن حذف هذا التصنيف لأنه يحتوي على ${category._count.courses} دورة. يرجى حذف الدورات أولاً أو نقلها لتصنيف آخر.`
      });
    }

    await prisma.category.delete({ where: { id } });
    res.status(200).json({ message: 'تم حذف التصنيف بنجاح' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};


// --- COURSES ---

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        category: true,
        lessons: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { enrollments: true, reviews: true }
        }
      }
    });
    res.status(200).json(courses);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving courses', error: error.message });
  }
};

export const getCourseById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        lessons: {
          orderBy: { order: 'asc' }
        },
        reviews: {
          include: {
            user: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: { enrollments: true }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is enrolled
    let isEnrolled = false;
    const userId = req.user?.userId;
    if (userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: id } }
      });
      if (enrollment) isEnrolled = true;
    }

    // Is Admin or Instructor?
    const isInstructorOrAdmin = userId && (req.user?.role === 'ADMIN' || course.instructorId === userId);

    // 🔒 إخفاء رابط الفيديو الآمن دائماً من الـ API Response
    // حتى المستخدمين المشتركين لا يحصلون على الرابط هنا — يطلبونه عبر endpoint منفصل
    course.lessons = course.lessons.map(lesson => {
      if (lesson.platformType === 'secure') {
        return {
          ...lesson,
          videoUrl: null // لا نرسل الرابط أبداً في هذا الـ endpoint
        };
      }
      return lesson;
    });

    res.status(200).json(course);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving course', error: error.message });
  }
};

// --- SECURE VIDEO URL GENERATION ---
export const getSecureVideoUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true }
    });

    if (!lesson || !lesson.videoUrl || lesson.platformType !== 'secure') {
      return res.status(404).json({ message: 'Secure video not found for this lesson' });
    }

    // Check enrollment
    const isInstructorOrAdmin = req.user?.role === 'ADMIN' || lesson.course.instructorId === userId;
    let isEnrolled = false;

    if (!isInstructorOrAdmin) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: lesson.courseId } }
      });
      isEnrolled = !!enrollment;
    }

    if (!isEnrolled && !isInstructorOrAdmin) {
      return res.status(403).json({ message: 'Forbidden: You must be enrolled in this course to view the video.' });
    }

    // Generate Bunny.net Token Authentication
    const videoId = lesson.videoUrl;
    const libId = lesson.libraryId || BUNNY_LIBRARY_ID;
    const tokenKey = lesson.tokenKey || getBunnyTokenKey(libId); // الأولوية למفتاح الدرس، ثم المكتبة، ثم الافتراضي
    const expires = Math.floor(Date.now() / 1000) + BUNNY_URL_EXPIRY;
    const hash = crypto.createHash('sha256')
      .update(`${tokenKey}${videoId}${expires}`)
      .digest('hex');

    // إذا لم يكن هناك Token Key، نقوم بتوليد رابط عادي بدون تشفير
    let signedUrl = `https://player.mediadelivery.net/embed/${libId}/${videoId}`;
    if (tokenKey) {
      signedUrl += `?token=${hash}&expires=${expires}`;
    }

    res.status(200).json({ url: signedUrl });
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating secure video URL', error: error.message });
  }
};

export const createCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, price, categoryId, thumbnail } = req.body;
    const instructorId = req.user?.userId;

    // ✅ INPUT VALIDATION
    if (!validateString(title, 1, 200)) {
      return res.status(400).json({ message: 'Title is required and must be 1-200 characters' });
    }
    if (!validateString(description, 10, 5000)) {
      return res.status(400).json({ message: 'Description is required and must be 10-5000 characters' });
    }
    if (!validatePrice(price)) {
      return res.status(400).json({ message: 'Price must be a valid number >= 0' });
    }
    if (!categoryId || typeof categoryId !== 'string') {
      return res.status(400).json({ message: 'Valid category ID is required' });
    }
    if (!instructorId) {
      return res.status(401).json({ message: 'Unauthorized: User ID not found' });
    }

    // ✅ VERIFY CATEGORY EXISTS
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        thumbnail: thumbnail || null,
        categoryId,
        instructorId,
      }
    });

    res.status(201).json(course);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

export const updateCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, price, categoryId, thumbnail } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // ✅ VERIFY COURSE EXISTS AND USER IS THE OWNER
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // ✅ OWNERSHIP CHECK - Only the instructor can update their course
    if (course.instructorId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to update this course' });
    }

    // ✅ INPUT VALIDATION
    if (title !== undefined && !validateString(title, 1, 200)) {
      return res.status(400).json({ message: 'Title must be 1-200 characters' });
    }
    if (description !== undefined && !validateString(description, 10, 5000)) {
      return res.status(400).json({ message: 'Description must be 10-5000 characters' });
    }
    if (price !== undefined && !validatePrice(price)) {
      return res.status(400).json({ message: 'Price must be a valid number >= 0' });
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        thumbnail,
        categoryId
      }
    });

    res.status(200).json(updatedCourse);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
};

export const deleteCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // ✅ VERIFY COURSE EXISTS
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // ✅ OWNERSHIP CHECK - Only the instructor can delete their course
    if (course.instructorId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this course' });
    }

    await prisma.course.delete({ where: { id } });
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
};

// --- ENROLLMENT & PAYMENTS (Mock Payment Integrations) ---

export const enrollCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.body;
    const userId = req.user?.userId;

    if (!userId || !courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId }
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Generate a payment transaction
    const transactionId = 'TXN-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    await prisma.payment.create({
      data: {
        userId,
        courseId,
        amount: course.price,
        status: 'SUCCESS', // Mock successful checkout
        transactionId
      }
    });

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId
      },
      include: {
        course: true
      }
    });

    res.status(201).json({
      message: 'Enrolled successfully',
      enrollment
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error enrolling in course', error: error.message });
  }
};

// --- LESSONS ---

export const createLesson = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, title, content, videoUrl, pdfUrl, duration, order, platformType, libraryId, tokenKey } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // ✅ INPUT VALIDATION
    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ message: 'Valid course ID is required' });
    }
    if (!validateString(title, 1, 200)) {
      return res.status(400).json({ message: 'Title is required and must be 1-200 characters' });
    }

    // ✅ VERIFY COURSE EXISTS
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // ✅ OWNERSHIP CHECK - Only course instructor can create lessons
    if (course.instructorId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You can only create lessons in your own courses' });
    }

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title: title.trim(),
        content: content ? String(content).trim() : '',
        videoUrl: videoUrl ? String(videoUrl).trim() : '',
        pdfUrl: pdfUrl ? String(pdfUrl).trim() : '',
        platformType: platformType || 'youtube',
        libraryId: libraryId ? String(libraryId).trim() : undefined,
        tokenKey: tokenKey ? String(tokenKey).trim() : undefined,
        duration: parseInt(duration) || 0,
        order: parseInt(order) || 0,
      }
    });

    res.status(201).json(lesson);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating lesson', error: error.message });
  }
};

export const updateLesson = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, videoUrl, pdfUrl, duration, order, platformType, libraryId, tokenKey } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // ✅ VERIFY LESSON EXISTS
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { course: true }
    });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // ✅ OWNERSHIP CHECK - Only course instructor can update lessons
    if (lesson.course.instructorId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You can only update lessons in your own courses' });
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        content: content !== undefined ? String(content).trim() : undefined,
        videoUrl: videoUrl !== undefined ? String(videoUrl).trim() : undefined,
        pdfUrl: pdfUrl !== undefined ? String(pdfUrl).trim() : undefined,
        platformType: platformType !== undefined ? String(platformType).trim() : undefined,
        libraryId: libraryId !== undefined ? String(libraryId).trim() : undefined,
        tokenKey: tokenKey !== undefined ? String(tokenKey).trim() : undefined,
        duration: duration !== undefined ? parseInt(duration) : undefined,
        order: order !== undefined ? parseInt(order) : undefined,
      }
    });

    res.status(200).json(updatedLesson);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating lesson', error: error.message });
  }
};

export const deleteLesson = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // ✅ VERIFY LESSON EXISTS
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { course: true }
    });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // ✅ OWNERSHIP CHECK - Only course instructor can delete lessons
    if (lesson.course.instructorId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You can only delete lessons in your own courses' });
    }

    await prisma.lesson.delete({ where: { id } });
    res.status(200).json({ message: 'Lesson deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting lesson', error: error.message });
  }
};

// --- PROGRESS ---

export const toggleLessonProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lessonId, forceComplete } = req.body;
    const userId = req.user?.userId;

    if (!userId || !lessonId) {
      return res.status(400).json({ message: 'Lesson ID is required' });
    }

    // ✅ VERIFY LESSON EXISTS
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true }
    });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // ✅ ENROLLMENT CHECK - User must be enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: lesson.courseId }
      }
    });
    if (!enrollment && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You must be enrolled in this course' });
    }

    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId }
      }
    });

    let progress;
    if (existingProgress) {
      progress = await prisma.progress.update({
        where: { id: existingProgress.id },
        data: { 
          completed: forceComplete ? true : !existingProgress.completed 
        }
      });
    } else {
      progress = await prisma.progress.create({
        data: {
          userId,
          lessonId,
          completed: true
        }
      });
    }

    res.status(200).json({
      message: 'Progress updated successfully',
      progress
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error toggling progress', error: error.message });
  }
};

export const getCourseProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;

    if (!userId || !courseId) {
      return res.status(400).json({ message: 'Unauthorized or invalid parameters' });
    }

    // ✅ ENROLLMENT CHECK - User must be enrolled in the course or an Admin
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId }
      }
    });
    if (!enrollment && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You must be enrolled in this course' });
    }

    // Get all lessons in this course
    const lessons = await prisma.lesson.findMany({
      where: { courseId },
      select: { id: true }
    });

    const lessonIds = lessons.map((lesson: any) => lesson.id);

    // Get completed progress records for these lessons
    const completedProgress = await prisma.progress.count({
      where: {
        userId,
        lessonId: { in: lessonIds },
        completed: true
      }
    });

    const totalLessons = lessons.length;
    const percentage = totalLessons > 0 ? Math.round((completedProgress / totalLessons) * 100) : 0;

    // Return completed lesson ids as well to update UI checked states
    const progressList = await prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds }
      },
      select: { lessonId: true, completed: true }
    });

    res.status(200).json({
      percentage,
      completedCount: completedProgress,
      totalCount: totalLessons,
      progressList
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error calculating progress', error: error.message });
  }
};

// --- REVIEWS ---

export const addReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, rating, comment } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // ✅ INPUT VALIDATION
    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ message: 'Valid course ID is required' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }
    if (!validateString(comment, 5, 1000)) {
      return res.status(400).json({ message: 'Comment must be 5-1000 characters' });
    }

    // ✅ ENROLLMENT CHECK - User must be enrolled in the course or an Admin
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId }
      }
    });
    if (!enrollment && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You must be enrolled in this course to add a review' });
    }

    const review = await prisma.review.upsert({
      where: {
        userId_courseId: { userId, courseId }
      },
      update: {
        rating: parseInt(rating),
        comment: comment.trim()
      },
      create: {
        userId,
        courseId,
        rating: parseInt(rating),
        comment: comment.trim()
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    res.status(201).json(review);
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding/updating review', error: error.message });
  }
};