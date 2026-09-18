/**
 * reportRoutes.ts
 * Phase 6 — 07 OUTPUT: Consolidated Intelligence Report Routes
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getConsolidatedReport } from '../controllers/reportController.js';

export const reportRoutes = Router();

// GET /api/report (or /api/intelligence-report)
reportRoutes.get('/', requireAuth, getConsolidatedReport);

export default reportRoutes;
