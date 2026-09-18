import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';

describe('FinTwin AI — Phase 3: Digital Twin (MODEL) & Network Graph (CONNECT) Tests', () => {
  let userAToken: string;
  let userBToken: string;

  before(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Twin Model User A',
        email: `twina_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userAToken = resA.body.token;

    // 2. Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Twin Model User B',
        email: `twinb_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userBToken = resB.body.token;

    // 3. Set up User A's Accounts
    const accChecking = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'HDFC Checking (Salary Hub)',
        type: 'CHECKING',
        institution: 'HDFC Bank',
        currentBalance: 50000,
      });

    const accSavings = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'ICICI Savings Reserve',
        type: 'SAVINGS',
        institution: 'ICICI Bank',
        currentBalance: 150000,
      });

    const accCredit = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'SBI Card',
        type: 'CREDIT_CARD',
        institution: 'SBI Cards',
        currentBalance: 20000,
        creditLimit: 100000,
      });

    const checkingId = accChecking.body.account._id;

    // 4. Set up User A's Entities
    const entEmployer = await request(app)
      .post('/api/entities')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Tech Innovations Ltd',
        type: 'EMPLOYER',
        category: 'Income',
      });

    const entLandlord = await request(app)
      .post('/api/entities')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Apex Real Estate',
        type: 'UTILITY',
        category: 'Housing',
      });

    const employerId = entEmployer.body.entity._id;
    const landlordId = entLandlord.body.entity._id;

    // 5. User A Transactions: Salary Inflow and Rent Outflow
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        date: new Date().toISOString(),
        amount: 90000,
        sourceAccountId: checkingId,
        destinationEntityId: employerId,
        category: 'Salary',
        type: 'CREDIT',
        description: 'Monthly Salary Credit',
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        date: new Date().toISOString(),
        amount: 30000,
        sourceAccountId: checkingId,
        destinationEntityId: landlordId,
        category: 'Housing Rent',
        type: 'DEBIT',
        description: 'Monthly Apartment Rent',
      });

    // 6. User B separate account
    await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        name: 'User B Secret Vault',
        type: 'SAVINGS',
        institution: 'Secret Bank',
        currentBalance: 999999,
      });
  });

  describe('GET /api/twin — State Vector (03 MODEL)', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/twin');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should deterministically compute net worth, liquid reserves, and runway', async () => {
      const res = await request(app)
        .get('/api/twin')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.twin);

      const { stateVector, summary, accounts, metrics } = res.body.twin;

      // Checking: Initial 50,000 + 90,000 (salary) - 30,000 (rent) = 110,000
      // Savings: 150,000
      // Total Assets: 110,000 + 150,000 = 260,000
      // Total Debt: SBI Card (20,000)
      // Net Worth: 260,000 - 20,000 = 240,000
      assert.strictEqual(summary.totalAssets, 260000);
      assert.strictEqual(summary.totalDebt, 20000);
      assert.strictEqual(summary.netWorth, 240000);
      assert.strictEqual(stateVector.netWorth, 240000);

      // Liquid Reserves: Checking (110,000) + Savings (150,000) = 260,000
      assert.strictEqual(stateVector.liquidReserves, 260000);

      // Monthly Income: 90,000
      // Monthly Burn: 30,000
      assert.strictEqual(metrics.monthlyIncome, 90000);
      assert.strictEqual(metrics.monthlyBurn, 30000);

      // Runway = 260,000 / 30,000 = 8.7 months
      assert.strictEqual(stateVector.runwayMonths, 8.7);

      // Health score >= 70 for healthy runway & positive savings
      assert.ok(stateVector.healthScore >= 70);

      // Accounts breakdown
      assert.strictEqual(accounts.all.length, 3);
      assert.strictEqual(accounts.assets.length, 2);
      assert.strictEqual(accounts.liabilities.length, 1);
    });

    it('should enforce strict tenant isolation for Digital Twin state', async () => {
      const resA = await request(app)
        .get('/api/twin')
        .set('Authorization', `Bearer ${userAToken}`);

      const resB = await request(app)
        .get('/api/twin')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(resA.status, 200);
      assert.strictEqual(resB.status, 200);

      // User A net worth is 240,000; User B net worth is 999,999
      assert.strictEqual(resA.body.twin.stateVector.netWorth, 240000);
      assert.strictEqual(resB.body.twin.stateVector.netWorth, 999999);
      assert.strictEqual(resB.body.twin.summary.accountsCount, 1);
    });
  });

  describe('GET /api/twin/network — Graph Topology (04 CONNECT)', () => {
    it('should construct connected network graph with nodes and directed links', async () => {
      const res = await request(app)
        .get('/api/twin/network')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.graph);

      const { nodes, links } = res.body.graph;

      // 3 accounts + 2 entities = 5 nodes
      assert.strictEqual(nodes.length, 5);

      // Links should connect Employer -> Checking and Checking -> Landlord
      assert.ok(links.length >= 2);

      const incomeLink = links.find((l: any) => l.type === 'INCOME');
      assert.ok(incomeLink);
      assert.strictEqual(incomeLink.amount, 90000);

      const expenseLink = links.find((l: any) => l.type === 'EXPENSE');
      assert.ok(expenseLink);
      assert.strictEqual(expenseLink.amount, 30000);
    });

    it('should isolate network graphs between users', async () => {
      const resB = await request(app)
        .get('/api/twin/network')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(resB.status, 200);
      // User B only has 1 account node and no entities
      assert.strictEqual(resB.body.graph.nodes.length, 1);
      assert.strictEqual(resB.body.graph.nodes[0].label, 'User B Secret Vault');
    });
  });

  describe('GET /api/risk-signals', () => {
    it('should return active deterministic risk signals', async () => {
      const res = await request(app)
        .get('/api/risk-signals')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.signals));
    });
  });
});
