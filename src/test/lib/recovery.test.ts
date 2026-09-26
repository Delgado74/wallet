import { beforeEach, describe, expect, it } from 'vitest'
import {
  setMnemonic,
  getMnemonic,
  setMnemonicRecovery,
  hasMnemonicRecovery,
  getMnemonicRecovery,
  removeMnemonicRecovery,
} from '../../lib/mnemonic'
import {
  setPrivateKey,
  getPrivateKey,
  setPrivateKeyRecovery,
  hasPrivateKeyRecovery,
  getPrivateKeyRecovery,
} from '../../lib/privateKey'
import { getSecretForUnlock } from '../../lib/recovery'
import { clearSecrets } from '../../lib/secretStore'
import { MNEMONIC_RECOVERY_STORAGE_KEY, NSEC_RECOVERY_STORAGE_KEY } from '../../lib/storageKeys'

const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const userPassword = 'my-own-password'
const devicePassword = 'device-random-secret'
const testPrivateKey = Uint8Array.from({ length: 32 }, (_, i) => i)

describe('password unlock coexisting with biometrics', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads from the main blob while it is sealed with the user password', async () => {
    await setMnemonic(testMnemonic, userPassword)
    await setMnemonicRecovery(testMnemonic, userPassword)

    await expect(getSecretForUnlock(userPassword)).resolves.toEqual({ kind: 'mnemonic', value: testMnemonic })
    // Coexistence: nothing is re-sealed, wiped, or revoked by the read.
    await expect(getMnemonic(userPassword)).resolves.toBe(testMnemonic)
    expect(await hasMnemonicRecovery()).toBe(true)
  })

  it('opens the vault (second key) when the main blob is device-sealed and leaves both keys live', async () => {
    await setMnemonic(testMnemonic, userPassword)
    await setMnemonicRecovery(testMnemonic, userPassword)
    await setMnemonic(testMnemonic, devicePassword)

    await expect(getSecretForUnlock(userPassword)).resolves.toEqual({ kind: 'mnemonic', value: testMnemonic })

    // Biometrics still work: the device secret is untouched.
    await expect(getMnemonic(devicePassword)).resolves.toBe(testMnemonic)
    // The password still works: the vault is intact.
    await expect(getMnemonicRecovery(userPassword)).resolves.toBe(testMnemonic)
    expect(await hasMnemonicRecovery()).toBe(true)
  })

  it('prefers the main blob over the vault for a matching password', async () => {
    await setMnemonic(testMnemonic, userPassword)
    await setMnemonicRecovery('other secret', userPassword)

    await expect(getSecretForUnlock(userPassword)).resolves.toEqual({ kind: 'mnemonic', value: testMnemonic })
  })

  it('falls back to the vault when the main blob rejects the password', async () => {
    await setMnemonic(testMnemonic, devicePassword)
    await setMnemonicRecovery(testMnemonic, userPassword)

    await expect(getSecretForUnlock(userPassword)).resolves.toEqual({ kind: 'mnemonic', value: testMnemonic })
    await expect(getSecretForUnlock('wrong')).resolves.toBeNull()
    expect(await hasMnemonicRecovery()).toBe(true)
  })

  it('returns null when there is no read path for the password', async () => {
    await setMnemonic(testMnemonic, devicePassword)
    await expect(getSecretForUnlock(userPassword)).resolves.toBeNull()
    await expect(getSecretForUnlock('wrong')).resolves.toBeNull()
  })

  it('opens an nsec wallet through the main blob and the vault', async () => {
    await setPrivateKey(testPrivateKey, userPassword)
    await setPrivateKeyRecovery(testPrivateKey, userPassword)
    await setPrivateKey(testPrivateKey, devicePassword)

    await expect(getSecretForUnlock(userPassword)).resolves.toEqual({ kind: 'nsec', value: testPrivateKey })
    await expect(getPrivateKey(devicePassword)).resolves.toEqual(testPrivateKey)
    expect(await hasPrivateKeyRecovery()).toBe(true)
  })

  it('returns null for an nsec wallet with no read path', async () => {
    await setPrivateKey(testPrivateKey, devicePassword)
    await expect(getSecretForUnlock(userPassword)).resolves.toBeNull()
  })

  it('enrollment leaves both the device secret and the user password working', async () => {
    // Enrolling biometrics reseals the primary blob with the device-random
    // secret and keeps a vault copy under the user's own password. Both keys
    // must open the wallet, in either order, repeatedly.
    await setMnemonic(testMnemonic, userPassword)
    await setMnemonicRecovery(testMnemonic, userPassword)
    await setMnemonic(testMnemonic, devicePassword)

    await expect(getSecretForUnlock(devicePassword)).resolves.toEqual({ kind: 'mnemonic', value: testMnemonic })
    await expect(getSecretForUnlock(userPassword)).resolves.toEqual({ kind: 'mnemonic', value: testMnemonic })
    await expect(getSecretForUnlock(devicePassword)).resolves.toEqual({ kind: 'mnemonic', value: testMnemonic })
    expect(await hasMnemonicRecovery()).toBe(true)
  })

  it('vault round-trips and removes independently', async () => {
    await setMnemonicRecovery(testMnemonic, userPassword)
    expect(await hasMnemonicRecovery()).toBe(true)
    expect(await getMnemonicRecovery(userPassword)).toBe(testMnemonic)
    await expect(getMnemonicRecovery('wrong')).rejects.toThrow()
    await removeMnemonicRecovery()
    expect(await hasMnemonicRecovery()).toBe(false)
  })

  it('nsec vault round-trips independently', async () => {
    await setPrivateKeyRecovery(testPrivateKey, userPassword)
    expect(await hasPrivateKeyRecovery()).toBe(true)
    expect(await getPrivateKeyRecovery(userPassword)).toEqual(testPrivateKey)
    await expect(getPrivateKeyRecovery('wrong')).rejects.toThrow()
  })

  it('clearSecrets wipes both vault blobs', async () => {
    await setMnemonicRecovery(testMnemonic, userPassword)
    await setPrivateKeyRecovery(testPrivateKey, userPassword)
    expect(localStorage.getItem(MNEMONIC_RECOVERY_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(NSEC_RECOVERY_STORAGE_KEY)).not.toBeNull()

    await clearSecrets()

    expect(localStorage.getItem(MNEMONIC_RECOVERY_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(NSEC_RECOVERY_STORAGE_KEY)).toBeNull()
  })
})
