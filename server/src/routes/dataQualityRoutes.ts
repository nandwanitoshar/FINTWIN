import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDataQualityAudit } from '../controllers/dataQualityController.js';

const router = Router();

router.use(requireAuth);

router.get('/', getDataQualityAudit);

export default router;
