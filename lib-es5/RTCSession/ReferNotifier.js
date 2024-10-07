"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Logger = require('../Logger');
var JsSIP_C = require('../Constants');
var logger = new Logger('RTCSession:ReferNotifier');
var C = {
  event_type: 'refer',
  body_type: 'message/sipfrag;version=2.0',
  expires: 300
};
module.exports = /*#__PURE__*/function () {
  function ReferNotifier(session, id, expires) {
    _classCallCheck(this, ReferNotifier);
    this._session = session;
    this._id = id;
    this._expires = expires || C.expires;
    this._active = true;

    // The creation of a Notifier results in an immediate NOTIFY.
    this.notify(100);
  }
  return _createClass(ReferNotifier, [{
    key: "notify",
    value: function notify(code, reason) {
      logger.debug('notify()');
      if (this._active === false) {
        return;
      }
      reason = reason || JsSIP_C.REASON_PHRASE[code] || '';
      var state;
      if (code >= 200) {
        state = 'terminated;reason=noresource';
      } else {
        state = "active;expires=".concat(this._expires);
      }
      try {
        this._session.sendRequest(JsSIP_C.NOTIFY, {
          extraHeaders: ["Event: ".concat(C.event_type, ";id=").concat(this._id), "Subscription-State: ".concat(state), "Content-Type: ".concat(C.body_type)],
          body: "SIP/2.0 ".concat(code, " ").concat(reason),
          eventHandlers: {
            // If a negative response is received, subscription is canceled.
            onErrorResponse: function onErrorResponse() {
              this._active = false;
            }
          }
        });
      } catch (e) {
        logger.debug('sendRequest exception ignored', e);
      }
    }
  }]);
}();