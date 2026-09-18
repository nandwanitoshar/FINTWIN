import { DigitalTwinService } from './digitalTwinService.js';
import { AccountRepository, IAccount } from '../models/Account.js';
import { TransactionRepository, ITransaction } from '../models/Transaction.js';
import { calculateLoanEMI, calculateRunway, calculateDTI, calculateNetWorth } from '../utils/financialMath.js';
import { toPaise, fromPaise } from '../utils/calculations.js';
import { SimulationScenarioRepository, ISimulationScenario } from '../models/SimulationScenario.js';

export type SimulationScenarioType =
  | 'PURCHASE'
  | 'LOAN_EMI'
  | 'RECURRING_EXPENSE'
  | 'INCOME_CHANGE'
  | 'SAVINGS_CONTRIBUTION'
  | 'CUSTOM';

export interface ScenarioInputParams {
  userId: string;
  scenarioType?: SimulationScenarioType;
  scenarioName?: string;
  amount?: number;
  amountPaise?: number;
  currency?: string;
  targetAccountId?: string;
  category?: string;
  description?: string;

  // Loan/EMI specific
  principal?: number;
  annualRate?: number;
  tenureMonths?: number;
  processingFee?: number;
  startMonth?: number;

  // Recurring / Income / Custom specific
  frequency?: 'ONE_OFF' | 'MONTHLY' | 'WEEKLY' | 'ANNUAL';
  durationMonths?: number;
  direction?: 'INFLOW' | 'OUTFLOW';
  emergencyFundMonths?: number;

  // Legacy / Multi-event fields for backwards compatibility
  baseIncome?: number;
  baseBurn?: number;
  incomeDelta?: number;
  expenseDelta?: number;
  lumpSumEvents?: Array<{
    month: number;
    amount: number;
    description: string;
    accountId?: string;
  }>;
  newEmiEvents?: Array<{
    principal: number;
    annualRate: number;
    tenureMonths: number;
    startMonth?: number;
    description: string;
  }>;
  horizonMonths?: number;
}

export interface StateSnapshot {
  totalBalance: number;
  totalBalancePaise: number;
  monthlyIncome: number;
  monthlyIncomePaise: number;
  monthlyExpenses: number;
  monthlyExpensesPaise: number;
  netCashFlow: number;
  netCashFlowPaise: number;
  liquidReserves: number;
  liquidReservesPaise: number;
  netWorth: number;
  netWorthPaise: number;
  totalDebt: number;
  totalDebtPaise: number;
  runwayMonths: number | null;
  emergencyFundCoverageMonths: number | null;
  dtiPercent: number;
}

export interface SimulationImpact {
  balanceChange: number;
  balanceChangePaise: number;
  cashFlowChange: number;
  cashFlowChangePaise: number;
  netWorthChange: number;
  netWorthChangePaise: number;
  debtChange: number;
  debtChangePaise: number;
  runwayChangeMonths: number | null;
  dtiDeltaPercent: number;
  emergencyFundImpact: string;
  percentageBalanceChange: number;
  isSufficientBalance: boolean;
}

export interface ComparisonRequestParams {
  userId: string;
  purchaseAmount: number;
  currency?: string;
  targetAccountId?: string;
  delayMonths?: number;
  cheaperAmount?: number;
  description?: string;
  emergencyFundMonths?: number;
}

export const SimulationEngine = {
  /**
   * Helper to retrieve verified baseline financial state and historical cash flow
   */
  async getFinancialBaseline(userId: string, targetAccountId?: string, requestedCurrency?: string) {
    const [accounts, { transactions }] = await Promise.all([
      AccountRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId, { limit: 1000 }),
    ]);

    const twin = await DigitalTwinService.getTwinState(userId);

    // Multi-currency safety check
    const accountCurrencies = Array.from(new Set(accounts.map((a) => a.currency || 'INR')));
    const currency = requestedCurrency || (accounts[0]?.currency || 'INR');

    if (accountCurrencies.length > 1 && !targetAccountId) {
      // Check if user requested a specific currency matching some accounts
      if (requestedCurrency && !accountCurrencies.includes(requestedCurrency)) {
        throw new Error(`Unsupported currency ${requestedCurrency}. Available account currencies: ${accountCurrencies.join(', ')}`);
      }
    }

    // Target Account resolution
    let targetAccount: IAccount | null = null;
    if (targetAccountId) {
      targetAccount = accounts.find((a) => a._id === targetAccountId) || null;
      if (!targetAccount) {
        throw new Error('Target account not found or unauthorized.');
      }
      if (requestedCurrency && targetAccount.currency && targetAccount.currency !== requestedCurrency) {
        throw new Error(`Cross-currency simulation between ${requestedCurrency} and account currency ${targetAccount.currency} requires an explicit exchange rate.`);
      }
    } else {
      // Pick primary liquid checking/savings account or first account
      targetAccount =
        accounts.find((a) => a.type === 'CHECKING' && a.isLiquid) ||
        accounts.find((a) => a.isLiquid) ||
        accounts[0] ||
        null;
    }

    // Baseline Assets, Liabilities & Liquidity using exact integer paise
    let totalAssetsPaise = 0;
    let liquidReservesPaise = 0;
    let totalDebtPaise = 0;

    for (const acc of accounts) {
      const bal = acc.currentBalance ?? acc.balance ?? 0;
      const paise = toPaise(bal);
      if (['CREDIT_CARD', 'LOAN'].includes(acc.type)) {
        totalDebtPaise += paise;
      } else {
        totalAssetsPaise += paise;
        if (acc.isLiquid) {
          liquidReservesPaise += paise;
        }
      }
    }

    const netWorthPaise = totalAssetsPaise - totalDebtPaise;

    // Historical Cash Flow Analysis (Prefer last 3 calendar months)
    let totalIncomePaise = 0;
    let totalExpensesPaise = 0;
    let monthlyDebtPaymentsPaise = 0;
    let activeMonthsCount = 1;

    if (transactions.length > 0) {
      const monthBuckets = new Set<string>();
      for (const tx of transactions) {
        const d = new Date(tx.date);
        monthBuckets.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
        const p = toPaise(tx.amount || 0);
        const tType = tx.type as string;
        if (tType === 'CREDIT' || tType === 'INCOME') {
          totalIncomePaise += p;
        } else if (tType === 'DEBIT' || tType === 'EXPENSE') {
          totalExpensesPaise += p;
        }
      }

      activeMonthsCount = Math.max(1, Math.min(3, monthBuckets.size));
    }

    // Monthly baseline averages in paise
    const monthlyIncomePaise = Math.round(totalIncomePaise / activeMonthsCount);
    const monthlyExpensesPaise = Math.round(totalExpensesPaise / activeMonthsCount);
    const netCashFlowPaise = monthlyIncomePaise - monthlyExpensesPaise;

    // Baseline debt service
    for (const acc of accounts) {
      if (acc.type === 'LOAN' || acc.type === 'CREDIT_CARD') {
        const bal = acc.currentBalance ?? 0;
        if (bal > 0) {
          monthlyDebtPaymentsPaise += toPaise(Math.round(bal * 0.05)); // Scheduled 5% minimum
        }
      }
    }

    const baseIncome = fromPaise(monthlyIncomePaise);
    const baseExpenses = fromPaise(monthlyExpensesPaise);
    const baseDebtService = fromPaise(monthlyDebtPaymentsPaise);
    const liquidReserves = fromPaise(liquidReservesPaise);
    const netWorth = fromPaise(netWorthPaise);
    const totalDebt = fromPaise(totalDebtPaise);
    const totalBalance = fromPaise(totalAssetsPaise);

    // Baseline Runway
    const baseRunway = baseExpenses > 0 ? calculateRunway(liquidReserves, baseExpenses) : null;
    const baseDti = calculateDTI(baseDebtService, baseIncome);

    return {
      accounts,
      transactions,
      twin,
      targetAccount,
      currency,
      activeMonthsCount,
      paise: {
        totalAssetsPaise,
        liquidReservesPaise,
        totalDebtPaise,
        netWorthPaise,
        monthlyIncomePaise,
        monthlyExpensesPaise,
        netCashFlowPaise,
        monthlyDebtPaymentsPaise,
      },
      units: {
        totalBalance,
        liquidReserves,
        totalDebt,
        netWorth,
        monthlyIncome: baseIncome,
        monthlyExpenses: baseExpenses,
        netCashFlow: fromPaise(netCashFlowPaise),
        monthlyDebtService: baseDebtService,
        runwayMonths: baseRunway,
        dtiPercent: baseDti,
      },
    };
  },

  /**
   * 05 SIMULATE: Runs deterministic prospective simulation comparing baseline vs scenario
   */
  async runSimulation(params: ScenarioInputParams) {
    const {
      userId,
      scenarioType = 'PURCHASE',
      scenarioName: rawScenarioName,
      amount: rawAmount,
      amountPaise: rawAmountPaise,
      currency: requestedCurrency,
      targetAccountId,
      category = 'General',
      description = '',
      principal: rawPrincipal,
      annualRate = 14,
      tenureMonths: rawTenure = 6,
      processingFee: rawProcessingFee = 0,
      startMonth = 1,
      frequency = 'MONTHLY',
      durationMonths = 12,
      direction = 'OUTFLOW',
      emergencyFundMonths = 3,
      // Legacy params
      baseIncome: overrideIncome,
      baseBurn: overrideBurn,
      incomeDelta = 0,
      expenseDelta = 0,
      lumpSumEvents = [],
      newEmiEvents = [],
      horizonMonths = 12,
    } = params;

    // 1. Fetch live baseline Digital Twin and financial records
    const baseline = await this.getFinancialBaseline(userId, targetAccountId, requestedCurrency);
    const currency = baseline.currency;
    const targetAccount = baseline.targetAccount;

    // Normalize purchase/scenario amount to integer paise
    let amount = 0;
    if (rawAmountPaise !== undefined && rawAmountPaise > 0) {
      amount = fromPaise(rawAmountPaise);
    } else if (rawAmount !== undefined) {
      amount = Math.max(0, rawAmount);
    }

    const principal = rawPrincipal !== undefined ? Math.max(0, rawPrincipal) : amount;
    const tenureMonths = Math.max(1, rawTenure);
    const processingFee = Math.max(0, rawProcessingFee);

    // Scenario Name defaults
    let scenarioName = rawScenarioName ? rawScenarioName.trim() : '';
    if (!scenarioName) {
      if (scenarioType === 'PURCHASE') {
        scenarioName = `Purchase ₹${amount.toLocaleString()} ${description || category}`.trim();
      } else if (scenarioType === 'LOAN_EMI') {
        scenarioName = `Loan ₹${principal.toLocaleString()} (${tenureMonths}m @ ${annualRate}%)`.trim();
      } else if (scenarioType === 'RECURRING_EXPENSE') {
        scenarioName = `Recurring Expense ₹${amount.toLocaleString()}/mo (${category})`.trim();
      } else if (scenarioType === 'INCOME_CHANGE') {
        scenarioName = `Income Adjustment ${direction === 'INFLOW' ? '+' : '-'}₹${amount.toLocaleString()}/mo`.trim();
      } else if (scenarioType === 'SAVINGS_CONTRIBUTION') {
        scenarioName = `Savings Contribution ₹${amount.toLocaleString()}/mo`.trim();
      } else {
        scenarioName = `Prospective Scenario (${category})`.trim();
      }
    }

    // Determine baseline cash flow numbers (allowing overrides if passed for sensitivity testing)
    const baseIncome = overrideIncome !== undefined ? overrideIncome : baseline.units.monthlyIncome;
    const baseExpenses = overrideBurn !== undefined ? overrideBurn : baseline.units.monthlyExpenses;
    const baseDebtService = baseline.units.monthlyDebtService;
    const initialLiquid = baseline.units.liquidReserves;
    const initialDebt = baseline.units.totalDebt;
    const initialNetWorth = baseline.units.netWorth;
    const initialBalance = targetAccount ? (targetAccount.currentBalance ?? targetAccount.balance ?? 0) : initialLiquid;

    // Precompute loan amortizations
    let activeEmiSchedules = [...newEmiEvents];
    if (scenarioType === 'LOAN_EMI' && principal > 0) {
      activeEmiSchedules.push({
        principal,
        annualRate,
        tenureMonths,
        startMonth,
        description: scenarioName,
      });
    }

    const precomputedEmis = activeEmiSchedules.map((loan) => {
      const sMonth = Math.max(1, loan.startMonth || 1);
      const emi = calculateLoanEMI(loan.principal, loan.annualRate, loan.tenureMonths);
      const totalRepay = Math.round(emi * loan.tenureMonths * 100) / 100;
      const totalInt = Math.round((totalRepay - loan.principal) * 100) / 100;
      return {
        ...loan,
        startMonth: sMonth,
        monthlyEmi: emi,
        totalRepayment: totalRepay,
        totalInterest: totalInt,
        remainingPrincipal: loan.principal,
      };
    });

    // 2. Compute Before State Snapshot
    const emergencyTargetPaise = toPaise(baseExpenses * emergencyFundMonths);
    const emergencyTarget = fromPaise(emergencyTargetPaise);
    const beforeCoverage = baseExpenses > 0 ? Math.round((initialLiquid / baseExpenses) * 10) / 10 : null;

    const before: StateSnapshot = {
      totalBalance: initialBalance,
      totalBalancePaise: toPaise(initialBalance),
      monthlyIncome: baseIncome,
      monthlyIncomePaise: toPaise(baseIncome),
      monthlyExpenses: baseExpenses,
      monthlyExpensesPaise: toPaise(baseExpenses),
      netCashFlow: Math.round((baseIncome - baseExpenses) * 100) / 100,
      netCashFlowPaise: toPaise(baseIncome - baseExpenses),
      liquidReserves: initialLiquid,
      liquidReservesPaise: toPaise(initialLiquid),
      netWorth: initialNetWorth,
      netWorthPaise: toPaise(initialNetWorth),
      totalDebt: initialDebt,
      totalDebtPaise: toPaise(initialDebt),
      runwayMonths: baseExpenses > 0 ? calculateRunway(initialLiquid, baseExpenses) : null,
      emergencyFundCoverageMonths: beforeCoverage,
      dtiPercent: calculateDTI(baseDebtService, baseIncome),
    };

    // 3. Month-by-month deterministic time-series projection
    const baselineSeries: Array<{
      month: number;
      netWorth: number;
      liquidReserves: number;
      debt: number;
      runwayMonths: number;
      dtiPercent: number;
    }> = [];

    const simulatedSeries: Array<{
      month: number;
      netWorth: number;
      liquidReserves: number;
      debt: number;
      runwayMonths: number;
      dtiPercent: number;
      emiBurden: number;
    }> = [];

    const timeSeries: Array<{
      monthIndex: number;
      monthLabel: string;
      baselineNetWorth: number;
      simulatedNetWorth: number;
      baselineReserves: number;
      simulatedReserves: number;
      baselineDebt: number;
      simulatedDebt: number;
      baselineDti: number;
      simulatedDti: number;
      baselineRunway: number;
      simulatedRunway: number;
      emiBurden: number;
    }> = [];

    const timeline: Array<{
      month: number;
      monthLabel: string;
      balance: number;
      balancePaise: number;
      income: number;
      expenses: number;
      netCashFlow: number;
      netWorth: number;
      debt: number;
      runwayMonths: number | null;
      emiBurden: number;
    }> = [];

    const signalsTriggered: Array<{
      code: string;
      title: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      month: number;
      explanation: string;
    }> = [];

    const explanations: string[] = [];
    const assumptions: string[] = [];

    // Document Assumptions
    if (baseline.transactions.length > 0) {
      assumptions.push(
        `Baseline cash flow derived from ${baseline.transactions.length} transactions across ${baseline.activeMonthsCount} month(s) of history (Avg Income: ₹${baseIncome.toLocaleString()}, Avg Expenses: ₹${baseExpenses.toLocaleString()}).`
      );
    } else {
      assumptions.push('No historical transaction records found; baseline recurring cash flow is modeled as zero.');
    }
    assumptions.push('Deterministic cash balance recurrence follows: B(t+1) = B(t) + Income - Expenses - EMI - LumpSum.');
    if (scenarioType === 'PURCHASE') {
      assumptions.push('Purchased item is treated as an immediate cash outflow rather than an appreciating asset.');
    }
    if (scenarioType === 'LOAN_EMI') {
      assumptions.push(`Loan amortization uses exact standard formula: M = P * [r(1+r)^n] / [(1+r)^n - 1] at ${annualRate}% APR.`);
    }

    // Step-by-step month recurrence
    let baseL = initialLiquid;
    let baseD = initialDebt;
    let baseW = initialNetWorth;

    let simL = initialLiquid;
    let totalNewDebt = precomputedEmis.reduce((s, e) => s + e.principal, 0);
    let simD = initialDebt + totalNewDebt;
    let simW = initialNetWorth;

    // Immediate month 1 purchase or disbursement effects
    if (scenarioType === 'PURCHASE') {
      simL -= amount;
      simW -= amount;
    } else if (scenarioType === 'LOAN_EMI') {
      simL += (principal - processingFee);
      simW -= processingFee;
    }

    const maxHorizon = Math.max(horizonMonths, scenarioType === 'LOAN_EMI' ? Math.min(60, tenureMonths) : 12);

    for (let m = 1; m <= maxHorizon; m++) {
      // Baseline Step
      const baseMonthlySavings = baseIncome - baseExpenses - baseDebtService;
      baseL += baseMonthlySavings;
      if (baseD > 0) {
        const debtReduction = Math.min(baseD, Math.max(baseDebtService, Math.round(baseD * 0.05)));
        baseD = Math.max(0, baseD - debtReduction);
      }
      baseW += baseMonthlySavings;
      const baseRunway = baseExpenses > 0 ? calculateRunway(baseL, baseExpenses + baseDebtService) : 999;
      const baseDti = calculateDTI(baseDebtService, baseIncome);

      const roundedBaseW = Math.round(baseW);
      const roundedBaseL = Math.max(0, Math.round(baseL));
      const roundedBaseD = Math.round(baseD);

      baselineSeries.push({
        month: m,
        netWorth: roundedBaseW,
        liquidReserves: roundedBaseL,
        debt: roundedBaseD,
        runwayMonths: baseRunway,
        dtiPercent: baseDti,
      });

      // Simulated Step adjustments
      let simMonthIncome = baseIncome + incomeDelta;
      let simMonthExpenses = baseExpenses + expenseDelta;

      if (scenarioType === 'INCOME_CHANGE' && m <= durationMonths) {
        if (direction === 'INFLOW') {
          simMonthIncome += amount;
        } else {
          simMonthIncome = Math.max(0, simMonthIncome - amount);
        }
      } else if (scenarioType === 'RECURRING_EXPENSE' && m <= durationMonths) {
        let monthlyRecurringDelta = amount;
        if (frequency === 'WEEKLY') monthlyRecurringDelta = Math.round(amount * (52 / 12));
        else if (frequency === 'ANNUAL') monthlyRecurringDelta = Math.round(amount / 12);

        if (direction === 'INFLOW') {
          // Removing or reducing a recurring expense frees up monthly cash flow
          simMonthExpenses = Math.max(0, simMonthExpenses - monthlyRecurringDelta);
        } else {
          // Adding or increasing a recurring expense adds to monthly outflow
          simMonthExpenses += monthlyRecurringDelta;
        }
      } else if (scenarioType === 'SAVINGS_CONTRIBUTION' && m <= durationMonths) {
        // Savings contribution preserves net worth, transfers from liquid cash
        // Handled in cash allocations
      }

      // Lump sum events for month m
      let monthLumpSum = 0;
      for (const ev of lumpSumEvents) {
        if (ev.month === m) {
          monthLumpSum += ev.amount;
        }
      }

      // EMI burden in month m
      let monthEmiBurden = 0;
      for (const loan of precomputedEmis) {
        if (m >= loan.startMonth && m < loan.startMonth + loan.tenureMonths) {
          monthEmiBurden += loan.monthlyEmi;
          const monthlyRate = loan.annualRate / 12 / 100;
          const interestPortion = loan.remainingPrincipal * monthlyRate;
          const principalPortion = Math.max(0, loan.monthlyEmi - interestPortion);
          loan.remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPortion);
          simD = Math.max(0, simD - principalPortion);
        }
      }

      const totalSimDebtService = baseDebtService + monthEmiBurden;
      const totalSimOutflows = simMonthExpenses + monthLumpSum + totalSimDebtService;
      const simMonthlyNet = simMonthIncome - totalSimOutflows;

      simL += simMonthlyNet;
      simW += simMonthlyNet;

      const simRunway = totalSimOutflows > 0 ? calculateRunway(simL, totalSimOutflows) : 999;
      const simDti = calculateDTI(totalSimDebtService, simMonthIncome);

      const roundedSimW = Math.round(simW);
      const roundedSimL = Math.max(0, Math.round(simL));
      const roundedSimD = Math.round(simD);

      // Trigger factual Risk Signals
      if (simL <= 0) {
        signalsTriggered.push({
          code: 'SIGNAL_INSOLVENCY_BREACH',
          title: 'Liquidity Depletion / Insolvency Breach',
          severity: 'CRITICAL',
          month: m,
          explanation: `Projected liquid reserves drop to or below zero (₹${Math.round(simL).toLocaleString()}) in Month ${m}. Immediate mitigation required.`,
        });
      } else if (simRunway < 3.0) {
        signalsTriggered.push({
          code: 'SIGNAL_LIQUIDITY_RUNWAY_CRITICAL',
          title: 'Liquidity Runway Drops Below 3 Months',
          severity: simRunway < 1.5 ? 'CRITICAL' : 'HIGH',
          month: m,
          explanation: `Projected liquidity runway drops to ${simRunway} months in Month ${m}, below the recommended 3.0-month safety threshold.`,
        });
      }

      if (simDti > 40) {
        signalsTriggered.push({
          code: 'SIGNAL_HIGH_DTI',
          title: simDti > 50 ? 'Critical Debt Burden (DTI > 50%)' : 'Elevated Debt Service (DTI > 40%)',
          severity: simDti > 50 ? 'CRITICAL' : 'HIGH',
          month: m,
          explanation: `Debt-to-Income ratio surges to ${simDti}% in Month ${m} (safe threshold is ≤ 40%).`,
        });
      }

      if (initialLiquid > 0 && simL < initialLiquid * 0.5 && !signalsTriggered.some((s) => s.code === 'SIGNAL_RESERVE_DEPLETION')) {
        signalsTriggered.push({
          code: 'SIGNAL_RESERVE_DEPLETION',
          title: 'Substantial Reserve Depletion (> 50%)',
          severity: 'MEDIUM',
          month: m,
          explanation: `Liquid reserves depleted by over 50% relative to baseline starting position by Month ${m}.`,
        });
      }

      simulatedSeries.push({
        month: m,
        netWorth: roundedSimW,
        liquidReserves: roundedSimL,
        debt: roundedSimD,
        runwayMonths: simRunway,
        dtiPercent: simDti,
        emiBurden: Math.round(monthEmiBurden),
      });

      timeSeries.push({
        monthIndex: m,
        monthLabel: `Month ${m}`,
        baselineNetWorth: roundedBaseW,
        simulatedNetWorth: roundedSimW,
        baselineReserves: roundedBaseL,
        simulatedReserves: roundedSimL,
        baselineDebt: roundedBaseD,
        simulatedDebt: roundedSimD,
        baselineDti: baseDti,
        simulatedDti: simDti,
        baselineRunway: baseRunway,
        simulatedRunway: simRunway,
        emiBurden: Math.round(monthEmiBurden),
      });

      timeline.push({
        month: m,
        monthLabel: `Month ${m}`,
        balance: roundedSimL,
        balancePaise: toPaise(roundedSimL),
        income: Math.round(simMonthIncome),
        expenses: Math.round(simMonthExpenses + monthLumpSum),
        netCashFlow: Math.round(simMonthlyNet),
        netWorth: roundedSimW,
        debt: roundedSimD,
        runwayMonths: simRunway >= 999 ? null : simRunway,
        emiBurden: Math.round(monthEmiBurden),
      });
    }

    // 4. Compute After State Snapshot & Impact Metrics
    let afterBalance = initialBalance;
    let afterLiquid = initialLiquid;
    let afterDebt = initialDebt;
    let afterNetWorth = initialNetWorth;
    let afterIncome = baseIncome;
    let afterExpenses = baseExpenses;

    if (scenarioType === 'PURCHASE') {
      afterBalance = initialBalance - amount;
      afterLiquid = initialLiquid - amount;
      afterNetWorth = initialNetWorth - amount;
      explanations.push(
        `Selected account (${targetAccount?.name || 'Primary Hub'}) balance shifts from ₹${initialBalance.toLocaleString()} to ₹${afterBalance.toLocaleString()} (-₹${amount.toLocaleString()}).`
      );
      if (amount > initialBalance) {
        explanations.push(
          `Warning: Outlay exceeds current account balance by ₹${(amount - initialBalance).toLocaleString()}. Balance becomes negative.`
        );
      }
    } else if (scenarioType === 'LOAN_EMI') {
      const emiObj = precomputedEmis[0];
      afterBalance = initialBalance + principal - processingFee;
      afterLiquid = initialLiquid + principal - processingFee;
      afterDebt = initialDebt + principal;
      afterNetWorth = initialNetWorth - processingFee;
      afterExpenses = baseExpenses + (emiObj?.monthlyEmi || 0);

      explanations.push(
        `Loan principal of ₹${principal.toLocaleString()} at ${annualRate}% APR incurs monthly EMI of ₹${(emiObj?.monthlyEmi || 0).toLocaleString()} for ${tenureMonths} months.`
      );
      explanations.push(
        `Total interest payable over tenure is ₹${(emiObj?.totalInterest || 0).toLocaleString()} (Total repayment: ₹${(emiObj?.totalRepayment || 0).toLocaleString()}).`
      );
      explanations.push(
        'Liquid cash increases temporarily by disbursed funds, while liabilities increase by principal. Net worth reflects fee deduction.'
      );
    } else if (scenarioType === 'RECURRING_EXPENSE') {
      afterExpenses = direction === 'INFLOW' ? Math.max(0, baseExpenses - amount) : baseExpenses + amount;
      explanations.push(
        `Monthly recurring expenses ${direction === 'INFLOW' ? 'decrease' : 'increase'} from ₹${baseExpenses.toLocaleString()} to ₹${afterExpenses.toLocaleString()} (${direction === 'INFLOW' ? '-' : '+'}₹${amount.toLocaleString()}/mo).`
      );
    } else if (scenarioType === 'INCOME_CHANGE') {
      afterIncome = direction === 'INFLOW' ? baseIncome + amount : Math.max(0, baseIncome - amount);
      explanations.push(
        `Monthly income adjusts from ₹${baseIncome.toLocaleString()} to ₹${afterIncome.toLocaleString()} (${direction === 'INFLOW' ? '+' : '-'}₹${amount.toLocaleString()}/mo).`
      );
    } else if (scenarioType === 'SAVINGS_CONTRIBUTION') {
      afterBalance = initialBalance - amount;
      explanations.push(
        `Monthly contribution of ₹${amount.toLocaleString()} transfers liquidity to savings target without destroying net worth.`
      );
    }

    const afterNetCashFlow = afterIncome - afterExpenses;
    const afterRunway = afterExpenses > 0 ? calculateRunway(afterLiquid, afterExpenses) : null;
    const afterCoverage = afterExpenses > 0 ? Math.round((afterLiquid / afterExpenses) * 10) / 10 : null;
    const afterDti = calculateDTI(baseDebtService + (precomputedEmis[0]?.monthlyEmi || 0), afterIncome);

    const after: StateSnapshot = {
      totalBalance: afterBalance,
      totalBalancePaise: toPaise(afterBalance),
      monthlyIncome: afterIncome,
      monthlyIncomePaise: toPaise(afterIncome),
      monthlyExpenses: afterExpenses,
      monthlyExpensesPaise: toPaise(afterExpenses),
      netCashFlow: Math.round(afterNetCashFlow * 100) / 100,
      netCashFlowPaise: toPaise(afterNetCashFlow),
      liquidReserves: afterLiquid,
      liquidReservesPaise: toPaise(afterLiquid),
      netWorth: afterNetWorth,
      netWorthPaise: toPaise(afterNetWorth),
      totalDebt: afterDebt,
      totalDebtPaise: toPaise(afterDebt),
      runwayMonths: afterRunway,
      emergencyFundCoverageMonths: afterCoverage,
      dtiPercent: afterDti,
    };

    // Emergency fund explanation
    let emergencyFundImpactStr = '';
    if (baseExpenses <= 0) {
      emergencyFundImpactStr = 'Emergency fund impact unavailable with current expense classification.';
    } else if (afterLiquid < emergencyTarget) {
      emergencyFundImpactStr = `Emergency fund coverage drops from ${beforeCoverage} to ${afterCoverage} months (below ${emergencyFundMonths}-month target of ₹${emergencyTarget.toLocaleString()}).`;
      explanations.push(emergencyFundImpactStr);
    } else {
      emergencyFundImpactStr = `Emergency fund coverage remains safe at ${afterCoverage} months (target: ${emergencyFundMonths} months).`;
      explanations.push(emergencyFundImpactStr);
    }

    // Runway explanation
    if (before.runwayMonths !== null && after.runwayMonths !== null) {
      const runwayDelta = Math.round((after.runwayMonths - before.runwayMonths) * 10) / 10;
      explanations.push(
        `Liquidity runway shifts by ${runwayDelta >= 0 ? '+' : ''}${runwayDelta} months (from ${before.runwayMonths} to ${after.runwayMonths} months).`
      );
    }

    const balanceChange = afterBalance - initialBalance;
    const cashFlowChange = afterNetCashFlow - before.netCashFlow;
    const netWorthChange = afterNetWorth - initialNetWorth;
    const debtChange = afterDebt - initialDebt;
    const runwayChange =
      before.runwayMonths !== null && after.runwayMonths !== null
        ? Math.round((after.runwayMonths - before.runwayMonths) * 10) / 10
        : null;

    const impact: SimulationImpact = {
      balanceChange,
      balanceChangePaise: toPaise(balanceChange),
      cashFlowChange,
      cashFlowChangePaise: toPaise(cashFlowChange),
      netWorthChange,
      netWorthChangePaise: toPaise(netWorthChange),
      debtChange,
      debtChangePaise: toPaise(debtChange),
      runwayChangeMonths: runwayChange,
      dtiDeltaPercent: Math.round((afterDti - before.dtiPercent) * 10) / 10,
      emergencyFundImpact: emergencyFundImpactStr,
      percentageBalanceChange: initialBalance !== 0 ? Math.round((balanceChange / initialBalance) * 1000) / 10 : 0,
      isSufficientBalance: initialBalance >= amount,
    };

    // 5. Backwards-compatible deltas
    const finalBase = baselineSeries[maxHorizon - 1] || baselineSeries[baselineSeries.length - 1];
    const finalSim = simulatedSeries[maxHorizon - 1] || simulatedSeries[simulatedSeries.length - 1];

    const netWorthDelta = finalSim ? finalSim.netWorth - finalBase.netWorth : netWorthChange;
    const liquidDelta = finalSim ? finalSim.liquidReserves - finalBase.liquidReserves : balanceChange;
    const runwayDeltaMonths =
      simulatedSeries[0] && baselineSeries[0]
        ? Math.round((simulatedSeries[0].runwayMonths - baselineSeries[0].runwayMonths) * 10) / 10
        : 0;

    const monthlyCashflowDelta = Math.round(cashFlowChange);
    const dtiDelta = Math.round((afterDti - before.dtiPercent) * 10) / 10;

    const deltas = {
      netWorthDelta,
      liquidDelta,
      runwayDeltaMonths,
      monthlyCashflowDelta,
      dtiDelta,
    };

    const summaryDeltas = {
      netWorthDelta,
      runwayMonthsDelta: runwayDeltaMonths,
      monthlyCashflowDelta,
      dtiDelta,
    };

    const results = {
      scenario: {
        type: scenarioType,
        scenarioName,
        amount,
        amountPaise: toPaise(amount),
        currency,
        targetAccountName: targetAccount?.name || 'Primary Liquid Hub',
        description,
      },
      before,
      after,
      impact,
      explanations,
      assumptions,
      timeline,
      baselineSeries,
      simulatedSeries,
      timeSeries,
      deltas,
      summaryDeltas,
      signalsTriggered,
    };

    // 6. Archive scenario in repository (TENANT ISOLATED, ZERO MUTATION OF REAL FINANCIAL DATA)
    const scenario = await SimulationScenarioRepository.create({
      userId,
      scenarioName,
      incomeDelta,
      expenseDelta,
      lumpSumEvents,
      newEmiEvents: precomputedEmis.map((e) => ({
        principal: e.principal,
        annualRate: e.annualRate,
        tenureMonths: e.tenureMonths,
        startMonth: e.startMonth || 1,
        description: e.description,
      })),
      horizonMonths: maxHorizon,
      results,
    });

    return {
      scenario,
      results,
    };
  },

  /**
   * Evaluates BUY NOW vs BUY LATER vs CHEAPER OPTION side-by-side
   */
  async compareScenarios(params: ComparisonRequestParams) {
    const {
      userId,
      purchaseAmount,
      currency: requestedCurrency,
      targetAccountId,
      delayMonths = 3,
      cheaperAmount: rawCheaperAmount,
      description = 'Prospective Purchase',
      emergencyFundMonths = 3,
    } = params;

    const cheaperAmount = rawCheaperAmount !== undefined ? rawCheaperAmount : Math.round(purchaseAmount * 0.7);

    // Run BUY NOW scenario
    const buyNowRes = await this.runSimulation({
      userId,
      scenarioType: 'PURCHASE',
      scenarioName: `BUY NOW: ₹${purchaseAmount.toLocaleString()} ${description}`,
      amount: purchaseAmount,
      currency: requestedCurrency,
      targetAccountId,
      description,
      emergencyFundMonths,
      horizonMonths: 12,
    });

    // Run BUY LATER scenario (Delay by delayMonths)
    const buyLaterRes = await this.runSimulation({
      userId,
      scenarioType: 'PURCHASE',
      scenarioName: `BUY LATER (in ${delayMonths} months): ₹${purchaseAmount.toLocaleString()} ${description}`,
      amount: purchaseAmount,
      currency: requestedCurrency,
      targetAccountId,
      description: `${description} deferred by ${delayMonths} months`,
      emergencyFundMonths,
      lumpSumEvents: [{ month: delayMonths, amount: purchaseAmount, description: `Deferred ${description}` }],
      horizonMonths: 12,
    });

    // Run CHEAPER OPTION scenario
    const cheaperRes = await this.runSimulation({
      userId,
      scenarioType: 'PURCHASE',
      scenarioName: `CHEAPER OPTION: ₹${cheaperAmount.toLocaleString()} ${description}`,
      amount: cheaperAmount,
      currency: requestedCurrency,
      targetAccountId,
      description: `Cheaper Alternative (${description})`,
      emergencyFundMonths,
      horizonMonths: 12,
    });

    const buyNow = buyNowRes.results;
    const buyLater = buyLaterRes.results;
    const cheaper = cheaperRes.results;

    const currencySymbol = buyNow.scenario.currency === 'USD' ? '$' : buyNow.scenario.currency === 'EUR' ? '€' : '₹';

    const comparisonMetrics = [
      {
        dimension: 'Outlay / Price',
        buyNow: `${currencySymbol}${purchaseAmount.toLocaleString()}`,
        buyLater: `${currencySymbol}${purchaseAmount.toLocaleString()}`,
        cheaperOption: `${currencySymbol}${cheaperAmount.toLocaleString()}`,
        description: 'Direct capital cost of option.',
      },
      {
        dimension: 'Purchase Timing',
        buyNow: 'Immediate (Month 1)',
        buyLater: `Deferred (${delayMonths} Months Later)`,
        cheaperOption: 'Immediate (Month 1)',
        description: 'Point in time when capital leaves accounts.',
      },
      {
        dimension: 'Immediate Liquid Impact',
        buyNow: `-${currencySymbol}${purchaseAmount.toLocaleString()}`,
        buyLater: 'No immediate impact',
        cheaperOption: `-${currencySymbol}${cheaperAmount.toLocaleString()}`,
        description: 'Day-one reduction in liquid reserves.',
      },
      {
        dimension: 'Projected Balance (Month 12)',
        buyNow: `${currencySymbol}${(buyNow.timeline[11]?.balance || 0).toLocaleString()}`,
        buyLater: `${currencySymbol}${(buyLater.timeline[11]?.balance || 0).toLocaleString()}`,
        cheaperOption: `${currencySymbol}${(cheaper.timeline[11]?.balance || 0).toLocaleString()}`,
        description: 'Simulated liquid cash remaining at the 12-month horizon.',
      },
      {
        dimension: 'Emergency Fund Coverage',
        buyNow: `${buyNow.after.emergencyFundCoverageMonths ?? 'N/A'} months`,
        buyLater: `${buyLater.after.emergencyFundCoverageMonths ?? 'N/A'} months`,
        cheaperOption: `${cheaper.after.emergencyFundCoverageMonths ?? 'N/A'} months`,
        description: 'Months of essential expenses preserved.',
      },
      {
        dimension: 'Liquidity Runway',
        buyNow: buyNow.after.runwayMonths !== null ? `${buyNow.after.runwayMonths} months` : 'Positive cashflow',
        buyLater: buyLater.after.runwayMonths !== null ? `${buyLater.after.runwayMonths} months` : 'Positive cashflow',
        cheaperOption: cheaper.after.runwayMonths !== null ? `${cheaper.after.runwayMonths} months` : 'Positive cashflow',
        description: 'Months of survival runway under current burn.',
      },
      {
        dimension: 'Net Worth Change',
        buyNow: `-${currencySymbol}${purchaseAmount.toLocaleString()}`,
        buyLater: `-${currencySymbol}${purchaseAmount.toLocaleString()}`,
        cheaperOption: `-${currencySymbol}${cheaperAmount.toLocaleString()}`,
        description: 'Total impact on accumulated personal wealth.',
      },
      {
        dimension: 'Capital Preserved vs Buy Now',
        buyNow: `${currencySymbol}0`,
        buyLater: `${currencySymbol}${(buyLater.timeline[delayMonths - 1]?.balance ?? 0) - (buyNow.timeline[delayMonths - 1]?.balance ?? 0) > 0 ? ((buyLater.timeline[delayMonths - 1]?.balance ?? 0) - (buyNow.timeline[delayMonths - 1]?.balance ?? 0)).toLocaleString() : '0'}`,
        cheaperOption: `+${currencySymbol}${(purchaseAmount - cheaperAmount).toLocaleString()}`,
        description: 'Difference in capital retained.',
      },
    ];

    const explanations = [
      `BUY NOW immediately draws ${currencySymbol}${purchaseAmount.toLocaleString()} from liquid reserves, reducing balance to ${currencySymbol}${buyNow.after.liquidReserves.toLocaleString()}.`,
      `BUY LATER preserves liquidity for ${delayMonths} months, allowing monthly savings to accumulate before the capital outlay in Month ${delayMonths}.`,
      `CHEAPER OPTION saves ${currencySymbol}${(purchaseAmount - cheaperAmount).toLocaleString()} upfront, maintaining higher emergency coverage.`,
    ];

    const assumptions = [
      'Comparisons assume constant recurring income and expenses based on verified historical transactions.',
      'Cheaper option assumes product meets user utility requirements without assessing subjective quality.',
      'Buy Later timing accounts for net monthly cash flow accumulated between present date and purchase month.',
    ];

    return {
      buyNow,
      buyLater,
      cheaperOption: cheaper,
      comparisonMetrics,
      explanations,
      assumptions,
    };
  },

  async getHistory(userId: string): Promise<ISimulationScenario[]> {
    return SimulationScenarioRepository.findByUserId(userId);
  },

  async getById(id: string, userId: string): Promise<ISimulationScenario | null> {
    return SimulationScenarioRepository.findById(id, userId);
  },

  async deleteScenario(id: string, userId: string): Promise<boolean> {
    return SimulationScenarioRepository.deleteById(id, userId);
  },
};
