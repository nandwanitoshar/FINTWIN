/**
 * spendingService.ts
 * Phase B — Working Spending Analytics Engine
 *
 * Deterministic aggregation of expense transactions:
 * 1. Total spending
 * 2. Category breakdown with percentage and transaction count
 * 3. Monthly spending time series
 * 4. Top spending categories and top merchants
 * 5. Handles uncategorized transactions cleanly without fake classifications
 * 6. Strictly scoped to authenticated user (tenant isolation)
 */

import { TransactionRepository, ITransaction } from '../models/Transaction.js';
import { EntityRepository } from '../models/Entity.js';
import { AccountRepository } from '../models/Account.js';

export interface CategorySpending {
  category: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
  averageTransaction: number;
}

export interface MonthlySpending {
  key: string;
  year: number;
  monthIndex: number;
  monthLabel: string;
  amount: number;
  transactionCount: number;
}

export interface TopMerchant {
  name: string;
  entityId?: string;
  amount: number;
  transactionCount: number;
}

export interface SpendingBreakdownResult {
  hasData: boolean;
  totalSpending: number;
  totalExpenses?: number;
  transactionCount: number;
  averageMonthlySpending: number;
  categoryBreakdown: CategorySpending[];
  monthlySpending: MonthlySpending[];
  topCategories: CategorySpending[];
  topMerchants: TopMerchant[];
  recentExpenses: Array<{
    _id: string;
    date: Date;
    description: string;
    category: string;
    amount: number;
    accountName: string;
    merchantName?: string;
  }>;
  limitations: string[];
}

export const SpendingService = {
  /**
   * Deterministically analyzes expenses for the authenticated user.
   */
  async getSpendingBreakdown(userId: string): Promise<SpendingBreakdownResult> {
    const [txResult, entities, accounts] = await Promise.all([
      TransactionRepository.findByUserId(userId, { limit: 2000 }),
      EntityRepository.findByUserId(userId),
      AccountRepository.findByUserId(userId),
    ]);

    const transactions = txResult.transactions || [];

    // Filter strictly debit/expense transactions
    const expenseTx = transactions.filter((t: ITransaction) => {
      const dir = (t.direction || '').toUpperCase();
      const typ = (t.type || '').toUpperCase();
      return dir === 'EXPENSE' || typ === 'DEBIT';
    });

    // Map entities & accounts for fast resolution
    const entityMap = new Map<string, string>();
    for (const ent of entities) {
      if (ent._id && ent.name) {
        entityMap.set(ent._id.toString(), ent.name);
      }
    }

    const accountMap = new Map<string, string>();
    for (const acc of accounts) {
      if (acc._id && acc.name) {
        accountMap.set(acc._id.toString(), acc.name);
      }
    }

    // Empty dataset handling
    if (expenseTx.length === 0) {
      return {
        hasData: false,
        totalSpending: 0,
        totalExpenses: 0,
        transactionCount: 0,
        averageMonthlySpending: 0,
        categoryBreakdown: [],
        monthlySpending: [],
        topCategories: [],
        topMerchants: [],
        recentExpenses: [],
        limitations: [
          'No expense records found for this account. Import a bank statement or add transactions to analyze spending.',
        ],
      };
    }

    // 1. Total Spending
    let totalSpendingPaise = 0;
    for (const tx of expenseTx) {
      totalSpendingPaise += Math.round((tx.amount || 0) * 100);
    }
    const totalSpending = Math.round(totalSpendingPaise) / 100;

    // 2. Category Breakdown
    const catMap = new Map<string, { amountPaise: number; count: number }>();
    for (const tx of expenseTx) {
      const rawCategory = typeof tx.category === 'string' ? tx.category.trim() : '';
      const isUncategorized =
        !rawCategory ||
        rawCategory.toLowerCase() === 'uncategorized' ||
        rawCategory.toLowerCase() === 'general' ||
        rawCategory.toLowerCase() === 'other';
      const category = isUncategorized ? 'Uncategorized' : rawCategory;

      const current = catMap.get(category) || { amountPaise: 0, count: 0 };
      current.amountPaise += Math.round((tx.amount || 0) * 100);
      current.count += 1;
      catMap.set(category, current);
    }

    const categoryBreakdown: CategorySpending[] = Array.from(catMap.entries())
      .map(([category, data]) => {
        const totalAmount = Math.round(data.amountPaise) / 100;
        const percentage = totalSpending > 0 ? Math.round((totalAmount / totalSpending) * 1000) / 10 : 0;
        const averageTransaction = data.count > 0 ? Math.round((totalAmount / data.count) * 100) / 100 : 0;
        return {
          category,
          totalAmount,
          percentage,
          transactionCount: data.count,
          averageTransaction,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // 3. Monthly Spending Trend
    const monthMap = new Map<string, { year: number; month: number; amountPaise: number; count: number }>();
    for (const tx of expenseTx) {
      const d = new Date(tx.date || tx.createdAt || Date.now());
      const y = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
      const m = isNaN(d.getMonth()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;

      const current = monthMap.get(key) || { year: y, month: m, amountPaise: 0, count: 0 };
      current.amountPaise += Math.round((tx.amount || 0) * 100);
      current.count += 1;
      monthMap.set(key, current);
    }

    const monthKeys = Array.from(monthMap.keys()).sort();
    const monthlySpending: MonthlySpending[] = monthKeys.map((key) => {
      const data = monthMap.get(key)!;
      const dateObj = new Date(data.year, data.month - 1, 1);
      const monthLabel = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return {
        key,
        year: data.year,
        monthIndex: data.month,
        monthLabel,
        amount: Math.round(data.amountPaise) / 100,
        transactionCount: data.count,
      };
    });

    const averageMonthlySpending =
      monthlySpending.length > 0 ? Math.round((totalSpending / monthlySpending.length) * 100) / 100 : totalSpending;

    // 4. Top Merchants / Counterparties
    const merchantMap = new Map<string, { name: string; entityId?: string; amountPaise: number; count: number }>();
    for (const tx of expenseTx) {
      let merchantName = '';
      const entIdStr = tx.entityId ? tx.entityId.toString() : tx.destinationEntityId ? tx.destinationEntityId.toString() : '';

      if (entIdStr && entityMap.has(entIdStr)) {
        merchantName = entityMap.get(entIdStr)!;
      } else if (tx.description && tx.description.trim().length > 0) {
        merchantName = tx.description.trim();
      } else {
        merchantName = 'Direct Outflow';
      }

      const current = merchantMap.get(merchantName) || {
        name: merchantName,
        entityId: entIdStr || undefined,
        amountPaise: 0,
        count: 0,
      };
      current.amountPaise += Math.round((tx.amount || 0) * 100);
      current.count += 1;
      merchantMap.set(merchantName, current);
    }

    const topMerchants: TopMerchant[] = Array.from(merchantMap.values())
      .map((m) => ({
        name: m.name,
        entityId: m.entityId,
        amount: Math.round(m.amountPaise) / 100,
        transactionCount: m.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // 5. Recent Expenses with contextual relations
    const recentExpenses = expenseTx.slice(0, 25).map((tx: ITransaction) => {
      const accIdStr = tx.accountId ? tx.accountId.toString() : tx.sourceAccountId ? tx.sourceAccountId.toString() : '';
      const entIdStr = tx.entityId ? tx.entityId.toString() : tx.destinationEntityId ? tx.destinationEntityId.toString() : '';

      const rawCat = tx.category ? tx.category.trim() : '';
      const isUncat =
        !rawCat ||
        rawCat.toLowerCase() === 'uncategorized' ||
        rawCat.toLowerCase() === 'general' ||
        rawCat.toLowerCase() === 'other';

      return {
        _id: tx._id,
        date: tx.date,
        description: tx.description,
        category: isUncat ? 'Uncategorized' : rawCat,
        amount: tx.amount,
        accountName: accountMap.get(accIdStr) || 'Primary Account',
        merchantName: entIdStr ? entityMap.get(entIdStr) : undefined,
      };
    });

    const limitations: string[] = [];
    limitations.push(
      `Analytics calculated deterministically from ${expenseTx.length} verified debit transactions across ${monthlySpending.length} active month(s).`
    );
    const uncategorizedItem = categoryBreakdown.find((c) => c.category === 'Uncategorized');
    if (uncategorizedItem && uncategorizedItem.transactionCount > 0) {
      limitations.push(
        `${uncategorizedItem.transactionCount} transactions (${uncategorizedItem.percentage}% of total spend) lack classification and are explicitly marked 'Uncategorized'.`
      );
    }

    return {
      hasData: true,
      totalSpending,
      totalExpenses: totalSpending,
      transactionCount: expenseTx.length,
      averageMonthlySpending,
      categoryBreakdown,
      monthlySpending,
      topCategories: categoryBreakdown.slice(0, 5),
      topMerchants,
      recentExpenses,
      limitations,
    };
  },
};
