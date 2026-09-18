import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DataQualityService } from '../services/dataQualityService.js';

export const getDataQualityAudit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const audit = await DataQualityService.audit(userId);

    res.status(200).json({
      success: true,
      data: audit,
    });
  } catch (error: any) {
    console.error('[Data Quality Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate data quality audit.',
    });
  }
};
