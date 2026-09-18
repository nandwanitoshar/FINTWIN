import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Search,
  Building2,
  Database,
  Share2,
  Target,
  CreditCard,
  Sliders,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Repeat,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [byCategory, setByCategory] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setByCategory({});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setByCategory({});
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.search.query(query);
        if (res.success && res.data) {
          setByCategory(res.data.byCategory || {});
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Flatten all results
  const allResults = useMemo(() => {
    return Object.values(byCategory).flat();
  }, [byCategory]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    onClose();
    navigate(url);
  };

  const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    ACCOUNT: { label: 'Accounts', icon: <Building2 size={14} />, color: 'var(--color-primary)' },
    TRANSACTION: { label: 'Transactions', icon: <Database size={14} />, color: 'var(--color-accent-bright)' },
    ENTITY: { label: 'Entities', icon: <Share2 size={14} />, color: '#A855F7' },
    GOAL: { label: 'Goals', icon: <Target size={14} />, color: 'var(--color-success)' },
    LOAN: { label: 'Debt & Loans', icon: <CreditCard size={14} />, color: 'var(--color-warning)' },
    SIMULATION: { label: 'Simulation Scenarios', icon: <Sliders size={14} />, color: '#38BDF8' },
    RISK_SIGNAL: { label: 'Risk Signals', icon: <ShieldAlert size={14} />, color: 'var(--color-danger)' },
    RECURRING: { label: 'Recurring Patterns', icon: <Repeat size={14} />, color: '#F97316' },
  };

  const CATEGORY_KEYS: Array<keyof typeof byCategory> = [
    'accounts', 'transactions', 'entities', 'goals', 'loans', 'simulations', 'riskSignals', 'recurring'
  ];
  const CATEGORY_TO_TYPE: Record<string, string> = {
    accounts: 'ACCOUNT', transactions: 'TRANSACTION', entities: 'ENTITY',
    goals: 'GOAL', loans: 'LOAN', simulations: 'SIMULATION', riskSignals: 'RISK_SIGNAL', recurring: 'RECURRING',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '5rem 1rem 2rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" color="var(--color-accent-bright)" />
          ) : (
            <Search size={20} color="var(--color-text-muted)" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts, transactions, entities, goals, loans..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '1rem',
            }}
          />
          <span
            style={{
              padding: '0.2rem 0.4rem',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              fontSize: '0.7rem',
              color: 'var(--color-text-muted)',
              fontFamily: 'monospace',
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '0.5rem' }}>
          {query.trim() && allResults.length === 0 && !isLoading && (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              No financial records found matching "{query}".
            </div>
          )}

          {!query.trim() && (
            <div style={{ padding: '2rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Quick Shortcuts:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['Salary', 'Rent', 'HDFC', 'Emergency', 'Loan', 'Food'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="btn btn-ghost"
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', background: 'rgba(255,255,255,0.04)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grouped Results by Category */}
          {CATEGORY_KEYS.map((catKey) => {
            const catResults = byCategory[catKey as string] || [];
            if (catResults.length === 0) return null;
            const typeKey = CATEGORY_TO_TYPE[catKey as string];
            const config = TYPE_CONFIG[typeKey] || { label: String(catKey), icon: <Search size={14} />, color: 'var(--color-text-muted)' };

            return (
              <div key={catKey as string} style={{ marginBottom: '0.75rem' }}>
                {/* Section Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.3rem 0.75rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  <span style={{ color: config.color, display: 'flex', alignItems: 'center' }}>{config.icon}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                    {config.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.05rem 0.45rem',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {catResults.length}
                  </span>
                </div>

                {catResults.map((res: any) => (
                  <div
                    key={`${res.type}_${res.id}`}
                    onClick={() => handleSelect(res.targetUrl)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div
                        style={{
                          padding: '0.4rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: config.color,
                        }}
                      >
                        {config.icon}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '300px',
                          }}
                        >
                          {res.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          {res.subtitle}
                          {res.date && (
                            <span style={{ marginLeft: '0.4rem', opacity: 0.7 }}>
                              â€¢ {new Date(res.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                      {res.amount !== undefined && (
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                          â‚¹{res.amount.toLocaleString()}
                        </span>
                      )}
                      <ArrowRight size={13} color="var(--color-text-muted)" />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        {query.trim() && allResults.length > 0 && (
          <div
            style={{
              padding: '0.5rem 1.25rem',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.72rem',
              color: 'var(--color-text-subtle)',
            }}
          >
            {allResults.length} result{allResults.length !== 1 ? 's' : ''} across all modules
          </div>
        )}
      </div>
    </div>
  );
};
