#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = resolve(ROOT, 'android/app/src/main/AndroidManifest.xml')
const GRADLE = resolve(ROOT, 'android/app/build.gradle')
const VARIABLES = resolve(ROOT, 'android/variables.gradle')

const PERMISSIONS = ['android.permission.CAMERA', 'android.permission.FLASHLIGHT']
// @capacitor/barcode-scanner needs Android 7.0+; the Capacitor template
// ships minSdk 24, so it must be lifted here (see native.config.json in
// upstream capacitor-exploration, Phase 0 decision).
const MIN_SDK = 26

function fail(msg) {
  console.error(`[prepare-android] ERROR: ${msg}`)
  process.exit(1)
}

function read(path, label) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    fail(`No se encontró ${label} en ${path}. ¿Se generó android/ con "npx cap add android"?`)
  }
}

function patchManifest(xml) {
  if (!xml.includes('</manifest>')) {
    fail('AndroidManifest.xml no contiene </manifest>')
  }
  let out = xml
  let changed = false

  const missingPerms = PERMISSIONS.filter((p) => !out.includes(`android:name="${p}"`))
  if (missingPerms.length > 0) {
    const block = missingPerms.map((p) => `    <uses-permission android:name="${p}" />`).join('\n')
    out = out.replace('</manifest>', `${block}\n</manifest>`)
    changed = true
  }

  return { out, changed }
}

function patchGradle(text) {
  const anchor = text.match(/^android\s*\{$/m)
  if (!anchor) {
    fail('build.gradle no contiene un bloque "android {"')
  }
  let out = text
  if (!out.includes('dataBinding true')) {
    const block =
      '    buildFeatures {\n        dataBinding true\n    }\n    dataBinding {\n        enabled = true\n    }'
    out = out.replace(anchor[0], `${anchor[0]}\n${block}`)
  }
  return { out, changed: out !== text }
}

function patchVariables(text) {
  const m = text.match(/minSdkVersion\s*=\s*\d+/)
  if (!m) return { out: text, changed: false }
  if (m[0].includes(`= ${MIN_SDK}`) || m[0].includes(`=${MIN_SDK}`)) {
    return { out: text, changed: false }
  }
  return { out: text.replace(m[0], m[0].replace(/\d+/, String(MIN_SDK))), changed: true }
}

const manifest = read(MANIFEST, 'AndroidManifest.xml')
const m = patchManifest(manifest)
if (m.changed) {
  writeFileSync(MANIFEST, m.out)
  console.log('[prepare-android] Permisos CAMERA/FLASHLIGHT añadidos al manifest')
} else {
  console.log('[prepare-android] Manifest ya configurado (idempotente)')
}

const gradle = read(GRADLE, 'build.gradle')
const g = patchGradle(gradle)
if (g.changed) {
  writeFileSync(GRADLE, g.out)
  console.log('[prepare-android] dataBinding habilitado en build.gradle')
} else {
  console.log('[prepare-android] dataBinding ya presente')
}

const variables = read(VARIABLES, 'variables.gradle')
const v = patchVariables(variables)
if (v.changed) {
  writeFileSync(VARIABLES, v.out)
  console.log(`[prepare-android] minSdkVersion elevado a ${MIN_SDK}`)
} else {
  console.log(`[prepare-android] minSdkVersion ya es ${MIN_SDK} (idempotente)`)
}
