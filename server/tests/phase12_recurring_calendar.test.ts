import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { RecurringService } from '../src/services/recurringService.js';
import { CalendarService } from '../src/services/calendarService.js';
import { SimulationEngine } from '../src/services/simulationEngine.js';
import { GoalImpactService } from '../src/services/goalImpactService.js';
import { GoalRepository } from '../src/models/Goal.js';
import { TransactionRepository } from '../src/models/Transaction.js';

describe('FinTwin AI — PHASE D Full Verification Suite (Recurring Expenses + Calendar)', () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;
  let userAAccountId: string;

  const emailA = `phaseD_userA_${Date.now()}@fintwin.ai`;
  const emailB = `phaseD_userB_${Date.now()}@fintwin.ai`;
  const password = 'PhaseDPassword!2026';

  before(async () => {
    // 1. Register User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({ email: emailA, password, name: 'Phase D User Alpha' });
    assert.strictEqual(regA.status, 201);
    userAToken = regA.body.token;
    userAId = regA.body.user.id || regA.body.user._id;

    // Create Checking Account for User A
    const accA = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Primary Salary Checking',
        type: 'CHECKING',
        institution: 'HDFC Bank',
        currency: 'INR',
        balance: 200000,
        isLiquid: true,
      });
    assert.strictEqual(accA.status, 201);
    userAAccountId = accA.body.account._id;

    // 2. Register User B (for tenant isolation tests)
    const regB = await request(app)
      .post('/api/auth/register')
      .send({ email: emailB, password, name: 'Phase D User Beta' });
    assert.strictEqual(regB.status, 201);
    userBToken = regB.body.token;
    userBId = regB.body.user.id || regB.body.user._id;
  });

  // 1 & 25: Empty dataset test
  test('1 & 25. Empty dataset: returns hasSufficientData: false and explanatory limitation message without fake subscriptions', async () => {
    const res = await request(app)
      .get('/api/analysis/recurring-expenses')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.recurringExpenses.length, 0);
    assert.strictEqual(res.body.hasSufficientData, false);
    assert.ok(
      res.body.limitations.some((l: string) =>
        l.toLowerCase().includes('not enough transaction history') || l.toLowerCase().includes('insufficient')
      )
    );
  });

  // 2: Minimum observation threshold (rejection of single transaction)
  test('2. Minimum observation threshold: a single debit does not qualify as recurring', async () => {
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 1500,
      description: 'One Time Merchant Single Purchase',
      date: new Date('2026-05-01'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Shopping',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const matched = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('one time merchant')
    );
    assert.strictEqual(matched, undefined, 'Single occurrence must never be labeled recurring');
  });

  // 3: Monthly pattern detection (26–34 days)
  test('3. Monthly pattern detection: detects periodic monthly subscriptions within 26–34 days', async () => {
    // Ingest 3 monthly debits for "Cloud Hosting Service" (approx 30 days apart)
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 2499,
      description: 'Cloud Hosting Service Monthly Bill',
      date: new Date('2026-06-01'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Utilities',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 2499,
      description: 'Cloud Hosting Service Monthly Bill',
      date: new Date('2026-07-01'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Utilities',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 2499,
      description: 'Cloud Hosting Service Monthly Bill',
      date: new Date('2026-08-01'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Utilities',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const host = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('cloud hosting')
    );
    assert.ok(host, 'Cloud Hosting Service must be detected as recurring');
    assert.strictEqual(host?.cadence, 'MONTHLY');
    assert.strictEqual(host?.estimatedMonthlyImpact, 2499);
    assert.strictEqual(host?.totalOccurrences, 3);
  });

  // 4: Weekly pattern detection (6–8 days)
  test('4. Weekly pattern detection: detects weekly periodic outflows (6–8 days apart)', async () => {
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 600,
      description: 'Weekly Swimming Pool Pass',
      date: new Date('2026-08-01'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Fitness',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 600,
      description: 'Weekly Swimming Pool Pass',
      date: new Date('2026-08-08'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Fitness',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 600,
      description: 'Weekly Swimming Pool Pass',
      date: new Date('2026-08-15'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Fitness',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const swim = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('weekly swimming')
    );
    assert.ok(swim, 'Weekly swimming must be detected');
    assert.strictEqual(swim?.cadence, 'WEEKLY');
    // Normalized weekly impact: 600 * 52 / 12 = 2600
    assert.strictEqual(swim?.estimatedMonthlyImpact, 2600);
  });

  // 5: Quarterly pattern detection (80–100 days)
  test('5. Quarterly pattern detection: detects quarterly outflows (approx 90 days apart)', async () => {
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 15000,
      description: 'Quarterly Commercial Society Maintenance',
      date: new Date('2026-01-05'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Housing',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 15000,
      description: 'Quarterly Commercial Society Maintenance',
      date: new Date('2026-04-05'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Housing',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const maint = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('quarterly commercial society')
    );
    assert.ok(maint, 'Quarterly maintenance must be detected');
    assert.strictEqual(maint?.cadence, 'QUARTERLY');
    // Normalized quarterly impact: 15000 / 3 = 5000
    assert.strictEqual(maint?.estimatedMonthlyImpact, 5000);
  });

  // 6: Irregular pattern rejection (erratic intervals)
  test('6. Irregular pattern rejection: skips debits with erratic, non-cadenced intervals', async () => {
    // Debits at 3 days, then 41 days, then 19 days apart
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 1200,
      description: 'Erratic Fuel Fill Up Station',
      date: new Date('2026-03-01'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Transport',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 1200,
      description: 'Erratic Fuel Fill Up Station',
      date: new Date('2026-03-04'), // 3 days
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Transport',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 1200,
      description: 'Erratic Fuel Fill Up Station',
      date: new Date('2026-04-15'), // 42 days
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Transport',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const erratic = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('erratic fuel')
    );
    assert.strictEqual(erratic, undefined, 'Erratic transactions should not be matched to a cadence');
  });

  // 7: Amount tolerance rule (CV <= 0.25 accepted, CV > 0.25 rejected)
  test('7. Amount tolerance: accepts variations within 25% CV and rejects wildly divergent amounts', async () => {
    // Utility with reasonable variation (e.g. ₹999, ₹1049, ₹999 - CV ~ 0.027 < 0.25)
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 999,
      description: 'Variable Broadband Fiber Plan',
      date: new Date('2026-06-10'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Utilities',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 1049,
      description: 'Variable Broadband Fiber Plan',
      date: new Date('2026-07-10'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Utilities',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 999,
      description: 'Variable Broadband Fiber Plan',
      date: new Date('2026-08-10'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Utilities',
    });

    // Another merchant with wildly varying amounts (e.g. ₹500, ₹9000, ₹2000 - CV > 0.8)
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 500,
      description: 'Random Department Store Outflow',
      date: new Date('2026-06-15'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Shopping',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 9000,
      description: 'Random Department Store Outflow',
      date: new Date('2026-07-15'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Shopping',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 2000,
      description: 'Random Department Store Outflow',
      date: new Date('2026-08-15'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Shopping',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const broadband = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('variable broadband')
    );
    const randomDept = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('random department store')
    );

    assert.ok(broadband, 'Broadband with small variation must be accepted');
    assert.strictEqual(broadband?.averageAmount, 1016); // Round of (999 + 1049 + 999)/3
    assert.strictEqual(broadband?.lastAmount, 999);
    assert.strictEqual(randomDept, undefined, 'Wildly variable amounts must be rejected');
  });

  // 8: Merchant matching & normalization
  test('8. Merchant matching: groups transactions with minor whitespace or casing differences', async () => {
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 499,
      description: '  Music Streaming Premium  ',
      date: new Date('2026-06-05'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Entertainment',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 499,
      description: 'music streaming premium',
      date: new Date('2026-07-05'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Entertainment',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const music = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('music streaming premium')
    );
    assert.ok(music, 'Normalized descriptions should group into a single recurring item');
    assert.strictEqual(music?.totalOccurrences, 2);
  });

  // 9: Next occurrence calculation & estimation labeling
  test('9. Next occurrence: calculates estimated next occurrence and never labels as guaranteed', async () => {
    const summary = await RecurringService.detectAndSync(userAId);
    const host = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('cloud hosting')
    );
    assert.ok(host);
    assert.ok(host?.nextExpectedDate, 'Next expected date must be populated');
    assert.strictEqual(host?.nextOccurrenceReliable, true);
    assert.ok(
      host?.nextOccurrenceMessage?.includes('Estimated next occurrence'),
      'Must be labeled as Estimated next occurrence, never guaranteed'
    );
    assert.ok(!host?.nextOccurrenceMessage?.includes('Guaranteed'));
  });

  // 10: Insufficient history limitations flag
  test('10. Insufficient history handling: limitations returned when observation depth is limited', async () => {
    const summary = await RecurringService.detectAndSync(userBId);
    assert.strictEqual(summary.recurringExpenses.length, 0);
    assert.ok(summary.limitations.length > 0);
  });

  // 11: Missing merchant fallback
  test('11. Missing merchant fallback: uses description or clean fallback name', async () => {
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 350,
      description: 'Newspaper Delivery Service',
      date: new Date('2026-06-02'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Services',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 350,
      description: 'Newspaper Delivery Service',
      date: new Date('2026-07-02'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Services',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const news = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('newspaper delivery service')
    );
    assert.ok(news, 'Description is used when destinationEntityId is not set');
  });

  // 12: Duplicate transaction handling
  test('12. Duplicate transaction handling: ignores identical double-posts on the same day', async () => {
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 800,
      description: 'Duplicate Cloud Backup Sync',
      date: new Date('2026-06-01'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Technology',
    });
    // Duplicate on exact same date
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 800,
      description: 'Duplicate Cloud Backup Sync',
      date: new Date('2026-06-01'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Technology',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 800,
      description: 'Duplicate Cloud Backup Sync',
      date: new Date('2026-07-01'),
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Technology',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const backup = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('duplicate cloud backup')
    );
    assert.ok(backup);
    assert.strictEqual(backup?.totalOccurrences, 2, 'Duplicate post on same day should be deduplicated');
  });

  // 13: Income exclusion
  test('13. Income exclusion: verified income streams are never classified as recurring expenses', async () => {
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 120000,
      description: 'Corporate Monthly Salary Credit',
      date: new Date('2026-06-01'),
      type: 'CREDIT',
      direction: 'INCOME',
      category: 'Income',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 120000,
      description: 'Corporate Monthly Salary Credit',
      date: new Date('2026-07-01'),
      type: 'CREDIT',
      direction: 'INCOME',
      category: 'Income',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const salaryAsExpense = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('salary')
    );
    assert.strictEqual(salaryAsExpense, undefined, 'Salary income must never be classified as an expense');
  });

  // 14: Transfer exclusion
  test('14. Transfer exclusion: internal account transfers are excluded from recurring expenses', async () => {
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 25000,
      description: 'Internal Transfer to Savings Wallet',
      date: new Date('2026-06-01'),
      type: 'INTERNAL_TRANSFER',
      direction: 'TRANSFER',
      category: 'Transfer',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 25000,
      description: 'Internal Transfer to Savings Wallet',
      date: new Date('2026-07-01'),
      type: 'INTERNAL_TRANSFER',
      direction: 'TRANSFER',
      category: 'Transfer',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const transfer = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('savings wallet')
    );
    assert.strictEqual(transfer, undefined, 'Transfers must not be classified as recurring expenses');
  });

  // 15: Refund handling
  test('15. Refund exclusion: refund inflows are excluded from recurring expense detection', async () => {
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 500,
      description: 'Merchant Dispute Refund',
      date: new Date('2026-06-10'),
      type: 'CREDIT',
      direction: 'REFUND',
      category: 'General',
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: userAAccountId,
      amount: 500,
      description: 'Merchant Dispute Refund',
      date: new Date('2026-07-10'),
      type: 'CREDIT',
      direction: 'REFUND',
      category: 'General',
    });

    const summary = await RecurringService.detectAndSync(userAId);
    const refund = summary.recurringExpenses.find((r) =>
      r.name.toLowerCase().includes('dispute refund')
    );
    assert.strictEqual(refund, undefined, 'Refunds must not be classified as recurring expenses');
  });

  // 16 & 17: Monthly recurring normalization & Annualized calculation
  test('16 & 17. Normalization & Annualization: correctly normalizes weekly, monthly, and quarterly expenses', async () => {
    const res = await request(app)
      .get('/api/analysis/recurring-expenses')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.summary);
    const { totalRecurringMonthlyExpense, estimatedAnnualRecurringExpense, normalizationMethod } = res.body.summary;

    assert.ok(totalRecurringMonthlyExpense > 0, 'Total monthly recurring must be greater than 0');
    assert.strictEqual(
      estimatedAnnualRecurringExpense,
      totalRecurringMonthlyExpense * 12,
      'Annualized must equal exactly totalRecurringMonthlyExpense * 12'
    );
    assert.ok(normalizationMethod.includes('52 / 12'));
  });

  // 18: Calendar event generation across all event types
  test('18. Calendar event generation: aggregates LOAN, RECURRING, GOAL, SCHEDULED, and TRANSACTIONS', async () => {
    // Create a Goal for User A
    await GoalRepository.create({
      userId: userAId,
      name: 'Emergency Fund 2026',
      targetAmount: 300000,
      targetAmountPaise: 30000000,
      currentAmount: 50000,
      currentAmountPaise: 5000000,
      targetDate: '2026-12-31',
      monthlyContribution: 10000,
      category: 'Emergency Fund',
    });

    const res = await request(app)
      .get('/api/calendar?year=2026&month=8')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const events = res.body.data.events;
    assert.ok(events.length > 0);

    // Verify presence of event types
    const hasRecurring = events.some((e: any) => e.eventType === 'RECURRING' && e.isEstimated === true);
    const hasGoal = events.some((e: any) => e.eventType === 'GOAL');
    const hasTransaction = events.some((e: any) => e.source === 'TRANSACTION');

    assert.ok(hasRecurring, 'Calendar must contain detected recurring events marked as estimated');
    assert.ok(hasGoal, 'Calendar must contain active goal milestones');
    assert.ok(hasTransaction, 'Calendar must contain actual verified ledger transactions');
  });

  // 19: Upcoming event chronological ordering (7d and 30d)
  test('19. Upcoming events: next 7-day and 30-day buckets are sorted chronologically', async () => {
    const res = await request(app)
      .get('/api/analysis/calendar-upcoming')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.upcoming7Days));
    assert.ok(Array.isArray(res.body.upcoming30Days));

    // Verify chronological sorting
    const list = res.body.upcoming30Days;
    for (let i = 1; i < list.length; i++) {
      assert.ok(
        list[i].date >= list[i - 1].date,
        `Upcoming events must be chronologically ordered: ${list[i - 1].date} <= ${list[i].date}`
      );
    }
  });

  // 20: Goal impact integration with recurring expenses
  // 20: Goal impact integration with recurring expenses
  test('20. Goal impact integration: adding a recurring expense affects goal pace and completion', async () => {
    const userGoals = await GoalRepository.findByUserId(userAId);
    const primaryGoal = userGoals[0];
    assert.ok(primaryGoal);

    // Evaluate impact of adding a ₹5,000/month recurring subscription
    const impact = await GoalImpactService.simulateGoalImpact({
      userId: userAId,
      goalId: primaryGoal._id,
      scenarioType: 'RECURRING_EXPENSE',
      amount: 5000,
    });

    assert.ok(impact);
    assert.strictEqual(impact.goal.id, primaryGoal._id);
    assert.ok(impact.baseline.projected12MonthBalance > impact.simulated.projected12MonthBalance);
    assert.strictEqual(
      impact.baseline.projected12MonthBalance - impact.simulated.projected12MonthBalance,
      5000 * 12,
      'Projected 12-month balance impact must exactly equal ₹5,000 * 12 = ₹60,000'
    );
  });

  // 21: What-If simulation connection (add and remove recurring expense)
  test('21. Simulation integration: models adding vs removing recurring expenses', async () => {
    // 1. Add recurring expense
    const addSim = await SimulationEngine.runSimulation({
      userId: userAId,
      scenarioType: 'RECURRING_EXPENSE',
      amount: 4000,
      direction: 'OUTFLOW',
      durationMonths: 12,
    });
    assert.ok(addSim);
    assert.ok(addSim.results.after.monthlyExpenses >= addSim.results.before.monthlyExpenses);

    // 2. Remove recurring expense (frees up cash flow)
    const removeSim = await SimulationEngine.runSimulation({
      userId: userAId,
      scenarioType: 'RECURRING_EXPENSE',
      amount: 4000,
      direction: 'INFLOW',
      durationMonths: 12,
    });
    assert.ok(removeSim);
    assert.ok(removeSim.results.after.monthlyExpenses <= removeSim.results.before.monthlyExpenses);
  });

  // 22: Simulation non-mutation guarantee
  test('22. Non-mutation guarantee: running recurring expense simulations does not mutate real database records', async () => {
    const goalsBefore = await GoalRepository.findByUserId(userAId);
    const balanceBefore = await TransactionRepository.findByUserId(userAId);

    // Run prospective simulation
    await SimulationEngine.runSimulation({
      userId: userAId,
      scenarioType: 'RECURRING_EXPENSE',
      amount: 25000,
      durationMonths: 12,
    });

    const goalsAfter = await GoalRepository.findByUserId(userAId);
    const balanceAfter = await TransactionRepository.findByUserId(userAId);

    assert.strictEqual(goalsBefore.length, goalsAfter.length);
    assert.strictEqual(balanceBefore.total, balanceAfter.total);
  });

  // 23: Authentication enforcement
  test('23. Authentication: recurring and calendar endpoints reject unauthenticated requests with 401', async () => {
    const recRes = await request(app).get('/api/analysis/recurring-expenses');
    assert.strictEqual(recRes.status, 401);

    const calRes = await request(app).get('/api/analysis/calendar-upcoming');
    assert.strictEqual(calRes.status, 401);
  });

  // 24: Tenant isolation (User A vs User B)
  test('24. Tenant isolation: User B cannot access User A recurring expenses or calendar events', async () => {
    const resB = await request(app)
      .get('/api/analysis/recurring-expenses')
      .set('Authorization', `Bearer ${userBToken}`);

    assert.strictEqual(resB.status, 200);
    // User B should not see any of User A's detected subscriptions
    const leaked = resB.body.recurringExpenses.some(
      (r: any) => r.userId === userAId || r.name.toLowerCase().includes('cloud hosting')
    );
    assert.strictEqual(leaked, false, 'User B must never receive User A recurring expenses');

    // Calendar isolation
    const calB = await request(app)
      .get('/api/analysis/calendar-upcoming')
      .set('Authorization', `Bearer ${userBToken}`);

    assert.strictEqual(calB.status, 200);
    const leakedEvent = calB.body.upcoming30Days.some((e: any) =>
      e.title.toLowerCase().includes('cloud hosting') || e.title.toLowerCase().includes('emergency fund')
    );
    assert.strictEqual(leakedEvent, false, 'User B must never receive User A calendar events');
  });
});
