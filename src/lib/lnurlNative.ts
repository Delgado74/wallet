import { Capacitor } from '@capacitor/core'
import { LnurlNative } from '@arkade/lnurl-native'
import { fromRuntimeEnv } from './constants'

/** True when the app runs inside a native shell, where requests can bypass the WebView. */
export const isNativeBridgeAvailable = (): boolean => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/** Paths the lnurl-server protocol uses. Kept narrow so the shim never touches unrelated traffic. */
const LNURL_PATHS = ['/lnurl/', '/.well-known/lnurlp/']

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>

const toHeaderRecord = (headers?: HeadersInit): Record<string, string> => {
  const record: Record<string, string> = {}
  if (!headers) return record
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      record[key] = value
    })
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) record[key] = value
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (value != null) record[key] = String(value)
    }
  }
  return record
}

const bodyToString = async (body: BodyInit | null | undefined): Promise<string | undefined> => {
  if (body == null) return undefined
  if (typeof body === 'string') return body
  if (body instanceof URLSearchParams) return body.toString()
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body)
  if (ArrayBuffer.isView(body)) return new TextDecoder().decode(body)
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body.text()
  return String(body)
}

/**
 * `fetch` backed by the native OkHttp bridge.
 *
 * The LNURL client keeps owning every endpoint, token and parser; only the
 * transport is swapped, so the server contract lives in one place.
 */
export const nativeFetch: FetchImpl = async (input, init) => {
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const result = await LnurlNative.request({
    url: input,
    method: init?.method ?? 'GET',
    headers: toHeaderRecord(init?.headers),
    body: await bodyToString(init?.body),
  })
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return new Response(result.body ?? '', {
    status: result.status,
    statusText: result.statusText ?? '',
    headers: result.headers ?? {},
  })
}

let installed = false

/**
 * Route lnurl-server traffic through the native bridge on Android/iOS.
 *
 * The client builds some internal clients without a `fetchImpl` (payment sync
 * and payer routing) and those fall back to `globalThis.fetch`. The shim is
 * scoped to the configured server origin and the protocol paths, so it only
 * replaces requests the WebView cannot make cross-origin.
 */
export const installNativeLnurlFetch = (serverBaseUrl?: string): void => {
  if (installed || !isNativeBridgeAvailable()) return
  const raw = serverBaseUrl ?? fromRuntimeEnv(import.meta.env.VITE_LNURL_SERVER?.trim())
  if (!raw) return
  let origin: string
  try {
    origin = new URL(raw).origin
  } catch {
    return
  }
  installed = true
  const fallback = globalThis.fetch.bind(globalThis)
  globalThis.fetch = (input, init) => {
    if (typeof input !== 'string' && !(input instanceof URL)) return fallback(input, init)
    const url = typeof input === 'string' ? input : input.href
    let parsed: URL
    try {
      parsed = new URL(url, globalThis.location?.href)
    } catch {
      return fallback(input, init)
    }
    if (parsed.origin === origin && LNURL_PATHS.some((path) => parsed.pathname.startsWith(path))) {
      return nativeFetch(url, init)
    }
    return fallback(input, init)
  }
}
