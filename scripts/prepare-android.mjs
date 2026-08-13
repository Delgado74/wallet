#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = resolve(ROOT, 'android/app/src/main/AndroidManifest.xml');
const GRADLE = resolve(ROOT, 'android/app/build.gradle');

const PERMISSIONS = ['android.permission.CAMERA', 'android.permission.FLASHLIGHT'];

function fail(msg) {
  console.error(`[prepare-android] ERROR: ${msg}`);
  process.exit(1);
}

function read(path, label) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    fail(`No se encontró ${label} en ${path}. ¿Se generó android/ con "npx cap add android"?`);
  }
}

function patchManifest(xml) {
  if (!xml.includes('</manifest>')) {
    fail('AndroidManifest.xml no contiene </manifest>');
  }
  let out = xml;
  let changed = false;

  const missingPerms = PERMISSIONS.filter(
    (p) => !out.includes(`android:name="${p}"`),
  );
  if (missingPerms.length > 0) {
    const block = missingPerms
      .map((p) => `    <uses-permission android:name="${p}" />`)
      .join('\n');
    out = out.replace('</manifest>', `${block}\n</manifest>`);
    changed = true;
  }

  if (!out.includes('com.google.mlkit.vision.DEPENDENCIES')) {
    const appMatch = out.match(/<application\b[^>]*>/);
    if (!appMatch) {
      fail('AndroidManifest.xml no contiene la etiqueta <application>');
    }
    const meta =
      '        <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="barcode_ui"/>';
    out = out.replace(appMatch[0], `${appMatch[0]}\n${meta}`);
    changed = true;
  }

  return { out, changed };
}

function patchGradle(text) {
  const anchor = text.match(/^android\s*\{$/m);
  if (!anchor) {
    fail('build.gradle no contiene un bloque "android {"');
  }
  if (text.includes('dataBinding true')) {
    return { out: text, changed: false };
  }
  const block =
    '    buildFeatures {\n        dataBinding true\n    }\n    dataBinding {\n        enabled = true\n    }';
  return { out: text.replace(anchor[0], `${anchor[0]}\n${block}`), changed: true };
}

const manifest = read(MANIFEST, 'AndroidManifest.xml');
const m = patchManifest(manifest);
if (m.changed) {
  writeFileSync(MANIFEST, m.out);
  console.log('[prepare-android] Permisos CAMERA/FLASHLIGHT y/o metadata ML Kit añadidos al manifest');
} else {
  console.log('[prepare-android] Manifest ya configurado (idempotente)');
}

const gradle = read(GRADLE, 'build.gradle');
const g = patchGradle(gradle);
if (g.changed) {
  writeFileSync(GRADLE, g.out);
  console.log('[prepare-android] dataBinding habilitado en build.gradle');
} else {
  console.log('[prepare-android] dataBinding ya presente');
}
