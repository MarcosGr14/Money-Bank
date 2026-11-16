import Decimal from 'decimal.js';
import { addDays, addMonths, addWeeks, addYears, format, isBefore, parseISO } from 'date-fns';
import type {
  Account,
  AlertSeverity,
  Budget,
  Debt,
  FinancialVaultPayload,
  RecurringRule,
  SavedScenario,
  SavingsGoal,
  Transaction,
} from '@/types/domain';
import { D, addMoney, divMoney, maxMoney, mulMoney, subMoney } from '@/utils/money';

export interface SafeToSpendBreakdown {
  liquidBalance: string;
  expectedConfirmedIncome: string;
  unpaidMandatoryCommitments: string;
  reservedSavings: string;
  customReservedFunds: string;
  safeToSpend: string;
  projectedEndOfMonthBalance: string;
}

export interface FinancialHealthFactor {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  explanation: string;
}

export interface FinancialAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  explanation: string;
  period: string;
  calculation: string;
  recommendation: string;
}

export interface DebtPayoffScheduleResult {
  strategy: 'snowball' | 'avalanche';
  monthsToPayoff: number;
  totalInterestPaid: string;
  totalPaid: string;
  estimatedPayoffDate: string;
  order: string[];
}

export function calculateAccountBalance(account: Account, transactions: Transaction[]): string {
  let bal = D(account.openingBalance);

  for (const tx of transactions) {
    if (tx.status !== 'completed') continue;
    const amt = D(tx.amount);

    if (account.type === 'credit_card') {
      // Credit card balance represents liability owed
      if (tx.accountId === account.id) {
        if (tx.type === 'expense') bal = bal.plus(amt);
        else if (tx.type === 'income' || tx.type === 'debt_payment') bal = bal.minus(amt);
        else if (tx.type === 'adjustment') bal = bal.plus(amt);
        else if (tx.type === 'transfer') bal = bal.plus(amt);
      }
      if (tx.type === 'transfer' && tx.toAccountId === account.id) {
        bal = bal.minus(amt);
      }
    } else {
      // Asset accounts (checking, savings, cash, digital_wallet, other)
      if (tx.accountId === account.id) {
        if (tx.type === 'income') bal = bal.plus(amt);
        else if (tx.type === 'expense' || tx.type === 'debt_payment') bal = bal.minus(amt);
        else if (tx.type === 'transfer') bal = bal.minus(amt);
        else if (tx.type === 'adjustment') bal = bal.plus(amt);
      }
      if (tx.type === 'transfer' && tx.toAccountId === account.id) {
        bal = bal.plus(amt);
      }
    }
  }

  return bal.toFixed(2);
}

export function calculateNetWorthSummary(payload: FinancialVaultPayload) {
  let liquidAssets = D(0);
  let totalAssets = D(0);
  let creditCardDebt = D(0);

  for (const acc of payload.accounts) {
    if (acc.archived) continue;
    const bal = D(calculateAccountBalance(acc, payload.transactions));
    if (acc.type === 'credit_card') {
      if (bal.greaterThan(0)) creditCardDebt = creditCardDebt.plus(bal);
    } else {
      totalAssets = totalAssets.plus(bal);
      if (acc.type === 'checking' || acc.type === 'cash' || acc.type === 'digital_wallet') {
        liquidAssets = liquidAssets.plus(bal);
      }
    }
  }

  let loanLiabilities = D(0);
  for (const debt of payload.debts) {
    if (debt.type !== 'credit_card') {
      loanLiabilities = loanLiabilities.plus(D(debt.outstandingPrincipal));
    }
  }

  const totalLiabilities = creditCardDebt.plus(loanLiabilities);
  const netWorth = totalAssets.minus(totalLiabilities);

  return {
    liquidAssets: liquidAssets.toFixed(2),
    totalAssets: totalAssets.toFixed(2),
    totalLiabilities: totalLiabilities.toFixed(2),
    netWorth: netWorth.toFixed(2),
  };
}

export function calculateMonthlyTotals(payload: FinancialVaultPayload, monthYYYYMM: string) {
  let income = D(0);
  let expectedIncome = D(0);
  let expenses = D(0);
  let savings = D(0);

  for (const tx of payload.transactions) {
    if (!tx.date.startsWith(monthYYYYMM)) continue;
    if (tx.status === 'cancelled') continue;
    const amt = D(tx.amount);

    if (tx.type === 'income') {
      if (tx.status === 'completed') income = income.plus(amt);
      else if (tx.status === 'expected' || tx.status === 'pending') expectedIncome = expectedIncome.plus(amt);
    } else if (tx.type === 'expense' && tx.status === 'completed') {
      expenses = expenses.plus(amt);
    } else if (tx.type === 'debt_payment' && tx.status === 'completed') {
      // Interest & fees count as expense; principal reduces liability
      const interestAndFees = D(tx.interestPart ?? 0).plus(D(tx.feePart ?? 0));
      expenses = expenses.plus(interestAndFees);
    } else if (tx.type === 'savings_contribution' && tx.status === 'completed') {
      savings = savings.plus(amt);
    }
  }

  return {
    income: income.toFixed(2),
    expectedIncome: expectedIncome.toFixed(2),
    expenses: expenses.toFixed(2),
    savings: savings.toFixed(2),
    netCashFlow: income.minus(expenses).toFixed(2),
  };
}

export function calculateSafeToSpend(
  payload: FinancialVaultPayload,
  monthYYYYMM: string
): SafeToSpendBreakdown {
  const nw = calculateNetWorthSummary(payload);
  const monthly = calculateMonthlyTotals(payload, monthYYYYMM);

  // Unpaid recurring commitments due in the current month
  let unpaidCommitments = D(0);
  for (const rule of payload.recurringRules) {
    if (rule.status !== 'active' || rule.kind !== 'expense') continue;
    if (
      rule.nextDueDate.startsWith(monthYYYYMM) &&
      !rule.paidDates.includes(rule.nextDueDate) &&
      !rule.skippedDates.includes(rule.nextDueDate)
    ) {
      unpaidCommitments = unpaidCommitments.plus(D(rule.amount));
    }
  }

  // Add minimum debt payments not yet paid this month
  for (const debt of payload.debts) {
    const paidThisMonth = payload.transactions.some(
      (t) =>
        t.debtId === debt.id &&
        t.date.startsWith(monthYYYYMM) &&
        t.status === 'completed'
    );
    if (!paidThisMonth) {
      unpaidCommitments = unpaidCommitments.plus(D(debt.minimumPayment));
    }
  }

  // Reserved savings: only subtract earmarked goals held inside liquid accounts (not already in separate savings accounts)
  let reservedSavings = D(0);
  for (const goal of payload.savingsGoals) {
    if (goal.status !== 'active' || !goal.earmarkedInAccount) continue;
    const assoc = payload.accounts.find((a) => a.id === goal.associatedAccountId);
    if (!assoc || assoc.type === 'checking' || assoc.type === 'cash' || assoc.type === 'digital_wallet') {
      reservedSavings = reservedSavings.plus(D(goal.currentAmount));
    }
  }

  const customReserved = D(payload.customReservedFunds);
  const liquid = D(nw.liquidAssets);
  const expectedInc = D(monthly.expectedIncome);

  const safe = liquid
    .plus(expectedInc)
    .minus(unpaidCommitments)
    .minus(reservedSavings)
    .minus(customReserved);

  const projectedEndOfMonth = liquid.plus(expectedInc).minus(unpaidCommitments);

  return {
    liquidBalance: liquid.toFixed(2),
    expectedConfirmedIncome: expectedInc.toFixed(2),
    unpaidMandatoryCommitments: unpaidCommitments.toFixed(2),
    reservedSavings: reservedSavings.toFixed(2),
    customReservedFunds: customReserved.toFixed(2),
    safeToSpend: safe.toFixed(2),
    projectedEndOfMonthBalance: projectedEndOfMonth.toFixed(2),
  };
}

export function advanceRecurrenceDate(currentDateISO: string, rule: RecurringRule): string {
  const base = parseISO(currentDateISO);
  let next: Date;
  switch (rule.frequency) {
    case 'weekly':
      next = addWeeks(base, 1);
      break;
    case 'biweekly':
      next = addWeeks(base, 2);
      break;
    case 'quarterly':
      next = addMonths(base, 3);
      break;
    case 'semiannual':
      next = addMonths(base, 6);
      break;
    case 'annual':
      next = addYears(base, 1);
      break;
    case 'custom':
      next = addDays(base, Math.max(1, rule.customIntervalDays ?? 30));
      break;
    case 'monthly':
    default:
      next = addMonths(base, 1);
      break;
  }
  return format(next, 'yyyy-MM-dd');
}

export function simulateDebtPayoff(
  debts: Debt[],
  strategy: 'snowball' | 'avalanche',
  extraMonthlyPayment = '0.00'
): DebtPayoffScheduleResult {
  const active = debts
    .filter((d) => D(d.outstandingPrincipal).greaterThan(0))
    .map((d) => ({
      id: d.id,
      name: d.name,
      balance: D(d.outstandingPrincipal),
      rateMonthly: D(d.annualInterestRate).dividedBy(100).dividedBy(12),
      minPayment: D(d.minimumPayment),
    }));

  if (active.length === 0) {
    return {
      strategy,
      monthsToPayoff: 0,
      totalInterestPaid: '0.00',
      totalPaid: '0.00',
      estimatedPayoffDate: format(new Date(), 'yyyy-MM-dd'),
      order: [],
    };
  }

  const ordered = [...active].sort((a, b) => {
    if (strategy === 'snowball') return a.balance.comparedTo(b.balance);
    return b.rateMonthly.comparedTo(a.rateMonthly);
  });

  let months = 0;
  let totalInterest = D(0);
  let totalPaid = D(0);
  const maxMonths = 360;

  while (ordered.some((d) => d.balance.greaterThan(0)) && months < maxMonths) {
    months++;
    let extraPool = D(extraMonthlyPayment);

    for (const d of ordered) {
      if (d.balance.lte(0)) {
        extraPool = extraPool.plus(d.minPayment);
        continue;
      }
      const interest = d.balance.times(d.rateMonthly);
      totalInterest = totalInterest.plus(interest);
      d.balance = d.balance.plus(interest);

      const payment = Decimal.min(d.balance, d.minPayment);
      d.balance = d.balance.minus(payment);
      totalPaid = totalPaid.plus(payment);

      if (d.balance.lte(0)) {
        extraPool = extraPool.plus(d.minPayment.minus(payment));
      }
    }

    for (const d of ordered) {
      if (d.balance.lte(0) || extraPool.lte(0)) continue;
      const extraApplied = Decimal.min(d.balance, extraPool);
      d.balance = d.balance.minus(extraApplied);
      totalPaid = totalPaid.plus(extraApplied);
      extraPool = extraPool.minus(extraApplied);
    }
  }

  return {
    strategy,
    monthsToPayoff: months,
    totalInterestPaid: totalInterest.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    estimatedPayoffDate: format(addMonths(new Date(), months), 'yyyy-MM-dd'),
    order: ordered.map((d) => d.name),
  };
}

export function evaluateFinancialHealth(payload: FinancialVaultPayload, monthYYYYMM: string) {
  const monthly = calculateMonthlyTotals(payload, monthYYYYMM);
  const nw = calculateNetWorthSummary(payload);
  const safe = calculateSafeToSpend(payload, monthYYYYMM);

  const inc = D(monthly.income);
  const exp = D(monthly.expenses);
  const liq = D(nw.liquidAssets);
  const liab = D(nw.totalLiabilities);

  // 1. Expense-to-income ratio (30 pts)
  let ratioScore = 15;
  let ratioDesc = 'Sin ingresos registrados aún en el período.';
  if (inc.greaterThan(0)) {
    const ratio = exp.dividedBy(inc).times(100);
    if (ratio.lte(65)) ratioScore = 30;
    else if (ratio.lte(85)) ratioScore = 22;
    else if (ratio.lte(100)) ratioScore = 12;
    else ratioScore = 4;
    ratioDesc = `Gastos representan ${ratio.toFixed(1)}% de tus ingresos del mes.`;
  }

  // 2. Liquidity buffer (25 pts)
  const monthlyBase = exp.greaterThan(0) ? exp : D(500);
  const monthsCovered = liq.dividedBy(monthlyBase);
  const liqScore = monthsCovered.gte(3) ? 25 : monthsCovered.gte(1) ? 18 : monthsCovered.gt(0) ? 10 : 2;
  const liqDesc = `Liquidez disponible cubre ~${monthsCovered.toFixed(1)} meses de gasto actual.`;

  // 3. Debt burden (25 pts)
  const debtScore = liab.lte(0) ? 25 : liab.lte(liq.times(2)) ? 17 : 8;
  const debtDesc = liab.lte(0)
    ? 'Sin pasivos activos registrados.'
    : `Pasivos totales de ${liab.toFixed(2)} frente a activos totales de ${nw.totalAssets}.`;

  // 4. Safe-to-spend & commitments (20 pts)
  const safeVal = D(safe.safeToSpend);
  const commitScore = safeVal.gte(0) ? 20 : 5;
  const commitDesc = safeVal.gte(0)
    ? `Margen positivo tras compromisos pendientes (${safe.safeToSpend}).`
    : `Compromisos y reservas superan el saldo líquido actual (${safe.safeToSpend}).`;

  const factors: FinancialHealthFactor[] = [
    { id: 'ratio', label: 'Relación Gasto / Ingreso', score: ratioScore, maxScore: 30, explanation: ratioDesc },
    { id: 'liquidity', label: 'Liquidez Disponible', score: liqScore, maxScore: 25, explanation: liqDesc },
    { id: 'debt', label: 'Carga de Deuda', score: debtScore, maxScore: 25, explanation: debtDesc },
    { id: 'commitments', label: 'Cobertura de Compromisos', score: commitScore, maxScore: 20, explanation: commitDesc },
  ];

  const totalScore = factors.reduce((acc, f) => acc + f.score, 0);
  return { totalScore, factors };
}

export function generateFinancialAlerts(payload: FinancialVaultPayload, monthYYYYMM: string): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];
  const safe = calculateSafeToSpend(payload, monthYYYYMM);
  const monthly = calculateMonthlyTotals(payload, monthYYYYMM);
  const today = format(new Date(), 'yyyy-MM-dd');

  if (D(safe.safeToSpend).lessThan(0)) {
    alerts.push({
      id: `alert_neg_safe_${monthYYYYMM}`,
      severity: 'high',
      title: 'Disponible seguro para gastar en negativo',
      explanation: 'Tus compromisos pendientes y fondos reservados superan tu liquidez actual más ingresos esperados.',
      period: monthYYYYMM,
      calculation: `Liquidez (${safe.liquidBalance}) + Esperado (${safe.expectedConfirmedIncome}) - Compromisos (${safe.unpaidMandatoryCommitments}) = ${safe.safeToSpend}`,
      recommendation: 'Revisa suscripciones pausables o ajusta reservas voluntarias antes de realizar nuevos gastos.',
    });
  }

  for (const rule of payload.recurringRules) {
    if (rule.status === 'active' && isBefore(parseISO(rule.nextDueDate), parseISO(today))) {
      alerts.push({
        id: `alert_overdue_${rule.id}_${rule.nextDueDate}`,
        severity: 'medium',
        title: `Pago recurrente vencido: ${rule.serviceName}`,
        explanation: `La fecha programada (${rule.nextDueDate}) ya pasó y no ha sido marcada como pagada ni omitida.`,
        period: rule.nextDueDate,
        calculation: `Monto programado: ${rule.amount} ${rule.currency}`,
        recommendation: 'Registra el pago si ya se debitó o reprograma la próxima fecha.',
      });
    }
  }

  const budget = payload.budgets.find((b) => b.period === monthYYYYMM);
  if (budget) {
    const spent = D(monthly.expenses);
    const limit = D(budget.overallLimit);
    if (limit.greaterThan(0)) {
      const pct = spent.dividedBy(limit).times(100);
      if (pct.gte(budget.thresholds[2])) {
        alerts.push({
          id: `alert_bud_100_${budget.id}`,
          severity: 'high',
          title: 'Presupuesto general excedido',
          explanation: `Has consumido ${pct.toFixed(1)}% del límite establecido para ${budget.period}.`,
          period: budget.period,
          calculation: `Gasto (${spent.toFixed(2)}) / Límite (${limit.toFixed(2)})`,
          recommendation: 'Congela gastos discrecionales en las categorías con mayor desviación.',
        });
      } else if (pct.gte(budget.thresholds[0])) {
        alerts.push({
          id: `alert_bud_warn_${budget.id}`,
          severity: 'low',
          title: 'Umbral de presupuesto alcanzado',
          explanation: `Llevas ${pct.toFixed(1)}% de tu presupuesto mensual utilizado.`,
          period: budget.period,
          calculation: `Gasto (${spent.toFixed(2)}) / Límite (${limit.toFixed(2)})`,
          recommendation: 'Mantén control sobre gastos variables durante el resto del período.',
        });
      }
    }
  }

  return alerts.filter((a) => !payload.dismissedAlerts.includes(a.id));
}

export function runWhatIfProjection(
  payload: FinancialVaultPayload,
  monthYYYYMM: string,
  scenario: Omit<SavedScenario, 'id' | 'name' | 'createdAt'>,
  horizonMonths = 6
) {
  const baseNw = calculateNetWorthSummary(payload);
  const baseMonthly = calculateMonthlyTotals(payload, monthYYYYMM);

  const baseIncome = D(baseMonthly.income).plus(D(baseMonthly.expectedIncome));
  const baseExpense = D(baseMonthly.expenses);

  const newLoanMonthly =
    scenario.newLoanMonths > 0 && D(scenario.newLoanPrincipal).greaterThan(0)
      ? D(scenario.newLoanPrincipal)
          .times(D(1).plus(D(scenario.newLoanRate).dividedBy(100).times(scenario.newLoanMonths / 12)))
          .dividedBy(scenario.newLoanMonths)
      : D(0);

  const simIncome = baseIncome.plus(D(scenario.monthlyIncomeDelta));
  const simExpense = baseExpense
    .plus(D(scenario.monthlyExpenseDelta))
    .minus(D(scenario.cancelledSubscriptionsMonthly))
    .plus(newLoanMonthly);

  const rows = [];
  let baseBal = D(baseNw.liquidAssets);
  let simBal = D(baseNw.liquidAssets)
    .minus(D(scenario.newPurchaseAmount))
    .minus(D(scenario.unexpectedExpenseOneTime));

  for (let m = 1; m <= horizonMonths; m++) {
    baseBal = baseBal.plus(baseIncome.minus(baseExpense));
    simBal = simBal
      .plus(simIncome.minus(simExpense))
      .minus(D(scenario.extraDebtPaymentMonthly))
      .minus(D(scenario.extraSavingsMonthly));

    rows.push({
      monthLabel: `Mes +${m}`,
      baselineBalance: baseBal.toNumber(),
      simulatedBalance: simBal.toNumber(),
      difference: simBal.minus(baseBal).toFixed(2),
    });
  }

  return {
    rows,
    monthlyDelta: simIncome.minus(simExpense).minus(baseIncome.minus(baseExpense)).toFixed(2),
  };
}
