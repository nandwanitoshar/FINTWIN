import React from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import {
  ArrowRight,
  Database,
  GitMerge,
  Cpu,
  Share2,
  Sliders,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const pipelineSteps = [
    { num: '01', title: 'INGEST', desc: 'Raw CSV, JSON bank exports, or manual declarations', icon: Database },
    { num: '02', title: 'NORMALIZE', desc: 'ISO 8601 timestamps, currency sanitization, deduplication', icon: GitMerge },
    { num: '03', title: 'MODEL', desc: 'Accounts, Wallets, Instruments, and Counterparty entities', icon: Cpu },
    { num: '04', title: 'CONNECT', desc: 'Directional transaction flows, velocity, and cadence', icon: Share2 },
    { num: '05', title: 'SIMULATE', desc: 'Deterministic 1-60 month forward cashflow projection', icon: Sliders },
    { num: '06', title: 'ANALYZE', desc: 'Deterministic risk signals + explainable causal intelligence', icon: Sparkles },
  ];

  const comparisons = [
    {
      feature: 'Data Topology',
      traditional: 'Isolated flat rows in a ledger table',
      fintwin: 'Connected graph network of accounts, entities & flows',
    },
    {
      feature: 'Decision Support',
      traditional: 'Static monthly budget limits with no future foresight',
      fintwin: 'Prospective "What-If" simulation sandbox before spending',
    },
    {
      feature: 'Counterparties',
      traditional: 'Passive string descriptions ("Uber", "Amazon")',
      fintwin: 'First-class entities with velocity, cadence & risk ratings',
    },
    {
      feature: 'Risk Detection',
      traditional: 'Alerts only after money runs out or payment bounces',
      fintwin: 'Pre-computed runway days, DTI ratio & cascade vulnerability',
    },
    {
      feature: 'Intelligence',
      traditional: 'Generic rules-of-thumb ("Save 20% of your income")',
      fintwin: 'Explainable causal reasons & personalized counterfactuals',
    },
  ];

  return (
    <div className="landing-page">
      {/* Cinematic Hero Suite */}
      <Hero />

      {/* Six-Stage Operating Pipeline */}
      <section id="pipeline" style={{ padding: '5rem 0', background: 'var(--color-bg-alt)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
            <div className="badge badge-accent" style={{ marginBottom: '0.75rem' }}>
              Architectural Engine
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              The Six-Stage Operating Pipeline
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              How FinTwin moves from fragmented records to a living, connected financial twin.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {pipelineSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="card-glass" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-accent-bright)', opacity: 0.8 }}>
                      {step.num}
                    </span>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--color-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-bright)' }}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {step.title}
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Distinction: Traditional vs FinTwin */}
      <section id="distinction" style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
            <div className="badge badge-success" style={{ marginBottom: '0.75rem' }}>
              System-Level Paradigm
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              "See the financial system, not just the transactions."
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              FinTwin models the full financial anatomy: accounts, wallets, instruments, and commitments.
            </p>
          </div>

          <div className="card-glass" style={{ padding: '0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                    Dimension
                  </th>
                  <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-danger)' }}>
                    Traditional Expense Trackers
                  </th>
                  <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-success)' }}>
                    FinTwin AI Digital Twin
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, idx) => (
                  <tr key={row.feature} style={{ borderBottom: idx < comparisons.length - 1 ? '1px solid var(--color-glass-border)' : 'none' }}>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
                      {row.feature}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <XCircle size={16} color="var(--color-danger)" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span>{row.traditional}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text)', fontSize: '0.9rem', background: 'rgba(108, 140, 255, 0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <CheckCircle2 size={16} color="var(--color-success)" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{row.fintwin}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom CTA Box */}
          <div className="card-glass" style={{ marginTop: '3.5rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(108, 140, 255, 0.12), rgba(56, 189, 248, 0.08))', borderColor: 'rgba(108, 140, 255, 0.3)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Ready to Model Your Financial Future?
            </h3>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '540px', margin: '0 auto 1.75rem', fontSize: '0.95rem' }}>
              Experience deterministic simulations and topological financial graphs before making your next major financial decision.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
                Create Your Digital Twin
                <ArrowRight size={16} />
              </Link>
              <Link to="/simulation" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem' }}>
                Test Simulation Sandbox
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
