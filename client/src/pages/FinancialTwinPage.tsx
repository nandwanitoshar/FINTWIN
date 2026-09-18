import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Network,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';

export const FinancialTwinPage: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol =
    user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [networkData, setNetworkData] = useState<any | null>(null);
  const [selectedTwinNodeId, setSelectedTwinNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'assets' | 'liabilities'>('all');

  const [newAcc, setNewAcc] = useState({
    name: '',
    type: 'CHECKING',
    institution: '',
    currency: 'INR',
    currentBalance: '',
    initialBalance: '',
    creditLimit: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accRes, txRes, entRes, netRes] = await Promise.all([
        api.accounts.list().catch(() => ({ success: false, accounts: [] })),
        api.transactions.list({ limit: 1000 }).catch(() => ({ success: false, transactions: [] })),
        api.entities.list().catch(() => ({ success: false, entities: [] })),
        api.network.get().catch(() => ({ success: false, network: null })),
      ]);

      if (accRes.success && accRes.accounts) {
        setAccounts(accRes.accounts);
      } else {
        setAccounts([]);
      }

      if (txRes.success && txRes.transactions) {
        setTransactions(txRes.transactions);
      }

      if (entRes.success && entRes.entities) {
        setEntities(entRes.entities);
      }

      if (netRes.success && netRes.network) {
        setNetworkData(netRes.network);
        if (netRes.network.nodes?.length > 0 && !selectedTwinNodeId) {
          setSelectedTwinNodeId(netRes.network.nodes[0].id);
        }
      }
    } catch {
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTwinNodeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute transaction counts and connected entities per account
  const accountStats = useMemo(() => {
    const map = new Map<string, { txCount: number; connectedEntities: Set<string> }>();
    accounts.forEach((acc) => {
      map.set(acc._id, { txCount: 0, connectedEntities: new Set<string>() });
    });

    transactions.forEach((tx) => {
      const accId = tx.sourceAccountId || tx.accountId;
      if (accId && map.has(accId)) {
        const cur = map.get(accId)!;
        cur.txCount += 1;
        const entId = tx.destinationEntityId || tx.entityId;
        if (entId) cur.connectedEntities.add(entId);
      }
    });

    return map;
  }, [accounts, transactions]);

  // Totals
  const totalAssets = accounts
    .filter((a) => !['CREDIT_CARD', 'LOAN'].includes(a.type))
    .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const totalLiabilities = accounts
    .filter((a) => ['CREDIT_CARD', 'LOAN'].includes(a.type))
    .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const netWorth = totalAssets - totalLiabilities;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcc.name.trim() || !newAcc.institution.trim()) return;

    try {
      const res = await api.accounts.create({
        name: newAcc.name.trim(),
        type: newAcc.type,
        institution: newAcc.institution.trim(),
        currency: newAcc.currency || 'INR',
        currentBalance: parseFloat(newAcc.currentBalance) || 0,
        initialBalance: newAcc.initialBalance ? parseFloat(newAcc.initialBalance) : (parseFloat(newAcc.currentBalance) || 0),
        creditLimit: newAcc.creditLimit ? parseFloat(newAcc.creditLimit) : 0,
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Account registered to foundation state.' });
        setShowAddModal(false);
        setNewAcc({
          name: '',
          type: 'CHECKING',
          institution: '',
          currency: 'INR',
          currentBalance: '',
          initialBalance: '',
          creditLimit: '',
        });
        loadData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to create account.' });
    }
  };

  const handleOpenEdit = (acc: any) => {
    setEditingAccount({
      _id: acc._id,
      name: acc.name,
      type: acc.type,
      institution: acc.institution,
      currency: acc.currency || 'INR',
      currentBalance: acc.currentBalance?.toString() || '0',
      creditLimit: acc.creditLimit?.toString() || '0',
    });
    setShowEditModal(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editingAccount.name.trim()) return;

    try {
      const res = await api.accounts.update(editingAccount._id, {
        name: editingAccount.name.trim(),
        type: editingAccount.type,
        institution: editingAccount.institution.trim(),
        currency: editingAccount.currency || 'INR',
        currentBalance: parseFloat(editingAccount.currentBalance) || 0,
        creditLimit: editingAccount.creditLimit ? parseFloat(editingAccount.creditLimit) : 0,
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Account updated successfully.' });
        setShowEditModal(false);
        setEditingAccount(null);
        loadData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update account.' });
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await api.accounts.delete(id);
      setNotification({ type: 'success', message: 'Account removed from active state.' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete account.' });
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (activeTab === 'assets') return !['CREDIT_CARD', 'LOAN'].includes(acc.type);
    if (activeTab === 'liabilities') return ['CREDIT_CARD', 'LOAN'].includes(acc.type);
    return true;
  });

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div>
          <div className="badge badge-accent" style={{ marginBottom: '0.5rem' }}>
            Stage 04 CONNECT • Digital Twin Core
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Living Financial Digital Twin
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            This is a connected representation of your financial world — unifying accounts, counterparties, balances, and real-time cashflow relationships.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/network"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minHeight: '44px' }}
          >
            <Network size={16} />
            <span>Explore Full Network</span>
            <ArrowRight size={14} />
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '44px' }}
          >
            <Plus size={16} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.75rem',
            background:
              notification.type === 'success'
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${
              notification.type === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            color: notification.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Digital Twin Overview Metrics (Deterministic Database Backed) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card-glass" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Connected Nodes
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            {networkData?.metrics?.nodeCount ?? (accounts.length + entities.length)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Accounts & Entities
          </div>
        </div>

        <div className="card-glass" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Active Relationships
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-cyan)' }}>
            {networkData?.metrics?.edgeCount ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Directional Flows
          </div>
        </div>

        <div className="card-glass" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Total Asset Holdings
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-success)' }}>
            {currencySymbol}{totalAssets.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {accounts.filter((a) => !['CREDIT_CARD', 'LOAN'].includes(a.type)).length} Asset Accounts
          </div>
        </div>

        <div className="card-glass" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Total Liabilities
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-danger)' }}>
            {currencySymbol}{totalLiabilities.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {accounts.filter((a) => ['CREDIT_CARD', 'LOAN'].includes(a.type)).length} Liabilities
          </div>
        </div>

        <div className="card-glass" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Calculated Net Worth
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: netWorth >= 0 ? 'var(--color-text)' : 'var(--color-danger)' }}>
            {currencySymbol}{netWorth.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Deterministic Value
          </div>
        </div>

        <div className="card-glass" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Transaction Events
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            {transactions.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Synchronized
          </div>
        </div>
      </div>

      {/* Network Preview Snapshot & Object Inspector */}
      {networkData && networkData.nodes && networkData.nodes.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: '1.5rem',
            marginBottom: '2.5rem',
          }}
          className="twin-preview-grid"
        >
          {/* Visual Network Preview Snapshot */}
          <div
            className="card-glass"
            style={{
              padding: '1.25rem',
              position: 'relative',
              overflow: 'hidden',
              background: 'radial-gradient(ellipse at 50% 50%, rgba(30, 41, 59, 0.4) 0%, rgba(10, 15, 29, 0.95) 100%)',
              minHeight: '280px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Network size={16} color="var(--color-accent-bright)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Connected Graph Preview</span>
              </div>
              <Link to="/network" style={{ fontSize: '0.8rem', color: 'var(--color-accent-bright)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Full View <ArrowRight size={12} />
              </Link>
            </div>

            <svg viewBox="0 0 500 240" style={{ width: '100%', height: '220px', display: 'block' }}>
              {/* Preview Edges */}
              {(networkData.edges || []).slice(0, 8).map((edge: any, idx: number) => {
                const src = networkData.nodes.find((n: any) => n.id === edge.source);
                const tgt = networkData.nodes.find((n: any) => n.id === edge.target);
                if (!src || !tgt) return null;

                const x1 = src.type === 'ENTITY' ? 90 : 250;
                const y1 = 60 + (idx % 3) * 60;
                const x2 = tgt.type === 'ENTITY' ? 410 : 250;
                const y2 = 80 + (idx % 2) * 80;

                return (
                  <line
                    key={edge.id || idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={edge.color || 'var(--color-accent-bright)'}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                    strokeDasharray={edge.relationshipType === 'TRANSFERS_TO' ? '4 2' : 'none'}
                  />
                );
              })}

              {/* Preview Nodes */}
              {(networkData.nodes || []).slice(0, 6).map((node: any, idx: number) => {
                const isSelected = selectedTwinNodeId === node.id;
                let cx = 250;
                let cy = 80 + (idx % 2) * 80;

                if (node.type === 'ENTITY') {
                  cx = node.subtype === 'EMPLOYER' ? 90 : 410;
                  cy = 60 + (idx % 3) * 60;
                } else if (node.subtype === 'SAVINGS') {
                  cx = 320;
                  cy = 150;
                } else if (node.subtype === 'CHECKING') {
                  cx = 190;
                  cy = 110;
                }

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedTwinNodeId(node.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isSelected && (
                      <circle cx={cx} cy={cy} r="22" fill="none" stroke={node.color} strokeWidth="2" strokeDasharray="3 2" />
                    )}
                    <circle cx={cx} cy={cy} r="16" fill="var(--color-bg-alt)" stroke={node.color} strokeWidth="2" />
                    <text x={cx} y={cy + 4} fill="var(--color-text)" fontSize="8" fontWeight="700" textAnchor="middle">
                      {node.subtype ? node.subtype.substring(0, 3).toUpperCase() : 'ACC'}
                    </text>
                    <text x={cx} y={cy + 28} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                      {node.label.length > 14 ? node.label.substring(0, 12) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Selected Object Inspector */}
          <div className="card-glass" style={{ padding: '1.25rem', minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <Sparkles size={16} color="var(--color-accent-bright)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Selected Object Inspector</span>
              </div>

              {selectedTwinNodeId ? (
                (() => {
                  const node = networkData.nodes.find((n: any) => n.id === selectedTwinNodeId) || networkData.nodes[0];
                  if (!node) return null;
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.2rem 0' }}>{node.label}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {node.institution || node.category || node.type}
                          </span>
                        </div>
                        <span className="badge" style={{ background: `${node.color}22`, color: node.color }}>
                          {node.subtype || node.type}
                        </span>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '6px', margin: '0.85rem 0' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                          {node.type === 'ACCOUNT' ? 'Current Balance' : 'Flow Volume'}
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: node.color }}>
                          {currencySymbol}{Number(node.type === 'ACCOUNT' ? node.balance : node.flowVolume).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'grid', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Node Type:</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{node.type}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Recorded Events:</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{node.transactionCount || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Health Status:</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{node.health || 'HEALTHY'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  <Info size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.85rem' }}>Select any node in the graph preview to inspect its live state.</p>
                </div>
              )}
            </div>

            {selectedTwinNodeId && (
              <Link
                to={`/simulation?accountId=${selectedTwinNodeId.replace('acc_', '')}`}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '0.82rem', marginTop: '0.75rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                <Sparkles size={14} />
                <span>Simulate Decision with this Node →</span>
              </Link>
            )}

            <Link
              to="/network"
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.82rem', marginTop: '0.5rem', textAlign: 'center' }}
            >
              Inspect in Full Network View →
            </Link>
          </div>
        </div>
      )}

      {/* Responsive helper for twin preview */}
      <style>{`
        @media (max-width: 860px) {
          .twin-preview-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('all')}
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
          style={{ minHeight: '38px', padding: '0 1rem' }}
        >
          All Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`btn ${activeTab === 'assets' ? 'btn-primary' : 'btn-outline'}`}
          style={{ minHeight: '38px', padding: '0 1rem' }}
        >
          Assets
        </button>
        <button
          onClick={() => setActiveTab('liabilities')}
          className={`btn ${activeTab === 'liabilities' ? 'btn-primary' : 'btn-outline'}`}
          style={{ minHeight: '38px', padding: '0 1rem' }}
        >
          Liabilities & Credit
        </button>
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p>Loading accounts...</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '1px dashed var(--color-border)',
          }}
        >
          <CreditCard size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1.25rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No accounts found in this category
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Add an account to establish your financial state.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ minHeight: '44px' }}>
            Add Your First Account
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredAccounts.map((acc) => {
            const isLiability = ['CREDIT_CARD', 'LOAN'].includes(acc.type);
            const stats = accountStats.get(acc._id) || { txCount: 0, connectedEntities: new Set() };

            return (
              <div
                key={acc._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>{acc.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {acc.institution} • Currency: {acc.currency || 'INR'}
                      </span>
                    </div>
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.75rem',
                        background: isLiability ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isLiability ? 'var(--color-danger)' : 'var(--color-success)',
                        fontWeight: 600,
                      }}
                    >
                      {acc.type}
                    </span>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Current Balance</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                      {acc.currency === 'USD' ? '$' : acc.currency === 'EUR' ? '€' : acc.currency === 'GBP' ? '£' : '₹'}
                      {acc.currentBalance?.toLocaleString()}
                    </div>
                    {acc.creditLimit > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                        Credit Limit: {currencySymbol}{acc.creditLimit?.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Connected Stats */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Transactions</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{stats.txCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Connected Entities</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent-teal)' }}>
                        {stats.connectedEntities.size}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  <Link
                    to={`/simulation?accountId=${acc._id}`}
                    className="btn btn-primary"
                    style={{ minHeight: '36px', padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}
                    title="Simulate decision with this account"
                  >
                    <Sparkles size={13} />
                    <span>Simulate</span>
                  </Link>
                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="btn btn-outline"
                    style={{ minHeight: '36px', padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Edit2 size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc._id)}
                    className="btn btn-outline"
                    style={{
                      minHeight: '36px',
                      padding: '0 0.75rem',
                      color: 'var(--color-danger)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Archive</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD ACCOUNT MODAL */}
      {/* ========================================================= */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Add Financial Account
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Create a structured account node in your financial model.
            </p>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. HDFC Salary Account, Emergency Fund"
                  value={newAcc.name}
                  onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Account Type *
                  </label>
                  <select
                    className="input"
                    value={newAcc.type}
                    onChange={(e) => setNewAcc({ ...newAcc, type: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="CHECKING">Checking / Current</option>
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="LOAN">Loan Facility</option>
                    <option value="INVESTMENT">Investment Account</option>
                    <option value="WALLET">Digital Wallet</option>
                    <option value="CASH">Cash Reserve</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Currency *
                  </label>
                  <select
                    className="input"
                    value={newAcc.currency}
                    onChange={(e) => setNewAcc({ ...newAcc, currency: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Financial Institution *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  value={newAcc.institution}
                  onChange={(e) => setNewAcc({ ...newAcc, institution: e.target.value })}
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Starting Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    value={newAcc.currentBalance}
                    onChange={(e) => setNewAcc({ ...newAcc, currentBalance: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Credit Limit (if applicable)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    value={newAcc.creditLimit}
                    onChange={(e) => setNewAcc({ ...newAcc, creditLimit: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-outline"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
                  Create Account Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT ACCOUNT MODAL */}
      {/* ========================================================= */}
      {showEditModal && editingAccount && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingAccount(null);
              }}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Edit Account Node
            </h2>

            <form onSubmit={handleUpdateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Type *
                  </label>
                  <select
                    className="input"
                    value={editingAccount.type}
                    onChange={(e) => setEditingAccount({ ...editingAccount, type: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="LOAN">Loan</option>
                    <option value="INVESTMENT">Investment</option>
                    <option value="WALLET">Wallet</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Currency
                  </label>
                  <select
                    className="input"
                    value={editingAccount.currency}
                    onChange={(e) => setEditingAccount({ ...editingAccount, currency: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Institution *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={editingAccount.institution}
                  onChange={(e) => setEditingAccount({ ...editingAccount, institution: e.target.value })}
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Current Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={editingAccount.currentBalance}
                    onChange={(e) => setEditingAccount({ ...editingAccount, currentBalance: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={editingAccount.creditLimit}
                    onChange={(e) => setEditingAccount({ ...editingAccount, creditLimit: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAccount(null);
                  }}
                  className="btn btn-outline"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
                  Update Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
