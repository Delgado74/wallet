import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from './storageKeys'

export interface SecretStorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

const localStorageSecretStorage: SecretStorageAdapter = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => {
    localStorage.setItem(key, value)
  },
  removeItem: async (key) => {
    localStorage.removeItem(key)
  },
}

let current = localStorageSecretStorage

export const setSecretStore = (adapter: SecretStorageAdapter): void => {
  current = adapter
}

export const getSecretStore = (): SecretStorageAdapter => current

export const secretStore: SecretStorageAdapter = {
  getItem: async (key) => current.getItem(key),
  setItem: async (key, value) => current.setItem(key, value),
  removeItem: async (key) => current.removeItem(key),
}

/**
 * Removes every encrypted secret blob.
 *
 * `clearStorage()` wipes `localStorage`, which used to be the whole story. It
 * no longer is: on native the blobs live in the Keychain/Keystore, so a wallet
 * reset would otherwise leave the encrypted mnemonic behind on the device.
 */
export const clearSecrets = async (): Promise<void> => {
  await Promise.all([current.removeItem(MNEMONIC_STORAGE_KEY), current.removeItem(NSEC_STORAGE_KEY)])
}
