import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DigitalTwinService } from '../services/digitalTwinService.js';

export const getDigitalTwin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const twin = await DigitalTwinService.getTwinState(userId);
    res.status(200).json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to compute Digital Twin state.' });
  }
};

export const getNetworkGraph = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const result = await DigitalTwinService.getNetworkGraph(userId);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to construct Network Graph.' });
  }
};
