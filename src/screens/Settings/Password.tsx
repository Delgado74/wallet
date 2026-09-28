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
import { clearBiometricUnlock, isBiometricUnlockSupported, registerBiometricUnlock } from '../../lib/biometricUnlock'
import { getPrivateKey, isValidPassword, noUserDefinedPassword, setPrivateKey } from '../../lib/privateKey'
import { hasMnemonic, getMnemonic, setMnemonic } from '../../lib/mnemonic'
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
    isValidPassword(oldPassword).then((isValid) => {
      setError(isValid ? '' : t('unlock.invalidPassword'))
      setAuthenticated(isValid)
    })
  }, [oldPassword, t])

  const saveNewPassword = async (nextPassword: string | null, biometrics: boolean): Promise<boolean> => {
    if (!oldPassword || nextPassword === null || !authenticated) return false
    const finalPassword = nextPassword === '' ? defaultPassword : nextPassword
    try {
      setSaving(true)
      if (await hasMnemonic()) {
        const mnemonic = await getMnemonic(oldPassword)
        await setMnemonic(mnemonic, finalPassword)
      } else {
        const privateKey = await getPrivateKey(oldPassword)
        await setPrivateKey(privateKey, finalPassword)
      }
      setSuccessText(
        biometrics
          ? t('settings.passwordChangedToBiometrics')
          : finalPassword === defaultPassword
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

  const registerUserBiometrics = () => {
    registerBiometricUnlock()
      .then(({ password, passkeyId }) => {
        updateWallet({ ...wallet, lockedByBiometrics: true, passkeyId })
        saveNewPassword(password, true)
      })
      .catch(consoleLog)
  }

  const handleContinue = async () => {
    const ok = await saveNewPassword(newPassword, false)
    if (!ok) return
    // Password and biometric unlock are exclusive, so the device secret is now
    // dead key material: the blob was just re-sealed with the password. Drop it
    // instead of leaving a second copy of the wallet's encryption key in
    // secure storage, where nothing would ever use or clear it again.
    if (wallet.lockedByBiometrics) await clearBiometricUnlock()
    updateWallet({ ...wallet, lockedByBiometrics: false })
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
