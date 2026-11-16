import { create } from 'zustand';
import { db, requestPersistentStorage } from '@/database/moneybankDb';
import {
  DEFAULT_PBKDF2_ITERATIONS,
  checkVerifier,
  createVerifier,
  decryptString,
  deriveAesKey,
  encryptString,
  generateSaltBase64,
} from '@/services/encryption/cryptoEngine';
import {
  DEFAULT_PREFERENCES,
  createDemoDataset,
  createEmptyVaultPayload,
} from '@/services/repositories/defaultData';
import type { FinancialVaultPayload, UserPreferences } from '@/types/domain';

interface VaultStoreState {
  initialized: boolean;
  hasVault: boolean;
  isUnlocked: boolean;
  cryptoKey: CryptoKey | null;
  data: FinancialVaultPayload | null;
  preferences: UserPreferences;
  lastActivityAt: number;
  error: string | null;

  boot: () => Promise<void>;
  createVault: (masterPassword: string, withDemoData?: boolean) => Promise<void>;
  unlockVault: (masterPassword: string) => Promise<void>;
  lockVault: () => void;
  touchActivity: () => void;
  updateData: (updater: (prev: FinancialVaultPayload) => FinancialVaultPayload) => Promise<void>;
  replacePayload: (nextPayload: FinancialVaultPayload) => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  changeMasterPassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const useVaultStore = create<VaultStoreState>((set, get) => ({
  initialized: false,
  hasVault: false,
  isUnlocked: false,
  cryptoKey: null,
  data: null,
  preferences: DEFAULT_PREFERENCES,
  lastActivityAt: Date.now(),
  error: null,

  boot: async () => {
    const meta = await db.vault_metadata.get('primary_vault');
    const prefsRow = await db.preferences.get('user_prefs');
    const prefs = prefsRow?.value ?? DEFAULT_PREFERENCES;
    applyThemeToDocument(prefs.theme);
    set({
      initialized: true,
      hasVault: Boolean(meta),
      preferences: prefs,
    });
  },

  createVault: async (masterPassword: string, withDemoData = false) => {
    const saltBase64 = generateSaltBase64();
    const key = await deriveAesKey(masterPassword, saltBase64, DEFAULT_PBKDF2_ITERATIONS);
    const verifier = await createVerifier(key);
    const now = new Date().toISOString();

    const initialPayload = withDemoData ? createDemoDataset() : createEmptyVaultPayload();
    const encrypted = await encryptString(JSON.stringify(initialPayload), key);

    await db.vault_metadata.put({
      id: 'primary_vault',
      saltBase64,
      verifierIvBase64: verifier.ivBase64,
      verifierCipherBase64: verifier.cipherBase64,
      iterations: DEFAULT_PBKDF2_ITERATIONS,
      createdAt: now,
      updatedAt: now,
    });

    await db.encrypted_records.put({
      id: 'financial_state',
      ivBase64: encrypted.ivBase64,
      cipherBase64: encrypted.cipherBase64,
      updatedAt: now,
    });

    await requestPersistentStorage();

    set({
      hasVault: true,
      isUnlocked: true,
      cryptoKey: key,
      data: initialPayload,
      lastActivityAt: Date.now(),
      error: null,
    });
  },

  unlockVault: async (masterPassword: string) => {
    const meta = await db.vault_metadata.get('primary_vault');
    if (!meta) {
      throw new Error('No existe una bóveda inicializada en este navegador.');
    }

    const key = await deriveAesKey(masterPassword, meta.saltBase64, meta.iterations);
    const valid = await checkVerifier(meta.verifierCipherBase64, meta.verifierIvBase64, key);
    if (!valid) {
      throw new Error('Contraseña maestra incorrecta.');
    }

    const record = await db.encrypted_records.get('financial_state');
    let payload: FinancialVaultPayload;
    if (!record) {
      payload = createEmptyVaultPayload();
    } else {
      try {
        const json = await decryptString(record.cipherBase64, record.ivBase64, key);
        payload = JSON.parse(json) as FinancialVaultPayload;
      } catch {
        throw new Error('Los datos cifrados locales están dañados y no pudieron descifrarse.');
      }
    }

    set({
      isUnlocked: true,
      cryptoKey: key,
      data: payload,
      lastActivityAt: Date.now(),
      error: null,
    });
  },

  lockVault: () => {
    // Purge sensitive decrypted state and key reference from memory immediately
    set({
      isUnlocked: false,
      cryptoKey: null,
      data: null,
      error: null,
    });
  },

  touchActivity: () => {
    set({ lastActivityAt: Date.now() });
  },

  updateData: async (updater) => {
    const { cryptoKey, data } = get();
    if (!cryptoKey || !data) throw new Error('Bóveda bloqueada.');

    const updated: FinancialVaultPayload = {
      ...updater(data),
      updatedAt: new Date().toISOString(),
    };

    const encrypted = await encryptString(JSON.stringify(updated), cryptoKey);
    await db.encrypted_records.put({
      id: 'financial_state',
      ivBase64: encrypted.ivBase64,
      cipherBase64: encrypted.cipherBase64,
      updatedAt: updated.updatedAt,
    });

    set({ data: updated, lastActivityAt: Date.now() });
  },

  replacePayload: async (nextPayload) => {
    const { cryptoKey } = get();
    if (!cryptoKey) throw new Error('Bóveda bloqueada.');
    const normalized: FinancialVaultPayload = {
      ...nextPayload,
      updatedAt: new Date().toISOString(),
    };
    const encrypted = await encryptString(JSON.stringify(normalized), cryptoKey);
    await db.encrypted_records.put({
      id: 'financial_state',
      ivBase64: encrypted.ivBase64,
      cipherBase64: encrypted.cipherBase64,
      updatedAt: normalized.updatedAt,
    });
    set({ data: normalized, lastActivityAt: Date.now() });
  },

  updatePreferences: async (patch) => {
    const next = { ...get().preferences, ...patch };
    await db.preferences.put({ id: 'user_prefs', value: next });
    applyThemeToDocument(next.theme);
    set({ preferences: next });
  },

  changeMasterPassword: async (currentPassword, newPassword) => {
    const meta = await db.vault_metadata.get('primary_vault');
    const currentData = get().data;
    if (!meta || !currentData) throw new Error('Bóveda no disponible.');

    const oldKey = await deriveAesKey(currentPassword, meta.saltBase64, meta.iterations);
    const valid = await checkVerifier(meta.verifierCipherBase64, meta.verifierIvBase64, oldKey);
    if (!valid) throw new Error('La contraseña actual es incorrecta.');

    const newSalt = generateSaltBase64();
    const newKey = await deriveAesKey(newPassword, newSalt, DEFAULT_PBKDF2_ITERATIONS);
    const newVerifier = await createVerifier(newKey);
    const now = new Date().toISOString();
    const encrypted = await encryptString(JSON.stringify(currentData), newKey);

    await db.vault_metadata.put({
      ...meta,
      saltBase64: newSalt,
      verifierIvBase64: newVerifier.ivBase64,
      verifierCipherBase64: newVerifier.cipherBase64,
      iterations: DEFAULT_PBKDF2_ITERATIONS,
      updatedAt: now,
    });

    await db.encrypted_records.put({
      id: 'financial_state',
      ivBase64: encrypted.ivBase64,
      cipherBase64: encrypted.cipherBase64,
      updatedAt: now,
    });

    set({ cryptoKey: newKey, lastActivityAt: Date.now() });
  },
}));

export function applyThemeToDocument(theme: UserPreferences['theme']) {
  if (typeof document === 'undefined') return;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}
