/**
 * seedService.ts
 * FinTwin AI — Deterministic Demo User Seeding
 *
 * Ensures that the official demo user (test@fintwin.ai / securepassword123)
 * is always available for demonstrations, judging, and rapid evaluation,
 * in both MongoDB and In-Memory development modes.
 */

import { UserRepository } from '../models/User.js';
import { AccountRepository } from '../models/Account.js';
import { EntityRepository } from '../models/Entity.js';
import { TransactionRepository } from '../models/Transaction.js';
import { hashPassword } from '../utils/auth.js';

export const DEMO_USER_EMAIL = 'test@fintwin.ai';
export const DEMO_USER_PASSWORD = 'securepassword123';

export const ensureDemoUser = async (): Promise<void> => {
  try {
    const existing = await UserRepository.findByEmail(DEMO_USER_EMAIL);
    if (existing) {
      // Demo user already exists
      return;
    }

    console.log('[Seed] Seeding verified demo user for TechNova-2026 demonstration...');

    const passwordHash = await hashPassword(DEMO_USER_PASSWORD);
    const demoUser = await UserRepository.create({
      name: 'Alex Sharma',
      email: DEMO_USER_EMAIL,
      passwordHash,
      currency: 'INR',
    });

    const userId = demoUser._id;

    // Seed core accounts for demo user
    const checkingAcc = await AccountRepository.create({
      userId,
      name: 'HDFC Checking (Salary Hub)',
      type: 'CHECKING',
      institution: 'HDFC Bank',
      currentBalance: 50000,
      currency: 'INR',
    });

    const savingsAcc = await AccountRepository.create({
      userId,
      name: 'ICICI Savings (Emergency Buffer)',
      type: 'SAVINGS',
      institution: 'ICICI Bank',
      currentBalance: 120000,
      currency: 'INR',
    });

    // Seed counterparty entities
    const employer = await EntityRepository.create({
      userId,
      name: 'Tech Innovations Ltd',
      type: 'EMPLOYER',
      category: 'Salary',
    });

    const landlord = await EntityRepository.create({
      userId,
      name: 'Apex Real Estate',
      type: 'UTILITY',
      category: 'Housing',
    });

    // Seed initial historical transactions
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    await TransactionRepository.create({
      userId,
      accountId: checkingAcc._id,
      entityId: employer._id,
      amount: 85000,
      direction: 'INCOME',
      type: 'CREDIT',
      category: 'Salary',
      description: 'Monthly Engineering Salary',
      currency: 'INR',
      date: lastMonth,
    });

    await TransactionRepository.create({
      userId,
      accountId: checkingAcc._id,
      entityId: landlord._id,
      amount: 22000,
      direction: 'EXPENSE',
      type: 'DEBIT',
      category: 'Housing & Rent',
      description: 'Monthly Apartment Lease',
      currency: 'INR',
      date: lastMonth,
    });

    await TransactionRepository.create({
      userId,
      accountId: checkingAcc._id,
      entityId: employer._id,
      amount: 85000,
      direction: 'INCOME',
      type: 'CREDIT',
      category: 'Salary',
      description: 'Monthly Engineering Salary',
      currency: 'INR',
      date: currentMonth,
    });

    await TransactionRepository.create({
      userId,
      accountId: checkingAcc._id,
      entityId: landlord._id,
      amount: 22000,
      direction: 'EXPENSE',
      type: 'DEBIT',
      category: 'Housing & Rent',
      description: 'Monthly Apartment Lease',
      currency: 'INR',
      date: currentMonth,
    });

    console.log(`[Seed] Demo user (${DEMO_USER_EMAIL}) initialized successfully.`);
  } catch (error: any) {
    console.warn('[Seed Warning] Failed to seed demo user:', error.message);
  }
};
