# 🛶 CanoArk

**CanoArk** es una billetera Bitcoin autocustodial construida como un **fork de [Arkade Wallet](https://github.com/arkade-os/wallet)** (MIT, © Ark Labs), con una capa nativa Android (APK) y localización completa ES/EN.

Navega el mundo de Ark desde el Caribe: la canoa para tus **VTXOs** — transacciones instantáneas off-chain con asentamiento por lotes en Bitcoin mainnet, sin entregar tus claves.

## Características propias de este fork

- **APK Android nativa** (Capacitor) con nombre, icono y splash **CanoArk**, construida de forma reproducible por GitHub Actions (`build-apk.yml`).
- **Localización completa EN/ES** de todas las pantallas, componentes y estados.
- **Emisión de activos y estables** (Arkade Assets): soporte para reservas en CUP y tokens respaldados, con `control asset` y reemisión/quema.
- **Notas (ArkNote)**: instrumentos al portador para pagos offline.
- **Sin analítica de terceros por defecto**: Plausible de Ark Labs retirado; Chatwoot y Sentry desactivados salvo configuración explícita.

## Arquitectura

- **Stack**: React + TypeScript + Vite, con el [SDK de Arkade](https://github.com/arkade-os) para hablar con cualquier instancia [arkd](https://github.com/arkade-os/arkd).
- **Off-chain**: VTXOs con pre-confirmación instantánea y asentamiento en batch (batch swaps).
- **On-chain**: salidas colaborativas/unilaterales y Bitcoin mainnet.
- **APK**: envoltura Capacitor que sirve el mismo `dist/` dentro de un WebView de Android (scanner ML Kit, notificaciones, haptics).

## Branding y APK

### Icono y splash

- `assets/icon.png` (1024×1024) y `assets/splash.png` (2732×2732) son las imágenes fuente aprobadas.
- `assets/android/` contiene las variantes por densidad (iconos `mipmap-*` y splashes port/land) que se commitean.
- `scripts/prepare-branding.mjs` las inyecta en el proyecto Android que genera `npx cap add android` (idempotente) y desactiva los iconos adaptativos para que el launcher respete el diseño aprobado.

### Identidad de la app

| Campo | Valor |
|---|---|
| `appId` (`capacitor.config.ts`) | `com.canoark.wallet` |
| `appName` (`capacitor.config.ts`) | `CanoArk` |
| Nombre PWA (`public/manifest.json`, `index.html`) | `CanoArk` |

> ⚠️ Cambia `appId` **antes** de distribuir: una vez instalado, modificar el `appId` crea una aplicación distinta.

### Construir el APK

El workflow `build-apk.yml` hace el build completo en CI. En local:

```bash
pnpm build
npx cap add android
npx cap sync android
node scripts/prepare-branding.mjs
node scripts/prepare-android.mjs
node scripts/prepare-service-worker.mjs
cd android && ./gradlew assembleDebug
```

### Operador por defecto

La app habla con el operador público `https://arkade.computer` (el mismo que usa Arkade). Para apuntar a tu propio operador, cambia `VITE_ARK_SERVER` en el build (o en el workflow):

```bash
VITE_ARK_SERVER=https://tu-operador.example pnpm build
```

## Environment Variables

| Variable                      | Description                                                         | Example Value                                                                        |
|-------------------------------|---------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| `VITE_ARK_SERVER`             | Override the default Arkade server URL                              | `VITE_ARK_SERVER=http://localhost:7070`                                              |
| `VITE_APP_VERSION`            | App version string shown in support diagnostics                     | `VITE_APP_VERSION=1.2.3`                                                             |
| `VITE_BOLTZ_URL`              | Override the default Boltz swap provider URL for Lightning          | `VITE_BOLTZ_URL=https://boltz-provider-url.com`                                      |
| `VITE_CHATWOOT_WEBSITE_TOKEN` | ChatWoot website token for customer support integration             | `VITE_CHATWOOT_WEBSITE_TOKEN=your-token`                                             |
| `VITE_CHATWOOT_BASE_URL`      | ChatWoot server base URL for customer support integration           | `VITE_CHATWOOT_BASE_URL=https://app.chatwoot.com`                                    |
| `VITE_DELEGATOR_URL`          | Delegator service URL for the wallet service worker                 | `VITE_DELEGATOR_URL=https://delegator.example.com`                                   |
| `VITE_LENDASAT_IFRAME_URL`    | Override the default LendaSat URL                                   | `VITE_LENDASAT_IFRAME_URL=http://localhost:5173`                                     |
| `VITE_SATORA_IFRAME_URL`      | Override the default Satora URL                                     | `VITE_SATORA_IFRAME_URL=http://localhost:5174`                                       |
| `VITE_MAX_PERCENTAGE`         | Override the max fee percentage (default 10)                        | `VITE_MAX_PERCENTAGE=5`                                                              |
| `VITE_NOSTR_RELAY_URL`        | Override the default Nostr relay URLs for backup                    | `VITE_NOSTR_RELAY_URL=wss://relay.example.com`                                       |
| `VITE_PSA_MESSAGE`            | Message to show on the wallet index page                            | `VITE_PSA_MESSAGE=@canoark on TG for support`                                        |
| `VITE_SENTRY_DSN`             | Enable Sentry error tracking (only in production, not on localhost) | `VITE_SENTRY_DSN=your-sentry-dsn`                                                    |
| `VITE_UTXO_MAX_AMOUNT`        | Override the server's utxoMaxAmount                                 | `VITE_UTXO_MAX_AMOUNT=-1`                                                            |
| `VITE_UTXO_MIN_AMOUNT`        | Override the server's utxoMinAmount                                 | `VITE_UTXO_MIN_AMOUNT=330`                                                           |
| `VITE_VERIFIED_ASSETS_URL`    | URL to fetch the verified assets list                               | `VITE_VERIFIED_ASSETS_URL=https://arklabshq.github.io/asset-registry/mutinynet.json` |
| `VITE_VTXO_MAX_AMOUNT`        | Override the server's vtxoMaxAmount                                 | `VITE_VTXO_MAX_AMOUNT=-1`                                                            |
| `VITE_VTXO_MIN_AMOUNT`        | Override the server's vtxoMinAmount                                 | `VITE_VTXO_MIN_AMOUNT=330`                                                           |
| `CI`                          | Set to `true` for Continuous Integration environments               | `CI=true`                                                                            |
| `GENERATE_SOURCEMAP`          | Disable source map generation during build                          | `GENERATE_SOURCEMAP=false`                                                           |

## Content Security Policy

La política se sirve por nginx (`nginx-security-headers.conf`) para Docker y por `public/_headers` para Cloudflare Pages. Ambas son estáticas:

- Si apuntas `VITE_CHATWOOT_BASE_URL` a un host distinto de `https://app.chatwoot.com`, añade ese origen a `script-src` en el archivo de tu despliegue.
- El bootstrap de tema inline en `index.html` está permitido por hash. `pnpm csp:check` (pre-commit y antes de `pnpm build`) lo verifica; `pnpm csp:fix` lo actualiza tras editar ese bloque.
- `public/_headers` permite `https://static.cloudflareinsights.com` porque Cloudflare Web Analytics inyecta su beacon en el HTML en el edge. Ojo con features de Cloudflare que inyectan script *inline* (Rocket Loader, Email Obfuscation), que el `script-src` por hash bloquea y `pnpm csp:check` no puede detectar.

## Getting Started

### Prerequisites

- Node.js v24.15.0 (ver `.nvmrc`)
- PNPM >=8

### Installation

```bash
pnpm install
```

## Development

### `pnpm run start`

Arranca la app en modo desarrollo en [http://localhost:3002](http://localhost:3002).

### `pnpm run build`

Construye la app de producción en `dist/`.

### `pnpm run regtest:start`

Levanta el entorno regtest y configura la instancia arkd (requiere Docker). Parada: `pnpm run regtest:stop`; limpieza: `pnpm run regtest:clean`.

### Financiar tu wallet local

1. Copia tu dirección desde la pantalla **Receive** (debe empezar con `bcrt1`).
2. Ejecuta el faucet (minera un bloque para confirmar el depósito):
```bash
node regtest/regtest.mjs faucet <bcrt-address> <btc> --confirm
```

## Testing

### Unit e integración (Vitest)

```bash
pnpm test
```

### E2E (Playwright)

Requiere el entorno regtest corriendo (`pnpm run regtest:start`) y `pnpm exec playwright install` la primera vez:

```bash
pnpm run test:e2e
```

En CI la suite corre como cuatro jobs paralelos (dos proyectos de browser × dos grupos definidos en `.github/workflows/playwright.yml`):
- `assets-send`: `asset.test.ts`, `send.test.ts`
- `core`: el resto de `src/test/e2e/`

> Un archivo de test nuevo **debe añadirse a uno de los grupos**, o nunca correrá en CI.

## Licencia

MIT. **Fork de [Arkade Wallet](https://github.com/arkade-os/wallet) © Ark Labs 2025.** Código original: [https://github.com/arkade-os/wallet](https://github.com/arkade-os/wallet). Este proyecto no es un producto oficial de Ark Labs.
