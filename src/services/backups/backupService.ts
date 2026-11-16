import {
  DEFAULT_PBKDF2_ITERATIONS,
  decryptString,
  deriveAesKey,
  encryptString,
  generateSaltBase64,
} from '@/services/encryption/cryptoEngine';
import type { FinancialVaultPayload } from '@/types/domain';

export interface EncryptedBackupEnvelope {
  format: 'MONEYBANK_ENCRYPTED_BACKUP';
  schemaVersion: 1;
  exportedAt: string;
  kdf: {
    algorithm: 'PBKDF2-SHA256';
    iterations: number;
    saltBase64: string;
  };
  cipher: {
    algorithm: 'AES-GCM-256';
    ivBase64: string;
    cipherBase64: string;
  };
  checksumSha256: string;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createEncryptedBackup(
  payload: FinancialVaultPayload,
  backupPassword: string
): Promise<string> {
  const saltBase64 = generateSaltBase64();
  const key = await deriveAesKey(backupPassword, saltBase64, DEFAULT_PBKDF2_ITERATIONS);
  const serialized = JSON.stringify(payload);
  const { ivBase64, cipherBase64 } = await encryptString(serialized, key);
  const checksumSha256 = await sha256Hex(`${saltBase64}:${ivBase64}:${cipherBase64}`);

  const envelope: EncryptedBackupEnvelope = {
    format: 'MONEYBANK_ENCRYPTED_BACKUP',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    kdf: {
      algorithm: 'PBKDF2-SHA256',
      iterations: DEFAULT_PBKDF2_ITERATIONS,
      saltBase64,
    },
    cipher: {
      algorithm: 'AES-GCM-256',
      ivBase64,
      cipherBase64,
    },
    checksumSha256,
  };

  return JSON.stringify(envelope, null, 2);
}

export async function restoreEncryptedBackup(
  rawJson: string,
  backupPassword: string
): Promise<FinancialVaultPayload> {
  let parsed: EncryptedBackupEnvelope;
  try {
    parsed = JSON.parse(rawJson) as EncryptedBackupEnvelope;
  } catch {
    throw new Error('El archivo de respaldo no contiene JSON válido.');
  }

  if (
    parsed.format !== 'MONEYBANK_ENCRYPTED_BACKUP' ||
    parsed.schemaVersion !== 1 ||
    !parsed.kdf?.saltBase64 ||
    !parsed.cipher?.ivBase64 ||
    !parsed.cipher?.cipherBase64
  ) {
    throw new Error('Formato o versión de respaldo incompatible.');
  }

  const expectedChecksum = await sha256Hex(
    `${parsed.kdf.saltBase64}:${parsed.cipher.ivBase64}:${parsed.cipher.cipherBase64}`
  );
  if (expectedChecksum !== parsed.checksumSha256) {
    throw new Error('Verificación de integridad fallida: el archivo de respaldo está corrupto o fue alterado.');
  }

  const key = await deriveAesKey(
    backupPassword,
    parsed.kdf.saltBase64,
    parsed.kdf.iterations || DEFAULT_PBKDF2_ITERATIONS
  );

  let plaintext: string;
  try {
    plaintext = await decryptString(parsed.cipher.cipherBase64, parsed.cipher.ivBase64, key);
  } catch {
    throw new Error('Contraseña de respaldo incorrecta o datos cifrados dañados.');
  }

  const payload = JSON.parse(plaintext) as FinancialVaultPayload;
  if (!Array.isArray(payload.accounts) || !Array.isArray(payload.transactions)) {
    throw new Error('Estructura interna del respaldo inválida.');
  }

  return payload;
}
