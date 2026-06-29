import { Router } from 'express';
import { getAll, getStats, create, update, remove } from '../controllers/softwareController';
const router = Router();
router.get('/stats', getStats);
router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
export default router;
