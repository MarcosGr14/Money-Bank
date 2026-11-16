import React, { useState } from 'react';
import { Download, FileSpreadsheet, Printer, ShieldAlert } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { createEncryptedBackup } from '@/services/backups/backupService';
import { calculateMonthlyTotals, calculateNetWorthSummary } from '@/services/finance-engine/financeEngine';
import { formatCurrency } from '@/utils/money';
import { Button, Card, Input } from '@/components/ui/Primitives';

export const ReportsView: React.FC<{ period: string }> = ({ period }) => {
  const { data, preferences } = useVaultStore();
  const [backupPass, setBackupPass] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!data) return null;

  const nw = calculateNetWorthSummary(data);
  const monthly = calculateMonthlyTotals(data, period);

  function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const header = ['Fecha', 'Tipo', 'Descripción', 'Monto', 'Moneda', 'Estado'].join(',');
    const rows = data!.transactions.map((t) =>
      [t.date, t.type, `"${t.description.replaceAll('"', '""')}"`, t.amount, t.currency, t.status].join(',')
    );
    downloadBlob([header, ...rows].join('\n'), `moneybank-transacciones-${period}.csv`, 'text/csv;charset=utf-8;');
    setStatusMsg('Archivo CSV generado localmente.');
  }

  async function exportEncryptedBackup() {
    if (backupPass.length < 8) {
      setStatusMsg('Ingresa una contraseña de al menos 8 caracteres para cifrar el respaldo.');
      return;
    }
    const encryptedJson = await createEncryptedBackup(data!, backupPass);
    downloadBlob(encryptedJson, `moneybank-backup-${new Date().toISOString().slice(0, 10)}.mbk.json`, 'application/json');
    setBackupPass('');
    setStatusMsg('Respaldo cifrado AES-GCM descargado correctamente.');
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Reportes y Exportación Local</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Todos los archivos se generan directamente en tu navegador sin subir datos a ningún servidor.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-[var(--status-warning)] shrink-0 mt-0.5" />
        <span>
          <strong>Advertencia de privacidad:</strong> Los archivos <strong>CSV</strong> y <strong>PDF/Impresión</strong> contienen información financiera legible sin cifrar. Guárdalos en un lugar seguro o utiliza el <strong>Respaldo Cifrado (.mbk.json)</strong>.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Exportaciones legibles (CSV / PDF)">
          <div className="space-y-3 text-xs text-[var(--text-secondary)]">
            <p>Resumen {period}: Ingresos {formatCurrency(monthly.income, preferences.currency, preferences.language)} · Gastos {formatCurrency(monthly.expenses, preferences.currency, preferences.language)} · Patrimonio {formatCurrency(nw.netWorth, preferences.currency, preferences.language)}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={exportCsv}>
                <FileSpreadsheet className="w-4 h-4" /> Exportar CSV local
              </Button>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Respaldo Completo Cifrado (AES-GCM)">
          <div className="space-y-3">
            <Input
              label="Contraseña de cifrado del respaldo"
              type="password"
              value={backupPass}
              onChange={(e) => setBackupPass(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
            <Button size="sm" onClick={exportEncryptedBackup}>
              <Download className="w-4 h-4" /> Descargar respaldo cifrado
            </Button>
          </div>
        </Card>
      </div>

      {statusMsg && <p className="text-xs font-medium text-[var(--status-positive)]">{statusMsg}</p>}
    </div>
  );
};
