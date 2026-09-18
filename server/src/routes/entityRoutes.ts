import { Router } from 'express';
import {
  getEntities,
  getEntityById,
  createEntity,
  updateEntity,
  deleteEntity,
} from '../controllers/entityController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', getEntities);
router.post('/', createEntity);
router.get('/:id', getEntityById);
router.put('/:id', updateEntity);
router.patch('/:id', updateEntity);
router.delete('/:id', deleteEntity);

export default router;
