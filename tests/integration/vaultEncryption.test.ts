import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PBKDF2_ITERATIONS,
  checkVerifier,
  createVerifier,
  decryptString,
  deriveAesKey,
  encryptString,
  generateSaltBase64,
} from '@/services/encryption/cryptoEngine';
import { createEncryptedBackup, restoreEncryptedBackup } from '@/services/backups/backupService';
import { createDemoDataset } from '@/services/repositories/defaultData';

describe('Web Crypto Vault & Encrypted Backup Integrity', () => {
  it('encrypts and decrypts financial payloads and rejects wrong passwords', async () => {
    const salt = generateSaltBase64();
    const key = await deriveAesKey('ClaveMaestraSegura#2026', salt, 10_000);
    const verifier = await createVerifier(key);

    expect(await checkVerifier(verifier.cipherBase64, verifier.ivBase64, key)).toBe(true);

    const wrongKey = await deriveAesKey('ClaveIncorrecta', salt, 10_000);
    expect(await checkVerifier(verifier.cipherBase64, verifier.ivBase64, wrongKey)).toBe(false);

    const demo = createDemoDataset();
    const encrypted = await encryptString(JSON.stringify(demo), key);
    expect(encrypted.cipherBase64).not.toContain('Banco General');

    const decrypted = JSON.parse(await decryptString(encrypted.cipherBase64, encrypted.ivBase64, key));
    expect(decrypted.accounts).toHaveLength(demo.accounts.length);
    const modifiedCipher = encrypted.cipherBase64.replace(/^./, encrypted.cipherBase64[0] === 'A' ? 'B' : 'A');
    await expect(decryptString(modifiedCipher, encrypted.ivBase64, key)).rejects.toThrow();
  });

  it('creates and restores versioned encrypted backups and detects tampering', async () => {
    const demo = createDemoDataset();
    const backupJson = await createEncryptedBackup(demo, 'RespaldoFuerte#99');
    const envelope = JSON.parse(backupJson) as {
      schemaVersion: number;
      exportedAt: string;
      kdf: { saltBase64: string };
      cipher: { ivBase64: string; cipherBase64: string };
    };
    expect(envelope.schemaVersion).toBe(2);
    const restored = await restoreEncryptedBackup(backupJson, 'RespaldoFuerte#99');
    expect(restored.debts[0]?.name).toBe('Préstamo Vehículo');

    const alter = (change: (value: typeof envelope) => void) => {
      const changed = structuredClone(envelope);
      change(changed);
      return JSON.stringify(changed);
    };

    await expect(restoreEncryptedBackup(alter((value) => {
      value.cipher.cipherBase64 = `${value.cipher.cipherBase64.slice(0, -1)}A`;
    }), 'RespaldoFuerte#99')).rejects.toThrow();
    await expect(restoreEncryptedBackup(alter((value) => {
      value.cipher.ivBase64 = value.cipher.ivBase64.replace(/^./, value.cipher.ivBase64[0] === 'A' ? 'B' : 'A');
    }), 'RespaldoFuerte#99')).rejects.toThrow();
    await expect(restoreEncryptedBackup(alter((value) => {
      value.kdf.saltBase64 = value.kdf.saltBase64.replace(/^./, value.kdf.saltBase64[0] === 'A' ? 'B' : 'A');
    }), 'RespaldoFuerte#99')).rejects.toThrow();
    await expect(restoreEncryptedBackup(alter((value) => {
      value.exportedAt = '2000-01-01T00:00:00.000Z';
    }), 'RespaldoFuerte#99')).rejects.toThrow();
    await expect(restoreEncryptedBackup(backupJson, 'ContraseñaIncorrecta')).rejects.toThrow();
    await expect(restoreEncryptedBackup('{"format":"MONEYBANK_ENCRYPTED_BACKUP"}', 'RespaldoFuerte#99'))
      .rejects.toThrow();
  });

  it('continues restoring valid version 1 backups', async () => {
    const demo = createDemoDataset();
    const saltBase64 = generateSaltBase64();
    const iterations = 10_000;
    const key = await deriveAesKey('LegacyBackup#2024', saltBase64, iterations);
    const encrypted = await encryptString(JSON.stringify(demo), key);
    const checksumInput = `${saltBase64}:${encrypted.ivBase64}:${encrypted.cipherBase64}`;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(checksumInput));
    const checksumSha256 = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const legacyBackup = JSON.stringify({
      format: 'MONEYBANK_ENCRYPTED_BACKUP',
      schemaVersion: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      kdf: { algorithm: 'PBKDF2-SHA256', iterations, saltBase64 },
      cipher: { algorithm: 'AES-GCM-256', ...encrypted },
      checksumSha256,
    });

    const restored = await restoreEncryptedBackup(legacyBackup, 'LegacyBackup#2024');
    expect(restored.debts[0]?.name).toBe('Préstamo Vehículo');
  });
});
