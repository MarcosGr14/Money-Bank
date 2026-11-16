import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { addMoney, formatCurrency, generateId, maxMoney, subMoney, todayISO } from '@/utils/money';
import type { SavingsGoal } from '@/types/domain';
import { Badge, Button, Card, EmptyState, Input, Modal } from '@/components/ui/Primitives';

export const SavingsView: React.FC = () => {
  const { data, preferences, updateData } = useVaultStore();
  const [openAdd, setOpenAdd] = useState(false);
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [isWithdraw, setIsWithdraw] = useState(false);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0.00');
  const [earmarked, setEarmarked] = useState(true);

  if (!data) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || Number(targetAmount) <= 0) return;
    const goal: SavingsGoal = {
      id: generateId('goal'),
      name: name.trim(),
      icon: 'Shield',
      targetAmount: Number(targetAmount).toFixed(2),
      currentAmount: Number(currentAmount || 0).toFixed(2),
      associatedAccountId: data?.accounts[0]?.id,
      earmarkedInAccount: earmarked,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    await updateData((prev) => ({ ...prev, savingsGoals: [...prev.savingsGoals, goal] }));
    setName('');
    setTargetAmount('');
    setOpenAdd(false);
  }

  async function handleContribution(e: React.FormEvent) {
    e.preventDefault();
    if (!contribGoal || !data || Number(contribAmount) <= 0) return;
    const accId = contribGoal.associatedAccountId || data.accounts[0]?.id;
    const amt = Number(contribAmount).toFixed(2);
    const now = new Date().toISOString();

    await updateData((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map((g) =>
        g.id === contribGoal.id
          ? {
              ...g,
              currentAmount: isWithdraw
                ? maxMoney('0.00', subMoney(g.currentAmount, amt))
                : addMoney(g.currentAmount, amt),
            }
          : g
      ),
      transactions: accId
        ? [
            {
              id: generateId('tx'),
              description: `${isWithdraw ? 'Retiro meta' : 'Aporte meta'}: ${contribGoal.name}`,
              amount: amt,
              currency: preferences.currency,
              date: todayISO(),
              type: 'savings_contribution',
              accountId: accId,
              categoryId: 'cat_savings',
              savingsGoalId: contribGoal.id,
              tags: ['ahorro'],
              status: 'completed',
              auditTrail: [],
              createdAt: now,
              updatedAt: now,
            },
            ...prev.transactions,
          ]
        : prev.transactions,
    }));

    setContribGoal(null);
    setContribAmount('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Metas de Ahorro</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Los aportes de ahorro no se clasifican como gastos ni duplican el saldo de tus cuentas.
          </p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="w-4 h-4" /> Nueva meta
        </Button>
      </div>

      {data.savingsGoals.length === 0 ? (
        <EmptyState
          title="Sin metas de ahorro"
          description="Crea un fondo de emergencia o una meta específica para reservar dinero sin confundirlo con dinero disponible para gastar."
          action={<Button onClick={() => setOpenAdd(true)}>Crear meta</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.savingsGoals.map((g) => {
            const pct = Math.min(100, Math.round((Number(g.currentAmount) / Math.max(1, Number(g.targetAmount))) * 100));
            return (
              <Card key={g.id}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{g.name}</p>
                  <Badge tone="positive">{pct}%</Badge>
                </div>
                <p className="mt-2 text-xl font-bold">
                  {formatCurrency(g.currentAmount, preferences.currency, preferences.language)}{' '}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">
                    de {formatCurrency(g.targetAmount, preferences.currency, preferences.language)}
                  </span>
                </p>
                <div className="mt-3 h-2.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                  <div className="h-full bg-[var(--status-positive)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setContribGoal(g);
                      setIsWithdraw(false);
                    }}
                  >
                    Aportar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setContribGoal(g);
                      setIsWithdraw(true);
                    }}
                  >
                    Retirar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={openAdd} title="Crear meta de ahorro" onClose={() => setOpenAdd(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nombre de la meta" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Fondo de Emergencia" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto objetivo" type="number" step="0.01" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
            <Input label="Monto inicial acumulado" type="number" step="0.01" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input type="checkbox" checked={earmarked} onChange={(e) => setEarmarked(e.target.checked)} />
            Etiquetar como reservado dentro de mi cuenta líquida (descontar del disponible seguro)
          </label>
          <Button type="submit" className="w-full">Guardar meta</Button>
        </form>
      </Modal>

      <Modal open={Boolean(contribGoal)} title={`${isWithdraw ? 'Retirar de' : 'Aportar a'}: ${contribGoal?.name ?? ''}`} onClose={() => setContribGoal(null)}>
        <form onSubmit={handleContribution} className="space-y-4">
          <Input label="Monto" type="number" step="0.01" min="0.01" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} required />
          <Button type="submit" className="w-full">Confirmar</Button>
        </form>
      </Modal>
    </div>
  );
};
