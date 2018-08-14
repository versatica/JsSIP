'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var JsSIP_C = require('../Constants');
var Grammar = require('../Grammar');
var Utils = require('../Utils');
var debug = require('react-native-debug')('JsSIP:RTCSession:ReferSubscriber');

module.exports = function (_EventEmitter) {
  _inherits(ReferSubscriber, _EventEmitter);

  function ReferSubscriber(session) {
    _classCallCheck(this, ReferSubscriber);

    var _this = _possibleConstructorReturn(this, (ReferSubscriber.__proto__ || Object.getPrototypeOf(ReferSubscriber)).call(this));

    _this._id = null;
    _this._session = session;
    return _this;
  }

  _createClass(ReferSubscriber, [{
    key: 'sendRefer',
    value: function sendRefer(target) {
      var _this2 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      debug('sendRefer()');

      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var eventHandlers = options.eventHandlers || {};

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
        replaces += ';to-tag=' + options.replaces._to_tag;
        replaces += ';from-tag=' + options.replaces._from_tag;

        replaces = encodeURIComponent(replaces);
      }

      // Refer-To header field.
      var referTo = 'Refer-To: <' + target + (replaces ? '?Replaces=' + replaces : '') + '>';

      extraHeaders.push(referTo);

      extraHeaders.push('Contact: ' + this._session.contact);

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
    key: 'receiveNotify',
    value: function receiveNotify(request) {
      debug('receiveNotify()');

      if (!request.body) {
        return;
      }

      var status_line = Grammar.parse(request.body.trim(), 'Status_Line');

      if (status_line === -1) {
        debug('receiveNotify() | error parsing NOTIFY body: "' + request.body + '"');

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
    key: '_requestSucceeded',
    value: function _requestSucceeded(response) {
      debug('REFER succeeded');

      debug('emit "requestSucceeded"');

      this.emit('requestSucceeded', {
        response: response
      });
    }
  }, {
    key: '_requestFailed',
    value: function _requestFailed(response, cause) {
      debug('REFER failed');

      debug('emit "requestFailed"');

      this.emit('requestFailed', {
        response: response || null,
        cause: cause
      });
    }
  }, {
    key: 'id',
    get: function get() {
      return this._id;
    }
  }]);

  return ReferSubscriber;
}(EventEmitter);