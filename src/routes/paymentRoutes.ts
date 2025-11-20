import express from 'express';
import {
  initiatePayment,
  paymentNotify,
  getPaymentByOrderId,
  getMyPayments,
  getAllPayments,
  getPaymentStats,
  getWeeklyReport,
  getMonthlyReport,
  getUserPaymentHistory,
  downloadPaymentReceipt,
  manualCompletePayment,
} from '../controllers/paymentController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// User routes
router.post('/initiate', protect, initiatePayment);
router.get('/my-payments', protect, getMyPayments);
router.get('/order/:orderId', protect, getPaymentByOrderId);
router.get('/receipt/:orderId', protect, downloadPaymentReceipt);
router.post('/manual-complete/:orderId', protect, manualCompletePayment);

// PayHere webhook (public)
router.post('/notify', paymentNotify);

// Admin routes
router.get('/', protect, authorize('admin'), getAllPayments);
router.get('/stats', protect, authorize('admin'), getPaymentStats);
router.get('/reports/weekly', protect, authorize('admin'), getWeeklyReport);
router.get('/reports/monthly', protect, authorize('admin'), getMonthlyReport);
router.get('/user/:userId', protect, authorize('admin'), getUserPaymentHistory);

export default router;
