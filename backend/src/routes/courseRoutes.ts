import { Router, Request, Response } from 'express';
import {
  getCategories,
  createCategory,
  deleteCategory,
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  toggleLessonProgress,
  getCourseProgress,
  addReview,
  getSecureVideoUrl
} from '../controllers/courseController';
import { protect, authorize, optionalAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import multer from 'multer';
import { uploadQuizExcel, getQuizByLesson, submitQuiz, getQuizResultsByLesson } from '../controllers/quizController';
import { uploadHomeworkExcel, getHomeworkByLesson, submitHomework } from '../controllers/homeworkController';

// ✅ multer خاص بالـ Quiz يستخدم memoryStorage للتوافق مع Railway
const quizUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  // لا نضيف fileFilter هنا لأن xlsx يأتي بـ MIME type طويل ومعقد - التحقق يتم في الـ Controller
});

const router = Router();

// Categories
router.get('/categories', getCategories);
router.post('/categories', protect as any, authorize('ADMIN') as any, createCategory);
router.delete('/categories/:id', protect as any, authorize('ADMIN') as any, deleteCategory);

// Courses CRUD + Enrollment
router.get('/', getCourses);
router.get('/:id', optionalAuth as any, getCourseById as any);
router.post('/', protect as any, authorize('ADMIN') as any, createCourse as any);
router.put('/:id', protect as any, authorize('ADMIN') as any, updateCourse);
router.delete('/:id', protect as any, authorize('ADMIN') as any, deleteCourse);
router.post('/enroll', protect as any, enrollCourse as any);

// Lessons CRUD
router.post('/lessons', protect as any, authorize('ADMIN') as any, createLesson);
router.put('/lessons/:id', protect as any, authorize('ADMIN') as any, updateLesson);
router.delete('/lessons/:id', protect as any, authorize('ADMIN') as any, deleteLesson);

// Progress
router.post('/progress/toggle', protect as any, toggleLessonProgress as any);
router.get('/progress/:courseId', protect as any, getCourseProgress as any);

// Secure Video
router.get('/lessons/:lessonId/secure-url', protect as any, getSecureVideoUrl as any);

// Quiz
router.post('/quiz/upload', quizUpload.single('file'), protect as any, authorize('ADMIN') as any, uploadQuizExcel as any);
router.get('/lessons/:lessonId/quiz', protect as any, getQuizByLesson as any);
router.post('/lessons/:lessonId/quiz/submit', protect as any, submitQuiz as any);
router.get('/lessons/:lessonId/quiz/results', protect as any, authorize('ADMIN') as any, getQuizResultsByLesson as any);

// Reviews
router.post('/reviews', protect as any, addReview as any);

// Homework
router.post('/homework/upload', quizUpload.single('file'), protect as any, authorize('ADMIN') as any, uploadHomeworkExcel as any);
router.get('/lessons/:lessonId/homework', protect as any, getHomeworkByLesson as any);
router.post('/lessons/:lessonId/homework/submit', protect as any, submitHomework as any);

// Generic File Upload (images, etc.)
router.post('/upload', protect as any, upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ message: 'File uploaded successfully', fileUrl });
  } catch (error: any) {
    res.status(500).json({ message: 'Upload error', error: error.message });
  }
});

// PDF Upload Endpoint
router.post('/upload-pdf', protect as any, authorize('ADMIN') as any, upload.single('pdf'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }
    const pdfUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ message: 'PDF uploaded successfully', pdfUrl });
  } catch (error: any) {
    res.status(500).json({ message: 'PDF upload error', error: error.message });
  }
});

export default router;
