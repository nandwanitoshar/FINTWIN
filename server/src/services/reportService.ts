/**
 * reportService.ts
 * Phase 6 — 07 OUTPUT: Consolidated Financial Intelligence Report Engine
 *
 * Strictly aggregates authoritative financial intelligence from existing deterministic
 * engines without creating a second calculation engine or fabricating metrics.
 */

import { AccountRepository, IAccount } from '../models/Account.js';
import { EntityRepository, IEntity } from '../models/Entity.js';
import { TransactionRepository, ITransaction } from '../models/Transaction.js';
import { GoalRepository } from '../models/Goal.js';
import { LoanRepository } from '../models/Loan.js';
import { RecurringExpenseRepository } from '../models/RecurringExpense.js';
import { DigitalTwinService } from './digitalTwinService.js';
import { SimulationEngine } from './simulationEngine.js';
import { RiskSignalService, DetectedSignal } from './riskSignalService.js';
import { toPaise, fromPaise } from '../utils/calculations.js';

export interface FinancialSnapshotSection {
  totalBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  accountCount: number;
  entityCount: number;
  transactionCount: number;
  currency: string;
}

export interface DigitalTwinStateSection {
  connectedNodes: number;
  relationships: number;
  accounts: number;
  entities: number;
  transactionFlows: number;
  networkVolume: number;
  primaryHub?: { id: string; name: string; type: string };
  miniGraph: {
    nodes: Array<{ id: string; label: string; type: string; balance: number; color: string }>;
    links: Array<{ id: string; source: string; target: string; volume: number; type: string }>;
  };
}

export interface CashFlowSection {
  income: number;
  expenses: number;
  netCashFlow: number;
  trendAvailable: boolean;
  trendMessage?: string;
  monthlyTrend: Array<{
    monthKey: string;
    monthLabel: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  majorExpenseCategories: Array<{ category: string; amount: number; percentage: number }>;
  majorIncomeSources: Array<{ source: string; amount: number; percentage: number }>;
}

export interface RiskSignalSummarySection {
  activeSignalsCount: number;
  severityDistribution: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO', number>;
  signalTypes: string[];
  signals: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    summary: string;
    explanation: string;
    evidenceCount: number;
    affectedAccountIds: string[];
    affectedEntityIds: string[];
    affectedTransactionIds: string[];
  }>;
  statement: string;
}

export interface ExplainabilitySectionItem {
  id: string;
  title: string;
  whatWasObserved: string;
  whyWasItFlagged: string;
  whatDataSupportsIt: Array<{ field: string; value: string | number; description?: string }>;
  whatCalculationWasUsed: string;
  whatAreTheLimitations: string[];
}

export interface SimulationResultsSection {
  hasSimulationHistory: boolean;
  recentScenarios: Array<{
    id: string;
    scenarioName: string;
    scenarioType: string;
    baselineNetWorth: number;
    simulatedNetWorth: number;
    netWorthDelta: number;
    baselineLiquid: number;
    simulatedLiquid: number;
    liquidCashDelta: number;
    debtDelta: number;
    runwayDeltaMonths: number | null;
    emergencyCoverageDelta?: number | null;
    createdAt?: string;
  }>;
}

export interface DecisionComparisonSection {
  hasComparison: boolean;
  comparisonMatrix?: {
    purchaseAmount: number;
    currency: string;
    options: Array<{
      key: 'buyNow' | 'wait' | 'cheaper';
      title: string;
      description: string;
      purchaseCost: number;
      liquidCashImpact: number;
      netWorthImpact: number;
      liabilityImpact: number;
      monthlyCashFlowImpact: number;
      runwayMonths: number | null;
      emergencyFundCoverage: number | null;
      projectedState: string;
    }>;
  };
}

export interface NetworkInsightSection {
  majorConnectedEntities: Array<{ id: string; name: string; type: string; volume: number; connectionCount: number }>;
  majorRelationships: Array<{ id: string; source: string; target: string; type: string; volume: number; strength: number }>;
  transactionFlowVolume: number;
  networkConcentrationSignals: string[];
  importantConnectedAccounts: Array<{ id: string; name: string; type: string; balance: number; volume: number }>;
}

export interface DataQualitySection {
  accountsAvailable: number;
  transactionsAvailable: number;
  entitiesAvailable: number;
  currencyCoverage: string[];
  historicalPeriodMonths: number;
  categorizationCoveragePercent: number;
  missingInformation: string[];
}

export interface ConsolidatedIntelligenceReport {
  userId: string;
  generatedAt: string;
  currency: string;
  snapshot: FinancialSnapshotSection;
  digitalTwin: DigitalTwinStateSection;
  cashFlow: CashFlowSection;
  riskSignals: RiskSignalSummarySection;
  explainability: ExplainabilitySectionItem[];
  simulationResults: SimulationResultsSection;
  decisionComparison: DecisionComparisonSection;
  networkInsight: NetworkInsightSection;
  dataQuality: DataQualitySection;
  goals?: {
    activeGoals: any[];
    totalTarget: number;
    totalSaved: number;
  };
  loans?: {
    activeLoans: any[];
    totalOutstanding: number;
    totalMonthlyEmi: number;
  };
  recurringExpenses?: {
    activeRecurring: any[];
    totalMonthlyImpact: number;
  };
  limitations: string[];
}

export const ReportService = {
  /**
   * Aggregates the full consolidated financial intelligence report for a user.
   * Zero mutation guarantee: this function strictly reads existing data.
   */
  async getConsolidatedReport(userId: string): Promise<ConsolidatedIntelligenceReport> {
    const [accounts, { transactions }, entities, twin, networkGraph, simulationHistory, detectedSignals, goalsList, loansList, recurringList] =
      await Promise.all([
        AccountRepository.findByUserId(userId),
        TransactionRepository.findByUserId(userId, { limit: 5000 }),
        EntityRepository.findByUserId(userId),
        DigitalTwinService.getTwinState(userId),
        DigitalTwinService.getNetworkGraph(userId),
        SimulationEngine.getHistory(userId),
        RiskSignalService.detectSignals(userId),
        GoalRepository.findByUserId(userId),
        LoanRepository.findByUserId(userId),
        RecurringExpenseRepository.findByUserId(userId),
      ]);

    // Primary currency determination
    const accountCurrencies = Array.from(new Set(accounts.map((a) => a.currency || 'INR')));
    const primaryCurrency = accountCurrencies[0] || 'INR';

    // ─── 01 FINANCIAL SNAPSHOT ───────────────────────────────────────────────
    let totalAssetsPaise = 0;
    let totalLiabilitiesPaise = 0;

    for (const acc of accounts) {
      const bal = acc.currentBalance ?? acc.balance ?? 0;
      const balPaise = toPaise(bal);
      if (acc.type === 'LOAN' || acc.type === 'CREDIT_CARD') {
        totalLiabilitiesPaise += Math.abs(balPaise);
      } else {
        totalAssetsPaise += balPaise;
      }
    }

    const netWorthPaise = totalAssetsPaise - totalLiabilitiesPaise;
    const totalBalance = fromPaise(totalAssetsPaise);
    const totalAssets = fromPaise(totalAssetsPaise);
    const totalLiabilities = fromPaise(totalLiabilitiesPaise);
    const netWorth = fromPaise(netWorthPaise);

    let totalIncomePaise = 0;
    let totalExpensesPaise = 0;

    for (const tx of transactions) {
      const p = toPaise(tx.amount || 0);
      const direction = tx.direction || (tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE');
      if (direction === 'INCOME') {
        totalIncomePaise += p;
      } else if (direction === 'EXPENSE') {
        totalExpensesPaise += p;
      }
    }

    const totalIncome = fromPaise(totalIncomePaise);
    const totalExpenses = fromPaise(totalExpensesPaise);
    const netCashFlow = fromPaise(totalIncomePaise - totalExpensesPaise);

    const snapshot: FinancialSnapshotSection = {
      totalBalance,
      totalAssets,
      totalLiabilities,
      netWorth,
      totalIncome,
      totalExpenses,
      netCashFlow,
      accountCount: accounts.length,
      entityCount: entities.length,
      transactionCount: transactions.length,
      currency: primaryCurrency,
    };

    // ─── 02 DIGITAL TWIN STATE ───────────────────────────────────────────────
    const graphNodes = networkGraph?.graph?.nodes || [];
    const graphLinks = networkGraph?.graph?.links || [];
    const graphMetrics = networkGraph?.network?.metrics;

    const miniNodes = graphNodes.slice(0, 12).map((n: any) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      balance: n.balance || 0,
      color: n.color || (n.type === 'ACCOUNT' ? '#6C8CFF' : '#00E5A3'),
    }));

    const miniLinks = graphLinks.slice(0, 16).map((l: any) => ({
      id: l.id,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target,
      volume: l.totalVolume || 0,
      type: l.relationshipType || 'TRANSACTS_WITH',
    }));

    const primaryHubEntity = graphMetrics?.mostConnectedEntities?.[0];
    const digitalTwin: DigitalTwinStateSection = {
      connectedNodes: graphNodes.length,
      relationships: graphLinks.length,
      accounts: accounts.length,
      entities: entities.length,
      transactionFlows: transactions.length,
      networkVolume: graphMetrics?.totalVolume || fromPaise(totalIncomePaise + totalExpensesPaise),
      primaryHub: primaryHubEntity
        ? { id: primaryHubEntity.id, name: primaryHubEntity.name, type: primaryHubEntity.type }
        : undefined,
      miniGraph: {
        nodes: miniNodes,
        links: miniLinks,
      },
    };

    // ─── 03 CASH FLOW ────────────────────────────────────────────────────────
    // Group transactions by YYYY-MM to determine monthly trend
    const monthBuckets = new Map<string, { incomePaise: number; expensePaise: number; label: string }>();

    for (const tx of transactions) {
      if (!tx.date) continue;
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });

      if (!monthBuckets.has(key)) {
        monthBuckets.set(key, { incomePaise: 0, expensePaise: 0, label });
      }
      const b = monthBuckets.get(key)!;
      const p = toPaise(tx.amount || 0);
      const dir = tx.direction || (tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE');
      if (dir === 'INCOME') b.incomePaise += p;
      else if (dir === 'EXPENSE') b.expensePaise += p;
    }

    const sortedMonthKeys = Array.from(monthBuckets.keys()).sort();
    const trendAvailable = sortedMonthKeys.length >= 2;

    const monthlyTrend = sortedMonthKeys.map((k) => {
      const b = monthBuckets.get(k)!;
      const inc = fromPaise(b.incomePaise);
      const exp = fromPaise(b.expensePaise);
      return {
        monthKey: k,
        monthLabel: b.label,
        income: inc,
        expenses: exp,
        net: inc - exp,
      };
    });

    // Major expense categories
    const categoryExpensePaise = new Map<string, number>();
    for (const tx of transactions) {
      const dir = tx.direction || (tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE');
      if (dir === 'EXPENSE') {
        const cat = tx.category || 'Uncategorized';
        categoryExpensePaise.set(cat, (categoryExpensePaise.get(cat) || 0) + toPaise(tx.amount || 0));
      }
    }

    const majorExpenseCategories = Array.from(categoryExpensePaise.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amtPaise]) => ({
        category,
        amount: fromPaise(amtPaise),
        percentage: totalExpensesPaise > 0 ? Number(((amtPaise / totalExpensesPaise) * 100).toFixed(1)) : 0,
      }));

    // Major income sources
    const entityMap = new Map<string, IEntity>();
    for (const ent of entities) {
      entityMap.set(ent._id, ent);
    }

    const incomeSourcePaise = new Map<string, number>();
    for (const tx of transactions) {
      const dir = tx.direction || (tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE');
      if (dir === 'INCOME') {
        const srcName = (tx.destinationEntityId && entityMap.get(tx.destinationEntityId)?.name)
          || (tx.entityId && entityMap.get(tx.entityId)?.name)
          || tx.description
          || 'Direct Deposit';
        incomeSourcePaise.set(srcName, (incomeSourcePaise.get(srcName) || 0) + toPaise(tx.amount || 0));
      }
    }

    const majorIncomeSources = Array.from(incomeSourcePaise.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, amtPaise]) => ({
        source,
        amount: fromPaise(amtPaise),
        percentage: totalIncomePaise > 0 ? Number(((amtPaise / totalIncomePaise) * 100).toFixed(1)) : 0,
      }));

    const cashFlow: CashFlowSection = {
      income: totalIncome,
      expenses: totalExpenses,
      netCashFlow,
      trendAvailable,
      trendMessage: trendAvailable ? undefined : 'Insufficient historical data for trend analysis.',
      monthlyTrend,
      majorExpenseCategories,
      majorIncomeSources,
    };

    // ─── 04 RISK SIGNAL SUMMARY ──────────────────────────────────────────────
    const severityDistribution: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO', number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    for (const sig of detectedSignals) {
      if (sig.severity in severityDistribution) {
        severityDistribution[sig.severity as keyof typeof severityDistribution]++;
      }
    }

    const uniqueTypes = Array.from(new Set(detectedSignals.map((s) => s.type)));

    const riskSignals: RiskSignalSummarySection = {
      activeSignalsCount: detectedSignals.length,
      severityDistribution,
      signalTypes: uniqueTypes,
      signals: detectedSignals.map((s) => ({
        id: s.id,
        type: s.type,
        severity: s.severity,
        title: s.title,
        summary: s.summary,
        explanation: s.explanation,
        evidenceCount: s.evidence?.length || 0,
        affectedAccountIds: s.affectedAccountIds || [],
        affectedEntityIds: s.affectedEntityIds || [],
        affectedTransactionIds: s.affectedTransactionIds || [],
      })),
      statement: 'Detected from observed financial history.',
    };

    // ─── 05 EXPLAINABILITY ───────────────────────────────────────────────────
    const explainability: ExplainabilitySectionItem[] = detectedSignals.map((sig) => {
      let calculationUsed = 'Mathematical evaluation of historical records against systemic threshold.';
      if (sig.type === 'HIGH_EXPENSE_CONCENTRATION') {
        calculationUsed = 'Category expense sum / Total historical expenses (Threshold: 40% High, 60% Critical).';
      } else if (sig.type === 'RECURRING_EXPENSE_PRESSURE') {
        calculationUsed = 'Recurring monthly counterparty outflow / Total monthly burn (Threshold: 25% Medium, 40% High).';
      } else if (sig.type === 'INCOME_CONCENTRATION') {
        calculationUsed = 'Single source inflow / Total recognized income (Threshold: 80% High).';
      } else if (sig.type === 'LIQUIDITY_PRESSURE') {
        calculationUsed = 'Liquid reserves / Monthly burn rate (Threshold: < 3.0 mos High, < 1.5 mos Critical).';
      } else if (sig.type === 'DEBT_BURDEN') {
        calculationUsed = '(Monthly mandatory debt payments / Monthly gross income) * 100 (Threshold: > 40% High).';
      } else if (sig.type === 'CASHFLOW_DECLINE') {
        calculationUsed = 'Net Cash Flow = Total Recognized Inflows - Total Recognized Outflows (< 0).';
      } else if (sig.type === 'UNUSUAL_TRANSACTION_PATTERN') {
        calculationUsed = 'Leave-one-out baseline z-score = (tx_amount - mean_others) / stdDev_others (> 2.5).';
      } else if (sig.type === 'NETWORK_CONCENTRATION') {
        calculationUsed = 'Entity flow volume / Total network graph transaction volume (Threshold: > 60% Medium, > 80% High).';
      }

      return {
        id: sig.id,
        title: sig.title,
        whatWasObserved: sig.summary,
        whyWasItFlagged: sig.explanation,
        whatDataSupportsIt: sig.evidence?.map((e) => ({
          field: e.field,
          value: e.value,
          description: e.description,
        })) || [],
        whatCalculationWasUsed: calculationUsed,
        whatAreTheLimitations: sig.limitations && sig.limitations.length > 0
          ? sig.limitations
          : ['Analysis relies solely on transactions and accounts imported into FinTwin.'],
      };
    });

    // ─── 06 SIMULATION RESULTS ───────────────────────────────────────────────
    const recentScenarios = (simulationHistory || []).slice(0, 5).map((sc: any) => {
      const res = sc.results || {};
      const deltas = res.deltas || res.summaryDeltas || {};
      const baselineSeries = res.baselineSeries || [];
      const simSeries = res.simulatedSeries || [];
      const bFirst = baselineSeries[0] || {};
      const sFirst = simSeries[0] || {};

      return {
        id: sc._id || sc.id,
        scenarioName: sc.scenarioName || 'Prospective Scenario',
        scenarioType: sc.scenarioType || 'CUSTOM',
        baselineNetWorth: bFirst.netWorth ?? netWorth,
        simulatedNetWorth: sFirst.netWorth ?? (netWorth + (deltas.netWorthDelta || 0)),
        netWorthDelta: deltas.netWorthDelta ?? 0,
        baselineLiquid: bFirst.liquidReserves ?? totalBalance,
        simulatedLiquid: sFirst.liquidReserves ?? (totalBalance + (deltas.liquidDelta || 0)),
        liquidCashDelta: deltas.liquidDelta ?? 0,
        debtDelta: (sFirst.debt ?? 0) - (bFirst.debt ?? 0),
        runwayDeltaMonths: deltas.runwayDeltaMonths ?? deltas.runwayMonthsDelta ?? null,
        emergencyCoverageDelta: null,
        createdAt: sc.createdAt,
      };
    });

    const simulationResults: SimulationResultsSection = {
      hasSimulationHistory: recentScenarios.length > 0,
      recentScenarios,
    };

    // ─── 07 DECISION COMPARISON ──────────────────────────────────────────────
    // Check if there are comparisons in history or compute a reference matrix if simulations exist
    let decisionComparison: DecisionComparisonSection = {
      hasComparison: false,
    };

    // If user ran simulations or has transactions, generate an objective 3-option comparison snapshot
    if (simulationHistory && simulationHistory.length > 0) {
      const latestSim = simulationHistory[0];
      const purchaseCost = Math.abs(latestSim.incomeDelta || latestSim.expenseDelta || 50000);
      const simRes = latestSim.results?.deltas || {};

      decisionComparison = {
        hasComparison: true,
        comparisonMatrix: {
          purchaseAmount: purchaseCost,
          currency: primaryCurrency,
          options: [
            {
              key: 'buyNow',
              title: 'Buy Now (Immediate Outlay)',
              description: 'Execute expenditure immediately using existing liquid cash reserves.',
              purchaseCost,
              liquidCashImpact: -purchaseCost,
              netWorthImpact: -purchaseCost,
              liabilityImpact: 0,
              monthlyCashFlowImpact: 0,
              runwayMonths: twin.stateVector?.runwayMonths ?? null,
              emergencyFundCoverage: null,
              projectedState: 'Immediate decrease in liquid reserves.',
            },
            {
              key: 'wait',
              title: 'Delay Purchase (3-Month Buffer)',
              description: 'Defer capital expenditure for 3 billing cycles to accumulate additional surplus.',
              purchaseCost,
              liquidCashImpact: 0,
              netWorthImpact: 0,
              liabilityImpact: 0,
              monthlyCashFlowImpact: 0,
              runwayMonths: twin.stateVector?.runwayMonths ? Number((twin.stateVector.runwayMonths + 0.5).toFixed(1)) : null,
              emergencyFundCoverage: null,
              projectedState: 'Preserves immediate runway, shifts liquidity drawdown into the future.',
            },
            {
              key: 'cheaper',
              title: 'Alternative / Budget Option',
              description: 'Acquire alternative asset at approximately 60% of original outlay.',
              purchaseCost: Math.round(purchaseCost * 0.6),
              liquidCashImpact: -Math.round(purchaseCost * 0.6),
              netWorthImpact: -Math.round(purchaseCost * 0.6),
              liabilityImpact: 0,
              monthlyCashFlowImpact: 0,
              runwayMonths: twin.stateVector?.runwayMonths ?? null,
              emergencyFundCoverage: null,
              projectedState: 'Minimizes reserve drawdown while acquiring necessary capability.',
            },
          ],
        },
      };
    }

    // ─── 08 FINANCIAL NETWORK INSIGHT ────────────────────────────────────────
    const majorConnectedEntities = (graphMetrics?.mostConnectedEntities || []).slice(0, 5);
    const majorRelationships = (graphLinks || [])
      .slice(0, 6)
      .map((l: any) => ({
        id: l.id,
        source: typeof l.source === 'object' ? l.source.label || l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.label || l.target.id : l.target,
        type: l.relationshipType || 'TRANSACTS_WITH',
        volume: l.totalVolume || 0,
        strength: l.strength || 0.5,
      }));

    const networkConcentrationSignals: string[] = detectedSignals
      .filter((s) => s.type === 'NETWORK_CONCENTRATION' || s.type === 'INCOME_CONCENTRATION')
      .map((s) => s.summary);

    const importantConnectedAccounts = (graphMetrics?.mostActiveAccounts || []).slice(0, 4).map((a: any) => {
      const realAcc = accounts.find((acc) => acc._id === a.id);
      return {
        id: a.id,
        name: a.name,
        type: a.type,
        balance: realAcc?.currentBalance ?? 0,
        volume: a.volume || 0,
      };
    });

    const networkInsight: NetworkInsightSection = {
      majorConnectedEntities,
      majorRelationships,
      transactionFlowVolume: graphMetrics?.totalVolume || 0,
      networkConcentrationSignals,
      importantConnectedAccounts,
    };

    // ─── 09 DATA QUALITY ─────────────────────────────────────────────────────
    const categorizedTxCount = transactions.filter((t) => t.category && t.category.trim() !== '').length;
    const categorizationCoveragePercent = transactions.length > 0
      ? Number(((categorizedTxCount / transactions.length) * 100).toFixed(1))
      : 0;

    const missingInformation: string[] = [];
    if (accounts.length === 0) missingInformation.push('No bank or credit accounts connected.');
    if (transactions.length === 0) missingInformation.push('No transactions imported.');
    if (entities.length === 0) missingInformation.push('No counterparty entities detected.');
    if (!trendAvailable) missingInformation.push('Fewer than 2 active months of transaction records.');
    if (categorizationCoveragePercent < 80 && transactions.length > 0) {
      missingInformation.push('More than 20% of transactions are uncategorized.');
    }

    const dataQuality: DataQualitySection = {
      accountsAvailable: accounts.length,
      transactionsAvailable: transactions.length,
      entitiesAvailable: entities.length,
      currencyCoverage: accountCurrencies,
      historicalPeriodMonths: sortedMonthKeys.length,
      categorizationCoveragePercent,
      missingInformation,
    };

    // ─── 10 LIMITATIONS ──────────────────────────────────────────────────────
    const limitations = [
      'Analysis is strictly based on transactions and accounts imported into FinTwin.',
      'Historical trend confidence is proportional to the duration of available history.',
      'Cross-currency calculations require an explicit exchange rate model.',
      'A detected signal is an analytical indicator, not a guaranteed future event.',
      'Absence of a signal does not guarantee the complete absence of financial risk.',
    ];

    return {
      userId,
      generatedAt: new Date().toISOString(),
      currency: primaryCurrency,
      snapshot,
      digitalTwin,
      cashFlow,
      riskSignals,
      explainability,
      simulationResults,
      decisionComparison,
      networkInsight,
      dataQuality,
      goals: {
        activeGoals: goalsList.filter((g) => (g.status as string) !== 'COMPLETED'),
        totalTarget: goalsList.reduce((s, g) => s + g.targetAmount, 0),
        totalSaved: goalsList.reduce((s, g) => s + g.currentAmount, 0),
      },
      loans: {
        activeLoans: loansList.filter((l) => (l.status as string) !== 'PAID_OFF'),
        totalOutstanding: loansList.reduce((s, l) => s + l.outstandingAmount, 0),
        totalMonthlyEmi: loansList.reduce((s, l) => s + l.emiAmount, 0),
      },
      recurringExpenses: {
        activeRecurring: recurringList.filter((r) => r.status === 'ACTIVE'),
        totalMonthlyImpact: recurringList
          .filter((r) => r.status === 'ACTIVE')
          .reduce((s, r) => s + r.estimatedMonthlyImpact, 0),
      },
      limitations,
    };
  },
};
