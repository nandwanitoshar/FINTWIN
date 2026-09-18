import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';

describe('FinTwin AI — PHASE 8 Major Expanded Features Suite', () => {
  let authToken: string;
  let userId: string;
  const userEmail = `phase8_test_${Date.now()}@fintwin.ai`;
  const userPassword = 'TestPassword!2026';

  before(async () => {
    // Register test user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: userEmail,
        password: userPassword,
        name: 'Phase 8 Expanded User',
      });

    assert.strictEqual(regRes.status, 201);
    assert.ok(regRes.body.token);
    authToken = regRes.body.token;
    userId = regRes.body.user.id;

    // Create a liquid checking account
    const accRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Primary Salary Checking',
        type: 'CHECKING',
        institution: 'HDFC Bank',
        currency: 'INR',
        balance: 150000,
        isLiquid: true,
      });
    assert.strictEqual(accRes.status, 201);
    const accountId = accRes.body.account._id;

    // Ingest some transactions
    const csvData = `Date,Description,Amount,Type,Category
2026-08-01,Monthly Salary,100000,CREDIT,Income
2026-08-05,Apartment Rent,30000,DEBIT,Housing
2026-08-10,Netflix Subscription,649,DEBIT,Entertainment
2026-09-01,Monthly Salary,100000,CREDIT,Income
2026-09-05,Apartment Rent,30000,DEBIT,Housing
2026-09-10,Netflix Subscription,649,DEBIT,Entertainment
2026-09-12,Grocery Supermarket,4200,DEBIT,Groceries
`;

    const ingestRes = await request(app)
      .post('/api/ingest/csv')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ csv: csvData, accountId });

    assert.strictEqual(ingestRes.status, 200);

    // Create a Goal
    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Emergency Buffer 6M',
        category: 'EMERGENCY_FUND',
        targetAmount: 200000,
        currentAmount: 80000,
        targetDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
      });

    // Create a Loan
    await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Car Finance',
        lender: 'State Bank',
        principal: 500000,
        outstandingAmount: 420000,
        interestRateApr: 9.5,
        tenureMonths: 48,
        emiAmount: 12560,
        startDate: '2026-01-15',
      });
  });

  test('1. Recurring Expenses API (/api/recurring)', async () => {
    // List & Auto-detect
    const res = await request(app)
      .get('/api/recurring')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.recurringExpenses);
    assert.ok(res.body.data.totalEstimatedMonthlyImpact >= 0);

    // Create manual recurring item
    const createRes = await request(app)
      .post('/api/recurring')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Gym Membership',
        averageAmount: 2500,
        cadence: 'MONTHLY',
        category: 'Fitness',
      });

    assert.strictEqual(createRes.status, 201);
    const recId = createRes.body.recurringExpense._id;

    // Update recurring item
    const updateRes = await request(app)
      .patch(`/api/recurring/${recId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ notes: 'Updated notes' });

    assert.strictEqual(updateRes.status, 200);

    // Delete recurring item
    const delRes = await request(app)
      .delete(`/api/recurring/${recId}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(delRes.status, 200);
  });

  test('2. Financial Calendar API (/api/calendar)', async () => {
    // Fetch aggregated events (should contain loan EMI, recurring, goals)
    const res = await request(app)
      .get('/api/calendar')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.events));
    assert.ok(res.body.data.eventCount >= 0);

    // Create a custom scheduled event
    const createRes = await request(app)
      .post('/api/calendar/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Quarterly Advance Tax Payment',
        amount: 15000,
        type: 'EXPENSE',
        date: '2026-09-25',
        category: 'Tax',
      });

    assert.strictEqual(createRes.status, 201);
    const evId = createRes.body.event._id;

    // Delete custom event
    const delRes = await request(app)
      .delete(`/api/calendar/events/${evId}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(delRes.status, 200);
  });

  test('3. Ask FinTwin Grounded NL Q&A (/api/ask)', async () => {
    // Query 1: Spending this month
    const q1Res = await request(app)
      .post('/api/ask')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ query: 'How much did I spend this month?' });

    assert.strictEqual(q1Res.status, 200);
    assert.strictEqual(q1Res.body.success, true);
    assert.ok(q1Res.body.data.answer.length > 0);
    assert.ok(Array.isArray(q1Res.body.data.evidence));

    // Query 2: What-If simulation query
    const q2Res = await request(app)
      .post('/api/ask')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ query: 'What happens if I buy a ₹70,000 laptop?' });

    assert.strictEqual(q2Res.status, 200);
    assert.strictEqual(q2Res.body.data.intent, 'WHAT_IF_PURCHASE_SIMULATION');
    assert.ok(q2Res.body.data.answer.includes('laptop'));

    // Query 3: Largest expenses
    const q3Res = await request(app)
      .post('/api/ask')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ query: 'What are my biggest expenses?' });

    assert.strictEqual(q3Res.status, 200);
    assert.strictEqual(q3Res.body.data.intent, 'BIGGEST_EXPENSES');

    // Query 4: Goals status
    const q4Res = await request(app)
      .post('/api/ask')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ query: 'How are my goals doing?' });

    assert.strictEqual(q4Res.status, 200);
    assert.strictEqual(q4Res.body.data.intent, 'GOAL_STATUS');
  });

  test('4. Global Search API (/api/search)', async () => {
    const res = await request(app)
      .get('/api/search?q=Salary')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.totalMatches > 0);
    assert.ok(res.body.data.results.length > 0);
  });

  test('5. Data Quality Center API (/api/data-quality)', async () => {
    const res = await request(app)
      .get('/api/data-quality')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.score >= 0 && res.body.data.score <= 100);
    assert.ok(res.body.data.grade);
    assert.ok(Array.isArray(res.body.data.hygieneIssues));
  });

  test('6. Data-Driven Notifications API (/api/notifications)', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.notifications));

    // Mark all as read
    const readRes = await request(app)
      .post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(readRes.status, 200);
  });
});
