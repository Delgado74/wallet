import { beforeEach, describe, expect, it } from 'vitest'
import { getMnemonic, hasMnemonic, setMnemonic } from '../../lib/mnemonic'
import { getPrivateKey, isValidPassword, setPrivateKey } from '../../lib/privateKey'
import { defaultPassword } from '../../lib/constants'
import {
  clearBiometricUnlock,
  authenticateBiometricUnlock,
  registerBiometricUnlock,
  setSecurityRuntime,
} from '../../lib/biometricUnlock'
import type { SecurityRuntimeAdapter } from '../../runtime/types'
import { secretStore } from '../../lib/secretStore'

/**
 * Password and biometric unlock are mutually exclusive: the wallet blob is
 * sealed by exactly one key, and choosing the other method re-seals it. These
 * tests pin that property, because the failure it guards against is a wallet
 * that no longer opens with either key.
 */
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const createFakeAdapter = () => {
  let secret: string | undefined
  const adapter = {
    isBiometricUnlockAvailable: async () => true,
    saveBiometricUnlockSecret: async (value: string) => {
      secret = value
    },
    getBiometricUnlockSecret: async () => secret,
    clearBiometricUnlockSecret: async () => {
      secret = undefined
    },
  } satisfies SecurityRuntimeAdapter
  return {
    adapter,
    read: () => secret,
  }
}

describe('exclusive password / biometric unlock', () => {
  beforeEach(async () => {
    setSecurityRuntime(createFakeAdapter().adapter)
    for (const key of ['mnemonic', 'nsec', 'nsec_recovery', 'mnemonic_recovery']) {
      await secretStore.removeItem(key)
    }
  })

  it('opens a password wallet with the password and nothing else', async () => {
    await setMnemonic(MNEMONIC, 'user-password')

    expect(await getMnemonic('user-password')).toBe(MNEMONIC)
    // A biometric wallet's device secret is simply not a key for this blob.
    await expect(getMnemonic('some-other-secret')).rejects.toThrow()
  })

  it('a wallet sealed by the device secret is not openable by any password', async () => {
    const { password: deviceSecret } = await registerBiometricUnlock()
    await setMnemonic(MNEMONIC, deviceSecret)

    expect(await getMnemonic(deviceSecret)).toBe(MNEMONIC)
    await expect(getMnemonic('user-password')).rejects.toThrow()
    await expect(getMnemonic(defaultPassword)).rejects.toThrow()
  })

  it('switching from biometrics to a password re-seals and revokes the device secret', async () => {
    const fake = createFakeAdapter()
    setSecurityRuntime(fake.adapter)
    const { password: deviceSecret } = await registerBiometricUnlock()
    await setMnemonic(MNEMONIC, deviceSecret)

    // Leaving biometric unlock, as Settings/Password.tsx does.
    await getMnemonic(deviceSecret).then((m) => setMnemonic(m, 'user-password'))
    await clearBiometricUnlock()

    expect(await getMnemonic('user-password')).toBe(MNEMONIC)
    await expect(authenticateBiometricUnlock('native-biometric')).rejects.toThrow(
      'No biometric unlock secret stored on this device',
    )
  })

  it('switching from a password to biometrics re-seals and revokes the password', async () => {
    const fake = createFakeAdapter()
    setSecurityRuntime(fake.adapter)
    await setMnemonic(MNEMONIC, 'user-password')

    const { password: deviceSecret } = await registerBiometricUnlock()
    await getMnemonic('user-password').then((m) => setMnemonic(m, deviceSecret))

    expect(await getMnemonic(deviceSecret)).toBe(MNEMONIC)
    await expect(getMnemonic('user-password')).rejects.toThrow()
    expect(fake.read()).toBe(deviceSecret)
  })

  it('a biometric wallet stores no second copy of the seed', async () => {
    const { password: deviceSecret } = await registerBiometricUnlock()
    await setMnemonic(MNEMONIC, deviceSecret)

    // Only the single sealed blob exists: no vault, so the seed is the only
    // recovery path and `NeedsPassword` must not offer a password field.
    expect(await secretStore.getItem('encrypted_mnemonic')).not.toBeNull()
    expect(await secretStore.getItem('encrypted_private_key')).toBeNull()
    expect(await isValidPassword(deviceSecret)).toBe(true)
  })

  it('the nsec path is equally exclusive', async () => {
    const privateKey = crypto.getRandomValues(new Uint8Array(32))
    await setPrivateKey(privateKey, 'user-password')

    expect(await getPrivateKey('user-password')).toEqual(privateKey)
    expect(await hasMnemonic()).toBe(false)
    await expect(getPrivateKey('some-other-secret')).rejects.toThrow()
  })
})
