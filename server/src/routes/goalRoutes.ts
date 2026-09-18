import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { GoalController } from '../controllers/goalController.js';

const router = Router();

router.use(requireAuth);

router.get('/', GoalController.list);
router.post('/', GoalController.create);
router.post('/impact', GoalController.getImpact);
router.post('/affordability', GoalController.getAffordability);
router.get('/:id', GoalController.getById);
router.put('/:id', GoalController.update);
router.patch('/:id', GoalController.update);
router.post('/:id/contribute', GoalController.contribute);
router.delete('/:id', GoalController.delete);

export default router;
