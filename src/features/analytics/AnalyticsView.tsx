import React, { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, subMonths } from 'date-fns';
import { useVaultStore } from '@/stores/vaultStore';
import { calculateMonthlyTotals, calculateNetWorthSummary } from '@/services/finance-engine/financeEngine';
import { formatCurrency } from '@/utils/money';
import { Card } from '@/components/ui/Primitives';

export const AnalyticsView: React.FC = () => {
  const { data, preferences } = useVaultStore();
  if (!data) return null;

  const nw = useMemo(() => calculateNetWorthSummary(data), [data]);

  const last6Months = useMemo(() => {
    const list = [];
    for (let i = 5; i >= 0; i--) {
      const m = format(subMonths(new Date(), i), 'yyyy-MM');
      const tot = calculateMonthlyTotals(data, m);
      list.push({
        month: m,
        ingresos: Number(tot.income),
        gastos: Number(tot.expenses),
        flujo: Number(tot.netCashFlow),
      });
    }
    return list;
  }, [data]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Analítica Financiera</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Series históricas calculadas exclusivamente a partir de tus registros cifrados locales.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-[var(--text-secondary)]">Activos totales actuales</p>
          <p className="mt-1 text-xl font-bold text-[var(--status-positive)]">{formatCurrency(nw.totalAssets, preferences.currency, preferences.language)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-secondary)]">Pasivos totales actuales</p>
          <p className="mt-1 text-xl font-bold text-[var(--status-danger)]">{formatCurrency(nw.totalLiabilities, preferences.currency, preferences.language)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-secondary)]">Patrimonio neto</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(nw.netWorth, preferences.currency, preferences.language)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Evolución Ingresos vs Gastos (6 meses)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last6Months}>
                <XAxis dataKey="month" fontSize={12} stroke="var(--text-secondary)" />
                <YAxis fontSize={12} stroke="var(--text-secondary)" />
                <Tooltip />
                <Bar dataKey="ingresos" name="Ingresos" fill="#16865B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#D94B4B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Tendencia de Flujo de Caja Neto">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last6Months}>
                <XAxis dataKey="month" fontSize={12} stroke="var(--text-secondary)" />
                <YAxis fontSize={12} stroke="var(--text-secondary)" />
                <Tooltip />
                <Area type="monotone" dataKey="flujo" name="Flujo neto" stroke="#3559D8" fill="rgba(53,89,216,0.18)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
