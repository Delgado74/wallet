import { WebPlugin } from '@capacitor/core'
import type { LnurlNativePlugin, NativeHttpRequest, NativeHttpResponse } from './definitions'

export class LnurlNativeWeb extends WebPlugin implements LnurlNativePlugin {
  async request(_options: NativeHttpRequest): Promise<NativeHttpResponse> {
    throw new Error('native HTTP bridge is not available on web')
  }
}
