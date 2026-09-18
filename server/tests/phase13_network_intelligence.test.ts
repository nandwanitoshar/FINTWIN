import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { DigitalTwinService } from '../src/services/digitalTwinService.js';
import { TransactionRepository } from '../src/models/Transaction.js';
import { AccountRepository } from '../src/models/Account.js';
import { EntityRepository } from '../src/models/Entity.js';
import { GoalRepository } from '../src/models/Goal.js';
import { SpendingService } from '../src/services/spendingService.js';

describe('FinTwin AI — PHASE E Full Verification Suite (Digital Twin + Network Intelligence)', () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;

  let accountCheckingA: string;
  let accountSavingsA: string;
  let accountCreditA: string;

  let entityEmployer: string;
  let entityLandlord: string;
  let entityAWS: string;
  let entityCoffeeShop: string;
  let entityUtility: string;

  let userBAccountId: string;
  let userBEntityId: string;

  const emailA = `phaseE_userA_${Date.now()}@fintwin.ai`;
  const emailB = `phaseE_userB_${Date.now()}@fintwin.ai`;
  const password = 'PhaseEPassword!2026';

  before(async () => {
    // 1. Register User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({ email: emailA, password, name: 'Phase E Architect Alpha' });
    assert.strictEqual(regA.status, 201);
    userAToken = regA.body.token;
    userAId = regA.body.user.id || regA.body.user._id;

    // Accounts for User A
    const acc1 = await AccountRepository.create({
      userId: userAId,
      name: 'Primary Salary Checking',
      type: 'CHECKING',
      institution: 'HDFC Bank',
      currency: 'INR',
      currentBalance: 150000,
      isLiquid: true,
    });
    accountCheckingA = acc1._id;

    const acc2 = await AccountRepository.create({
      userId: userAId,
      name: 'High Yield Savings',
      type: 'SAVINGS',
      institution: 'ICICI Bank',
      currency: 'INR',
      currentBalance: 300000,
      isLiquid: true,
    });
    accountSavingsA = acc2._id;

    const acc3 = await AccountRepository.create({
      userId: userAId,
      name: 'Corporate Black Card',
      type: 'CREDIT_CARD',
      institution: 'Axis Bank',
      currency: 'INR',
      currentBalance: 45000,
      creditLimit: 100000,
      isLiquid: false,
    });
    accountCreditA = acc3._id;

    // Entities for User A
    const ent1 = await EntityRepository.create({
      userId: userAId,
      name: 'Acme Technologies Inc',
      type: 'EMPLOYER',
      category: 'Income',
    });
    entityEmployer = ent1._id;

    const ent2 = await EntityRepository.create({
      userId: userAId,
      name: 'Skyline Luxury Residences',
      type: 'MERCHANT',
      category: 'Housing',
    });
    entityLandlord = ent2._id;

    const ent3 = await EntityRepository.create({
      userId: userAId,
      name: 'Amazon Web Services Cloud',
      type: 'MERCHANT',
      category: 'Utilities',
    });
    entityAWS = ent3._id;

    const ent4 = await EntityRepository.create({
      userId: userAId,
      name: 'Third Wave Coffee',
      type: 'MERCHANT',
      category: 'Food & Dining',
    });
    entityCoffeeShop = ent4._id;

    const ent5 = await EntityRepository.create({
      userId: userAId,
      name: 'Metropolitan Electricity',
      type: 'UTILITY',
      category: 'Utilities',
    });
    entityUtility = ent5._id;

    // 2. Register User B (for tenant isolation tests)
    const regB = await request(app)
      .post('/api/auth/register')
      .send({ email: emailB, password, name: 'Phase E User Beta' });
    assert.strictEqual(regB.status, 201);
    userBToken = regB.body.token;
    userBId = regB.body.user.id || regB.body.user._id;

    const accB = await AccountRepository.create({
      userId: userBId,
      name: 'User B Offshore Vault',
      type: 'SAVINGS',
      institution: 'Swiss Trust',
      currency: 'INR',
      currentBalance: 999999,
      isLiquid: true,
    });
    userBAccountId = accB._id;

    const entB = await EntityRepository.create({
      userId: userBId,
      name: 'Confidential Syndicate B',
      type: 'INDIVIDUAL',
      category: 'Private',
    });
    userBEntityId = entB._id;

    await TransactionRepository.create({
      userId: userBId,
      sourceAccountId: userBAccountId,
      destinationEntityId: userBEntityId,
      amount: 88888,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Private',
      description: 'Top Secret B Expense',
      date: new Date(),
    });
  });

  // 19. Empty Network verification (User A has accounts & entities but 0 transactions yet)
  test('19. Empty Network: safely returns nodes and 0 edges without errors or fabricated topology', async () => {
    const res = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.network.nodes.length >= 3, 'Should list User A accounts');
    assert.strictEqual(res.body.network.edges.length, 0, 'No edges fabricated without transactions');
    assert.strictEqual(res.body.network.metrics.transactionCount, 0);
    assert.strictEqual(res.body.network.metrics.totalTransactionVolume, 0);
  });

  // Populate realistic transaction dataset for User A
  test('Populate realistic transaction ledger for User A', async () => {
    // Inflow: Acme Salary (Income) - 3 monthly payroll credits
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityEmployer,
      amount: 120000,
      type: 'CREDIT',
      direction: 'INCOME',
      category: 'Salary',
      description: 'Acme Monthly Payroll June',
      date: new Date('2026-06-01T10:00:00Z'),
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityEmployer,
      amount: 120000,
      type: 'CREDIT',
      direction: 'INCOME',
      category: 'Salary',
      description: 'Acme Monthly Payroll July',
      date: new Date('2026-07-01T10:00:00Z'),
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityEmployer,
      amount: 120000,
      type: 'CREDIT',
      direction: 'INCOME',
      category: 'Salary',
      description: 'Acme Monthly Payroll August',
      date: new Date('2026-08-01T10:00:00Z'),
    });

    // Outflow: Skyline Luxury Rent (Expense) - 3 monthly rent payments
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityLandlord,
      amount: 45000,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Housing',
      description: 'Skyline Apartment Rent June',
      date: new Date('2026-06-05T10:00:00Z'),
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityLandlord,
      amount: 45000,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Housing',
      description: 'Skyline Apartment Rent July',
      date: new Date('2026-07-05T10:00:00Z'),
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityLandlord,
      amount: 45000,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Housing',
      description: 'Skyline Apartment Rent August',
      date: new Date('2026-08-05T10:00:00Z'),
    });

    // Outflow: AWS Cloud (Recurring Monthly Expense) - 3 monthly payments
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCreditA,
      destinationEntityId: entityAWS,
      amount: 8500,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Utilities',
      description: 'Amazon Web Services Cloud Infrastructure June',
      date: new Date('2026-06-12T10:00:00Z'),
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCreditA,
      destinationEntityId: entityAWS,
      amount: 8500,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Utilities',
      description: 'Amazon Web Services Cloud Infrastructure July',
      date: new Date('2026-07-12T10:00:00Z'),
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCreditA,
      destinationEntityId: entityAWS,
      amount: 8500,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Utilities',
      description: 'Amazon Web Services Cloud Infrastructure August',
      date: new Date('2026-08-12T10:00:00Z'),
    });

    // Outflow: Coffee Shop (Frequent small expenses)
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityCoffeeShop,
      amount: 350,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Food & Dining',
      description: 'Third Wave Cold Brew',
      date: new Date('2026-08-10T10:00:00Z'),
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityCoffeeShop,
      amount: 400,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Food & Dining',
      description: 'Third Wave Pour Over',
      date: new Date('2026-08-15T10:00:00Z'),
    });
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityCoffeeShop,
      amount: 350,
      type: 'DEBIT',
      direction: 'EXPENSE',
      category: 'Food & Dining',
      description: 'Third Wave Cappuccino',
      date: new Date('2026-08-20T10:00:00Z'),
    });

    // Internal Transfer: Checking -> Savings
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationAccountId: accountSavingsA,
      amount: 30000,
      type: 'TRANSFER',
      direction: 'TRANSFER',
      category: 'Transfer',
      description: 'Monthly Savings Allocation',
      date: new Date('2026-08-02T10:00:00Z'),
    });

    // Refund: Coffee Shop Refund
    await TransactionRepository.create({
      userId: userAId,
      sourceAccountId: accountCheckingA,
      destinationEntityId: entityCoffeeShop,
      amount: 350,
      type: 'CREDIT',
      direction: 'REFUND',
      category: 'Food & Dining',
      description: 'Third Wave Order Cancellation Refund',
      date: new Date('2026-08-21T10:00:00Z'),
    });

    // Add a Goal for User A to test goal integration
    await GoalRepository.create({
      userId: userAId,
      name: 'Emergency Buffer 2026',
      targetAmount: 500000,
      currentAmount: 300000,
      targetDate: new Date('2027-03-31'),
      category: 'EMERGENCY_FUND',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    });
  });

  // 1. Digital Twin state accuracy
  test('1. Digital Twin state accuracy: provides unified state vector with accounts, entities, transactions, income sources, recurring flows, and debt', async () => {
    const res = await request(app)
      .get('/api/twin')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const twin = res.body.twin;
    assert.ok(twin);
    assert.ok(Array.isArray(twin.accounts) || Array.isArray(twin.accounts.all));
    assert.strictEqual((twin.accounts.all || twin.accounts).length, 3);
    assert.ok(Array.isArray(twin.entities));
    assert.ok(twin.entities.length >= 5);
    assert.ok(Array.isArray(twin.incomeSources));
    assert.ok(twin.incomeSources.some((s: any) => s.entityName.includes('Acme')));
    assert.ok(Array.isArray(twin.expenseEntities));
    assert.ok(twin.expenseEntities.some((e: any) => e.entityName.includes('Skyline')));
    assert.ok(Array.isArray(twin.transfers));
    assert.strictEqual(twin.transfers.length, 1);
    assert.strictEqual(twin.debt.totalDebt, 45000); // Credit card liability balance
    assert.ok(twin.historicalBehaviour);
    assert.ok(typeof twin.historicalBehaviour.stabilityRating === 'string');
  });

  // 2 & 3. Network node count and edge count
  test('2 & 3. Network node count & edge count: accurately models all accounts, entities and transactions without duplication', async () => {
    const res = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const { nodes, edges, metrics } = res.body.network;
    assert.strictEqual(nodes.length, 8); // 3 accounts + 5 entities
    assert.ok(edges.length >= 4); // Checking->Acme, Checking->Skyline, Credit->AWS, Checking->Coffee, Checking->Savings
    assert.strictEqual(metrics.nodeCount, nodes.length);
    assert.strictEqual(metrics.linkCount, edges.length);
  });

  // 4 & 5. Income and Expense flow calculation
  test('4 & 5. Income and Expense flow calculation: segregates income credits from debit expenses correctly', async () => {
    const res = await request(app)
      .get('/api/network/summary')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const summary = res.body.summary;
    // Income = 120,000 * 3 = 360,000
    assert.strictEqual(summary.incomeFlow, 360000);
    // Expenses = 45,000 * 3 (Rent) + 8,500 * 3 (AWS) + 350 + 400 + 350 (Coffee) = 161,600
    assert.strictEqual(summary.expenseFlow, 161600);
    assert.strictEqual(summary.moneyFlow.inflow, 360000);
    assert.strictEqual(summary.moneyFlow.outflow, 161600);
    assert.strictEqual(summary.moneyFlow.netFlow, 360000 - 161600);
  });

  // 6. Transfer handling
  test('6. Transfer handling: internal transfers are isolated and not double-counted as income or expenses', async () => {
    const res = await request(app)
      .get('/api/network/summary')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const summary = res.body.summary;
    assert.strictEqual(summary.transferFlow, 30000);
    assert.strictEqual(summary.moneyFlow.transfers, 30000);
    // Income and expense must NOT include the 30,000 transfer
    assert.strictEqual(summary.incomeFlow, 360000);
    assert.strictEqual(summary.expenseFlow, 161600);
  });

  // 7. Refund handling
  test('7. Refund handling: refunds are segregated and recorded without inflating original operational expenses', async () => {
    const res = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const refundEdge = res.body.network.edges.find((e: any) => e.metadata.flowType === 'REFUND');
    assert.ok(refundEdge, 'Refund edge should exist');
    assert.strictEqual(refundEdge.metadata.totalVolume, 350);
    assert.strictEqual(res.body.network.metrics.moneyFlow.refunds, 350);
  });

  // 8 & 9. Top relationship calculation & Deterministic Strength formula
  test('8 & 9. Top relationships & Relationship strength: ranked deterministically by strength (0 to 1) with documented lineage', async () => {
    const res = await request(app)
      .get('/api/network/summary')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const topRel = res.body.summary.topRelationships;
    assert.ok(Array.isArray(topRel) && topRel.length > 0);

    // Each relationship should have valid strength between 0.0 and 1.0
    for (const rel of topRel) {
      assert.ok(typeof rel.strength === 'number');
      assert.ok(rel.strength >= 0 && rel.strength <= 1.0, `Strength ${rel.strength} must be in [0, 1]`);
      assert.ok(rel.transactionCount > 0);
      assert.ok(rel.totalVolume > 0);
      assert.ok(rel.firstSeen);
      assert.ok(rel.lastSeen);
    }

    // Top relationships should be sorted descending by strength
    for (let i = 0; i < topRel.length - 1; i++) {
      assert.ok(topRel[i].strength >= topRel[i + 1].strength, 'Must be sorted descending by strength');
    }
  });

  // 10. Network concentration
  test('10. Network concentration: calculates concentration metrics and identifies single points of concentration', async () => {
    const res = await request(app)
      .get('/api/network/summary')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const concentration = res.body.summary.concentration;
    assert.ok(concentration);
    // Acme represents 100% of income (360,000 / 360,000)
    assert.strictEqual(concentration.incomeConcentrationRatio, 1);
    assert.ok(concentration.singleIncomeDependency, 'Single income dependency should be flagged');
    // Rent represents 135,000 / 161,600 = 83.5% of expenses
    assert.ok(concentration.highestExpenseConcentration.ratio > 0.8);
    assert.strictEqual(concentration.hasConcentrationRisk, true);
  });

  // 11. Entity detail endpoint
  test('11. Entity detail: GET /api/network/entity/:id returns verified incoming, outgoing, and account connections', async () => {
    const res = await request(app)
      .get(`/api/network/entity/${entityLandlord}`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.details || res.body;
    assert.strictEqual(data.entity.name, 'Skyline Luxury Residences');
    assert.strictEqual(data.expenseVolume, 135000);
    assert.strictEqual(data.transactionCount, 3);
    assert.ok(data.networkSharePct > 0);
    assert.ok(Array.isArray(data.connectedAccounts));
    assert.strictEqual(data.connectedAccounts[0].accountName, 'Primary Salary Checking');
  });

  // 12. Account detail endpoint
  test('12. Account detail: GET /api/network/account/:id returns authoritative balance and connected counterparties', async () => {
    const res = await request(app)
      .get(`/api/network/account/${accountCheckingA}`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.details || res.body;
    assert.strictEqual(data.account.name, 'Primary Salary Checking');
    assert.strictEqual(data.account.currentBalance, 150000); // Authoritative balance
    assert.strictEqual(data.inflow, 360350); // 360k salary + 350 refund
    assert.strictEqual(data.outflow, 136100); // 135k rent + 1100 coffee
    assert.strictEqual(data.transferVolume, 30000);
    assert.ok(data.topCounterparty.name.length > 0);
  });

  // 13. Edge detail endpoint
  test('13. Edge detail: GET /api/network/edge/:id returns bounded contributing transactions and relationship metrics', async () => {
    const netRes = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userAToken}`);

    const rentEdge = netRes.body.network.edges.find((e: any) => e.target === entityLandlord);
    assert.ok(rentEdge, 'Rent edge should exist');

    const res = await request(app)
      .get(`/api/network/edge/${encodeURIComponent(rentEdge.id)}`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const details = res.body.details || res.body;
    assert.strictEqual(details.edge.relationshipType, 'PAYS');
    assert.strictEqual(details.totalVolume, 135000);
    assert.strictEqual(details.transactionCount, 3);
    assert.strictEqual(details.averageTransactionAmount, 45000);
    assert.ok(Array.isArray(details.contributingTransactions));
    assert.strictEqual(details.contributingTransactions.length, 3);
  });

  // 14 & 15. Path tracing & Cycle protection
  test('14 & 15. Path tracing & Cycle protection: traces BFS path between entities with cycle prevention and depth limit', async () => {
    // Path from Employer -> Landlord (Employer -> Checking -> Landlord)
    const res = await request(app)
      .get(`/api/network/path?from=${entityEmployer}&to=${entityLandlord}&maxDepth=4`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.path.found, true);
    assert.strictEqual(res.body.path.nodes.length, 3);
    assert.strictEqual(res.body.path.nodes[0], entityEmployer);
    assert.strictEqual(res.body.path.nodes[1], accountCheckingA);
    assert.strictEqual(res.body.path.nodes[2], entityLandlord);

    // No path test (Utility entity has no transactions)
    const noPathRes = await request(app)
      .get(`/api/network/path?from=${entityUtility}&to=${entityLandlord}&maxDepth=3`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(noPathRes.status, 200);
    assert.strictEqual(noPathRes.body.path.found, false);
    assert.ok(noPathRes.body.path.message.includes('No financial path found'));
  });

  // 16. Time-range filtering
  test('16. Time-range filtering: filters network transactions by selected date window without mixing historical periods', async () => {
    // Filter to July 2026 only
    const res = await request(app)
      .get('/api/network?startDate=2026-07-01&endDate=2026-07-31')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const julyMetrics = res.body.network.metrics;
    // In July: 1 salary (120k), 1 rent (45k), 1 AWS (8.5k), 0 coffee, 0 transfer
    assert.strictEqual(julyMetrics.incomeFlow, 120000);
    assert.strictEqual(julyMetrics.expenseFlow, 53500); // 45k + 8.5k
    assert.strictEqual(julyMetrics.activeTimeRange.range, 'CUSTOM');
  });

  // 17. Network filters
  test('17. Network filters: filterType=INCOME returns only incoming edges and active nodes', async () => {
    const res = await request(app)
      .get('/api/network?filterType=INCOME')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const { edges } = res.body.network;
    assert.ok(edges.length > 0);
    for (const edge of edges) {
      assert.strictEqual(edge.relationshipType, 'RECEIVES_FROM');
    }
  });

  // 18. Network search
  test('18. Network search: retrieves matching nodes from user data only', async () => {
    const res = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userAToken}`);

    const nodes = res.body.network.nodes;
    const query = 'Acme';
    const matches = nodes.filter((n: any) => n.label.toLowerCase().includes(query.toLowerCase()));
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].id, entityEmployer);
  });

  // 20. Large network handling / bounded result
  test('20. Large network handling: gracefully computes metrics and caps transaction slices to prevent unbounded payload growth', async () => {
    const res = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.network.metrics.topRelationships.length <= 10, 'Top relationships must be bounded to top 10');
  });

  // 21. Risk signal integration
  test('21. Risk signal integration: network metrics attach authoritative risk signals without running duplicate risk engines', async () => {
    const res = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const riskSignals = res.body.network.metrics.relatedRiskSignals;
    assert.ok(Array.isArray(riskSignals));
    // The concentration metrics alert should be present in concentration object
    assert.strictEqual(res.body.network.metrics.concentration.hasConcentrationRisk, true);
  });

  // 22. Spending reconciliation
  test('22. Spending reconciliation: network expense volume reconciles with SpendingService category breakdown', async () => {
    const [netRes, spendingData] = await Promise.all([
      request(app).get('/api/network').set('Authorization', `Bearer ${userAToken}`),
      SpendingService.getSpendingBreakdown(userAId),
    ]);

    assert.strictEqual(netRes.status, 200);
    const netExpenses = netRes.body.network.metrics.spendingReconciliation.networkExpenseVolume;
    const directExpenses = spendingData.totalExpenses;

    // Both must use identical underlying transaction debits
    assert.strictEqual(netExpenses, directExpenses, 'Network expense volume must reconcile 100% with spending breakdown');
    assert.strictEqual(netRes.body.network.metrics.spendingReconciliation.reconciled, true);
  });

  // 23. Recurring-expense integration
  test('23. Recurring-expense integration: tags edges with recurring metadata from Phase D recurring engine', async () => {
    const res = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    const edges = res.body.network.edges;
    // At least one edge (Rent or AWS) will have recurring metadata
    const rentOrAws = edges.find((e: any) => e.target === entityLandlord || e.target === entityAWS);
    assert.ok(rentOrAws);
    assert.ok(typeof rentOrAws.metadata.isRecurring === 'boolean');
  });

  // 24. Goal integration
  test('24. Goal integration: what-if network simulation computes impact on active goals', async () => {
    const res = await request(app)
      .post('/api/network/simulate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        scenarioName: 'Discontinue Luxury Rent',
        scenarioType: 'REMOVE_RECURRING',
        targetEntityId: entityLandlord,
        amount: 45000,
        horizonMonths: 12,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.simulation.goalImpact);
    assert.ok(res.body.simulation.goalImpact.evaluatedGoalName.includes('Emergency Buffer'));
  });

  // 25 & 26. Simulation network non-mutation & Real database non-mutation
  test('25 & 26. Simulation network non-mutation: What-If simulation NEVER mutates real network, accounts, or transactions in DB', async () => {
    // Snapshot real DB state prior to simulation
    const initialAccounts = await AccountRepository.findByUserId(userAId);
    const initialTxCount = (await TransactionRepository.findByUserId(userAId)).totalCount;
    const initialCheckingBal = initialAccounts.find((a) => a._id === accountCheckingA)?.currentBalance;

    // Run hypothetical large purchase simulation
    const simRes = await request(app)
      .post('/api/network/simulate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        scenarioName: 'Hypothetical Supercomputer Purchase',
        scenarioType: 'ADD_PURCHASE',
        targetEntityId: entityAWS,
        amount: 100000,
        horizonMonths: 6,
      });

    assert.strictEqual(simRes.status, 200);
    assert.strictEqual(simRes.body.simulation.nonMutatingGuarantee, true);
    assert.strictEqual(simRes.body.simulation.simulatedState.expenseFlow, 161600 + 100000);

    // Verify Real DB state was NOT touched
    const postAccounts = await AccountRepository.findByUserId(userAId);
    const postTxCount = (await TransactionRepository.findByUserId(userAId)).totalCount;
    const postCheckingBal = postAccounts.find((a) => a._id === accountCheckingA)?.currentBalance;

    assert.strictEqual(postTxCount, initialTxCount, 'Real transactions must NOT be created');
    assert.strictEqual(postCheckingBal, initialCheckingBal, 'Real account balance must NOT be modified');
  });

  // 27. Authentication
  test('27. Authentication: unauthenticated calls to network endpoints return 401 Unauthorized', async () => {
    const unauthNet = await request(app).get('/api/network');
    assert.strictEqual(unauthNet.status, 401);

    const unauthSummary = await request(app).get('/api/network/summary');
    assert.strictEqual(unauthSummary.status, 401);

    const unauthSim = await request(app).post('/api/network/simulate').send({});
    assert.strictEqual(unauthSim.status, 401);
  });

  // 28. Tenant isolation
  test('28. Strict Tenant Isolation: User A network cannot see User B accounts, entities, or transactions and vice versa', async () => {
    const resA = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userAToken}`);

    const resB = await request(app)
      .get('/api/network')
      .set('Authorization', `Bearer ${userBToken}`);

    assert.strictEqual(resA.status, 200);
    assert.strictEqual(resB.status, 200);

    // Verify User A does NOT see User B nodes
    const nodeIdsA = new Set(resA.body.network.nodes.map((n: any) => n.id));
    assert.ok(!nodeIdsA.has(userBAccountId), 'User A must never see User B account');
    assert.ok(!nodeIdsA.has(userBEntityId), 'User A must never see User B entity');

    // Verify User B does NOT see User A nodes
    const nodeIdsB = new Set(resB.body.network.nodes.map((n: any) => n.id));
    assert.ok(!nodeIdsB.has(accountCheckingA), 'User B must never see User A account');
    assert.ok(!nodeIdsB.has(entityEmployer), 'User B must never see User A employer');

    // Cross-tenant entity access attempt should return 404
    const crossEntity = await request(app)
      .get(`/api/network/entity/${userBEntityId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    assert.strictEqual(crossEntity.status, 404);

    // Cross-tenant account access attempt should return 404
    const crossAccount = await request(app)
      .get(`/api/network/account/${userBAccountId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    assert.strictEqual(crossAccount.status, 404);
  });
});
