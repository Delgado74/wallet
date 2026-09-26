import { hasMnemonic, getMnemonic, hasMnemonicRecovery, getMnemonicRecovery } from './mnemonic'
import { getPrivateKey, hasPrivateKeyRecovery, getPrivateKeyRecovery } from './privateKey'

export type UnlockSecret = { kind: 'mnemonic'; value: string } | { kind: 'nsec'; value: Uint8Array }

/**
 * Opens the wallet secret with a typed password, main blob first, password
 * vault second.
 *
 * The primary blob is sealed with the user's password while biometric unlock
 * is not enrolled, and with a device-random password once it is. In the
 * enrolled case the vault — sealed with the user's OWN chosen password, see
 * `setMnemonicRecovery` / `setPrivateKeyRecovery` — is the genuine second key:
 * using the password to unlock NEVER revokes biometrics, and using biometrics
 * never revokes the password. Losing one key (e.g. the device secret) leaves
 * the other fully functional.
 *
 * Pure read, no mutation. Returns `null` when neither path opens the wallet.
 */
export const getSecretForUnlock = async (password: string): Promise<UnlockSecret | null> => {
  if (await hasMnemonic()) {
    try {
      return { kind: 'mnemonic', value: await getMnemonic(password) }
    } catch {
      // fall through to the vault
    }
    if (!(await hasMnemonicRecovery())) return null
    try {
      return { kind: 'mnemonic', value: await getMnemonicRecovery(password) }
    } catch {
      return null
    }
  }
  try {
    return { kind: 'nsec', value: await getPrivateKey(password) }
  } catch {
    // fall through to the vault
  }
  if (!(await hasPrivateKeyRecovery())) return null
  try {
    return { kind: 'nsec', value: await getPrivateKeyRecovery(password) }
  } catch {
    return null
  }
}
