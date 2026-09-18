import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { UserRepository } from '../src/models/User.js';
import { AccountRepository } from '../src/models/Account.js';
import { TransactionRepository } from '../src/models/Transaction.js';
import { GoalRepository } from '../src/models/Goal.js';
import { LoanRepository } from '../src/models/Loan.js';

describe('FinTwin AI — Phase 7: Goals & Debt/Loans Architecture Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  before(async () => {
    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Goal User A',
        email: `goal_a_${Date.now()}@example.com`,
        password: 'password123',
        currency: 'INR',
      });
    assert.equal(resA.status, 201);
    userAToken = resA.body.token;
    userAId = resA.body.user._id || resA.body.user.id;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Goal User B',
        email: `goal_b_${Date.now()}@example.com`,
        password: 'password123',
        currency: 'INR',
      });
    assert.equal(resB.status, 201);
    userBToken = resB.body.token;
    userBId = resB.body.user._id || resB.body.user.id;
  });

  describe('Financial Goals Lifecycle & Mathematics', () => {
    let goalId: string;

    it('should reject unauthenticated request to /api/goals', async () => {
      const res = await request(app).get('/api/goals');
      assert.equal(res.status, 401);
    });

    it('should create a new goal with deterministic required monthly contribution calculation', async () => {
      // 6 months in future deadline
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 6);

      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Emergency Fund',
          category: 'EMERGENCY_FUND',
          targetAmount: 60000,
          currentAmount: 12000,
          targetDate: targetDate.toISOString(),
          notes: 'Liquid safety cushion',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.goal);
      assert.equal(res.body.goal.name, 'Emergency Fund');
      assert.equal(res.body.goal.targetAmount, 60000);
      assert.equal(res.body.goal.currentAmount, 12000);

      // Verify calculations
      const calc = res.body.goal.calculations;
      assert.equal(calc.amountRemaining, 48000);
      assert.equal(calc.progressPercent, 20); // 12,000 / 60,000 = 20%
      assert.ok(calc.requiredMonthlyContribution > 0);
      // approx 48000 / 6 = 8000
      assert.ok(calc.requiredMonthlyContribution >= 7500 && calc.requiredMonthlyContribution <= 8500);

      goalId = res.body.goal._id;
    });

    it('should list goals strictly for the authenticated user (tenant isolation)', async () => {
      const resA = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.equal(resA.status, 200);
      assert.equal(resA.body.goals.length, 1);
      assert.equal(resA.body.summary.totalTarget, 60000);
      assert.equal(resA.body.summary.totalSaved, 12000);

      // User B should have 0 goals
      const resB = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.equal(resB.status, 200);
      assert.equal(resB.body.goals.length, 0);
    });

    it('should record a contribution and recalculate progress and completion', async () => {
      const res = await request(app)
        .post(`/api/goals/${goalId}/contribute`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ amount: 48000 });

      assert.equal(res.status, 200);
      assert.equal(res.body.goal.currentAmount, 60000);
      assert.equal(res.body.goal.status, 'COMPLETED');
      assert.equal(res.body.goal.calculations.progressPercent, 100);
      assert.equal(res.body.goal.calculations.amountRemaining, 0);
    });

    it('should prevent User B from modifying or contributing to User A goal', async () => {
      const res = await request(app)
        .post(`/api/goals/${goalId}/contribute`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ amount: 1000 });

      assert.equal(res.status, 404);
    });
  });

  describe('Debt & Loans Lifecycle & EMI Mathematics', () => {
    let loanId: string;

    it('should reject unauthenticated access to /api/loans', async () => {
      const res = await request(app).get('/api/loans');
      assert.equal(res.status, 401);
    });

    it('should record a loan and compute deterministic EMI and interest burden', async () => {
      // Setup ₹70,000 laptop loan @ 14% APR for 12 months
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Gadget Purchase Loan',
          lender: 'HDFC Consumer Finance',
          principal: 70000,
          interestRateApr: 14,
          tenureMonths: 12,
          notes: 'Financed laptop purchase',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      const loan = res.body.loan;
      assert.equal(loan.name, 'Gadget Purchase Loan');
      assert.equal(loan.principal, 70000);
      assert.equal(loan.outstandingAmount, 70000);

      // Verify EMI calculation: P=70000, r=14/12/100, n=12 -> EMI approx ~6285
      assert.ok(loan.emiAmount > 6200 && loan.emiAmount < 6400);
      assert.ok(loan.calculations.estimatedTotalInterest > 0);
      assert.equal(loan.calculations.outstandingLiability, 70000);

      loanId = loan._id;
    });

    it('should calculate live DTI ratio and summary across active loans', async () => {
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.loans.length, 1);
      assert.equal(res.body.summary.totalPrincipal, 70000);
      assert.equal(res.body.summary.totalOutstanding, 70000);
      assert.ok(res.body.summary.totalMonthlyEmi > 0);

      // User B should see 0 loans
      const resB = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.equal(resB.status, 200);
      assert.equal(resB.body.loans.length, 0);
    });

    it('should update loan outstanding amount and auto-complete if fully paid', async () => {
      const res = await request(app)
        .patch(`/api/loans/${loanId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ outstandingAmount: 0 });

      assert.equal(res.status, 200);
      assert.equal(res.body.loan.status, 'PAID_OFF');
      assert.equal(res.body.loan.outstandingAmount, 0);
      assert.equal(res.body.loan.calculations.progressPercent, 100);
    });

    it('should enforce tenant isolation on delete', async () => {
      const resDelOther = await request(app)
        .delete(`/api/loans/${loanId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      assert.equal(resDelOther.status, 404);

      const resDelOwner = await request(app)
        .delete(`/api/loans/${loanId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(resDelOwner.status, 200);
    });
  });
});
