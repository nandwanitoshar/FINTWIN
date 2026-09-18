import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building,
  CreditCard,
  Target,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employmentType: 'Full-time Professional',
    monthlyIncome: '85000',
    employerName: 'Tech Innovations Ltd',
    salaryAccountBalance: '45000',
    savingsAccountBalance: '120000',
    monthlyRent: '22000',
    monthlyEmi: '6500',
    creditCardLimit: '150000',
    creditCardBalance: '18000',
    primaryGoalName: 'MacBook Pro Purchase (₹1,40,000)',
    primaryGoalTarget: '140000',
  });

  const handleChange = (field: string, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // 1. Save onboarding profile locally
      localStorage.setItem('fintwin_onboarding_profile', JSON.stringify(formData));

      // 2. Persist real accounts to backend API
      const checkingRes = await api.accounts.create({
        name: 'HDFC Checking (Salary Hub)',
        type: 'CHECKING',
        institution: 'HDFC Bank',
        currentBalance: parseFloat(formData.salaryAccountBalance) || 45000,
      }).catch(() => null);

      await api.accounts.create({
        name: 'ICICI Savings (Emergency Buffer)',
        type: 'SAVINGS',
        institution: 'ICICI Bank',
        currentBalance: parseFloat(formData.savingsAccountBalance) || 120000,
      }).catch(() => null);

      await api.accounts.create({
        name: 'Axis Neo Credit Facility',
        type: 'CREDIT_CARD',
        institution: 'Axis Bank',
        currentBalance: parseFloat(formData.creditCardBalance) || 18000,
        creditLimit: parseFloat(formData.creditCardLimit) || 150000,
        interestRateApr: 36,
      }).catch(() => null);

      // 3. Persist Counterparty Entities
      const employerRes = await api.entities.create({
        name: formData.employerName || 'Tech Innovations Ltd',
        type: 'EMPLOYER',
        category: 'Salary / Ingress',
        cadenceScore: 1.0,
      }).catch(() => null);

      await api.entities.create({
        name: 'Apex Real Estate (Housing)',
        type: 'UTILITY',
        category: 'Housing Rent',
        cadenceScore: 1.0,
      }).catch(() => null);

      // 4. Record Initial Ingress Transaction if checking account created
      if (checkingRes && checkingRes.account && employerRes && employerRes.entity) {
        await api.transactions.create({
          amount: parseFloat(formData.monthlyIncome) || 85000,
          sourceAccountId: checkingRes.account._id,
          destinationEntityId: employerRes.entity._id,
          category: 'Income',
          type: 'CREDIT',
          description: `${formData.employerName} Monthly Salary Ingress`,
        }).catch(() => null);
      }

      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currencySymbol = user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '680px' }}>
      <div className="card-glass" style={{ padding: '2.5rem' }}>
        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: i < 4 ? 1 : 'none' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step >= i ? 'var(--color-accent)' : 'var(--color-surface-elevated)',
                  color: step >= i ? '#fff' : 'var(--color-text-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: step === i ? '2px solid var(--color-accent-bright)' : 'none',
                }}
              >
                {step > i ? <CheckCircle size={16} /> : i}
              </div>
              {i < 4 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    background: step > i ? 'var(--color-accent)' : 'var(--color-glass-border)',
                    margin: '0 0.5rem',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Income & Counterparty */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <Building size={22} color="var(--color-accent-bright)" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
                Step 1: Income Source & Cadence
              </h2>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
              FinTwin models your primary ingress entity to calculate cashflow rhythm.
            </p>

            <div className="form-group">
              <label className="form-label">Employment Type</label>
              <select
                className="form-input"
                value={formData.employmentType}
                onChange={(e) => handleChange('employmentType', e.target.value)}
              >
                <option value="Full-time Professional">Full-time Professional / Salaried</option>
                <option value="Freelancer / Consultant">Freelancer / Consultant (Variable Income)</option>
                <option value="Student / Intern">College Student / Intern</option>
                <option value="Business Owner">Small Business Owner</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Employer / Primary Client Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.employerName}
                onChange={(e) => handleChange('employerName', e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Net Monthly Take-Home Income ({currencySymbol})</label>
              <input
                type="number"
                className="form-input"
                value={formData.monthlyIncome}
                onChange={(e) => handleChange('monthlyIncome', e.target.value)}
                placeholder="85000"
              />
            </div>
          </div>
        )}

        {/* Step 2: Accounts & Liquidity */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <CreditCard size={22} color="var(--color-success)" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
                Step 2: Core Accounts & Liquid Reserves
              </h2>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
              These nodes form the foundation of your liquid runway calculations.
            </p>

            <div className="form-group">
              <label className="form-label">Operational Checking / Salary Balance ({currencySymbol})</label>
              <input
                type="number"
                className="form-input"
                value={formData.salaryAccountBalance}
                onChange={(e) => handleChange('salaryAccountBalance', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Emergency Savings / Reserve Balance ({currencySymbol})</label>
              <input
                type="number"
                className="form-input"
                value={formData.savingsAccountBalance}
                onChange={(e) => handleChange('savingsAccountBalance', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Credit Card Total Limit ({currencySymbol})</label>
              <input
                type="number"
                className="form-input"
                value={formData.creditCardLimit}
                onChange={(e) => handleChange('creditCardLimit', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Revolving Credit Balance ({currencySymbol})</label>
              <input
                type="number"
                className="form-input"
                value={formData.creditCardBalance}
                onChange={(e) => handleChange('creditCardBalance', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Fixed Commitments */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <ShieldAlert size={22} color="var(--color-warning)" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
                Step 3: Fixed Obligations & Debt
              </h2>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
              Mandatory commitments determine your baseline fixed-cost ratio and debt burden.
            </p>

            <div className="form-group">
              <label className="form-label">Monthly Rent / Housing Obligation ({currencySymbol})</label>
              <input
                type="number"
                className="form-input"
                value={formData.monthlyRent}
                onChange={(e) => handleChange('monthlyRent', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Monthly Loan EMIs ({currencySymbol})</label>
              <input
                type="number"
                className="form-input"
                value={formData.monthlyEmi}
                onChange={(e) => handleChange('monthlyEmi', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 4: Primary Goal */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <Target size={22} color="var(--color-cyan)" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
                Step 4: Primary Financial Goal
              </h2>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
              Define a planned purchase or savings milestone for prospective simulations.
            </p>

            <div className="form-group">
              <label className="form-label">Goal / Planned Purchase Description</label>
              <input
                type="text"
                className="form-input"
                value={formData.primaryGoalName}
                onChange={(e) => handleChange('primaryGoalName', e.target.value)}
                placeholder="e.g. ₹70,000 Laptop / Vehicle Down Payment"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Capital Required ({currencySymbol})</label>
              <input
                type="number"
                className="form-input"
                value={formData.primaryGoalTarget}
                onChange={(e) => handleChange('primaryGoalTarget', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-glass-border)' }}>
          {step > 1 ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(step + 1)}
            >
              Next Step
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFinish}
              disabled={isSubmitting}
              style={{ background: 'linear-gradient(135deg, var(--color-success), #059669)' }}
            >
              <Sparkles size={16} />
              {isSubmitting ? 'Synchronizing Twin...' : 'Initialize Digital Twin'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
