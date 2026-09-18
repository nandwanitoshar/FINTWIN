import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { askFinTwin } from '../controllers/askController.js';

const router = Router();

router.use(requireAuth);

router.post('/', askFinTwin);

export default router;
