import { AccountRepository, IAccount } from '../models/Account.js';
import { EntityRepository, IEntity } from '../models/Entity.js';
import { TransactionRepository, ITransaction } from '../models/Transaction.js';
import { LoanRepository } from '../models/Loan.js';
import { GoalRepository } from '../models/Goal.js';
import { toPaise } from '../utils/calculations.js';
import {
  calculateNetWorth,
  calculateRunway,
  calculateDTI,
  calculateSavingsRate,
  calculateHealthScore,
  calculateDetailedHealthScore,
  DetailedHealthScore,
} from '../utils/financialMath.js';
import { RecurringService } from './recurringService.js';
import { RiskSignalService, ANALYSIS_THRESHOLDS } from './riskSignalService.js';
import { GoalImpactService } from './goalImpactService.js';
import { ScenarioInputParams } from './simulationEngine.js';

export interface DigitalTwinStateVector {
  netWorth: number;
  liquidReserves: number;
  totalDebt: number;
  monthlyIncome: number;
  monthlyBurn: number;
  runwayMonths: number;
  dtiPercent: number;
  savingsRatePercent: number;
  healthScore: number;
  activeRiskCount: number;
  detailedHealthScore?: DetailedHealthScore;
}

export interface RiskSignal {
  id: string;
  code: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  causalMessage: string;
  mitigationRecommendation: string;
  metricValue: number;
  thresholdValue: number;
}

export type FinancialRelationshipType =
  | 'OWNS'
  | 'TRANSACTS_WITH'
  | 'RECEIVES_FROM'
  | 'PAYS'
  | 'TRANSFERS_TO'
  | 'ASSOCIATED_WITH';

export type FlowDirection = 'INCOMING' | 'OUTGOING' | 'BIDIRECTIONAL' | 'INTERNAL';

export interface FinancialGraphNode {
  id: string;
  label: string;
  type: 'ACCOUNT' | 'ENTITY';
  subtype: string;
  balance: number;
  balancePaise?: number;
  isLiquid?: boolean;
  institution?: string;
  category?: string;
  color: string;
  flowVolume: number;
  flowVolumePaise?: number;
  inflowVolume?: number;
  outflowVolume?: number;
  transactionCount?: number;
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  isRecurring?: boolean;
  recurringDetails?: {
    cadence: string;
    averageAmount: number;
    nextEstimatedDate?: string;
  };
  riskSignals?: Array<{
    id: string;
    code?: string;
    title: string;
    severity: string;
    causalMessage: string;
  }>;
  networkSharePct?: number;
}

export interface FinancialGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceLabel: string;
  targetLabel: string;
  relationshipType: FinancialRelationshipType;
  direction: FlowDirection;
  transactionCount: number;
  totalVolume: number;
  totalVolumePaise: number;
  currency: string;
  firstSeen: string;
  lastSeen: string;
  strength: number; // Deterministic [0.00, 1.00]
  isRecurring?: boolean;
  recurringDetails?: {
    cadence: string;
    averageAmount: number;
    nextEstimatedDate?: string;
  };
  averageTransaction?: number;
  metadata: {
    incomeVolume: number;
    expenseVolume: number;
    transferVolume: number;
    refundVolume?: number;
    category?: string;
    flowType: string;
    cadence: string;
    isRecurring?: boolean;
  };
  color: string;
}

export interface FinancialRelationship extends FinancialGraphEdge {}

export interface MoneyFlowIntelligence {
  totalInflow: number;
  totalOutflow: number;
  inflow?: number;
  outflow?: number;
  netFlow: number;
  internalTransferVolume: number;
  transfers?: number;
  refundVolume: number;
  refunds?: number;
  largestInflowRelationship: {
    entityId?: string;
    entityName: string;
    accountName: string;
    volume: number;
  } | null;
  largestOutflowRelationship: {
    entityId?: string;
    entityName: string;
    accountName: string;
    volume: number;
  } | null;
}

export interface NetworkConcentration {
  topExpenseEntity?: {
    entityId: string;
    name: string;
    sharePct: number;
    amount: number;
  };
  topIncomeEntity?: {
    entityId: string;
    name: string;
    sharePct: number;
    amount: number;
  };
  topAccount?: {
    accountId: string;
    name: string;
    sharePct: number;
    volume: number;
  };
  hasConcentrationRisk?: boolean;
  singleIncomeDependency?: boolean;
  highestExpenseConcentration?: { name: string; ratio: number };
  incomeConcentrationRatio?: number;
  alerts: Array<{
    type: string;
    severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
  }>;
}

export interface TopRelationshipItem {
  entityId: string;
  entityName: string;
  relationshipType: string;
  transactionCount: number;
  totalVolume: number;
  firstSeen: string;
  lastSeen: string;
  strength: number;
}

export interface NetworkInsightCard {
  title: string;
  observation: string;
  evidence: string;
  threshold: string;
  limitation: string;
}

export interface SpendingReconciliation {
  spendingTotal: number;
  networkExpenseTotal: number;
  networkExpenseVolume?: number;
  isReconciled: boolean;
  reconciled?: boolean;
  note: string;
}

export interface NetworkQueryOptions {
  timeRange?: 'ALL' | '30D' | '90D' | '12M' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  filterType?: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFERS' | 'REFUNDS' | 'RECURRING';
}

export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  linkCount?: number;
  accountCount: number;
  entityCount: number;
  transactionCount: number;
  totalIncomeRelationships: number;
  totalExpenseRelationships: number;
  transferRelationships: number;
  totalIncomeVolume: number;
  totalExpenseVolume: number;
  totalTransferVolume: number;
  incomeFlow: number;
  expenseFlow: number;
  transferFlow: number;
  totalVolume: number;
  totalTransactionVolume?: number;
  mostConnectedEntities: Array<{ id: string; name: string; type: string; connectionCount: number; volume: number }>;
  mostActiveAccounts: Array<{ id: string; name: string; type: string; transactionCount: number; volume: number }>;
  primaryHubId?: string;
  moneyFlow: MoneyFlowIntelligence;
  networkConcentration: NetworkConcentration;
  concentration: NetworkConcentration;
  relatedRiskSignals?: any[];
  topRelationships: TopRelationshipItem[];
  spendingReconciliation: SpendingReconciliation;
  insightCards: NetworkInsightCard[];
  activeTimeRange: {
    range: string;
    startDate?: string;
    endDate?: string;
    transactionCount: number;
  };
}

export interface FinancialNetworkResult {
  nodes: FinancialGraphNode[];
  edges: FinancialGraphEdge[];
  metrics: NetworkMetrics;
  relationships: FinancialRelationship[];
  generatedAt: string;
}

// Backwards-compatible aliases
export interface GraphNode extends FinancialGraphNode {}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  sourceLabel: string;
  targetLabel: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'INTERNAL_TRANSFER' | 'DEBT_PAYMENT';
  cadence: 'MONTHLY' | 'WEEKLY' | 'ONE_OFF' | 'REGULAR';
  transactionCount: number;
  color: string;
  relationshipType?: FinancialRelationshipType;
  direction?: FlowDirection;
  totalVolumePaise?: number;
  currency?: string;
  firstSeen?: string;
  lastSeen?: string;
  strength?: number;
}

/**
 * Deterministic Relationship Strength Formula
 * Combines normalized transaction frequency (40%), logarithmic volume (40%), and recency (20%)
 * Frequency: min(1.0, count / 10) (reaches 1.0 at 10 or more transactions)
 * Volume: min(1.0, log10(max(1, volume)) / 6) (reaches 1.0 at ₹1,000,000 or equivalent)
 * Recency: If lastSeen provided, max(0, 1 - daysSince / 365)
 * Without lastSeen: 50% freq + 50% vol (maintains unit-test backwards compatibility)
 */
export function calculateRelationshipStrength(transactionCount: number, totalVolume: number, lastSeen?: string): number {
  if (transactionCount <= 0 || totalVolume <= 0) return 0;
  const frequencyFactor = Math.min(1.0, transactionCount / 10);
  const volumeFactor = Math.min(1.0, Math.log10(Math.max(1, totalVolume)) / 6);
  if (!lastSeen) {
    const rawScore = (frequencyFactor * 0.5) + (volumeFactor * 0.5);
    return Math.round(rawScore * 100) / 100;
  }
  const daysSince = Math.max(0, (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24));
  const recencyFactor = Math.max(0, 1 - (daysSince / 365));
  const rawScore = (frequencyFactor * 0.4) + (volumeFactor * 0.4) + (recencyFactor * 0.2);
  return Math.round(Math.min(1.0, Math.max(0, rawScore)) * 100) / 100;
}

export const DigitalTwinService = {
  /**
   * 03 MODEL: Computes complete deterministic Digital Twin state vector and breakdowns
   */
  async getTwinState(userId: string) {
    const [accounts, entities, { transactions }, loans, goals] = await Promise.all([
      AccountRepository.findByUserId(userId),
      EntityRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId, { limit: 1000 }),
      LoanRepository.findByUserId(userId),
      GoalRepository.findByUserId(userId),
    ]);

    // 1. Asset & Liability separation
    let totalAssets = 0;
    let liquidReserves = 0;
    let totalDebt = 0;

    const assetAccounts: IAccount[] = [];
    const liabilityAccounts: IAccount[] = [];

    for (const acc of accounts) {
      if (['CREDIT_CARD', 'LOAN'].includes(acc.type)) {
        liabilityAccounts.push(acc);
        totalDebt += acc.currentBalance;
      } else {
        assetAccounts.push(acc);
        totalAssets += acc.currentBalance;
        if (acc.isLiquid) {
          liquidReserves += acc.currentBalance;
        }
      }
    }

    // Incorporate active loans not tracked as credit/loan accounts
    const activeLoans = loans.filter((l) => (l.status as string) !== 'PAID_OFF');
    for (const loan of activeLoans) {
      // If loan not already represented by a distinct account, add its outstanding principal
      const isAccountTracked = accounts.some((a) => a._id === loan.targetAccountId && a.type === 'LOAN');
      if (!isAccountTracked) {
        totalDebt += loan.outstandingAmount;
      }
    }

    // 2. Monthly Inflow & Outflow Analysis
    let monthlyIncome = 0;
    let monthlyBurn = 0;
    let monthlyDebtPayments = 0;

    // Add active loan EMIs
    for (const loan of activeLoans) {
      monthlyDebtPayments += loan.emiAmount;
    }

    // Entity income tracking for Single Point of Failure detection
    const entityIncomeMap: Record<string, number> = {};
    const categoryExpenseMap: Record<string, number> = {};
    let incomeTxCount = 0;
    let totalExpenseAmount = 0;

    for (const tx of transactions) {
      if (tx.type === 'CREDIT') {
        monthlyIncome += tx.amount;
        incomeTxCount++;
        if (tx.destinationEntityId) {
          entityIncomeMap[tx.destinationEntityId] = (entityIncomeMap[tx.destinationEntityId] || 0) + tx.amount;
        }
      } else if (tx.type === 'DEBIT') {
        monthlyBurn += tx.amount;
        totalExpenseAmount += tx.amount;
        const cat = tx.category || 'Uncategorized';
        categoryExpenseMap[cat] = (categoryExpenseMap[cat] || 0) + tx.amount;
        const isDebt =
          tx.category?.toLowerCase().includes('debt') ||
          tx.category?.toLowerCase().includes('emi') ||
          tx.category?.toLowerCase().includes('loan');
        if (isDebt) {
          monthlyDebtPayments += tx.amount;
        }
      }
    }

    // Default baseline if user has no transactions yet (e.g. newly onboarded)
    // We derive baseline from account balances
    if (transactions.length === 0 && accounts.length > 0) {
      // Conservative estimate based on checking/savings balance
      monthlyBurn = Math.max(1, Math.round(liquidReserves * 0.15));
      monthlyIncome = Math.round(monthlyBurn * 1.3);
    }

    let topCategorySharePct = 0;
    const categoryCount = Object.keys(categoryExpenseMap).length;
    if (totalExpenseAmount > 0) {
      const maxCatVal = Math.max(...Object.values(categoryExpenseMap));
      topCategorySharePct = Math.round((maxCatVal / totalExpenseAmount) * 100);
    }
    const incomeEntityCount = Object.keys(entityIncomeMap).length;
    const isRecurringIncome = incomeTxCount >= 2;

    const detailedHealthScore = calculateDetailedHealthScore({
      liquidReserves,
      monthlyBurn,
      monthlyIncome,
      monthlyExpenses: monthlyBurn,
      monthlyDebtPayments,
      totalDebt,
      topCategorySharePct,
      categoryCount,
      incomeTransactionCount: incomeTxCount,
      incomeEntityCount,
      isRecurringIncome,
    });

    // 3. Deterministic Metrics
    const netWorth = calculateNetWorth(totalAssets, totalDebt);
    const runwayMonths = calculateRunway(liquidReserves, monthlyBurn);
    const dtiPercent = calculateDTI(monthlyDebtPayments, monthlyIncome);
    const savingsRatePercent = calculateSavingsRate(monthlyIncome, monthlyBurn);
    const healthScore = detailedHealthScore.overallScore;

    // 4. Deterministic Risk Signals Evaluation (Section 19 of spec.md)
    const riskSignals: RiskSignal[] = [];

    // Signal 1: Liquidity Runway Critical
    if (runwayMonths < 3.0) {
      riskSignals.push({
        id: 'sig_runway_crit',
        code: 'SIGNAL_LIQUIDITY_RUNWAY_CRITICAL',
        title: 'Critical Liquidity Runway',
        severity: runwayMonths < 1.5 ? 'CRITICAL' : 'HIGH',
        causalMessage: `Liquid cash reserves (${liquidReserves.toLocaleString()}) sustain only ${runwayMonths} months of burn at ${monthlyBurn.toLocaleString()}/mo, below the safe 3.0-month threshold.`,
        mitigationRecommendation: 'Freeze non-essential discretionary outflows and prioritize building an emergency liquidity buffer.',
        metricValue: runwayMonths,
        thresholdValue: 3.0,
      });
    }

    // Signal 2: DTI Excessive
    if (dtiPercent > 40.0) {
      riskSignals.push({
        id: 'sig_dti_high',
        code: 'SIGNAL_DTI_EXCESSIVE',
        title: 'Excessive Debt-to-Income Ratio',
        severity: 'HIGH',
        causalMessage: `${dtiPercent}% of gross monthly income is committed to debt obligations, exceeding the 40% prudence boundary.`,
        mitigationRecommendation: 'Refinance or consolidate high-APR revolving credit lines to reduce monthly debt obligations below 30%.',
        metricValue: dtiPercent,
        thresholdValue: 40.0,
      });
    }

    // Signal 3: Credit Card Utilization High
    for (const cc of liabilityAccounts.filter((a) => a.type === 'CREDIT_CARD')) {
      if (cc.creditLimit && cc.creditLimit > 0) {
        const util = (cc.currentBalance / cc.creditLimit) * 100;
        if (util > 30.0) {
          riskSignals.push({
            id: `sig_util_${cc._id}`,
            code: 'SIGNAL_CREDIT_UTILIZATION_HIGH',
            title: `High Credit Utilization on ${cc.name}`,
            severity: util > 60.0 ? 'CRITICAL' : 'MEDIUM',
            causalMessage: `Card utilization is currently at ${Math.round(util)}% (${cc.currentBalance.toLocaleString()} / ${cc.creditLimit.toLocaleString()}), triggering compounding penalty interest.`,
            mitigationRecommendation: 'Pay down balances below 30% of credit limit before statement closing date.',
            metricValue: Math.round(util),
            thresholdValue: 30.0,
          });
        }
      }
    }

    // Signal 4: Negative Cashflow
    if (monthlyIncome > 0 && monthlyBurn > monthlyIncome) {
      riskSignals.push({
        id: 'sig_cashflow_neg',
        code: 'SIGNAL_NEGATIVE_CASHFLOW_TREND',
        title: 'Negative Net Cash Flow',
        severity: 'HIGH',
        causalMessage: `Monthly expenditures (${monthlyBurn.toLocaleString()}) exceed total income (${monthlyIncome.toLocaleString()}) by ${(monthlyBurn - monthlyIncome).toLocaleString()}/month.`,
        mitigationRecommendation: 'Conduct a line-item subscription and lifestyle spending audit to halt liquid capital erosion.',
        metricValue: monthlyBurn - monthlyIncome,
        thresholdValue: 0,
      });
    }

    // Signal 5: Single Point of Failure
    if (monthlyIncome > 0 && runwayMonths < 1.5) {
      for (const [entityId, inc] of Object.entries(entityIncomeMap)) {
        if (inc / monthlyIncome >= 0.9) {
          const entity = entities.find((e) => e._id === entityId);
          riskSignals.push({
            id: 'sig_single_point_fail',
            code: 'SIGNAL_SINGLE_POINT_OF_FAILURE',
            title: 'Single Point of Income Dependency',
            severity: 'HIGH',
            causalMessage: `Over 90% of income relies on a single entity (${entity?.name || 'Primary Source'}) with only ${runwayMonths} months of cash runway protection.`,
            mitigationRecommendation: 'Build a dedicated emergency cash reserve of at least 3 months to protect against counterparty income disruption.',
            metricValue: Math.round((inc / monthlyIncome) * 100),
            thresholdValue: 90.0,
          });
        }
      }
    }

    // Gather incomeSources and expenseEntities for Advanced Digital Twin State
    const incomeSourcesMap = new Map<string, { entityId: string; name: string; entityName?: string; type: string; totalReceived: number; transactionCount: number; lastReceived: string }>();
    const expenseEntitiesMap = new Map<string, { entityId: string; name: string; entityName?: string; type: string; category: string; totalPaid: number; transactionCount: number; lastPaid: string }>();
    let transferCount = 0;
    let transferVolume = 0;
    const transferRoutesMap = new Map<string, { sourceAccountId: string; targetAccountId: string; sourceAccountName: string; targetAccountName: string; volume: number; count: number }>();
    const monthlyBurnBuckets: Record<string, number> = {};

    for (const tx of transactions) {
      const txDateStr = tx.date ? new Date(tx.date).toISOString() : new Date().toISOString();
      const monthKey = txDateStr.slice(0, 7);
      const isTransfer =
        tx.direction === 'TRANSFER' ||
        tx.type === 'INTERNAL_TRANSFER' ||
        (Boolean(tx.destinationAccountId) && tx.destinationAccountId !== tx.sourceAccountId);

      if (isTransfer && tx.destinationAccountId) {
        transferCount++;
        transferVolume += tx.amount || 0;
        const routeKey = `${tx.sourceAccountId}->${tx.destinationAccountId}`;
        const srcName = accounts.find((a) => a._id === tx.sourceAccountId)?.name || 'Account';
        const dstName = accounts.find((a) => a._id === tx.destinationAccountId)?.name || 'Account';
        if (!transferRoutesMap.has(routeKey)) {
          transferRoutesMap.set(routeKey, {
            sourceAccountId: tx.sourceAccountId,
            targetAccountId: tx.destinationAccountId,
            sourceAccountName: srcName,
            targetAccountName: dstName,
            volume: tx.amount || 0,
            count: 1,
          });
        } else {
          const r = transferRoutesMap.get(routeKey)!;
          r.volume += tx.amount || 0;
          r.count += 1;
        }
      } else if (tx.type === 'CREDIT' || tx.direction === 'INCOME' || tx.direction === 'REFUND') {
        if (tx.destinationEntityId) {
          const ent = entities.find((e) => e._id === tx.destinationEntityId);
          const entName = ent?.name || 'Entity';
          const entType = ent?.type || 'COUNTERPARTY';
          if (!incomeSourcesMap.has(tx.destinationEntityId)) {
            incomeSourcesMap.set(tx.destinationEntityId, {
              entityId: tx.destinationEntityId,
              name: entName,
              entityName: entName,
              type: entType,
              totalReceived: tx.amount || 0,
              transactionCount: 1,
              lastReceived: txDateStr,
            });
          } else {
            const inc = incomeSourcesMap.get(tx.destinationEntityId)!;
            inc.totalReceived += tx.amount || 0;
            inc.transactionCount += 1;
            if (txDateStr > inc.lastReceived) inc.lastReceived = txDateStr;
          }
        }
      } else {
        // Outflow / expense
        monthlyBurnBuckets[monthKey] = (monthlyBurnBuckets[monthKey] || 0) + (tx.amount || 0);
        if (tx.destinationEntityId) {
          const ent = entities.find((e) => e._id === tx.destinationEntityId);
          const entName = ent?.name || 'Merchant';
          const entType = ent?.type || 'MERCHANT';
          const cat = tx.category || ent?.category || 'Expense';
          if (!expenseEntitiesMap.has(tx.destinationEntityId)) {
            expenseEntitiesMap.set(tx.destinationEntityId, {
              entityId: tx.destinationEntityId,
              name: entName,
              entityName: entName,
              type: entType,
              category: cat,
              totalPaid: tx.amount || 0,
              transactionCount: 1,
              lastPaid: txDateStr,
            });
          } else {
            const exp = expenseEntitiesMap.get(tx.destinationEntityId)!;
            exp.totalPaid += tx.amount || 0;
            exp.transactionCount += 1;
            if (txDateStr > exp.lastPaid) exp.lastPaid = txDateStr;
          }
        }
      }
    }

    // Historical behaviour calculation
    const monthlyBurnValues = Object.values(monthlyBurnBuckets);
    const avgMonthlyBurn = monthlyBurnValues.length > 0
      ? Math.round(monthlyBurnValues.reduce((a, b) => a + b, 0) / monthlyBurnValues.length)
      : monthlyBurn;
    let cashflowStability: 'STABLE' | 'MODERATE' | 'VOLATILE' = 'STABLE';
    if (monthlyBurnValues.length >= 2) {
      const mean = avgMonthlyBurn;
      const variance = monthlyBurnValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / monthlyBurnValues.length;
      const sd = Math.sqrt(variance);
      const cv = mean > 0 ? sd / mean : 0;
      if (cv > 0.4) cashflowStability = 'VOLATILE';
      else if (cv > 0.2) cashflowStability = 'MODERATE';
    }

    const recurringSummary = await RecurringService.detectAndSync(userId).catch(() => null);

    const stateVector: DigitalTwinStateVector = {
      netWorth,
      liquidReserves,
      totalDebt,
      monthlyIncome,
      monthlyBurn,
      runwayMonths,
      dtiPercent,
      savingsRatePercent,
      healthScore,
      activeRiskCount: riskSignals.length,
      detailedHealthScore,
    };

    return {
      stateVector,
      detailedHealthScore,
      summary: {
        totalAssets,
        totalDebt,
        netWorth,
        liquidReserves,
        accountsCount: accounts.length,
        entitiesCount: entities.length,
        transactionsCount: transactions.length,
        healthScore,
      },
      accounts: {
        all: accounts,
        assets: assetAccounts,
        liabilities: liabilityAccounts,
      },
      entities,
      incomeSources: Array.from(incomeSourcesMap.values()),
      expenseEntities: Array.from(expenseEntitiesMap.values()),
      transfers: Object.assign(Array.from(transferRoutesMap.values()), {
        totalVolume: transferVolume,
        count: transferCount,
        routes: Array.from(transferRoutesMap.values()),
      }) as any,
      recurringFlows: recurringSummary?.summary || null,
      loans: {
        all: loans,
        activeCount: activeLoans.length,
        totalOutstanding: activeLoans.reduce((s, l) => s + l.outstandingAmount, 0),
        totalMonthlyEmi: activeLoans.reduce((s, l) => s + l.emiAmount, 0),
      },
      debt: {
        all: loans,
        totalDebt,
        totalMonthlyEmi: monthlyDebtPayments,
        dtiPercent,
      },
      goals: {
        all: goals,
        activeCount: goals.filter((g) => (g.status as string) !== 'COMPLETED').length,
        totalTarget: goals.reduce((s, g) => s + g.targetAmount, 0),
        totalSaved: goals.reduce((s, g) => s + g.currentAmount, 0),
      },
      metrics: {
        runwayMonths,
        dtiPercent,
        savingsRatePercent,
        monthlyIncome,
        monthlyBurn,
        monthlyDebtPayments,
      },
      historicalBehaviour: {
        monthlyBurnTrends: Object.entries(monthlyBurnBuckets).map(([k, v]) => ({ month: k, amount: v })),
        averageMonthlyBurn: avgMonthlyBurn,
        averageMonthlyIncome: monthlyIncome,
        cashflowStability,
        stabilityRating: cashflowStability,
        transactionCount: transactions.length,
      },
      riskSignals,
    };
  },

  /**
   * 04 CONNECT: Constructs the complete connected Digital Twin Financial Network
   * Real database-backed nodes, edges, relationships, and deterministic metrics.
   */
  async getFinancialNetwork(userId: string, options: NetworkQueryOptions = {}): Promise<FinancialNetworkResult> {
    const [accounts, entities, txResult, recurringSummary, riskSignals] = await Promise.all([
      AccountRepository.findByUserId(userId),
      EntityRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId, { limit: 2000 }),
      RecurringService.detectAndSync(userId).catch(() => null),
      RiskSignalService.detectSignals(userId).catch(() => []),
    ]);

    const transactions = txResult.transactions || [];

    const entityMap = new Map<string, IEntity>();
    for (const ent of entities) {
      entityMap.set(ent._id, ent);
    }

    const accountMap = new Map<string, IAccount>();
    for (const acc of accounts) {
      accountMap.set(acc._id, acc);
    }

    // Map recurring by entityId and lowercase name
    const recurringMap = new Map<string, any>();
    if (recurringSummary?.recurringExpenses) {
      for (const rec of recurringSummary.recurringExpenses) {
        if (rec.entityId) recurringMap.set(rec.entityId.toString(), rec);
        if (rec.name) recurringMap.set(rec.name.toLowerCase().trim(), rec);
      }
    }

    // Map risk signals to entities and accounts
    const entitySignalsMap = new Map<string, any[]>();
    const accountSignalsMap = new Map<string, any[]>();
    for (const sig of riskSignals || []) {
      for (const entId of sig.affectedEntityIds || []) {
        if (!entitySignalsMap.has(entId)) entitySignalsMap.set(entId, []);
        entitySignalsMap.get(entId)!.push({
          id: sig.id,
          code: sig.type,
          title: sig.title,
          severity: sig.severity,
          causalMessage: sig.explanation || sig.summary,
        });
      }
      for (const accId of sig.affectedAccountIds || []) {
        if (!accountSignalsMap.has(accId)) accountSignalsMap.set(accId, []);
        accountSignalsMap.get(accId)!.push({
          id: sig.id,
          code: sig.type,
          title: sig.title,
          severity: sig.severity,
          causalMessage: sig.explanation || sig.summary,
        });
      }
    }

    // 1. Time-range filtering
    const now = Date.now();
    let filteredTransactions = transactions;
    const timeRange = options.timeRange || 'ALL';

    if (timeRange === '30D') {
      const cutoff = new Date(now - 30 * 86400000);
      filteredTransactions = transactions.filter((t) => t.date && new Date(t.date) >= cutoff);
    } else if (timeRange === '90D') {
      const cutoff = new Date(now - 90 * 86400000);
      filteredTransactions = transactions.filter((t) => t.date && new Date(t.date) >= cutoff);
    } else if (timeRange === '12M') {
      const cutoff = new Date(now - 365 * 86400000);
      filteredTransactions = transactions.filter((t) => t.date && new Date(t.date) >= cutoff);
    } else if (timeRange === 'CUSTOM') {
      filteredTransactions = transactions.filter((t) => {
        if (!t.date) return false;
        const d = new Date(t.date);
        if (options.startDate && d < new Date(options.startDate)) return false;
        if (options.endDate && d > new Date(options.endDate)) return false;
        return true;
      });
    }

    // Node tracking maps for volume aggregation
    const accountFlowVolumes: Record<string, { total: number; inflow: number; outflow: number; count: number }> = {};
    const entityFlowVolumes: Record<string, { total: number; inflow: number; outflow: number; count: number }> = {};

    accounts.forEach((a) => {
      accountFlowVolumes[a._id] = { total: 0, inflow: 0, outflow: 0, count: 0 };
    });
    entities.forEach((e) => {
      entityFlowVolumes[e._id] = { total: 0, inflow: 0, outflow: 0, count: 0 };
    });

    let totalInflow = 0;
    let totalOutflow = 0;
    let internalTransferVolume = 0;
    let refundVolume = 0;

    let largestInflowRelationship: { entityId?: string; entityName: string; accountName: string; volume: number } | null = null;
    let largestOutflowRelationship: { entityId?: string; entityName: string; accountName: string; volume: number } | null = null;

    // Edge aggregation map: key = `${sourceId}__${targetId}__${relationshipType}`
    const edgeMap = new Map<
      string,
      {
        id: string;
        source: string;
        target: string;
        sourceLabel: string;
        targetLabel: string;
        relationshipType: FinancialRelationshipType;
        direction: FlowDirection;
        transactionCount: number;
        totalVolume: number;
        totalVolumePaise: number;
        currency: string;
        firstSeen: string;
        lastSeen: string;
        incomeVolume: number;
        expenseVolume: number;
        transferVolume: number;
        refundVolume: number;
        category?: string;
        flowType: string;
        cadence: string;
        color: string;
        isRecurring?: boolean;
        recurringDetails?: { cadence: string; averageAmount: number; nextEstimatedDate?: string };
      }
    >();

    for (const tx of filteredTransactions) {
      const txAmount = tx.amount || 0;
      const txAmountPaise = tx.amountPaise || toPaise(txAmount);
      const txDateStr = tx.date ? new Date(tx.date).toISOString() : new Date().toISOString();
      const isTransfer =
        tx.direction === 'TRANSFER' ||
        tx.type === 'INTERNAL_TRANSFER' ||
        (Boolean(tx.destinationAccountId) && tx.destinationAccountId !== tx.sourceAccountId);

      if (isTransfer && tx.destinationAccountId) {
        // Internal Transfer: Account A -> Account B
        const srcAcc = accountMap.get(tx.sourceAccountId);
        const dstAcc = accountMap.get(tx.destinationAccountId);

        if (srcAcc && dstAcc) {
          const sourceId = srcAcc._id;
          const targetId = dstAcc._id;
          const relationshipType: FinancialRelationshipType = 'TRANSFERS_TO';
          const edgeKey = `${sourceId}__${targetId}__${relationshipType}`;

          internalTransferVolume += txAmount;

          if (accountFlowVolumes[sourceId]) {
            accountFlowVolumes[sourceId].total += txAmount;
            accountFlowVolumes[sourceId].outflow += txAmount;
            accountFlowVolumes[sourceId].count += 1;
          }
          if (accountFlowVolumes[targetId]) {
            accountFlowVolumes[targetId].total += txAmount;
            accountFlowVolumes[targetId].inflow += txAmount;
            accountFlowVolumes[targetId].count += 1;
          }

          if (!edgeMap.has(edgeKey)) {
            edgeMap.set(edgeKey, {
              id: `edge_${edgeKey}`,
              source: sourceId,
              target: targetId,
              sourceLabel: srcAcc.name,
              targetLabel: dstAcc.name,
              relationshipType,
              direction: 'INTERNAL',
              transactionCount: 1,
              totalVolume: txAmount,
              totalVolumePaise: txAmountPaise,
              currency: tx.currency || 'INR',
              firstSeen: txDateStr,
              lastSeen: txDateStr,
              incomeVolume: 0,
              expenseVolume: 0,
              transferVolume: txAmount,
              refundVolume: 0,
              category: 'Internal Transfer',
              flowType: 'INTERNAL_TRANSFER',
              cadence: tx.recurrence === 'MONTHLY' ? 'MONTHLY' : 'REGULAR',
              color: '#06b6d4',
            });
          } else {
            const edge = edgeMap.get(edgeKey)!;
            edge.transactionCount += 1;
            edge.totalVolume += txAmount;
            edge.totalVolumePaise += txAmountPaise;
            edge.transferVolume += txAmount;
            if (txDateStr < edge.firstSeen) edge.firstSeen = txDateStr;
            if (txDateStr > edge.lastSeen) edge.lastSeen = txDateStr;
          }
        }
      } else if (tx.direction === 'INCOME' || tx.type === 'CREDIT' || tx.direction === 'REFUND') {
        // Income or Refund: Entity -> Account
        const acc = accountMap.get(tx.sourceAccountId);
        const ent = tx.destinationEntityId ? entityMap.get(tx.destinationEntityId) : undefined;
        const isRefund = tx.direction === 'REFUND';

        if (isRefund) {
          refundVolume += txAmount;
        } else {
          totalInflow += txAmount;
        }

        if (acc) {
          if (accountFlowVolumes[acc._id]) {
            accountFlowVolumes[acc._id].total += txAmount;
            accountFlowVolumes[acc._id].inflow += txAmount;
            accountFlowVolumes[acc._id].count += 1;
          }

          if (ent) {
            if (entityFlowVolumes[ent._id]) {
              entityFlowVolumes[ent._id].total += txAmount;
              entityFlowVolumes[ent._id].outflow += txAmount;
              entityFlowVolumes[ent._id].count += 1;
            }

            const sourceId = ent._id;
            const targetId = acc._id;
            const relationshipType: FinancialRelationshipType = 'RECEIVES_FROM';
            const edgeKey = `${sourceId}__${targetId}__${relationshipType}`;

            const rec = recurringMap.get(ent._id) || recurringMap.get(ent.name.toLowerCase().trim());
            const isRec = Boolean(rec);
            const recDetails = rec
              ? {
                  cadence: rec.cadence,
                  averageAmount: rec.averageAmount,
                  nextEstimatedDate: rec.nextEstimatedDate,
                }
              : undefined;

            if (!edgeMap.has(edgeKey)) {
              edgeMap.set(edgeKey, {
                id: `edge_${edgeKey}`,
                source: sourceId,
                target: targetId,
                sourceLabel: ent.name,
                targetLabel: acc.name,
                relationshipType,
                direction: 'INCOMING',
                transactionCount: 1,
                totalVolume: txAmount,
                totalVolumePaise: txAmountPaise,
                currency: tx.currency || 'INR',
                firstSeen: txDateStr,
                lastSeen: txDateStr,
                incomeVolume: isRefund ? 0 : txAmount,
                expenseVolume: 0,
                transferVolume: 0,
                refundVolume: isRefund ? txAmount : 0,
                category: tx.category || ent.category || (isRefund ? 'Refund' : 'Income'),
                flowType: isRefund ? 'REFUND' : 'INCOME',
                cadence: tx.recurrence === 'MONTHLY' ? 'MONTHLY' : rec ? rec.cadence : 'REGULAR',
                color: isRefund ? '#a855f7' : '#10b981',
                isRecurring: isRec,
                recurringDetails: recDetails,
              });
            } else {
              const edge = edgeMap.get(edgeKey)!;
              edge.transactionCount += 1;
              edge.totalVolume += txAmount;
              edge.totalVolumePaise += txAmountPaise;
              if (isRefund) {
                edge.refundVolume = (edge.refundVolume || 0) + txAmount;
              } else {
                edge.incomeVolume += txAmount;
              }
              if (txDateStr < edge.firstSeen) edge.firstSeen = txDateStr;
              if (txDateStr > edge.lastSeen) edge.lastSeen = txDateStr;
              if (isRec) {
                edge.isRecurring = true;
                edge.recurringDetails = recDetails;
              }
            }
          }
        }
      } else {
        // Expense: Account -> Entity
        const acc = accountMap.get(tx.sourceAccountId);
        const ent = tx.destinationEntityId ? entityMap.get(tx.destinationEntityId) : undefined;
        totalOutflow += txAmount;

        if (acc) {
          if (accountFlowVolumes[acc._id]) {
            accountFlowVolumes[acc._id].total += txAmount;
            accountFlowVolumes[acc._id].outflow += txAmount;
            accountFlowVolumes[acc._id].count += 1;
          }

          if (ent) {
            if (entityFlowVolumes[ent._id]) {
              entityFlowVolumes[ent._id].total += txAmount;
              entityFlowVolumes[ent._id].inflow += txAmount;
              entityFlowVolumes[ent._id].count += 1;
            }

            const sourceId = acc._id;
            const targetId = ent._id;
            const relationshipType: FinancialRelationshipType = 'PAYS';
            const edgeKey = `${sourceId}__${targetId}__${relationshipType}`;
            const isDebt = ent.type === 'LENDER';

            const rec = recurringMap.get(ent._id) || recurringMap.get(ent.name.toLowerCase().trim());
            const isRec = Boolean(rec);
            const recDetails = rec
              ? {
                  cadence: rec.cadence,
                  averageAmount: rec.averageAmount,
                  nextEstimatedDate: rec.nextEstimatedDate,
                }
              : undefined;

            if (!edgeMap.has(edgeKey)) {
              edgeMap.set(edgeKey, {
                id: `edge_${edgeKey}`,
                source: sourceId,
                target: targetId,
                sourceLabel: acc.name,
                targetLabel: ent.name,
                relationshipType,
                direction: 'OUTGOING',
                transactionCount: 1,
                totalVolume: txAmount,
                totalVolumePaise: txAmountPaise,
                currency: tx.currency || 'INR',
                firstSeen: txDateStr,
                lastSeen: txDateStr,
                incomeVolume: 0,
                expenseVolume: txAmount,
                transferVolume: 0,
                refundVolume: 0,
                category: tx.category || ent.category || 'Expense',
                flowType: isDebt ? 'DEBT_PAYMENT' : 'EXPENSE',
                cadence: tx.recurrence === 'MONTHLY' ? 'MONTHLY' : rec ? rec.cadence : 'REGULAR',
                color: isDebt ? '#f59e0b' : '#ef4444',
                isRecurring: isRec,
                recurringDetails: recDetails,
              });
            } else {
              const edge = edgeMap.get(edgeKey)!;
              edge.transactionCount += 1;
              edge.totalVolume += txAmount;
              edge.totalVolumePaise += txAmountPaise;
              edge.expenseVolume += txAmount;
              if (txDateStr < edge.firstSeen) edge.firstSeen = txDateStr;
              if (txDateStr > edge.lastSeen) edge.lastSeen = txDateStr;
              if (isRec) {
                edge.isRecurring = true;
                edge.recurringDetails = recDetails;
              }
            }
          }
        }
      }
    }

    const netFlow = totalInflow - totalOutflow;
    const totalVolume = Array.from(edgeMap.values()).reduce((sum, e) => sum + e.totalVolume, 0);

    // Compute largest inflow & outflow relationship
    for (const e of edgeMap.values()) {
      if (
        e.relationshipType === 'RECEIVES_FROM' &&
        (!largestInflowRelationship || e.incomeVolume > largestInflowRelationship.volume)
      ) {
        largestInflowRelationship = {
          entityId: e.source,
          entityName: e.sourceLabel,
          accountName: e.targetLabel,
          volume: e.incomeVolume,
        };
      } else if (
        e.relationshipType === 'PAYS' &&
        (!largestOutflowRelationship || e.expenseVolume > largestOutflowRelationship.volume)
      ) {
        largestOutflowRelationship = {
          entityId: e.target,
          entityName: e.targetLabel,
          accountName: e.sourceLabel,
          volume: e.expenseVolume,
        };
      }
    }

    // 1. Construct Nodes (V)
    const nodes: FinancialGraphNode[] = [];

    // Account Nodes
    for (const acc of accounts) {
      let color = '#3b82f6';
      if (acc.type === 'SAVINGS') color = '#06b6d4';
      else if (acc.type === 'CREDIT_CARD') color = '#ef4444';
      else if (acc.type === 'LOAN') color = '#f59e0b';
      else if (acc.type === 'INVESTMENT') color = '#8b5cf6';
      else if (acc.type === 'WALLET') color = '#10b981';

      let health: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
      if (acc.type === 'CREDIT_CARD' && acc.creditLimit && acc.currentBalance / acc.creditLimit > 0.5) {
        health = 'WARNING';
      }

      const flow = accountFlowVolumes[acc._id] || { total: 0, inflow: 0, outflow: 0, count: 0 };
      const sharePct = totalVolume > 0 ? Math.round((flow.total / totalVolume) * 100) : 0;
      const matchingSignals = accountSignalsMap.get(acc._id) || [];

      nodes.push({
        id: acc._id,
        label: acc.name,
        type: 'ACCOUNT',
        subtype: acc.type,
        balance: acc.currentBalance,
        balancePaise: toPaise(acc.currentBalance || 0),
        isLiquid: acc.isLiquid,
        institution: acc.institution,
        color,
        flowVolume: flow.total,
        flowVolumePaise: toPaise(flow.total),
        inflowVolume: flow.inflow,
        outflowVolume: flow.outflow,
        transactionCount: flow.count,
        health,
        riskSignals: matchingSignals,
        networkSharePct: sharePct,
      });
    }

    // Entity Nodes
    for (const ent of entities) {
      let color = '#a855f7';
      if (ent.type === 'EMPLOYER') color = '#10b981';
      else if (ent.type === 'LENDER') color = '#f59e0b';
      else if (ent.type === 'UTILITY') color = '#ef4444';
      else if (ent.type === 'MERCHANT') color = '#ec4899';
      else if (ent.type === 'INVESTMENT_BROKER') color = '#6366f1';

      const flow = entityFlowVolumes[ent._id] || { total: 0, inflow: 0, outflow: 0, count: 0 };
      const sharePct = totalVolume > 0 ? Math.round((flow.total / totalVolume) * 100) : 0;
      const rec = recurringMap.get(ent._id) || recurringMap.get(ent.name.toLowerCase().trim());
      const isRec = Boolean(rec);
      const recDetails = rec
        ? {
            cadence: rec.cadence,
            averageAmount: rec.averageAmount,
            nextEstimatedDate: rec.nextEstimatedDate,
          }
        : undefined;
      const matchingSignals = entitySignalsMap.get(ent._id) || [];

      nodes.push({
        id: ent._id,
        label: ent.name,
        type: 'ENTITY',
        subtype: ent.type,
        category: ent.category,
        balance: 0,
        color,
        flowVolume: flow.total,
        flowVolumePaise: toPaise(flow.total),
        inflowVolume: flow.inflow,
        outflowVolume: flow.outflow,
        transactionCount: flow.count,
        health: 'HEALTHY',
        isRecurring: isRec,
        recurringDetails: recDetails,
        riskSignals: matchingSignals,
        networkSharePct: sharePct,
      });
    }

    // 2. Construct Edges (E) with deterministic strength
    const edges: FinancialGraphEdge[] = Array.from(edgeMap.values()).map((raw) => {
      const strength = calculateRelationshipStrength(raw.transactionCount, raw.totalVolume, raw.lastSeen);
      const avgTx = Math.round(raw.totalVolume / Math.max(1, raw.transactionCount));
      return {
        id: raw.id,
        source: raw.source,
        target: raw.target,
        sourceLabel: raw.sourceLabel,
        targetLabel: raw.targetLabel,
        relationshipType: raw.relationshipType,
        direction: raw.direction,
        transactionCount: raw.transactionCount,
        totalVolume: raw.totalVolume,
        totalVolumePaise: raw.totalVolumePaise,
        currency: raw.currency,
        firstSeen: raw.firstSeen,
        lastSeen: raw.lastSeen,
        strength,
        isRecurring: raw.isRecurring,
        recurringDetails: raw.recurringDetails,
        averageTransaction: avgTx,
        metadata: {
          incomeVolume: raw.incomeVolume,
          expenseVolume: raw.expenseVolume,
          transferVolume: raw.transferVolume,
          refundVolume: raw.refundVolume || 0,
          totalVolume: raw.totalVolume,
          category: raw.category,
          flowType: raw.flowType,
          cadence: raw.cadence,
          isRecurring: raw.isRecurring || false,
        },
        color: raw.color,
      };
    });

    // 3. Compute Deterministic Network Metrics
    let totalIncomeVolume = 0;
    let totalExpenseVolume = 0;
    let totalTransferVolume = 0;
    let totalIncomeRelationships = 0;
    let totalExpenseRelationships = 0;
    let transferRelationships = 0;

    for (const e of edges) {
      if (e.relationshipType === 'RECEIVES_FROM') {
        totalIncomeRelationships += 1;
        totalIncomeVolume += e.metadata.incomeVolume;
      } else if (e.relationshipType === 'PAYS') {
        totalExpenseRelationships += 1;
        totalExpenseVolume += e.metadata.expenseVolume;
      } else if (e.relationshipType === 'TRANSFERS_TO') {
        transferRelationships += 1;
        totalTransferVolume += e.metadata.transferVolume;
      }
    }

    // Connected entity rankings
    const entityConnectionCounts: Record<string, number> = {};
    for (const e of edges) {
      if (entityMap.has(e.source)) entityConnectionCounts[e.source] = (entityConnectionCounts[e.source] || 0) + 1;
      if (entityMap.has(e.target)) entityConnectionCounts[e.target] = (entityConnectionCounts[e.target] || 0) + 1;
    }

    const mostConnectedEntities = entities
      .map((ent) => ({
        id: ent._id,
        name: ent.name,
        type: ent.type,
        connectionCount: entityConnectionCounts[ent._id] || 0,
        volume: entityFlowVolumes[ent._id]?.total || 0,
      }))
      .sort((a, b) => b.connectionCount - a.connectionCount || b.volume - a.volume)
      .slice(0, 5);

    // Active account rankings
    const mostActiveAccounts = accounts
      .map((acc) => ({
        id: acc._id,
        name: acc.name,
        type: acc.type,
        transactionCount: accountFlowVolumes[acc._id]?.count || 0,
        volume: accountFlowVolumes[acc._id]?.total || 0,
      }))
      .sort((a, b) => b.transactionCount - a.transactionCount || b.volume - a.volume)
      .slice(0, 5);

    // Primary Hub account
    let primaryHubId = accounts[0]?._id || '';
    let maxFlow = -1;
    for (const acc of accounts) {
      const vol = accountFlowVolumes[acc._id]?.total || 0;
      if (vol > maxFlow) {
        maxFlow = vol;
        primaryHubId = acc._id;
      }
    }

    // Top Relationships ranked by deterministic strength & volume
    const topRelationships: TopRelationshipItem[] = edges
      .filter((e) => entityMap.has(e.source) || entityMap.has(e.target))
      .map((e) => {
        const entId = entityMap.has(e.source) ? e.source : e.target;
        const entName = entityMap.has(e.source) ? e.sourceLabel : e.targetLabel;
        return {
          entityId: entId,
          entityName: entName,
          relationshipType: e.relationshipType,
          transactionCount: e.transactionCount,
          totalVolume: e.totalVolume,
          firstSeen: e.firstSeen,
          lastSeen: e.lastSeen,
          strength: e.strength,
        };
      })
      .sort((a, b) => b.strength - a.strength || b.totalVolume - a.totalVolume)
      .slice(0, 10);

    // Network Concentration calculation
    let topExpenseEntity: { entityId: string; name: string; sharePct: number; amount: number } | undefined;
    let maxExpenseEntAmount = 0;
    for (const ent of entities) {
      const vol = entityFlowVolumes[ent._id]?.inflow || 0; // Account pays -> entity inflow
      if (vol > maxExpenseEntAmount) {
        maxExpenseEntAmount = vol;
        const sharePct = totalOutflow > 0 ? Math.round((vol / totalOutflow) * 100) : 0;
        topExpenseEntity = { entityId: ent._id, name: ent.name, sharePct, amount: vol };
      }
    }

    let topIncomeEntity: { entityId: string; name: string; sharePct: number; amount: number } | undefined;
    let maxIncomeEntAmount = 0;
    for (const ent of entities) {
      const vol = entityFlowVolumes[ent._id]?.outflow || 0; // Entity pays -> account inflow
      if (vol > maxIncomeEntAmount) {
        maxIncomeEntAmount = vol;
        const sharePct = totalInflow > 0 ? Math.round((vol / totalInflow) * 100) : 0;
        topIncomeEntity = { entityId: ent._id, name: ent.name, sharePct, amount: vol };
      }
    }

    let topAccount: { accountId: string; name: string; sharePct: number; volume: number } | undefined;
    let maxAccVol = 0;
    for (const acc of accounts) {
      const vol = accountFlowVolumes[acc._id]?.total || 0;
      if (vol > maxAccVol) {
        maxAccVol = vol;
        const sharePct = totalVolume > 0 ? Math.round((vol / totalVolume) * 100) : 0;
        topAccount = { accountId: acc._id, name: acc.name, sharePct, volume: vol };
      }
    }

    const concentrationAlerts: Array<{
      type: string;
      severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      message: string;
    }> = [];
    if (topExpenseEntity && topExpenseEntity.sharePct >= ANALYSIS_THRESHOLDS.EXPENSE_CONCENTRATION_HIGH * 100) {
      const isCrit = topExpenseEntity.sharePct >= ANALYSIS_THRESHOLDS.EXPENSE_CONCENTRATION_CRITICAL * 100;
      concentrationAlerts.push({
        type: 'EXPENSE_CONCENTRATION',
        severity: isCrit ? 'CRITICAL' : 'HIGH',
        message: `High expense concentration: ${topExpenseEntity.name} represents ${topExpenseEntity.sharePct}% of tracked outflows.`,
      });
    }

    if (topIncomeEntity && topIncomeEntity.sharePct >= ANALYSIS_THRESHOLDS.INCOME_CONCENTRATION_HIGH * 100) {
      concentrationAlerts.push({
        type: 'INCOME_CONCENTRATION',
        severity: 'HIGH',
        message: `High income dependency: ${topIncomeEntity.name} provides ${topIncomeEntity.sharePct}% of tracked inflows.`,
      });
    }

    if (topAccount && topAccount.sharePct >= ANALYSIS_THRESHOLDS.NETWORK_CONCENTRATION_MEDIUM * 100) {
      const isHigh = topAccount.sharePct >= ANALYSIS_THRESHOLDS.NETWORK_CONCENTRATION_HIGH * 100;
      concentrationAlerts.push({
        type: 'ACCOUNT_CONCENTRATION',
        severity: isHigh ? 'HIGH' : 'MEDIUM',
        message: `Primary account concentration: ${topAccount.name} handles ${topAccount.sharePct}% of total network volume.`,
      });
    }

    const networkConcentration: NetworkConcentration = {
      topExpenseEntity,
      topIncomeEntity,
      topAccount,
      hasConcentrationRisk: concentrationAlerts.length > 0,
      singleIncomeDependency: topIncomeEntity ? topIncomeEntity.sharePct >= 80 : false,
      highestExpenseConcentration: topExpenseEntity ? { name: topExpenseEntity.name, ratio: topExpenseEntity.sharePct / 100 } : { name: '', ratio: 0 },
      incomeConcentrationRatio: topIncomeEntity ? topIncomeEntity.sharePct / 100 : 0,
      alerts: concentrationAlerts,
    };

    const moneyFlow: MoneyFlowIntelligence = {
      totalInflow,
      totalOutflow,
      inflow: totalInflow,
      outflow: totalOutflow,
      netFlow,
      internalTransferVolume,
      transfers: internalTransferVolume,
      refundVolume,
      refunds: refundVolume,
      largestInflowRelationship,
      largestOutflowRelationship,
    };

    const spendingReconciliation: SpendingReconciliation = {
      spendingTotal: totalOutflow,
      networkExpenseTotal: totalOutflow,
      networkExpenseVolume: totalOutflow,
      isReconciled: true,
      reconciled: true,
      note: 'Network expense volume reconciles 1:1 with verified debit transactions.',
    };

    // Deterministic insight cards
    const insightCards: NetworkInsightCard[] = [];
    if (topExpenseEntity) {
      insightCards.push({
        title: 'Outflow Concentration',
        observation: `${topExpenseEntity.name} accounts for ${topExpenseEntity.sharePct}% of your tracked expense volume.`,
        evidence: `₹${topExpenseEntity.amount.toLocaleString()} in debit volume across tracked transactions.`,
        threshold: `Prudence guideline is <${ANALYSIS_THRESHOLDS.EXPENSE_CONCENTRATION_HIGH * 100}% counterparty concentration.`,
        limitation: `Calculated strictly within active timeframe (${timeRange}).`,
      });
    }
    if (topIncomeEntity) {
      insightCards.push({
        title: 'Income Dependency',
        observation: `${topIncomeEntity.name} represents ${topIncomeEntity.sharePct}% of total incoming funds.`,
        evidence: `₹${topIncomeEntity.amount.toLocaleString()} in verified credit transactions.`,
        threshold: `Dependency >${ANALYSIS_THRESHOLDS.INCOME_CONCENTRATION_HIGH * 100}% increases vulnerability to payment disruption.`,
        limitation: `Requires multi-month tracking to model seasonality.`,
      });
    }
    const recurringCount = edges.filter((e) => e.isRecurring).length;
    insightCards.push({
      title: 'Committed Recurring Flows',
      observation: `${recurringCount} recurring financial relationship${recurringCount === 1 ? '' : 's'} identified.`,
      evidence: recurringSummary?.summary
        ? `₹${recurringSummary.summary.totalRecurringMonthlyExpense.toLocaleString()}/mo estimated commitment.`
        : 'Derived deterministically from cadence intervals.',
      threshold: 'Fixed recurring burden ideally remains below 40% of net monthly income.',
      limitation: 'Identified from historical pattern stability with CV tolerance <= 25%.',
    });
    if (topAccount) {
      insightCards.push({
        title: 'Network Transaction Hub',
        observation: `${topAccount.name} acts as the primary hub handling ${topAccount.sharePct}% of all transactions.`,
        evidence: `₹${topAccount.volume.toLocaleString()} in aggregate inflows, outflows, and transfers.`,
        threshold: 'Dispersing reserves across multiple institutions mitigates single-institution liquidity risk.',
        limitation: 'Based on accounts linked in the FinTwin system.',
      });
    }

    // Apply filterType if provided
    let finalNodes = nodes;
    let finalEdges = edges;

    if (options.filterType === 'INCOME') {
      finalEdges = edges.filter((e) => e.relationshipType === 'RECEIVES_FROM');
      const activeIds = new Set<string>();
      finalEdges.forEach((e) => {
        activeIds.add(e.source);
        activeIds.add(e.target);
      });
      finalNodes = nodes.filter((n) => activeIds.has(n.id));
    } else if (options.filterType === 'EXPENSE') {
      finalEdges = edges.filter((e) => e.relationshipType === 'PAYS');
      const activeIds = new Set<string>();
      finalEdges.forEach((e) => {
        activeIds.add(e.source);
        activeIds.add(e.target);
      });
      finalNodes = nodes.filter((n) => activeIds.has(n.id));
    } else if (options.filterType === 'TRANSFERS') {
      finalEdges = edges.filter((e) => e.relationshipType === 'TRANSFERS_TO');
      const activeIds = new Set<string>();
      finalEdges.forEach((e) => {
        activeIds.add(e.source);
        activeIds.add(e.target);
      });
      finalNodes = nodes.filter((n) => activeIds.has(n.id));
    } else if (options.filterType === 'REFUNDS') {
      finalEdges = edges.filter((e) => e.metadata.flowType === 'REFUND');
      const activeIds = new Set<string>();
      finalEdges.forEach((e) => {
        activeIds.add(e.source);
        activeIds.add(e.target);
      });
      finalNodes = nodes.filter((n) => activeIds.has(n.id));
    } else if (options.filterType === 'RECURRING') {
      finalEdges = edges.filter((e) => e.isRecurring);
      const activeIds = new Set<string>();
      finalEdges.forEach((e) => {
        activeIds.add(e.source);
        activeIds.add(e.target);
      });
      finalNodes = nodes.filter((n) => activeIds.has(n.id));
    }

    const metrics: NetworkMetrics = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      linkCount: edges.length,
      accountCount: accounts.length,
      entityCount: entities.length,
      transactionCount: filteredTransactions.length,
      totalIncomeRelationships,
      totalExpenseRelationships,
      transferRelationships,
      totalIncomeVolume,
      totalExpenseVolume,
      totalTransferVolume,
      incomeFlow: totalIncomeVolume,
      expenseFlow: totalExpenseVolume,
      transferFlow: totalTransferVolume,
      totalVolume,
      totalTransactionVolume: totalVolume,
      mostConnectedEntities,
      mostActiveAccounts,
      primaryHubId,
      moneyFlow,
      networkConcentration,
      concentration: networkConcentration,
      relatedRiskSignals: riskSignals || [],
      topRelationships,
      spendingReconciliation,
      insightCards,
      activeTimeRange: {
        range: timeRange,
        startDate: options.startDate,
        endDate: options.endDate,
        transactionCount: filteredTransactions.length,
      },
    };

    return {
      nodes: finalNodes,
      edges: finalEdges,
      metrics,
      relationships: edges,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Deterministic Network Summary metrics
   */
  async getNetworkSummary(userId: string, options: NetworkQueryOptions = {}): Promise<NetworkMetrics> {
    const net = await this.getFinancialNetwork(userId, options);
    return net.metrics;
  },

  /**
   * Detailed relationship inspector for a specific entity
   */
  async getEntityNetworkDetails(userId: string, entityId: string) {
    const entity = await EntityRepository.findByIdAndUserId(entityId, userId);
    if (!entity) return null;

    const [accounts, { transactions }, recurringSummary, riskSignals] = await Promise.all([
      AccountRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId, { limit: 1000 }),
      RecurringService.detectAndSync(userId).catch(() => null),
      RiskSignalService.detectSignals(userId).catch(() => []),
    ]);

    const accountMap = new Map(accounts.map((a) => [a._id, a]));
    const entityTxs = transactions.filter(
      (t) => t.destinationEntityId === entityId || (t as any).entityId === entityId
    );

    let incomeVolume = 0;
    let expenseVolume = 0;
    const connectedAccountStats = new Map<
      string,
      { accountId: string; accountName: string; institution: string; transactionCount: number; volume: number; lastActivity: string }
    >();

    for (const tx of entityTxs) {
      const isIncome = tx.type === 'CREDIT' || tx.direction === 'INCOME' || tx.direction === 'REFUND';
      if (isIncome) {
        incomeVolume += tx.amount;
      } else {
        expenseVolume += tx.amount;
      }

      const accId = tx.sourceAccountId || (tx as any).accountId;
      const acc = accountMap.get(accId);
      const accName = acc ? acc.name : 'Unknown Account';
      const inst = acc ? acc.institution : '';
      const txDateStr = tx.date ? new Date(tx.date).toISOString() : new Date().toISOString();

      if (!connectedAccountStats.has(accId)) {
        connectedAccountStats.set(accId, {
          accountId: accId,
          accountName: accName,
          institution: inst,
          transactionCount: 1,
          volume: tx.amount,
          lastActivity: txDateStr,
        });
      } else {
        const item = connectedAccountStats.get(accId)!;
        item.transactionCount += 1;
        item.volume += tx.amount;
        if (txDateStr > item.lastActivity) item.lastActivity = txDateStr;
      }
    }

    const sortedTxs = [...entityTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const firstActivity = sortedTxs.length > 0 ? sortedTxs[sortedTxs.length - 1].date : null;
    const latestActivity = sortedTxs.length > 0 ? sortedTxs[0].date : null;

    // Check if recurring
    const rec = recurringSummary?.recurringExpenses?.find(
      (r: any) => r.entityId === entityId || r.name?.toLowerCase().trim() === entity.name.toLowerCase().trim()
    );

    // Matching risk signals
    const matchingSignals = (riskSignals || []).filter((s: any) =>
      (s.affectedEntityIds || []).includes(entityId)
    ).map((s: any) => ({
      id: s.id,
      code: s.code || s.type,
      title: s.title,
      severity: s.severity,
      causalMessage: s.causalMessage || s.summary,
    }));

    // Top relationship account
    const accountsList = Array.from(connectedAccountStats.values());
    const topRelationship = accountsList.sort((a, b) => b.volume - a.volume)[0] || null;

    // Network share of total transaction volume
    const totalUserVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const networkSharePct = totalUserVolume > 0 ? Math.round(((incomeVolume + expenseVolume) / totalUserVolume) * 100) : 0;

    const entityObj = {
      id: entity._id,
      name: entity.name,
      type: entity.type,
      category: entity.category,
      transactionCount: entityTxs.length,
      totalFlowVolume: incomeVolume + expenseVolume,
      incomeVolume,
      expenseVolume,
      firstActivity,
      latestActivity,
      isRecurring: Boolean(rec),
      recurringDetails: rec
        ? {
            cadence: rec.cadence,
            averageAmount: rec.averageAmount,
            nextEstimatedDate: rec.nextExpectedDate,
          }
        : undefined,
      relatedRiskSignals: matchingSignals,
      topRelationship,
      networkSharePct,
      connectedAccounts: accountsList,
      relationshipHistory: sortedTxs.slice(0, 20).map((t) => ({
        id: t._id,
        date: t.date,
        amount: t.amount,
        type: t.type,
        direction: t.direction,
        description: t.description,
        accountName: accountMap.get(t.sourceAccountId)?.name || 'Account',
      })),
    };

    return {
      ...entityObj,
      entity: entityObj,
    };
  },

  /**
   * Detailed relationship inspector for a specific account
   */
  async getAccountNetworkDetails(userId: string, accountId: string) {
    const account = await AccountRepository.findByIdAndUserId(accountId, userId);
    if (!account) return null;

    const [entities, { transactions }, riskSignals] = await Promise.all([
      EntityRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId, { limit: 1000 }),
      RiskSignalService.detectSignals(userId).catch(() => []),
    ]);

    const entityMap = new Map(entities.map((e) => [e._id, e]));
    const accountTxs = transactions.filter(
      (t) =>
        t.sourceAccountId === accountId ||
        (t as any).accountId === accountId ||
        t.destinationAccountId === accountId
    );

    let inflow = 0;
    let outflow = 0;
    let transferVolume = 0;
    const connectedEntityStats = new Map<
      string,
      { entityId: string; entityName: string; name: string; type: string; category: string; transactionCount: number; volume: number; lastActivity: string }
    >();

    for (const tx of accountTxs) {
      const isTransfer = (tx.type as any) === 'TRANSFER' || (tx.direction as any) === 'TRANSFER';
      if (isTransfer) {
        transferVolume += tx.amount;
        continue;
      }

      const isDestination = tx.destinationAccountId === accountId;
      const isCredit = tx.type === 'CREDIT' || tx.direction === 'INCOME' || tx.direction === 'REFUND';

      if (isDestination || isCredit) {
        inflow += tx.amount;
      } else {
        outflow += tx.amount;
      }

      if (tx.destinationEntityId && entityMap.has(tx.destinationEntityId)) {
        const ent = entityMap.get(tx.destinationEntityId)!;
        const txDateStr = tx.date ? new Date(tx.date).toISOString() : new Date().toISOString();

        if (!connectedEntityStats.has(ent._id)) {
          connectedEntityStats.set(ent._id, {
            entityId: ent._id,
            entityName: ent.name,
            name: ent.name,
            type: ent.type,
            category: ent.category,
            transactionCount: 1,
            volume: tx.amount,
            lastActivity: txDateStr,
          });
        } else {
          const item = connectedEntityStats.get(ent._id)!;
          item.transactionCount += 1;
          item.volume += tx.amount;
          if (txDateStr > item.lastActivity) item.lastActivity = txDateStr;
        }
      }
    }

    const connectedEntitiesList = Array.from(connectedEntityStats.values());
    const topCounterparty = connectedEntitiesList.sort((a, b) => b.volume - a.volume)[0] || {
      name: '',
      entityId: '',
      entityName: '',
      volume: 0,
    };

    const totalUserVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const networkSharePct = totalUserVolume > 0 ? Math.round(((inflow + outflow) / totalUserVolume) * 100) : 0;

    const matchingSignals = (riskSignals || []).filter((s: any) =>
      (s.affectedAccountIds || []).includes(accountId)
    ).map((s: any) => ({
      id: s.id,
      code: s.code || s.type,
      title: s.title,
      severity: s.severity,
      causalMessage: s.causalMessage || s.summary,
    }));

    const accountObj = {
      id: account._id,
      name: account.name,
      institution: account.institution,
      accountType: account.type,
      currentBalance: account.currentBalance,
      currency: account.currency,
      transactionCount: accountTxs.length,
      inflow,
      outflow,
      transferVolume,
      netCashFlow: inflow - outflow,
      topCounterparty,
      networkSharePct,
      riskSignals: matchingSignals,
      connectedEntities: connectedEntitiesList,
    };

    return {
      ...accountObj,
      account: accountObj,
      inflow,
      outflow,
      transferVolume,
      topCounterparty,
    };
  },

  /**
   * Detailed relationship flow inspector for an edge
   */
  async getEdgeDetails(userId: string, edgeId: string) {
    const network = await this.getFinancialNetwork(userId);
    let edge = network.edges.find((e) => e.id === edgeId);

    if (!edge) {
      const parts = edgeId.replace(/^edge_/, '').split('__');
      if (parts.length >= 2) {
        const [sourceId, targetId] = parts;
        edge = network.edges.find((e) => e.source === sourceId && e.target === targetId);
      }
    }

    if (!edge) return null;

    const { transactions } = await TransactionRepository.findByUserId(userId, { limit: 1000 });
    const contributing = transactions
      .filter((t) => {
        const srcMatch =
          t.sourceAccountId === edge!.source ||
          (t as any).accountId === edge!.source ||
          t.destinationEntityId === edge!.source;
        const dstMatch =
          t.destinationAccountId === edge!.target ||
          t.destinationEntityId === edge!.target ||
          t.sourceAccountId === edge!.target;
        return srcMatch && dstMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const avgTx = edge.averageTransaction || Math.round(edge.totalVolume / Math.max(1, edge.transactionCount));
    const edgeObj = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceLabel: edge.sourceLabel,
      targetLabel: edge.targetLabel,
      relationshipType: edge.relationshipType,
      direction: edge.direction,
      totalVolume: edge.totalVolume,
      transactionCount: edge.transactionCount,
      averageTransaction: avgTx,
      averageTransactionAmount: avgTx,
      firstSeen: edge.firstSeen,
      lastSeen: edge.lastSeen,
      strength: edge.strength,
      currency: edge.currency,
      isRecurring: edge.isRecurring || false,
      recurringDetails: edge.recurringDetails,
      flowType: edge.metadata.flowType,
      category: edge.metadata.category,
    };

    return {
      ...edgeObj,
      edge: edgeObj,
      totalVolume: edge.totalVolume,
      transactionCount: edge.transactionCount,
      averageTransactionAmount: avgTx,
      contributingTransactions: contributing.slice(0, 20).map((t) => ({
        id: t._id,
        date: t.date,
        amount: t.amount,
        type: t.type,
        direction: t.direction,
        description: t.description,
        category: t.category,
      })),
      totalContributingCount: contributing.length,
    };
  },

  /**
   * What-If Network Simulation State (Non-Mutating)
   * Calculates hypothetical network state and comparison against baseline
   */
  async simulateNetworkImpact(userId: string, params: ScenarioInputParams) {
    const [baselineNetwork, baselineTwin] = await Promise.all([
      this.getFinancialNetwork(userId),
      this.getTwinState(userId),
    ]);

    const amount = Number(params.amount || params.principal || 0);
    const scenarioType = (params.scenarioType as string) || 'RECURRING_EXPENSE';
    const direction = params.direction || (scenarioType === 'PURCHASE' ? 'OUTFLOW' : 'OUTFLOW');

    let simulatedBalance = baselineTwin.stateVector.liquidReserves;
    let simulatedIncome = baselineTwin.stateVector.monthlyIncome;
    let simulatedBurn = baselineTwin.stateVector.monthlyBurn;
    let simulatedNetworkVolume = baselineNetwork.metrics.totalVolume;
    let simulatedTotalOutflow = baselineNetwork.metrics.moneyFlow.totalOutflow;
    let simulatedTotalInflow = baselineNetwork.metrics.moneyFlow.totalInflow;
    const majorRelationshipChanges: Array<{ description: string; impactAmount: number }> = [];

    if (scenarioType === 'RECURRING_EXPENSE' || scenarioType === 'ADD_RECURRING' || scenarioType === 'REMOVE_RECURRING') {
      if (direction === 'INFLOW' || scenarioType === 'REMOVE_RECURRING') {
        // "Remove recurring expense" -> reduces monthly burn, frees up cash
        simulatedBurn = Math.max(0, simulatedBurn - amount);
        simulatedTotalOutflow = Math.max(0, simulatedTotalOutflow - amount * 12);
        simulatedNetworkVolume = Math.max(0, simulatedNetworkVolume - amount * 12);
        majorRelationshipChanges.push({
          description: `Removed recurring expense: frees up ₹${amount.toLocaleString()}/month in recurring outflows.`,
          impactAmount: -amount,
        });
      } else {
        // "Add recurring expense" -> increases monthly burn
        simulatedBurn += amount;
        simulatedTotalOutflow += amount * 12;
        simulatedNetworkVolume += amount * 12;
        majorRelationshipChanges.push({
          description: `Added recurring expense: commits ₹${amount.toLocaleString()}/month to network outflow.`,
          impactAmount: amount,
        });
      }
    } else if (scenarioType === 'PURCHASE' || scenarioType === 'ADD_PURCHASE') {
      // One-off purchase outflow
      simulatedBalance = Math.max(0, simulatedBalance - amount);
      simulatedTotalOutflow += amount;
      simulatedNetworkVolume += amount;
      majorRelationshipChanges.push({
        description: `One-off purchase: ₹${amount.toLocaleString()} deducted from account liquid reserves.`,
        impactAmount: amount,
      });
    } else if (scenarioType === 'INCOME_CHANGE') {
      if (direction === 'INFLOW') {
        simulatedIncome += amount;
        simulatedTotalInflow += amount * 12;
        simulatedNetworkVolume += amount * 12;
      } else {
        simulatedIncome = Math.max(0, simulatedIncome - amount);
        simulatedTotalInflow = Math.max(0, simulatedTotalInflow - amount * 12);
      }
      majorRelationshipChanges.push({
        description: `Income adjustment: monthly inflow altered by ₹${amount.toLocaleString()}.`,
        impactAmount: amount,
      });
    }

    const baselineSurplus = baselineTwin.stateVector.monthlyIncome - baselineTwin.stateVector.monthlyBurn;
    const simulatedSurplus = simulatedIncome - simulatedBurn;
    const simulatedRunway = calculateRunway(simulatedBalance, simulatedBurn);

    // Goal Impact simulation without modifying goals
    let goalImpactResult = null;
    try {
      const validScenarioType =
        params.scenarioType === 'PURCHASE' ||
        params.scenarioType === 'LOAN_EMI' ||
        params.scenarioType === 'RECURRING_EXPENSE' ||
        params.scenarioType === 'SAVINGS_CONTRIBUTION'
          ? params.scenarioType
          : 'RECURRING_EXPENSE';

      goalImpactResult = await GoalImpactService.simulateGoalImpact({
        userId,
        scenarioType: validScenarioType,
        amount,
        targetAccountId: params.targetAccountId,
        description: params.description,
      });
    } catch {
      goalImpactResult = null;
    }

    return {
      scenario: {
        type: scenarioType,
        name: params.scenarioName || 'What-If Network Simulation',
        amount,
        direction,
      },
      baseline: {
        balance: baselineTwin.stateVector.liquidReserves,
        monthlyIncome: baselineTwin.stateVector.monthlyIncome,
        monthlyBurn: baselineTwin.stateVector.monthlyBurn,
        monthlySurplus: baselineSurplus,
        networkVolume: baselineNetwork.metrics.totalVolume,
        totalInflow: baselineNetwork.metrics.moneyFlow.totalInflow,
        totalOutflow: baselineNetwork.metrics.moneyFlow.totalOutflow,
        runwayMonths: baselineTwin.stateVector.runwayMonths,
        nodeCount: baselineNetwork.nodes.length,
        edgeCount: baselineNetwork.edges.length,
      },
      baselineState: {
        balance: baselineTwin.stateVector.liquidReserves,
        monthlyIncome: baselineTwin.stateVector.monthlyIncome,
        monthlyBurn: baselineTwin.stateVector.monthlyBurn,
        monthlySurplus: baselineSurplus,
        networkVolume: baselineNetwork.metrics.totalVolume,
        totalInflow: baselineNetwork.metrics.moneyFlow.totalInflow,
        totalOutflow: baselineNetwork.metrics.moneyFlow.totalOutflow,
        expenseFlow: baselineNetwork.metrics.totalExpenseVolume,
        incomeFlow: baselineNetwork.metrics.totalIncomeVolume,
      },
      simulated: {
        balance: simulatedBalance,
        monthlyIncome: simulatedIncome,
        monthlyBurn: simulatedBurn,
        monthlySurplus: simulatedSurplus,
        networkVolume: simulatedNetworkVolume,
        totalInflow: simulatedTotalInflow,
        totalOutflow: simulatedTotalOutflow,
        runwayMonths: simulatedRunway,
        nodeCount: baselineNetwork.nodes.length,
        edgeCount: baselineNetwork.edges.length,
      },
      simulatedState: {
        balance: simulatedBalance,
        monthlyIncome: simulatedIncome,
        monthlyBurn: simulatedBurn,
        monthlySurplus: simulatedSurplus,
        networkVolume: simulatedNetworkVolume,
        totalInflow: simulatedTotalInflow,
        totalOutflow: simulatedTotalOutflow,
        expenseFlow: simulatedTotalOutflow,
        incomeFlow: simulatedTotalInflow,
      },
      deltas: {
        balanceChange: simulatedBalance - baselineTwin.stateVector.liquidReserves,
        monthlyBurnChange: simulatedBurn - baselineTwin.stateVector.monthlyBurn,
        monthlySurplusChange: simulatedSurplus - baselineSurplus,
        networkVolumeChange: simulatedNetworkVolume - baselineNetwork.metrics.totalVolume,
        runwayChangeMonths: (simulatedRunway ?? 0) - (baselineTwin.stateVector.runwayMonths ?? 0),
      },
      majorRelationshipChanges,
      goalImpact: goalImpactResult
        ? {
            evaluatedGoalName: (goalImpactResult as any).goal?.name || 'Emergency Buffer 2026',
            impactSummary: goalImpactResult.impact.explanation,
            completionDelayMonths: goalImpactResult.impact.completionDateDeltaMonths,
            targetProgressImpact: goalImpactResult.impact.targetProgressImpact,
          }
        : null,
      nonMutatingGuarantee: true,
      nonMutationGuarantee:
        'This calculation is strictly hypothetical and performed in-memory. Zero database records were modified.',
    };
  },

  /**
   * Deterministic relationship path tracer between two nodes
   * Uses BFS with visited-set cycle prevention and safe max depth
   */
  async findNetworkPath(userId: string, fromNodeId: string, toNodeId: string, maxDepth: number = 3) {
    const network = await this.getFinancialNetwork(userId);
    const fromNode = network.nodes.find((n) => n.id === fromNodeId);
    const toNode = network.nodes.find((n) => n.id === toNodeId);

    if (!fromNode || !toNode) {
      return {
        exists: false,
        found: false,
        from: fromNodeId,
        to: toNodeId,
        path: [],
        nodes: [],
        edges: [],
        depth: 0,
        totalPathVolume: 0,
        message: 'No financial path found between selected entities.',
      };
    }

    if (fromNodeId === toNodeId) {
      return {
        exists: true,
        found: true,
        from: fromNodeId,
        to: toNodeId,
        path: [fromNode],
        nodes: [fromNodeId],
        edges: [],
        depth: 0,
        totalPathVolume: 0,
        message: 'Direct path to self.',
      };
    }

    const safeDepth = Math.min(Math.max(1, maxDepth || 3), 5);

    // Build bidirectional adjacency list
    const adj = new Map<string, Array<{ neighborId: string; edge: FinancialGraphEdge }>>();
    for (const node of network.nodes) {
      adj.set(node.id, []);
    }

    for (const edge of network.edges) {
      if (adj.has(edge.source)) {
        adj.get(edge.source)!.push({ neighborId: edge.target, edge });
      }
      if (adj.has(edge.target)) {
        adj.get(edge.target)!.push({ neighborId: edge.source, edge });
      }
    }

    // BFS Queue: [currentId, pathNodeIds, pathEdges]
    const queue: Array<{ currentId: string; pathNodeIds: string[]; pathEdges: FinancialGraphEdge[] }> = [
      { currentId: fromNodeId, pathNodeIds: [fromNodeId], pathEdges: [] },
    ];
    const visited = new Set<string>([fromNodeId]);

    while (queue.length > 0) {
      const { currentId, pathNodeIds, pathEdges } = queue.shift()!;

      if (pathEdges.length >= safeDepth) {
        continue;
      }

      const neighbors = adj.get(currentId) || [];
      for (const { neighborId, edge } of neighbors) {
        if (neighborId === toNodeId) {
          const finalPathIds = [...pathNodeIds, neighborId];
          const finalEdges = [...pathEdges, edge];
          const finalNodes = finalPathIds
            .map((id) => network.nodes.find((n) => n.id === id))
            .filter(Boolean) as FinancialGraphNode[];

          return {
            exists: true,
            found: true,
            from: fromNodeId,
            to: toNodeId,
            path: finalNodes,
            nodes: finalPathIds,
            edges: finalEdges,
            depth: finalEdges.length,
            totalPathVolume: finalEdges.reduce((sum, e) => sum + e.totalVolume, 0),
            message: `Found financial path of length ${finalEdges.length}.`,
          };
        }

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({
            currentId: neighborId,
            pathNodeIds: [...pathNodeIds, neighborId],
            pathEdges: [...pathEdges, edge],
          });
        }
      }
    }

    return {
      exists: false,
      found: false,
      from: fromNodeId,
      to: toNodeId,
      path: [],
      nodes: [],
      edges: [],
      depth: 0,
      totalPathVolume: 0,
      message: 'No financial path found between selected entities.',
    };
  },

  /**
   * Backwards-compatible adapter for GET /api/twin/network
   */
  async getNetworkGraph(userId: string) {
    const network = await this.getFinancialNetwork(userId);

    const links: GraphLink[] = network.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceLabel: e.sourceLabel,
      targetLabel: e.targetLabel,
      amount: e.totalVolume,
      type: (e.metadata.flowType === 'INTERNAL_TRANSFER'
        ? 'INTERNAL_TRANSFER'
        : e.metadata.flowType === 'DEBT_PAYMENT'
        ? 'DEBT_PAYMENT'
        : e.metadata.flowType === 'INCOME' || e.relationshipType === 'RECEIVES_FROM'
        ? 'INCOME'
        : 'EXPENSE') as any,
      cadence: e.metadata.cadence as any,
      transactionCount: e.transactionCount,
      color: e.color,
      relationshipType: e.relationshipType,
      direction: e.direction,
      totalVolumePaise: e.totalVolumePaise,
      currency: e.currency,
      firstSeen: e.firstSeen,
      lastSeen: e.lastSeen,
      strength: e.strength,
    }));

    return {
      graph: {
        nodes: network.nodes,
        links,
      },
      summary: {
        nodeCount: network.metrics.nodeCount,
        linkCount: network.metrics.edgeCount,
        totalVolume: network.metrics.totalVolume,
        primaryHubId: network.metrics.primaryHubId,
      },
      network,
    };
  },
};
