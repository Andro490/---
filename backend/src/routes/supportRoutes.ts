import { Router } from 'express';
import { createMessage, getAllMessages, getMyMessages, replyToMessage, markAsRead, deleteMessage } from '../controllers/supportController';
import { protect, authorize, optionalAuth } from '../middleware/auth';

const router = Router();

// Publicly available (but can check if user is logged in using optionalAuth)
router.post('/', optionalAuth as any, createMessage as any);
router.get('/my', optionalAuth as any, getMyMessages as any);

// Admin only routes
router.get('/', protect as any, authorize('ADMIN') as any, getAllMessages as any);
router.post('/:id/reply', protect as any, authorize('ADMIN') as any, replyToMessage as any);
router.patch('/:id/read', protect as any, authorize('ADMIN') as any, markAsRead as any);
router.delete('/:id', protect as any, authorize('ADMIN') as any, deleteMessage as any);

export default router;
