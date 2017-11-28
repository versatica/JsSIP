'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var JsSIP_C = require('./Constants');
var SIPMessage = require('./SIPMessage');
var Utils = require('./Utils');
var RequestSender = require('./RequestSender');
var Exceptions = require('./Exceptions');
var debug = require('debug')('JsSIP:Message');

module.exports = function (_EventEmitter) {
  _inherits(Message, _EventEmitter);

  function Message(ua) {
    _classCallCheck(this, Message);

    var _this = _possibleConstructorReturn(this, (Message.__proto__ || Object.getPrototypeOf(Message)).call(this));

    _this._ua = ua;
    _this._request = null;
    _this._closed = false;

    _this._direction = null;
    _this._local_identity = null;
    _this._remote_identity = null;

    // Whether an incoming message has been replied.
    _this._is_replied = false;

    // Custom message empty object for high level use.
    _this._data = {};
    return _this;
  }

  _createClass(Message, [{
    key: 'send',
    value: function send(target, body) {
      var _this2 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var originalTarget = target;

      if (target === undefined || body === undefined) {
        throw new TypeError('Not enough arguments');
      }

      // Check target validity.
      target = this._ua.normalizeTarget(target);
      if (!target) {
        throw new TypeError('Invalid target: ' + originalTarget);
      }

      // Get call options.
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var eventHandlers = options.eventHandlers || {};
      var contentType = options.contentType || 'text/plain';

      // Set event handlers.
      for (var event in eventHandlers) {
        if (Object.prototype.hasOwnProperty.call(eventHandlers, event)) {
          this.on(event, eventHandlers[event]);
        }
      }

      extraHeaders.push('Content-Type: ' + contentType);

      this._request = new SIPMessage.OutgoingRequest(JsSIP_C.MESSAGE, target, this._ua, null, extraHeaders);

      if (body) {
        this._request.body = body;
      }

      var request_sender = new RequestSender(this._ua, this._request, {
        onRequestTimeout: function onRequestTimeout() {
          _this2._onRequestTimeout();
        },
        onTransportError: function onTransportError() {
          _this2._onTransportError();
        },
        onReceiveResponse: function onReceiveResponse(response) {
          _this2._receiveResponse(response);
        }
      });

      this._newMessage('local', this._request);

      request_sender.send();
    }
  }, {
    key: 'init_incoming',
    value: function init_incoming(request) {
      this._request = request;

      this._newMessage('remote', request);

      // Reply with a 200 OK if the user didn't reply.
      if (!this._is_replied) {
        this._is_replied = true;
        request.reply(200);
      }

      this._close();
    }

    /**
     * Accept the incoming Message
     * Only valid for incoming Messages
     */

  }, {
    key: 'accept',
    value: function accept() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var body = options.body;

      if (this._direction !== 'incoming') {
        throw new Exceptions.NotSupportedError('"accept" not supported for outgoing Message');
      }

      if (this._is_replied) {
        throw new Error('incoming Message already replied');
      }

      this._is_replied = true;
      this._request.reply(200, null, extraHeaders, body);
    }

    /**
     * Reject the incoming Message
     * Only valid for incoming Messages
     */

  }, {
    key: 'reject',
    value: function reject() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var status_code = options.status_code || 480;
      var reason_phrase = options.reason_phrase;
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var body = options.body;

      if (this._direction !== 'incoming') {
        throw new Exceptions.NotSupportedError('"reject" not supported for outgoing Message');
      }

      if (this._is_replied) {
        throw new Error('incoming Message already replied');
      }

      if (status_code < 300 || status_code >= 700) {
        throw new TypeError('Invalid status_code: ' + status_code);
      }

      this._is_replied = true;
      this._request.reply(status_code, reason_phrase, extraHeaders, body);
    }
  }, {
    key: '_receiveResponse',
    value: function _receiveResponse(response) {
      if (this._closed) {
        return;
      }
      switch (true) {
        case /^1[0-9]{2}$/.test(response.status_code):
          // Ignore provisional responses.
          break;

        case /^2[0-9]{2}$/.test(response.status_code):
          this._succeeded('remote', response);
          break;

        default:
          {
            var cause = Utils.sipErrorCause(response.status_code);

            this._failed('remote', response, cause);
            break;
          }
      }
    }
  }, {
    key: '_onRequestTimeout',
    value: function _onRequestTimeout() {
      if (this._closed) {
        return;
      }
      this._failed('system', null, JsSIP_C.causes.REQUEST_TIMEOUT);
    }
  }, {
    key: '_onTransportError',
    value: function _onTransportError() {
      if (this._closed) {
        return;
      }
      this._failed('system', null, JsSIP_C.causes.CONNECTION_ERROR);
    }
  }, {
    key: '_close',
    value: function _close() {
      this._closed = true;
      this._ua.destroyMessage(this);
    }

    /**
     * Internal Callbacks
     */

  }, {
    key: '_newMessage',
    value: function _newMessage(originator, request) {
      if (originator === 'remote') {
        this._direction = 'incoming';
        this._local_identity = request.to;
        this._remote_identity = request.from;
      } else if (originator === 'local') {
        this._direction = 'outgoing';
        this._local_identity = request.from;
        this._remote_identity = request.to;
      }

      this._ua.newMessage(this, {
        originator: originator,
        message: this,
        request: request
      });
    }
  }, {
    key: '_failed',
    value: function _failed(originator, response, cause) {
      debug('MESSAGE failed');

      this._close();

      debug('emit "failed"');

      this.emit('failed', {
        originator: originator,
        response: response || null,
        cause: cause
      });
    }
  }, {
    key: '_succeeded',
    value: function _succeeded(originator, response) {
      debug('MESSAGE succeeded');

      this._close();

      debug('emit "succeeded"');

      this.emit('succeeded', {
        originator: originator,
        response: response
      });
    }
  }, {
    key: 'direction',
    get: function get() {
      return this._direction;
    }
  }, {
    key: 'local_identity',
    get: function get() {
      return this._local_identity;
    }
  }, {
    key: 'remote_identity',
    get: function get() {
      return this._remote_identity;
    }
  }]);

  return Message;
}(EventEmitter);