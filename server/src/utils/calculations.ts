/**
 * FinTwin AI — Phase 2: Deterministic Calculations & Safe Monetary Arithmetic
 * Zero Math.random(), Zero floating-point drift.
 * All monetary amounts are handled with exact rounding or integer paise equivalents.
 */

export interface TransactionSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transactionCount: number;
}

/**
 * Converts a currency amount (e.g. 10500.75) to integer paise (1050075)
 */
export function toPaise(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Converts integer paise (1050075) back to decimal units (10500.75)
 */
export function fromPaise(paise: number): number {
  return paise / 100;
}

/**
 * Calculates sum of account balances using exact integer arithmetic
 */
export function calculateTotalBalance(accounts: Array<{ currentBalance?: number; balance?: number }>): number {
  let totalPaise = 0;
  for (const acc of accounts) {
    const b = acc.currentBalance !== undefined ? acc.currentBalance : acc.balance || 0;
    totalPaise += toPaise(b);
  }
  return fromPaise(totalPaise);
}

/**
 * Calculates total income inflows (CREDIT / INCOME)
 */
export function calculateTotalIncome(transactions: Array<{ amount: number; type?: string; direction?: string }>): number {
  let incomePaise = 0;
  for (const tx of transactions) {
    const isCredit =
      tx.type === 'CREDIT' ||
      tx.type === 'INCOME' ||
      tx.direction === 'INCOME' ||
      tx.direction === 'CREDIT';
    if (isCredit) {
      incomePaise += toPaise(tx.amount || 0);
    }
  }
  return fromPaise(incomePaise);
}

/**
 * Calculates total expenses outflows (DEBIT / EXPENSE)
 */
export function calculateTotalExpenses(transactions: Array<{ amount: number; type?: string; direction?: string }>): number {
  let expensePaise = 0;
  for (const tx of transactions) {
    const isDebit =
      tx.type === 'DEBIT' ||
      tx.type === 'EXPENSE' ||
      tx.direction === 'EXPENSE' ||
      tx.direction === 'DEBIT';
    if (isDebit) {
      expensePaise += toPaise(tx.amount || 0);
    }
  }
  return fromPaise(expensePaise);
}

/**
 * Calculates Net Cash Flow = Total Income - Total Expenses
 */
export function calculateNetCashFlow(transactions: Array<{ amount: number; type?: string; direction?: string }>): number {
  const incomePaise = toPaise(calculateTotalIncome(transactions));
  const expensePaise = toPaise(calculateTotalExpenses(transactions));
  return fromPaise(incomePaise - expensePaise);
}

/**
 * Calculates transaction count
 */
export function calculateTransactionCount(transactions: Array<any>): number {
  return transactions.length;
}
