import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SimulationEngine } from '../services/simulationEngine.js';

export const runSimulation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const {
      scenarioType,
      scenarioName,
      amount,
      amountPaise,
      currency,
      targetAccountId,
      category,
      description,
      principal,
      annualRate,
      tenureMonths,
      processingFee,
      startMonth,
      frequency,
      durationMonths,
      direction,
      emergencyFundMonths,
      // Legacy params
      baseIncome,
      baseBurn,
      incomeDelta,
      expenseDelta,
      lumpSumEvents,
      newEmiEvents,
      horizonMonths,
    } = req.body;

    // Validation: Require scenarioName or scenarioType
    if ((!scenarioName || !scenarioName.trim()) && !scenarioType) {
      res.status(400).json({ success: false, message: 'Scenario name is required.' });
      return;
    }

    // Validation: Reject invalid or negative amounts
    if (amount !== undefined && (typeof amount !== 'number' || amount < 0)) {
      res.status(400).json({ success: false, message: 'Purchase amount must be a positive number.' });
      return;
    }

    if (principal !== undefined && (typeof principal !== 'number' || principal < 0)) {
      res.status(400).json({ success: false, message: 'Loan principal must be a positive number.' });
      return;
    }

    if (annualRate !== undefined && (typeof annualRate !== 'number' || annualRate < 0 || annualRate > 100)) {
      res.status(400).json({ success: false, message: 'Annual interest rate must be between 0% and 100%.' });
      return;
    }

    if (tenureMonths !== undefined && (typeof tenureMonths !== 'number' || tenureMonths < 1 || tenureMonths > 120)) {
      res.status(400).json({ success: false, message: 'Loan tenure must be between 1 and 120 months.' });
      return;
    }

    const { scenario, results } = await SimulationEngine.runSimulation({
      userId,
      scenarioType,
      scenarioName,
      amount: amount !== undefined ? Number(amount) : undefined,
      amountPaise: amountPaise !== undefined ? Number(amountPaise) : undefined,
      currency,
      targetAccountId,
      category,
      description,
      principal: principal !== undefined ? Number(principal) : undefined,
      annualRate: annualRate !== undefined ? Number(annualRate) : undefined,
      tenureMonths: tenureMonths !== undefined ? Number(tenureMonths) : undefined,
      processingFee: processingFee !== undefined ? Number(processingFee) : undefined,
      startMonth: startMonth !== undefined ? Number(startMonth) : undefined,
      frequency,
      durationMonths: durationMonths !== undefined ? Number(durationMonths) : undefined,
      direction,
      emergencyFundMonths: emergencyFundMonths !== undefined ? Number(emergencyFundMonths) : undefined,
      baseIncome: baseIncome !== undefined ? Number(baseIncome) : undefined,
      baseBurn: baseBurn !== undefined ? Number(baseBurn) : undefined,
      incomeDelta: incomeDelta !== undefined ? Number(incomeDelta) : 0,
      expenseDelta: expenseDelta !== undefined ? Number(expenseDelta) : 0,
      lumpSumEvents: Array.isArray(lumpSumEvents) ? lumpSumEvents : [],
      newEmiEvents: Array.isArray(newEmiEvents) ? newEmiEvents : [],
      horizonMonths: horizonMonths !== undefined ? Number(horizonMonths) : 12,
    });

    res.status(201).json({
      success: true,
      scenario,
      results,
    });
  } catch (error: any) {
    console.error('Simulation execution error:', error.message);
    const statusCode = error.message?.includes('Cross-currency') || error.message?.includes('Target account') || error.message?.includes('Unsupported currency')
      ? 400
      : 500;
    res.status(statusCode).json({ success: false, message: error.message || 'Failed to execute prospective simulation.' });
  }
};

export const compareScenarios = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const {
      purchaseAmount,
      currency,
      targetAccountId,
      delayMonths,
      cheaperAmount,
      description,
      emergencyFundMonths,
    } = req.body;

    if (!purchaseAmount || typeof purchaseAmount !== 'number' || purchaseAmount <= 0) {
      res.status(400).json({ success: false, message: 'Valid purchase amount is required for scenario comparison.' });
      return;
    }

    if (cheaperAmount !== undefined && (typeof cheaperAmount !== 'number' || cheaperAmount < 0)) {
      res.status(400).json({ success: false, message: 'Cheaper alternative amount must be a positive number.' });
      return;
    }

    const comparison = await SimulationEngine.compareScenarios({
      userId,
      purchaseAmount: Number(purchaseAmount),
      currency,
      targetAccountId,
      delayMonths: delayMonths ? Number(delayMonths) : 3,
      cheaperAmount: cheaperAmount !== undefined ? Number(cheaperAmount) : undefined,
      description,
      emergencyFundMonths: emergencyFundMonths ? Number(emergencyFundMonths) : 3,
    });

    res.status(200).json({
      success: true,
      comparison,
    });
  } catch (error: any) {
    console.error('Scenario comparison error:', error.message);
    const statusCode = error.message?.includes('Cross-currency') || error.message?.includes('Target account') ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message || 'Failed to compare scenarios.' });
  }
};

export const getSimulationHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const scenarios = await SimulationEngine.getHistory(userId);
    res.status(200).json({ success: true, scenarios });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve simulation history.' });
  }
};

export const getSimulationById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const scenario = await SimulationEngine.getById(id, userId);

    if (!scenario) {
      res.status(404).json({ success: false, message: 'Simulation scenario not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, scenario });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve scenario.' });
  }
};

export const deleteSimulationScenario = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const deleted = await SimulationEngine.deleteScenario(id, userId);

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Simulation scenario not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Simulation scenario deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete scenario.' });
  }
};
