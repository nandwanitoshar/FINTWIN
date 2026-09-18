import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  X,
  TrendingDown,
} from 'lucide-react';

export const DebtLoansPage: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol =
    user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';

  const [loans, setLoans] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayEmiOpen, setIsPayEmiOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formLender, setFormLender] = useState('');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formOutstanding, setFormOutstanding] = useState('');
  const [formApr, setFormApr] = useState('12.5');
  const [formTenure, setFormTenure] = useState('24');
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTargetAccountId, setFormTargetAccountId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live EMI calculation in the add form
  const liveCalculatedEmi = useMemo(() => {
    const P = parseFloat(formPrincipal);
    const apr = parseFloat(formApr);
    const n = parseInt(formTenure, 10);
    if (!P || P <= 0 || isNaN(apr) || apr < 0 || !n || n <= 0) return 0;
    if (apr === 0) return Math.round(P / n);
    const r = apr / 12 / 100;
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(emi);
  }, [formPrincipal, formApr, formTenure]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loanRes = await api.loans.list().catch(() => ({ success: false, loans: [], summary: null }));
      if (loanRes.success && loanRes.loans) {
        setLoans(loanRes.loans);
        setSummary(loanRes.summary);
      }
    } catch (err: any) {
      console.error('Failed to fetch loans data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formLender.trim() || !formPrincipal || parseFloat(formPrincipal) <= 0) {
      setNotification({ type: 'error', message: 'Please provide valid loan name, lender, and principal.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.loans.create({
        name: formName.trim(),
        lender: formLender.trim(),
        principal: parseFloat(formPrincipal),
        outstandingAmount: formOutstanding ? parseFloat(formOutstanding) : parseFloat(formPrincipal),
        interestRateApr: parseFloat(formApr),
        tenureMonths: parseInt(formTenure, 10),
        startDate: formStartDate,
        targetAccountId: formTargetAccountId,
        notes: formNotes,
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Loan liability recorded successfully!' });
        setIsAddOpen(false);
        resetForm();
        loadData();
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to record loan.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error recording loan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setIsSubmitting(true);
    try {
      const res = await api.loans.update(selectedLoan._id, {
        name: formName.trim(),
        lender: formLender.trim(),
        outstandingAmount: parseFloat(formOutstanding),
        interestRateApr: parseFloat(formApr),
        tenureMonths: parseInt(formTenure, 10),
        notes: formNotes,
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Loan updated successfully.' });
        setIsEditOpen(false);
        resetForm();
        loadData();
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to update loan.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error updating loan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayEmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      setNotification({ type: 'error', message: 'Please specify a positive payment amount.' });
      return;
    }

    const payNum = parseFloat(paymentAmount);
    const newOutstanding = Math.max(0, selectedLoan.outstandingAmount - payNum);

    setIsSubmitting(true);
    try {
      const res = await api.loans.update(selectedLoan._id, {
        outstandingAmount: newOutstanding,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Recorded payment of ${currencySymbol}${payNum.toLocaleString('en-IN')}. New balance: ${currencySymbol}${newOutstanding.toLocaleString('en-IN')}.`,
        });
        setIsPayEmiOpen(false);
        setPaymentAmount('');
        loadData();
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to record payment.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error recording payment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLoan = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the loan commitment "${name}"?`)) return;
    try {
      const res = await api.loans.delete(id);
      if (res.success) {
        setNotification({ type: 'success', message: 'Loan removed.' });
        loadData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete loan.' });
    }
  };

  const openEditModal = (loan: any) => {
    setSelectedLoan(loan);
    setFormName(loan.name);
    setFormLender(loan.lender);
    setFormPrincipal(loan.principal.toString());
    setFormOutstanding(loan.outstandingAmount.toString());
    setFormApr(loan.interestRateApr.toString());
    setFormTenure(loan.tenureMonths.toString());
    setFormNotes(loan.notes || '');
    setIsEditOpen(true);
  };

  const openPayModal = (loan: any) => {
    setSelectedLoan(loan);
    setPaymentAmount(loan.emiAmount?.toString() || '0');
    setIsPayEmiOpen(true);
  };

  const resetForm = () => {
    setSelectedLoan(null);
    setFormName('');
    setFormLender('');
    setFormPrincipal('');
    setFormOutstanding('');
    setFormApr('12.5');
    setFormTenure('24');
    setFormNotes('');
    setFormTargetAccountId('');
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1rem 5rem', maxWidth: '1240px' }}>
      {/* Notification */}
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
            <CreditCard size={13} style={{ marginRight: '0.35rem' }} /> Liability Architecture
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>
            Debt & Loan Contracts
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginTop: '0.35rem', maxWidth: '640px' }}>
            Model debt obligations, track EMI pressures, and evaluate debt-to-income (DTI) exposure with deterministic amortization formulas.
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
          <Plus size={16} /> Record New Loan
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="card-glass" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Total Outstanding Debt</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-danger)' }}>
              {currencySymbol}{summary.totalOutstanding?.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Active balance across {summary.activeLoansCount} loans
            </div>
          </div>

          <div className="card-glass" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Monthly EMI Commitment</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-warning)' }}>
              {currencySymbol}{summary.totalMonthlyEmi?.toLocaleString('en-IN')}<span style={{ fontSize: '0.85rem' }}>/mo</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Fixed cash outflow requirement
            </div>
          </div>

          <div className="card-glass" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Debt-To-Income (DTI)</div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: summary.dtiRatio <= 30 ? 'var(--color-success)' : summary.dtiRatio <= 45 ? 'var(--color-warning)' : 'var(--color-danger)',
              }}
            >
              {summary.dtiRatio}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Status: <strong>{summary.dtiHealthStatus}</strong> (Ideal &lt; 35%)
            </div>
          </div>

          <div className="card-glass" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Total Expected Interest</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {currencySymbol}{summary.totalInterestExpected?.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Over full loan tenures
            </div>
          </div>
        </div>
      )}

      {/* Loans List */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading debt records...
        </div>
      ) : loans.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
          <CreditCard size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1.25rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Zero Active Debt Obligations</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', maxWidth: '460px', margin: '0 auto 1.75rem' }}>
            No personal loans, car EMIs, or credit card facilities recorded. Record commitments here to stress-test their impact in the simulator.
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="btn btn-primary"
          >
            Record a Loan Contract
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {loans.map((loan) => {
            const calc = loan.calculations || {};
            const isPaidOff = loan.status === 'PAID_OFF' || loan.outstandingAmount <= 0;

            return (
              <div
                key={loan._id}
                className="card-glass"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: `4px solid ${isPaidOff ? 'var(--color-success)' : 'var(--color-warning)'}`,
                  opacity: isPaidOff ? 0.75 : 1,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{loan.name}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <Building2 size={12} /> {loan.lender}
                      </span>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: isPaidOff ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                        color: isPaidOff ? 'var(--color-success)' : 'var(--color-danger)',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                      }}
                    >
                      {loan.status}
                    </span>
                  </div>

                  {/* Numbers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Outstanding</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-danger)' }}>
                        {currencySymbol}{loan.outstandingAmount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Monthly EMI</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text)' }}>
                        {currencySymbol}{loan.emiAmount?.toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem' }}>/mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress / Principal paid bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                      <span>Principal: {currencySymbol}{loan.principal?.toLocaleString('en-IN')}</span>
                      <span>{calc.progressPercent || 0}% Paid Off</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${calc.progressPercent || 0}%`,
                          background: isPaidOff ? 'var(--color-success)' : 'var(--color-accent)',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Terms */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-glass-border)',
                      borderRadius: '0.5rem',
                      padding: '0.65rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <span>Interest: <strong>{loan.interestRateApr}% APR</strong></span>
                    <span>Tenure: <strong>{loan.tenureMonths} mos</strong></span>
                    <span>Est. Interest: <strong>{currencySymbol}{calc.estimatedTotalInterest?.toLocaleString('en-IN')}</strong></span>
                  </div>

                  {loan.notes && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
                      "{loan.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-glass-border)', paddingTop: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => openEditModal(loan)}
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem', fontSize: '0.75rem' }}
                      title="Edit Loan Parameters"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteLoan(loan._id, loan.name)}
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                      title="Remove Loan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {!isPaidOff && (
                    <button
                      onClick={() => openPayModal(loan)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <TrendingDown size={13} /> Record Payment
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Loan Modal */}
      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Record Debt / Loan Obligation</h2>
              <button onClick={() => setIsAddOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Loan Identifier</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. MacBook EMI or Car Loan"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Lender Institution</label>
                  <input
                    type="text"
                    required
                    value={formLender}
                    onChange={(e) => setFormLender(e.target.value)}
                    placeholder="e.g. HDFC Bank, ICICI, Bajaj"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Principal ({currencySymbol})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPrincipal}
                    onChange={(e) => setFormPrincipal(e.target.value)}
                    placeholder="70000"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Current Outstanding ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    value={formOutstanding}
                    onChange={(e) => setFormOutstanding(e.target.value)}
                    placeholder="Leave blank if full principal"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Interest Rate (% APR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formApr}
                    onChange={(e) => setFormApr(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Tenure (Months)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formTenure}
                    onChange={(e) => setFormTenure(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Live Amortization Preview */}
              <div
                style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: '0.6rem',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Deterministic Monthly EMI</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent-bright)' }}>
                    {currencySymbol}{liveCalculatedEmi.toLocaleString('en-IN')}<span style={{ fontSize: '0.8rem' }}>/mo</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                  Total Repayment: {currencySymbol}{(liveCalculatedEmi * (parseInt(formTenure, 10) || 1)).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Start Date</label>
                <input
                  type="date"
                  required
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. 0% down payment, auto-debit on 5th of every month."
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
                  {isSubmitting ? 'Recording...' : 'Record Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Loan Modal */}
      {isEditOpen && selectedLoan && (
        <div className="modal-backdrop" onClick={() => setIsEditOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Modify Contract: {selectedLoan.name}</h2>
              <button onClick={() => setIsEditOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateLoan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Outstanding Amount ({currencySymbol})</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formOutstanding}
                  onChange={(e) => setFormOutstanding(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Interest (% APR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formApr}
                    onChange={(e) => setFormApr(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Tenure (Months)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formTenure}
                    onChange={(e) => setFormTenure(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
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
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay EMI Modal */}
      {isPayEmiOpen && selectedLoan && (
        <div className="modal-backdrop" onClick={() => setIsPayEmiOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Record EMI Payment</h2>
              <button onClick={() => setIsPayEmiOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Deducting debt liability from <strong>{selectedLoan.name}</strong> ({selectedLoan.lender}).
            </p>

            <form onSubmit={handlePayEmi} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Payment Amount ({currencySymbol})</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Current outstanding: <strong>{currencySymbol}{selectedLoan.outstandingAmount?.toLocaleString('en-IN')}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setIsPayEmiOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
