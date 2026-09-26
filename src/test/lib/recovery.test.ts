import { beforeEach, describe, expect, it } from 'vitest'
import {
  setMnemonic,
  getMnemonic,
  hasMnemonic,
  setMnemonicRecovery,
  getMnemonicRecovery,
  hasMnemonicRecovery,
  removeMnemonicRecovery,
} from '../../lib/mnemonic'
import {
  setPrivateKey,
  getPrivateKey,
  setPrivateKeyRecovery,
  hasPrivateKeyRecovery,
  getPrivateKeyRecovery,
} from '../../lib/privateKey'
import { recoverSecretWithPassword, canRecoverWithPassword } from '../../lib/recovery'
import { clearSecrets } from '../../lib/secretStore'
import { MNEMONIC_RECOVERY_STORAGE_KEY, NSEC_RECOVERY_STORAGE_KEY } from '../../lib/storageKeys'

const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const userPassword = 'my-own-password'
const devicePassword = 'device-random-secret'
const testPrivateKey = Uint8Array.from({ length: 32 }, (_, i) => i)

describe('password recovery vault', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('recovery blob round-trips the mnemonic', async () => {
    await setMnemonicRecovery(testMnemonic, userPassword)
    expect(await hasMnemonicRecovery()).toBe(true)
    expect(await getMnemonicRecovery(userPassword)).toBe(testMnemonic)
    await expect(getMnemonicRecovery('wrong')).rejects.toThrow()
    await removeMnemonicRecovery()
    expect(await hasMnemonicRecovery()).toBe(false)
  })

  it('recovers a mnemonic re-sealed under the device password', async () => {
    await setMnemonic(testMnemonic, userPassword)
    await setMnemonicRecovery(testMnemonic, userPassword)
    // Simulate biometric enrollment re-sealing the primary blob with the
    // device-random password.
    await setMnemonic(testMnemonic, devicePassword)

    const recovered = await recoverSecretWithPassword(userPassword)

    expect(recovered).toBe(true)
    expect(await hasMnemonicRecovery()).toBe(false)
    expect(await getMnemonic(userPassword)).toBe(testMnemonic)
    await expect(getMnemonic(devicePassword)).rejects.toThrow()
  })

  it('is a no-op when the password still opens the primary blob', async () => {
    await setMnemonic(testMnemonic, userPassword)
    await setMnemonicRecovery(testMnemonic, userPassword)

    expect(await recoverSecretWithPassword(userPassword)).toBe(false)
    expect(await hasMnemonicRecovery()).toBe(true)
  })

  it('throws Invalid password on wrong recovery password', async () => {
    await setMnemonic(testMnemonic, devicePassword)
    await setMnemonicRecovery(testMnemonic, userPassword)

    await expect(recoverSecretWithPassword('wrong')).rejects.toThrow('Invalid password')
    expect(await hasMnemonicRecovery()).toBe(true)
  })

  it('throws Invalid password when no recovery vault exists', async () => {
    await setMnemonic(testMnemonic, devicePassword)
    await expect(recoverSecretWithPassword(userPassword)).rejects.toThrow('Invalid password')
  })

  it('canRecoverWithPassword is non-destructive', async () => {
    await setMnemonic(testMnemonic, devicePassword)
    await setMnemonicRecovery(testMnemonic, userPassword)

    expect(await canRecoverWithPassword(userPassword)).toBe(true)
    expect(await canRecoverWithPassword('wrong')).toBe(false)
    expect(await hasMnemonicRecovery()).toBe(true)
    await expect(getMnemonic(devicePassword)).resolves.toBe(testMnemonic)
  })

  it('recovers an nsec-based wallet the same way', async () => {
    await setPrivateKey(testPrivateKey, userPassword)
    await setPrivateKeyRecovery(testPrivateKey, userPassword)
    await setPrivateKey(testPrivateKey, devicePassword)

    const recovered = await recoverSecretWithPassword(userPassword)

    expect(recovered).toBe(true)
    expect(await hasPrivateKeyRecovery()).toBe(false)
    expect(await getPrivateKey(userPassword)).toEqual(testPrivateKey)
    await expect(getPrivateKey(devicePassword)).rejects.toThrow()
  })

  it('nsec recovery round-trips independently', async () => {
    await setPrivateKeyRecovery(testPrivateKey, userPassword)
    expect(await hasPrivateKeyRecovery()).toBe(true)
    expect(await getPrivateKeyRecovery(userPassword)).toEqual(testPrivateKey)
    await expect(getPrivateKeyRecovery('wrong')).rejects.toThrow()
  })

  it('clearSecrets wipes recovery blobs', async () => {
    await setMnemonicRecovery(testMnemonic, userPassword)
    await setPrivateKeyRecovery(testPrivateKey, userPassword)
    expect(localStorage.getItem(MNEMONIC_RECOVERY_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(NSEC_RECOVERY_STORAGE_KEY)).not.toBeNull()

    await clearSecrets()

    expect(localStorage.getItem(MNEMONIC_RECOVERY_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(NSEC_RECOVERY_STORAGE_KEY)).toBeNull()
  })

  it('mnemonic recovery clears the opposite vault type', async () => {
    await setMnemonic(testMnemonic, userPassword)
    await setMnemonicRecovery(testMnemonic, userPassword)
    // Registers as an mnemonic wallet after switching sealers.
    await setMnemonic(testMnemonic, devicePassword)

    await recoverSecretWithPassword(userPassword)

    expect(await hasMnemonicRecovery()).toBe(false)
    expect(await hasPrivateKeyRecovery()).toBe(false)
    expect(await hasMnemonic()).toBe(true)
  })
})
