#!/usr/bin/env node
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { deflateSync } from 'node:zlib'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RES = resolve(ROOT, 'android/app/src/main/res')
const ICON = resolve(ROOT, 'public/arkade-icon-512.png')

const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']
const BRAND_COLOR = '#0B6B6F'
const SPLASH_RGB = [0x0b, 0x6b, 0x6f]

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

function solidPng(width, height, [r, g, b]) {
  const crcTable = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c >>> 0
  }
  const crc32 = (buf) => {
    let c = 0xffffffff
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0)])
  const raw = Buffer.concat(Array.from({ length: height }, () => row))
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const idat = deflateSync(raw)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

if (!existsSync(RES)) {
  fail(`No se encontró la carpeta de recursos en ${RES}. ¿Se generó android/ con "npx cap add android"?`)
}
if (!existsSync(ICON)) {
  fail(`No se encontró el ícono oficial en ${ICON}.`)
}

const anydpi = join(RES, 'mipmap-anydpi-v26')
if (existsSync(anydpi)) {
  rmSync(anydpi, { recursive: true })
  console.log('[prepare-branding] Iconos adaptativos desactivados (mipmap-anydpi-v26 eliminado)')
}

for (const den of DENSITIES) {
  const dst = join(RES, `mipmap-${den}`)
  copyFileSync(ICON, join(dst, 'ic_launcher.png'))
  copyFileSync(ICON, join(dst, 'ic_launcher_round.png'))
}
console.log('[prepare-branding] Iconos Arkade copiados a mipmap-*')

const splash = solidPng(640, 640, SPLASH_RGB)
writeFileSync(join(RES, 'drawable/splash.png'), splash)
for (const den of DENSITIES) {
  writeFileSync(join(RES, `drawable-port-${den}/splash.png`), splash)
  writeFileSync(join(RES, `drawable-land-${den}/splash.png`), splash)
}
console.log('[prepare-branding] Splash de color de marca (#0B6B6F) aplicado a drawable(-port/-land)-*')

const colorPath = join(RES, 'values/ic_launcher_background.xml')
const colorXml = read(colorPath, 'values/ic_launcher_background.xml')
if (!colorXml.includes(BRAND_COLOR)) {
  writeFileSync(colorPath, colorXml.replace(/#[0-9A-Fa-f]{6,8}/, BRAND_COLOR))
  console.log(`[prepare-branding] ic_launcher_background -> ${BRAND_COLOR}`)
}

console.log('[prepare-branding] Branding Arkade aplicado')