import React, { useMemo, useState } from 'react';
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Eye, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import {
  calculateMonthlyTotals,
  calculateNetWorthSummary,
  calculateSafeToSpend,
  evaluateFinancialHealth,
  generateFinancialAlerts,
} from '@/services/finance-engine/financeEngine';
import { createEmptyVaultPayload } from '@/services/repositories/defaultData';
import { formatCurrency } from '@/utils/money';
import { Badge, Button, Card, Modal } from '@/components/ui/Primitives';
import { BrandIcon } from '@/components/ui/BrandIcon';

export const DashboardView: React.FC<{ period: string; onNavigate: (tab: string) => void }> = ({
  period,
  onNavigate,
}) => {
  const { data, preferences, replacePayload } = useVaultStore();
  const [inspectSafe, setInspectSafe] = useState(false);

  if (!data) return null;
  const cur = preferences.currency;
  const lang = preferences.language;

  const nw = useMemo(() => calculateNetWorthSummary(data), [data]);
  const monthly = useMemo(() => calculateMonthlyTotals(data, period), [data, period]);
  const safe = useMemo(() => calculateSafeToSpend(data, period), [data, period]);
  const health = useMemo(() => evaluateFinancialHealth(data, period), [data, period]);
  const alerts = useMemo(() => generateFinancialAlerts(data, period), [data, period]);

  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of data.transactions) {
      if (tx.date.startsWith(period) && tx.type === 'expense' && tx.status === 'completed') {
        map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + Number(tx.amount));
      }
    }
    return Array.from(map.entries()).map(([catId, value]) => {
      const cat = data.categories.find((c) => c.id === catId);
      return { name: cat?.name ?? catId, value: Number(value.toFixed(2)), color: cat?.color ?? '#3559D8' };
    });
  }, [data, period]);

  const cashflowChartData = [
    { name: 'Ingresos', monto: Number(monthly.income) },
    { name: 'Gastos', monto: Number(monthly.expenses) },
    { name: 'Ahorro', monto: Number(monthly.savings) },
  ];

  const upcomingRecurring = data.recurringRules
    .filter((r) => r.status === 'active')
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {data.isDemoData && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs">
          <span>
            Estás visualizando el <strong>conjunto de datos de demostración opcional</strong>. Puedes eliminarlo en cualquier momento para empezar en limpio.
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => replacePayload(createEmptyVaultPayload())}
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar datos demo
          </Button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs text-[var(--text-secondary)]">Disponible seguro para gastar</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--accent-primary)]">
            {formatCurrency(safe.safeToSpend, cur, lang)}
          </p>
          <button
            type="button"
            onClick={() => setInspectSafe(true)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
          >
            <Eye className="w-3.5 h-3.5" /> Inspeccionar cálculo
          </button>
        </Card>

        <Card>
          <p className="text-xs text-[var(--text-secondary)]">Patrimonio neto</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{formatCurrency(nw.netWorth, cur, lang)}</p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Activos {formatCurrency(nw.totalAssets, cur, lang)} · Pasivos {formatCurrency(nw.totalLiabilities, cur, lang)}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-[var(--text-secondary)]">Flujo mensual ({period})</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--status-positive)]">
            {formatCurrency(monthly.netCashFlow, cur, lang)}
          </p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Ingresos {formatCurrency(monthly.income, cur, lang)} · Gastos {formatCurrency(monthly.expenses, cur, lang)}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-[var(--text-secondary)]">Salud financiera explicable</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{health.totalScore}/100</span>
            <Badge tone={health.totalScore >= 75 ? 'positive' : health.totalScore >= 50 ? 'warning' : 'danger'}>
              {health.totalScore >= 75 ? 'Sólida' : health.totalScore >= 50 ? 'Moderada' : 'Atención'}
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('health')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Ver factores ({alerts.length} alertas)
          </button>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Ingresos vs Gastos y Ahorro" subtitle={`Período activo: ${period}`}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowChartData}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="monto" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Distribución de gastos por categoría" subtitle="Gastos completados del período">
          {categoryChartData.length === 0 ? (
            <p className="py-16 text-center text-xs text-[var(--text-secondary)]">
              Aún no hay gastos completados en {period}.
            </p>
          ) : (
            <div className="h-60 flex items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie data={categoryChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80}>
                    {categoryChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[40%] space-y-2 text-xs">
                {categoryChartData.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-medium">{formatCurrency(c.value, cur, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Row: Upcoming Recurring + Savings & Debt Snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Próximos pagos recurrentes"
          action={<Button size="sm" variant="ghost" onClick={() => onNavigate('recurring')}>Ver todos</Button>}
        >
          {upcomingRecurring.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">No hay pagos recurrentes activos registrados.</p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {upcomingRecurring.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <BrandIcon brandKey={r.brandKey} size="sm" />
                    <div>
                      <p className="font-medium">{r.serviceName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Vence: {r.nextDueDate}</p>
                    </div>
                  </div>
                  <span className="font-semibold">{formatCurrency(r.amount, r.currency, lang)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Metas de ahorro y Deudas"
          action={<Button size="sm" variant="ghost" onClick={() => onNavigate('savings')}>Gestionar</Button>}
        >
          <div className="space-y-4">
            {data.savingsGoals.map((g) => {
              const pct = Math.min(100, Math.round((Number(g.currentAmount) / Math.max(1, Number(g.targetAmount))) * 100));
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-[var(--status-positive)]" /> {g.name}</span>
                    <span>{formatCurrency(g.currentAmount, cur, lang)} / {formatCurrency(g.targetAmount, cur, lang)} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                    <div className="h-full bg-[var(--status-positive)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {data.debts.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] p-2.5 text-xs">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-[var(--text-secondary)]">{d.creditor} · Tasa {d.annualInterestRate}%</p>
                </div>
                <span className="font-bold text-[var(--status-danger)]">{formatCurrency(d.outstandingPrincipal, cur, lang)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Safe-to-Spend Inspection Modal */}
      <Modal open={inspectSafe} title="Desglose: Disponible seguro para gastar" onClose={() => setInspectSafe(false)}>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span>Saldo líquido actual (Cuentas corrientes, efectivo, billeteras)</span>
            <span className="font-semibold">{formatCurrency(safe.liquidBalance, cur, lang)}</span>
          </div>
          <div className="flex justify-between text-[var(--status-positive)]">
            <span>+ Ingresos confirmados esperados ({period})</span>
            <span>+{formatCurrency(safe.expectedConfirmedIncome, cur, lang)}</span>
          </div>
          <div className="flex justify-between text-[var(--status-danger)]">
            <span>- Compromisos obligatorios pendientes (Recurrentes + cuotas)</span>
            <span>-{formatCurrency(safe.unpaidMandatoryCommitments, cur, lang)}</span>
          </div>
          <div className="flex justify-between text-[var(--status-warning)]">
            <span>- Ahorro etiquetado dentro de cuentas líquidas</span>
            <span>-{formatCurrency(safe.reservedSavings, cur, lang)}</span>
          </div>
          <div className="flex justify-between text-[var(--status-warning)]">
            <span>- Fondos reservados personalizados</span>
            <span>-{formatCurrency(safe.customReservedFunds, cur, lang)}</span>
          </div>
          <hr className="border-[var(--border-subtle)]" />
          <div className="flex justify-between text-base font-bold">
            <span>Estimación segura para gastar</span>
            <span className="text-[var(--accent-primary)]">{formatCurrency(safe.safeToSpend, cur, lang)}</span>
          </div>
          <p className="pt-2 text-xs text-[var(--text-secondary)]">
            Saldo proyectado de cierre de mes (sin restar reservas voluntarias): <strong>{formatCurrency(safe.projectedEndOfMonthBalance, cur, lang)}</strong>. No se resta dos veces el ahorro guardado en cuentas de ahorro separadas.
          </p>
        </div>
      </Modal>
    </div>
  );
};
