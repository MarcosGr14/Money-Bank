import React, { useEffect, useState } from 'react';
import { useVaultStore } from '@/stores/vaultStore';
import { getStorageEstimate } from '@/database/moneybankDb';
import { restoreEncryptedBackup } from '@/services/backups/backupService';
import { Button, Card, Input, Select } from '@/components/ui/Primitives';

export const SettingsView: React.FC = () => {
  const { data, preferences, updatePreferences, updateData, replacePayload, changeMasterPassword } = useVaultStore();
  const [storageInfo, setStorageInfo] = useState({ usageBytes: 0, quotaBytes: 0 });

  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [restorePass, setRestorePass] = useState('');
  const [restoreRaw, setRestoreRaw] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reservedFunds, setReservedFunds] = useState(data?.customReservedFunds ?? '0.00');

  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
  }, []);

  if (!data) return null;

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await changeMasterPassword(curPass, newPass);
      setCurPass('');
      setNewPass('');
      setFeedback('Contraseña maestra actualizada y bóveda re-cifrada correctamente.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error al cambiar contraseña.');
    }
  }

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreRaw) return;
    setFeedback(null);
    try {
      const payload = await restoreEncryptedBackup(restoreRaw, restorePass);
      await replacePayload(payload);
      setRestorePass('');
      setRestoreRaw(null);
      setFeedback('Respaldo verificado y restaurado con éxito.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error al restaurar respaldo.');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Configuración, Seguridad y Bóveda</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Almacenamiento local usado: {(storageInfo.usageBytes / 1024).toFixed(1)} KB
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Preferencias generales">
          <div className="space-y-3">
            <Select
              label="Tema visual"
              value={preferences.theme}
              onChange={(e) => updatePreferences({ theme: e.target.value as 'light' | 'dark' | 'system' })}
            >
              <option value="light">Claro minimalista</option>
              <option value="dark">Oscuro</option>
              <option value="system">Automático del sistema</option>
            </Select>

            <Select
              label="Idioma"
              value={preferences.language}
              onChange={(e) => updatePreferences({ language: e.target.value as 'es' | 'en' })}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </Select>

            <Select
              label="Moneda predeterminada"
              value={preferences.currency}
              onChange={(e) => updatePreferences({ currency: e.target.value })}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="MXN">MXN ($)</option>
              <option value="COP">COP ($)</option>
            </Select>

            <Input
              label="Bloqueo automático por inactividad (minutos)"
              type="number"
              min="1"
              max="120"
              value={preferences.inactivityTimeoutMinutes}
              onChange={(e) => updatePreferences({ inactivityTimeoutMinutes: Math.max(1, Number(e.target.value)) })}
            />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Fondos reservados voluntarios (excluidos de disponible seguro)"
                  type="number"
                  step="0.01"
                  value={reservedFunds}
                  onChange={(e) => setReservedFunds(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                onClick={() => updateData((prev) => ({ ...prev, customReservedFunds: Number(reservedFunds || 0).toFixed(2) }))}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Seguridad y Contraseña Maestra">
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <Input label="Contraseña maestra actual" type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} required />
            <Input label="Nueva contraseña maestra (mín. 8 caracteres)" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required />
            <Button type="submit" size="sm">Re-cifrar bóveda con nueva contraseña</Button>
          </form>

          <hr className="my-4 border-[var(--border-subtle)]" />

          <form onSubmit={handleRestore} className="space-y-3">
            <p className="text-xs font-semibold">Restaurar desde respaldo cifrado (.mbk.json)</p>
            <input
              type="file"
              accept=".json,.mbk"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = () => setRestoreRaw(String(r.result ?? ''));
                r.readAsText(file);
              }}
              className="block w-full text-xs"
            />
            <Input label="Contraseña del archivo de respaldo" type="password" value={restorePass} onChange={(e) => setRestorePass(e.target.value)} required />
            <Button type="submit" size="sm" variant="secondary" disabled={!restoreRaw}>
              Verificar integridad y restaurar
            </Button>
          </form>
        </Card>
      </div>

      {feedback && <p className="text-xs font-semibold text-[var(--accent-primary)]">{feedback}</p>}
    </div>
  );
};
