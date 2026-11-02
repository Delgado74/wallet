#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = resolve(ROOT, 'android/app/src/main/AndroidManifest.xml')
const GRADLE = resolve(ROOT, 'android/app/build.gradle')
const VARIABLES = resolve(ROOT, 'android/variables.gradle')

const PERMISSIONS = ['android.permission.CAMERA', 'android.permission.FLASHLIGHT']
const MIN_SDK = 26

function fail(msg) {
  console.error(`[prepare-android] ERROR: ${msg}`)
  process.exit(1)
}

function read(path, label) {
  try {
    if (!existsSync(path)) {
      fail(`No se encontró ${label} en ${path}. ¿Se generó android/ con "npx cap add android"?`)
    }
    return readFileSync(path, 'utf8')
  } catch (e) {
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

  if (!out.includes('com.google.mlkit.vision.DEPENDENCIES')) {
    if (out.includes('</application>')) {
      const meta = `        <meta-data\n            android:name="com.google.mlkit.vision.DEPENDENCIES"\n            android:value="barcode" />\n`
      out = out.replace('</application>', `${meta}    </application>`)
      changed = true
    }
  }

  return { out, changed }
}

const manifest = read(MANIFEST, 'AndroidManifest.xml')
const m = patchManifest(manifest)
if (m.changed) {
  writeFileSync(MANIFEST, m.out)
  console.log('[prepare-android] Permisos CAMERA/FLASHLIGHT y ML Kit añadidos al manifest')
} else {
  console.log('[prepare-android] Permisos y ML Kit ya presentes')
}

if (existsSync(GRADLE)) {
  try {
    let g = readFileSync(GRADLE, 'utf8')
    if (!g.includes('dataBinding true')) {
      if (g.includes('buildFeatures')) {
        g = g.replace(/buildFeatures\s*\{[^}]*\}/s, (m) => m.replace('}', '        dataBinding true\n    }'))
      } else {
        const anchor = g.match(/^android\s*\{$/m)
        if (anchor) {
          g = g.replace(anchor[0], `${anchor[0]}\n    buildFeatures {\n        dataBinding true\n    }`)
        }
      }
      writeFileSync(GRADLE, g)
      console.log('[prepare-android] dataBinding habilitado')
    }
  } catch {}
}

if (existsSync(VARIABLES)) {
  try {
    let v = readFileSync(VARIABLES, 'utf8')
    const m2 = v.match(/minSdkVersion\s*=\s*\d+/)
    if (m2 && !m2[0].includes(`= ${MIN_SDK}`) && !m2[0].includes(`=${MIN_SDK}`)) {
      v = v.replace(m2[0], m2[0].replace(/\d+/, String(MIN_SDK)))
      writeFileSync(VARIABLES, v)
      console.log('[prepare-android] minSdkVersion actualizado a 26')
    }
  } catch {}
}
