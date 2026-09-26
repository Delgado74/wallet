import { describe, expect, it } from 'vitest'
import {
  authenticateBiometricUnlock,
  clearBiometricUnlock,
  isBiometricUnlockSupported,
  NATIVE_PASSKEY_ID,
  registerBiometricUnlock,
  setSecurityRuntime,
} from '../../lib/biometricUnlock'
import type { SecurityRuntimeAdapter } from '../../runtime/types'

const createFakeAdapter = () => {
  let secret: string | undefined
  let available = true
  const saved: string[] = []

  return {
    adapter: {
      isBiometricUnlockAvailable: async () => available,
      saveBiometricUnlockSecret: async (value: string) => {
        saved.push(value)
        secret = value
      },
      getBiometricUnlockSecret: async () => secret,
      clearBiometricUnlockSecret: async () => {
        secret = undefined
      },
    } satisfies SecurityRuntimeAdapter,
    setAvailable: (value: boolean) => {
      available = value
    },
    saved,
  }
}

describe('biometricUnlock runtime-neutral layer', () => {
  it('gates on WebAuthn availability when no runtime adapter is set', () => {
    expect(isBiometricUnlockSupported()).toBe('credentials' in navigator)
  })

  it('reads the probed native availability once a runtime adapter is set', async () => {
    const { adapter, setAvailable } = createFakeAdapter()
    setSecurityRuntime(adapter)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(isBiometricUnlockSupported()).toBe(true)

    setAvailable(false)
    setSecurityRuntime(adapter)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(isBiometricUnlockSupported()).toBe(false)
  })

  it('enrolls through the adapter and returns a random password with the native marker', async () => {
    const { adapter, saved } = createFakeAdapter()
    setSecurityRuntime(adapter)
    const { password, passkeyId } = await registerBiometricUnlock()

    expect(password).toMatch(/^[0-9a-f]{42}$/)
    expect(passkeyId).toBe(NATIVE_PASSKEY_ID)
    expect(saved[0]).toBe(password)
  })

  it('authenticates by returning the stored secret', async () => {
    const { adapter } = createFakeAdapter()
    setSecurityRuntime(adapter)
    await registerBiometricUnlock()

    const secret = await authenticateBiometricUnlock(NATIVE_PASSKEY_ID)
    expect(secret).toMatch(/^[0-9a-f]{42}$/)
  })

  it('throws when no secret is stored', async () => {
    const { adapter } = createFakeAdapter()
    setSecurityRuntime(adapter)
    await expect(authenticateBiometricUnlock(NATIVE_PASSKEY_ID)).rejects.toThrow(
      'No biometric unlock secret stored on this device',
    )
  })

  it('clears the stored secret without a prompt', async () => {
    const { adapter } = createFakeAdapter()
    setSecurityRuntime(adapter)
    await registerBiometricUnlock()
    await clearBiometricUnlock()

    await expect(authenticateBiometricUnlock(NATIVE_PASSKEY_ID)).rejects.toThrow()
  })
})
