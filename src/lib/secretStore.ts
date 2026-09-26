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

export const secretStore: SecretStorageAdapter = {
  getItem: async (key) => current.getItem(key),
  setItem: async (key, value) => current.setItem(key, value),
  removeItem: async (key) => current.removeItem(key),
}
