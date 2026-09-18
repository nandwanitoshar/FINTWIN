import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Target,
  Repeat,
  Sliders,
  DollarSign,
  Calendar,
  Info,
  ArrowRight,
} from 'lucide-react';

export const DataQualityPage: React.FC = () => {
  const [audit, setAudit] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAudit = async () => {
    setIsLoading(true);
    try {
      const res = await api.dataQuality.get();
      if (res.success && res.data) {
        setAudit(res.data);
      }
    } catch (err) {
      console.error('Data quality fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const getGradeBadge = (grade: string) => {
    let color = 'var(--color-success)';
    if (grade === 'C' || grade === 'D') color = 'var(--color-warning)';
    if (grade === 'F') color = 'var(--color-critical)';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: `rgba(255,255,255,0.06)`,
          border: `2px solid ${color}`,
          color,
          fontSize: '1.5rem',
          fontWeight: 900,
        }}
      >
        {grade}
      </span>
    );
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1280px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <ShieldCheck size={24} color="var(--color-accent-bright)" />
            <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent-bright)', fontWeight: 700 }}>
              Audit & Forensic Verification
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Data Quality & Hygiene Center</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
            Authoritative assessment of ingestion hygiene, missing dimensions, duplicate fingerprints, and analytical confidence.
          </p>
        </div>

        <button
          onClick={fetchAudit}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Re-evaluate Hygiene</span>
        </button>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '0.75rem' }} />
          <div>Running ledger integrity scan...</div>
        </div>
      ) : !audit ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Unable to generate data quality audit.
        </div>
      ) : (
        <>
          {/* Top Score Banner */}
          <div
            className="card"
            style={{
              padding: '1.75rem 2rem',
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.7))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {getGradeBadge(audit.grade)}
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                  Quality Score: {audit.score}/100
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  {audit.reliabilityAssessment}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Audited Records</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.2rem' }}>{audit.totalTransactions}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Valid Ledger Entries</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.2rem' }}>{audit.validRecords}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Categorized Coverage</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: audit.categorizationCoveragePercent >= 80 ? 'var(--color-success)' : 'var(--color-warning)', marginTop: '0.2rem' }}>
                  {audit.categorizationCoveragePercent}%
                </div>
              </div>
            </div>
          </div>

          {/* Extended Metric Grid: Goals, Recurring, Scenarios, Currencies */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Target size={16} color="var(--color-success)" />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Financial Goals</div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem' }}>{audit.totalGoals ?? '—'}</div>
              <Link to="/goals" style={{ fontSize: '0.72rem', color: 'var(--color-accent-bright)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                View Goals <ArrowRight size={12} />
              </Link>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Repeat size={16} color="var(--color-warning)" />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Recurring Patterns</div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem' }}>{audit.totalRecurring ?? '—'}</div>
              <Link to="/recurring" style={{ fontSize: '0.72rem', color: 'var(--color-accent-bright)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                View Recurring <ArrowRight size={12} />
              </Link>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Sliders size={16} color="#38BDF8" />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Saved Scenarios</div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem' }}>{audit.totalScenarios ?? '—'}</div>
              <Link to="/history" style={{ fontSize: '0.72rem', color: 'var(--color-accent-bright)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                View History <ArrowRight size={12} />
              </Link>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <DollarSign size={16} color="var(--color-accent-bright)" />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Currencies Found</div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {(audit.currenciesFound ?? []).length > 0 ? (audit.currenciesFound ?? []).join(', ') : '—'}
              </div>
              {(audit.currenciesFound ?? []).length > 1 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--color-warning)', marginTop: '0.25rem' }}>
                  Multi-currency: projections use per-account currency
                </div>
              )}
            </div>
          </div>

          {/* Completeness Status Banner */}
          {audit.completenessLabel && (
            <div
              className="card"
              style={{
                padding: '1.25rem 1.5rem',
                marginBottom: '2rem',
                border: `1px solid ${
                  audit.completenessLabel === 'COMPLETE'
                    ? 'rgba(34,197,94,0.25)'
                    : audit.completenessLabel === 'PARTIAL'
                    ? 'rgba(245,158,11,0.25)'
                    : 'rgba(239,68,68,0.25)'
                }`,
                background: `${
                  audit.completenessLabel === 'COMPLETE'
                    ? 'rgba(34,197,94,0.04)'
                    : audit.completenessLabel === 'PARTIAL'
                    ? 'rgba(245,158,11,0.04)'
                    : 'rgba(239,68,68,0.04)'
                }`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Calendar
                  size={20}
                  color={
                    audit.completenessLabel === 'COMPLETE'
                      ? 'var(--color-success)'
                      : audit.completenessLabel === 'PARTIAL'
                      ? 'var(--color-warning)'
                      : 'var(--color-danger)'
                  }
                  style={{ flexShrink: 0, marginTop: '0.15rem' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        color:
                          audit.completenessLabel === 'COMPLETE'
                            ? 'var(--color-success)'
                            : audit.completenessLabel === 'PARTIAL'
                            ? 'var(--color-warning)'
                            : 'var(--color-danger)',
                      }}
                    >
                      {audit.completenessLabel}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Historical Coverage: {audit.historicalSpanMonths} month(s)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    <strong style={{ color: 'var(--color-text-primary)' }}>Threshold:</strong>{' '}
                    COMPLETE ≥ 12 months • PARTIAL = 3–11 months • INSUFFICIENT &lt; 3 months
                  </div>
                  {audit.insufficientHistoryWarning && (
                    <div
                      style={{
                        marginTop: '0.6rem',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '6px',
                        background: 'rgba(0,0,0,0.2)',
                        fontSize: '0.8rem',
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.4rem',
                      }}
                    >
                      <Info size={13} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--color-warning)' }} />
                      {audit.insufficientHistoryWarning}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Potential Duplicates</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: audit.potentialDuplicatesCount > 0 ? 'var(--color-warning)' : 'var(--color-success)', marginTop: '0.25rem' }}>
                {audit.potentialDuplicatesCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Matching date, amount & note
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Uncategorized Entries</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: audit.missingCategoriesCount > 0 ? 'var(--color-warning)' : 'var(--color-success)', marginTop: '0.25rem' }}>
                {audit.missingCategoriesCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Missing spending category tags
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Unmapped Counterparties</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: audit.missingEntitiesCount > 0 ? 'var(--color-text-muted)' : 'var(--color-success)', marginTop: '0.25rem' }}>
                {audit.missingEntitiesCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Transactions without entity links
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Historical Continuity</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-bright)', marginTop: '0.25rem' }}>
                {audit.historicalSpanMonths} mos
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Active transaction time horizon
              </div>
            </div>
          </div>

          {/* Hygiene Issues & Twin Impact */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1.25rem' }}>
              Identified Quality Impediments & Twin Impact
            </h3>

            {audit.hygieneIssues.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-success)' }}>
                <CheckCircle2 size={32} style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 700 }}>Flawless Data Hygiene!</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  All audited transactions possess accurate dates, structured categories, and counterparty relationships.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {audit.hygieneIssues.map((issue: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1.15rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${
                        issue.severity === 'HIGH'
                          ? 'rgba(239, 68, 68, 0.25)'
                          : issue.severity === 'MEDIUM'
                          ? 'rgba(245, 158, 11, 0.25)'
                          : 'rgba(255, 255, 255, 0.08)'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <AlertTriangle
                          size={16}
                          color={
                            issue.severity === 'HIGH'
                              ? 'var(--color-critical)'
                              : issue.severity === 'MEDIUM'
                              ? 'var(--color-warning)'
                              : 'var(--color-text-muted)'
                          }
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{issue.title}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background:
                            issue.severity === 'HIGH'
                              ? 'rgba(239,68,68,0.15)'
                              : 'rgba(245,158,11,0.15)',
                          color:
                            issue.severity === 'HIGH'
                              ? 'var(--color-critical)'
                              : 'var(--color-warning)',
                        }}
                      >
                        {issue.affectedCount} Records
                      </span>
                    </div>

                    <p style={{ margin: '0 0 0.65rem', fontSize: '0.86rem', color: 'var(--color-text-muted)' }}>
                      {issue.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--color-warning)' }}>Analytical Impact: </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{issue.impactOnTwin}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--color-accent-bright)' }}>Remediation: </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{issue.remediationAction}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
