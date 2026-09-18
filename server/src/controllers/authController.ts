import { Request, Response } from 'express';
import { UserRepository } from '../models/User.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, currency } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Name is required.' });
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !email.trim() || !emailRegex.test(email.trim())) {
      res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const newUser = await UserRepository.create({
      name: name.trim(),
      email: email.trim(),
      passwordHash,
      currency: currency || 'INR',
    });

    const token = generateToken({ userId: newUser._id, email: newUser.email });

    const userPayload = {
      _id: newUser._id,
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      currency: newUser.currency,
      createdAt: newUser.createdAt,
    };

    console.log(`[AUTH REGISTER] Success: Created account for ${newUser.email}`);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: userPayload,
      data: {
        token,
        user: userPayload,
      },
    });
  } catch (error: any) {
    console.error('[Auth Error] Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({ userId: user._id, email: user.email });

    const userPayload = {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      createdAt: user.createdAt,
    };

    console.log(`[AUTH LOGIN] Success: Logged in ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: userPayload,
      data: {
        token,
        user: userPayload,
      },
    });
  } catch (error: any) {
    console.error('[Auth Error] Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const userPayload = {
      ...req.user,
      id: req.user._id,
    };

    res.status(200).json({
      success: true,
      user: userPayload,
      data: {
        user: userPayload,
      },
    });
  } catch (error: any) {
    console.error('[Auth Error] getMe error:', error);
    res.status(500).json({ success: false, message: 'Internal server error fetching user.' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { name, currency } = req.body;
    const updateData: any = {};
    if (name && name.trim()) updateData.name = name.trim();
    if (currency) updateData.currency = currency.toUpperCase().trim();

    const updated = await UserRepository.update(userId, updateData);
    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        _id: updated._id,
        id: updated._id,
        name: updated.name,
        email: updated.email,
        currency: updated.currency,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      return;
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect current password.' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await UserRepository.updatePassword(userId, newHash);

    res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    await UserRepository.deleteCascade(userId);

    res.status(200).json({
      success: true,
      message: 'Account and all associated financial records permanently deleted.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportUserData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { AccountRepository } = await import('../models/Account.js');
    const { EntityRepository } = await import('../models/Entity.js');
    const { TransactionRepository } = await import('../models/Transaction.js');
    const { GoalRepository } = await import('../models/Goal.js');
    const { LoanRepository } = await import('../models/Loan.js');
    const { SimulationScenarioRepository } = await import('../models/SimulationScenario.js');

    const [accounts, entities, txResult, goals, loans, scenarios] = await Promise.all([
      AccountRepository.findByUserId(userId),
      EntityRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId, { limit: 5000 }),
      GoalRepository.findByUserId(userId),
      LoanRepository.findByUserId(userId),
      SimulationScenarioRepository.findByUserId(userId),
    ]);

    res.status(200).json({
      success: true,
      exportedAt: new Date().toISOString(),
      user: req.user,
      data: {
        accounts,
        entities,
        transactions: txResult.transactions,
        goals,
        loans,
        simulationScenarios: scenarios,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

