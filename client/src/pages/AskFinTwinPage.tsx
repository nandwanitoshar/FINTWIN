import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  Send,
  Database,
  Loader2,
  Terminal,
} from 'lucide-react';

interface QuestionHistoryItem {
  id: string;
  query: string;
  answer: string;
  evidence: Array<{ label: string; value: string | number }>;
  formulaUsed?: string;
  recordsAnalyzed: number;
  hasSufficientData: boolean;
  limitations?: string;
  suggestedFollowUps?: string[];
  timestamp: string;
}

export const AskFinTwinPage: React.FC = () => {
  const [inputQuery, setInputQuery] = useState('');
  const [history, setHistory] = useState<QuestionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const presetQueries = [
    'How much did I spend this month?',
    'What are my biggest expenses?',
    'How much income did I receive?',
    'What changed compared with last month?',
    'How much did I spend on food?',
    'What happens if I buy a ₹70,000 laptop?',
    'Which merchant received the most money?',
    'How much emergency runway do I have left?',
    'How are my financial goals doing?',
    'What is my total outstanding debt and EMI?',
  ];

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    if (!queryText) setInputQuery('');

    try {
      const res = await api.ask.query(q);
      if (res.success && res.data) {
        const item: QuestionHistoryItem = {
          id: `q_${Date.now()}`,
          query: q,
          answer: res.data.answer,
          evidence: res.data.evidence || [],
          formulaUsed: res.data.formulaUsed,
          recordsAnalyzed: res.data.recordsAnalyzed || 0,
          hasSufficientData: res.data.hasSufficientData,
          limitations: res.data.limitations,
          suggestedFollowUps: res.data.suggestedFollowUps || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setHistory((prev) => [item, ...prev]);
      }
    } catch (err: any) {
      const item: QuestionHistoryItem = {
        id: `err_${Date.now()}`,
        query: q,
        answer: `Error executing query: ${err.message || 'Database query failed.'}`,
        evidence: [],
        recordsAnalyzed: 0,
        hasSufficientData: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setHistory((prev) => [item, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1080px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', borderRadius: '999px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '0.85rem' }}>
          <Sparkles size={16} color="var(--color-accent-bright)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-accent-bright)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Authoritative Financial Q&A
          </span>
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Ask Your Financial Twin</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: '620px', margin: '0 auto' }}>
          Ask natural language questions about your actual accounts, spending, debts, and what-if scenarios. Every answer is grounded with database citations and mathematical proofs.
        </p>
      </div>

      {/* Query Input Bar */}
      <div
        className="card"
        style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        }}
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask anything (e.g. 'What happens if I buy a ₹70,000 laptop?')"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text-primary)',
            fontSize: '1rem',
            padding: '0.4rem',
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputQuery.trim()}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          <span>Query</span>
        </button>
      </div>

      {/* Preset Query Chips */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.6rem' }}>
          Suggested Authoritative Queries:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {presetQueries.map((pq) => (
            <button
              key={pq}
              onClick={() => handleSend(pq)}
              disabled={isLoading}
              className="btn btn-ghost"
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                textAlign: 'left',
              }}
            >
              {pq}
            </button>
          ))}
        </div>
      </div>

      {/* Answers Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {history.length === 0 && (
          <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Terminal size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
              Awaiting Financial Question
            </div>
            <div style={{ fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto' }}>
              Select a suggested prompt above or type a custom question to inspect your living financial ledger.
            </div>
          </div>
        )}

        {history.map((item) => (
          <div
            key={item.id}
            className="card"
            style={{
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.8)',
            }}
          >
            {/* User Question */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                "{item.query}"
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{item.timestamp}</span>
            </div>

            {/* Answer */}
            <div style={{ fontSize: '0.95rem', lineHeight: 1.65, color: 'var(--color-text-primary)', marginBottom: '1.25rem', whiteSpace: 'pre-line' }}>
              {item.answer}
            </div>

            {/* Evidence Chips */}
            {item.evidence && item.evidence.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Authoritative Data Evidence:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
                  {item.evidence.map((ev, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{ev.label}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '0.15rem' }}>{ev.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formula / Citations */}
            {item.formulaUsed && (
              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-accent-bright)', fontWeight: 700, textTransform: 'uppercase' }}>Formula:</span>
                <code style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{item.formulaUsed}</code>
              </div>
            )}

            {/* Footer Metadata */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--color-text-muted)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Database size={13} />
                <span>Audited {item.recordsAnalyzed} records in MongoDB</span>
              </div>
              {item.limitations && (
                <div style={{ color: 'var(--color-warning)' }}>Notice: {item.limitations}</div>
              )}
            </div>

            {/* Follow-up suggestions */}
            {item.suggestedFollowUps && item.suggestedFollowUps.length > 0 && (
              <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {item.suggestedFollowUps.map((fu, fidx) => (
                  <button
                    key={fidx}
                    onClick={() => handleSend(fu)}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', background: 'rgba(255,255,255,0.02)', color: 'var(--color-accent-bright)' }}
                  >
                    → {fu}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
