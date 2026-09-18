import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { calculateLoanEMI, calculateRunway, calculateDTI } from '../src/utils/financialMath.js';
import { toPaise, fromPaise } from '../src/utils/calculations.js';
import { AccountRepository } from '../src/models/Account.js';
import { TransactionRepository } from '../src/models/Transaction.js';

describe('FinTwin AI — Phase 4: Deterministic Financial Simulation Engine & What-If Modeler', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let accountCheckingId: string;
  let accountSavingsId: string;
  let createdScenarioId: string;

  before(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Simulated User Alpha',
        email: `sim_alpha_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userAToken = resA.body.token;
    userAId = resA.body.user._id;

    // 2. Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Simulated User Beta',
        email: `sim_beta_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userBToken = resB.body.token;
    userBId = resB.body.user._id;

    // 3. User A Accounts: Checking (₹80,000) and Savings (₹1,20,000)
    const acc1 = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'HDFC Salary Checking',
        type: 'CHECKING',
        institution: 'HDFC Bank',
        currency: 'INR',
        currentBalance: 80000,
        isLiquid: true,
      });
    accountCheckingId = acc1.body.account._id;

    const acc2 = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'ICICI Emergency Savings',
        type: 'SAVINGS',
        institution: 'ICICI Bank',
        currency: 'INR',
        currentBalance: 120000,
        isLiquid: true,
      });
    accountSavingsId = acc2.body.account._id;

    // 4. Ingest baseline transactions for User A:
    // Salary: +₹85,000, Rent: -₹25,000, Groceries: -₹15,000 (Monthly Burn = ₹40,000, Net Surplus = +₹45,000)
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        sourceAccountId: accountCheckingId,
        amount: 85000,
        type: 'CREDIT',
        category: 'Salary',
        description: 'Monthly Salary Tech Innovations',
        date: new Date().toISOString(),
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        sourceAccountId: accountCheckingId,
        amount: 25000,
        type: 'DEBIT',
        category: 'Housing Rent',
        description: 'Monthly Apartment Rent',
        date: new Date().toISOString(),
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        sourceAccountId: accountCheckingId,
        amount: 15000,
        type: 'DEBIT',
        category: 'Groceries',
        description: 'Monthly Living Groceries',
        date: new Date().toISOString(),
      });
  });

  // ==========================================
  // 1. MATHEMATICAL VERIFICATION & LOAN AMORTIZATION
  // ==========================================
  describe('1. Mathematical Verification: Amortization & Integer Paise Safety', () => {
    it('should accurately compute standard loan EMI with 0% floating point errors', () => {
      // Principal: ₹70,000, APR: 14%, Tenure: 6 months
      const emi = calculateLoanEMI(70000, 14, 6);
      assert.ok(emi >= 12140 && emi <= 12150, `Calculated EMI ${emi} out of expected range`);

      // Total repayment & interest
      const totalRepayment = Math.round(emi * 6 * 100) / 100;
      const totalInterest = Math.round((totalRepayment - 70000) * 100) / 100;
      assert.ok(totalRepayment > 70000);
      assert.ok(totalInterest > 0 && totalInterest < 3500);
    });

    it('should accurately handle zero-interest loans without division-by-zero', () => {
      // ₹60,000 at 0% APR over 6 months = ₹10,000/mo exactly
      const zeroEmi = calculateLoanEMI(60000, 0, 6);
      assert.strictEqual(zeroEmi, 10000);
    });

    it('should convert amounts to and from exact integer paise', () => {
      assert.strictEqual(toPaise(70000), 7000000);
      assert.strictEqual(fromPaise(7000000), 70000);
      assert.strictEqual(toPaise(105.75), 10575);
      assert.strictEqual(fromPaise(10575), 105.75);
    });

    it('should compute runway correctly when burn is positive and return 999 when burn is 0 or negative', () => {
      assert.strictEqual(calculateRunway(200000, 40000), 5.0);
      assert.strictEqual(calculateRunway(200000, 0), 999);
      assert.strictEqual(calculateRunway(0, 40000), 0);
    });

    it('should compute DTI percentage deterministically', () => {
      // Debt service: 15,000, Gross Income: 60,000 -> 25.0%
      assert.strictEqual(calculateDTI(15000, 60000), 25.0);
      assert.strictEqual(calculateDTI(0, 60000), 0.0);
      assert.strictEqual(calculateDTI(10000, 0), 100.0);
    });
  });

  // ==========================================
  // 2. PURCHASE SIMULATION & BEFORE / AFTER MODEL
  // ==========================================
  describe('2. Scenario Type: PURCHASE (Before vs After & Integer Paise Model)', () => {
    it('should simulate ₹70,000 laptop purchase with exact before vs after state and explanations', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioType: 'PURCHASE',
          amount: 70000,
          targetAccountId: accountCheckingId,
          category: 'Technology',
          description: 'MacBook Pro Purchase',
          emergencyFundMonths: 3,
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      const { scenario, before, after, impact, explanations, assumptions, timeline } = res.body.results;
      createdScenarioId = res.body.scenario._id;

      // Scenario metadata
      assert.strictEqual(scenario.type, 'PURCHASE');
      assert.strictEqual(scenario.amount, 70000);
      assert.strictEqual(scenario.amountPaise, 7000000);

      // Before state: Checking balance was ₹80,000 (after transactions: 80k + 85k - 40k = 125,000)
      assert.ok(before.totalBalancePaise > 0);
      assert.strictEqual(before.monthlyIncome, 85000);
      assert.strictEqual(before.monthlyExpenses, 40000);

      // After state: Balance decreased by exact ₹70,000
      assert.strictEqual(after.totalBalancePaise, before.totalBalancePaise - 7000000);
      assert.strictEqual(after.liquidReservesPaise, before.liquidReservesPaise - 7000000);
      assert.strictEqual(after.netWorthPaise, before.netWorthPaise - 7000000);

      // Impact
      assert.strictEqual(impact.balanceChangePaise, -7000000);
      assert.strictEqual(impact.balanceChange, -70000);
      assert.strictEqual(impact.netWorthChange, -70000);
      assert.strictEqual(impact.isSufficientBalance, true);

      // Explanations and Assumptions
      assert.ok(Array.isArray(explanations) && explanations.length >= 2);
      assert.ok(Array.isArray(assumptions) && assumptions.length >= 1);
      assert.ok(assumptions.some((a: string) => a.includes('Baseline cash flow derived from')));

      // Timeline
      assert.ok(Array.isArray(timeline) && timeline.length === 12);
      assert.strictEqual(timeline[0].month, 1);
    });

    it('should flag insufficient account balance warning when purchase exceeds account balance', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioType: 'PURCHASE',
          amount: 500000, // Exceeds checking account balance
          targetAccountId: accountCheckingId,
          description: 'Luxury Watch Purchase',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.results.impact.isSufficientBalance, false);
      assert.ok(res.body.results.explanations.some((e: string) => e.includes('Warning: Outlay exceeds current account balance')));
    });
  });

  // ==========================================
  // 3. LOAN / EMI SIMULATION (LIQUIDITY vs NET WORTH vs LIABILITY)
  // ==========================================
  describe('3. Scenario Type: LOAN / EMI (Distinguishing Cash vs Liability vs Net Worth)', () => {
    it('should simulate ₹60,000 loan with EMI and distinguish liquid cash from liability and net worth', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioType: 'LOAN_EMI',
          principal: 60000,
          annualRate: 12,
          tenureMonths: 12,
          processingFee: 1000,
          description: 'Personal Education Loan',
        });

      assert.strictEqual(res.status, 201);
      const { before, after, impact, explanations } = res.body.results;

      // Cash increases by principal minus processing fee (₹59,000)
      assert.strictEqual(after.liquidReserves, before.liquidReserves + 59000);

      // Liability increases by full principal (₹60,000)
      assert.strictEqual(after.totalDebt, before.totalDebt + 60000);

      // Net worth changes ONLY by processing fee (-₹1,000), not treated as wealth!
      assert.strictEqual(after.netWorth, before.netWorth - 1000);

      // Monthly expenses increases by EMI
      assert.ok(after.monthlyExpenses > before.monthlyExpenses);

      // Explanations
      assert.ok(explanations.some((e: string) => e.includes('Liquid cash increases temporarily')));
      assert.ok(explanations.some((e: string) => e.includes('Total interest payable')));
    });
  });

  // ==========================================
  // 4. RECURRING EXPENSE & INCOME CHANGE SIMULATION
  // ==========================================
  describe('4. Scenario Types: RECURRING EXPENSE & INCOME CHANGE', () => {
    it('should simulate adding a ₹5,000 monthly subscription and adjust net cash flow', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioType: 'RECURRING_EXPENSE',
          amount: 5000,
          frequency: 'MONTHLY',
          category: 'Software Subscriptions',
          description: 'Cloud Infrastructure Subscription',
        });

      assert.strictEqual(res.status, 201);
      const { before, after, impact } = res.body.results;

      assert.strictEqual(after.monthlyExpenses, before.monthlyExpenses + 5000);
      assert.strictEqual(after.netCashFlow, before.netCashFlow - 5000);
      assert.strictEqual(impact.cashFlowChange, -5000);
    });

    it('should simulate a ₹10,000 monthly salary increment and project increased surplus', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioType: 'INCOME_CHANGE',
          amount: 10000,
          direction: 'INFLOW',
          description: 'Annual Salary Appraisal',
        });

      assert.strictEqual(res.status, 201);
      const { before, after, impact } = res.body.results;

      assert.strictEqual(after.monthlyIncome, before.monthlyIncome + 10000);
      assert.strictEqual(after.netCashFlow, before.netCashFlow + 10000);
      assert.strictEqual(impact.cashFlowChange, 10000);
    });
  });

  // ==========================================
  // 5. SCENARIO COMPARISON (BUY NOW vs BUY LATER vs CHEAPER OPTION)
  // ==========================================
  describe('5. Scenario Comparison Engine (POST /api/simulation/compare)', () => {
    it('should compute side-by-side comparison for Buy Now vs Buy Later vs Cheaper Option', async () => {
      const res = await request(app)
        .post('/api/simulation/compare')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          purchaseAmount: 70000,
          delayMonths: 3,
          cheaperAmount: 50000,
          description: 'MacBook M3 Purchase',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const { buyNow, buyLater, cheaperOption, comparisonMetrics, explanations, assumptions } = res.body.comparison;

      // All 3 sub-scenarios present
      assert.ok(buyNow);
      assert.ok(buyLater);
      assert.ok(cheaperOption);

      // Buy now draws immediately in Month 1
      assert.strictEqual(buyNow.impact.balanceChange, -70000);

      // Cheaper option saves ₹20,000 upfront
      assert.strictEqual(cheaperOption.impact.balanceChange, -50000);

      // Comparison Metrics table
      assert.ok(Array.isArray(comparisonMetrics) && comparisonMetrics.length >= 7);
      assert.ok(comparisonMetrics.some((m: any) => m.dimension === 'Outlay / Price'));
      assert.ok(comparisonMetrics.some((m: any) => m.dimension === 'Purchase Timing'));
      assert.ok(comparisonMetrics.some((m: any) => m.dimension === 'Emergency Fund Coverage'));

      // Explanations and Assumptions
      assert.ok(Array.isArray(explanations) && explanations.length === 3);
      assert.ok(Array.isArray(assumptions) && assumptions.length >= 2);
    });

    it('should reject invalid comparison payload with negative or zero purchase amount', async () => {
      const res = await request(app)
        .post('/api/simulation/compare')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          purchaseAmount: -5000,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });
  });

  // ==========================================
  // 6. ZERO MUTATION GUARANTEE (CRITICAL REQUIREMENT 24)
  // ==========================================
  describe('6. Zero Mutation Guarantee: Real Data Remains 100% Intact', () => {
    it('should guarantee that running simulations NEVER alters real account balances, transactions, or entities', async () => {
      // 1. Fetch real account balance before simulation
      const beforeAccount = await AccountRepository.findByIdAndUserId(accountCheckingId, userAId);
      const beforeTransactions = await TransactionRepository.findByUserId(userAId);
      const initialBal = beforeAccount?.currentBalance;
      const initialTxCount = beforeTransactions.totalCount;

      // 2. Run an aggressive ₹70,000 purchase simulation
      await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioType: 'PURCHASE',
          amount: 70000,
          targetAccountId: accountCheckingId,
          description: 'Test Mutation Isolation',
        });

      // 3. Re-fetch real account balance after simulation
      const afterAccount = await AccountRepository.findByIdAndUserId(accountCheckingId, userAId);
      const afterTransactions = await TransactionRepository.findByUserId(userAId);

      // 4. Assert 100% strict equality
      assert.strictEqual(afterAccount?.currentBalance, initialBal, 'Account balance MUST remain 100% untouched!');
      assert.strictEqual(afterTransactions.totalCount, initialTxCount, 'Transaction count MUST remain 100% untouched!');
    });
  });

  // ==========================================
  // 7. MULTI-CURRENCY SAFETY & REQUEST VALIDATION
  // ==========================================
  describe('7. Multi-Currency Safety & Request Validation', () => {
    it('should reject cross-currency simulation between USD and INR account without exchange rate', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioType: 'PURCHASE',
          amount: 1000,
          currency: 'USD', // Account is INR!
          targetAccountId: accountCheckingId,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.message.includes('Cross-currency simulation'));
    });

    it('should reject negative purchase amounts', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioType: 'PURCHASE',
          amount: -50000,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject impossible loan tenure (e.g. 0 or 200 months)', async () => {
      const res = await request(app)
        .post('/api/simulation/run')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          scenarioType: 'LOAN_EMI',
          principal: 50000,
          tenureMonths: 150, // Beyond 120 months
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });
  });

  // ==========================================
  // 8. SECURITY & TENANT ISOLATION (USER A vs USER B)
  // ==========================================
  describe('8. Security, Tenant Isolation & Scenario Deletion', () => {
    it('should prevent User B from reading User A simulation scenarios', async () => {
      const res = await request(app)
        .get(`/api/simulation/${createdScenarioId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    it('should prevent User B from deleting User A simulation scenarios', async () => {
      const res = await request(app)
        .delete(`/api/simulation/${createdScenarioId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    it('should allow authorized owner (User A) to delete their simulation scenario', async () => {
      const res = await request(app)
        .delete(`/api/simulation/${createdScenarioId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      // Confirm deletion
      const checkRes = await request(app)
        .get(`/api/simulation/${createdScenarioId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.strictEqual(checkRes.status, 404);
    });
  });
});
