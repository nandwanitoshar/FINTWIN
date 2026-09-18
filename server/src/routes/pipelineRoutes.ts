import { Router } from 'express';
import { ingestBatch } from '../controllers/transactionController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/ingest', ingestBatch);

export default router;
