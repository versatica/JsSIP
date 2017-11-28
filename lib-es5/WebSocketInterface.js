'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Grammar = require('./Grammar');
var debug = require('debug')('JsSIP:WebSocketInterface');
var debugerror = require('debug')('JsSIP:ERROR:WebSocketInterface');

debugerror.log = console.warn.bind(console);

module.exports = function () {
  function WebSocketInterface(url) {
    _classCallCheck(this, WebSocketInterface);

    debug('new() [url:"%s"]', url);

    this._url = url;
    this._sip_uri = null;
    this._via_transport = null;
    this.ws = null;

    var parsed_url = Grammar.parse(url, 'absoluteURI');

    if (parsed_url === -1) {
      debugerror('invalid WebSocket URI: ' + url);
      throw new TypeError('Invalid argument: ' + url);
    } else if (parsed_url.scheme !== 'wss' && parsed_url.scheme !== 'ws') {
      debugerror('invalid WebSocket URI scheme: ' + parsed_url.scheme);
      throw new TypeError('Invalid argument: ' + url);
    } else {
      this._sip_uri = 'sip:' + parsed_url.host + (parsed_url.port ? ':' + parsed_url.port : '') + ';transport=ws';
      this._via_transport = parsed_url.scheme.toUpperCase();
    }
  }

  _createClass(WebSocketInterface, [{
    key: 'connect',
    value: function connect() {
      debug('connect()');

      if (this.isConnected()) {
        debug('WebSocket ' + this._url + ' is already connected');

        return;
      } else if (this.isConnecting()) {
        debug('WebSocket ' + this._url + ' is connecting');

        return;
      }

      if (this._ws) {
        this.disconnect();
      }

      debug('connecting to WebSocket ' + this._url);

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
    key: 'disconnect',
    value: function disconnect() {
      debug('disconnect()');

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
    key: 'send',
    value: function send(message) {
      debug('send()');

      if (this.isConnected()) {
        this._ws.send(message);

        return true;
      } else {
        debugerror('unable to send message, WebSocket is not open');

        return false;
      }
    }
  }, {
    key: 'isConnected',
    value: function isConnected() {
      return this._ws && this._ws.readyState === this._ws.OPEN;
    }
  }, {
    key: 'isConnecting',
    value: function isConnecting() {
      return this._ws && this._ws.readyState === this._ws.CONNECTING;
    }

    /**
     * WebSocket Event Handlers
     */

  }, {
    key: '_onOpen',
    value: function _onOpen() {
      debug('WebSocket ' + this._url + ' connected');

      this.onconnect();
    }
  }, {
    key: '_onClose',
    value: function _onClose(_ref) {
      var wasClean = _ref.wasClean,
          code = _ref.code,
          reason = _ref.reason;

      debug('WebSocket ' + this._url + ' closed');

      if (wasClean === false) {
        debug('WebSocket abrupt disconnection');
      }

      var data = {
        socket: this,
        error: !wasClean,
        code: code,
        reason: reason
      };

      this.ondisconnect(data);
    }
  }, {
    key: '_onMessage',
    value: function _onMessage(_ref2) {
      var data = _ref2.data;

      debug('received WebSocket message');

      this.ondata(data);
    }
  }, {
    key: '_onError',
    value: function _onError(e) {
      debugerror('WebSocket ' + this._url + ' error: ' + e);
    }
  }, {
    key: 'via_transport',
    get: function get() {
      return this._via_transport;
    },
    set: function set(value) {
      this._via_transport = value.toUpperCase();
    }
  }, {
    key: 'sip_uri',
    get: function get() {
      return this._sip_uri;
    }
  }, {
    key: 'url',
    get: function get() {
      return this._url;
    }
  }]);

  return WebSocketInterface;
}();