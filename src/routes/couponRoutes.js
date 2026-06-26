import express from 'express';
import { 
  getAllCoupons, 
  createCoupon, 
  validateCoupon, 
  deleteCoupon 
} from '../controllers/couponController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'instructor'), getAllCoupons);
router.post('/', authorize('admin', 'instructor'), createCoupon);
router.post('/validate', validateCoupon);
router.delete('/:code', authorize('admin', 'instructor'), deleteCoupon);

export default router;
