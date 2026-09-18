import { TransactionRepository, ITransaction } from '../models/Transaction.js';
import { EntityRepository } from '../models/Entity.js';
import {
  RecurringExpenseRepository,
  IRecurringExpense,
  RecurrenceCadence,
} from '../models/RecurringExpense.js';
import { toPaise } from '../utils/calculations.js';

export interface RecurringSummaryMetrics {
  totalRecurringMonthlyExpense: number;
  estimatedAnnualRecurringExpense: number;
  numberOfRecurringExpenses: number;
  largestRecurringExpense: {
    name: string;
    monthlyImpact: number;
    averageAmount: number;
    cadence: RecurrenceCadence;
  } | null;
  normalizationMethod: string;
}

export interface RecurringDetectionSummary {
  hasSufficientData: boolean;
  recurringExpenses: IRecurringExpense[];
  summary: RecurringSummaryMetrics;
  totalEstimatedMonthlyImpact: number; // For backward compatibility
  activeCount: number;
  detectedCount: number;
  limitations: string[];
}

export const RECURRING_THRESHOLDS = {
  MIN_OBSERVATIONS: 2, // Minimum 2 historical transactions required to compute an interval
  AMOUNT_TOLERANCE_CV: 0.25, // Coefficient of variation (StdDev / Mean) must be <= 0.25 (up to 25% variation)
  CADENCES: {
    WEEKLY: { minDays: 6, maxDays: 8, label: 'WEEKLY' as RecurrenceCadence, monthlyFactor: 52 / 12 },
    BIWEEKLY: { minDays: 12, maxDays: 16, label: 'BIWEEKLY' as RecurrenceCadence, monthlyFactor: 26 / 12 },
    MONTHLY: { minDays: 26, maxDays: 34, label: 'MONTHLY' as RecurrenceCadence, monthlyFactor: 1 },
    QUARTERLY: { minDays: 80, maxDays: 100, label: 'QUARTERLY' as RecurrenceCadence, monthlyFactor: 1 / 3 },
    YEARLY: { minDays: 340, maxDays: 390, label: 'YEARLY' as RecurrenceCadence, monthlyFactor: 1 / 12 },
  },
  CONFIDENCE_FORMULA:
    'Confidence Score = min(1.0, max(0.5, 0.4 + 0.3 * (1 - interval_cv) + 0.3 * (1 - amount_cv)))',
  NORMALIZATION_METHOD:
    'Weekly: amount * 52 / 12 (~4.33x); Bi-Weekly: amount * 26 / 12 (~2.17x); Monthly: amount * 1; Quarterly: amount / 3; Yearly/Annual: amount / 12; Annualized: monthly * 12.',
};

export const RecurringService = {
  /**
   * Deterministic pattern detection engine grounded strictly in real historical transactions.
   */
  async detectAndSync(userId: string): Promise<RecurringDetectionSummary> {
    const { transactions } = await TransactionRepository.findByUserId(userId, { limit: 1000 });
    const existing = await RecurringExpenseRepository.findByUserId(userId);
    const entities = await EntityRepository.findByUserId(userId);

    const entityMap = new Map<string, string>();
    for (const ent of entities) {
      entityMap.set(ent._id, ent.name);
    }

    const limitations: string[] = [];

    // Check multi-currency
    const currencies = new Set<string>();
    for (const tx of transactions) {
      if (tx.currency) currencies.add(tx.currency.toUpperCase());
    }
    if (currencies.size > 1) {
      limitations.push(
        `Multi-currency ledger detected (${Array.from(currencies).join(', ')}). Cross-currency recurring conversion requires explicit exchange rate validation.`
      );
    }

    // 1. Data Quality & Cleaning Rules (Feature 14):
    // - Exclude transfers (tx.direction === 'TRANSFER' || tx.type === 'INTERNAL_TRANSFER')
    // - Exclude income/credits (tx.direction === 'INCOME' || tx.type === 'CREDIT')
    // - Exclude refunds (tx.direction === 'REFUND')
    // - Exclude invalid/non-positive amounts
    const cleanDebits = transactions.filter((tx) => {
      const isTransfer = tx.direction === 'TRANSFER' || tx.type === 'INTERNAL_TRANSFER';
      const isIncome = tx.direction === 'INCOME' || tx.type === 'CREDIT';
      const isRefund = tx.direction === 'REFUND';
      const isDebit = tx.direction === 'EXPENSE' || tx.type === 'DEBIT';
      const hasPositiveAmount = tx.amount !== undefined && tx.amount > 0;
      return !isTransfer && !isIncome && !isRefund && isDebit && hasPositiveAmount;
    });

    if (cleanDebits.length < RECURRING_THRESHOLDS.MIN_OBSERVATIONS) {
      limitations.push(
        `Insufficient debit transaction history. Found ${cleanDebits.length} eligible expense transactions; minimum ${RECURRING_THRESHOLDS.MIN_OBSERVATIONS} recurring observations required.`
      );
    }

    // 2. Group by normalized entity / merchant / description
    const grouped = new Map<string, ITransaction[]>();
    for (const tx of cleanDebits) {
      const rawKey =
        (tx.destinationEntityId && entityMap.get(tx.destinationEntityId)) ||
        (tx as any).merchant ||
        tx.description ||
        '';
      const key = rawKey.trim().toLowerCase();
      if (!key) continue; // Skip missing or blank merchants
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(tx);
    }

    // 3. Examine each potential candidate group
    for (const [key, rawTxList] of grouped.entries()) {
      // Sort chronologically ascending
      rawTxList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Deduplicate exact duplicate transactions on the exact same date with same amount
      const txList: ITransaction[] = [];
      const seenDateAmount = new Set<string>();
      for (const t of rawTxList) {
        const dStr = new Date(t.date).toISOString().split('T')[0];
        const combo = `${dStr}_${t.amount}`;
        if (!seenDateAmount.has(combo)) {
          seenDateAmount.add(combo);
          txList.push(t);
        }
      }

      // Feature 1: Minimum observation threshold
      if (txList.length < RECURRING_THRESHOLDS.MIN_OBSERVATIONS) {
        continue;
      }

      // Compute intervals between consecutive occurrences (in days)
      const intervals: number[] = [];
      for (let i = 1; i < txList.length; i++) {
        const prev = new Date(txList[i - 1].date).getTime();
        const curr = new Date(txList[i].date).getTime();
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) intervals.push(diffDays);
      }

      if (intervals.length === 0) continue;

      const avgInterval = intervals.reduce((s, d) => s + d, 0) / intervals.length;

      // Calculate interval variance and coefficient of variation
      const intervalVariance =
        intervals.reduce((s, d) => s + Math.pow(d - avgInterval, 2), 0) / intervals.length;
      const intervalStdDev = Math.sqrt(intervalVariance);
      const intervalCv = avgInterval > 0 ? intervalStdDev / avgInterval : 0;

      // Feature 1: Match Cadence Bands
      let cadence: RecurrenceCadence | null = null;
      let monthlyFactor = 1;

      if (
        avgInterval >= RECURRING_THRESHOLDS.CADENCES.WEEKLY.minDays &&
        avgInterval <= RECURRING_THRESHOLDS.CADENCES.WEEKLY.maxDays
      ) {
        cadence = 'WEEKLY';
        monthlyFactor = RECURRING_THRESHOLDS.CADENCES.WEEKLY.monthlyFactor;
      } else if (
        avgInterval >= RECURRING_THRESHOLDS.CADENCES.BIWEEKLY.minDays &&
        avgInterval <= RECURRING_THRESHOLDS.CADENCES.BIWEEKLY.maxDays
      ) {
        cadence = 'BIWEEKLY';
        monthlyFactor = RECURRING_THRESHOLDS.CADENCES.BIWEEKLY.monthlyFactor;
      } else if (
        avgInterval >= RECURRING_THRESHOLDS.CADENCES.MONTHLY.minDays &&
        avgInterval <= RECURRING_THRESHOLDS.CADENCES.MONTHLY.maxDays
      ) {
        cadence = 'MONTHLY';
        monthlyFactor = RECURRING_THRESHOLDS.CADENCES.MONTHLY.monthlyFactor;
      } else if (
        avgInterval >= RECURRING_THRESHOLDS.CADENCES.QUARTERLY.minDays &&
        avgInterval <= RECURRING_THRESHOLDS.CADENCES.QUARTERLY.maxDays
      ) {
        cadence = 'QUARTERLY';
        monthlyFactor = RECURRING_THRESHOLDS.CADENCES.QUARTERLY.monthlyFactor;
      } else if (
        avgInterval >= RECURRING_THRESHOLDS.CADENCES.YEARLY.minDays &&
        avgInterval <= RECURRING_THRESHOLDS.CADENCES.YEARLY.maxDays
      ) {
        cadence = 'YEARLY';
        monthlyFactor = RECURRING_THRESHOLDS.CADENCES.YEARLY.monthlyFactor;
      }

      // Feature 6: Irregular pattern rejection
      if (!cadence) continue;

      // Feature 2: Amount Tolerance Rule
      const amounts = txList.map((t) => t.amount);
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const amountVariance =
        amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) / amounts.length;
      const amountStdDev = Math.sqrt(amountVariance);
      const amountCv = avgAmount > 0 ? amountStdDev / avgAmount : 0;

      // Reject if amount variation exceeds documented tolerance (CV > 0.25)
      if (amountCv > RECURRING_THRESHOLDS.AMOUNT_TOLERANCE_CV && amounts.length > 2) {
        continue;
      }

      // Feature 3: Calculated Confidence Score
      // Base confidence 0.4 + weight of interval regularity (0.3) + weight of amount stability (0.3)
      const intervalRegularity = Math.max(0, 1 - intervalCv);
      const amountRegularity = Math.max(0, 1 - amountCv);
      const rawConfidence = 0.4 + 0.3 * intervalRegularity + 0.3 * amountRegularity;
      const confidenceScore = Math.min(1.0, Math.max(0.5, Math.round(rawConfidence * 100) / 100));

      // Feature 7: Normalized Monthly Impact
      const monthlyImpact = Math.round(avgAmount * monthlyFactor);

      const firstTx = txList[0];
      const lastTx = txList[txList.length - 1];
      const firstDate = new Date(firstTx.date);
      const lastDate = new Date(lastTx.date);

      // Feature 4: Estimated Next Occurrence Calculation
      const nextDate = new Date(lastDate);
      if (cadence === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
      else if (cadence === 'BIWEEKLY') nextDate.setDate(nextDate.getDate() + 14);
      else if (cadence === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (cadence === 'QUARTERLY') nextDate.setMonth(nextDate.getMonth() + 3);
      else if (cadence === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);

      const nextExpectedStr = nextDate.toISOString().split('T')[0];
      const lastOccurrenceStr = lastDate.toISOString().split('T')[0];
      const firstDetectedStr = firstDate.toISOString().split('T')[0];

      // Next occurrence reliability check
      const nextOccurrenceReliable = intervalCv <= 0.25;
      const nextOccurrenceMessage = nextOccurrenceReliable
        ? `Estimated next occurrence: around ${nextExpectedStr}`
        : 'Next occurrence cannot be reliably estimated.';

      const entityName =
        (lastTx.destinationEntityId && entityMap.get(lastTx.destinationEntityId)) ||
        (lastTx as any).merchant ||
        lastTx.description ||
        'Recurring Merchant';

      const evidence = [
        `${txList.length} verified historical occurrences detected`,
        `Average payment interval: ${Math.round(avgInterval)} days (cadence: ${cadence})`,
        `Amount stability: mean ₹${Math.round(avgAmount)}, variance ${Math.round(amountCv * 100)}%`,
        `Observed date span: ${firstDetectedStr} to ${lastOccurrenceStr}`,
      ];

      // Match against existing record in repository (case-insensitive)
      const alreadySaved = existing.find(
        (e) =>
          e.name.toLowerCase() === entityName.toLowerCase() ||
          e.entityName.toLowerCase() === entityName.toLowerCase()
      );

      if (!alreadySaved) {
        await RecurringExpenseRepository.create({
          userId,
          name: entityName,
          entityId: lastTx.destinationEntityId,
          entityName,
          averageAmount: Math.round(avgAmount),
          averageAmountPaise: toPaise(Math.round(avgAmount)),
          lastAmount: Math.round(lastTx.amount),
          cadence,
          category: lastTx.category || 'Subscription',
          estimatedMonthlyImpact: monthlyImpact,
          averageIntervalDays: Math.round(avgInterval),
          firstDetectedDate: firstDetectedStr,
          lastOccurrenceDate: lastOccurrenceStr,
          nextExpectedDate: nextExpectedStr,
          nextOccurrenceReliable,
          nextOccurrenceMessage,
          totalOccurrences: txList.length,
          status: 'ACTIVE',
          detectedAutomatically: true,
          confidenceScore,
          confidenceFormula: RECURRING_THRESHOLDS.CONFIDENCE_FORMULA,
          evidence,
          notes: `Deterministically detected from ${txList.length} periodic transactions (average interval ${Math.round(avgInterval)} days).`,
        });
      } else {
        await RecurringExpenseRepository.update(alreadySaved._id, userId, {
          lastOccurrenceDate: lastOccurrenceStr,
          nextExpectedDate: nextExpectedStr,
          averageAmount: Math.round(avgAmount),
          averageAmountPaise: toPaise(Math.round(avgAmount)),
          lastAmount: Math.round(lastTx.amount),
          estimatedMonthlyImpact: monthlyImpact,
          averageIntervalDays: Math.round(avgInterval),
          totalOccurrences: txList.length,
          confidenceScore,
          nextOccurrenceReliable,
          nextOccurrenceMessage,
          evidence,
        });
      }
    }

    // Retrieve full synced list for user
    const all = await RecurringExpenseRepository.findByUserId(userId);
    const active = all.filter((r) => r.status === 'ACTIVE');

    // Feature 7: Summary Metrics
    const totalMonthly = active.reduce((s, r) => s + r.estimatedMonthlyImpact, 0);
    const estimatedAnnual = totalMonthly * 12;

    let largestRecurringExpense: RecurringSummaryMetrics['largestRecurringExpense'] = null;
    if (active.length > 0) {
      const sortedByImpact = [...active].sort(
        (a, b) => b.estimatedMonthlyImpact - a.estimatedMonthlyImpact
      );
      const top = sortedByImpact[0];
      largestRecurringExpense = {
        name: top.name,
        monthlyImpact: top.estimatedMonthlyImpact,
        averageAmount: top.averageAmount,
        cadence: top.cadence,
      };
    }

    const summary: RecurringSummaryMetrics = {
      totalRecurringMonthlyExpense: totalMonthly,
      estimatedAnnualRecurringExpense: estimatedAnnual,
      numberOfRecurringExpenses: active.length,
      largestRecurringExpense,
      normalizationMethod: RECURRING_THRESHOLDS.NORMALIZATION_METHOD,
    };

    const hasSufficientData = all.length > 0;
    if (!hasSufficientData && cleanDebits.length < 2) {
      limitations.push('Not enough transaction history to detect recurring expenses.');
    }

    return {
      hasSufficientData,
      recurringExpenses: all,
      summary,
      totalEstimatedMonthlyImpact: totalMonthly,
      activeCount: active.length,
      detectedCount: all.filter((r) => r.detectedAutomatically).length,
      limitations,
    };
  },

  async list(userId: string): Promise<RecurringDetectionSummary> {
    return this.detectAndSync(userId);
  },

  async create(userId: string, data: any): Promise<IRecurringExpense> {
    const avgAmount = Number(data.averageAmount);
    const cadence: RecurrenceCadence = (data.cadence as RecurrenceCadence) || 'MONTHLY';

    let monthlyFactor = 1;
    if (cadence === 'WEEKLY') monthlyFactor = RECURRING_THRESHOLDS.CADENCES.WEEKLY.monthlyFactor;
    else if (cadence === 'BIWEEKLY' || (cadence as string) === 'BI_WEEKLY')
      monthlyFactor = RECURRING_THRESHOLDS.CADENCES.BIWEEKLY.monthlyFactor;
    else if (cadence === 'QUARTERLY') monthlyFactor = RECURRING_THRESHOLDS.CADENCES.QUARTERLY.monthlyFactor;
    else if (cadence === 'YEARLY' || (cadence as string) === 'ANNUAL')
      monthlyFactor = RECURRING_THRESHOLDS.CADENCES.YEARLY.monthlyFactor;

    const monthlyImpact = Math.round(avgAmount * monthlyFactor);
    const todayStr = new Date().toISOString().split('T')[0];

    return RecurringExpenseRepository.create({
      userId,
      name: data.name,
      entityId: data.entityId,
      entityName: data.entityName || data.name,
      averageAmount: Math.round(avgAmount),
      averageAmountPaise: toPaise(Math.round(avgAmount)),
      lastAmount: data.lastAmount ? Math.round(Number(data.lastAmount)) : Math.round(avgAmount),
      cadence,
      category: data.category || 'General',
      estimatedMonthlyImpact: monthlyImpact,
      averageIntervalDays: data.averageIntervalDays || 30,
      firstDetectedDate: data.firstDetectedDate || todayStr,
      lastOccurrenceDate: data.lastOccurrenceDate || todayStr,
      nextExpectedDate: data.nextExpectedDate || todayStr,
      nextOccurrenceReliable: true,
      nextOccurrenceMessage: `Estimated next occurrence: around ${data.nextExpectedDate || todayStr}`,
      totalOccurrences: data.totalOccurrences || 1,
      status: data.status || 'ACTIVE',
      detectedAutomatically: false,
      confidenceScore: 1.0,
      confidenceFormula: 'User-declared commitment (confidence: 100%)',
      evidence: ['User confirmed recurring commitment'],
      notes: data.notes || '',
    });
  },

  async update(id: string, userId: string, data: any): Promise<IRecurringExpense | null> {
    const updatePayload: Partial<IRecurringExpense> = { ...data };
    if (data.averageAmount !== undefined) {
      const avg = Number(data.averageAmount);
      updatePayload.averageAmount = Math.round(avg);
      updatePayload.averageAmountPaise = toPaise(Math.round(avg));
      const cadence = data.cadence || 'MONTHLY';
      let factor = 1;
      if (cadence === 'WEEKLY') factor = RECURRING_THRESHOLDS.CADENCES.WEEKLY.monthlyFactor;
      else if (cadence === 'BIWEEKLY' || cadence === 'BI_WEEKLY')
        factor = RECURRING_THRESHOLDS.CADENCES.BIWEEKLY.monthlyFactor;
      else if (cadence === 'QUARTERLY') factor = RECURRING_THRESHOLDS.CADENCES.QUARTERLY.monthlyFactor;
      else if (cadence === 'YEARLY' || cadence === 'ANNUAL')
        factor = RECURRING_THRESHOLDS.CADENCES.YEARLY.monthlyFactor;
      updatePayload.estimatedMonthlyImpact = Math.round(avg * factor);
    }
    return RecurringExpenseRepository.update(id, userId, updatePayload);
  },

  async delete(id: string, userId: string): Promise<boolean> {
    return RecurringExpenseRepository.delete(id, userId);
  },
};
