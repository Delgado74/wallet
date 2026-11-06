import { afterEach, describe, it, expect, vi } from 'vitest'
import { defaultArkServer, devServer, getSolverRegistryUrl, isMainnet, mainServer } from '../../lib/constants'

const stubNative = () => vi.stubGlobal('Capacitor', { isNativePlatform: () => true })

describe('isMainnet', () => {
  it('returns true for bitcoin and unrecognized networks', () => {
    expect(isMainnet('bitcoin')).toBe(true)
    expect(isMainnet('some-future-network')).toBe(true)
  })

  it('returns false for known test networks', () => {
    expect(isMainnet('testnet')).toBe(false)
    expect(isMainnet('mutinynet')).toBe(false)
    expect(isMainnet('signet')).toBe(false)
    expect(isMainnet('regtest')).toBe(false)
  })

  it('returns false for an empty network (unreachable ASP or not yet loaded)', () => {
    expect(isMainnet('')).toBe(false)
  })
})

describe('getSolverRegistryUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('takes the library published index for a discovery network', () => {
    expect(getSolverRegistryUrl('bitcoin')).toBe('https://arkade-os.github.io/solver-registry/bitcoin.json')
    expect(getSolverRegistryUrl('mutinynet')).toBe('https://arkade-os.github.io/solver-registry/mutinynet.json')
    // signet publishes an index that is served even though it lists no markets
    expect(getSolverRegistryUrl('signet')).toBe('https://arkade-os.github.io/solver-registry/signet.json')
  })

  it('keeps regtest on the local harness index, not the published one', () => {
    expect(getSolverRegistryUrl('regtest')).toBe('http://localhost:3002/solver-registry/regtest.json')
  })

  it('lets an explicit VITE_SOLVER_REGISTRY_URL name a URL for any network', () => {
    vi.stubEnv('VITE_SOLVER_REGISTRY_URL', 'https://example.test/registry.json')
    expect(getSolverRegistryUrl('bitcoin')).toBe('https://example.test/registry.json')
    expect(getSolverRegistryUrl('regtest')).toBe('https://example.test/registry.json')
  })

  it('reads an unsubstituted runtime placeholder as no override, not a URL', () => {
    vi.stubEnv('VITE_SOLVER_REGISTRY_URL', '__VITE_SOLVER_REGISTRY_URL__')
    expect(getSolverRegistryUrl('bitcoin')).toBe('https://arkade-os.github.io/solver-registry/bitcoin.json')
  })
})

describe('defaultArkServer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('uses the local dev server for localhost on the web', () => {
    expect(defaultArkServer()).toBe(devServer)
  })

  it('does not mistake the Capacitor localhost WebView for the dev server', () => {
    stubNative()
    expect(defaultArkServer()).toBe(mainServer)
  })

  it('honours VITE_ARK_SERVER on native', () => {
    stubNative()
    vi.stubEnv('VITE_ARK_SERVER', 'https://example.test')
    expect(defaultArkServer()).toBe('https://example.test')
  })

  it('reads an unsubstituted runtime placeholder as no override on native', () => {
    stubNative()
    vi.stubEnv('VITE_ARK_SERVER', '__VITE_ARK_SERVER__')
    expect(defaultArkServer()).toBe(mainServer)
  })
})
