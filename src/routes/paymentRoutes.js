import express from 'express';
import { 
  getAllTransactions, 
  createTransaction, 
  refundTransaction,
  createRazorpayOrder,
  verifyRazorpayPayment
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/transactions', authorize('admin'), getAllTransactions);
router.post('/transactions', createTransaction);
router.put('/transactions/:id/refund', authorize('admin'), refundTransaction);
router.post('/razorpay/order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);

export default router;
