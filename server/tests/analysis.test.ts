import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';

describe('FinTwin AI — Phase 5: Explainable Intelligence & Analysis Engine (ANALYZE) Tests', () => {
  let userAToken: string;
  let scenarioId: string;

  before(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Analysis User A',
        email: `analysis_a_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userAToken = resA.body.token;

    // 2. Set up accounts
    await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Salary Hub',
        type: 'CHECKING',
        institution: 'HDFC Bank',
        currentBalance: 60000,
      });

    await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Reserve Fund',
        type: 'SAVINGS',
        institution: 'ICICI Bank',
        currentBalance: 90000,
      });

    // 3. Run a simulation scenario to analyze
    const simRes = await request(app)
      .post('/api/simulation/run')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        scenarioName: 'Test Analysis Scenario',
        incomeDelta: 0,
        expenseDelta: 0,
        newEmiEvents: [
          {
            principal: 70000,
            annualRate: 14,
            tenureMonths: 6,
            startMonth: 1,
            description: 'Laptop Loan',
          },
        ],
        horizonMonths: 12,
      });
    scenarioId = simRes.body.scenario._id;
  });

  describe('POST /api/analysis/explain', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/analysis/explain')
        .send({ context: 'current' });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should generate explainable report for current Digital Twin state', async () => {
      const res = await request(app)
        .post('/api/analysis/explain')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ context: 'current' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.analysis);

      const { summary, keyFindings, recommendations, provider } = res.body.analysis;

      assert.ok(summary && summary.length > 20);
      assert.ok(Array.isArray(keyFindings) && keyFindings.length > 0);
      assert.ok(Array.isArray(recommendations) && recommendations.length > 0);
      assert.strictEqual(provider, 'rules');

      // Axiom 1 & 2: Check mathematical proof and causal reasoning in findings
      const liquidityFinding = keyFindings.find((f: any) => f.category === 'LIQUIDITY');
      assert.ok(liquidityFinding);
      assert.ok(liquidityFinding.causalExplanation);
      assert.ok(liquidityFinding.mathematicalProof);

      // Axiom 3: Check counterfactual impact in recommendations
      assert.ok(recommendations[0].counterfactualImpact);
    });

    it('should generate causal analysis for a prospective simulation scenario', async () => {
      const res = await request(app)
        .post('/api/analysis/explain')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ context: 'simulation', scenarioId });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.analysis);

      const { summary, keyFindings, recommendations } = res.body.analysis;

      assert.ok(summary.includes('Test Analysis Scenario'));
      assert.ok(keyFindings.length > 0);
      assert.ok(recommendations.length > 0);
    });
  });
});
