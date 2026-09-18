import { TransactionRepository } from '../models/Transaction.js';
import { AccountRepository } from '../models/Account.js';
import { GoalRepository } from '../models/Goal.js';
import { LoanRepository } from '../models/Loan.js';
import { DigitalTwinService } from './digitalTwinService.js';
import { SimulationEngine } from './simulationEngine.js';

export interface AskFinTwinEvidenceItem {
  label: string;
  value: string | number;
}

export interface AskFinTwinResponse {
  query: string;
  intent: string;
  answer: string;
  evidence: AskFinTwinEvidenceItem[];
  formulaUsed?: string;
  recordsAnalyzed: number;
  hasSufficientData: boolean;
  limitations?: string;
  suggestedFollowUps: string[];
}

export const AskFinTwinService = {
  /**
   * Process a natural language query grounded in user's authoritative financial records
   */
  async answerQuery(userId: string, query: string): Promise<AskFinTwinResponse> {
    const trimmed = query.trim();
    const lower = trimmed.toLowerCase();

    // Fetch core user data
    const [twin, { transactions }, accounts, goals, loans] = await Promise.all([
      DigitalTwinService.getTwinState(userId),
      TransactionRepository.findByUserId(userId, { limit: 1000 }),
      AccountRepository.findByUserId(userId),
      GoalRepository.findByUserId(userId),
      LoanRepository.findByUserId(userId),
    ]);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Filter transactions for current month
    const currentMonthTxs = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    // Filter transactions for prior month
    const priorMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const priorYear = priorMonthDate.getFullYear();
    const priorMonth = priorMonthDate.getMonth();
    const priorMonthTxs = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === priorYear && d.getMonth() === priorMonth;
    });

    // 1. Intent: What happens if I buy ... (What-If simulation query)
    const whatIfMatch = lower.match(/(?:what happens if i buy|can i afford|buy(?:ing)?)\s+(?:a|an)?\s*(?:[₹$€£]\s*)?([\d,]+)\s*(.*)/i);
    if (whatIfMatch || lower.includes('what happens if')) {
      const rawAmount = whatIfMatch ? whatIfMatch[1].replace(/,/g, '') : '50000';
      const itemDesc = whatIfMatch && whatIfMatch[2] ? whatIfMatch[2].trim() : 'item';
      const amount = parseFloat(rawAmount) || 50000;

      const sim = await SimulationEngine.runSimulation({
        userId,
        scenarioType: 'PURCHASE',
        scenarioName: `What-If: Buy ${itemDesc || 'Item'} for ₹${amount.toLocaleString('en-IN')}`,
        amount,
        description: itemDesc,
      });

      const { before, after, impact } = sim.results;
      const willSurvive = impact.isSufficientBalance;

      return {
        query: trimmed,
        intent: 'WHAT_IF_PURCHASE_SIMULATION',
        answer: willSurvive
          ? `If you purchase ${itemDesc || 'this item'} for ₹${amount.toLocaleString('en-IN')}, your liquid cash will decrease by ₹${amount.toLocaleString('en-IN')} to ₹${after.liquidReserves.toLocaleString('en-IN')}. Your emergency runway will adjust from ${before.runwayMonths ?? 'N/A'} months to ${after.runwayMonths ?? 'N/A'} months. Your net worth will change by ${impact.netWorthChange >= 0 ? '+' : ''}₹${impact.netWorthChange.toLocaleString('en-IN')}.`
          : `CAUTION: Purchasing ${itemDesc || 'this item'} for ₹${amount.toLocaleString('en-IN')} would exceed your liquid reserves of ₹${before.liquidReserves.toLocaleString('en-IN')} by ₹${(amount - before.liquidReserves).toLocaleString('en-IN')}, leading to severe cash shortfall!`,
        evidence: [
          { label: 'Purchase Amount', value: `₹${amount.toLocaleString('en-IN')}` },
          { label: 'Current Liquid Reserves', value: `₹${before.liquidReserves.toLocaleString('en-IN')}` },
          { label: 'Simulated Liquid Reserves', value: `₹${after.liquidReserves.toLocaleString('en-IN')}` },
          { label: 'Current Runway', value: `${before.runwayMonths ?? 'N/A'} mos` },
          { label: 'Simulated Runway', value: `${after.runwayMonths ?? 'N/A'} mos` },
          { label: 'Affordability Assessment', value: willSurvive ? 'Sufficient Reserves' : 'Deficit / Unaffordable' },
        ],
        formulaUsed: 'Simulated_Reserves = Current_Reserves - Purchase_Amount; Runway = Simulated_Reserves / Monthly_Burn',
        recordsAnalyzed: accounts.length + transactions.length,
        hasSufficientData: true,
        suggestedFollowUps: [
          'What happens if I buy with EMI instead?',
          'What are my biggest expenses this month?',
          'How much runway do I have left?',
        ],
      };
    }

    // 2. Intent: Category Spending (e.g. food, rent, shopping, dining)
    const categoryKeywords = ['food', 'dining', 'grocery', 'groceries', 'rent', 'shopping', 'utilities', 'travel', 'entertainment', 'bills', 'healthcare', 'subscription'];
    const matchedCategory = categoryKeywords.find((cat) => lower.includes(cat));
    if (matchedCategory || lower.includes('spend on') || lower.includes('spent on')) {
      const targetCat = matchedCategory || 'general';
      const catTxs = transactions.filter(
        (tx) =>
          tx.type === 'DEBIT' &&
          (tx.category?.toLowerCase().includes(targetCat) ||
            tx.description?.toLowerCase().includes(targetCat) ||
            ((tx as any).merchant && (tx as any).merchant.toLowerCase().includes(targetCat)))
      );

      const totalCatSpend = catTxs.reduce((s, tx) => s + tx.amount, 0);

      if (catTxs.length === 0) {
        return {
          query: trimmed,
          intent: 'SPENDING_BY_CATEGORY',
          answer: `You have ₹0 in recorded expenses for category "${targetCat}" across your ${transactions.length} total transactions.`,
          evidence: [
            { label: 'Category Queried', value: targetCat },
            { label: 'Total Matches Found', value: 0 },
            { label: 'Total Recorded Transactions', value: transactions.length },
          ],
          recordsAnalyzed: transactions.length,
          hasSufficientData: transactions.length > 0,
          limitations: 'Transactions must have categories or descriptions matching the queried keyword.',
          suggestedFollowUps: [
            'How much did I spend this month?',
            'What are my biggest expenses?',
            'Show my total income',
          ],
        };
      }

      const mostRecentDateStr = catTxs[0]?.date
        ? (catTxs[0].date instanceof Date ? catTxs[0].date.toISOString().split('T')[0] : String(catTxs[0].date))
        : 'N/A';

      return {
        query: trimmed,
        intent: 'SPENDING_BY_CATEGORY',
        answer: `You have spent a total of ₹${totalCatSpend.toLocaleString('en-IN')} on ${targetCat.toUpperCase()} across ${catTxs.length} transactions.`,
        evidence: [
          { label: 'Category', value: targetCat.toUpperCase() },
          { label: 'Total Outflow', value: `₹${totalCatSpend.toLocaleString('en-IN')}` },
          { label: 'Transaction Count', value: catTxs.length },
          { label: 'Average per Transaction', value: `₹${Math.round(totalCatSpend / catTxs.length).toLocaleString('en-IN')}` },
          { label: 'Most Recent Date', value: mostRecentDateStr },
        ],
        formulaUsed: `Sum(Debit_Amount WHERE category CONTAINS '${targetCat}')`,
        recordsAnalyzed: catTxs.length,
        hasSufficientData: true,
        suggestedFollowUps: [
          'What are my biggest expenses?',
          'Which merchant received the most money?',
          'How much did I spend this month?',
        ],
      };
    }

    // 3. Intent: Biggest / Largest Expenses
    if (lower.includes('biggest') || lower.includes('largest') || lower.includes('most expensive') || lower.includes('highest expense')) {
      const debits = transactions.filter((t) => t.type === 'DEBIT').sort((a, b) => b.amount - a.amount);
      const top5 = debits.slice(0, 5);

      if (debits.length === 0) {
        return {
          query: trimmed,
          intent: 'BIGGEST_EXPENSES',
          answer: 'You have no expense transactions recorded yet. Add transactions to see your largest expenses.',
          evidence: [{ label: 'Transactions Found', value: 0 }],
          recordsAnalyzed: 0,
          hasSufficientData: false,
          suggestedFollowUps: ['How do I add transactions?', 'What is my net worth?'],
        };
      }

      const topDesc = top5
        .map((t, idx) => {
          const dStr = t.date instanceof Date ? t.date.toISOString().split('T')[0] : String(t.date);
          const mStr = (t as any).merchant || t.description || 'Unknown';
          return `${idx + 1}. ₹${t.amount.toLocaleString('en-IN')} at ${mStr} (${dStr})`;
        })
        .join('\n');

      const firstDStr = top5[0].date instanceof Date ? top5[0].date.toISOString().split('T')[0] : String(top5[0].date);
      const firstMStr = (top5[0] as any).merchant || top5[0].description;

      return {
        query: trimmed,
        intent: 'BIGGEST_EXPENSES',
        answer: `Your single largest expense is ₹${top5[0].amount.toLocaleString('en-IN')} for "${firstMStr}" on ${firstDStr}.\n\nTop 5 Largest Outflows:\n${topDesc}`,
        evidence: top5.map((t, idx) => ({
          label: `#${idx + 1} ${(t as any).merchant || t.description}`,
          value: `₹${t.amount.toLocaleString('en-IN')} (${t.category})`,
        })),
        formulaUsed: 'ORDER BY amount DESC LIMIT 5',
        recordsAnalyzed: debits.length,
        hasSufficientData: true,
        suggestedFollowUps: [
          'Which merchant received the most money?',
          'How much did I spend this month?',
          'What is my monthly burn rate?',
        ],
      };
    }

    // 4. Intent: Which merchant received the most money
    if (lower.includes('merchant') || lower.includes('counterparty') || lower.includes('who received the most')) {
      const merchantMap = new Map<string, { total: number; count: number }>();
      for (const tx of transactions.filter((t) => t.type === 'DEBIT')) {
        const name = (tx as any).merchant || tx.description || 'Unknown';
        const cur = merchantMap.get(name) || { total: 0, count: 0 };
        cur.total += tx.amount;
        cur.count += 1;
        merchantMap.set(name, cur);
      }

      const sorted = Array.from(merchantMap.entries()).sort((a, b) => b[1].total - a[1].total);
      if (sorted.length === 0) {
        return {
          query: trimmed,
          intent: 'TOP_MERCHANT',
          answer: 'No merchant debits found in transaction records.',
          evidence: [],
          recordsAnalyzed: 0,
          hasSufficientData: false,
          suggestedFollowUps: ['How much did I spend this month?'],
        };
      }

      const [topMerchant, topData] = sorted[0];
      return {
        query: trimmed,
        intent: 'TOP_MERCHANT',
        answer: `The merchant that received the most money from you is "${topMerchant}" with a total volume of ₹${topData.total.toLocaleString('en-IN')} across ${topData.count} transactions.`,
        evidence: sorted.slice(0, 5).map(([name, data]) => ({
          label: name,
          value: `₹${data.total.toLocaleString('en-IN')} (${data.count} txs)`,
        })),
        formulaUsed: 'GROUP BY merchant SUM(amount) ORDER BY total DESC',
        recordsAnalyzed: transactions.length,
        hasSufficientData: true,
        suggestedFollowUps: [
          'What are my biggest expenses?',
          'How much did I spend this month?',
          'What is my savings rate?',
        ],
      };
    }

    // 5. Intent: What changed compared with last month
    if (lower.includes('compared with last month') || lower.includes('what changed') || lower.includes('month over month') || lower.includes('vs last month')) {
      const currSpend = currentMonthTxs.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
      const priorSpend = priorMonthTxs.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
      const currIncome = currentMonthTxs.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
      const priorIncome = priorMonthTxs.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);

      if (priorMonthTxs.length === 0) {
        return {
          query: trimmed,
          intent: 'MONTH_OVER_MONTH_COMPARISON',
          answer: `You have recorded ₹${currSpend.toLocaleString('en-IN')} in spending and ₹${currIncome.toLocaleString('en-IN')} in income for this month, but there is no transaction history for the prior month (${priorMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}). More historical data is required to calculate month-over-month change.`,
          evidence: [
            { label: 'Current Month Outflow', value: `₹${currSpend.toLocaleString('en-IN')}` },
            { label: 'Current Month Inflow', value: `₹${currIncome.toLocaleString('en-IN')}` },
            { label: 'Prior Month Records', value: 0 },
          ],
          recordsAnalyzed: currentMonthTxs.length,
          hasSufficientData: false,
          limitations: 'Historical comparison requires transactions in consecutive monthly periods.',
          suggestedFollowUps: [
            'How much did I spend this month?',
            'What is my emergency runway?',
          ],
        };
      }

      const spendDelta = currSpend - priorSpend;
      const spendPercent = priorSpend > 0 ? ((spendDelta / priorSpend) * 100).toFixed(1) : 'N/A';

      return {
        query: trimmed,
        intent: 'MONTH_OVER_MONTH_COMPARISON',
        answer: `Compared to last month, your spending ${spendDelta >= 0 ? 'increased' : 'decreased'} by ₹${Math.abs(spendDelta).toLocaleString('en-IN')} (${spendPercent}%). Current month spending is ₹${currSpend.toLocaleString('en-IN')} vs ₹${priorSpend.toLocaleString('en-IN')} last month.`,
        evidence: [
          { label: 'Current Month Spending', value: `₹${currSpend.toLocaleString('en-IN')}` },
          { label: 'Prior Month Spending', value: `₹${priorSpend.toLocaleString('en-IN')}` },
          { label: 'Spending Difference', value: `${spendDelta >= 0 ? '+' : ''}₹${spendDelta.toLocaleString('en-IN')} (${spendPercent}%)` },
          { label: 'Current Month Income', value: `₹${currIncome.toLocaleString('en-IN')}` },
          { label: 'Prior Month Income', value: `₹${priorIncome.toLocaleString('en-IN')}` },
        ],
        formulaUsed: 'Delta = Current_Month_Spend - Prior_Month_Spend; Percent = (Delta / Prior_Month_Spend) * 100',
        recordsAnalyzed: currentMonthTxs.length + priorMonthTxs.length,
        hasSufficientData: true,
        suggestedFollowUps: [
          'What are my biggest expenses?',
          'What is my monthly burn rate?',
          'What is my savings rate?',
        ],
      };
    }

    // 6. Intent: Income
    if (lower.includes('income') || lower.includes('how much did i earn') || lower.includes('salary') || lower.includes('inflow')) {
      const credits = transactions.filter((t) => t.type === 'CREDIT');
      const totalIncome = credits.reduce((s, t) => s + t.amount, 0);
      const currIncome = currentMonthTxs.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);

      return {
        query: trimmed,
        intent: 'INCOME_STATUS',
        answer: `You received ₹${currIncome.toLocaleString('en-IN')} in income this month across ${currentMonthTxs.filter((t) => t.type === 'CREDIT').length} credits. Your total lifetime recorded income across all ${credits.length} credits is ₹${totalIncome.toLocaleString('en-IN')}.`,
        evidence: [
          { label: 'Current Month Income', value: `₹${currIncome.toLocaleString('en-IN')}` },
          { label: 'Total Recorded Income', value: `₹${totalIncome.toLocaleString('en-IN')}` },
          { label: 'Monthly Income Baseline', value: `₹${twin.metrics.monthlyIncome.toLocaleString('en-IN')}` },
          { label: 'Income Transactions', value: credits.length },
        ],
        formulaUsed: 'Sum(Credit_Amount WHERE type == CREDIT)',
        recordsAnalyzed: credits.length,
        hasSufficientData: credits.length > 0,
        suggestedFollowUps: [
          'How much did I spend this month?',
          'What is my savings rate?',
          'What is my net worth?',
        ],
      };
    }

    // 7. Intent: Debt and Loans
    if (lower.includes('debt') || lower.includes('loan') || lower.includes('emi') || lower.includes('owe')) {
      const totalDebt = loans.reduce((s, l) => s + l.outstandingAmount, 0);
      const totalEmi = loans.reduce((s, l) => s + l.emiAmount, 0);

      return {
        query: trimmed,
        intent: 'DEBT_STATUS',
        answer: loans.length > 0
          ? `You have ${loans.length} active loan(s) with a total outstanding debt of ₹${totalDebt.toLocaleString('en-IN')} and monthly EMI obligations of ₹${totalEmi.toLocaleString('en-IN')}. Your debt-to-income (DTI) ratio is ${twin.stateVector.dtiPercent}%.`
          : 'You have no active loans or debt obligations recorded in FinTwin AI. Your debt-to-income (DTI) ratio is 0.0%.',
        evidence: [
          { label: 'Active Loans', value: loans.length },
          { label: 'Total Outstanding Debt', value: `₹${totalDebt.toLocaleString('en-IN')}` },
          { label: 'Monthly EMI Obligations', value: `₹${totalEmi.toLocaleString('en-IN')}` },
          { label: 'Debt-to-Income (DTI)', value: `${twin.stateVector.dtiPercent}%` },
        ],
        formulaUsed: 'Total_Debt = Sum(Outstanding_Amount); DTI = (Monthly_Debt / Monthly_Income) * 100',
        recordsAnalyzed: loans.length,
        hasSufficientData: true,
        suggestedFollowUps: [
          'What is my emergency runway?',
          'How much did I spend this month?',
          'What is my net worth?',
        ],
      };
    }

    // 8. Intent: Goals
    if (lower.includes('goal') || lower.includes('target') || lower.includes('emergency fund')) {
      const activeGoals = goals.filter((g) => (g.status as string) !== 'COMPLETED');
      const totalTarget = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
      const totalSaved = activeGoals.reduce((s, g) => s + g.currentAmount, 0);
      const avgProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

      return {
        query: trimmed,
        intent: 'GOAL_STATUS',
        answer: activeGoals.length > 0
          ? `You have ${activeGoals.length} active financial goal(s). You have saved ₹${totalSaved.toLocaleString('en-IN')} toward your combined target of ₹${totalTarget.toLocaleString('en-IN')} (${avgProgress}% overall completion).`
          : 'You do not have any active financial goals yet. Create an emergency fund or savings goal to track milestones.',
        evidence: activeGoals.map((g) => ({
          label: g.name,
          value: `₹${g.currentAmount.toLocaleString('en-IN')} / ₹${g.targetAmount.toLocaleString('en-IN')} (${g.calculations?.progressPercent ?? 0}%)`,
        })),
        formulaUsed: 'Progress = (Current_Amount / Target_Amount) * 100',
        recordsAnalyzed: activeGoals.length,
        hasSufficientData: activeGoals.length > 0,
        suggestedFollowUps: [
          'What is my emergency runway?',
          'What is my savings rate?',
          'How much did I spend this month?',
        ],
      };
    }

    // 9. Intent: Runway & Liquidity
    if (lower.includes('runway') || lower.includes('how long will my money last') || lower.includes('reserves')) {
      return {
        query: trimmed,
        intent: 'RUNWAY_STATUS',
        answer: `Your emergency runway is ${twin.stateVector.runwayMonths} months. At your current monthly burn velocity of ₹${twin.metrics.monthlyBurn.toLocaleString('en-IN')}, your liquid cash reserves of ₹${twin.summary.liquidReserves.toLocaleString('en-IN')} can sustain your expenditures for ${twin.stateVector.runwayMonths} months without additional income.`,
        evidence: [
          { label: 'Liquid Cash Reserves', value: `₹${twin.summary.liquidReserves.toLocaleString('en-IN')}` },
          { label: 'Monthly Burn Rate', value: `₹${twin.metrics.monthlyBurn.toLocaleString('en-IN')}` },
          { label: 'Calculated Runway', value: `${twin.stateVector.runwayMonths} months` },
          { label: 'Safe Benchmark', value: '6.0 months' },
        ],
        formulaUsed: 'Runway = Liquid_Reserves / Monthly_Burn',
        recordsAnalyzed: accounts.length + transactions.length,
        hasSufficientData: true,
        suggestedFollowUps: [
          'What happens if I buy a ₹50,000 laptop?',
          'What are my biggest expenses?',
          'What is my net worth?',
        ],
      };
    }

    // Default / Spending this month fallback
    const currSpend = currentMonthTxs.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
    const monthName = now.toLocaleString('default', { month: 'long' });

    return {
      query: trimmed,
      intent: 'MONTHLY_SPEND',
      answer: `You have spent ₹${currSpend.toLocaleString('en-IN')} in ${monthName} ${currentYear} across ${currentMonthTxs.filter((t) => t.type === 'DEBIT').length} debit transactions. Your net worth is ₹${twin.summary.netWorth.toLocaleString('en-IN')} with a savings rate of ${twin.stateVector.savingsRatePercent}%.`,
      evidence: [
        { label: `${monthName} Outflow`, value: `₹${currSpend.toLocaleString('en-IN')}` },
        { label: 'Net Worth', value: `₹${twin.summary.netWorth.toLocaleString('en-IN')}` },
        { label: 'Savings Rate', value: `${twin.stateVector.savingsRatePercent}%` },
        { label: 'Liquid Balance', value: `₹${twin.summary.liquidReserves.toLocaleString('en-IN')}` },
        { label: 'Total Accounts', value: accounts.length },
      ],
      formulaUsed: 'Sum(Debit_Amount WHERE month == current_month)',
      recordsAnalyzed: currentMonthTxs.length,
      hasSufficientData: currentMonthTxs.length > 0,
      limitations: currentMonthTxs.length === 0 ? 'No transactions recorded yet in current month.' : undefined,
      suggestedFollowUps: [
        'What are my biggest expenses?',
        'What happens if I buy a ₹70,000 laptop?',
        'Which merchant received the most money?',
        'How much runway do I have left?',
      ],
    };
  },
};
