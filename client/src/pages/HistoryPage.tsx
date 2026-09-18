import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Trash2,
  ShieldAlert,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Activity,
  Filter,
  Database,
  Info,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

// â”€â”€â”€ Scenario Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ScenarioDetailModal: React.FC<{
  scenario: any;
  currencySymbol: string;
  onClose: () => void;
  onRunAgain: (s: any) => void;
}> = ({ scenario, currencySymbol, onClose, onRunAgain }) => {
  const res = scenario.results || {};
  const deltas = res.deltas || res.summaryDeltas || {};
  const signals = res.signalsTriggered || [];
  const baselineSeries = res.baselineSeries || [];
  const simulatedSeries = res.simulatedSeries || [];

  const lastBaseline = baselineSeries[baselineSeries.length - 1] || {};
  const lastSimulated = simulatedSeries[simulatedSeries.length - 1] || {};

  const netWorthDelta = deltas.netWorthDelta || deltas.netWorthChange || 0;
  const runwayDelta = deltas.runwayMonthsDelta ?? deltas.runwayDeltaMonths ?? deltas.runwayChangeMonths ?? 0;
  const cashflowDelta = deltas.monthlyCashflowDelta || deltas.cashFlowChange || 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '2rem 1rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="card-glass"
        style={{
          width: '100%',
          maxWidth: '780px',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '18px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div className="badge badge-accent" style={{ marginBottom: '0.35rem', fontSize: '0.7rem' }}>
              Simulation Scenario Detail
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
              {scenario.scenarioName}
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              <Calendar size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              {new Date(scenario.createdAt).toLocaleString()} â€¢ Horizon: {scenario.horizonMonths || 12} months
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* INPUTS Section */}
          <section>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-accent-bright)',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              Simulation Inputs
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {scenario.incomeDelta !== 0 && (
                <div className="card" style={{ padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Income Change
                  </div>
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: scenario.incomeDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    {scenario.incomeDelta >= 0 ? '+' : ''}{currencySymbol}{Math.abs(scenario.incomeDelta).toLocaleString()}/mo
                  </div>
                </div>
              )}
              {scenario.expenseDelta !== 0 && (
                <div className="card" style={{ padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Expense Change
                  </div>
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: scenario.expenseDelta >= 0 ? 'var(--color-danger)' : 'var(--color-success)',
                    }}
                  >
                    {scenario.expenseDelta >= 0 ? '+' : ''}{currencySymbol}{Math.abs(scenario.expenseDelta).toLocaleString()}/mo
                  </div>
                </div>
              )}
              {scenario.lumpSumEvents?.length > 0 && (
                <div className="card" style={{ padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Lump Sum Events
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{scenario.lumpSumEvents.length} event(s)</div>
                  {scenario.lumpSumEvents.slice(0, 2).map((ev: any, i: number) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                      Mo {ev.month}: {currencySymbol}{ev.amount?.toLocaleString()} â€” {ev.description}
                    </div>
                  ))}
                </div>
              )}
              {scenario.newEmiEvents?.length > 0 && (
                <div className="card" style={{ padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    New EMI Loans
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{scenario.newEmiEvents.length} loan(s)</div>
                  {scenario.newEmiEvents.slice(0, 2).map((ev: any, i: number) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                      {currencySymbol}{ev.principal?.toLocaleString()} @ {ev.annualRate}% â€” {ev.tenureMonths}mo
                    </div>
                  ))}
                </div>
              )}
              {scenario.incomeDelta === 0 && scenario.expenseDelta === 0 && !scenario.lumpSumEvents?.length && !scenario.newEmiEvents?.length && (
                <div className="card" style={{ padding: '0.85rem', gridColumn: '1/-1' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    Scenario inputs were derived from real account data. Specific scenario type parameters are embedded in the results.
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* BASELINE vs SIMULATED IMPACT */}
          <section>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              Simulated Impact (vs Baseline)
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div className="card" style={{ padding: '0.85rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Î” Net Worth
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: netWorthDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                  }}
                >
                  {netWorthDelta >= 0 ? '+' : ''}{currencySymbol}{Math.round(netWorthDelta).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginTop: '0.15rem' }}>
                  Hypothetical â€” not real record
                </div>
              </div>
              <div className="card" style={{ padding: '0.85rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Î” Monthly Cashflow
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: cashflowDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                  }}
                >
                  {cashflowDelta >= 0 ? '+' : ''}{currencySymbol}{Math.round(cashflowDelta).toLocaleString()}/mo
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginTop: '0.15rem' }}>
                  Hypothetical â€” not real record
                </div>
              </div>
              <div className="card" style={{ padding: '0.85rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Î” Runway
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: runwayDelta >= 0 ? 'var(--color-success)' : 'var(--color-warning)',
                  }}
                >
                  {runwayDelta >= 0 ? '+' : ''}{Math.round(runwayDelta)} mos
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginTop: '0.15rem' }}>
                  Emergency runway change
                </div>
              </div>
              {lastBaseline.netWorth !== undefined && (
                <div className="card" style={{ padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    12-Mo Baseline Net Worth
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {currencySymbol}{Math.round(lastBaseline.netWorth).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginTop: '0.15rem' }}>
                    From real historical data
                  </div>
                </div>
              )}
              {lastSimulated.netWorth !== undefined && (
                <div className="card" style={{ padding: '0.85rem', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-accent-bright)', textTransform: 'uppercase' }}>
                    12-Mo Simulated Net Worth
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent-bright)' }}>
                    {currencySymbol}{Math.round(lastSimulated.netWorth).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginTop: '0.15rem' }}>
                    Hypothetical â€” not real record
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Risk Signals Triggered */}
          {signals.length > 0 && (
            <section>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-danger)',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                }}
              >
                Risk Signals Triggered in Scenario
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {signals.map((sig: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(239,68,68,0.07)',
                      border: '1px solid rgba(239,68,68,0.18)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <ShieldAlert size={14} color="var(--color-danger)" />
                    <span style={{ fontWeight: 600 }}>{sig.title || sig.code}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>â€” Month {sig.month}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Disclaimer */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.2)',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <Info size={14} color="var(--color-accent-bright)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <span>
              This scenario is <strong style={{ color: 'var(--color-accent-bright)' }}>hypothetical and non-binding</strong>. 
              No real financial records were modified. The simulation runs in-memory using your verified historical data as a baseline.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <button onClick={onClose} className="btn btn-ghost">
            Close
          </button>
          <button
            onClick={() => onRunAgain(scenario)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RotateCcw size={14} />
            Run Again (New Scenario)
          </button>
          <Link
            to={`/simulation?id=${scenario._id}`}
            className="btn btn-primary"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Sparkles size={14} />
            Open in Simulation Lab
          </Link>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ Transaction Activity Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CATEGORY_COLORS: Record<string, string> = {
  Income: 'var(--color-success)',
  Salary: 'var(--color-success)',
  Groceries: '#F59E0B',
  Food: '#F59E0B',
  Rent: '#EF4444',
  Utilities: '#8B5CF6',
  Transport: '#06B6D4',
  Entertainment: '#EC4899',
  Healthcare: '#10B981',
  Insurance: '#6366F1',
  Education: '#F97316',
  Travel: '#14B8A6',
  Shopping: '#A855F7',
  Investment: '#22C55E',
};

// â”€â”€â”€ Main HistoryPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currencySymbol =
    user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? 'â‚¬' : user?.currency === 'GBP' ? 'Â£' : 'â‚¹';

  // Tabs
  const [activeTab, setActiveTab] = useState<'scenarios' | 'activity'>('scenarios');

  // Scenario state
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [isScenariosLoading, setIsScenariosLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<any | null>(null);

  // Transaction activity state
  const [txList, setTxList] = useState<any[]>([]);
  const [isTxLoading, setIsTxLoading] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txType, setTxType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadScenarios = useCallback(async () => {
    setIsScenariosLoading(true);
    try {
      const res = await api.simulation.getHistory();
      if (res.success && Array.isArray(res.scenarios)) {
        setScenarios(res.scenarios);
      } else {
        setScenarios([]);
      }
    } catch (err: any) {
      console.error('Failed to load simulation history:', err);
      setScenarios([]);
    } finally {
      setIsScenariosLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    if (txLoaded) return;
    setIsTxLoading(true);
    try {
      const res = await api.transactions.list({ limit: 500 });
      if (res.success && Array.isArray(res.transactions)) {
        setTxList(res.transactions);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsTxLoading(false);
      setTxLoaded(true);
    }
  }, [txLoaded]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  useEffect(() => {
    if (activeTab === 'activity') {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this simulation scenario from your archive? This will NOT delete any accounts, transactions, or real financial records.')) return;
    setDeletingId(id);
    try {
      await api.simulation.delete(id);
      setScenarios((prev) => prev.filter((s) => s._id !== id));
    } catch (err: any) {
      console.error('Failed to delete scenario:', err);
      alert('Could not delete scenario. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRunAgain = (scenario: any) => {
    // Navigate to simulation lab with prefill params â€” runs as new scenario
    const params = new URLSearchParams();
    params.set('rerun', '1');
    if (scenario.scenarioName) params.set('name', `${scenario.scenarioName} (Re-run)`);
    if (scenario.incomeDelta) params.set('incomeDelta', String(scenario.incomeDelta));
    if (scenario.expenseDelta) params.set('expenseDelta', String(scenario.expenseDelta));
    setSelectedScenario(null);
    navigate(`/simulation?${params.toString()}`);
  };

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    let list = [...txList];
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (txSearch) {
      const q = txSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          String(t.amount).includes(q) ||
          (t.merchant || '').toLowerCase().includes(q)
      );
    }
    if (txCategory) list = list.filter((t) => t.category === txCategory);
    if (txType) list = list.filter((t) => t.type === txType);
    return list;
  }, [txList, txSearch, txCategory, txType]);

  const txCategories = useMemo(() => {
    return Array.from(new Set(txList.map((t) => t.category).filter(Boolean))).sort();
  }, [txList]);

  return (
    <div className="container" style={{ padding: '2.5rem 1rem', maxWidth: '1100px' }}>
      {/* Scenario Detail Modal */}
      {selectedScenario && (
        <ScenarioDetailModal
          scenario={selectedScenario}
          currencySymbol={currencySymbol}
          onClose={() => setSelectedScenario(null)}
          onRunAgain={handleRunAgain}
        />
      )}

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
            Financial History &amp; Scenario Archive
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, margin: 0 }}>
            History
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.4rem' }}>
            Chronological activity, saved simulation scenarios, and archived financial decisions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => {
              loadScenarios();
              setTxLoaded(false);
            }}
            disabled={isScenariosLoading || isTxLoading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={isScenariosLoading || isTxLoading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
          <Link to="/simulation" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={15} />
            <span>New Simulation</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '1.75rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          padding: '0.25rem',
          border: '1px solid rgba(255,255,255,0.07)',
          width: 'fit-content',
        }}
      >
        {[
          { id: 'scenarios', label: 'Scenario Archive', icon: Sparkles },
          { id: 'activity', label: 'Transaction Activity', icon: Activity },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              background: activeTab === id ? 'var(--color-accent)' : 'transparent',
              color: activeTab === id ? 'white' : 'var(--color-text-muted)',
            }}
          >
            <Icon size={15} />
            {label}
            {id === 'scenarios' && scenarios.length > 0 && (
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  padding: '0.05rem 0.45rem',
                  fontWeight: 700,
                }}
              >
                {scenarios.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* â”€â”€ SCENARIO ARCHIVE TAB â”€â”€ */}
      {activeTab === 'scenarios' && (
        <>
          {isScenariosLoading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '0.75rem' }} />
              <div>Loading archived scenarios...</div>
            </div>
          ) : scenarios.length === 0 ? (
            <div
              className="card-glass"
              style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                border: '1px dashed var(--color-border)',
              }}
            >
              <Clock size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                No Saved Scenarios Yet
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                Run prospective what-if simulations in the Simulation Lab. Every simulation you run is safely archived here without altering your real accounts.
              </p>
              <Link to="/simulation" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} />
                <span>Run Your First Simulation</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {scenarios.map((scenario) => {
                const res = scenario.results || {};
                const deltas = res.deltas || res.summaryDeltas || {};
                const signals = res.signalsTriggered || [];
                const netDelta = deltas.netWorthDelta || deltas.netWorthChange || 0;
                const runwayDelta = deltas.runwayMonthsDelta ?? deltas.runwayDeltaMonths ?? deltas.runwayChangeMonths ?? 0;
                const cashflowDelta = deltas.monthlyCashflowDelta || deltas.cashFlowChange || 0;

                return (
                  <div
                    key={scenario._id}
                    className="card-glass"
                    style={{
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onClick={() => setSelectedScenario(scenario)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-accent)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <div style={{ minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
                          {scenario.horizonMonths || 12}-Month Horizon
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Calendar size={12} />
                          {new Date(scenario.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                        {scenario.scenarioName}
                      </h3>

                      {signals.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            marginTop: '0.4rem',
                            color: 'var(--color-danger)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <ShieldAlert size={14} />
                          <span>{signals[0].title || 'Risk Boundary Triggered'}</span>
                        </div>
                      )}
                    </div>

                    {/* Metrics */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Î” Net Worth</div>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: netDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                          }}
                        >
                          {netDelta >= 0 ? '+' : ''}{currencySymbol}{Math.round(netDelta).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Î” Runway</div>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: runwayDelta >= 0 ? 'var(--color-success)' : 'var(--color-warning)',
                          }}
                        >
                          {runwayDelta >= 0 ? '+' : ''}{Math.round(runwayDelta)} mos
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Î” Cashflow</div>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: cashflowDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                          }}
                        >
                          {cashflowDelta >= 0 ? '+' : ''}{currencySymbol}{Math.round(cashflowDelta).toLocaleString()}/mo
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedScenario(scenario);
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                        >
                          View Detail
                        </button>
                        <button
                          onClick={(e) => handleDeleteScenario(scenario._id, e)}
                          disabled={deletingId === scenario._id}
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem', color: 'var(--color-text-subtle)' }}
                          title="Delete Scenario"
                          aria-label="Delete scenario"
                        >
                          <Trash2 size={16} color="var(--color-danger)" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* â”€â”€ TRANSACTION ACTIVITY TAB â”€â”€ */}
      {activeTab === 'activity' && (
        <>
          {/* Filters bar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Database
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '2.2rem',
                    paddingRight: '0.75rem',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Filter size={14} />
                Filters
                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showFilters && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  marginTop: '0.75rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All Categories</option>
                  {txCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All Types</option>
                  <option value="CREDIT">Credit</option>
                  <option value="DEBIT">Debit</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
                {(txCategory || txType) && (
                  <button
                    onClick={() => {
                      setTxCategory('');
                      setTxType('');
                    }}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                  >
                    <X size={13} style={{ marginRight: '0.3rem' }} />
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {isTxLoading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '0.75rem' }} />
              <div>Loading transaction history...</div>
            </div>
          ) : txList.length === 0 ? (
            <div
              className="card-glass"
              style={{ padding: '3.5rem 1.5rem', textAlign: 'center', border: '1px dashed var(--color-border)' }}
            >
              <Activity size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                No Financial Activity Recorded Yet
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                Add transactions or import bank statements to see your chronological financial activity here.
              </p>
              <Link to="/transactions" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Database size={16} />
                Go to Transactions
              </Link>
            </div>
          ) : filteredTxs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              No transactions match your filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              <div
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                {filteredTxs.length} transaction{filteredTxs.length !== 1 ? 's' : ''} â€” sorted newest first
              </div>
              {filteredTxs.map((tx, idx) => {
                const isCredit = tx.type === 'CREDIT' || tx.type === 'INCOME';
                const catColor = CATEGORY_COLORS[tx.category] || 'var(--color-text-muted)';
                const txDate = tx.date ? new Date(tx.date) : null;
                return (
                  <div
                    key={tx._id || idx}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => navigate(`/transactions?id=${tx._id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: isCredit ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '0.9rem',
                        }}
                      >
                        {isCredit ? 'â†‘' : 'â†“'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '260px',
                          }}
                        >
                          {tx.merchant || tx.description}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.05)',
                              color: catColor,
                              fontWeight: 600,
                            }}
                          >
                            {tx.category}
                          </span>
                          {txDate && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                              {txDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: isCredit ? 'var(--color-success)' : 'var(--color-text-primary)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {isCredit ? '+' : '-'}{currencySymbol}{tx.amount?.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

