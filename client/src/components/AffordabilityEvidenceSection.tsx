/**
 * AffordabilityEvidenceSection.tsx
 * Phase C — Affordability Analysis + Goal Impact + Decision Comparison
 *
 * Grounded in real authenticated user ledger, cash flow, and goals.
 * Displays the complete evidence behind affordability status (LOW, MODERATE, HIGH IMPACT),
 * side-by-side decision comparisons (Baseline vs Buy Now vs Buy Later vs Cheaper Option),
 * and transparent data lineage.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Target,
  Scale,
} from 'lucide-react';

interface AffordabilityEvidenceSectionProps {
  goals?: any[];
  currencySymbol: string;
  preselectedGoalId?: string;
  initialAmount?: number;
}

export const AffordabilityEvidenceSection: React.FC<AffordabilityEvidenceSectionProps> = ({
  goals = [],
  currencySymbol,
  preselectedGoalId,
  initialAmount = 50000,
}) => {
  const [purchaseAmount, setPurchaseAmount] = useState<string>(initialAmount.toString());
  const [paymentMode, setPaymentMode] = useState<'OUTRIGHT' | 'EMI'>('OUTRIGHT');
  const [tenureMonths, setTenureMonths] = useState<number>(6);
  const annualRate = 14;
  const [selectedGoalId, setSelectedGoalId] = useState<string>(preselectedGoalId || '');
  const description = 'Prospective Purchase';

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [affordabilityResult, setAffordabilityResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDataLineage, setShowDataLineage] = useState<boolean>(false);

  useEffect(() => {
    if (preselectedGoalId) {
      setSelectedGoalId(preselectedGoalId);
    }
  }, [preselectedGoalId]);

  const runAnalysis = async () => {
    const amt = parseFloat(purchaseAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive purchase amount.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.analysis.getAffordability({
        purchaseAmount: amt,
        paymentMode,
        tenureMonths: paymentMode === 'EMI' ? tenureMonths : undefined,
        annualRate: paymentMode === 'EMI' ? annualRate : undefined,
        goalId: selectedGoalId || undefined,
        description,
      });

      if (res && res.success && res.affordability) {
        setAffordabilityResult(res.affordability);
      } else {
        setError(res.message || 'Failed to compute affordability analysis.');
      }
    } catch (err: any) {
      console.error('Affordability analysis error:', err);
      setError(err.message || 'Network error executing affordability analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [selectedGoalId, paymentMode]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LOW IMPACT':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          icon: <ShieldCheck size={18} />,
        };
      case 'MODERATE IMPACT':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)',
          color: '#f59e0b',
          icon: <AlertTriangle size={18} />,
        };
      case 'HIGH IMPACT':
      default:
        return {
          bg: 'rgba(244, 63, 94, 0.15)',
          border: 'rgba(244, 63, 94, 0.3)',
          color: '#f43f5e',
          icon: <ShieldAlert size={18} />,
        };
    }
  };

  return (
    <div className="card-glass" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div className="badge badge-accent" style={{ marginBottom: '0.4rem' }}>
            <Scale size={13} style={{ marginRight: '0.35rem' }} /> Deterministic Affordability Engine
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
            Decision Affordability & Goal Impact Analysis
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.86rem', margin: '0.25rem 0 0', maxWidth: '680px' }}>
            Simulate how a major expense or financed loan affects your liquid reserves, monthly surplus, emergency runway,
            and personal goal timelines.
          </p>
        </div>

        <div
          style={{
            fontSize: '0.75rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.5rem',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            color: 'var(--color-primary)',
            fontWeight: 600,
          }}
        >
          🔒 Read-Only Simulation • Zero Ledger Mutation
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          marginBottom: '1.75rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end',
        }}
      >
        {/* Outlay Amount */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
            Purchase / Outlay Amount ({currencySymbol})
          </label>
          <input
            type="number"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(e.target.value)}
            className="input"
            placeholder="e.g. 50000"
            style={{ width: '100%' }}
          />
        </div>

        {/* Payment Mode */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
            Payment Architecture
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setPaymentMode('OUTRIGHT')}
              className={paymentMode === 'OUTRIGHT' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, padding: '0.55rem', fontSize: '0.82rem' }}
            >
              Cash Outright
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('EMI')}
              className={paymentMode === 'EMI' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, padding: '0.55rem', fontSize: '0.82rem' }}
            >
              Financed EMI
            </button>
          </div>
        </div>

        {/* EMI Tenure if applicable */}
        {paymentMode === 'EMI' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Tenure & APR ({annualRate}% APR)
            </label>
            <select
              value={tenureMonths}
              onChange={(e) => setTenureMonths(parseInt(e.target.value))}
              className="input"
              style={{ width: '100%' }}
            >
              <option value={3}>3 Months EMI</option>
              <option value={6}>6 Months EMI</option>
              <option value={9}>9 Months EMI</option>
              <option value={12}>12 Months EMI</option>
              <option value={24}>24 Months EMI</option>
            </select>
          </div>
        )}

        {/* Goal Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
            Analyze Impact on Goal (Optional)
          </label>
          <select
            value={selectedGoalId}
            onChange={(e) => setSelectedGoalId(e.target.value)}
            className="input"
            style={{ width: '100%' }}
          >
            <option value="">-- All Active Goals (Primary) --</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name} (Target: {currencySymbol}{g.targetAmount?.toLocaleString('en-IN')})
              </option>
            ))}
          </select>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem' }}
          >
            <Sparkles size={15} /> {isLoading ? 'Analyzing...' : 'Calculate Evidence'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '0.5rem', color: '#f43f5e', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Results View */}
      {affordabilityResult && (
        <div>
          {/* Status Banner */}
          {(() => {
            const badge = getStatusBadge(affordabilityResult.status);
            return (
              <div
                style={{
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                  borderRadius: '0.85rem',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div style={{ color: badge.color, marginTop: '0.2rem' }}>{badge.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        color: badge.color,
                        textTransform: 'uppercase',
                      }}
                    >
                      {affordabilityResult.status}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      • Deterministic Mathematical Threshold
                    </span>
                  </div>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                    {affordabilityResult.statusReason}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Evidence Grid — 10 Comprehensive Financial Factors */}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem' }}>
            Evidence Behind the Calculation
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {/* 1. Outlay */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Decision Capital Outlay</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {currencySymbol}{affordabilityResult.evidence.purchaseAmount?.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Mode: {paymentMode === 'EMI' ? `${tenureMonths}M Loan EMI` : 'Immediate Outright'}
              </div>
            </div>

            {/* 2. Liquid Reserves */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Liquid Reserves Before / After</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem', color: affordabilityResult.evidence.liquidBalanceAfter < 0 ? '#f43f5e' : 'var(--color-text)' }}>
                {currencySymbol}{affordabilityResult.evidence.liquidBalanceAfter?.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Before: {currencySymbol}{affordabilityResult.evidence.currentLiquidBalance?.toLocaleString('en-IN')}
              </div>
            </div>

            {/* 3. Monthly Surplus */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Monthly Surplus Before / After</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem', color: affordabilityResult.evidence.monthlySurplusAfter < 0 ? '#f43f5e' : '#10b981' }}>
                {currencySymbol}{affordabilityResult.evidence.monthlySurplusAfter?.toLocaleString('en-IN')}/mo
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Before: {currencySymbol}{affordabilityResult.evidence.monthlySurplusBefore?.toLocaleString('en-IN')}/mo
              </div>
            </div>

            {/* 4. Emergency Runway */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Emergency Runway Before / After</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem', color: (affordabilityResult.evidence.emergencyRunwayAfter ?? 0) < 1.5 ? '#f43f5e' : (affordabilityResult.evidence.emergencyRunwayAfter ?? 0) < 3 ? '#f59e0b' : 'var(--color-text)' }}>
                {affordabilityResult.evidence.emergencyRunwayAfter !== null ? `${affordabilityResult.evidence.emergencyRunwayAfter} mo` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Before: {affordabilityResult.evidence.emergencyRunwayBefore !== null ? `${affordabilityResult.evidence.emergencyRunwayBefore} mo` : 'N/A'}
              </div>
            </div>

            {/* 5. Debt / EMI Impact */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Debt Service & DTI Impact</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {affordabilityResult.evidence.debtEmiBurdenMonthly > 0
                  ? `+${currencySymbol}${affordabilityResult.evidence.debtEmiBurdenMonthly.toLocaleString('en-IN')}/mo`
                  : '₹0 (No New Debt)'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                DTI shifts from {affordabilityResult.evidence.dtiBeforePercent}% to {affordabilityResult.evidence.dtiAfterPercent}%
              </div>
            </div>

            {/* 6. 12-Month Projected Balance */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>12-Month Balance (Simulated)</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {currencySymbol}{affordabilityResult.evidence.projected12MonthBalanceSimulated?.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Baseline: {currencySymbol}{affordabilityResult.evidence.projected12MonthBalanceBaseline?.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Goal Impact Section (if a goal exists) */}
          {affordabilityResult.goalImpact && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.04)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '0.85rem',
                padding: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <Target size={18} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                  Specific Impact on Goal: "{affordabilityResult.goalImpact.goal.name}"
                </h4>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.85rem',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Timeline Effect</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: affordabilityResult.goalImpact.impact.completionDateDeltaMonths > 0 ? '#f59e0b' : '#10b981' }}>
                    {affordabilityResult.goalImpact.impact.completionDateDeltaMonths > 0
                      ? `Delayed +${affordabilityResult.goalImpact.impact.completionDateDeltaMonths} Months`
                      : 'On Track (0 Delay)'}
                  </div>
                </div>

                <div style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Baseline Completion</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {affordabilityResult.goalImpact.baseline.estimatedCompletionDate
                      ? new Date(affordabilityResult.goalImpact.baseline.estimatedCompletionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                      : 'Indeterminate'}
                  </div>
                </div>

                <div style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Simulated Completion</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: affordabilityResult.goalImpact.impact.completionDateDeltaMonths > 0 ? '#f59e0b' : 'var(--color-text)' }}>
                    {affordabilityResult.goalImpact.simulated.estimatedCompletionDate
                      ? new Date(affordabilityResult.goalImpact.simulated.estimatedCompletionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                      : 'Stalled (Deficit)'}
                  </div>
                </div>

                <div style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Monthly Allocation Capacity</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {currencySymbol}{affordabilityResult.goalImpact.simulated.sustainableMonthlyContribution?.toLocaleString('en-IN')}/mo
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      (Baseline: {currencySymbol}{affordabilityResult.goalImpact.baseline.sustainableMonthlyContribution?.toLocaleString('en-IN')}/mo)
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', margin: 0 }}>
                <strong>Explanation:</strong> {affordabilityResult.goalImpact.impact.explanation}
              </p>
            </div>
          )}

          {/* Decision Comparison Table — Baseline vs Buy Now vs Buy Later vs Cheaper Option */}
          {affordabilityResult.comparison && affordabilityResult.comparison.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem' }}>
                Decision Strategy Comparison (Neutral Side-by-Side)
              </h3>
              <div style={{ overflowX: 'auto', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-hover)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>Financial Dimension</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text)' }}>Baseline</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#f59e0b' }}>Buy Now</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--color-primary)' }}>Buy Later (+3 Mo)</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#10b981' }}>Cheaper Option</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affordabilityResult.comparison.map((row: any, idx: number) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: idx < affordabilityResult.comparison.length - 1 ? '1px solid var(--color-border)' : 'none',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                          {row.dimension}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>{row.baseline}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.buyNow}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text)' }}>{row.buyLater}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 600 }}>{row.cheaperOption}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Data Lineage & Thresholds Accordion */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setShowDataLineage(!showDataLineage)}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                color: 'var(--color-text)',
                fontSize: '0.88rem',
                fontWeight: 700,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={16} style={{ color: 'var(--color-primary)' }} />
                <span>Data Lineage, Formulas & Safety Thresholds</span>
              </div>
              {showDataLineage ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showDataLineage && (
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {/* Threshold Rules */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                    Documented Impact Thresholds:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                    <li><strong style={{ color: '#f43f5e' }}>HIGH IMPACT:</strong> {affordabilityResult.thresholds.highImpactRule}</li>
                    <li><strong style={{ color: '#f59e0b' }}>MODERATE IMPACT:</strong> {affordabilityResult.thresholds.moderateImpactRule}</li>
                    <li><strong style={{ color: '#10b981' }}>LOW IMPACT:</strong> {affordabilityResult.thresholds.lowImpactRule}</li>
                  </ul>
                </div>

                {/* Data Used */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                    What Data Was Used?
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                    {affordabilityResult.dataLineage?.dataUsed?.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                {/* Formulas */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                    What Formulas Were Used?
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                    {affordabilityResult.dataLineage?.formulaUsed?.map((f: string, i: number) => (
                      <li key={i}><code>{f}</code></li>
                    ))}
                  </ul>
                </div>

                {/* Assumptions */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                    What Assumptions Were Used?
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                    {affordabilityResult.dataLineage?.assumptions?.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>

                {/* Limitations */}
                {affordabilityResult.dataLineage?.limitations?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '0.35rem' }}>
                      Identified Limitations:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                      {affordabilityResult.dataLineage?.limitations?.map((l: string, i: number) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
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
