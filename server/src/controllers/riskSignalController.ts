/**
 * riskSignalController.ts
 * Phase 5 — Risk Signal HTTP handlers
 *
 * GET    /api/risk-signals        — list all signals for authenticated user
 * GET    /api/risk-signals/:id    — single signal with full evidence
 * PATCH  /api/risk-signals/:id    — update status (OPEN/ACKNOWLEDGED/RESOLVED)
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { RiskSignalService, SignalStatus } from '../services/riskSignalService.js';

const ALLOWED_STATUSES: SignalStatus[] = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

// GET /api/risk-signals
export const listRiskSignals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const signals = await RiskSignalService.detectSignals(userId);

    // Optional severity filter
    const { severity, type } = req.query;
    const filtered = signals.filter((s) => {
      if (severity && s.severity !== severity) return false;
      if (type && s.type !== type) return false;
      return true;
    });

    res.status(200).json({
      success: true,
      signals: filtered,
      count: filtered.length,
      totalDetected: signals.length,
    });
  } catch (error: any) {
    console.error('[RiskSignal] listRiskSignals error:', error);
    res.status(500).json({ success: false, message: 'Failed to evaluate risk signals.' });
  }
};

// GET /api/risk-signals/:id
export const getRiskSignalById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const signal = await RiskSignalService.getSignalById(userId, id);

    if (!signal) {
      res.status(404).json({ success: false, message: 'Risk signal not found or does not belong to this account.' });
      return;
    }

    res.status(200).json({ success: true, signal });
  } catch (error: any) {
    console.error('[RiskSignal] getRiskSignalById error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve risk signal.' });
  }
};

// PATCH /api/risk-signals/:id — Update acknowledgement status only
export const updateSignalStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !ALLOWED_STATUSES.includes(status as SignalStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}.`,
      });
      return;
    }

    // Verify signal belongs to user
    const signal = await RiskSignalService.getSignalById(userId, id);
    if (!signal) {
      res.status(404).json({ success: false, message: 'Risk signal not found or does not belong to this account.' });
      return;
    }

    // Return updated signal with new status (signals are stateless/computed; status is a UI-only acknowledgement)
    const updatedSignal = { ...signal, status: status as SignalStatus };

    res.status(200).json({
      success: true,
      signal: updatedSignal,
      message: `Signal status updated to ${status}.`,
    });
  } catch (error: any) {
    console.error('[RiskSignal] updateSignalStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update signal status.' });
  }
};
