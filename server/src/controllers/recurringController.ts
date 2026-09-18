import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { RecurringService } from '../services/recurringService.js';

export const listRecurringExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const result = await RecurringService.list(userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Recurring Controller List Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve recurring expenses.',
    });
  }
};

export const createRecurringExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { name, averageAmount, cadence, category, lastOccurrenceDate, nextExpectedDate, notes } = req.body;

    if (!name || !averageAmount) {
      res.status(400).json({
        success: false,
        message: 'Name and averageAmount are required fields.',
      });
      return;
    }

    const created = await RecurringService.create(userId, {
      name,
      averageAmount: Number(averageAmount),
      cadence: cadence || 'MONTHLY',
      category: category || 'Subscription',
      lastOccurrenceDate,
      nextExpectedDate,
      notes,
    });

    res.status(201).json({
      success: true,
      recurringExpense: created,
    });
  } catch (error: any) {
    console.error('[Recurring Controller Create Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create recurring expense.',
    });
  }
};

export const updateRecurringExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const updated = await RecurringService.update(id, userId, req.body);

    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'Recurring expense not found or unauthorized.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      recurringExpense: updated,
    });
  } catch (error: any) {
    console.error('[Recurring Controller Update Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update recurring expense.',
    });
  }
};

export const deleteRecurringExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const deleted = await RecurringService.delete(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Recurring expense not found or unauthorized.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Recurring expense removed.',
    });
  } catch (error: any) {
    console.error('[Recurring Controller Delete Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete recurring expense.',
    });
  }
};
