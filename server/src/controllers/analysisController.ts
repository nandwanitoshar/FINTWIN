/**
 * analysisController.ts
 * Phase 5 — Full Analysis HTTP handlers
 * Phase D — Recurring Expenses & Financial Calendar Analysis Endpoints
 *
 * GET  /api/analysis                    — Full deterministic analysis for authenticated user
 * GET  /api/analysis/summary            — Summary metrics (signal counts, trends)
 * GET  /api/analysis/health-score       — 6-component Financial Health Score
 * GET  /api/analysis/spending-breakdown — Spending breakdown by category and merchant
 * GET  /api/analysis/projection         — 12-month baseline and simulated projection
 * POST /api/analysis/affordability      — Decision affordability analysis
 * GET  /api/analysis/recurring-expenses — Phase D deterministic recurring expense detection
 * GET  /api/analysis/calendar-upcoming  — Phase D chronological upcoming financial events
 * GET  /api/analysis/:id                — Single signal detail
 * POST /api/analysis/explain            — Explainable intelligence report
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AnalysisEngine } from '../services/analysisEngine.js';
import { RiskSignalService } from '../services/riskSignalService.js';
import { DigitalTwinService } from '../services/digitalTwinService.js';
import { SpendingService } from '../services/spendingService.js';
import { ProjectionService } from '../services/projectionService.js';
import { GoalImpactService } from '../services/goalImpactService.js';
import { RecurringService } from '../services/recurringService.js';
import { CalendarService } from '../services/calendarService.js';

// GET /api/analysis/health-score — Detailed 6-component Financial Health Score
export const getHealthScore = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const twin = await DigitalTwinService.getTwinState(userId);
    res.status(200).json({
      success: true,
      healthScore: twin.stateVector.detailedHealthScore,
      summary: twin.summary,
    });
  } catch (error: any) {
    console.error('[Analysis] getHealthScore error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute financial health score.' });
  }
};

// GET /api/analysis — Full deterministic analysis with all signals
export const getFullAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const [signals, summary] = await Promise.all([
      RiskSignalService.detectSignals(userId),
      RiskSignalService.getAnalysisSummary(userId),
    ]);

    res.status(200).json({
      success: true,
      analysis: {
        signals,
        summary,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Analysis] getFullAnalysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate deterministic analysis.' });
  }
};

// GET /api/analysis/summary — Summary metrics only
export const getAnalysisSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const summary = await RiskSignalService.getAnalysisSummary(userId);
    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('[Analysis] getAnalysisSummary error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve analysis summary.' });
  }
};

// GET /api/analysis/:id — Single signal detail
export const getAnalysisSignalById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const signal = await RiskSignalService.getSignalById(userId, id);

    if (!signal) {
      res.status(404).json({ success: false, message: 'Signal not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      signal,
    });
  } catch (error: any) {
    console.error('[Analysis] getAnalysisSignalById error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve signal detail.' });
  }
};

// POST /api/analysis/explain — Explainable intelligence report
export const explainFinancialState = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { context, scenarioId } = req.body;
    const explanation = await AnalysisEngine.generateAnalysis(userId, context || 'current', scenarioId);
    res.status(200).json({
      success: true,
      explanation,
      analysis: explanation,
    });
  } catch (error: any) {
    console.error('[Analysis] explainFinancialState error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate explanation.' });
  }
};

// GET /api/analysis/spending-breakdown — Category and merchant breakdown
export const getSpendingBreakdown = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const spendingData = await SpendingService.getSpendingBreakdown(userId);

    res.status(200).json({
      success: true,
      ...spendingData,
    });
  } catch (error: any) {
    console.error('[Analysis] getSpendingBreakdown error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute spending breakdown.' });
  }
};

// GET /api/analysis/projection & POST /api/analysis/projection — 12-month financial projection
export const get12MonthProjection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    // Handle both GET (query/baseline) and POST (body simulation inputs)
    const inputs = req.method === 'POST' ? req.body : req.query;
    const projection = await ProjectionService.get12MonthProjection(userId, inputs);
    res.status(200).json({
      success: true,
      projection,
    });
  } catch (error: any) {
    console.error('[Analysis] get12MonthProjection error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate 12-month projection.' });
  }
};

// GET & POST /api/analysis/affordability — Comprehensive decision affordability analysis
export const getAffordabilityAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const inputs = req.method === 'POST' ? req.body : req.query;
    const { purchaseAmount, paymentMode, tenureMonths, annualRate, goalId, targetAccountId, description } = inputs;

    if (purchaseAmount === undefined || isNaN(Number(purchaseAmount)) || Number(purchaseAmount) < 0) {
      res.status(400).json({ success: false, message: 'Valid purchase amount is required.' });
      return;
    }

    const affordability = await GoalImpactService.calculateAffordability({
      userId,
      purchaseAmount: Number(purchaseAmount),
      paymentMode: paymentMode as 'OUTRIGHT' | 'EMI',
      tenureMonths: tenureMonths ? Number(tenureMonths) : undefined,
      annualRate: annualRate ? Number(annualRate) : undefined,
      goalId: goalId ? String(goalId) : undefined,
      targetAccountId: targetAccountId ? String(targetAccountId) : undefined,
      description: description ? String(description) : undefined,
    });

    res.status(200).json({
      success: true,
      affordability,
    });
  } catch (error: any) {
    console.error('[Analysis] getAffordabilityAnalysis error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to compute affordability analysis.' });
  }
};

// GET /api/analysis/recurring-expenses — Phase D Recurring Expenses Detection
export const getRecurringExpensesAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const result = await RecurringService.detectAndSync(userId);

    res.status(200).json({
      success: true,
      data: result,
      recurringExpenses: result.recurringExpenses,
      summary: result.summary,
      totalEstimatedMonthlyImpact: result.totalEstimatedMonthlyImpact,
      activeCount: result.activeCount,
      detectedCount: result.detectedCount,
      hasSufficientData: result.hasSufficientData,
      limitations: result.limitations,
    });
  } catch (error: any) {
    console.error('[Analysis] getRecurringExpensesAnalysis error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to detect recurring expenses.',
    });
  }
};

// GET /api/analysis/calendar-upcoming — Phase D Chronological Upcoming Events
export const getCalendarUpcoming = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const result = await CalendarService.getEvents(userId);

    res.status(200).json({
      success: true,
      upcoming7Days: result.upcoming7Days,
      upcoming30Days: result.upcoming30Days,
      totalOutflow: result.totalOutflow,
      totalInflow: result.totalInflow,
      netImpact: result.netImpact,
      eventCount: result.eventCount,
    });
  } catch (error: any) {
    console.error('[Analysis] getCalendarUpcoming error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve upcoming financial events.',
    });
  }
};
