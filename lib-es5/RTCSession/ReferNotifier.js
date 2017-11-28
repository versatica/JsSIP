'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JsSIP_C = require('../Constants');
var debug = require('debug')('JsSIP:RTCSession:ReferNotifier');

var C = {
  event_type: 'refer',
  body_type: 'message/sipfrag;version=2.0',
  expires: 300
};

module.exports = function () {
  function ReferNotifier(session, id, expires) {
    _classCallCheck(this, ReferNotifier);

    this._session = session;
    this._id = id;
    this._expires = expires || C.expires;
    this._active = true;

    // The creation of a Notifier results in an immediate NOTIFY.
    this.notify(100);
  }

  _createClass(ReferNotifier, [{
    key: 'notify',
    value: function notify(code, reason) {
      debug('notify()');

      if (this._active === false) {
        return;
      }

      reason = reason || JsSIP_C.REASON_PHRASE[code] || '';

      var state = void 0;

      if (code >= 200) {
        state = 'terminated;reason=noresource';
      } else {
        state = 'active;expires=' + this._expires;
      }

      // Put this in a try/catch block.
      this._session.sendRequest(JsSIP_C.NOTIFY, {
        extraHeaders: ['Event: ' + C.event_type + ';id=' + this._id, 'Subscription-State: ' + state, 'Content-Type: ' + C.body_type],
        body: 'SIP/2.0 ' + code + ' ' + reason,
        eventHandlers: {
          // If a negative response is received, subscription is canceled.
          onErrorResponse: function onErrorResponse() {
            this._active = false;
          }
        }
      });
    }
  }]);

  return ReferNotifier;
}();