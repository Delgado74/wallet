import { WebPlugin } from '@capacitor/core';
export class LnurlNativeWeb extends WebPlugin {
    async owned() {
        return { error: 'not available on web' };
    }
    async addresses() {
        return { error: 'not available on web' };
    }
    async sessionLnurl() {
        return { error: 'not available on web' };
    }
    async capabilities() {
        return { error: 'not available on web' };
    }
}
//# sourceMappingURL=web.js.map