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
  getPrivateKey,
  isValidPassword,
  noUserDefinedPassword,
  setPrivateKey,
  setPrivateKeyRecovery,
  removePrivateKeyRecovery,
} from '../../lib/privateKey'
import { hasMnemonic, getMnemonic, setMnemonic, setMnemonicRecovery, removeMnemonicRecovery } from '../../lib/mnemonic'
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

  const saveNewPassword = async (nextPassword: string | null, biometrics: boolean): Promise<boolean> => {
    if (!oldPassword || nextPassword === null || !authenticated) return false
    const finalPassword = nextPassword === '' ? defaultPassword : nextPassword
    const removingPassword = finalPassword === defaultPassword
    // Changing the password while biometrics stay enrolled must not touch the
    // device-sealed primary blob: reseal only the vault (the second key), so
    // both unlock methods keep working.
    const keepBiometricsEnrolled = !biometrics && wallet.lockedByBiometrics && !removingPassword
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
      if (!biometrics && removingPassword) {
        // Removing the password entirely also drops biometric unlock and any
        // remaining recovery copies in the vault.
        await removeMnemonicRecovery()
        await removePrivateKeyRecovery()
        await clearBiometricUnlock()
      }
      setSuccessText(
        biometrics
          ? t('settings.passwordChangedToBiometrics')
          : removingPassword
            ? t('settings.passwordRemoved')
            : t('settings.passwordChanged'),
      )
      setError('')
      return true
    } catch {
      setError(t('settings.failedToUpdatePassword'))
      return false
    } finally {
      setSaving(false)
    }
  }

  const registerUserBiometrics = async () => {
    try {
      const { password, passkeyId } = await registerBiometricUnlock()
      // Keep a recovery copy sealed with the user's own password before the
      // device-random password replaces it as the encryptor. Never for the
      // default password: it is public knowledge, so sealing a copy with it
      // would hand the wallet to anyone who can read storage.
      if (oldPassword !== defaultPassword) {
        if (await hasMnemonic()) {
          const mnemonic = await getMnemonic(oldPassword)
          await setMnemonicRecovery(mnemonic, oldPassword)
        } else {
          const privateKey = await getPrivateKey(oldPassword)
          await setPrivateKeyRecovery(privateKey, oldPassword)
        }
      }
      updateWallet({ ...wallet, lockedByBiometrics: true, passkeyId })
      await saveNewPassword(password, true)
    } catch (err) {
      consoleLog(err)
    }
  }

  const handleContinue = async () => {
    const ok = await saveNewPassword(newPassword, false)
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
