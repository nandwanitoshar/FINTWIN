import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';

describe('FinTwin AI — Complete Golden Path End-to-End Workflow (Section 38 of SPEC.MD)', () => {
  const userCredentials = {
    name: 'TechNova Golden Path Tester',
    email: `golden_path_${Date.now()}@fintwin.ai`,
    password: 'SecureGoldenPassword2026!',
  };

  let token: string;
  let checkingAccountId: string;
  let employerEntityId: string;
  let scenarioId: string;

  // Step 1: User Registration
  it('Step 01: Should register a new user and return valid JWT auth token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userCredentials);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.email, userCredentials.email.toLowerCase());

    token = res.body.token;
  });

  // Step 2: Complete Onboarding Setup (Accounts & Entities)
  it('Step 02: Should create checking, savings, and credit card accounts and external entities', async () => {
    // Checking
    const chkRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'HDFC Checking (Salary Hub)',
        type: 'CHECKING',
        institution: 'HDFC Bank',
        currentBalance: 45000,
      });
    assert.strictEqual(chkRes.status, 201);
    checkingAccountId = chkRes.body.account._id;

    // Savings
    const savRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'ICICI Savings Buffer',
        type: 'SAVINGS',
        institution: 'ICICI Bank',
        currentBalance: 120000,
      });
    assert.strictEqual(savRes.status, 201);

    // Credit Card
    const ccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Axis Neo Credit Facility',
        type: 'CREDIT_CARD',
        institution: 'Axis Bank',
        currentBalance: 18000,
        creditLimit: 150000,
      });
    assert.strictEqual(ccRes.status, 201);

    // Employer Entity
    const empRes = await request(app)
      .post('/api/entities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Tech Innovations Ltd',
        type: 'EMPLOYER',
        category: 'Income',
      });
    assert.strictEqual(empRes.status, 201);
    employerEntityId = empRes.body.entity._id;

    // Landlord Utility Entity
    const utilRes = await request(app)
      .post('/api/entities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Apex Real Estate',
        type: 'UTILITY',
        category: 'Housing Rent',
      });
    assert.strictEqual(utilRes.status, 201);
  });

  // Step 3: Ingest Raw Statements
  it('Step 03: Should ingest and normalize CSV bank statement text via pipeline', async () => {
    const csvContent = `Date,Description,Amount,Type,Category
2026-09-01,Tech Innovations Ltd Monthly Salary,85000,CREDIT,Salary
2026-09-03,Apex Real Estate Apartment Rent,22000,DEBIT,Housing
2026-09-05,Consumer Vehicle Loan EMI,6500,DEBIT,Debt Service`;

    const res = await request(app)
      .post('/api/pipeline/ingest')
      .set('Authorization', `Bearer ${token}`)
      .send({
        format: 'csv',
        data: csvContent,
        accountId: checkingAccountId,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.normalizedCount, 3);
  });

  // Step 4: Verify Classified Ledger
  it('Step 04: Should verify transaction ledger with categorized flows', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.transactions.length >= 3);
  });

  // Step 5: Inspect Digital Twin State Vector (03 MODEL)
  it('Step 05: Should inspect Digital Twin state vector and deterministic health score', async () => {
    const res = await request(app)
      .get('/api/twin')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const { stateVector, summary } = res.body.twin;
    assert.ok(stateVector.netWorth > 0);
    assert.ok(stateVector.liquidReserves > 0);
    assert.ok(stateVector.runwayMonths > 0);
    assert.strictEqual(typeof stateVector.healthScore, 'number');
    assert.strictEqual(summary.accountsCount, 3);
  });

  // Step 6: Explore Network Graph (04 CONNECT)
  it('Step 06: Should explore connected graph topology with nodes and directed flow channels', async () => {
    const res = await request(app)
      .get('/api/twin/network')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.graph.nodes.length >= 5); // 3 accounts + 2 entities
    assert.ok(res.body.graph.links.length >= 1);
  });

  // Step 7 & 8: Configure & Run Prospective Simulation (05 SIMULATE)
  it('Step 07 & 08: Should run prospective simulation and return deterministic trajectories', async () => {
    const res = await request(app)
      .post('/api/simulation/run')
      .set('Authorization', `Bearer ${token}`)
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
    assert.ok(res.body.results.baselineSeries.length === 12);
    assert.ok(res.body.results.simulatedSeries.length === 12);
    assert.ok(res.body.results.deltas);

    scenarioId = res.body.scenario._id;
  });

  // Step 9: Review Explainable Intelligence & Signals (06 ANALYZE)
  it('Step 09: Should review explainable causal insights and active risk sentinels', async () => {
    // Current analysis
    const currRes = await request(app)
      .post('/api/analysis/explain')
      .set('Authorization', `Bearer ${token}`)
      .send({ context: 'current' });

    assert.strictEqual(currRes.status, 200);
    assert.strictEqual(currRes.body.success, true);
    assert.ok(currRes.body.analysis.keyFindings.length > 0);
    assert.ok(currRes.body.analysis.recommendations.length > 0);

    // Simulation analysis
    const simRes = await request(app)
      .post('/api/analysis/explain')
      .set('Authorization', `Bearer ${token}`)
      .send({ context: 'simulation', scenarioId });

    assert.strictEqual(simRes.status, 200);
    assert.strictEqual(simRes.body.success, true);
    assert.ok(simRes.body.analysis.summary.includes('Buy ₹70,000 Laptop'));

    // Risk Signals
    const riskRes = await request(app)
      .get('/api/risk-signals')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(riskRes.status, 200);
    assert.strictEqual(riskRes.body.success, true);
    assert.ok(Array.isArray(riskRes.body.signals));
  });

  // Step 10: Verify Archive in History
  it('Step 10: Should list archived scenarios in history', async () => {
    const res = await request(app)
      .get('/api/simulation/history')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.scenarios.some((s: any) => s._id === scenarioId));
  });

  // Step 11: Re-login & Verify Persisted Database Integrity
  it('Step 11: Should re-login and verify that all financial twin state is persisted', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userCredentials.email,
        password: userCredentials.password,
      });

    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.success, true);
    const newToken = loginRes.body.token;

    // Verify Twin state remains intact with new token
    const twinRes = await request(app)
      .get('/api/twin')
      .set('Authorization', `Bearer ${newToken}`);

    assert.strictEqual(twinRes.status, 200);
    assert.strictEqual(twinRes.body.twin.summary.accountsCount, 3);
  });
});
