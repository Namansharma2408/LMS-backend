import express from 'express';
import { 
  getAllEnrollments, 
  getMyEnrollments, 
  updateProgress, 
  grantAccess 
} from '../controllers/enrollmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin'), getAllEnrollments);
router.get('/my', getMyEnrollments);
router.put('/progress', updateProgress);
router.post('/grant', authorize('admin'), grantAccess);

export default router;
