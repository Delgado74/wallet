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
- **Strong biometry only.** `allowDeviceCredential` is now `false` and Android
  biometry is pinned to `strong`, so a PIN/pattern shared credential and
  spoofable weak biometry cannot gate a decrypting secret. Devices without
  strong biometry simply use the wallet password.
- **Known limitation (unchanged, release work):** the unlock is
  authenticate-then-fetch. A first-party plugin binding the secret to the
  platform's biometric access control (`kSecAccessControlBiometryCurrentSet` /
  Android Keystore `setUserAuthenticationRequired`) is future release work.

## Validation

Local connectivity constraints make CI the source of truth. Every push to the
`feat/capacitor-v8-*` branches runs the workflow: install, format/lint,
type-check, unit + e2e tests (Playwright), and the Android build producing the
APK artifact. On-device smoke tests are run manually against the artifact.

## Branch map

- `feature/capacitor-apk` — original v8 migration (phase A).
- `feat/capacitor-v8-secure` — phases A+B+C merged.
- `feat/capacitor-v8-hardening` — phase H (this branch).

The web-side contributions (i18n, clipboard, fiat rates, platform-neutral
security seam) are opened as separate pull requests against upstream `master`.
