import { Response } from 'express';
import {
  TransactionRepository,
  TransactionType,
  TransactionDirection,
  RecurrenceType,
  TransactionSource,
} from '../models/Transaction.js';
import { AccountRepository } from '../models/Account.js';
import { EntityRepository } from '../models/Entity.js';
import { PipelineService, RawTransactionInput } from '../services/pipelineService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const {
      category,
      type,
      direction,
      accountId,
      entityId,
      currency,
      startDate,
      endDate,
      search,
      page,
      limit,
      skip,
    } = req.query;

    const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
    const parsedPage = page ? Math.max(1, parseInt(page as string, 10)) : 1;
    const parsedSkip = skip ? parseInt(skip as string, 10) : (parsedPage - 1) * parsedLimit;

    const result = await TransactionRepository.findByUserId(userId, {
      category: category as string,
      type: type as TransactionType,
      direction: direction as TransactionDirection,
      accountId: accountId as string,
      entityId: entityId as string,
      currency: currency as string,
      startDate: startDate as string,
      endDate: endDate as string,
      search: search as string,
      limit: parsedLimit,
      skip: parsedSkip,
    });

    const totalPages = Math.ceil(result.total / parsedLimit) || 1;

    res.status(200).json({
      success: true,
      transactions: result.transactions,
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch transactions.' });
  }
};

export const getTransactionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const transaction = await TransactionRepository.findByIdAndUserId(id, userId);
    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch transaction.' });
  }
};

export const createTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const {
      date,
      amount,
      sourceAccountId,
      accountId,
      destinationAccountId,
      destinationEntityId,
      entityId,
      category,
      type,
      direction,
      currency,
      recurrence,
      description,
      reference,
      source,
      metadata,
    } = req.body;

    const targetAccountId = sourceAccountId || accountId;
    const targetEntityId = destinationEntityId || entityId;

    if (!amount || parseFloat(amount) <= 0) {
      res.status(400).json({ success: false, message: 'Positive monetary amount is required.' });
      return;
    }

    if (!targetAccountId) {
      res.status(400).json({ success: false, message: 'Account ID is required.' });
      return;
    }

    if (!description || !description.trim()) {
      res.status(400).json({ success: false, message: 'Transaction description is required.' });
      return;
    }

    // Verify account ownership
    const account = await AccountRepository.findByIdAndUserId(targetAccountId, userId);
    if (!account) {
      res.status(404).json({ success: false, message: 'Source account not found or unauthorized.' });
      return;
    }

    // Verify destination account if internal transfer
    let destAccount = null;
    if (destinationAccountId) {
      destAccount = await AccountRepository.findByIdAndUserId(destinationAccountId, userId);
      if (!destAccount) {
        res.status(404).json({ success: false, message: 'Destination account not found or unauthorized.' });
        return;
      }
    }

    // Verify entity ownership if provided
    if (targetEntityId) {
      const entity = await EntityRepository.findByIdAndUserId(targetEntityId, userId);
      if (!entity) {
        res.status(404).json({ success: false, message: 'Counterparty entity not found or unauthorized.' });
        return;
      }
    }

    const numAmount = parseFloat(amount);
    let resolvedDirection: TransactionDirection = direction || (type === 'CREDIT' ? 'INCOME' : type === 'INTERNAL_TRANSFER' ? 'TRANSFER' : 'EXPENSE');
    let resolvedType: TransactionType = type || (resolvedDirection === 'INCOME' ? 'CREDIT' : resolvedDirection === 'TRANSFER' ? 'INTERNAL_TRANSFER' : 'DEBIT');

    const transaction = await TransactionRepository.create({
      userId,
      date: date || new Date(),
      amount: numAmount,
      currency: currency || account.currency || 'INR',
      sourceAccountId: targetAccountId,
      destinationAccountId,
      destinationEntityId: targetEntityId,
      direction: resolvedDirection,
      type: resolvedType,
      category: category || 'General',
      recurrence: (recurrence as RecurrenceType) || 'ONE_OFF',
      description: description.trim(),
      reference,
      source: (source as TransactionSource) || 'MANUAL',
      metadata,
    });

    // Adjust primary account balance safely
    const delta = resolvedType === 'CREDIT' ? numAmount : -numAmount;
    await AccountRepository.update(targetAccountId, userId, {
      currentBalance: account.currentBalance + delta,
      balance: account.currentBalance + delta,
    });

    // If internal transfer to destination account, credit that account
    if (destAccount && resolvedType === 'INTERNAL_TRANSFER') {
      await AccountRepository.update(destinationAccountId, userId, {
        currentBalance: destAccount.currentBalance + numAmount,
        balance: destAccount.currentBalance + numAmount,
      });
    }

    res.status(201).json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to record transaction.' });
  }
};

export const updateTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const existingTx = await TransactionRepository.findByIdAndUserId(id, userId);
    if (!existingTx) {
      res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
      return;
    }

    // Revert previous account balance adjustment
    const prevAccount = await AccountRepository.findByIdAndUserId(existingTx.sourceAccountId, userId);
    if (prevAccount) {
      const revertDelta = existingTx.type === 'CREDIT' ? -existingTx.amount : existingTx.amount;
      await AccountRepository.update(existingTx.sourceAccountId, userId, {
        currentBalance: prevAccount.currentBalance + revertDelta,
        balance: prevAccount.currentBalance + revertDelta,
      });
    }

    const {
      date,
      amount,
      sourceAccountId,
      accountId,
      destinationAccountId,
      destinationEntityId,
      entityId,
      category,
      type,
      direction,
      currency,
      description,
      reference,
      metadata,
    } = req.body;

    const targetAccountId = sourceAccountId || accountId || existingTx.sourceAccountId;
    const targetAmount = amount !== undefined ? parseFloat(amount) : existingTx.amount;
    const targetDirection = direction || (type === 'CREDIT' ? 'INCOME' : type === 'INTERNAL_TRANSFER' ? 'TRANSFER' : existingTx.direction);
    const targetType = type || (targetDirection === 'INCOME' ? 'CREDIT' : targetDirection === 'TRANSFER' ? 'INTERNAL_TRANSFER' : existingTx.type);

    const updated = await TransactionRepository.update(id, userId, {
      date: date ? new Date(date) : existingTx.date,
      amount: targetAmount,
      sourceAccountId: targetAccountId,
      accountId: targetAccountId,
      destinationAccountId: destinationAccountId !== undefined ? destinationAccountId : existingTx.destinationAccountId,
      destinationEntityId: destinationEntityId !== undefined ? destinationEntityId : (entityId !== undefined ? entityId : existingTx.destinationEntityId),
      category: category !== undefined ? category : existingTx.category,
      direction: targetDirection,
      type: targetType,
      currency: currency || existingTx.currency,
      description: description ? description.trim() : existingTx.description,
      reference: reference !== undefined ? reference : existingTx.reference,
      metadata: metadata !== undefined ? metadata : existingTx.metadata,
    });

    // Apply new balance adjustment to active account
    const newAccount = await AccountRepository.findByIdAndUserId(targetAccountId, userId);
    if (newAccount) {
      const newDelta = targetType === 'CREDIT' ? targetAmount : -targetAmount;
      await AccountRepository.update(targetAccountId, userId, {
        currentBalance: newAccount.currentBalance + newDelta,
        balance: newAccount.currentBalance + newDelta,
      });
    }

    res.status(200).json({ success: true, transaction: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update transaction.' });
  }
};

export const deleteTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const tx = await TransactionRepository.findByIdAndUserId(id, userId);
    if (!tx) {
      res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
      return;
    }

    await TransactionRepository.delete(id, userId);

    // Reverse balance effect on account
    const account = await AccountRepository.findByIdAndUserId(tx.sourceAccountId, userId);
    if (account) {
      const reverseDelta = tx.type === 'CREDIT' ? -tx.amount : tx.amount;
      await AccountRepository.update(tx.sourceAccountId, userId, {
        currentBalance: account.currentBalance + reverseDelta,
        balance: account.currentBalance + reverseDelta,
      });
    }

    res.status(200).json({ success: true, message: 'Transaction deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete transaction.' });
  }
};

export const ingestBatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { format, data, accountId } = req.body;

    let rawEntries: RawTransactionInput[] = [];

    if (format === 'csv') {
      if (typeof data !== 'string') {
        res.status(400).json({ success: false, message: 'CSV data must be provided as text string.' });
        return;
      }
      rawEntries = PipelineService.parseCsv(data);
    } else if (format === 'json' || Array.isArray(data)) {
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, message: 'JSON data must be an array of transaction records.' });
        return;
      }
      rawEntries = data;
    } else {
      res.status(400).json({ success: false, message: 'Unsupported format. Use "json" or "csv".' });
      return;
    }

    if (rawEntries.length === 0) {
      res.status(400).json({ success: false, message: 'No records found in payload to ingest.' });
      return;
    }

    const result = await PipelineService.processIngestion(userId, rawEntries, accountId);

    res.status(200).json({
      ...result,
      message: `Successfully processed ${result.normalizedCount} transactions.`,
    });
  } catch (error: any) {
    console.error('[Pipeline Ingestion Error]:', error);
    res.status(500).json({ success: false, message: 'Pipeline ingestion failed.' });
  }
};
