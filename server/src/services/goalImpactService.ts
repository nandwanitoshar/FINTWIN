/**
 * goalImpactService.ts
 * Phase C — Goals + Goal Impact Analysis + Affordability Analysis
 *
 * Grounded strictly in real authenticated user data from:
 * - Accounts (liquid balances, debt)
 * - Transactions (monthly income, recurring expenses, surplus)
 * - Goals (target, current, target date, monthly contribution)
 * - Phase B Simulation Engine baseline & prospective projections
 *
 * NON-MUTATION GUARANTEE:
 * All simulations and affordability analyses are strictly prospective calculations
 * and NEVER mutate actual Goal, Account, Transaction, or Digital Twin database records.
 */

import { SimulationEngine } from './simulationEngine.js';
import { GoalRepository, IGoalWithCalculations } from '../models/Goal.js';
import { calculateLoanEMI, calculateRunway, calculateDTI } from '../utils/financialMath.js';
import { toPaise, fromPaise } from '../utils/calculations.js';

export interface GoalImpactRequest {
  userId: string;
  goalId?: string; // Optional: specific goal. If omitted, evaluates against the user's primary/active goals
  scenarioType?: 'PURCHASE' | 'LOAN_EMI' | 'RECURRING_EXPENSE' | 'SAVINGS_CONTRIBUTION';
  amount?: number;
  principal?: number;
  annualRate?: number;
  tenureMonths?: number;
  processingFee?: number;
  paymentMode?: 'OUTRIGHT' | 'EMI';
  targetAccountId?: string;
  description?: string;
}

export interface GoalImpactResult {
  goal: {
    id: string;
    name: string;
    category: string;
    targetAmount: number;
    currentAmount: number;
    amountRemaining: number;
    progressPercent: number;
    targetDate: string;
    monthlyContribution: number;
  };
  baseline: {
    monthsToComplete: number | null;
    estimatedCompletionDate: string | null;
    sustainableMonthlyContribution: number;
    projected12MonthBalance: number;
    status: string;
  };
  simulated: {
    monthsToComplete: number | null;
    estimatedCompletionDate: string | null;
    sustainableMonthlyContribution: number;
    projected12MonthBalance: number;
    status: string;
  };
  impact: {
    completionDateDeltaMonths: number;
    monthlyContributionDelta: number;
    projectedBalanceImpact: number;
    targetProgressImpact: 'ON_TRACK' | 'ACCELERATED' | 'DELAYED' | 'CRITICAL_RISK';
    explanation: string;
  };
  dataLineage: {
    dataUsed: string[];
    formulaUsed: string[];
    assumptions: string[];
    limitations: string[];
  };
}

export interface AffordabilityAnalysisResult {
  decision: {
    purchaseAmount: number;
    paymentMode: 'OUTRIGHT' | 'EMI';
    description: string;
  };
  evidence: {
    purchaseAmount: number;
    currentLiquidBalance: number;
    liquidBalanceAfter: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySurplusBefore: number;
    monthlySurplusAfter: number;
    emergencyRunwayBefore: number | null;
    emergencyRunwayAfter: number | null;
    debtEmiBurdenMonthly: number;
    dtiBeforePercent: number;
    dtiAfterPercent: number;
    projected12MonthBalanceBaseline: number;
    projected12MonthBalanceSimulated: number;
    goalImpactSummary: string;
  };
  status: 'LOW IMPACT' | 'MODERATE IMPACT' | 'HIGH IMPACT';
  statusReason: string;
  thresholds: {
    highImpactRule: string;
    moderateImpactRule: string;
    lowImpactRule: string;
  };
  goalImpact?: GoalImpactResult | null;
  comparison?: {
    dimension: string;
    baseline: string;
    buyNow: string;
    buyLater: string;
    cheaperOption: string;
  }[];
  dataLineage: {
    dataUsed: string[];
    formulaUsed: string[];
    assumptions: string[];
    limitations: string[];
  };
}

export const GoalImpactService = {
  /**
   * Deterministically simulates how a purchase or EMI decision affects a specific goal
   * WITHOUT mutating any database records.
   */
  async simulateGoalImpact(params: GoalImpactRequest): Promise<GoalImpactResult> {
    const { userId, goalId, scenarioType = 'PURCHASE', amount = 0, paymentMode = 'OUTRIGHT' } = params;

    // 1. Get baseline financial metrics from verified user ledger via SimulationEngine
    const baselineFin = await SimulationEngine.getFinancialBaseline(userId, params.targetAccountId);
    const baseIncome = baselineFin.units.monthlyIncome;
    const baseExpenses = baselineFin.units.monthlyExpenses;
    const baseDebtService = baselineFin.units.monthlyDebtService;
    const baseLiquid = baselineFin.units.liquidReserves;

    const baseMonthlySurplus = Math.round(baseIncome - baseExpenses - baseDebtService);

    // 2. Fetch Goal
    let goal: IGoalWithCalculations | null = null;
    if (goalId) {
      goal = await GoalRepository.findByIdAndUserId(goalId, userId);
      if (!goal) {
        throw new Error('Goal not found or unauthorized.');
      }
    } else {
      const userGoals = await GoalRepository.findByUserId(userId);
      goal = userGoals.find((g) => g.status === 'ACTIVE') || userGoals[0] || null;
      if (!goal) {
        throw new Error('No financial goal found for this user. Create a goal first to evaluate impact.');
      }
    }

    const remainingAmount = goal.calculations.amountRemaining;
    const targetAmount = goal.targetAmount;
    const currentAmount = goal.currentAmount;
    const explicitContribution = goal.monthlyContribution || 0;
    const requiredMonthly = goal.calculations.requiredMonthlyContribution;

    // Baseline goal contribution capacity:
    // If user specified an explicit contribution, use it; otherwise use required pace up to available surplus
    const baselinePace = explicitContribution > 0
      ? explicitContribution
      : requiredMonthly > 0
      ? requiredMonthly
      : Math.max(0, baseMonthlySurplus);

    const baseSustainableMonthly = Math.max(0, Math.min(baselinePace, baseMonthlySurplus > 0 ? baseMonthlySurplus : baselinePace));

    // Baseline completion calculation
    let baseMonthsToComplete: number | null = null;
    let baseEstimatedDate: string | null = null;

    if (remainingAmount <= 0) {
      baseMonthsToComplete = 0;
      baseEstimatedDate = 'COMPLETED';
    } else if (baseSustainableMonthly > 0) {
      baseMonthsToComplete = Math.ceil(remainingAmount / baseSustainableMonthly);
      const bDate = new Date();
      bDate.setMonth(bDate.getMonth() + baseMonthsToComplete);
      baseEstimatedDate = bDate.toISOString().split('T')[0];
    }

    // 3. Compute Simulated Decision Metrics
    let simOutlay = 0;
    let simMonthlyEmi = 0;
    let simRecurringDelta = 0;
    const tenure = params.tenureMonths || 6;
    const rate = params.annualRate || 14;

    if (paymentMode === 'EMI' || scenarioType === 'LOAN_EMI') {
      const principal = params.principal || amount;
      if (principal > 0) {
        simMonthlyEmi = calculateLoanEMI(principal, rate, tenure);
      }
    } else if (scenarioType === 'RECURRING_EXPENSE') {
      simOutlay = 0;
      const dir = (params as any).direction || 'OUTFLOW';
      simRecurringDelta = dir === 'INFLOW' ? -amount : amount;
    } else {
      simOutlay = amount;
    }

    // Impact on Monthly Surplus:
    const simMonthlySurplus = Math.round(baseMonthlySurplus - simMonthlyEmi - simRecurringDelta);

    // Simulated Goal Monthly Contribution:
    // If the monthly surplus drops below the planned goal contribution, goal contribution is throttled
    let simSustainableMonthly = baseSustainableMonthly;
    if (simMonthlySurplus < baseSustainableMonthly) {
      simSustainableMonthly = Math.max(0, simMonthlySurplus);
    }

    // Impact of Outright Purchase on Goal Capital:
    // If outright purchase draws from available liquid cash and liquid cash drops below what was set aside for the goal
    let simRemainingAmount = remainingAmount;
    let goalCapitalDrawdown = 0;

    if (simOutlay > 0) {
      const nonGoalLiquidReserves = Math.max(0, baseLiquid - currentAmount);
      if (simOutlay > nonGoalLiquidReserves && currentAmount > 0) {
        goalCapitalDrawdown = Math.min(currentAmount, simOutlay - nonGoalLiquidReserves);
        simRemainingAmount = Math.min(targetAmount, remainingAmount + goalCapitalDrawdown);
      }
    }

    // Simulated completion calculation
    let simMonthsToComplete: number | null = null;
    let simEstimatedDate: string | null = null;
    let deltaMonths = 0;
    let targetProgressImpact: 'ON_TRACK' | 'ACCELERATED' | 'DELAYED' | 'CRITICAL_RISK' = 'ON_TRACK';

    if (simRemainingAmount <= 0) {
      simMonthsToComplete = 0;
      simEstimatedDate = 'COMPLETED';
      deltaMonths = 0;
      targetProgressImpact = 'ON_TRACK';
    } else if (simSustainableMonthly > 0) {
      simMonthsToComplete = Math.ceil(simRemainingAmount / simSustainableMonthly);
      const sDate = new Date();
      sDate.setMonth(sDate.getMonth() + simMonthsToComplete);
      simEstimatedDate = sDate.toISOString().split('T')[0];

      if (baseMonthsToComplete !== null) {
        deltaMonths = simMonthsToComplete - baseMonthsToComplete;
      }

      if (deltaMonths > 6) {
        targetProgressImpact = 'CRITICAL_RISK';
      } else if (deltaMonths > 0) {
        targetProgressImpact = 'DELAYED';
      } else if (deltaMonths < 0) {
        targetProgressImpact = 'ACCELERATED';
      } else {
        targetProgressImpact = 'ON_TRACK';
      }
    } else {
      // Indefinite delay due to zero or negative surplus
      simMonthsToComplete = null;
      simEstimatedDate = null;
      deltaMonths = 999;
      targetProgressImpact = 'CRITICAL_RISK';
    }

    // Projected 12-Month Balances (via deterministic recurrence)
    const base12MBalance = Math.round(baseLiquid + baseMonthlySurplus * 12);
    const sim12MBalance = Math.round(baseLiquid - simOutlay + (baseMonthlySurplus - simMonthlyEmi - simRecurringDelta) * 12);
    const projectedBalanceImpact = sim12MBalance - base12MBalance;

    // Narrative explanation grounded in exact numbers
    let explanation = '';
    if (targetProgressImpact === 'CRITICAL_RISK') {
      if (simSustainableMonthly <= 0) {
        explanation = `The decision consumes all available monthly surplus (reducing surplus from ₹${baseMonthlySurplus.toLocaleString('en-IN')} to ₹${simMonthlySurplus.toLocaleString('en-IN')}). Contributions to "${goal.name}" are stalled.`;
      } else {
        explanation = `Goal "${goal.name}" is projected to be delayed by ${deltaMonths} months due to reduced savings capacity of ₹${simSustainableMonthly.toLocaleString('en-IN')}/mo (down from ₹${baseSustainableMonthly.toLocaleString('en-IN')}/mo).`;
      }
    } else if (targetProgressImpact === 'DELAYED') {
      explanation = `Goal "${goal.name}" will be delayed by ${deltaMonths} month(s). Monthly allocation drops from ₹${baseSustainableMonthly.toLocaleString('en-IN')} to ₹${simSustainableMonthly.toLocaleString('en-IN')}.`;
    } else {
      explanation = `Goal "${goal.name}" remains on track. Monthly surplus of ₹${simMonthlySurplus.toLocaleString('en-IN')} fully sustains the planned ₹${baseSustainableMonthly.toLocaleString('en-IN')}/mo contribution.`;
    }

    if (goalCapitalDrawdown > 0) {
      explanation += ` Additionally, ₹${goalCapitalDrawdown.toLocaleString('en-IN')} is drawn from accumulated goal capital, increasing remaining target to ₹${simRemainingAmount.toLocaleString('en-IN')}.`;
    }

    return {
      goal: {
        id: goal._id,
        name: goal.name,
        category: goal.category,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        amountRemaining: goal.calculations.amountRemaining,
        progressPercent: goal.calculations.progressPercent,
        targetDate: typeof goal.targetDate === 'string' ? goal.targetDate : goal.targetDate.toISOString(),
        monthlyContribution: goal.monthlyContribution || 0,
      },
      baseline: {
        monthsToComplete: baseMonthsToComplete,
        estimatedCompletionDate: baseEstimatedDate,
        sustainableMonthlyContribution: baseSustainableMonthly,
        projected12MonthBalance: base12MBalance,
        status: baseMonthsToComplete !== null ? 'ON_TRACK' : 'INSUFFICIENT_SURPLUS',
      },
      simulated: {
        monthsToComplete: simMonthsToComplete,
        estimatedCompletionDate: simEstimatedDate,
        sustainableMonthlyContribution: simSustainableMonthly,
        projected12MonthBalance: sim12MBalance,
        status: targetProgressImpact,
      },
      impact: {
        completionDateDeltaMonths: deltaMonths === 999 ? 0 : deltaMonths,
        monthlyContributionDelta: simSustainableMonthly - baseSustainableMonthly,
        projectedBalanceImpact,
        targetProgressImpact,
        explanation,
      },
      dataLineage: {
        dataUsed: [
          `Accounts: ${baselineFin.accounts.length} active verified accounts (Liquid reserves: ₹${baseLiquid.toLocaleString('en-IN')})`,
          `Ledger: ${baselineFin.transactions.length} transactions across ${baselineFin.activeMonthsCount} months`,
          `Cash Flow: Average monthly income ₹${baseIncome.toLocaleString('en-IN')}, expenses ₹${baseExpenses.toLocaleString('en-IN')}, debt service ₹${baseDebtService.toLocaleString('en-IN')}`,
          `Goal: "${goal.name}" target ₹${targetAmount.toLocaleString('en-IN')}, saved ₹${currentAmount.toLocaleString('en-IN')}, remaining ₹${remainingAmount.toLocaleString('en-IN')}`,
        ],
        formulaUsed: [
          'Monthly Surplus = Monthly Income - Monthly Expenses - Scheduled Debt Service',
          'Sustainable Goal Contribution = Min(Planned Pace, Max(0, Simulated Surplus))',
          'Months to Completion = Ceiling(Remaining Target / Sustainable Goal Contribution)',
          'Completion Date Delta = Simulated Months to Completion - Baseline Months to Completion',
          'Projected 12M Balance = Initial Liquid Cash - Direct Outlay + (Simulated Monthly Surplus × 12)',
        ],
        assumptions: [
          'Recurring income and baseline expenses remain constant at the verified historical average.',
          'Monthly surplus is prioritized towards essential debt service before discretionary goal funding.',
          'Simulation is strictly read-only and causes zero mutation of real ledger balances.',
        ],
        limitations: [
          baselineFin.transactions.length < 5
            ? 'Fewer than 5 transactions found; baseline averages may reflect limited historical variance.'
            : 'Unplanned one-off emergencies or inflation adjustments are not modeled.',
          simSustainableMonthly <= 0 ? 'Goal completion is indeterminable when simulated monthly surplus is zero or negative.' : '',
        ].filter(Boolean),
      },
    };
  },

  /**
   * Deterministic Affordability Analysis with complete evidence matrix and neutral thresholds.
   */
  async calculateAffordability(params: {
    userId: string;
    purchaseAmount: number;
    paymentMode?: 'OUTRIGHT' | 'EMI';
    tenureMonths?: number;
    annualRate?: number;
    goalId?: string;
    targetAccountId?: string;
    description?: string;
  }): Promise<AffordabilityAnalysisResult> {
    const {
      userId,
      purchaseAmount,
      paymentMode = 'OUTRIGHT',
      tenureMonths = 6,
      annualRate = 14,
      goalId,
      targetAccountId,
      description = 'Prospective Purchase',
    } = params;

    // 1. Fetch baseline
    const baselineFin = await SimulationEngine.getFinancialBaseline(userId, targetAccountId);
    const baseIncome = baselineFin.units.monthlyIncome;
    const baseExpenses = baselineFin.units.monthlyExpenses;
    const baseDebtService = baselineFin.units.monthlyDebtService;
    const baseLiquid = baselineFin.units.liquidReserves;

    const baseSurplus = Math.round(baseIncome - baseExpenses - baseDebtService);
    const baseRunway = baseExpenses > 0 ? calculateRunway(baseLiquid, baseExpenses + baseDebtService) : null;
    const baseDti = calculateDTI(baseDebtService, baseIncome);

    // 2. Compute Decision Outflows
    let liquidAfter = baseLiquid;
    let monthlyEmiBurden = 0;

    if (paymentMode === 'EMI') {
      monthlyEmiBurden = calculateLoanEMI(purchaseAmount, annualRate, tenureMonths);
    } else {
      liquidAfter = baseLiquid - purchaseAmount;
    }

    const simSurplus = Math.round(baseSurplus - monthlyEmiBurden);
    const totalOutflowsAfter = baseExpenses + baseDebtService + monthlyEmiBurden;
    const simRunway = totalOutflowsAfter > 0 ? calculateRunway(liquidAfter, totalOutflowsAfter) : null;
    const simDti = calculateDTI(baseDebtService + monthlyEmiBurden, baseIncome);

    // 12-Month Balances
    const base12MBalance = Math.round(baseLiquid + baseSurplus * 12);
    const sim12MBalance = Math.round(liquidAfter + simSurplus * 12);

    // 3. Goal Impact (if user has any goals)
    let goalImpact: GoalImpactResult | null = null;
    let goalImpactSummary = 'No active financial goals defined.';

    try {
      goalImpact = await this.simulateGoalImpact({
        userId,
        goalId,
        amount: purchaseAmount,
        paymentMode,
        tenureMonths,
        annualRate,
        targetAccountId,
        description,
      });

      if (goalImpact) {
        if (goalImpact.impact.targetProgressImpact === 'CRITICAL_RISK') {
          goalImpactSummary = `Goal "${goalImpact.goal.name}" progress stalled due to surplus depletion.`;
        } else if (goalImpact.impact.completionDateDeltaMonths > 0) {
          goalImpactSummary = `Goal "${goalImpact.goal.name}" delayed by ${goalImpact.impact.completionDateDeltaMonths} month(s).`;
        } else {
          goalImpactSummary = `Goal "${goalImpact.goal.name}" remains fully on track.`;
        }
      }
    } catch {
      // User may not have created goals yet
      goalImpactSummary = 'No active financial goals to evaluate.';
    }

    // 4. Deterministic Threshold Evaluation for Affordability Status
    let status: 'LOW IMPACT' | 'MODERATE IMPACT' | 'HIGH IMPACT' = 'LOW IMPACT';
    const reasons: string[] = [];

    // High Impact Rules:
    const isLiquidNegative = liquidAfter < 0;
    const isRunwayDepleted = simRunway !== null && simRunway < 1.5;
    const isDeficit = simSurplus < 0;
    const isDtiCritical = simDti > 50;
    const isGoalCritical = goalImpact?.impact.targetProgressImpact === 'CRITICAL_RISK';

    if (isLiquidNegative || isRunwayDepleted || isDeficit || isDtiCritical || isGoalCritical) {
      status = 'HIGH IMPACT';
      if (isLiquidNegative) reasons.push(`Liquid cash reserves drop to negative (-₹${Math.abs(liquidAfter).toLocaleString('en-IN')}).`);
      if (isRunwayDepleted) reasons.push(`Emergency runway drops to ${simRunway} months (critical safety threshold is 1.5 months).`);
      if (isDeficit) reasons.push(`Monthly cash flow turns negative (deficit of ₹${Math.abs(simSurplus).toLocaleString('en-IN')}/mo).`);
      if (isDtiCritical) reasons.push(`Debt-to-Income ratio surges to ${simDti}% (safe threshold ≤ 40%).`);
      if (isGoalCritical) reasons.push(`Active goal funding is severely disrupted or stalled.`);
    } else {
      // Moderate Impact Rules:
      const isRunwayModerate = simRunway !== null && simRunway < 3.0;
      const isReservesHeavy = paymentMode === 'OUTRIGHT' && purchaseAmount > baseLiquid * 0.3;
      const isDtiElevated = simDti > 30;
      const isGoalDelayed = goalImpact && goalImpact.impact.completionDateDeltaMonths > 0;

      if (isRunwayModerate || isReservesHeavy || isDtiElevated || isGoalDelayed) {
        status = 'MODERATE IMPACT';
        if (isRunwayModerate) reasons.push(`Emergency runway reduces to ${simRunway} months (recommended buffer is 3.0 months).`);
        if (isReservesHeavy) reasons.push(`Direct outlay absorbs ${Math.round((purchaseAmount / baseLiquid) * 100)}% of total liquid reserves.`);
        if (isDtiElevated) reasons.push(`Debt-to-Income ratio reaches ${simDti}%.`);
        if (isGoalDelayed) reasons.push(`Goal completion delayed by ${goalImpact?.impact.completionDateDeltaMonths} month(s).`);
      } else {
        // Low Impact
        status = 'LOW IMPACT';
        reasons.push(
          `Liquid reserves after decision (₹${liquidAfter.toLocaleString('en-IN')}) provide ${simRunway !== null ? `${simRunway} months` : 'healthy'} emergency runway. Monthly surplus remains positive at ₹${simSurplus.toLocaleString('en-IN')}.`
        );
      }
    }

    const statusReason = reasons.join(' ');

    // 5. Decision Comparison Table (Baseline vs Buy Now vs Buy Later vs Cheaper Option)
    const cheaperAmount = Math.round(purchaseAmount * 0.7);
    const delayMonths = 3;

    // Buy later balance at M12: delay expenditure by 3 months, saving 3 months of surplus first
    const buyLater12M = Math.round(baseLiquid - purchaseAmount + baseSurplus * 12);
    const cheaper12M = Math.round(baseLiquid - cheaperAmount + baseSurplus * 12);

    const comparison = [
      {
        dimension: 'Initial Cash Outflow',
        baseline: '₹0',
        buyNow: `-₹${purchaseAmount.toLocaleString('en-IN')}`,
        buyLater: `₹0 (Deferred to Month ${delayMonths})`,
        cheaperOption: `-₹${cheaperAmount.toLocaleString('en-IN')}`,
      },
      {
        dimension: 'Monthly Cash Flow Impact',
        baseline: `+₹${baseSurplus.toLocaleString('en-IN')}/mo`,
        buyNow: `+₹${baseSurplus.toLocaleString('en-IN')}/mo`,
        buyLater: `+₹${baseSurplus.toLocaleString('en-IN')}/mo`,
        cheaperOption: `+₹${baseSurplus.toLocaleString('en-IN')}/mo`,
      },
      {
        dimension: 'Projected 12-Month Balance',
        baseline: `₹${base12MBalance.toLocaleString('en-IN')}`,
        buyNow: `₹${sim12MBalance.toLocaleString('en-IN')}`,
        buyLater: `₹${buyLater12M.toLocaleString('en-IN')}`,
        cheaperOption: `₹${cheaper12M.toLocaleString('en-IN')}`,
      },
      {
        dimension: 'Emergency Runway',
        baseline: `${baseRunway ?? 'N/A'} months`,
        buyNow: `${simRunway ?? 'N/A'} months`,
        buyLater: `${baseRunway ?? 'N/A'} months (Months 1–${delayMonths})`,
        cheaperOption: `${baseExpenses > 0 ? calculateRunway(baseLiquid - cheaperAmount, baseExpenses + baseDebtService) : 'N/A'} months`,
      },
      {
        dimension: 'Goal Impact',
        baseline: 'On track',
        buyNow: goalImpact ? (goalImpact.impact.completionDateDeltaMonths > 0 ? `Delayed +${goalImpact.impact.completionDateDeltaMonths} mo` : 'On track') : 'No active goal',
        buyLater: 'Allows 3 months uninterrupted savings',
        cheaperOption: 'Saves ₹' + (purchaseAmount - cheaperAmount).toLocaleString('en-IN') + ' for goals',
      },
      {
        dimension: 'Debt / DTI Impact',
        baseline: `${baseDti}% DTI (₹${baseDebtService.toLocaleString('en-IN')}/mo)`,
        buyNow: paymentMode === 'EMI' ? `${simDti}% DTI (+₹${monthlyEmiBurden.toLocaleString('en-IN')}/mo)` : `${baseDti}% DTI (Zero new debt)`,
        buyLater: `${baseDti}% DTI (Capital deferred)`,
        cheaperOption: `${baseDti}% DTI (Zero new debt)`,
      },
    ];

    return {
      decision: {
        purchaseAmount,
        paymentMode,
        description,
      },
      evidence: {
        purchaseAmount,
        currentLiquidBalance: baseLiquid,
        liquidBalanceAfter: liquidAfter,
        monthlyIncome: baseIncome,
        monthlyExpenses: baseExpenses,
        monthlySurplusBefore: baseSurplus,
        monthlySurplusAfter: simSurplus,
        emergencyRunwayBefore: baseRunway,
        emergencyRunwayAfter: simRunway,
        debtEmiBurdenMonthly: monthlyEmiBurden,
        dtiBeforePercent: baseDti,
        dtiAfterPercent: simDti,
        projected12MonthBalanceBaseline: base12MBalance,
        projected12MonthBalanceSimulated: sim12MBalance,
        goalImpactSummary,
      },
      status,
      statusReason,
      thresholds: {
        highImpactRule: 'Liquid balance < 0 OR Emergency Runway < 1.5 mo OR Monthly Surplus < 0 OR DTI > 50% OR Goal Stalled.',
        moderateImpactRule: 'Emergency Runway 1.5–3.0 mo OR Outlay > 30% of reserves OR DTI 30–50% OR Goal delayed 1–6 mo.',
        lowImpactRule: 'Emergency Runway ≥ 3.0 mo AND Outlay ≤ 30% of reserves AND Monthly Surplus remains positive AND DTI ≤ 30%.',
      },
      goalImpact,
      comparison,
      dataLineage: {
        dataUsed: [
          `Accounts: ${baselineFin.accounts.length} verified accounts (Starting liquid balance: ₹${baseLiquid.toLocaleString('en-IN')})`,
          `Historical Ledger: ${baselineFin.transactions.length} transactions across ${baselineFin.activeMonthsCount} months`,
          `Baseline Cash Flow: Income ₹${baseIncome.toLocaleString('en-IN')}, Expenses ₹${baseExpenses.toLocaleString('en-IN')}, Surplus ₹${baseSurplus.toLocaleString('en-IN')}`,
          `Decision Parameters: Outlay ₹${purchaseAmount.toLocaleString('en-IN')}, Mode: ${paymentMode}`,
        ],
        formulaUsed: [
          'Post-Decision Liquid Balance = Current Liquid Balance - Direct Outlay',
          'Emergency Runway = Liquid Reserves / Total Monthly Essential Outflows',
          'DTI = Monthly Debt Obligations / Monthly Gross Income × 100',
          'Projected 12M Balance = Post-Decision Liquid Balance + (Simulated Monthly Surplus × 12)',
        ],
        assumptions: [
          'Deterministic cash flow modeling assumes steady monthly income and expenses at verified ledger averages.',
          'No undisclosed loans or credit drawdowns outside verified accounts.',
          'Purchased asset is treated as immediate cash outflow with zero residual resale value.',
        ],
        limitations: [
          baselineFin.transactions.length < 5 ? 'Limited transaction history may underestimate periodic non-monthly spikes.' : '',
          'Does not constitute financial advice; reflects exact mathematical consequences of prospective outflows.',
        ].filter(Boolean),
      },
    };
  },
};
