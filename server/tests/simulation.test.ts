import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { calculateLoanEMI } from '../src/utils/financialMath.js';

describe('FinTwin AI — Phase 4: Deterministic Simulation Engine (SIMULATE) Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let createdScenarioId: string;

  before(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Simulation User A',
        email: `sim_a_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userAToken = resA.body.token;

    // 2. Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Simulation User B',
        email: `sim_b_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userBToken = resB.body.token;

    // 3. User A accounts
    await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Checking Account',
        type: 'CHECKING',
        institution: 'HDFC Bank',
        currentBalance: 80000,
      });

    await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Emergency Savings',
        type: 'SAVINGS',
        institution: 'ICICI Bank',
        currentBalance: 120000,
      });
  });

  describe('Mathematical Verification: Loan Amortization Formula', () => {
    it('should accurately compute EMI using M = P * [r(1+r)^n] / [(1+r)^n - 1]', () => {
      // Principal: 70,000, APR: 14%, Tenure: 6 months
      const emi = calculateLoanEMI(70000, 14, 6);
      // Expected EMI: ~12,144.40
      assert.ok(emi >= 12140 && emi <= 12150, `Calculated EMI ${emi} out of expected range`);

      // Zero interest loan: 60,000 over 6 months = 10,000/mo exactly
      const zeroInterestEmi = calculateLoanEMI(60000, 0, 6);
      assert.strictEqual(zeroInterestEmi, 10000);
    });
  });

  describe('POST /api/simulation/run', () => {
    it('should reject unauthenticated simulation requests', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .send({
          scenarioName: 'Unauth scenario',
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject requests without scenarioName', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({});

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('should compute deterministic baseline vs simulated projections over 12 months', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioName: 'Buy ₹70,000 Laptop with 6-month EMI',
          incomeDelta: 0,
          expenseDelta: 0,
          newEmiEvents: [
            {
              principal: 70000,
              annualRate: 14,
              tenureMonths: 6,
              startMonth: 1,
              description: 'MacBook Pro EMI',
            },
          ],
          horizonMonths: 12,
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.scenario);
      assert.ok(res.body.results);

      createdScenarioId = res.body.scenario._id;

      const { baselineSeries, simulatedSeries, deltas } = res.body.results;

      // Horizon is 12 months
      assert.strictEqual(baselineSeries.length, 12);
      assert.strictEqual(simulatedSeries.length, 12);

      // Month 1 EMI burden should be around 12,144
      assert.ok(simulatedSeries[0].emiBurden >= 12140 && simulatedSeries[0].emiBurden <= 12150);

      // Month 7 EMI burden should drop back to 0 because tenure is 6 months!
      assert.strictEqual(simulatedSeries[6].emiBurden, 0);

      // Deltas exist and are numbers
      assert.strictEqual(typeof deltas.netWorthDelta, 'number');
      assert.strictEqual(typeof deltas.liquidDelta, 'number');
      assert.strictEqual(typeof deltas.runwayDeltaMonths, 'number');
    });
  });

  describe('GET /api/simulation/history & GET /api/simulation/:id', () => {
    it('should list user scenarios in chronological order', async () => {
      const res = await request(app)
        .get('/api/simulation/history')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.scenarios));
      assert.ok(res.body.scenarios.length >= 1);
      assert.strictEqual(res.body.scenarios[0]._id, createdScenarioId);
    });

    it('should retrieve individual scenario by ID for authorized owner', async () => {
      const res = await request(app)
        .get(`/api/simulation/${createdScenarioId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.scenario.scenarioName, 'Buy ₹70,000 Laptop with 6-month EMI');
    });

    it('should reject access to scenario by other users (tenant isolation)', async () => {
      const res = await request(app)
        .get(`/api/simulation/${createdScenarioId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });
  });
});
