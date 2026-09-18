import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Info,
  Sparkles,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Layers,
  Route,
  Search,
  Play,
  X,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface NetworkNode {
  id: string;
  label: string;
  type: 'ACCOUNT' | 'ENTITY';
  subtype: string;
  balance: number;
  balancePaise?: number;
  isLiquid?: boolean;
  institution?: string;
  category?: string;
  color: string;
  flowVolume: number;
  flowVolumePaise?: number;
  inflowVolume?: number;
  outflowVolume?: number;
  transactionCount?: number;
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  isRecurring?: boolean;
  recurringDetails?: {
    cadence: string;
    averageAmount: number;
    nextEstimatedDate?: string;
  };
  riskSignals?: Array<{
    id: string;
    code?: string;
    title: string;
    severity: string;
    causalMessage: string;
  }>;
  networkSharePct?: number;
  x?: number;
  y?: number;
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  sourceLabel: string;
  targetLabel: string;
  relationshipType: string;
  direction: string;
  transactionCount: number;
  totalVolume: number;
  totalVolumePaise?: number;
  currency: string;
  firstSeen: string;
  lastSeen: string;
  strength: number;
  isRecurring?: boolean;
  recurringDetails?: {
    cadence: string;
    averageAmount: number;
    nextEstimatedDate?: string;
  };
  averageTransaction?: number;
  metadata: {
    incomeVolume: number;
    expenseVolume: number;
    transferVolume: number;
    category?: string;
    flowType: string;
    cadence: string;
  };
  color: string;
}

export const NetworkPage: React.FC = () => {
  const { user } = useAuth();
  const currencySymbol =
    user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';

  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Time Range & Filter
  const [timeRange, setTimeRange] = useState<'ALL' | '30D' | '90D' | '12M'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'ACCOUNTS' | 'ENTITIES' | 'INCOME' | 'EXPENSE' | 'TRANSFERS' | 'RECURRING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'GRAPH' | 'MOBILE_FLOW'>('GRAPH');

  // Selection & Inspector State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [detailedEntityData, setDetailedEntityData] = useState<any | null>(null);
  const [detailedAccountData, setDetailedAccountData] = useState<any | null>(null);
  const [detailedEdgeData, setDetailedEdgeData] = useState<any | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState<boolean>(false);

  // Zoom and Pan Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Flow Path Tracing State
  const [pathSourceId, setPathSourceId] = useState<string>('');
  const [pathTargetId, setPathTargetId] = useState<string>('');
  const [tracedPath, setTracedPath] = useState<{ path: NetworkNode[]; edges: NetworkEdge[]; depth: number } | null>(null);
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [pathError, setPathError] = useState<string | null>(null);

  // What-If Simulation State
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [simType, setSimType] = useState<string>('RECURRING_EXPENSE');
  const [simDirection, setSimDirection] = useState<'OUTFLOW' | 'INFLOW'>('INFLOW');
  const [simAmount, setSimAmount] = useState<string>('1500');
  const [simDesc, setSimDesc] = useState<string>('Cancel unused subscription');
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Load live financial network from authenticated endpoint
  const loadNetwork = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.network.get({
        timeRange,
        filterType: filterType !== 'ALL' && filterType !== 'ACCOUNTS' && filterType !== 'ENTITIES' ? filterType : undefined,
      });

      if (res.success && res.network) {
        const rawNodes: NetworkNode[] = res.network.nodes || [];
        const rawEdges: NetworkEdge[] = res.network.edges || [];

        // Dynamic 2D spatial positioning algorithm
        const accounts = rawNodes.filter((n) => n.type === 'ACCOUNT');
        const entities = rawNodes.filter((n) => n.type === 'ENTITY');

        const positionedNodes = rawNodes.map((node) => {
          let x = 430;
          let y = 230;

          if (node.type === 'ACCOUNT') {
            const accIdx = accounts.findIndex((a) => a.id === node.id);
            const totalAcc = Math.max(1, accounts.length);
            if (node.subtype === 'CHECKING') {
              x = 430;
              y = 200 + (accIdx % 2 === 0 ? -30 : 30);
            } else if (node.subtype === 'SAVINGS') {
              x = 580;
              y = 160 + accIdx * 60;
            } else if (node.subtype === 'CREDIT_CARD' || node.subtype === 'LOAN') {
              x = 580;
              y = 300 + accIdx * 50;
            } else {
              const angle = (accIdx / totalAcc) * Math.PI;
              x = 430 + Math.cos(angle) * 140;
              y = 230 + Math.sin(angle) * 90;
            }
          } else {
            // Entities
            const entIdx = entities.findIndex((e) => e.id === node.id);
            const totalEnt = Math.max(1, entities.length);
            if (node.subtype === 'EMPLOYER' || node.category === 'Salary') {
              x = 150;
              y = 140 + entIdx * 70;
            } else if (node.subtype === 'UTILITY' || node.category === 'Housing') {
              x = 240;
              y = 340 + (entIdx % 2) * 50;
            } else if (node.subtype === 'LENDER') {
              x = 710;
              y = 320 + (entIdx % 2) * 60;
            } else {
              // Radial ring for merchants & general counterparties
              const angle = (entIdx / totalEnt) * 2 * Math.PI - Math.PI / 2;
              x = 430 + Math.cos(angle) * 260;
              y = 230 + Math.sin(angle) * 160;
            }
          }

          return { ...node, x: Math.round(x), y: Math.round(y) };
        });

        setNodes(positionedNodes);
        setEdges(rawEdges);
        setMetrics(res.network.metrics);

        if (positionedNodes.length > 0 && !selectedNodeId) {
          setSelectedNodeId(positionedNodes[0].id);
        }
      } else {
        setNodes([]);
        setEdges([]);
        setMetrics(null);
      }
    } catch {
      setNodes([]);
      setEdges([]);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, filterType, selectedNodeId]);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  // Fetch detailed entity or account inspection when selection changes
  useEffect(() => {
    if (!selectedNodeId) {
      setDetailedEntityData(null);
      setDetailedAccountData(null);
      return;
    }

    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;

    setInspectorLoading(true);
    if (node.type === 'ENTITY') {
      setDetailedAccountData(null);
      setDetailedEdgeData(null);
      api.network
        .getEntity(node.id)
        .then((res) => {
          if (res.success && res.entity) setDetailedEntityData(res.entity);
        })
        .catch(() => setDetailedEntityData(null))
        .finally(() => setInspectorLoading(false));
    } else {
      setDetailedEntityData(null);
      setDetailedEdgeData(null);
      api.network
        .getAccount(node.id)
        .then((res) => {
          if (res.success && res.account) setDetailedAccountData(res.account);
        })
        .catch(() => setDetailedAccountData(null))
        .finally(() => setInspectorLoading(false));
    }
  }, [selectedNodeId, nodes]);

  // Fetch detailed edge inspection when edge selection changes
  useEffect(() => {
    if (!selectedEdgeId) {
      setDetailedEdgeData(null);
      return;
    }
    setInspectorLoading(true);
    api.network
      .getEdge(selectedEdgeId)
      .then((res) => {
        if (res.success && res.edge) {
          setDetailedEdgeData(res);
        }
      })
      .catch(() => setDetailedEdgeData(null))
      .finally(() => setInspectorLoading(false));
  }, [selectedEdgeId]);

  // Selected node & edges
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);

  // Filter nodes & edges with search query support
  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (filterType === 'ACCOUNTS') result = result.filter((n) => n.type === 'ACCOUNT');
    else if (filterType === 'ENTITIES') result = result.filter((n) => n.type === 'ENTITY');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((n) => n.label.toLowerCase().includes(q) || n.subtype.toLowerCase().includes(q));
    }
    return result;
  }, [nodes, filterType, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  const connectedEdgesToSelectedNode = useMemo(() => {
    if (!selectedNode) return [];
    return edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id);
  }, [edges, selectedNode]);

  // Pan and drag handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setTracedPath(null);
    setSelectedEdgeId(null);
  };

  // Run Flow Path Tracing
  const handleTracePath = async () => {
    if (!pathSourceId || !pathTargetId) return;
    setIsTracing(true);
    setPathError(null);
    try {
      const res = await api.network.getPath(pathSourceId, pathTargetId, 4);
      if (res.success && res.exists) {
        setTracedPath({ path: res.path, edges: res.edges, depth: res.depth });
      } else {
        setTracedPath(null);
        setPathError('No directed financial connection found between these nodes within safe traversal depth (4 hops).');
      }
    } catch {
      setPathError('Failed to calculate graph traversal path.');
    } finally {
      setIsTracing(false);
    }
  };

  // Run What-If Simulation
  const handleRunSimulation = async () => {
    const amt = parseFloat(simAmount);
    if (isNaN(amt) || amt <= 0) {
      setSimError('Please enter a valid positive simulation amount.');
      return;
    }
    setSimLoading(true);
    setSimError(null);
    try {
      const res = await api.network.simulate({
        scenarioType: simType,
        scenarioName: simDesc || 'What-If Network Scenario',
        amount: amt,
        direction: simDirection,
        description: simDesc,
      });
      if (res.success) {
        setSimResult(res);
      } else {
        setSimError(res.message || 'Simulation execution failed.');
      }
    } catch (err: any) {
      setSimError(err.message || 'Failed to simulate network impact.');
    } finally {
      setSimLoading(false);
    }
  };

  const pathNodeIds = useMemo(() => new Set(tracedPath?.path.map((n) => n.id) || []), [tracedPath]);
  const pathEdgeIds = useMemo(() => new Set(tracedPath?.edges.map((e) => e.id) || []), [tracedPath]);

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      {/* Page Header */}
      <div
        style={{
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div className="badge badge-accent" style={{ marginBottom: '0.5rem' }}>
            Stage 04 CONNECT · Advanced Financial Network Intelligence
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700 }}>
            Financial Relationship Network
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Deterministic intelligence layer mapping counterparty flows, concentration risks, and scenario dynamics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Simulation Trigger */}
          <button
            onClick={() => {
              setSimResult(null);
              setSimError(null);
              setShowSimModal(true);
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Play size={15} />
            <span>Simulate Network Impact</span>
          </button>

          {/* Mobile View Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'GRAPH' ? 'MOBILE_FLOW' : 'GRAPH')}
            className="btn btn-ghost"
            style={{ fontSize: '0.85rem' }}
          >
            {viewMode === 'GRAPH' ? 'Card Flow View' : 'Canvas View'}
          </button>

          <button
            onClick={loadNetwork}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            <span>{isLoading ? 'Syncing...' : 'Sync Network'}</span>
          </button>
        </div>
      </div>

      {/* Concentration Alerts Banner (Feature 5 & 14) */}
      {metrics?.networkConcentration?.alerts?.length > 0 && (
        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {metrics.networkConcentration.alerts.map((alt: any, idx: number) => (
            <div
              key={idx}
              className="card-glass"
              style={{
                padding: '0.75rem 1.25rem',
                borderLeft: `4px solid ${alt.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                background: 'rgba(239, 68, 68, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldAlert size={18} color={alt.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)'} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{alt.message}</span>
              </div>
              <span className={`badge ${alt.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                {alt.type.replace('_', ' ')} · {alt.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Money Flow Intelligence Metrics Bar (Feature 2 & 3) */}
      {metrics && nodes.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div className="card-glass" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Connected Nodes
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
              {metrics.nodeCount} ({metrics.accountCount} Acc / {metrics.entityCount} Ent)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              {metrics.edgeCount} Active Relationships
            </div>
          </div>

          <div className="card-glass" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Total Inflow (Credits)
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>
              +{currencySymbol}{Number(metrics.moneyFlow?.totalInflow || metrics.totalIncomeVolume || 0).toLocaleString()}
            </div>
            {metrics.moneyFlow?.largestInflowRelationship && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                Top: {metrics.moneyFlow.largestInflowRelationship.entityName}
              </div>
            )}
          </div>

          <div className="card-glass" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Total Outflow (Debits)
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger)' }}>
              -{currencySymbol}{Number(metrics.moneyFlow?.totalOutflow || metrics.totalExpenseVolume || 0).toLocaleString()}
            </div>
            {metrics.moneyFlow?.largestOutflowRelationship && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                Top: {metrics.moneyFlow.largestOutflowRelationship.entityName}
              </div>
            )}
          </div>

          <div className="card-glass" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Net Cash Flow
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: (metrics.moneyFlow?.netFlow ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {(metrics.moneyFlow?.netFlow ?? 0) >= 0 ? '+' : ''}
              {currencySymbol}{Number(metrics.moneyFlow?.netFlow ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Transfers: {currencySymbol}{Number(metrics.moneyFlow?.internalTransferVolume || 0).toLocaleString()}
            </div>
          </div>

          <div className="card-glass" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Total Network Volume
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-cyan)' }}>
              {currencySymbol}{Number(metrics.totalVolume || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '0.2rem' }}>
              {metrics.spendingReconciliation?.isReconciled ? '✓ Reconciled with ledger' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && nodes.length === 0 ? (
        <div
          className="card-glass"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            maxWidth: '640px',
            margin: '2rem auto',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: 'var(--color-accent-bright)',
            }}
          >
            <Layers size={32} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            No Financial Topology Found
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            The financial graph requires at least one account and imported transactions to map relationships and counterparty flows.
          </p>
          <Link to="/transactions" className="btn btn-primary">
            Import Bank Statement
          </Link>
        </div>
      ) : (
        <>
          {/* Controls Bar: Time Range, Search, Filters, Path Tracer */}
          <div
            className="card-glass"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            {/* Time Range Selector (Feature 13) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginRight: '0.2rem' }}>Timeframe:</span>
              {(['ALL', '30D', '90D', '12M'] as const).map((r) => (
                <button
                  key={r}
                  className={`btn ${timeRange === r ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                  onClick={() => setTimeRange(r)}
                >
                  {r === 'ALL' ? 'All Time' : r === '30D' ? 'Last 30 Days' : r === '90D' ? 'Last 90 Days' : 'Last 12 Months'}
                </button>
              ))}
            </div>

            {/* Instant Search Bar (Feature 12) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.6rem', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entity or account..."
                className="input"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem 0.3rem 1.8rem', width: '200px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn btn-ghost"
                  style={{ padding: '0.2rem 0.4rem', minHeight: 'auto' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Flow Type Filters (Feature 11) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginRight: '0.2rem' }}>Filter:</span>
              <button
                className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setFilterType('ALL')}
              >
                All
              </button>
              <button
                className={`btn ${filterType === 'INCOME' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setFilterType('INCOME')}
              >
                Income
              </button>
              <button
                className={`btn ${filterType === 'EXPENSE' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setFilterType('EXPENSE')}
              >
                Expense
              </button>
              <button
                className={`btn ${filterType === 'TRANSFERS' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setFilterType('TRANSFERS')}
              >
                Transfers
              </button>
              <button
                className={`btn ${filterType === 'RECURRING' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setFilterType('RECURRING')}
              >
                Recurring
              </button>
            </div>

            {/* Path Tracer Controls (Feature 6 & 7) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Path:</span>
              <select
                value={pathSourceId}
                onChange={(e) => setPathSourceId(e.target.value)}
                className="input"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.4rem', width: '110px' }}
              >
                <option value="">Start Node...</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
              <span style={{ color: 'var(--color-text-muted)' }}>→</span>
              <select
                value={pathTargetId}
                onChange={(e) => setPathTargetId(e.target.value)}
                className="input"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.4rem', width: '110px' }}
              >
                <option value="">End Node...</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleTracePath}
                disabled={!pathSourceId || !pathTargetId || isTracing}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Route size={13} /> {isTracing ? 'Tracing...' : 'Trace'}
              </button>
              {tracedPath && (
                <button
                  onClick={() => setTracedPath(null)}
                  className="btn btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Path Tracing Result Banner */}
          {tracedPath && (
            <div
              className="card-glass"
              style={{
                padding: '0.75rem 1.25rem',
                marginBottom: '1rem',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} color="var(--color-accent-bright)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  Path Trace Result ({tracedPath.depth} hop{tracedPath.depth === 1 ? '' : 's'}):
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  {tracedPath.path.map((p) => p.label).join('  →  ')}
                </span>
              </div>
              <span className="badge badge-accent">Highlighted on Graph</span>
            </div>
          )}

          {pathError && (
            <div
              className="card-glass"
              style={{
                padding: '0.75rem 1.25rem',
                marginBottom: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '0.85rem',
                color: 'var(--color-danger)',
              }}
            >
              {pathError}
            </div>
          )}

          {/* Main Network Layout: Grid with SVG Stage and Inspector Drawer */}
          {viewMode === 'GRAPH' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 360px',
                gap: '1.5rem',
                alignItems: 'start',
              }}
              className="network-grid-responsive"
            >
              {/* SVG Canvas Area */}
              <div
                className="card-glass"
                style={{
                  padding: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '540px',
                  background:
                    'radial-gradient(ellipse at 50% 50%, rgba(30, 41, 59, 0.35) 0%, rgba(10, 15, 29, 0.95) 100%)',
                }}
              >
                {/* Canvas Floating Controls */}
                <div
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    background: 'rgba(15, 23, 42, 0.75)',
                    padding: '0.35rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem', minHeight: 'auto' }}
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.15))}
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem', minHeight: 'auto' }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button
                    onClick={resetView}
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem', minHeight: 'auto' }}
                    title="Reset View"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>

                {/* Graph Legend */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '1rem',
                    zIndex: 10,
                    display: 'flex',
                    gap: '0.75rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Checking
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} /> Savings
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Inflow (Credit)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Outflow (Debit)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #a855f7' }} /> Recurring
                  </span>
                </div>

                {/* SVG Graph Canvas */}
                <svg
                  viewBox="0 0 860 480"
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '480px',
                    display: 'block',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <defs>
                    <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(255,255,255,0.4)" />
                    </marker>
                  </defs>

                  <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
                    {/* Render Graph Edges */}
                    {filteredEdges.map((edge) => {
                      const src = nodes.find((n) => n.id === edge.source);
                      const tgt = nodes.find((n) => n.id === edge.target);
                      if (!src || !tgt || src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined)
                        return null;

                      const isSelected = selectedEdgeId === edge.id;
                      const isConnectedToSelectedNode =
                        selectedNodeId === src.id || selectedNodeId === tgt.id;
                      const isPathEdge = pathEdgeIds.has(edge.id);

                      const strokeColor = isPathEdge
                        ? 'var(--color-accent-bright)'
                        : isSelected
                        ? '#ffffff'
                        : edge.color;

                      // Line thickness proportional to relationship strength (Feature 22)
                      const strokeWidth = Math.max(1.5, Math.min(7, (edge.strength || 0.3) * 6));

                      return (
                        <g
                          key={edge.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedEdgeId(edge.id);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <line
                            x1={src.x}
                            y1={src.y}
                            x2={tgt.x}
                            y2={tgt.y}
                            stroke={strokeColor}
                            strokeWidth={isSelected || isPathEdge ? strokeWidth + 2 : strokeWidth}
                            strokeDasharray={
                              edge.relationshipType === 'TRANSFERS_TO'
                                ? '5 3'
                                : edge.isRecurring
                                ? '4 2'
                                : 'none'
                            }
                            strokeOpacity={
                              isConnectedToSelectedNode || isSelected || isPathEdge ? '0.95' : '0.55'
                            }
                            markerEnd="url(#arrow)"
                          />

                          {/* Volume Tag on Line Midpoint */}
                          <text
                            x={(src.x + tgt.x) / 2}
                            y={(src.y + tgt.y) / 2 - 8}
                            fill={isSelected ? '#ffffff' : 'var(--color-text-muted)'}
                            fontSize="10"
                            fontFamily="monospace"
                            textAnchor="middle"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {currencySymbol}
                            {Number(edge.totalVolume).toLocaleString()}
                          </text>
                        </g>
                      );
                    })}

                    {/* Render Graph Nodes */}
                    {filteredNodes.map((node) => {
                      if (node.x === undefined || node.y === undefined) return null;
                      const isSelected = selectedNodeId === node.id;
                      const isPathNode = pathNodeIds.has(node.id);

                      // Radius scaled with transaction volume (Feature 22)
                      const baseRadius = node.type === 'ACCOUNT' ? 26 : 22;
                      const radius = Math.min(38, baseRadius + Math.log10(Math.max(1, node.flowVolume || 1)) * 1.5);

                      return (
                        <g
                          key={node.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedNodeId(node.id);
                            setSelectedEdgeId(null);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Recurring Indicator Glow Ring (Feature 16) */}
                          {node.isRecurring && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={radius + 12}
                              fill="none"
                              stroke="#a855f7"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                              opacity="0.8"
                            />
                          )}

                          {/* Selection indicator ring */}
                          {(isSelected || isPathNode) && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={radius + 7}
                              fill="none"
                              stroke={isPathNode ? 'var(--color-accent-bright)' : node.color}
                              strokeWidth="2.5"
                              strokeDasharray="4 2"
                              opacity="0.85"
                            />
                          )}

                          {/* Base Node Circle */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={radius}
                            fill="var(--color-bg-alt)"
                            stroke={node.color}
                            strokeWidth={isSelected ? '3.5' : '2'}
                            filter={isSelected || isPathNode ? 'url(#nodeGlow)' : undefined}
                          />

                          {/* Initials / Subtype in Node */}
                          <text
                            x={node.x}
                            y={node.y + 4}
                            fill="var(--color-text)"
                            fontSize="11"
                            fontWeight="700"
                            fontFamily="var(--font-display)"
                            textAnchor="middle"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {node.subtype ? node.subtype.substring(0, 3).toUpperCase() : node.type.substring(0, 3)}
                          </text>

                          {/* Risk Warning Indicator Dot (Feature 14) */}
                          {node.riskSignals && node.riskSignals.length > 0 && (
                            <circle
                              cx={node.x + radius - 4}
                              cy={node.y - radius + 4}
                              r={5}
                              fill="var(--color-danger)"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          )}

                          {/* Node Label Below */}
                          <text
                            x={node.x}
                            y={node.y + radius + 15}
                            fill={isSelected || isPathNode ? 'var(--color-text)' : 'var(--color-text-muted)'}
                            fontSize="11"
                            fontWeight={isSelected || isPathNode ? '700' : '500'}
                            fontFamily="var(--font-sans)"
                            textAnchor="middle"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>

              {/* Inspector Panel: Node or Edge */}
              <div className="card-glass" style={{ padding: '1.5rem', minHeight: '540px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <Sparkles size={18} color="var(--color-accent-bright)" />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    {selectedEdge ? 'Relationship Inspector' : 'Object Inspector'}
                  </h3>
                </div>

                {selectedEdge ? (
                  /* Edge / Relationship Details (Feature 10) */
                  <div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <span className="badge badge-accent">
                        {selectedEdge.relationshipType}
                      </span>
                      {selectedEdge.isRecurring && (
                        <span className="badge badge-success">
                          RECURRING ({selectedEdge.recurringDetails?.cadence || 'MONTHLY'})
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, margin: '0.2rem 0' }}>
                      {selectedEdge.sourceLabel} → {selectedEdge.targetLabel}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                      Flow Direction: {selectedEdge.direction}
                    </p>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Cumulative Flow Volume
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: selectedEdge.color }}>
                        {currencySymbol}{Number(selectedEdge.totalVolume).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        Across {selectedEdge.transactionCount} transaction{selectedEdge.transactionCount === 1 ? '' : 's'}
                        {selectedEdge.averageTransaction ? ` · Avg: ${currencySymbol}${selectedEdge.averageTransaction.toLocaleString()}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Strength Score</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-accent-bright)' }}>
                          {(selectedEdge.strength * 100).toFixed(0)}% (Deterministic)
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>First Activity</span>
                        <span>{selectedEdge.firstSeen ? new Date(selectedEdge.firstSeen).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Latest Activity</span>
                        <span>{selectedEdge.lastSeen ? new Date(selectedEdge.lastSeen).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Contributing Transactions (Feature 10) */}
                    {inspectorLoading ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 0.4rem' }} />
                        <span style={{ fontSize: '0.8rem' }}>Loading transactions...</span>
                      </div>
                    ) : detailedEdgeData?.contributingTransactions?.length > 0 ? (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          Contributing Transactions ({detailedEdgeData.contributingTransactions.length})
                        </div>
                        <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'grid', gap: '0.35rem' }}>
                          {detailedEdgeData.contributingTransactions.map((tx: any) => (
                            <div
                              key={tx.id}
                              style={{
                                padding: '0.4rem 0.6rem',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.02)',
                                fontSize: '0.78rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600 }}>{tx.description || 'Transaction'}</div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                                  {new Date(tx.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div style={{ fontWeight: 700, color: tx.type === 'CREDIT' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {tx.type === 'CREDIT' ? '+' : '-'}{currencySymbol}{Number(tx.amount || 0).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <button onClick={() => setSelectedEdgeId(null)} className="btn btn-ghost" style={{ width: '100%', fontSize: '0.85rem' }}>
                      Back to Selected Node
                    </button>
                  </div>
                ) : selectedNode ? (
                  /* Node Details: Entity or Account (Features 8 & 9) */
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <span
                          className="badge"
                          style={{
                            background: `${selectedNode.color}22`,
                            color: selectedNode.color,
                            border: `1px solid ${selectedNode.color}55`,
                          }}
                        >
                          {selectedNode.type} · {selectedNode.subtype}
                        </span>
                        {selectedNode.isRecurring && (
                          <span className="badge badge-success">
                            RECURRING ({selectedNode.recurringDetails?.cadence || 'MONTHLY'})
                          </span>
                        )}
                        {selectedNode.networkSharePct !== undefined && selectedNode.networkSharePct > 0 && (
                          <span className="badge badge-accent">
                            {selectedNode.networkSharePct}% Network Share
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0' }}>
                        {selectedNode.label}
                      </h4>
                      {selectedNode.institution && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                          {selectedNode.institution}
                        </p>
                      )}
                    </div>

                    {/* Node Financial Value (Authoritative) */}
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        {selectedNode.type === 'ACCOUNT' ? 'Authoritative Current Balance' : 'Tracked Flow Volume'}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.75rem',
                          fontWeight: 700,
                          color: selectedNode.color,
                        }}
                      >
                        {currencySymbol}
                        {Number(
                          selectedNode.type === 'ACCOUNT' ? selectedNode.balance : selectedNode.flowVolume
                        ).toLocaleString()}
                      </div>
                      {selectedNode.isLiquid && (
                        <span className="badge badge-success" style={{ marginTop: '0.4rem' }}>
                          Liquid Reserve
                        </span>
                      )}
                    </div>

                    {/* Recurring Details Banner if Present (Feature 16) */}
                    {selectedNode.isRecurring && selectedNode.recurringDetails && (
                      <div
                        className="card-glass"
                        style={{
                          padding: '0.75rem',
                          marginBottom: '1rem',
                          background: 'rgba(168, 85, 247, 0.08)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--color-accent-bright)', marginBottom: '0.25rem' }}>
                          Detected Recurring Schedule
                        </div>
                        <div>Cadence: {selectedNode.recurringDetails.cadence}</div>
                        <div>Average Outflow: {currencySymbol}{selectedNode.recurringDetails.averageAmount?.toLocaleString()}</div>
                        {selectedNode.recurringDetails.nextEstimatedDate && (
                          <div style={{ color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                            Next estimated: {new Date(selectedNode.recurringDetails.nextEstimatedDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Related Risk Signals (Feature 14) */}
                    {selectedNode.riskSignals && selectedNode.riskSignals.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                          Active Risk Signals ({selectedNode.riskSignals.length})
                        </div>
                        {selectedNode.riskSignals.map((sig, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              fontSize: '0.8rem',
                              marginBottom: '0.35rem',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{sig.title}</div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                              {sig.causalMessage}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Detailed Flow Metrics */}
                    {inspectorLoading ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                        <span style={{ fontSize: '0.85rem' }}>Loading node metrics...</span>
                      </div>
                    ) : detailedAccountData ? (
                      <div style={{ fontSize: '0.85rem', display: 'grid', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Total Inflow</span>
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                            +{currencySymbol}{Number(detailedAccountData.inflow || 0).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Total Outflow</span>
                          <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                            -{currencySymbol}{Number(detailedAccountData.outflow || 0).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Net Cash Flow</span>
                          <span style={{ fontWeight: 700 }}>
                            {currencySymbol}{Number(detailedAccountData.netCashFlow || 0).toLocaleString()}
                          </span>
                        </div>
                        {detailedAccountData.topCounterparty && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.35rem' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Top Counterparty</span>
                            <span style={{ fontWeight: 600 }}>{detailedAccountData.topCounterparty.entityName}</span>
                          </div>
                        )}
                      </div>
                    ) : detailedEntityData ? (
                      <div style={{ fontSize: '0.85rem', display: 'grid', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Income Volume</span>
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                            +{currencySymbol}{Number(detailedEntityData.incomeVolume || 0).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Expense Volume</span>
                          <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                            -{currencySymbol}{Number(detailedEntityData.expenseVolume || 0).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Connected Accounts</span>
                          <span>{detailedEntityData.connectedAccounts?.length || 0}</span>
                        </div>
                        {detailedEntityData.topRelationship && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.35rem' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Primary Account</span>
                            <span style={{ fontWeight: 600 }}>{detailedEntityData.topRelationship.accountName}</span>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Connected Channels List */}
                    <div>
                      <h5 style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Connected Flow Channels ({connectedEdgesToSelectedNode.length})
                      </h5>

                      {connectedEdgesToSelectedNode.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-subtle)' }}>
                          No active transaction links mapped yet.
                        </p>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                          {connectedEdgesToSelectedNode.map((e) => {
                            const isIngress = e.target === selectedNode.id;
                            return (
                              <div
                                key={e.id}
                                onClick={() => setSelectedEdgeId(e.id)}
                                style={{
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: '6px',
                                  padding: '0.6rem 0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {isIngress ? (
                                    <ArrowDownLeft size={14} color="#10b981" />
                                  ) : (
                                    <ArrowUpRight size={14} color="#ef4444" />
                                  )}
                                  <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                      {isIngress ? e.sourceLabel : e.targetLabel}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                      {e.relationshipType}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: e.color }}>
                                    {currencySymbol}{Number(e.totalVolume).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                    Strength: {(e.strength * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            /* Mobile Card Flow Mode (Feature 23) */
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Listing all tracked counterparties, transaction volumes, and deterministic relationship strengths:
              </div>
              {filteredEdges.map((e) => (
                <div
                  key={e.id}
                  className="card-glass"
                  onClick={() => setSelectedEdgeId(e.id)}
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    borderLeft: `4px solid ${e.color}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.3rem' }}>
                        <span className="badge badge-accent">{e.relationshipType}</span>
                        {e.isRecurring && <span className="badge badge-success">RECURRING</span>}
                      </div>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                        {e.sourceLabel} → {e.targetLabel}
                      </h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: e.color }}>
                        {currencySymbol}{Number(e.totalVolume).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {e.transactionCount} txs
                      </div>
                    </div>
                  </div>

                  {/* Relationship Strength Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                      <span>Relationship Strength</span>
                      <span style={{ fontWeight: 600 }}>{(e.strength * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${e.strength * 100}%`,
                          background: 'linear-gradient(90deg, var(--color-accent), var(--color-cyan))',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    <span>First: {e.firstSeen ? new Date(e.firstSeen).toLocaleDateString() : 'N/A'}</span>
                    <span>Last: {e.lastSeen ? new Date(e.lastSeen).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Explainable Deterministic Insight Cards (Features 20 & 21) */}
          {metrics?.insightCards?.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Info size={18} color="var(--color-accent-bright)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Explainable Network Insights
                </h3>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1rem',
                }}
              >
                {metrics.insightCards.map((card: any, i: number) => (
                  <div key={i} className="card-glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Zap size={14} color="var(--color-accent-bright)" />
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                        {card.title}
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)', margin: '0.2rem 0' }}>
                      {card.observation}
                    </p>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      <strong>Evidence:</strong> {card.evidence}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>
                      <strong>Prudence Threshold:</strong> {card.threshold}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.4rem', marginTop: '0.3rem' }}>
                      <em>Limitation: {card.limitation}</em>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* What-If Network Simulation Modal (Features 18 & 19) */}
      {showSimModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="card-glass"
            style={{
              maxWidth: '620px',
              width: '100%',
              padding: '2rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--color-accent)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={18} color="var(--color-accent-bright)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                  What-If Network Simulation
                </h3>
              </div>
              <button onClick={() => setShowSimModal(false)} className="btn btn-ghost" style={{ padding: '0.3rem' }}>
                <X size={18} />
              </button>
            </div>

            {/* Non-Mutation Guarantee Badge */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: 'var(--color-success)',
                marginBottom: '1.25rem',
              }}
            >
              ✓ Non-Mutation Guarantee: This prospective calculation runs purely in-memory. Zero actual accounts, transactions, or goals will be modified.
            </div>

            {/* Simulation Controls */}
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Scenario Type
                </label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontSize: '0.9rem' }}
                >
                  <option value="RECURRING_EXPENSE">Recurring Expense Scenario</option>
                  <option value="PURCHASE">One-Off Major Purchase</option>
                  <option value="INCOME_CHANGE">Income Flow Adjustment</option>
                </select>
              </div>

              {simType === 'RECURRING_EXPENSE' && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Action
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={`btn ${simDirection === 'INFLOW' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, fontSize: '0.85rem' }}
                      onClick={() => setSimDirection('INFLOW')}
                    >
                      Remove Recurring (Free Up Cash)
                    </button>
                    <button
                      className={`btn ${simDirection === 'OUTFLOW' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, fontSize: '0.85rem' }}
                      onClick={() => setSimDirection('OUTFLOW')}
                    >
                      Add Recurring Outflow
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  placeholder="1500"
                  className="input"
                  style={{ width: '100%', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Description / Counterparty
                </label>
                <input
                  type="text"
                  value={simDesc}
                  onChange={(e) => setSimDesc(e.target.value)}
                  placeholder="e.g. Gym membership or Cloud server"
                  className="input"
                  style={{ width: '100%', fontSize: '0.9rem' }}
                />
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={simLoading}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                {simLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                <span>{simLoading ? 'Simulating...' : 'Calculate Hypothetical Impact'}</span>
              </button>
            </div>

            {simError && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {simError}
              </div>
            )}

            {/* Simulation Comparison Results (Feature 19) */}
            {simResult && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Current vs. Simulated State
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.4rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  <span>Metric</span>
                  <span style={{ textAlign: 'right' }}>Current Baseline</span>
                  <span style={{ textAlign: 'right', color: 'var(--color-accent-bright)' }}>Simulated State</span>
                </div>

                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Liquid Reserves</span>
                    <span style={{ textAlign: 'right' }}>{currencySymbol}{simResult.baseline.balance.toLocaleString()}</span>
                    <span style={{ textAlign: 'right', fontWeight: 700 }}>{currencySymbol}{simResult.simulated.balance.toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Monthly Burn</span>
                    <span style={{ textAlign: 'right' }}>{currencySymbol}{simResult.baseline.monthlyBurn.toLocaleString()}/mo</span>
                    <span style={{ textAlign: 'right', fontWeight: 700 }}>{currencySymbol}{simResult.simulated.monthlyBurn.toLocaleString()}/mo</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Monthly Surplus</span>
                    <span style={{ textAlign: 'right' }}>{currencySymbol}{simResult.baseline.monthlySurplus.toLocaleString()}/mo</span>
                    <span style={{ textAlign: 'right', fontWeight: 700, color: simResult.deltas.monthlySurplusChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {currencySymbol}{simResult.simulated.monthlySurplus.toLocaleString()}/mo
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Network Outflows</span>
                    <span style={{ textAlign: 'right' }}>{currencySymbol}{simResult.baseline.totalOutflow.toLocaleString()}</span>
                    <span style={{ textAlign: 'right', fontWeight: 700 }}>{currencySymbol}{simResult.simulated.totalOutflow.toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Runway</span>
                    <span style={{ textAlign: 'right' }}>{simResult.baseline.runwayMonths} mos</span>
                    <span style={{ textAlign: 'right', fontWeight: 700 }}>{simResult.simulated.runwayMonths} mos</span>
                  </div>
                </div>

                {/* Goal Impact (Feature 17 & 19) */}
                {simResult.goalImpact && (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--color-accent-bright)', marginBottom: '0.2rem' }}>
                      Goal System Impact
                    </div>
                    <div>{simResult.goalImpact.impactSummary}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
