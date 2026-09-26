import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { setSecretStore, type SecretStorageAdapter } from '../lib/secretStore'

const nativeSecureStorage: SecretStorageAdapter = {
  async getItem(key) {
    try {
      const value = await SecureStorage.get(key)
      if (value == null) return null
      return typeof value === 'string' ? value : JSON.stringify(value)
    } catch {
      return null
    }
  },
  async setItem(key, value) {
    await SecureStorage.set(key, value)
  },
  async removeItem(key) {
    await SecureStorage.remove(key)
  },
}

if (Capacitor.isNativePlatform()) {
  setSecretStore(nativeSecureStorage)
}
