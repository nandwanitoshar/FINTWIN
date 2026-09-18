import { DigitalTwinService } from './digitalTwinService.js';
import { LoanRepository } from '../models/Loan.js';
import { GoalRepository } from '../models/Goal.js';
import { RecurringExpenseRepository } from '../models/RecurringExpense.js';
import { TransactionRepository } from '../models/Transaction.js';

export interface FinTwinNotification {
  id: string;
  type: 'RUNWAY_CRITICAL' | 'HIGH_DEBT_BURDEN' | 'GOAL_DEADLINE' | 'NEW_RECURRING' | 'UNUSUAL_TRANSACTION' | 'SYSTEM_INFO';
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  actionUrl: string;
  actionText: string;
  isRead: boolean;
}

const userReadNotificationIds = new Set<string>();

export const NotificationService = {
  /**
   * Generates authoritative real notifications derived strictly from verified database state
   */
  async getNotifications(userId: string): Promise<FinTwinNotification[]> {
    const notifications: FinTwinNotification[] = [];
    const now = new Date();

    const [twin, loans, goals, recurring, { transactions }] = await Promise.all([
      DigitalTwinService.getTwinState(userId),
      LoanRepository.findByUserId(userId),
      GoalRepository.findByUserId(userId),
      RecurringExpenseRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId, { limit: 100 }),
    ]);

    // 1. Critical Runway Notification
    if (twin.stateVector.runwayMonths < 3.0 && twin.summary.liquidReserves > 0) {
      notifications.push({
        id: `notif_runway_${userId}`,
        type: 'RUNWAY_CRITICAL',
        title: 'Emergency Runway Critical',
        message: `Your liquid cash covers only ${twin.stateVector.runwayMonths} months of burn at ₹${twin.metrics.monthlyBurn.toLocaleString('en-IN')}/mo. Build at least 3 months of buffer.`,
        severity: twin.stateVector.runwayMonths < 1.5 ? 'critical' : 'warning',
        timestamp: new Date().toISOString(),
        actionUrl: '/dashboard',
        actionText: 'Inspect Runway',
        isRead: userReadNotificationIds.has(`notif_runway_${userId}`),
      });
    }

    // 2. High Debt Service Notification
    if (twin.stateVector.dtiPercent > 40.0) {
      notifications.push({
        id: `notif_dti_${userId}`,
        type: 'HIGH_DEBT_BURDEN',
        title: 'Elevated Debt-to-Income Burden',
        message: `${twin.stateVector.dtiPercent}% of your monthly income is consumed by debt service. Prudent banking limits suggest keeping DTI under 35%.`,
        severity: 'warning',
        timestamp: new Date().toISOString(),
        actionUrl: '/debt-loans',
        actionText: 'Review Loans',
        isRead: userReadNotificationIds.has(`notif_dti_${userId}`),
      });
    }

    // 3. Goal Deadline Approaching (< 30 days) with progress < 90%
    for (const goal of goals) {
      if ((goal.status as string) === 'COMPLETED') continue;
      const targetDate = new Date(goal.targetDate);
      const daysLeft = Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const progress = goal.calculations?.progressPercent ?? 0;

      if (daysLeft > 0 && daysLeft <= 45 && progress < 90) {
        const targetDateStr = goal.targetDate instanceof Date ? goal.targetDate.toISOString().split('T')[0] : String(goal.targetDate);
        notifications.push({
          id: `notif_goal_${goal._id}`,
          type: 'GOAL_DEADLINE',
          title: `Goal Deadline Approaching: ${goal.name}`,
          message: `${daysLeft} days remaining until target date (${targetDateStr}). Current progress is ${progress}%. Monthly contribution needed: ₹${goal.calculations?.requiredMonthlyContribution?.toLocaleString('en-IN') ?? 0}.`,
          severity: daysLeft <= 15 ? 'warning' : 'info',
          timestamp: new Date().toISOString(),
          actionUrl: '/goals',
          actionText: 'View Goal',
          isRead: userReadNotificationIds.has(`notif_goal_${goal._id}`),
        });
      }
    }

    // 4. New Recurring Expenses Detected
    const recentDetected = recurring.filter((r) => r.detectedAutomatically && r.status === 'ACTIVE');
    if (recentDetected.length > 0) {
      const rec = recentDetected[0];
      notifications.push({
        id: `notif_rec_${rec._id}`,
        type: 'NEW_RECURRING',
        title: `Recurring Expense Detected: ${rec.name}`,
        message: `Identified periodic outflow of ~₹${rec.averageAmount.toLocaleString('en-IN')} (${rec.cadence.toLowerCase()}). Adds ₹${rec.estimatedMonthlyImpact.toLocaleString('en-IN')}/mo to fixed burn.`,
        severity: 'info',
        timestamp: new Date().toISOString(),
        actionUrl: '/recurring',
        actionText: 'Manage Recurring',
        isRead: userReadNotificationIds.has(`notif_rec_${rec._id}`),
      });
    }

    // 5. Unusual Transactions (> 3x average debit)
    const debits = transactions.filter((t) => t.type === 'DEBIT');
    if (debits.length >= 5) {
      const avgDebit = debits.reduce((s, t) => s + t.amount, 0) / debits.length;
      const outlier = debits.find((t) => t.amount > avgDebit * 3.5 && t.amount > 10000);
      if (outlier) {
        notifications.push({
          id: `notif_tx_${outlier._id}`,
          type: 'UNUSUAL_TRANSACTION',
          title: `Unusually High Outflow: ₹${outlier.amount.toLocaleString('en-IN')}`,
          message: `Debit of ₹${outlier.amount.toLocaleString('en-IN')} for "${(outlier as any).merchant || outlier.description}" exceeds 3.5x your average transaction amount of ₹${Math.round(avgDebit).toLocaleString('en-IN')}.`,
          severity: 'warning',
          timestamp: new Date(outlier.date).toISOString(),
          actionUrl: `/transactions?id=${outlier._id}`,
          actionText: 'View Transaction',
          isRead: userReadNotificationIds.has(`notif_tx_${outlier._id}`),
        });
      }
    }

    return notifications;
  },

  markAsRead(notificationId: string): boolean {
    userReadNotificationIds.add(notificationId);
    return true;
  },

  markAllAsRead(userId: string): boolean {
    // Mark common IDs
    userReadNotificationIds.add(`notif_runway_${userId}`);
    userReadNotificationIds.add(`notif_dti_${userId}`);
    return true;
  },
};
