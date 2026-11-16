import React, { useState } from 'react';
import { Lock, ShieldAlert, ShieldCheck, Upload } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { evaluatePasswordStrength } from '@/services/encryption/cryptoEngine';
import { restoreEncryptedBackup } from '@/services/backups/backupService';
import { Button, Input } from '@/components/ui/Primitives';

export const VaultGate: React.FC = () => {
  const { hasVault, createVault, unlockVault } = useVaultStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [withDemo, setWithDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState(false);
  const [backupFileContent, setBackupFileContent] = useState<string | null>(null);

  const strength = evaluatePasswordStrength(password);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!strength.valid) {
      setErr('La contraseña maestra debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setErr('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      if (restoreMode && backupFileContent) {
        const restored = await restoreEncryptedBackup(backupFileContent, password);
        await createVault(password, false);
        await useVaultStore.getState().replacePayload(restored);
      } else {
        await createVault(password, withDemo);
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Error al inicializar bóveda.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await unlockVault(password);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'No se pudo desbloquear la bóveda.');
    } finally {
      setBusy(false);
    }
  }

  function handleBackupFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBackupFileContent(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-canvas)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-white font-bold">
            MB
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">MONEYBANK</h1>
            <p className="text-xs text-[var(--text-secondary)]">Tu Dinero. Tu Control. · Cifrado Local-First</p>
          </div>
        </div>

        {!hasVault ? (
          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs text-[var(--text-secondary)] space-y-1.5">
              <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[var(--status-positive)]" />
                Crea tu bóveda financiera local
              </p>
              <p>
                Tus datos financieros se cifran en tu dispositivo con <strong>AES-GCM 256-bit</strong> y nunca salen hacia servidores externos.
              </p>
              <p className="text-[var(--status-warning)]">
                Importante: si olvidas tu contraseña maestra y no tienes un respaldo cifrado válido, la recuperación es imposible. El cifrado local no protege frente a un sistema operativo ya comprometido por malware.
              </p>
            </div>

            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRestoreMode(false)}
                className={`flex-1 rounded-lg py-2 font-medium border ${!restoreMode ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)]'}`}
              >
                Nueva Bóveda
              </button>
              <button
                type="button"
                onClick={() => setRestoreMode(true)}
                className={`flex-1 rounded-lg py-2 font-medium border ${restoreMode ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)]'}`}
              >
                Restaurar Respaldo
              </button>
            </div>

            {restoreMode && (
              <label className="block rounded-lg border border-dashed border-[var(--border-subtle)] p-3 text-xs cursor-pointer hover:bg-[var(--bg-canvas)]">
                <span className="flex items-center gap-2 font-medium">
                  <Upload className="w-4 h-4" />
                  {backupFileContent ? 'Archivo .json/.mbk cargado' : 'Seleccionar archivo de respaldo cifrado'}
                </span>
                <input type="file" accept=".json,.mbk" onChange={handleBackupFile} className="hidden" />
              </label>
            )}

            <Input
              label={restoreMode ? 'Contraseña del respaldo y nueva bóveda' : 'Contraseña maestra'}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres (recomendado 14+)"
              required
            />

            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Fortaleza: <strong>{strength.label}</strong></span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-1.5 w-7 rounded-full ${strength.score >= step ? 'bg-[var(--status-positive)]' : 'bg-[var(--border-subtle)]'}`}
                  />
                ))}
              </div>
            </div>

            <Input
              label="Confirmar contraseña maestra"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            {!restoreMode && (
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={withDemo}
                  onChange={(e) => setWithDemo(e.target.checked)}
                />
                Cargar conjunto de datos de demostración opcional (eliminable en Configuración)
              </label>
            )}

            {err && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--status-danger)]">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {err}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              <Lock className="w-4 h-4" />
              {busy ? 'Derivando clave criptográfica...' : restoreMode ? 'Restaurar e Iniciar' : 'Crear Bóveda Cifrada'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleUnlock} className="mt-6 space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              La bóveda está bloqueada. Ingresa tu contraseña maestra para descifrar tus registros en memoria local.
            </p>
            <Input
              label="Contraseña maestra"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
            {err && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--status-danger)]">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {err}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              <Lock className="w-4 h-4" />
              {busy ? 'Descifrando...' : 'Desbloquear MONEYBANK'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
