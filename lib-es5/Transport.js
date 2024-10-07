"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Logger = require('./Logger');
var Socket = require('./Socket');
var JsSIP_C = require('./Constants');
var logger = new Logger('Transport');

/**
 * Constants
 */
var C = {
  // Transport status.
  STATUS_CONNECTED: 0,
  STATUS_CONNECTING: 1,
  STATUS_DISCONNECTED: 2,
  // Socket status.
  SOCKET_STATUS_READY: 0,
  SOCKET_STATUS_ERROR: 1,
  // Recovery options.
  recovery_options: {
    // minimum interval in seconds between recover attempts.
    min_interval: JsSIP_C.CONNECTION_RECOVERY_MIN_INTERVAL,
    // maximum interval in seconds between recover attempts.
    max_interval: JsSIP_C.CONNECTION_RECOVERY_MAX_INTERVAL
  }
};

/*
 * Manages one or multiple JsSIP.Socket instances.
 * Is reponsible for transport recovery logic among all socket instances.
 *
 * @socket JsSIP::Socket instance
 */
module.exports = /*#__PURE__*/function () {
  function Transport(sockets) {
    var recovery_options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : C.recovery_options;
    _classCallCheck(this, Transport);
    logger.debug('new()');
    this.status = C.STATUS_DISCONNECTED;

    // Current socket.
    this.socket = null;

    // Socket collection.
    this.sockets = [];
    this.recovery_options = recovery_options;
    this.recover_attempts = 0;
    this.recovery_timer = null;
    this.close_requested = false;

    // It seems that TextDecoder is not available in some versions of React-Native.
    // See https://github.com/versatica/JsSIP/issues/695
    try {
      this.textDecoder = new TextDecoder('utf8');
    } catch (error) {
      logger.warn("cannot use TextDecoder: ".concat(error));
    }
    if (typeof sockets === 'undefined') {
      throw new TypeError('Invalid argument.' + ' undefined \'sockets\' argument');
    }
    if (!(sockets instanceof Array)) {
      sockets = [sockets];
    }
    sockets.forEach(function (socket) {
      if (!Socket.isSocket(socket.socket)) {
        throw new TypeError('Invalid argument.' + ' invalid \'JsSIP.Socket\' instance');
      }
      if (socket.weight && !Number(socket.weight)) {
        throw new TypeError('Invalid argument.' + ' \'weight\' attribute is not a number');
      }
      this.sockets.push({
        socket: socket.socket,
        weight: socket.weight || 0,
        status: C.SOCKET_STATUS_READY
      });
    }, this);

    // Get the socket with higher weight.
    this._getSocket();
  }

  /**
   * Instance Methods
   */
  return _createClass(Transport, [{
    key: "via_transport",
    get: function get() {
      return this.socket.via_transport;
    }
  }, {
    key: "url",
    get: function get() {
      return this.socket.url;
    }
  }, {
    key: "sip_uri",
    get: function get() {
      return this.socket.sip_uri;
    }
  }, {
    key: "connect",
    value: function connect() {
      logger.debug('connect()');
      if (this.isConnected()) {
        logger.debug('Transport is already connected');
        return;
      } else if (this.isConnecting()) {
        logger.debug('Transport is connecting');
        return;
      }
      this.close_requested = false;
      this.status = C.STATUS_CONNECTING;
      this.onconnecting({
        socket: this.socket,
        attempts: this.recover_attempts
      });
      if (!this.close_requested) {
        // Bind socket event callbacks.
        this.socket.onconnect = this._onConnect.bind(this);
        this.socket.ondisconnect = this._onDisconnect.bind(this);
        this.socket.ondata = this._onData.bind(this);
        this.socket.connect();
      }
      return;
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      logger.debug('close()');
      this.close_requested = true;
      this.recover_attempts = 0;
      this.status = C.STATUS_DISCONNECTED;

      // Clear recovery_timer.
      if (this.recovery_timer !== null) {
        clearTimeout(this.recovery_timer);
        this.recovery_timer = null;
      }

      // Unbind socket event callbacks.
      this.socket.onconnect = function () {};
      this.socket.ondisconnect = function () {};
      this.socket.ondata = function () {};
      this.socket.disconnect();
      this.ondisconnect({
        socket: this.socket,
        error: false
      });
    }
  }, {
    key: "send",
    value: function send(data) {
      logger.debug('send()');
      if (!this.isConnected()) {
        logger.warn('unable to send message, transport is not connected');
        return false;
      }
      var message = data.toString();
      logger.debug("sending message:\n\n".concat(message, "\n"));
      return this.socket.send(message);
    }
  }, {
    key: "isConnected",
    value: function isConnected() {
      return this.status === C.STATUS_CONNECTED;
    }
  }, {
    key: "isConnecting",
    value: function isConnecting() {
      return this.status === C.STATUS_CONNECTING;
    }

    /**
     * Private API.
     */
  }, {
    key: "_reconnect",
    value: function _reconnect() {
      var _this = this;
      this.recover_attempts += 1;
      var k = Math.floor(Math.random() * Math.pow(2, this.recover_attempts) + 1);
      if (k < this.recovery_options.min_interval) {
        k = this.recovery_options.min_interval;
      } else if (k > this.recovery_options.max_interval) {
        k = this.recovery_options.max_interval;
      }
      logger.debug("reconnection attempt: ".concat(this.recover_attempts, ". next connection attempt in ").concat(k, " seconds"));
      this.recovery_timer = setTimeout(function () {
        if (!_this.close_requested && !(_this.isConnected() || _this.isConnecting())) {
          // Get the next available socket with higher weight.
          _this._getSocket();

          // Connect the socket.
          _this.connect();
        }
      }, k * 1000);
    }

    /**
     * get the next available socket with higher weight
     */
  }, {
    key: "_getSocket",
    value: function _getSocket() {
      var candidates = [];
      this.sockets.forEach(function (socket) {
        if (socket.status === C.SOCKET_STATUS_ERROR) {
          return; // continue the array iteration
        } else if (candidates.length === 0) {
          candidates.push(socket);
        } else if (socket.weight > candidates[0].weight) {
          candidates = [socket];
        } else if (socket.weight === candidates[0].weight) {
          candidates.push(socket);
        }
      });
      if (candidates.length === 0) {
        // All sockets have failed. reset sockets status.
        this.sockets.forEach(function (socket) {
          socket.status = C.SOCKET_STATUS_READY;
        });

        // Get next available socket.
        this._getSocket();
        return;
      }
      var idx = Math.floor(Math.random() * candidates.length);
      this.socket = candidates[idx].socket;
    }

    /**
     * Socket Event Handlers
     */
  }, {
    key: "_onConnect",
    value: function _onConnect() {
      this.recover_attempts = 0;
      this.status = C.STATUS_CONNECTED;

      // Clear recovery_timer.
      if (this.recovery_timer !== null) {
        clearTimeout(this.recovery_timer);
        this.recovery_timer = null;
      }
      this.onconnect({
        socket: this
      });
    }
  }, {
    key: "_onDisconnect",
    value: function _onDisconnect(error, code, reason) {
      this.status = C.STATUS_DISCONNECTED;
      this.ondisconnect({
        socket: this.socket,
        error: error,
        code: code,
        reason: reason
      });
      if (this.close_requested) {
        return;
      }

      // Update socket status.
      else {
        this.sockets.forEach(function (socket) {
          if (this.socket === socket.socket) {
            socket.status = C.SOCKET_STATUS_ERROR;
          }
        }, this);
      }
      this._reconnect(error);
    }
  }, {
    key: "_onData",
    value: function _onData(data) {
      // CRLF Keep Alive request from server, reply.
      if (data === '\r\n\r\n') {
        logger.debug('received message with double-CRLF Keep Alive request');
        try {
          // Reply with single CRLF.
          this.socket.send('\r\n');
        } catch (error) {
          logger.warn("error sending Keep Alive response: ".concat(error));
        }
        return;
      }

      // CRLF Keep Alive response from server, ignore it.
      if (data === '\r\n') {
        logger.debug('received message with CRLF Keep Alive response');
        return;
      }

      // Binary message.
      else if (typeof data !== 'string') {
        try {
          if (this.textDecoder) data = this.textDecoder.decode(data);else data = String.fromCharCode.apply(null, new Uint8Array(data));
        } catch (evt) {
          logger.debug('received binary message failed to be converted into string,' + ' message discarded');
          return;
        }
        logger.debug("received binary message:\n\n".concat(data, "\n"));
      }

      // Text message.
      else {
        logger.debug("received text message:\n\n".concat(data, "\n"));
      }
      this.ondata({
        transport: this,
        message: data
      });
    }
  }]);
}();