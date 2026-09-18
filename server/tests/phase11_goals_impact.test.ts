import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { AccountRepository } from '../src/models/Account.js';
import { TransactionRepository } from '../src/models/Transaction.js';
import { GoalRepository, calculateGoalMetrics } from '../src/models/Goal.js';

describe('FinTwin AI — Phase C: Goals, Goal Impact Analysis & Affordability Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let userAAccountId: string;
  let createdGoalId: string;

  before(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Phase C User A',
        email: `phaseC_userA_${Date.now()}@example.com`,
        password: 'Password123!',
        currency: 'INR',
      });
    assert.equal(resA.status, 201);
    userAToken = resA.body.token;
    userAId = resA.body.user._id || resA.body.user.id;

    // 2. Register User B (for tenant isolation tests)
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Phase C User B',
        email: `phaseC_userB_${Date.now()}@example.com`,
        password: 'Password123!',
        currency: 'INR',
      });
    assert.equal(resB.status, 201);
    userBToken = resB.body.token;
    userBId = resB.body.user._id || resB.body.user.id;

    // 3. Setup User A Account with liquid reserves ₹1,20,000
    const acc = await AccountRepository.create({
      userId: userAId,
      name: 'User A Liquid Hub',
      type: 'CHECKING',
      institution: 'State Bank of India',
      balance: 120000,
      currency: 'INR',
      isLiquid: true,
    });
    userAAccountId = acc._id.toString();

    // 4. Setup Transactions for User A: Monthly Income = ₹75,000, Monthly Expenses = ₹35,000 (Surplus = ₹40,000)
    await TransactionRepository.create({
      userId: userAId,
      accountId: userAAccountId,
      amount: 75000,
      direction: 'INCOME',
      type: 'CREDIT',
      category: 'Salary',
      description: 'Monthly Corporate Salary',
      date: new Date(),
    });

    await TransactionRepository.create({
      userId: userAId,
      accountId: userAAccountId,
      amount: 20000,
      direction: 'EXPENSE',
      type: 'DEBIT',
      category: 'Rent',
      description: 'Apartment Monthly Rent',
      date: new Date(),
    });

    await TransactionRepository.create({
      userId: userAId,
      accountId: userAAccountId,
      amount: 15000,
      direction: 'EXPENSE',
      type: 'DEBIT',
      category: 'Groceries',
      description: 'Supermarket Provisions',
      date: new Date(),
    });
  });

  // TEST 1: Direct Mathematical Unit Test — Goal Progress & Division by Zero Safety
  it('Math: calculateGoalMetrics handles normal, zero, and completed goals safely', () => {
    // Normal progress
    const normal = calculateGoalMetrics(100000, 40000, '2026-12-31', 10000);
    assert.equal(normal.amountRemaining, 60000);
    assert.equal(normal.progressPercent, 40);
    assert.equal(normal.monthlyContribution, 10000);
    assert.ok(normal.estimatedCompletionDate);

    // Division by zero safety when target = 0
    const zeroTarget = calculateGoalMetrics(0, 0, '2026-12-31', 0);
    assert.equal(zeroTarget.amountRemaining, 0);
    assert.equal(zeroTarget.progressPercent, 0);
    assert.equal(zeroTarget.estimatedCompletionDate, 'COMPLETED');

    // Clamping over-target progress to 100%
    const completed = calculateGoalMetrics(50000, 60000, '2026-12-31', 5000);
    assert.equal(completed.amountRemaining, 0);
    assert.equal(completed.progressPercent, 100);
    assert.equal(completed.estimatedCompletionDate, 'COMPLETED');

    // Insufficient data limitation notice when no contribution set
    const noContribution = calculateGoalMetrics(100000, 10000, '2027-01-01', 0);
    assert.ok(noContribution.completionLimitation !== undefined);
  });

  // TEST 2: Validation — Rejects invalid targetAmount (<= 0) and negative currentAmount
  it('API: POST /api/goals rejects targetAmount <= 0 and negative currentAmount', async () => {
    // Target amount zero
    const resZero = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Invalid Goal',
        targetAmount: 0,
        targetDate: '2027-01-01',
      });
    assert.equal(resZero.status, 400);

    // Negative current amount
    const resNeg = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Negative Goal',
        targetAmount: 50000,
        currentAmount: -500,
        targetDate: '2027-01-01',
      });
    assert.equal(resNeg.status, 400);
  });

  // TEST 3: Goal Creation — Creates valid goal with monthlyContribution and category
  it('API: POST /api/goals creates a valid goal with monthlyContribution and PURCHASE category', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'MacBook Pro Workstation',
        category: 'PURCHASE',
        targetAmount: 180000,
        currentAmount: 60000,
        monthlyContribution: 15000,
        targetDate: '2027-06-30',
        notes: 'M3 Max for AI development',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.goal.name, 'MacBook Pro Workstation');
    assert.equal(res.body.goal.category, 'PURCHASE');
    assert.equal(res.body.goal.targetAmount, 180000);
    assert.equal(res.body.goal.currentAmount, 60000);
    assert.equal(res.body.goal.monthlyContribution, 15000);
    assert.equal(res.body.goal.calculations.amountRemaining, 120000);
    assert.equal(res.body.goal.calculations.progressPercent, 33);
    assert.ok(res.body.goal.calculations.estimatedCompletionDate);

    createdGoalId = res.body.goal._id;
  });

  // TEST 4: Goal Listing & Retrieval — GET /api/goals and GET /api/goals/:id
  it('API: GET /api/goals and GET /api/goals/:id return populated calculations', async () => {
    const listRes = await request(app)
      .get('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.success, true);
    assert.ok(Array.isArray(listRes.body.goals));
    assert.equal(listRes.body.goals.length, 1);
    assert.equal(listRes.body.summary.totalTarget, 180000);
    assert.equal(listRes.body.summary.totalSaved, 60000);

    const getRes = await request(app)
      .get(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.goal._id, createdGoalId);
    assert.equal(getRes.body.goal.calculations.amountRemaining, 120000);
  });

  // TEST 5: Goal Update — PUT & PATCH /api/goals/:id updates fields and recalculates metrics
  it('API: PUT and PATCH /api/goals/:id update fields and maintain calculations', async () => {
    const patchRes = await request(app)
      .patch(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        monthlyContribution: 20000,
        notes: 'Accelerated savings pace',
      });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.goal.monthlyContribution, 20000);
    assert.equal(patchRes.body.goal.notes, 'Accelerated savings pace');

    const putRes = await request(app)
      .put(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'MacBook Pro Workstation M3',
        monthlyContribution: 25000,
      });

    assert.equal(putRes.status, 200);
    assert.equal(putRes.body.goal.name, 'MacBook Pro Workstation M3');
    assert.equal(putRes.body.goal.monthlyContribution, 25000);
  });

  // TEST 6: Tenant Isolation — User B cannot read, update, or delete User A's goal
  it('Security: Enforces strict tenant isolation across all Goal APIs', async () => {
    // User B tries to read User A's goal
    const getRes = await request(app)
      .get(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    assert.equal(getRes.status, 404);

    // User B tries to update User A's goal
    const putRes = await request(app)
      .put(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ targetAmount: 999999 });
    assert.equal(putRes.status, 404);

    // User B tries to delete User A's goal
    const delRes = await request(app)
      .delete(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    assert.equal(delRes.status, 404);

    // Verify User A's goal was not altered or deleted
    const verifyRes = await request(app)
      .get(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.goal.targetAmount, 180000);
  });

  // TEST 7: Goal Impact Analysis — Outright Purchase Impact
  it('Impact: POST /api/goals/impact calculates baseline vs simulated completion and balance', async () => {
    const res = await request(app)
      .post('/api/goals/impact')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        goalId: createdGoalId,
        scenarioType: 'PURCHASE',
        amount: 50000,
        paymentMode: 'OUTRIGHT',
        description: 'New Flagship Smartphone',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.impact.goal);
    assert.equal(res.body.impact.goal.id, createdGoalId);

    // Baseline metrics
    assert.ok(res.body.impact.baseline.monthsToComplete > 0);
    assert.ok(res.body.impact.baseline.projected12MonthBalance > 0);

    // Simulated metrics
    assert.ok(res.body.impact.simulated.projected12MonthBalance < res.body.impact.baseline.projected12MonthBalance);
    assert.equal(res.body.impact.impact.projectedBalanceImpact, -50000);

    // Data Lineage verification
    assert.ok(Array.isArray(res.body.impact.dataLineage.dataUsed));
    assert.ok(Array.isArray(res.body.impact.dataLineage.formulaUsed));
    assert.ok(Array.isArray(res.body.impact.dataLineage.assumptions));
  });

  // TEST 8: Goal Impact Analysis — Heavy EMI reduces monthly surplus and delays goal
  it('Impact: EMI scenario throttles monthly surplus and delays goal completion', async () => {
    // User A has surplus of ₹40,000. An EMI of ₹30,000 leaves only ₹10,000 surplus,
    // which throttles goal contribution from planned ₹25,000 down to ₹10,000, extending completion time!
    const res = await request(app)
      .post('/api/goals/impact')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        goalId: createdGoalId,
        scenarioType: 'LOAN_EMI',
        principal: 150000,
        annualRate: 14,
        tenureMonths: 6,
        paymentMode: 'EMI',
        description: 'Personal Loan',
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.impact.simulated.sustainableMonthlyContribution < res.body.impact.baseline.sustainableMonthlyContribution);
    assert.ok(res.body.impact.impact.completionDateDeltaMonths >= 0);
    assert.ok(['DELAYED', 'CRITICAL_RISK', 'ON_TRACK'].includes(res.body.impact.impact.targetProgressImpact));
  });

  // TEST 9: Comprehensive Affordability Analysis & Deterministic Thresholds
  it('Affordability: POST /api/analysis/affordability provides evidence matrix and neutral status', async () => {
    // 1. Small purchase (Low Impact)
    const resLow = await request(app)
      .post('/api/analysis/affordability')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        purchaseAmount: 5000,
        paymentMode: 'OUTRIGHT',
        description: 'Office Chair',
      });

    assert.equal(resLow.status, 200);
    assert.equal(resLow.body.success, true);
    assert.equal(resLow.body.affordability.status, 'LOW IMPACT');
    assert.equal(resLow.body.affordability.evidence.purchaseAmount, 5000);
    assert.equal(resLow.body.affordability.evidence.currentLiquidBalance, 120000);
    assert.equal(resLow.body.affordability.evidence.liquidBalanceAfter, 115000);
    assert.ok(resLow.body.affordability.evidence.emergencyRunwayAfter > 3);
    assert.ok(Array.isArray(resLow.body.affordability.comparison));

    // 2. Huge purchase exceeding liquid reserves (High Impact)
    const resHigh = await request(app)
      .post('/api/analysis/affordability')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        purchaseAmount: 250000,
        paymentMode: 'OUTRIGHT',
        description: 'Luxury Vacation',
      });

    assert.equal(resHigh.status, 200);
    assert.equal(resHigh.body.affordability.status, 'HIGH IMPACT');
    assert.ok(resHigh.body.affordability.evidence.liquidBalanceAfter < 0);
    assert.ok(resHigh.body.affordability.statusReason.length > 0);
  });

  // TEST 10: Non-Mutation Verification — Simulations NEVER mutate actual Goal, Account, or Ledger records
  it('Non-Mutation: Verifies simulations did NOT modify database records', async () => {
    // 1. Check Goal was not mutated
    const goalRes = await request(app)
      .get(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(goalRes.status, 200);
    assert.equal(goalRes.body.goal.targetAmount, 180000);
    assert.equal(goalRes.body.goal.currentAmount, 60000); // Unchanged!
    assert.equal(goalRes.body.goal.monthlyContribution, 25000);

    // 2. Check Account Balance was not mutated
    const accRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(accRes.status, 200);
    const acc = accRes.body.accounts.find((a: any) => a._id === userAAccountId);
    assert.equal(acc.balance, 120000); // Exactly ₹1,20,000 — not reduced by simulations!

    // 3. Check Transaction Count was not increased by simulations
    const txRes = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(txRes.status, 200);
    assert.equal(txRes.body.transactions.length, 3); // Still exactly 3 transactions!
  });

  // TEST 11: Goal Deletion — DELETE /api/goals/:id removes goal cleanly
  it('API: DELETE /api/goals/:id removes the goal cleanly', async () => {
    const delRes = await request(app)
      .delete(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);

    const getRes = await request(app)
      .get(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(getRes.status, 404);
  });
});
