import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB, getIsConnected } from '../src/config/db.js';
import { calculateRelationshipStrength } from '../src/services/digitalTwinService.js';
import { normalizeCurrency } from '../src/services/pipelineService.js';
import { AccountRepository } from '../src/models/Account.js';
import { EntityRepository } from '../src/models/Entity.js';
import { TransactionRepository } from '../src/models/Transaction.js';

const app = createApp();

describe('FinTwin AI — PHASE 3: Digital Twin Core, Relationship Engine & Financial Network', () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;

  before(async () => {
    await connectDB();

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Phase3 User A',
        email: `phase3_user_a_${Date.now()}@fintwin.ai`,
        password: 'Password123!',
        currency: 'INR',
      });
    assert.strictEqual(resA.status, 201);
    userAToken = resA.body.token;
    userAId = resA.body.user._id;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Phase3 User B',
        email: `phase3_user_b_${Date.now()}@fintwin.ai`,
        password: 'Password123!',
        currency: 'INR',
      });
    assert.strictEqual(resB.status, 201);
    userBToken = resB.body.token;
    userBId = resB.body.user._id;
  });

  // =========================================================================
  // 1. UNIT TESTS: Deterministic Relationship Strength & Currency Safety
  // =========================================================================
  describe('1. Unit Tests — Deterministic Strength & Currency Safety', () => {
    it('should compute deterministic relationship strength bounded in [0.00, 1.00]', () => {
      // 0 transactions -> 0
      assert.strictEqual(calculateRelationshipStrength(0, 0), 0);

      // Low volume & low frequency
      const low = calculateRelationshipStrength(1, 100);
      assert.ok(low > 0 && low < 0.5);

      // Medium volume (₹50,000) & 5 transactions
      const med = calculateRelationshipStrength(5, 50000);
      assert.ok(med >= 0.5 && med <= 0.85);

      // High volume (₹1,000,000+) & 15 transactions -> max 1.00
      const high = calculateRelationshipStrength(15, 1500000);
      assert.strictEqual(high, 1.0);
    });

    it('should reject unsupported or ambiguous currency strings explicitly (Requirement 18)', () => {
      const validINR = normalizeCurrency('INR');
      assert.strictEqual(validINR.isValid, true);
      assert.strictEqual(validINR.currency, 'INR');

      const validUSD = normalizeCurrency('$');
      assert.strictEqual(validUSD.isValid, true);
      assert.strictEqual(validUSD.currency, 'USD');

      const invalidXYZ = normalizeCurrency('XYZ');
      assert.strictEqual(invalidXYZ.isValid, false);
      assert.ok(invalidXYZ.error || invalidXYZ.warning);

      const invalidCrypto = normalizeCurrency('BTC');
      assert.strictEqual(invalidCrypto.isValid, false);
    });
  });

  // =========================================================================
  // 2. GRAPH CONSTRUCTION: Income, Expense, Transfer, Refund & Aggregation
  // =========================================================================
  describe('2. Graph Construction & Relationship Rules', () => {
    let checkingAccId: string;
    let savingsAccId: string;
    let employerEntId: string;
    let merchantEntId: string;

    before(async () => {
      // Create Checking Account for User A
      const acc1Res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Primary Salary Checking',
          type: 'CHECKING',
          institution: 'HDFC Bank',
          currentBalance: 50000,
        });
      assert.strictEqual(acc1Res.status, 201);
      checkingAccId = acc1Res.body.account._id;

      // Create Savings Account for User A
      const acc2Res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Emergency Savings Fund',
          type: 'SAVINGS',
          institution: 'ICICI Bank',
          currentBalance: 100000,
        });
      assert.strictEqual(acc2Res.status, 201);
      savingsAccId = acc2Res.body.account._id;

      // Create Employer Entity
      const ent1Res = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Apex Innovations Corp',
          type: 'EMPLOYER',
          category: 'Salary',
        });
      assert.strictEqual(ent1Res.status, 201);
      employerEntId = ent1Res.body.entity._id;

      // Create Merchant Entity
      const ent2Res = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Amazon India',
          type: 'MERCHANT',
          category: 'Shopping',
        });
      assert.strictEqual(ent2Res.status, 201);
      merchantEntId = ent2Res.body.entity._id;
    });

    it('should create real Income relationship (RECEIVES_FROM): Employer -> Checking', async () => {
      const txRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 85000,
          type: 'CREDIT',
          direction: 'INCOME',
          accountId: checkingAccId,
          entityId: employerEntId,
          description: 'Monthly Payroll Stipend',
          category: 'Salary',
        });
      assert.strictEqual(txRes.status, 201);

      const netRes = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(netRes.status, 200);
      assert.strictEqual(netRes.body.success, true);

      const edges = netRes.body.network.edges;
      const incomeEdge = edges.find(
        (e: any) => e.source === employerEntId && e.target === checkingAccId
      );
      assert.ok(incomeEdge, 'Income edge Employer -> Checking must exist');
      assert.strictEqual(incomeEdge.relationshipType, 'RECEIVES_FROM');
      assert.strictEqual(incomeEdge.direction, 'INCOMING');
      assert.strictEqual(incomeEdge.totalVolume, 85000);
      assert.strictEqual(incomeEdge.transactionCount, 1);
    });

    it('should create real Expense relationship (PAYS): Checking -> Merchant', async () => {
      const txRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 12500,
          type: 'DEBIT',
          direction: 'EXPENSE',
          accountId: checkingAccId,
          entityId: merchantEntId,
          description: 'Amazon Electronics Purchase',
          category: 'Shopping',
        });
      assert.strictEqual(txRes.status, 201);

      const netRes = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${userAToken}`);

      const edges = netRes.body.network.edges;
      const expenseEdge = edges.find(
        (e: any) => e.source === checkingAccId && e.target === merchantEntId
      );
      assert.ok(expenseEdge, 'Expense edge Checking -> Merchant must exist');
      assert.strictEqual(expenseEdge.relationshipType, 'PAYS');
      assert.strictEqual(expenseEdge.direction, 'OUTGOING');
      assert.strictEqual(expenseEdge.totalVolume, 12500);
    });

    it('should aggregate multiple transactions between same account and entity', async () => {
      // Second transaction to Amazon
      const tx2Res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 7500,
          type: 'DEBIT',
          direction: 'EXPENSE',
          accountId: checkingAccId,
          entityId: merchantEntId,
          description: 'Amazon Books & Stationeries',
          category: 'Shopping',
        });
      assert.strictEqual(tx2Res.status, 201);

      const netRes = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${userAToken}`);

      const edges = netRes.body.network.edges;
      const expenseEdge = edges.find(
        (e: any) => e.source === checkingAccId && e.target === merchantEntId
      );
      assert.ok(expenseEdge);
      assert.strictEqual(expenseEdge.transactionCount, 2);
      assert.strictEqual(expenseEdge.totalVolume, 20000); // 12500 + 7500
      assert.strictEqual(expenseEdge.totalVolumePaise, 2000000);
      assert.ok(expenseEdge.strength > 0);
    });

    it('should represent internal Transfer (TRANSFERS_TO) without treating it as income or expense', async () => {
      // Internal transfer: Checking -> Savings
      const txRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 25000,
          type: 'INTERNAL_TRANSFER',
          direction: 'TRANSFER',
          accountId: checkingAccId,
          destinationAccountId: savingsAccId,
          description: 'Monthly Savings Allocation',
          category: 'Internal Transfer',
        });
      assert.strictEqual(txRes.status, 201);

      const netRes = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${userAToken}`);

      const edges = netRes.body.network.edges;
      const transferEdge = edges.find(
        (e: any) => e.source === checkingAccId && e.target === savingsAccId
      );
      assert.ok(transferEdge, 'Transfer edge Checking -> Savings must exist');
      assert.strictEqual(transferEdge.relationshipType, 'TRANSFERS_TO');
      assert.strictEqual(transferEdge.direction, 'INTERNAL');
      assert.strictEqual(transferEdge.totalVolume, 25000);
      assert.strictEqual(transferEdge.metadata.transferVolume, 25000);
      assert.strictEqual(transferEdge.metadata.incomeVolume, 0);
      assert.strictEqual(transferEdge.metadata.expenseVolume, 0);
    });

    it('should represent Refund relationship correctly (RECEIVES_FROM): Merchant -> Checking', async () => {
      const txRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 2500,
          type: 'CREDIT',
          direction: 'REFUND',
          accountId: checkingAccId,
          entityId: merchantEntId,
          description: 'Amazon Item Return Refund',
          category: 'Shopping',
        });
      assert.strictEqual(txRes.status, 201);

      const netRes = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${userAToken}`);

      const edges = netRes.body.network.edges;
      const refundEdge = edges.find(
        (e: any) => e.source === merchantEntId && e.target === checkingAccId
      );
      assert.ok(refundEdge, 'Refund edge Merchant -> Checking must exist');
      assert.strictEqual(refundEdge.relationshipType, 'RECEIVES_FROM');
      assert.strictEqual(refundEdge.direction, 'INCOMING');
      assert.strictEqual(refundEdge.totalVolume, 2500);
    });
  });

  // =========================================================================
  // 3. NETWORK SUMMARY & DETERMINISTIC METRICS
  // =========================================================================
  describe('3. GET /api/network/summary', () => {
    it('should return deterministic metrics without fabrication', async () => {
      const res = await request(app)
        .get('/api/network/summary')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      const s = res.body.summary;
      assert.ok(s.nodeCount >= 4); // 2 accounts + 2 entities
      assert.ok(s.edgeCount >= 3); // income + expense + transfer + refund
      assert.ok(s.accountCount >= 2);
      assert.ok(s.entityCount >= 2);
      assert.ok(s.totalIncomeVolume > 0);
      assert.ok(s.totalExpenseVolume > 0);
      assert.ok(s.totalTransferVolume > 0);
      assert.ok(Array.isArray(s.mostConnectedEntities));
      assert.ok(Array.isArray(s.mostActiveAccounts));
    });
  });

  // =========================================================================
  // 4. ENTITY & ACCOUNT INSPECTORS
  // =========================================================================
  describe('4. Inspectors: /api/network/entity/:id & /api/network/account/:id', () => {
    it('should return complete relationship history and connected accounts for an entity', async () => {
      const entList = await request(app)
        .get('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`);
      const amazon = entList.body.entities.find((e: any) => e.name === 'Amazon India');
      assert.ok(amazon);

      const res = await request(app)
        .get(`/api/network/entity/${amazon._id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.entity.name, 'Amazon India');
      assert.ok(res.body.entity.transactionCount >= 2);
      assert.ok(res.body.entity.totalFlowVolume > 0);
      assert.ok(res.body.entity.connectedAccounts.length >= 1);
      assert.ok(res.body.entity.relationshipHistory.length >= 1);
    });

    it('should return connected entities, inflow, outflow, and net cash flow for an account', async () => {
      const accList = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`);
      const checking = accList.body.accounts.find((a: any) => a.name === 'Primary Salary Checking');
      assert.ok(checking);

      const res = await request(app)
        .get(`/api/network/account/${checking._id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.account.name, 'Primary Salary Checking');
      assert.ok(res.body.account.inflow > 0);
      assert.ok(res.body.account.outflow > 0);
      assert.strictEqual(
        res.body.account.netCashFlow,
        res.body.account.inflow - res.body.account.outflow
      );
      assert.ok(res.body.account.connectedEntities.length >= 1);
    });

    it('should return 404 when querying an unauthorized or non-existent entity', async () => {
      const res = await request(app)
        .get('/api/network/entity/non_existent_entity_id')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });
  });

  // =========================================================================
  // 5. DETERMINISTIC FLOW TRACING & PATH TRAVERSAL
  // =========================================================================
  describe('5. GET /api/network/path (Flow Tracing)', () => {
    it('should trace a multi-hop path: Employer -> Checking -> Amazon', async () => {
      const entList = await request(app)
        .get('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`);
      const employer = entList.body.entities.find((e: any) => e.name === 'Apex Innovations Corp');
      const amazon = entList.body.entities.find((e: any) => e.name === 'Amazon India');

      assert.ok(employer);
      assert.ok(amazon);

      const res = await request(app)
        .get(`/api/network/path?from=${employer._id}&to=${amazon._id}&maxDepth=4`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.exists, true);
      assert.strictEqual(res.body.depth, 2); // Employer -> Checking -> Amazon
      assert.strictEqual(res.body.path.length, 3);
      assert.strictEqual(res.body.edges.length, 2);
    });

    it('should respect maxDepth limit when destination is beyond depth', async () => {
      const entList = await request(app)
        .get('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`);
      const employer = entList.body.entities.find((e: any) => e.name === 'Apex Innovations Corp');
      const amazon = entList.body.entities.find((e: any) => e.name === 'Amazon India');

      // maxDepth = 1 cannot reach 2 hops away
      const res = await request(app)
        .get(`/api/network/path?from=${employer._id}&to=${amazon._id}&maxDepth=1`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.exists, false);
      assert.strictEqual(res.body.path.length, 0);
    });

    it('should protect against cyclic infinite loops deterministically', async () => {
      const accList = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`);
      const checking = accList.body.accounts[0];

      // Query from node to itself
      const res = await request(app)
        .get(`/api/network/path?from=${checking._id}&to=${checking._id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.exists, true);
      assert.strictEqual(res.body.depth, 0);
    });
  });

  // =========================================================================
  // 6. SECURITY & TENANT ISOLATION
  // =========================================================================
  describe('6. Security & Tenant Isolation (User A vs User B)', () => {
    it('should ensure User B sees only empty network and 0 of User A data', async () => {
      const res = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.network.nodes.length, 0);
      assert.strictEqual(res.body.network.edges.length, 0);
      assert.strictEqual(res.body.network.metrics.nodeCount, 0);
      assert.strictEqual(res.body.network.metrics.edgeCount, 0);
    });

    it('should prevent User B from accessing User A entity network inspector', async () => {
      const entListA = await request(app)
        .get('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`);
      const entityA = entListA.body.entities[0];

      const res = await request(app)
        .get(`/api/network/entity/${entityA._id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    it('should prevent User B from accessing User A account network inspector', async () => {
      const accListA = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`);
      const accountA = accListA.body.accounts[0];

      const res = await request(app)
        .get(`/api/network/account/${accountA._id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    it('should prevent User B from traversing User A network graph', async () => {
      const entListA = await request(app)
        .get('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`);
      const entityA = entListA.body.entities[0];
      const accListA = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`);
      const accountA = accListA.body.accounts[0];

      const res = await request(app)
        .get(`/api/network/path?from=${entityA._id}&to=${accountA._id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert.strictEqual(res.status, 200);
      // Nodes do not exist in User B's realm -> exists: false
      assert.strictEqual(res.body.exists, false);
      assert.strictEqual(res.body.path.length, 0);
    });
  });

  // =========================================================================
  // 7. EMPTY STATES & EDGE CASES
  // =========================================================================
  describe('7. Empty States & Edge Cases', () => {
    let emptyUserToken: string;

    before(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Empty State User',
          email: `empty_user_${Date.now()}@fintwin.ai`,
          password: 'Password123!',
        });
      emptyUserToken = res.body.token;
    });

    it('should handle completely empty account and return 0 nodes and 0 edges without crashing', async () => {
      const res = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${emptyUserToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.network.nodes.length, 0);
      assert.strictEqual(res.body.network.edges.length, 0);
    });

    it('should handle account with 0 transactions as isolated node with 0 edges', async () => {
      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .send({
          name: 'Zero Tx Account',
          type: 'CHECKING',
          institution: 'Isolated Bank',
          currentBalance: 1000,
        });

      const res = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${emptyUserToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.network.nodes.length, 1);
      assert.strictEqual(res.body.network.edges.length, 0);
      assert.strictEqual(res.body.network.nodes[0].label, 'Zero Tx Account');
    });

    it('should handle transactions without counterparty entity gracefully', async () => {
      const accList = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${emptyUserToken}`);
      const accId = accList.body.accounts[0]._id;

      // Create transaction with no entityId
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .send({
          amount: 500,
          type: 'DEBIT',
          direction: 'EXPENSE',
          accountId: accId,
          description: 'Cash Withdrawal at ATM',
          category: 'Cash',
        });

      const res = await request(app)
        .get('/api/network')
        .set('Authorization', `Bearer ${emptyUserToken}`);

      assert.strictEqual(res.status, 200);
      // Node exists, but no entity edge
      assert.strictEqual(res.body.network.nodes.length, 1);
      assert.strictEqual(res.body.network.edges.length, 0);
      assert.strictEqual(res.body.network.nodes[0].outflowVolume, 500);
    });
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
});
