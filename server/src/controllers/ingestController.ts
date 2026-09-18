import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { PipelineService, RawTransactionInput } from '../services/pipelineService.js';

export const ingestCsv = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { csv, data, accountId } = req.body;
    const csvContent = typeof csv === 'string' ? csv : (typeof data === 'string' ? data : (typeof req.body === 'string' ? req.body : null));

    if (!csvContent || !csvContent.trim()) {
      res.status(400).json({
        success: false,
        summary: { total: 0, valid: 0, imported: 0, duplicates: 0, rejected: 1 },
        errors: [{ row: 1, reason: 'CSV content must be provided as non-empty text string in "csv" or "data" field.' }],
      });
      return;
    }

    const rawEntries = PipelineService.parseCsv(csvContent);
    if (rawEntries.length === 0) {
      res.status(400).json({
        success: false,
        summary: { total: 0, valid: 0, imported: 0, duplicates: 0, rejected: 1 },
        errors: [{ row: 1, reason: 'CSV must contain a header line and at least one data record row.' }],
      });
      return;
    }

    const result = await PipelineService.processIngestion(userId, rawEntries, accountId);

    res.status(200).json({
      success: true,
      summary: result.summary,
      errors: result.errors,
      transactions: result.transactions,
      entitiesDiscovered: result.entitiesDiscovered,
    });
  } catch (error: any) {
    console.error('[CSV Ingest Controller Error]:', error);
    res.status(500).json({
      success: false,
      summary: { total: 0, valid: 0, imported: 0, duplicates: 0, rejected: 1 },
      errors: [{ row: 0, reason: error.message || 'Internal CSV ingestion failure.' }],
    });
  }
};

export const ingestJson = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { data, transactions, accountId } = req.body;
    const records: RawTransactionInput[] = Array.isArray(req.body)
      ? req.body
      : Array.isArray(data)
      ? data
      : Array.isArray(transactions)
      ? transactions
      : [];

    if (!records || records.length === 0) {
      res.status(400).json({
        success: false,
        summary: { total: 0, valid: 0, imported: 0, duplicates: 0, rejected: 1 },
        errors: [{ row: 1, reason: 'JSON payload must contain a non-empty array of transaction objects.' }],
      });
      return;
    }

    const result = await PipelineService.processIngestion(userId, records, accountId);

    res.status(200).json({
      success: true,
      summary: result.summary,
      errors: result.errors,
      transactions: result.transactions,
      entitiesDiscovered: result.entitiesDiscovered,
    });
  } catch (error: any) {
    console.error('[JSON Ingest Controller Error]:', error);
    res.status(500).json({
      success: false,
      summary: { total: 0, valid: 0, imported: 0, duplicates: 0, rejected: 1 },
      errors: [{ row: 0, reason: error.message || 'Internal JSON ingestion failure.' }],
    });
  }
};
