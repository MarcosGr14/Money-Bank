import React, { useState } from 'react';
import { Archive, Plus, RefreshCw } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { calculateAccountBalance } from '@/services/finance-engine/financeEngine';
import { formatCurrency, generateId, subMoney, todayISO } from '@/utils/money';
import type { Account, AccountType } from '@/types/domain';
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from '@/components/ui/Primitives';
import { AccountTypeIcon } from '@/components/ui/BrandIcon';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  checking: 'Cuenta Corriente',
  savings: 'Cuenta de Ahorro',
  credit_card: 'Tarjeta de Crédito (Pasivo)',
  digital_wallet: 'Billetera Digital',
  other: 'Otra Cuenta',
};

export const AccountsView: React.FC = () => {
  const { data, preferences, updateData } = useVaultStore();
  const [openCreate, setOpenCreate] = useState(false);
  const [reconcileAcc, setReconcileAcc] = useState<Account | null>(null);
  const [realBalance, setRealBalance] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [institution, setInstitution] = useState('');

  if (!data) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const acc: Account = {
      id: generateId('acc'),
      name: name.trim(),
      type,
      currency: preferences.currency,
      openingBalance: Number(openingBalance || 0).toFixed(2),
      institution: institution.trim() || undefined,
      icon: 'Landmark',
      color: type === 'credit_card' ? '#D94B4B' : '#3559D8',
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    await updateData((prev) => ({ ...prev, accounts: [...prev.accounts, acc] }));
    setName('');
    setOpeningBalance('0.00');
    setInstitution('');
    setOpenCreate(false);
  }

  async function handleReconcile(e: React.FormEvent) {
    e.preventDefault();
    if (!reconcileAcc || !data) return;
    const current = calculateAccountBalance(reconcileAcc, data.transactions);
    const diff = subMoney(realBalance || 0, current);
    if (Number(diff) !== 0) {
      const now = new Date().toISOString();
      await updateData((prev) => ({
        ...prev,
        transactions: [
          {
            id: generateId('tx'),
            description: `Ajuste de conciliación (${reconcileAcc.name})`,
            amount: diff,
            currency: reconcileAcc.currency,
            date: todayISO(),
            type: 'adjustment',
            accountId: reconcileAcc.id,
            categoryId: 'cat_transfer',
            tags: ['conciliación'],
            status: 'completed',
            auditTrail: [],
            createdAt: now,
            updatedAt: now,
          },
          ...prev.transactions,
        ],
      }));
    }
    setReconcileAcc(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Cuentas y Tarjetas</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Las tarjetas de crédito se contabilizan como pasivo; las transferencias internas no alteran ingresos ni gastos.
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4" /> Nueva cuenta
        </Button>
      </div>

      {data.accounts.length === 0 ? (
        <EmptyState
          title="Sin cuentas registradas"
          description="Agrega tu cuenta bancaria, efectivo, billetera digital o tarjeta de crédito para calcular tu liquidez real."
          action={<Button onClick={() => setOpenCreate(true)}>Crear primera cuenta</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.accounts.map((acc) => {
            const bal = calculateAccountBalance(acc, data.transactions);
            const isLiability = acc.type === 'credit_card';
            return (
              <Card key={acc.id} className={acc.archived ? 'opacity-60' : ''}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                      <AccountTypeIcon type={acc.type} />
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{acc.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{acc.institution || ACCOUNT_TYPE_LABELS[acc.type]}</p>
                    </div>
                  </div>
                  <Badge tone={isLiability ? 'danger' : 'positive'}>
                    {isLiability ? 'Pasivo' : 'Activo'}
                  </Badge>
                </div>

                <p className={`mt-4 text-2xl font-bold ${isLiability ? 'text-[var(--status-danger)]' : ''}`}>
                  {formatCurrency(bal, acc.currency, preferences.language)}
                </p>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReconcileAcc(acc);
                      setRealBalance(bal);
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Conciliar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateData((prev) => ({
                        ...prev,
                        accounts: prev.accounts.map((a) => (a.id === acc.id ? { ...a, archived: !a.archived } : a)),
                      }))
                    }
                  >
                    <Archive className="w-3.5 h-3.5" /> {acc.archived ? 'Restaurar' : 'Archivar'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={openCreate} title="Crear nueva cuenta" onClose={() => setOpenCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nombre de la cuenta" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Cuenta Ahorro Banco General" />
          <Select label="Tipo de cuenta" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Input
            label={type === 'credit_card' ? 'Saldo adeudado inicial' : 'Saldo inicial'}
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            required
          />
          <Input label="Institución (opcional)" value={institution} onChange={(e) => setInstitution(e.target.value)} />
          <Button type="submit" className="w-full">Guardar cuenta</Button>
        </form>
      </Modal>

      <Modal open={Boolean(reconcileAcc)} title="Conciliar saldo real" onClose={() => setReconcileAcc(null)}>
        <form onSubmit={handleReconcile} className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Si el saldo de tu extracto bancario difiere del saldo calculado, MONEYBANK registrará un ajuste auditable sin distorsionar tus categorías de ingresos o gastos.
          </p>
          <Input label="Saldo real actual" type="number" step="0.01" value={realBalance} onChange={(e) => setRealBalance(e.target.value)} required />
          <Button type="submit" className="w-full">Aplicar conciliación</Button>
        </form>
      </Modal>
    </div>
  );
};
