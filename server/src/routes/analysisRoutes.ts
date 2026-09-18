/**
 * analysisRoutes.ts
 * Phase 5 — Full Analysis Routes
 * Phase D — Recurring Expenses & Calendar Upcoming Routes
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getFullAnalysis,
  getAnalysisSummary,
  getAnalysisSignalById,
  explainFinancialState,
  getHealthScore,
  getSpendingBreakdown,
  get12MonthProjection,
  getAffordabilityAnalysis,
  getRecurringExpensesAnalysis,
  getCalendarUpcoming,
} from '../controllers/analysisController.js';
import { getDataQualityAudit } from '../controllers/dataQualityController.js';

export const analysisRoutes = Router();

// GET /api/analysis/data-quality — Data Quality Center Audit
analysisRoutes.get('/data-quality', requireAuth, getDataQualityAudit);

// GET /api/analysis/health-score — Detailed 6-component Financial Health Score
analysisRoutes.get('/health-score', requireAuth, getHealthScore);

// GET /api/analysis/spending-breakdown — Category & merchant spending breakdown
analysisRoutes.get('/spending-breakdown', requireAuth, getSpendingBreakdown);

// GET & POST /api/analysis/projection — 12-month baseline and simulated projection
analysisRoutes.get('/projection', requireAuth, get12MonthProjection);
analysisRoutes.post('/projection', requireAuth, get12MonthProjection);

// GET & POST /api/analysis/affordability — Comprehensive decision affordability analysis
analysisRoutes.get('/affordability', requireAuth, getAffordabilityAnalysis);
analysisRoutes.post('/affordability', requireAuth, getAffordabilityAnalysis);

// GET /api/analysis/recurring-expenses — Phase D Recurring Expense Detection & Normalization
analysisRoutes.get('/recurring-expenses', requireAuth, getRecurringExpensesAnalysis);

// GET /api/analysis/calendar-upcoming — Phase D Chronological Upcoming Events (7d / 30d)
analysisRoutes.get('/calendar-upcoming', requireAuth, getCalendarUpcoming);

// GET /api/analysis — Full deterministic analysis + all signals
analysisRoutes.get('/', requireAuth, getFullAnalysis);

// GET /api/analysis/summary — Summary metrics only
analysisRoutes.get('/summary', requireAuth, getAnalysisSummary);

// POST /api/analysis/explain — Explainable intelligence report (Phase 4 compat)
analysisRoutes.post('/explain', requireAuth, explainFinancialState);

// GET /api/analysis/:id — Single signal detail (must come after named routes)
analysisRoutes.get('/:id', requireAuth, getAnalysisSignalById);
