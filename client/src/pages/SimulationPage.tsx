import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Sliders,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Clock,
  Calendar,
  Layers,
  AlertTriangle,
  GitCompare,
  Coins,
  CreditCard,
  PiggyBank,
} from 'lucide-react';
import { AffordabilityEvidenceSection } from '../components/AffordabilityEvidenceSection';

export const SimulationPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const scenarioIdParam = searchParams.get('id');
  const accountIdParam = searchParams.get('accountId');

  const currencySymbol =
    user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';

  // Live Digital Twin baseline state
  const [twin, setTwin] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoadingTwin, setIsLoadingTwin] = useState<boolean>(true);

  // Active scenario type mode
  const [scenarioMode, setScenarioMode] = useState<
    'PURCHASE' | 'LOAN_EMI' | 'RECURRING_EXPENSE' | 'INCOME_CHANGE' | 'SAVINGS' | 'COMPARE'
  >('PURCHASE');

  // Input states
  const [scenarioName, setScenarioName] = useState('Prospective Decision Simulation');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [horizonMonths, setHorizonMonths] = useState<number>(12);

  // Purchase inputs
  const [purchaseAmount, setPurchaseAmount] = useState<number>(70000);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'EMI'>('CASH');
  const [purchaseCategory, setPurchaseCategory] = useState<string>('Electronics');
  const [purchaseDescription, setPurchaseDescription] = useState<string>('MacBook Pro Setup');

  // Loan/EMI inputs
  const [loanPrincipal, setLoanPrincipal] = useState<number>(60000);
  const [emiTenure, setEmiTenure] = useState<number>(6);
  const [emiApr, setEmiApr] = useState<number>(14);
  const [processingFee, setProcessingFee] = useState<number>(0);

  // Recurring / Income inputs
  const [recurringAmount, setRecurringAmount] = useState<number>(5000);
  const [recurringCategory, setRecurringCategory] = useState<string>('Subscriptions');
  const [incomeChangeAmount, setIncomeChangeAmount] = useState<number>(10000);
  const [incomeDirection, setIncomeDirection] = useState<'INFLOW' | 'OUTFLOW'>('INFLOW');

  // Comparison mode inputs
  const [comparePrice, setComparePrice] = useState<number>(70000);
  const [compareDelayMonths, setCompareDelayMonths] = useState<number>(3);
  const [compareCheaperPrice, setCompareCheaperPrice] = useState<number>(50000);
  const [comparisonResults, setComparisonResults] = useState<any>(null);

  // Simulation output state
  const [results, setResults] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeChartMetric, setActiveChartMetric] = useState<'liquidReserves' | 'netWorth' | 'runwayMonths' | 'dtiPercent'>(
    'liquidReserves'
  );

  // Load Digital Twin & Accounts baseline
  useEffect(() => {
    let isMounted = true;
    async function fetchBaseline() {
      setIsLoadingTwin(true);
      try {
        const [twinRes, accRes, goalsRes] = await Promise.all([
          api.twin.get().catch(() => null),
          api.accounts.list().catch(() => null),
          api.goals.list().catch(() => null),
        ]);

        if (isMounted) {
          if (twinRes?.success && twinRes.twin) {
            setTwin(twinRes.twin);
          }
          if (accRes?.success && accRes.accounts) {
            setAccounts(accRes.accounts);
            if (accountIdParam) {
              setSelectedAccountId(accountIdParam);
            } else if (accRes.accounts.length > 0) {
              const primary = accRes.accounts.find((a: any) => a.isLiquid) || accRes.accounts[0];
              setSelectedAccountId(primary._id);
            }
          }
          if (goalsRes?.success && goalsRes.goals) {
            setGoals(goalsRes.goals);
          }
        }
      } catch (err: any) {
        console.error('Failed to load baseline twin:', err);
      } finally {
        if (isMounted) setIsLoadingTwin(false);
      }
    }
    fetchBaseline();
    return () => {
      isMounted = false;
    };
  }, [accountIdParam]);

  // Load specific scenario from URL query param if present
  useEffect(() => {
    if (!scenarioIdParam) return;
    const targetId: string = scenarioIdParam;
    async function loadArchivedScenario(id: string) {
      try {
        const res = await api.simulation.getById(id);
        if (res.success && res.scenario) {
          const sc = res.scenario;
          setScenarioName(sc.scenarioName);
          setResults(sc.results);
          if (sc.results?.scenario?.type) {
            setScenarioMode(sc.results.scenario.type as any);
          }
        }
      } catch (err: any) {
        console.error('Failed to load scenario by ID:', err);
      }
    }
    loadArchivedScenario(targetId);
  }, [scenarioIdParam]);

  // Presets
  const applyPreset = (presetKey: string) => {
    setErrorMsg(null);
    if (presetKey === 'laptop_cash') {
      setScenarioMode('PURCHASE');
      setScenarioName('Buy ₹70,000 Laptop (Upfront Cash)');
      setPurchaseAmount(70000);
      setPaymentMode('CASH');
      setPurchaseCategory('Technology');
      setPurchaseDescription('MacBook Pro M3');
    } else if (presetKey === 'laptop_emi') {
      setScenarioMode('LOAN_EMI');
      setScenarioName('Finance ₹70,000 Laptop (6m EMI @ 14%)');
      setLoanPrincipal(70000);
      setEmiTenure(6);
      setEmiApr(14);
      setProcessingFee(1000);
    } else if (presetKey === 'subscription_recurring') {
      setScenarioMode('RECURRING_EXPENSE');
      setScenarioName('Add ₹5,000/mo Cloud & SaaS Stack');
      setRecurringAmount(5000);
      setRecurringCategory('Software & Subscriptions');
    } else if (presetKey === 'salary_raise') {
      setScenarioMode('INCOME_CHANGE');
      setScenarioName('Career Appraisal (+₹15,000/mo)');
      setIncomeChangeAmount(15000);
      setIncomeDirection('INFLOW');
    } else if (presetKey === 'compare_laptop') {
      setScenarioMode('COMPARE');
      setComparePrice(70000);
      setCompareDelayMonths(3);
      setCompareCheaperPrice(50000);
    }
  };

  // Run Simulation
  const executeSimulation = useCallback(async () => {
    setIsSimulating(true);
    setErrorMsg(null);

    try {
      if (scenarioMode === 'COMPARE') {
        const compRes = await api.simulation.compare({
          purchaseAmount: comparePrice,
          currency: user?.currency || 'INR',
          targetAccountId: selectedAccountId || undefined,
          delayMonths: compareDelayMonths,
          cheaperAmount: compareCheaperPrice,
          description: purchaseDescription || 'Major Capital Decision',
        });

        if (compRes.success && compRes.comparison) {
          setComparisonResults(compRes.comparison);
          setResults(compRes.comparison.buyNow);
        } else {
          setErrorMsg(compRes.message || 'Comparison failed.');
        }
      } else if (scenarioMode === 'PURCHASE') {
        if (paymentMode === 'CASH') {
          const res = await api.simulation.run({
            scenarioType: 'PURCHASE',
            scenarioName,
            amount: purchaseAmount,
            currency: user?.currency || 'INR',
            targetAccountId: selectedAccountId || undefined,
            category: purchaseCategory,
            description: purchaseDescription,
            horizonMonths,
          });
          if (res.success && res.results) {
            setResults(res.results);
          } else {
            setErrorMsg(res.message || 'Simulation failed.');
          }
        } else {
          // Loan / EMI
          const res = await api.simulation.run({
            scenarioType: 'LOAN_EMI',
            scenarioName: `${scenarioName} (EMI Plan)`,
            principal: purchaseAmount,
            annualRate: emiApr,
            tenureMonths: emiTenure,
            processingFee,
            currency: user?.currency || 'INR',
            targetAccountId: selectedAccountId || undefined,
            description: purchaseDescription,
            horizonMonths,
          });
          if (res.success && res.results) {
            setResults(res.results);
          } else {
            setErrorMsg(res.message || 'Simulation failed.');
          }
        }
      } else if (scenarioMode === 'LOAN_EMI') {
        const res = await api.simulation.run({
          scenarioType: 'LOAN_EMI',
          scenarioName,
          principal: loanPrincipal,
          annualRate: emiApr,
          tenureMonths: emiTenure,
          processingFee,
          currency: user?.currency || 'INR',
          targetAccountId: selectedAccountId || undefined,
          description: purchaseDescription,
          horizonMonths,
        });
        if (res.success && res.results) {
          setResults(res.results);
        } else {
          setErrorMsg(res.message || 'Simulation failed.');
        }
      } else if (scenarioMode === 'RECURRING_EXPENSE') {
        const res = await api.simulation.run({
          scenarioType: 'RECURRING_EXPENSE',
          scenarioName,
          amount: recurringAmount,
          currency: user?.currency || 'INR',
          category: recurringCategory,
          horizonMonths,
        });
        if (res.success && res.results) {
          setResults(res.results);
        } else {
          setErrorMsg(res.message || 'Simulation failed.');
        }
      } else if (scenarioMode === 'INCOME_CHANGE') {
        const res = await api.simulation.run({
          scenarioType: 'INCOME_CHANGE',
          scenarioName,
          amount: incomeChangeAmount,
          direction: incomeDirection,
          currency: user?.currency || 'INR',
          horizonMonths,
        });
        if (res.success && res.results) {
          setResults(res.results);
        } else {
          setErrorMsg(res.message || 'Simulation failed.');
        }
      } else if (scenarioMode === 'SAVINGS') {
        const res = await api.simulation.run({
          scenarioType: 'SAVINGS_CONTRIBUTION',
          scenarioName,
          amount: recurringAmount,
          targetAccountId: selectedAccountId || undefined,
          currency: user?.currency || 'INR',
          horizonMonths,
        });
        if (res.success && res.results) {
          setResults(res.results);
        } else {
          setErrorMsg(res.message || 'Simulation failed.');
        }
      }
    } catch (err: any) {
      console.error('Simulation execution error:', err);
      setErrorMsg(err.message || 'Simulation request failed. Check parameters and try again.');
    } finally {
      setIsSimulating(false);
    }
  }, [
    scenarioMode,
    scenarioName,
    purchaseAmount,
    paymentMode,
    purchaseCategory,
    purchaseDescription,
    loanPrincipal,
    emiTenure,
    emiApr,
    processingFee,
    recurringAmount,
    recurringCategory,
    incomeChangeAmount,
    incomeDirection,
    comparePrice,
    compareDelayMonths,
    compareCheaperPrice,
    selectedAccountId,
    horizonMonths,
    user?.currency,
  ]);

  // Initial execution on mount
  useEffect(() => {
    if (!scenarioIdParam && accounts.length > 0) {
      executeSimulation();
    }
  }, [accounts.length, executeSimulation, scenarioIdParam]);

  const before = results?.before;
  const after = results?.after;
  const impact = results?.impact;
  const deltas = results?.deltas || { netWorthDelta: 0, liquidDelta: 0, runwayDeltaMonths: 0, monthlyCashflowDelta: 0, dtiDelta: 0 };
  const baselineSeries = results?.baselineSeries || [];
  const simulatedSeries = results?.simulatedSeries || [];
  const timeline = results?.timeline || [];
  const explanations = results?.explanations || [];
  const assumptions = results?.assumptions || [];
  const signalsTriggered = results?.signalsTriggered || [];

  // Compute SVG Chart bounds
  const maxMetricVal = Math.max(
    1,
    ...baselineSeries.map((p: any) => p[activeChartMetric] || 0),
    ...simulatedSeries.map((p: any) => p[activeChartMetric] || 0)
  );

  return (
    <div className="container" style={{ padding: '2.5rem 1rem', maxWidth: '1280px' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div className="badge badge-accent" style={{ marginBottom: '0.5rem' }}>
            Pipeline Stage 05: SIMULATE (What-If Lab)
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, margin: 0 }}>
            What happens to your financial world if...?
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.4rem' }}>
            Deterministic prospective scenario modeling. Backed 100% by your real connected Digital Twin.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to="/history" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} />
            <span>Simulation Archive</span>
          </Link>
          <button
            onClick={executeSimulation}
            disabled={isSimulating}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {isSimulating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>Run Simulation</span>
          </button>
        </div>
      </div>

      {/* Scenario Mode Switcher Bar */}
      <div
        className="card-glass"
        style={{
          padding: '0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          alignItems: 'center',
        }}
      >
        {[
          { id: 'PURCHASE', label: 'Purchase Decision', icon: Coins },
          { id: 'LOAN_EMI', label: 'Loan / EMI Plan', icon: CreditCard },
          { id: 'COMPARE', label: 'Buy Now vs Later', icon: GitCompare },
          { id: 'RECURRING_EXPENSE', label: 'Recurring Expense', icon: Layers },
          { id: 'INCOME_CHANGE', label: 'Income Shock / Growth', icon: TrendingUp },
          { id: 'SAVINGS', label: 'Savings Contribution', icon: PiggyBank },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = scenarioMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setScenarioMode(item.id as any);
                if (item.id === 'COMPARE') applyPreset('compare_laptop');
                else if (item.id === 'PURCHASE') applyPreset('laptop_cash');
                else if (item.id === 'LOAN_EMI') applyPreset('laptop_emi');
              }}
              className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                padding: '0.5rem 0.9rem',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Presets Carousel */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Sparkles size={14} color="var(--color-accent-bright)" />
          Quick Presets:
        </span>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => applyPreset('laptop_cash')}>
          💻 ₹70k Laptop (Cash)
        </button>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => applyPreset('laptop_emi')}>
          💳 ₹70k Laptop (6m EMI @ 14%)
        </button>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => applyPreset('compare_laptop')}>
          ⚖️ Buy Now vs Wait 3m vs ₹50k
        </button>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => applyPreset('subscription_recurring')}>
          📦 +₹5k/mo Subscriptions
        </button>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => applyPreset('salary_raise')}>
          🚀 +₹15k/mo Salary Raise
        </button>
      </div>

      {/* Error / Alert notice if any */}
      {errorMsg && (
        <div
          className="card-glass"
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <AlertTriangle size={20} color="var(--color-danger)" />
          <span style={{ fontSize: '0.9rem', color: 'var(--color-danger)' }}>{errorMsg}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px minmax(0, 1fr)',
          gap: '2rem',
          alignItems: 'start',
        }}
        className="simulation-layout-responsive"
      >
        {/* Left Column: Scenario Input & Real State Snapshot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Real Financial Baseline Snapshot Panel */}
          <div className="card-glass" style={{ padding: '1.25rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-cyan)', fontWeight: 600 }}>
                Live Digital Twin Baseline
              </div>
              <Link to="/financial-twin" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Inspect Twin →
              </Link>
            </div>

            {isLoadingTwin ? (
              <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading verified Digital Twin...
              </div>
            ) : accounts.length === 0 ? (
              <div style={{ padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No accounts detected. <Link to="/onboarding" style={{ color: 'var(--color-accent-bright)' }}>Add your accounts</Link> to anchor prospective simulations.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Liquid Reserves</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {currencySymbol}{Math.round(twin?.stateVector?.liquidReserves || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Monthly Burn</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                    {currencySymbol}{Math.round(twin?.metrics?.monthlyBurn || 0).toLocaleString()}/mo
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Net Worth</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success)' }}>
                    {currencySymbol}{Math.round(twin?.stateVector?.netWorth || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Runway</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent-bright)' }}>
                    {twin?.stateVector?.runwayMonths ? `${twin.stateVector.runwayMonths} mos` : 'Surplus'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scenario Input Parameters Form */}
          <div className="card-glass" style={{ padding: '1.5rem' }}>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.15rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Sliders size={18} color="var(--color-accent-bright)" />
              <span>Configure Scenario Parameters</span>
            </h3>

            {/* Scenario Name */}
            <div className="form-group">
              <label className="form-label">Scenario Label</label>
              <input
                type="text"
                className="form-input"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
              />
            </div>

            {/* Target Account Selector */}
            {accounts.length > 0 && (
              <div className="form-group">
                <label className="form-label">Target Account</label>
                <select
                  className="form-input"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({currencySymbol}{Math.round(acc.currentBalance ?? acc.balance ?? 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode-specific parameter controls */}
            {scenarioMode === 'PURCHASE' && (
              <>
                <div className="form-group">
                  <label className="form-label">Purchase Outlay ({currencySymbol})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    step="5000"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${paymentMode === 'CASH' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPaymentMode('CASH')}
                    >
                      Upfront Cash
                    </button>
                    <button
                      type="button"
                      className={`btn ${paymentMode === 'EMI' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPaymentMode('EMI')}
                    >
                      Loan / EMI
                    </button>
                  </div>
                </div>

                {paymentMode === 'EMI' && (
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="form-group">
                      <label className="form-label">Tenure: {emiTenure} Months</label>
                      <input
                        type="range"
                        min="3"
                        max="36"
                        step="3"
                        value={emiTenure}
                        onChange={(e) => setEmiTenure(parseInt(e.target.value, 10))}
                        style={{ width: '100%', accentColor: 'var(--color-accent-bright)' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Annual Rate (APR %)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={emiApr}
                        onChange={(e) => setEmiApr(Math.max(0, parseFloat(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {scenarioMode === 'LOAN_EMI' && (
              <>
                <div className="form-group">
                  <label className="form-label">Loan Principal ({currencySymbol})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                    step="5000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tenure: {emiTenure} Months</label>
                  <input
                    type="range"
                    min="3"
                    max="60"
                    step="3"
                    value={emiTenure}
                    onChange={(e) => setEmiTenure(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: 'var(--color-accent-bright)' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">APR %</label>
                    <input
                      type="number"
                      className="form-input"
                      value={emiApr}
                      onChange={(e) => setEmiApr(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Processing Fee ({currencySymbol})</label>
                    <input
                      type="number"
                      className="form-input"
                      value={processingFee}
                      onChange={(e) => setProcessingFee(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
              </>
            )}

            {scenarioMode === 'COMPARE' && (
              <>
                <div className="form-group">
                  <label className="form-label">Buy Now Outlay ({currencySymbol})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={comparePrice}
                    onChange={(e) => setComparePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    step="5000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Defer By: {compareDelayMonths} Months</label>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    step="1"
                    value={compareDelayMonths}
                    onChange={(e) => setCompareDelayMonths(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: 'var(--color-accent-bright)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cheaper Alternative ({currencySymbol})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={compareCheaperPrice}
                    onChange={(e) => setCompareCheaperPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    step="5000"
                  />
                </div>
              </>
            )}

            {scenarioMode === 'RECURRING_EXPENSE' && (
              <div className="form-group">
                <label className="form-label">Monthly Outflow ({currencySymbol})</label>
                <input
                  type="number"
                  className="form-input"
                  value={recurringAmount}
                  onChange={(e) => setRecurringAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  step="1000"
                />
              </div>
            )}

            {scenarioMode === 'INCOME_CHANGE' && (
              <>
                <div className="form-group">
                  <label className="form-label">Monthly Income Delta ({currencySymbol})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={incomeChangeAmount}
                    onChange={(e) => setIncomeChangeAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    step="5000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Direction</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${incomeDirection === 'INFLOW' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setIncomeDirection('INFLOW')}
                    >
                      + Income Gain
                    </button>
                    <button
                      type="button"
                      className={`btn ${incomeDirection === 'OUTFLOW' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setIncomeDirection('OUTFLOW')}
                    >
                      - Income Reduction
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Projection Horizon */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Projection Horizon</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                {[6, 12, 24, 36].map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`btn ${horizonMonths === h ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.82rem', padding: '0.35rem' }}
                    onClick={() => setHorizonMonths(h)}
                  >
                    {h} Mo
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={executeSimulation}
              disabled={isSimulating}
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                marginTop: '1rem',
              }}
            >
              {isSimulating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{scenarioMode === 'COMPARE' ? 'Run Scenario Comparison' : 'Run Virtual Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Before vs After, Comparison Table & Trajectory Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Factual Risk / Boundary Warning Signals */}
          {signalsTriggered.length > 0 && (
            <div>
              {signalsTriggered.map((sig: any, idx: number) => (
                <div
                  key={idx}
                  className="card-glass"
                  style={{
                    padding: '1rem 1.25rem',
                    borderLeft: `4px solid ${sig.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <ShieldAlert
                    size={22}
                    color={sig.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)'}
                  />
                  <div>
                    <strong
                      style={{
                        color: sig.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)',
                        fontSize: '0.95rem',
                      }}
                    >
                      {sig.title} (Month {sig.month})
                    </strong>
                    <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                      {sig.explanation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Before vs After Impact Comparison Cards */}
          {before && after && impact && (
            <div className="card-glass" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Before vs Projected State Impact
                </h3>
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                  Exact Integer Paise Arithmetic
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                {/* Liquid Reserves Delta */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Liquid Reserves
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                      {currencySymbol}{Math.round(after.liquidReserves).toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: impact.balanceChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                      }}
                    >
                      {impact.balanceChange >= 0 ? '+' : ''}{currencySymbol}{Math.round(impact.balanceChange).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', marginTop: '0.3rem' }}>
                    Baseline: {currencySymbol}{Math.round(before.liquidReserves).toLocaleString()}
                  </div>
                </div>

                {/* Net Worth Delta */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Net Worth
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                      {currencySymbol}{Math.round(after.netWorth).toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: impact.netWorthChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                      }}
                    >
                      {impact.netWorthChange >= 0 ? '+' : ''}{currencySymbol}{Math.round(impact.netWorthChange).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', marginTop: '0.3rem' }}>
                    Baseline: {currencySymbol}{Math.round(before.netWorth).toLocaleString()}
                  </div>
                </div>

                {/* Runway Delta */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Emergency Runway
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                      {after.runwayMonths !== null ? `${after.runwayMonths} mos` : 'Surplus'}
                    </span>
                    {impact.runwayChangeMonths !== null && (
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: impact.runwayChangeMonths >= 0 ? 'var(--color-success)' : 'var(--color-warning)',
                        }}
                      >
                        {impact.runwayChangeMonths >= 0 ? '+' : ''}{impact.runwayChangeMonths}m
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', marginTop: '0.3rem' }}>
                    Baseline: {before.runwayMonths !== null ? `${before.runwayMonths} mos` : 'Surplus'}
                  </div>
                </div>

                {/* Monthly Cash Flow Delta */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Monthly Cash Flow
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                      {currencySymbol}{Math.round(after.netCashFlow).toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: impact.cashFlowChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                      }}
                    >
                      {impact.cashFlowChange >= 0 ? '+' : ''}{currencySymbol}{Math.round(impact.cashFlowChange).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', marginTop: '0.3rem' }}>
                    Baseline: {currencySymbol}{Math.round(before.netCashFlow).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Plain-Language Explanations */}
              {explanations.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.015)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    Impact Summary & Causal Analysis:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {explanations.map((exp: string, i: number) => (
                      <li key={i}>{exp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Scenario Comparison Table (When in COMPARE mode) */}
          {scenarioMode === 'COMPARE' && comparisonResults && (
            <div className="card-glass" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Scenario Diff: Buy Now vs Buy Later vs Cheaper Alternative
                </h3>
                <span className="badge badge-accent">Neutral Factual Diff</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.88rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Evaluation Dimension</th>
                      <th style={{ textAlign: 'left', color: 'var(--color-accent-bright)' }}>BUY NOW</th>
                      <th style={{ textAlign: 'left', color: '#10b981' }}>BUY LATER ({compareDelayMonths}m)</th>
                      <th style={{ textAlign: 'left', color: '#f59e0b' }}>CHEAPER OPTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResults.comparisonMetrics.map((row: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>
                          <div>{row.dimension}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)' }}>{row.description}</div>
                        </td>
                        <td>{row.buyNow}</td>
                        <td>{row.buyLater}</td>
                        <td>{row.cheaperOption}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Time Series Comparative Trajectory Visualizer */}
          <div className="card-glass" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Prospective Trajectory Comparison
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Solid line = Baseline Twin · Dashed line = Simulated Scenario
                </p>
              </div>

              {/* Metric Switcher */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {(['liquidReserves', 'netWorth', 'runwayMonths', 'dtiPercent'] as const).map((metric) => (
                  <button
                    key={metric}
                    className={`btn ${activeChartMetric === metric ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => setActiveChartMetric(metric)}
                  >
                    {metric === 'liquidReserves'
                      ? 'Liquid Cash'
                      : metric === 'netWorth'
                      ? 'Net Worth'
                      : metric === 'runwayMonths'
                      ? 'Runway'
                      : 'DTI %'}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Trajectory Chart */}
            <div style={{ width: '100%', height: '240px', position: 'relative' }}>
              <svg viewBox="0 0 700 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <line x1="40" y1="30" x2="680" y2="30" stroke="rgba(255,255,255,0.06)" />
                <line x1="40" y1="100" x2="680" y2="100" stroke="rgba(255,255,255,0.06)" />
                <line x1="40" y1="170" x2="680" y2="170" stroke="rgba(255,255,255,0.06)" />

                {/* Baseline Polyline */}
                {baselineSeries.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="var(--color-accent-bright)"
                    strokeWidth="2.5"
                    points={baselineSeries
                      .map((p: any, i: number) => {
                        const x = 50 + (i / (baselineSeries.length - 1)) * 620;
                        const val = p[activeChartMetric] || 0;
                        const y = 180 - (val / maxMetricVal) * 140;
                        return `${x},${Math.max(20, Math.min(190, y))}`;
                      })
                      .join(' ')}
                  />
                )}

                {/* Simulated Polyline */}
                {simulatedSeries.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={deltas.liquidDelta >= 0 ? '#10b981' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    points={simulatedSeries
                      .map((p: any, i: number) => {
                        const x = 50 + (i / (simulatedSeries.length - 1)) * 620;
                        const val = p[activeChartMetric] || 0;
                        const y = 180 - (val / maxMetricVal) * 140;
                        return `${x},${Math.max(20, Math.min(190, y))}`;
                      })
                      .join(' ')}
                  />
                )}

                {/* Month Dots and Labels */}
                {simulatedSeries.map((p: any, i: number) => {
                  const x = 50 + (i / (simulatedSeries.length - 1)) * 620;
                  const val = p[activeChartMetric] || 0;
                  const y = Math.max(20, Math.min(190, 180 - (val / maxMetricVal) * 140));

                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="3.5" fill={deltas.liquidDelta >= 0 ? '#10b981' : '#ef4444'} />
                      <text x={x} y="205" fill="var(--color-text-subtle)" fontSize="10" textAnchor="middle">
                        M{p.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '16px', height: '3px', background: 'var(--color-accent-bright)', borderRadius: '2px' }} />
                <span>Baseline Twin Trajectory</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '16px', height: '3px', background: deltas.liquidDelta >= 0 ? '#10b981' : '#ef4444', borderTop: '2px dashed' }} />
                <span>Simulated Scenario Trajectory</span>
              </div>
            </div>
          </div>

          {/* Month-by-Month Simulation Timeline Ledger (Requirement 27) */}
          {timeline.length > 0 && (
            <div className="card-glass" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Deterministic Monthly Timeline Ledger
                </h4>
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                  {timeline.length}-Month Horizon
                </span>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Month</th>
                      <th style={{ textAlign: 'right' }}>Starting Balance</th>
                      <th style={{ textAlign: 'right' }}>Income</th>
                      <th style={{ textAlign: 'right' }}>Expenses</th>
                      <th style={{ textAlign: 'right' }}>Debt / EMI</th>
                      <th style={{ textAlign: 'right' }}>Monthly Savings</th>
                      <th style={{ textAlign: 'right' }}>Ending Balance</th>
                      <th style={{ textAlign: 'right' }}>Runway</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((row: any, i: number) => {
                      const startingBal = i === 0 ? (before?.liquidReserves || before?.totalBalance || 0) : timeline[i - 1].balance;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{row.monthLabel}</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                            {currencySymbol}{Math.round(startingBal).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>
                            +{currencySymbol}{Math.round(row.income).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-warning)' }}>
                            -{currencySymbol}{Math.round(row.expenses).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', color: row.emiBurden > 0 ? 'var(--color-danger)' : 'var(--color-text-subtle)' }}>
                            {row.emiBurden > 0 ? `-${currencySymbol}${Math.round(row.emiBurden).toLocaleString()}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: row.netCashFlow >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {row.netCashFlow >= 0 ? '+' : ''}{currencySymbol}{Math.round(row.netCashFlow).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: row.balance <= 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                            {currencySymbol}{Math.round(row.balance).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {row.runwayMonths !== null ? `${row.runwayMonths} mos` : 'Surplus'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Documented Assumptions & Mathematical Determinism Proof */}
          <div
            className="card-glass"
            style={{
              padding: '1.25rem',
              borderLeft: '4px solid var(--color-cyan)',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Calendar size={18} color="var(--color-cyan)" />
              <strong style={{ fontSize: '0.95rem' }}>Documented Assumptions & Mathematical Proof</strong>
            </div>
            {assumptions.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                {assumptions.map((asm: string, i: number) => (
                  <li key={i}>{asm}</li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Calculations strictly follow Standard Loan Amortization M = P · [r(1+r)ⁿ] / [(1+r)ⁿ - 1] and discrete balance recurrence. Zero stochastic sampling.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── GOAL IMPACT & AFFORDABILITY SUITE ─── */}
      <div style={{ marginTop: '2.5rem' }}>
        <AffordabilityEvidenceSection
          goals={goals}
          currencySymbol={currencySymbol}
          initialAmount={purchaseAmount || 50000}
        />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .simulation-layout-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
