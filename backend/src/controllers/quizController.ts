import { Request, Response } from 'express';
import prisma from '../config/db';
import * as xlsx from 'xlsx';

// ✅ uploadQuizExcel يستخدم memoryStorage (buffer) بدلاً من diskStorage
// لأن Railway يستخدم Ephemeral Filesystem ولا يحتفظ بالملفات على القرص
export const uploadQuizExcel = async (req: Request, res: Response) => {
  try {
    const { lessonId, title, passScore } = req.body;
    const file = req.file;

    console.log('Quiz upload request - lessonId:', lessonId, '| file:', file?.originalname, '| size:', file?.size);

    if (!file || !lessonId) {
      return res.status(400).json({ 
        message: 'Missing file or lessonId',
        received: { hasFile: !!file, lessonId: lessonId || 'MISSING' }
      });
    }

    // Check if lesson exists
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found', lessonId });
    }

    // ✅ قراءة الملف من الـ Buffer مباشرة بداخل Try-Catch لالتقاط أخطاء الـ Excel
    let workbook;
    try {
      workbook = xlsx.read(file.buffer, { type: 'buffer' });
    } catch (parseError: any) {
      console.error('Excel Parsing Error:', parseError);
      return res.status(400).json({ 
        message: 'فشل قراءة ملف الإكسيل. تأكد من أن الملف بصيغة صالحة وغير تالف.', 
        error: parseError.message 
      });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // تحويل إلى JSON
    const rawData = xlsx.utils.sheet_to_json(worksheet) as any[];

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or invalid format' });
    }

    console.log(`Parsed ${rawData.length} questions from Excel`);

    // تنسيق الأسئلة
    const questions = rawData.map((row: any) => {
      const options = [row.Option1, row.Option2, row.Option3, row.Option4]
        .filter(Boolean)
        .map(String);
      
      let correctIdx = Number(row.CorrectOption) - 1;
      if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
        correctIdx = 0;
      }

      return {
        questionText: String(row.Question || 'بدون سؤال'),
        options: options.length > 0 ? options : ['صح', 'خطأ'],
        correctOption: correctIdx,
        points: Number(row.Points) || 1,
      };
    });

    // حذف الاختبار القديم إن وجد (استبداله)
    try {
      const existingQuiz = await prisma.quiz.findUnique({ where: { lessonId } });
      if (existingQuiz) {
        await prisma.quiz.delete({ where: { id: existingQuiz.id } });
      }
    } catch (dbError: any) {
      console.error('Database Error checking/deleting old quiz:', dbError);
      // نستمر في المحاولة حتى لو فشل الحذف
    }

    // إنشاء الاختبار والأسئلة دفعة واحدة (Nested Write)
    const newQuiz = await prisma.quiz.create({
      data: {
        title: title || 'اختبار الدرس',
        passScore: Number(passScore) || 50,
        type: lesson.platformType === 'exam' ? 'exam' : 'practice',
        lessonId,
        questions: {
          create: questions,
        },
      },
      include: {
        questions: true,
      },
    });

    console.log('Quiz created successfully with', newQuiz.questions.length, 'questions');
    res.status(201).json({ message: 'Quiz created successfully', quiz: newQuiz });
  } catch (error: any) {
    console.error('Quiz upload error:', error);
    // 💡 تعديل مؤقت: إرسال تفاصيل الخطأ الفعلية للفرونت إند لنتمكن من تشخيص المشكلة
    const errorDetails = error.message || String(error);
    res.status(500).json({ 
      message: `Error uploading quiz: ${errorDetails}`, 
      error: errorDetails 
    });
  }
};

export const getQuizByLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const userId = (req as any).user?.userId;

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        lesson: true,
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            points: true,
            // DO NOT SEND correctOption to the frontend!
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // ─── للامتحانات النهائية: تحقق إن كان الطالب أداه مسبقاً ───────────────
    let alreadyTaken = false;
    let previousResult: {
      scorePercentage: number;
      passed: boolean;
      submittedAt: Date;
    } | null = null;

    const isExam = quiz.type === 'exam' || quiz.lesson.platformType === 'exam';

    if (isExam && userId) {
      const existingResult = await prisma.quizResult.findUnique({
        where: { userId_quizId: { userId, quizId: quiz.id } }
      });
      if (existingResult) {
        alreadyTaken = true;
        previousResult = {
          scorePercentage: existingResult.scorePercentage,
          passed: existingResult.passed,
          submittedAt: existingResult.createdAt
        };
      }
    }

    // Override quiz type for frontend if lesson is exam
    if (isExam) quiz.type = 'exam';

    res.status(200).json({ quiz, alreadyTaken, previousResult });
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ message: 'Error fetching quiz', error: error.message });
  }
};

export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { answers } = req.body; // { [questionId]: selectedOptionIndex }
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: { questions: true, lesson: true }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const isExam = quiz.type === 'exam' || quiz.lesson.platformType === 'exam';

    // منع إعادة الامتحانات النهائية (أو السماح بالمراجعة فقط)
    let isReviewMode = false;
    if (isExam) {
      const existingResult = await prisma.quizResult.findUnique({
        where: {
          userId_quizId: { userId, quizId: quiz.id }
        }
      });
      if (existingResult) {
        // إذا كان يراجع الإجابات (من شاشة المراجعة)، نسمح بالتصحيح فقط دون حفظ
        isReviewMode = true;
      }
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const results = quiz.questions.map((q) => {
      totalPoints += q.points;
      const selectedOption = answers[q.id];
      const isCorrect = selectedOption === q.correctOption;
      if (isCorrect) earnedPoints += q.points;
      
      return {
        questionId: q.id,
        isCorrect,
        correctOption: q.correctOption // Now we can reveal it
      };
    });

    const scorePercentage = Math.round((earnedPoints / totalPoints) * 100);
    const passed = scorePercentage >= quiz.passScore;

    // Save or update QuizResult in database (ONLY if not review mode)
    if (!isReviewMode) {
      await prisma.quizResult.upsert({
        where: {
          userId_quizId: { userId, quizId: quiz.id }
        },
        update: {
          scorePercentage,
          passed,
          answersJson: JSON.stringify(answers)
        },
        create: {
          userId,
          quizId: quiz.id,
          scorePercentage,
          passed,
          answersJson: JSON.stringify(answers)
        }
      });

      // Mark the lesson as complete if passed
      if (passed) {
        const progress = await prisma.progress.findUnique({
          where: { userId_lessonId: { userId, lessonId } }
        });
        
        if (!progress) {
          await prisma.progress.create({
            data: { userId, lessonId, completed: true }
          });
        } else if (!progress.completed) {
          await prisma.progress.update({
            where: { id: progress.id },
            data: { completed: true }
          });
        }
      }
    }

    res.status(200).json({
      score: scorePercentage,
      passed,
      earnedPoints,
      totalPoints,
      results
    });
  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Error submitting quiz', error: error.message });
  }
};

// ─── Admin: جلب نتائج جميع الطلاب لاختبار معين ─────────────────────────────
export const getQuizResultsByLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      select: { id: true, title: true, type: true, passScore: true }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found for this lesson' });
    }

    const results = await prisma.quizResult.findMany({
      where: { quizId: quiz.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            governorate: true,
            gradeLevel: true,
            section: true,
            educationType: true
          }
        }
      },
      orderBy: { scorePercentage: 'desc' }
    });

    const formatted = results.map((r: any, idx: number) => ({
      rank: idx + 1,
      studentName: r.user.name,
      email: r.user.email,
      governorate: r.user.governorate || '-',
      grade: r.user.gradeLevel || '-',
      section: r.user.section || '-',
      educationType: r.user.educationType || '-',
      scorePercentage: r.scorePercentage,
      scoreOutOf20: parseFloat(((r.scorePercentage / 100) * 20).toFixed(2)),
      passed: r.passed ? 'نجح' : 'راسب',
      submittedAt: new Date(r.createdAt).toLocaleDateString('ar-EG')
    }));

    res.status(200).json({
      quiz: { title: quiz.title, type: quiz.type, passScore: quiz.passScore },
      results: formatted
    });
  } catch (error: any) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ message: 'Error fetching quiz results', error: error.message });
  }
};
