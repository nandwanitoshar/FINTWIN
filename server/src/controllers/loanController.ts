import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { LoanRepository, LoanStatus } from '../models/Loan.js';
import { TransactionRepository } from '../models/Transaction.js';

export const LoanController = {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const loans = await LoanRepository.findByUserId(userId);

      // Fetch user's recent monthly income to calculate live Debt-To-Income (DTI) ratio
      const { transactions } = await TransactionRepository.findByUserId(userId, { limit: 1000 });
      const incomeTxs = transactions.filter((t) => t.direction === 'INCOME' || t.type === 'CREDIT');
      const totalIncome = incomeTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

      // Estimate monthly income (or default baseline if 0)
      let monthlyIncome = totalIncome;
      if (incomeTxs.length > 1) {
        const dates = incomeTxs.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b);
        const diffMonths = Math.max(1, (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24 * 30.44));
        monthlyIncome = totalIncome / diffMonths;
      }

      const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
      const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.outstandingAmount, 0);
      const totalMonthlyEmi = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
      const totalPrincipal = loans.reduce((sum, l) => sum + l.principal, 0);
      const totalInterestExpected = activeLoans.reduce((sum, l) => sum + l.calculations.estimatedTotalInterest, 0);

      const dtiRatio = monthlyIncome > 0
        ? parseFloat(((totalMonthlyEmi / monthlyIncome) * 100).toFixed(1))
        : totalMonthlyEmi > 0 ? 100 : 0;

      res.status(200).json({
        success: true,
        loans,
        summary: {
          totalLoans: loans.length,
          activeLoansCount: activeLoans.length,
          totalPrincipal,
          totalOutstanding,
          totalMonthlyEmi,
          totalInterestExpected,
          monthlyIncomeEstimated: Math.round(monthlyIncome),
          dtiRatio,
          dtiHealthStatus: dtiRatio <= 30 ? 'HEALTHY' : dtiRatio <= 45 ? 'MODERATE' : 'HIGH_BURDEN',
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { id } = req.params;
      const loan = await LoanRepository.findByIdAndUserId(id, userId);
      if (!loan) {
        res.status(404).json({ success: false, message: 'Loan record not found or access denied.' });
        return;
      }
      res.status(200).json({ success: true, loan });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const {
        name,
        lender,
        principal,
        outstandingAmount,
        interestRateApr,
        tenureMonths,
        emiAmount,
        startDate,
        endDate,
        status,
        targetAccountId,
        notes,
      } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, message: 'Loan name is required.' });
        return;
      }
      if (!lender || !lender.trim()) {
        res.status(400).json({ success: false, message: 'Lender institution is required.' });
        return;
      }

      const numPrincipal = parseFloat(principal);
      if (isNaN(numPrincipal) || numPrincipal <= 0) {
        res.status(400).json({ success: false, message: 'Principal amount must be greater than zero.' });
        return;
      }

      const numApr = parseFloat(interestRateApr);
      if (isNaN(numApr) || numApr < 0) {
        res.status(400).json({ success: false, message: 'Valid interest rate APR is required.' });
        return;
      }

      const numTenure = parseInt(tenureMonths, 10);
      if (isNaN(numTenure) || numTenure <= 0) {
        res.status(400).json({ success: false, message: 'Tenure must be at least 1 month.' });
        return;
      }

      const loan = await LoanRepository.create({
        userId,
        name: name.trim(),
        lender: lender.trim(),
        principal: numPrincipal,
        outstandingAmount: outstandingAmount !== undefined ? parseFloat(outstandingAmount) : numPrincipal,
        interestRateApr: numApr,
        tenureMonths: numTenure,
        emiAmount: emiAmount !== undefined && parseFloat(emiAmount) > 0 ? parseFloat(emiAmount) : undefined,
        startDate: startDate || new Date(),
        endDate,
        status: (status as LoanStatus) || 'ACTIVE',
        targetAccountId: targetAccountId || '',
        notes: notes || '',
      });

      res.status(201).json({ success: true, loan, message: 'Loan obligation recorded successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { id } = req.params;
      const updateData: any = {};

      if (req.body.name !== undefined) updateData.name = req.body.name.trim();
      if (req.body.lender !== undefined) updateData.lender = req.body.lender.trim();
      if (req.body.outstandingAmount !== undefined) updateData.outstandingAmount = parseFloat(req.body.outstandingAmount);
      if (req.body.interestRateApr !== undefined) updateData.interestRateApr = parseFloat(req.body.interestRateApr);
      if (req.body.tenureMonths !== undefined) updateData.tenureMonths = parseInt(req.body.tenureMonths, 10);
      if (req.body.emiAmount !== undefined) updateData.emiAmount = parseFloat(req.body.emiAmount);
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.targetAccountId !== undefined) updateData.targetAccountId = req.body.targetAccountId;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;

      // Auto-update status if paid off
      if (updateData.outstandingAmount !== undefined && updateData.outstandingAmount <= 0) {
        updateData.status = 'PAID_OFF';
      }

      const loan = await LoanRepository.update(id, userId, updateData);
      if (!loan) {
        res.status(404).json({ success: false, message: 'Loan record not found or access denied.' });
        return;
      }

      res.status(200).json({ success: true, loan, message: 'Loan record updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { id } = req.params;
      const success = await LoanRepository.delete(id, userId);
      if (!success) {
        res.status(404).json({ success: false, message: 'Loan record not found or access denied.' });
        return;
      }
      res.status(200).json({ success: true, message: 'Loan record deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
