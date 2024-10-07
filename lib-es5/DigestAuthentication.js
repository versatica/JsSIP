"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Logger = require('./Logger');
var Utils = require('./Utils');
var logger = new Logger('DigestAuthentication');
module.exports = /*#__PURE__*/function () {
  function DigestAuthentication(credentials) {
    _classCallCheck(this, DigestAuthentication);
    this._credentials = credentials;
    this._cnonce = null;
    this._nc = 0;
    this._ncHex = '00000000';
    this._algorithm = null;
    this._realm = null;
    this._nonce = null;
    this._opaque = null;
    this._stale = null;
    this._qop = null;
    this._method = null;
    this._uri = null;
    this._ha1 = null;
    this._response = null;
  }
  return _createClass(DigestAuthentication, [{
    key: "get",
    value: function get(parameter) {
      switch (parameter) {
        case 'realm':
          return this._realm;
        case 'ha1':
          return this._ha1;
        default:
          logger.warn('get() | cannot get "%s" parameter', parameter);
          return undefined;
      }
    }

    /**
    * Performs Digest authentication given a SIP request and the challenge
    * received in a response to that request.
    * Returns true if auth was successfully generated, false otherwise.
    */
  }, {
    key: "authenticate",
    value: function authenticate(_ref, challenge) {
      var method = _ref.method,
        ruri = _ref.ruri,
        body = _ref.body;
      var cnonce = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      this._algorithm = challenge.algorithm;
      this._realm = challenge.realm;
      this._nonce = challenge.nonce;
      this._opaque = challenge.opaque;
      this._stale = challenge.stale;
      if (this._algorithm) {
        if (this._algorithm !== 'MD5') {
          logger.warn('authenticate() | challenge with Digest algorithm different than "MD5", authentication aborted');
          return false;
        }
      } else {
        this._algorithm = 'MD5';
      }
      if (!this._nonce) {
        logger.warn('authenticate() | challenge without Digest nonce, authentication aborted');
        return false;
      }
      if (!this._realm) {
        logger.warn('authenticate() | challenge without Digest realm, authentication aborted');
        return false;
      }

      // If no plain SIP password is provided.
      if (!this._credentials.password) {
        // If ha1 is not provided we cannot authenticate.
        if (!this._credentials.ha1) {
          logger.warn('authenticate() | no plain SIP password nor ha1 provided, authentication aborted');
          return false;
        }

        // If the realm does not match the stored realm we cannot authenticate.
        if (this._credentials.realm !== this._realm) {
          logger.warn('authenticate() | no plain SIP password, and stored `realm` does not match the given `realm`, cannot authenticate [stored:"%s", given:"%s"]', this._credentials.realm, this._realm);
          return false;
        }
      }

      // 'qop' can contain a list of values (Array). Let's choose just one.
      if (challenge.qop) {
        if (challenge.qop.indexOf('auth-int') > -1) {
          this._qop = 'auth-int';
        } else if (challenge.qop.indexOf('auth') > -1) {
          this._qop = 'auth';
        } else {
          // Otherwise 'qop' is present but does not contain 'auth' or 'auth-int', so abort here.
          logger.warn('authenticate() | challenge without Digest qop different than "auth" or "auth-int", authentication aborted');
          return false;
        }
      } else {
        this._qop = null;
      }

      // Fill other attributes.

      this._method = method;
      this._uri = ruri;
      this._cnonce = cnonce || Utils.createRandomToken(12);
      this._nc += 1;
      var hex = Number(this._nc).toString(16);
      this._ncHex = '00000000'.substr(0, 8 - hex.length) + hex;

      // Nc-value = 8LHEX. Max value = 'FFFFFFFF'.
      if (this._nc === 4294967296) {
        this._nc = 1;
        this._ncHex = '00000001';
      }

      // Calculate the Digest "response" value.

      // If we have plain SIP password then regenerate ha1.
      if (this._credentials.password) {
        // HA1 = MD5(A1) = MD5(username:realm:password).
        this._ha1 = Utils.calculateMD5("".concat(this._credentials.username, ":").concat(this._realm, ":").concat(this._credentials.password));
      }
      // Otherwise reuse the stored ha1.
      else {
        this._ha1 = this._credentials.ha1;
      }
      var a2;
      var ha2;
      if (this._qop === 'auth') {
        // HA2 = MD5(A2) = MD5(method:digestURI).
        a2 = "".concat(this._method, ":").concat(this._uri);
        ha2 = Utils.calculateMD5(a2);
        logger.debug('authenticate() | using qop=auth [a2:"%s"]', a2);

        // Response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2).
        this._response = Utils.calculateMD5("".concat(this._ha1, ":").concat(this._nonce, ":").concat(this._ncHex, ":").concat(this._cnonce, ":auth:").concat(ha2));
      } else if (this._qop === 'auth-int') {
        // HA2 = MD5(A2) = MD5(method:digestURI:MD5(entityBody)).
        a2 = "".concat(this._method, ":").concat(this._uri, ":").concat(Utils.calculateMD5(body ? body : ''));
        ha2 = Utils.calculateMD5(a2);
        logger.debug('authenticate() | using qop=auth-int [a2:"%s"]', a2);

        // Response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2).
        this._response = Utils.calculateMD5("".concat(this._ha1, ":").concat(this._nonce, ":").concat(this._ncHex, ":").concat(this._cnonce, ":auth-int:").concat(ha2));
      } else if (this._qop === null) {
        // HA2 = MD5(A2) = MD5(method:digestURI).
        a2 = "".concat(this._method, ":").concat(this._uri);
        ha2 = Utils.calculateMD5(a2);
        logger.debug('authenticate() | using qop=null [a2:"%s"]', a2);

        // Response = MD5(HA1:nonce:HA2).
        this._response = Utils.calculateMD5("".concat(this._ha1, ":").concat(this._nonce, ":").concat(ha2));
      }
      logger.debug('authenticate() | response generated');
      return true;
    }

    /**
    * Return the Proxy-Authorization or WWW-Authorization header value.
    */
  }, {
    key: "toString",
    value: function toString() {
      var auth_params = [];
      if (!this._response) {
        throw new Error('response field does not exist, cannot generate Authorization header');
      }
      auth_params.push("algorithm=".concat(this._algorithm));
      auth_params.push("username=\"".concat(this._credentials.username, "\""));
      auth_params.push("realm=\"".concat(this._realm, "\""));
      auth_params.push("nonce=\"".concat(this._nonce, "\""));
      auth_params.push("uri=\"".concat(this._uri, "\""));
      auth_params.push("response=\"".concat(this._response, "\""));
      if (this._opaque) {
        auth_params.push("opaque=\"".concat(this._opaque, "\""));
      }
      if (this._qop) {
        auth_params.push("qop=".concat(this._qop));
        auth_params.push("cnonce=\"".concat(this._cnonce, "\""));
        auth_params.push("nc=".concat(this._ncHex));
      }
      return "Digest ".concat(auth_params.join(', '));
    }
  }]);
}();