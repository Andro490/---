import { Router } from 'express';
import { register, login, refresh, logout, getMe, seedAdmin } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { adminGuard } from '../middleware/adminGuard';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', protect as any, getMe as any);
router.post('/seed-admin', adminGuard as any, seedAdmin);

export default router;
