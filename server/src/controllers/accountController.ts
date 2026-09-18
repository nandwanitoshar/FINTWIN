import { Response } from 'express';
import { AccountRepository, AccountType } from '../models/Account.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getAccounts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const accounts = await AccountRepository.findByUserId(userId);
    res.status(200).json({ success: true, accounts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch accounts.' });
  }
};

export const getAccountById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const account = await AccountRepository.findByIdAndUserId(id, userId);
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found or unauthorized.' });
      return;
    }
    res.status(200).json({ success: true, account });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch account.' });
  }
};

export const createAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { name, type, institution, currentBalance, creditLimit, interestRateApr, accountNumberMask } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Account name is required.' });
      return;
    }

    if (!institution || !institution.trim()) {
      res.status(400).json({ success: false, message: 'Financial institution name is required.' });
      return;
    }

    const validTypes: AccountType[] = [
      'CHECKING',
      'SAVINGS',
      'CREDIT_CARD',
      'LOAN',
      'INVESTMENT',
      'WALLET',
      'CASH',
      'OTHER',
    ];
    if (type && !validTypes.includes(type)) {
      res.status(400).json({ success: false, message: `Invalid account type. Allowed: ${validTypes.join(', ')}` });
      return;
    }

    const { currency, balance, initialBalance } = req.body;
    const balanceNum = balance !== undefined ? parseFloat(balance) : (currentBalance !== undefined ? parseFloat(currentBalance) : 0);

    const account = await AccountRepository.create({
      userId,
      name: name.trim(),
      type: type || 'CHECKING',
      institution: institution.trim(),
      currency: currency || 'INR',
      currentBalance: isNaN(balanceNum) ? 0 : balanceNum,
      balance: isNaN(balanceNum) ? 0 : balanceNum,
      initialBalance: initialBalance !== undefined ? parseFloat(initialBalance) : (isNaN(balanceNum) ? 0 : balanceNum),
      creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
      interestRateApr: interestRateApr ? parseFloat(interestRateApr) : 0,
      accountNumberMask: accountNumberMask || '••••',
    });

    res.status(201).json({ success: true, account });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create account.' });
  }
};

export const updateAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const updated = await AccountRepository.update(id, userId, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Account not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, account: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update account.' });
  }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const deleted = await AccountRepository.delete(id, userId);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Account not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Account archived successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete account.' });
  }
};
