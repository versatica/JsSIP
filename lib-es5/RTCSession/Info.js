'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var debugerror = require('debug')('JsSIP:ERROR:RTCSession:Info');

debugerror.log = console.warn.bind(console);
var JsSIP_C = require('../Constants');
var Exceptions = require('../Exceptions');
var Utils = require('../Utils');

module.exports = function (_EventEmitter) {
  _inherits(Info, _EventEmitter);

  function Info(session) {
    _classCallCheck(this, Info);

    var _this = _possibleConstructorReturn(this, (Info.__proto__ || Object.getPrototypeOf(Info)).call(this));

    _this._session = session;
    _this._direction = null;
    _this._contentType = null;
    _this._body = null;
    return _this;
  }

  _createClass(Info, [{
    key: 'send',
    value: function send(contentType, body) {
      var _this2 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      this._direction = 'outgoing';

      if (contentType === undefined) {
        throw new TypeError('Not enough arguments');
      }

      // Check RTCSession Status.
      if (this._session.status !== this._session.C.STATUS_CONFIRMED && this._session.status !== this._session.C.STATUS_WAITING_FOR_ACK) {
        throw new Exceptions.InvalidStateError(this._session.status);
      }

      this._contentType = contentType;
      this._body = body;

      var extraHeaders = Utils.cloneArray(options.extraHeaders);

      extraHeaders.push('Content-Type: ' + contentType);

      this._session.newInfo({
        originator: 'local',
        info: this,
        request: this.request
      });

      this._session.sendRequest(this, JsSIP_C.INFO, {
        extraHeaders: extraHeaders,
        eventHandlers: {
          onSuccessResponse: function onSuccessResponse(response) {
            _this2.emit('succeeded', {
              originator: 'remote',
              response: response
            });
          },
          onErrorResponse: function onErrorResponse(response) {
            _this2.emit('failed', {
              originator: 'remote',
              response: response
            });
          },
          onTransportError: function onTransportError() {
            _this2._session.onTransportError();
          },
          onRequestTimeout: function onRequestTimeout() {
            _this2._session.onRequestTimeout();
          },
          onDialogError: function onDialogError() {
            _this2._session.onDialogError();
          }
        },
        body: body
      });
    }
  }, {
    key: 'init_incoming',
    value: function init_incoming(request) {
      this._direction = 'incoming';
      this.request = request;

      request.reply(200);

      this._contentType = request.getHeader('content-type');
      this._body = request.body;

      this._session.newInfo({
        originator: 'remote',
        info: this,
        request: request
      });
    }
  }, {
    key: 'contentType',
    get: function get() {
      return this._contentType;
    }
  }, {
    key: 'body',
    get: function get() {
      return this._body;
    }
  }]);

  return Info;
}(EventEmitter);