import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import {
  Repeat,
  Plus,
  RefreshCw,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  AlertCircle,
} from 'lucide-react';

export const RecurringExpensesPage: React.FC = () => {
  const [recurringList, setRecurringList] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [hasSufficientData, setHasSufficientData] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [cadenceFilter, setCadenceFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'nextDate_asc' | 'nextDate_desc' | 'amount_desc' | 'amount_asc'>('nextDate_asc');

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState('MONTHLY');
  const [category, setCategory] = useState('Subscription');
  const [nextDate, setNextDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRecurring = async () => {
    setIsLoading(true);
    try {
      // Fetch via analysis endpoint for full deterministic summary
      const res = await api.analysis.getRecurringExpenses();
      if (res.success) {
        const items = res.recurringExpenses || res.data?.recurringExpenses || [];
        setRecurringList(items);
        setSummary(res.summary || res.data?.summary || null);
        setLimitations(res.limitations || res.data?.limitations || []);
        setHasSufficientData(res.hasSufficientData !== undefined ? res.hasSufficientData : items.length > 0);
      } else {
        // Fallback to recurring CRUD endpoint
        const fallbackRes = await api.recurring.list();
        if (fallbackRes.success && fallbackRes.data) {
          setRecurringList(fallbackRes.data.recurringExpenses || []);
          setSummary(fallbackRes.data.summary || null);
          setLimitations(fallbackRes.data.limitations || []);
        }
      }
    } catch (err) {
      console.error('Failed to load recurring expenses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await fetchRecurring();
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) {
      setFormError('Please enter a name and average amount.');
      return;
    }
    setFormError(null);
    try {
      await api.recurring.create({
        name,
        averageAmount: parseFloat(amount),
        cadence,
        category,
        nextExpectedDate: nextDate || new Date().toISOString().split('T')[0],
      });
      setIsAddOpen(false);
      setName('');
      setAmount('');
      setNextDate('');
      fetchRecurring();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save recurring expense.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this recurring expense commitment?')) return;
    try {
      await api.recurring.delete(id);
      fetchRecurring();
    } catch (err) {
      console.error('Delete recurring failed:', err);
    }
  };

  // Filter and Sort List
  const filteredList = useMemo(() => {
    return recurringList
      .filter((rec) => {
        const matchesSearch =
          rec.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.entityName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCadence =
          cadenceFilter === 'ALL' ||
          rec.cadence?.toUpperCase() === cadenceFilter.toUpperCase() ||
          (cadenceFilter === 'BIWEEKLY' && rec.cadence === 'BI_WEEKLY') ||
          (cadenceFilter === 'YEARLY' && rec.cadence === 'ANNUAL');
        return matchesSearch && matchesCadence;
      })
      .sort((a, b) => {
        if (sortBy === 'amount_desc') return (b.averageAmount || 0) - (a.averageAmount || 0);
        if (sortBy === 'amount_asc') return (a.averageAmount || 0) - (b.averageAmount || 0);
        if (sortBy === 'nextDate_desc')
          return (b.nextExpectedDate || '').localeCompare(a.nextExpectedDate || '');
        return (a.nextExpectedDate || '').localeCompare(b.nextExpectedDate || '');
      });
  }, [recurringList, searchQuery, cadenceFilter, sortBy]);

  const totalMonthlyImpact = summary?.totalRecurringMonthlyExpense ?? 0;
  const annualImpact = summary?.estimatedAnnualRecurringExpense ?? totalMonthlyImpact * 12;
  const activeCount = summary?.numberOfRecurringExpenses ?? recurringList.filter((r) => r.status === 'ACTIVE').length;
  const largest = summary?.largestRecurringExpense;

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1280px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <Repeat size={24} color="var(--color-accent-bright)" />
            <span
              style={{
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-accent-bright)',
                fontWeight: 700,
              }}
            >
              Deterministic Pattern Detection
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Recurring Expenses</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
            Periodic debits, subscriptions, utilities, and obligations detected deterministically from verified bank transactions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleScan}
            className="btn btn-secondary"
            disabled={isScanning}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Auditing Ledger...' : 'Scan For Patterns'}</span>
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Add Commitment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Feature 7) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Recurring Monthly
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.35rem' }}>
            ₹{totalMonthlyImpact.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            Normalized monthly recurring burn
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Annualized Recurring Expense
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '0.35rem' }}>
            ₹{annualImpact.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            12-month commitment projection
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Active Recurring Items
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent-bright)', marginTop: '0.35rem' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            {recurringList.filter((r) => r.detectedAutomatically).length} auto-detected patterns
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Largest Recurring Item
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38BDF8', marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {largest ? largest.name : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            {largest ? `₹${largest.monthlyImpact.toLocaleString('en-IN')}/mo (${largest.cadence})` : 'No items recorded'}
          </div>
        </div>
      </div>

      {/* Limitations Alert if any */}
      {limitations.length > 0 && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={18} color="var(--color-accent-bright)" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Pattern Engine Observation:</strong>{' '}
            {limitations.join(' ')}
          </div>
        </div>
      )}

      {/* Search & Filters Bar (Feature 19) */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Search merchant or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              outline: 'none',
              fontSize: '0.88rem',
              width: '100%',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Frequency Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} color="var(--color-text-muted)" />
            <select
              value={cadenceFilter}
              onChange={(e) => setCadenceFilter(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
              }}
            >
              <option value="ALL">All Frequencies</option>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Annual / Yearly</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowUpDown size={15} color="var(--color-text-muted)" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
              }}
            >
              <option value="nextDate_asc">Next Occurrence (Earliest)</option>
              <option value="nextDate_desc">Next Occurrence (Latest)</option>
              <option value="amount_desc">Amount (Highest First)</option>
              <option value="amount_asc">Amount (Lowest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <div>Evaluating transaction cadences and amounts...</div>
        </div>
      ) : recurringList.length === 0 || !hasSufficientData ? (
        /* Empty State (Feature 16) */
        <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <Repeat size={42} style={{ color: 'var(--color-text-muted)', opacity: 0.4, margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Not enough transaction history to detect recurring expenses.
          </h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '560px', margin: '0 auto 1.5rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Our deterministic detection engine requires at least 2 historical debit transactions for the same merchant or counterparty with consistent time intervals (e.g. streaming, rent, broadband).
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Add First Recurring Commitment
          </button>
        </div>
      ) : (
        /* Responsive Table & Detail Cards (Feature 3, 6, 21, 22) */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Merchant / Entity</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Cadence & Interval</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Average / Last</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Monthly Budget Impact</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Estimated Next Occurrence</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Confidence & Evidence</th>
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((rec) => {
                  const confPercent = Math.round((rec.confidenceScore || 0.9) * 100);
                  return (
                    <tr
                      key={rec._id}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s ease' }}
                    >
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{rec.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                          <span>{rec.category}</span>
                          {rec.totalOccurrences && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--color-accent-bright)' }}>
                              • {rec.totalOccurrences} occurrences
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {rec.cadence}
                        </span>
                        {rec.averageIntervalDays && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                            Avg ~{rec.averageIntervalDays} days
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          ₹{rec.averageAmount.toLocaleString('en-IN')}
                        </div>
                        {rec.lastAmount && rec.lastAmount !== rec.averageAmount && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            Last: ₹{rec.lastAmount.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: 'var(--color-warning)' }}>
                        ₹{rec.estimatedMonthlyImpact.toLocaleString('en-IN')}
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                          normalized
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                          {rec.nextExpectedDate ? `~${rec.nextExpectedDate}` : '—'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: rec.nextOccurrenceReliable !== false ? 'var(--color-text-muted)' : 'var(--color-warning)', marginTop: '0.2rem' }}>
                          {rec.nextOccurrenceMessage || 'Estimated next occurrence'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: confPercent >= 80 ? '#00E5A3' : '#F59E0B',
                            }}
                          >
                            {confPercent}%
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>confidence</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', maxWidth: '240px' }}>
                          {rec.confidenceFormula || 'Deterministic interval & variance model'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDelete(rec._id)}
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem', color: 'var(--color-critical)' }}
                          title="Delete recurring commitment"
                          aria-label={`Delete ${rec.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Commitment Modal */}
      {isAddOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'rgba(15, 23, 42, 0.98)',
              padding: '1.75rem',
              borderRadius: '16px',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.25rem' }}>Add Recurring Commitment</h3>
            {formError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--color-critical)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.82rem',
                }}
              >
                {formError}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                  Service / Merchant Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Netflix, Broadband, Rent"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    Average Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1499"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    Cadence
                  </label>
                  <select
                    value={cadence}
                    onChange={(e) => setCadence(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(15,23,42,1)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-Weekly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Annual / Yearly</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Subscription, Utility, etc."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    Next Expected Date
                  </label>
                  <input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Commitment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
