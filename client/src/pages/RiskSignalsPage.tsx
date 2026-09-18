/**
 * RiskSignalsPage.tsx
 * Phase 5 — Risk Sentinel Monitor
 *
 * Shows real risk signals from the deterministic detection engine,
 * with evidence, severity classification, and tenant-isolated data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Zap,
  Shield,
  Activity,
  Eye,
  ChevronDown,
  ChevronRight,
  Info,
  TrendingDown,
  TrendingUp,
  Target,
} from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

// ─── Severity Config ─────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)', label: 'CRITICAL' },
  HIGH:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.35)', label: 'HIGH' },
  MEDIUM:   { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.35)', label: 'MEDIUM' },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', label: 'LOW' },
  INFO:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.3)', label: 'INFO' },
};

const SIGNAL_TYPE_DESCRIPTIONS: Record<string, string> = {
  HIGH_EXPENSE_CONCENTRATION:  'A single category accounts for a disproportionate share of expenses.',
  RECURRING_EXPENSE_PRESSURE:  'A recurring obligation consumes a high proportion of average monthly outflow.',
  INCOME_CONCENTRATION:        'A dominant income source creates vulnerability to disruption.',
  LIQUIDITY_PRESSURE:          'Emergency runway is below the safety threshold.',
  DEBT_BURDEN:                 'Debt-to-income ratio exceeds prudent boundaries.',
  CASHFLOW_DECLINE:            'Observed expenses exceed observed income on average.',
  UNUSUAL_TRANSACTION_PATTERN: 'A transaction deviates significantly from the category baseline.',
  NETWORK_CONCENTRATION:       'A single entity dominates the financial network by volume.',
};

// ─── Individual Signal Card ──────────────────────────────────────────────────
const RiskCard: React.FC<{
  signal: any;
  onAcknowledge: (id: string) => void;
  acknowledged: boolean;
}> = ({ signal, onAcknowledge, acknowledged }) => {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[signal.severity] || SEVERITY_CONFIG.INFO;

  return (
    <div
      id={`risk-card-${signal.id}`}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '0.875rem',
        padding: '1.5rem',
        marginBottom: '1rem',
        transition: 'all 0.2s ease',
        opacity: acknowledged ? 0.55 : 1,
      }}
    >
      {/* Top Row */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          {/* Severity + Type badges */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <span
              style={{
                background: cfg.border,
                color: cfg.color,
                padding: '0.2rem 0.6rem',
                borderRadius: '0.375rem',
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              {cfg.label}
            </span>
            <span
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.45)',
                padding: '0.15rem 0.5rem',
                borderRadius: '0.3rem',
                fontSize: '0.65rem',
                fontWeight: 600,
              }}
            >
              {signal.type.replace(/_/g, ' ')}
            </span>
            {acknowledged && (
              <span
                style={{
                  background: 'rgba(16,185,129,0.15)',
                  color: '#10b981',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.3rem',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <CheckCircle2 size={10} /> DISMISSED
              </span>
            )}
          </div>

          {/* Title */}
          <div style={{ fontWeight: 700, color: '#f0f4ff', fontSize: '1rem', marginBottom: '0.3rem' }}>
            {signal.title}
          </div>

          {/* Summary */}
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            {signal.summary}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
          <button
            id={`btn-evidence-${signal.id}`}
            onClick={() => setOpen(!open)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '0.4rem',
              color: cfg.color,
              fontSize: '0.75rem',
              padding: '0.4rem 0.7rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontWeight: 600,
            }}
          >
            <Eye size={12} />
            {open ? 'Hide' : 'Evidence'}
            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>

          {!acknowledged && (
            <button
              id={`btn-dismiss-${signal.id}`}
              onClick={() => onAcknowledge(signal.id)}
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '0.4rem',
                color: '#10b981',
                fontSize: '0.72rem',
                padding: '0.4rem 0.7rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <CheckCircle2 size={12} /> Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Expanded Panel */}
      {open && (
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: `1px solid ${cfg.border}`,
          }}
        >
          {/* Explanation */}
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.84rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
            {signal.explanation}
          </div>

          {/* Evidence Grid */}
          {signal.evidence?.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  color: cfg.color,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  marginBottom: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Target size={11} /> EVIDENTIARY BASIS
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                  gap: '0.45rem',
                }}
              >
                {signal.evidence.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: '0.4rem',
                      padding: '0.5rem 0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{item.field}</span>
                    <span style={{ color: cfg.color, fontSize: '0.8rem', fontWeight: 700 }}>
                      {typeof item.value === 'number'
                        ? item.value.toLocaleString('en-IN')
                        : item.value}
                      {item.unit ? ` ${item.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {signal.recommendations?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  color: '#10b981',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  marginBottom: '0.5rem',
                }}
              >
                RECOMMENDED ACTIONS
              </div>
              {signal.recommendations.map((rec: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.83rem',
                    display: 'flex',
                    gap: '0.6rem',
                    marginBottom: '0.3rem',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: '#10b981', flexShrink: 0, fontWeight: 700 }}>→</span>
                  {rec}
                </div>
              ))}
            </div>
          )}

          {/* Limitations */}
          {signal.limitations?.length > 0 && (
            <div
              style={{
                background: 'rgba(0,0,0,0.15)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
              }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  marginBottom: '0.3rem',
                }}
              >
                ANALYTICAL LIMITATIONS
              </div>
              {signal.limitations.map((lim: string, idx: number) => (
                <div key={idx} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                  <Info size={11} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                  {lim}
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
export const RiskSignalsPage: React.FC = () => {
  const [signals, setSignals] = useState<any[]>([]);
  const [twinState, setTwinState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [signalsRes, twinRes] = await Promise.all([
        api.riskSignals.list(),
        api.twin.get(),
      ]);
      if (signalsRes.success && signalsRes.signals) {
        setSignals(signalsRes.signals);
      }
      if (twinRes.success && twinRes.twin) {
        setTwinState(twinRes.twin);
      }
    } catch {
      setSignals([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcknowledge = useCallback(async (id: string) => {
    try {
      await api.riskSignals.updateStatus(id, 'ACKNOWLEDGED');
    } catch {
      // Optimistic update even if request fails
    }
    setAcknowledgedIds((prev) => new Set([...prev, id]));
  }, []);

  // Filtered signals
  const filteredSignals = signals.filter((s) => {
    if (filterSeverity !== 'ALL' && s.severity !== filterSeverity) return false;
    if (filterType !== 'ALL' && s.type !== filterType) return false;
    return true;
  });

  const signalTypes = [...new Set(signals.map((s) => s.type))];
  const sv = twinState?.stateVector;

  const criticalCount = signals.filter((s) => s.severity === 'CRITICAL').length;
  const highCount = signals.filter((s) => s.severity === 'HIGH').length;
  const openCount = signals.filter((s) => !acknowledgedIds.has(s.id) && s.status !== 'ACKNOWLEDGED').length;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <div
              style={{
                background: criticalCount > 0
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : highCount > 0
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {criticalCount > 0 ? <ShieldAlert size={18} color="white" /> : highCount > 0 ? <AlertTriangle size={18} color="white" /> : <ShieldCheck size={18} color="white" />}
            </div>
            <div>
              <h1
                style={{
                  fontSize: 'clamp(1.25rem, 3vw, 1.6rem)',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #f0f4ff 0%, #fca5a5 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                }}
              >
                Risk Sentinel Monitor
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', margin: 0 }}>
                Deterministic pattern detection — real data, no fabrication
              </p>
            </div>
          </div>
        </div>
        <button
          id="btn-refresh-signals"
          onClick={loadData}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '0.5rem',
            color: 'rgba(255,255,255,0.6)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem',
          }}
        >
          <RefreshCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Status Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[
          {
            label: 'Active Signals',
            value: openCount,
            color: openCount > 0 ? '#f59e0b' : '#10b981',
            icon: <Activity size={18} />,
          },
          {
            label: 'Critical',
            value: criticalCount,
            color: criticalCount > 0 ? '#ef4444' : '#10b981',
            icon: <ShieldAlert size={18} />,
          },
          {
            label: 'High',
            value: highCount,
            color: highCount > 0 ? '#f59e0b' : '#10b981',
            icon: <AlertTriangle size={18} />,
          },
          {
            label: 'Health Score',
            value: sv ? `${Math.round(sv.healthScore)}/100` : '—',
            color: sv && sv.healthScore >= 70 ? '#10b981' : '#f59e0b',
            icon: <Shield size={18} />,
          },
          {
            label: 'Runway',
            value: sv ? `${sv.runwayMonths?.toFixed(1)} mo` : '—',
            color: sv && sv.runwayMonths >= 3 ? '#10b981' : sv && sv.runwayMonths >= 1.5 ? '#f59e0b' : '#ef4444',
            icon: sv && sv.runwayMonths >= 3 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
          },
          {
            label: 'DTI',
            value: sv ? `${sv.dtiPercent?.toFixed(1)}%` : '—',
            color: sv && sv.dtiPercent <= 40 ? '#10b981' : '#ef4444',
            icon: <Zap size={18} />,
          },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.75rem',
              padding: '1rem',
            }}
          >
            <div style={{ color: item.color, marginBottom: '0.4rem' }}>{item.icon}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Row */}
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
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>Filter:</span>
          <select
            id="rs-filter-severity"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.4rem',
              color: '#f0f4ff',
              padding: '0.4rem 0.65rem',
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Severities</option>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            id="rs-filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.4rem',
              color: '#f0f4ff',
              padding: '0.4rem 0.65rem',
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Signal Types</option>
            {signalTypes.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>
            {filteredSignals.length} / {signals.length} signals
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <div>Running deterministic pattern detection...</div>
        </div>
      )}

      {/* All Clear State */}
      {!isLoading && signals.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(16,185,129,0.05)',
            border: '1px dashed rgba(16,185,129,0.2)',
            borderRadius: '1.25rem',
          }}
        >
          <ShieldCheck size={56} color="#10b981" style={{ marginBottom: '1rem' }} />
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f4ff', marginBottom: '0.5rem' }}>
            All Clear — No Risk Signals Detected
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            All deterministic pattern checks are operating within normal bounds. Add more transaction history to improve signal coverage and detection accuracy.
          </div>
          <Link
            to="/transactions"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '0.5rem',
              color: '#10b981',
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Add Transactions →
          </Link>
        </div>
      )}

      {/* Signal Groups */}
      {!isLoading && filteredSignals.length > 0 && (
        <div>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const)
            .filter((sev) => filteredSignals.some((s) => s.severity === sev))
            .map((sev) => {
              const group = filteredSignals.filter((s) => s.severity === sev);
              if (group.length === 0) return null;
              const cfg = SEVERITY_CONFIG[sev];

              return (
                <div key={sev} style={{ marginBottom: '2rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: cfg.color,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      marginBottom: '1rem',
                      paddingBottom: '0.5rem',
                      borderBottom: `1px solid ${cfg.border}`,
                    }}
                  >
                    {sev === 'CRITICAL' && <ShieldAlert size={14} />}
                    {sev === 'HIGH' && <AlertTriangle size={14} />}
                    {sev === 'MEDIUM' && <Zap size={14} />}
                    {sev === 'LOW' && <Info size={14} />}
                    {sev === 'INFO' && <Info size={14} />}
                    {sev} SEVERITY — {group.length} SIGNAL{group.length > 1 ? 'S' : ''}
                  </div>
                  {group.map((signal) => (
                    <RiskCard
                      key={signal.id}
                      signal={signal}
                      onAcknowledge={handleAcknowledge}
                      acknowledged={acknowledgedIds.has(signal.id) || signal.status === 'ACKNOWLEDGED'}
                    />
                  ))}
                </div>
              );
            })}
        </div>
      )}

      {/* Signal Type Reference */}
      {!isLoading && (
        <div style={{ marginTop: '3rem' }}>
          <div
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              marginBottom: '1rem',
            }}
          >
            DETECTION ENGINE — SIGNAL CATALOGUE
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.6rem',
            }}
          >
            {Object.entries(SIGNAL_TYPE_DESCRIPTIONS).map(([type, desc]) => {
              const activeSignal = signals.find((s) => s.type === type);
              return (
                <div
                  key={type}
                  style={{
                    background: activeSignal ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${activeSignal ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                  }}
                >
                  {activeSignal ? (
                    <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  ) : (
                    <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  )}
                  <div>
                    <div
                      style={{
                        color: activeSignal ? '#f59e0b' : '#10b981',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        marginBottom: '0.2rem',
                      }}
                    >
                      {type.replace(/_/g, ' ')}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div
        style={{
          marginTop: '2.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/analysis"
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
          → Financial Intelligence →
        </Link>
        <Link
          to="/twin"
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
          → Digital Twin →
        </Link>
      </div>
    </div>
  );
};
