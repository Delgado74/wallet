'use strict';

var core = require('@capacitor/core');

const LnurlNative = core.registerPlugin('LnurlNative', {
    web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.LnurlNativeWeb()),
});

class LnurlNativeWeb extends core.WebPlugin {
    async request(_options) {
        throw new Error('native HTTP bridge is not available on web');
    }
}

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    LnurlNativeWeb: LnurlNativeWeb
});

exports.LnurlNative = LnurlNative;
//# sourceMappingURL=plugin.cjs.js.map
