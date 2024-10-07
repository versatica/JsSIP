"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
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
var Logger = require('../Logger');
var JsSIP_C = require('../Constants');
var Grammar = require('../Grammar');
var Utils = require('../Utils');
var logger = new Logger('RTCSession:ReferSubscriber');
module.exports = /*#__PURE__*/function (_EventEmitter) {
  function ReferSubscriber(session) {
    var _this;
    _classCallCheck(this, ReferSubscriber);
    _this = _callSuper(this, ReferSubscriber);
    _this._id = null;
    _this._session = session;
    return _this;
  }
  _inherits(ReferSubscriber, _EventEmitter);
  return _createClass(ReferSubscriber, [{
    key: "id",
    get: function get() {
      return this._id;
    }
  }, {
    key: "sendRefer",
    value: function sendRefer(target) {
      var _this2 = this;
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      logger.debug('sendRefer()');
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var eventHandlers = Utils.cloneObject(options.eventHandlers);

      // Set event handlers.
      for (var event in eventHandlers) {
        if (Object.prototype.hasOwnProperty.call(eventHandlers, event)) {
          this.on(event, eventHandlers[event]);
        }
      }

      // Replaces URI header field.
      var replaces = null;
      if (options.replaces) {
        replaces = options.replaces._request.call_id;
        replaces += ";to-tag=".concat(options.replaces._to_tag);
        replaces += ";from-tag=".concat(options.replaces._from_tag);
        replaces = encodeURIComponent(replaces);
      }

      // Refer-To header field.
      var referTo = "Refer-To: <".concat(target).concat(replaces ? "?Replaces=".concat(replaces) : '', ">");
      extraHeaders.push(referTo);

      // Referred-By header field (if not already present).
      if (!extraHeaders.some(function (header) {
        return header.toLowerCase().startsWith('referred-by:');
      })) {
        var referredBy = "Referred-By: <".concat(this._session._ua._configuration.uri._scheme, ":").concat(this._session._ua._configuration.uri._user, "@").concat(this._session._ua._configuration.uri._host, ">");
        extraHeaders.push(referredBy);
      }
      extraHeaders.push("Contact: ".concat(this._session.contact));
      var request = this._session.sendRequest(JsSIP_C.REFER, {
        extraHeaders: extraHeaders,
        eventHandlers: {
          onSuccessResponse: function onSuccessResponse(response) {
            _this2._requestSucceeded(response);
          },
          onErrorResponse: function onErrorResponse(response) {
            _this2._requestFailed(response, JsSIP_C.causes.REJECTED);
          },
          onTransportError: function onTransportError() {
            _this2._requestFailed(null, JsSIP_C.causes.CONNECTION_ERROR);
          },
          onRequestTimeout: function onRequestTimeout() {
            _this2._requestFailed(null, JsSIP_C.causes.REQUEST_TIMEOUT);
          },
          onDialogError: function onDialogError() {
            _this2._requestFailed(null, JsSIP_C.causes.DIALOG_ERROR);
          }
        }
      });
      this._id = request.cseq;
    }
  }, {
    key: "receiveNotify",
    value: function receiveNotify(request) {
      logger.debug('receiveNotify()');
      if (!request.body) {
        return;
      }
      var status_line = Grammar.parse(request.body.trim().split('\r\n', 1)[0], 'Status_Line');
      if (status_line === -1) {
        logger.debug("receiveNotify() | error parsing NOTIFY body: \"".concat(request.body, "\""));
        return;
      }
      switch (true) {
        case /^100$/.test(status_line.status_code):
          this.emit('trying', {
            request: request,
            status_line: status_line
          });
          break;
        case /^1[0-9]{2}$/.test(status_line.status_code):
          this.emit('progress', {
            request: request,
            status_line: status_line
          });
          break;
        case /^2[0-9]{2}$/.test(status_line.status_code):
          this.emit('accepted', {
            request: request,
            status_line: status_line
          });
          break;
        default:
          this.emit('failed', {
            request: request,
            status_line: status_line
          });
          break;
      }
    }
  }, {
    key: "_requestSucceeded",
    value: function _requestSucceeded(response) {
      logger.debug('REFER succeeded');
      logger.debug('emit "requestSucceeded"');
      this.emit('requestSucceeded', {
        response: response
      });
    }
  }, {
    key: "_requestFailed",
    value: function _requestFailed(response, cause) {
      logger.debug('REFER failed');
      logger.debug('emit "requestFailed"');
      this.emit('requestFailed', {
        response: response || null,
        cause: cause
      });
    }
  }]);
}(EventEmitter);