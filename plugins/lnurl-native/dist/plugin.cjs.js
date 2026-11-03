'use strict';

var core = require('@capacitor/core');

const LnurlNative = core.registerPlugin('LnurlNative', {
    web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.LnurlNativeWeb()),
});

class LnurlNativeWeb extends core.WebPlugin {
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

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    LnurlNativeWeb: LnurlNativeWeb
});

exports.LnurlNative = LnurlNative;
//# sourceMappingURL=plugin.cjs.js.map
