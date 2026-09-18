# FINTWIN AI — MASTER SYSTEM SPECIFICATION (SPEC.MD)
**Document Version:** 2.0.0  
**Status:** Approved Architectural Blueprint & Technical Single Source of Truth  
**Product Source of Truth:** FinTwin / TechNova-2026 Concept & Architecture  
**Methodology:** Spec-Driven Development (SDD)  
**Target Environment:** Full-Stack Web Application (Desktop, Tablet, Mobile)

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision](#3-product-vision)
4. [Target Users](#4-target-users)
5. [Core Concepts](#5-core-concepts)
6. [MODEL Operation](#6-model-operation)
7. [CONNECT Operation](#7-connect-operation)
8. [SIMULATE Operation](#8-simulate-operation)
9. [ANALYZE Operation](#9-analyze-operation)
10. [Six-Stage Operating Pipeline](#10-six-stage-operating-pipeline)
11. [Digital Twin Model](#11-digital-twin-model)
12. [Entities](#12-entities)
13. [Accounts](#13-accounts)
14. [Wallets](#14-wallets)
15. [Instruments](#15-instruments)
16. [Transactions](#16-transactions)
17. [Transaction Flows](#17-transaction-flows)
18. [Relationships](#18-relationships)
19. [Risk Signals](#19-risk-signals)
20. [Historical Behaviour](#20-historical-behaviour)
21. [Graph Engine](#21-graph-engine)
22. [Digital Twin Core](#22-digital-twin-core)
23. [Simulation Engine](#23-simulation-engine)
24. [Analysis / AI Engine](#24-analysis--ai-engine)
25. [Explainable Intelligence](#25-explainable-intelligence)
26. [Frontend Architecture](#26-frontend-architecture)
27. [Backend Architecture](#27-backend-architecture)
28. [Database Architecture](#28-database-architecture)
29. [Authentication](#29-authentication)
30. [Authorization & User Isolation](#30-authorization--user-isolation)
31. [REST API Contracts](#31-rest-api-contracts)
32. [Data Models](#32-data-models)
33. [UI / UX](#33-ui--ux)
34. [Responsive & Mobile Requirements](#34-responsive--mobile-requirements)
35. [Security](#35-security)
36. [Error Handling](#36-error-handling)
37. [Testing Strategy](#37-testing-strategy)
38. [End-to-End Workflows](#38-end-to-end-workflows)
39. [Performance Testing](#39-performance-testing)
40. [Deployment](#40-deployment)
41. [Definition of Done](#41-definition-of-done)
42. [Phased Development Roadmap](#42-phased-development-roadmap)

---

## 1. Product Overview
**FinTwin AI** is an advanced full-stack financial intelligence platform that transforms raw, fragmented financial records into a living, connected **Digital Financial Twin** of an individual or organization.

FinTwin is **NOT** a conventional expense tracker or backward-looking budget ledger. While traditional tools merely log past events (*"You spent ₹25,000 on dining last month"*), FinTwin maps the underlying financial topology—connecting accounts, liquidity wallets, financial instruments, debt contracts, recurring counterparties, and multi-hop transaction flows. 

Through its deterministic simulation engine combined with an explainable AI analysis layer, FinTwin empowers users to run prospective "what-if" simulations (*"Can I afford a ₹70,000 laptop right now vs. 4 months later vs. an EMI plan?"*) to visualize future cash runway, identify hidden systemic risks, and make high-conviction financial decisions before committing real capital.

The central product paradigm is:
```
RAW FINANCIAL RECORDS
        ↓
CONNECTED ENTITIES
        ↓
  DIGITAL TWIN
        ↓
SIMULATION & ANALYSIS
        ↓
EXPLAINABLE INTELLIGENCE
```
**Guiding Principle:** *"See the financial system, not just the transactions."*

---

## 2. Problem Statement
Modern personal and business finance applications suffer from five critical design flaws:
1. **Isolated Event Logging:** Transactions are treated as static, disconnected ledger entries rather than directional edges connecting dynamic financial nodes.
2. **Backward-Looking Static Dashboards:** Pie charts and category breakdowns explain where money *went*, but provide zero predictive insight into future liquidity, runway, or resilience.
3. **Hidden Cascading Fragility:** Without a network model of commitments, users cannot anticipate how a shock in one account (e.g., salary delay or medical expense) cascades into debt defaults, bounced EMIs, or emergency fund depletion.
4. **Opaque or Generic Advice:** Mainstream platforms deliver either black-box scores with no causal breakdown, or generic advice (*"Save 20% of your income"*) that ignores individual commitments and multi-month liabilities.
5. **Fragmented Ecosystems:** Checking accounts, savings accounts, credit cards, UPI wallets, investments, and loan facilities reside in separate silos, preventing a unified system-level view.

---

## 3. Product Vision
FinTwin replaces static ledgers with a dynamic **Financial World Model**:
- Models the complete financial ecosystem as a mathematical graph of nodes (accounts, wallets, instruments, counterparties) and directed edges (cash flows, debt obligations, interest accruals).
- Provides a prospective simulation sandbox where major expenditures, income shocks, loan terms, and savings goals can be safely modeled over 1 to 60 month horizons.
- Delivers explainable, causal intelligence that explains *why* a decision is safe or risky, backed by deterministic mathematics.
- Fully responsive across desktop workstations, tablets, and smartphones, ensuring financial intelligence is accessible anywhere.

---

## 4. Target Users
1. **College Students & First-Time Earners:** Evaluating gadget purchases, rent security deposits, first credit cards, and entry-level budgeting with zero jargon.
2. **Young Professionals:** Balancing discretionary lifestyle spending against student loans, vehicle EMIs, and early investment targets.
3. **Credit & Debt-Conscious Borrowers:** Modeling loan affordability, EMI schedules, credit card utilization thresholds, and avoidance of revolving debt spirals.
4. **Freelancers & Variable-Income Earners:** Stress-testing irregular cashflow pulses against fixed obligations to determine true liquidity runway.
5. **Financial Analysts & Planners:** Creating, stress-testing, and presenting network-based scenarios for client portfolios.

---

## 5. Core Concepts
Traditional personal finance tools contrast fundamentally with FinTwin's Digital Twin approach:

| Feature / Dimension | Traditional Expense Tracker | FinTwin Digital Twin Platform |
| :--- | :--- | :--- |
| **Data Structure** | Flat row-based ledger, independent tables | Dynamic relational graph (Nodes, Directed Edges, Flows) |
| **Temporal Perspective** | Strictly backward-looking (historical aggregates) | Forward-looking prospective simulation (1-60 months) |
| **Counterparty Awareness**| Passive string labels (`"Amazon"`, `"Starbucks"`) | First-class connected Entities with flow velocity & cadence |
| **Decision Support** | Static monthly budget thresholds | Interactive "What-If" sandbox with scenario diff comparisons |
| **Intelligence Layer** | Generic rules-of-thumb & descriptive charts | Deterministic risk signals + explainable causal AI narratives |
| **Systemic Risk** | Invisible until account balance hits zero | Pre-computed runway, debt service ratio, and liquidity buffers |
| **Transparency** | Black-box scores or opaque categories | 100% deterministic, reproducible math with visible formulas |

---

## 6. MODEL Operation
The **MODEL** operation transforms raw financial declarations into structured financial objects:
- Discovers and instantiates core financial components:
  - **Accounts:** Checking, Savings, Credit Facilities, Loans.
  - **Wallets:** UPI prepaid handles, digital cash repositories.
  - **Instruments:** Fixed Deposits, Mutual Funds, Equities, Liquid Reserves.
  - **Entities:** Employers, Lenders, Landlords, Merchants, Utilities.
- Attaches intrinsic parameters: current balance, APR interest rate, credit limit, billing cycle, minimum balance, and risk rating.
- Reconstructs a complete baseline representation of the user's financial anatomy.

---

## 7. CONNECT Operation
The **CONNECT** operation builds the relational network topology:
- Converts individual transactions into directional capital flows:
  $$\text{Source Node} \xrightarrow{\text{flow}(\text{amount, cadence, category})} \text{Target Node}$$
- Discovers and categorizes relationship channels:
  - **Income Ingress:** Employer / Client $\to$ Primary Checking Account.
  - **Debt Service:** Checking Account $\to$ Lender Loan Account / Credit Card.
  - **Fixed Commitments:** Checking Account $\to$ Landlord / Utility Entity.
  - **Discretionary Outflows:** Wallets / Credit Cards $\to$ Retail Merchants.
  - **Internal Rebalancing:** Checking Account $\to$ Savings Account / Investment Instrument.
- Calculates node centrality, counterparty concentration, and recurring cashflow cycles.

---

## 8. SIMULATE Operation
The **SIMULATE** operation executes forward-looking projections within an isolated sandbox:
- Clones the active Digital Twin state into an experimental branch.
- Injects user-defined financial decisions and external shocks:
  - Income variations (increment, loss of client, bonus, career pause).
  - Expense variations (rent increase, lifestyle inflation, subscription audit).
  - Lump-sum capital events (e.g., ₹70,000 laptop, ₹1,50,000 vehicle down payment).
  - New debt commitments (e.g., 24-month consumer EMI at 14% APR).
  - Horizon duration (6, 12, 24, 36, or 60 months).
- Deterministically calculates month-by-month cash balance evolutions, loan amortizations, interest charges, and emergency fund runways.
- Computes baseline-vs-simulated deltas: $\Delta \text{Net Worth}$, $\Delta \text{Runway Days}$, $\Delta \text{Monthly Savings}$, $\Delta \text{DTI}$.

---

## 9. ANALYZE Operation
The **ANALYZE** operation extracts actionable intelligence and evaluates financial vulnerability:
- Computes quantitative health indicators:
  - **Debt-to-Income (DTI):** Monthly debt payments divided by gross monthly income.
  - **Liquidity Runway:** Total liquid reserves divided by net monthly cash burn.
  - **Fixed Cost Burden:** Mandatory obligations divided by net take-home income.
  - **Credit Card Utilization:** Revolving balances divided by total credit limit.
- Evaluates deterministic risk signals against verified thresholds.
- Generates natural-language causal explanations connecting topological causes to financial outcomes.

---

## 10. Six-Stage Operating Pipeline
Every piece of data flows through the sequential six-stage operating pipeline:
```
[ 01 INGEST ] ──> [ 02 NORMALIZE ] ──> [ 03 MODEL ] ──> [ 04 CONNECT ] ──> [ 05 SIMULATE ] ──> [ 06 ANALYZE ]
```
1. **01 INGEST:** Ingests raw CSV statements, JSON exports, or interactive user entries representing accounts, balances, and historical transactions.
2. **02 NORMALIZE:** Cleans records, validates ISO 8601 timestamps, normalizes currencies (INR ₹ / USD $), deduplicates records, and assigns standardized taxonomy tags.
3. **03 MODEL:** Instantiates first-class financial objects (Accounts, Wallets, Instruments, Entities) with verified state parameters.
4. **04 CONNECT:** Constructs the directed graph matrix, links accounts to counterparties via transaction edges, and computes flow velocity and cadence regularity.
5. **05 SIMULATE:** Executes discrete monthly state-transition algorithms across the target horizon under baseline and experimental parameters.
6. **06 ANALYZE:** Evaluates deterministic risk thresholds, calculates scenario deltas, and synthesizes explainable recommendations.

---

## 11. Digital Twin Model
The **Digital Twin** is mathematically defined as a dynamic state graph:
$$G = (V, E, \Theta)$$
Where:
- $V$ is the set of financial nodes (Accounts, Wallets, Instruments, External Entities).
- $E$ is the set of directed edges (Transaction flows, debt obligations, ownership linkages).
- $\Theta$ is the global financial state vector:
  $$\Theta = \{ \text{NetWorth}, \text{LiquidReserves}, \text{TotalDebt}, \text{MonthlyIncome}, \text{MonthlyBurn}, \text{RunwayMonths}, \text{DTI}, \text{ActiveRiskCount} \}$$
The Digital Twin updates deterministically whenever accounts are modified, transactions are added, or simulation parameters are applied.

---

## 12. Entities
Entities represent external counterparties interacting with the user's financial core:
- **`EMPLOYER` / Income Source:** Provides recurring positive cashflow pulses.
- **`LENDER` / Creditor:** Enforces mandatory monthly debt outflows with contractual default penalties.
- **`UTILITY` / Landlord:** Essential recurring commitments with high default severity.
- **`MERCHANT` / Retailer:** Discretionary or subscription outflow destinations.
- **`INVESTMENT_BROKER`:** Asset storage nodes that generate yield or provide liquidity upon redemption.
- **Attributes:** `id`, `name`, `type`, `category`, `cadenceScore`, `riskRating`.

---

## 13. Accounts
Accounts represent formal banking and credit facilities:
- **`CHECKING` / Current Account:** High liquidity, zero yield, primary operational ingress/egress hub.
- **`SAVINGS` Account:** High liquidity, moderate yield, emergency reserve holder.
- **`CREDIT_CARD`:** Revolving credit line, billing cycles, minimum payment obligations, penalty APR (36-42%), credit limit tracking.
- **`LOAN` Account:** Amortizing debt structure with fixed principal, annual interest rate, tenure, and monthly EMI schedule.

---

## 14. Wallets
Wallets represent digital or physical immediate-settlement cash repositories:
- **`UPI_WALLET` / Digital Wallet:** Linked to checking accounts, characterized by high-frequency, low-ticket micro-transactions.
- **`CASH_RESERVE`:** Physical petty cash buffers.
- **Attributes:** `id`, `name`, `balance`, `linkedAccountId`, `currency`.

---

## 15. Instruments
Financial instruments represent allocated capital with distinct risk, liquidity, and return profiles:
- **`FIXED_DEPOSIT` (FD):** Guaranteed APR, defined maturity date, premature withdrawal penalty.
- **`MUTUAL_FUND` / Equity Portfolio:** Variable expected returns, volatility rating, $T+1 / T+2$ liquidation turnaround.
- **`PROVIDENT_FUND` (EPF / PPF):** Long-term locked liquidity with compound interest.
- **`EMERGENCY_FUND`:** Segregated liquid cash earmarked exclusively for emergency runway protection.

---

## 16. Transactions
An immutable record of monetary transfer:
- `id`: Unique identifier (UUIDv4 / ObjectId).
- `userId`: Owning user identifier.
- `date`: ISO 8601 timestamp.
- `amount`: Numerical monetary amount (positive float).
- `sourceAccountId`: Originating account/wallet ID.
- `destinationEntityId`: Recipient entity or internal account ID.
- `category`: Taxonomy classification (Salary, Rent, Groceries, Dining, EMI, Investment, etc.).
- `type`: `CREDIT`, `DEBIT`, `INTERNAL_TRANSFER`.
- `recurrence`: `ONE_OFF`, `WEEKLY`, `MONTHLY`, `ANNUAL`.

---

## 17. Transaction Flows
Aggregated directional channels between graph nodes:
- **Flow Velocity:** Average monetary volume transferred per 30-day window.
- **Cadence Score ($0.0 - 1.0$):** Regularity of timing (1.0 = exact calendar day monthly salary/rent; 0.1 = irregular ad-hoc purchase).
- **Elasticity:** Degree of discretion (Non-Discretionary Essential vs. Discretionary Flexible).

---

## 18. Relationships
The Relationships Engine maintains topological intelligence:
- **Hub Detection:** Identifies the primary central account from which $>75\%$ of outflows originate.
- **Dependency Mapping:** Detects fragile links (e.g., if Checking Account drops below ₹30,000, EMI will fail).
- **Internal Transfer Filtering:** Automatically classifies inter-account movements to prevent double-counting income or expenses.
- **Counterparty Concentration:** Evaluates vulnerability to a single employer or single merchant.

---

## 19. Risk Signals
Deterministic threshold rules evaluated against the Digital Twin state:
1. **`SIGNAL_LIQUIDITY_RUNWAY_CRITICAL`:**
   - Condition: $\frac{\text{Liquid Reserves}}{\text{Monthly Net Burn}} < 3.0\text{ months}$.
   - Severity: `CRITICAL`.
   - Causal Message: Liquid cash reserves are insufficient to sustain expenses for 3 months in the event of income interruption.
2. **`SIGNAL_DTI_EXCESSIVE`:**
   - Condition: $\frac{\text{Monthly Debt Payments}}{\text{Gross Monthly Income}} > 0.40$ ($40\%$).
   - Severity: `HIGH`.
   - Causal Message: Over 40% of income is locked into mandatory debt service, leaving inadequate buffer for living costs.
3. **`SIGNAL_CREDIT_UTILIZATION_HIGH`:**
   - Condition: $\frac{\text{Revolving Credit Balance}}{\text{Total Credit Limit}} > 0.30$ ($30\%$) [Critical if $> 0.60$].
   - Severity: `MEDIUM` (or `CRITICAL` if $> 60\%$).
   - Causal Message: Elevated credit card balance degrades credit rating and triggers compounding penalty interest.
4. **`SIGNAL_NEGATIVE_CASHFLOW_TREND`:**
   - Condition: Monthly Cash Flow $< 0$ for $\ge 2$ consecutive projection periods.
   - Severity: `HIGH`.
   - Causal Message: Net spending exceeds income, systematically eroding liquid reserves.
5. **`SIGNAL_SINGLE_POINT_OF_FAILURE`:**
   - Condition: $> 90\%$ of total income originates from a single entity with $< 1.5\text{ months}$ runway.
   - Severity: `HIGH`.
   - Causal Message: High dependency on a single income stream without an adequate savings buffer.
6. **`SIGNAL_GOAL_SLIPPAGE`:**
   - Condition: Projected savings balance at goal deadline $<$ Target Goal Amount.
   - Severity: `MEDIUM`.
   - Causal Message: Current spending rate delays target goal achievement by $X$ months.

---

## 20. Historical Behaviour
Longitudinal metrics tracked over rolling 3, 6, and 12-month periods:
- Month-over-month Net Worth trajectory.
- Savings Rate Evolution: $\frac{\text{Income} - \text{Expenses}}{\text{Income}} \times 100\%$.
- Expense Volatility Coefficient (standard deviation of monthly discretionary burn).
- Debt Amortization Velocity (actual paydown vs. scheduled minimum payments).
- Lifestyle Creep Indicator (rate of discretionary spending growth relative to income growth).

---

## 21. Graph Engine
The backend Graph Engine formats topology for frontend interactive visualizers:
- **Data Structure:**
  ```json
  {
    "nodes": [
      { "id": "acc_1", "label": "HDFC Salary Account", "type": "ACCOUNT", "subtype": "CHECKING", "balance": 185000, "health": "HEALTHY" },
      { "id": "ent_1", "label": "Tech Corp (Employer)", "type": "ENTITY", "subtype": "EMPLOYER", "balance": 0, "health": "STABLE" }
    ],
    "links": [
      { "id": "flow_1", "source": "ent_1", "target": "acc_1", "amount": 125000, "cadence": "MONTHLY", "type": "INCOME" }
    ]
  }
  ```
- **Visual Encoding:** Node radius mapped to monetary balance/volume; link stroke-width mapped to flow volume; link color coded by flow health (Emerald = Income, Indigo = Internal Transfer, Crimson = Debt Service, Amber = High Discretionary).
- **Interactive Controls:** Node selection for entity deep-dive; edge hover for cadence and volume; filter by node type.

---

## 22. Digital Twin Core
The backend `DigitalTwinCore` service maintains the canonical financial state:
- Aggregates accounts, entities, and transactions from MongoDB.
- Reconstructs the in-memory connected state graph.
- Calculates the $\Theta$ state vector in real time.
- Generates immutable state snapshots for the Simulation Engine.
- Provides sanitized state payloads to frontend clients.

---

## 23. Simulation Engine
The `SimulationEngine` runs 100% deterministic forward projections:
- **Inputs:**
  - `baselineTwin`: Baseline Digital Twin snapshot.
  - `scenarioName`: Name of the scenario (e.g., *"Buy ₹70k Laptop with 6-month EMI"*).
  - `incomeDelta`: Monthly income adjustment (+₹X / -₹X).
  - `expenseDelta`: Monthly expense adjustment (+₹X / -₹X).
  - `lumpSumEvents`: Array of `{ month: number, amount: number, description: string, accountId: string }`.
  - `newEmiEvents`: Array of `{ principal: number, annualRate: number, tenureMonths: number, startMonth: number, description: string }`.
  - `horizonMonths`: 6, 12, 24, 36, or 60 months.
- **Deterministic Math Formulas:**
  - **Standard Loan Amortization Formula:**
    $$M = P \cdot \frac{r(1+r)^n}{(1+r)^n - 1}$$
    Where $P$ is principal, $r$ is monthly interest rate ($\text{APR} / 12 / 100$), and $n$ is tenure in months.
  - **Monthly Cash Balance Recurrence:**
    $$B_{t+1} = B_t + \text{Income}_t - \text{Expenses}_t - \text{EMI}_t - \text{LumpSum}_t + \text{Yield}_t$$
  - **Liquidity Runway:**
    $$\text{Runway} = \frac{\text{Liquid Accounts Balance}}{\text{Total Monthly Expenses} + \text{Total Monthly EMIs}}$$
- **Outputs:**
  - Baseline vs. Simulated monthly time series for Net Worth, Liquid Reserves, and Debt Balance.
  - Summary delta metrics ($\Delta \text{Net Worth}$, $\Delta \text{Runway Months}$, $\Delta \text{Monthly Cashflow}$).
  - Triggered and resolved Risk Signals across the projection horizon.

---

## 24. Analysis / AI Engine
The Analysis & AI Engine combines deterministic mathematical evaluation with Large Language Model narrative synthesis:
- **Strict Separation of Concerns:**
  - **Deterministic Engine:** Computes ALL numbers, metrics, loan schedules, deltas, and threshold breaches. Zero arithmetic is delegated to AI.
  - **AI Layer:** Accepts structured JSON containing verified mathematical results, and produces executive synthesis, root-cause explanations, and prioritized mitigation actions.
- **Resilience & Offline Fallback:**
  - If the external AI API key is unconfigured or the service is unreachable, FinTwin automatically falls back to a **Deterministic Rule-Based Narrative Synthesizer**.
  - **Zero UI breakage, zero fake responses, zero downtime.**

---

## 25. Explainable Intelligence
Every recommendation, alert, and simulation diff satisfies three explainability axioms:
1. **Mathematical Transparency:** Every metric displays its underlying formula, input variables, and source accounts on inspection.
2. **Causal Reasoning:** Explains the direct chain of cause and effect (e.g., *"Runway drops from 6.2 months to 2.8 months because the ₹70,000 cash purchase reduces liquid checking reserves by 58% while adding no offsetting cashflow"*).
3. **Counterfactual Guidance:** Delivers precise mathematical actions to restore safety (e.g., *"Opting for a 6-month EMI of ₹12,200 or deferring purchase by 3 months preserves a healthy 4.5-month emergency runway"*).

---

## 26. Frontend Architecture
Built with modern React, TypeScript, and Vite:
- **Framework:** React 19 + TypeScript + Vite.
- **Styling:** Custom FinTwin CSS Design Tokens (`index.css` & `Hero.css`) + Tailwind CSS utility support where appropriate.
- **State Management:** React Context API + Custom Hooks (`useAuth`, `useDigitalTwin`, `useSimulation`).
- **Data Visualization:** Recharts for time-series charts, area charts, and bar comparisons; SVG/Canvas-based interactive Graph for topology.
- **Icons:** `lucide-react`.
- **Motion:** CSS hardware-accelerated transitions & Framer Motion where appropriate.
- **14 Mandatory Routes:**
  1. `/` — Cinematic Landing Page (Hero video, Pipeline showcase, Core distinction, CTA).
  2. `/login` — User Authentication.
  3. `/register` — Account Registration.
  4. `/onboarding` — Interactive 4-step financial setup wizard.
  5. `/dashboard` — Digital Twin Overview & Core Financial Health KPI matrix.
  6. `/financial-twin` — Detailed Multi-entity Twin Inspector & Asset Topology.
  7. `/network` — Interactive Graph of Accounts, Entities, and Transaction Flows.
  8. `/transactions` — Ingested & Classified Ledger with search & filtering.
  9. `/entities` — Directory of Counterparties, Employers, Creditors & Merchants.
  10. `/simulation` — Prospective Scenario Modeler with Real-time Diff Engine.
  11. `/analysis` — Explainable Financial Intelligence & Diagnostic Reports.
  12. `/risk-signals` — Active Vulnerability Monitor & Mitigation Prescriptions.
  13. `/history` — Longitudinal Behaviour & Scenario Archive.
  14. `/settings` — User Profile, Currency Preferences, and API Configuration.

---

## 27. Backend Architecture
Built with Node.js and Express REST APIs:
- **Runtime:** Node.js (v18+) with TypeScript (`tsx`).
- **Design Pattern:** Clean Layered Architecture:
  - `routes/` — Express route definitions with validation middleware.
  - `controllers/` — Request handling, input validation, and HTTP response dispatch.
  - `services/` — Core business logic (`DigitalTwinService`, `SimulationEngine`, `GraphService`, `RiskEngine`, `AiService`).
  - `models/` — MongoDB Mongoose schemas for data persistence.
  - `middleware/` — JWT authentication, rate limiting, error handling, request logging.
  - `utils/` — Deterministic financial calculation formulas.

---

## 28. Database Architecture
Primary Database: **MongoDB / MongoDB Atlas** with Mongoose ODM:
- Relational integrity maintained through indexed references (`ObjectId`).
- Adjacency list graph representation allows high-performance topological traversal without requiring external graph database complexity in initial phases.
- Compound indexes configured for high-frequency queries:
  - `Account`: `{ userId: 1, type: 1 }`
  - `Transaction`: `{ userId: 1, date: -1 }`, `{ userId: 1, category: 1 }`
  - `Entity`: `{ userId: 1, type: 1 }`
  - `SimulationScenario`: `{ userId: 1, createdAt: -1 }`

---

## 29. Authentication
- **Mechanism:** Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256.
- **Password Security:** Salted password hashing using `bcryptjs` (salt factor: 10).
- **Transport:** HTTP Authorization header: `Bearer <jwt_token>`.
- **Endpoints:**
  - `POST /api/auth/register` — Validates credentials, hashes password, returns user & JWT.
  - `POST /api/auth/login` — Verifies password, returns user & JWT.
  - `GET /api/auth/me` — Returns authenticated user profile.

---

## 30. Authorization & User Isolation
- **Tenant Isolation:** Every protected API endpoint enforces token verification via `authMiddleware`.
- **Query Scoping:** All database read, write, update, and delete queries strictly include `{ userId: req.user._id }`.
- **Cross-User Leakage Prevention:** Automated test suites verify that User A cannot read, modify, or delete any record belonging to User B (HTTP 403 / 404).

---

## 31. REST API Contracts

### Authentication
- `POST /api/auth/register` — Body: `{ name, email, password }` $\to$ Response: `{ success: true, token, user }`
- `POST /api/auth/login` — Body: `{ email, password }` $\to$ Response: `{ success: true, token, user }`
- `GET /api/auth/me` — Headers: `Bearer <token>` $\to$ Response: `{ success: true, user }`

### Digital Twin
- `GET /api/twin` — Response: `{ success: true, twin: { stateVector, summary, accountsCount, entitiesCount } }`
- `GET /api/twin/network` — Response: `{ success: true, graph: { nodes: [], links: [] } }`

### Accounts & Wallets
- `GET /api/accounts` — Response: `{ success: true, accounts: [] }`
- `POST /api/accounts` — Body: `{ name, type, institution, balance, creditLimit, apr }` $\to$ Response: `{ success: true, account }`
- `PUT /api/accounts/:id` — Body: `{ balance, creditLimit, ... }` $\to$ Response: `{ success: true, account }`
- `DELETE /api/accounts/:id` — Response: `{ success: true, message }`

### Counterparty Entities
- `GET /api/entities` — Response: `{ success: true, entities: [] }`
- `POST /api/entities` — Body: `{ name, type, category }` $\to$ Response: `{ success: true, entity }`

### Transactions & Pipeline
- `GET /api/transactions` — Query: `?page=1&limit=50&category=...` $\to$ Response: `{ success: true, transactions: [], total }`
- `POST /api/transactions` — Body: `{ date, amount, sourceAccountId, destinationEntityId, category, type }` $\to$ Response: `{ success: true, transaction }`
- `POST /api/pipeline/ingest` — Body: `{ format: "json" | "csv", data: [...] }` $\to$ Response: `{ success: true, ingestedCount, normalizedCount }`

### Simulation Engine
- `POST /api/simulation/run` — Body: `{ scenarioName, incomeDelta, expenseDelta, lumpSumEvents, newEmiEvents, horizonMonths }` $\to$ Response: `{ success: true, results: { baselineSeries, simulatedSeries, deltas, signals } }`
- `GET /api/simulation/history` — Response: `{ success: true, scenarios: [] }`
- `GET /api/simulation/:id` — Response: `{ success: true, scenario }`

### Risk Signals & Analysis
- `GET /api/risk-signals` — Response: `{ success: true, signals: [] }`
- `POST /api/analysis/explain` — Body: `{ context: "current" | "simulation", scenarioId?: string }` $\to$ Response: `{ success: true, analysis: { summary, keyFindings, recommendations, provider: "ai" | "rules" } }`

---

## 32. Data Models

### User Schema
```typescript
{
  _id: ObjectId;
  name: string;
  email: string; // unique, lowercase
  passwordHash: string;
  currency: string; // default "INR"
  createdAt: Date;
  updatedAt: Date;
}
```

### Account Schema
```typescript
{
  _id: ObjectId;
  userId: ObjectId; // indexed
  name: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "LOAN" | "INVESTMENT" | "WALLET";
  institution: string;
  currentBalance: number;
  creditLimit?: number;
  interestRateApr?: number;
  accountNumberMask?: string;
  isLiquid: boolean;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
}
```

### Entity Schema
```typescript
{
  _id: ObjectId;
  userId: ObjectId; // indexed
  name: string;
  type: "EMPLOYER" | "LENDER" | "UTILITY" | "MERCHANT" | "INVESTMENT_BROKER";
  category: string;
  cadenceScore: number; // 0.0 - 1.0
  riskRating: "LOW" | "MEDIUM" | "HIGH";
  createdAt: Date;
}
```

### Transaction Schema
```typescript
{
  _id: ObjectId;
  userId: ObjectId; // indexed
  date: Date; // indexed
  amount: number;
  sourceAccountId: ObjectId; // indexed
  destinationEntityId: ObjectId; // indexed
  category: string;
  type: "CREDIT" | "DEBIT" | "INTERNAL_TRANSFER";
  recurrence: "ONE_OFF" | "WEEKLY" | "MONTHLY" | "ANNUAL";
  description: string;
  createdAt: Date;
}
```

### SimulationScenario Schema
```typescript
{
  _id: ObjectId;
  userId: ObjectId; // indexed
  scenarioName: string;
  parameters: {
    incomeDelta: number;
    expenseDelta: number;
    lumpSumEvents: Array<{ month: number; amount: number; description: string; accountId: string }>;
    newEmiEvents: Array<{ principal: number; annualRate: number; tenureMonths: number; startMonth: number; description: string }>;
    horizonMonths: number;
  };
  results: {
    summaryDeltas: {
      netWorthDelta: number;
      runwayMonthsDelta: number;
      monthlyCashflowDelta: number;
      dtiDelta: number;
    };
    timeSeries: Array<{
      monthIndex: number;
      monthLabel: string;
      baselineNetWorth: number;
      simulatedNetWorth: number;
      baselineReserves: number;
      simulatedReserves: number;
      baselineDebt: number;
      simulatedDebt: number;
    }>;
  };
  createdAt: Date;
}
```

### RiskSignal Schema
```typescript
{
  _id: ObjectId;
  userId: ObjectId; // indexed
  signalCode: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  metricValue: number;
  thresholdValue: number;
  title: string;
  message: string;
  explanation: string;
  triggeredAt: Date;
  resolvedAt?: Date;
}
```

---

## 33. UI / UX
- **FinTech Dark Mode Aesthetic:**
  - Background void: Deep charcoal black `#060a14`.
  - Translucent glass surfaces: `rgba(255, 255, 255, 0.04)` with `1px` crisp border `rgba(255, 255, 255, 0.08)`.
  - Brand Accents: Electric Indigo `#6c8cff`, Bright Cyan `#38bdf8`, Emerald Safe `#34d399`, Amber Warning `#fbbf24`, Crimson Critical `#f43f5e`.
  - Typography: `Space Grotesk` for data headers, figures, and branding; `Inter` for clean reading typography.
- **Hero Immersion:** Preserves the cinematic video background (`fintwin-hero.mp4`), sound toggle controls, floating metric badges, and smooth scroll indicators.
- **Interactive Data Affordances:**
  - Delta badges: $+X\%$ (Emerald) and $-Y\%$ (Crimson) showing scenario diffs.
  - Graph canvas: Interactive pan, zoom, node drag, and tooltip inspections.
  - Zero placeholder UI: All buttons, modals, and filters are fully wired to real state.
- **Demo Mode Transparency:** Explicitly labeled banner and switch (*"Demo Mode Active — Isolated Mock Data"*) whenever demo datasets are viewed.

---

## 34. Responsive & Mobile Requirements
Responsive behavior is an architectural prerequisite across all three target form factors:

| Form Factor | Viewport Range | Layout Behavior & Component Adaptations |
| :--- | :--- | :--- |
| **Desktop / Laptop** | $> 1024\text{ px}$ | Multi-column grid, split-screen simulation diff viewer, full graph canvas, persistent sidebar navigation. |
| **Tablet** | $640\text{ px} - 1024\text{ px}$ | 2-column adaptive layout, collapsible slide-over sidebar, compact metric cards, responsive graph canvas. |
| **Mobile Screen** | $< 640\text{ px}$ | Single-column fluid stack, bottom navigation bar or top hamburger drawer, scrollable tabular lists, touch targets $\ge 44 \times 44\text{ px}$. |

### Specific Component Mobile Rules:
1. **Navigation:** Collapses to a sticky top navbar with a slide-out drawer or bottom navigation bar on mobile screens.
2. **Hero:** Video scales seamlessly without letterboxing; headline adjusts from 3.25rem to 1.75rem; CTAs stack vertically with full width.
3. **Interactive Graph:** Mobile provides pinch-to-zoom and touch drag, alongside a toggleable "Card List" fallback view for small screens.
4. **Tables:** Transform into responsive stacked card lists on mobile to eliminate horizontal scrolling.
5. **Simulation Lab:** Parameter sliders and inputs stack above the chart; charts dynamically re-flow using Recharts `ResponsiveContainer`.
6. **No Horizontal Overflow:** `overflow-x: hidden` enforced at root level; all containers use flexible width (`100%`, `max-w-full`).

---

## 35. Security
1. **Zero Secret Leakage:** All API keys (`OPENAI_API_KEY`), database credentials (`MONGODB_URI`), and secrets (`JWT_SECRET`) reside exclusively in server `.env` files. Client distributions contain zero private credentials.
2. **Input Sanitization:** Strong input validation on all REST endpoints to prevent NoSQL query injection and XSS.
3. **CORS Policy:** Strict origin whitelisting matching frontend client host.
4. **Password Protection:** Cryptographic salt hashing via `bcryptjs` (salt rounds: 10). Plain-text passwords are never logged or stored.
5. **Data Isolation:** User ID verification enforced at database query level on every operation.

---

## 36. Error Handling
1. **Standardized API Error Envelope:**
   ```json
   {
     "success": false,
     "message": "Human-readable error explanation",
     "errors": ["Detailed validation error 1", "Detailed validation error 2"]
   }
   ```
2. **Frontend Error Boundaries:** Global and section-level React error boundaries catch runtime rendering failures and present a "Recover & Reload" card rather than a white screen crash.
3. **Database Reconnection:** Mongoose configured with automatic reconnection backoff logic.
4. **AI Fallback:** If OpenAI or external LLM API is unavailable, the system transparently falls back to the deterministic rule engine without throwing errors to the user.

---

## 37. Testing Strategy
FinTwin enforces the strict quality cycle across every phase:
```
BUILD ──> TEST ──> FIND FAILURES ──> FIX ──> RETEST ──> VERIFY ──> NEXT PHASE
```
Acceptance Target: **100% of defined tests passing.**

1. **Unit Testing:**
   - Amortization formula correctness: verifying principal, monthly payment, and total interest against standard banking benchmarks.
   - Cashflow recurrence and balance evolution over 60-month steps.
   - Runway formula and threshold boundary conditions.
   - Risk signal evaluators (exact trigger at boundary $+0.001$, no false triggers at boundary $-0.001$).
2. **API Testing:**
   - Auth endpoints: valid registration, duplicate email rejection, invalid password rejection, valid login, token verification.
   - Protected route verification: 401 Unauthorized on missing token; 403 Forbidden on invalid token.
   - User isolation verification: User A cannot fetch User B's accounts or simulation runs.
   - CRUD validation on Accounts, Entities, and Transactions.
3. **Integration Testing:**
   - Full 6-stage pipeline: Ingest $\to$ Normalize $\to$ Model $\to$ Connect $\to$ Simulate $\to$ Analyze.
4. **Responsive Testing:**
   - Viewport testing at 375px (iPhone SE/13), 768px (iPad Mini), 1024px (iPad Pro), and 1440px (Desktop).
5. **Build Verification:**
   - Zero TypeScript compiler errors (`tsc -b`).
   - Zero Vite production bundling errors (`vite build`).

---

## 38. End-to-End Workflows
The application must execute the complete Golden Path workflow:
```
[ 01 REGISTER ]
      ↓
[ 02 LOGIN ]
      ↓
[ 03 ONBOARDING ] (Enter initial accounts, salary, fixed rent)
      ↓
[ 04 INGEST TRANSACTIONS ] (Ingest bank statement or add sample entries)
      ↓
[ 05 INSPECT DIGITAL TWIN ] (Verify Net Worth, Liquid Reserves, Runway)
      ↓
[ 06 EXPLORE NETWORK ] (Inspect nodes, directional flows, and counterparties)
      ↓
[ 07 CONFIGURE SIMULATION ] (e.g. ₹70,000 laptop purchase with 6-month EMI)
      ↓
[ 08 RUN SIMULATION ] (Inspect baseline vs. simulated chart comparison)
      ↓
[ 09 REVIEW ANALYSIS & SIGNALS ] (Inspect explainable causal insights)
      ↓
[ 10 SAVE TO HISTORY ] (Archive scenario run)
      ↓
[ 11 LOGOUT & RE-LOGIN ] (Confirm persisted database state integrity)
```
Every step must execute against live API endpoints and MongoDB storage.

---

## 39. Performance Testing
1. **Simulation Calculation Latency:** A 60-month multi-variable simulation must execute in $< 150\text{ ms}$ on the server.
2. **Graph Rendering Performance:** Interactive network topology must maintain 60 FPS rendering up to 150 nodes and 300 links.
3. **REST API Response Time:** Standard CRUD queries must return in $< 200\text{ ms}$.
4. **Presentation Metrics Clarification:**
   - TechNova PPT prototype metrics (*"98% system uptime"*, *"1.2s average response"*, *"99.2% success rate"*, *"98% 5-star rating"*, *"79% useful/very useful"*) are explicitly labeled as **"Prototype / Presentation Metrics"** in marketing views.
   - Real system benchmarks will be empirically measured and reported during Phase 6 verification.

---

## 40. Deployment
1. **Frontend Deployment:**
   - Vercel-ready static build (`vite build` outputting to `dist/`).
   - Includes `vercel.json` rewrite configuration for React Router HTML5 pushState:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```
2. **Backend Deployment:**
   - Render / cloud container-ready Node.js Express server.
   - Starts with `node dist/server.js` or `tsx src/server.ts`.
   - Health check endpoint: `GET /api/health`.
3. **Database Deployment:**
   - MongoDB Atlas cloud cluster connected via secure connection string (`MONGODB_URI`).

---

## 41. Definition of Done
A phase or feature in FinTwin is complete **only when all of the following conditions are met**:
- [ ] Frontend compiles with zero TypeScript warnings or errors (`tsc -b`).
- [ ] Frontend builds cleanly for production (`vite build`).
- [ ] Backend server runs cleanly with structured logging.
- [ ] Database connects successfully with schemas and indexes registered.
- [ ] Authentication and user isolation pass automated test verification.
- [ ] Digital Twin calculates Net Worth, Runway, and Cashflow from real stored records (zero randomized mock math).
- [ ] Interactive Network visualization displays actual connected entity nodes and transaction edges.
- [ ] Simulation Engine computes prospective multi-month trajectories deterministically.
- [ ] Risk Signals trigger accurately according to defined mathematical criteria.
- [ ] Explainable AI provides causal narratives with graceful deterministic fallback.
- [ ] Layout is fully responsive across desktop, tablet, and mobile screens with zero horizontal scroll.
- [ ] Cinematic Hero with video background, sound toggle, and design tokens is preserved and functional.
- [ ] Complete Golden Path E2E workflow executes cleanly from registration to scenario archiving.

---

## 42. Phased Development Roadmap

### Phase 0: Project Audit & Master Specification (CURRENT)
- Full workspace audit of existing codebase, dependencies, and Hero assets.
- Creation of comprehensive `spec.md` and implementation plan.
- **Status: COMPLETED (Phase 0 Deliverable).**

### Phase 1: Full-Stack Project Scaffolding & Database Setup
- Establish unified workspace structure (`client/` and `server/`).
- Preserve and integrate existing high-value assets (`fintwin-hero.mp4`, `Hero` components).
- Set up Express backend with MongoDB connection, Mongoose schemas, and JWT authentication.
- Build frontend AppShell, auth store, Login, and Registration views.

### Phase 2: Core Digital Twin & Data Pipeline (Ingest, Normalize, Model)
- Implement Account, Entity, and Transaction management endpoints.
- Build Ingestion and Normalization pipeline (01 INGEST, 02 NORMALIZE).
- Implement `DigitalTwinCore` state aggregation service (03 MODEL).

### Phase 3: Connected Network & Graph Engine (Connect)
- Implement backend Graph Engine (`/api/twin/network`) (04 CONNECT).
- Build frontend Interactive Network Topology page with node/edge inspection and filtering.

### Phase 4: Deterministic Simulation Engine (Simulate)
- Implement backend `SimulationEngine` with multi-horizon cashflow projection and loan amortization (05 SIMULATE).
- Build frontend Simulation Lab with scenario parameter controls, side-by-side diff charts, and metric deltas.

### Phase 5: Risk Signals & Explainable AI Engine (Analyze)
- Implement deterministic Risk Signal evaluators (06 ANALYZE).
- Integrate AI explainability service with robust deterministic fallback.
- Build frontend Analysis and Risk Signals pages.

### Phase 6: End-to-End Integration, Polish & Verification
- Wire all 14 pages with responsive navigation, onboarding flow, and persistent history.
- Run complete test suites (Unit, API, E2E, Security).
- Final production build verification.
