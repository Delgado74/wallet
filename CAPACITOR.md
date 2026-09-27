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

### H — Security hardening (in progress on `feat/capacitor-android`)

Addresses the production concerns raised in the design review of phase C:

- **Password and biometric unlock are mutually exclusive.** Creation offers one
  or the other (`Init/Password.tsx`), and the wallet is sealed by exactly one
  key: the user's password, or a device-random secret when biometrics are
  chosen. Enrolling biometrics in settings re-seals the wallet with the device
  secret, and setting a password re-seals it back — the unlock screen therefore
  shows one path, never a combination (`NeedsPassword.tsx`).
- **Strong biometry only.** `allowDeviceCredential` is `false` and Android
  biometry is pinned to `strong`, so a shared PIN/pattern credential and
  spoofable weak biometry cannot gate a decrypting secret. Devices without
  strong biometry never offer the button and simply use the password.
- **The device secret does not survive loss, by design.** A biometric wallet has
  one key, so a lost device secret means restoring from the seed. This is the
  tradeoff this design accepts: the alternative (keeping a second copy sealed
  with the user's password) was implemented and then removed, because two
  independently rotatable keys and the re-sealing between them produced lockouts
  that cost users their funds, which is strictly worse than a documented
  single-key recovery path. Returning to a password from settings clears the
  stored device secret rather than leaving it orphaned in secure storage.
- **Known limitation (release work):** the unlock is authenticate-then-fetch.
  A first-party plugin binding the secret to the platform's biometric access
  control (`kSecAccessControlBiometryCurrentSet` / Android Keystore
  `setUserAuthenticationRequired`) is future release work. It is deliberately
  not adopted: such an entry is deleted when biometrics are re-enrolled, and
  re-enrolling a finger is a normal thing for a user to do.

### Design decision: why the seed blob is re-sealed, not stored beside the password

The alternative was reviewed against other self-custody wallet projects and
rejected. The common pattern there stores the seed in the platform keystore
_unencrypted_, gates it with a PIN, and treats biometrics as a disposable
marker whose read _is_ the OS prompt. It has a lockout property we lack —
losing the marker never loses the seed.

We keep the re-sealing design because the user's password is never written to
disk: a biometric wallet keeps the seed encrypted under a device-random secret,
and nothing else is stored. Two honest caveats, both already stated in
`src/runtime/security.ts`:

- On native, the encrypted blob and the unlock secret live in the _same_
  substrate (`SecureStorage`, i.e. Keystore-backed), because `secretStorage.ts`
  installs the secure-storage adapter for the blob as well. So per-wallet
  encryption is not a security boundary there — the real boundary is secure
  storage plus the prompt. `@aparajita/capacitor-secure-storage` encrypts with an
  AES-GCM key from the Android KeyStore and stores it in SharedPreferences
  _without_ biometric access control, so the unlock secret survives a user
  enrolling a new fingerprint; the prompt is enforced in JS, not by the store.
- The unlock is authenticate-then-fetch, not hardware-bound gating. Binding the
  secret to the platform's biometric access control
  (`kSecAccessControlBiometryCurrentSet` / Android Keystore
  `setUserAuthenticationRequired`) is deliberately _not_ done: such an entry is
  deleted when biometrics are re-enrolled, which for a seed means lost funds.

## Validation

Local connectivity constraints make CI the source of truth. The workflow is
manual only, so an artifact is built on demand:

```bash
gh workflow run build-apk.yml --ref feat/capacitor-android
```

It runs install, format/lint, type-check, unit + e2e tests (Playwright), and the
Android build producing the APK artifact. On-device smoke tests are run manually
against the artifact.

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

`feat/capacitor-android` is the single live line for the APK: phases A–H, on
Capacitor 8. The earlier names it grew from (`feature/capacitor-apk`,
`feat/capacitor-v8-secure`) are retired — the "v8" only existed to distinguish
it from the Capacitor 6 line, which is gone.

The web-side contributions (i18n, clipboard, fiat rates, platform-neutral
security seam) are opened as separate pull requests against upstream `master`,
from their own branches, which are left untouched by the work here.
