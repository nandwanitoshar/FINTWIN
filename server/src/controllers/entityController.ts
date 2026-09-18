import { Response } from 'express';
import { EntityRepository, EntityType, EntityRisk } from '../models/Entity.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getEntities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const entities = await EntityRepository.findByUserId(userId);
    res.status(200).json({ success: true, entities });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch entities.' });
  }
};

export const getEntityById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const entity = await EntityRepository.findByIdAndUserId(id, userId);
    if (!entity) {
      res.status(404).json({ success: false, message: 'Entity not found or unauthorized.' });
      return;
    }
    res.status(200).json({ success: true, entity });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch entity.' });
  }
};

export const createEntity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { name, type, category, cadenceScore, riskRating } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Entity name is required.' });
      return;
    }

    const validTypes: EntityType[] = [
      'EMPLOYER',
      'LENDER',
      'UTILITY',
      'MERCHANT',
      'INVESTMENT_BROKER',
      'BANK',
      'SERVICE_PROVIDER',
      'INDIVIDUAL',
      'ORGANIZATION',
      'OTHER',
    ];
    if (type && !validTypes.includes(type)) {
      res.status(400).json({ success: false, message: `Invalid entity type. Allowed: ${validTypes.join(', ')}` });
      return;
    }

    const entity = await EntityRepository.create({
      userId,
      name: name.trim(),
      type: type || 'MERCHANT',
      category: category || 'General',
      cadenceScore: cadenceScore !== undefined ? parseFloat(cadenceScore) : 0.5,
      riskRating: (riskRating as EntityRisk) || 'LOW',
    });

    res.status(201).json({ success: true, entity });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create entity.' });
  }
};

export const updateEntity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const updated = await EntityRepository.update(id, userId, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Entity not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, entity: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update entity.' });
  }
};

export const deleteEntity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const deleted = await EntityRepository.delete(id, userId);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Entity not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Entity deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete entity.' });
  }
};
