import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Store,
  Calendar,
  ArrowRight,
  Filter,
  X,
  Upload,
  Plus,
  Info,
} from 'lucide-react';

export interface CategorySpending {
  category: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
  averageTransaction: number;
}

export interface MonthlySpending {
  key: string;
  year: number;
  monthIndex: number;
  monthLabel: string;
  amount: number;
  transactionCount: number;
}

export interface TopMerchant {
  name: string;
  entityId?: string;
  amount: number;
  transactionCount: number;
}

export interface SpendingData {
  hasData: boolean;
  totalSpending: number;
  transactionCount: number;
  averageMonthlySpending: number;
  categoryBreakdown: CategorySpending[];
  monthlySpending: MonthlySpending[];
  topCategories: CategorySpending[];
  topMerchants: TopMerchant[];
  recentExpenses: Array<{
    _id: string;
    date: string | Date;
    description: string;
    category: string;
    amount: number;
    accountName: string;
    merchantName?: string;
  }>;
  limitations: string[];
}

interface SpendingBreakdownProps {
  data: SpendingData | null;
  currencySymbol: string;
  isLoading?: boolean;
}

const CATEGORY_COLORS = [
  '#38BDF8', // Cyan
  '#8CABFF', // Accent Blue
  '#34D399', // Emerald
  '#FBBF24', // Amber
  '#F43F5E', // Rose
  '#A78BFA', // Purple
  '#FB923C', // Orange
  '#94A3B8', // Slate / Uncategorized
];

export const SpendingBreakdownSection: React.FC<SpendingBreakdownProps> = ({
  data,
  currencySymbol,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="card-glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>Loading spending analytics...</p>
      </div>
    );
  }

  if (!data || !data.hasData || data.totalSpending === 0) {
    return (
      <div
        className="card-glass"
        style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          marginBottom: '2rem',
          border: '1px dashed var(--color-border)',
        }}
      >
        <PieChart size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', opacity: 0.6 }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem' }}>
          No Spending Records Yet
        </h3>
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.88rem',
            maxWidth: '440px',
            margin: '0 auto 1.5rem',
            lineHeight: 1.5,
          }}
        >
          Spending analytics are generated deterministically from your actual debit ledger records. Import a statement or log an expense transaction to view category distributions and trends.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/transactions" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Plus size={15} />
            <span>Add Transaction</span>
          </Link>
          <Link to="/transactions" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Upload size={15} />
            <span>Import Statement</span>
          </Link>
        </div>
      </div>
    );
  }

  // Filter transactions by selected category if clicked
  const filteredTransactions = selectedCategory
    ? data.recentExpenses.filter((t) => t.category === selectedCategory)
    : data.recentExpenses;

  // Compute max month for scaling bar chart
  const maxMonthlyAmount = Math.max(...data.monthlySpending.map((m) => m.amount), 1);

  return (
    <div className="card-glass" style={{ padding: '1.75rem', marginBottom: '2.5rem', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={20} color="var(--color-cyan)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
              Spending Breakdown & Analytics
            </h2>
            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--color-cyan)', fontSize: '0.72rem', fontWeight: 700 }}>
              Deterministic Ledger Analysis
            </span>
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Categorized outflows from verified debit records • Zero AI classification hallucination
          </p>
        </div>

        <Link
          to="/transactions"
          style={{
            fontSize: '0.82rem',
            color: 'var(--color-accent-bright)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontWeight: 600,
          }}
        >
          <span>All Ledger Entries</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Top High-Level Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Total Outflow
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-danger)' }}>
            {currencySymbol}{data.totalSpending.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {data.transactionCount} Debit Transactions
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Monthly Run-Rate
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
            {currencySymbol}{data.averageMonthlySpending.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Across {data.monthlySpending.length} Active Month(s)
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Primary Category
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.categoryBreakdown[0]?.category || 'None'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {data.categoryBreakdown[0]?.percentage}% of total spend
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Top Merchant Outlay
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#A78BFA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.topMerchants[0]?.name || 'N/A'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {data.topMerchants[0] ? `${currencySymbol}${data.topMerchants[0].amount.toLocaleString()}` : '0'}
          </div>
        </div>
      </div>

      {/* Multi-Segment Proportion Bar */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
            Category Distribution Ratio
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
            Click a category below to filter contributing transactions
          </span>
        </div>
        <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', gap: '2px' }}>
          {data.categoryBreakdown.map((cat, idx) => {
            const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
            return (
              <div
                key={cat.category}
                title={`${cat.category}: ${currencySymbol}${cat.totalAmount.toLocaleString()} (${cat.percentage}%)`}
                style={{
                  width: `${Math.max(1.5, cat.percentage)}%`,
                  height: '100%',
                  background: color,
                  cursor: 'pointer',
                  opacity: selectedCategory && selectedCategory !== cat.category ? 0.35 : 1,
                  transition: 'opacity 0.2s',
                }}
                onClick={() => setSelectedCategory(selectedCategory === cat.category ? null : cat.category)}
              />
            );
          })}
        </div>
      </div>

      {/* Main Analysis Grid: Category Breakdown vs Monthly Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Categories List */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Categories ({data.categoryBreakdown.length})
            </span>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                style={{ fontSize: '0.72rem', color: 'var(--color-accent-bright)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <X size={12} /> Clear Filter
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '280px', overflowY: 'auto' }}>
            {data.categoryBreakdown.map((cat, idx) => {
              const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              const isSelected = selectedCategory === cat.category;

              return (
                <div
                  key={cat.category}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.category)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.75rem',
                    background: isSelected ? 'rgba(108, 140, 255, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? 'var(--color-accent)' : 'rgba(255,255,255,0.04)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? 'var(--color-accent-bright)' : '#fff' }}>
                        {cat.category}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {cat.transactionCount} transaction{cat.transactionCount === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                      {currencySymbol}{cat.totalAmount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {cat.percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Trend Bar Chart */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={15} color="var(--color-accent-bright)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Monthly Spending Trend
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              {data.monthlySpending.length} Recorded Months
            </span>
          </div>

          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '0.85rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
            {data.monthlySpending.map((m) => {
              const barHeightPct = Math.max(12, Math.round((m.amount / maxMonthlyAmount) * 100));

              return (
                <div
                  key={m.key}
                  style={{
                    flex: 1,
                    minWidth: '48px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                    position: 'relative',
                  }}
                >
                  <div
                    title={`${m.monthLabel}: ${currencySymbol}${m.amount.toLocaleString()} (${m.transactionCount} tx)`}
                    style={{
                      width: '70%',
                      height: `${barHeightPct}%`,
                      background: 'linear-gradient(180deg, var(--color-cyan) 0%, rgba(56, 189, 248, 0.4) 100%)',
                      borderRadius: '6px 6px 2px 2px',
                      transition: 'height 0.4s ease',
                    }}
                  />
                  <div style={{ position: 'absolute', bottom: '-1.4rem', fontSize: '0.68rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {m.monthLabel}
                  </div>
                  <div style={{ position: 'absolute', top: `${100 - barHeightPct - 12}%`, fontSize: '0.65rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                    {currencySymbol}{Math.round(m.amount / 1000)}k
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Merchants & Counterparties */}
      {data.topMerchants.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Store size={15} color="#A78BFA" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Top Merchant Counterparties
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {data.topMerchants.slice(0, 6).map((m) => (
              <div
                key={m.name}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                  padding: '0.75rem 0.9rem',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                    {currencySymbol}{m.amount.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {m.transactionCount} debit{m.transactionCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contributing Transactions Drilldown Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} color="var(--color-accent-bright)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Contributing Transactions {selectedCategory ? `(${selectedCategory})` : '(All Categories)'}
            </span>
          </div>
          {selectedCategory && (
            <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
              Filtered: {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="table-container" style={{ maxHeight: '260px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.6rem 0.8rem' }}>Date</th>
                <th style={{ padding: '0.6rem 0.8rem' }}>Description</th>
                <th style={{ padding: '0.6rem 0.8rem' }}>Category</th>
                <th style={{ padding: '0.6rem 0.8rem' }}>Account</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.slice(0, 15).map((tx) => (
                <tr key={tx._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.6rem 0.8rem', color: 'var(--color-text-muted)' }}>
                    {tx.date ? new Date(tx.date).toLocaleDateString() : 'Recent'}
                  </td>
                  <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{tx.description}</td>
                  <td style={{ padding: '0.6rem 0.8rem' }}>
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.68rem',
                        background: tx.category === 'Uncategorized' ? 'rgba(255,255,255,0.08)' : 'rgba(56, 189, 248, 0.15)',
                        color: tx.category === 'Uncategorized' ? 'var(--color-text-muted)' : 'var(--color-cyan)',
                      }}
                    >
                      {tx.category}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.8rem', color: 'var(--color-text-muted)' }}>{tx.accountName}</td>
                  <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>
                    -{currencySymbol}{tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Limitations Notice */}
      {data.limitations && data.limitations.length > 0 && (
        <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <Info size={14} color="var(--color-accent-bright)" />
          <span>{data.limitations.join(' • ')}</span>
        </div>
      )}
    </div>
  );
};
