export type AccountType = 'cash' | 'checking' | 'savings' | 'credit_card' | 'digital_wallet' | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'debt_payment' | 'savings_contribution' | 'adjustment';
export type TransactionStatus = 'completed' | 'expected' | 'pending' | 'cancelled';
export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';
export type DebtType = 'personal_loan' | 'bank_loan' | 'credit_card' | 'financing' | 'family_loan' | 'other';
export type InterestType = 'fixed' | 'variable' | 'zero';
export type AlertSeverity = 'informational' | 'low' | 'medium' | 'high' | 'critical';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: string;
  institution?: string;
  icon: string;
  color: string;
  notes?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  kind: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
  subcategories: string[];
  isCustom?: boolean;
}

export interface TransactionAuditEntry {
  timestamp: string;
  field: string;
  previousValue: string;
  newValue: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: string; // Always positive string; direction governed by type
  currency: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  accountId: string;
  toAccountId?: string; // For transfers
  categoryId: string;
  subcategory?: string;
  notes?: string;
  tags: string[];
  status: TransactionStatus;
  recurrenceId?: string;
  debtId?: string;
  savingsGoalId?: string;
  principalPart?: string;
  interestPart?: string;
  feePart?: string;
  auditTrail: TransactionAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRule {
  id: string;
  serviceName: string;
  brandKey: string;
  amount: string;
  currency: string;
  frequency: RecurrenceFrequency;
  customIntervalDays?: number;
  nextDueDate: string; // YYYY-MM-DD
  accountId: string;
  categoryId: string;
  kind: 'expense' | 'income';
  status: 'active' | 'paused' | 'cancelled';
  reminderDaysBefore: number;
  notes?: string;
  skippedDates: string[];
  paidDates: string[];
  createdAt: string;
}

export interface Debt {
  id: string;
  name: string;
  creditor: string;
  type: DebtType;
  originalPrincipal: string;
  outstandingPrincipal: string;
  annualInterestRate: string; // e.g., "14.50" (%)
  interestType: InterestType;
  paymentFrequency: RecurrenceFrequency;
  minimumPayment: string;
  dueDayOfMonth: number;
  startDate: string;
  expectedEndDate?: string;
  associatedAccountId?: string;
  notes?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  icon: string;
  targetAmount: string;
  currentAmount: string;
  targetDate?: string;
  associatedAccountId?: string;
  earmarkedInAccount: boolean; // True = already inside account balance, reserve from safe-to-spend
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

export interface Budget {
  id: string;
  name: string;
  period: string; // YYYY-MM or custom label
  startDate: string;
  endDate: string;
  overallLimit: string;
  categoryLimits: Record<string, string>;
  thresholds: [number, number, number]; // e.g. [70, 90, 100]
  recurringMonthly: boolean;
}

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  newPurchaseAmount: string;
  newLoanPrincipal: string;
  newLoanRate: string;
  newLoanMonths: number;
  extraDebtPaymentMonthly: string;
  monthlyIncomeDelta: string;
  cancelledSubscriptionsMonthly: string;
  monthlyExpenseDelta: string;
  extraSavingsMonthly: string;
  unexpectedExpenseOneTime: string;
}

export interface FinancialVaultPayload {
  version: number;
  updatedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  budgets: Budget[];
  scenarios: SavedScenario[];
  dismissedAlerts: string[];
  customReservedFunds: string;
  isDemoData?: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  currency: string;
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
  inactivityTimeoutMinutes: number;
  periodStartDay: number;
  notificationsEnabled: boolean;
  dashboardWidgets: string[];
}

export interface VaultMetadata {
  id: 'primary_vault';
  saltBase64: string;
  verifierIvBase64: string;
  verifierCipherBase64: string;
  iterations: number;
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedVaultRecord {
  id: 'financial_state';
  ivBase64: string;
  cipherBase64: string;
  updatedAt: string;
}
