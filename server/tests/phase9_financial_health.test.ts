import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { calculateDetailedHealthScore } from '../src/utils/financialMath.js';

describe('FinTwin AI — Phase A: Deterministic Financial Health Score Engine & Dashboard Analytics', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  before(async () => {
    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Health Score User A',
        email: `health_a_${Date.now()}@example.com`,
        password: 'Password123!',
        currency: 'INR',
      });
    assert.equal(resA.status, 201);
    userAToken = resA.body.token;
    userAId = resA.body.user._id || resA.body.user.id;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Health Score User B',
        email: `health_b_${Date.now()}@example.com`,
        password: 'Password123!',
        currency: 'INR',
      });
    assert.equal(resB.status, 201);
    userBToken = resB.body.token;
    userBId = resB.body.user._id || resB.body.user.id;
  });

  describe('1. Unit Tests — calculateDetailedHealthScore Math Engine', () => {
    it('should return 6 components with insufficient data flags for completely empty profile', () => {
      const result = calculateDetailedHealthScore({
        liquidReserves: 0,
        monthlyBurn: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlyDebtPayments: 0,
        totalDebt: 0,
      });

      assert.equal(result.components.length, 6);
      const runway = result.components.find((c) => c.id === 'emergencyRunway');
      assert.ok(runway);
      assert.equal(runway?.hasSufficientData, false);
      assert.equal(runway?.score, null);
      assert.equal(runway?.explanation, 'Not enough data to calculate this component.');

      const savings = result.components.find((c) => c.id === 'savingsRate');
      assert.ok(savings);
      assert.equal(savings?.hasSufficientData, false);
      assert.equal(savings?.explanation, 'Not enough data to calculate this component.');
    });

    it('should calculate accurate deterministic component scores for robust financial profile', () => {
      const result = calculateDetailedHealthScore({
        liquidReserves: 300000,
        monthlyBurn: 40000, // Runway = 7.5 mos (>= 6 => 100 pts)
        monthlyIncome: 100000,
        monthlyExpenses: 40000, // Savings rate = 60% (>= 30% => 100 pts)
        monthlyDebtPayments: 10000, // DTI = 10% (<= 15% => 90 pts)
        totalDebt: 100000,
        topCategorySharePct: 30, // <= 35% => 95 pts
        categoryCount: 5,
        incomeTransactionCount: 3,
        incomeEntityCount: 1,
        isRecurringIncome: true, // >= 3 recurring => 95 pts
      });

      assert.ok(result.overallScore >= 90);
      assert.equal(result.grade, 'A+');

      const runwayComp = result.components.find((c) => c.id === 'emergencyRunway');
      assert.equal(runwayComp?.score, 100);
      assert.equal(runwayComp?.status, 'OPTIMAL');
      assert.ok(runwayComp?.dataUsed.includes('₹3,00,000'));

      const debtComp = result.components.find((c) => c.id === 'debtBurden');
      assert.equal(debtComp?.score, 90);
      assert.equal(debtComp?.status, 'OPTIMAL');
    });

    it('should correctly penalize high debt and critical runway without crashing', () => {
      const result = calculateDetailedHealthScore({
        liquidReserves: 5000,
        monthlyBurn: 50000, // Runway = 0.1 mos (< 1 mo => 15 pts)
        monthlyIncome: 60000,
        monthlyExpenses: 50000,
        monthlyDebtPayments: 35000, // DTI = 58.3% (> 40% => 20 pts)
        totalDebt: 500000,
        topCategorySharePct: 75, // > 70% => 35 pts
        categoryCount: 2,
        incomeTransactionCount: 1,
      });

      assert.ok(result.overallScore < 50);
      const runwayComp = result.components.find((c) => c.id === 'emergencyRunway');
      assert.equal(runwayComp?.score, 15);
      assert.equal(runwayComp?.status, 'ATTENTION');
    });
  });

  describe('2. HTTP API — GET /api/analysis/health-score', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/analysis/health-score');
      assert.equal(res.status, 401);
    });

    it('should return detailed health score and summary for authenticated User A', async () => {
      // Setup User A account
      const accRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Checking Account',
          type: 'CHECKING',
          institution: 'HDFC',
          balance: 80000,
          currency: 'INR',
        });
      assert.equal(accRes.status, 201);
      const accountId = accRes.body.account?._id || accRes.body.data?._id;

      // Add User A transaction
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 50000,
          accountId,
          category: 'Salary',
          type: 'CREDIT',
          direction: 'INFLOW',
          description: 'Payroll Deposit',
        });

      const res = await request(app)
        .get('/api/analysis/health-score')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.healthScore);
      assert.ok(typeof res.body.healthScore.overallScore === 'number');
      assert.equal(res.body.healthScore.components.length, 6);
      assert.ok(res.body.healthScore.calculatedAt);
    });

    it('should enforce strict tenant isolation (User B receives their own score, not User A)', async () => {
      const resB = await request(app)
        .get('/api/analysis/health-score')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.equal(resB.status, 200);
      assert.equal(resB.body.success, true);
      assert.equal(resB.body.summary.accountsCount, 0);
      assert.equal(resB.body.summary.transactionsCount, 0);

      // User B runway is insufficient data because they have 0 accounts
      const bRunway = resB.body.healthScore.components.find((c: any) => c.id === 'emergencyRunway');
      assert.equal(bRunway.hasSufficientData, false);
    });
  });
});
