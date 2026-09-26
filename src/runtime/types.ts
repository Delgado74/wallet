export interface SecurityRuntimeAdapter {
  isBiometricUnlockAvailable(): Promise<boolean>
  saveBiometricUnlockSecret(secret: string): Promise<void>
  getBiometricUnlockSecret(): Promise<string | undefined>
  clearBiometricUnlockSecret(): Promise<void>
}
