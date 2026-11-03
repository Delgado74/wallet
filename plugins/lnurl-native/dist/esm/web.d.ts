import { WebPlugin } from '@capacitor/core';
import type { LnurlNativePlugin } from './definitions';
export declare class LnurlNativeWeb extends WebPlugin implements LnurlNativePlugin {
    owned(): Promise<{
        receiver: any;
    } | {
        error: string;
    }>;
    addresses(): Promise<{
        addresses: any[];
    } | {
        error: string;
    }>;
    sessionLnurl(): Promise<{
        lnurl: string;
    } | {
        error: string;
    }>;
    capabilities(): Promise<{
        capabilities: any;
    } | {
        error: string;
    }>;
}
