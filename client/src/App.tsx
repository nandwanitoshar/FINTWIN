import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/AppShell/AppShell';

// Page Imports
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { FinancialTwinPage } from './pages/FinancialTwinPage';
import { NetworkPage } from './pages/NetworkPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { EntitiesPage } from './pages/EntitiesPage';
import { SimulationPage } from './pages/SimulationPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { RiskSignalsPage } from './pages/RiskSignalsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { IntelligenceReportPage } from './pages/IntelligenceReportPage';

import { AccountsPage } from './pages/AccountsPage';
import { GoalsPage } from './pages/GoalsPage';
import { DebtLoansPage } from './pages/DebtLoansPage';
import { RecurringExpensesPage } from './pages/RecurringExpensesPage';
import { CalendarPage } from './pages/CalendarPage';
import { AskFinTwinPage } from './pages/AskFinTwinPage';
import { DataQualityPage } from './pages/DataQualityPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            {/* Public & Landing */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Core Application Views */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/financial-twin" element={<FinancialTwinPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/debt-loans" element={<DebtLoansPage />} />
            <Route path="/recurring" element={<RecurringExpensesPage />} />
            <Route path="/recurring-expenses" element={<RecurringExpensesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/financial-calendar" element={<CalendarPage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/entities" element={<EntitiesPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/risk-signals" element={<RiskSignalsPage />} />
            <Route path="/ask" element={<AskFinTwinPage />} />
            <Route path="/data-quality" element={<DataQualityPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/scenario-history" element={<HistoryPage />} />
            <Route path="/intelligence-report" element={<IntelligenceReportPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  );
}
