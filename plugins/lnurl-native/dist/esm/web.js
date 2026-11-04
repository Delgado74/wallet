import { WebPlugin } from '@capacitor/core';
export class LnurlNativeWeb extends WebPlugin {
    async request(_options) {
        throw new Error('native HTTP bridge is not available on web');
    }
}
//# sourceMappingURL=web.js.map