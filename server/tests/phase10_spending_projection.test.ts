import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { AccountRepository } from '../src/models/Account.js';
import { TransactionRepository } from '../src/models/Transaction.js';

describe('FinTwin AI — Phase B: 12-Month Financial Projection & Spending Breakdown', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let userAAccountId: string;

  before(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Phase B User A',
        email: `phaseB_userA_${Date.now()}@example.com`,
        password: 'Password123!',
        currency: 'INR',
      });
    assert.equal(resA.status, 201);
    userAToken = resA.body.token;
    userAId = resA.body.user._id || resA.body.user.id;

    // 2. Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Phase B User B',
        email: `phaseB_userB_${Date.now()}@example.com`,
        password: 'Password123!',
        currency: 'INR',
      });
    assert.equal(resB.status, 201);
    userBToken = resB.body.token;
    userBId = resB.body.user._id || resB.body.user.id;

    // 3. Setup User A Accounts & Ledger Transactions
    const acc = await AccountRepository.create({
      userId: userAId,
      name: 'User A Liquid Checking',
      type: 'CHECKING',
      institution: 'HDFC Bank',
      balance: 150000,
      currency: 'INR',
      isLiquid: true,
    });
    userAAccountId = acc._id.toString();

    // Add Income
    await TransactionRepository.create({
      userId: userAId,
      accountId: userAAccountId,
      amount: 80000,
      direction: 'INCOME',
      type: 'CREDIT',
      category: 'Salary',
      description: 'Monthly Salary Paycheck',
      date: new Date('2026-08-01'),
    });

    // Add Expense 1: Groceries
    await TransactionRepository.create({
      userId: userAId,
      accountId: userAAccountId,
      amount: 15000,
      direction: 'EXPENSE',
      type: 'DEBIT',
      category: 'Groceries',
      description: 'Supermarket Outlay',
      date: new Date('2026-08-05'),
    });

    // Add Expense 2: Utilities
    await TransactionRepository.create({
      userId: userAId,
      accountId: userAAccountId,
      amount: 5000,
      direction: 'EXPENSE',
      type: 'DEBIT',
      category: 'Utilities',
      description: 'Electricity Bill',
      date: new Date('2026-08-10'),
    });

    // Add Expense 3: Uncategorized (empty category)
    await TransactionRepository.create({
      userId: userAId,
      accountId: userAAccountId,
      amount: 2500,
      direction: 'EXPENSE',
      type: 'DEBIT',
      category: '',
      description: 'Cash ATM Withdrawal',
      date: new Date('2026-08-15'),
    });
  });

  describe('1. Spending Breakdown Engine', () => {
    it('should return empty dataset state for User B with no transactions', async () => {
      const res = await request(app)
        .get('/api/analysis/spending-breakdown')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.hasData, false);
      assert.equal(res.body.totalSpending, 0);
      assert.equal(res.body.categoryBreakdown.length, 0);
      assert.equal(res.body.monthlySpending.length, 0);
      assert.ok(res.body.limitations.length > 0);
    });

    it('should calculate correct total spending and category breakdown for User A', async () => {
      const res = await request(app)
        .get('/api/analysis/spending-breakdown')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.hasData, true);

      // Total spending = 15000 + 5000 + 2500 = 22500
      assert.equal(res.body.totalSpending, 22500);
      assert.equal(res.body.transactionCount, 3);

      // Check categories
      const categories = res.body.categoryBreakdown;
      assert.equal(categories.length, 3);

      const groc = categories.find((c: any) => c.category === 'Groceries');
      assert.ok(groc);
      assert.equal(groc.totalAmount, 15000);
      assert.equal(groc.percentage, 66.7);

      const util = categories.find((c: any) => c.category === 'Utilities');
      assert.ok(util);
      assert.equal(util.totalAmount, 5000);
      assert.equal(util.percentage, 22.2);

      // Uncategorized handling
      const uncategorized = categories.find((c: any) => c.category === 'Uncategorized');
      assert.ok(uncategorized);
      assert.equal(uncategorized.totalAmount, 2500);
      assert.equal(uncategorized.percentage, 11.1);
    });

    it('should correctly build monthly spending time series', async () => {
      const res = await request(app)
        .get('/api/analysis/spending-breakdown')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.equal(res.status, 200);
      const monthly = res.body.monthlySpending;
      assert.ok(monthly.length >= 1);
      const aug = monthly.find((m: any) => m.key === '2026-08');
      assert.ok(aug);
      assert.equal(aug.amount, 22500);
      assert.equal(aug.transactionCount, 3);
    });

    it('should identify top merchants and provide recent expenses list', async () => {
      const res = await request(app)
        .get('/api/analysis/spending-breakdown')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.topMerchants.length > 0);
      assert.ok(res.body.recentExpenses.length === 3);
      assert.equal(res.body.recentExpenses[0].accountName, 'User A Liquid Checking');
    });
  });

  describe('2. 12-Month Financial Projection Engine', () => {
    it('should return exactly 12 months for baseline projection', async () => {
      const res = await request(app)
        .get('/api/analysis/projection')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const proj = res.body.projection;

      assert.equal(proj.baseline.length, 12);
      assert.equal(proj.simulated.length, 12);
      assert.equal(proj.baseline[0].month, 1);
      assert.equal(proj.baseline[11].month, 12);
    });

    it('should maintain deterministic balance recurrence: S(t+1) = S(t) + Savings', async () => {
      const res = await request(app)
        .get('/api/analysis/projection')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.equal(res.status, 200);
      const baseline = res.body.projection.baseline;

      for (let i = 0; i < 11; i++) {
        const current = baseline[i];
        const next = baseline[i + 1];
        assert.equal(
          current.endingBalance,
          next.startingBalance,
          `Month ${current.month} ending balance must equal Month ${next.month} starting balance`
        );
        assert.equal(
          current.endingBalance,
          current.startingBalance + current.savings,
          `Month ${current.month} ending balance must equal starting balance + savings`
        );
      }
    });

    it('should simulate an upfront cash purchase without altering baseline', async () => {
      const purchaseAmount = 50000;
      const res = await request(app)
        .post('/api/analysis/projection')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          purchaseAmount,
          paymentMode: 'CASH',
        });

      assert.equal(res.status, 200);
      const proj = res.body.projection;

      // Month 1 simulated expenses include upfront purchase
      assert.equal(
        proj.simulated[0].expenses,
        proj.baseline[0].expenses + purchaseAmount
      );

      // Baseline ending balance should be strictly higher than simulated ending balance by purchaseAmount
      assert.equal(
        proj.summary.difference,
        -purchaseAmount
      );
      assert.ok(proj.summary.affordabilityRating);
    });

    it('should simulate an EMI financed loan over 6 months at 14% APR', async () => {
      const purchaseAmount = 60000;
      const emiMonths = 6;
      const res = await request(app)
        .post('/api/analysis/projection')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          purchaseAmount,
          paymentMode: 'EMI',
          emiMonths,
          annualRate: 14,
        });

      assert.equal(res.status, 200);
      const proj = res.body.projection;

      // Month 1 to 6 should have EMI debt service
      for (let m = 0; m < emiMonths; m++) {
        assert.ok(proj.simulated[m].debtService > proj.baseline[m].debtService);
      }

      // Month 7+ debt service should revert to baseline debt service
      assert.equal(
        proj.simulated[6].debtService,
        proj.baseline[6].debtService
      );
    });

    it('should NEVER mutate actual accounts or transactions during simulation', async () => {
      const initialAccounts = await AccountRepository.findByUserId(userAId);
      const initialTx = await TransactionRepository.findByUserId(userAId);

      // Run multiple heavy simulations
      await request(app)
        .post('/api/analysis/projection')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          purchaseAmount: 200000,
          paymentMode: 'CASH',
          recurringExpense: 10000,
        });

      const afterAccounts = await AccountRepository.findByUserId(userAId);
      const afterTx = await TransactionRepository.findByUserId(userAId);

      assert.equal(afterAccounts.length, initialAccounts.length);
      assert.equal(afterAccounts[0].balance, initialAccounts[0].balance);
      assert.equal(afterTx.transactions.length, initialTx.transactions.length);
    });
  });

  describe('3. Tenant Isolation & Security', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res1 = await request(app).get('/api/analysis/spending-breakdown');
      assert.equal(res1.status, 401);

      const res2 = await request(app).get('/api/analysis/projection');
      assert.equal(res2.status, 401);
    });

    it('should strictly isolate User B from User A data', async () => {
      // User B query for spending breakdown
      const resBSpend = await request(app)
        .get('/api/analysis/spending-breakdown')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.equal(resBSpend.status, 200);
      assert.equal(resBSpend.body.totalSpending, 0);
      assert.equal(resBSpend.body.categoryBreakdown.length, 0);

      // User B query for projection
      const resBProj = await request(app)
        .get('/api/analysis/projection')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.equal(resBProj.status, 200);
      assert.equal(resBProj.body.projection.summary.startingBalance, 0);
      assert.equal(resBProj.body.projection.hasHistoricalData, false);
    });
  });
});
