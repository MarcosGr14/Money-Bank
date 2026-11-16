import React, { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { formatCurrency, generateId, todayISO } from '@/utils/money';
import type { Transaction, TransactionStatus, TransactionType } from '@/types/domain';
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from '@/components/ui/Primitives';

export const TransactionsView: React.FC<{
  forcedType?: 'income' | 'expense';
  quickModalOpen?: boolean;
  onCloseQuickModal?: () => void;
}> = ({ forcedType, quickModalOpen = false, onCloseQuickModal }) => {
  const { data, preferences, updateData } = useVaultStore();
  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(forcedType ?? 'all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [txType, setTxType] = useState<TransactionType>(forcedType ?? 'expense');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('cat_food');
  const [status, setStatus] = useState<TransactionStatus>('completed');
  const [tagsText, setTagsText] = useState('');

  if (!data) return null;

  const isModalOpen = openAdd || quickModalOpen;
  function closeModal() {
    setOpenAdd(false);
    onCloseQuickModal?.();
  }

  const effectiveTypeFilter = forcedType ?? typeFilter;

  const filtered = useMemo(() => {
    return data.transactions
      .filter((t) => (effectiveTypeFilter === 'all' ? true : t.type === effectiveTypeFilter))
      .filter((t) => (accountFilter === 'all' ? true : t.accountId === accountFilter || t.toAccountId === accountFilter))
      .filter((t) => t.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.transactions, effectiveTypeFilter, accountFilter, search]);

  // Duplicate detection hint
  const possibleDuplicate = useMemo(() => {
    if (!amount || !description) return false;
    return data.transactions.some(
      (t) =>
        t.date === date &&
        Number(t.amount) === Number(amount) &&
        t.description.trim().toLowerCase() === description.trim().toLowerCase()
    );
  }, [data.transactions, date, amount, description]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const chosenAccount = accountId || data?.accounts[0]?.id;
    if (!chosenAccount || !description.trim() || Number(amount) <= 0) return;

    const now = new Date().toISOString();
    const newTx: Transaction = {
      id: generateId('tx'),
      description: description.trim(),
      amount: Number(amount).toFixed(2),
      currency: preferences.currency,
      date,
      type: forcedType ?? txType,
      accountId: chosenAccount,
      toAccountId: (forcedType ?? txType) === 'transfer' ? toAccountId || data?.accounts[1]?.id : undefined,
      categoryId: (forcedType ?? txType) === 'transfer' ? 'cat_transfer' : categoryId,
      tags: tagsText.split(',').map((s) => s.trim()).filter(Boolean),
      status,
      auditTrail: [],
      createdAt: now,
      updatedAt: now,
    };

    await updateData((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));

    setDescription('');
    setAmount('');
    setTagsText('');
    closeModal();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            {forcedType === 'income' ? 'Ingresos' : forcedType === 'expense' ? 'Gastos' : 'Libro de Transacciones'}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Registro cifrado con precisión decimal exacta y detección de duplicados.
          </p>
        </div>
        <Button
          onClick={() => {
            setTxType(forcedType ?? 'expense');
            setAccountId(data.accounts[0]?.id ?? '');
            setOpenAdd(true);
          }}
        >
          <Plus className="w-4 h-4" /> Registrar movimiento
        </Button>
      </div>

      <Card>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar descripción..."
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pl-9 pr-3 py-2 text-sm"
            />
          </div>
          {!forcedType && (
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Todos los tipos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
              <option value="transfer">Transferencias internas</option>
              <option value="debt_payment">Pagos de deuda</option>
              <option value="savings_contribution">Aportes de ahorro</option>
              <option value="adjustment">Ajustes</option>
            </Select>
          )}
          <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="all">Todas las cuentas</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Sin movimientos en esta vista"
            description="Registra un movimiento o ajusta los filtros de búsqueda."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Descripción</th>
                  <th className="py-2">Cuenta</th>
                  <th className="py-2">Categoría</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2 text-right">Monto</th>
                  <th className="py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((tx) => {
                  const acc = data.accounts.find((a) => a.id === tx.accountId);
                  const cat = data.categories.find((c) => c.id === tx.categoryId);
                  const isPositive = tx.type === 'income';
                  return (
                    <tr key={tx.id} className="hover:bg-[var(--bg-canvas)]">
                      <td className="py-2.5 text-xs text-[var(--text-secondary)]">{tx.date}</td>
                      <td className="py-2.5 font-medium">{tx.description}</td>
                      <td className="py-2.5 text-xs">{acc?.name ?? '—'}</td>
                      <td className="py-2.5 text-xs">{cat?.name ?? '—'}</td>
                      <td className="py-2.5">
                        <Badge tone={tx.status === 'completed' ? 'positive' : 'warning'}>
                          {tx.status === 'completed' ? 'Completado' : 'Esperado'}
                        </Badge>
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${isPositive ? 'text-[var(--status-positive)]' : ''}`}>
                        {isPositive ? '+' : ''}{formatCurrency(tx.amount, tx.currency, preferences.language)}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            updateData((prev) => ({
                              ...prev,
                              transactions: prev.transactions.filter((item) => item.id !== tx.id),
                            }))
                          }
                          className="text-[var(--text-secondary)] hover:text-[var(--status-danger)]"
                          title="Eliminar transacción"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={isModalOpen} title="Registro rápido de movimiento" onClose={closeModal}>
        <form onSubmit={handleSave} className="space-y-4">
          {!forcedType && (
            <Select label="Tipo de operación" value={txType} onChange={(e) => setTxType(e.target.value as TransactionType)}>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
              <option value="transfer">Transferencia interna entre cuentas</option>
            </Select>
          )}
          <Input label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Ej. Supermercado, Salario, Café" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <Select label="Cuenta origen" value={accountId || data.accounts[0]?.id || ''} onChange={(e) => setAccountId(e.target.value)}>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>

          {(forcedType ?? txType) === 'transfer' ? (
            <Select label="Cuenta destino" value={toAccountId || data.accounts[1]?.id || ''} onChange={(e) => setToAccountId(e.target.value)}>
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          ) : (
            <Select label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          )}

          <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus)}>
            <option value="completed">Completado (ya recibido/pagado)</option>
            <option value="expected">Esperado / Programado (aún no cobrado)</option>
          </Select>

          <Input label="Etiquetas (separadas por coma)" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="trabajo, mensual" />

          {possibleDuplicate && (
            <p className="rounded-lg bg-amber-500/15 p-2.5 text-xs text-[var(--status-warning)]">
              Posible duplicado detectado: ya existe un movimiento con la misma fecha, descripción y monto.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={data.accounts.length === 0}>
            {data.accounts.length === 0 ? 'Crea primero una cuenta en Cuentas' : 'Guardar movimiento'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
