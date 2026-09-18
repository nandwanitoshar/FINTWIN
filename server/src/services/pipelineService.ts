import { AccountRepository } from '../models/Account.js';
import { EntityRepository, EntityType } from '../models/Entity.js';
import { TransactionRepository, ITransaction } from '../models/Transaction.js';
import { toPaise, fromPaise } from '../utils/calculations.js';

export interface RawTransactionInput {
  date?: string | Date;
  timestamp?: string | Date;
  description?: string;
  narration?: string;
  memo?: string;
  details?: string;
  merchant?: string;
  counterparty?: string;
  amount?: number | string;
  debit?: number | string;
  credit?: number | string;
  withdrawal?: number | string;
  deposit?: number | string;
  direction?: string;
  type?: string;
  category?: string;
  currency?: string;
  reference?: string;
  ref?: string;
  accountId?: string;
  destinationAccountId?: string;
}

export interface IngestionSummary {
  total: number;
  valid: number;
  imported: number;
  duplicates: number;
  rejected: number;
}

export interface RowError {
  row: number;
  reason: string;
  raw?: any;
}

export interface IngestionResult {
  success: boolean;
  summary: IngestionSummary;
  errors: RowError[];
  transactions: ITransaction[];
  entitiesDiscovered: number;
  normalizedCount: number;
  duplicatesSkipped: number;
}

/**
 * Normalizes currency symbols and codes
 */
export function normalizeCurrency(raw?: string): { currency: string; isValid: boolean; warning?: string; error?: string } {
  if (!raw || raw.trim() === '') {
    return { currency: 'INR', isValid: true };
  }

  const trimmed = raw.trim().toUpperCase();

  if (trimmed === '₹' || trimmed === 'RS' || trimmed === 'RS.' || trimmed === 'INR') {
    return { currency: 'INR', isValid: true };
  }
  if (trimmed === '$' || trimmed === 'USD') {
    return { currency: 'USD', isValid: true };
  }
  if (trimmed === '€' || trimmed === 'EUR') {
    return { currency: 'EUR', isValid: true };
  }
  if (trimmed === '£' || trimmed === 'GBP') {
    return { currency: 'GBP', isValid: true };
  }
  if (['CAD', 'AUD', 'SGD', 'JPY', 'CHF', 'AED'].includes(trimmed)) {
    return { currency: trimmed, isValid: true };
  }

  // Check if string contains symbol
  if (raw.includes('₹')) return { currency: 'INR', isValid: true };
  if (raw.includes('$')) return { currency: 'USD', isValid: true };
  if (raw.includes('€')) return { currency: 'EUR', isValid: true };
  if (raw.includes('£')) return { currency: 'GBP', isValid: true };

  return { currency: '', isValid: false, warning: `Unrecognized currency '${raw}', rejected.`, error: `Unsupported or ambiguous currency '${raw}'` };
}

/**
 * Normalizes transaction direction
 */
export function normalizeDirection(
  rawDirection?: string,
  rawDebit?: any,
  rawCredit?: any
): 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'REFUND' | 'OTHER' {
  if (rawDirection) {
    const d = rawDirection.trim().toUpperCase();
    if (['CREDIT', 'CR', 'INCOME', 'DEPOSIT'].includes(d)) return 'INCOME';
    if (['DEBIT', 'DR', 'EXPENSE', 'WITHDRAWAL'].includes(d)) return 'EXPENSE';
    if (['TRANSFER', 'INTERNAL_TRANSFER', 'XFER'].includes(d)) return 'TRANSFER';
    if (['REFUND', 'REVERSAL'].includes(d)) return 'REFUND';
  }

  if (rawCredit !== undefined && rawCredit !== '' && Number(rawCredit) > 0) {
    return 'INCOME';
  }
  if (rawDebit !== undefined && rawDebit !== '' && Number(rawDebit) > 0) {
    return 'EXPENSE';
  }

  return 'EXPENSE';
}

/**
 * Normalizes amount safely without floating-point loss
 */
export function normalizeAmount(
  rawAmount?: number | string,
  rawDebit?: number | string,
  rawCredit?: number | string
): { amount: number; amountPaise: number; isValid: boolean; direction: 'INCOME' | 'EXPENSE' | 'TRANSFER' } {
  // Reject negative numbers or zero
  if (typeof rawAmount === 'number' && rawAmount <= 0) {
    return { amount: 0, amountPaise: 0, isValid: false, direction: 'EXPENSE' };
  }
  if (typeof rawDebit === 'number' && rawDebit <= 0) {
    return { amount: 0, amountPaise: 0, isValid: false, direction: 'EXPENSE' };
  }
  if (typeof rawCredit === 'number' && rawCredit <= 0) {
    return { amount: 0, amountPaise: 0, isValid: false, direction: 'INCOME' };
  }

  // Reject strings starting with '-'
  if (typeof rawAmount === 'string' && rawAmount.trim().startsWith('-')) {
    return { amount: 0, amountPaise: 0, isValid: false, direction: 'EXPENSE' };
  }

  const cleanToNum = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return Math.abs(val);
    // Remove currency symbols, commas, spaces
    const cleaned = val.toString().replace(/[^0-9.]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  };

  const creditNum = cleanToNum(rawCredit);
  if (creditNum > 0) {
    return {
      amount: creditNum,
      amountPaise: toPaise(creditNum),
      isValid: true,
      direction: 'INCOME',
    };
  }

  const debitNum = cleanToNum(rawDebit);
  if (debitNum > 0) {
    return {
      amount: debitNum,
      amountPaise: toPaise(debitNum),
      isValid: true,
      direction: 'EXPENSE',
    };
  }

  const amtNum = cleanToNum(rawAmount);
  if (amtNum > 0) {
    let direction: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE';
    if (typeof rawAmount === 'string') {
      const lower = rawAmount.toLowerCase();
      if (lower.includes('+') || lower.includes('cr')) {
        direction = 'INCOME';
      }
    }
    return {
      amount: amtNum,
      amountPaise: toPaise(amtNum),
      isValid: true,
      direction,
    };
  }

  return { amount: 0, amountPaise: 0, isValid: false, direction: 'EXPENSE' };
}

/**
 * Normalizes dates into standard Date objects and ISO 8601 strings
 */
export function normalizeDate(rawDate?: any): { date: Date; iso: string; isValid: boolean } {
  if (!rawDate) {
    const d = new Date();
    return { date: d, iso: d.toISOString(), isValid: true };
  }

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return { date: rawDate, iso: rawDate.toISOString(), isValid: true };
  }

  const str = rawDate.toString().trim();
  const directParse = new Date(str);
  if (!isNaN(directParse.getTime())) {
    return { date: directParse, iso: directParse.toISOString(), isValid: true };
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10) - 1;
    const p2 = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2], 10);

    // Try DD/MM/YYYY
    const d1 = new Date(p2, p1, p0);
    if (!isNaN(d1.getTime())) {
      return { date: d1, iso: d1.toISOString(), isValid: true };
    }

    // Try YYYY/MM/DD
    const d2 = new Date(p0, p1, p2);
    if (!isNaN(d2.getTime())) {
      return { date: d2, iso: d2.toISOString(), isValid: true };
    }
  }

  return { date: new Date(), iso: new Date().toISOString(), isValid: false };
}

/**
 * Inferred categories based on description text
 */
export function categorizeDescription(desc: string): { category: string; entityType: EntityType } {
  const lower = desc.toLowerCase();

  if (lower.includes('salary') || lower.includes('payroll') || lower.includes('stipend') || lower.includes('dividend')) {
    return { category: 'Income', entityType: 'EMPLOYER' };
  }
  if (lower.includes('rent') || lower.includes('landlord') || lower.includes('maintenance') || lower.includes('housing')) {
    return { category: 'Housing', entityType: 'UTILITY' };
  }
  if (lower.includes('emi') || lower.includes('loan') || lower.includes('interest') || lower.includes('mortgage')) {
    return { category: 'Debt Service', entityType: 'LENDER' };
  }
  if (lower.includes('grocer') || lower.includes('swiggy') || lower.includes('zomato') || lower.includes('supermarket') || lower.includes('dining')) {
    return { category: 'Food & Dining', entityType: 'MERCHANT' };
  }
  if (lower.includes('uber') || lower.includes('ola') || lower.includes('fuel') || lower.includes('petrol') || lower.includes('flight')) {
    return { category: 'Transportation', entityType: 'MERCHANT' };
  }
  if (lower.includes('electricity') || lower.includes('water') || lower.includes('internet') || lower.includes('broadband') || lower.includes('mobile')) {
    return { category: 'Utilities', entityType: 'UTILITY' };
  }
  if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('shopping') || lower.includes('apparel')) {
    return { category: 'Shopping', entityType: 'MERCHANT' };
  }
  if (lower.includes('mutual fund') || lower.includes('zerodha') || lower.includes('groww') || lower.includes('sip') || lower.includes('stocks')) {
    return { category: 'Investment', entityType: 'INVESTMENT_BROKER' };
  }
  if (lower.includes('transfer') || lower.includes('self') || lower.includes('rebalance')) {
    return { category: 'Internal Transfer', entityType: 'MERCHANT' };
  }

  return { category: 'General Discretionary', entityType: 'MERCHANT' };
}

export const PipelineService = {
  /**
   * Flexible CSV Parser with broad column header detection
   */
  parseCsv(csvContent: string): RawTransactionInput[] {
    const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows: RawTransactionInput[] = [];

    // Map header indices flexibly
    const findHeader = (...keys: string[]) => {
      return headers.findIndex((h) => keys.some((k) => h === k || h.includes(k)));
    };

    const dateIdx = findHeader('date', 'txn date', 'tx_date', 'val_date', 'timestamp');
    const descIdx = findHeader('description', 'narration', 'details', 'particulars', 'merchant', 'memo', 'remarks');
    const amountIdx = findHeader('amount', 'txn_amount', 'transaction amount');
    const debitIdx = findHeader('debit', 'withdrawal', 'dr', 'expense');
    const creditIdx = findHeader('credit', 'deposit', 'cr', 'income');
    const categoryIdx = findHeader('category', 'tag');
    const typeIdx = findHeader('type', 'direction', 'cr/dr');
    const currencyIdx = findHeader('currency', 'curr');
    const refIdx = findHeader('reference', 'ref', 'chq', 'cheque', 'utr');

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) => v.trim().replace(/^"|"$/g, ''));

      rows.push({
        date: dateIdx >= 0 ? values[dateIdx] : undefined,
        description: descIdx >= 0 ? values[descIdx] : undefined,
        amount: amountIdx >= 0 ? values[amountIdx] : undefined,
        debit: debitIdx >= 0 ? values[debitIdx] : undefined,
        credit: creditIdx >= 0 ? values[creditIdx] : undefined,
        category: categoryIdx >= 0 ? values[categoryIdx] : undefined,
        type: typeIdx >= 0 ? values[typeIdx] : undefined,
        currency: currencyIdx >= 0 ? values[currencyIdx] : undefined,
        reference: refIdx >= 0 ? values[refIdx] : undefined,
      });
    }

    return rows;
  },

  /**
   * 01 INGEST & 02 NORMALIZE Pipeline Execution
   */
  async processIngestion(
    userId: string,
    inputs: RawTransactionInput[],
    targetAccountId?: string
  ): Promise<IngestionResult> {
    const total = inputs.length;
    const errors: RowError[] = [];
    const validInputs: Array<{ raw: RawTransactionInput; rowIndex: number }> = [];

    // 1. Initial Validation Pass
    inputs.forEach((item, idx) => {
      const rowNum = idx + 1;
      const { amount, isValid: isAmountValid } = normalizeAmount(item.amount, item.debit, item.credit);

      if (!isAmountValid || amount <= 0) {
        errors.push({
          row: rowNum,
          reason: `Invalid or zero monetary amount: '${item.amount || item.debit || item.credit || ''}'`,
          raw: item,
        });
        return;
      }

      const desc = (item.description || item.narration || item.memo || item.details || '').trim();
      if (!desc) {
        errors.push({
          row: rowNum,
          reason: 'Transaction description or narration is required.',
          raw: item,
        });
        return;
      }

      // Explicit Currency Validation (Requirement 18: Reject unsupported/ambiguous currency)
      if (item.currency !== undefined && item.currency !== null && item.currency.trim() !== '') {
        const { isValid: isCurrValid, error } = normalizeCurrency(item.currency);
        if (!isCurrValid) {
          errors.push({
            row: rowNum,
            reason: error || `Unsupported or ambiguous currency '${item.currency}'`,
            raw: item,
          });
          return;
        }
      }

      validInputs.push({ raw: item, rowIndex: rowNum });
    });

    // 2. Ensure target account exists
    let accountId = targetAccountId;
    const userAccounts = await AccountRepository.findByUserId(userId);

    if (!accountId) {
      if (userAccounts.length > 0) {
        accountId = userAccounts[0]._id;
      } else {
        const defaultAcc = await AccountRepository.create({
          userId,
          name: 'Primary Checking Account',
          type: 'CHECKING',
          institution: 'Primary Bank',
          currentBalance: 0,
        });
        accountId = defaultAcc._id;
      }
    }

    // 3. Counterparty Entity Map
    const existingEntities = await EntityRepository.findByUserId(userId);
    const entityMap = new Map<string, string>();
    existingEntities.forEach((e) => entityMap.set(e.name.toLowerCase(), e._id));

    // 4. Fetch existing user transactions for deterministic deduplication
    const { transactions: existingTxs } = await TransactionRepository.findByUserId(userId, { limit: 1000 });
    const dedupeSet = new Set<string>();

    existingTxs.forEach((t) => {
      const dateStr = t.date ? new Date(t.date).toISOString().split('T')[0] : '';
      const ref = t.reference ? t.reference.trim() : '';
      dedupeSet.add(`${t.sourceAccountId}_${dateStr}_${t.amount}_${t.description.toLowerCase().trim()}_${ref}`);
    });

    const createdTransactions: ITransaction[] = [];
    let duplicatesSkipped = 0;
    let entitiesDiscovered = 0;

    for (const { raw, rowIndex } of validInputs) {
      const description = (raw.description || raw.narration || raw.memo || raw.details || 'Unspecified Transaction').trim();
      const { amount, direction: derivedDirection } = normalizeAmount(raw.amount, raw.debit, raw.credit);
      const direction = normalizeDirection(raw.direction || raw.type, raw.debit, raw.credit) || derivedDirection;

      const { date, isValid: isDateValid } = normalizeDate(raw.date || raw.timestamp);
      const dateStr = isDateValid ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const dedupeRef = raw.reference ? raw.reference.trim() : '';

      // Deduplication check: [accountId, date, amount, description, reference]
      const dedupeKey = `${accountId}_${dateStr}_${amount}_${description.toLowerCase()}_${dedupeRef}`;
      if (dedupeSet.has(dedupeKey)) {
        duplicatesSkipped++;
        continue;
      }
      dedupeSet.add(dedupeKey);

      // Auto-Entity Resolution & Taxonomy
      const { category: inferredCategory, entityType } = categorizeDescription(description);
      const finalCategory = raw.category && raw.category.trim() ? raw.category.trim() : inferredCategory;

      const counterpartyName = (
        raw.counterparty ||
        raw.merchant ||
        description.split(/[-–/]/)[0] ||
        'Counterparty'
      ).trim();

      let entityId = entityMap.get(counterpartyName.toLowerCase());
      if (!entityId && counterpartyName.length > 2) {
        const newEntity = await EntityRepository.create({
          userId,
          name: counterpartyName,
          type: entityType,
          category: finalCategory,
          cadenceScore: entityType === 'EMPLOYER' || entityType === 'UTILITY' ? 1.0 : 0.5,
          riskRating: 'LOW',
        });
        entityId = newEntity._id;
        entityMap.set(counterpartyName.toLowerCase(), entityId);
        entitiesDiscovered++;
      }

      // Map direction to DB TransactionType
      const dbType = direction === 'INCOME' ? 'CREDIT' : 'DEBIT';

      // Record normalized transaction
      const tx = await TransactionRepository.create({
        userId,
        date,
        amount,
        sourceAccountId: accountId,
        destinationEntityId: entityId,
        category: finalCategory,
        type: dbType,
        description,
      });

      createdTransactions.push(tx);

      // Balance adjustment on account
      const targetAcc = userAccounts.find((a) => a._id === accountId);
      if (targetAcc) {
        const balanceDelta = dbType === 'CREDIT' ? amount : -amount;
        targetAcc.currentBalance += balanceDelta;
        await AccountRepository.update(accountId, userId, {
          currentBalance: targetAcc.currentBalance,
        });
      }
    }

    const valid = validInputs.length;
    const imported = createdTransactions.length;
    const rejected = errors.length;

    return {
      success: true,
      summary: {
        total,
        valid,
        imported,
        duplicates: duplicatesSkipped,
        rejected,
      },
      errors,
      transactions: createdTransactions,
      entitiesDiscovered,
      normalizedCount: imported,
      duplicatesSkipped,
    };
  },
};
