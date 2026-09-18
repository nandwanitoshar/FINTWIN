import { Router } from 'express';
import { ingestCsv, ingestJson } from '../controllers/ingestController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/csv', ingestCsv);
router.post('/json', ingestJson);

export default router;
