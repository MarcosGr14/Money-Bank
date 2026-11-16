const PBKDF2_ITERATIONS = 310_000;
const VERIFIER_PLAINTEXT = 'MONEYBANK_VAULT_VERIFIED_V1';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSaltBase64(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveAesKey(
  password: string,
  saltBase64: string,
  iterations = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(saltBase64),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(
  plaintext: string,
  key: CryptoKey
): Promise<{ ivBase64: string; cipherBase64: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return {
    ivBase64: toBase64(iv),
    cipherBase64: toBase64(new Uint8Array(cipherBuffer)),
  };
}

export async function decryptString(
  cipherBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivBase64) },
    key,
    fromBase64(cipherBase64)
  );
  return new TextDecoder().decode(decryptedBuffer);
}

export async function createVerifier(key: CryptoKey) {
  return encryptString(VERIFIER_PLAINTEXT, key);
}

export async function checkVerifier(
  cipherBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<boolean> {
  try {
    const result = await decryptString(cipherBase64, ivBase64, key);
    return result === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

export function evaluatePasswordStrength(password: string): {
  score: number;
  label: string;
  valid: boolean;
} {
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Excelente'];
  return {
    score,
    label: labels[Math.min(score, 4)] ?? 'Débil',
    valid: password.length >= 8,
  };
}

export const DEFAULT_PBKDF2_ITERATIONS = PBKDF2_ITERATIONS;
