import Decimal from 'decimal.js';

Decimal.set({ precision: 24, rounding: Decimal.ROUND_HALF_UP });

export type DecimalString = string;

export function D(value: Decimal.Value | undefined | null): Decimal {
  if (value === undefined || value === null || value === '') return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

export function addMoney(a: Decimal.Value, b: Decimal.Value): DecimalString {
  return D(a).plus(D(b)).toFixed(2);
}

export function subMoney(a: Decimal.Value, b: Decimal.Value): DecimalString {
  return D(a).minus(D(b)).toFixed(2);
}

export function mulMoney(a: Decimal.Value, b: Decimal.Value): DecimalString {
  return D(a).times(D(b)).toFixed(2);
}

export function divMoney(a: Decimal.Value, b: Decimal.Value): DecimalString {
  const divisor = D(b);
  if (divisor.isZero()) return '0.00';
  return D(a).dividedBy(divisor).toFixed(2);
}

export function maxMoney(a: Decimal.Value, b: Decimal.Value): DecimalString {
  return Decimal.max(D(a), D(b)).toFixed(2);
}

export function minMoney(a: Decimal.Value, b: Decimal.Value): DecimalString {
  return Decimal.min(D(a), D(b)).toFixed(2);
}

export function formatCurrency(amount: Decimal.Value, currency = 'USD', lang = 'es'): string {
  const num = D(amount).toNumber();
  const locale = lang === 'en' ? 'en-US' : 'es-PA';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${D(amount).toFixed(2)}`;
  }
}

export function generateId(prefix = 'id'): string {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}_${Date.now().toString(36)}_${rand[0]!.toString(36)}${rand[1]!.toString(36)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthISO(): string {
  return new Date().toISOString().slice(0, 7);
}
