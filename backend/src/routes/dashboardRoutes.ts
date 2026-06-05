import { Router } from 'express';
import { getStudentDashboard, getAdminStats, getLeaderboard, deleteAllStudents, deleteUserById, getPublicStats } from '../controllers/dashboardController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// ✅ Public endpoint — no auth required (homepage stats)
router.get('/public-stats', getPublicStats as any);

router.get('/student', protect as any, getStudentDashboard as any);
router.get('/admin', protect as any, authorize('ADMIN') as any, getAdminStats as any);
router.delete('/admin/students', protect as any, authorize('ADMIN') as any, deleteAllStudents as any);
router.delete('/admin/users/:userId', protect as any, authorize('ADMIN') as any, deleteUserById as any);
router.get('/leaderboard', protect as any, getLeaderboard as any);

export default router;
