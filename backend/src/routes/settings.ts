import { Router } from 'express';
import { getAll, update } from '../controllers/settingsController';
const router = Router();
router.get('/', getAll);
router.put('/', update);
export default router;
