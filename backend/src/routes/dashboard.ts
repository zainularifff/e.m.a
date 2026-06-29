import { Router } from 'express';
import { getStats, getCharts } from '../controllers/dashboardController';
const router = Router();
router.get('/stats', getStats);
router.get('/charts', getCharts);
export default router;
