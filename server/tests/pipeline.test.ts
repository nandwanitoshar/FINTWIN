import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { UserRepository } from '../src/models/User.js';
import { AccountRepository } from '../src/models/Account.js';
import { EntityRepository } from '../src/models/Entity.js';
import { TransactionRepository } from '../src/models/Transaction.js';

describe('FinTwin AI — Phase 2: Data Models, Ingestion & Normalization Tests', () => {
  let userTokenA: string;
  let userTokenB: string;

  beforeEach(async () => {
    await UserRepository.clearInMemory();
    await AccountRepository.clearInMemory();
    await EntityRepository.clearInMemory();
    await TransactionRepository.clearInMemory();

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User A', email: 'userA@fintwin.ai', password: 'password123' });
    userTokenA = resA.body.token;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User B', email: 'userB@fintwin.ai', password: 'password123' });
    userTokenB = resB.body.token;
  });

  describe('Accounts API & Tenant Isolation', () => {
    it('should create an account and list accounts strictly for the authenticated user', async () => {
      // User A creates checking account
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          name: 'HDFC Salary Account',
          type: 'CHECKING',
          institution: 'HDFC Bank',
          currentBalance: 50000,
        });

      assert.equal(createRes.status, 201);
      assert.equal(createRes.body.success, true);
      assert.equal(createRes.body.account.name, 'HDFC Salary Account');
      assert.equal(createRes.body.account.currentBalance, 50000);

      // User A lists accounts
      const listA = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userTokenA}`);
      assert.equal(listA.status, 200);
      assert.equal(listA.body.accounts.length, 1);

      // User B lists accounts -> must be empty (tenant isolation)
      const listB = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userTokenB}`);
      assert.equal(listB.status, 200);
      assert.equal(listB.body.accounts.length, 0);
    });

    it('should update and delete account', async () => {
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          name: 'Old Account',
          type: 'SAVINGS',
          institution: 'State Bank',
          currentBalance: 10000,
        });

      const accId = createRes.body.account._id;

      // Update
      const updateRes = await request(app)
        .put(`/api/accounts/${accId}`)
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({ currentBalance: 25000 });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.account.currentBalance, 25000);

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/accounts/${accId}`)
        .set('Authorization', `Bearer ${userTokenA}`);
      assert.equal(deleteRes.status, 200);

      // Verify list is now empty
      const listRes = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userTokenA}`);
      assert.equal(listRes.body.accounts.length, 0);
    });
  });

  describe('Entities API', () => {
    it('should create and list counterparty entities', async () => {
      const res = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          name: 'Tech Innovations Ltd',
          type: 'EMPLOYER',
          category: 'Income',
          cadenceScore: 1.0,
          riskRating: 'LOW',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.entity.name, 'Tech Innovations Ltd');
      assert.equal(res.body.entity.type, 'EMPLOYER');

      const listRes = await request(app)
        .get('/api/entities')
        .set('Authorization', `Bearer ${userTokenA}`);
      assert.equal(listRes.status, 200);
      assert.equal(listRes.body.entities.length, 1);
    });
  });

  describe('Transactions & Balance Synchronization', () => {
    it('should record credit and debit transactions and update account balance accordingly', async () => {
      // 1. Create account with initial 10,000
      const accRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          name: 'Main Checking',
          type: 'CHECKING',
          institution: 'Bank',
          currentBalance: 10000,
        });
      const accountId = accRes.body.account._id;

      // 2. Add Credit transaction (+5,000)
      const creditRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          amount: 5000,
          sourceAccountId: accountId,
          category: 'Income',
          type: 'CREDIT',
          description: 'Bonus Payout',
        });
      assert.equal(creditRes.status, 201);

      // Verify account balance increased to 15,000
      const accCheck1 = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userTokenA}`);
      assert.equal(accCheck1.body.accounts[0].currentBalance, 15000);

      // 3. Add Debit transaction (-3,000)
      const debitRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          amount: 3000,
          sourceAccountId: accountId,
          category: 'Shopping',
          type: 'DEBIT',
          description: 'Electronics Store',
        });
      assert.equal(debitRes.status, 201);

      // Verify account balance decreased to 12,000
      const accCheck2 = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userTokenA}`);
      assert.equal(accCheck2.body.accounts[0].currentBalance, 12000);
    });
  });

  describe('01 INGEST & 02 NORMALIZE Pipeline', () => {
    it('should ingest and normalize JSON statements, auto-discover entities, and deduplicate', async () => {
      const payload = [
        { date: '2026-09-01', description: 'Acme Corp Monthly Salary', credit: '85,000' },
        { date: '2026-09-03', description: 'Landlord Apartment Rent', debit: '22,000' },
        { date: '2026-09-05', description: 'Swiggy Food Delivery', amount: '450' },
        // Exact duplicate
        { date: '2026-09-05', description: 'Swiggy Food Delivery', amount: '450' },
      ];

      const res = await request(app)
        .post('/api/pipeline/ingest')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({ format: 'json', data: payload });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.normalizedCount, 3, 'Duplicate should be filtered');
      assert.equal(res.body.duplicatesSkipped, 1);
      assert.ok(res.body.entitiesDiscovered >= 2, 'Should auto-discover entities');
    });

    it('should parse and normalize CSV bank statement text', async () => {
      const csvData = `date,narration,withdrawal,deposit
2026-09-01,Tech Solutions Salary,,90000
2026-09-04,Metro Water Utilities,1500,
2026-09-08,Amazon India Shopping,3400,`;

      const res = await request(app)
        .post('/api/pipeline/ingest')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({ format: 'csv', data: csvData });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.normalizedCount, 3);
    });
  });
});
