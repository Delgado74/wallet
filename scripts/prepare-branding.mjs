#!/usr/bin/env node
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = resolve(ROOT, 'assets/android')
const RES = resolve(ROOT, 'android/app/src/main/res')

const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']
const BRAND_COLOR = '#0B6B6F'

function fail(msg) {
  console.error(`[prepare-branding] ERROR: ${msg}`)
  process.exit(1)
}

function read(path, label) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    fail(`No se encontró ${label} en ${path}. ¿Se generó android/ con "npx cap add android"?`)
  }
}

if (!existsSync(RES)) {
  fail(`No se encontró la carpeta de recursos en ${RES}. ¿Se generó android/ con "npx cap add android"?`)
}

const anydpi = join(RES, 'mipmap-anydpi-v26')
if (existsSync(anydpi)) {
  rmSync(anydpi, { recursive: true })
  console.log('[prepare-branding] Iconos adaptativos desactivados (mipmap-anydpi-v26 eliminado)')
}

for (const den of DENSITIES) {
  const src = join(ASSETS, `mipmap-${den}`)
  const dst = join(RES, `mipmap-${den}`)
  copyFileSync(join(src, 'ic_launcher.png'), join(dst, 'ic_launcher.png'))
  copyFileSync(join(src, 'ic_launcher_round.png'), join(dst, 'ic_launcher_round.png'))
}
console.log('[prepare-branding] Iconos CanoArk copiados a mipmap-*')

copyFileSync(join(ASSETS, 'splash/generic.png'), join(RES, 'drawable/splash.png'))
for (const den of DENSITIES) {
  copyFileSync(join(ASSETS, `splash/port-${den}.png`), join(RES, `drawable-port-${den}/splash.png`))
  copyFileSync(join(ASSETS, `splash/land-${den}.png`), join(RES, `drawable-land-${den}/splash.png`))
}
console.log('[prepare-branding] Splash CanoArk copiado a drawable(-port/-land)-*/splash.png')

const colorPath = join(RES, 'values/ic_launcher_background.xml')
const colorXml = read(colorPath, 'values/ic_launcher_background.xml')
if (!colorXml.includes(BRAND_COLOR)) {
  writeFileSync(colorPath, colorXml.replace(/#[0-9A-Fa-f]{6,8}/, BRAND_COLOR))
  console.log(`[prepare-branding] ic_launcher_background -> ${BRAND_COLOR}`)
}

console.log('[prepare-branding] Branding CanoArk aplicado')
