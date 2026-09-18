/**
 * verify_phase_d.ts
 * Real live golden-path verification script for Phase D
 */
import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000';

async function request(path: string, options: any = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runGoldenPath() {
  console.log('=== STARTING PHASE D LIVE GOLDEN-PATH VERIFICATION ===\n');

  // 1. REGISTER USER A
  const emailA = `golden_userA_${Date.now()}@fintwin.ai`;
  const regARes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password: 'GoldenPassword!2026', name: 'Golden Path User A' }),
  });
  assert.strictEqual(regARes.status, 201, 'User A registration failed');
  const tokenA = regARes.data.token;
  const userAId = regARes.data.user.id || regARes.data.user._id;
  console.log('✅ STEP 1: Registered User A:', emailA);

  // 2. LOGIN USER A
  const loginARes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password: 'GoldenPassword!2026' }),
  });
  assert.strictEqual(loginARes.status, 200, 'User A login failed');
  console.log('✅ STEP 2: Logged in User A successfully with JWT.');

  // 3. CREATE ACCOUNT
  const accRes = await request('/api/accounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Salary Checking Account',
      type: 'CHECKING',
      institution: 'ICICI Bank',
      currency: 'INR',
      balance: 180000,
      isLiquid: true,
    }),
  });
  assert.strictEqual(accRes.status, 201, 'Account creation failed');
  const accountId = accRes.data.account._id;
  console.log('✅ STEP 3: Created depository checking account:', accountId);

  // 4. ADD MULTIPLE REPEATED TRANSACTIONS
  // Streaming: ₹649 monthly debits (12 Jul, 12 Aug, 12 Sep)
  // Broadband: ₹999 monthly debits (5 Jul, 5 Aug, 5 Sep)
  // Fitness: ₹800 weekly debits (1 Sep, 8 Sep, 15 Sep)
  // Salary: ₹1,50,000 monthly credit (1 Aug, 1 Sep) - to test income exclusion
  const txs = [
    { desc: 'Netflix Subscription Stream', amount: 649, date: '2026-07-12', type: 'DEBIT', dir: 'EXPENSE', cat: 'Entertainment' },
    { desc: 'Netflix Subscription Stream', amount: 649, date: '2026-08-12', type: 'DEBIT', dir: 'EXPENSE', cat: 'Entertainment' },
    { desc: 'Netflix Subscription Stream', amount: 649, date: '2026-09-12', type: 'DEBIT', dir: 'EXPENSE', cat: 'Entertainment' },
    { desc: 'Fiber Broadband High Speed', amount: 999, date: '2026-07-05', type: 'DEBIT', dir: 'EXPENSE', cat: 'Utilities' },
    { desc: 'Fiber Broadband High Speed', amount: 999, date: '2026-08-05', type: 'DEBIT', dir: 'EXPENSE', cat: 'Utilities' },
    { desc: 'Fiber Broadband High Speed', amount: 999, date: '2026-09-05', type: 'DEBIT', dir: 'EXPENSE', cat: 'Utilities' },
    { desc: 'City Gym Weekly Membership', amount: 800, date: '2026-09-01', type: 'DEBIT', dir: 'EXPENSE', cat: 'Fitness' },
    { desc: 'City Gym Weekly Membership', amount: 800, date: '2026-09-08', type: 'DEBIT', dir: 'EXPENSE', cat: 'Fitness' },
    { desc: 'City Gym Weekly Membership', amount: 800, date: '2026-09-15', type: 'DEBIT', dir: 'EXPENSE', cat: 'Fitness' },
    { desc: 'Monthly Salary Credit', amount: 150000, date: '2026-08-01', type: 'CREDIT', dir: 'INCOME', cat: 'Income' },
    { desc: 'Monthly Salary Credit', amount: 150000, date: '2026-09-01', type: 'CREDIT', dir: 'INCOME', cat: 'Income' },
  ];

  for (const t of txs) {
    const txRes = await request('/api/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        accountId,
        description: t.desc,
        amount: t.amount,
        date: t.date,
        type: t.type,
        direction: t.dir,
        category: t.cat,
      }),
    });
    assert.strictEqual(txRes.status, 201, `Failed inserting tx ${t.desc}`);
  }
  console.log(`✅ STEP 4: Ingested ${txs.length} verified real transactions into ledger.`);

  // 5. DETECT RECURRING EXPENSES
  const recRes = await request('/api/analysis/recurring-expenses', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(recRes.status, 200, 'Recurring detection failed');
  assert.strictEqual(recRes.data.success, true);
  const detected = recRes.data.recurringExpenses;
  assert.ok(detected.length >= 3, `Expected at least 3 detected recurring items, found ${detected.length}`);

  const netflix = detected.find((r: any) => r.name.toLowerCase().includes('netflix'));
  const broadband = detected.find((r: any) => r.name.toLowerCase().includes('broadband'));
  const gym = detected.find((r: any) => r.name.toLowerCase().includes('gym'));
  const salary = detected.find((r: any) => r.name.toLowerCase().includes('salary'));

  assert.ok(netflix, 'Netflix must be detected');
  assert.ok(broadband, 'Broadband must be detected');
  assert.ok(gym, 'Gym must be detected');
  assert.strictEqual(salary, undefined, 'Salary income must NOT be detected as an expense');

  console.log('✅ STEP 5: Deterministic pattern engine successfully identified recurring commitments:');
  console.log(`   - Netflix: Cadence=${netflix.cadence}, Avg=₹${netflix.averageAmount}, MonthlyImpact=₹${netflix.estimatedMonthlyImpact}`);
  console.log(`   - Broadband: Cadence=${broadband.cadence}, Avg=₹${broadband.averageAmount}, MonthlyImpact=₹${broadband.estimatedMonthlyImpact}`);
  console.log(`   - Gym: Cadence=${gym.cadence}, Avg=₹${gym.averageAmount}, MonthlyImpact=₹${gym.estimatedMonthlyImpact}`);

  // 6 & 7. VIEW RECURRING EXPENSE & NEXT EXPECTED OCCURRENCE
  assert.ok(netflix.nextExpectedDate, 'Next expected date must be populated');
  assert.ok(netflix.nextOccurrenceMessage.includes('Estimated next occurrence'));
  assert.ok(netflix.confidenceScore > 0.5, 'Confidence score must be calculated');
  console.log('✅ STEP 6 & 7: Verified record details & next occurrence labeling:');
  console.log(`   - Next expected date: ${netflix.nextExpectedDate} (${netflix.nextOccurrenceMessage})`);
  console.log(`   - Calculated Confidence: ${Math.round(netflix.confidenceScore * 100)}% (${netflix.confidenceFormula})`);

  // 8 & 9. OPEN FINANCIAL CALENDAR & VIEW UPCOMING EVENTS
  const calRes = await request('/api/calendar?year=2026&month=9', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(calRes.status, 200);
  assert.strictEqual(calRes.data.success, true);
  const events = calRes.data.data.events;
  assert.ok(events.length > 0, 'Calendar events must not be empty');

  const recurringEvents = events.filter((e: any) => e.eventType === 'RECURRING');
  assert.ok(recurringEvents.length > 0, 'Must have recurring calendar events');
  assert.ok(recurringEvents.every((e: any) => e.isEstimated === true), 'All recurring events must be marked as ESTIMATED');
  console.log(`✅ STEP 8 & 9: Financial Calendar loaded with ${events.length} unified events.`);
  console.log(`   - Verified ${recurringEvents.length} recurring items marked explicitly as ESTIMATED.`);

  const upcomingRes = await request('/api/analysis/calendar-upcoming', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(upcomingRes.status, 200);
  console.log(`   - Upcoming 7-day events: ${upcomingRes.data.upcoming7Days.length}`);
  console.log(`   - Upcoming 30-day events: ${upcomingRes.data.upcoming30Days.length}`);

  // 10. CREATE GOAL & RUN RECURRING-EXPENSE SIMULATION
  const goalRes = await request('/api/goals', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Emergency Reserve Fund',
      targetAmount: 250000,
      currentAmount: 40000,
      targetDate: '2027-06-30',
      monthlyContribution: 8000,
      category: 'EMERGENCY_FUND',
    }),
  });
  assert.strictEqual(goalRes.status, 201);
  const goalId = goalRes.data.goal._id;
  console.log('✅ STEP 10: Created Goal for User A:', goalRes.data.goal.name);

  // Run What-If simulation adding a ₹6,000/mo recurring expense
  const simRes = await request('/api/simulation/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      scenarioType: 'RECURRING_EXPENSE',
      amount: 6000,
      direction: 'OUTFLOW',
      durationMonths: 12,
    }),
  });
  assert.strictEqual(simRes.status, 201);
  assert.ok(simRes.data.scenario);
  console.log('✅ STEP 11: Executed Prospective Simulation for RECURRING_EXPENSE (₹6,000/mo).');

  // Verify Goal Impact
  const goalImpactRes = await request('/api/goals/impact', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      goalId,
      scenarioType: 'RECURRING_EXPENSE',
      amount: 6000,
    }),
  });
  assert.strictEqual(goalImpactRes.status, 200);
  const impact = goalImpactRes.data.impact;
  assert.ok(impact, 'Goal impact must be returned');
  console.log('✅ STEP 12: Goal Impact computed:');
  console.log(`   - Baseline 12M Balance: ₹${impact.baseline.projected12MonthBalance.toLocaleString()}`);
  console.log(`   - Simulated 12M Balance: ₹${impact.simulated.projected12MonthBalance.toLocaleString()}`);
  console.log(`   - Balance Impact: ₹${impact.impact.projectedBalanceImpact.toLocaleString()}`);
  console.log(`   - Target Progress Impact: ${impact.impact.targetProgressImpact}`);

  // 13. VERIFY REAL RECORDS DID NOT MUTATE
  const goalVerifyRes = await request(`/api/goals/${goalId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(goalVerifyRes.status, 200);
  assert.strictEqual(goalVerifyRes.data.goal.currentAmount, 40000, 'Goal current amount must NOT change after simulation');

  const accVerifyRes = await request(`/api/accounts/${accountId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(accVerifyRes.status, 200);
  assert.strictEqual(accVerifyRes.data.account.currentBalance, 472656, 'Account balance must NOT change after simulation');
  console.log('✅ STEP 13: Non-mutation guarantee verified. Real database records remained completely unmodified.');

  // 14. VERIFY STRICT TENANT ISOLATION (User A vs User B)
  const emailB = `golden_userB_${Date.now()}@fintwin.ai`;
  const regBRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: emailB, password: 'GoldenPassword!2026', name: 'Golden Path User B' }),
  });
  const tokenB = regBRes.data.token;

  const recBRes = await request('/api/analysis/recurring-expenses', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(recBRes.status, 200);
  assert.strictEqual(recBRes.data.recurringExpenses.length, 0, 'User B must see 0 recurring expenses (tenant isolated)');

  const calBRes = await request('/api/analysis/calendar-upcoming', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(calBRes.status, 200);
  assert.strictEqual(calBRes.data.upcoming30Days.length, 0, 'User B must see 0 upcoming calendar events');
  console.log('✅ STEP 14: Strict tenant isolation verified between User A and User B.');

  console.log('\n======================================================');
  console.log('🎉 ALL 14 GOLDEN PATH VERIFICATION STEPS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

runGoldenPath().catch((err) => {
  console.error('❌ GOLDEN PATH FAILED:', err);
  process.exit(1);
});
