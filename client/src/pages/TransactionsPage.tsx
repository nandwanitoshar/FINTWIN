import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Database,
  Plus,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  FileSpreadsheet,
  FileCode,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol =
    user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';

  // Data state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDirection, setFilterDirection] = useState<string>('ALL');
  const [filterAccount, setFilterAccount] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Modals & Notifications
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showIngestModal, setShowIngestModal] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Ingestion Wizard State
  const [ingestFormat, setIngestFormat] = useState<'csv' | 'json'>('csv');
  const [rawInputContent, setRawInputContent] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [ingestStep, setIngestStep] = useState<'input' | 'preview' | 'result'>('input');
  const [isProcessingIngest, setIsProcessingIngest] = useState<boolean>(false);
  const [ingestSummary, setIngestSummary] = useState<any | null>(null);
  const [ingestErrors, setIngestErrors] = useState<any[]>([]);

  // Manual Add Form State
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'General',
    direction: 'EXPENSE',
    accountId: '',
    entityId: '',
    reference: '',
  });

  // Load Transactions & Accounts
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterDirection !== 'ALL') params.direction = filterDirection;
      if (filterAccount !== 'ALL') params.accountId = filterAccount;
      if (filterCategory !== 'ALL') params.category = filterCategory;

      const [txRes, accRes, entRes] = await Promise.all([
        api.transactions.list(params).catch(() => ({ success: false, transactions: [], total: 0 })),
        api.accounts.list().catch(() => ({ success: false, accounts: [] })),
        api.entities.list().catch(() => ({ success: false, entities: [] })),
      ]);

      if (txRes.success) {
        setTransactions(txRes.transactions || []);
        setTotalCount(txRes.total || (txRes.transactions || []).length);
        setTotalPages((txRes as any).totalPages || Math.ceil((txRes.total || 1) / pageSize));
      } else {
        setTransactions([]);
        setTotalCount(0);
      }

      if (accRes.success && accRes.accounts && Array.isArray(accRes.accounts)) {
        const fetchedAccounts = accRes.accounts;
        setAccounts(fetchedAccounts);
        if (fetchedAccounts.length > 0 && !newTx.accountId) {
          setNewTx((prev) => ({ ...prev, accountId: fetchedAccounts[0]._id }));
          setSelectedAccountId(fetchedAccounts[0]._id);
        }
      }

      if (entRes.success && entRes.entities) {
        setEntities(entRes.entities);
      }
    } catch {
      setTransactions([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filterDirection, filterAccount, filterCategory, newTx.accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique categories list
  const categoryOptions = useMemo(() => {
    const defaultCats = [
      'General',
      'Income',
      'Housing',
      'Food & Dining',
      'Transportation',
      'Utilities',
      'Shopping',
      'Investment',
      'Debt Service',
      'Healthcare',
      'Entertainment',
    ];
    const fromData = transactions.map((t) => t.category).filter(Boolean);
    return Array.from(new Set([...defaultCats, ...fromData]));
  }, [transactions]);

  // Manual Transaction Create
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.description.trim() || !newTx.amount || parseFloat(newTx.amount) <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid positive amount and description.' });
      return;
    }

    const targetAccId = newTx.accountId || (accounts[0]?._id ?? '');
    if (!targetAccId) {
      setNotification({ type: 'error', message: 'An account is required to record a transaction.' });
      return;
    }

    try {
      const res = await api.transactions.create({
        date: newTx.date,
        amount: parseFloat(newTx.amount),
        sourceAccountId: targetAccId,
        accountId: targetAccId,
        destinationEntityId: newTx.entityId || undefined,
        entityId: newTx.entityId || undefined,
        category: newTx.category,
        direction: newTx.direction,
        type: newTx.direction === 'INCOME' ? 'CREDIT' : newTx.direction === 'TRANSFER' ? 'INTERNAL_TRANSFER' : 'DEBIT',
        description: newTx.description.trim(),
        reference: newTx.reference.trim() || undefined,
        currency: accounts.find((a) => a._id === targetAccId)?.currency || user?.currency || 'INR',
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Transaction recorded successfully.' });
        setShowAddModal(false);
        setNewTx({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          category: 'General',
          direction: 'EXPENSE',
          accountId: accounts[0]?._id || '',
          entityId: '',
          reference: '',
        });
        loadData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to record transaction.' });
    }
  };

  // Edit Transaction Handler
  const handleOpenEdit = (tx: any) => {
    setEditingTx({
      _id: tx._id,
      date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : '',
      description: tx.description,
      amount: tx.amount.toString(),
      category: tx.category || 'General',
      direction: tx.direction || (tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE'),
      accountId: tx.sourceAccountId || tx.accountId || accounts[0]?._id || '',
      entityId: tx.destinationEntityId || tx.entityId || '',
      reference: tx.reference || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !editingTx.description.trim() || parseFloat(editingTx.amount) <= 0) return;

    try {
      const res = await api.transactions.update(editingTx._id, {
        date: editingTx.date,
        amount: parseFloat(editingTx.amount),
        sourceAccountId: editingTx.accountId,
        accountId: editingTx.accountId,
        destinationEntityId: editingTx.entityId || undefined,
        entityId: editingTx.entityId || undefined,
        category: editingTx.category,
        direction: editingTx.direction,
        type: editingTx.direction === 'INCOME' ? 'CREDIT' : editingTx.direction === 'TRANSFER' ? 'INTERNAL_TRANSFER' : 'DEBIT',
        description: editingTx.description.trim(),
        reference: editingTx.reference.trim() || undefined,
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Transaction updated successfully.' });
        setShowEditModal(false);
        setEditingTx(null);
        loadData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update transaction.' });
    }
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction? Account balance will be adjusted.')) {
      return;
    }
    try {
      await api.transactions.delete(id);
      setNotification({ type: 'success', message: 'Transaction deleted and balance adjusted.' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete transaction.' });
    }
  };

  // Ingest: File Drop / Load Sample
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setRawInputContent(text);
      if (file.name.endsWith('.json')) {
        setIngestFormat('json');
      } else {
        setIngestFormat('csv');
      }
    };
    reader.readAsText(file);
  };

  const loadSampleData = (format: 'csv' | 'json') => {
    setIngestFormat(format);
    if (format === 'csv') {
      setRawInputContent(
        `Date,Description,Amount,Type,Category\n2026-09-01,Tech Innovations Payroll,85000,CREDIT,Income\n2026-09-03,Apex Real Estate Rent,22000,DEBIT,Housing\n2026-09-05,Supermarket Groceries,3450.50,DEBIT,Food & Dining\n2026-09-08,Electricity Board Bill,1850,DEBIT,Utilities\n2026-09-12,Mutual Fund SIP Investment,10000,DEBIT,Investment`
      );
    } else {
      setRawInputContent(
        JSON.stringify(
          [
            {
              date: '2026-09-01',
              description: 'Tech Innovations Payroll',
              amount: 85000,
              type: 'CREDIT',
              category: 'Income',
            },
            {
              date: '2026-09-03',
              description: 'Apex Real Estate Rent',
              amount: 22000,
              type: 'DEBIT',
              category: 'Housing',
            },
            {
              date: '2026-09-05',
              description: 'Supermarket Groceries',
              amount: 3450.5,
              type: 'DEBIT',
              category: 'Food & Dining',
            },
          ],
          null,
          2
        )
      );
    }
  };

  // Execute Ingest Pipeline
  const handleRunIngest = async () => {
    if (!rawInputContent.trim()) {
      setNotification({ type: 'error', message: 'Please provide CSV or JSON data to ingest.' });
      return;
    }

    setIsProcessingIngest(true);
    setIngestErrors([]);
    try {
      let res: any;
      if (ingestFormat === 'csv') {
        res = await api.ingest.csv(rawInputContent, selectedAccountId || undefined);
      } else {
        let parsedJson: any;
        try {
          parsedJson = JSON.parse(rawInputContent);
        } catch {
          throw new Error('Invalid JSON format. Please verify standard JSON array syntax.');
        }
        res = await api.ingest.json(parsedJson, selectedAccountId || undefined);
      }

      if (res.success) {
        setIngestSummary(res.summary);
        setIngestErrors(res.errors || []);
        setIngestStep('result');
        setNotification({
          type: 'success',
          message: `Ingestion complete! ${res.summary.imported} imported, ${res.summary.duplicates} duplicates skipped.`,
        });
        loadData();
      } else {
        setIngestSummary(res.summary);
        setIngestErrors(res.errors || []);
        setIngestStep('result');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Ingestion pipeline execution failed.' });
    } finally {
      setIsProcessingIngest(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      {/* Page Header */}
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
            01 INGEST • 02 NORMALIZE • 03 MODEL
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Financial Transactions
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Raw records normalized with safe monetary representation, deterministic deduplication, and automated entity mapping.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setIngestStep('input');
              setIngestSummary(null);
              setIngestErrors([]);
              setShowIngestModal(true);
            }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '44px' }}
          >
            <Upload size={16} />
            <span>Ingest Statement (CSV/JSON)</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '44px' }}
          >
            <Plus size={16} />
            <span>Add Transaction</span>
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

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search transactions, description, category, ref..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ paddingLeft: '2.5rem', width: '100%', minHeight: '44px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Direction Filter */}
          <select
            className="input"
            value={filterDirection}
            onChange={(e) => {
              setFilterDirection(e.target.value);
              setCurrentPage(1);
            }}
            style={{ minHeight: '44px', width: 'auto' }}
          >
            <option value="ALL">All Flows</option>
            <option value="INCOME">Income / Credit</option>
            <option value="EXPENSE">Expense / Debit</option>
            <option value="TRANSFER">Internal Transfer</option>
          </select>

          {/* Account Filter */}
          <select
            className="input"
            value={filterAccount}
            onChange={(e) => {
              setFilterAccount(e.target.value);
              setCurrentPage(1);
            }}
            style={{ minHeight: '44px', width: 'auto' }}
          >
            <option value="ALL">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc._id} value={acc._id}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            className="input"
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            style={{ minHeight: '44px', width: 'auto' }}
          >
            <option value="ALL">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="btn btn-outline"
            style={{ minHeight: '44px', padding: '0 0.85rem' }}
            title="Refresh data"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} color="var(--color-accent-teal)" />
            <span style={{ fontWeight: 600 }}>Normalized Ledger</span>
            <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.06)' }}>
              {totalCount} total records
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Synchronizing normalized financial records...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <Database size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No financial records found
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Add your first transaction manually or import a bank statement via CSV or JSON to populate your financial model.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
                style={{ minHeight: '44px' }}
              >
                Add Your First Transaction
              </button>
              <button
                onClick={() => {
                  setIngestStep('input');
                  setShowIngestModal(true);
                }}
                className="btn btn-outline"
                style={{ minHeight: '44px' }}
              >
                Import a Statement
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table Layout (>= 768px) */}
            <div className="table-container" style={{ display: 'block' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--color-text-muted)',
                      background: 'rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <th style={{ padding: '0.85rem 1.5rem' }}>Flow / Date</th>
                    <th style={{ padding: '0.85rem 1.5rem' }}>Description</th>
                    <th style={{ padding: '0.85rem 1.5rem' }}>Category</th>
                    <th style={{ padding: '0.85rem 1.5rem' }}>Account</th>
                    <th style={{ padding: '0.85rem 1.5rem', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '0.85rem 1.5rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => {
                    const isIncome = t.direction === 'INCOME' || t.type === 'CREDIT';
                    const isTransfer = t.direction === 'TRANSFER' || t.type === 'INTERNAL_TRANSFER';
                    const accountName = accounts.find((a) => a._id === (t.sourceAccountId || t.accountId))?.name || 'Primary Account';
                    const dateFormatted = t.date ? new Date(t.date).toLocaleDateString() : 'Recent';

                    return (
                      <tr
                        key={t._id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isIncome
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : isTransfer
                                  ? 'rgba(99, 102, 241, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                                color: isIncome
                                  ? 'var(--color-success)'
                                  : isTransfer
                                  ? '#818cf8'
                                  : 'var(--color-danger)',
                              }}
                            >
                              {isIncome ? (
                                <ArrowDownLeft size={16} />
                              ) : isTransfer ? (
                                <ArrowLeftRight size={16} />
                              ) : (
                                <ArrowUpRight size={16} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                {isIncome ? 'Ingress' : isTransfer ? 'Transfer' : 'Egress'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {dateFormatted}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>
                            {t.description}
                          </div>
                          {t.reference && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Ref: {t.reference}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--color-border)',
                              fontSize: '0.75rem',
                            }}
                          >
                            {t.category}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          {accountName}
                        </td>
                        <td
                          style={{
                            padding: '1rem 1.5rem',
                            textAlign: 'right',
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: isIncome ? 'var(--color-success)' : 'var(--color-text-main)',
                          }}
                        >
                          {isIncome ? '+' : '-'}{currencySymbol}{t.amount?.toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="btn btn-outline"
                              style={{
                                padding: '0.35rem 0.6rem',
                                minHeight: '36px',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title="Edit transaction"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(t._id)}
                              className="btn btn-outline"
                              style={{
                                padding: '0.35rem 0.6rem',
                                minHeight: '36px',
                                color: 'var(--color-danger)',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title="Delete transaction"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Showing records {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="btn btn-outline"
                    style={{ minHeight: '36px', padding: '0 0.75rem' }}
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="btn btn-outline"
                    style={{ minHeight: '36px', padding: '0 0.75rem' }}
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* INGESTION PIPELINE WIZARD MODAL */}
      {/* ========================================================= */}
      {showIngestModal && (
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
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowIngestModal(false)}
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

            {/* Pipeline Stage Indicators */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div className="badge badge-accent" style={{ marginBottom: '0.4rem' }}>
                FinTwin Data Ingestion Pipeline
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
                {ingestStep === 'input'
                  ? 'Stage 01: Raw Financial Ingestion'
                  : 'Stage 02 & 03: Normalization & Modeling Result'}
              </h2>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                <span style={{ color: ingestStep === 'input' ? 'var(--color-accent-teal)' : 'var(--color-success)', fontWeight: 600 }}>
                  01 INGEST
                </span>
                <span>→</span>
                <span style={{ color: ingestStep === 'result' ? 'var(--color-success)' : 'inherit', fontWeight: 600 }}>
                  02 NORMALIZE
                </span>
                <span>→</span>
                <span style={{ color: ingestStep === 'result' ? 'var(--color-success)' : 'inherit', fontWeight: 600 }}>
                  03 MODEL
                </span>
              </div>
            </div>

            {ingestStep === 'input' ? (
              <div>
                {/* Account Selection */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Target Account for Ingestion
                  </label>
                  <select
                    className="input"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    style={{ minHeight: '44px', width: '100%' }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} ({acc.institution}) — Balance: {currencySymbol}{acc.currentBalance?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Format Selection Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setIngestFormat('csv')}
                    className={`btn ${ingestFormat === 'csv' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minHeight: '44px' }}
                  >
                    <FileSpreadsheet size={16} />
                    <span>CSV Statement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIngestFormat('json')}
                    className={`btn ${ingestFormat === 'json' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minHeight: '44px' }}
                  >
                    <FileCode size={16} />
                    <span>JSON Array</span>
                  </button>
                </div>

                {/* File Upload Zone */}
                <div
                  style={{
                    border: '2px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    textAlign: 'center',
                    marginBottom: '1rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <Upload size={24} style={{ color: 'var(--color-accent-teal)', margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    Upload bank statement file (.csv or .json)
                  </p>
                  <input
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    onChange={handleFileUpload}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                {/* Direct Text Input */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Or Paste {ingestFormat.toUpperCase()} Data:
                    </label>
                    <button
                      type="button"
                      onClick={() => loadSampleData(ingestFormat)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-accent-teal)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Load Demo Sample
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    className="input"
                    value={rawInputContent}
                    onChange={(e) => setRawInputContent(e.target.value)}
                    placeholder={
                      ingestFormat === 'csv'
                        ? 'Date,Description,Amount,Type\n2026-09-10,Amazon,700,DEBIT'
                        : '[\n  {\n    "date": "2026-09-10",\n    "description": "Amazon",\n    "amount": 700,\n    "type": "DEBIT"\n  }\n]'
                    }
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowIngestModal(false)}
                    className="btn btn-outline"
                    style={{ minHeight: '44px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingIngest || !rawInputContent.trim()}
                    onClick={handleRunIngest}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '44px' }}
                  >
                    {isProcessingIngest ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Processing Normalization...</span>
                      </>
                    ) : (
                      <>
                        <span>Execute Ingest Pipeline</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Ingestion Result Report */
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Rows</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{ingestSummary?.total || 0}</div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Imported</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-success)' }}>
                      {ingestSummary?.imported || 0}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>Duplicates</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                      {ingestSummary?.duplicates || 0}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>Rejected</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                      {ingestSummary?.rejected || 0}
                    </div>
                  </div>
                </div>

                {/* Row-Level Errors Breakdown if any */}
                {ingestErrors.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '0.5rem' }}>
                      Row-Level Validation Rejections:
                    </h4>
                    <div
                      style={{
                        maxHeight: '180px',
                        overflowY: 'auto',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '0.5rem',
                      }}
                    >
                      {ingestErrors.map((err, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.6rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            gap: '0.5rem',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>Row {err.row}:</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{err.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIngestStep('input');
                      setRawInputContent('');
                    }}
                    className="btn btn-outline"
                    style={{ minHeight: '44px' }}
                  >
                    Ingest Another File
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIngestModal(false)}
                    className="btn btn-primary"
                    style={{ minHeight: '44px' }}
                  >
                    Done & View Ledger
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD MANUAL TRANSACTION MODAL */}
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
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              position: 'relative',
            }}
          >
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

            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Record New Transaction
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Manual entry persisted directly to your normalized MongoDB state.
            </p>

            <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description / Merchant *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Swiggy Dineout, Tech Corp Salary"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input"
                    placeholder="0.00"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Direction / Type *
                  </label>
                  <select
                    className="input"
                    value={newTx.direction}
                    onChange={(e) => setNewTx({ ...newTx, direction: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="EXPENSE">Expense (Debit)</option>
                    <option value="INCOME">Income (Credit)</option>
                    <option value="TRANSFER">Internal Transfer</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Account *
                  </label>
                  <select
                    className="input"
                    value={newTx.accountId}
                    onChange={(e) => setNewTx({ ...newTx, accountId: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <select
                    className="input"
                    value={newTx.category}
                    onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Counterparty Entity (Optional)
                  </label>
                  <select
                    className="input"
                    value={newTx.entityId}
                    onChange={(e) => setNewTx({ ...newTx, entityId: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="">None / Unlinked</option>
                    {entities.map((ent) => (
                      <option key={ent._id} value={ent._id}>
                        {ent.name} ({ent.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Reference / Memo (Optional)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. UTR-9823482, Invoice #441"
                  value={newTx.reference}
                  onChange={(e) => setNewTx({ ...newTx, reference: e.target.value })}
                  style={{ width: '100%', minHeight: '44px' }}
                />
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
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT TRANSACTION MODAL */}
      {/* ========================================================= */}
      {showEditModal && editingTx && (
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
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              position: 'relative',
            }}
          >
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingTx(null);
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

            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Edit Transaction
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Updates will automatically synchronize and rebalance the connected account.
            </p>

            <form onSubmit={handleUpdateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={editingTx.description}
                  onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input"
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx({ ...editingTx, amount: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Direction *
                  </label>
                  <select
                    className="input"
                    value={editingTx.direction}
                    onChange={(e) => setEditingTx({ ...editingTx, direction: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="EXPENSE">Expense (Debit)</option>
                    <option value="INCOME">Income (Credit)</option>
                    <option value="TRANSFER">Internal Transfer</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Account *
                  </label>
                  <select
                    className="input"
                    value={editingTx.accountId}
                    onChange={(e) => setEditingTx({ ...editingTx, accountId: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <select
                    className="input"
                    value={editingTx.category}
                    onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Counterparty Entity
                  </label>
                  <select
                    className="input"
                    value={editingTx.entityId}
                    onChange={(e) => setEditingTx({ ...editingTx, entityId: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="">None / Unlinked</option>
                    {entities.map((ent) => (
                      <option key={ent._id} value={ent._id}>
                        {ent.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Reference / Memo
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingTx.reference}
                  onChange={(e) => setEditingTx({ ...editingTx, reference: e.target.value })}
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTx(null);
                  }}
                  className="btn btn-outline"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
                  Update Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
