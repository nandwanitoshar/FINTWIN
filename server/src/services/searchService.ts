import { AccountRepository } from '../models/Account.js';
import { TransactionRepository } from '../models/Transaction.js';
import { EntityRepository } from '../models/Entity.js';
import { GoalRepository } from '../models/Goal.js';
import { LoanRepository } from '../models/Loan.js';
import { SimulationScenarioRepository } from '../models/SimulationScenario.js';
import { RecurringExpenseRepository } from '../models/RecurringExpense.js';
import { RiskSignalService } from './riskSignalService.js';

export interface SearchResultItem {
  id: string;
  type: 'ACCOUNT' | 'TRANSACTION' | 'ENTITY' | 'GOAL' | 'LOAN' | 'SIMULATION' | 'RISK_SIGNAL' | 'RECURRING';
  title: string;
  subtitle: string;
  amount?: number;
  date?: string;
  targetUrl: string;
  icon: string;
}

export interface SearchResponse {
  query: string;
  totalMatches: number;
  results: SearchResultItem[];
  byCategory: {
    accounts: SearchResultItem[];
    transactions: SearchResultItem[];
    entities: SearchResultItem[];
    goals: SearchResultItem[];
    loans: SearchResultItem[];
    simulations: SearchResultItem[];
    riskSignals: SearchResultItem[];
    recurring: SearchResultItem[];
  };
}

export const SearchService = {
  /**
   * Unified search across user's entire financial digital twin
   */
  async search(userId: string, query: string): Promise<SearchResponse> {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return {
        query: '',
        totalMatches: 0,
        results: [],
        byCategory: { accounts: [], transactions: [], entities: [], goals: [], loans: [], simulations: [], riskSignals: [], recurring: [] },
      };
    }

    const [accounts, { transactions }, entities, goals, loans, simulations, recurringExpenses, riskSignalsList] =
      await Promise.all([
        AccountRepository.findByUserId(userId),
        TransactionRepository.findByUserId(userId, { limit: 1000 }),
        EntityRepository.findByUserId(userId),
        GoalRepository.findByUserId(userId),
        LoanRepository.findByUserId(userId),
        SimulationScenarioRepository.findByUserId(userId),
        RecurringExpenseRepository.findByUserId(userId),
        RiskSignalService.detectSignals(userId).catch(() => [] as any[]),
      ]);

    const resAccounts: SearchResultItem[] = accounts
      .filter((a) => a.name.toLowerCase().includes(q) || a.institution.toLowerCase().includes(q) || a.type.toLowerCase().includes(q))
      .slice(0, 5)
      .map((a) => ({
        id: a._id,
        type: 'ACCOUNT',
        title: a.name,
        subtitle: `${a.institution} • ${a.type}`,
        amount: a.currentBalance ?? a.balance,
        targetUrl: `/accounts?id=${a._id}`,
        icon: 'Building2',
      }));

    const resTxs: SearchResultItem[] = transactions
      .filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          ((t as any).merchant && (t as any).merchant.toLowerCase().includes(q)) ||
          t.category.toLowerCase().includes(q) ||
          String(t.amount).includes(q)
      )
      .slice(0, 8)
      .map((t) => {
        const dStr = t.date instanceof Date ? t.date.toISOString().split('T')[0] : String(t.date);
        return {
          id: t._id,
          type: 'TRANSACTION',
          title: (t as any).merchant || t.description,
          subtitle: `${t.category} • ${t.type}`,
          amount: t.amount,
          date: dStr,
          targetUrl: `/transactions?id=${t._id}`,
          icon: 'Database',
        };
      });

    const resEntities: SearchResultItem[] = entities
      .filter((e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q))
      .slice(0, 5)
      .map((e) => ({
        id: e._id,
        type: 'ENTITY',
        title: e.name,
        subtitle: `Counterparty • ${e.type}`,
        targetUrl: `/entities?id=${e._id}`,
        icon: 'Share2',
      }));

    const resGoals: SearchResultItem[] = goals
      .filter((g) => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
      .slice(0, 5)
      .map((g) => ({
        id: g._id,
        type: 'GOAL',
        title: g.name,
        subtitle: `Goal (${g.calculations?.progressPercent ?? 0}% achieved)`,
        amount: g.targetAmount,
        targetUrl: `/goals?id=${g._id}`,
        icon: 'Target',
      }));

    const resLoans: SearchResultItem[] = loans
      .filter((l) => l.name.toLowerCase().includes(q) || l.lender.toLowerCase().includes(q))
      .slice(0, 5)
      .map((l) => ({
        id: l._id,
        type: 'LOAN',
        title: l.name,
        subtitle: `Lender: ${l.lender} • APR ${l.interestRateApr}%`,
        amount: l.outstandingAmount,
        targetUrl: `/debt-loans?id=${l._id}`,
        icon: 'CreditCard',
      }));

    const resSims: SearchResultItem[] = simulations
      .filter((s) => s.scenarioName.toLowerCase().includes(q) || (s as any).scenarioType?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({
        id: s._id,
        type: 'SIMULATION',
        title: s.scenarioName,
        subtitle: `Simulation Scenario • Horizon ${s.horizonMonths} mos`,
        targetUrl: `/history?id=${s._id}`,
        icon: 'Sliders',
      }));

    const resRiskSignals: SearchResultItem[] = (riskSignalsList as any[])
      .filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.type?.toLowerCase().includes(q) ||
          s.severity?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((s) => ({
        id: s.id || s._id || s.type || 'signal',
        type: 'RISK_SIGNAL',
        title: s.title || s.type,
        subtitle: `Risk Signal • ${s.severity}`,
        targetUrl: `/risk-signals`,
        icon: 'ShieldAlert',
      }));

    const resRecurring: SearchResultItem[] = recurringExpenses
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.entityName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.cadence.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((r) => ({
        id: r._id,
        type: 'RECURRING',
        title: r.name,
        subtitle: `${r.cadence} • ${r.category}`,
        amount: r.averageAmount,
        targetUrl: `/recurring`,
        icon: 'Repeat',
      }));

    const all = [
      ...resAccounts,
      ...resTxs,
      ...resEntities,
      ...resGoals,
      ...resLoans,
      ...resSims,
      ...resRiskSignals,
      ...resRecurring,
    ];

    return {
      query,
      totalMatches: all.length,
      results: all,
      byCategory: {
        accounts: resAccounts,
        transactions: resTxs,
        entities: resEntities,
        goals: resGoals,
        loans: resLoans,
        simulations: resSims,
        riskSignals: resRiskSignals,
        recurring: resRecurring,
      },
    };
  },
};
