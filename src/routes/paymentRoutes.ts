import express from 'express';
import {
  initiatePayment,
  paymentNotify,
  getPaymentByOrderId,
  getMyPayments,
  getAllPayments,
  getPaymentStats,
} from '../controllers/paymentController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// User routes
router.post('/initiate', protect, initiatePayment);
router.get('/my-payments', protect, getMyPayments);
router.get('/order/:orderId', protect, getPaymentByOrderId);

// PayHere webhook (public)
router.post('/notify', paymentNotify);

// Admin routes
router.get('/', protect, authorize('admin'), getAllPayments);
router.get('/stats', protect, authorize('admin'), getPaymentStats);

export default router;
