import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { setSecretStore, type SecretStorageAdapter } from '../lib/secretStore'

/**
 * Native secret storage: iOS Keychain / Android Keystore-backed.
 *
 * Backed by `@aparajita/capacitor-secure-storage`. We use its low-level
 * string methods (`getItem`/`setItem`/`removeItem`), which store/return the raw
 * blob with no JSON/date coercion and resolve `null` for a missing key —
 * matching {@link SecretStorageAdapter} exactly. The encryption scheme stays
 * in `mnemonic.ts`/`privateKey.ts`; only the substrate changes from
 * `localStorage`.
 */
const nativeSecretStorage: SecretStorageAdapter = {
  getItem: async (key) => SecureStorage.getItem(key),
  setItem: async (key, value) => {
    await SecureStorage.setItem(key, value)
  },
  removeItem: async (key) => {
    await SecureStorage.removeItem(key)
  },
}

if (Capacitor.isNativePlatform()) {
  setSecretStore(nativeSecretStorage)
}
