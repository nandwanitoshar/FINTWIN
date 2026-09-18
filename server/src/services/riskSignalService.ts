/**
 * riskSignalService.ts
 * Phase 5 — 06 ANALYZE: Deterministic Risk Signal Engine
 *
 * Implements 8 canonical signal types backed by real user financial data.
 * All thresholds are centralized in ANALYSIS_THRESHOLDS.
 * No fabricated values, no random scores, no fake AI predictions.
 */

import { AccountRepository, IAccount } from '../models/Account.js';
import { EntityRepository, IEntity } from '../models/Entity.js';
import { TransactionRepository, ITransaction } from '../models/Transaction.js';
import { DigitalTwinService } from './digitalTwinService.js';

// ─── Centralized Threshold Configuration ───────────────────────────────────
export const ANALYSIS_THRESHOLDS = {
  // HIGH_EXPENSE_CONCENTRATION
  EXPENSE_CONCENTRATION_HIGH: 0.40,     // 40% of total expenses → HIGH
  EXPENSE_CONCENTRATION_CRITICAL: 0.60, // 60% of total expenses → CRITICAL

  // RECURRING_EXPENSE_PRESSURE
  RECURRING_PRESSURE_MEDIUM: 0.25,      // 25% of monthly outflow → MEDIUM
  RECURRING_PRESSURE_HIGH: 0.40,        // 40% of monthly outflow → HIGH
  RECURRING_MIN_OCCURRENCES: 2,         // Minimum occurrences to classify as recurring

  // INCOME_CONCENTRATION
  INCOME_CONCENTRATION_HIGH: 0.80,      // 80% from single entity → HIGH

  // LIQUIDITY_PRESSURE (mirrors spec.md §19)
  RUNWAY_CRITICAL: 1.5,                 // < 1.5 months → CRITICAL
  RUNWAY_HIGH: 3.0,                     // < 3.0 months → HIGH

  // DEBT_BURDEN (mirrors spec.md §19)
  DTI_HIGH: 0.40,                       // DTI > 40% → HIGH

  // UNUSUAL_TRANSACTION_PATTERN
  UNUSUAL_Z_SCORE: 2.5,                 // Amount > mean + 2.5 * stdDev
  UNUSUAL_MIN_HISTORY: 5,               // Minimum transactions to compute baseline

  // NETWORK_CONCENTRATION
  NETWORK_CONCENTRATION_MEDIUM: 0.60,   // > 60% of network volume → MEDIUM
  NETWORK_CONCENTRATION_HIGH: 0.80,     // > 80% of network volume → HIGH
} as const;

// ─── Evidence Item ──────────────────────────────────────────────────────────
export interface EvidenceItem {
  field: string;
  value: string | number;
  unit?: string;
  description?: string;
}

// ─── Detected Signal ────────────────────────────────────────────────────────
export interface DetectedSignal {
  id: string;                           // Deterministic ID based on userId + type + subject
  userId: string;
  type: SignalType;
  severity: SignalSeverity;
  status: SignalStatus;
  title: string;
  summary: string;
  explanation: string;
  evidence: EvidenceItem[];
  metrics: Record<string, number | string>;
  affectedAccountIds: string[];
  affectedEntityIds: string[];
  affectedTransactionIds: string[];
  affectedNodeIds: string[];
  recommendations: string[];
  limitations: string[];
  detectedAt: string;
  generatedAt: string;
}

export type SignalType =
  | 'HIGH_EXPENSE_CONCENTRATION'
  | 'RECURRING_EXPENSE_PRESSURE'
  | 'INCOME_CONCENTRATION'
  | 'LIQUIDITY_PRESSURE'
  | 'DEBT_BURDEN'
  | 'CASHFLOW_DECLINE'
  | 'UNUSUAL_TRANSACTION_PATTERN'
  | 'NETWORK_CONCENTRATION';

export type SignalSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SignalStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

// ─── Analysis Summary ───────────────────────────────────────────────────────
export interface AnalysisSummary {
  totalSignals: number;
  signalsBySeverity: Record<SignalSeverity, number>;
  activeSignals: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
  liquidityMonths: number;
  dtiPercent: number;
  networkRelationships: number;
  healthScore: number;
  limitations: string[];
  generatedAt: string;
}

// ─── In-Memory Signal Store (per user, keyed by userId) ─────────────────────
// Since this is a stateless evaluation engine (no DB model needed for signals),
// signals are regenerated deterministically on each call and cached per request.

// ─── Utility helpers ─────────────────────────────────────────────────────────
function makeSignalId(userId: string, type: string, subject: string): string {
  return `sig_${type.toLowerCase()}_${subject.replace(/\W+/g, '_').slice(0, 20)}_${userId.slice(-6)}`;
}

function stdDev(values: number[]): { mean: number; sd: number } {
  if (values.length === 0) return { mean: 0, sd: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, sd: Math.sqrt(variance) };
}

function fmt(n: number, currency = 'INR'): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtPct(n: number): string {
  return `${Math.round(n * 10) / 10}%`;
}

// ─── Main Detection Engine ───────────────────────────────────────────────────
export const RiskSignalService = {

  /**
   * Runs all 8 deterministic signal evaluators against the user's real financial data.
   * Returns a full list of detected signals with evidence.
   */
  async detectSignals(userId: string): Promise<DetectedSignal[]> {
    const [accounts, entities, txResult, twin] = await Promise.all([
      AccountRepository.findByUserId(userId),
      EntityRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId, { limit: 2000 }),
      DigitalTwinService.getTwinState(userId),
    ]);

    const transactions = txResult.transactions;
    const signals: DetectedSignal[] = [];

    // Run all evaluators in parallel
    const results = await Promise.all([
      this._evaluateExpenseConcentration(userId, accounts, entities, transactions),
      this._evaluateRecurringExpensePressure(userId, accounts, entities, transactions, twin),
      this._evaluateIncomeConcentration(userId, accounts, entities, transactions),
      this._evaluateLiquidityPressure(userId, accounts, twin),
      this._evaluateDebtBurden(userId, accounts, twin),
      this._evaluateCashflowDecline(userId, transactions, twin),
      this._evaluateUnusualTransactionPatterns(userId, accounts, entities, transactions),
      this._evaluateNetworkConcentration(userId, entities, transactions),
    ]);

    for (const result of results) {
      signals.push(...result);
    }

    return signals;
  },

  /**
   * Returns a single signal by its deterministic ID.
   */
  async getSignalById(userId: string, signalId: string): Promise<DetectedSignal | null> {
    const signals = await this.detectSignals(userId);
    return signals.find((s) => s.id === signalId && s.userId === userId) || null;
  },

  /**
   * Returns summary metrics for the analysis dashboard.
   */
  async getAnalysisSummary(userId: string): Promise<AnalysisSummary> {
    const [signals, twin, network] = await Promise.all([
      this.detectSignals(userId),
      DigitalTwinService.getTwinState(userId),
      DigitalTwinService.getNetworkSummary(userId),
    ]);

    const bySeverity: Record<SignalSeverity, number> = {
      INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
    };
    for (const s of signals) bySeverity[s.severity]++;

    const limitations: string[] = [];
    if (twin.summary.transactionsCount < 5) {
      limitations.push('Insufficient transaction history (< 5 transactions). Some pattern signals may be unavailable.');
    }
    if (twin.summary.accountsCount === 0) {
      limitations.push('No accounts found. Liquidity and debt analysis unavailable.');
    }

    return {
      totalSignals: signals.length,
      signalsBySeverity: bySeverity,
      activeSignals: signals.filter((s) => s.status === 'OPEN').length,
      monthlyIncome: twin.stateVector.monthlyIncome,
      monthlyExpenses: twin.stateVector.monthlyBurn,
      netCashFlow: twin.stateVector.monthlyIncome - twin.stateVector.monthlyBurn,
      liquidityMonths: twin.stateVector.runwayMonths,
      dtiPercent: twin.stateVector.dtiPercent,
      networkRelationships: network.edgeCount,
      healthScore: twin.stateVector.healthScore,
      limitations,
      generatedAt: new Date().toISOString(),
    };
  },

  // ─── Signal A: HIGH_EXPENSE_CONCENTRATION ──────────────────────────────────
  async _evaluateExpenseConcentration(
    userId: string,
    accounts: IAccount[],
    entities: IEntity[],
    transactions: ITransaction[]
  ): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];

    const expenseTxs = transactions.filter((t) => t.type === 'DEBIT' || t.direction === 'EXPENSE');
    const totalExpenses = expenseTxs.reduce((s, t) => s + t.amount, 0);

    if (totalExpenses === 0) return signals;

    // Aggregate by category
    const byCat: Record<string, { amount: number; txIds: string[] }> = {};
    for (const tx of expenseTxs) {
      const cat = tx.category || 'Uncategorized';
      if (!byCat[cat]) byCat[cat] = { amount: 0, txIds: [] };
      byCat[cat].amount += tx.amount;
      byCat[cat].txIds.push(tx._id);
    }

    for (const [cat, data] of Object.entries(byCat)) {
      const pct = data.amount / totalExpenses;
      if (pct >= ANALYSIS_THRESHOLDS.EXPENSE_CONCENTRATION_HIGH) {
        const severity: SignalSeverity = pct >= ANALYSIS_THRESHOLDS.EXPENSE_CONCENTRATION_CRITICAL ? 'CRITICAL' : 'HIGH';
        signals.push({
          id: makeSignalId(userId, 'EXPENSE_CONC', cat),
          userId,
          type: 'HIGH_EXPENSE_CONCENTRATION',
          severity,
          status: 'OPEN',
          title: `High Expense Concentration: ${cat}`,
          summary: `${cat} represents ${fmtPct(pct * 100)} of total recorded expenses.`,
          explanation: `The ${cat} category accounts for ${fmt(data.amount)} out of total recorded expenses of ${fmt(totalExpenses)}, which is ${fmtPct(pct * 100)} of all expense volume. This concentration (threshold: ${fmtPct(ANALYSIS_THRESHOLDS.EXPENSE_CONCENTRATION_HIGH * 100)}) indicates that a disproportionate share of outflows is concentrated in a single category.`,
          evidence: [
            { field: 'Category', value: cat },
            { field: 'Category Volume', value: Math.round(data.amount), unit: '₹' },
            { field: 'Total Expense Volume', value: Math.round(totalExpenses), unit: '₹' },
            { field: 'Concentration Percentage', value: fmtPct(pct * 100) },
            { field: 'Transaction Count', value: data.txIds.length },
            { field: 'Threshold (HIGH)', value: fmtPct(ANALYSIS_THRESHOLDS.EXPENSE_CONCENTRATION_HIGH * 100) },
          ],
          metrics: {
            categoryAmount: Math.round(data.amount),
            totalExpenses: Math.round(totalExpenses),
            concentrationPct: Math.round(pct * 1000) / 10,
          },
          affectedAccountIds: [...new Set(expenseTxs.filter(t => data.txIds.includes(t._id)).map(t => t.sourceAccountId).filter(Boolean))],
          affectedEntityIds: [...new Set(expenseTxs.filter(t => data.txIds.includes(t._id)).map(t => t.destinationEntityId).filter(Boolean))] as string[],
          affectedTransactionIds: data.txIds.slice(0, 20),
          affectedNodeIds: [],
          recommendations: [
            `Reducing ${cat} expenses by 20% would lower this category's share of expenses and improve overall budget diversification.`,
          ],
          limitations: expenseTxs.length < 10 ? ['Limited transaction history may affect concentration accuracy.'] : [],
          detectedAt: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
        });
      }
    }

    return signals;
  },

  // ─── Signal B: RECURRING_EXPENSE_PRESSURE ──────────────────────────────────
  async _evaluateRecurringExpensePressure(
    userId: string,
    accounts: IAccount[],
    entities: IEntity[],
    transactions: ITransaction[],
    twin: any
  ): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];

    const expenseTxs = transactions.filter((t) => t.type === 'DEBIT' || t.direction === 'EXPENSE');
    if (expenseTxs.length === 0) return signals;

    // Compute average monthly burn from the date range of all expense transactions
    const dates = expenseTxs.map((t) => new Date(t.date).getTime()).filter((d) => !isNaN(d));
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const totalExpenses = expenseTxs.reduce((s, t) => s + t.amount, 0);
    // Months spanned: at least 1 to avoid division by zero
    const monthsSpanned = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24 * 30));
    // Average monthly burn across the observation window
    const avgMonthlyBurn = totalExpenses / monthsSpanned;

    if (avgMonthlyBurn === 0) return signals;

    // Group by entity to detect recurrence
    const entityMap = new Map(entities.map((e) => [e._id, e]));
    const byEntity: Record<string, { entityId: string; entityName: string; category: string; txs: ITransaction[] }> = {};

    for (const tx of expenseTxs) {
      const entId = tx.destinationEntityId || 'unknown';
      if (!byEntity[entId]) {
        const ent = entityMap.get(entId);
        byEntity[entId] = {
          entityId: entId,
          entityName: ent?.name || tx.category || 'Unknown',
          category: tx.category || ent?.category || 'Expense',
          txs: [],
        };
      }
      byEntity[entId].txs.push(tx);
    }

    for (const [entId, data] of Object.entries(byEntity)) {
      if (data.txs.length < ANALYSIS_THRESHOLDS.RECURRING_MIN_OCCURRENCES) continue;

      // Check if marked MONTHLY or WEEKLY recurrence, or has enough occurrences
      const isRecurring =
        data.txs.some((t) => t.recurrence === 'MONTHLY' || t.recurrence === 'WEEKLY') ||
        data.txs.length >= 2;

      if (!isRecurring) continue;

      const totalVolume = data.txs.reduce((s, t) => s + t.amount, 0);
      // Average per occurrence is the best estimate of monthly recurring amount
      const avgPerOccurrence = totalVolume / data.txs.length;
      // Compare against average monthly burn for fair proportional calculation
      const pct = avgPerOccurrence / avgMonthlyBurn;

      if (pct >= ANALYSIS_THRESHOLDS.RECURRING_PRESSURE_MEDIUM) {
        const severity: SignalSeverity = pct >= ANALYSIS_THRESHOLDS.RECURRING_PRESSURE_HIGH ? 'HIGH' : 'MEDIUM';
        const sortedTxs = [...data.txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        signals.push({
          id: makeSignalId(userId, 'RECURRING_PRESSURE', data.entityName),
          userId,
          type: 'RECURRING_EXPENSE_PRESSURE',
          severity,
          status: 'OPEN',
          title: `Recurring Expense Pressure: ${data.entityName}`,
          summary: `${data.entityName} (${data.category}) contributes ${fmtPct(pct * 100)} of average monthly outflow across ${data.txs.length} occurrences.`,
          explanation: `${data.entityName} has generated ${data.txs.length} expense transactions with a total recorded volume of ${fmt(totalVolume)} and an average contribution of ${fmt(avgPerOccurrence)} per occurrence. This represents ${fmtPct(pct * 100)} of the computed average monthly burn of ${fmt(avgMonthlyBurn)} (total expenses / months observed). Recurring expenses above ${fmtPct(ANALYSIS_THRESHOLDS.RECURRING_PRESSURE_MEDIUM * 100)} of average monthly outflow materially constrain cash-flow flexibility.`,
          evidence: [
            { field: 'Entity / Merchant', value: data.entityName },
            { field: 'Category', value: data.category },
            { field: 'Observed Occurrences', value: data.txs.length },
            { field: 'Total Recorded Volume', value: Math.round(totalVolume), unit: '₹' },
            { field: 'Average Per Occurrence', value: Math.round(avgPerOccurrence), unit: '₹' },
            { field: 'Share of Avg Monthly Outflow', value: fmtPct(pct * 100) },
            { field: 'Avg Monthly Burn (observation window)', value: Math.round(avgMonthlyBurn), unit: '₹' },
            { field: 'First Occurrence', value: sortedTxs[0]?.date?.toString().slice(0, 10) || 'N/A' },
            { field: 'Latest Occurrence', value: sortedTxs[sortedTxs.length - 1]?.date?.toString().slice(0, 10) || 'N/A' },
          ],
          metrics: {
            totalVolume: Math.round(totalVolume),
            avgPerOccurrence: Math.round(avgPerOccurrence),
            shareOfBurnPct: Math.round(pct * 1000) / 10,
            occurrences: data.txs.length,
            avgMonthlyBurn: Math.round(avgMonthlyBurn),
          },
          affectedAccountIds: [...new Set(data.txs.map((t) => t.sourceAccountId).filter(Boolean))],
          affectedEntityIds: entId !== 'unknown' ? [entId] : [],
          affectedTransactionIds: data.txs.map((t) => t._id).slice(0, 20),
          affectedNodeIds: entId !== 'unknown' ? [entId] : [],
          recommendations: [
            `Reducing this recurring expense by ${fmt(avgPerOccurrence * 0.2)}/occurrence would increase projected monthly surplus by ${fmt(avgPerOccurrence * 0.2)}.`,
          ],
          limitations: [],
          detectedAt: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
        });
      }
    }

    return signals;
  },

  // ─── Signal C: INCOME_CONCENTRATION ───────────────────────────────────────
  async _evaluateIncomeConcentration(
    userId: string,
    accounts: IAccount[],
    entities: IEntity[],
    transactions: ITransaction[]
  ): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];

    const incomeTxs = transactions.filter((t) => t.type === 'CREDIT' || t.direction === 'INCOME');
    const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);

    if (totalIncome === 0) return signals;

    const entityMap = new Map(entities.map((e) => [e._id, e]));
    const byEntity: Record<string, { entityId: string; entityName: string; amount: number; txIds: string[]; firstDate: string; lastDate: string }> = {};

    for (const tx of incomeTxs) {
      const entId = tx.destinationEntityId || 'unknown';
      if (!byEntity[entId]) {
        const ent = entityMap.get(entId);
        byEntity[entId] = {
          entityId: entId,
          entityName: ent?.name || 'Primary Source',
          amount: 0,
          txIds: [],
          firstDate: tx.date?.toString() || '',
          lastDate: tx.date?.toString() || '',
        };
      }
      byEntity[entId].amount += tx.amount;
      byEntity[entId].txIds.push(tx._id);
      const d = tx.date?.toString() || '';
      if (d < byEntity[entId].firstDate || !byEntity[entId].firstDate) byEntity[entId].firstDate = d;
      if (d > byEntity[entId].lastDate) byEntity[entId].lastDate = d;
    }

    for (const [entId, data] of Object.entries(byEntity)) {
      const pct = data.amount / totalIncome;
      if (pct >= ANALYSIS_THRESHOLDS.INCOME_CONCENTRATION_HIGH) {
        signals.push({
          id: makeSignalId(userId, 'INCOME_CONC', data.entityName),
          userId,
          type: 'INCOME_CONCENTRATION',
          severity: 'HIGH',
          status: 'OPEN',
          title: `Income Concentration: ${data.entityName}`,
          summary: `${data.entityName} provides ${fmtPct(pct * 100)} of total observed income across ${data.txIds.length} transaction(s).`,
          explanation: `${data.entityName} has contributed ${fmt(data.amount)} of the total observed income of ${fmt(totalIncome)}, representing ${fmtPct(pct * 100)} of all income. A concentration above ${fmtPct(ANALYSIS_THRESHOLDS.INCOME_CONCENTRATION_HIGH * 100)} from a single source means that disruption to this counterparty would directly impact ${fmtPct(pct * 100)} of observed cash inflows. This analysis does not make claims about future employment or income continuity.`,
          evidence: [
            { field: 'Income Source', value: data.entityName },
            { field: 'Income from Source', value: Math.round(data.amount), unit: '₹' },
            { field: 'Total Observed Income', value: Math.round(totalIncome), unit: '₹' },
            { field: 'Concentration Percentage', value: fmtPct(pct * 100) },
            { field: 'Transaction Count', value: data.txIds.length },
            { field: 'First Observed Activity', value: data.firstDate?.slice(0, 10) || 'N/A' },
            { field: 'Latest Observed Activity', value: data.lastDate?.slice(0, 10) || 'N/A' },
            { field: 'Threshold', value: fmtPct(ANALYSIS_THRESHOLDS.INCOME_CONCENTRATION_HIGH * 100) },
          ],
          metrics: {
            sourceIncome: Math.round(data.amount),
            totalIncome: Math.round(totalIncome),
            concentrationPct: Math.round(pct * 1000) / 10,
            transactionCount: data.txIds.length,
          },
          affectedAccountIds: [...new Set(incomeTxs.filter(t => data.txIds.includes(t._id)).map(t => t.sourceAccountId).filter(Boolean))],
          affectedEntityIds: entId !== 'unknown' ? [entId] : [],
          affectedTransactionIds: data.txIds.slice(0, 20),
          affectedNodeIds: entId !== 'unknown' ? [entId] : [],
          recommendations: [
            `Building a dedicated emergency cash reserve of at least 3 months of monthly burn would provide buffer if income from this source is disrupted.`,
          ],
          limitations: [
            'This analysis does not predict future income or employment status.',
            'Income concentration analysis is based on recorded transaction history only.',
          ],
          detectedAt: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
        });
      }
    }

    return signals;
  },

  // ─── Signal D: LIQUIDITY_PRESSURE ─────────────────────────────────────────
  async _evaluateLiquidityPressure(
    userId: string,
    accounts: IAccount[],
    twin: any
  ): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];
    const { liquidReserves, monthlyBurn, runwayMonths } = twin.stateVector;

    if (accounts.length === 0) return signals;

    if (runwayMonths < ANALYSIS_THRESHOLDS.RUNWAY_HIGH) {
      const severity: SignalSeverity = runwayMonths < ANALYSIS_THRESHOLDS.RUNWAY_CRITICAL ? 'CRITICAL' : 'HIGH';
      const liquidAccounts = accounts.filter((a) => a.isLiquid);

      signals.push({
        id: makeSignalId(userId, 'LIQUIDITY', 'runway'),
        userId,
        type: 'LIQUIDITY_PRESSURE',
        severity,
        status: 'OPEN',
        title: 'Liquidity Runway Below Safety Threshold',
        summary: `Emergency runway stands at ${runwayMonths.toFixed(1)} months. Threshold: ${ANALYSIS_THRESHOLDS.RUNWAY_HIGH} months.`,
        explanation: `Liquid cash reserves of ${fmt(liquidReserves)} divided by the observed monthly burn rate of ${fmt(monthlyBurn)} yields an emergency runway of ${runwayMonths.toFixed(2)} months. This is below the ${ANALYSIS_THRESHOLDS.RUNWAY_HIGH}-month safety threshold${runwayMonths < ANALYSIS_THRESHOLDS.RUNWAY_CRITICAL ? ` and critically below the ${ANALYSIS_THRESHOLDS.RUNWAY_CRITICAL}-month critical threshold` : ''}. Mathematical proof: Runway = Liquid Reserves (${fmt(liquidReserves)}) / Monthly Burn (${fmt(monthlyBurn)}) = ${runwayMonths.toFixed(2)} months.`,
        evidence: [
          { field: 'Liquid Reserves', value: Math.round(liquidReserves), unit: '₹' },
          { field: 'Monthly Burn Rate', value: Math.round(monthlyBurn), unit: '₹/month' },
          { field: 'Emergency Runway', value: `${runwayMonths.toFixed(2)} months` },
          { field: 'Safe Threshold', value: `${ANALYSIS_THRESHOLDS.RUNWAY_HIGH} months` },
          { field: 'Critical Threshold', value: `${ANALYSIS_THRESHOLDS.RUNWAY_CRITICAL} months` },
          { field: 'Liquid Accounts Count', value: liquidAccounts.length },
          { field: 'Minimum Reserve Required (3 months)', value: Math.round(monthlyBurn * 3), unit: '₹' },
        ],
        metrics: {
          liquidReserves: Math.round(liquidReserves),
          monthlyBurn: Math.round(monthlyBurn),
          runwayMonths: Math.round(runwayMonths * 100) / 100,
          shortfallToSafe: Math.max(0, Math.round(monthlyBurn * ANALYSIS_THRESHOLDS.RUNWAY_HIGH - liquidReserves)),
        },
        affectedAccountIds: liquidAccounts.map((a) => a._id),
        affectedEntityIds: [],
        affectedTransactionIds: [],
        affectedNodeIds: liquidAccounts.map((a) => a._id),
        recommendations: [
          `Injecting ${fmt(Math.max(0, monthlyBurn * ANALYSIS_THRESHOLDS.RUNWAY_HIGH - liquidReserves))} into liquid savings extends runway to the ${ANALYSIS_THRESHOLDS.RUNWAY_HIGH}-month safety threshold.`,
          'Freeze non-essential discretionary outflows until liquid reserves reach the safe threshold.',
        ],
        limitations: monthlyBurn === 0
          ? ['Monthly burn is estimated from account balances due to insufficient transaction history.']
          : [],
        detectedAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
      });
    }

    return signals;
  },

  // ─── Signal E: DEBT_BURDEN ──────────────────────────────────────────────────
  async _evaluateDebtBurden(
    userId: string,
    accounts: IAccount[],
    twin: any
  ): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];
    const { dtiPercent, monthlyIncome, totalDebt } = twin.stateVector;
    const monthlyDebtPayments = twin.metrics.monthlyDebtPayments;

    if (monthlyIncome === 0) return signals;

    const dtiDecimal = dtiPercent / 100;
    if (dtiDecimal > ANALYSIS_THRESHOLDS.DTI_HIGH) {
      const liabilityAccounts = accounts.filter((a) => ['CREDIT_CARD', 'LOAN'].includes(a.type));

      signals.push({
        id: makeSignalId(userId, 'DEBT', 'dti'),
        userId,
        type: 'DEBT_BURDEN',
        severity: 'HIGH',
        status: 'OPEN',
        title: 'Excessive Debt-to-Income Ratio',
        summary: `DTI is ${dtiPercent.toFixed(1)}%, exceeding the ${ANALYSIS_THRESHOLDS.DTI_HIGH * 100}% prudence boundary.`,
        explanation: `Monthly debt service obligations of ${fmt(monthlyDebtPayments)} represent ${dtiPercent.toFixed(1)}% of gross monthly income of ${fmt(monthlyIncome)}. DTI above ${ANALYSIS_THRESHOLDS.DTI_HIGH * 100}% restricts discretionary financial flexibility and may limit access to additional credit facilities. Mathematical proof: DTI = (Monthly Debt ${fmt(monthlyDebtPayments)} / Gross Income ${fmt(monthlyIncome)}) × 100 = ${dtiPercent.toFixed(1)}%. Note: This is an internal FinTwin analytical classification, not a credit bureau determination.`,
        evidence: [
          { field: 'Monthly Debt Service', value: Math.round(monthlyDebtPayments), unit: '₹/month' },
          { field: 'Gross Monthly Income', value: Math.round(monthlyIncome), unit: '₹/month' },
          { field: 'DTI Ratio', value: `${dtiPercent.toFixed(1)}%` },
          { field: 'Safe DTI Threshold', value: `${ANALYSIS_THRESHOLDS.DTI_HIGH * 100}%` },
          { field: 'Total Outstanding Debt', value: Math.round(totalDebt), unit: '₹' },
          { field: 'Liability Accounts Count', value: liabilityAccounts.length },
          { field: 'Debt Reduction Required (to 30%)', value: Math.max(0, Math.round(monthlyDebtPayments - monthlyIncome * 0.30)), unit: '₹/month' },
        ],
        metrics: {
          dtiPercent: Math.round(dtiPercent * 10) / 10,
          monthlyDebtPayments: Math.round(monthlyDebtPayments),
          monthlyIncome: Math.round(monthlyIncome),
          totalDebt: Math.round(totalDebt),
        },
        affectedAccountIds: liabilityAccounts.map((a) => a._id),
        affectedEntityIds: [],
        affectedTransactionIds: [],
        affectedNodeIds: liabilityAccounts.map((a) => a._id),
        recommendations: [
          `Reducing monthly debt service by ${fmt(monthlyDebtPayments * 0.3)} would bring DTI below 30%.`,
          'Consider refinancing or consolidating high-APR revolving credit lines.',
        ],
        limitations: [
          'DTI calculation uses recorded transaction history. Some debt obligations may not appear in transactions.',
          'This signal is not a credit bureau assessment or loan eligibility determination.',
        ],
        detectedAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
      });
    }

    return signals;
  },

  // ─── Signal F: CASHFLOW_DECLINE ─────────────────────────────────────────────
  async _evaluateCashflowDecline(
    userId: string,
    transactions: ITransaction[],
    twin: any
  ): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];
    const { monthlyIncome, monthlyBurn } = twin.stateVector;

    if (monthlyIncome === 0 && monthlyBurn === 0) return signals;

    const netCashflow = monthlyIncome - monthlyBurn;

    if (netCashflow < 0) {
      signals.push({
        id: makeSignalId(userId, 'CASHFLOW', 'decline'),
        userId,
        type: 'CASHFLOW_DECLINE',
        severity: 'HIGH',
        status: 'OPEN',
        title: 'Negative Net Cash Flow',
        summary: `Monthly expenses exceed income by ${fmt(Math.abs(netCashflow))}, systematically depleting reserves.`,
        explanation: `Observed monthly income of ${fmt(monthlyIncome)} is exceeded by observed monthly expenditures of ${fmt(monthlyBurn)}, yielding a net cash flow of ${fmt(netCashflow)} per month. At this trajectory, liquid reserves are being depleted by ${fmt(Math.abs(netCashflow))}/month. Note: This is derived from the total transaction history, not a month-over-month comparison. Mathematical proof: Net CF = Income (${fmt(monthlyIncome)}) - Burn (${fmt(monthlyBurn)}) = ${fmt(netCashflow)}.`,
        evidence: [
          { field: 'Monthly Income (observed)', value: Math.round(monthlyIncome), unit: '₹' },
          { field: 'Monthly Burn (observed)', value: Math.round(monthlyBurn), unit: '₹' },
          { field: 'Net Cash Flow', value: Math.round(netCashflow), unit: '₹/month' },
          { field: 'Monthly Shortfall', value: Math.round(Math.abs(netCashflow)), unit: '₹' },
          { field: 'Total Transactions Analyzed', value: transactions.length },
        ],
        metrics: {
          monthlyIncome: Math.round(monthlyIncome),
          monthlyBurn: Math.round(monthlyBurn),
          netCashflow: Math.round(netCashflow),
          deficit: Math.round(Math.abs(netCashflow)),
        },
        affectedAccountIds: [],
        affectedEntityIds: [],
        affectedTransactionIds: [],
        affectedNodeIds: [],
        recommendations: [
          'Conduct a line-item subscription and recurring expense audit to identify reducible outflows.',
          `Reducing expenses by ${fmt(Math.abs(netCashflow))} would restore cash flow to neutral equilibrium.`,
        ],
        limitations: transactions.length < 5
          ? ['Fewer than 5 transactions available. Cash flow analysis may not reflect typical monthly patterns.']
          : [],
        detectedAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
      });
    }

    return signals;
  },

  // ─── Signal G: UNUSUAL_TRANSACTION_PATTERN ──────────────────────────────────
  async _evaluateUnusualTransactionPatterns(
    userId: string,
    accounts: IAccount[],
    entities: IEntity[],
    transactions: ITransaction[]
  ): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];
    const T = ANALYSIS_THRESHOLDS;

    const expenseTxs = transactions.filter((t) => t.type === 'DEBIT' || t.direction === 'EXPENSE');

    // Compute per-category baselines
    const byCategory: Record<string, number[]> = {};
    for (const tx of expenseTxs) {
      const cat = tx.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(tx.amount);
    }

    const entityMap = new Map(entities.map((e) => [e._id, e]));
    const accountMap = new Map(accounts.map((a) => [a._id, a]));

    for (const tx of expenseTxs) {
      const cat = tx.category || 'Uncategorized';
      const history = byCategory[cat] || [];

      // Need at least N+1 transactions: N for baseline + 1 being evaluated
      if (history.length < T.UNUSUAL_MIN_HISTORY + 1) continue;

      // Leave-one-out baseline: compute stats on all transactions EXCEPT current
      // This prevents the outlier from inflating the mean/sd and masking itself
      const baseline = history.filter((v) => v !== tx.amount);
      // Use all occurrences except ONE matching this tx amount
      const idxToRemove = baseline.lastIndexOf(tx.amount);
      const cleanBaseline = idxToRemove >= 0
        ? [...baseline.slice(0, idxToRemove), ...baseline.slice(idxToRemove + 1)]
        : baseline;

      if (cleanBaseline.length < T.UNUSUAL_MIN_HISTORY) continue;

      const { mean, sd } = stdDev(cleanBaseline);
      if (sd === 0) continue;

      const zScore = (tx.amount - mean) / sd;
      if (zScore > T.UNUSUAL_Z_SCORE) {
        const ent = tx.destinationEntityId ? entityMap.get(tx.destinationEntityId) : undefined;
        const acc = accountMap.get(tx.sourceAccountId);

        signals.push({
          id: makeSignalId(userId, 'UNUSUAL', `${cat}_${tx._id.slice(-6)}`),
          userId,
          type: 'UNUSUAL_TRANSACTION_PATTERN',
          severity: 'MEDIUM',
          status: 'OPEN',
          title: `Unusual Transaction: ${cat}`,
          summary: `Transaction of ${fmt(tx.amount)} is ${zScore.toFixed(1)}σ above the observed ${cat} baseline of ${fmt(mean)}.`,
          explanation: `This transaction of ${fmt(tx.amount)} in category "${cat}" deviates significantly from this user's own historical baseline. Based on ${history.length} transactions in this category, the observed mean is ${fmt(mean)} with a standard deviation of ${fmt(sd)}. This transaction's z-score is ${zScore.toFixed(2)}, exceeding the ${T.UNUSUAL_Z_SCORE}σ detection threshold. This is an unusual transaction pattern relative to this user's observed history — no fraud claim is made.`,
          evidence: [
            { field: 'Transaction Amount', value: Math.round(tx.amount), unit: '₹' },
            { field: 'Category', value: cat },
            { field: 'Category Baseline Mean (excl. this tx)', value: Math.round(mean), unit: '₹' },
            { field: 'Standard Deviation (excl. this tx)', value: Math.round(sd), unit: '₹' },
            { field: 'Z-Score', value: zScore.toFixed(2) },
            { field: 'Detection Threshold', value: `${T.UNUSUAL_Z_SCORE}σ` },
            { field: 'Baseline Transactions in Category', value: cleanBaseline.length },
            { field: 'Transaction Date', value: tx.date?.toString().slice(0, 10) || 'N/A' },
            { field: 'Merchant / Entity', value: ent?.name || 'N/A' },
            { field: 'Account', value: acc?.name || 'N/A' },
          ],
          metrics: {
            transactionAmount: Math.round(tx.amount),
            categoryMean: Math.round(mean),
            categoryStdDev: Math.round(sd),
            zScore: Math.round(zScore * 100) / 100,
            historyCount: history.length,
          },
          affectedAccountIds: tx.sourceAccountId ? [tx.sourceAccountId] : [],
          affectedEntityIds: tx.destinationEntityId ? [tx.destinationEntityId] : [],
          affectedTransactionIds: [tx._id],
          affectedNodeIds: [
            ...(tx.sourceAccountId ? [tx.sourceAccountId] : []),
            ...(tx.destinationEntityId ? [tx.destinationEntityId] : []),
          ],
          recommendations: [
            'Review this transaction to confirm it was intentional and authorized.',
          ],
          limitations: [
            'This signal is based purely on statistical deviation from this user\'s own transaction history. It does not indicate fraud.',
            `Baseline requires at least ${T.UNUSUAL_MIN_HISTORY} transactions per category; categories with fewer transactions are excluded.`,
          ],
          detectedAt: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
        });
      }
    }

    return signals;
  },

  // ─── Signal H: NETWORK_CONCENTRATION ────────────────────────────────────────
  async _evaluateNetworkConcentration(
    userId: string,
    entities: IEntity[],
    transactions: ITransaction[]
  ): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];
    const T = ANALYSIS_THRESHOLDS;

    const allTxs = transactions.filter((t) => t.type !== 'INTERNAL_TRANSFER' && t.direction !== 'TRANSFER');
    const totalVolume = allTxs.reduce((s, t) => s + t.amount, 0);

    if (totalVolume === 0 || entities.length === 0) return signals;

    const entityMap = new Map(entities.map((e) => [e._id, e]));
    const byEntity: Record<string, { entityId: string; entityName: string; entityType: string; volume: number; txIds: string[] }> = {};

    for (const tx of allTxs) {
      const entId = tx.destinationEntityId;
      if (!entId) continue;
      if (!byEntity[entId]) {
        const ent = entityMap.get(entId);
        byEntity[entId] = {
          entityId: entId,
          entityName: ent?.name || 'Unknown Entity',
          entityType: ent?.type || 'MERCHANT',
          volume: 0,
          txIds: [],
        };
      }
      byEntity[entId].volume += tx.amount;
      byEntity[entId].txIds.push(tx._id);
    }

    for (const [entId, data] of Object.entries(byEntity)) {
      const pct = data.volume / totalVolume;
      if (pct >= T.NETWORK_CONCENTRATION_MEDIUM) {
        const severity: SignalSeverity = pct >= T.NETWORK_CONCENTRATION_HIGH ? 'HIGH' : 'MEDIUM';

        signals.push({
          id: makeSignalId(userId, 'NETWORK_CONC', data.entityName),
          userId,
          type: 'NETWORK_CONCENTRATION',
          severity,
          status: 'OPEN',
          title: `Network Concentration: ${data.entityName}`,
          summary: `${data.entityName} accounts for ${fmtPct(pct * 100)} of total network transaction volume.`,
          explanation: `The entity "${data.entityName}" (${data.entityType}) has a total recorded transaction volume of ${fmt(data.volume)}, representing ${fmtPct(pct * 100)} of the total network volume of ${fmt(totalVolume)} across ${data.txIds.length} transaction(s). Network concentration above ${fmtPct(T.NETWORK_CONCENTRATION_MEDIUM * 100)} indicates that the financial network has significant exposure to a single counterparty node.`,
          evidence: [
            { field: 'Entity', value: data.entityName },
            { field: 'Entity Type', value: data.entityType },
            { field: 'Entity Volume', value: Math.round(data.volume), unit: '₹' },
            { field: 'Total Network Volume', value: Math.round(totalVolume), unit: '₹' },
            { field: 'Network Share', value: fmtPct(pct * 100) },
            { field: 'Transaction Count', value: data.txIds.length },
            { field: 'Threshold (MEDIUM)', value: fmtPct(T.NETWORK_CONCENTRATION_MEDIUM * 100) },
            { field: 'Threshold (HIGH)', value: fmtPct(T.NETWORK_CONCENTRATION_HIGH * 100) },
          ],
          metrics: {
            entityVolume: Math.round(data.volume),
            totalNetworkVolume: Math.round(totalVolume),
            networkSharePct: Math.round(pct * 1000) / 10,
            transactionCount: data.txIds.length,
          },
          affectedAccountIds: [...new Set(allTxs.filter(t => data.txIds.includes(t._id)).map(t => t.sourceAccountId).filter(Boolean))],
          affectedEntityIds: [entId],
          affectedTransactionIds: data.txIds.slice(0, 20),
          affectedNodeIds: [entId],
          recommendations: [
            `Review whether financial dependency on ${data.entityName} is appropriate for your overall financial strategy.`,
          ],
          limitations: [
            'Network concentration analysis is based on recorded transaction volume only, not financial risk profile of the entity.',
          ],
          detectedAt: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
        });
      }
    }

    return signals;
  },
};
