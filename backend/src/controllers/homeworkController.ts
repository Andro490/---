import { Request, Response } from 'express';
import prisma from '../config/db';
import * as xlsx from 'xlsx';

// ✅ Upload Homework Excel (same pattern as quiz)
export const uploadHomeworkExcel = async (req: Request, res: Response) => {
  try {
    const { lessonId, title, passScore } = req.body;
    const file = req.file;

    console.log('Homework upload - lessonId:', lessonId, '| file:', file?.originalname);

    if (!file || !lessonId) {
      return res.status(400).json({
        message: 'Missing file or lessonId',
        received: { hasFile: !!file, lessonId: lessonId || 'MISSING' }
      });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found', lessonId });
    }

    let workbook;
    try {
      workbook = xlsx.read(file.buffer, { type: 'buffer' });
    } catch (parseError: any) {
      return res.status(400).json({
        message: 'فشل قراءة ملف الإكسيل.',
        error: parseError.message
      });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet) as any[];

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or invalid format' });
    }

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

    // Delete old homework if exists
    try {
      const existing = await prisma.homework.findUnique({ where: { lessonId } });
      if (existing) {
        await prisma.homework.delete({ where: { id: existing.id } });
      }
    } catch (_) {}

    const newHomework = await prisma.homework.create({
      data: {
        title: title || 'واجب الدرس',
        passScore: Number(passScore) || 50,
        lessonId,
        questions: { create: questions },
      },
      include: { questions: true },
    });

    res.status(201).json({ message: 'Homework created successfully', homework: newHomework });
  } catch (error: any) {
    console.error('Homework upload error:', error);
    res.status(500).json({ message: `Error uploading homework: ${error.message}`, error: error.message });
  }
};

// ✅ Get Homework by Lesson (without correct answers)
export const getHomeworkByLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const homework = await prisma.homework.findUnique({
      where: { lessonId },
      include: {
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            points: true,
            // correctOption NOT sent to frontend
          }
        }
      }
    });

    if (!homework) {
      return res.status(404).json({ message: 'Homework not found' });
    }

    res.status(200).json({ homework });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching homework', error: error.message });
  }
};

// ✅ Submit Homework Answers
export const submitHomework = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { answers } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const homework = await prisma.homework.findUnique({
      where: { lessonId },
      include: { questions: true }
    });

    if (!homework) return res.status(404).json({ message: 'Homework not found' });

    let totalPoints = 0;
    let earnedPoints = 0;

    const results = homework.questions.map((q) => {
      totalPoints += q.points;
      const selectedOption = answers[q.id];
      const isCorrect = selectedOption === q.correctOption;
      if (isCorrect) earnedPoints += q.points;

      return { questionId: q.id, isCorrect, correctOption: q.correctOption };
    });

    const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = scorePercentage >= homework.passScore;

    await prisma.homeworkResult.upsert({
      where: { userId_homeworkId: { userId, homeworkId: homework.id } },
      update: { scorePercentage, passed, answersJson: JSON.stringify(answers) },
      create: { userId, homeworkId: homework.id, scorePercentage, passed, answersJson: JSON.stringify(answers) }
    });

    // ✅ تسجيل الواجب كمكتمل بمجرد التسليم — بغض النظر عن الدرجة
    await prisma.progress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completed: true },
      create: { userId, lessonId, completed: true }
    });

    res.status(200).json({ score: scorePercentage, passed, earnedPoints, totalPoints, results });
  } catch (error: any) {
    console.error('Homework submit error:', error);
    res.status(500).json({ message: 'Error submitting homework', error: error.message });
  }
};
