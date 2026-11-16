import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { evaluateFinancialHealth, generateFinancialAlerts } from '@/services/finance-engine/financeEngine';
import { Badge, Button, Card } from '@/components/ui/Primitives';

export const FinancialHealthView: React.FC<{ period: string }> = ({ period }) => {
  const { data, updateData } = useVaultStore();
  if (!data) return null;

  const health = evaluateFinancialHealth(data, period);
  const alerts = generateFinancialAlerts(data, period);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Salud Financiera y Alertas Explicables</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Diagnóstico transparente basado en tus propios datos locales. No constituye un puntaje crediticio externo ni garantía financiera.
        </p>
      </div>

      <Card title={`Índice compuesto del período: ${health.totalScore} / 100`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {health.factors.map((f) => (
            <div key={f.id} className="rounded-lg border border-[var(--border-subtle)] p-3.5 space-y-1.5">
              <div className="flex justify-between text-sm font-semibold">
                <span>{f.label}</span>
                <span>{f.score} / {f.maxScore} pts</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{f.explanation}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title={`Alertas activas (${alerts.length})`}>
        {alerts.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)]">No hay alertas pendientes en este momento.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((al) => (
              <div key={al.id} className="rounded-lg border border-[var(--border-subtle)] p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={al.severity === 'high' || al.severity === 'critical' ? 'danger' : 'warning'}>
                      {al.severity.toUpperCase()}
                    </Badge>
                    <p className="font-semibold text-sm">{al.title}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateData((prev) => ({
                        ...prev,
                        dismissedAlerts: [...prev.dismissedAlerts, al.id],
                      }))
                    }
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Resolver
                  </Button>
                </div>
                <p className="text-xs">{al.explanation}</p>
                <p className="text-xs font-mono text-[var(--text-secondary)]">Cálculo: {al.calculation}</p>
                <p className="text-xs text-[var(--accent-primary)]">Sugerencia: {al.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
