import React, { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Save } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { runWhatIfProjection } from '@/services/finance-engine/financeEngine';
import { formatCurrency, generateId } from '@/utils/money';
import { Button, Card, Input } from '@/components/ui/Primitives';

export const SimulatorView: React.FC<{ period: string }> = ({ period }) => {
  const { data, preferences, updateData } = useVaultStore();

  const [scenarioName, setScenarioName] = useState('Escenario Préstamo / Compra');
  const [newPurchaseAmount, setNewPurchaseAmount] = useState('0');
  const [newLoanPrincipal, setNewLoanPrincipal] = useState('0');
  const [newLoanRate, setNewLoanRate] = useState('10');
  const [newLoanMonths, setNewLoanMonths] = useState(12);
  const [extraDebtPaymentMonthly, setExtraDebtPaymentMonthly] = useState('0');
  const [monthlyIncomeDelta, setMonthlyIncomeDelta] = useState('0');
  const [cancelledSubscriptionsMonthly, setCancelledSubscriptionsMonthly] = useState('0');
  const [monthlyExpenseDelta, setMonthlyExpenseDelta] = useState('0');
  const [extraSavingsMonthly, setExtraSavingsMonthly] = useState('0');
  const [unexpectedExpenseOneTime, setUnexpectedExpenseOneTime] = useState('0');

  if (!data) return null;

  const result = useMemo(
    () =>
      runWhatIfProjection(
        data,
        period,
        {
          newPurchaseAmount,
          newLoanPrincipal,
          newLoanRate,
          newLoanMonths,
          extraDebtPaymentMonthly,
          monthlyIncomeDelta,
          cancelledSubscriptionsMonthly,
          monthlyExpenseDelta,
          extraSavingsMonthly,
          unexpectedExpenseOneTime,
        },
        6
      ),
    [
      data,
      period,
      newPurchaseAmount,
      newLoanPrincipal,
      newLoanRate,
      newLoanMonths,
      extraDebtPaymentMonthly,
      monthlyIncomeDelta,
      cancelledSubscriptionsMonthly,
      monthlyExpenseDelta,
      extraSavingsMonthly,
      unexpectedExpenseOneTime,
    ]
  );

  async function handleSaveScenario() {
    await updateData((prev) => ({
      ...prev,
      scenarios: [
        ...prev.scenarios,
        {
          id: generateId('scn'),
          name: scenarioName || 'Escenario',
          createdAt: new Date().toISOString(),
          newPurchaseAmount,
          newLoanPrincipal,
          newLoanRate,
          newLoanMonths,
          extraDebtPaymentMonthly,
          monthlyIncomeDelta,
          cancelledSubscriptionsMonthly,
          monthlyExpenseDelta,
          extraSavingsMonthly,
          unexpectedExpenseOneTime,
        },
      ],
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Simulador Financiero (What-If)</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Opera sobre un estado aislado: nunca modifica tus cuentas ni transacciones reales.
          </p>
        </div>
        <Button onClick={handleSaveScenario}>
          <Save className="w-4 h-4" /> Guardar escenario local
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Variables de simulación" className="space-y-3">
          <Input label="Nombre del escenario" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
          <Input label="Compra puntual nueva" type="number" value={newPurchaseAmount} onChange={(e) => setNewPurchaseAmount(e.target.value)} />
          <Input label="Gasto imprevisto único" type="number" value={unexpectedExpenseOneTime} onChange={(e) => setUnexpectedExpenseOneTime(e.target.value)} />
          <Input label="Nuevo préstamo (capital)" type="number" value={newLoanPrincipal} onChange={(e) => setNewLoanPrincipal(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Tasa préstamo (%)" type="number" value={newLoanRate} onChange={(e) => setNewLoanRate(e.target.value)} />
            <Input label="Plazo (meses)" type="number" value={newLoanMonths} onChange={(e) => setNewLoanMonths(Number(e.target.value))} />
          </div>
          <Input label="Cambio ingreso mensual (+/-)" type="number" value={monthlyIncomeDelta} onChange={(e) => setMonthlyIncomeDelta(e.target.value)} />
          <Input label="Suscripciones canceladas / mes" type="number" value={cancelledSubscriptionsMonthly} onChange={(e) => setCancelledSubscriptionsMonthly(e.target.value)} />
          <Input label="Abono extra deuda / mes" type="number" value={extraDebtPaymentMonthly} onChange={(e) => setExtraDebtPaymentMonthly(e.target.value)} />
          <Input label="Ahorro extra / mes" type="number" value={extraSavingsMonthly} onChange={(e) => setExtraSavingsMonthly(e.target.value)} />
        </Card>

        <Card title="Proyección a 6 meses: Base vs Simulado" subtitle={`Impacto flujo mensual: ${formatCurrency(result.monthlyDelta, preferences.currency, preferences.language)}`} className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.rows}>
                <XAxis dataKey="monthLabel" fontSize={12} stroke="var(--text-secondary)" />
                <YAxis fontSize={12} stroke="var(--text-secondary)" />
                <Tooltip />
                <Line type="monotone" dataKey="baselineBalance" name="Línea base" stroke="#737D8F" strokeWidth={2} />
                <Line type="monotone" dataKey="simulatedBalance" name="Simulado" stroke="#3559D8" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
