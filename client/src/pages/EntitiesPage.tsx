import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  Building,
  CreditCard,
  Zap,
  ShoppingBag,
  TrendingUp,
  Landmark,
  User,
  Users,
  X,
  RefreshCw,
} from 'lucide-react';

export const EntitiesPage: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol =
    user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';

  const [entities, setEntities] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingEntity, setEditingEntity] = useState<any | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [newEntity, setNewEntity] = useState({
    name: '',
    type: 'MERCHANT',
    category: 'General',
    cadenceScore: '0.5',
    riskRating: 'LOW',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [entRes, txRes] = await Promise.all([
        api.entities.list().catch(() => ({ success: false, entities: [] })),
        api.transactions.list({ limit: 1000 }).catch(() => ({ success: false, transactions: [] })),
      ]);

      if (entRes.success && entRes.entities) {
        setEntities(entRes.entities);
      } else {
        setEntities([]);
      }

      if (txRes.success && txRes.transactions) {
        setTransactions(txRes.transactions);
      }
    } catch {
      setEntities([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute transaction counts and volume per entity deterministically
  const entityStats = useMemo(() => {
    const map = new Map<string, { count: number; volume: number }>();
    transactions.forEach((tx) => {
      const entId = tx.destinationEntityId || tx.entityId;
      if (entId) {
        const cur = map.get(entId) || { count: 0, volume: 0 };
        cur.count += 1;
        cur.volume += tx.amount || 0;
        map.set(entId, cur);
      }
    });
    return map;
  }, [transactions]);

  // Filtered entities list
  const filteredEntities = useMemo(() => {
    return entities.filter((ent) => {
      const matchesSearch =
        !searchTerm.trim() ||
        ent.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        ent.category.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchesType = filterType === 'ALL' || ent.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [entities, searchTerm, filterType]);

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity.name.trim()) return;

    try {
      const res = await api.entities.create({
        name: newEntity.name.trim(),
        type: newEntity.type,
        category: newEntity.category.trim() || 'General',
        cadenceScore: parseFloat(newEntity.cadenceScore) || 0.5,
        riskRating: newEntity.riskRating,
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Entity created successfully.' });
        setShowAddModal(false);
        setNewEntity({
          name: '',
          type: 'MERCHANT',
          category: 'General',
          cadenceScore: '0.5',
          riskRating: 'LOW',
        });
        loadData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to create entity.' });
    }
  };

  const handleOpenEdit = (ent: any) => {
    setEditingEntity({
      _id: ent._id,
      name: ent.name,
      type: ent.type,
      category: ent.category || 'General',
      cadenceScore: ent.cadenceScore?.toString() || '0.5',
      riskRating: ent.riskRating || 'LOW',
    });
    setShowEditModal(true);
  };

  const handleUpdateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity || !editingEntity.name.trim()) return;

    try {
      const res = await api.entities.update(editingEntity._id, {
        name: editingEntity.name.trim(),
        type: editingEntity.type,
        category: editingEntity.category.trim() || 'General',
        cadenceScore: parseFloat(editingEntity.cadenceScore) || 0.5,
        riskRating: editingEntity.riskRating,
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Entity updated successfully.' });
        setShowEditModal(false);
        setEditingEntity(null);
        loadData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update entity.' });
    }
  };

  const handleDeleteEntity = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this entity?')) return;
    try {
      await api.entities.delete(id);
      setNotification({ type: 'success', message: 'Entity deleted successfully.' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete entity.' });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMPLOYER':
        return <Building size={18} color="var(--color-success)" />;
      case 'LENDER':
        return <CreditCard size={18} color="var(--color-danger)" />;
      case 'UTILITY':
        return <Zap size={18} color="var(--color-warning)" />;
      case 'INVESTMENT_BROKER':
        return <TrendingUp size={18} color="var(--color-cyan)" />;
      case 'BANK':
        return <Landmark size={18} color="var(--color-accent-teal)" />;
      case 'INDIVIDUAL':
        return <User size={18} color="#a855f7" />;
      case 'ORGANIZATION':
        return <Users size={18} color="#ec4899" />;
      default:
        return <ShoppingBag size={18} color="var(--color-accent-bright)" />;
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
            03 MODEL • Counterparty Directory
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Financial Entities & Counterparties
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Counterparties, employers, lenders, and merchants connected through transaction flows in your financial state.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '44px' }}
        >
          <Plus size={16} />
          <span>Add Counterparty Entity</span>
        </button>
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

      {/* Search & Filter Bar */}
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
            placeholder="Search entities by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%', minHeight: '44px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ minHeight: '44px', width: 'auto' }}
          >
            <option value="ALL">All Entity Types</option>
            <option value="EMPLOYER">Employer (Income)</option>
            <option value="LENDER">Lender (Debt)</option>
            <option value="UTILITY">Utility / Recurring</option>
            <option value="MERCHANT">Merchant / Retail</option>
            <option value="INVESTMENT_BROKER">Investment Broker</option>
            <option value="BANK">Bank</option>
            <option value="SERVICE_PROVIDER">Service Provider</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="ORGANIZATION">Organization</option>
            <option value="OTHER">Other</option>
          </select>

          <button
            onClick={loadData}
            className="btn btn-outline"
            style={{ minHeight: '44px', padding: '0 0.85rem' }}
            title="Refresh entities"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Entity Cards Grid */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p>Loading counterparty directory...</p>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '1px dashed var(--color-border)',
          }}
        >
          <Building size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1.25rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No Counterparties Found
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            Importing transactions automatically discovers and normalizes counterparties, or you can register an entity manually.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ minHeight: '44px' }}>
            Add Your First Entity
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
          {filteredEntities.map((ent) => {
            const stats = entityStats.get(ent._id) || { count: 0, volume: 0 };
            return (
              <div
                key={ent._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getTypeIcon(ent.type)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{ent.name}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {ent.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background:
                          ent.riskRating === 'HIGH'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : ent.riskRating === 'MEDIUM'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(16, 185, 129, 0.2)',
                        color:
                          ent.riskRating === 'HIGH'
                            ? 'var(--color-danger)'
                            : ent.riskRating === 'MEDIUM'
                            ? 'var(--color-warning)'
                            : 'var(--color-success)',
                      }}
                    >
                      {ent.type}
                    </span>
                  </div>

                  {/* Deterministic Transaction Stats */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.2)',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Linked Transactions
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {stats.count}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Flow Volume
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent-teal)' }}>
                        {currencySymbol}{stats.volume.toLocaleString()}
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
                  <button
                    onClick={() => handleOpenEdit(ent)}
                    className="btn btn-outline"
                    style={{ minHeight: '36px', padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Edit2 size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteEntity(ent._id)}
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
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD ENTITY MODAL */}
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
              Add Counterparty Entity
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Register external parties connected to your transaction flows.
            </p>

            <form onSubmit={handleCreateEntity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Entity / Counterparty Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Swiggy, Apex Real Estate, HDFC Bank"
                  value={newEntity.name}
                  onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Entity Type *
                  </label>
                  <select
                    className="input"
                    value={newEntity.type}
                    onChange={(e) => setNewEntity({ ...newEntity, type: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="MERCHANT">Merchant / Retail</option>
                    <option value="EMPLOYER">Employer (Salary)</option>
                    <option value="LENDER">Lender (Debt)</option>
                    <option value="UTILITY">Utility / Service</option>
                    <option value="INVESTMENT_BROKER">Investment Broker</option>
                    <option value="BANK">Bank</option>
                    <option value="SERVICE_PROVIDER">Service Provider</option>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="ORGANIZATION">Organization</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Dining, Rent, Payroll"
                    value={newEntity.category}
                    onChange={(e) => setNewEntity({ ...newEntity, category: e.target.value })}
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
                  Save Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT ENTITY MODAL */}
      {/* ========================================================= */}
      {showEditModal && editingEntity && (
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
                setEditingEntity(null);
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
              Edit Counterparty Entity
            </h2>

            <form onSubmit={handleUpdateEntity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Entity Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={editingEntity.name}
                  onChange={(e) => setEditingEntity({ ...editingEntity, name: e.target.value })}
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
                    value={editingEntity.type}
                    onChange={(e) => setEditingEntity({ ...editingEntity, type: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    <option value="MERCHANT">Merchant</option>
                    <option value="EMPLOYER">Employer</option>
                    <option value="LENDER">Lender</option>
                    <option value="UTILITY">Utility</option>
                    <option value="INVESTMENT_BROKER">Investment Broker</option>
                    <option value="BANK">Bank</option>
                    <option value="SERVICE_PROVIDER">Service Provider</option>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="ORGANIZATION">Organization</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={editingEntity.category}
                    onChange={(e) => setEditingEntity({ ...editingEntity, category: e.target.value })}
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntity(null);
                  }}
                  className="btn btn-outline"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
                  Update Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
