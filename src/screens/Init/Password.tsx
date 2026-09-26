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

  // Biometrics are additive, not a replacement for the password: enrollment
  // seals the primary blob with a device-random secret, and the password the
  // user chose here seals the recovery vault, so both paths stay usable. The
  // password is therefore required — biometrics on their own would leave the
  // wallet reachable by exactly one key, with no fallback if it is lost.
  const continueWithBiometrics = async () => {
    if (!password) return
    setEnrolling(true)
    try {
      const { password: devicePassword, passkeyId } = await registerBiometricUnlock()
      updateWallet({ ...wallet, lockedByBiometrics: true, passkeyId })
      setInitInfo({ ...initInfo, password: devicePassword, recoveryPassword: password, restoring: false })
      navigate(Pages.InitConnect)
    } catch (err) {
      consoleLog(err)
      setEnrolling(false)
    }
  }

  const handleContinue = () => {
    if (biometrics) return continueWithBiometrics()
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
              </OnboardStaggerContainer>
            </CenterScreen>
          ) : null}
          <OnboardStaggerContainer>
            <OnboardStaggerChild>
              <NewPassword onNewPassword={setPassword} setLabel={setLabel} />
            </OnboardStaggerChild>
            {biometrics ? (
              <OnboardStaggerChild>
                <Text color={password ? 'neutral-500' : 'danger'} small wrap>
                  {t('init.biometricsPasswordRequired')}
                </Text>
              </OnboardStaggerChild>
            ) : null}
          </OnboardStaggerContainer>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button
          onClick={handleContinue}
          label={label}
          loading={enrolling}
          disabled={enrolling || (biometrics && !password)}
        />
        {biometrics ? (
          <Button onClick={() => setBiometrics(false)} label={t('init.usePassword')} secondary />
        ) : isBiometricUnlockSupported() ? (
          <Button onClick={() => setBiometrics(true)} label={t('init.useBiometrics')} secondary />
        ) : null}
      </ButtonsOnBottom>
    </>
  )
}
