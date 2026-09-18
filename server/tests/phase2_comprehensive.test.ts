import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { UserRepository } from '../src/models/User.js';
import { AccountRepository } from '../src/models/Account.js';
import { EntityRepository } from '../src/models/Entity.js';
import { TransactionRepository } from '../src/models/Transaction.js';
import {
  normalizeCurrency,
  normalizeDirection,
  normalizeAmount,
  normalizeDate,
  PipelineService,
} from '../src/services/pipelineService.js';
import {
  toPaise,
  fromPaise,
  calculateTotalBalance,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
  calculateTransactionCount,
} from '../src/utils/calculations.js';

describe('FinTwin AI — PHASE 2 Comprehensive Test Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeEach(async () => {
    await UserRepository.clearInMemory();
    await AccountRepository.clearInMemory();
    await EntityRepository.clearInMemory();
    await TransactionRepository.clearInMemory();

    // Register User A
    const regA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'userA@fintwin.ai',
      password: 'Password123!',
      currency: 'INR',
    });
    userAToken = regA.body.token;
    userAId = regA.body.user._id;

    // Register User B
    const regB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userB@fintwin.ai',
      password: 'Password123!',
      currency: 'INR',
    });
    userBToken = regB.body.token;
    userBId = regB.body.user._id;
  });

  // =========================================================================
  // 1. UNIT TESTS: Normalization, Calculations, and Deduplication
  // =========================================================================
  describe('1. Unit Tests — Normalization & Safe Arithmetic', () => {
    it('should normalize currency symbols and abbreviations', () => {
      assert.equal(normalizeCurrency('₹').currency, 'INR');
      assert.equal(normalizeCurrency('Rs.').currency, 'INR');
      assert.equal(normalizeCurrency('INR').currency, 'INR');
      assert.equal(normalizeCurrency('$').currency, 'USD');
      assert.equal(normalizeCurrency('USD').currency, 'USD');
      assert.equal(normalizeCurrency('€').currency, 'EUR');
      assert.equal(normalizeCurrency('EUR').currency, 'EUR');
      assert.equal(normalizeCurrency('£').currency, 'GBP');
      assert.equal(normalizeCurrency('GBP').currency, 'GBP');
      assert.equal(normalizeCurrency('CAD').currency, 'CAD');
      // Unknown currency rejection per Phase 3 requirement
      const fallback = normalizeCurrency('XYZ');
      assert.equal(fallback.isValid, false);
      assert.ok(fallback.warning || fallback.error);
    });

    it('should normalize transaction directions from various banking conventions', () => {
      assert.equal(normalizeDirection('DEBIT'), 'EXPENSE');
      assert.equal(normalizeDirection('DR'), 'EXPENSE');
      assert.equal(normalizeDirection('WITHDRAWAL'), 'EXPENSE');
      assert.equal(normalizeDirection('CREDIT'), 'INCOME');
      assert.equal(normalizeDirection('CR'), 'INCOME');
      assert.equal(normalizeDirection('DEPOSIT'), 'INCOME');
      assert.equal(normalizeDirection('TRANSFER'), 'TRANSFER');
      assert.equal(normalizeDirection('REFUND'), 'REFUND');
      // Inferred from debit/credit numeric presence
      assert.equal(normalizeDirection(undefined, 500, undefined), 'EXPENSE');
      assert.equal(normalizeDirection(undefined, undefined, 1000), 'INCOME');
    });

    it('should normalize monetary amounts safely without floating-point error', () => {
      // Formatted strings with commas and symbols
      const res1 = normalizeAmount('₹10,500.75');
      assert.equal(res1.isValid, true);
      assert.equal(res1.amount, 10500.75);
      assert.equal(res1.amountPaise, 1050075);

      // Separate Debit column
      const resDebit = normalizeAmount(undefined, '1,250.50', undefined);
      assert.equal(resDebit.isValid, true);
      assert.equal(resDebit.amount, 1250.5);
      assert.equal(resDebit.amountPaise, 125050);
      assert.equal(resDebit.direction, 'EXPENSE');

      // Separate Credit column
      const resCredit = normalizeAmount(undefined, undefined, '85,000');
      assert.equal(resCredit.isValid, true);
      assert.equal(resCredit.amount, 85000);
      assert.equal(resCredit.amountPaise, 8500000);
      assert.equal(resCredit.direction, 'INCOME');

      // Invalid zero or empty amounts
      assert.equal(normalizeAmount('0').isValid, false);
      assert.equal(normalizeAmount('').isValid, false);
    });

    it('should normalize dates into ISO-compatible representations', () => {
      const d1 = normalizeDate('2026-09-10');
      assert.equal(d1.isValid, true);
      assert.ok(d1.iso.startsWith('2026-09-10'));

      const d2 = normalizeDate('10/09/2026');
      assert.equal(d2.isValid, true);

      const dInvalid = normalizeDate('not-a-date');
      assert.equal(dInvalid.isValid, false);
    });

    it('should perform safe integer paise calculations avoiding floating-point inaccuracies', () => {
      assert.equal(toPaise(10500.75), 1050075);
      assert.equal(fromPaise(1050075), 10500.75);

      // Test classic floating point trap 0.1 + 0.2 = 0.30000000000000004
      const p1 = toPaise(0.1);
      const p2 = toPaise(0.2);
      assert.equal(p1 + p2, 30);
      assert.equal(fromPaise(p1 + p2), 0.3);

      const accounts = [
        { currentBalance: 45000 },
        { currentBalance: 120000 },
        { currentBalance: 18000.5 },
      ];
      assert.equal(calculateTotalBalance(accounts), 183000.5);

      const txs = [
        { direction: 'INCOME', amount: 85000 },
        { direction: 'EXPENSE', amount: 22000.25 },
        { direction: 'EXPENSE', amount: 6500.75 },
      ];
      assert.equal(calculateTotalIncome(txs), 85000);
      assert.equal(calculateTotalExpenses(txs), 28501);
      assert.equal(calculateNetCashFlow(txs), 56499);
      assert.equal(calculateTransactionCount(txs), 3);
    });
  });

  // =========================================================================
  // 2. API TESTS: Accounts CRUD, Validation & Isolation
  // =========================================================================
  describe('2. Accounts API (CRUD & Tenant Isolation)', () => {
    it('should create an account with currency and balance', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'HDFC Salary Account',
          type: 'CHECKING',
          institution: 'HDFC Bank',
          currency: 'INR',
          currentBalance: 45000,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.account.name, 'HDFC Salary Account');
      assert.equal(res.body.account.currency, 'INR');
      assert.equal(res.body.account.currentBalance, 45000);
      assert.equal(res.body.account.userId, userAId);
    });

    it('should reject account creation with missing name or institution', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'SAVINGS',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('should list only the authenticated user accounts', async () => {
      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'User A Account', type: 'SAVINGS', institution: 'SBI', currentBalance: 1000 });

      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'User B Account', type: 'CHECKING', institution: 'ICICI', currentBalance: 5000 });

      const resA = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`);

      assert.equal(resA.status, 200);
      assert.equal(resA.body.accounts.length, 1);
      assert.equal(resA.body.accounts[0].name, 'User A Account');
    });

    it('should retrieve, update (PATCH), and delete an account', async () => {
      const created = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Axis Card', type: 'CREDIT_CARD', institution: 'Axis Bank', currentBalance: 15000 });

      const accountId = created.body.account._id;

      // GET /:id
      const getRes = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(getRes.status, 200);
      assert.equal(getRes.body.account.name, 'Axis Card');

      // PATCH /:id
      const patchRes = await request(app)
        .patch(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Axis Neo Platinum Card', currentBalance: 12000 });
      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.account.name, 'Axis Neo Platinum Card');
      assert.equal(patchRes.body.account.currentBalance, 12000);

      // DELETE /:id
      const delRes = await request(app)
        .delete(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(delRes.status, 200);

      // Verify deletion
      const checkRes = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(checkRes.status, 404);
    });
  });

  // =========================================================================
  // 3. API TESTS: Entities CRUD
  // =========================================================================
  describe('3. Entities API (Counterparty Directory)', () => {
    it('should create, retrieve, update, and delete an entity', async () => {
      const createRes = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Tech Innovations Ltd',
          type: 'EMPLOYER',
          category: 'Payroll',
          riskRating: 'LOW',
        });

      assert.equal(createRes.status, 201);
      const entityId = createRes.body.entity._id;

      // GET /:id
      const getRes = await request(app)
        .get(`/api/entities/${entityId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(getRes.status, 200);
      assert.equal(getRes.body.entity.name, 'Tech Innovations Ltd');

      // PATCH /:id
      const patchRes = await request(app)
        .patch(`/api/entities/${entityId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Tech Innovations Global', riskRating: 'MEDIUM' });
      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.entity.name, 'Tech Innovations Global');

      // DELETE /:id
      const delRes = await request(app)
        .delete(`/api/entities/${entityId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(delRes.status, 200);
    });
  });

  // =========================================================================
  // 4. API TESTS: Transactions CRUD, Pagination & Filtering
  // =========================================================================
  describe('4. Transactions API (CRUD, Filtering & Pagination)', () => {
    let accountId: string;

    beforeEach(async () => {
      const acc = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Salary Account', type: 'CHECKING', institution: 'HDFC', currentBalance: 50000 });
      accountId = acc.body.account._id;
    });

    it('should create manual transaction and adjust account balance safely', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          accountId,
          amount: 5000,
          direction: 'EXPENSE',
          category: 'Food & Dining',
          description: 'Team Lunch',
          date: '2026-09-10',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.transaction.amount, 5000);
      assert.equal(res.body.transaction.direction, 'EXPENSE');

      // Account balance should have reduced from 50000 to 45000
      const accCheck = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(accCheck.body.account.currentBalance, 45000);
    });

    it('should support pagination and filtering by category, direction, and search', async () => {
      // Seed transactions
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ accountId, amount: 85000, direction: 'INCOME', category: 'Income', description: 'Monthly Salary' });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ accountId, amount: 22000, direction: 'EXPENSE', category: 'Housing', description: 'Apartment Rent' });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ accountId, amount: 3500, direction: 'EXPENSE', category: 'Food & Dining', description: 'Swiggy Dinner' });

      // Filter by category=Housing
      const catRes = await request(app)
        .get('/api/transactions?category=Housing')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(catRes.status, 200);
      assert.equal(catRes.body.transactions.length, 1);
      assert.equal(catRes.body.transactions[0].description, 'Apartment Rent');

      // Filter by direction=INCOME
      const incRes = await request(app)
        .get('/api/transactions?direction=INCOME')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(incRes.status, 200);
      assert.equal(incRes.body.transactions.length, 1);
      assert.equal(incRes.body.transactions[0].amount, 85000);

      // Search by description
      const searchRes = await request(app)
        .get('/api/transactions?search=Swiggy')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(searchRes.status, 200);
      assert.equal(searchRes.body.transactions.length, 1);
      assert.equal(searchRes.body.transactions[0].description, 'Swiggy Dinner');

      // Pagination
      const pageRes = await request(app)
        .get('/api/transactions?limit=2&page=1')
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(pageRes.status, 200);
      assert.equal(pageRes.body.transactions.length, 2);
      assert.equal(pageRes.body.total, 3);
      assert.equal(pageRes.body.totalPages, 2);
    });

    it('should reverse account balance adjustments on transaction deletion', async () => {
      const tx = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ accountId, amount: 10000, direction: 'EXPENSE', category: 'Shopping', description: 'Monitor' });

      const txId = tx.body.transaction._id;

      // Balance before deletion
      const beforeDel = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(beforeDel.body.account.currentBalance, 40000);

      // Delete transaction
      await request(app)
        .delete(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Balance after deletion (reverted to 50000)
      const afterDel = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(afterDel.body.account.currentBalance, 50000);
    });
  });

  // =========================================================================
  // 5. INGESTION TESTS: CSV & JSON Statements, Deduplication, and Summary
  // =========================================================================
  describe('5. Ingestion Engine (/api/ingest/csv & /api/ingest/json)', () => {
    it('should ingest and normalize CSV bank statement with summary report', async () => {
      const csvData = `Date,Description,Amount,Type\n2026-09-01,Tech Innovations Payroll,85000,CREDIT\n2026-09-03,Apex Real Estate Rent,22000,DEBIT\n2026-09-05,Supermarket Groceries,3500.75,DEBIT`;

      const res = await request(app)
        .post('/api/ingest/csv')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ csv: csvData });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.summary.total, 3);
      assert.equal(res.body.summary.imported, 3);
      assert.equal(res.body.summary.duplicates, 0);
      assert.equal(res.body.summary.rejected, 0);
    });

    it('should skip deterministic duplicates upon repeated import', async () => {
      const csvData = `Date,Description,Amount,Type\n2026-09-10,Amazon Order #101,4500,DEBIT\n2026-09-11,Zomato Food,650,DEBIT`;

      // First Import
      const res1 = await request(app)
        .post('/api/ingest/csv')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ csv: csvData });
      assert.equal(res1.body.summary.imported, 2);

      // Second Import of identical data
      const res2 = await request(app)
        .post('/api/ingest/csv')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ csv: csvData });
      assert.equal(res2.body.summary.total, 2);
      assert.equal(res2.body.summary.imported, 0);
      assert.equal(res2.body.summary.duplicates, 2);
      assert.equal(res2.body.summary.rejected, 0);
    });

    it('should ingest valid structured JSON and report row-level errors for invalid items', async () => {
      const jsonData = [
        { date: '2026-09-01', description: 'Consulting Fee', amount: 15000, type: 'CREDIT' },
        { date: '2026-09-02', description: '', amount: 2000, type: 'DEBIT' }, // Missing description
        { date: '2026-09-03', description: 'Invalid Amount Item', amount: -500, type: 'DEBIT' }, // Negative amount
      ];

      const res = await request(app)
        .post('/api/ingest/json')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ data: jsonData });

      assert.equal(res.status, 200);
      assert.equal(res.body.summary.total, 3);
      assert.equal(res.body.summary.imported, 1);
      assert.equal(res.body.summary.rejected, 2);
      assert.equal(res.body.errors.length, 2);
      assert.ok(res.body.errors[0].reason.includes('description') || res.body.errors[0].reason.includes('amount'));
    });

    it('should reject malformed or empty CSV and JSON inputs gracefully', async () => {
      const emptyCsv = await request(app)
        .post('/api/ingest/csv')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ csv: '' });
      assert.equal(emptyCsv.status, 400);

      const emptyJson = await request(app)
        .post('/api/ingest/json')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ data: [] });
      assert.equal(emptyJson.status, 400);
    });
  });

  // =========================================================================
  // 6. SECURITY TESTS: Cross-User Resource Isolation
  // =========================================================================
  describe('6. Security & Tenant Isolation (User A vs User B)', () => {
    let userAAccountId: string;
    let userAEntityId: string;
    let userATransactionId: string;

    beforeEach(async () => {
      // User A creates resources
      const acc = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Private User A Vault', type: 'SAVINGS', institution: 'Secret Bank', currentBalance: 999999 });
      userAAccountId = acc.body.account._id;

      const ent = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'User A Secret Employer', type: 'EMPLOYER' });
      userAEntityId = ent.body.entity._id;

      const tx = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          accountId: userAAccountId,
          amount: 50000,
          direction: 'INCOME',
          description: 'Confidential Payout',
        });
      userATransactionId = tx.body.transaction._id;
    });

    it('should prevent User B from reading User A account, entity, or transaction (GET)', async () => {
      const accGet = await request(app)
        .get(`/api/accounts/${userAAccountId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      assert.equal(accGet.status, 404);

      const entGet = await request(app)
        .get(`/api/entities/${userAEntityId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      assert.equal(entGet.status, 404);

      const txGet = await request(app)
        .get(`/api/transactions/${userATransactionId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      assert.equal(txGet.status, 404);
    });

    it('should prevent User B from updating User A account, entity, or transaction (PATCH)', async () => {
      const accPatch = await request(app)
        .patch(`/api/accounts/${userAAccountId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked Account', currentBalance: 0 });
      assert.equal(accPatch.status, 404);

      const entPatch = await request(app)
        .patch(`/api/entities/${userAEntityId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked Entity' });
      assert.equal(entPatch.status, 404);

      const txPatch = await request(app)
        .patch(`/api/transactions/${userATransactionId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ amount: 1 });
      assert.equal(txPatch.status, 404);
    });

    it('should prevent User B from deleting User A account, entity, or transaction (DELETE)', async () => {
      const accDel = await request(app)
        .delete(`/api/accounts/${userAAccountId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      assert.equal(accDel.status, 404);

      const entDel = await request(app)
        .delete(`/api/entities/${userAEntityId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      assert.equal(entDel.status, 404);

      const txDel = await request(app)
        .delete(`/api/transactions/${userATransactionId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      assert.equal(txDel.status, 404);

      // Verify User A's data remains untouched
      const verifyAcc = await request(app)
        .get(`/api/accounts/${userAAccountId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      assert.equal(verifyAcc.status, 200);
      assert.equal(verifyAcc.body.account.name, 'Private User A Vault');
    });
  });
});
