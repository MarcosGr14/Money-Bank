import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { D, formatCurrency, generateId } from '@/utils/money';
import { Badge, Button, Card, EmptyState, Input, Modal } from '@/components/ui/Primitives';

export const BudgetsView: React.FC<{ period: string }> = ({ period }) => {
  const { data, preferences, updateData } = useVaultStore();
  const [openAdd, setOpenAdd] = useState(false);
  const [overallLimit, setOverallLimit] = useState('1200.00');
  const [catLimits, setCatLimits] = useState<Record<string, string>>({});

  if (!data) return null;

  const currentBudget = data.budgets.find((b) => b.period === period);

  const spentByCategory = new Map<string, number>();
  let totalSpent = D(0);
  for (const tx of data.transactions) {
    if (tx.date.startsWith(period) && tx.type === 'expense' && tx.status === 'completed') {
      totalSpent = totalSpent.plus(D(tx.amount));
      spentByCategory.set(tx.categoryId, (spentByCategory.get(tx.categoryId) ?? 0) + Number(tx.amount));
    }
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(catLimits)) {
      if (Number(v) > 0) cleaned[k] = Number(v).toFixed(2);
    }
    await updateData((prev) => ({
      ...prev,
      budgets: [
        ...prev.budgets.filter((b) => b.period !== period),
        {
          id: generateId('bud'),
          name: `Presupuesto ${period}`,
          period,
          startDate: `${period}-01`,
          endDate: `${period}-31`,
          overallLimit: Number(overallLimit || 0).toFixed(2),
          categoryLimits: cleaned,
          thresholds: [70, 90, 100],
          recurringMonthly: true,
        },
      ],
    }));
    setOpenAdd(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Presupuestos ({period})</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Control de límites mensuales generales y por categoría con umbrales al 70%, 90% y 100%.
          </p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="w-4 h-4" /> {currentBudget ? 'Editar presupuesto' : 'Configurar presupuesto'}
        </Button>
      </div>

      {!currentBudget ? (
        <EmptyState
          title={`Sin presupuesto configurado para ${period}`}
          description="Define un límite mensual general y límites por categoría para recibir alertas tempranas."
          action={<Button onClick={() => setOpenAdd(true)}>Crear presupuesto</Button>}
        />
      ) : (
        <div className="space-y-4">
          <Card title="Límite General del Período">
            {(() => {
              const limit = D(currentBudget.overallLimit);
              const pct = limit.gt(0) ? Math.min(100, totalSpent.dividedBy(limit).times(100).toNumber()) : 0;
              return (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Consumido: <strong>{formatCurrency(totalSpent.toFixed(2), preferences.currency, preferences.language)}</strong></span>
                    <span>Límite: <strong>{formatCurrency(limit.toFixed(2), preferences.currency, preferences.language)}</strong> ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                    <div
                      className={`h-full ${pct >= 100 ? 'bg-[var(--status-danger)]' : pct >= 70 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-positive)]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(currentBudget.categoryLimits).map(([catId, limitStr]) => {
              const cat = data.categories.find((c) => c.id === catId);
              const spent = spentByCategory.get(catId) ?? 0;
              const limit = Number(limitStr);
              const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
              return (
                <Card key={catId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{cat?.name ?? catId}</span>
                    <Badge tone={pct >= 100 ? 'danger' : pct >= 70 ? 'warning' : 'positive'}>{pct.toFixed(0)}%</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {formatCurrency(spent, preferences.currency, preferences.language)} de {formatCurrency(limit, preferences.currency, preferences.language)}
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                    <div className="h-full bg-[var(--accent-primary)]" style={{ width: `${pct}%` }} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={openAdd} title={`Configurar presupuesto ${period}`} onClose={() => setOpenAdd(false)}>
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <Input label="Límite mensual total" type="number" step="10" value={overallLimit} onChange={(e) => setOverallLimit(e.target.value)} required />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Límites opcionales por categoría de gasto</p>
            {data.categories
              .filter((c) => c.kind === 'expense')
              .map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3">
                  <span className="text-xs">{c.name}</span>
                  <input
                    type="number"
                    step="5"
                    placeholder="0.00"
                    value={catLimits[c.id] ?? ''}
                    onChange={(e) => setCatLimits({ ...catLimits, [c.id]: e.target.value })}
                    className="w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs text-right"
                  />
                </div>
              ))}
          </div>
          <Button type="submit" className="w-full">Guardar presupuesto</Button>
        </form>
      </Modal>
    </div>
  );
};
