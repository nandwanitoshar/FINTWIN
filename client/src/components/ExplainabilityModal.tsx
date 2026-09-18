import React from 'react';
import { X, HelpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface ExplainabilityDetails {
  title: string;
  category?: string;
  status?: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  whatWasObserved: string;
  whyWasItFlagged: string;
  whatDataSupportsIt: Array<{ label: string; value: string | number; description?: string }>;
  whatCalculationWasUsed: string;
  whatAreTheLimitations: string[];
}

interface ExplainabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: ExplainabilityDetails | null;
}

export const ExplainabilityModal: React.FC<ExplainabilityModalProps> = ({ isOpen, onClose, details }) => {
  if (!isOpen || !details) return null;

  const getStatusBadge = () => {
    switch (details.status) {
      case 'CRITICAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: 'var(--color-critical)', fontSize: '0.75rem', fontWeight: 700 }}>
            <AlertTriangle size={13} /> CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)', fontSize: '0.75rem', fontWeight: 700 }}>
            <AlertTriangle size={13} /> WARNING
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 700 }}>
            <CheckCircle2 size={13} /> HEALTHY
          </span>
        );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <HelpCircle size={20} color="var(--color-accent-bright)" />
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent-bright)', fontWeight: 700 }}>
                Explainable Financial Intelligence
              </span>
              {getStatusBadge()}
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{details.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.35rem', borderRadius: '50%', color: 'var(--color-text-muted)' }}
            aria-label="Close explanation"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. What was observed */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
            1. What Was Observed?
          </h4>
          <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
            {details.whatWasObserved}
          </p>
        </div>

        {/* 2. Why was it flagged */}
        <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-warning)', marginBottom: '0.35rem' }}>
            2. Why Was It Flagged?
          </h4>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--color-text-muted)' }}>
            {details.whyWasItFlagged}
          </p>
        </div>

        {/* 3. Supporting data */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            3. What Authoritative Data Supports It?
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {details.whatDataSupportsIt.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
                  {item.value}
                </div>
                {item.description && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Exact Calculation Used */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
            4. Deterministic Formula / Calculation
          </h4>
          <pre
            style={{
              margin: 0,
              padding: '0.75rem 1rem',
              background: 'rgba(0, 0, 0, 0.45)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              color: 'var(--color-accent-bright)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {details.whatCalculationWasUsed}
          </pre>
        </div>

        {/* 5. System Limitations */}
        {details.whatAreTheLimitations && details.whatAreTheLimitations.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
              5. Boundary Conditions & Limitations
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {details.whatAreTheLimitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
