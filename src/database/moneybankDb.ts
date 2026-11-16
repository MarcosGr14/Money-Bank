import Dexie, { type Table } from 'dexie';
import type { EncryptedVaultRecord, UserPreferences, VaultMetadata } from '@/types/domain';

export interface StoredPreferencesRow {
  id: 'user_prefs';
  value: UserPreferences;
}

export class MoneybankDatabase extends Dexie {
  vault_metadata!: Table<VaultMetadata, 'primary_vault'>;
  encrypted_records!: Table<EncryptedVaultRecord, 'financial_state'>;
  preferences!: Table<StoredPreferencesRow, 'user_prefs'>;

  constructor(name = 'moneybank_local_vault_v1') {
    super(name);
    this.version(1).stores({
      vault_metadata: 'id',
      encrypted_records: 'id',
      preferences: 'id',
    });
  }
}

export const db = new MoneybankDatabase();

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

export async function getStorageEstimate(): Promise<{ usageBytes: number; quotaBytes: number }> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return { usageBytes: est.usage ?? 0, quotaBytes: est.quota ?? 0 };
    } catch {
      return { usageBytes: 0, quotaBytes: 0 };
    }
  }
  return { usageBytes: 0, quotaBytes: 0 };
}
