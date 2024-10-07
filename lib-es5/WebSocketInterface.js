"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Logger = require('./Logger');
var Grammar = require('./Grammar');
var logger = new Logger('WebSocketInterface');
module.exports = /*#__PURE__*/function () {
  function WebSocketInterface(url) {
    _classCallCheck(this, WebSocketInterface);
    logger.debug('new() [url:"%s"]', url);
    this._url = url;
    this._sip_uri = null;
    this._via_transport = null;
    this._ws = null;
    var parsed_url = Grammar.parse(url, 'absoluteURI');
    if (parsed_url === -1) {
      logger.warn("invalid WebSocket URI: ".concat(url));
      throw new TypeError("Invalid argument: ".concat(url));
    } else if (parsed_url.scheme !== 'wss' && parsed_url.scheme !== 'ws') {
      logger.warn("invalid WebSocket URI scheme: ".concat(parsed_url.scheme));
      throw new TypeError("Invalid argument: ".concat(url));
    } else {
      this._sip_uri = "sip:".concat(parsed_url.host).concat(parsed_url.port ? ":".concat(parsed_url.port) : '', ";transport=ws");
      this._via_transport = parsed_url.scheme.toUpperCase();
    }
  }
  return _createClass(WebSocketInterface, [{
    key: "via_transport",
    get: function get() {
      return this._via_transport;
    },
    set: function set(value) {
      this._via_transport = value.toUpperCase();
    }
  }, {
    key: "sip_uri",
    get: function get() {
      return this._sip_uri;
    }
  }, {
    key: "url",
    get: function get() {
      return this._url;
    }
  }, {
    key: "connect",
    value: function connect() {
      logger.debug('connect()');
      if (this.isConnected()) {
        logger.debug("WebSocket ".concat(this._url, " is already connected"));
        return;
      } else if (this.isConnecting()) {
        logger.debug("WebSocket ".concat(this._url, " is connecting"));
        return;
      }
      if (this._ws) {
        this.disconnect();
      }
      logger.debug("connecting to WebSocket ".concat(this._url));
      try {
        this._ws = new WebSocket(this._url, 'sip');
        this._ws.binaryType = 'arraybuffer';
        this._ws.onopen = this._onOpen.bind(this);
        this._ws.onclose = this._onClose.bind(this);
        this._ws.onmessage = this._onMessage.bind(this);
        this._ws.onerror = this._onError.bind(this);
      } catch (e) {
        this._onError(e);
      }
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      logger.debug('disconnect()');
      if (this._ws) {
        // Unbind websocket event callbacks.
        this._ws.onopen = function () {};
        this._ws.onclose = function () {};
        this._ws.onmessage = function () {};
        this._ws.onerror = function () {};
        this._ws.close();
        this._ws = null;
      }
    }
  }, {
    key: "send",
    value: function send(message) {
      logger.debug('send()');
      if (this.isConnected()) {
        this._ws.send(message);
        return true;
      } else {
        logger.warn('unable to send message, WebSocket is not open');
        return false;
      }
    }
  }, {
    key: "isConnected",
    value: function isConnected() {
      return this._ws && this._ws.readyState === this._ws.OPEN;
    }
  }, {
    key: "isConnecting",
    value: function isConnecting() {
      return this._ws && this._ws.readyState === this._ws.CONNECTING;
    }

    /**
     * WebSocket Event Handlers
     */
  }, {
    key: "_onOpen",
    value: function _onOpen() {
      logger.debug("WebSocket ".concat(this._url, " connected"));
      this.onconnect();
    }
  }, {
    key: "_onClose",
    value: function _onClose(_ref) {
      var wasClean = _ref.wasClean,
        code = _ref.code,
        reason = _ref.reason;
      logger.debug("WebSocket ".concat(this._url, " closed"));
      if (wasClean === false) {
        logger.debug('WebSocket abrupt disconnection');
      }
      this.ondisconnect(!wasClean, code, reason);
    }
  }, {
    key: "_onMessage",
    value: function _onMessage(_ref2) {
      var data = _ref2.data;
      logger.debug('received WebSocket message');
      this.ondata(data);
    }
  }, {
    key: "_onError",
    value: function _onError(e) {
      logger.warn("WebSocket ".concat(this._url, " error: "), e);
    }
  }]);
}();