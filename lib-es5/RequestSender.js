"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Logger = require('./Logger');
var JsSIP_C = require('./Constants');
var DigestAuthentication = require('./DigestAuthentication');
var Transactions = require('./Transactions');
var logger = new Logger('RequestSender');

// Default event handlers.
var EventHandlers = {
  onRequestTimeout: function onRequestTimeout() {},
  onTransportError: function onTransportError() {},
  onReceiveResponse: function onReceiveResponse() {},
  onAuthenticated: function onAuthenticated() {}
};
module.exports = /*#__PURE__*/function () {
  function RequestSender(ua, request, eventHandlers) {
    _classCallCheck(this, RequestSender);
    this._ua = ua;
    this._eventHandlers = eventHandlers;
    this._method = request.method;
    this._request = request;
    this._auth = null;
    this._challenged = false;
    this._staled = false;

    // Define the undefined handlers.
    for (var handler in EventHandlers) {
      if (Object.prototype.hasOwnProperty.call(EventHandlers, handler)) {
        if (!this._eventHandlers[handler]) {
          this._eventHandlers[handler] = EventHandlers[handler];
        }
      }
    }

    // If ua is in closing process or even closed just allow sending Bye and ACK.
    if (ua.status === ua.C.STATUS_USER_CLOSED && (this._method !== JsSIP_C.BYE || this._method !== JsSIP_C.ACK)) {
      this._eventHandlers.onTransportError();
    }
  }

  /**
  * Create the client transaction and send the message.
  */
  return _createClass(RequestSender, [{
    key: "send",
    value: function send() {
      var _this = this;
      var eventHandlers = {
        onRequestTimeout: function onRequestTimeout() {
          _this._eventHandlers.onRequestTimeout();
        },
        onTransportError: function onTransportError() {
          _this._eventHandlers.onTransportError();
        },
        onReceiveResponse: function onReceiveResponse(response) {
          _this._receiveResponse(response);
        }
      };
      switch (this._method) {
        case 'INVITE':
          this.clientTransaction = new Transactions.InviteClientTransaction(this._ua, this._ua.transport, this._request, eventHandlers);
          break;
        case 'ACK':
          this.clientTransaction = new Transactions.AckClientTransaction(this._ua, this._ua.transport, this._request, eventHandlers);
          break;
        default:
          this.clientTransaction = new Transactions.NonInviteClientTransaction(this._ua, this._ua.transport, this._request, eventHandlers);
      }
      // If authorization JWT is present, use it.
      if (this._ua._configuration.authorization_jwt) {
        this._request.setHeader('Authorization', this._ua._configuration.authorization_jwt);
      }
      this.clientTransaction.send();
    }

    /**
    * Called from client transaction when receiving a correct response to the request.
    * Authenticate request if needed or pass the response back to the applicant.
    */
  }, {
    key: "_receiveResponse",
    value: function _receiveResponse(response) {
      var challenge;
      var authorization_header_name;
      var status_code = response.status_code;

      /*
      * Authentication
      * Authenticate once. _challenged_ flag used to avoid infinite authentications.
      */
      if ((status_code === 401 || status_code === 407) && (this._ua.configuration.password !== null || this._ua.configuration.ha1 !== null)) {
        // Get and parse the appropriate WWW-Authenticate or Proxy-Authenticate header.
        if (response.status_code === 401) {
          challenge = response.parseHeader('www-authenticate');
          authorization_header_name = 'authorization';
        } else {
          challenge = response.parseHeader('proxy-authenticate');
          authorization_header_name = 'proxy-authorization';
        }

        // Verify it seems a valid challenge.
        if (!challenge) {
          logger.debug("".concat(response.status_code, " with wrong or missing challenge, cannot authenticate"));
          this._eventHandlers.onReceiveResponse(response);
          return;
        }
        if (!this._challenged || !this._staled && challenge.stale === true) {
          if (!this._auth) {
            this._auth = new DigestAuthentication({
              username: this._ua.configuration.authorization_user,
              password: this._ua.configuration.password,
              realm: this._ua.configuration.realm,
              ha1: this._ua.configuration.ha1
            });
          }

          // Verify that the challenge is really valid.
          if (!this._auth.authenticate(this._request, challenge)) {
            this._eventHandlers.onReceiveResponse(response);
            return;
          }
          this._challenged = true;

          // Update ha1 and realm in the UA.
          this._ua.set('realm', this._auth.get('realm'));
          this._ua.set('ha1', this._auth.get('ha1'));
          if (challenge.stale) {
            this._staled = true;
          }
          this._request = this._request.clone();
          this._request.cseq += 1;
          this._request.setHeader('cseq', "".concat(this._request.cseq, " ").concat(this._method));
          this._request.setHeader(authorization_header_name, this._auth.toString());
          this._eventHandlers.onAuthenticated(this._request);
          this.send();
        } else {
          this._eventHandlers.onReceiveResponse(response);
        }
      } else {
        this._eventHandlers.onReceiveResponse(response);
      }
    }
  }]);
}();