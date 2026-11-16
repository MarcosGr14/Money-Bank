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
  });

  it('creates and restores versioned encrypted backups and detects tampering', async () => {
    const demo = createDemoDataset();
    const backupJson = await createEncryptedBackup(demo, 'RespaldoFuerte#99');
    const restored = await restoreEncryptedBackup(backupJson, 'RespaldoFuerte#99');
    expect(restored.debts[0]?.name).toBe('Préstamo Vehículo');

    const tampered = backupJson.replace('Préstamo', 'Alterado').replace('"a"', '"b"');
    await expect(restoreEncryptedBackup(tampered, 'RespaldoFuerte#99')).rejects.toThrow();
  });
});
