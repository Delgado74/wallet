import { afterEach, describe, expect, it, vi } from 'vitest'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@arkade/lnurl-native', () => ({
  LnurlNative: { request: (...args: unknown[]) => request(...args) },
}))

const originalFetch = globalThis.fetch

const loadShim = async () => {
  const { installNativeLnurlFetch } = await import('../../lib/lnurlNative')
  return installNativeLnurlFetch
}

describe('installNativeLnurlFetch', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    request.mockReset()
    vi.resetModules()
  })

  it('routes configured lnurl paths through the native bridge', async () => {
    request.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
      url: 'https://lnurl.test/lnurl/domain',
    })
    const install = await loadShim()
    install('https://lnurl.test')

    const response = await fetch('https://lnurl.test/lnurl/domain')

    expect(await response.json()).toEqual({ ok: true })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://lnurl.test/lnurl/domain', method: 'GET' }),
    )
  })

  it('leaves other origins and non-lnurl paths on the WebView fetch', async () => {
    const web = vi.fn(async () => new Response('web'))
    globalThis.fetch = web
    const install = await loadShim()
    install('https://lnurl.test')

    expect(await (await fetch('https://other.test/lnurl/domain')).text()).toBe('web')
    expect(await (await fetch('https://lnurl.test/api/health')).text()).toBe('web')
    expect(request).not.toHaveBeenCalled()
  })
})
