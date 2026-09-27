import Header from './Header'
import ErrorMessage from '../../components/Error'
import { consoleLog } from '../../lib/logs'
import Button from '../../components/Button'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import Success from '../../components/Success'
import { defaultPassword } from '../../lib/constants'
import { WalletContext } from '../../providers/wallet'
import NewPassword from '../../components/NewPassword'
import { useContext, useEffect, useState } from 'react'
import NeedsPassword from '../../components/NeedsPassword'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { isBiometricUnlockSupported, registerBiometricUnlock, clearBiometricUnlock } from '../../lib/biometricUnlock'
import {
  isValidPassword,
  noUserDefinedPassword,
  setPrivateKey,
  setPrivateKeyRecovery,
  removePrivateKeyRecovery,
} from '../../lib/privateKey'
import { setMnemonic, setMnemonicRecovery, removeMnemonicRecovery } from '../../lib/mnemonic'
import { getSecretForUnlock } from '../../lib/recovery'
import { useTranslation } from '../../providers/language'

export default function Password() {
  const { updateWallet, wallet } = useContext(WalletContext)
  const { t } = useTranslation()

  const [authenticated, setAuthenticated] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [successText, setSuccessText] = useState('')
  const [error, setError] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    noUserDefinedPassword().then((noPassword) => {
      if (noPassword) setOldPassword(defaultPassword)
    })
  }, [])
  useEffect(() => {
    if (!oldPassword) return
    const checkPassword = async () => {
      let isValid = await isValidPassword(oldPassword)
      if (!isValid) {
        try {
          isValid = (await getSecretForUnlock(oldPassword)) !== null
        } catch {
          isValid = false
        }
      }
      setError(isValid ? '' : t('unlock.invalidPassword'))
      setAuthenticated(isValid)
    }
    checkPassword().catch(() => {
      setError(t('unlock.invalidPassword'))
      setAuthenticated(false)
    })
  }, [oldPassword])

  const saveNewPassword = async (nextPassword: string | null): Promise<boolean> => {
    if (!oldPassword || nextPassword === null || !authenticated) return false
    const finalPassword = nextPassword === '' ? defaultPassword : nextPassword
    const removingPassword = finalPassword === defaultPassword
    // Changing the password while biometrics stay enrolled must not touch the
    // device-sealed primary blob: reseal only the vault (the second key), so
    // both unlock methods keep working.
    const keepBiometricsEnrolled = wallet.lockedByBiometrics && !removingPassword
    try {
      setSaving(true)
      const secret = await getSecretForUnlock(oldPassword)
      if (!secret) throw new Error('Invalid password')
      if (keepBiometricsEnrolled) {
        if (secret.kind === 'mnemonic') await setMnemonicRecovery(secret.value, finalPassword)
        else await setPrivateKeyRecovery(secret.value, finalPassword)
      } else if (secret.kind === 'mnemonic') {
        await setMnemonic(secret.value, finalPassword)
      } else {
        await setPrivateKey(secret.value, finalPassword)
      }
      if (removingPassword) {
        // Removing the password entirely also drops biometric unlock and any
        // remaining recovery copies in the vault.
        await removeMnemonicRecovery()
        await removePrivateKeyRecovery()
        await clearBiometricUnlock()
      }
      setSuccessText(removingPassword ? t('settings.passwordRemoved') : t('settings.passwordChanged'))
      setError('')
      return true
    } catch {
      setError(t('settings.failedToUpdatePassword'))
      return false
    } finally {
      setSaving(false)
    }
  }

  /**
   * Enrolls biometric unlock as a second lock on top of the seed, never as a
   * replacement for the password: the primary blob is resealed with the
   * device-random secret, and a vault copy is sealed with a real user password
   * whenever one exists, so a failed or lost fingerprint still leaves a way in.
   *
   * A wallet with no user-defined password (the public default) has nothing
   * worth sealing the vault with, so biometrics end up as the only key and the
   * seed becomes the recovery path. The device secret and the public default
   * are never used as the vault sealer.
   */
  const registerUserBiometrics = async () => {
    const vaultPassword = oldPassword === defaultPassword ? newPassword : oldPassword
    try {
      setSaving(true)
      const { password: devicePassword, passkeyId } = await registerBiometricUnlock()
      const secret = await getSecretForUnlock(oldPassword)
      if (!secret) throw new Error('Invalid password')
      if (secret.kind === 'mnemonic') {
        await setMnemonic(secret.value, devicePassword)
        if (vaultPassword) await setMnemonicRecovery(secret.value, vaultPassword)
      } else {
        await setPrivateKey(secret.value, devicePassword)
        if (vaultPassword) await setPrivateKeyRecovery(secret.value, vaultPassword)
      }
      updateWallet({ ...wallet, lockedByBiometrics: true, passkeyId })
      setSuccessText(t('settings.passwordChangedToBiometrics'))
      setError('')
    } catch (err) {
      consoleLog(err)
      setError(t('settings.failedToUpdatePassword'))
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    const ok = await saveNewPassword(newPassword)
    if (!ok) return
    // Only when the wallet is password-only, or the password is being removed
    // entirely, are the biometric flags dropped. A password change while
    // biometrics are enrolled leaves them enabled and untouched.
    const removingPassword = newPassword === ''
    if (!wallet.lockedByBiometrics || removingPassword) {
      updateWallet({ ...wallet, lockedByBiometrics: false })
    }
  }

  if (!authenticated && !successText) return <NeedsPassword error={error} onPassword={setOldPassword} />

  return (
    <>
      <Header text={t('settings.changePassword')} back />
      <Content>
        {successText ? (
          <Success headline={t('settings.success')} text={successText} />
        ) : (
          <Padded>
            <ErrorMessage text={error} error={Boolean(error)} />
            <NewPassword onNewPassword={setNewPassword} setLabel={setLabel} />
          </Padded>
        )}
      </Content>
      {successText ? null : (
        <ButtonsOnBottom>
          <Button onClick={handleContinue} label={label} disabled={newPassword === null || saving} loading={saving} />
          {wallet.lockedByBiometrics || !isBiometricUnlockSupported() ? null : (
            <Button onClick={registerUserBiometrics} label={t('settings.useBiometrics')} secondary />
          )}
        </ButtonsOnBottom>
      )}
    </>
  )
}
