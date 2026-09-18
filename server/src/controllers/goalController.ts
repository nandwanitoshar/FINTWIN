import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { GoalRepository, GoalCategory, GoalStatus } from '../models/Goal.js';
import { GoalImpactService } from '../services/goalImpactService.js';

export const GoalController = {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const goals = await GoalRepository.findByUserId(userId);

      // Summary statistics
      const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
      const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
      const totalRemaining = Math.max(0, totalTarget - totalSaved);
      const totalMonthlyRequired = goals
        .filter((g) => g.status === 'ACTIVE')
        .reduce((sum, g) => sum + g.calculations.requiredMonthlyContribution, 0);

      res.status(200).json({
        success: true,
        goals,
        summary: {
          totalGoals: goals.length,
          activeGoals: goals.filter((g) => g.status === 'ACTIVE').length,
          completedGoals: goals.filter((g) => g.status === 'COMPLETED').length,
          totalTarget,
          totalSaved,
          totalRemaining,
          totalMonthlyRequired,
          overallProgressPercent: totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0,
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
      const goal = await GoalRepository.findByIdAndUserId(id, userId);
      if (!goal) {
        res.status(404).json({ success: false, message: 'Goal not found or access denied.' });
        return;
      }
      res.status(200).json({ success: true, goal });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { name, category, targetAmount, currentAmount, targetDate, monthlyContribution, status, notes, color } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, message: 'Goal name is required.' });
        return;
      }

      const numTarget = parseFloat(targetAmount);
      if (isNaN(numTarget) || numTarget <= 0) {
        res.status(400).json({ success: false, message: 'Target amount must be greater than zero.' });
        return;
      }

      const numCurrent = currentAmount !== undefined ? parseFloat(currentAmount) : 0;
      if (isNaN(numCurrent) || numCurrent < 0) {
        res.status(400).json({ success: false, message: 'Current amount cannot be negative.' });
        return;
      }

      const numMonthly = monthlyContribution !== undefined ? parseFloat(monthlyContribution) : 0;
      if (isNaN(numMonthly) || numMonthly < 0) {
        res.status(400).json({ success: false, message: 'Monthly contribution cannot be negative.' });
        return;
      }

      if (!targetDate) {
        res.status(400).json({ success: false, message: 'Target deadline date is required.' });
        return;
      }

      const parsedDate = new Date(targetDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ success: false, message: 'Invalid target date format.' });
        return;
      }

      const goal = await GoalRepository.create({
        userId,
        name: name.trim(),
        category: category as GoalCategory,
        targetAmount: numTarget,
        currentAmount: numCurrent,
        targetDate: parsedDate,
        monthlyContribution: numMonthly,
        status: (status as GoalStatus) || 'ACTIVE',
        notes: notes || '',
        color: color || '#6366f1',
      });

      res.status(201).json({ success: true, goal, message: 'Goal created successfully.' });
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
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.targetAmount !== undefined) {
        const t = parseFloat(req.body.targetAmount);
        if (isNaN(t) || t <= 0) {
          res.status(400).json({ success: false, message: 'Target amount must be greater than zero.' });
          return;
        }
        updateData.targetAmount = t;
      }
      if (req.body.currentAmount !== undefined) {
        const c = parseFloat(req.body.currentAmount);
        if (isNaN(c) || c < 0) {
          res.status(400).json({ success: false, message: 'Current amount cannot be negative.' });
          return;
        }
        updateData.currentAmount = c;
      }
      if (req.body.monthlyContribution !== undefined) {
        const m = parseFloat(req.body.monthlyContribution);
        if (isNaN(m) || m < 0) {
          res.status(400).json({ success: false, message: 'Monthly contribution cannot be negative.' });
          return;
        }
        updateData.monthlyContribution = m;
      }
      if (req.body.targetDate !== undefined) updateData.targetDate = new Date(req.body.targetDate);
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.color !== undefined) updateData.color = req.body.color;

      const goal = await GoalRepository.update(id, userId, updateData);
      if (!goal) {
        res.status(404).json({ success: false, message: 'Goal not found or access denied.' });
        return;
      }

      res.status(200).json({ success: true, goal, message: 'Goal updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async contribute(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { id } = req.params;
      const { amount } = req.body;

      const contributionAmount = parseFloat(amount);
      if (isNaN(contributionAmount) || contributionAmount <= 0) {
        res.status(400).json({ success: false, message: 'Contribution amount must be greater than zero.' });
        return;
      }

      const existing = await GoalRepository.findByIdAndUserId(id, userId);
      if (!existing) {
        res.status(404).json({ success: false, message: 'Goal not found or access denied.' });
        return;
      }

      const newCurrent = existing.currentAmount + contributionAmount;
      const newStatus = newCurrent >= existing.targetAmount ? 'COMPLETED' : existing.status;

      const updated = await GoalRepository.update(id, userId, {
        currentAmount: newCurrent,
        status: newStatus as GoalStatus,
      });

      res.status(200).json({
        success: true,
        goal: updated,
        message: `Successfully contributed ${contributionAmount} towards ${existing.name}.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { id } = req.params;
      const success = await GoalRepository.delete(id, userId);
      if (!success) {
        res.status(404).json({ success: false, message: 'Goal not found or access denied.' });
        return;
      }
      res.status(200).json({ success: true, message: 'Goal deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getImpact(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { goalId, scenarioType, amount, principal, annualRate, tenureMonths, paymentMode, targetAccountId, description } = req.body;

      const impact = await GoalImpactService.simulateGoalImpact({
        userId,
        goalId,
        scenarioType,
        amount: amount !== undefined ? Number(amount) : undefined,
        principal: principal !== undefined ? Number(principal) : undefined,
        annualRate: annualRate !== undefined ? Number(annualRate) : undefined,
        tenureMonths: tenureMonths !== undefined ? Number(tenureMonths) : undefined,
        paymentMode,
        targetAccountId,
        description,
      });

      res.status(200).json({ success: true, impact });
    } catch (err: any) {
      console.error('[GoalController] getImpact error:', err);
      const statusCode = err.message?.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ success: false, message: err.message || 'Failed to compute goal impact.' });
    }
  },

  async getAffordability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { purchaseAmount, paymentMode, tenureMonths, annualRate, goalId, targetAccountId, description } = req.body;

      if (purchaseAmount === undefined || isNaN(Number(purchaseAmount)) || Number(purchaseAmount) < 0) {
        res.status(400).json({ success: false, message: 'Valid purchase amount is required.' });
        return;
      }

      const affordability = await GoalImpactService.calculateAffordability({
        userId,
        purchaseAmount: Number(purchaseAmount),
        paymentMode,
        tenureMonths: tenureMonths ? Number(tenureMonths) : undefined,
        annualRate: annualRate ? Number(annualRate) : undefined,
        goalId,
        targetAccountId,
        description,
      });

      res.status(200).json({ success: true, affordability });
    } catch (err: any) {
      console.error('[GoalController] getAffordability error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to compute affordability.' });
    }
  },
};
