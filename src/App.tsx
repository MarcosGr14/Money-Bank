import React, { useEffect, useState } from 'react';
import {
  Activity, ArrowDownCircle, ArrowUpCircle, BarChart3, Calendar,
  ChevronLeft, ChevronRight, CreditCard, Flame, Landmark, LayoutDashboard,
  ListOrdered, Lock, Menu, Moon, PiggyBank, Plus, Repeat, Settings, Sun, Target, FileText,
} from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { translations } from '@/i18n/translations';
import { currentMonthISO } from '@/utils/money';
import { VaultGate } from '@/features/settings/VaultGate';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { AccountsView } from '@/features/accounts/AccountsView';
import { TransactionsView } from '@/features/transactions/TransactionsView';
import { RecurringView } from '@/features/recurring/RecurringView';
import { DebtsView } from '@/features/debts/DebtsView';
import { SavingsView } from '@/features/savings/SavingsView';
import { BudgetsView } from '@/features/budgets/BudgetsView';
import { CalendarView } from '@/features/calendar/CalendarView';
import { AnalyticsView } from '@/features/analytics/AnalyticsView';
import { FinancialHealthView } from '@/features/financial-health/FinancialHealthView';
import { SimulatorView } from '@/features/simulator/SimulatorView';
import { ReportsView } from '@/features/reports/ReportsView';
import { SettingsView } from '@/features/settings/SettingsView';

export default function App() {
  const {
    initialized,
    isUnlocked,
    preferences,
    lastActivityAt,
    boot,
    lockVault,
    touchActivity,
    updatePreferences,
  } = useVaultStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState(currentMonthISO());
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    boot();
  }, [boot]);

  // Automatic inactivity lock timer
  useEffect(() => {
    if (!isUnlocked) return;
    const onEvent = () => touchActivity();
    window.addEventListener('pointerdown', onEvent);
    window.addEventListener('keydown', onEvent);

    const timer = window.setInterval(() => {
      const elapsedMs = Date.now() - useVaultStore.getState().lastActivityAt;
      const limitMs = preferences.inactivityTimeoutMinutes * 60 * 1000;
      if (elapsedMs >= limitMs) {
        lockVault();
      }
    }, 10_000);

    return () => {
      window.removeEventListener('pointerdown', onEvent);
      window.removeEventListener('keydown', onEvent);
      window.clearInterval(timer);
    };
  }, [isUnlocked, preferences.inactivityTimeoutMinutes, lockVault, touchActivity]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--text-secondary)]">
        Inicializando bóveda local...
      </div>
    );
  }

  if (!isUnlocked) {
    return <VaultGate />;
  }

  const t = translations[preferences.language];

  const navItems = [
    { id: 'overview', label: t.nav.overview, icon: LayoutDashboard },
    { id: 'accounts', label: t.nav.accounts, icon: Landmark },
    { id: 'transactions', label: t.nav.transactions, icon: ListOrdered },
    { id: 'income', label: t.nav.income, icon: ArrowUpCircle },
    { id: 'expenses', label: t.nav.expenses, icon: ArrowDownCircle },
    { id: 'recurring', label: t.nav.recurring, icon: Repeat },
    { id: 'debts', label: t.nav.debts, icon: CreditCard },
    { id: 'savings', label: t.nav.savings, icon: PiggyBank },
    { id: 'budgets', label: t.nav.budgets, icon: Target },
    { id: 'calendar', label: t.nav.calendar, icon: Calendar },
    { id: 'analytics', label: t.nav.analytics, icon: BarChart3 },
    { id: 'health', label: t.nav.health, icon: Activity },
    { id: 'simulator', label: t.nav.simulator, icon: Flame },
    { id: 'reports', label: t.nav.reports, icon: FileText },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all lg:static ${
          collapsed ? 'w-16' : 'w-60'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--border-subtle)] px-3.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-xs font-bold text-white">
              MB
            </span>
            {!collapsed && <span className="font-bold tracking-tight text-sm">MONEYBANK</span>}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:inline-flex rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            title="Colapsar menú"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                }`}
                title={item.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Período financiero"
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('transactions');
                setQuickAddOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" /> {t.quickAdd}
            </button>

            <button
              type="button"
              onClick={() =>
                updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' })
              }
              className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
              title="Cambiar tema"
            >
              {preferences.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={lockVault}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              title={t.lockVault}
            >
              <Lock className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t.lockVault}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && <DashboardView period={period} onNavigate={setActiveTab} />}
          {activeTab === 'accounts' && <AccountsView />}
          {activeTab === 'transactions' && (
            <TransactionsView
              quickModalOpen={quickAddOpen}
              onCloseQuickModal={() => setQuickAddOpen(false)}
            />
          )}
          {activeTab === 'income' && <TransactionsView forcedType="income" />}
          {activeTab === 'expenses' && <TransactionsView forcedType="expense" />}
          {activeTab === 'recurring' && <RecurringView />}
          {activeTab === 'debts' && <DebtsView />}
          {activeTab === 'savings' && <SavingsView />}
          {activeTab === 'budgets' && <BudgetsView period={period} />}
          {activeTab === 'calendar' && <CalendarView period={period} />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'health' && <FinancialHealthView period={period} />}
          {activeTab === 'simulator' && <SimulatorView period={period} />}
          {activeTab === 'reports' && <ReportsView period={period} />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
