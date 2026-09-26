import { useContext, useState } from 'react'
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

interface NeedsPasswordProps {
  error: string
  onPassword: (password: string) => void | Promise<void>
}

export default function NeedsPassword({ error, onPassword }: NeedsPasswordProps) {
  const { wallet } = useContext(WalletContext)
  const { t } = useTranslation()
  const [password, setPassword] = useState('')

  const handleBiometrics = () => authenticateBiometricUnlock(wallet.passkeyId).then(onPassword).catch(consoleError)
  const handleChange = (ev: any) => setPassword(ev.target.value)
  const handleClick = () => onPassword(password)
  // Biometric-locked wallets keep the password path visible and simultaneous:
  // the recovery vault (sealed with the user's own password) coexists with the
  // device secret, so using one unlock method never disables the other.
  const passwordField = (
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
  )

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
        <Button onClick={handleClick} label={t('unlock.unlockWallet')} />
      </ButtonsOnBottom>
    </>
  )
}
