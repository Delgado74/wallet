# Capacitor line in this fork

This file documents the Capacitor/Android workstream of this fork. It doubles
as the source text for the upstream issue that introduces the line
(arkade-os/wallet#1029).

## Context

Some Arkade clients prefer a native app (APK) over the web app (WAP) running
in a browser. Both should run the same web codebase: an APK built with
Capacitor that stays in sync with `master` lets the project keep one frontend
and carry every web feature to the installed app.

The goal of this workstream is that line: **master as base, Capacitor as the
shell**, so the APK is continuously portable from the web code.

## Relationship to upstream

- **Base: `master`.** The APK line is derived from the web codebase and tracks
  it (web changes are carried into the native build via cherry-picks). It is
  deliberately _not_ a divergent port.
- **Reference: `capacitor-exploration`.** The work takes that branch as
  architectural reference (runtime adapters, secure storage seam, biometric
  unlock) but reimplements it on the current `master` codebase rather than
  against the older, separate lineage.

## Phases

### A — Capacitor v8 + official scanner (done)

- `@capacitor/*` v8 (from the deprecated v6 scanning fork).
- Switched to the first-party `@capacitor/barcode-scanner` (no ML Kit).
- App id `money.arkade.app`, Keyboard/SplashScreen wired, `minSdk 26`.
- CI workflow `Build Android APK` producing the `arkade-wallet-apk` artifact.

### B — Secure storage seam (done)

- `src/lib/secretStore.ts`: runtime-neutral `SecretStorageAdapter` seam.
- `src/runtime/secretStorage.ts`: native adapter on iOS Keychain / Android
  Keystore (auto-installs when running natively).
- `mnemonic.ts` / `privateKey.ts` refactored to async writes through the seam.
- Reset wipes the blobs in the Keychain too, not just `localStorage`.

### C — Biometric unlock (done)

- `src/lib/biometricUnlock.ts`: runtime-neutral layer; PWA uses WebAuthn, the
  native runtime uses a biometric prompt gating a read from secure storage.
- `src/runtime/security.ts`: native `SecurityRuntimeAdapter`.
- Enrolling replaces the wallet password with a device-random 21-byte password
  stored only in the Keychain/Keystore.
- Reset purges the biometric secret along with the other seeds.

### D — Runtime-architecture parity (not started)

`PwaAppShell`/`CapacitorAppShell`, `RuntimeContext`/capabilities, native vs
service-worker wallet & swap adapters, deep links, native notifications,
`dist-capacitor` build. This exists for merge-parity with
`capacitor-exploration`; upstream has stated Capacitor is not a near-term
priority, so it is parked.

### H — Security hardening (in progress on `feat/capacitor-v8-hardening`)

Addresses the production concerns raised in the design review of phase C:

- **Password recovery vault, coexisting with biometrics.** A biometric-locked
  wallet whose device secret is lost is otherwise irrecoverable without the
  seed phrase. A second copy of the mnemonic/nsec, sealed with the user's _own_
  password, is kept when biometrics are enrolled on a wallet that has a real
  password (never the default one). The password and the biometric unlock
  coexist: using either one never re-seals or revokes the other, and losing
  one key leaves the other fully functional. The unlock screen shows both
  paths simultaneously.
- **Enrollment requires a password first.** Biometrics are a second lock on
  top of the seed, never a replacement for the password. Enabling them now
  demands a user-chosen password (the vault sealer) in both flows — creation
  (`Init/Password.tsx`, the continue button stays disabled until a password is
  set) and settings (`Settings/Password.tsx`, which errors with
  `settings.biometricsPasswordRequired` for a wallet that has only the public
  default password). This mirrors what other wallet APKs do and closes the
  lockout hole where a wallet ended up reachable by a single key with no
  fallback.
- **Enrollment is additive at creation, not exclusive.** Wallet creation used
  to offer _either_ a password _or_ a passkey, and choosing the passkey left
  the wallet sealed by the device secret alone — the reported failure mode was
  "fingerprint fails, password cannot open it, only option is uninstall and
  re-enter the seed". The password form now stays on screen while biometrics
  are enabled, `initInfo.recoveryPassword` carries the chosen password to
  `Init/Connect.tsx`, and the vault is written at creation.
- **Strong biometry only.** `allowDeviceCredential` is now `false` and Android
  biometry is pinned to `strong`, so a PIN/pattern shared credential and
  spoofable weak biometry cannot gate a decrypting secret. Devices without
  strong biometry simply use the wallet password.
- **Two independent locks.** The seed/nsec custodies the funds; the password
  and biometrics are only the app's security layer, and neither revokes the
  other. A biometric wallet seals the primary blob with a device-random secret
  and, when a user-chosen password exists, keeps a vault copy under it, so a
  failed or lost fingerprint still leaves a way in. Where a wallet has no user
  password, biometrics are the only key and the seed is the recovery path — the
  app never presents a dead end, and never seals the vault with the device
  secret or the public default password.
- **Each lock is activated in its own place.** Wallet creation offers password
  or passkey on separate screens (`Init/Password.tsx`); neither is blocked by
  the other, and a password set before enrolling becomes the fallback. The
  unlock screen shows both paths when both exist, and the password alone
  otherwise (`NeedsPassword.tsx` probes the vault, since a password field that
  could never succeed is worse than none).
- **Known limitation (unchanged, release work):** the unlock is
  authenticate-then-fetch. A first-party plugin binding the secret to the
  platform's biometric access control (`kSecAccessControlBiometryCurrentSet` /
  Android Keystore `setUserAuthenticationRequired`) is future release work.

### Design decision: why the seed blob is re-sealed, not stored beside the password

An alternative was evaluated and rejected. QvaPay's pattern
(`~/AndroidStudioProjects/mobile_app_qvpay`: `lock/AppLockContext.tsx`,
`wallet/keystore.ts`, `helpers/biometricMarker.ts`) stores the seed in the
Keychain _unencrypted_, gates it with a PIN, and treats biometrics as a
disposable marker whose read _is_ the OS prompt. It has the lockout property we
lack — losing the marker never loses the seed.

We keep the re-sealing design because the user's password is never written to
disk: a biometric wallet keeps the seed encrypted under a device-random secret
and stores the password only as a second encrypted copy. Two honest caveats,
both already stated in `src/runtime/security.ts`:

- On native, the encrypted blob and the unlock secret live in the _same_
  substrate (`SecureStorage`, i.e. Keystore-backed), because `secretStorage.ts`
  installs the secure-storage adapter for the blob as well. So per-wallet
  encryption is not a security boundary there — the real boundary is secure
  storage plus the prompt, and the design is chosen for lockout behaviour
  rather than for an extra layer of at-rest protection.
- The unlock is authenticate-then-fetch, not hardware-bound gating. Binding the
  secret to the platform's biometric access control
  (`kSecAccessControlBiometryCurrentSet` / Android Keystore
  `setUserAuthenticationRequired`) is deliberately _not_ done: such an entry is
  deleted when biometrics are re-enrolled, which for a seed means lost funds.

## Validation

Local connectivity constraints make CI the source of truth. Every push to the
`feat/capacitor-v8-*` branches runs the workflow: install, format/lint,
type-check, unit + e2e tests (Playwright), and the Android build producing the
APK artifact. On-device smoke tests are run manually against the artifact.

### Why installs can run stale (signing + versioning)

Each CI run regenerates the native project, and a fresh runner also
regenerates the debug signing key. Two things were needed so a new build can
actually replace the one already installed on a device:

- **Fixed debug keystore.** `keystore/debug.keystore` (standard public
  `android`/`android` debug credentials) is committed and copied to
  `~/.android/debug.keystore` in CI, so every build shares the same signature.
- **Monotonic versionCode.** `scripts/prepare-android.mjs` bumps
  `versionCode`/`versionName` from the commit count (`git rev-list HEAD
--count`), which grows on the append-only branch history. Android refuses an
  install over an equal `versionCode`.

Builds produced before this landed were signed with throwaway runner keys, so
a device running one of those needs a **one-time uninstall** before the first
signed build can be installed; from then on, later artifacts update in place.

## Branch map

- `feature/capacitor-apk` — original v8 migration (phase A).
- `feat/capacitor-v8-secure` — phases A+B+C merged.
- `feat/capacitor-v8-hardening` — phase H (this branch).

The web-side contributions (i18n, clipboard, fiat rates, platform-neutral
security seam) are opened as separate pull requests against upstream `master`.
