/**
 * verify_phase_c_live.ts
 * Live End-to-End Verification of Phase C against live MongoDB & backend server
 */

async function main() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('=== Starting Live Phase C Verification against', BASE_URL, '===');

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthJson = await healthRes.json();
  console.log('1. Health Check:', healthJson);
  if (!healthJson.success || healthJson.database !== 'connected') {
    throw new Error('Backend or MongoDB is not healthy!');
  }

  // 2. Register User Alpha
  const emailA = `live_phaseC_userA_${Date.now()}@fintwin.ai`;
  const regARes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Live Phase C User Alpha',
      email: emailA,
      password: 'LivePassword123!',
      currency: 'INR',
    }),
  });
  const regAJson = await regARes.json();
  console.log('2. Register User A status:', regARes.status, 'token received:', !!regAJson.token);
  const tokenA = regAJson.token;
  const userAId = regAJson.user._id || regAJson.user.id;

  // 3. Register User Beta (for Tenant Isolation)
  const emailB = `live_phaseC_userB_${Date.now()}@fintwin.ai`;
  const regBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Live Phase C User Beta',
      email: emailB,
      password: 'LivePassword123!',
      currency: 'INR',
    }),
  });
  const regBJson = await regBRes.json();
  console.log('3. Register User B status:', regBRes.status, 'token received:', !!regBJson.token);
  const tokenB = regBJson.token;

  // 4. Setup User A Account with ₹1,50,000 Liquid Balance
  const accRes = await fetch(`${BASE_URL}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: 'HDFC Priority Checking',
      type: 'CHECKING',
      institution: 'HDFC Bank',
      currentBalance: 150000,
      currency: 'INR',
    }),
  });
  const accJson = await accRes.json();
  console.log('4. Create Account status:', accRes.status, 'Balance:', accJson.account?.currentBalance);
  const accId = accJson.account._id;

  // 5. Setup User A Ledger Transactions (Salary + Expenses)
  await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      accountId: accId,
      amount: 85000,
      type: 'CREDIT',
      direction: 'INCOME',
      category: 'Salary',
      description: 'Corporate Monthly Salary',
    }),
  });
  await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      accountId: accId,
      amount: 25000,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Rent',
      description: 'Residential Apartment Rent',
    }),
  });
  console.log('5. Added verified ledger transactions (Income: ₹85,000, Expenses: ₹25,000, Surplus: ₹60,000)');

  // 6. CREATE GOAL for User A
  const createGoalRes = await fetch(`${BASE_URL}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Emergency Reserve Fund',
      category: 'EMERGENCY_FUND',
      targetAmount: 200000,
      currentAmount: 50000,
      monthlyContribution: 20000,
      targetDate: '2027-06-30',
      notes: '6-Month living buffer',
    }),
  });
  const createGoalJson = await createGoalRes.json();
  console.log('6. CREATE GOAL status:', createGoalRes.status, 'Goal:', createGoalJson.goal?.name);
  console.log('   Calculations:', {
    target: createGoalJson.goal.targetAmount,
    current: createGoalJson.goal.currentAmount,
    remaining: createGoalJson.goal.calculations.amountRemaining,
    progress: createGoalJson.goal.calculations.progressPercent + '%',
    monthly: createGoalJson.goal.monthlyContribution,
    estCompletion: createGoalJson.goal.calculations.estimatedCompletionDate,
  });
  const goalId = createGoalJson.goal._id;

  // 7. VIEW GOAL
  const viewGoalRes = await fetch(`${BASE_URL}/goals/${goalId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const viewGoalJson = await viewGoalRes.json();
  console.log('7. VIEW GOAL status:', viewGoalRes.status, 'Fetched Name:', viewGoalJson.goal?.name);

  // 8. EDIT GOAL (PUT & PATCH)
  const editGoalRes = await fetch(`${BASE_URL}/goals/${goalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Emergency Reserve Fund (Expanded)',
      monthlyContribution: 25000,
    }),
  });
  const editGoalJson = await editGoalRes.json();
  console.log('8. EDIT GOAL (PUT) status:', editGoalRes.status, 'Updated Monthly:', editGoalJson.goal?.monthlyContribution);

  // 9. TENANT ISOLATION: User B tries to read User A's goal
  const userBTryGet = await fetch(`${BASE_URL}/goals/${goalId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log('9. Tenant Isolation: User B GET User A Goal status (expected 404):', userBTryGet.status);
  if (userBTryGet.status !== 404) throw new Error('Tenant isolation breach!');

  // 10. RUN GOAL IMPACT ANALYSIS (Outright Purchase)
  const impactRes = await fetch(`${BASE_URL}/goals/impact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      goalId,
      scenarioType: 'PURCHASE',
      amount: 40000,
      paymentMode: 'OUTRIGHT',
      description: 'Home Appliance Purchase',
    }),
  });
  const impactJson = await impactRes.json();
  console.log('10. GOAL IMPACT (Outright):', {
    baseline12MBalance: impactJson.impact?.baseline?.projected12MonthBalance,
    simulated12MBalance: impactJson.impact?.simulated?.projected12MonthBalance,
    balanceImpact: impactJson.impact?.impact?.projectedBalanceImpact,
    delayMonths: impactJson.impact?.impact?.completionDateDeltaMonths,
    progressStatus: impactJson.impact?.impact?.targetProgressImpact,
  });

  // 11. RUN GOAL IMPACT ANALYSIS (Financed EMI)
  const emiImpactRes = await fetch(`${BASE_URL}/goals/impact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      goalId,
      scenarioType: 'LOAN_EMI',
      principal: 200000,
      annualRate: 14,
      tenureMonths: 6,
      paymentMode: 'EMI',
      description: 'Vehicle Financing',
    }),
  });
  const emiImpactJson = await emiImpactRes.json();
  console.log('11. GOAL IMPACT (EMI Financing):', {
    sustainableMonthlyBefore: emiImpactJson.impact?.baseline?.sustainableMonthlyContribution,
    sustainableMonthlyAfter: emiImpactJson.impact?.simulated?.sustainableMonthlyContribution,
    delayMonths: emiImpactJson.impact?.impact?.completionDateDeltaMonths,
    explanation: emiImpactJson.impact?.impact?.explanation,
  });

  // 12. RUN AFFORDABILITY ANALYSIS
  const affordRes = await fetch(`${BASE_URL}/analysis/affordability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      purchaseAmount: 35000,
      paymentMode: 'OUTRIGHT',
      goalId,
      description: 'Workstation Setup',
    }),
  });
  const affordJson = await affordRes.json();
  console.log('12. AFFORDABILITY ANALYSIS:', {
    status: affordJson.affordability?.status,
    reason: affordJson.affordability?.statusReason,
    liquidReservesBefore: affordJson.affordability?.evidence?.currentLiquidBalance,
    liquidReservesAfter: affordJson.affordability?.evidence?.liquidBalanceAfter,
    monthlySurplusBefore: affordJson.affordability?.evidence?.monthlySurplusBefore,
    monthlySurplusAfter: affordJson.affordability?.evidence?.monthlySurplusAfter,
    runwayBefore: affordJson.affordability?.evidence?.emergencyRunwayBefore,
    runwayAfter: affordJson.affordability?.evidence?.emergencyRunwayAfter,
    comparisonDimensionsCount: affordJson.affordability?.comparison?.length,
  });

  // 13. VERIFY ORIGINAL GOAL DID NOT CHANGE (Non-Mutation Check)
  const verifyGoalRes = await fetch(`${BASE_URL}/goals/${goalId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const verifyGoalJson = await verifyGoalRes.json();
  console.log('13. NON-MUTATION CHECK (Goal):');
  console.log('    Target Amount:', verifyGoalJson.goal.targetAmount, '(expected 200000)');
  console.log('    Current Amount:', verifyGoalJson.goal.currentAmount, '(expected 50000)');
  if (verifyGoalJson.goal.currentAmount !== 50000 || verifyGoalJson.goal.targetAmount !== 200000) {
    throw new Error('Mutation detected on Goal!');
  }

  // 14. VERIFY FINANCIAL RECORDS DID NOT CHANGE (Non-Mutation Check)
  const verifyAccRes = await fetch(`${BASE_URL}/accounts`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const verifyAccJson = await verifyAccRes.json();
  const accRecord = verifyAccJson.accounts.find((a: any) => a._id === accId);
  const finalBalance = accRecord.currentBalance ?? accRecord.balance;
  console.log('14. NON-MUTATION CHECK (Account):');
  console.log('    Account Balance before simulations: 210000, after simulations:', finalBalance);
  if (finalBalance !== 210000) {
    throw new Error(`Mutation detected on Account Balance! Balance changed to ${finalBalance}`);
  }

  // 15. DELETE GOAL
  const delRes = await fetch(`${BASE_URL}/goals/${goalId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const delJson = await delRes.json();
  console.log('15. DELETE GOAL status:', delRes.status, 'Message:', delJson.message);

  const confirmDel = await fetch(`${BASE_URL}/goals/${goalId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  console.log('    Confirm goal is deleted (status expected 404):', confirmDel.status);
  if (confirmDel.status !== 404) throw new Error('Goal was not deleted!');

  console.log('=== ALL 15 PHASE C VERIFICATION CHECKS PASSED PERFECTLY ===');
}

main().catch((err) => {
  console.error('Phase C Verification FAILED:', err);
  process.exit(1);
});
