'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Socket = require('./Socket');
var debug = require('react-native-debug')('JsSIP:Transport');
var debugerror = require('react-native-debug')('JsSIP:ERROR:Transport');

debugerror.log = console.warn.bind(console);

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
    min_interval: 2, // minimum interval in seconds between recover attempts
    max_interval: 30 // maximum interval in seconds between recover attempts
  }
};

/*
 * Manages one or multiple JsSIP.Socket instances.
 * Is reponsible for transport recovery logic among all socket instances.
 *
 * @socket JsSIP::Socket instance
 */
module.exports = function () {
  function Transport(sockets) {
    var recovery_options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : C.recovery_options;

    _classCallCheck(this, Transport);

    debug('new()');

    this.status = C.STATUS_DISCONNECTED;

    // Current socket.
    this.socket = null;

    // Socket collection.
    this.sockets = [];

    this.recovery_options = recovery_options;
    this.recover_attempts = 0;
    this.recovery_timer = null;

    this.close_requested = false;

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

  _createClass(Transport, [{
    key: 'connect',
    value: function connect() {
      debug('connect()');

      if (this.isConnected()) {
        debug('Transport is already connected');

        return;
      } else if (this.isConnecting()) {
        debug('Transport is connecting');

        return;
      }

      this.close_requested = false;
      this.status = C.STATUS_CONNECTING;
      this.onconnecting({ socket: this.socket, attempts: this.recover_attempts });

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
    key: 'disconnect',
    value: function disconnect() {
      debug('close()');

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
    key: 'send',
    value: function send(data) {
      debug('send()');

      if (!this.isConnected()) {
        debugerror('unable to send message, transport is not connected');

        return false;
      }

      var message = data.toString();

      debug('sending message:\n\n' + message + '\n');

      return this.socket.send(message);
    }
  }, {
    key: 'isConnected',
    value: function isConnected() {
      return this.status === C.STATUS_CONNECTED;
    }
  }, {
    key: 'isConnecting',
    value: function isConnecting() {
      return this.status === C.STATUS_CONNECTING;
    }

    /**
     * Private API.
     */

  }, {
    key: '_reconnect',
    value: function _reconnect() {
      var _this = this;

      this.recover_attempts += 1;

      var k = Math.floor(Math.random() * Math.pow(2, this.recover_attempts) + 1);

      if (k < this.recovery_options.min_interval) {
        k = this.recovery_options.min_interval;
      } else if (k > this.recovery_options.max_interval) {
        k = this.recovery_options.max_interval;
      }

      debug('reconnection attempt: ' + this.recover_attempts + '. next connection attempt in ' + k + ' seconds');

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
    key: '_getSocket',
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
    key: '_onConnect',
    value: function _onConnect() {
      this.recover_attempts = 0;
      this.status = C.STATUS_CONNECTED;

      // Clear recovery_timer.
      if (this.recovery_timer !== null) {
        clearTimeout(this.recovery_timer);
        this.recovery_timer = null;
      }

      this.onconnect({ socket: this });
    }
  }, {
    key: '_onDisconnect',
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
    key: '_onData',
    value: function _onData(data) {
      // CRLF Keep Alive response from server. Ignore it.
      if (data === '\r\n') {
        debug('received message with CRLF Keep Alive response');

        return;
      }

      // Binary message.
      else if (typeof data !== 'string') {
          try {
            data = String.fromCharCode.apply(null, new Uint8Array(data));
          } catch (evt) {
            debug('received binary message failed to be converted into string,' + ' message discarded');

            return;
          }

          debug('received binary message:\n\n' + data + '\n');
        }

        // Text message.
        else {
            debug('received text message:\n\n' + data + '\n');
          }

      this.ondata({ transport: this, message: data });
    }
  }, {
    key: 'via_transport',
    get: function get() {
      return this.socket.via_transport;
    }
  }, {
    key: 'url',
    get: function get() {
      return this.socket.url;
    }
  }, {
    key: 'sip_uri',
    get: function get() {
      return this.socket.sip_uri;
    }
  }]);

  return Transport;
}();