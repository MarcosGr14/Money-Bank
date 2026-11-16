import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { simulateDebtPayoff } from '@/services/finance-engine/financeEngine';
import { addMoney, formatCurrency, generateId, maxMoney, subMoney, todayISO } from '@/utils/money';
import type { Debt, DebtType } from '@/types/domain';
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from '@/components/ui/Primitives';

export const DebtsView: React.FC = () => {
  const { data, preferences, updateData } = useVaultStore();
  const [openAdd, setOpenAdd] = useState(false);
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [extraMonthly, setExtraMonthly] = useState('50.00');

  // Create form
  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('bank_loan');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('12.00');
  const [minPay, setMinPay] = useState('');

  // Payment breakdown form
  const [principalPaid, setPrincipalPaid] = useState('');
  const [interestPaid, setInterestPaid] = useState('0.00');
  const [feePaid, setFeePaid] = useState('0.00');

  if (!data) return null;

  const snowball = useMemo(() => simulateDebtPayoff(data.debts, 'snowball', extraMonthly), [data.debts, extraMonthly]);
  const avalanche = useMemo(() => simulateDebtPayoff(data.debts, 'avalanche', extraMonthly), [data.debts, extraMonthly]);

  async function handleCreateDebt(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || Number(principal) <= 0) return;
    const now = new Date().toISOString();
    const debt: Debt = {
      id: generateId('debt'),
      name: name.trim(),
      creditor: creditor.trim() || 'Acreedor',
      type: debtType,
      originalPrincipal: Number(principal).toFixed(2),
      outstandingPrincipal: Number(principal).toFixed(2),
      annualInterestRate: Number(rate || 0).toFixed(2),
      interestType: Number(rate) > 0 ? 'fixed' : 'zero',
      paymentFrequency: 'monthly',
      minimumPayment: Number(minPay || 0).toFixed(2),
      dueDayOfMonth: 15,
      startDate: todayISO(),
      associatedAccountId: data?.accounts[0]?.id,
      createdAt: now,
    };
    await updateData((prev) => ({ ...prev, debts: [...prev.debts, debt] }));
    setName('');
    setPrincipal('');
    setOpenAdd(false);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payDebt || !data) return;
    const accId = payDebt.associatedAccountId || data.accounts[0]?.id;
    if (!accId) return;

    const pPart = Number(principalPaid || 0).toFixed(2);
    const iPart = Number(interestPaid || 0).toFixed(2);
    const fPart = Number(feePaid || 0).toFixed(2);
    const totalOutflow = addMoney(addMoney(pPart, iPart), fPart);
    const now = new Date().toISOString();

    await updateData((prev) => ({
      ...prev,
      debts: prev.debts.map((d) =>
        d.id === payDebt.id
          ? { ...d, outstandingPrincipal: maxMoney('0.00', subMoney(d.outstandingPrincipal, pPart)) }
          : d
      ),
      transactions: [
        {
          id: generateId('tx'),
          description: `Pago deuda: ${payDebt.name}`,
          amount: totalOutflow,
          currency: preferences.currency,
          date: todayISO(),
          type: 'debt_payment',
          accountId: accId,
          categoryId: 'cat_debt',
          debtId: payDebt.id,
          principalPart: pPart,
          interestPart: iPart,
          feePart: fPart,
          tags: ['deuda'],
          status: 'completed',
          auditTrail: [],
          createdAt: now,
          updatedAt: now,
        },
        ...prev.transactions,
      ],
    }));

    setPayDebt(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Gestión de Deudas y Amortización</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Cada pago separa amortización de capital (reduce pasivo) de intereses y comisiones (gasto financiero).
          </p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="w-4 h-4" /> Registrar deuda
        </Button>
      </div>

      {data.debts.length === 0 ? (
        <EmptyState
          title="Sin deudas registradas"
          description="Registra préstamos personales, bancarios o financiamientos para simular estrategias Bola de Nieve y Avalancha."
          action={<Button onClick={() => setOpenAdd(true)}>Agregar deuda</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.debts.map((d) => (
              <Card key={d.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{d.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{d.creditor} · Tasa anual {d.annualInterestRate}%</p>
                  </div>
                  <Badge tone="danger">Cuota mín. {formatCurrency(d.minimumPayment, preferences.currency, preferences.language)}</Badge>
                </div>
                <p className="mt-3 text-2xl font-bold text-[var(--status-danger)]">
                  {formatCurrency(d.outstandingPrincipal, preferences.currency, preferences.language)}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Capital original: {formatCurrency(d.originalPrincipal, preferences.currency, preferences.language)}
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      setPayDebt(d);
                      setPrincipalPaid(d.minimumPayment);
                      setInterestPaid('0.00');
                      setFeePaid('0.00');
                    }}
                  >
                    Registrar pago desglosado
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card title="Comparador de Estrategias: Bola de Nieve vs Avalancha" subtitle="Supuesto: capitalización mensual estándar sobre saldos actuales.">
            <div className="mb-4 max-w-xs">
              <Input
                label="Abono extra mensual adicional"
                type="number"
                step="10"
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                <p className="font-semibold text-[var(--accent-primary)]">Estrategia Bola de Nieve (Menor saldo primero)</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Plazo estimado: <strong>{snowball.monthsToPayoff} meses</strong> ({snowball.estimatedPayoffDate})</p>
                <p className="text-xs text-[var(--text-secondary)]">Intereses totales estimados: <strong>{formatCurrency(snowball.totalInterestPaid, preferences.currency, preferences.language)}</strong></p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                <p className="font-semibold text-[var(--status-positive)]">Estrategia Avalancha (Mayor tasa primero)</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Plazo estimado: <strong>{avalanche.monthsToPayoff} meses</strong> ({avalanche.estimatedPayoffDate})</p>
                <p className="text-xs text-[var(--text-secondary)]">Intereses totales estimados: <strong>{formatCurrency(avalanche.totalInterestPaid, preferences.currency, preferences.language)}</strong></p>
              </div>
            </div>
          </Card>
        </>
      )}

      <Modal open={openAdd} title="Registrar obligación / deuda" onClose={() => setOpenAdd(false)}>
        <form onSubmit={handleCreateDebt} className="space-y-4">
          <Input label="Nombre de la deuda" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Préstamo Personal" />
          <Input label="Acreedor / Banco" value={creditor} onChange={(e) => setCreditor(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Saldo pendiente actual" type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} required />
            <Input label="Tasa interés anual (%)" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required />
          </div>
          <Input label="Pago mínimo mensual" type="number" step="0.01" value={minPay} onChange={(e) => setMinPay(e.target.value)} required />
          <Button type="submit" className="w-full">Guardar deuda</Button>
        </form>
      </Modal>

      <Modal open={Boolean(payDebt)} title={`Pago desglosado: ${payDebt?.name ?? ''}`} onClose={() => setPayDebt(null)}>
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input label="Abono a capital (reduce deuda)" type="number" step="0.01" value={principalPaid} onChange={(e) => setPrincipalPaid(e.target.value)} required />
          <Input label="Intereses pagados (gasto financiero)" type="number" step="0.01" value={interestPaid} onChange={(e) => setInterestPaid(e.target.value)} />
          <Input label="Comisiones / Seguros" type="number" step="0.01" value={feePaid} onChange={(e) => setFeePaid(e.target.value)} />
          <Button type="submit" className="w-full">Confirmar pago</Button>
        </form>
      </Modal>
    </div>
  );
};
