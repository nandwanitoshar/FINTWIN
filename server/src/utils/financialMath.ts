/**
 * FinTwin AI — Deterministic Financial Math Engine
 * All calculations are 100% reproducible and deterministic (ZERO Math.random()).
 */

/**
 * Calculates Net Worth = Total Assets - Total Liabilities
 */
export function calculateNetWorth(totalAssets: number, totalLiabilities: number): number {
  return Math.round((totalAssets - totalLiabilities) * 100) / 100;
}

/**
 * Calculates Liquidity Runway in months = Liquid Reserves / Total Monthly Outflows (Burn)
 * If monthly burn <= 0, returns 999 as practical infinite buffer.
 */
export function calculateRunway(liquidReserves: number, monthlyBurn: number): number {
  if (liquidReserves <= 0) return 0;
  if (monthlyBurn <= 0) return 999;
  const runway = liquidReserves / monthlyBurn;
  return Math.round(runway * 10) / 10;
}

/**
 * Calculates Debt-to-Income (DTI) Ratio as percentage
 * DTI = (Monthly Debt Service / Gross Monthly Income) * 100
 */
export function calculateDTI(monthlyDebtPayments: number, grossMonthlyIncome: number): number {
  if (grossMonthlyIncome <= 0) {
    return monthlyDebtPayments > 0 ? 100 : 0;
  }
  const ratio = (monthlyDebtPayments / grossMonthlyIncome) * 100;
  return Math.round(ratio * 10) / 10;
}

/**
 * Calculates Savings Rate as percentage
 * Savings Rate = ((Monthly Income - Monthly Expenses) / Monthly Income) * 100
 */
export function calculateSavingsRate(monthlyIncome: number, monthlyExpenses: number): number {
  if (monthlyIncome <= 0) return 0;
  const rate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * Calculates Standard Loan Amortization Equated Monthly Installment (EMI)
 * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * where:
 *   P = Principal loan amount
 *   r = Monthly interest rate (annualRatePct / 12 / 100)
 *   n = Tenure in months
 */
export function calculateLoanEMI(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePct <= 0) {
    return Math.round((principal / tenureMonths) * 100) / 100;
  }

  const r = annualRatePct / 12 / 100;
  const n = tenureMonths;
  const factor = Math.pow(1 + r, n);
  const emi = (principal * r * factor) / (factor - 1);

  return Math.round(emi * 100) / 100;
}

/**
 * Calculates Deterministic Financial Health Score (0 - 100)
 * Weights:
 * - Liquidity Runway (35 pts): >= 6 mos = 35, 3-6 mos = 25, 1-3 mos = 15, < 1 mo = 5
 * - Debt-to-Income DTI (25 pts): <= 20% = 25, 20-35% = 20, 35-50% = 10, > 50% = 0
 * - Savings Rate (25 pts): >= 20% = 25, 10-20% = 18, 0-10% = 10, < 0% = 0
 * - Liquid Buffer Availability (15 pts): reserves > 0 = 15, 0 = 0
 */
export function calculateHealthScore(
  runwayMonths: number,
  dtiPercent: number,
  savingsRatePercent: number,
  liquidReserves: number
): number {
  let score = 0;

  // 1. Runway (35)
  if (runwayMonths >= 6) {
    score += 35;
  } else if (runwayMonths >= 3) {
    score += 25;
  } else if (runwayMonths >= 1) {
    score += 15;
  } else {
    score += 5;
  }

  // 2. DTI (25)
  if (dtiPercent <= 20) {
    score += 25;
  } else if (dtiPercent <= 35) {
    score += 20;
  } else if (dtiPercent <= 50) {
    score += 10;
  } else {
    score += 0;
  }

  // 3. Savings Rate (25)
  if (savingsRatePercent >= 20) {
    score += 25;
  } else if (savingsRatePercent >= 10) {
    score += 18;
  } else if (savingsRatePercent >= 0) {
    score += 10;
  } else {
    score += 0;
  }

  // 4. Liquid Buffer (15)
  if (liquidReserves > 5000) {
    score += 15;
  } else if (liquidReserves > 0) {
    score += 8;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

export interface HealthScoreComponent {
  id: 'emergencyRunway' | 'savingsRate' | 'debtBurden' | 'cashFlow' | 'expenseConcentration' | 'incomeStability';
  name: string;
  score: number | null;
  weight: number;
  status: 'OPTIMAL' | 'GOOD' | 'FAIR' | 'ATTENTION' | 'INSUFFICIENT_DATA';
  explanation: string;
  dataUsed: string;
  hasSufficientData: boolean;
}

export interface DetailedHealthScore {
  overallScore: number;
  components: HealthScoreComponent[];
  summary: string;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'INCOMPLETE';
  calculatedAt: string;
}

export interface HealthScoreInputs {
  liquidReserves: number;
  monthlyBurn: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number;
  totalDebt: number;
  topCategorySharePct?: number;
  categoryCount?: number;
  incomeTransactionCount?: number;
  incomeEntityCount?: number;
  isRecurringIncome?: boolean;
}

/**
 * Calculates Deterministic 6-Component Financial Health Score (0 - 100)
 * Adheres strictly to reproducible mathematical standards without mock or AI-fabricated numbers.
 */
export function calculateDetailedHealthScore(inputs: HealthScoreInputs): DetailedHealthScore {
  const {
    liquidReserves,
    monthlyBurn,
    monthlyIncome,
    monthlyExpenses,
    monthlyDebtPayments,
    totalDebt,
    topCategorySharePct = 0,
    categoryCount = 0,
    incomeTransactionCount = 0,
    incomeEntityCount = 0,
    isRecurringIncome = false,
  } = inputs;

  const runwayMonths = calculateRunway(liquidReserves, monthlyBurn);
  const savingsRatePercent = calculateSavingsRate(monthlyIncome, monthlyExpenses);
  const dtiPercent = calculateDTI(monthlyDebtPayments, monthlyIncome);
  const surplus = Math.round((monthlyIncome - monthlyBurn) * 100) / 100;

  const components: HealthScoreComponent[] = [];

  // 1. Emergency Runway (Weight: 20%)
  const hasRunwayData = liquidReserves > 0 || monthlyBurn > 0;
  if (!hasRunwayData) {
    components.push({
      id: 'emergencyRunway',
      name: 'Emergency Runway',
      score: null,
      weight: 0.20,
      status: 'INSUFFICIENT_DATA',
      explanation: 'Not enough data to calculate this component.',
      dataUsed: 'Liquid Reserves: ₹0, Monthly Outflow: ₹0',
      hasSufficientData: false,
    });
  } else {
    let s = 15;
    let status: HealthScoreComponent['status'] = 'ATTENTION';
    let explanation = `Critical liquidity shortage: runway of ${runwayMonths} mos is under the 1.0 month safety minimum.`;
    if (runwayMonths >= 6.0) {
      s = 100;
      status = 'OPTIMAL';
      explanation = `Exceptional liquidity buffer: reserves sustain ${runwayMonths} months of expenditures (benchmark: >= 6 mos).`;
    } else if (runwayMonths >= 4.0) {
      s = 82;
      status = 'GOOD';
      explanation = `Healthy liquidity buffer: reserves sustain ${runwayMonths} months of baseline living expenditures.`;
    } else if (runwayMonths >= 3.0) {
      s = 70;
      status = 'FAIR';
      explanation = `Baseline 3-month emergency threshold met (${runwayMonths} mos); limited capacity for compound disruptions.`;
    } else if (runwayMonths >= 1.0) {
      s = 45;
      status = 'ATTENTION';
      explanation = `Vulnerable liquidity: runway of ${runwayMonths} mos leaves thin margin for unforeseen shocks.`;
    }
    components.push({
      id: 'emergencyRunway',
      name: 'Emergency Runway',
      score: s,
      weight: 0.20,
      status,
      explanation,
      dataUsed: `Liquid Reserves: ₹${liquidReserves.toLocaleString()}, Monthly Burn: ₹${monthlyBurn.toLocaleString()} (${runwayMonths} months)`,
      hasSufficientData: true,
    });
  }

  // 2. Savings Rate (Weight: 20%)
  const hasSavingsData = monthlyIncome > 0;
  if (!hasSavingsData) {
    components.push({
      id: 'savingsRate',
      name: 'Savings Rate',
      score: null,
      weight: 0.20,
      status: 'INSUFFICIENT_DATA',
      explanation: 'Not enough data to calculate this component.',
      dataUsed: 'Monthly Income: ₹0 recorded',
      hasSufficientData: false,
    });
  } else {
    let s = 10;
    let status: HealthScoreComponent['status'] = 'ATTENTION';
    let explanation = `Negative savings rate (${savingsRatePercent}%): monthly spending exceeds inflow.`;
    if (savingsRatePercent >= 30.0) {
      s = 100;
      status = 'OPTIMAL';
      explanation = `Outstanding savings discipline: saving ${savingsRatePercent}% of gross income (benchmark >= 30%).`;
    } else if (savingsRatePercent >= 20.0) {
      s = 85;
      status = 'GOOD';
      explanation = `Solid savings rate of ${savingsRatePercent}%, meeting institutional wealth-building standards.`;
    } else if (savingsRatePercent >= 10.0) {
      s = 68;
      status = 'FAIR';
      explanation = `Moderate savings rate of ${savingsRatePercent}%; opportunity to optimize discretionary expenses.`;
    } else if (savingsRatePercent >= 0.0) {
      s = 40;
      status = 'ATTENTION';
      explanation = `Low savings velocity (${savingsRatePercent}%); little buffer allocated for future goals.`;
    }
    components.push({
      id: 'savingsRate',
      name: 'Savings Rate',
      score: s,
      weight: 0.20,
      status,
      explanation,
      dataUsed: `Monthly Income: ₹${monthlyIncome.toLocaleString()}, Expenses: ₹${monthlyExpenses.toLocaleString()} (${savingsRatePercent}%)`,
      hasSufficientData: true,
    });
  }

  // 3. Debt Burden (Weight: 15%)
  const hasDebtData = monthlyIncome > 0 || totalDebt > 0 || monthlyDebtPayments > 0;
  if (!hasDebtData) {
    components.push({
      id: 'debtBurden',
      name: 'Debt Burden',
      score: 100,
      weight: 0.15,
      status: 'OPTIMAL',
      explanation: 'Debt-free: Zero active loan liabilities or monthly debt obligations recorded.',
      dataUsed: 'Active Loans: ₹0, Monthly EMI: ₹0',
      hasSufficientData: true,
    });
  } else {
    let s = 20;
    let status: HealthScoreComponent['status'] = 'ATTENTION';
    let explanation = `Severe debt service burden: DTI of ${dtiPercent}% exceeds standard 40% threshold.`;
    if (monthlyDebtPayments === 0 && totalDebt === 0) {
      s = 100;
      status = 'OPTIMAL';
      explanation = 'Debt-free: Zero monthly debt obligations or outstanding loan principal.';
    } else if (dtiPercent <= 15.0) {
      s = 90;
      status = 'OPTIMAL';
      explanation = `Conservative debt obligations: debt service consumes only ${dtiPercent}% of income.`;
    } else if (dtiPercent <= 25.0) {
      s = 75;
      status = 'GOOD';
      explanation = `Manageable debt burden: DTI of ${dtiPercent}% sits safely within the 20-30% range.`;
    } else if (dtiPercent <= 40.0) {
      s = 50;
      status = 'FAIR';
      explanation = `Elevated debt obligations (${dtiPercent}% DTI); limits discretionary liquidity allocation.`;
    }
    components.push({
      id: 'debtBurden',
      name: 'Debt Burden',
      score: s,
      weight: 0.15,
      status,
      explanation,
      dataUsed: `Monthly EMI: ₹${monthlyDebtPayments.toLocaleString()}, Outstanding Principal: ₹${totalDebt.toLocaleString()} (${dtiPercent}% DTI)`,
      hasSufficientData: true,
    });
  }

  // 4. Cash Flow Balance (Weight: 15%)
  const hasCashFlowData = monthlyIncome > 0 || monthlyBurn > 0;
  if (!hasCashFlowData) {
    components.push({
      id: 'cashFlow',
      name: 'Cash Flow Balance',
      score: null,
      weight: 0.15,
      status: 'INSUFFICIENT_DATA',
      explanation: 'Not enough data to calculate this component.',
      dataUsed: 'Inflow: ₹0, Outflow: ₹0',
      hasSufficientData: false,
    });
  } else {
    let s = 20;
    let status: HealthScoreComponent['status'] = 'ATTENTION';
    let explanation = `Operating at a monthly cash-flow deficit of -₹${Math.abs(surplus).toLocaleString()}.`;
    if (monthlyIncome > 0 && surplus >= 0.25 * monthlyIncome) {
      s = 95;
      status = 'OPTIMAL';
      explanation = `Substantial monthly surplus: net cash flow generation of +₹${surplus.toLocaleString()} (+${Math.round((surplus / monthlyIncome) * 100)}%).`;
    } else if (surplus > 0) {
      s = 75;
      status = 'GOOD';
      explanation = `Consistent positive net cash flow: generating +₹${surplus.toLocaleString()} monthly cushion.`;
    } else if (surplus === 0) {
      s = 50;
      status = 'FAIR';
      explanation = 'Breakeven cash flow: income precisely covers outgoings with zero monthly surplus.';
    }
    components.push({
      id: 'cashFlow',
      name: 'Cash Flow Balance',
      score: s,
      weight: 0.15,
      status,
      explanation,
      dataUsed: `Net Monthly Flow: ${surplus >= 0 ? '+' : ''}₹${surplus.toLocaleString()} (Inflow: ₹${monthlyIncome.toLocaleString()}, Outflow: ₹${monthlyBurn.toLocaleString()})`,
      hasSufficientData: true,
    });
  }

  // 5. Expense Concentration (Weight: 15%)
  const hasExpenseData = categoryCount > 0 && monthlyExpenses > 0;
  if (!hasExpenseData) {
    components.push({
      id: 'expenseConcentration',
      name: 'Expense Concentration',
      score: null,
      weight: 0.15,
      status: 'INSUFFICIENT_DATA',
      explanation: 'Not enough data to calculate this component.',
      dataUsed: 'Categorized expenses: 0',
      hasSufficientData: false,
    });
  } else {
    let s = 35;
    let status: HealthScoreComponent['status'] = 'ATTENTION';
    let explanation = `High category concentration: top expense category claims ${topCategorySharePct}% of total outgoings.`;
    if (topCategorySharePct <= 35.0) {
      s = 95;
      status = 'OPTIMAL';
      explanation = `Well-diversified expenditure pattern across ${categoryCount} categories (top category <= 35%).`;
    } else if (topCategorySharePct <= 50.0) {
      s = 80;
      status = 'GOOD';
      explanation = `Healthy spending diversification: top category represents ${topCategorySharePct}% of outflow.`;
    } else if (topCategorySharePct <= 70.0) {
      s = 65;
      status = 'FAIR';
      explanation = `Moderate category concentration: single category consumes ${topCategorySharePct}% of monthly burn.`;
    }
    components.push({
      id: 'expenseConcentration',
      name: 'Expense Concentration',
      score: s,
      weight: 0.15,
      status,
      explanation,
      dataUsed: `Top Category: ${topCategorySharePct}% of spend across ${categoryCount} active categories`,
      hasSufficientData: true,
    });
  }

  // 6. Income Stability (Weight: 15%)
  const hasIncomeData = incomeTransactionCount > 0 || monthlyIncome > 0;
  if (!hasIncomeData) {
    components.push({
      id: 'incomeStability',
      name: 'Income Stability',
      score: null,
      weight: 0.15,
      status: 'INSUFFICIENT_DATA',
      explanation: 'Not enough data to calculate this component.',
      dataUsed: 'Income transactions recorded: 0',
      hasSufficientData: false,
    });
  } else {
    let s = 45;
    let status: HealthScoreComponent['status'] = 'ATTENTION';
    let explanation = 'Single recorded income event; establishing historical track record.';
    if (isRecurringIncome && incomeTransactionCount >= 3) {
      s = 95;
      status = 'OPTIMAL';
      explanation = `Predictable recurring payroll/revenue streams detected across ${incomeTransactionCount} regular events.`;
    } else if (incomeTransactionCount >= 2) {
      s = 80;
      status = 'GOOD';
      explanation = `Multiple confirmed income deposits (${incomeTransactionCount} events) from verified counterparties.`;
    } else if (incomeTransactionCount === 1) {
      s = 65;
      status = 'FAIR';
      explanation = 'Baseline income stream recorded; consistency requires additional monthly cycles.';
    }
    components.push({
      id: 'incomeStability',
      name: 'Income Stability',
      score: s,
      weight: 0.15,
      status,
      explanation,
      dataUsed: `${incomeTransactionCount} income deposits across ${incomeEntityCount} counterparties`,
      hasSufficientData: true,
    });
  }

  // Calculate composite weighted overall score
  const activeComponents = components.filter((c) => c.hasSufficientData && c.score !== null);

  if (activeComponents.length === 0) {
    return {
      overallScore: 0,
      components,
      summary: 'Insufficient historical financial data to compute an overall health score. Ingest transactions or create accounts to view your score.',
      grade: 'INCOMPLETE',
      calculatedAt: new Date().toISOString(),
    };
  }

  const totalActiveWeight = activeComponents.reduce((acc, c) => acc + c.weight, 0);
  const weightedSum = activeComponents.reduce((acc, c) => acc + (c.score as number) * c.weight, 0);
  const overallScore = Math.min(100, Math.max(0, Math.round(weightedSum / totalActiveWeight)));

  let grade: DetailedHealthScore['grade'] = 'F';
  if (overallScore >= 90) grade = 'A+';
  else if (overallScore >= 80) grade = 'A';
  else if (overallScore >= 70) grade = 'B';
  else if (overallScore >= 55) grade = 'C';
  else if (overallScore >= 40) grade = 'D';

  let summary = `Your Financial Health Score is ${overallScore}/100 (${grade} grade). `;
  if (overallScore >= 80) {
    summary += 'Your financial state shows strong liquidity defenses and healthy savings velocity.';
  } else if (overallScore >= 65) {
    summary += 'Your financial posture is balanced with opportunities to optimize debt service and cash-flow surplus.';
  } else {
    summary += 'Attention is required on core liquidity reserves and debt commitments to prevent cash-flow strain.';
  }

  return {
    overallScore,
    components,
    summary,
    grade,
    calculatedAt: new Date().toISOString(),
  };
}

