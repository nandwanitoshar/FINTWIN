/**
 * IntelligenceReportPage.tsx
 * Phase 6 — 07 OUTPUT: Consolidated Financial Intelligence Report
 *
 * Provides a unified, judge-ready, print-friendly intelligence report
 * aggregating verified financial state across Accounts, Transactions, Entities,
 * Digital Twin, Network, Simulation, and Risk Signals.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Printer,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Sparkles,
  Info,
  CheckCircle,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export const IntelligenceReportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedExplainId, setExpandedExplainId] = useState<string | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.report.get();
      if (res.success && res.report) {
        setReport(res.report);
      } else {
        setError(res.message || 'Unable to retrieve financial intelligence report.');
      }
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err.message || 'Error connecting to intelligence reporting service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '₹0';
    const sym = user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';
    return `${sym}${Math.abs(val).toLocaleString('en-IN')}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '3rem 1rem', maxWidth: '1100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <div style={{ width: '220px', height: '28px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', marginBottom: '8px' }} />
            <div style={{ width: '340px', height: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
          </div>
          <div style={{ width: '120px', height: '38px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '110px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }} />
          ))}
        </div>
        <div style={{ height: '280px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '700px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--color-critical)' }}>
          <AlertTriangle size={36} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Unable to Compile Intelligence Report</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
          {error || 'Financial intelligence engine could not aggregate system state.'}
        </p>
        <button onClick={fetchReport} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Retry Generation
        </button>
      </div>
    );
  }

  const {
    snapshot,
    digitalTwin,
    cashFlow,
    riskSignals,
    explainability,
    simulationResults,
    decisionComparison,
    networkInsight,
    dataQuality,
    limitations,
    generatedAt,
  } = report;

  const hasZeroData = snapshot.accountCount === 0 && snapshot.transactionCount === 0;

  return (
    <div className="container" style={{ padding: '2.5rem 1rem 5rem', maxWidth: '1180px' }}>
      {/* Top Controls & Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-accent" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Phase 6 Consolidated Output
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Generated: {new Date(generatedAt).toLocaleString()}
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Financial Intelligence Report
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginTop: '0.35rem', maxWidth: '680px' }}>
            System-level audit aggregating real accounts, counterparty topology, cash flow velocity, prospective simulations, and explainable risk signals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}>
            <Printer size={15} /> Export / Print
          </button>
          <button onClick={fetchReport} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Empty State Banner if user has 0 records */}
      {hasZeroData && (
        <div className="card" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)', marginBottom: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Info size={20} color="var(--color-warning)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-warning)' }}>
              Baseline Records Required
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            No accounts or transactions have been imported into this profile yet. Report metrics reflect zero baseline. Import records or connect an account to activate full multi-hop intelligence.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <Link to="/transactions" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              Import Transactions
            </Link>
            <Link to="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
              Add Account
            </Link>
          </div>
        </div>
      )}

      {/* ─── SECTION 01: FINANCIAL SNAPSHOT ─── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-bright)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Section 01 — Financial Snapshot
            </h2>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Currency: {snapshot.currency}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Total Balance
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-bright)' }}>
              {formatCurrency(snapshot.totalBalance)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Across {snapshot.accountCount} verified {snapshot.accountCount === 1 ? 'account' : 'accounts'}
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Net Worth
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: snapshot.netWorth >= 0 ? 'var(--color-success)' : 'var(--color-critical)' }}>
              {formatCurrency(snapshot.netWorth)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Assets {formatCurrency(snapshot.totalAssets)} - Liab {formatCurrency(snapshot.totalLiabilities)}
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Total Inflow / Outflow
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>
                +{formatCurrency(snapshot.totalIncome)}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>/</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-critical)' }}>
                -{formatCurrency(snapshot.totalExpenses)}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Net Flow: <strong style={{ color: snapshot.netCashFlow >= 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {snapshot.netCashFlow >= 0 ? '+' : ''}{formatCurrency(snapshot.netCashFlow)}
              </strong>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Data Coverage
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{snapshot.transactionCount}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '3px' }}>txs</span>
              </div>
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{snapshot.entityCount}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '3px' }}>entities</span>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              {snapshot.accountCount} depository & liability hubs
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 02: DIGITAL TWIN STATE ─── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00E5A3' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Section 02 — Digital Twin State
            </h2>
          </div>
          <Link to="/network" style={{ fontSize: '0.85rem', color: 'var(--color-accent-bright)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', fontWeight: 600 }}>
            Open Financial Network <ArrowRight size={14} />
          </Link>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Connected Nodes</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>{digitalTwin.connectedNodes}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Directed Relationships</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>{digitalTwin.relationships}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Account Nodes</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>{digitalTwin.accounts}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Counterparty Entities</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>{digitalTwin.entities}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Network Volume</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--color-accent-bright)' }}>
                {formatCurrency(digitalTwin.networkVolume)}
              </div>
            </div>
          </div>

          {/* Mini Topology Preview */}
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
                Active Topology Snapshot
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {digitalTwin.miniGraph.nodes.length} nodes · {digitalTwin.miniGraph.links.length} directed links
              </span>
            </div>

            {digitalTwin.miniGraph.nodes.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No active topology links detected. Add accounts or import transactions to initialize graph nodes.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                {digitalTwin.miniGraph.nodes.map((node: any) => (
                  <div
                    key={node.id}
                    onClick={() => navigate(node.type === 'ACCOUNT' ? '/financial-twin' : '/entities')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.4rem 0.75rem',
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${node.type === 'ACCOUNT' ? 'rgba(108,140,255,0.3)' : 'rgba(0,229,163,0.3)'}`,
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                    }}
                    title={`Click to inspect ${node.label}`}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: node.color }} />
                    <span style={{ fontWeight: 600 }}>{node.label}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>({node.type})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── SECTION 03: CASH FLOW ─── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Section 03 — Cash Flow & Distribution
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Monthly Trend / Insufficient Notice */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Historical Cash Flow Trajectory
            </h3>
            {cashFlow.trendAvailable ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cashFlow.monthlyTrend.map((m: any) => (
                  <div key={m.monthKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{m.monthLabel}</span>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>+{formatCurrency(m.income)}</span>
                      <span style={{ color: 'var(--color-critical)', fontSize: '0.85rem' }}>-{formatCurrency(m.expenses)}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: m.net >= 0 ? 'var(--color-success)' : 'var(--color-warning)', minWidth: '70px', textAlign: 'right' }}>
                        {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <Clock size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Insufficient historical data for trend analysis.
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.35rem' }}>
                  At least 2 distinct active monthly periods are required to compute reliable cash flow velocity.
                </span>
              </div>
            )}
          </div>

          {/* Major Expense & Income Distributions */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Outflow Concentration
            </h3>
            {cashFlow.majorExpenseCategories.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No expense transactions recorded.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cashFlow.majorExpenseCategories.map((c: any) => (
                  <div key={c.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>{c.category}</span>
                      <span>{formatCurrency(c.amount)} ({c.percentage}%)</span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, c.percentage)}%`, background: c.percentage > 40 ? 'var(--color-critical)' : 'var(--color-accent-bright)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cashFlow.majorIncomeSources.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.6rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Primary Inflow Source
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600 }}>{cashFlow.majorIncomeSources[0].source}</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                    {formatCurrency(cashFlow.majorIncomeSources[0].amount)} ({cashFlow.majorIncomeSources[0].percentage}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── SECTION 04: RISK SIGNAL SUMMARY ─── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-critical)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Section 04 — Risk Signal Summary
            </h2>
          </div>
          <Link to="/risk-signals" style={{ fontSize: '0.85rem', color: 'var(--color-accent-bright)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', fontWeight: 600 }}>
            Open Risk Sentinel <ArrowRight size={14} />
          </Link>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Analytical Indicator Status
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem', color: riskSignals.activeSignalsCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {riskSignals.activeSignalsCount} Active {riskSignals.activeSignalsCount === 1 ? 'Signal' : 'Signals'} Detected
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {riskSignals.statement}
              </span>
            </div>

            {/* Severity Distribution Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map((sev) => {
                const cnt = riskSignals.severityDistribution[sev] || 0;
                const badgeColor =
                  sev === 'CRITICAL' ? 'var(--color-critical)' : sev === 'HIGH' ? 'var(--color-warning)' : sev === 'MEDIUM' ? '#3B82F6' : 'var(--color-text-muted)';
                return (
                  <span
                    key={sev}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${cnt > 0 ? badgeColor : 'rgba(255,255,255,0.08)'}`,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: cnt > 0 ? badgeColor : 'var(--color-text-muted)',
                    }}
                  >
                    {sev}: {cnt}
                  </span>
                );
              })}
            </div>
          </div>

          {/* List of observed signals */}
          {riskSignals.signals.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px' }}>
              <CheckCircle size={20} color="var(--color-success)" />
              <span style={{ fontSize: '0.88rem', color: 'var(--color-success)', fontWeight: 600 }}>
                No active risk signals detected from available financial history.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {riskSignals.signals.map((sig: any) => (
                <div
                  key={sig.id}
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${sig.severity === 'CRITICAL' ? 'var(--color-critical)' : sig.severity === 'HIGH' ? 'var(--color-warning)' : 'var(--color-accent-bright)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{sig.title}</span>
                      <span className={`badge ${sig.severity === 'CRITICAL' ? 'badge-critical' : sig.severity === 'HIGH' ? 'badge-warning' : 'badge-accent'}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                        {sig.severity}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                      {sig.summary}
                    </p>
                  </div>
                  <Link
                    to="/risk-signals"
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
                  >
                    View Evidence →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 05: EXPLAINABILITY ("Explain This Analysis") ─── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-bright)' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Section 05 — Explainable Intelligence Audit
          </h2>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Every flagged insight adheres to the 5 explainability questions: what was observed, why it was flagged, supporting empirical data, the underlying calculation, and known systemic limitations.
          </p>

          {explainability.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No critical systemic anomalies flagged for explanation in the current period.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {explainability.map((item: any) => {
                const isExpanded = expandedExplainId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div
                      onClick={() => setExpandedExplainId(isExpanded ? null : item.id)}
                      style={{
                        padding: '0.85rem 1.15rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Sparkles size={16} color="var(--color-accent-bright)" />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</span>
                      </div>
                      <ChevronRight size={16} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} />
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            What Was Observed?
                          </div>
                          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>{item.whatWasObserved}</p>

                          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: '0.85rem', marginBottom: '0.25rem' }}>
                            Why Was It Flagged?
                          </div>
                          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>{item.whyWasItFlagged}</p>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            What Calculation Was Used?
                          </div>
                          <code style={{ display: 'block', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--color-accent-bright)', marginBottom: '0.85rem' }}>
                            {item.whatCalculationWasUsed}
                          </code>

                          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            Supporting Verified Data
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {item.whatDataSupportsIt.map((e: any, idx: number) => (
                              <span key={idx} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                                {e.field}: <strong>{e.value}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 06: SIMULATION RESULTS ─── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8B5CF6' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Section 06 — Simulation Results
            </h2>
          </div>
          <Link to="/simulation" style={{ fontSize: '0.85rem', color: 'var(--color-accent-bright)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', fontWeight: 600 }}>
            Launch Simulation Lab <ArrowRight size={14} />
          </Link>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          {simulationResults.hasSimulationHistory ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Factual multi-horizon impact projections computed from real baseline without modifying ledger state.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-muted)' }}>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Scenario</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Type</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Liquid Reserves Delta</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Net Worth Delta</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Runway Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationResults.recentScenarios.map((sc: any) => (
                      <tr key={sc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{sc.scenarioName}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>{sc.scenarioType}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: sc.liquidCashDelta < 0 ? 'var(--color-critical)' : 'var(--color-success)', fontWeight: 600 }}>
                          {sc.liquidCashDelta >= 0 ? '+' : ''}{formatCurrency(sc.liquidCashDelta)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: sc.netWorthDelta < 0 ? 'var(--color-critical)' : 'var(--color-success)', fontWeight: 600 }}>
                          {sc.netWorthDelta >= 0 ? '+' : ''}{formatCurrency(sc.netWorthDelta)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          {sc.runwayDeltaMonths !== null ? `${sc.runwayDeltaMonths >= 0 ? '+' : ''}${sc.runwayDeltaMonths} mos` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <Sliders size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                No prospective simulation scenarios executed yet.
              </p>
              <Link to="/simulation" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                Run Prospective What-If <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 07: DECISION COMPARISON ─── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Section 07 — Decision Comparison Matrix
          </h2>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          {decisionComparison.hasComparison && decisionComparison.comparisonMatrix ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Evaluated Capital Outlay: <strong>{formatCurrency(decisionComparison.comparisonMatrix.purchaseAmount)}</strong>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  Neutral comparative matrix — no subjective ranking
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {decisionComparison.comparisonMatrix.options.map((opt: any) => (
                  <div
                    key={opt.key}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', fontWeight: 700 }}>{opt.title}</h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 1rem', lineHeight: 1.4 }}>
                        {opt.description}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Capital Cost:</span>
                          <strong>{formatCurrency(opt.purchaseCost)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Liquid Cash Delta:</span>
                          <span style={{ color: opt.liquidCashImpact < 0 ? 'var(--color-critical)' : 'var(--color-text-main)', fontWeight: 600 }}>
                            {opt.liquidCashImpact < 0 ? '-' : ''}{formatCurrency(Math.abs(opt.liquidCashImpact))}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Net Worth Delta:</span>
                          <span style={{ color: opt.netWorthImpact < 0 ? 'var(--color-critical)' : 'var(--color-text-main)', fontWeight: 600 }}>
                            {opt.netWorthImpact < 0 ? '-' : ''}{formatCurrency(Math.abs(opt.netWorthImpact))}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Projected Runway:</span>
                          <span>{opt.runwayMonths !== null ? `${opt.runwayMonths} mos` : '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', color: 'var(--color-text-muted)' }}>
                      {opt.projectedState}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Run a What-If scenario in the Simulation Lab to generate multi-path decision matrices.
            </p>
          )}
        </div>
      </section>

      {/* ─── SECTION 08: FINANCIAL NETWORK INSIGHT ─── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Section 08 — Financial Network Insight
            </h2>
          </div>
          <Link to="/network" style={{ fontSize: '0.85rem', color: 'var(--color-accent-bright)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', fontWeight: 600 }}>
            Inspect Full Graph <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Major Connected Counterparties */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 1rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Top Connected Counterparties
            </h3>
            {networkInsight.majorConnectedEntities.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No connected entities detected in network.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {networkInsight.majorConnectedEntities.map((ent: any) => (
                  <div
                    key={ent.id}
                    onClick={() => navigate('/entities')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ent.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '0.4rem' }}>({ent.type})</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-accent-bright)' }}>
                      {formatCurrency(ent.volume)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connected Hub Accounts */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 1rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Primary Network Hubs
            </h3>
            {networkInsight.importantConnectedAccounts.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No account hubs initialized.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {networkInsight.importantConnectedAccounts.map((acc: any) => (
                  <div
                    key={acc.id}
                    onClick={() => navigate('/financial-twin')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{acc.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '0.4rem' }}>({acc.type})</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── SECTION 09: DATA QUALITY & COVERAGE ─── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748B' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Section 09 — Data Coverage & Reliability
          </h2>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Transactions Audited</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>{dataQuality.transactionsAvailable}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Accounts Verified</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>{dataQuality.accountsAvailable}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Entities Mapped</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>{dataQuality.entitiesAvailable}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Historical Span</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>{dataQuality.historicalPeriodMonths} mos</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Categorization Coverage</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem', color: dataQuality.categorizationCoveragePercent >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {dataQuality.categorizationCoveragePercent}%
              </div>
            </div>
          </div>

          {dataQuality.missingInformation.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Identified Coverage Gaps:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {dataQuality.missingInformation.map((gap: string, i: number) => (
                  <li key={i} style={{ marginBottom: '0.2rem' }}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 10: LIMITATIONS & SYSTEM BOUNDARIES ─── */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Section 10 — Systemic Limitations & Disclaimers
          </h2>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.5rem', background: 'rgba(0,0,0,0.25)' }}>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            {limitations.map((lim: string, idx: number) => (
              <li key={idx} style={{ marginBottom: '0.35rem' }}>{lim}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
