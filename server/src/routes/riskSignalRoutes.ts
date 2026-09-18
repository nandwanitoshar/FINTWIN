/**
 * riskSignalRoutes.ts
 * Phase 5 — Risk Signal Routes
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listRiskSignals,
  getRiskSignalById,
  updateSignalStatus,
} from '../controllers/riskSignalController.js';

export const riskSignalRoutes = Router();

// GET /api/risk-signals
riskSignalRoutes.get('/', requireAuth, listRiskSignals);

// GET /api/risk-signals/:id
riskSignalRoutes.get('/:id', requireAuth, getRiskSignalById);

// PATCH /api/risk-signals/:id — status update only
riskSignalRoutes.patch('/:id', requireAuth, updateSignalStatus);
