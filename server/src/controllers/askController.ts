import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AskFinTwinService } from '../services/askFinTwinService.js';

export const askFinTwin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { query } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({
        success: false,
        message: 'Query string must be provided.',
      });
      return;
    }

    const answer = await AskFinTwinService.answerQuery(userId, query);

    res.status(200).json({
      success: true,
      data: answer,
    });
  } catch (error: any) {
    console.error('[Ask FinTwin Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process financial query.',
    });
  }
};
