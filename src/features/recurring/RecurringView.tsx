import React, { useState } from 'react';
import { CheckCircle2, PauseCircle, Plus, SkipForward } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { advanceRecurrenceDate } from '@/services/finance-engine/financeEngine';
import { D, formatCurrency, generateId, todayISO } from '@/utils/money';
import type { RecurrenceFrequency, RecurringRule } from '@/types/domain';
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from '@/components/ui/Primitives';
import { BRAND_CATALOG, BrandIcon } from '@/components/ui/BrandIcon';

export const RecurringView: React.FC = () => {
  const { data, preferences, updateData } = useVaultStore();
  const [openAdd, setOpenAdd] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [brandKey, setBrandKey] = useState('netflix');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState(todayISO());
  const [accountId, setAccountId] = useState('');

  if (!data) return null;

  const monthlyCost = data.recurringRules
    .filter((r) => r.status === 'active' && r.kind === 'expense')
    .reduce((acc, r) => {
      const a = D(r.amount);
      if (r.frequency === 'weekly') return acc.plus(a.times(4.33));
      if (r.frequency === 'biweekly') return acc.plus(a.times(2.16));
      if (r.frequency === 'quarterly') return acc.plus(a.dividedBy(3));
      if (r.frequency === 'annual') return acc.plus(a.dividedBy(12));
      return acc.plus(a);
    }, D(0));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const chosenAcc = accountId || data?.accounts[0]?.id;
    if (!chosenAcc || !serviceName.trim() || Number(amount) <= 0) return;

    const rule: RecurringRule = {
      id: generateId('rec'),
      serviceName: serviceName.trim(),
      brandKey,
      amount: Number(amount).toFixed(2),
      currency: preferences.currency,
      frequency,
      nextDueDate,
      accountId: chosenAcc,
      categoryId: 'cat_subscriptions',
      kind: 'expense',
      status: 'active',
      reminderDaysBefore: 3,
      skippedDates: [],
      paidDates: [],
      createdAt: new Date().toISOString(),
    };

    await updateData((prev) => ({ ...prev, recurringRules: [...prev.recurringRules, rule] }));
    setServiceName('');
    setAmount('');
    setOpenAdd(false);
  }

  async function markAsPaid(rule: RecurringRule) {
    if (rule.paidDates.includes(rule.nextDueDate)) return; // Prevent duplicate occurrence
    const now = new Date().toISOString();
    const nextDate = advanceRecurrenceDate(rule.nextDueDate, rule);

    await updateData((prev) => ({
      ...prev,
      transactions: [
        {
          id: generateId('tx'),
          description: `Pago recurrente: ${rule.serviceName}`,
          amount: rule.amount,
          currency: rule.currency,
          date: todayISO(),
          type: 'expense',
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          tags: ['recurrente'],
          status: 'completed',
          recurrenceId: rule.id,
          auditTrail: [],
          createdAt: now,
          updatedAt: now,
        },
        ...prev.transactions,
      ],
      recurringRules: prev.recurringRules.map((r) =>
        r.id === rule.id
          ? { ...r, paidDates: [...r.paidDates, rule.nextDueDate], nextDueDate: nextDate }
          : r
      ),
    }));
  }

  async function skipOccurrence(rule: RecurringRule) {
    const nextDate = advanceRecurrenceDate(rule.nextDueDate, rule);
    await updateData((prev) => ({
      ...prev,
      recurringRules: prev.recurringRules.map((r) =>
        r.id === rule.id
          ? { ...r, skippedDates: [...r.skippedDates, rule.nextDueDate], nextDueDate: nextDate }
          : r
      ),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Pagos Recurrentes y Suscripciones</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Costo mensual estimado: <strong>{formatCurrency(monthlyCost.toFixed(2), preferences.currency, preferences.language)}</strong> · Anualizado: <strong>{formatCurrency(monthlyCost.times(12).toFixed(2), preferences.currency, preferences.language)}</strong>
          </p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="w-4 h-4" /> Nueva suscripción
        </Button>
      </div>

      {data.recurringRules.length === 0 ? (
        <EmptyState
          title="Sin pagos recurrentes"
          description="Registra tus suscripciones (Netflix, Spotify, Internet, Luz, Alquiler) para anticipar su impacto en tu saldo seguro."
          action={<Button onClick={() => setOpenAdd(true)}>Agregar suscripción</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.recurringRules.map((rule) => (
            <Card key={rule.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BrandIcon brandKey={rule.brandKey} />
                  <div>
                    <p className="font-semibold text-sm">{rule.serviceName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Próximo vencimiento: <strong>{rule.nextDueDate}</strong>
                    </p>
                  </div>
                </div>
                <Badge tone={rule.status === 'active' ? 'accent' : 'neutral'}>
                  {rule.status === 'active' ? 'Activo' : 'Pausado'}
                </Badge>
              </div>

              <p className="mt-3 text-xl font-bold">{formatCurrency(rule.amount, rule.currency, preferences.language)}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => markAsPaid(rule)} disabled={rule.status !== 'active'}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marcar pagado
                </Button>
                <Button size="sm" variant="secondary" onClick={() => skipOccurrence(rule)} disabled={rule.status !== 'active'}>
                  <SkipForward className="w-3.5 h-3.5" /> Omitir ciclo
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateData((prev) => ({
                      ...prev,
                      recurringRules: prev.recurringRules.map((r) =>
                        r.id === rule.id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r
                      ),
                    }))
                  }
                >
                  <PauseCircle className="w-3.5 h-3.5" /> {rule.status === 'active' ? 'Pausar' : 'Reanudar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={openAdd} title="Registrar pago recurrente" onClose={() => setOpenAdd(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Marca / Servicio" value={brandKey} onChange={(e) => setBrandKey(e.target.value)}>
            {BRAND_CATALOG.map((b) => (
              <option key={b.key} value={b.key}>{b.label}</option>
            ))}
          </Select>
          <Input label="Nombre personalizado" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required placeholder="Ej. Netflix Familiar" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input label="Próxima fecha" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} required />
          </div>
          <Select label="Frecuencia" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
            <option value="semiannual">Semestral</option>
            <option value="annual">Anual</option>
          </Select>
          <Select label="Cuenta de cargo" value={accountId || data.accounts[0]?.id || ''} onChange={(e) => setAccountId(e.target.value)}>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
          <Button type="submit" className="w-full">Guardar suscripción</Button>
        </form>
      </Modal>
    </div>
  );
};
