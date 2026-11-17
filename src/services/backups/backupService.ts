import {
  DEFAULT_PBKDF2_ITERATIONS,
  decryptString,
  deriveAesKey,
  encryptString,
  generateIvBase64,
  generateSaltBase64,
} from '@/services/encryption/cryptoEngine';
import type { FinancialVaultPayload } from '@/types/domain';

export interface EncryptedBackupEnvelope {
  format: 'MONEYBANK_ENCRYPTED_BACKUP';
  schemaVersion: 1 | 2;
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

function authenticatedMetadata(envelope: EncryptedBackupEnvelope): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({
    format: envelope.format,
    schemaVersion: envelope.schemaVersion,
    exportedAt: envelope.exportedAt,
    kdf: envelope.kdf,
    cipher: {
      algorithm: envelope.cipher.algorithm,
      ivBase64: envelope.cipher.ivBase64,
    },
  }));
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
  const envelope: EncryptedBackupEnvelope = {
    format: 'MONEYBANK_ENCRYPTED_BACKUP',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    kdf: { algorithm: 'PBKDF2-SHA256', iterations: DEFAULT_PBKDF2_ITERATIONS, saltBase64 },
    cipher: { algorithm: 'AES-GCM-256', ivBase64: generateIvBase64(), cipherBase64: '' },
    checksumSha256: '',
  };
  const { cipherBase64 } = await encryptString(
    serialized,
    key,
    authenticatedMetadata(envelope),
    envelope.cipher.ivBase64
  );
  envelope.cipher.cipherBase64 = cipherBase64;
  envelope.checksumSha256 = await sha256Hex(
    `${saltBase64}:${envelope.cipher.ivBase64}:${cipherBase64}`
  );

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
    !parsed || typeof parsed !== 'object' ||
    parsed.format !== 'MONEYBANK_ENCRYPTED_BACKUP' ||
    ![1, 2].includes(parsed.schemaVersion) ||
    typeof parsed.exportedAt !== 'string' ||
    parsed.kdf?.algorithm !== 'PBKDF2-SHA256' ||
    !Number.isSafeInteger(parsed.kdf.iterations) || parsed.kdf.iterations < 1 || parsed.kdf.iterations > 2_000_000 ||
    typeof parsed.kdf?.saltBase64 !== 'string' ||
    parsed.cipher?.algorithm !== 'AES-GCM-256' ||
    typeof parsed.cipher?.ivBase64 !== 'string' ||
    typeof parsed.cipher?.cipherBase64 !== 'string' ||
    typeof parsed.checksumSha256 !== 'string'
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
    parsed.kdf.iterations
  );

  let plaintext: string;
  try {
    plaintext = await decryptString(
      parsed.cipher.cipherBase64,
      parsed.cipher.ivBase64,
      key,
      parsed.schemaVersion === 2 ? authenticatedMetadata(parsed) : undefined
    );
  } catch {
    throw new Error('Contraseña de respaldo incorrecta o datos cifrados dañados.');
  }

  const payload = JSON.parse(plaintext) as FinancialVaultPayload;
  if (!Array.isArray(payload.accounts) || !Array.isArray(payload.transactions)) {
    throw new Error('Estructura interna del respaldo inválida.');
  }

  return payload;
}
