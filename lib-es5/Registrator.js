"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Logger = require('./Logger');
var Utils = require('./Utils');
var JsSIP_C = require('./Constants');
var SIPMessage = require('./SIPMessage');
var RequestSender = require('./RequestSender');
var logger = new Logger('Registrator');
var MIN_REGISTER_EXPIRES = 10; // In seconds.

module.exports = /*#__PURE__*/function () {
  function Registrator(ua, transport) {
    _classCallCheck(this, Registrator);
    // Force reg_id to 1.
    this._reg_id = 1;
    this._ua = ua;
    this._transport = transport;
    this._registrar = ua.configuration.registrar_server;
    this._expires = ua.configuration.register_expires;

    // Call-ID and CSeq values RFC3261 10.2.
    this._call_id = Utils.createRandomToken(22);
    this._cseq = 0;
    this._to_uri = ua.configuration.uri;
    this._registrationTimer = null;

    // Ongoing Register request.
    this._registering = false;

    // Set status.
    this._registered = false;

    // Contact header.
    this._contact = this._ua.contact.toString();

    // Sip.ice media feature tag (RFC 5768).
    this._contact += ';+sip.ice';

    // Custom headers for REGISTER and un-REGISTER.
    this._extraHeaders = [];

    // Custom Contact header params for REGISTER and un-REGISTER.
    this._extraContactParams = '';

    // Contents of the sip.instance Contact header parameter.
    this._sipInstance = "\"<urn:uuid:".concat(this._ua.configuration.instance_id, ">\"");
    this._contact += ";reg-id=".concat(this._reg_id);
    this._contact += ";+sip.instance=".concat(this._sipInstance);
  }
  return _createClass(Registrator, [{
    key: "registered",
    get: function get() {
      return this._registered;
    }
  }, {
    key: "setExtraHeaders",
    value: function setExtraHeaders(extraHeaders) {
      if (!Array.isArray(extraHeaders)) {
        extraHeaders = [];
      }
      this._extraHeaders = extraHeaders.slice();
    }
  }, {
    key: "setExtraContactParams",
    value: function setExtraContactParams(extraContactParams) {
      if (!(extraContactParams instanceof Object)) {
        extraContactParams = {};
      }

      // Reset it.
      this._extraContactParams = '';
      for (var param_key in extraContactParams) {
        if (Object.prototype.hasOwnProperty.call(extraContactParams, param_key)) {
          var param_value = extraContactParams[param_key];
          this._extraContactParams += ";".concat(param_key);
          if (param_value) {
            this._extraContactParams += "=".concat(param_value);
          }
        }
      }
    }
  }, {
    key: "register",
    value: function register() {
      var _this = this;
      if (this._registering) {
        logger.debug('Register request in progress...');
        return;
      }
      var extraHeaders = this._extraHeaders.slice();
      extraHeaders.push("Contact: ".concat(this._contact, ";expires=").concat(this._expires).concat(this._extraContactParams));
      extraHeaders.push("Expires: ".concat(this._expires));
      var fromTag = Utils.newTag();
      if (this._ua.configuration.register_from_tag_trail) {
        if (typeof this._ua.configuration.register_from_tag_trail === 'function') {
          fromTag += this._ua.configuration.register_from_tag_trail();
        } else {
          fromTag += this._ua.configuration.register_from_tag_trail;
        }
      }
      var request = new SIPMessage.OutgoingRequest(JsSIP_C.REGISTER, this._registrar, this._ua, {
        'to_uri': this._to_uri,
        'call_id': this._call_id,
        'cseq': this._cseq += 1,
        'from_tag': fromTag
      }, extraHeaders);
      var request_sender = new RequestSender(this._ua, request, {
        onRequestTimeout: function onRequestTimeout() {
          _this._registrationFailure(null, JsSIP_C.causes.REQUEST_TIMEOUT);
        },
        onTransportError: function onTransportError() {
          _this._registrationFailure(null, JsSIP_C.causes.CONNECTION_ERROR);
        },
        // Increase the CSeq on authentication.
        onAuthenticated: function onAuthenticated() {
          _this._cseq += 1;
        },
        onReceiveResponse: function onReceiveResponse(response) {
          // Discard responses to older REGISTER/un-REGISTER requests.
          if (response.cseq !== _this._cseq) {
            return;
          }

          // Clear registration timer.
          if (_this._registrationTimer !== null) {
            clearTimeout(_this._registrationTimer);
            _this._registrationTimer = null;
          }
          switch (true) {
            case /^1[0-9]{2}$/.test(response.status_code):
              {
                // Ignore provisional responses.
                break;
              }
            case /^2[0-9]{2}$/.test(response.status_code):
              {
                _this._registering = false;
                if (!response.hasHeader('Contact')) {
                  logger.debug('no Contact header in response to REGISTER, response ignored');
                  break;
                }
                var contacts = response.headers['Contact'].reduce(function (a, b) {
                  return a.concat(b.parsed);
                }, []);

                // Get the Contact pointing to us and update the expires value accordingly.
                // Try to find a matching Contact using sip.instance and reg-id.
                var contact = contacts.find(function (element) {
                  return _this._sipInstance === element.getParam('+sip.instance') && _this._reg_id === parseInt(element.getParam('reg-id'));
                });

                // If no match was found using the sip.instance try comparing the URIs.
                if (!contact) {
                  contact = contacts.find(function (element) {
                    return element.uri.user === _this._ua.contact.uri.user;
                  });
                }
                if (!contact) {
                  logger.debug('no Contact header pointing to us, response ignored');
                  break;
                }
                var expires = contact.getParam('expires');
                if (!expires && response.hasHeader('expires')) {
                  expires = response.getHeader('expires');
                }
                if (!expires) {
                  expires = _this._expires;
                }
                expires = Number(expires);
                if (expires < MIN_REGISTER_EXPIRES) expires = MIN_REGISTER_EXPIRES;
                var timeout = expires > 64 ? expires * 1000 / 2 + Math.floor((expires / 2 - 32) * 1000 * Math.random()) : expires * 1000 - 5000;

                // Re-Register or emit an event before the expiration interval has elapsed.
                // For that, decrease the expires value. ie: 3 seconds.
                _this._registrationTimer = setTimeout(function () {
                  _this._registrationTimer = null;
                  // If there are no listeners for registrationExpiring, renew registration.
                  // If there are listeners, let the function listening do the register call.
                  if (_this._ua.listeners('registrationExpiring').length === 0) {
                    _this.register();
                  } else {
                    _this._ua.emit('registrationExpiring');
                  }
                }, timeout);

                // Save gruu values.
                if (contact.hasParam('temp-gruu')) {
                  _this._ua.contact.temp_gruu = contact.getParam('temp-gruu').replace(/"/g, '');
                }
                if (contact.hasParam('pub-gruu')) {
                  _this._ua.contact.pub_gruu = contact.getParam('pub-gruu').replace(/"/g, '');
                }
                if (!_this._registered) {
                  _this._registered = true;
                  _this._ua.registered({
                    response: response
                  });
                }
                break;
              }

            // Interval too brief RFC3261 10.2.8.
            case /^423$/.test(response.status_code):
              {
                if (response.hasHeader('min-expires')) {
                  // Increase our registration interval to the suggested minimum.
                  _this._expires = Number(response.getHeader('min-expires'));
                  if (_this._expires < MIN_REGISTER_EXPIRES) _this._expires = MIN_REGISTER_EXPIRES;

                  // Assure register re-try with new expire.
                  _this._registering = false;

                  // Attempt the registration again immediately.
                  _this.register();
                } else {
                  // This response MUST contain a Min-Expires header field.
                  logger.debug('423 response received for REGISTER without Min-Expires');
                  _this._registrationFailure(response, JsSIP_C.causes.SIP_FAILURE_CODE);
                }
                break;
              }
            default:
              {
                var cause = Utils.sipErrorCause(response.status_code);
                _this._registrationFailure(response, cause);
              }
          }
        }
      });
      this._registering = true;
      request_sender.send();
    }
  }, {
    key: "unregister",
    value: function unregister() {
      var _this2 = this;
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      if (!this._registered) {
        logger.debug('already unregistered');
        return;
      }
      this._registered = false;

      // Clear the registration timer.
      if (this._registrationTimer !== null) {
        clearTimeout(this._registrationTimer);
        this._registrationTimer = null;
      }
      var extraHeaders = this._extraHeaders.slice();
      if (options.all) {
        extraHeaders.push("Contact: *".concat(this._extraContactParams));
      } else {
        extraHeaders.push("Contact: ".concat(this._contact, ";expires=0").concat(this._extraContactParams));
      }
      extraHeaders.push('Expires: 0');
      var request = new SIPMessage.OutgoingRequest(JsSIP_C.REGISTER, this._registrar, this._ua, {
        'to_uri': this._to_uri,
        'call_id': this._call_id,
        'cseq': this._cseq += 1
      }, extraHeaders);
      var request_sender = new RequestSender(this._ua, request, {
        onRequestTimeout: function onRequestTimeout() {
          _this2._unregistered(null, JsSIP_C.causes.REQUEST_TIMEOUT);
        },
        onTransportError: function onTransportError() {
          _this2._unregistered(null, JsSIP_C.causes.CONNECTION_ERROR);
        },
        // Increase the CSeq on authentication.
        onAuthenticated: function onAuthenticated() {
          _this2._cseq += 1;
        },
        onReceiveResponse: function onReceiveResponse(response) {
          switch (true) {
            case /^1[0-9]{2}$/.test(response.status_code):
              // Ignore provisional responses.
              break;
            case /^2[0-9]{2}$/.test(response.status_code):
              _this2._unregistered(response);
              break;
            default:
              {
                var cause = Utils.sipErrorCause(response.status_code);
                _this2._unregistered(response, cause);
              }
          }
        }
      });
      request_sender.send();
    }
  }, {
    key: "close",
    value: function close() {
      if (this._registered) {
        this.unregister();
      }
    }
  }, {
    key: "onTransportClosed",
    value: function onTransportClosed() {
      this._registering = false;
      if (this._registrationTimer !== null) {
        clearTimeout(this._registrationTimer);
        this._registrationTimer = null;
      }
      if (this._registered) {
        this._registered = false;
        this._ua.unregistered({});
      }
    }
  }, {
    key: "_registrationFailure",
    value: function _registrationFailure(response, cause) {
      this._registering = false;
      this._ua.registrationFailed({
        response: response || null,
        cause: cause
      });
      if (this._registered) {
        this._registered = false;
        this._ua.unregistered({
          response: response || null,
          cause: cause
        });
      }
    }
  }, {
    key: "_unregistered",
    value: function _unregistered(response, cause) {
      this._registering = false;
      this._registered = false;
      this._ua.unregistered({
        response: response || null,
        cause: cause || null
      });
    }
  }]);
}();