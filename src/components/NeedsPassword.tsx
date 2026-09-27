import { useContext, useEffect, useState } from 'react'
import Text from './Text'
import ErrorMessage from './Error'
import Button from './Button'
import Padded from './Padded'
import Content from './Content'
import FlexCol from './FlexCol'
import CenterScreen from './CenterScreen'
import { consoleError } from '../lib/logs'
import InputPassword from './InputPassword'
import ButtonsOnBottom from './ButtonsOnBottom'
import { WalletContext } from '../providers/wallet'
import { authenticateBiometricUnlock } from '../lib/biometricUnlock'
import LockIcon from '../icons/Lock'
import { useTranslation } from '../providers/language'
import { hasMnemonicRecovery } from '../lib/mnemonic'
import { hasPrivateKeyRecovery } from '../lib/privateKey'

interface NeedsPasswordProps {
  error: string
  onPassword: (password: string) => void | Promise<void>
}

export default function NeedsPassword({ error, onPassword }: NeedsPasswordProps) {
  const { wallet } = useContext(WalletContext)
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  // A biometric wallet offers the password as the second way in, but only when
  // a real password was actually stored: on a biometrics-only wallet the field
  // could never succeed, and the seed is the recovery path instead.
  const [passwordFallback, setPasswordFallback] = useState(false)

  useEffect(() => {
    if (!wallet.lockedByBiometrics) return
    let cancelled = false
    const probe = async () => {
      try {
        const exists = (await hasMnemonicRecovery()) || (await hasPrivateKeyRecovery())
        if (!cancelled) setPasswordFallback(exists)
      } catch {
        // storage unreadable: keep the biometric-only view
      }
    }
    probe()
    return () => {
      cancelled = true
    }
  }, [wallet.lockedByBiometrics])

  const handleBiometrics = () => authenticateBiometricUnlock(wallet.passkeyId).then(onPassword).catch(consoleError)
  const handleChange = (ev: any) => setPassword(ev.target.value)
  const handleClick = () => onPassword(password)
  // Password and biometric unlock are independent: using one never revokes the
  // other, so both stay reachable on the same screen when both were set up.
  const showPassword = !wallet.lockedByBiometrics || passwordFallback
  const passwordField = showPassword ? (
    <FlexCol gap='1rem' testId='password'>
      <InputPassword
        focus={!wallet.lockedByBiometrics}
        label={t('unlock.insertPassword')}
        onChange={handleChange}
        onEnter={handleClick}
        placeholder={t('unlock.passwordPlaceholder')}
      />
      <ErrorMessage text={error} error={Boolean(error)} />
    </FlexCol>
  ) : null

  return (
    <>
      <Content>
        <Padded>
          {wallet.lockedByBiometrics ? (
            <>
              <CenterScreen onClick={handleBiometrics}>
                <LockIcon big />
                <Text centered>{t('unlock.unlockWithPasskey')}</Text>
              </CenterScreen>
              {passwordField}
            </>
          ) : (
            passwordField
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {showPassword ? (
          <Button onClick={handleClick} label={t('unlock.unlockWallet')} />
        ) : (
          <Button onClick={handleBiometrics} label={t('unlock.unlockWallet')} />
        )}
      </ButtonsOnBottom>
    </>
  )
}
