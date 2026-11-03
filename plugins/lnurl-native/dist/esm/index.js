import { registerPlugin } from '@capacitor/core';
const LnurlNative = registerPlugin('LnurlNative', {
    web: () => import('./web').then((m) => new m.LnurlNativeWeb()),
});
export * from './definitions';
export { LnurlNative };
//# sourceMappingURL=index.js.map