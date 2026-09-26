import { beforeEach, describe, expect, it } from 'vitest'
import { clearSecrets, setSecretStore, secretStore, type SecretStorageAdapter } from '../../lib/secretStore'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from '../../lib/storageKeys'

describe('secretStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setSecretStore({
      getItem: async (key) => localStorage.getItem(key),
      setItem: async (key, value) => {
        localStorage.setItem(key, value)
      },
      removeItem: async (key) => {
        localStorage.removeItem(key)
      },
    })
  })

  it('defaults to localStorage and round-trips encrypted blobs', async () => {
    await secretStore.setItem(MNEMONIC_STORAGE_KEY, 'ciphertext')
    expect(await secretStore.getItem(MNEMONIC_STORAGE_KEY)).toBe('ciphertext')
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBe('ciphertext')
  })

  it('clearSecrets removes both wallet secret blobs from the active adapter', async () => {
    const removed: string[] = []
    const adapter: SecretStorageAdapter = {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async (key) => {
        removed.push(key)
      },
    }
    setSecretStore(adapter)

    await clearSecrets()
    expect(removed).toEqual(expect.arrayContaining([MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY]))
  })

  it('clearSecrets clears the localStorage blobs on the default adapter', async () => {
    localStorage.setItem(MNEMONIC_STORAGE_KEY, 'a')
    localStorage.setItem(NSEC_STORAGE_KEY, 'b')
    await clearSecrets()
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(NSEC_STORAGE_KEY)).toBeNull()
  })
})
