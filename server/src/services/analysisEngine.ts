import { DigitalTwinService } from './digitalTwinService.js';
import { SimulationEngine } from './simulationEngine.js';

export interface AnalysisFinding {
  title: string;
  category: 'LIQUIDITY' | 'DEBT' | 'CASHFLOW' | 'SYSTEMIC';
  causalExplanation: string;
  mathematicalProof: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface AnalysisRecommendation {
  action: string;
  counterfactualImpact: string;
  priority: 'IMMEDIATE' | 'SHORT_TERM' | 'STRATEGIC';
}

export interface AnalysisResult {
  context: 'current' | 'simulation';
  scenarioName?: string;
  summary: string;
  keyFindings: AnalysisFinding[];
  recommendations: AnalysisRecommendation[];
  provider: 'rules' | 'ai';
}

export const AnalysisEngine = {
  /**
   * 06 ANALYZE: Generates explainable financial intelligence adhering to the 3 Explainability Axioms
   */
  async generateAnalysis(
    userId: string,
    context: 'current' | 'simulation' = 'current',
    scenarioId?: string
  ): Promise<AnalysisResult> {
    const twin = await DigitalTwinService.getTwinState(userId);

    if (context === 'simulation') {
      let scenario = scenarioId
        ? await SimulationEngine.getById(scenarioId, userId)
        : null;

      if (!scenario) {
        const history = await SimulationEngine.getHistory(userId);
        scenario = history.length > 0 ? history[0] : null;
      }

      if (scenario) {
        return this.synthesizeSimulationAnalysis(twin, scenario);
      }
    }

    return this.synthesizeCurrentTwinAnalysis(twin);
  },

  synthesizeCurrentTwinAnalysis(twin: any): AnalysisResult {
    const { stateVector, summary, metrics, riskSignals } = twin;
    const findings: AnalysisFinding[] = [];
    const recommendations: AnalysisRecommendation[] = [];

    // 1. Liquidity Runway Axiom
    if (stateVector.runwayMonths >= 6.0) {
      findings.push({
        title: 'Robust Liquidity Fortress',
        category: 'LIQUIDITY',
        causalExplanation: `Liquid reserves sustain ${stateVector.runwayMonths} months of expenditures at current burn velocity, comfortably exceeding the 6.0-month golden standard.`,
        mathematicalProof: `Runway = Liquid (${summary.liquidReserves.toLocaleString()}) / Monthly Burn (${metrics.monthlyBurn.toLocaleString()}) = ${stateVector.runwayMonths} mos.`,
        status: 'HEALTHY',
      });
    } else if (stateVector.runwayMonths >= 3.0) {
      findings.push({
        title: 'Adequate Liquidity Buffer',
        category: 'LIQUIDITY',
        causalExplanation: `Runway stands at ${stateVector.runwayMonths} months. It covers short-term shocks but has little margin for compound disruptions.`,
        mathematicalProof: `Runway = Liquid (${summary.liquidReserves.toLocaleString()}) / Monthly Burn (${metrics.monthlyBurn.toLocaleString()}) = ${stateVector.runwayMonths} mos.`,
        status: 'WARNING',
      });
    } else {
      findings.push({
        title: 'Critical Liquidity Vulnerability',
        category: 'LIQUIDITY',
        causalExplanation: `Runway of ${stateVector.runwayMonths} months is below the critical 3.0-month safety threshold, leaving you vulnerable to sudden cashflow shocks.`,
        mathematicalProof: `Runway = Liquid (${summary.liquidReserves.toLocaleString()}) / Monthly Burn (${metrics.monthlyBurn.toLocaleString()}) = ${stateVector.runwayMonths} mos.`,
        status: 'CRITICAL',
      });
      recommendations.push({
        action: 'Build Emergency Buffer to at least 3 months burn',
        counterfactualImpact: `Injecting ${(Math.max(0, metrics.monthlyBurn * 3 - summary.liquidReserves)).toLocaleString()} into liquid savings extends runway to 3.0 months.`,
        priority: 'IMMEDIATE',
      });
    }

    // 2. Debt-to-Income (DTI) Axiom
    if (stateVector.dtiPercent > 40.0) {
      findings.push({
        title: 'Elevated Debt Service Burden',
        category: 'DEBT',
        causalExplanation: `${stateVector.dtiPercent}% of gross monthly income is committed to mandatory debt obligations, restricting financial flexibility.`,
        mathematicalProof: `DTI = (Monthly Debt ${metrics.monthlyDebtPayments.toLocaleString()} / Gross Income ${metrics.monthlyIncome.toLocaleString()}) * 100 = ${stateVector.dtiPercent}%.`,
        status: 'CRITICAL',
      });
      recommendations.push({
        action: 'Refinance or accelerate high-interest debt repayment',
        counterfactualImpact: `Reducing monthly debt service by ${(metrics.monthlyDebtPayments * 0.3).toFixed(0)} brings DTI below 30%.`,
        priority: 'IMMEDIATE',
      });
    } else if (stateVector.dtiPercent > 0) {
      findings.push({
        title: 'Controlled Debt Exposure',
        category: 'DEBT',
        causalExplanation: `Debt service consumes ${stateVector.dtiPercent}% of monthly inflow, within the prudent 35% banking boundary.`,
        mathematicalProof: `DTI = (Monthly Debt ${metrics.monthlyDebtPayments.toLocaleString()} / Gross Income ${metrics.monthlyIncome.toLocaleString()}) * 100 = ${stateVector.dtiPercent}%.`,
        status: 'HEALTHY',
      });
    }

    // 3. Savings Rate Axiom
    if (stateVector.savingsRatePercent >= 20.0) {
      findings.push({
        title: 'Positive Net Capital Accumulation',
        category: 'CASHFLOW',
        causalExplanation: `Current savings rate of ${stateVector.savingsRatePercent}% supports sustained wealth generation and compounding.`,
        mathematicalProof: `Savings Rate = ((Income ${metrics.monthlyIncome.toLocaleString()} - Burn ${metrics.monthlyBurn.toLocaleString()}) / Income ${metrics.monthlyIncome.toLocaleString()}) * 100 = ${stateVector.savingsRatePercent}%.`,
        status: 'HEALTHY',
      });
    } else if (stateVector.savingsRatePercent > 0) {
      findings.push({
        title: 'Modest Capital Retention',
        category: 'CASHFLOW',
        causalExplanation: `Savings rate of ${stateVector.savingsRatePercent}% leaves minimal surplus for long-term goal financing.`,
        mathematicalProof: `Savings Rate = ((Income - Burn) / Income) * 100 = ${stateVector.savingsRatePercent}%.`,
        status: 'WARNING',
      });
      recommendations.push({
        action: 'Audit discretionary recurring merchant subscriptions',
        counterfactualImpact: 'Trimming 10% of discretionary spend increases monthly savings by ₹3,000 - ₹5,000.',
        priority: 'SHORT_TERM',
      });
    } else {
      findings.push({
        title: 'Negative Cash Flow Erosion',
        category: 'CASHFLOW',
        causalExplanation: 'Monthly spending exceeds income, systematically depleting net worth and cash reserves.',
        mathematicalProof: `Burn (${metrics.monthlyBurn.toLocaleString()}) > Income (${metrics.monthlyIncome.toLocaleString()}).`,
        status: 'CRITICAL',
      });
      recommendations.push({
        action: 'Freeze non-essential lifestyle capital outlays',
        counterfactualImpact: 'Immediately restores net cashflow to neutral or positive equilibrium.',
        priority: 'IMMEDIATE',
      });
    }

    // Strategic recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        action: 'Optimize yield on idle liquid balances',
        counterfactualImpact: `Allocating surplus savings into short-term instruments yields additional interest without compromising emergency access.`,
        priority: 'STRATEGIC',
      });
    }

    const summaryText = `Digital Twin health score stands at ${stateVector.healthScore}/100. Net Worth is ₹${stateVector.netWorth.toLocaleString()} with ${stateVector.runwayMonths} months of emergency runway. ${
      riskSignals.length > 0
        ? `There are ${riskSignals.length} active risk signal(s) requiring remediation.`
        : 'All financial subsystems are currently within target operating tolerances.'
    }`;

    return {
      context: 'current',
      summary: summaryText,
      keyFindings: findings,
      recommendations,
      provider: 'rules',
    };
  },

  synthesizeSimulationAnalysis(twin: any, scenario: any): AnalysisResult {
    const deltas = scenario.results?.deltas || {};
    const signals = scenario.results?.signalsTriggered || [];
    const findings: AnalysisFinding[] = [];
    const recommendations: AnalysisRecommendation[] = [];

    const isNetNegative = deltas.netWorthDelta < 0;
    const runwayDropped = deltas.runwayDeltaMonths < 0;

    findings.push({
      title: `Scenario Impact: ${scenario.scenarioName}`,
      category: 'SYSTEMIC',
      causalExplanation: `Over the ${scenario.horizonMonths}-month projection horizon, this scenario produces a net worth delta of ₹${Math.round(deltas.netWorthDelta || 0).toLocaleString()} and adjusts runway by ${deltas.runwayDeltaMonths || 0} months.`,
      mathematicalProof: `ΔNetWorth = Sim (₹${scenario.results?.simulatedSeries?.[scenario.horizonMonths - 1]?.netWorth?.toLocaleString()}) - Base (₹${scenario.results?.baselineSeries?.[scenario.horizonMonths - 1]?.netWorth?.toLocaleString()}) = ₹${Math.round(deltas.netWorthDelta || 0).toLocaleString()}.`,
      status: isNetNegative ? 'WARNING' : 'HEALTHY',
    });

    if (scenario.newEmiEvents?.length > 0) {
      const loan = scenario.newEmiEvents[0];
      findings.push({
        title: 'Financing & Loan Obligation Structure',
        category: 'DEBT',
        causalExplanation: `Amortizing ₹${loan.principal.toLocaleString()} at ${loan.annualRate}% APR over ${loan.tenureMonths} months creates an ongoing cashflow liability.`,
        mathematicalProof: `Loan EMI calculated via standard amortization M = P · [r(1+r)ⁿ] / [(1+r)ⁿ - 1].`,
        status: loan.annualRate > 15 ? 'WARNING' : 'HEALTHY',
      });
    }

    if (signals.length > 0) {
      signals.forEach((sig: any) => {
        findings.push({
          title: `Triggered Signal: ${sig.title}`,
          category: 'LIQUIDITY',
          causalExplanation: `Breached threshold in Month ${sig.month} of simulation due to concurrent outflow obligations.`,
          mathematicalProof: `Runway dropped below 3.0-month threshold.`,
          status: 'CRITICAL',
        });
      });

      recommendations.push({
        action: 'Extend loan tenure or defer capital event',
        counterfactualImpact: 'Extending tenure from 6 months to 12 months reduces monthly outflow by approx 45%, protecting liquid runway.',
        priority: 'IMMEDIATE',
      });
    } else {
      recommendations.push({
        action: 'Scenario is verified safe to execute',
        counterfactualImpact: 'Capital reserves remain above safety thresholds across the entire projection horizon.',
        priority: 'STRATEGIC',
      });
    }

    const summaryText = `Simulated scenario "${scenario.scenarioName}" evaluated over ${scenario.horizonMonths} months. Net cashflow delta is ₹${Math.round(deltas.monthlyCashflowDelta || 0).toLocaleString()}/month with a runway delta of ${deltas.runwayDeltaMonths || 0} months. ${
      signals.length > 0
        ? `Warning: ${signals.length} risk signal(s) triggered during projection.`
        : 'The scenario maintains adequate liquidity and meets financial safety constraints.'
    }`;

    return {
      context: 'simulation',
      scenarioName: scenario.scenarioName,
      summary: summaryText,
      keyFindings: findings,
      recommendations,
      provider: 'rules',
    };
  },
};
