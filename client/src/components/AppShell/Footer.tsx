import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-top">
          <div>
            <div className="brand-logo" style={{ marginBottom: '0.5rem' }}>
              <div className="brand-mark">
                <Activity size={18} />
              </div>
              <div>
                Fin<span>Twin</span> AI
              </div>
            </div>
            <p className="footer-desc">
              The AI-Powered Financial Digital Twin platform. Moving from fragmented ledgers to
              connected topological financial systems with deterministic simulation.
            </p>
          </div>

          <div className="footer-disclaimer-box" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-warning)', fontWeight: 600, marginBottom: '0.35rem' }}>
              <ShieldCheck size={16} />
              <span>Prototype & Presentation Metrics Notice</span>
            </div>
            <p>
              Metrics shown in presentation previews (e.g. 98% system uptime, 1.2s response, 99.2% success rate) are design target benchmarks from the TechNova-2026 concept document. All personal financial computations within FinTwin AI are 100% deterministic and reproducible.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} FinTwin AI — Spec-Driven Architecture. Built for TechNova 2026.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link to="/simulation" style={{ color: 'var(--color-text-muted)' }}>
              Simulation Engine
            </Link>
            <Link to="/network" style={{ color: 'var(--color-text-muted)' }}>
              Graph Topology
            </Link>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-accent-bright)' }}>
              <Cpu size={14} />
              <span>Deterministic Core</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
