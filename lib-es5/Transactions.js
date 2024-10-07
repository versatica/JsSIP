"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _readOnlyError(r) { throw new TypeError('"' + r + '" is read-only'); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var EventEmitter = require('events').EventEmitter;
var Logger = require('./Logger');
var JsSIP_C = require('./Constants');
var SIPMessage = require('./SIPMessage');
var Timers = require('./Timers');
var loggernict = new Logger('NonInviteClientTransaction');
var loggerict = new Logger('InviteClientTransaction');
var loggeract = new Logger('AckClientTransaction');
var loggernist = new Logger('NonInviteServerTransaction');
var loggerist = new Logger('InviteServerTransaction');
var C = {
  // Transaction states.
  STATUS_TRYING: 1,
  STATUS_PROCEEDING: 2,
  STATUS_CALLING: 3,
  STATUS_ACCEPTED: 4,
  STATUS_COMPLETED: 5,
  STATUS_TERMINATED: 6,
  STATUS_CONFIRMED: 7,
  // Transaction types.
  NON_INVITE_CLIENT: 'nict',
  NON_INVITE_SERVER: 'nist',
  INVITE_CLIENT: 'ict',
  INVITE_SERVER: 'ist'
};
var NonInviteClientTransaction = /*#__PURE__*/function (_EventEmitter) {
  function NonInviteClientTransaction(ua, transport, request, eventHandlers) {
    var _this;
    _classCallCheck(this, NonInviteClientTransaction);
    _this = _callSuper(this, NonInviteClientTransaction);
    _this.type = C.NON_INVITE_CLIENT;
    _this.id = "z9hG4bK".concat(Math.floor(Math.random() * 10000000));
    _this.ua = ua;
    _this.transport = transport;
    _this.request = request;
    _this.eventHandlers = eventHandlers;
    var via = "SIP/2.0/".concat(transport.via_transport);
    via += " ".concat(ua.configuration.via_host, ";branch=").concat(_this.id);
    _this.request.setHeader('via', via);
    _this.ua.newTransaction(_this);
    return _this;
  }
  _inherits(NonInviteClientTransaction, _EventEmitter);
  return _createClass(NonInviteClientTransaction, [{
    key: "C",
    get: function get() {
      return C;
    }
  }, {
    key: "stateChanged",
    value: function stateChanged(state) {
      this.state = state;
      this.emit('stateChanged');
    }
  }, {
    key: "send",
    value: function send() {
      var _this2 = this;
      this.stateChanged(C.STATUS_TRYING);
      this.F = setTimeout(function () {
        _this2.timer_F();
      }, Timers.TIMER_F);
      if (!this.transport.send(this.request)) {
        this.onTransportError();
      }
    }
  }, {
    key: "onTransportError",
    value: function onTransportError() {
      loggernict.debug("transport error occurred, deleting transaction ".concat(this.id));
      clearTimeout(this.F);
      clearTimeout(this.K);
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
      this.eventHandlers.onTransportError();
    }
  }, {
    key: "timer_F",
    value: function timer_F() {
      loggernict.debug("Timer F expired for transaction ".concat(this.id));
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
      this.eventHandlers.onRequestTimeout();
    }
  }, {
    key: "timer_K",
    value: function timer_K() {
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }
  }, {
    key: "receiveResponse",
    value: function receiveResponse(response) {
      var _this3 = this;
      var status_code = response.status_code;
      if (status_code < 200) {
        switch (this.state) {
          case C.STATUS_TRYING:
          case C.STATUS_PROCEEDING:
            this.stateChanged(C.STATUS_PROCEEDING);
            this.eventHandlers.onReceiveResponse(response);
            break;
        }
      } else {
        switch (this.state) {
          case C.STATUS_TRYING:
          case C.STATUS_PROCEEDING:
            this.stateChanged(C.STATUS_COMPLETED);
            clearTimeout(this.F);
            if (status_code === 408) {
              this.eventHandlers.onRequestTimeout();
            } else {
              this.eventHandlers.onReceiveResponse(response);
            }
            this.K = setTimeout(function () {
              _this3.timer_K();
            }, Timers.TIMER_K);
            break;
          case C.STATUS_COMPLETED:
            break;
        }
      }
    }
  }]);
}(EventEmitter);
var InviteClientTransaction = /*#__PURE__*/function (_EventEmitter2) {
  function InviteClientTransaction(ua, transport, request, eventHandlers) {
    var _this4;
    _classCallCheck(this, InviteClientTransaction);
    _this4 = _callSuper(this, InviteClientTransaction);
    _this4.type = C.INVITE_CLIENT;
    _this4.id = "z9hG4bK".concat(Math.floor(Math.random() * 10000000));
    _this4.ua = ua;
    _this4.transport = transport;
    _this4.request = request;
    _this4.eventHandlers = eventHandlers;
    request.transaction = _this4;
    var via = "SIP/2.0/".concat(transport.via_transport);
    via += " ".concat(ua.configuration.via_host, ";branch=").concat(_this4.id);
    _this4.request.setHeader('via', via);
    _this4.ua.newTransaction(_this4);
    return _this4;
  }
  _inherits(InviteClientTransaction, _EventEmitter2);
  return _createClass(InviteClientTransaction, [{
    key: "C",
    get: function get() {
      return C;
    }
  }, {
    key: "stateChanged",
    value: function stateChanged(state) {
      this.state = state;
      this.emit('stateChanged');
    }
  }, {
    key: "send",
    value: function send() {
      var _this5 = this;
      this.stateChanged(C.STATUS_CALLING);
      this.B = setTimeout(function () {
        _this5.timer_B();
      }, Timers.TIMER_B);
      if (!this.transport.send(this.request)) {
        this.onTransportError();
      }
    }
  }, {
    key: "onTransportError",
    value: function onTransportError() {
      clearTimeout(this.B);
      clearTimeout(this.D);
      clearTimeout(this.M);
      if (this.state !== C.STATUS_ACCEPTED) {
        loggerict.debug("transport error occurred, deleting transaction ".concat(this.id));
        this.eventHandlers.onTransportError();
      }
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }

    // RFC 6026 7.2.
  }, {
    key: "timer_M",
    value: function timer_M() {
      loggerict.debug("Timer M expired for transaction ".concat(this.id));
      if (this.state === C.STATUS_ACCEPTED) {
        clearTimeout(this.B);
        this.stateChanged(C.STATUS_TERMINATED);
        this.ua.destroyTransaction(this);
      }
    }

    // RFC 3261 17.1.1.
  }, {
    key: "timer_B",
    value: function timer_B() {
      loggerict.debug("Timer B expired for transaction ".concat(this.id));
      if (this.state === C.STATUS_CALLING) {
        this.stateChanged(C.STATUS_TERMINATED);
        this.ua.destroyTransaction(this);
        this.eventHandlers.onRequestTimeout();
      }
    }
  }, {
    key: "timer_D",
    value: function timer_D() {
      loggerict.debug("Timer D expired for transaction ".concat(this.id));
      clearTimeout(this.B);
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }
  }, {
    key: "sendACK",
    value: function sendACK(response) {
      var _this6 = this;
      var ack = new SIPMessage.OutgoingRequest(JsSIP_C.ACK, this.request.ruri, this.ua, {
        'route_set': this.request.getHeaders('route'),
        'call_id': this.request.getHeader('call-id'),
        'cseq': this.request.cseq
      });
      ack.setHeader('from', this.request.getHeader('from'));
      ack.setHeader('via', this.request.getHeader('via'));
      ack.setHeader('to', response.getHeader('to'));
      this.D = setTimeout(function () {
        _this6.timer_D();
      }, Timers.TIMER_D);
      this.transport.send(ack);
    }
  }, {
    key: "cancel",
    value: function cancel(reason) {
      // Send only if a provisional response (>100) has been received.
      if (this.state !== C.STATUS_PROCEEDING) {
        return;
      }
      var cancel = new SIPMessage.OutgoingRequest(JsSIP_C.CANCEL, this.request.ruri, this.ua, {
        'route_set': this.request.getHeaders('route'),
        'call_id': this.request.getHeader('call-id'),
        'cseq': this.request.cseq
      });
      cancel.setHeader('from', this.request.getHeader('from'));
      cancel.setHeader('via', this.request.getHeader('via'));
      cancel.setHeader('to', this.request.getHeader('to'));
      if (reason) {
        cancel.setHeader('reason', reason);
      }
      this.transport.send(cancel);
    }
  }, {
    key: "receiveResponse",
    value: function receiveResponse(response) {
      var _this7 = this;
      var status_code = response.status_code;
      if (status_code >= 100 && status_code <= 199) {
        switch (this.state) {
          case C.STATUS_CALLING:
            this.stateChanged(C.STATUS_PROCEEDING);
            this.eventHandlers.onReceiveResponse(response);
            break;
          case C.STATUS_PROCEEDING:
            this.eventHandlers.onReceiveResponse(response);
            break;
        }
      } else if (status_code >= 200 && status_code <= 299) {
        switch (this.state) {
          case C.STATUS_CALLING:
          case C.STATUS_PROCEEDING:
            this.stateChanged(C.STATUS_ACCEPTED);
            this.M = setTimeout(function () {
              _this7.timer_M();
            }, Timers.TIMER_M);
            this.eventHandlers.onReceiveResponse(response);
            break;
          case C.STATUS_ACCEPTED:
            this.eventHandlers.onReceiveResponse(response);
            break;
        }
      } else if (status_code >= 300 && status_code <= 699) {
        switch (this.state) {
          case C.STATUS_CALLING:
          case C.STATUS_PROCEEDING:
            this.stateChanged(C.STATUS_COMPLETED);
            this.sendACK(response);
            this.eventHandlers.onReceiveResponse(response);
            break;
          case C.STATUS_COMPLETED:
            this.sendACK(response);
            break;
        }
      }
    }
  }]);
}(EventEmitter);
var AckClientTransaction = /*#__PURE__*/function (_EventEmitter3) {
  function AckClientTransaction(ua, transport, request, eventHandlers) {
    var _this8;
    _classCallCheck(this, AckClientTransaction);
    _this8 = _callSuper(this, AckClientTransaction);
    _this8.id = "z9hG4bK".concat(Math.floor(Math.random() * 10000000));
    _this8.transport = transport;
    _this8.request = request;
    _this8.eventHandlers = eventHandlers;
    var via = "SIP/2.0/".concat(transport.via_transport);
    via += " ".concat(ua.configuration.via_host, ";branch=").concat(_this8.id);
    _this8.request.setHeader('via', via);
    return _this8;
  }
  _inherits(AckClientTransaction, _EventEmitter3);
  return _createClass(AckClientTransaction, [{
    key: "C",
    get: function get() {
      return C;
    }
  }, {
    key: "send",
    value: function send() {
      if (!this.transport.send(this.request)) {
        this.onTransportError();
      }
    }
  }, {
    key: "onTransportError",
    value: function onTransportError() {
      loggeract.debug("transport error occurred for transaction ".concat(this.id));
      this.eventHandlers.onTransportError();
    }
  }]);
}(EventEmitter);
var NonInviteServerTransaction = /*#__PURE__*/function (_EventEmitter4) {
  function NonInviteServerTransaction(ua, transport, request) {
    var _this9;
    _classCallCheck(this, NonInviteServerTransaction);
    _this9 = _callSuper(this, NonInviteServerTransaction);
    _this9.type = C.NON_INVITE_SERVER;
    _this9.id = request.via_branch;
    _this9.ua = ua;
    _this9.transport = transport;
    _this9.request = request;
    _this9.last_response = '';
    request.server_transaction = _this9;
    _this9.state = C.STATUS_TRYING;
    ua.newTransaction(_this9);
    return _this9;
  }
  _inherits(NonInviteServerTransaction, _EventEmitter4);
  return _createClass(NonInviteServerTransaction, [{
    key: "C",
    get: function get() {
      return C;
    }
  }, {
    key: "stateChanged",
    value: function stateChanged(state) {
      this.state = state;
      this.emit('stateChanged');
    }
  }, {
    key: "timer_J",
    value: function timer_J() {
      loggernist.debug("Timer J expired for transaction ".concat(this.id));
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }
  }, {
    key: "onTransportError",
    value: function onTransportError() {
      if (!this.transportError) {
        this.transportError = true;
        loggernist.debug("transport error occurred, deleting transaction ".concat(this.id));
        clearTimeout(this.J);
        this.stateChanged(C.STATUS_TERMINATED);
        this.ua.destroyTransaction(this);
      }
    }
  }, {
    key: "receiveResponse",
    value: function receiveResponse(status_code, response, onSuccess, onFailure) {
      var _this10 = this;
      if (status_code === 100) {
        /* RFC 4320 4.1
         * 'A SIP element MUST NOT
         * send any provisional response with a
         * Status-Code other than 100 to a non-INVITE request.'
         */
        switch (this.state) {
          case C.STATUS_TRYING:
            this.stateChanged(C.STATUS_PROCEEDING);
            if (!this.transport.send(response)) {
              this.onTransportError();
            }
            break;
          case C.STATUS_PROCEEDING:
            this.last_response = response;
            if (!this.transport.send(response)) {
              this.onTransportError();
              if (onFailure) {
                onFailure();
              }
            } else if (onSuccess) {
              onSuccess();
            }
            break;
        }
      } else if (status_code >= 200 && status_code <= 699) {
        switch (this.state) {
          case C.STATUS_TRYING:
          case C.STATUS_PROCEEDING:
            this.stateChanged(C.STATUS_COMPLETED);
            this.last_response = response;
            this.J = setTimeout(function () {
              _this10.timer_J();
            }, Timers.TIMER_J);
            if (!this.transport.send(response)) {
              this.onTransportError();
              if (onFailure) {
                onFailure();
              }
            } else if (onSuccess) {
              onSuccess();
            }
            break;
          case C.STATUS_COMPLETED:
            break;
        }
      }
    }
  }]);
}(EventEmitter);
var InviteServerTransaction = /*#__PURE__*/function (_EventEmitter5) {
  function InviteServerTransaction(ua, transport, request) {
    var _this11;
    _classCallCheck(this, InviteServerTransaction);
    _this11 = _callSuper(this, InviteServerTransaction);
    _this11.type = C.INVITE_SERVER;
    _this11.id = request.via_branch;
    _this11.ua = ua;
    _this11.transport = transport;
    _this11.request = request;
    _this11.last_response = '';
    request.server_transaction = _this11;
    _this11.state = C.STATUS_PROCEEDING;
    ua.newTransaction(_this11);
    _this11.resendProvisionalTimer = null;
    request.reply(100);
    return _this11;
  }
  _inherits(InviteServerTransaction, _EventEmitter5);
  return _createClass(InviteServerTransaction, [{
    key: "C",
    get: function get() {
      return C;
    }
  }, {
    key: "stateChanged",
    value: function stateChanged(state) {
      this.state = state;
      this.emit('stateChanged');
    }
  }, {
    key: "timer_H",
    value: function timer_H() {
      loggerist.debug("Timer H expired for transaction ".concat(this.id));
      if (this.state === C.STATUS_COMPLETED) {
        loggerist.debug('ACK not received, dialog will be terminated');
      }
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }
  }, {
    key: "timer_I",
    value: function timer_I() {
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }

    // RFC 6026 7.1.
  }, {
    key: "timer_L",
    value: function timer_L() {
      loggerist.debug("Timer L expired for transaction ".concat(this.id));
      if (this.state === C.STATUS_ACCEPTED) {
        this.stateChanged(C.STATUS_TERMINATED);
        this.ua.destroyTransaction(this);
      }
    }
  }, {
    key: "onTransportError",
    value: function onTransportError() {
      if (!this.transportError) {
        this.transportError = true;
        loggerist.debug("transport error occurred, deleting transaction ".concat(this.id));
        if (this.resendProvisionalTimer !== null) {
          clearInterval(this.resendProvisionalTimer);
          this.resendProvisionalTimer = null;
        }
        clearTimeout(this.L);
        clearTimeout(this.H);
        clearTimeout(this.I);
        this.stateChanged(C.STATUS_TERMINATED);
        this.ua.destroyTransaction(this);
      }
    }
  }, {
    key: "resend_provisional",
    value: function resend_provisional() {
      if (!this.transport.send(this.last_response)) {
        this.onTransportError();
      }
    }

    // INVITE Server Transaction RFC 3261 17.2.1.
  }, {
    key: "receiveResponse",
    value: function receiveResponse(status_code, response, onSuccess, onFailure) {
      var _this12 = this;
      if (status_code >= 100 && status_code <= 199) {
        switch (this.state) {
          case C.STATUS_PROCEEDING:
            if (!this.transport.send(response)) {
              this.onTransportError();
            }
            this.last_response = response;
            break;
        }
      }
      if (status_code > 100 && status_code <= 199 && this.state === C.STATUS_PROCEEDING) {
        // Trigger the resendProvisionalTimer only for the first non 100 provisional response.
        if (this.resendProvisionalTimer === null) {
          this.resendProvisionalTimer = setInterval(function () {
            _this12.resend_provisional();
          }, Timers.PROVISIONAL_RESPONSE_INTERVAL);
        }
      } else if (status_code >= 200 && status_code <= 299) {
        switch (this.state) {
          case C.STATUS_PROCEEDING:
            this.stateChanged(C.STATUS_ACCEPTED);
            this.last_response = response;
            this.L = setTimeout(function () {
              _this12.timer_L();
            }, Timers.TIMER_L);
            if (this.resendProvisionalTimer !== null) {
              clearInterval(this.resendProvisionalTimer);
              this.resendProvisionalTimer = null;
            }

          /* falls through */
          case C.STATUS_ACCEPTED:
            // Note that this point will be reached for proceeding this.state also.
            if (!this.transport.send(response)) {
              this.onTransportError();
              if (onFailure) {
                onFailure();
              }
            } else if (onSuccess) {
              onSuccess();
            }
            break;
        }
      } else if (status_code >= 300 && status_code <= 699) {
        switch (this.state) {
          case C.STATUS_PROCEEDING:
            if (this.resendProvisionalTimer !== null) {
              clearInterval(this.resendProvisionalTimer);
              this.resendProvisionalTimer = null;
            }
            if (!this.transport.send(response)) {
              this.onTransportError();
              if (onFailure) {
                onFailure();
              }
            } else {
              this.stateChanged(C.STATUS_COMPLETED);
              this.H = setTimeout(function () {
                _this12.timer_H();
              }, Timers.TIMER_H);
              if (onSuccess) {
                onSuccess();
              }
            }
            break;
        }
      }
    }
  }]);
}(EventEmitter);
/**
 * INVITE:
 *  _true_ if retransmission
 *  _false_ new request
 *
 * ACK:
 *  _true_  ACK to non2xx response
 *  _false_ ACK must be passed to TU (accepted state)
 *          ACK to 2xx response
 *
 * CANCEL:
 *  _true_  no matching invite transaction
 *  _false_ matching invite transaction and no final response sent
 *
 * OTHER:
 *  _true_  retransmission
 *  _false_ new request
 */
function checkTransaction(_ref, request) {
  var _transactions = _ref._transactions;
  var tr;
  switch (request.method) {
    case JsSIP_C.INVITE:
      tr = _transactions.ist[request.via_branch];
      if (tr) {
        switch (tr.state) {
          case C.STATUS_PROCEEDING:
            tr.transport.send(tr.last_response);
            break;

          // RFC 6026 7.1 Invite retransmission.
          // Received while in C.STATUS_ACCEPTED state. Absorb it.
          case C.STATUS_ACCEPTED:
            break;
        }
        return true;
      }
      break;
    case JsSIP_C.ACK:
      tr = _transactions.ist[request.via_branch];

      // RFC 6026 7.1.
      if (tr) {
        if (tr.state === C.STATUS_ACCEPTED) {
          return false;
        } else if (tr.state === C.STATUS_COMPLETED) {
          tr.state = C.STATUS_CONFIRMED;
          tr.I = setTimeout(function () {
            tr.timer_I();
          }, Timers.TIMER_I);
          return true;
        }
      }
      // ACK to 2XX Response.
      else {
        return false;
      }
      break;
    case JsSIP_C.CANCEL:
      tr = _transactions.ist[request.via_branch];
      if (tr) {
        request.reply_sl(200);
        if (tr.state === C.STATUS_PROCEEDING) {
          return false;
        } else {
          return true;
        }
      } else {
        request.reply_sl(481);
        return true;
      }
    default:
      // Non-INVITE Server Transaction RFC 3261 17.2.2.
      tr = _transactions.nist[request.via_branch];
      if (tr) {
        switch (tr.state) {
          case C.STATUS_TRYING:
            break;
          case C.STATUS_PROCEEDING:
          case C.STATUS_COMPLETED:
            tr.transport.send(tr.last_response);
            break;
        }
        return true;
      }
      break;
  }
}
module.exports = {
  C: C,
  NonInviteClientTransaction: NonInviteClientTransaction,
  InviteClientTransaction: InviteClientTransaction,
  AckClientTransaction: AckClientTransaction,
  NonInviteServerTransaction: NonInviteServerTransaction,
  InviteServerTransaction: InviteServerTransaction,
  checkTransaction: checkTransaction
};