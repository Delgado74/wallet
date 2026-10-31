/**
 * Detects if JavaScript and required capabilities are available in the current environment.
 * This is particularly important for restricted browsers (like iOS PWAs with JIT disabled)
 * where cryptographic operations might fail or be extremely slow.
 */

export interface JSCapabilityCheck {
  isSupported: boolean
  errorMessage?: string
}

const isCapacitorNative = (): boolean => {
  try {
    const cap = (window as any).Capacitor
    if (cap?.isNativePlatform?.()) return true
    if (typeof cap?.getPlatform === 'function' && cap.getPlatform() !== 'web') return true
  } catch {}
  try {
    if ((window as any).androidInterface) return true
  } catch {}
  try {
    if (location.hostname === 'localhost' && /Android|iPhone|iPad|iPod/.test(navigator.userAgent)) {
      if ((window as any).Capacitor) return true
    }
  } catch {}
  return false
}

/**
 * Tests if the environment has sufficient JavaScript capabilities for the wallet to function.
 * This includes checking for:
 * - Basic JavaScript execution (implicitly tested by running this code)
 * - Cryptographic operations performance
 * - Web Workers support (used by the wallet service worker)
 * - IndexedDB support (used for storage)
 */
export const detectJSCapabilities = async (): Promise<JSCapabilityCheck> => {
  try {
    // In Capacitor native apps (Android/iOS) the WebView has full capabilities
    // and these browser restriction checks cause false negatives
    if (isCapacitorNative()) {
      return { isSupported: true }
    }
    // Check for Web Workers support (required for the wallet service worker)
    if (!window.Worker) {
      return {
        isSupported: false,
        errorMessage: 'Web Workers are required but not supported in this environment',
      }
    }

    // Check for Service Worker support
    if (!('serviceWorker' in navigator)) {
      return {
        isSupported: false,
        errorMessage: 'Service Workers are required but not supported in this environment',
      }
    }

    // Check for IndexedDB support (required for wallet storage)
    if (!window.indexedDB) {
      return {
        isSupported: false,
        errorMessage: 'IndexedDB is required but not supported in this environment',
      }
    }

    // Check for crypto.subtle support (required for cryptographic operations)
    if (!window.crypto || !window.crypto.subtle) {
      return {
        isSupported: false,
        errorMessage: 'Web Crypto API is required but not supported in this environment',
      }
    }

    // Test basic cryptographic performance
    // If JIT is disabled, crypto operations might be extremely slow
    const perfCheck = await testCryptoPerformance()
    if (!perfCheck.isSupported) {
      return perfCheck
    }

    return {
      isSupported: true,
    }
  } catch (error) {
    return {
      isSupported: false,
      errorMessage: `JavaScript capabilities check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tests cryptographic operation performance.
 * In environments with JIT disabled, crypto operations can be 10-100x slower.
 */
const testCryptoPerformance = async (): Promise<JSCapabilityCheck> => {
  try {
    const startTime = performance.now()

    // Perform a simple but representative crypto operation
    const keyMaterial = new Uint8Array(32)
    crypto.getRandomValues(keyMaterial)

    // Try to import a key and perform a hash (operations that exercise JIT)
    const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

    const data = new TextEncoder().encode('test data for performance check')
    await crypto.subtle.sign('HMAC', key, data)

    const endTime = performance.now()
    const duration = endTime - startTime

    // If it takes more than 100ms for a simple operation, JIT is likely disabled
    // or the environment is severely restricted
    if (duration > 100) {
      return {
        isSupported: false,
        errorMessage: 'JavaScript performance is too slow in this environment (possible JIT disabled)',
      }
    }

    return { isSupported: true }
  } catch (error) {
    return {
      isSupported: false,
      errorMessage: `Cryptographic performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
