/**
 * reportController.ts
 * Phase 6 — 07 OUTPUT: Consolidated Intelligence Report HTTP Handler
 *
 * GET /api/report
 * GET /api/intelligence-report
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ReportService } from '../services/reportService.js';

export const getConsolidatedReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const report = await ReportService.getConsolidatedReport(userId);

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('[Report Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate consolidated intelligence report.',
      error: error.message || 'Unknown server error',
    });
  }
};
