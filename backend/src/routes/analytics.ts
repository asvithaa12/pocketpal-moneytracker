import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', AnalyticsController.getDashboard);
router.get('/monthly', AnalyticsController.getMonthly);
router.get('/categories', AnalyticsController.getCategories);
router.get('/lending', AnalyticsController.getLending);

export default router;
