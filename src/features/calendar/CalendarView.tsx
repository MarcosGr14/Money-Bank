import React, { useMemo, useState } from 'react';
import { eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { useVaultStore } from '@/stores/vaultStore';
import { formatCurrency } from '@/utils/money';
import { Badge, Card } from '@/components/ui/Primitives';

export const CalendarView: React.FC<{ period: string }> = ({ period }) => {
  const { data, preferences } = useVaultStore();
  const [selectedDay, setSelectedDay] = useState<string>(`${period}-01`);

  if (!data) return null;

  const days = useMemo(() => {
    const start = startOfMonth(parseISO(`${period}-01`));
    return eachDayOfInterval({ start, end: endOfMonth(start) });
  }, [period]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Array<{ label: string; amount: string; kind: 'income' | 'expense' | 'recurring' }>>();
    for (const tx of data.transactions) {
      if (!tx.date.startsWith(period)) continue;
      const list = map.get(tx.date) ?? [];
      list.push({
        label: tx.description,
        amount: tx.amount,
        kind: tx.type === 'income' ? 'income' : 'expense',
      });
      map.set(tx.date, list);
    }
    for (const r of data.recurringRules) {
      if (r.status !== 'active' || !r.nextDueDate.startsWith(period)) continue;
      const list = map.get(r.nextDueDate) ?? [];
      list.push({ label: `Recurrente: ${r.serviceName}`, amount: r.amount, kind: 'recurring' });
      map.set(r.nextDueDate, list);
    }
    return map;
  }, [data, period]);

  const selectedEvents = eventsByDate.get(selectedDay) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Calendario Financiero ({period})</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Visualiza cobros, gastos registrados y vencimientos recurrentes del período.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const iso = format(d, 'yyyy-MM-dd');
              const evs = eventsByDate.get(iso) ?? [];
              const isSelected = iso === selectedDay;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDay(iso)}
                  className={`min-h-16 rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] hover:bg-[var(--bg-canvas)]'
                  }`}
                >
                  <span className="text-xs font-semibold">{format(d, 'd')}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {evs.map((e, i) => (
                      <span
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          e.kind === 'income'
                            ? 'bg-[var(--status-positive)]'
                            : e.kind === 'recurring'
                            ? 'bg-[var(--status-warning)]'
                            : 'bg-[var(--status-danger)]'
                        }`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title={`Eventos del ${selectedDay}`}>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">No hay movimientos programados o registrados en esta fecha.</p>
          ) : (
            <div className="space-y-2.5">
              {selectedEvents.map((ev, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] p-2.5 text-xs">
                  <div>
                    <p className="font-medium">{ev.label}</p>
                    <Badge tone={ev.kind === 'income' ? 'positive' : ev.kind === 'recurring' ? 'warning' : 'danger'}>
                      {ev.kind === 'income' ? 'Ingreso' : ev.kind === 'recurring' ? 'Programado' : 'Gasto'}
                    </Badge>
                  </div>
                  <span className="font-bold">{formatCurrency(ev.amount, preferences.currency, preferences.language)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
