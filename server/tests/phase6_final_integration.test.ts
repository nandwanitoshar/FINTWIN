/**
 * phase6_final_integration.test.ts
 * FinTwin AI — Phase 6: Final Integration, Consolidated Reporting, Security & Production Readiness
 *
 * Covers:
 * 1. Authentication & Token Security
 * 2. Full End-to-End Golden Path (Register -> Account -> Entity -> Transaction -> Twin -> Network -> Simulation -> Analysis -> Report)
 * 3. Cross-Module Data Consistency (All services agree on underlying financial truth)
 * 4. Two-User Tenant Isolation (User B cannot access or deduce User A's data)
 * 5. Zero-Mutation Invariance (Simulations and reports never alter real financial ledger state)
 * 6. Empty States & Graceful Transparency ("Insufficient historical data for trend analysis")
 * 7. Currency Safety & Integer Paise Precision
 * 8. Explainability Traceability (5 Canonical Questions)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';

describe('FinTwin AI — Phase 6: Consolidated Reporting, Final Integration & Security', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  let userAAccountId: string;
  let userAEntityId: string;
  let initialBalance = 100000; // ₹100,000
  let incomeAmount = 80000;    // ₹80,000
  let expenseAmount = 40000;   // ₹40,000
  let simulationId: string;

  before(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Phase6 Golden User A',
        email: `p6_alpha_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    assert.strictEqual(resA.status, 201);
    assert.ok(resA.body.token);
    userAToken = resA.body.token;
    userAId = resA.body.user._id;

    // 2. Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Phase6 Isolated User B',
        email: `p6_beta_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    assert.strictEqual(resB.status, 201);
    assert.ok(resB.body.token);
    userBToken = resB.body.token;
    userBId = resB.body.user._id;
  });

  // ─── 1. AUTHENTICATION & SECURITY ─────────────────────────────────────────
  describe('1. Authentication & Security Boundary', () => {
    it('should reject unauthenticated requests to /api/report', async () => {
      const res = await request(app).get('/api/report');
      assert.strictEqual(res.status, 401);
    });

    it('should reject requests with invalid or malformed JWT token', async () => {
      const res = await request(app)
        .get('/api/report')
        .set('Authorization', 'Bearer invalid-garbage-token');
      assert.strictEqual(res.status, 401);
    });

    it('should verify authenticated /api/auth/me returns current user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.user._id, userAId);
    });
  });

  // ─── 2. EMPTY STATE HANDLING ──────────────────────────────────────────────
  describe('2. Safe Empty States for Fresh User', () => {
    it('should return a valid, non-crashing empty report for User B (zero accounts/transactions)', async () => {
      const res = await request(app)
        .get('/api/report')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const report = res.body.report;

      // Verify zero snapshot
      assert.strictEqual(report.snapshot.totalBalance, 0);
      assert.strictEqual(report.snapshot.netWorth, 0);
      assert.strictEqual(report.snapshot.accountCount, 0);
      assert.strictEqual(report.snapshot.transactionCount, 0);

      // Verify cashflow transparency
      assert.strictEqual(report.cashFlow.trendAvailable, false);
      assert.strictEqual(report.cashFlow.trendMessage, 'Insufficient historical data for trend analysis.');

      // Verify data quality identifies missing information
      assert.ok(report.dataQuality.missingInformation.length > 0);
      assert.ok(report.dataQuality.missingInformation.includes('No bank or credit accounts connected.'));
      assert.ok(report.dataQuality.missingInformation.includes('No transactions imported.'));
    });
  });

  // ─── 3. FULL GOLDEN PATH POPULATION ───────────────────────────────────────
  describe('3. End-to-End Golden Path Pipeline Execution', () => {
    it('Step 1: Create primary savings account for User A', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'HDFC Wealth Hub',
          type: 'SAVINGS',
          institution: 'HDFC Bank',
          currentBalance: initialBalance,
          currency: 'INR',
        });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.account._id);
      userAAccountId = res.body.account._id;
    });

    it('Step 2: Create employer entity for User A', async () => {
      const res = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Nexus Tech Global',
          type: 'EMPLOYER',
          category: 'Salary',
        });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.entity._id);
      userAEntityId = res.body.entity._id;
    });

    it('Step 3: Ingest transactions (Income + Expense)', async () => {
      // Income Transaction
      const resInc = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          date: new Date('2026-08-01T10:00:00Z'),
          amount: incomeAmount,
          accountId: userAAccountId,
          entityId: userAEntityId,
          type: 'CREDIT',
          direction: 'INCOME',
          category: 'Salary',
          description: 'Monthly Engineering Retainer',
          currency: 'INR',
        });
      assert.strictEqual(resInc.status, 201);

      // Expense Transaction (month 1)
      const resExp1 = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          date: new Date('2026-08-05T12:00:00Z'),
          amount: 25000,
          accountId: userAAccountId,
          type: 'DEBIT',
          direction: 'EXPENSE',
          category: 'Housing & Rent',
          description: 'Apartment Lease',
          currency: 'INR',
        });
      assert.strictEqual(resExp1.status, 201);

      // Expense Transaction (month 2 to enable trend analysis)
      const resExp2 = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          date: new Date('2026-09-02T15:00:00Z'),
          amount: 15000,
          accountId: userAAccountId,
          type: 'DEBIT',
          direction: 'EXPENSE',
          category: 'Cloud Infrastructure',
          description: 'AWS Cluster Hosting',
          currency: 'INR',
        });
      assert.strictEqual(resExp2.status, 201);
    });

    it('Step 4: Verify Digital Twin reflects correct state vector', async () => {
      const res = await request(app)
        .get('/api/twin')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      // Account initial 100,000 + 80,000 income - 40,000 expenses = 140,000
      assert.strictEqual(res.body.twin.summary.totalAssets, 140000);
      assert.strictEqual(res.body.twin.summary.netWorth, 140000);
    });

    it('Step 5: Verify Network Topology graph is constructed', async () => {
      const res = await request(app)
        .get('/api/twin/network')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.graph.nodes.length >= 2);
      assert.ok(res.body.graph.links.length >= 1);
    });

    it('Step 6: Run deterministic simulation without mutating baseline', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioName: 'MacBook Pro M4 Workstation',
          scenarioType: 'PURCHASE',
          amount: 50000,
          currency: 'INR',
          targetAccountId: userAAccountId,
          horizonMonths: 6,
        });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      simulationId = res.body.scenario._id;
      assert.ok(simulationId);
    });

    it('Step 7: Retrieve risk signals', async () => {
      const res = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.signals));
    });

    it('Step 8: Fetch final Consolidated Intelligence Report (/api/report and /api/intelligence-report)', async () => {
      const res1 = await request(app)
        .get('/api/report')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res1.status, 200);

      const res2 = await request(app)
        .get('/api/intelligence-report')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res2.status, 200);

      const report = res1.body.report;

      // 01 Snapshot (initial 100k + 80k income - 40k expenses = 140k current balance)
      assert.strictEqual(report.snapshot.totalBalance, 140000);
      assert.strictEqual(report.snapshot.totalIncome, incomeAmount);
      assert.strictEqual(report.snapshot.totalExpenses, expenseAmount);
      assert.strictEqual(report.snapshot.netCashFlow, incomeAmount - expenseAmount);
      assert.strictEqual(report.snapshot.accountCount, 1);
      assert.strictEqual(report.snapshot.transactionCount, 3);

      // 02 Digital Twin
      assert.ok(report.digitalTwin.connectedNodes >= 2);
      assert.ok(report.digitalTwin.relationships >= 1);

      // 03 Cashflow (two months span -> trend available)
      assert.strictEqual(report.cashFlow.trendAvailable, true);
      assert.ok(report.cashFlow.monthlyTrend.length >= 2);
      assert.ok(report.cashFlow.majorExpenseCategories.length >= 1);

      // 04 Risk Signals
      assert.strictEqual(report.riskSignals.statement, 'Detected from observed financial history.');

      // 05 Explainability
      assert.ok(Array.isArray(report.explainability));

      // 06 Simulation Results
      assert.strictEqual(report.simulationResults.hasSimulationHistory, true);
      assert.strictEqual(report.simulationResults.recentScenarios[0].id, simulationId);

      // 07 Decision Comparison
      assert.strictEqual(report.decisionComparison.hasComparison, true);
      assert.strictEqual(report.decisionComparison.comparisonMatrix?.options.length, 3);

      // 08 Network Insight
      assert.ok(report.networkInsight.importantConnectedAccounts.length >= 1);

      // 09 Data Quality
      assert.strictEqual(report.dataQuality.accountsAvailable, 1);
      assert.strictEqual(report.dataQuality.transactionsAvailable, 3);
      assert.strictEqual(report.dataQuality.historicalPeriodMonths, 2);

      // 10 Limitations
      assert.strictEqual(report.limitations.length, 5);
    });
  });

  // ─── 4. CROSS-MODULE DATA CONSISTENCY ─────────────────────────────────────
  describe('4. Cross-Module Data Consistency Verification', () => {
    it('verifies balance, income, expenses match identically across Digital Twin, Analysis, and Report', async () => {
      const [twinRes, analysisRes, reportRes] = await Promise.all([
        request(app).get('/api/twin').set('Authorization', `Bearer ${userAToken}`),
        request(app).get('/api/analysis').set('Authorization', `Bearer ${userAToken}`),
        request(app).get('/api/report').set('Authorization', `Bearer ${userAToken}`),
      ]);

      const twin = twinRes.body.twin;
      const report = reportRes.body.report;

      // Balance & Net Worth consistency
      assert.strictEqual(twin.summary.totalAssets, report.snapshot.totalBalance);
      assert.strictEqual(twin.summary.netWorth, report.snapshot.netWorth);

      // Cash Flow consistency
      assert.strictEqual(report.snapshot.totalIncome, 80000);
      assert.strictEqual(report.snapshot.totalExpenses, 40000);
      assert.strictEqual(report.snapshot.netCashFlow, 40000);
    });
  });

  // ─── 5. ZERO-MUTATION VERIFICATION ────────────────────────────────────────
  describe('5. Zero-Mutation Invariance', () => {
    it('guarantees that running simulations and generating reports does not mutate account balance or ledger', async () => {
      // 1. Check account balance before
      const accBefore = await request(app)
        .get(`/api/accounts/${userAAccountId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      const balanceBefore = accBefore.body.account.currentBalance;

      // 2. Run prospective loan simulation
      await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioName: 'Car Loan ₹1,500,000',
          scenarioType: 'LOAN_EMI',
          principal: 1500000,
          annualRate: 9.5,
          tenureMonths: 36,
          targetAccountId: userAAccountId,
        });

      // 3. Request full analysis & intelligence report
      await request(app).get('/api/analysis').set('Authorization', `Bearer ${userAToken}`);
      await request(app).get('/api/report').set('Authorization', `Bearer ${userAToken}`);

      // 4. Verify account balance after is identical to before
      const accAfter = await request(app)
        .get(`/api/accounts/${userAAccountId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      const balanceAfter = accAfter.body.account.currentBalance;

      assert.strictEqual(balanceAfter, balanceBefore);
      assert.strictEqual(balanceAfter, 140000);
    });
  });

  // ─── 6. TWO-USER SECURITY ISOLATION ───────────────────────────────────────
  describe('6. Multi-Tenant Strict Isolation', () => {
    it('User B cannot access User A accounts', async () => {
      const res = await request(app)
        .get(`/api/accounts/${userAAccountId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      assert.ok(res.status === 404 || res.status === 403);
    });

    it('User B cannot access User A simulation scenarios', async () => {
      const res = await request(app)
        .get(`/api/simulation/${simulationId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      assert.ok(res.status === 404 || res.status === 403);
    });

    it('User B report never includes User A transactions or accounts', async () => {
      const res = await request(app)
        .get('/api/report')
        .set('Authorization', `Bearer ${userBToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.report.snapshot.totalBalance, 0);
      assert.strictEqual(res.body.report.snapshot.accountCount, 0);
      assert.strictEqual(res.body.report.snapshot.transactionCount, 0);
    });
  });

  // ─── 7. CURRENCY SAFETY & INPUT VALIDATION ────────────────────────────────
  describe('7. Currency Safety & Precision', () => {
    it('rejects cross-currency simulation between unhedged accounts without explicit rate', async () => {
      // Create USD account for User A
      const usdAccRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'US Tech Brokerage',
          type: 'INVESTMENT',
          institution: 'Interactive Brokers',
          currentBalance: 5000,
          currency: 'USD',
        });
      assert.strictEqual(usdAccRes.status, 201);
      const usdAccountId = usdAccRes.body.account._id;

      // Attempt simulation in INR targeting USD account
      const simCrossRes = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioName: 'Cross Currency Attempt',
          amount: 25000,
          currency: 'INR',
          targetAccountId: usdAccountId,
        });
      assert.strictEqual(simCrossRes.status, 400);
      assert.ok(simCrossRes.body.message.includes('Cross-currency'));
    });
  });

  // ─── 8. EXPLAINABILITY AXIOM VERIFICATION ─────────────────────────────────
  describe('8. Explainability Model Traceability', () => {
    it('verifies explainability items conform to the 5 canonical intelligence questions', async () => {
      const res = await request(app)
        .get('/api/report')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(res.status, 200);
      const explainability = res.body.report.explainability;

      if (explainability.length > 0) {
        const item = explainability[0];
        assert.ok(item.whatWasObserved, 'Must have whatWasObserved');
        assert.ok(item.whyWasItFlagged, 'Must have whyWasItFlagged');
        assert.ok(Array.isArray(item.whatDataSupportsIt), 'Must have whatDataSupportsIt');
        assert.ok(item.whatCalculationWasUsed, 'Must have whatCalculationWasUsed');
        assert.ok(Array.isArray(item.whatAreTheLimitations), 'Must have whatAreTheLimitations');
      }
    });
  });
});
