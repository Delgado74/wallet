import { WebPlugin } from '@capacitor/core'
import type { LnurlNativePlugin } from './definitions'

export class LnurlNativeWeb extends WebPlugin implements LnurlNativePlugin {
  async owned(): Promise<{ receiver: any } | { error: string }> {
    return { error: 'not available on web' }
  }
  async addresses(): Promise<{ addresses: any[] } | { error: string }> {
    return { error: 'not available on web' }
  }
  async sessionLnurl(): Promise<{ lnurl: string } | { error: string }> {
    return { error: 'not available on web' }
  }
  async capabilities(): Promise<{ capabilities: any } | { error: string }> {
    return { error: 'not available on web' }
  }
}
