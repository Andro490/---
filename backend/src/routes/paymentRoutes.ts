// import express from 'express';
// import { savePaymentSettings, getPaymentSettings, handlePurchase } from '../controllers/paymentController';
// import { protect, authorize } from '../middleware/auth';

// const admin = authorize('ADMIN');

// const router = express.Router();

// // Admin routes for managing payment gateways
// router.post('/settings', protect, admin, savePaymentSettings);
// router.get('/settings', protect, admin, getPaymentSettings);

// // User route for initializing purchase
// router.post('/purchase', protect, handlePurchase);

// export default router;
import express from 'express';
import { 
  savePaymentSettings, 
  getPaymentSettings, 
  handlePurchase, 
  handleFawryWebhook, // 1. استدعاء الدالة الجديدة هنا
  checkPaymentStatus,
  verifyStripeSession
} from '../controllers/paymentController';
import { protect, authorize } from '../middleware/auth';

const admin = authorize('ADMIN');

const router = express.Router();

// Admin routes for managing payment gateways
router.post('/settings', protect, admin, savePaymentSettings);
router.get('/settings', protect, admin, getPaymentSettings);

// User route for initializing purchase
router.post('/purchase', protect, handlePurchase);

// 2. مسار الـ Webhook (مفتوح بدون protect عشان فوري يعرف يبعتله تأكيد الدفع)
router.post('/fawry-webhook', handleFawryWebhook);

// Polling route for checking payment status
router.get('/status/:txnId', protect, checkPaymentStatus);

// Verify Stripe Session synchronously
router.post('/verify-stripe', protect, verifyStripeSession);

export default router;