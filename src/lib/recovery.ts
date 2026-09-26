import {
  hasMnemonic,
  getMnemonic,
  setMnemonic,
  hasMnemonicRecovery,
  getMnemonicRecovery,
  removeMnemonicRecovery,
} from './mnemonic'
import {
  getPrivateKey,
  setPrivateKey,
  hasPrivateKeyRecovery,
  getPrivateKeyRecovery,
  removePrivateKeyRecovery,
} from './privateKey'

/**
 * Password recovery over the vault written when biometric unlock re-seals a
 * wallet (see `setMnemonicRecovery` / `setPrivateKeyRecovery`).
 *
 * The primary blob is encrypted with a device-random password, so losing the
 * native secret orphans the wallet even though the user still knows their own
 * password. The recovery copy changes that; recovering re-seals the primary
 * blob with the typed password and discards the vault, i.e. it deliberately
 * converts the wallet back to password-only unlock. The caller is responsible
 * for clearing the device biometric secret and wallet flags afterwards.
 *
 * Returns `false` when the password already decrypts the primary blob (a
 * no-op), `true` when it needed the recovery vault, and throws when neither
 * path opens the wallet.
 */
export const recoverSecretWithPassword = async (password: string): Promise<boolean> => {
  if (await hasMnemonic()) {
    try {
      await getMnemonic(password)
      return false
    } catch {
      if (!(await hasMnemonicRecovery())) throw new Error('Invalid password')
      try {
        const mnemonic = await getMnemonicRecovery(password)
        await setMnemonic(mnemonic, password)
        await removeMnemonicRecovery()
        await removePrivateKeyRecovery()
        return true
      } catch {
        throw new Error('Invalid password')
      }
    }
  }
  try {
    await getPrivateKey(password)
    return false
  } catch {
    if (!(await hasPrivateKeyRecovery())) throw new Error('Invalid password')
    try {
      const privateKey = await getPrivateKeyRecovery(password)
      await setPrivateKey(privateKey, password)
      await removePrivateKeyRecovery()
      await removeMnemonicRecovery()
      return true
    } catch {
      throw new Error('Invalid password')
    }
  }
}

/**
 * Non-destructive availability check: does this password open the recovery
 * vault? Used to authenticate a biometric-locked wallet on its change screen
 * without touching storage; the mutation belongs to
 * {@link recoverSecretWithPassword}.
 */
export const canRecoverWithPassword = async (password: string): Promise<boolean> => {
  if (await hasMnemonic()) {
    if (!(await hasMnemonicRecovery())) return false
    try {
      await getMnemonicRecovery(password)
      return true
    } catch {
      return false
    }
  }
  if (!(await hasPrivateKeyRecovery())) return false
  try {
    await getPrivateKeyRecovery(password)
    return true
  } catch {
    return false
  }
}
