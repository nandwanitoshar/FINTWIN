/**
 * AnalysisPage.tsx
 * Phase 5 — Financial Intelligence Command Center
 *
 * Displays the full deterministic analysis: risk signals, summary metrics,
 * explainable reports, and evidence-based reasoning — all backed by real user data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Calculator,
  RefreshCw,
  Cpu,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Shield,
  Info,
  Zap,
  Activity,
  Target,
  BarChart2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SpendingBreakdownSection } from '../components/SpendingBreakdownSection';

// ─── Severity Config ────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', icon: <ShieldAlert size={16} color="#ef4444" /> },
  HIGH:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', icon: <AlertTriangle size={16} color="#f59e0b" /> },
  MEDIUM:   { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)', icon: <Zap size={16} color="#6366f1" /> },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', icon: <Info size={16} color="#10b981" /> },
  INFO:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.3)', icon: <Info size={16} color="#60a5fa" /> },
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  HIGH_EXPENSE_CONCENTRATION: 'Expense Concentration',
  RECURRING_EXPENSE_PRESSURE: 'Recurring Expense',
  INCOME_CONCENTRATION: 'Income Concentration',
  LIQUIDITY_PRESSURE: 'Liquidity Pressure',
  DEBT_BURDEN: 'Debt Burden',
  CASHFLOW_DECLINE: 'Cashflow Decline',
  UNUSUAL_TRANSACTION_PATTERN: 'Unusual Transaction',
  NETWORK_CONCENTRATION: 'Network Concentration',
};

// ─── Signal Card ─────────────────────────────────────────────────────────────
const SignalCard: React.FC<{
  signal: any;
  onAcknowledge: (id: string) => void;
  acknowledgedIds: Set<string>;
}> = ({ signal, onAcknowledge, acknowledgedIds }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[signal.severity] || SEVERITY_CONFIG.INFO;
  const acknowledged = acknowledgedIds.has(signal.id) || signal.status === 'ACKNOWLEDGED';

  return (
    <div
      id={`signal-${signal.id}`}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginBottom: '0.875rem',
        opacity: acknowledged ? 0.65 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
          {cfg.icon}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: cfg.border,
                  color: cfg.color,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                {signal.severity}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>
                {SIGNAL_TYPE_LABELS[signal.type] || signal.type}
              </span>
            </div>
            <div style={{ fontWeight: 600, color: '#f0f4ff', fontSize: '0.95rem', marginTop: '0.3rem' }}>
              {signal.title}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              {signal.summary}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {!acknowledged && (
            <button
              onClick={() => onAcknowledge(signal.id)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.4rem',
                color: 'rgba(255,255,255,0.65)',
                fontSize: '0.72rem',
                padding: '0.3rem 0.6rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <CheckCircle2 size={12} /> Dismiss
            </button>
          )}
          {acknowledged && (
            <span style={{ color: '#10b981', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle2 size={12} /> Dismissed
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '0.4rem',
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.72rem',
              padding: '0.3rem 0.6rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {expanded ? 'Hide' : 'Evidence'}
          </button>
        </div>
      </div>

      {/* Expanded Evidence */}
      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${cfg.border}` }}>
          {/* Explanation */}
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            {signal.explanation}
          </div>

          {/* Evidence Table */}
          {signal.evidence?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: cfg.color, fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                EVIDENCE
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.4rem',
                }}
              >
                {signal.evidence.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '0.4rem',
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>{item.field}</span>
                    <span style={{ color: '#f0f4ff', fontSize: '0.75rem', fontWeight: 600 }}>
                      {typeof item.value === 'number' ? item.value.toLocaleString('en-IN') : item.value}
                      {item.unit ? ` ${item.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {signal.recommendations?.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                RECOMMENDATIONS
              </div>
              {signal.recommendations.map((rec: string, idx: number) => (
                <div
                  key={idx}
                  style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}
                >
                  <span style={{ color: '#10b981', flexShrink: 0 }}>→</span> {rec}
                </div>
              ))}
            </div>
          )}

          {/* Limitations */}
          {signal.limitations?.length > 0 && (
            <div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.25rem', letterSpacing: '0.05em' }}>
                LIMITATIONS
              </div>
              {signal.limitations.map((lim: string, idx: number) => (
                <div key={idx} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <span>⚠</span> {lim}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AnalysisPage: React.FC = () => {
  const [signals, setSignals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [explainReport, setExplainReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [explainLoading, setExplainLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signals' | 'spending' | 'explain'>('signals');
  const [spendingData, setSpendingData] = useState<any | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [analysisRes, summaryRes, spendingRes] = await Promise.all([
        api.analysis.getFull(),
        api.analysis.getSummary(),
        api.analysis.getSpendingBreakdown().catch(() => null),
      ]);
      if (analysisRes.success && analysisRes.analysis?.signals) {
        setSignals(analysisRes.analysis.signals);
      }
      if (summaryRes.success && summaryRes.summary) {
        setSummary(summaryRes.summary);
      }
      if (spendingRes && spendingRes.success) {
        setSpendingData(spendingRes);
      }
    } catch (e: any) {
      setError('Failed to load analysis data. Ensure you have financial records in the system.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadExplainReport = useCallback(async () => {
    setExplainLoading(true);
    try {
      const res = await api.analysis.explain({ context: 'current' });
      if (res.success && res.analysis) {
        setExplainReport(res.analysis);
      }
    } catch {
      setExplainReport(null);
    } finally {
      setExplainLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'explain' && !explainReport) {
      loadExplainReport();
    }
  }, [activeTab, explainReport, loadExplainReport]);

  const handleAcknowledge = useCallback(async (id: string) => {
    try {
      await api.riskSignals.updateStatus(id, 'ACKNOWLEDGED');
      setAcknowledgedIds((prev) => new Set([...prev, id]));
    } catch {
      setAcknowledgedIds((prev) => new Set([...prev, id]));
    }
  }, []);

  // Filter signals
  const filteredSignals = signals.filter((s) => {
    if (selectedSeverity !== 'ALL' && s.severity !== selectedSeverity) return false;
    if (selectedType !== 'ALL' && s.type !== selectedType) return false;
    return true;
  });

  const signalTypes = [...new Set(signals.map((s) => s.type))];

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={18} color="white" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 'clamp(1.25rem, 3vw, 1.6rem)',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #f0f4ff 0%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                }}
              >
                Financial Intelligence
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
                06 ANALYZE — Deterministic Pattern Detection & Explainable Intelligence
              </p>
            </div>
          </div>
        </div>
        <button
          id="btn-refresh-analysis"
          onClick={() => { loadData(); if (activeTab === 'explain') loadExplainReport(); }}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '0.5rem',
            color: '#a78bfa',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Summary Metrics */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {[
            { label: 'Active Signals', value: summary.totalSignals, icon: <ShieldAlert size={18} />, color: summary.totalSignals > 0 ? '#f59e0b' : '#10b981' },
            { label: 'Health Score', value: `${Math.round(summary.healthScore)}/100`, icon: <Activity size={18} />, color: summary.healthScore >= 70 ? '#10b981' : summary.healthScore >= 40 ? '#f59e0b' : '#ef4444' },
            { label: 'Monthly Income', value: fmt(summary.monthlyIncome), icon: <TrendingUp size={18} />, color: '#10b981' },
            { label: 'Monthly Expenses', value: fmt(summary.monthlyExpenses), icon: <TrendingDown size={18} />, color: '#ef4444' },
            { label: 'Net Cash Flow', value: fmt(summary.netCashFlow), icon: summary.netCashFlow >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />, color: summary.netCashFlow >= 0 ? '#10b981' : '#ef4444' },
            { label: 'Liquidity Runway', value: `${summary.liquidityMonths?.toFixed(1)} mo`, icon: <Shield size={18} />, color: summary.liquidityMonths >= 3 ? '#10b981' : summary.liquidityMonths >= 1.5 ? '#f59e0b' : '#ef4444' },
          ].map((m, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.75rem',
                padding: '1rem',
              }}
            >
              <div style={{ color: m.color, marginBottom: '0.4rem' }}>{m.icon}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Severity Breakdown */}
      {summary?.signalsBySeverity && (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600 }}>SIGNAL SEVERITY</span>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map((sev) => {
            const count = summary.signalsBySeverity[sev] || 0;
            const cfg = SEVERITY_CONFIG[sev];
            return (
              <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {cfg.icon}
                <span style={{ color: cfg.color, fontWeight: 700, fontSize: '0.9rem' }}>{count}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{sev}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '1.5rem',
          gap: '0.25rem',
        }}
      >
        {([
          { id: 'signals', label: 'Risk Signals', icon: <ShieldAlert size={15} /> },
          { id: 'spending', label: 'Spending Analytics', icon: <BarChart2 size={15} /> },
          { id: 'explain', label: 'Explainable Report', icon: <Sparkles size={15} /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            id={`btn-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
              borderRadius: '0.375rem 0.375rem 0 0',
              color: activeTab === tab.id ? '#a78bfa' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
              fontSize: '0.88rem',
              padding: '0.75rem 1.25rem',
            }}
          >
            {tab.icon} {tab.label}
            {tab.id === 'signals' && signals.length > 0 && (
              <span
                style={{
                  background: '#f59e0b',
                  color: '#000',
                  borderRadius: '0.375rem',
                  padding: '0.05rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  marginLeft: '0.25rem',
                }}
              >
                {signals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '0.75rem',
            padding: '1rem',
            color: '#fca5a5',
            marginBottom: '1.5rem',
          }}
        >
          {error}{' '}
          <Link to="/transactions" style={{ color: '#f87171', fontWeight: 600 }}>
            Add transactions →
          </Link>
        </div>
      )}

      {/* SPENDING ANALYTICS TAB */}
      {activeTab === 'spending' && (
        <SpendingBreakdownSection data={spendingData} currencySymbol="₹" />
      )}

      {/* SIGNALS TAB */}
      {activeTab === 'signals' && (
        <div>
          {/* Filters */}
          {signals.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Filter:</span>
              {/* Severity Filter */}
              <select
                id="filter-severity"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '0.4rem',
                  color: '#f0f4ff',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Severities</option>
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                id="filter-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '0.4rem',
                  color: '#f0f4ff',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Signal Types</option>
                {signalTypes.map((t) => (
                  <option key={t} value={t}>{SIGNAL_TYPE_LABELS[t] || t}</option>
                ))}
              </select>

              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
                {filteredSignals.length} of {signals.length} signals
              </span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
              <div>Evaluating risk signals...</div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && signals.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '1rem',
                border: '1px dashed rgba(255,255,255,0.1)',
              }}
            >
              <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f0f4ff', marginBottom: '0.5rem' }}>
                No Risk Signals Detected
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
                All deterministic pattern checks are within normal operating bounds. Add more transactions to improve signal coverage.
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link
                  to="/transactions"
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '0.5rem',
                    color: '#a78bfa',
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Add Transactions
                </Link>
              </div>
            </div>
          )}

          {/* Signal Cards */}
          {!isLoading && filteredSignals.length > 0 && (
            <div>
              {/* Sort: CRITICAL first */}
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const)
                .filter((sev) => filteredSignals.some((s) => s.severity === sev))
                .map((sev) => {
                  const group = filteredSignals.filter((s) => s.severity === sev);
                  if (group.length === 0) return null;
                  const cfg = SEVERITY_CONFIG[sev];
                  return (
                    <div key={sev} style={{ marginBottom: '1.5rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.75rem',
                          color: cfg.color,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                        }}
                      >
                        {cfg.icon} {sev} ({group.length})
                      </div>
                      {group.map((signal) => (
                        <SignalCard
                          key={signal.id}
                          signal={signal}
                          onAcknowledge={handleAcknowledge}
                          acknowledgedIds={acknowledgedIds}
                        />
                      ))}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* EXPLAIN TAB */}
      {activeTab === 'explain' && (
        <div>
          {explainLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
              <Sparkles size={32} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
              <div>Generating explainable intelligence report...</div>
            </div>
          )}

          {!explainLoading && explainReport && (
            <div>
              {/* Summary */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#a78bfa',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <Cpu size={16} /> DIGITAL TWIN STATE — EXECUTIVE SUMMARY
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  {explainReport.summary}
                </p>
              </div>

              {/* Key Findings */}
              {explainReport.keyFindings?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      letterSpacing: '0.06em',
                      marginBottom: '0.75rem',
                    }}
                  >
                    KEY FINDINGS
                  </div>
                  {explainReport.keyFindings.map((finding: any, idx: number) => {
                    const isHealthy = finding.status === 'HEALTHY';
                    const isWarning = finding.status === 'WARNING';
                    const color = isHealthy ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';
                    const bg = isHealthy ? 'rgba(16,185,129,0.08)' : isWarning ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)';

                    return (
                      <div
                        key={idx}
                        style={{
                          background: bg,
                          border: `1px solid ${color}33`,
                          borderRadius: '0.75rem',
                          padding: '1.25rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 700, color: '#f0f4ff', fontSize: '0.95rem' }}>{finding.title}</div>
                          <span
                            style={{
                              background: `${color}22`,
                              color,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            {finding.status}
                          </span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', margin: '0 0 0.5rem 0' }}>
                          {finding.causalExplanation}
                        </p>
                        {finding.mathematicalProof && (
                          <div
                            style={{
                              background: 'rgba(0,0,0,0.2)',
                              borderRadius: '0.375rem',
                              padding: '0.5rem 0.75rem',
                              color: '#a78bfa',
                              fontSize: '0.78rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            <Calculator size={11} style={{ display: 'inline', marginRight: '0.4rem' }} />
                            {finding.mathematicalProof}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recommendations */}
              {explainReport.recommendations?.length > 0 && (
                <div>
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      letterSpacing: '0.06em',
                      marginBottom: '0.75rem',
                    }}
                  >
                    STRATEGIC RECOMMENDATIONS
                  </div>
                  {explainReport.recommendations.map((rec: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '0.75rem',
                        padding: '1rem 1.25rem',
                        marginBottom: '0.6rem',
                        display: 'flex',
                        gap: '1rem',
                      }}
                    >
                      <Lightbulb size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#f0f4ff', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                          {rec.action}
                        </div>
                        {rec.counterfactualImpact && (
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                            {rec.counterfactualImpact}
                          </div>
                        )}
                        {rec.priority && (
                          <span
                            style={{
                              background: 'rgba(245,158,11,0.15)',
                              color: '#f59e0b',
                              borderRadius: '0.25rem',
                              padding: '0.1rem 0.4rem',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              marginTop: '0.3rem',
                              display: 'inline-block',
                            }}
                          >
                            {rec.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Provider Note */}
              <div
                style={{
                  marginTop: '1.5rem',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Target size={12} />
                Analysis provider: {explainReport.provider || 'rules'} | Deterministic engine | No AI fabrication
              </div>
            </div>
          )}

          {!explainLoading && !explainReport && (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              <button
                onClick={loadExplainReport}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0 auto',
                }}
              >
                <Sparkles size={16} /> Generate Explainable Report
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div
        style={{
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/risk-signals"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#a78bfa',
            fontWeight: 600,
            fontSize: '0.85rem',
            textDecoration: 'none',
          }}
        >
          <ShieldAlert size={15} /> Risk Sentinel Monitor →
        </Link>
        <Link
          to="/simulate"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#6ee7b7',
            fontWeight: 600,
            fontSize: '0.85rem',
            textDecoration: 'none',
          }}
        >
          <BarChart2 size={15} /> What-If Decision Lab →
        </Link>
      </div>
    </div>
  );
};
