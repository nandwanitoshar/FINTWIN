import { TransactionRepository } from '../models/Transaction.js';
import { AccountRepository } from '../models/Account.js';
import { EntityRepository } from '../models/Entity.js';
import { GoalRepository } from '../models/Goal.js';
import { RecurringExpenseRepository } from '../models/RecurringExpense.js';
import { SimulationScenarioRepository } from '../models/SimulationScenario.js';

export interface DataQualityAudit {
  score: number; // 0 - 100%
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalTransactions: number;
  totalAccounts: number;
  totalEntities: number;
  totalGoals: number;
  totalRecurring: number;
  totalScenarios: number;
  validRecords: number;
  missingCategoriesCount: number;
  missingEntitiesCount: number;
  missingDatesCount: number;
  unsupportedCurrenciesCount: number;
  potentialDuplicatesCount: number;
  historicalSpanMonths: number;
  currenciesFound: string[];
  /**
   * Deterministic completeness label based on historicalSpanMonths:
   * COMPLETE    = >= 12 months of transaction history
   * PARTIAL     = 3 to 11 months
   * INSUFFICIENT = < 3 months (or no transactions)
   */
  completenessLabel: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';
  insufficientHistoryWarning?: string;
  categorizationCoveragePercent: number;
  entityLinkCoveragePercent: number;
  reliabilityAssessment: string;
  hygieneIssues: Array<{
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    affectedCount: number;
    impactOnTwin: string;
    remediationAction: string;
  }>;
}

export const DataQualityService = {
  /**
   * Evaluates data completeness, hygiene, and its deterministic impact on Twin analytics
   */
  async audit(userId: string): Promise<DataQualityAudit> {
    const [{ transactions }, accounts, entities, goals, recurring, scenarios] = await Promise.all([
      TransactionRepository.findByUserId(userId, { limit: 2000 }),
      AccountRepository.findByUserId(userId),
      EntityRepository.findByUserId(userId),
      GoalRepository.findByUserId(userId),
      RecurringExpenseRepository.findByUserId(userId),
      SimulationScenarioRepository.findByUserId(userId),
    ]);

    const totalTxs = transactions.length;

    let missingCategories = 0;
    let missingEntities = 0;
    let missingDates = 0;
    let unsupportedCurrencies = 0;
    let potentialDuplicates = 0;

    // Fingerprint check for duplicate detection
    const fingerprintSet = new Set<string>();
    const dates: Date[] = [];

    for (const tx of transactions) {
      // Category check
      if (!tx.category || tx.category === 'Uncategorized' || tx.category === 'OTHER' || tx.category === 'General') {
        missingCategories++;
      }

      // Entity link check
      if (!tx.destinationEntityId && !(tx as any).merchant) {
        missingEntities++;
      }

      // Date check
      if (!tx.date || isNaN(new Date(tx.date).getTime())) {
        missingDates++;
      } else {
        dates.push(new Date(tx.date));
      }

      // Currency check
      if (tx.currency && !['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(tx.currency)) {
        unsupportedCurrencies++;
      }

      // Duplicate fingerprint: date + amount + description
      const fp = `${tx.date}_${tx.amount}_${(tx.description || '').trim().toLowerCase()}`;
      if (fingerprintSet.has(fp)) {
        potentialDuplicates++;
      } else {
        fingerprintSet.add(fp);
      }
    }

    // Historical span
    let historicalSpanMonths = 0;
    if (dates.length >= 2) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      const diffMs = maxDate.getTime() - minDate.getTime();
      historicalSpanMonths = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30)));
    } else if (dates.length === 1) {
      historicalSpanMonths = 1;
    }

    // Currencies found across transactions
    const currencySet = new Set<string>();
    for (const tx of transactions) {
      if (tx.currency) currencySet.add(tx.currency);
    }
    for (const acc of accounts) {
      if ((acc as any).currency) currencySet.add((acc as any).currency);
    }
    const currenciesFound = Array.from(currencySet).sort();

    // Completeness label — deterministic thresholds:
    // COMPLETE: >= 12 months, PARTIAL: 3-11 months, INSUFFICIENT: < 3 months
    let completenessLabel: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';
    let insufficientHistoryWarning: string | undefined;
    if (totalTxs === 0) {
      completenessLabel = 'INSUFFICIENT';
      insufficientHistoryWarning = 'No transaction history available. Add or import transactions to evaluate data quality and enable projections.';
    } else if (historicalSpanMonths >= 12) {
      completenessLabel = 'COMPLETE';
    } else if (historicalSpanMonths >= 3) {
      completenessLabel = 'PARTIAL';
      insufficientHistoryWarning = `Only ${historicalSpanMonths} month(s) of history available. 12-month projections use average-based extrapolation. Results improve with more historical data.`;
    } else {
      completenessLabel = 'INSUFFICIENT';
      insufficientHistoryWarning = `Only ${historicalSpanMonths} month(s) of history available. Recurring pattern detection and projection accuracy are limited. Import older statements to improve confidence.`;
    }

    // Coverages
    const categorizationCoverage = totalTxs > 0 ? Math.round(((totalTxs - missingCategories) / totalTxs) * 100) : 100;
    const entityLinkCoverage = totalTxs > 0 ? Math.round(((totalTxs - missingEntities) / totalTxs) * 100) : 100;

    // Compute composite quality score (0 - 100)
    let score = 100;
    if (totalTxs === 0) {
      score = accounts.length > 0 ? 70 : 0;
    } else {
      if (categorizationCoverage < 90) score -= (90 - categorizationCoverage) * 0.4;
      if (entityLinkCoverage < 80) score -= (80 - entityLinkCoverage) * 0.3;
      if (potentialDuplicates > 0) score -= Math.min(15, potentialDuplicates * 2);
      if (missingDates > 0) score -= Math.min(20, missingDates * 5);
      if (historicalSpanMonths < 3) score -= 10;
    }
    score = Math.max(0, Math.min(100, Math.round(score)));

    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (score < 50) grade = 'F';
    else if (score < 65) grade = 'D';
    else if (score < 75) grade = 'C';
    else if (score < 88) grade = 'B';

    const hygieneIssues: Array<{
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      title: string;
      description: string;
      affectedCount: number;
      impactOnTwin: string;
      remediationAction: string;
    }> = [];

    if (missingCategories > 0) {
      hygieneIssues.push({
        severity: missingCategories > totalTxs * 0.3 ? 'HIGH' : 'MEDIUM',
        title: 'Uncategorized Expenditures',
        description: `${missingCategories} transactions lack granular category tags.`,
        affectedCount: missingCategories,
        impactOnTwin: 'Skews monthly burn breakdown and limits accuracy of category-specific risk signals.',
        remediationAction: 'Assign specific categories (e.g. Dining, Rent, Utilities) in the Transactions ledger.',
      });
    }

    if (potentialDuplicates > 0) {
      hygieneIssues.push({
        severity: 'HIGH',
        title: 'Potential Duplicate Records',
        description: `${potentialDuplicates} transactions share identical date, amount, and description fingerprints.`,
        affectedCount: potentialDuplicates,
        impactOnTwin: 'Artificially inflates monthly outflow and distorts emergency runway calculations.',
        remediationAction: 'Inspect flagged duplicate transactions and remove redundant entries.',
      });
    }

    if (entityLinkCoverage < 80 && totalTxs > 0) {
      hygieneIssues.push({
        severity: 'MEDIUM',
        title: 'Unlinked Counterparties',
        description: `${missingEntities} transactions have not been mapped to structured counterparty entities.`,
        affectedCount: missingEntities,
        impactOnTwin: 'Network graph nodes cannot visualize flow channels for these transactions.',
        remediationAction: 'Add entities in Counterparty Directory or import bank statements with structured merchant names.',
      });
    }

    if (historicalSpanMonths < 3 && totalTxs > 0) {
      hygieneIssues.push({
        severity: 'LOW',
        title: 'Limited Historical Horizon',
        description: `Only ${historicalSpanMonths} month(s) of transaction history is available.`,
        affectedCount: totalTxs,
        impactOnTwin: 'Month-over-month trends and cyclical recurrence detection require at least 90 days of continuity.',
        remediationAction: 'Import older bank statements to enable robust seasonal intelligence.',
      });
    }

    let reliabilityAssessment = 'Authoritative: Sufficient data quality for all mathematical twin projections.';
    if (score < 60) {
      reliabilityAssessment = 'Low Confidence: High rate of missing metadata may degrade simulation accuracy.';
    } else if (score < 80) {
      reliabilityAssessment = 'Moderate Confidence: Core balances and runway are accurate, but category analytics are partial.';
    }

    return {
      score,
      grade,
      totalTransactions: totalTxs,
      totalAccounts: accounts.length,
      totalEntities: entities.length,
      totalGoals: goals.length,
      totalRecurring: recurring.length,
      totalScenarios: scenarios.length,
      validRecords: totalTxs - missingDates - potentialDuplicates,
      missingCategoriesCount: missingCategories,
      missingEntitiesCount: missingEntities,
      missingDatesCount: missingDates,
      unsupportedCurrenciesCount: unsupportedCurrencies,
      potentialDuplicatesCount: potentialDuplicates,
      historicalSpanMonths,
      currenciesFound,
      completenessLabel,
      insufficientHistoryWarning,
      categorizationCoveragePercent: categorizationCoverage,
      entityLinkCoveragePercent: entityLinkCoverage,
      reliabilityAssessment,
      hygieneIssues,
    };
  },
};
