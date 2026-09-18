import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SearchService } from '../services/searchService.js';

export const globalSearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const query = (req.query.q as string) || '';

    const results = await SearchService.search(userId, query);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('[Global Search Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute global search.',
    });
  }
};
