import { Capacitor } from '@capacitor/core'
import { LnurlNative } from '@arkade/lnurl-native'

const isNative = () => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export const lnurlNativeOwned = async (opts: {
  identity: string
  arkadeAddress: string
  boardingAddress?: string
  handle?: string
  refresh?: boolean
}) => {
  if (!isNative()) return { error: 'not_native' }
  try {
    const res = await LnurlNative.owned({ ...opts, baseUrl: 'https://arkade.computer', domain: 'arkade.computer' })
    return res
  } catch (e: any) {
    return { error: e?.message || 'native_error' }
  }
}

export const lnurlNativeAddresses = async (opts: {
  identity: string
  arkadeAddress: string
  boardingAddress?: string
}) => {
  if (!isNative()) return { error: 'not_native' }
  try {
    const res = await LnurlNative.addresses({ ...opts, baseUrl: 'https://arkade.computer', domain: 'arkade.computer' })
    return res
  } catch (e: any) {
    return { error: e?.message || 'native_error' }
  }
}

export const lnurlNativeSessionLnurl = async (opts: {
  identity: string
  arkadeAddress: string
  boardingAddress?: string
}) => {
  if (!isNative()) return { error: 'not_native' }
  try {
    const res = await LnurlNative.sessionLnurl({
      ...opts,
      baseUrl: 'https://arkade.computer',
      domain: 'arkade.computer',
    })
    return res
  } catch (e: any) {
    return { error: e?.message || 'native_error' }
  }
}

export const lnurlNativeCapabilities = async () => {
  if (!isNative()) return { error: 'not_native' }
  try {
    const res = await LnurlNative.capabilities({ baseUrl: 'https://arkade.computer', domain: 'arkade.computer' })
    return res
  } catch (e: any) {
    return { error: e?.message || 'native_error' }
  }
}
