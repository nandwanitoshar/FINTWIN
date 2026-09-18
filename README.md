# FinTwin AI — Financial Digital Twin & Intelligence Platform

FinTwin AI is a deterministic, explainable financial twin platform that pairs double-entry ledger bookkeeping with graph intelligence, scenario simulation, and risk analysis.

---

## Key Architecture & Design Principles

1. **Zero Mock AI & Zero Fabricated Data**:
   - Every financial metric, risk sentinel, network edge, and projection is deterministically computed from authenticated user ledger entries.
   - Predictions and simulations explicitly identify their underlying assumptions and never modify verified historical records.

2. **Safe Monetary Arithmetic**:
   - All internal calculations utilize integer arithmetic (paise representation) to eliminate floating-point rounding errors.

3. **In-Memory Non-Mutating Simulations**:
   - What-If simulations (`/api/simulation/run` and `/api/network/simulate`) run on in-memory clones of the financial state. Actual database records, account balances, and ledger history remain strictly invariant.

4. **Strict Multi-Tenant Isolation**:
   - All data access is governed strictly by the authenticated JWT session (`req.user._id`). User A data is completely segregated and inaccessible to User B.

5. **Currency Safety**:
   - Cross-currency aggregations require explicit exchange rates. Without an exchange rate, cross-currency operations are safely rejected with an informative error.

---

## Core System Modules

- **Authentication**: JWT token management, bcryptjs password hashing, registration, login, `/api/auth/me`.
- **Accounts & Balance Tracking**: Liquid checking and savings reserves, credit lines, and liabilities.
- **Counterparty Entities**: Categorized external counterparties (Employers, Merchants, Landlords, Utilities).
- **Transaction Ledger & Statement Ingestion**: Manual ledger entries plus automated CSV & JSON statement parsing with deterministic deduplication.
- **Digital Twin State Vector**: 11-metric financial state vector including net worth, liquid reserves, monthly burn, and runway months.
- **Financial Network Intelligence**: Directed cash flow topology (`PAYS`, `RECEIVES_FROM`, `TRANSFERS_TO`, `REFUND`), deterministic relationship strength $[0.00, 1.00]$, BFS cycle-protected path tracing.
- **Simulation Engine**: 12-month prospective trajectory modeling, loan amortization ($M = P \cdot \frac{r(1+r)^n}{(1+r)^n - 1}$), non-mutating guarantee.
- **Deterministic Risk Signals**: Sentinels monitoring runway exhaustion, DTI threshold violations, and counterparty concentration.
- **Financial Health Score**: 6-component weighted deterministic score $[0, 100]$ with explicit sufficiency flags.
- **Spending Breakdown & 12-Month Projection**: Category-level breakdown and linear runway trajectory modeling.
- **Goals & Loans**: Financial goal milestone tracking, monthly contribution requirements, loan amortization, and DTI impact.
- **Recurring Expenses & Financial Calendar**: Cadence-based subscription detection (tolerance $CV \le 25\%$) and 30-day chronological event horizons.
- **Scenario History & Data Quality Center**: Scenario archive with replay capabilities, data completeness labeling (`COMPLETE`, `PARTIAL`, `INSUFFICIENT`).
- **Global Search**: Debounced multi-entity search across transactions, accounts, entities, goals, and scenarios.
- **Consolidated Intelligence Report**: Executive financial intelligence report clearly distinguishing observed history from simulated projections.

---

## Local Development & Setup

### Prerequisites
- Node.js (v20+ recommended)
- MongoDB (optional; defaults to in-memory repositories if MongoDB is offline)

### Backend Setup
```bash
cd server
npm install
npm run build    # TypeScript compilation
npm test         # Run 313 unit, integration, and security tests
npm run dev      # Launch backend server on http://localhost:5000
```

### Frontend Setup
```bash
cd client
npm install
npm run build    # Production Vite bundle
npm run dev      # Launch frontend SPA on http://localhost:5173
```

---

## Test Verification Summary
- **Backend Tests**: 20 test files, **313 / 313 passing** (100% pass rate, 0 failed, 0 skipped).
- **Production Builds**: Backend (`tsc`) and Frontend (`vite build`) pass with 0 errors.
