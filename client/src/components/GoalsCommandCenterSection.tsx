/**
 * GoalsCommandCenterSection.tsx
 * Phase C — Goals Section for the Command Center (Dashboard)
 *
 * Grounded in real authenticated user goals with mathematically verified progress,
 * remaining targets, monthly contributions, and estimated completion dates.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';

interface GoalsCommandCenterSectionProps {
  goals: any[];
  currencySymbol: string;
  onGoalSelectForSimulation?: (goalId: string) => void;
  onCreateGoalClick?: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  EMERGENCY_FUND: { label: 'Emergency Fund', icon: '🛡️' },
  PURCHASE: { label: 'Major Purchase', icon: '🛍️' },
  EDUCATION: { label: 'Education & Career', icon: '🎓' },
  TRAVEL: { label: 'Travel & Vacation', icon: '✈️' },
  INVESTMENT: { label: 'Investment Capital', icon: '📈' },
  LAPTOP: { label: 'Tech & Hardware', icon: '💻' },
  OTHER: { label: 'Financial Reserve', icon: '🪙' },
  CUSTOM: { label: 'Personal Goal', icon: '🎯' },
};

export const GoalsCommandCenterSection: React.FC<GoalsCommandCenterSectionProps> = ({
  goals,
  currencySymbol,
  onGoalSelectForSimulation,
  onCreateGoalClick,
}) => {
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<any | null>(null);

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (g.currentAmount || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  return (
    <div className="card-glass" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <Target size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              Financial Goals & Capital Targets
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {activeGoals.length} Active
              </span>
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
              Deterministic progress tracking grounded in your verified ledger balances
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/goals"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
          >
            Manage Goals <ExternalLink size={14} />
          </Link>
          {onCreateGoalClick ? (
            <button
              onClick={onCreateGoalClick}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
            >
              <Plus size={15} /> New Goal
            </button>
          ) : (
            <Link
              to="/goals"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
            >
              <Plus size={15} /> New Goal
            </Link>
          )}
        </div>
      </div>

      {/* Summary Aggregate Bar */}
      {goals.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Target Capital
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {currencySymbol}{totalTarget.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Saved Towards Targets
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
              {currencySymbol}{totalSaved.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Remaining to Accumulate
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>
              {currencySymbol}{totalRemaining.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Aggregate Progress</span>
              <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{overallProgress}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--color-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${overallProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #10b981)',
                  borderRadius: '4px',
                  transition: 'width 0.6s ease-in-out',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Goals Grid or Empty State */}
      {goals.length === 0 ? (
        <div
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed var(--color-border)',
            borderRadius: '0.85rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <Target size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            No Financial Goals Established Yet
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
            Set a target for an Emergency Fund, Tech Upgrade, or Long-Term Investment to evaluate how upcoming decisions,
            purchases, and loan EMIs affect your completion timeline.
          </p>
          <Link to="/goals" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Establish Your First Goal
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {goals.map((goal) => {
            const cat = CATEGORY_LABELS[goal.category] || CATEGORY_LABELS.CUSTOM;
            const progress = goal.calculations?.progressPercent ?? (goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0);
            const remaining = goal.calculations?.amountRemaining ?? Math.max(0, goal.targetAmount - goal.currentAmount);
            const monthlyContribution = goal.monthlyContribution || 0;
            const requiredMonthly = goal.calculations?.requiredMonthlyContribution || 0;
            const targetDateStr = new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
            const estCompletion = goal.calculations?.estimatedCompletionDate;

            return (
              <div
                key={goal._id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.85rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
              >
                <div>
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                          {goal.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{cat.label}</span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.35rem',
                        background: goal.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                        color: goal.status === 'COMPLETED' ? '#10b981' : 'var(--color-primary)',
                      }}
                    >
                      {goal.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {currencySymbol}{goal.currentAmount.toLocaleString('en-IN')} of {currencySymbol}{goal.targetAmount.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontWeight: 700, color: progress >= 100 ? '#10b981' : 'var(--color-text)' }}>
                        {progress}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '7px', background: 'var(--color-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: progress >= 100 ? '#10b981' : goal.color || '#6366f1',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.6rem',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '0.5rem',
                      marginBottom: '1rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Remaining</div>
                      <div style={{ fontWeight: 700, color: '#f59e0b' }}>
                        {currencySymbol}{remaining.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Monthly Pace</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                        {monthlyContribution > 0 ? (
                          `${currencySymbol}${monthlyContribution.toLocaleString('en-IN')}/mo`
                        ) : requiredMonthly > 0 ? (
                          `${currencySymbol}${requiredMonthly.toLocaleString('en-IN')}/mo (Req)`
                        ) : (
                          'Not Set'
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Deadline</div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{targetDateStr}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Est. Completion</div>
                      <div style={{ fontWeight: 600, color: estCompletion === 'COMPLETED' ? '#10b981' : estCompletion ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                        {estCompletion === 'COMPLETED'
                          ? 'Goal Achieved'
                          : estCompletion
                          ? new Date(estCompletion).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                          : 'Set Contribution'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '0.6rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <button
                    onClick={() => setSelectedGoalDetail(goal)}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.78rem', padding: '0.45rem 0.6rem', textAlign: 'center' }}
                  >
                    View Details
                  </button>

                  {onGoalSelectForSimulation && (
                    <button
                      onClick={() => onGoalSelectForSimulation(goal._id)}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        fontSize: '0.78rem',
                        padding: '0.45rem 0.6rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Sparkles size={13} /> Test What-If
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Details Modal */}
      {selectedGoalDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedGoalDetail(null)}
        >
          <div
            className="card-glass"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span className="badge badge-accent" style={{ marginBottom: '0.4rem' }}>
                  {CATEGORY_LABELS[selectedGoalDetail.category]?.label || 'Financial Goal'}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                  {selectedGoalDetail.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedGoalDetail(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Accumulated Progress</span>
                <span style={{ fontWeight: 700 }}>
                  {selectedGoalDetail.calculations?.progressPercent ?? 0}%
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'var(--color-surface-hover)', borderRadius: '5px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${selectedGoalDetail.calculations?.progressPercent ?? 0}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #10b981)',
                    borderRadius: '5px',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.85rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Target Capital</span>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                  {currencySymbol}{selectedGoalDetail.targetAmount?.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Current Balance</span>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>
                  {currencySymbol}{selectedGoalDetail.currentAmount?.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Remaining Balance</span>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f59e0b' }}>
                  {currencySymbol}{(selectedGoalDetail.calculations?.amountRemaining ?? 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Monthly Contribution</span>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                  {selectedGoalDetail.monthlyContribution > 0
                    ? `${currencySymbol}${selectedGoalDetail.monthlyContribution.toLocaleString('en-IN')}/mo`
                    : 'Not Configured'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Target Date</span>
                <div style={{ fontWeight: 600 }}>
                  {new Date(selectedGoalDetail.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Est. Completion Date</span>
                <div style={{ fontWeight: 600, color: '#10b981' }}>
                  {selectedGoalDetail.calculations?.estimatedCompletionDate
                    ? selectedGoalDetail.calculations.estimatedCompletionDate === 'COMPLETED'
                      ? 'Goal Completed'
                      : new Date(selectedGoalDetail.calculations.estimatedCompletionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                    : 'Requires Monthly Pace'}
                </div>
              </div>
            </div>

            {selectedGoalDetail.notes && (
              <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <strong>Notes:</strong> {selectedGoalDetail.notes}
              </div>
            )}

            {selectedGoalDetail.calculations?.completionLimitation && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.78rem',
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <AlertCircle size={15} />
                <span>{selectedGoalDetail.calculations.completionLimitation}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Link to="/goals" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                Open in Goals Manager
              </Link>
              {onGoalSelectForSimulation && (
                <button
                  onClick={() => {
                    const id = selectedGoalDetail._id;
                    setSelectedGoalDetail(null);
                    onGoalSelectForSimulation(id);
                  }}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <Sparkles size={14} /> Simulate What-If Impact
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
