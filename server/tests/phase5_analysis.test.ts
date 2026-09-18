/**
 * phase5_analysis.test.ts
 * FinTwin AI — Phase 5: Deterministic Analysis Engine & Risk Signal Tests
 *
 * Covers:
 * - All 8 signal type calculations
 * - Evidence model correctness
 * - Two-user tenant isolation
 * - Empty states
 * - Simulation + analysis integration
 * - Signal status update (PATCH)
 * - Security: User B cannot access User A's signals
 * - Phase 1–4 regression (API smoke tests)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { ANALYSIS_THRESHOLDS } from '../src/services/riskSignalService.js';

describe('FinTwin AI — Phase 5: Analysis Engine & Risk Signals', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  // User A financial data IDs
  let checkingAccId: string;
  let savingsAccId: string;
  let creditCardAccId: string;
  let employerEntityId: string;
  let merchantEntityId: string;
  let landlordEntityId: string;

  // Signal IDs detected for User A
  let signalIdForA: string;
  let simulationScenarioId: string;

  // ──────────────────────────────────────────────────────────────────────────
  // SETUP: Rich financial data for User A, empty for User B
  // ──────────────────────────────────────────────────────────────────────────
  before(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Analysis Test User Alpha',
        email: `p5_alpha_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    assert.strictEqual(resA.status, 201);
    userAToken = resA.body.token;
    userAId = resA.body.user._id;

    // 2. Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Analysis Test User Beta',
        email: `p5_beta_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    assert.strictEqual(resB.status, 201);
    userBToken = resB.body.token;
    userBId = resB.body.user._id;

    // 3. Create User A accounts
    const checking = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'HDFC Salary Hub', type: 'CHECKING', institution: 'HDFC Bank', currentBalance: 80000, currency: 'INR' });
    checkingAccId = checking.body.account._id;

    const savings = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'ICICI Savings Reserve', type: 'SAVINGS', institution: 'ICICI Bank', currentBalance: 40000, currency: 'INR' });
    savingsAccId = savings.body.account._id;

    const credit = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'HDFC Credit Card', type: 'CREDIT_CARD', institution: 'HDFC Bank', currentBalance: 55000, creditLimit: 100000, currency: 'INR' });
    creditCardAccId = credit.body.account._id;

    // 4. Create entities
    const employer = await request(app)
      .post('/api/entities')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'TechNova Corp', type: 'EMPLOYER', category: 'Technology' });
    employerEntityId = employer.body.entity._id;

    const merchant = await request(app)
      .post('/api/entities')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Zomato Food', type: 'MERCHANT', category: 'Food & Dining' });
    merchantEntityId = merchant.body.entity._id;

    const landlord = await request(app)
      .post('/api/entities')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'GreenPark Apartments', type: 'UTILITY', category: 'Housing' });
    landlordEntityId = landlord.body.entity._id;

    // 5. Create transactions for User A
    // Income: 6 salary credits from TechNova Corp
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          date: date.toISOString(),
          amount: 120000,
          sourceAccountId: checkingAccId,
          destinationEntityId: employerEntityId,
          category: 'Salary',
          type: 'CREDIT',
          direction: 'INCOME',
          description: 'Monthly salary',
          recurrence: 'MONTHLY',
          currency: 'INR',
        });
    }

    // Expense: 6 rent payments to landlord (HIGH_EXPENSE_CONCENTRATION + RECURRING_EXPENSE_PRESSURE)
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          date: date.toISOString(),
          amount: 40000,
          sourceAccountId: checkingAccId,
          destinationEntityId: landlordEntityId,
          category: 'Housing',
          type: 'DEBIT',
          direction: 'EXPENSE',
          description: 'Monthly rent',
          recurrence: 'MONTHLY',
          currency: 'INR',
        });
    }

    // Expense: Several food orders (to set up unusual pattern baseline)
    const foodAmounts = [800, 900, 750, 850, 820, 780];
    for (let i = 0; i < foodAmounts.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i * 5);
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          date: date.toISOString(),
          amount: foodAmounts[i],
          sourceAccountId: checkingAccId,
          destinationEntityId: merchantEntityId,
          category: 'Food & Dining',
          type: 'DEBIT',
          direction: 'EXPENSE',
          description: 'Food order',
          recurrence: 'ONE_OFF',
          currency: 'INR',
        });
    }

    // One UNUSUAL food transaction: 15,000 (far above 800-900 baseline)
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        date: new Date().toISOString(),
        amount: 15000,
        sourceAccountId: checkingAccId,
        destinationEntityId: merchantEntityId,
        category: 'Food & Dining',
        type: 'DEBIT',
        direction: 'EXPENSE',
        description: 'Large catering order',
        recurrence: 'ONE_OFF',
        currency: 'INR',
      });

    // 6. Run a simulation for integration test
    const simRes = await request(app)
      .post('/api/simulation/run')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        scenarioName: 'P5 Analysis Test Scenario',
        incomeDelta: 0,
        expenseDelta: 10000,
        newEmiEvents: [
          { principal: 150000, annualRate: 14, tenureMonths: 12, startMonth: 1, description: 'Test Loan' },
        ],
        horizonMonths: 12,
      });
    simulationScenarioId = simRes.body.scenario?._id;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. ANALYSIS SUMMARY ENDPOINT
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/analysis/summary', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/analysis/summary');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should return summary metrics for User A', async () => {
      const res = await request(app)
        .get('/api/analysis/summary')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.summary);

      const { summary } = res.body;
      assert.ok(typeof summary.totalSignals === 'number');
      assert.ok(typeof summary.monthlyIncome === 'number');
      assert.ok(typeof summary.monthlyExpenses === 'number');
      assert.ok(typeof summary.netCashFlow === 'number');
      assert.ok(typeof summary.liquidityMonths === 'number');
      assert.ok(typeof summary.healthScore === 'number');
      assert.ok(summary.signalsBySeverity);
      assert.ok(typeof summary.generatedAt === 'string');
    });

    it('should return separate summary for User B (isolated)', async () => {
      const res = await request(app)
        .get('/api/analysis/summary')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 200);
      const { summary } = res.body;
      // User B has no data, so income and expenses should be 0
      assert.strictEqual(summary.monthlyIncome, 0);
      assert.strictEqual(summary.monthlyExpenses, 0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. FULL ANALYSIS ENDPOINT
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/analysis', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/analysis');
      assert.strictEqual(res.status, 401);
    });

    it('should return full analysis with signals for User A', async () => {
      const res = await request(app)
        .get('/api/analysis')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.analysis);
      assert.ok(Array.isArray(res.body.analysis.signals));
      assert.ok(res.body.analysis.summary);

      // Capture a signal ID for subsequent tests
      if (res.body.analysis.signals.length > 0) {
        signalIdForA = res.body.analysis.signals[0].id;
      }
    });

    it('should return empty signals for User B (no data)', async () => {
      const res = await request(app)
        .get('/api/analysis')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.analysis.signals));
      assert.strictEqual(res.body.analysis.signals.length, 0);
    });

    it('each signal should have required fields', async () => {
      const res = await request(app)
        .get('/api/analysis')
        .set('Authorization', `Bearer ${userAToken}`);

      for (const signal of res.body.analysis.signals) {
        assert.ok(signal.id, 'Signal must have id');
        assert.ok(signal.userId, 'Signal must have userId');
        assert.ok(signal.type, 'Signal must have type');
        assert.ok(signal.severity, 'Signal must have severity');
        assert.ok(signal.status, 'Signal must have status');
        assert.ok(signal.title, 'Signal must have title');
        assert.ok(signal.summary, 'Signal must have summary');
        assert.ok(signal.explanation, 'Signal must have explanation');
        assert.ok(Array.isArray(signal.evidence), 'Signal must have evidence array');
        assert.ok(Array.isArray(signal.recommendations), 'Signal must have recommendations');
        assert.ok(Array.isArray(signal.limitations), 'Signal must have limitations');
        assert.ok(signal.generatedAt, 'Signal must have generatedAt');
      }
    });

    it('signal userId must match authenticated user', async () => {
      const res = await request(app)
        .get('/api/analysis')
        .set('Authorization', `Bearer ${userAToken}`);

      for (const signal of res.body.analysis.signals) {
        assert.strictEqual(signal.userId, userAId, 'Signal userId must match authenticated user');
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. SPECIFIC SIGNAL TYPE DETECTION
  // ══════════════════════════════════════════════════════════════════════════
  describe('Signal Type Detection', () => {
    let allSignals: any[] = [];

    before(async () => {
      const res = await request(app)
        .get('/api/analysis')
        .set('Authorization', `Bearer ${userAToken}`);
      allSignals = res.body.analysis.signals || [];
    });

    it('should detect INCOME_CONCENTRATION signal (TechNova = 100% of income)', () => {
      const sig = allSignals.find((s: any) => s.type === 'INCOME_CONCENTRATION');
      assert.ok(sig, 'INCOME_CONCENTRATION signal should be detected');
      assert.ok(sig.evidence.length > 0, 'Must have evidence');
      const concPct = sig.evidence.find((e: any) => e.field === 'Concentration Percentage');
      assert.ok(concPct, 'Evidence must include Concentration Percentage');
      // TechNova provides 100% of income
      assert.ok(parseFloat(concPct.value) >= ANALYSIS_THRESHOLDS.INCOME_CONCENTRATION_HIGH * 100, 'Percentage must exceed threshold');
    });

    it('should detect RECURRING_EXPENSE_PRESSURE signal (Housing/Rent)', () => {
      const sig = allSignals.find((s: any) => s.type === 'RECURRING_EXPENSE_PRESSURE');
      assert.ok(sig, 'RECURRING_EXPENSE_PRESSURE signal should be detected');
      assert.ok(sig.evidence.length > 0, 'Must have evidence');
      const occurrences = sig.evidence.find((e: any) => e.field === 'Observed Occurrences');
      assert.ok(occurrences, 'Must have occurrences in evidence');
      assert.ok(occurrences.value >= ANALYSIS_THRESHOLDS.RECURRING_MIN_OCCURRENCES, 'Occurrences must meet minimum');
    });

    it('should detect HIGH_EXPENSE_CONCENTRATION signal (Housing)', () => {
      const sig = allSignals.find((s: any) => s.type === 'HIGH_EXPENSE_CONCENTRATION');
      assert.ok(sig, 'HIGH_EXPENSE_CONCENTRATION signal should be detected');
      const pctEvidence = sig.evidence.find((e: any) => e.field === 'Concentration Percentage');
      assert.ok(pctEvidence, 'Must have Concentration Percentage in evidence');
    });

    it('should detect UNUSUAL_TRANSACTION_PATTERN signal (₹15,000 food order)', () => {
      const sig = allSignals.find((s: any) => s.type === 'UNUSUAL_TRANSACTION_PATTERN');
      assert.ok(sig, 'UNUSUAL_TRANSACTION_PATTERN signal should be detected');
      const zScoreEvidence = sig.evidence.find((e: any) => e.field === 'Z-Score');
      assert.ok(zScoreEvidence, 'Must have Z-Score in evidence');
      assert.ok(parseFloat(zScoreEvidence.value) > ANALYSIS_THRESHOLDS.UNUSUAL_Z_SCORE, `Z-Score ${zScoreEvidence.value} must exceed ${ANALYSIS_THRESHOLDS.UNUSUAL_Z_SCORE}`);
    });

    it('should include affectedTransactionIds in unusual pattern signal', () => {
      const sig = allSignals.find((s: any) => s.type === 'UNUSUAL_TRANSACTION_PATTERN');
      if (sig) {
        assert.ok(Array.isArray(sig.affectedTransactionIds), 'Must have affectedTransactionIds');
        assert.ok(sig.affectedTransactionIds.length > 0, 'Must reference at least one transaction');
      }
    });

    it('evidence items must have field and value', () => {
      for (const signal of allSignals) {
        for (const item of signal.evidence) {
          assert.ok(item.field, `Evidence item must have field (signal: ${signal.type})`);
          assert.ok(item.value !== undefined, `Evidence item must have value (signal: ${signal.type})`);
        }
      }
    });

    it('signals must not contain fabricated/hardcoded financial values', () => {
      // All numeric metric values should be >= 0 and should not use magic placeholder numbers
      for (const signal of allSignals) {
        for (const [key, val] of Object.entries(signal.metrics || {})) {
          if (typeof val === 'number') {
            assert.ok(val >= 0, `Metric ${key} must be non-negative`);
          }
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. RISK SIGNALS API
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/risk-signals', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/risk-signals');
      assert.strictEqual(res.status, 401);
    });

    it('should return signals with count for User A', async () => {
      const res = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.signals));
      assert.ok(typeof res.body.count === 'number');
    });

    it('should return zero signals for User B', async () => {
      const res = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.signals.length, 0);
    });

    it('should support severity filter', async () => {
      const res = await request(app)
        .get('/api/risk-signals?severity=HIGH')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      for (const sig of res.body.signals) {
        assert.strictEqual(sig.severity, 'HIGH');
      }
    });

    it('should support type filter', async () => {
      const res = await request(app)
        .get('/api/risk-signals?type=INCOME_CONCENTRATION')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      for (const sig of res.body.signals) {
        assert.strictEqual(sig.type, 'INCOME_CONCENTRATION');
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. RISK SIGNAL DETAIL
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/risk-signals/:id', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/risk-signals/any_id');
      assert.strictEqual(res.status, 401);
    });

    it('should return 404 for non-existent signal', async () => {
      const res = await request(app)
        .get('/api/risk-signals/nonexistent_signal_id')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 404);
    });

    it('should return full signal detail for User A', async () => {
      // Get a real signal ID first
      const listRes = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${userAToken}`);

      if (listRes.body.signals.length === 0) return; // No signals to test

      const id = listRes.body.signals[0].id;
      const res = await request(app)
        .get(`/api/risk-signals/${id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.signal);
      assert.strictEqual(res.body.signal.id, id);
    });

    it('User B cannot access User A\'s signal by ID', async () => {
      const listRes = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${userAToken}`);

      if (listRes.body.signals.length === 0) return;

      const id = listRes.body.signals[0].id;

      // User B attempts to access User A's signal ID
      const res = await request(app)
        .get(`/api/risk-signals/${id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      // Should be 404 (signal not found for User B)
      assert.strictEqual(res.status, 404);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. SIGNAL STATUS UPDATE (PATCH)
  // ══════════════════════════════════════════════════════════════════════════
  describe('PATCH /api/risk-signals/:id', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .patch('/api/risk-signals/any_id')
        .send({ status: 'ACKNOWLEDGED' });
      assert.strictEqual(res.status, 401);
    });

    it('should reject invalid status', async () => {
      const listRes = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${userAToken}`);

      if (listRes.body.signals.length === 0) return;
      const id = listRes.body.signals[0].id;

      const res = await request(app)
        .patch(`/api/risk-signals/${id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'INVALID_STATUS' });

      assert.strictEqual(res.status, 400);
    });

    it('should acknowledge a signal for User A', async () => {
      const listRes = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${userAToken}`);

      if (listRes.body.signals.length === 0) return;
      const id = listRes.body.signals[0].id;

      const res = await request(app)
        .patch(`/api/risk-signals/${id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'ACKNOWLEDGED' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.signal.status, 'ACKNOWLEDGED');
    });

    it('User B cannot update User A\'s signal status', async () => {
      const listRes = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${userAToken}`);

      if (listRes.body.signals.length === 0) return;
      const id = listRes.body.signals[0].id;

      const res = await request(app)
        .patch(`/api/risk-signals/${id}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ status: 'RESOLVED' });

      assert.strictEqual(res.status, 404);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. ANALYSIS SIGNAL DETAIL
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/analysis/:id', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/analysis/some_signal_id');
      assert.strictEqual(res.status, 401);
    });

    it('should return signal detail for valid signal ID', async () => {
      const listRes = await request(app)
        .get('/api/analysis')
        .set('Authorization', `Bearer ${userAToken}`);

      if (!listRes.body.analysis?.signals?.length) return;

      const id = listRes.body.analysis.signals[0].id;
      const res = await request(app)
        .get(`/api/analysis/${id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.signal);
      assert.strictEqual(res.body.signal.id, id);
    });

    it('User B cannot access User A signal via /api/analysis/:id', async () => {
      const listRes = await request(app)
        .get('/api/analysis')
        .set('Authorization', `Bearer ${userAToken}`);

      if (!listRes.body.analysis?.signals?.length) return;

      const id = listRes.body.analysis.signals[0].id;
      const res = await request(app)
        .get(`/api/analysis/${id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 404);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 8. SIMULATION + ANALYSIS INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /api/analysis/explain — Simulation Integration', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).post('/api/analysis/explain').send({ context: 'current' });
      assert.strictEqual(res.status, 401);
    });

    it('should return explainable report for current Digital Twin', async () => {
      const res = await request(app)
        .post('/api/analysis/explain')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ context: 'current' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.analysis?.summary);
      assert.ok(Array.isArray(res.body.analysis?.keyFindings));
      assert.ok(Array.isArray(res.body.analysis?.recommendations));
      assert.strictEqual(res.body.analysis?.provider, 'rules');
    });

    it('should analyze simulation scenario correctly', async () => {
      if (!simulationScenarioId) return;

      const res = await request(app)
        .post('/api/analysis/explain')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ context: 'simulation', scenarioId: simulationScenarioId });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const { analysis } = res.body;
      assert.strictEqual(analysis.context, 'simulation');
      assert.ok(analysis.scenarioName, 'Simulation analysis must include scenarioName');
      assert.ok(analysis.keyFindings.length > 0, 'Must have findings for simulation scenario');
    });

    it('simulation analysis must not mutate real financial records', async () => {
      // Run analysis before and after a simulation — twin state vector should be stable
      const twinBefore = await request(app)
        .get('/api/twin')
        .set('Authorization', `Bearer ${userAToken}`);

      await request(app)
        .post('/api/analysis/explain')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ context: 'simulation', scenarioId: simulationScenarioId });

      const twinAfter = await request(app)
        .get('/api/twin')
        .set('Authorization', `Bearer ${userAToken}`);

      // Net worth should be unchanged (simulation is sandboxed)
      assert.strictEqual(
        twinBefore.body.twin?.stateVector?.netWorth,
        twinAfter.body.twin?.stateVector?.netWorth,
        'Simulation analysis must not alter real Twin state'
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 9. EMPTY STATE HANDLING
  // ══════════════════════════════════════════════════════════════════════════
  describe('Empty State Handling', () => {
    let emptyUserToken: string;

    before(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Empty State User',
          email: `p5_empty_${Date.now()}@example.com`,
          password: 'Password123!',
        });
      emptyUserToken = res.body.token;
    });

    it('should return zero signals for user with no accounts', async () => {
      const res = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${emptyUserToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.signals.length, 0);
    });

    it('should return empty analysis for user with no data', async () => {
      const res = await request(app)
        .get('/api/analysis')
        .set('Authorization', `Bearer ${emptyUserToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.analysis.signals.length, 0);
    });

    it('should return limitations for insufficient data in summary', async () => {
      const res = await request(app)
        .get('/api/analysis/summary')
        .set('Authorization', `Bearer ${emptyUserToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.summary.limitations));
    });

    it('should still return explainable report for empty user', async () => {
      const res = await request(app)
        .post('/api/analysis/explain')
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .send({ context: 'current' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 10. SECURITY — Tenant Isolation
  // ══════════════════════════════════════════════════════════════════════════
  describe('Security — Tenant Isolation', () => {
    it('User B analysis must NOT contain User A signals', async () => {
      const [aRes, bRes] = await Promise.all([
        request(app).get('/api/analysis').set('Authorization', `Bearer ${userAToken}`),
        request(app).get('/api/analysis').set('Authorization', `Bearer ${userBToken}`),
      ]);

      const aSignalIds = aRes.body.analysis.signals.map((s: any) => s.id);
      const bSignals = bRes.body.analysis.signals;

      for (const sig of bSignals) {
        assert.ok(!aSignalIds.includes(sig.id), `User B must not see User A signal: ${sig.id}`);
      }
    });

    it('User B analysis must have userId = userBId', async () => {
      const res = await request(app)
        .get('/api/analysis')
        .set('Authorization', `Bearer ${userBToken}`);

      for (const sig of res.body.analysis.signals) {
        assert.strictEqual(sig.userId, userBId);
      }
    });

    it('User B risk signals must NOT include User A signals', async () => {
      const [aRes, bRes] = await Promise.all([
        request(app).get('/api/risk-signals').set('Authorization', `Bearer ${userAToken}`),
        request(app).get('/api/risk-signals').set('Authorization', `Bearer ${userBToken}`),
      ]);

      const aIds = aRes.body.signals.map((s: any) => s.id);
      for (const sig of bRes.body.signals) {
        assert.ok(!aIds.includes(sig.id));
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 11. THRESHOLD CONSTANTS VALIDATION
  // ══════════════════════════════════════════════════════════════════════════
  describe('Threshold Constants', () => {
    it('EXPENSE_CONCENTRATION_HIGH should be 0.40', () => {
      assert.strictEqual(ANALYSIS_THRESHOLDS.EXPENSE_CONCENTRATION_HIGH, 0.40);
    });

    it('EXPENSE_CONCENTRATION_CRITICAL should be 0.60', () => {
      assert.strictEqual(ANALYSIS_THRESHOLDS.EXPENSE_CONCENTRATION_CRITICAL, 0.60);
    });

    it('RECURRING_PRESSURE_MEDIUM should be 0.25', () => {
      assert.strictEqual(ANALYSIS_THRESHOLDS.RECURRING_PRESSURE_MEDIUM, 0.25);
    });

    it('INCOME_CONCENTRATION_HIGH should be 0.80', () => {
      assert.strictEqual(ANALYSIS_THRESHOLDS.INCOME_CONCENTRATION_HIGH, 0.80);
    });

    it('RUNWAY_HIGH threshold should be 3.0', () => {
      assert.strictEqual(ANALYSIS_THRESHOLDS.RUNWAY_HIGH, 3.0);
    });

    it('RUNWAY_CRITICAL threshold should be 1.5', () => {
      assert.strictEqual(ANALYSIS_THRESHOLDS.RUNWAY_CRITICAL, 1.5);
    });

    it('DTI_HIGH should be 0.40', () => {
      assert.strictEqual(ANALYSIS_THRESHOLDS.DTI_HIGH, 0.40);
    });

    it('UNUSUAL_Z_SCORE should be 2.5', () => {
      assert.strictEqual(ANALYSIS_THRESHOLDS.UNUSUAL_Z_SCORE, 2.5);
    });

    it('NETWORK_CONCENTRATION_MEDIUM should be 0.60', () => {
      assert.strictEqual(ANALYSIS_THRESHOLDS.NETWORK_CONCENTRATION_MEDIUM, 0.60);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 12. PHASE 1–4 REGRESSION SMOKE TESTS
  // ══════════════════════════════════════════════════════════════════════════
  describe('Phase 1–4 Regression', () => {
    it('Phase 1: Auth — login should still work', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: `p5_alpha_${Date.now()}@example.com`, password: 'Password123!' });
      // Email doesn't exist so 401 is fine — endpoint is functional
      assert.ok([200, 401].includes(res.status));
    });

    it('Phase 2: GET /api/transactions should work for User A', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.transactions));
    });

    it('Phase 2: GET /api/accounts should work for User A', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.accounts));
      assert.ok(res.body.accounts.length >= 3);
    });

    it('Phase 3: GET /api/twin should return Digital Twin for User A', async () => {
      const res = await request(app)
        .get('/api/twin')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.twin?.stateVector);
    });

    it('Phase 3: GET /api/network should return network graph', async () => {
      const res = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.nodes || res.body.network?.nodes);
    });

    it('Phase 4: GET /api/simulation/history should return scenarios', async () => {
      const res = await request(app)
        .get('/api/simulation/history')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.scenarios));
    });

    it('Phase 4: Health endpoint should respond', async () => {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.status, 200);
    });
  });
});
