import { describe, expect, it } from 'vitest';
import {
  calculateAccountBalance,
  calculateMonthlyTotals,
  calculateNetWorthSummary,
  calculateSafeToSpend,
  simulateDebtPayoff,
} from '@/services/finance-engine/financeEngine';
import { createDemoDataset } from '@/services/repositories/defaultData';
import { currentMonthISO } from '@/utils/money';

describe('MONEYBANK Financial Engine (Decimal Precision)', () => {
  it('computes net worth, transfers without double-counting, and credit cards as liabilities', () => {
    const payload = createDemoDataset();
    const month = currentMonthISO();

    // Add internal transfer of $200 from checking to savings
    payload.transactions.push({
      id: 'tx_transfer_1',
      description: 'Transferencia a ahorro',
      amount: '200.00',
      currency: 'USD',
      date: `${month}-10`,
      type: 'transfer',
      accountId: 'acc_checking',
      toAccountId: 'acc_savings',
      categoryId: 'cat_transfer',
      tags: [],
      status: 'completed',
      auditTrail: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const monthly = calculateMonthlyTotals(payload, month);
    // Transfer must NOT alter income (1650.00) or expenses (650 + 138.45 = 788.45)
    expect(monthly.income).toBe('1650.00');
    expect(monthly.expenses).toBe('788.45');

    const nw = calculateNetWorthSummary(payload);
    // Checking: 1450 + 1650 - 650 - 138.45 - 200 = 2111.55
    // Savings: 2800 + 200 = 3000.00
    // Cash: 185.00
    // Total assets = 5296.55; Liabilities = 420 (CC) + 6120 (Auto) = 6540.00
    expect(nw.totalAssets).toBe('5296.55');
    expect(nw.totalLiabilities).toBe('6540.00');
    expect(nw.netWorth).toBe('-1243.45');
  });

  it('does not double-count savings held in a separate savings account when calculating Safe-to-Spend', () => {
    const payload = createDemoDataset();
    const month = currentMonthISO();
    const safe = calculateSafeToSpend(payload, month);
    // goal_emergency is associated with acc_savings (type: 'savings'), so reservedSavings inside liquid accounts is 0.00
    expect(safe.reservedSavings).toBe('0.00');
    expect(safe.customReservedFunds).toBe('120.00');
  });

  it('compares debt snowball vs avalanche payoff schedules accurately', () => {
    const payload = createDemoDataset();
    const snowball = simulateDebtPayoff(payload.debts, 'snowball', '100.00');
    const avalanche = simulateDebtPayoff(payload.debts, 'avalanche', '100.00');
    expect(snowball.monthsToPayoff).toBeGreaterThan(0);
    expect(snowball.monthsToPayoff).toBe(avalanche.monthsToPayoff);
  });
});
