import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Wallet,
  Coins,
  TrendingUp,
  Landmark,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ACCOUNT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; isLiability: boolean }
> = {
  CHECKING: { label: 'Checking Account', icon: <Landmark size={18} />, color: '#6366f1', isLiability: false },
  SAVINGS: { label: 'Savings Account', icon: <Building2 size={18} />, color: '#10b981', isLiability: false },
  WALLET: { label: 'Digital Wallet / UPI', icon: <Wallet size={18} />, color: '#06b6d4', isLiability: false },
  CASH: { label: 'Physical Cash Reserve', icon: <Coins size={18} />, color: '#8b5cf6', isLiability: false },
  INVESTMENT: { label: 'Investment Portfolio', icon: <TrendingUp size={18} />, color: '#f59e0b', isLiability: false },
  CREDIT_CARD: { label: 'Credit Card Facility', icon: <CreditCard size={18} />, color: '#f43f5e', isLiability: true },
  LOAN: { label: 'Loan / Debt Account', icon: <CreditCard size={18} />, color: '#ef4444', isLiability: true },
  OTHER: { label: 'Other Financial Instrument', icon: <Layers size={18} />, color: '#94a3b8', isLiability: false },
};

export const AccountsPage: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol =
    user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';

  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ASSETS' | 'LIABILITIES'>('ALL');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<any | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('CHECKING');
  const [formInstitution, setFormInstitution] = useState('');
  const [formBalance, setFormBalance] = useState('0');
  const [formCreditLimit, setFormCreditLimit] = useState('0');
  const [formInterestApr, setFormInterestApr] = useState('0');
  const [formMask, setFormMask] = useState('••••');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.accounts.list();
      if (res.success && res.accounts) {
        setAccounts(res.accounts);
      }
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Aggregate metrics
  const { totalAssets, totalLiabilities, netWorth, liquidReserves } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    let liquid = 0;

    for (const a of accounts) {
      const bal = a.currentBalance ?? a.balance ?? 0;
      const isLiab = ['CREDIT_CARD', 'LOAN'].includes(a.type);
      if (isLiab) {
        liabilities += Math.abs(bal);
      } else {
        assets += bal;
        if (['CHECKING', 'SAVINGS', 'WALLET', 'CASH'].includes(a.type)) {
          liquid += bal;
        }
      }
    }

    return {
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: assets - liabilities,
      liquidReserves: liquid,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (activeFilter === 'ASSETS') {
      return accounts.filter((a) => !['CREDIT_CARD', 'LOAN'].includes(a.type));
    }
    if (activeFilter === 'LIABILITIES') {
      return accounts.filter((a) => ['CREDIT_CARD', 'LOAN'].includes(a.type));
    }
    return accounts;
  }, [accounts, activeFilter]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formInstitution.trim()) {
      setNotification({ type: 'error', message: 'Account name and institution are required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.accounts.create({
        name: formName.trim(),
        type: formType,
        institution: formInstitution.trim(),
        currency: user?.currency || 'INR',
        currentBalance: parseFloat(formBalance) || 0,
        initialBalance: parseFloat(formBalance) || 0,
        creditLimit: parseFloat(formCreditLimit) || 0,
        interestRateApr: parseFloat(formInterestApr) || 0,
        accountNumberMask: formMask.trim() || '••••',
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Account successfully created and synchronized with Digital Twin.' });
        setIsAddOpen(false);
        resetForm();
        loadAccounts();
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to create account.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error creating account.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcc) return;

    setIsSubmitting(true);
    try {
      const res = await api.accounts.update(selectedAcc._id, {
        name: formName.trim(),
        institution: formInstitution.trim(),
        currentBalance: parseFloat(formBalance) || 0,
        creditLimit: parseFloat(formCreditLimit) || 0,
        interestRateApr: parseFloat(formInterestApr) || 0,
        accountNumberMask: formMask.trim() || '••••',
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Account balance updated successfully.' });
        setIsEditOpen(false);
        resetForm();
        loadAccounts();
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to update account.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error updating account.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete account "${name}"? This will archive the account.`)) return;
    try {
      const res = await api.accounts.delete(id);
      if (res.success) {
        setNotification({ type: 'success', message: 'Account removed.' });
        loadAccounts();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete account.' });
    }
  };

  const openEditModal = (acc: any) => {
    setSelectedAcc(acc);
    setFormName(acc.name);
    setFormType(acc.type);
    setFormInstitution(acc.institution);
    setFormBalance((acc.currentBalance ?? acc.balance ?? 0).toString());
    setFormCreditLimit((acc.creditLimit || 0).toString());
    setFormInterestApr((acc.interestRateApr || 0).toString());
    setFormMask(acc.accountNumberMask || '••••');
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setSelectedAcc(null);
    setFormName('');
    setFormType('CHECKING');
    setFormInstitution('');
    setFormBalance('0');
    setFormCreditLimit('0');
    setFormInterestApr('0');
    setFormMask('••••');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div className="badge badge-accent" style={{ marginBottom: '0.5rem' }}>
            <Building2 size={13} style={{ marginRight: '0.35rem' }} /> Financial Anatomy
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>
            Account Management
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginTop: '0.35rem', maxWidth: '640px' }}>
            Central repository of all financial accounts, liquidity repositories, wallets, and debt facilities mapped to your Digital Twin.
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
          <Plus size={16} /> Link / Add Account
        </button>
      </div>

      {/* Snapshot KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card-glass" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Total Assets</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)' }}>
            {currencySymbol}{totalAssets.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Across all asset accounts
          </div>
        </div>

        <div className="card-glass" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Liquid Reserves</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent-bright)' }}>
            {currencySymbol}{liquidReserves.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Checking, Savings, UPI, Cash
          </div>
        </div>

        <div className="card-glass" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Total Liabilities</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-danger)' }}>
            {currencySymbol}{totalLiabilities.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Credit cards & loan balances
          </div>
        </div>

        <div className="card-glass" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Calculated Net Worth</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: netWorth >= 0 ? 'var(--color-text)' : 'var(--color-danger)' }}>
            {currencySymbol}{netWorth.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Assets minus Liabilities
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`btn ${activeFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
        >
          All Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setActiveFilter('ASSETS')}
          className={`btn ${activeFilter === 'ASSETS' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
        >
          Assets
        </button>
        <button
          onClick={() => setActiveFilter('LIABILITIES')}
          className={`btn ${activeFilter === 'LIABILITIES' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
        >
          Liabilities
        </button>
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading synchronized accounts...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
          <Building2 size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1.25rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Accounts Found</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', maxWidth: '460px', margin: '0 auto 1.75rem' }}>
            Add your checking account, digital wallet, or investment portfolio to begin modeling your digital financial twin.
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="btn btn-primary"
          >
            Add Your First Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredAccounts.map((acc) => {
            const cfg = ACCOUNT_TYPE_CONFIG[acc.type] || ACCOUNT_TYPE_CONFIG.OTHER;
            const bal = acc.currentBalance ?? acc.balance ?? 0;

            return (
              <div
                key={acc._id}
                className="card-glass"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: `4px solid ${cfg.color}`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          background: `${cfg.color}15`,
                          color: cfg.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {cfg.icon}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{acc.name}</h3>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {acc.institution} • {acc.accountNumberMask || '••••'}
                        </div>
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: cfg.color,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Balance Display */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {cfg.isLiability ? 'Current Balance / Liability' : 'Current Available Balance'}
                    </span>
                    <div
                      style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: cfg.isLiability ? 'var(--color-danger)' : 'var(--color-text)',
                        marginTop: '0.15rem',
                      }}
                    >
                      {currencySymbol}{Math.abs(bal).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Secondary Details */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--color-glass-border)',
                      borderRadius: '0.5rem',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: '1rem',
                    }}
                  >
                    <span>Currency: <strong>{acc.currency || 'INR'}</strong></span>
                    <span>Status: <strong style={{ color: 'var(--color-success)' }}>{acc.status || 'ACTIVE'}</strong></span>
                    {acc.creditLimit > 0 && <span>Limit: <strong>{currencySymbol}{acc.creditLimit.toLocaleString('en-IN')}</strong></span>}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-glass-border)', paddingTop: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => openEditModal(acc)}
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Edit2 size={13} /> Edit Balance
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(acc._id, acc.name)}
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                      title="Archive Account"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <Link
                    to={`/transactions?accountId=${acc._id}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <span>View Ledger</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Link Financial Account</h2>
              <button onClick={() => setIsAddOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Account Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Primary Salary Checking"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Account Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="CHECKING">Checking Account</option>
                    <option value="SAVINGS">Savings Account</option>
                    <option value="WALLET">Digital Wallet (UPI / PayPal)</option>
                    <option value="CASH">Physical Cash</option>
                    <option value="INVESTMENT">Investment Account</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="LOAN">Loan Facility</option>
                    <option value="OTHER">Other Instrument</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Institution Name</label>
                  <input
                    type="text"
                    required
                    value={formInstitution}
                    onChange={(e) => setFormInstitution(e.target.value)}
                    placeholder="e.g. HDFC Bank, Chase, Zerodha"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Opening Balance ({currencySymbol})</label>
                  <input
                    type="number"
                    value={formBalance}
                    onChange={(e) => setFormBalance(e.target.value)}
                    placeholder="0"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Masked Digits (Last 4)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formMask}
                    onChange={(e) => setFormMask(e.target.value)}
                    placeholder="•••• 4821"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {formType === 'CREDIT_CARD' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Credit Limit ({currencySymbol})</label>
                  <input
                    type="number"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                    placeholder="150000"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Linking...' : 'Link Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {isEditOpen && selectedAcc && (
        <div className="modal-backdrop" onClick={() => setIsEditOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Update: {selectedAcc.name}</h2>
              <button onClick={() => setIsEditOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Account Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Current Balance ({currencySymbol})</label>
                <input
                  type="number"
                  required
                  value={formBalance}
                  onChange={(e) => setFormBalance(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Institution</label>
                  <input
                    type="text"
                    required
                    value={formInstitution}
                    onChange={(e) => setFormInstitution(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Account Mask</label>
                  <input
                    type="text"
                    value={formMask}
                    onChange={(e) => setFormMask(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
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
    </div>
  );
};
