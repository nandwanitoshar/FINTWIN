/**
 * projectionService.ts
 * Phase B — 12-Month Financial Projection Engine
 *
 * Deterministic month-by-month 12-month forecasting comparing:
 * - BASELINE (run-rate from actual verified user ledger transactions)
 * - SIMULATED DECISION (prospective outlays, EMI tenures, recurring additions)
 *
 * Guaranteed Properties:
 * 1. Non-mutating: Never writes or modifies actual financial accounts or transactions.
 * 2. Deterministic math: S(t+1) = S(t) + Income - Expenses - DebtService.
 * 3. Transparent assumptions: Explains the exact historical derivation or highlights data limitations.
 * 4. Strictly isolated by authenticated user ID.
 */

import { SimulationEngine } from './simulationEngine.js';
import { calculateLoanEMI } from '../utils/financialMath.js';

export interface MonthlyProjectionItem {
  month: number;
  monthLabel: string;
  startingBalance: number;
  income: number;
  expenses: number;
  debtService: number;
  savings: number;
  endingBalance: number;
  runwayMonths: number | null;
}

export interface ProjectionSimulationInputs {
  purchaseAmount?: number;
  paymentMode?: 'CASH' | 'EMI';
  emiMonths?: number;
  annualRate?: number;
  recurringExpense?: number;
  incomeChange?: number;
  savingsContribution?: number;
  startMonth?: number;
}

export interface ProjectionResult {
  hasHistoricalData: boolean;
  baseline: MonthlyProjectionItem[];
  simulated: MonthlyProjectionItem[];
  summary: {
    startingBalance: number;
    baselineEndingBalance: number;
    simulatedEndingBalance: number;
    difference: number;
    lowestSimulatedBalance: number;
    solvencyBreached: boolean;
    affordabilityRating: 'LOW IMPACT' | 'MODERATE IMPACT' | 'HIGH IMPACT';
    explanation: string;
  };
  assumptions: string[];
  dataLineage: {
    activeMonthsCount: number;
    totalTransactionsCount: number;
    accountsCount: number;
    baseIncome: number;
    baseExpenses: number;
    baseDebtService: number;
  };
}

export const ProjectionService = {
  /**
   * Generates a deterministic 12-month month-by-month projection.
   */
  async get12MonthProjection(
    userId: string,
    inputs: ProjectionSimulationInputs = {}
  ): Promise<ProjectionResult> {
    const baselineData = await SimulationEngine.getFinancialBaseline(userId);

    const initialLiquid = baselineData.units.liquidReserves;
    const baseIncome = baselineData.units.monthlyIncome;
    const baseExpenses = baselineData.units.monthlyExpenses;
    const baseDebtService = baselineData.units.monthlyDebtService;
    const hasHistoricalData = baselineData.transactions.length > 0;

    const assumptions: string[] = [];
    if (hasHistoricalData) {
      assumptions.push(
        `Baseline cash flow derived from ${baselineData.transactions.length} historical ledger transactions across ${baselineData.activeMonthsCount} active month(s) (Average Income: ₹${baseIncome.toLocaleString()}, Average Expenses: ₹${baseExpenses.toLocaleString()}).`
      );
    } else {
      assumptions.push(
        'No historical transaction records found. Baseline recurring income and expenses are conservatively modeled as ₹0. Projection displays current liquid reserves trajectory.'
      );
    }
    assumptions.push('Deterministic balance equation: Ending Balance = Starting Balance + Income - Expenses - Debt/EMI.');

    const currentDate = new Date();

    // 1. Generate Baseline 12-Month Projection
    const baseline: MonthlyProjectionItem[] = [];
    let currentBaselineBalance = initialLiquid;

    for (let m = 1; m <= 12; m++) {
      const projDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + m, 1);
      const monthLabel = projDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const starting = Math.round(currentBaselineBalance);
      const inc = Math.round(baseIncome);
      const exp = Math.round(baseExpenses);
      const debt = Math.round(baseDebtService);
      const savings = inc - exp - debt;
      const ending = Math.max(0, starting + savings);

      const runway = exp + debt > 0 ? parseFloat((ending / (exp + debt)).toFixed(1)) : null;

      baseline.push({
        month: m,
        monthLabel,
        startingBalance: starting,
        income: inc,
        expenses: exp,
        debtService: debt,
        savings,
        endingBalance: ending,
        runwayMonths: runway,
      });

      currentBaselineBalance = ending;
    }

    // 2. Parse & Normalize Simulation Inputs
    const purchaseAmount = Math.max(0, inputs.purchaseAmount || 0);
    const paymentMode = inputs.paymentMode === 'EMI' ? 'EMI' : 'CASH';
    const emiMonths = Math.max(1, inputs.emiMonths || 6);
    const annualRate = inputs.annualRate !== undefined ? Math.max(0, inputs.annualRate) : 14;
    const recurringExpense = Math.max(0, inputs.recurringExpense || 0);
    const incomeChange = inputs.incomeChange || 0;
    const savingsContribution = Math.max(0, inputs.savingsContribution || 0);
    const startMonth = Math.max(1, inputs.startMonth || 1);

    const calculatedEmi =
      paymentMode === 'EMI' && purchaseAmount > 0
        ? Math.round(calculateLoanEMI(purchaseAmount, annualRate, emiMonths))
        : 0;

    if (purchaseAmount > 0) {
      if (paymentMode === 'CASH') {
        assumptions.push(`Simulation models one-time upfront purchase of ₹${purchaseAmount.toLocaleString()} in Month 1.`);
      } else {
        assumptions.push(
          `Simulation models ₹${purchaseAmount.toLocaleString()} financed over ${emiMonths} months at ${annualRate}% APR (EMI = ₹${calculatedEmi.toLocaleString()}/month from Month ${startMonth} to Month ${startMonth + emiMonths - 1}).`
        );
      }
    }
    if (recurringExpense > 0) {
      assumptions.push(`Simulation models additional recurring expense of ₹${recurringExpense.toLocaleString()}/month.`);
    }
    if (incomeChange !== 0) {
      assumptions.push(
        `Simulation models recurring income change of ${incomeChange > 0 ? '+' : ''}₹${incomeChange.toLocaleString()}/month.`
      );
    }
    if (savingsContribution > 0) {
      assumptions.push(
        `Simulation models dedicated savings contribution of ₹${savingsContribution.toLocaleString()}/month.`
      );
    }

    // 3. Generate Simulated 12-Month Projection
    const simulated: MonthlyProjectionItem[] = [];
    let currentSimBalance = initialLiquid;
    let lowestSimulatedBalance = initialLiquid;

    for (let m = 1; m <= 12; m++) {
      const projDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + m, 1);
      const monthLabel = projDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const starting = Math.round(currentSimBalance);

      // Upfront lump-sum deduction in Month 1 if CASH
      const lumpSum = m === 1 && paymentMode === 'CASH' ? purchaseAmount : 0;

      // EMI addition if loan active
      const isEmiActive = paymentMode === 'EMI' && m >= startMonth && m < startMonth + emiMonths;
      const simDebt = Math.round(baseDebtService + (isEmiActive ? calculatedEmi : 0));

      const simInc = Math.max(0, Math.round(baseIncome + incomeChange));
      const simExp = Math.round(baseExpenses + recurringExpense + lumpSum);
      const savings = simInc - simExp - simDebt - savingsContribution;
      const ending = Math.max(0, starting + savings);

      if (ending < lowestSimulatedBalance) {
        lowestSimulatedBalance = ending;
      }

      const totalMonthlyOutflow = simExp + simDebt;
      const runway = totalMonthlyOutflow > 0 ? parseFloat((ending / totalMonthlyOutflow).toFixed(1)) : null;

      simulated.push({
        month: m,
        monthLabel,
        startingBalance: starting,
        income: simInc,
        expenses: simExp,
        debtService: simDebt,
        savings,
        endingBalance: ending,
        runwayMonths: runway,
      });

      currentSimBalance = ending;
    }

    // 4. Summarize Comparison & Affordability
    const baselineEnding = baseline[11]?.endingBalance || 0;
    const simulatedEnding = simulated[11]?.endingBalance || 0;
    const difference = simulatedEnding - baselineEnding;
    const solvencyBreached = lowestSimulatedBalance <= 0;

    let affordabilityRating: 'LOW IMPACT' | 'MODERATE IMPACT' | 'HIGH IMPACT' = 'LOW IMPACT';
    let explanation = 'The proposed prospective decision maintains a comfortable liquidity runway with manageable impact.';

    const minRunwaySim = Math.min(
      ...simulated.map((s) => (s.runwayMonths !== null ? s.runwayMonths : 999))
    );

    if (solvencyBreached || minRunwaySim < 2.0 || (paymentMode === 'CASH' && purchaseAmount > initialLiquid)) {
      affordabilityRating = 'HIGH IMPACT';
      explanation =
        'Decision creates elevated financial vulnerability: projected liquid reserves dip below 2 months or trigger liquidity deficit.';
    } else if (minRunwaySim < 4.0 || Math.abs(difference) > initialLiquid * 0.4) {
      affordabilityRating = 'MODERATE IMPACT';
      explanation =
        'Decision noticeably draws down liquidity buffer (runway between 2.0 and 4.0 months). Manageable with budget discipline.';
    }

    return {
      hasHistoricalData,
      baseline,
      simulated,
      summary: {
        startingBalance: Math.round(initialLiquid),
        baselineEndingBalance: baselineEnding,
        simulatedEndingBalance: simulatedEnding,
        difference,
        lowestSimulatedBalance,
        solvencyBreached,
        affordabilityRating,
        explanation,
      },
      assumptions,
      dataLineage: {
        activeMonthsCount: baselineData.activeMonthsCount,
        totalTransactionsCount: baselineData.transactions.length,
        accountsCount: baselineData.accounts.length,
        baseIncome,
        baseExpenses,
        baseDebtService,
      },
    };
  },
};
