'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Utils = require('./Utils');
var JsSIP_C = require('./Constants');
var SIPMessage = require('./SIPMessage');
var RequestSender = require('./RequestSender');
var debug = require('debug')('JsSIP:Registrator');

module.exports = function () {
  function Registrator(ua, transport) {
    _classCallCheck(this, Registrator);

    var reg_id = 1; // Force reg_id to 1.

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

    if (reg_id) {
      this._contact += ';reg-id=' + reg_id;
      this._contact += ';+sip.instance="<urn:uuid:' + this._ua.configuration.instance_id + '>"';
    }
  }

  _createClass(Registrator, [{
    key: 'setExtraHeaders',
    value: function setExtraHeaders(extraHeaders) {
      if (!Array.isArray(extraHeaders)) {
        extraHeaders = [];
      }

      this._extraHeaders = extraHeaders.slice();
    }
  }, {
    key: 'setExtraContactParams',
    value: function setExtraContactParams(extraContactParams) {
      if (!(extraContactParams instanceof Object)) {
        extraContactParams = {};
      }

      // Reset it.
      this._extraContactParams = '';

      for (var param_key in extraContactParams) {
        if (Object.prototype.hasOwnProperty.call(extraContactParams, param_key)) {
          var param_value = extraContactParams[param_key];

          this._extraContactParams += ';' + param_key;
          if (param_value) {
            this._extraContactParams += '=' + param_value;
          }
        }
      }
    }
  }, {
    key: 'register',
    value: function register() {
      var _this = this;

      if (this._registering) {
        debug('Register request in progress...');

        return;
      }

      var extraHeaders = this._extraHeaders.slice();

      extraHeaders.push('Contact: ' + this._contact + ';expires=' + this._expires + this._extraContactParams);
      extraHeaders.push('Expires: ' + this._expires);

      var request = new SIPMessage.OutgoingRequest(JsSIP_C.REGISTER, this._registrar, this._ua, {
        'to_uri': this._to_uri,
        'call_id': this._call_id,
        'cseq': this._cseq += 1
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
          var contact = void 0,
              expires = void 0,
              contacts = response.getHeaders('contact').length;

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
              // Ignore provisional responses.
              break;
            case /^2[0-9]{2}$/.test(response.status_code):
              _this._registering = false;

              if (response.hasHeader('expires')) {
                expires = response.getHeader('expires');
              }

              // Search the Contact pointing to us and update the expires value accordingly.
              if (!contacts) {
                debug('no Contact header in response to REGISTER, response ignored');
                break;
              }

              while (contacts--) {
                contact = response.parseHeader('contact', contacts);
                if (contact.uri.user === _this._ua.contact.uri.user) {
                  expires = contact.getParam('expires');
                  break;
                } else {
                  contact = null;
                }
              }

              if (!contact) {
                debug('no Contact header pointing to us, response ignored');
                break;
              }

              if (!expires) {
                expires = _this._expires;
              }

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
              }, expires * 1000 - 5000);

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
            // Interval too brief RFC3261 10.2.8.
            case /^423$/.test(response.status_code):
              if (response.hasHeader('min-expires')) {
                // Increase our registration interval to the suggested minimum.
                _this._expires = response.getHeader('min-expires');
                // Attempt the registration again immediately.
                _this.register();
              } else {
                // This response MUST contain a Min-Expires header field
                debug('423 response received for REGISTER without Min-Expires');
                _this._registrationFailure(response, JsSIP_C.causes.SIP_FAILURE_CODE);
              }
              break;
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
    key: 'unregister',
    value: function unregister() {
      var _this2 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (!this._registered) {
        debug('already unregistered');

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
        extraHeaders.push('Contact: *' + this._extraContactParams);
      } else {
        extraHeaders.push('Contact: ' + this._contact + ';expires=0' + this._extraContactParams);
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
    key: 'close',
    value: function close() {
      if (this._registered) {
        this.unregister();
      }
    }
  }, {
    key: 'onTransportClosed',
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
    key: '_registrationFailure',
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
    key: '_unregistered',
    value: function _unregistered(response, cause) {
      this._registering = false;
      this._registered = false;
      this._ua.unregistered({
        response: response || null,
        cause: cause || null
      });
    }
  }, {
    key: 'registered',
    get: function get() {
      return this._registered;
    }
  }]);

  return Registrator;
}();