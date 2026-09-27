import { useContext, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import Padded from '../../components/Padded'
import NewPassword from '../../components/NewPassword'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import Header from '../../components/Header'
import { isBiometricUnlockSupported, registerBiometricUnlock } from '../../lib/biometricUnlock'
import { WalletContext } from '../../providers/wallet'
import CenterScreen from '../../components/CenterScreen'
import Text from '../../components/Text'
import { consoleLog } from '../../lib/logs'
import { defaultPassword } from '../../lib/constants'
import LockIcon from '../../icons/Lock'
import { OnboardStaggerContainer, OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { useTranslation } from '../../providers/language'

export default function InitPassword() {
  const { navigate } = useContext(NavigationContext)
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { updateWallet, wallet } = useContext(WalletContext)
  const { t } = useTranslation()

  const [label, setLabel] = useState('')
  const [biometrics, setBiometrics] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [password, setPassword] = useState<string | null>(null)

  // Password and biometrics are two independent locks, activated in their own
  // screen and never revoking each other. Enrollment seals the primary blob
  // with a device-random secret; a password already set here additionally seals
  // the vault, so it becomes the fallback if the fingerprint fails. Choosing
  // biometrics without one is allowed — the seed is then the only way back in.
  const continueWithBiometrics = async () => {
    setEnrolling(true)
    try {
      const { password: devicePassword, passkeyId } = await registerBiometricUnlock()
      updateWallet({ ...wallet, lockedByBiometrics: true, passkeyId })
      setInitInfo({
        ...initInfo,
        password: devicePassword,
        recoveryPassword: password ?? undefined,
        restoring: false,
      })
      navigate(Pages.InitConnect)
    } catch (err) {
      consoleLog(err)
      setEnrolling(false)
    }
  }

  const handleContinue = () => {
    setInitInfo({ ...initInfo, password: password ? password : defaultPassword, restoring: false })
    navigate(Pages.InitConnect)
  }

  return (
    <>
      <Header text={t('init.createNewWallet')} back />
      <Content>
        <Padded>
          {biometrics ? (
            <CenterScreen onClick={continueWithBiometrics}>
              <OnboardStaggerContainer centered>
                <OnboardStaggerChild>
                  <LockIcon big />
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <Text big centered heading>
                    {t('init.createPasskey')}
                  </Text>
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <Text centered color='neutral-500' small wrap>
                    {t('init.biometricsDescription')}
                  </Text>
                </OnboardStaggerChild>
                {!password ? (
                  <OnboardStaggerChild>
                    <Text centered color='neutral-500' small wrap>
                      {t('init.biometricsPasswordFallback')}
                    </Text>
                  </OnboardStaggerChild>
                ) : null}
              </OnboardStaggerContainer>
            </CenterScreen>
          ) : (
            <OnboardStaggerContainer>
              <OnboardStaggerChild>
                <NewPassword onNewPassword={setPassword} setLabel={setLabel} />
              </OnboardStaggerChild>
            </OnboardStaggerContainer>
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {biometrics ? (
          <Button onClick={continueWithBiometrics} label={t('init.createPasskey')} loading={enrolling} />
        ) : (
          <Button onClick={handleContinue} label={label} />
        )}
        {biometrics ? (
          <Button onClick={() => setBiometrics(false)} label={t('init.usePassword')} secondary />
        ) : isBiometricUnlockSupported() ? (
          <Button onClick={() => setBiometrics(true)} label={t('init.useBiometrics')} secondary />
        ) : null}
      </ButtonsOnBottom>
    </>
  )
}
