import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { CalendarService } from '../services/calendarService.js';

export const getCalendarEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await CalendarService.getEvents(userId, { year, month, startDate, endDate });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Calendar Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to aggregate calendar events.',
    });
  }
};

export const createCalendarEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { title, amount, type, date, recurrence, notes, category } = req.body;

    if (!title || !amount || !date) {
      res.status(400).json({
        success: false,
        message: 'Title, amount, and date are required fields.',
      });
      return;
    }

    const event = await CalendarService.createCustomEvent(userId, {
      title,
      amount: Number(amount),
      type,
      date,
      recurrence,
      notes,
      category,
    });

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error('[Calendar Controller Create Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create calendar event.',
    });
  }
};

export const deleteCalendarEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const deleted = await CalendarService.deleteCustomEvent(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Calendar event not found or unauthorized.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Calendar event removed.',
    });
  } catch (error: any) {
    console.error('[Calendar Controller Delete Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete calendar event.',
    });
  }
};
