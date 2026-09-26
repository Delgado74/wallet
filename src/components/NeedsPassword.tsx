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
  const [usePassword, setUsePassword] = useState(false)

  const handleBiometrics = () => authenticateBiometricUnlock(wallet.passkeyId).then(onPassword).catch(consoleError)
  const handleChange = (ev: any) => setPassword(ev.target.value)
  const handleClick = () => onPassword(password)
  // Biometric-locked wallets keep a password path: the recovery vault lets the
  // user's own password back in if the device secret is ever lost or replaced.
  // Both paths stay reachable within the screen — entering the password view
  // must not strand the user away from the biometric button.
  const biometricOnly = wallet.lockedByBiometrics && !usePassword
  const toggleLink =
    'w-full cursor-pointer text-center text-sm font-medium text-primary underline underline-offset-4 hover:opacity-80'

  return (
    <>
      <Content>
        <Padded>
          {biometricOnly ? (
            <>
              <CenterScreen onClick={handleBiometrics}>
                <LockIcon big />
                <Text centered>{t('unlock.unlockWithPasskey')}</Text>
              </CenterScreen>
              <button type='button' onClick={() => setUsePassword(true)} className={toggleLink}>
                {t('unlock.enterPassword')}
              </button>
            </>
          ) : (
            <FlexCol gap='1rem' testId='password'>
              <InputPassword
                focus
                label={t('unlock.insertPassword')}
                onChange={handleChange}
                onEnter={handleClick}
                placeholder={t('unlock.passwordPlaceholder')}
              />
              {wallet.lockedByBiometrics ? (
                <button type='button' onClick={() => setUsePassword(false)} className={toggleLink}>
                  {t('unlock.unlockWithPasskey')}
                </button>
              ) : null}
              <ErrorMessage text={error} error={Boolean(error)} />
            </FlexCol>
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={biometricOnly ? handleBiometrics : handleClick} label={t('unlock.unlockWallet')} />
      </ButtonsOnBottom>
    </>
  )
}
