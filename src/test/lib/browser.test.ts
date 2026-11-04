import { afterEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ value: false }))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.value },
}))

import { isInAppBrowser } from '../../lib/browser'

const ANDROID_WEBVIEW_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36; wv)'

describe('isInAppBrowser', () => {
  afterEach(() => {
    native.value = false
    vi.restoreAllMocks()
  })

  it('does not treat the Capacitor Android WebView as an in-app browser', () => {
    native.value = true
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID_WEBVIEW_UA)
    expect(isInAppBrowser()).toBe(false)
  })

  it('still detects third-party in-app browsers on the web', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID_WEBVIEW_UA)
    expect(isInAppBrowser()).toBe(true)
  })
})
