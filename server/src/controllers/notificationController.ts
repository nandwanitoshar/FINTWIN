import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { NotificationService } from '../services/notificationService.js';

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const notifications = await NotificationService.getNotifications(userId);

    res.status(200).json({
      success: true,
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  } catch (error: any) {
    console.error('[Notification Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve notifications.',
    });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    NotificationService.markAsRead(id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error: any) {
    console.error('[Notification Mark Read Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark notification read.',
    });
  }
};

export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    NotificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error: any) {
    console.error('[Notification Mark All Read Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark all notifications read.',
    });
  }
};
