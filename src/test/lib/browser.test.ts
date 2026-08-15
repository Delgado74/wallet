import { beforeEach, describe, expect, it } from 'vitest'
import { isInAppBrowser } from '../../lib/browser'

describe('isInAppBrowser', () => {
  beforeEach(() => {
    delete (window as any).Capacitor
  })

  it('is false for a regular browser user agent', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      configurable: true,
    })
    expect(isInAppBrowser()).toBe(false)
  })

  it('is true for a generic Android WebView UA', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36; wv)',
      configurable: true,
    })
    expect(isInAppBrowser()).toBe(true)
  })

  it('is false when running inside a Capacitor native app despite the WebView UA', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36; wv)',
      configurable: true,
    })
    ;(window as any).Capacitor = { isNativePlatform: () => true }
    expect(isInAppBrowser()).toBe(false)
  })

  it('is true for an Android WebView UA when Capacitor is absent', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36; wv)',
      configurable: true,
    })
    ;(window as any).Capacitor = undefined
    expect(isInAppBrowser()).toBe(true)
  })
})
