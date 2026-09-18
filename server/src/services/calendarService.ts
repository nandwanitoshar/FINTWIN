import { LoanRepository } from '../models/Loan.js';
import { GoalRepository } from '../models/Goal.js';
import { RecurringExpenseRepository } from '../models/RecurringExpense.js';
import { ScheduledEventRepository, IScheduledEvent, ScheduledEventType } from '../models/ScheduledEvent.js';
import { TransactionRepository } from '../models/Transaction.js';
import { toPaise } from '../utils/calculations.js';

export type CalendarEventSource =
  | 'LOAN_EMI'
  | 'RECURRING_EXPENSE'
  | 'GOAL_MILESTONE'
  | 'SCHEDULED_EVENT'
  | 'TRANSACTION';

export type CalendarEventType = 'INCOME' | 'EXPENSE' | 'EMI' | 'GOAL' | 'RECURRING';

export interface CalendarEvent {
  id: string;
  source: CalendarEventSource;
  eventType: CalendarEventType;
  title: string;
  amount: number;
  direction: 'INFLOW' | 'OUTFLOW';
  date: string; // YYYY-MM-DD
  category: string;
  status: 'PENDING' | 'UPCOMING' | 'COMPLETED';
  isEstimated: boolean; // Clearly distinguishes estimated recurring from verified ledger entries
  referenceId?: string;
  notes?: string;
}

export interface CalendarUpcomingBucket {
  next7Days: CalendarEvent[];
  next30Days: CalendarEvent[];
}

export interface CalendarViewResult {
  events: CalendarEvent[];
  upcoming7Days: CalendarEvent[];
  upcoming30Days: CalendarEvent[];
  totalOutflow: number;
  totalInflow: number;
  netImpact: number;
  eventCount: number;
}

export const CalendarService = {
  /**
   * Generates calendar events for a user across all financial sub-systems:
   * 1. Loan EMIs (EMI)
   * 2. Detected & declared recurring expenses (RECURRING, marked ESTIMATED)
   * 3. Financial Goal milestones & planned contributions (GOAL)
   * 4. User scheduled events (INCOME / EXPENSE)
   * 5. Verified historical ledger transactions (INCOME / EXPENSE)
   */
  async getEvents(
    userId: string,
    options?: { year?: number; month?: number; startDate?: string; endDate?: string }
  ): Promise<CalendarViewResult> {
    const events: CalendarEvent[] = [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear = options?.year || now.getFullYear();
    const currentMonth = options?.month !== undefined ? options?.month : now.getMonth() + 1;

    // Range bounds for calendar grid
    const startStr = options?.startDate || `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    const endStr =
      options?.endDate ||
      `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // 1. Fetch Loans & Compute EMIs for the period
    const loans = await LoanRepository.findByUserId(userId);
    for (const loan of loans) {
      if ((loan.status as string) === 'PAID_OFF') continue;
      const loanStart = new Date(loan.startDate);
      const payDay = Math.min(28, loanStart.getDate() || 5);
      const eventDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;

      events.push({
        id: `loan_${loan._id}_${eventDateStr}`,
        source: 'LOAN_EMI',
        eventType: 'EMI',
        title: `${loan.name} (EMI to ${loan.lender})`,
        amount: loan.emiAmount,
        direction: 'OUTFLOW',
        date: eventDateStr,
        category: 'Debt & Loan EMI',
        status: eventDateStr < todayStr ? 'COMPLETED' : 'UPCOMING',
        isEstimated: false,
        referenceId: loan._id,
        notes: `Outstanding: ₹${loan.outstandingAmount.toLocaleString('en-IN')}, APR: ${loan.interestRateApr}%`,
      });
    }

    // 2. Fetch Recurring Expenses (Marked as ESTIMATED)
    const recurring = await RecurringExpenseRepository.findByUserId(userId);
    for (const rec of recurring) {
      if (rec.status !== 'ACTIVE') continue;
      const recDate = rec.nextExpectedDate || `${currentYear}-${String(currentMonth).padStart(2, '0')}-15`;

      events.push({
        id: `rec_${rec._id}_${recDate}`,
        source: 'RECURRING_EXPENSE',
        eventType: 'RECURRING',
        title: `${rec.name} (${rec.cadence.toLowerCase()})`,
        amount: rec.averageAmount,
        direction: 'OUTFLOW',
        date: recDate,
        category: rec.category,
        status: recDate < todayStr ? 'COMPLETED' : 'UPCOMING',
        isEstimated: true, // Clearly marked as ESTIMATED as required by Feature 9
        referenceId: rec._id,
        notes: `Estimated next occurrence: ₹${rec.averageAmount.toLocaleString('en-IN')} (Confidence: ${Math.round(rec.confidenceScore * 100)}%)`,
      });
    }

    // 3. Fetch Goals
    const goals = await GoalRepository.findByUserId(userId);
    for (const goal of goals) {
      if (goal.status === 'COMPLETED') continue;
      if (
        goal.calculations?.requiredMonthlyContribution &&
        goal.calculations.requiredMonthlyContribution > 0
      ) {
        const goalDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-10`;
        events.push({
          id: `goal_${goal._id}_${goalDateStr}`,
          source: 'GOAL_MILESTONE',
          eventType: 'GOAL',
          title: `Goal Contribution: ${goal.name}`,
          amount: goal.calculations.requiredMonthlyContribution,
          direction: 'OUTFLOW',
          date: goalDateStr,
          category: 'Savings & Goals',
          status: goalDateStr < todayStr ? 'COMPLETED' : 'UPCOMING',
          isEstimated: true,
          referenceId: goal._id,
          notes: `Progress: ${goal.calculations.progressPercent}% of ₹${goal.targetAmount.toLocaleString('en-IN')}`,
        });
      }
    }

    // 4. Fetch Custom Scheduled Events
    const scheduled = await ScheduledEventRepository.findByUserId(userId);
    for (const ev of scheduled) {
      events.push({
        id: `sched_${ev._id}`,
        source: 'SCHEDULED_EVENT',
        eventType: ev.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        title: ev.title,
        amount: ev.amount,
        direction: ev.type === 'INCOME' ? 'INFLOW' : 'OUTFLOW',
        date: ev.date,
        category: ev.category || 'Scheduled',
        status: ev.isCompleted || ev.date < todayStr ? 'COMPLETED' : 'UPCOMING',
        isEstimated: false,
        referenceId: ev._id,
        notes: ev.notes,
      });
    }

    // 5. Fetch Actual Verified Ledger Transactions for the window
    const { transactions } = await TransactionRepository.findByUserId(userId, {
      startDate: startStr,
      endDate: endStr,
      limit: 500,
    });

    for (const tx of transactions) {
      // Exclude transfers and refunds from calendar income/expense
      if (tx.direction === 'TRANSFER' || tx.type === 'INTERNAL_TRANSFER' || tx.direction === 'REFUND') {
        continue;
      }
      const isIncome = tx.direction === 'INCOME' || tx.type === 'CREDIT';
      const txDateStr = new Date(tx.date).toISOString().split('T')[0];

      events.push({
        id: `tx_${tx._id}`,
        source: 'TRANSACTION',
        eventType: isIncome ? 'INCOME' : 'EXPENSE',
        title: tx.description,
        amount: tx.amount,
        direction: isIncome ? 'INFLOW' : 'OUTFLOW',
        date: txDateStr,
        category: tx.category || 'General',
        status: 'COMPLETED',
        isEstimated: false,
        referenceId: tx._id,
        notes: `Verified ledger entry: ${tx.reference || 'Bank Statement'}`,
      });
    }

    // Sort all events chronologically ascending
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Feature 10: Compute upcoming 7-day and 30-day windows
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const thirtyDaysStr = thirtyDaysLater.toISOString().split('T')[0];

    // Upcoming events: dates >= todayStr and status !== 'COMPLETED' (or future date)
    const upcoming7Days = events
      .filter((e) => e.date >= todayStr && e.date <= sevenDaysStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const upcoming30Days = events
      .filter((e) => e.date >= todayStr && e.date <= thirtyDaysStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals for currently filtered month
    const totalOutflow = events
      .filter((e) => e.direction === 'OUTFLOW')
      .reduce((s, e) => s + e.amount, 0);
    const totalInflow = events
      .filter((e) => e.direction === 'INFLOW')
      .reduce((s, e) => s + e.amount, 0);

    return {
      events,
      upcoming7Days,
      upcoming30Days,
      totalOutflow,
      totalInflow,
      netImpact: totalInflow - totalOutflow,
      eventCount: events.length,
    };
  },

  async createCustomEvent(userId: string, data: any): Promise<IScheduledEvent> {
    const amount = Number(data.amount);
    return ScheduledEventRepository.create({
      userId,
      title: data.title,
      amount,
      amountPaise: toPaise(amount),
      type: (data.type as ScheduledEventType) || 'EXPENSE',
      date: data.date,
      recurrence: data.recurrence || 'NONE',
      targetAccountId: data.targetAccountId,
      category: data.category || 'General',
      notes: data.notes || '',
      isCompleted: false,
    });
  },

  async deleteCustomEvent(id: string, userId: string): Promise<boolean> {
    return ScheduledEventRepository.delete(id, userId);
  },
};
