import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Calendar,
  X,
  Sparkles,
} from 'lucide-react';
import { AffordabilityEvidenceSection } from '../components/AffordabilityEvidenceSection';

const CATEGORY_PRESETS: Record<string, { label: string; icon: string; defaultColor: string }> = {
  EMERGENCY_FUND: { label: 'Emergency Fund', icon: '🛡️', defaultColor: '#10b981' },
  PURCHASE: { label: 'Major Purchase', icon: '🛍️', defaultColor: '#f43f5e' },
  EDUCATION: { label: 'Education & Career', icon: '🎓', defaultColor: '#06b6d4' },
  TRAVEL: { label: 'Travel & Vacation', icon: '✈️', defaultColor: '#f59e0b' },
  INVESTMENT: { label: 'Investment Capital', icon: '📈', defaultColor: '#8b5cf6' },
  LAPTOP: { label: 'Tech & Gadgets', icon: '💻', defaultColor: '#6366f1' },
  OTHER: { label: 'Financial Reserve', icon: '🪙', defaultColor: '#14b8a6' },
  CUSTOM: { label: 'Custom Goal', icon: '🎯', defaultColor: '#ec4899' },
};

export const GoalsPage: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol =
    user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';

  const [goals, setGoals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [simulationGoalId, setSimulationGoalId] = useState<string>('');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);
  const [contributeAmount, setContributeAmount] = useState<string>('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>('EMERGENCY_FUND');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formCurrentAmount, setFormCurrentAmount] = useState('0');
  const [formMonthlyContribution, setFormMonthlyContribution] = useState('');
  const [formTargetDate, setFormTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [formNotes, setFormNotes] = useState('');
  const [formColor, setFormColor] = useState('#10b981');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.goals.list();
      if (res.success && res.goals) {
        setGoals(res.goals);
        setSummary(res.summary);
      }
    } catch (err: any) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleApplyPreset = (key: string) => {
    const preset = CATEGORY_PRESETS[key];
    if (!preset) return;
    setFormCategory(key);
    setFormColor(preset.defaultColor);
    if (!formName || Object.values(CATEGORY_PRESETS).some((p) => p.label === formName)) {
      setFormName(preset.label);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTargetAmount || parseFloat(formTargetAmount) <= 0) {
      setNotification({ type: 'error', message: 'Please specify a valid goal name and target amount.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.goals.create({
        name: formName.trim(),
        category: formCategory,
        targetAmount: parseFloat(formTargetAmount),
        currentAmount: formCurrentAmount ? parseFloat(formCurrentAmount) : 0,
        monthlyContribution: formMonthlyContribution ? parseFloat(formMonthlyContribution) : 0,
        targetDate: formTargetDate,
        notes: formNotes,
        color: formColor,
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Financial goal created successfully!' });
        setIsAddOpen(false);
        resetForm();
        loadGoals();
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to create goal.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error creating goal.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    setIsSubmitting(true);
    try {
      const res = await api.goals.update(selectedGoal._id, {
        name: formName.trim(),
        category: formCategory,
        targetAmount: parseFloat(formTargetAmount),
        currentAmount: parseFloat(formCurrentAmount),
        monthlyContribution: formMonthlyContribution ? parseFloat(formMonthlyContribution) : 0,
        targetDate: formTargetDate,
        notes: formNotes,
        color: formColor,
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Goal updated successfully.' });
        setIsEditOpen(false);
        resetForm();
        loadGoals();
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to update goal.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error updating goal.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !contributeAmount || parseFloat(contributeAmount) <= 0) {
      setNotification({ type: 'error', message: 'Please enter a positive contribution amount.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.goals.contribute(selectedGoal._id, parseFloat(contributeAmount));
      if (res.success) {
        setNotification({ type: 'success', message: res.message || 'Contribution recorded successfully!' });
        setIsContributeOpen(false);
        setContributeAmount('');
        loadGoals();
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to record contribution.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error recording contribution.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (goal: any) => {
    const nextStatus = goal.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await api.goals.update(goal._id, { status: nextStatus });
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Goal ${nextStatus === 'ACTIVE' ? 'resumed' : 'paused'}.`,
        });
        loadGoals();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update status.' });
    }
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await api.goals.delete(id);
      if (res.success) {
        setNotification({ type: 'success', message: 'Goal deleted.' });
        loadGoals();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete goal.' });
    }
  };

  const openEditModal = (goal: any) => {
    setSelectedGoal(goal);
    setFormName(goal.name);
    setFormCategory(goal.category);
    setFormTargetAmount(goal.targetAmount.toString());
    setFormCurrentAmount(goal.currentAmount.toString());
    setFormMonthlyContribution(goal.monthlyContribution ? goal.monthlyContribution.toString() : '');
    setFormTargetDate(new Date(goal.targetDate).toISOString().split('T')[0]);
    setFormNotes(goal.notes || '');
    setFormColor(goal.color || '#6366f1');
    setIsEditOpen(true);
  };

  const openContributeModal = (goal: any) => {
    setSelectedGoal(goal);
    setContributeAmount(goal.calculations?.requiredMonthlyContribution?.toString() || '5000');
    setIsContributeOpen(true);
  };

  const resetForm = () => {
    setSelectedGoal(null);
    setFormName('');
    setFormCategory('EMERGENCY_FUND');
    setFormTargetAmount('');
    setFormCurrentAmount('0');
    setFormMonthlyContribution('');
    setFormNotes('');
    setFormColor('#10b981');
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1rem 5rem', maxWidth: '1240px' }}>
      {/* Notifications */}
      {notification && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            background: notification.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
            color: notification.type === 'success' ? '#10b981' : '#f43f5e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <div className="badge badge-accent" style={{ marginBottom: '0.5rem' }}>
            <Target size={13} style={{ marginRight: '0.35rem' }} /> Financial Goal Architecture
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>
            Savings & Financial Goals
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginTop: '0.35rem', maxWidth: '640px' }}>
            Track prospective capital accumulation with mathematically verified monthly contribution requirements grounded in your actual ledger.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
        >
          <Plus size={16} /> Create Goal
        </button>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="card-glass" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Total Target Capital</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {currencySymbol}{summary.totalTarget?.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Across {summary.totalGoals} defined goals
            </div>
          </div>

          <div className="card-glass" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Current Capital Saved</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)' }}>
              {currencySymbol}{summary.totalSaved?.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              {summary.overallProgressPercent}% overall progress
            </div>
          </div>

          <div className="card-glass" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Capital Remaining</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-warning)' }}>
              {currencySymbol}{summary.totalRemaining?.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Pending accumulation
            </div>
          </div>

          <div className="card-glass" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Required Monthly Run</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-bright)' }}>
              {currencySymbol}{summary.totalMonthlyRequired?.toLocaleString('en-IN')}<span style={{ fontSize: '0.85rem' }}>/mo</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              To meet all deadlines
            </div>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading verified goals...
        </div>
      ) : goals.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
          <Target size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1.25rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Financial Goals Defined</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', maxWidth: '460px', margin: '0 auto 1.75rem' }}>
            Set targets for an Emergency Fund, Laptop upgrade, Travel, or Custom Milestones to stress-test their feasibility inside your Digital Twin.
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="btn btn-primary"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {goals.map((goal) => {
            const preset = CATEGORY_PRESETS[goal.category] || CATEGORY_PRESETS.CUSTOM;
            const calc = goal.calculations || {};
            const isCompleted = goal.status === 'COMPLETED' || calc.progressPercent >= 100;
            const isPaused = goal.status === 'PAUSED';

            return (
              <div
                key={goal._id}
                className="card-glass"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: `4px solid ${goal.color || '#6366f1'}`,
                  opacity: isPaused ? 0.75 : 1,
                  position: 'relative',
                }}
              >
                <div>
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.4rem' }}>{preset.icon}</span>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{goal.name}</h3>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{preset.label}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span
                        className="badge"
                        style={{
                          background: isCompleted ? 'rgba(16,185,129,0.2)' : isPaused ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)',
                          color: isCompleted ? 'var(--color-success)' : isPaused ? 'var(--color-warning)' : 'var(--color-accent-bright)',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                        }}
                      >
                        {goal.status}
                      </span>
                    </div>
                  </div>

                  {/* Target & Saved Numbers */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Accumulated</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)' }}>
                        {currencySymbol}{goal.currentAmount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Target Target</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                        {currencySymbol}{goal.targetAmount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${calc.progressPercent || 0}%`,
                        background: goal.color || '#6366f1',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                    <span>{calc.progressPercent || 0}% Completed</span>
                    <span>Remaining: {currencySymbol}{calc.amountRemaining?.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Deadlines & Monthly required */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-glass-border)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.6rem',
                      marginBottom: '1rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                        <Calendar size={12} /> Deadline
                      </div>
                      <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
                        {new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Est. Completion</div>
                      <div style={{ fontWeight: 600, marginTop: '0.2rem', color: isCompleted ? 'var(--color-success)' : 'var(--color-text)' }}>
                        {isCompleted
                          ? 'Completed'
                          : calc.estimatedCompletionDate
                          ? new Date(calc.estimatedCompletionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                          : 'Set Contribution'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Planned Monthly</div>
                      <div style={{ fontWeight: 700, marginTop: '0.2rem', color: goal.monthlyContribution > 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                        {goal.monthlyContribution > 0
                          ? `${currencySymbol}${goal.monthlyContribution.toLocaleString('en-IN')}/mo`
                          : 'Not Set'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Required Pace</div>
                      <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--color-accent-bright)' }}>
                        {currencySymbol}{calc.requiredMonthlyContribution?.toLocaleString('en-IN')}/mo
                      </div>
                    </div>
                  </div>

                  {goal.notes && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
                      "{goal.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Action Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--color-glass-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      onClick={() => handleToggleStatus(goal)}
                      className="btn btn-ghost"
                      style={{ padding: '0.4rem', fontSize: '0.78rem' }}
                      title={isPaused ? 'Resume Goal' : 'Pause Goal'}
                    >
                      {isPaused ? <PlayCircle size={15} color="var(--color-success)" /> : <PauseCircle size={15} color="var(--color-warning)" />}
                    </button>
                    <button
                      onClick={() => openEditModal(goal)}
                      className="btn btn-ghost"
                      style={{ padding: '0.4rem', fontSize: '0.78rem' }}
                      title="Edit Goal"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal._id, goal.name)}
                      className="btn btn-ghost"
                      style={{ padding: '0.4rem', fontSize: '0.78rem', color: 'var(--color-danger)' }}
                      title="Delete Goal"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        setSimulationGoalId(goal._id);
                        const el = document.getElementById('affordability-tool');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Sparkles size={12} /> Test What-If
                    </button>

                    {!isCompleted && (
                      <button
                        onClick={() => openContributeModal(goal)}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      >
                        Contribute
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Create Goal Modal */}
      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Create Financial Goal</h2>
              <button onClick={() => setIsAddOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Presets Row */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Quick Presets
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {Object.entries(CATEGORY_PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyPreset(key)}
                    className="badge"
                    style={{
                      cursor: 'pointer',
                      background: formCategory === key ? p.defaultColor : 'rgba(255,255,255,0.06)',
                      color: formCategory === key ? '#fff' : 'var(--color-text-muted)',
                      border: '1px solid var(--color-glass-border)',
                      padding: '0.4rem 0.6rem',
                    }}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Goal Title</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 6-Month Emergency Buffer"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Target Capital ({currencySymbol})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formTargetAmount}
                    onChange={(e) => setFormTargetAmount(e.target.value)}
                    placeholder="100000"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Initial Seed Balance</label>
                  <input
                    type="number"
                    min="0"
                    value={formCurrentAmount}
                    onChange={(e) => setFormCurrentAmount(e.target.value)}
                    placeholder="0"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Planned Monthly Contribution ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    value={formMonthlyContribution}
                    onChange={(e) => setFormMonthlyContribution(e.target.value)}
                    placeholder="e.g. 10000"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Accent Color</label>
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  style={{ width: '100%', height: '38px', border: 'none', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Strategic Notes (Optional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Liquid reserves to protect against sudden salary delays or shocks."
                  className="input-field"
                  rows={2}
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Creating...' : 'Initialize Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {isEditOpen && selectedGoal && (
        <div className="modal-backdrop" onClick={() => setIsEditOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Edit Goal: {selectedGoal.name}</h2>
              <button onClick={() => setIsEditOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Goal Title</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Target Capital ({currencySymbol})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formTargetAmount}
                    onChange={(e) => setFormTargetAmount(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Current Capital Saved</label>
                  <input
                    type="number"
                    min="0"
                    value={formCurrentAmount}
                    onChange={(e) => setFormCurrentAmount(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Planned Monthly Contribution ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    value={formMonthlyContribution}
                    onChange={(e) => setFormMonthlyContribution(e.target.value)}
                    placeholder="e.g. 10000"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Accent Color</label>
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  style={{ width: '100%', height: '38px', border: 'none', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="input-field"
                  rows={2}
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Updating...' : 'Save Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Contribute Modal */}
      {isContributeOpen && selectedGoal && (
        <div className="modal-backdrop" onClick={() => setIsContributeOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Contribute to Goal</h2>
              <button onClick={() => setIsContributeOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Allocating verified capital to <strong>{selectedGoal.name}</strong>.
            </p>

            <form onSubmit={handleContribute} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Contribution Amount ({currencySymbol})</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="5000"
                  className="input-field"
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1000, 5000, 10000, 25000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setContributeAmount(amt.toString())}
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem' }}
                  >
                    +{currencySymbol}{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setIsContributeOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Recording...' : 'Confirm Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DECISION IMPACT & AFFORDABILITY SIMULATOR ─── */}
      <div id="affordability-tool" style={{ marginTop: '3.5rem' }}>
        <AffordabilityEvidenceSection
          goals={goals}
          currencySymbol={currencySymbol}
          preselectedGoalId={simulationGoalId}
        />
      </div>
    </div>
  );
};
