import { WebPlugin } from '@capacitor/core';
import type { LnurlNativePlugin, NativeHttpRequest, NativeHttpResponse } from './definitions';
export declare class LnurlNativeWeb extends WebPlugin implements LnurlNativePlugin {
    request(_options: NativeHttpRequest): Promise<NativeHttpResponse>;
}
