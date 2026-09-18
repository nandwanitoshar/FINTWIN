import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Sliders,
  Info,
  Zap,
} from 'lucide-react';

export interface MonthlyProjectionItem {
  month: number;
  monthLabel: string;
  startingBalance: number;
  income: number;
  expenses: number;
  debtService: number;
  savings: number;
  endingBalance: number;
  runwayMonths: number | null;
}

export interface ProjectionData {
  hasHistoricalData: boolean;
  baseline: MonthlyProjectionItem[];
  simulated: MonthlyProjectionItem[];
  summary: {
    startingBalance: number;
    baselineEndingBalance: number;
    simulatedEndingBalance: number;
    difference: number;
    lowestSimulatedBalance: number;
    solvencyBreached: boolean;
    affordabilityRating: 'LOW IMPACT' | 'MODERATE IMPACT' | 'HIGH IMPACT';
    explanation: string;
  };
  assumptions: string[];
  dataLineage: {
    activeMonthsCount: number;
    totalTransactionsCount: number;
    accountsCount: number;
    baseIncome: number;
    baseExpenses: number;
    baseDebtService: number;
  };
}

interface FinancialProjectionSectionProps {
  projection: ProjectionData | null;
  currencySymbol: string;
  onSimulate?: (params: any) => void;
  isLoading?: boolean;
}

export const FinancialProjectionSection: React.FC<FinancialProjectionSectionProps> = ({
  projection,
  currencySymbol,
  onSimulate,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'BASELINE' | 'SIMULATED'>('SIMULATED');

  // Interactive scenario controls state
  const [purchaseAmount, setPurchaseAmount] = useState('70000');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'EMI'>('EMI');
  const [emiMonths, setEmiMonths] = useState('6');
  const [annualRate, setAnnualRate] = useState('14');
  const [recurringExpense, setRecurringExpense] = useState('0');
  const [incomeChange, setIncomeChange] = useState('0');

  const handleApplyScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSimulate) {
      onSimulate({
        purchaseAmount: parseFloat(purchaseAmount) || 0,
        paymentMode,
        emiMonths: parseInt(emiMonths, 10) || 6,
        annualRate: parseFloat(annualRate) || 14,
        recurringExpense: parseFloat(recurringExpense) || 0,
        incomeChange: parseFloat(incomeChange) || 0,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="card-glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>Calculating 12-month deterministic projection...</p>
      </div>
    );
  }

  if (!projection || !projection.baseline || projection.baseline.length === 0) {
    return null;
  }

  const activeSeries = activeTab === 'SIMULATED' ? projection.simulated : projection.baseline;

  // Chart max value calculation
  const allBalances = [
    ...projection.baseline.map((m) => m.endingBalance),
    ...projection.simulated.map((m) => m.endingBalance),
    projection.summary.startingBalance,
  ];
  const maxBalance = Math.max(...allBalances, 10000);

  // SVG dimensions for 12-month dual projection chart
  const chartWidth = 640;
  const chartHeight = 180;
  const padX = 40;
  const padY = 25;
  const usableWidth = chartWidth - padX * 2;
  const usableHeight = chartHeight - padY * 2;

  const getX = (idx: number) => padX + (idx / 11) * usableWidth;
  const getY = (val: number) => padY + (1 - Math.max(0, val) / maxBalance) * usableHeight;

  const baselinePoints = projection.baseline.map((m, i) => `${getX(i)},${getY(m.endingBalance)}`).join(' ');
  const simulatedPoints = projection.simulated.map((m, i) => `${getX(i)},${getY(m.endingBalance)}`).join(' ');

  return (
    <div className="card-glass" style={{ padding: '1.75rem', marginBottom: '2.5rem', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="var(--color-accent-bright)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
              12-Month Financial Projection
            </h2>
            <span className="badge" style={{ background: 'rgba(108, 140, 255, 0.15)', color: 'var(--color-accent-bright)', fontSize: '0.72rem', fontWeight: 700 }}>
              Deterministic Recurrence
            </span>
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Month-by-month balance trajectory: Baseline run-rate vs Prospective decision scenario
          </p>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('SIMULATED')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: activeTab === 'SIMULATED' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'SIMULATED' ? '#fff' : 'var(--color-text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            Simulated Decision
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BASELINE')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: activeTab === 'BASELINE' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'BASELINE' ? '#fff' : 'var(--color-text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            Baseline Run-Rate
          </button>
        </div>
      </div>

      {/* Comparison Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Starting Liquid
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-accent-bright)' }}>
            {currencySymbol}{projection.summary.startingBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Current verified reserves
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Baseline 12M Ending
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#00E5A3' }}>
            {currencySymbol}{projection.summary.baselineEndingBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Without new commitments
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Simulated 12M Ending
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: projection.summary.simulatedEndingBalance < projection.summary.baselineEndingBalance ? '#F59E0B' : '#00E5A3',
            }}
          >
            {currencySymbol}{projection.summary.simulatedEndingBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Net Delta: {projection.summary.difference >= 0 ? '+' : ''}{currencySymbol}{projection.summary.difference.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Affordability Verdict
          </div>
          <div style={{ marginTop: '0.3rem' }}>
            <span
              className="badge"
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                background:
                  projection.summary.affordabilityRating === 'HIGH IMPACT'
                    ? 'rgba(239,68,68,0.2)'
                    : projection.summary.affordabilityRating === 'MODERATE IMPACT'
                    ? 'rgba(245,158,11,0.2)'
                    : 'rgba(0,229,163,0.2)',
                color:
                  projection.summary.affordabilityRating === 'HIGH IMPACT'
                    ? '#EF4444'
                    : projection.summary.affordabilityRating === 'MODERATE IMPACT'
                    ? '#F59E0B'
                    : '#00E5A3',
              }}
            >
              {projection.summary.affordabilityRating}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', lineHeight: 1.3 }}>
            {projection.summary.explanation}
          </div>
        </div>
      </div>

      {/* Interactive Scenario Parameters Form */}
      <form
        onSubmit={handleApplyScenario}
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Sliders size={15} color="var(--color-accent-bright)" />
            <span>Simulate What-If Decision On 12-Month Trajectory</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Real-time prospective calculation • Zero database mutation
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
              Purchase Amount ({currencySymbol})
            </label>
            <input
              type="number"
              min="0"
              step="5000"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              <option value="EMI">Financed EMI</option>
              <option value="CASH">Full Upfront Cash</option>
            </select>
          </div>

          {paymentMode === 'EMI' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                  EMI Tenor
                </label>
                <select
                  value={emiMonths}
                  onChange={(e) => setEmiMonths(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                  <option value="24">24 Months</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Interest Rate (APR %)
                </label>
                <input
                  type="number"
                  min="0"
                  max="36"
                  step="0.5"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
              Monthly Expense Delta ({currencySymbol})
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={recurringExpense}
              onChange={(e) => setRecurringExpense(e.target.value)}
              placeholder="+0"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
              Income Delta ({currencySymbol})
            </label>
            <input
              type="number"
              step="1000"
              value={incomeChange}
              onChange={(e) => setIncomeChange(e.target.value)}
              placeholder="+0"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
              }}
            >
              <Zap size={14} />
              <span>Update Projection</span>
            </button>
          </div>
        </div>
      </form>

      {/* Interactive Dual-Trajectory SVG Chart */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Trajectory Chart: Ending Balance Over 12 Months
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '12px', height: '3px', background: '#00E5A3', borderRadius: '2px' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Baseline Run-Rate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '12px', height: '3px', background: '#8B5CF6', borderRadius: '2px' }} />
              <span style={{ color: '#A78BFA', fontWeight: 600 }}>Simulated Decision</span>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', minWidth: '540px', height: 'auto', display: 'block' }}>
            {/* Grid lines */}
            <line x1={padX} y1={padY} x2={chartWidth - padX} y2={padY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1={padX} y1={padY + usableHeight / 2} x2={chartWidth - padX} y2={padY + usableHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1={padX} y1={chartHeight - padY} x2={chartWidth - padX} y2={chartHeight - padY} stroke="rgba(255,255,255,0.12)" />

            {/* Baseline Polyline */}
            <polyline
              fill="none"
              stroke="#00E5A3"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={baselinePoints}
            />

            {/* Simulated Polyline */}
            <polyline
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={simulatedPoints}
            />

            {/* Data Circles & Month Labels */}
            {projection.simulated.map((m, i) => (
              <g key={m.month}>
                <circle cx={getX(i)} cy={getY(m.endingBalance)} r="3.5" fill="#8B5CF6" />
                <circle cx={getX(i)} cy={getY(projection.baseline[i].endingBalance)} r="3" fill="#00E5A3" />
                <text
                  x={getX(i)}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize="9.5"
                  fontWeight="600"
                >
                  M{m.month}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Month-by-Month Projection Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={15} color="var(--color-accent-bright)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Month-by-Month Breakdown ({activeTab === 'SIMULATED' ? 'Simulated Decision' : 'Baseline Run-Rate'})
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            12-Month Deterministic Ledger Schedule
          </span>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.65rem 0.8rem' }}>Month</th>
                <th style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>Starting Balance</th>
                <th style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>Income</th>
                <th style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>Expenses</th>
                <th style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>Debt / EMI</th>
                <th style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>Monthly Savings</th>
                <th style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>Ending Balance</th>
                <th style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>Runway</th>
              </tr>
            </thead>
            <tbody>
              {activeSeries.map((m) => (
                <tr key={m.month} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.65rem 0.8rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                        M{m.month}
                      </span>
                      <span>{m.monthLabel}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem 0.8rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                    {currencySymbol}{m.startingBalance.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.65rem 0.8rem', textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }}>
                    +{currencySymbol}{m.income.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.65rem 0.8rem', textAlign: 'right', color: 'var(--color-danger)' }}>
                    -{currencySymbol}{m.expenses.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.65rem 0.8rem', textAlign: 'right', color: m.debtService > 0 ? '#F59E0B' : 'var(--color-text-muted)' }}>
                    {m.debtService > 0 ? `-${currencySymbol}${m.debtService.toLocaleString()}` : '₹0'}
                  </td>
                  <td
                    style={{
                      padding: '0.65rem 0.8rem',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: m.savings >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    {m.savings >= 0 ? '+' : ''}{currencySymbol}{m.savings.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.65rem 0.8rem', textAlign: 'right', fontWeight: 800, color: '#fff' }}>
                    {currencySymbol}{m.endingBalance.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.65rem 0.8rem', textAlign: 'right' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: (m.runwayMonths || 0) < 3 ? '#EF4444' : (m.runwayMonths || 0) < 6 ? '#F59E0B' : '#00E5A3',
                      }}
                    >
                      {m.runwayMonths !== null ? `${m.runwayMonths}m` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assumptions & Historical Derivations */}
      {projection.assumptions && projection.assumptions.length > 0 && (
        <div style={{ marginTop: '1.5rem', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            <Info size={13} color="var(--color-accent-bright)" />
            <span>Documented Assumptions & Mathematical Proof</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {projection.assumptions.map((asm, idx) => (
              <li key={idx}>{asm}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
