import { registerPlugin } from '@capacitor/core'
import type { LnurlNativePlugin } from './definitions'

const LnurlNative = registerPlugin<LnurlNativePlugin>('LnurlNative', {
  web: () => import('./web').then((m) => new m.LnurlNativeWeb()),
})

export * from './definitions'
export { LnurlNative }
