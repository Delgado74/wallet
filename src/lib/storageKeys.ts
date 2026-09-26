export const MNEMONIC_STORAGE_KEY = 'encrypted_mnemonic'
export const NSEC_STORAGE_KEY = 'encrypted_private_key'
// A second, password-sealed copy kept when biometric unlock replaces the
// wallet password as the primary encryptor. Only ever written for wallets
// with a real user-chosen password (never `defaultPassword`).
export const MNEMONIC_RECOVERY_STORAGE_KEY = 'encrypted_mnemonic_password_recovery'
export const NSEC_RECOVERY_STORAGE_KEY = 'encrypted_private_key_password_recovery'
