/*
 * JsSIP v3.0.19
 * the Javascript SIP library
 * Copyright: 2012-2017 José Luis Millán <jmillan@aliax.net> (https://github.com/jmillan)
 * Homepage: http://jssip.net
 * License: MIT
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.JsSIP = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Utils = require('./Utils');
var JsSIP_C = require('./Constants');
var Grammar = require('./Grammar');
var URI = require('./URI');
var Socket = require('./Socket');
var Exceptions = require('./Exceptions');

// Default settings.
exports.settings = {
  // SIP authentication.
  authorization_user: null,
  password: null,
  realm: null,
  ha1: null,

  // SIP account.
  display_name: null,
  uri: null,
  contact_uri: null,

  // SIP instance id (GRUU).
  instance_id: null,

  // Preloaded SIP Route header field.
  use_preloaded_route: false,

  // Session parameters.
  session_timers: true,
  no_answer_timeout: 60,

  // Registration parameters.
  register: true,
  register_expires: 600,
  registrar_server: null,

  // Connection options.
  sockets: null,
  connection_recovery_max_interval: null,
  connection_recovery_min_interval: null,

  /*
   * Host address.
   * Value to be set in Via sent_by and host part of Contact FQDN.
  */
  via_host: Utils.createRandomToken(12) + '.invalid'
};

// Configuration checks.
var checks = {
  mandatory: {
    sockets: function sockets(_sockets2) {
      /* Allow defining sockets parameter as:
       *  Socket: socket
       *  Array of Socket: [socket1, socket2]
       *  Array of Objects: [{socket: socket1, weight:1}, {socket: Socket2, weight:0}]
       *  Array of Objects and Socket: [{socket: socket1}, socket2]
       */
      var _sockets = [];

      if (Socket.isSocket(_sockets2)) {
        _sockets.push({ socket: _sockets2 });
      } else if (Array.isArray(_sockets2) && _sockets2.length) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _sockets2[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var socket = _step.value;

            if (Socket.isSocket(socket)) {
              _sockets.push({ socket: socket });
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      } else {
        return;
      }

      return _sockets;
    },
    uri: function uri(_uri) {
      if (!/^sip:/i.test(_uri)) {
        _uri = JsSIP_C.SIP + ':' + _uri;
      }
      var parsed = URI.parse(_uri);

      if (!parsed) {
        return;
      } else if (!parsed.user) {
        return;
      } else {
        return parsed;
      }
    }
  },

  optional: {
    authorization_user: function authorization_user(_authorization_user) {
      if (Grammar.parse('"' + _authorization_user + '"', 'quoted_string') === -1) {
        return;
      } else {
        return _authorization_user;
      }
    },
    connection_recovery_max_interval: function connection_recovery_max_interval(_connection_recovery_max_interval) {
      if (Utils.isDecimal(_connection_recovery_max_interval)) {
        var value = Number(_connection_recovery_max_interval);

        if (value > 0) {
          return value;
        }
      }
    },
    connection_recovery_min_interval: function connection_recovery_min_interval(_connection_recovery_min_interval) {
      if (Utils.isDecimal(_connection_recovery_min_interval)) {
        var value = Number(_connection_recovery_min_interval);

        if (value > 0) {
          return value;
        }
      }
    },
    contact_uri: function contact_uri(_contact_uri) {
      if (typeof _contact_uri === 'string') {
        var uri = Grammar.parse(_contact_uri, 'SIP_URI');

        if (uri !== -1) {
          return uri;
        }
      }
    },
    display_name: function display_name(_display_name) {
      if (Grammar.parse('"' + _display_name + '"', 'display_name') === -1) {
        return;
      } else {
        return _display_name;
      }
    },
    instance_id: function instance_id(_instance_id) {
      if (/^uuid:/i.test(_instance_id)) {
        _instance_id = _instance_id.substr(5);
      }

      if (Grammar.parse(_instance_id, 'uuid') === -1) {
        return;
      } else {
        return _instance_id;
      }
    },
    no_answer_timeout: function no_answer_timeout(_no_answer_timeout) {
      if (Utils.isDecimal(_no_answer_timeout)) {
        var value = Number(_no_answer_timeout);

        if (value > 0) {
          return value;
        }
      }
    },
    session_timers: function session_timers(_session_timers) {
      if (typeof _session_timers === 'boolean') {
        return _session_timers;
      }
    },
    password: function password(_password) {
      return String(_password);
    },
    realm: function realm(_realm) {
      return String(_realm);
    },
    ha1: function ha1(_ha) {
      return String(_ha);
    },
    register: function register(_register) {
      if (typeof _register === 'boolean') {
        return _register;
      }
    },
    register_expires: function register_expires(_register_expires) {
      if (Utils.isDecimal(_register_expires)) {
        var value = Number(_register_expires);

        if (value > 0) {
          return value;
        }
      }
    },
    registrar_server: function registrar_server(_registrar_server) {
      if (!/^sip:/i.test(_registrar_server)) {
        _registrar_server = JsSIP_C.SIP + ':' + _registrar_server;
      }

      var parsed = URI.parse(_registrar_server);

      if (!parsed) {
        return;
      } else if (parsed.user) {
        return;
      } else {
        return parsed;
      }
    },
    use_preloaded_route: function use_preloaded_route(_use_preloaded_route) {
      if (typeof _use_preloaded_route === 'boolean') {
        return _use_preloaded_route;
      }
    }
  }
};

exports.load = function (dst, src) {
  // Check Mandatory parameters.
  for (var parameter in checks.mandatory) {
    if (!src.hasOwnProperty(parameter)) {
      throw new Exceptions.ConfigurationError(parameter);
    } else {
      var value = src[parameter];
      var checked_value = checks.mandatory[parameter](value);

      if (checked_value !== undefined) {
        dst[parameter] = checked_value;
      } else {
        throw new Exceptions.ConfigurationError(parameter, value);
      }
    }
  }

  // Check Optional parameters.
  for (var _parameter in checks.optional) {
    if (src.hasOwnProperty(_parameter)) {
      var _value = src[_parameter];

      /* If the parameter value is null, empty string, undefined, empty array
       * or it's a number with NaN value, then apply its default value.
       */
      if (Utils.isEmpty(_value)) {
        continue;
      }

      var _checked_value = checks.optional[_parameter](_value);

      if (_checked_value !== undefined) {
        dst[_parameter] = _checked_value;
      } else {
        throw new Exceptions.ConfigurationError(_parameter, _value);
      }
    }
  }
};

},{"./Constants":2,"./Exceptions":6,"./Grammar":7,"./Socket":20,"./URI":25,"./Utils":26}],2:[function(require,module,exports){
'use strict';

var pkg = require('../package.json');

module.exports = {
  USER_AGENT: pkg.title + ' ' + pkg.version,

  // SIP scheme.
  SIP: 'sip',
  SIPS: 'sips',

  // End and Failure causes.
  causes: {
    // Generic error causes.
    CONNECTION_ERROR: 'Connection Error',
    REQUEST_TIMEOUT: 'Request Timeout',
    SIP_FAILURE_CODE: 'SIP Failure Code',
    INTERNAL_ERROR: 'Internal Error',

    // SIP error causes.
    BUSY: 'Busy',
    REJECTED: 'Rejected',
    REDIRECTED: 'Redirected',
    UNAVAILABLE: 'Unavailable',
    NOT_FOUND: 'Not Found',
    ADDRESS_INCOMPLETE: 'Address Incomplete',
    INCOMPATIBLE_SDP: 'Incompatible SDP',
    MISSING_SDP: 'Missing SDP',
    AUTHENTICATION_ERROR: 'Authentication Error',

    // Session error causes.
    BYE: 'Terminated',
    WEBRTC_ERROR: 'WebRTC Error',
    CANCELED: 'Canceled',
    NO_ANSWER: 'No Answer',
    EXPIRES: 'Expires',
    NO_ACK: 'No ACK',
    DIALOG_ERROR: 'Dialog Error',
    USER_DENIED_MEDIA_ACCESS: 'User Denied Media Access',
    BAD_MEDIA_DESCRIPTION: 'Bad Media Description',
    RTP_TIMEOUT: 'RTP Timeout'
  },

  SIP_ERROR_CAUSES: {
    REDIRECTED: [300, 301, 302, 305, 380],
    BUSY: [486, 600],
    REJECTED: [403, 603],
    NOT_FOUND: [404, 604],
    UNAVAILABLE: [480, 410, 408, 430],
    ADDRESS_INCOMPLETE: [484, 424],
    INCOMPATIBLE_SDP: [488, 606],
    AUTHENTICATION_ERROR: [401, 407]
  },

  // SIP Methods.
  ACK: 'ACK',
  BYE: 'BYE',
  CANCEL: 'CANCEL',
  INFO: 'INFO',
  INVITE: 'INVITE',
  MESSAGE: 'MESSAGE',
  NOTIFY: 'NOTIFY',
  OPTIONS: 'OPTIONS',
  REGISTER: 'REGISTER',
  REFER: 'REFER',
  UPDATE: 'UPDATE',
  SUBSCRIBE: 'SUBSCRIBE',

  /* SIP Response Reasons
   * DOC: http://www.iana.org/assignments/sip-parameters
   * Copied from https://github.com/versatica/OverSIP/blob/master/lib/oversip/sip/constants.rb#L7
   */
  REASON_PHRASE: {
    100: 'Trying',
    180: 'Ringing',
    181: 'Call Is Being Forwarded',
    182: 'Queued',
    183: 'Session Progress',
    199: 'Early Dialog Terminated', // draft-ietf-sipcore-199
    200: 'OK',
    202: 'Accepted', // RFC 3265
    204: 'No Notification', // RFC 5839
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Moved Temporarily',
    305: 'Use Proxy',
    380: 'Alternative Service',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    410: 'Gone',
    412: 'Conditional Request Failed', // RFC 3903
    413: 'Request Entity Too Large',
    414: 'Request-URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Unsupported URI Scheme',
    417: 'Unknown Resource-Priority', // RFC 4412
    420: 'Bad Extension',
    421: 'Extension Required',
    422: 'Session Interval Too Small', // RFC 4028
    423: 'Interval Too Brief',
    424: 'Bad Location Information', // RFC 6442
    428: 'Use Identity Header', // RFC 4474
    429: 'Provide Referrer Identity', // RFC 3892
    430: 'Flow Failed', // RFC 5626
    433: 'Anonymity Disallowed', // RFC 5079
    436: 'Bad Identity-Info', // RFC 4474
    437: 'Unsupported Certificate', // RFC 4744
    438: 'Invalid Identity Header', // RFC 4744
    439: 'First Hop Lacks Outbound Support', // RFC 5626
    440: 'Max-Breadth Exceeded', // RFC 5393
    469: 'Bad Info Package', // draft-ietf-sipcore-info-events
    470: 'Consent Needed', // RFC 5360
    478: 'Unresolvable Destination', // Custom code copied from Kamailio.
    480: 'Temporarily Unavailable',
    481: 'Call/Transaction Does Not Exist',
    482: 'Loop Detected',
    483: 'Too Many Hops',
    484: 'Address Incomplete',
    485: 'Ambiguous',
    486: 'Busy Here',
    487: 'Request Terminated',
    488: 'Not Acceptable Here',
    489: 'Bad Event', // RFC 3265
    491: 'Request Pending',
    493: 'Undecipherable',
    494: 'Security Agreement Required', // RFC 3329
    500: 'JsSIP Internal Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Server Time-out',
    505: 'Version Not Supported',
    513: 'Message Too Large',
    580: 'Precondition Failure', // RFC 3312
    600: 'Busy Everywhere',
    603: 'Decline',
    604: 'Does Not Exist Anywhere',
    606: 'Not Acceptable'
  },

  ALLOWED_METHODS: 'INVITE,ACK,CANCEL,BYE,UPDATE,MESSAGE,OPTIONS,REFER,INFO',
  ACCEPTED_BODY_TYPES: 'application/sdp, application/dtmf-relay',
  MAX_FORWARDS: 69,
  SESSION_EXPIRES: 90,
  MIN_SESSION_EXPIRES: 60
};

},{"../package.json":51}],3:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SIPMessage = require('./SIPMessage');
var JsSIP_C = require('./Constants');
var Transactions = require('./Transactions');
var Dialog_RequestSender = require('./Dialog/RequestSender');
var Utils = require('./Utils');
var debug = require('debug')('JsSIP:Dialog');

var C = {
  // Dialog states.
  STATUS_EARLY: 1,
  STATUS_CONFIRMED: 2
};

// RFC 3261 12.1.
module.exports = function () {
  _createClass(Dialog, null, [{
    key: 'C',

    // Expose C object.
    get: function get() {
      return C;
    }
  }]);

  function Dialog(owner, message, type) {
    var state = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : C.STATUS_CONFIRMED;

    _classCallCheck(this, Dialog);

    this._owner = owner;
    this._ua = owner._ua;

    this._uac_pending_reply = false;
    this._uas_pending_reply = false;

    if (!message.hasHeader('contact')) {
      return {
        error: 'unable to create a Dialog without Contact header field'
      };
    }

    if (message instanceof SIPMessage.IncomingResponse) {
      state = message.status_code < 200 ? C.STATUS_EARLY : C.STATUS_CONFIRMED;
    }

    var contact = message.parseHeader('contact');

    // RFC 3261 12.1.1.
    if (type === 'UAS') {
      this._id = {
        call_id: message.call_id,
        local_tag: message.to_tag,
        remote_tag: message.from_tag,
        toString: function toString() {
          return this.call_id + this.local_tag + this.remote_tag;
        }
      };
      this._state = state;
      this._remote_seqnum = message.cseq;
      this._local_uri = message.parseHeader('to').uri;
      this._remote_uri = message.parseHeader('from').uri;
      this._remote_target = contact.uri;
      this._route_set = message.getHeaders('record-route');
      this._ack_seqnum = this._remote_seqnum;
    }
    // RFC 3261 12.1.2.
    else if (type === 'UAC') {
        this._id = {
          call_id: message.call_id,
          local_tag: message.from_tag,
          remote_tag: message.to_tag,
          toString: function toString() {
            return this.call_id + this.local_tag + this.remote_tag;
          }
        };
        this._state = state;
        this._local_seqnum = message.cseq;
        this._local_uri = message.parseHeader('from').uri;
        this._remote_uri = message.parseHeader('to').uri;
        this._remote_target = contact.uri;
        this._route_set = message.getHeaders('record-route').reverse();
        this._ack_seqnum = null;
      }

    this._ua.newDialog(this);
    debug('new ' + type + ' dialog created with status ' + (this._state === C.STATUS_EARLY ? 'EARLY' : 'CONFIRMED'));
  }

  _createClass(Dialog, [{
    key: 'update',
    value: function update(message, type) {
      this._state = C.STATUS_CONFIRMED;

      debug('dialog ' + this._id.toString() + '  changed to CONFIRMED state');

      if (type === 'UAC') {
        // RFC 3261 13.2.2.4.
        this._route_set = message.getHeaders('record-route').reverse();
      }
    }
  }, {
    key: 'terminate',
    value: function terminate() {
      debug('dialog ' + this._id.toString() + ' deleted');
      this._ua.destroyDialog(this);
    }
  }, {
    key: 'sendRequest',
    value: function sendRequest(method) {
      var _this = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var eventHandlers = options.eventHanlders || {};
      var body = options.body || null;
      var request = this._createRequest(method, extraHeaders, body);

      // Increase the local CSeq on authentication.
      eventHandlers.onAuthenticated = function () {
        _this._local_seqnum += 1;
      };

      var request_sender = new Dialog_RequestSender(this, request, eventHandlers);

      request_sender.send();

      // Return the instance of OutgoingRequest.
      return request;
    }
  }, {
    key: 'receiveRequest',
    value: function receiveRequest(request) {
      // Check in-dialog request.
      if (!this._checkInDialogRequest(request)) {
        return;
      }

      // ACK received. Cleanup this._ack_seqnum.
      if (request.method === JsSIP_C.ACK && this._ack_seqnum !== null) {
        this._ack_seqnum = null;
      }
      // INVITE received. Set this._ack_seqnum.
      else if (request.method === JsSIP_C.INVITE) {
          this._ack_seqnum = request.cseq;
        }

      this._owner.receiveRequest(request);
    }

    // RFC 3261 12.2.1.1.

  }, {
    key: '_createRequest',
    value: function _createRequest(method, extraHeaders, body) {
      extraHeaders = Utils.cloneArray(extraHeaders);

      if (!this._local_seqnum) {
        this._local_seqnum = Math.floor(Math.random() * 10000);
      }

      var cseq = method === JsSIP_C.CANCEL || method === JsSIP_C.ACK ? this._local_seqnum : this._local_seqnum += 1;

      var request = new SIPMessage.OutgoingRequest(method, this._remote_target, this._ua, {
        'cseq': cseq,
        'call_id': this._id.call_id,
        'from_uri': this._local_uri,
        'from_tag': this._id.local_tag,
        'to_uri': this._remote_uri,
        'to_tag': this._id.remote_tag,
        'route_set': this._route_set
      }, extraHeaders, body);

      return request;
    }

    // RFC 3261 12.2.2.

  }, {
    key: '_checkInDialogRequest',
    value: function _checkInDialogRequest(request) {
      var _this2 = this;

      if (!this._remote_seqnum) {
        this._remote_seqnum = request.cseq;
      } else if (request.cseq < this._remote_seqnum) {
        if (request.method === JsSIP_C.ACK) {
          // We are not expecting any ACK with lower seqnum than the current one.
          // Or this is not the ACK we are waiting for.
          if (this._ack_seqnum === null || request.cseq !== this._ack_seqnum) {
            return false;
          }
        } else {
          request.reply(500);

          return false;
        }
      } else if (request.cseq > this._remote_seqnum) {
        this._remote_seqnum = request.cseq;
      }

      // RFC3261 14.2 Modifying an Existing Session -UAS BEHAVIOR-.
      if (request.method === JsSIP_C.INVITE || request.method === JsSIP_C.UPDATE && request.body) {
        if (this._uac_pending_reply === true) {
          request.reply(491);
        } else if (this._uas_pending_reply === true) {
          var retryAfter = (Math.random() * 10 | 0) + 1;

          request.reply(500, null, ['Retry-After:' + retryAfter]);

          return false;
        } else {
          this._uas_pending_reply = true;

          var stateChanged = function stateChanged() {
            if (request.server_transaction.state === Transactions.C.STATUS_ACCEPTED || request.server_transaction.state === Transactions.C.STATUS_COMPLETED || request.server_transaction.state === Transactions.C.STATUS_TERMINATED) {

              request.server_transaction.removeListener('stateChanged', stateChanged);
              _this2._uas_pending_reply = false;
            }
          };

          request.server_transaction.on('stateChanged', stateChanged);
        }

        // RFC3261 12.2.2 Replace the dialog`s remote target URI if the request is accepted.
        if (request.hasHeader('contact')) {
          request.server_transaction.on('stateChanged', function () {
            if (request.server_transaction.state === Transactions.C.STATUS_ACCEPTED) {
              _this2._remote_target = request.parseHeader('contact').uri;
            }
          });
        }
      } else if (request.method === JsSIP_C.NOTIFY) {
        // RFC6665 3.2 Replace the dialog`s remote target URI if the request is accepted.
        if (request.hasHeader('contact')) {
          request.server_transaction.on('stateChanged', function () {
            if (request.server_transaction.state === Transactions.C.STATUS_COMPLETED) {
              _this2._remote_target = request.parseHeader('contact').uri;
            }
          });
        }
      }

      return true;
    }
  }, {
    key: 'id',
    get: function get() {
      return this._id;
    }
  }, {
    key: 'local_seqnum',
    get: function get() {
      return this._local_seqnum;
    },
    set: function set(num) {
      this._local_seqnum = num;
    }
  }, {
    key: 'owner',
    get: function get() {
      return this._owner;
    }
  }, {
    key: 'uac_pending_reply',
    get: function get() {
      return this._uac_pending_reply;
    },
    set: function set(pending) {
      this._uac_pending_reply = pending;
    }
  }, {
    key: 'uas_pending_reply',
    get: function get() {
      return this._uas_pending_reply;
    }
  }]);

  return Dialog;
}();

},{"./Constants":2,"./Dialog/RequestSender":4,"./SIPMessage":19,"./Transactions":22,"./Utils":26,"debug":29}],4:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JsSIP_C = require('../Constants');
var Transactions = require('../Transactions');
var RTCSession = require('../RTCSession');
var RequestSender = require('../RequestSender');

// Default event handlers.
var EventHandlers = {
  onRequestTimeout: function onRequestTimeout() {},
  onTransportError: function onTransportError() {},
  onSuccessResponse: function onSuccessResponse() {},
  onErrorResponse: function onErrorResponse() {},
  onAuthenticated: function onAuthenticated() {},
  onDialogError: function onDialogError() {}
};

module.exports = function () {
  function DialogRequestSender(dialog, request, eventHandlers) {
    _classCallCheck(this, DialogRequestSender);

    this._dialog = dialog;
    this._ua = dialog._ua;
    this._request = request;
    this._eventHandlers = eventHandlers;

    // RFC3261 14.1 Modifying an Existing Session. UAC Behavior.
    this._reattempt = false;
    this._reattemptTimer = null;

    // Define the undefined handlers.
    for (var handler in EventHandlers) {
      if (Object.prototype.hasOwnProperty.call(EventHandlers, handler)) {
        if (!this._eventHandlers[handler]) {
          this._eventHandlers[handler] = EventHandlers[handler];
        }
      }
    }
  }

  _createClass(DialogRequestSender, [{
    key: 'send',
    value: function send() {
      var _this = this;

      var request_sender = new RequestSender(this._ua, this._request, {
        onRequestTimeout: function onRequestTimeout() {
          _this._eventHandlers.onRequestTimeout();
        },
        onTransportError: function onTransportError() {
          _this._eventHandlers.onTransportError();
        },
        onAuthenticated: function onAuthenticated(request) {
          _this._eventHandlers.onAuthenticated(request);
        },
        onReceiveResponse: function onReceiveResponse(response) {
          _this._receiveResponse(response);
        }
      });

      request_sender.send();

      // RFC3261 14.2 Modifying an Existing Session -UAC BEHAVIOR-.
      if ((this._request.method === JsSIP_C.INVITE || this._request.method === JsSIP_C.UPDATE && this._request.body) && request_sender.clientTransaction.state !== Transactions.C.STATUS_TERMINATED) {
        this._dialog.uac_pending_reply = true;

        var stateChanged = function stateChanged() {
          if (request_sender.clientTransaction.state === Transactions.C.STATUS_ACCEPTED || request_sender.clientTransaction.state === Transactions.C.STATUS_COMPLETED || request_sender.clientTransaction.state === Transactions.C.STATUS_TERMINATED) {
            request_sender.clientTransaction.removeListener('stateChanged', stateChanged);
            _this._dialog.uac_pending_reply = false;
          }
        };

        request_sender.clientTransaction.on('stateChanged', stateChanged);
      }
    }
  }, {
    key: '_receiveResponse',
    value: function _receiveResponse(response) {
      var _this2 = this;

      // RFC3261 12.2.1.2 408 or 481 is received for a request within a dialog.
      if (response.status_code === 408 || response.status_code === 481) {
        this._eventHandlers.onDialogError(response);
      } else if (response.method === JsSIP_C.INVITE && response.status_code === 491) {
        if (this._reattempt) {
          if (response.status_code >= 200 && response.status_code < 300) {
            this._eventHandlers.onSuccessResponse(response);
          } else if (response.status_code >= 300) {
            this._eventHandlers.onErrorResponse(response);
          }
        } else {
          this._request.cseq.value = this._dialog.local_seqnum += 1;
          this._reattemptTimer = setTimeout(function () {
            // TODO: look at dialog state instead.
            if (_this2._dialog.owner.status !== RTCSession.C.STATUS_TERMINATED) {
              _this2._reattempt = true;
              _this2._request_sender.send();
            }
          }, 1000);
        }
      } else if (response.status_code >= 200 && response.status_code < 300) {
        this._eventHandlers.onSuccessResponse(response);
      } else if (response.status_code >= 300) {
        this._eventHandlers.onErrorResponse(response);
      }
    }
  }, {
    key: 'request',
    get: function get() {
      return this._request;
    }
  }]);

  return DialogRequestSender;
}();

},{"../Constants":2,"../RTCSession":12,"../RequestSender":18,"../Transactions":22}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Utils = require('./Utils');
var debug = require('debug')('JsSIP:DigestAuthentication');
var debugerror = require('debug')('JsSIP:ERROR:DigestAuthentication');

debugerror.log = console.warn.bind(console);

module.exports = function () {
  function DigestAuthentication(credentials) {
    _classCallCheck(this, DigestAuthentication);

    this._credentials = credentials;
    this._cnonce = null;
    this._nc = 0;
    this._ncHex = '00000000';
    this._algorithm = null;
    this._realm = null;
    this._nonce = null;
    this._opaque = null;
    this._stale = null;
    this._qop = null;
    this._method = null;
    this._uri = null;
    this._ha1 = null;
    this._response = null;
  }

  _createClass(DigestAuthentication, [{
    key: 'get',
    value: function get(parameter) {
      switch (parameter) {
        case 'realm':
          return this._realm;

        case 'ha1':
          return this._ha1;

        default:
          debugerror('get() | cannot get "%s" parameter', parameter);

          return undefined;
      }
    }

    /**
    * Performs Digest authentication given a SIP request and the challenge
    * received in a response to that request.
    * Returns true if auth was successfully generated, false otherwise.
    */

  }, {
    key: 'authenticate',
    value: function authenticate(_ref, challenge) {
      var method = _ref.method,
          ruri = _ref.ruri;

      this._algorithm = challenge.algorithm;
      this._realm = challenge.realm;
      this._nonce = challenge.nonce;
      this._opaque = challenge.opaque;
      this._stale = challenge.stale;

      if (this._algorithm) {
        if (this._algorithm !== 'MD5') {
          debugerror('authenticate() | challenge with Digest algorithm different than "MD5", authentication aborted');

          return false;
        }
      } else {
        this._algorithm = 'MD5';
      }

      if (!this._nonce) {
        debugerror('authenticate() | challenge without Digest nonce, authentication aborted');

        return false;
      }

      if (!this._realm) {
        debugerror('authenticate() | challenge without Digest realm, authentication aborted');

        return false;
      }

      // If no plain SIP password is provided.
      if (!this._credentials.password) {
        // If ha1 is not provided we cannot authenticate.
        if (!this._credentials.ha1) {
          debugerror('authenticate() | no plain SIP password nor ha1 provided, authentication aborted');

          return false;
        }

        // If the realm does not match the stored realm we cannot authenticate.
        if (this._credentials.realm !== this._realm) {
          debugerror('authenticate() | no plain SIP password, and stored `realm` does not match the given `realm`, cannot authenticate [stored:"%s", given:"%s"]', this._credentials.realm, this._realm);

          return false;
        }
      }

      // 'qop' can contain a list of values (Array). Let's choose just one.
      if (challenge.qop) {
        if (challenge.qop.indexOf('auth') > -1) {
          this._qop = 'auth';
        } else if (challenge.qop.indexOf('auth-int') > -1) {
          this._qop = 'auth-int';
        } else {
          // Otherwise 'qop' is present but does not contain 'auth' or 'auth-int', so abort here.
          debugerror('authenticate() | challenge without Digest qop different than "auth" or "auth-int", authentication aborted');

          return false;
        }
      } else {
        this._qop = null;
      }

      // Fill other attributes.

      this._method = method;
      this._uri = ruri;
      this._cnonce = Utils.createRandomToken(12);
      this._nc += 1;
      var hex = Number(this._nc).toString(16);

      this._ncHex = '00000000'.substr(0, 8 - hex.length) + hex;

      // Nc-value = 8LHEX. Max value = 'FFFFFFFF'.
      if (this._nc === 4294967296) {
        this._nc = 1;
        this._ncHex = '00000001';
      }

      // Calculate the Digest "response" value.

      // If we have plain SIP password then regenerate ha1.
      if (this._credentials.password) {
        // HA1 = MD5(A1) = MD5(username:realm:password).
        this._ha1 = Utils.calculateMD5(this._credentials.username + ':' + this._realm + ':' + this._credentials.password);
      }
      // Otherwise reuse the stored ha1.
      else {
          this._ha1 = this._credentials.ha1;
        }

      var ha2 = void 0;

      if (this._qop === 'auth') {
        // HA2 = MD5(A2) = MD5(method:digestURI).
        ha2 = Utils.calculateMD5(this._method + ':' + this._uri);
        // Response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2).
        this._response = Utils.calculateMD5(this._ha1 + ':' + this._nonce + ':' + this._ncHex + ':' + this._cnonce + ':auth:' + ha2);
      } else if (this._qop === 'auth-int') {
        // HA2 = MD5(A2) = MD5(method:digestURI:MD5(entityBody)).
        ha2 = Utils.calculateMD5(this._method + ':' + this._uri + ':' + Utils.calculateMD5(this.body ? this.body : ''));
        // Response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2).
        this._response = Utils.calculateMD5(this._ha1 + ':' + this._nonce + ':' + this._ncHex + ':' + this._cnonce + ':auth-int:' + ha2);
      } else if (this._qop === null) {
        // HA2 = MD5(A2) = MD5(method:digestURI).
        ha2 = Utils.calculateMD5(this._method + ':' + this._uri);
        // Response = MD5(HA1:nonce:HA2).
        this._response = Utils.calculateMD5(this._ha1 + ':' + this._nonce + ':' + ha2);
      }

      debug('authenticate() | response generated');

      return true;
    }

    /**
    * Return the Proxy-Authorization or WWW-Authorization header value.
    */

  }, {
    key: 'toString',
    value: function toString() {
      var auth_params = [];

      if (!this._response) {
        throw new Error('response field does not exist, cannot generate Authorization header');
      }

      auth_params.push('algorithm=' + this._algorithm);
      auth_params.push('username="' + this._credentials.username + '"');
      auth_params.push('realm="' + this._realm + '"');
      auth_params.push('nonce="' + this._nonce + '"');
      auth_params.push('uri="' + this._uri + '"');
      auth_params.push('response="' + this._response + '"');
      if (this._opaque) {
        auth_params.push('opaque="' + this._opaque + '"');
      }
      if (this._qop) {
        auth_params.push('qop=' + this._qop);
        auth_params.push('cnonce="' + this._cnonce + '"');
        auth_params.push('nc=' + this._ncHex);
      }

      return 'Digest ' + auth_params.join(', ');
    }
  }]);

  return DigestAuthentication;
}();

},{"./Utils":26,"debug":29}],6:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ConfigurationError = function (_Error) {
  _inherits(ConfigurationError, _Error);

  function ConfigurationError(parameter, value) {
    _classCallCheck(this, ConfigurationError);

    var _this = _possibleConstructorReturn(this, (ConfigurationError.__proto__ || Object.getPrototypeOf(ConfigurationError)).call(this));

    _this.code = 1;
    _this.name = 'CONFIGURATION_ERROR';
    _this.parameter = parameter;
    _this.value = value;
    _this.message = !_this.value ? 'Missing parameter: ' + _this.parameter : 'Invalid value ' + JSON.stringify(_this.value) + ' for parameter "' + _this.parameter + '"';
    return _this;
  }

  return ConfigurationError;
}(Error);

var InvalidStateError = function (_Error2) {
  _inherits(InvalidStateError, _Error2);

  function InvalidStateError(status) {
    _classCallCheck(this, InvalidStateError);

    var _this2 = _possibleConstructorReturn(this, (InvalidStateError.__proto__ || Object.getPrototypeOf(InvalidStateError)).call(this));

    _this2.code = 2;
    _this2.name = 'INVALID_STATE_ERROR';
    _this2.status = status;
    _this2.message = 'Invalid status: ' + status;
    return _this2;
  }

  return InvalidStateError;
}(Error);

var NotSupportedError = function (_Error3) {
  _inherits(NotSupportedError, _Error3);

  function NotSupportedError(message) {
    _classCallCheck(this, NotSupportedError);

    var _this3 = _possibleConstructorReturn(this, (NotSupportedError.__proto__ || Object.getPrototypeOf(NotSupportedError)).call(this));

    _this3.code = 3;
    _this3.name = 'NOT_SUPPORTED_ERROR';
    _this3.message = message;
    return _this3;
  }

  return NotSupportedError;
}(Error);

var NotReadyError = function (_Error4) {
  _inherits(NotReadyError, _Error4);

  function NotReadyError(message) {
    _classCallCheck(this, NotReadyError);

    var _this4 = _possibleConstructorReturn(this, (NotReadyError.__proto__ || Object.getPrototypeOf(NotReadyError)).call(this));

    _this4.code = 4;
    _this4.name = 'NOT_READY_ERROR';
    _this4.message = message;
    return _this4;
  }

  return NotReadyError;
}(Error);

module.exports = {
  ConfigurationError: ConfigurationError,
  InvalidStateError: InvalidStateError,
  NotSupportedError: NotSupportedError,
  NotReadyError: NotReadyError
};

},{}],7:[function(require,module,exports){
'use strict';

module.exports = function () {
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */
  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
    return '"' + s.replace(/\\/g, '\\\\') // backslash
    .replace(/"/g, '\\"') // closing quote character
    .replace(/\x08/g, '\\b') // backspace
    .replace(/\t/g, '\\t') // horizontal tab
    .replace(/\n/g, '\\n') // line feed
    .replace(/\f/g, '\\f') // form feed
    .replace(/\r/g, '\\r') // carriage return
    .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape) + '"';
  }
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function parse(input, startRule) {
      var parseFunctions = {
        "CRLF": parse_CRLF,
        "DIGIT": parse_DIGIT,
        "ALPHA": parse_ALPHA,
        "HEXDIG": parse_HEXDIG,
        "WSP": parse_WSP,
        "OCTET": parse_OCTET,
        "DQUOTE": parse_DQUOTE,
        "SP": parse_SP,
        "HTAB": parse_HTAB,
        "alphanum": parse_alphanum,
        "reserved": parse_reserved,
        "unreserved": parse_unreserved,
        "mark": parse_mark,
        "escaped": parse_escaped,
        "LWS": parse_LWS,
        "SWS": parse_SWS,
        "HCOLON": parse_HCOLON,
        "TEXT_UTF8_TRIM": parse_TEXT_UTF8_TRIM,
        "TEXT_UTF8char": parse_TEXT_UTF8char,
        "UTF8_NONASCII": parse_UTF8_NONASCII,
        "UTF8_CONT": parse_UTF8_CONT,
        "LHEX": parse_LHEX,
        "token": parse_token,
        "token_nodot": parse_token_nodot,
        "separators": parse_separators,
        "word": parse_word,
        "STAR": parse_STAR,
        "SLASH": parse_SLASH,
        "EQUAL": parse_EQUAL,
        "LPAREN": parse_LPAREN,
        "RPAREN": parse_RPAREN,
        "RAQUOT": parse_RAQUOT,
        "LAQUOT": parse_LAQUOT,
        "COMMA": parse_COMMA,
        "SEMI": parse_SEMI,
        "COLON": parse_COLON,
        "LDQUOT": parse_LDQUOT,
        "RDQUOT": parse_RDQUOT,
        "comment": parse_comment,
        "ctext": parse_ctext,
        "quoted_string": parse_quoted_string,
        "quoted_string_clean": parse_quoted_string_clean,
        "qdtext": parse_qdtext,
        "quoted_pair": parse_quoted_pair,
        "SIP_URI_noparams": parse_SIP_URI_noparams,
        "SIP_URI": parse_SIP_URI,
        "uri_scheme": parse_uri_scheme,
        "uri_scheme_sips": parse_uri_scheme_sips,
        "uri_scheme_sip": parse_uri_scheme_sip,
        "userinfo": parse_userinfo,
        "user": parse_user,
        "user_unreserved": parse_user_unreserved,
        "password": parse_password,
        "hostport": parse_hostport,
        "host": parse_host,
        "hostname": parse_hostname,
        "domainlabel": parse_domainlabel,
        "toplabel": parse_toplabel,
        "IPv6reference": parse_IPv6reference,
        "IPv6address": parse_IPv6address,
        "h16": parse_h16,
        "ls32": parse_ls32,
        "IPv4address": parse_IPv4address,
        "dec_octet": parse_dec_octet,
        "port": parse_port,
        "uri_parameters": parse_uri_parameters,
        "uri_parameter": parse_uri_parameter,
        "transport_param": parse_transport_param,
        "user_param": parse_user_param,
        "method_param": parse_method_param,
        "ttl_param": parse_ttl_param,
        "maddr_param": parse_maddr_param,
        "lr_param": parse_lr_param,
        "other_param": parse_other_param,
        "pname": parse_pname,
        "pvalue": parse_pvalue,
        "paramchar": parse_paramchar,
        "param_unreserved": parse_param_unreserved,
        "headers": parse_headers,
        "header": parse_header,
        "hname": parse_hname,
        "hvalue": parse_hvalue,
        "hnv_unreserved": parse_hnv_unreserved,
        "Request_Response": parse_Request_Response,
        "Request_Line": parse_Request_Line,
        "Request_URI": parse_Request_URI,
        "absoluteURI": parse_absoluteURI,
        "hier_part": parse_hier_part,
        "net_path": parse_net_path,
        "abs_path": parse_abs_path,
        "opaque_part": parse_opaque_part,
        "uric": parse_uric,
        "uric_no_slash": parse_uric_no_slash,
        "path_segments": parse_path_segments,
        "segment": parse_segment,
        "param": parse_param,
        "pchar": parse_pchar,
        "scheme": parse_scheme,
        "authority": parse_authority,
        "srvr": parse_srvr,
        "reg_name": parse_reg_name,
        "query": parse_query,
        "SIP_Version": parse_SIP_Version,
        "INVITEm": parse_INVITEm,
        "ACKm": parse_ACKm,
        "OPTIONSm": parse_OPTIONSm,
        "BYEm": parse_BYEm,
        "CANCELm": parse_CANCELm,
        "REGISTERm": parse_REGISTERm,
        "SUBSCRIBEm": parse_SUBSCRIBEm,
        "NOTIFYm": parse_NOTIFYm,
        "REFERm": parse_REFERm,
        "Method": parse_Method,
        "Status_Line": parse_Status_Line,
        "Status_Code": parse_Status_Code,
        "extension_code": parse_extension_code,
        "Reason_Phrase": parse_Reason_Phrase,
        "Allow_Events": parse_Allow_Events,
        "Call_ID": parse_Call_ID,
        "Contact": parse_Contact,
        "contact_param": parse_contact_param,
        "name_addr": parse_name_addr,
        "display_name": parse_display_name,
        "contact_params": parse_contact_params,
        "c_p_q": parse_c_p_q,
        "c_p_expires": parse_c_p_expires,
        "delta_seconds": parse_delta_seconds,
        "qvalue": parse_qvalue,
        "generic_param": parse_generic_param,
        "gen_value": parse_gen_value,
        "Content_Disposition": parse_Content_Disposition,
        "disp_type": parse_disp_type,
        "disp_param": parse_disp_param,
        "handling_param": parse_handling_param,
        "Content_Encoding": parse_Content_Encoding,
        "Content_Length": parse_Content_Length,
        "Content_Type": parse_Content_Type,
        "media_type": parse_media_type,
        "m_type": parse_m_type,
        "discrete_type": parse_discrete_type,
        "composite_type": parse_composite_type,
        "extension_token": parse_extension_token,
        "x_token": parse_x_token,
        "m_subtype": parse_m_subtype,
        "m_parameter": parse_m_parameter,
        "m_value": parse_m_value,
        "CSeq": parse_CSeq,
        "CSeq_value": parse_CSeq_value,
        "Expires": parse_Expires,
        "Event": parse_Event,
        "event_type": parse_event_type,
        "From": parse_From,
        "from_param": parse_from_param,
        "tag_param": parse_tag_param,
        "Max_Forwards": parse_Max_Forwards,
        "Min_Expires": parse_Min_Expires,
        "Name_Addr_Header": parse_Name_Addr_Header,
        "Proxy_Authenticate": parse_Proxy_Authenticate,
        "challenge": parse_challenge,
        "other_challenge": parse_other_challenge,
        "auth_param": parse_auth_param,
        "digest_cln": parse_digest_cln,
        "realm": parse_realm,
        "realm_value": parse_realm_value,
        "domain": parse_domain,
        "URI": parse_URI,
        "nonce": parse_nonce,
        "nonce_value": parse_nonce_value,
        "opaque": parse_opaque,
        "stale": parse_stale,
        "algorithm": parse_algorithm,
        "qop_options": parse_qop_options,
        "qop_value": parse_qop_value,
        "Proxy_Require": parse_Proxy_Require,
        "Record_Route": parse_Record_Route,
        "rec_route": parse_rec_route,
        "Reason": parse_Reason,
        "reason_param": parse_reason_param,
        "reason_cause": parse_reason_cause,
        "Require": parse_Require,
        "Route": parse_Route,
        "route_param": parse_route_param,
        "Subscription_State": parse_Subscription_State,
        "substate_value": parse_substate_value,
        "subexp_params": parse_subexp_params,
        "event_reason_value": parse_event_reason_value,
        "Subject": parse_Subject,
        "Supported": parse_Supported,
        "To": parse_To,
        "to_param": parse_to_param,
        "Via": parse_Via,
        "via_param": parse_via_param,
        "via_params": parse_via_params,
        "via_ttl": parse_via_ttl,
        "via_maddr": parse_via_maddr,
        "via_received": parse_via_received,
        "via_branch": parse_via_branch,
        "response_port": parse_response_port,
        "sent_protocol": parse_sent_protocol,
        "protocol_name": parse_protocol_name,
        "transport": parse_transport,
        "sent_by": parse_sent_by,
        "via_host": parse_via_host,
        "via_port": parse_via_port,
        "ttl": parse_ttl,
        "WWW_Authenticate": parse_WWW_Authenticate,
        "Session_Expires": parse_Session_Expires,
        "s_e_expires": parse_s_e_expires,
        "s_e_params": parse_s_e_params,
        "s_e_refresher": parse_s_e_refresher,
        "extension_header": parse_extension_header,
        "header_value": parse_header_value,
        "message_body": parse_message_body,
        "uuid_URI": parse_uuid_URI,
        "uuid": parse_uuid,
        "hex4": parse_hex4,
        "hex8": parse_hex8,
        "hex12": parse_hex12,
        "Refer_To": parse_Refer_To,
        "Replaces": parse_Replaces,
        "call_id": parse_call_id,
        "replaces_param": parse_replaces_param,
        "to_tag": parse_to_tag,
        "from_tag": parse_from_tag,
        "early_flag": parse_early_flag
      };
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "CRLF";
      }
      var pos = 0;
      var reportFailures = 0;
      var rightmostFailuresPos = 0;
      var rightmostFailuresExpected = [];
      function padLeft(input, padding, length) {
        var result = input;
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
        return result;
      }
      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      function matchFailed(failure) {
        if (pos < rightmostFailuresPos) {
          return;
        }
        if (pos > rightmostFailuresPos) {
          rightmostFailuresPos = pos;
          rightmostFailuresExpected = [];
        }
        rightmostFailuresExpected.push(failure);
      }
      function parse_CRLF() {
        var result0;
        if (input.substr(pos, 2) === "\r\n") {
          result0 = "\r\n";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\r\\n\"");
          }
        }
        return result0;
      }
      function parse_DIGIT() {
        var result0;
        if (/^[0-9]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[0-9]");
          }
        }
        return result0;
      }
      function parse_ALPHA() {
        var result0;
        if (/^[a-zA-Z]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z]");
          }
        }
        return result0;
      }
      function parse_HEXDIG() {
        var result0;
        if (/^[0-9a-fA-F]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[0-9a-fA-F]");
          }
        }
        return result0;
      }
      function parse_WSP() {
        var result0;
        result0 = parse_SP();
        if (result0 === null) {
          result0 = parse_HTAB();
        }
        return result0;
      }
      function parse_OCTET() {
        var result0;
        if (/^[\0-\xFF]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\\0-\\xFF]");
          }
        }
        return result0;
      }
      function parse_DQUOTE() {
        var result0;
        if (/^["]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\"]");
          }
        }
        return result0;
      }
      function parse_SP() {
        var result0;
        if (input.charCodeAt(pos) === 32) {
          result0 = " ";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\" \"");
          }
        }
        return result0;
      }
      function parse_HTAB() {
        var result0;
        if (input.charCodeAt(pos) === 9) {
          result0 = "\t";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\t\"");
          }
        }
        return result0;
      }
      function parse_alphanum() {
        var result0;
        if (/^[a-zA-Z0-9]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z0-9]");
          }
        }
        return result0;
      }
      function parse_reserved() {
        var result0;
        if (input.charCodeAt(pos) === 59) {
          result0 = ";";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\";\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 47) {
            result0 = "/";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 63) {
              result0 = "?";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"?\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 58) {
                result0 = ":";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\":\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 64) {
                  result0 = "@";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"@\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 38) {
                    result0 = "&";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"&\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 61) {
                      result0 = "=";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"=\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 43) {
                        result0 = "+";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"+\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 36) {
                          result0 = "$";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"$\"");
                          }
                        }
                        if (result0 === null) {
                          if (input.charCodeAt(pos) === 44) {
                            result0 = ",";
                            pos++;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\",\"");
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_unreserved() {
        var result0;
        result0 = parse_alphanum();
        if (result0 === null) {
          result0 = parse_mark();
        }
        return result0;
      }
      function parse_mark() {
        var result0;
        if (input.charCodeAt(pos) === 45) {
          result0 = "-";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"-\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 95) {
            result0 = "_";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"_\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 46) {
              result0 = ".";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 33) {
                result0 = "!";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"!\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 126) {
                  result0 = "~";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"~\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 42) {
                    result0 = "*";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"*\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 39) {
                      result0 = "'";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"'\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 40) {
                        result0 = "(";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"(\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 41) {
                          result0 = ")";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\")\"");
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_escaped() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 37) {
          result0 = "%";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"%\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_HEXDIG();
          if (result1 !== null) {
            result2 = parse_HEXDIG();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, escaped) {
            return escaped.join('');
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_LWS() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        result0 = [];
        result1 = parse_WSP();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_WSP();
        }
        if (result0 !== null) {
          result1 = parse_CRLF();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos2;
          }
        } else {
          result0 = null;
          pos = pos2;
        }
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result2 = parse_WSP();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_WSP();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return " ";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_SWS() {
        var result0;
        result0 = parse_LWS();
        result0 = result0 !== null ? result0 : "";
        return result0;
      }
      function parse_HCOLON() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        result1 = parse_SP();
        if (result1 === null) {
          result1 = parse_HTAB();
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_SP();
          if (result1 === null) {
            result1 = parse_HTAB();
          }
        }
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return ':';
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_TEXT_UTF8_TRIM() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result1 = parse_TEXT_UTF8char();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_TEXT_UTF8char();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = [];
          result3 = parse_LWS();
          while (result3 !== null) {
            result2.push(result3);
            result3 = parse_LWS();
          }
          if (result2 !== null) {
            result3 = parse_TEXT_UTF8char();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = [];
            result3 = parse_LWS();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_LWS();
            }
            if (result2 !== null) {
              result3 = parse_TEXT_UTF8char();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_TEXT_UTF8char() {
        var result0;
        if (/^[!-~]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[!-~]");
          }
        }
        if (result0 === null) {
          result0 = parse_UTF8_NONASCII();
        }
        return result0;
      }
      function parse_UTF8_NONASCII() {
        var result0;
        if (/^[\x80-\uFFFF]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed('[\\x80-\\uFFFF]');
          }
        }
        return result0;
      }
      function parse_UTF8_CONT() {
        var result0;
        if (/^[\x80-\xBF]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\\x80-\\xBF]");
          }
        }
        return result0;
      }
      function parse_LHEX() {
        var result0;
        result0 = parse_DIGIT();
        if (result0 === null) {
          if (/^[a-f]/.test(input.charAt(pos))) {
            result0 = input.charAt(pos);
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("[a-f]");
            }
          }
        }
        return result0;
      }
      function parse_token() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result1 = parse_alphanum();
        if (result1 === null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result1 === null) {
            if (input.charCodeAt(pos) === 46) {
              result1 = ".";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 33) {
                result1 = "!";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"!\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 37) {
                  result1 = "%";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"%\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 42) {
                    result1 = "*";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"*\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 95) {
                      result1 = "_";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"_\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 43) {
                        result1 = "+";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"+\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 96) {
                          result1 = "`";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"`\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 39) {
                            result1 = "'";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"'\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 126) {
                              result1 = "~";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"~\"");
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_alphanum();
            if (result1 === null) {
              if (input.charCodeAt(pos) === 45) {
                result1 = "-";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 46) {
                  result1 = ".";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\".\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 33) {
                    result1 = "!";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"!\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 37) {
                      result1 = "%";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"%\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 42) {
                        result1 = "*";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"*\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 95) {
                          result1 = "_";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"_\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 43) {
                            result1 = "+";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"+\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 96) {
                              result1 = "`";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"`\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 39) {
                                result1 = "'";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"'\"");
                                }
                              }
                              if (result1 === null) {
                                if (input.charCodeAt(pos) === 126) {
                                  result1 = "~";
                                  pos++;
                                } else {
                                  result1 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\"~\"");
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_token_nodot() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result1 = parse_alphanum();
        if (result1 === null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result1 === null) {
            if (input.charCodeAt(pos) === 33) {
              result1 = "!";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"!\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 37) {
                result1 = "%";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"%\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 42) {
                  result1 = "*";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"*\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 95) {
                    result1 = "_";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"_\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 43) {
                      result1 = "+";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"+\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 96) {
                        result1 = "`";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"`\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 39) {
                          result1 = "'";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"'\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 126) {
                            result1 = "~";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"~\"");
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_alphanum();
            if (result1 === null) {
              if (input.charCodeAt(pos) === 45) {
                result1 = "-";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 33) {
                  result1 = "!";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"!\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 37) {
                    result1 = "%";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"%\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 42) {
                      result1 = "*";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"*\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 95) {
                        result1 = "_";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"_\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 43) {
                          result1 = "+";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"+\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 96) {
                            result1 = "`";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"`\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 39) {
                              result1 = "'";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"'\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 126) {
                                result1 = "~";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"~\"");
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_separators() {
        var result0;
        if (input.charCodeAt(pos) === 40) {
          result0 = "(";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"(\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 41) {
            result0 = ")";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\")\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 60) {
              result0 = "<";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"<\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 62) {
                result0 = ">";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\">\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 64) {
                  result0 = "@";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"@\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 44) {
                    result0 = ",";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\",\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 59) {
                      result0 = ";";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\";\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 58) {
                        result0 = ":";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 92) {
                          result0 = "\\";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"\\\\\"");
                          }
                        }
                        if (result0 === null) {
                          result0 = parse_DQUOTE();
                          if (result0 === null) {
                            if (input.charCodeAt(pos) === 47) {
                              result0 = "/";
                              pos++;
                            } else {
                              result0 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"/\"");
                              }
                            }
                            if (result0 === null) {
                              if (input.charCodeAt(pos) === 91) {
                                result0 = "[";
                                pos++;
                              } else {
                                result0 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"[\"");
                                }
                              }
                              if (result0 === null) {
                                if (input.charCodeAt(pos) === 93) {
                                  result0 = "]";
                                  pos++;
                                } else {
                                  result0 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\"]\"");
                                  }
                                }
                                if (result0 === null) {
                                  if (input.charCodeAt(pos) === 63) {
                                    result0 = "?";
                                    pos++;
                                  } else {
                                    result0 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\"?\"");
                                    }
                                  }
                                  if (result0 === null) {
                                    if (input.charCodeAt(pos) === 61) {
                                      result0 = "=";
                                      pos++;
                                    } else {
                                      result0 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\"=\"");
                                      }
                                    }
                                    if (result0 === null) {
                                      if (input.charCodeAt(pos) === 123) {
                                        result0 = "{";
                                        pos++;
                                      } else {
                                        result0 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\"{\"");
                                        }
                                      }
                                      if (result0 === null) {
                                        if (input.charCodeAt(pos) === 125) {
                                          result0 = "}";
                                          pos++;
                                        } else {
                                          result0 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\"}\"");
                                          }
                                        }
                                        if (result0 === null) {
                                          result0 = parse_SP();
                                          if (result0 === null) {
                                            result0 = parse_HTAB();
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_word() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result1 = parse_alphanum();
        if (result1 === null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result1 === null) {
            if (input.charCodeAt(pos) === 46) {
              result1 = ".";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 33) {
                result1 = "!";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"!\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 37) {
                  result1 = "%";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"%\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 42) {
                    result1 = "*";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"*\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 95) {
                      result1 = "_";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"_\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 43) {
                        result1 = "+";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"+\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 96) {
                          result1 = "`";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"`\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 39) {
                            result1 = "'";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"'\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 126) {
                              result1 = "~";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"~\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 40) {
                                result1 = "(";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"(\"");
                                }
                              }
                              if (result1 === null) {
                                if (input.charCodeAt(pos) === 41) {
                                  result1 = ")";
                                  pos++;
                                } else {
                                  result1 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\")\"");
                                  }
                                }
                                if (result1 === null) {
                                  if (input.charCodeAt(pos) === 60) {
                                    result1 = "<";
                                    pos++;
                                  } else {
                                    result1 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\"<\"");
                                    }
                                  }
                                  if (result1 === null) {
                                    if (input.charCodeAt(pos) === 62) {
                                      result1 = ">";
                                      pos++;
                                    } else {
                                      result1 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\">\"");
                                      }
                                    }
                                    if (result1 === null) {
                                      if (input.charCodeAt(pos) === 58) {
                                        result1 = ":";
                                        pos++;
                                      } else {
                                        result1 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result1 === null) {
                                        if (input.charCodeAt(pos) === 92) {
                                          result1 = "\\";
                                          pos++;
                                        } else {
                                          result1 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\"\\\\\"");
                                          }
                                        }
                                        if (result1 === null) {
                                          result1 = parse_DQUOTE();
                                          if (result1 === null) {
                                            if (input.charCodeAt(pos) === 47) {
                                              result1 = "/";
                                              pos++;
                                            } else {
                                              result1 = null;
                                              if (reportFailures === 0) {
                                                matchFailed("\"/\"");
                                              }
                                            }
                                            if (result1 === null) {
                                              if (input.charCodeAt(pos) === 91) {
                                                result1 = "[";
                                                pos++;
                                              } else {
                                                result1 = null;
                                                if (reportFailures === 0) {
                                                  matchFailed("\"[\"");
                                                }
                                              }
                                              if (result1 === null) {
                                                if (input.charCodeAt(pos) === 93) {
                                                  result1 = "]";
                                                  pos++;
                                                } else {
                                                  result1 = null;
                                                  if (reportFailures === 0) {
                                                    matchFailed("\"]\"");
                                                  }
                                                }
                                                if (result1 === null) {
                                                  if (input.charCodeAt(pos) === 63) {
                                                    result1 = "?";
                                                    pos++;
                                                  } else {
                                                    result1 = null;
                                                    if (reportFailures === 0) {
                                                      matchFailed("\"?\"");
                                                    }
                                                  }
                                                  if (result1 === null) {
                                                    if (input.charCodeAt(pos) === 123) {
                                                      result1 = "{";
                                                      pos++;
                                                    } else {
                                                      result1 = null;
                                                      if (reportFailures === 0) {
                                                        matchFailed("\"{\"");
                                                      }
                                                    }
                                                    if (result1 === null) {
                                                      if (input.charCodeAt(pos) === 125) {
                                                        result1 = "}";
                                                        pos++;
                                                      } else {
                                                        result1 = null;
                                                        if (reportFailures === 0) {
                                                          matchFailed("\"}\"");
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_alphanum();
            if (result1 === null) {
              if (input.charCodeAt(pos) === 45) {
                result1 = "-";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 46) {
                  result1 = ".";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\".\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 33) {
                    result1 = "!";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"!\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 37) {
                      result1 = "%";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"%\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 42) {
                        result1 = "*";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"*\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 95) {
                          result1 = "_";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"_\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 43) {
                            result1 = "+";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"+\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 96) {
                              result1 = "`";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"`\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 39) {
                                result1 = "'";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"'\"");
                                }
                              }
                              if (result1 === null) {
                                if (input.charCodeAt(pos) === 126) {
                                  result1 = "~";
                                  pos++;
                                } else {
                                  result1 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\"~\"");
                                  }
                                }
                                if (result1 === null) {
                                  if (input.charCodeAt(pos) === 40) {
                                    result1 = "(";
                                    pos++;
                                  } else {
                                    result1 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\"(\"");
                                    }
                                  }
                                  if (result1 === null) {
                                    if (input.charCodeAt(pos) === 41) {
                                      result1 = ")";
                                      pos++;
                                    } else {
                                      result1 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\")\"");
                                      }
                                    }
                                    if (result1 === null) {
                                      if (input.charCodeAt(pos) === 60) {
                                        result1 = "<";
                                        pos++;
                                      } else {
                                        result1 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\"<\"");
                                        }
                                      }
                                      if (result1 === null) {
                                        if (input.charCodeAt(pos) === 62) {
                                          result1 = ">";
                                          pos++;
                                        } else {
                                          result1 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\">\"");
                                          }
                                        }
                                        if (result1 === null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result1 = ":";
                                            pos++;
                                          } else {
                                            result1 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result1 === null) {
                                            if (input.charCodeAt(pos) === 92) {
                                              result1 = "\\";
                                              pos++;
                                            } else {
                                              result1 = null;
                                              if (reportFailures === 0) {
                                                matchFailed("\"\\\\\"");
                                              }
                                            }
                                            if (result1 === null) {
                                              result1 = parse_DQUOTE();
                                              if (result1 === null) {
                                                if (input.charCodeAt(pos) === 47) {
                                                  result1 = "/";
                                                  pos++;
                                                } else {
                                                  result1 = null;
                                                  if (reportFailures === 0) {
                                                    matchFailed("\"/\"");
                                                  }
                                                }
                                                if (result1 === null) {
                                                  if (input.charCodeAt(pos) === 91) {
                                                    result1 = "[";
                                                    pos++;
                                                  } else {
                                                    result1 = null;
                                                    if (reportFailures === 0) {
                                                      matchFailed("\"[\"");
                                                    }
                                                  }
                                                  if (result1 === null) {
                                                    if (input.charCodeAt(pos) === 93) {
                                                      result1 = "]";
                                                      pos++;
                                                    } else {
                                                      result1 = null;
                                                      if (reportFailures === 0) {
                                                        matchFailed("\"]\"");
                                                      }
                                                    }
                                                    if (result1 === null) {
                                                      if (input.charCodeAt(pos) === 63) {
                                                        result1 = "?";
                                                        pos++;
                                                      } else {
                                                        result1 = null;
                                                        if (reportFailures === 0) {
                                                          matchFailed("\"?\"");
                                                        }
                                                      }
                                                      if (result1 === null) {
                                                        if (input.charCodeAt(pos) === 123) {
                                                          result1 = "{";
                                                          pos++;
                                                        } else {
                                                          result1 = null;
                                                          if (reportFailures === 0) {
                                                            matchFailed("\"{\"");
                                                          }
                                                        }
                                                        if (result1 === null) {
                                                          if (input.charCodeAt(pos) === 125) {
                                                            result1 = "}";
                                                            pos++;
                                                          } else {
                                                            result1 = null;
                                                            if (reportFailures === 0) {
                                                              matchFailed("\"}\"");
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_STAR() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 42) {
            result1 = "*";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"*\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return "*";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_SLASH() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 47) {
            result1 = "/";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return "/";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_EQUAL() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 61) {
            result1 = "=";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return "=";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_LPAREN() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 40) {
            result1 = "(";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"(\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return "(";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_RPAREN() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 41) {
            result1 = ")";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\")\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return ")";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_RAQUOT() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 62) {
          result0 = ">";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\">\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_SWS();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return ">";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_LAQUOT() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 60) {
            result1 = "<";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"<\"");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return "<";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_COMMA() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 44) {
            result1 = ",";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\",\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return ",";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_SEMI() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 59) {
            result1 = ";";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\";\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return ";";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_COLON() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return ":";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_LDQUOT() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          result1 = parse_DQUOTE();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return "\"";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_RDQUOT() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_DQUOTE();
        if (result0 !== null) {
          result1 = parse_SWS();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return "\"";
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_comment() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_LPAREN();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_ctext();
          if (result2 === null) {
            result2 = parse_quoted_pair();
            if (result2 === null) {
              result2 = parse_comment();
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_ctext();
            if (result2 === null) {
              result2 = parse_quoted_pair();
              if (result2 === null) {
                result2 = parse_comment();
              }
            }
          }
          if (result1 !== null) {
            result2 = parse_RPAREN();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_ctext() {
        var result0;
        if (/^[!-']/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[!-']");
          }
        }
        if (result0 === null) {
          if (/^[*-[]/.test(input.charAt(pos))) {
            result0 = input.charAt(pos);
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("[*-[]");
            }
          }
          if (result0 === null) {
            if (/^[\]-~]/.test(input.charAt(pos))) {
              result0 = input.charAt(pos);
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("[\\]-~]");
              }
            }
            if (result0 === null) {
              result0 = parse_UTF8_NONASCII();
              if (result0 === null) {
                result0 = parse_LWS();
              }
            }
          }
        }
        return result0;
      }
      function parse_quoted_string() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          result1 = parse_DQUOTE();
          if (result1 !== null) {
            result2 = [];
            result3 = parse_qdtext();
            if (result3 === null) {
              result3 = parse_quoted_pair();
            }
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_qdtext();
              if (result3 === null) {
                result3 = parse_quoted_pair();
              }
            }
            if (result2 !== null) {
              result3 = parse_DQUOTE();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_quoted_string_clean() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          result1 = parse_DQUOTE();
          if (result1 !== null) {
            result2 = [];
            result3 = parse_qdtext();
            if (result3 === null) {
              result3 = parse_quoted_pair();
            }
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_qdtext();
              if (result3 === null) {
                result3 = parse_quoted_pair();
              }
            }
            if (result2 !== null) {
              result3 = parse_DQUOTE();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return input.substring(pos - 1, offset + 1);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_qdtext() {
        var result0;
        result0 = parse_LWS();
        if (result0 === null) {
          if (input.charCodeAt(pos) === 33) {
            result0 = "!";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"!\"");
            }
          }
          if (result0 === null) {
            if (/^[#-[]/.test(input.charAt(pos))) {
              result0 = input.charAt(pos);
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("[#-[]");
              }
            }
            if (result0 === null) {
              if (/^[\]-~]/.test(input.charAt(pos))) {
                result0 = input.charAt(pos);
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("[\\]-~]");
                }
              }
              if (result0 === null) {
                result0 = parse_UTF8_NONASCII();
              }
            }
          }
        }
        return result0;
      }
      function parse_quoted_pair() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        if (input.charCodeAt(pos) === 92) {
          result0 = "\\";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\\\"");
          }
        }
        if (result0 !== null) {
          if (/^[\0-\t]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[\\0-\\t]");
            }
          }
          if (result1 === null) {
            if (/^[\x0B-\f]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[\\x0B-\\f]");
              }
            }
            if (result1 === null) {
              if (/^[\x0E-]/.test(input.charAt(pos))) {
                result1 = input.charAt(pos);
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("[\\x0E-]");
                }
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_SIP_URI_noparams() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_uri_scheme();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_userinfo();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_hostport();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            try {
              data.uri = new URI(data.scheme, data.user, data.host, data.port);
              delete data.scheme;
              delete data.user;
              delete data.host;
              delete data.host_type;
              delete data.port;
            } catch (e) {
              data = -1;
            }
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_SIP_URI() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_uri_scheme();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_userinfo();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_hostport();
              if (result3 !== null) {
                result4 = parse_uri_parameters();
                if (result4 !== null) {
                  result5 = parse_headers();
                  result5 = result5 !== null ? result5 : "";
                  if (result5 !== null) {
                    result0 = [result0, result1, result2, result3, result4, result5];
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            var header;
            try {
              data.uri = new URI(data.scheme, data.user, data.host, data.port, data.uri_params, data.uri_headers);
              delete data.scheme;
              delete data.user;
              delete data.host;
              delete data.host_type;
              delete data.port;
              delete data.uri_params;
              if (startRule === 'SIP_URI') {
                data = data.uri;
              }
            } catch (e) {
              data = -1;
            }
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_uri_scheme() {
        var result0;
        result0 = parse_uri_scheme_sips();
        if (result0 === null) {
          result0 = parse_uri_scheme_sip();
        }
        return result0;
      }
      function parse_uri_scheme_sips() {
        var result0;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 4).toLowerCase() === "sips") {
          result0 = input.substr(pos, 4);
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"sips\"");
          }
        }
        if (result0 !== null) {
          result0 = function (offset, scheme) {
            data.scheme = scheme.toLowerCase();
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_uri_scheme_sip() {
        var result0;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 3).toLowerCase() === "sip") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"sip\"");
          }
        }
        if (result0 !== null) {
          result0 = function (offset, scheme) {
            data.scheme = scheme.toLowerCase();
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_userinfo() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_user();
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_password();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 64) {
              result2 = "@";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"@\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.user = decodeURIComponent(input.substring(pos - 1, offset));
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_user() {
        var result0, result1;
        result1 = parse_unreserved();
        if (result1 === null) {
          result1 = parse_escaped();
          if (result1 === null) {
            result1 = parse_user_unreserved();
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_unreserved();
            if (result1 === null) {
              result1 = parse_escaped();
              if (result1 === null) {
                result1 = parse_user_unreserved();
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      function parse_user_unreserved() {
        var result0;
        if (input.charCodeAt(pos) === 38) {
          result0 = "&";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"&\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 61) {
            result0 = "=";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 43) {
              result0 = "+";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"+\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 36) {
                result0 = "$";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"$\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 44) {
                  result0 = ",";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\",\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 59) {
                    result0 = ";";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\";\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 63) {
                      result0 = "?";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"?\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 47) {
                        result0 = "/";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"/\"");
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_password() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result0 = [];
        result1 = parse_unreserved();
        if (result1 === null) {
          result1 = parse_escaped();
          if (result1 === null) {
            if (input.charCodeAt(pos) === 38) {
              result1 = "&";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"&\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 61) {
                result1 = "=";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"=\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 43) {
                  result1 = "+";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"+\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 36) {
                    result1 = "$";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"$\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 44) {
                      result1 = ",";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\",\"");
                      }
                    }
                  }
                }
              }
            }
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_unreserved();
          if (result1 === null) {
            result1 = parse_escaped();
            if (result1 === null) {
              if (input.charCodeAt(pos) === 38) {
                result1 = "&";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"&\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 61) {
                  result1 = "=";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"=\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 43) {
                    result1 = "+";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 36) {
                      result1 = "$";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"$\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 44) {
                        result1 = ",";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\",\"");
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.password = input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_hostport() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_host();
        if (result0 !== null) {
          pos1 = pos;
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_port();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos1;
            }
          } else {
            result1 = null;
            pos = pos1;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_host() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_hostname();
        if (result0 === null) {
          result0 = parse_IPv4address();
          if (result0 === null) {
            result0 = parse_IPv6reference();
          }
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.host = input.substring(pos, offset).toLowerCase();
            return data.host;
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_hostname() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        pos2 = pos;
        result1 = parse_domainlabel();
        if (result1 !== null) {
          if (input.charCodeAt(pos) === 46) {
            result2 = ".";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result2 !== null) {
            result1 = [result1, result2];
          } else {
            result1 = null;
            pos = pos2;
          }
        } else {
          result1 = null;
          pos = pos2;
        }
        while (result1 !== null) {
          result0.push(result1);
          pos2 = pos;
          result1 = parse_domainlabel();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 46) {
              result2 = ".";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
        }
        if (result0 !== null) {
          result1 = parse_toplabel();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 46) {
              result2 = ".";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.host_type = 'domain';
            return input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_domainlabel() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_alphanum();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_alphanum();
          if (result2 === null) {
            if (input.charCodeAt(pos) === 45) {
              result2 = "-";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"-\"");
              }
            }
            if (result2 === null) {
              if (input.charCodeAt(pos) === 95) {
                result2 = "_";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"_\"");
                }
              }
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_alphanum();
            if (result2 === null) {
              if (input.charCodeAt(pos) === 45) {
                result2 = "-";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result2 === null) {
                if (input.charCodeAt(pos) === 95) {
                  result2 = "_";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"_\"");
                  }
                }
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_toplabel() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_ALPHA();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_alphanum();
          if (result2 === null) {
            if (input.charCodeAt(pos) === 45) {
              result2 = "-";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"-\"");
              }
            }
            if (result2 === null) {
              if (input.charCodeAt(pos) === 95) {
                result2 = "_";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"_\"");
                }
              }
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_alphanum();
            if (result2 === null) {
              if (input.charCodeAt(pos) === 45) {
                result2 = "-";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result2 === null) {
                if (input.charCodeAt(pos) === 95) {
                  result2 = "_";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"_\"");
                  }
                }
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_IPv6reference() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 91) {
          result0 = "[";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_IPv6address();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 93) {
              result2 = "]";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"]\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.host_type = 'IPv6';
            return input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_IPv6address() {
        var result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10, result11, result12;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_h16();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_h16();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 58) {
                result3 = ":";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\":\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_h16();
                if (result4 !== null) {
                  if (input.charCodeAt(pos) === 58) {
                    result5 = ":";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\":\"");
                    }
                  }
                  if (result5 !== null) {
                    result6 = parse_h16();
                    if (result6 !== null) {
                      if (input.charCodeAt(pos) === 58) {
                        result7 = ":";
                        pos++;
                      } else {
                        result7 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result7 !== null) {
                        result8 = parse_h16();
                        if (result8 !== null) {
                          if (input.charCodeAt(pos) === 58) {
                            result9 = ":";
                            pos++;
                          } else {
                            result9 = null;
                            if (reportFailures === 0) {
                              matchFailed("\":\"");
                            }
                          }
                          if (result9 !== null) {
                            result10 = parse_h16();
                            if (result10 !== null) {
                              if (input.charCodeAt(pos) === 58) {
                                result11 = ":";
                                pos++;
                              } else {
                                result11 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\":\"");
                                }
                              }
                              if (result11 !== null) {
                                result12 = parse_ls32();
                                if (result12 !== null) {
                                  result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10, result11, result12];
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 === null) {
          pos1 = pos;
          if (input.substr(pos, 2) === "::") {
            result0 = "::";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"::\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_h16();
            if (result1 !== null) {
              if (input.charCodeAt(pos) === 58) {
                result2 = ":";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\":\"");
                }
              }
              if (result2 !== null) {
                result3 = parse_h16();
                if (result3 !== null) {
                  if (input.charCodeAt(pos) === 58) {
                    result4 = ":";
                    pos++;
                  } else {
                    result4 = null;
                    if (reportFailures === 0) {
                      matchFailed("\":\"");
                    }
                  }
                  if (result4 !== null) {
                    result5 = parse_h16();
                    if (result5 !== null) {
                      if (input.charCodeAt(pos) === 58) {
                        result6 = ":";
                        pos++;
                      } else {
                        result6 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result6 !== null) {
                        result7 = parse_h16();
                        if (result7 !== null) {
                          if (input.charCodeAt(pos) === 58) {
                            result8 = ":";
                            pos++;
                          } else {
                            result8 = null;
                            if (reportFailures === 0) {
                              matchFailed("\":\"");
                            }
                          }
                          if (result8 !== null) {
                            result9 = parse_h16();
                            if (result9 !== null) {
                              if (input.charCodeAt(pos) === 58) {
                                result10 = ":";
                                pos++;
                              } else {
                                result10 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\":\"");
                                }
                              }
                              if (result10 !== null) {
                                result11 = parse_ls32();
                                if (result11 !== null) {
                                  result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10, result11];
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 === null) {
            pos1 = pos;
            if (input.substr(pos, 2) === "::") {
              result0 = "::";
              pos += 2;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"::\"");
              }
            }
            if (result0 !== null) {
              result1 = parse_h16();
              if (result1 !== null) {
                if (input.charCodeAt(pos) === 58) {
                  result2 = ":";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\":\"");
                  }
                }
                if (result2 !== null) {
                  result3 = parse_h16();
                  if (result3 !== null) {
                    if (input.charCodeAt(pos) === 58) {
                      result4 = ":";
                      pos++;
                    } else {
                      result4 = null;
                      if (reportFailures === 0) {
                        matchFailed("\":\"");
                      }
                    }
                    if (result4 !== null) {
                      result5 = parse_h16();
                      if (result5 !== null) {
                        if (input.charCodeAt(pos) === 58) {
                          result6 = ":";
                          pos++;
                        } else {
                          result6 = null;
                          if (reportFailures === 0) {
                            matchFailed("\":\"");
                          }
                        }
                        if (result6 !== null) {
                          result7 = parse_h16();
                          if (result7 !== null) {
                            if (input.charCodeAt(pos) === 58) {
                              result8 = ":";
                              pos++;
                            } else {
                              result8 = null;
                              if (reportFailures === 0) {
                                matchFailed("\":\"");
                              }
                            }
                            if (result8 !== null) {
                              result9 = parse_ls32();
                              if (result9 !== null) {
                                result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9];
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
            if (result0 === null) {
              pos1 = pos;
              if (input.substr(pos, 2) === "::") {
                result0 = "::";
                pos += 2;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"::\"");
                }
              }
              if (result0 !== null) {
                result1 = parse_h16();
                if (result1 !== null) {
                  if (input.charCodeAt(pos) === 58) {
                    result2 = ":";
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\":\"");
                    }
                  }
                  if (result2 !== null) {
                    result3 = parse_h16();
                    if (result3 !== null) {
                      if (input.charCodeAt(pos) === 58) {
                        result4 = ":";
                        pos++;
                      } else {
                        result4 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result4 !== null) {
                        result5 = parse_h16();
                        if (result5 !== null) {
                          if (input.charCodeAt(pos) === 58) {
                            result6 = ":";
                            pos++;
                          } else {
                            result6 = null;
                            if (reportFailures === 0) {
                              matchFailed("\":\"");
                            }
                          }
                          if (result6 !== null) {
                            result7 = parse_ls32();
                            if (result7 !== null) {
                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
              if (result0 === null) {
                pos1 = pos;
                if (input.substr(pos, 2) === "::") {
                  result0 = "::";
                  pos += 2;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"::\"");
                  }
                }
                if (result0 !== null) {
                  result1 = parse_h16();
                  if (result1 !== null) {
                    if (input.charCodeAt(pos) === 58) {
                      result2 = ":";
                      pos++;
                    } else {
                      result2 = null;
                      if (reportFailures === 0) {
                        matchFailed("\":\"");
                      }
                    }
                    if (result2 !== null) {
                      result3 = parse_h16();
                      if (result3 !== null) {
                        if (input.charCodeAt(pos) === 58) {
                          result4 = ":";
                          pos++;
                        } else {
                          result4 = null;
                          if (reportFailures === 0) {
                            matchFailed("\":\"");
                          }
                        }
                        if (result4 !== null) {
                          result5 = parse_ls32();
                          if (result5 !== null) {
                            result0 = [result0, result1, result2, result3, result4, result5];
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
                if (result0 === null) {
                  pos1 = pos;
                  if (input.substr(pos, 2) === "::") {
                    result0 = "::";
                    pos += 2;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"::\"");
                    }
                  }
                  if (result0 !== null) {
                    result1 = parse_h16();
                    if (result1 !== null) {
                      if (input.charCodeAt(pos) === 58) {
                        result2 = ":";
                        pos++;
                      } else {
                        result2 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result2 !== null) {
                        result3 = parse_ls32();
                        if (result3 !== null) {
                          result0 = [result0, result1, result2, result3];
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                  if (result0 === null) {
                    pos1 = pos;
                    if (input.substr(pos, 2) === "::") {
                      result0 = "::";
                      pos += 2;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"::\"");
                      }
                    }
                    if (result0 !== null) {
                      result1 = parse_ls32();
                      if (result1 !== null) {
                        result0 = [result0, result1];
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                    if (result0 === null) {
                      pos1 = pos;
                      if (input.substr(pos, 2) === "::") {
                        result0 = "::";
                        pos += 2;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"::\"");
                        }
                      }
                      if (result0 !== null) {
                        result1 = parse_h16();
                        if (result1 !== null) {
                          result0 = [result0, result1];
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                      if (result0 === null) {
                        pos1 = pos;
                        result0 = parse_h16();
                        if (result0 !== null) {
                          if (input.substr(pos, 2) === "::") {
                            result1 = "::";
                            pos += 2;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"::\"");
                            }
                          }
                          if (result1 !== null) {
                            result2 = parse_h16();
                            if (result2 !== null) {
                              if (input.charCodeAt(pos) === 58) {
                                result3 = ":";
                                pos++;
                              } else {
                                result3 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\":\"");
                                }
                              }
                              if (result3 !== null) {
                                result4 = parse_h16();
                                if (result4 !== null) {
                                  if (input.charCodeAt(pos) === 58) {
                                    result5 = ":";
                                    pos++;
                                  } else {
                                    result5 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\":\"");
                                    }
                                  }
                                  if (result5 !== null) {
                                    result6 = parse_h16();
                                    if (result6 !== null) {
                                      if (input.charCodeAt(pos) === 58) {
                                        result7 = ":";
                                        pos++;
                                      } else {
                                        result7 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result7 !== null) {
                                        result8 = parse_h16();
                                        if (result8 !== null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result9 = ":";
                                            pos++;
                                          } else {
                                            result9 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result9 !== null) {
                                            result10 = parse_ls32();
                                            if (result10 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                        if (result0 === null) {
                          pos1 = pos;
                          result0 = parse_h16();
                          if (result0 !== null) {
                            pos2 = pos;
                            if (input.charCodeAt(pos) === 58) {
                              result1 = ":";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\":\"");
                              }
                            }
                            if (result1 !== null) {
                              result2 = parse_h16();
                              if (result2 !== null) {
                                result1 = [result1, result2];
                              } else {
                                result1 = null;
                                pos = pos2;
                              }
                            } else {
                              result1 = null;
                              pos = pos2;
                            }
                            result1 = result1 !== null ? result1 : "";
                            if (result1 !== null) {
                              if (input.substr(pos, 2) === "::") {
                                result2 = "::";
                                pos += 2;
                              } else {
                                result2 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"::\"");
                                }
                              }
                              if (result2 !== null) {
                                result3 = parse_h16();
                                if (result3 !== null) {
                                  if (input.charCodeAt(pos) === 58) {
                                    result4 = ":";
                                    pos++;
                                  } else {
                                    result4 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\":\"");
                                    }
                                  }
                                  if (result4 !== null) {
                                    result5 = parse_h16();
                                    if (result5 !== null) {
                                      if (input.charCodeAt(pos) === 58) {
                                        result6 = ":";
                                        pos++;
                                      } else {
                                        result6 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result6 !== null) {
                                        result7 = parse_h16();
                                        if (result7 !== null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result8 = ":";
                                            pos++;
                                          } else {
                                            result8 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result8 !== null) {
                                            result9 = parse_ls32();
                                            if (result9 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                          if (result0 === null) {
                            pos1 = pos;
                            result0 = parse_h16();
                            if (result0 !== null) {
                              pos2 = pos;
                              if (input.charCodeAt(pos) === 58) {
                                result1 = ":";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\":\"");
                                }
                              }
                              if (result1 !== null) {
                                result2 = parse_h16();
                                if (result2 !== null) {
                                  result1 = [result1, result2];
                                } else {
                                  result1 = null;
                                  pos = pos2;
                                }
                              } else {
                                result1 = null;
                                pos = pos2;
                              }
                              result1 = result1 !== null ? result1 : "";
                              if (result1 !== null) {
                                pos2 = pos;
                                if (input.charCodeAt(pos) === 58) {
                                  result2 = ":";
                                  pos++;
                                } else {
                                  result2 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\":\"");
                                  }
                                }
                                if (result2 !== null) {
                                  result3 = parse_h16();
                                  if (result3 !== null) {
                                    result2 = [result2, result3];
                                  } else {
                                    result2 = null;
                                    pos = pos2;
                                  }
                                } else {
                                  result2 = null;
                                  pos = pos2;
                                }
                                result2 = result2 !== null ? result2 : "";
                                if (result2 !== null) {
                                  if (input.substr(pos, 2) === "::") {
                                    result3 = "::";
                                    pos += 2;
                                  } else {
                                    result3 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\"::\"");
                                    }
                                  }
                                  if (result3 !== null) {
                                    result4 = parse_h16();
                                    if (result4 !== null) {
                                      if (input.charCodeAt(pos) === 58) {
                                        result5 = ":";
                                        pos++;
                                      } else {
                                        result5 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result5 !== null) {
                                        result6 = parse_h16();
                                        if (result6 !== null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result7 = ":";
                                            pos++;
                                          } else {
                                            result7 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result7 !== null) {
                                            result8 = parse_ls32();
                                            if (result8 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                            if (result0 === null) {
                              pos1 = pos;
                              result0 = parse_h16();
                              if (result0 !== null) {
                                pos2 = pos;
                                if (input.charCodeAt(pos) === 58) {
                                  result1 = ":";
                                  pos++;
                                } else {
                                  result1 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\":\"");
                                  }
                                }
                                if (result1 !== null) {
                                  result2 = parse_h16();
                                  if (result2 !== null) {
                                    result1 = [result1, result2];
                                  } else {
                                    result1 = null;
                                    pos = pos2;
                                  }
                                } else {
                                  result1 = null;
                                  pos = pos2;
                                }
                                result1 = result1 !== null ? result1 : "";
                                if (result1 !== null) {
                                  pos2 = pos;
                                  if (input.charCodeAt(pos) === 58) {
                                    result2 = ":";
                                    pos++;
                                  } else {
                                    result2 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\":\"");
                                    }
                                  }
                                  if (result2 !== null) {
                                    result3 = parse_h16();
                                    if (result3 !== null) {
                                      result2 = [result2, result3];
                                    } else {
                                      result2 = null;
                                      pos = pos2;
                                    }
                                  } else {
                                    result2 = null;
                                    pos = pos2;
                                  }
                                  result2 = result2 !== null ? result2 : "";
                                  if (result2 !== null) {
                                    pos2 = pos;
                                    if (input.charCodeAt(pos) === 58) {
                                      result3 = ":";
                                      pos++;
                                    } else {
                                      result3 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\":\"");
                                      }
                                    }
                                    if (result3 !== null) {
                                      result4 = parse_h16();
                                      if (result4 !== null) {
                                        result3 = [result3, result4];
                                      } else {
                                        result3 = null;
                                        pos = pos2;
                                      }
                                    } else {
                                      result3 = null;
                                      pos = pos2;
                                    }
                                    result3 = result3 !== null ? result3 : "";
                                    if (result3 !== null) {
                                      if (input.substr(pos, 2) === "::") {
                                        result4 = "::";
                                        pos += 2;
                                      } else {
                                        result4 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\"::\"");
                                        }
                                      }
                                      if (result4 !== null) {
                                        result5 = parse_h16();
                                        if (result5 !== null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result6 = ":";
                                            pos++;
                                          } else {
                                            result6 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result6 !== null) {
                                            result7 = parse_ls32();
                                            if (result7 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                              if (result0 === null) {
                                pos1 = pos;
                                result0 = parse_h16();
                                if (result0 !== null) {
                                  pos2 = pos;
                                  if (input.charCodeAt(pos) === 58) {
                                    result1 = ":";
                                    pos++;
                                  } else {
                                    result1 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\":\"");
                                    }
                                  }
                                  if (result1 !== null) {
                                    result2 = parse_h16();
                                    if (result2 !== null) {
                                      result1 = [result1, result2];
                                    } else {
                                      result1 = null;
                                      pos = pos2;
                                    }
                                  } else {
                                    result1 = null;
                                    pos = pos2;
                                  }
                                  result1 = result1 !== null ? result1 : "";
                                  if (result1 !== null) {
                                    pos2 = pos;
                                    if (input.charCodeAt(pos) === 58) {
                                      result2 = ":";
                                      pos++;
                                    } else {
                                      result2 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\":\"");
                                      }
                                    }
                                    if (result2 !== null) {
                                      result3 = parse_h16();
                                      if (result3 !== null) {
                                        result2 = [result2, result3];
                                      } else {
                                        result2 = null;
                                        pos = pos2;
                                      }
                                    } else {
                                      result2 = null;
                                      pos = pos2;
                                    }
                                    result2 = result2 !== null ? result2 : "";
                                    if (result2 !== null) {
                                      pos2 = pos;
                                      if (input.charCodeAt(pos) === 58) {
                                        result3 = ":";
                                        pos++;
                                      } else {
                                        result3 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result3 !== null) {
                                        result4 = parse_h16();
                                        if (result4 !== null) {
                                          result3 = [result3, result4];
                                        } else {
                                          result3 = null;
                                          pos = pos2;
                                        }
                                      } else {
                                        result3 = null;
                                        pos = pos2;
                                      }
                                      result3 = result3 !== null ? result3 : "";
                                      if (result3 !== null) {
                                        pos2 = pos;
                                        if (input.charCodeAt(pos) === 58) {
                                          result4 = ":";
                                          pos++;
                                        } else {
                                          result4 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\":\"");
                                          }
                                        }
                                        if (result4 !== null) {
                                          result5 = parse_h16();
                                          if (result5 !== null) {
                                            result4 = [result4, result5];
                                          } else {
                                            result4 = null;
                                            pos = pos2;
                                          }
                                        } else {
                                          result4 = null;
                                          pos = pos2;
                                        }
                                        result4 = result4 !== null ? result4 : "";
                                        if (result4 !== null) {
                                          if (input.substr(pos, 2) === "::") {
                                            result5 = "::";
                                            pos += 2;
                                          } else {
                                            result5 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\"::\"");
                                            }
                                          }
                                          if (result5 !== null) {
                                            result6 = parse_ls32();
                                            if (result6 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                                if (result0 === null) {
                                  pos1 = pos;
                                  result0 = parse_h16();
                                  if (result0 !== null) {
                                    pos2 = pos;
                                    if (input.charCodeAt(pos) === 58) {
                                      result1 = ":";
                                      pos++;
                                    } else {
                                      result1 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\":\"");
                                      }
                                    }
                                    if (result1 !== null) {
                                      result2 = parse_h16();
                                      if (result2 !== null) {
                                        result1 = [result1, result2];
                                      } else {
                                        result1 = null;
                                        pos = pos2;
                                      }
                                    } else {
                                      result1 = null;
                                      pos = pos2;
                                    }
                                    result1 = result1 !== null ? result1 : "";
                                    if (result1 !== null) {
                                      pos2 = pos;
                                      if (input.charCodeAt(pos) === 58) {
                                        result2 = ":";
                                        pos++;
                                      } else {
                                        result2 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result2 !== null) {
                                        result3 = parse_h16();
                                        if (result3 !== null) {
                                          result2 = [result2, result3];
                                        } else {
                                          result2 = null;
                                          pos = pos2;
                                        }
                                      } else {
                                        result2 = null;
                                        pos = pos2;
                                      }
                                      result2 = result2 !== null ? result2 : "";
                                      if (result2 !== null) {
                                        pos2 = pos;
                                        if (input.charCodeAt(pos) === 58) {
                                          result3 = ":";
                                          pos++;
                                        } else {
                                          result3 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\":\"");
                                          }
                                        }
                                        if (result3 !== null) {
                                          result4 = parse_h16();
                                          if (result4 !== null) {
                                            result3 = [result3, result4];
                                          } else {
                                            result3 = null;
                                            pos = pos2;
                                          }
                                        } else {
                                          result3 = null;
                                          pos = pos2;
                                        }
                                        result3 = result3 !== null ? result3 : "";
                                        if (result3 !== null) {
                                          pos2 = pos;
                                          if (input.charCodeAt(pos) === 58) {
                                            result4 = ":";
                                            pos++;
                                          } else {
                                            result4 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result4 !== null) {
                                            result5 = parse_h16();
                                            if (result5 !== null) {
                                              result4 = [result4, result5];
                                            } else {
                                              result4 = null;
                                              pos = pos2;
                                            }
                                          } else {
                                            result4 = null;
                                            pos = pos2;
                                          }
                                          result4 = result4 !== null ? result4 : "";
                                          if (result4 !== null) {
                                            pos2 = pos;
                                            if (input.charCodeAt(pos) === 58) {
                                              result5 = ":";
                                              pos++;
                                            } else {
                                              result5 = null;
                                              if (reportFailures === 0) {
                                                matchFailed("\":\"");
                                              }
                                            }
                                            if (result5 !== null) {
                                              result6 = parse_h16();
                                              if (result6 !== null) {
                                                result5 = [result5, result6];
                                              } else {
                                                result5 = null;
                                                pos = pos2;
                                              }
                                            } else {
                                              result5 = null;
                                              pos = pos2;
                                            }
                                            result5 = result5 !== null ? result5 : "";
                                            if (result5 !== null) {
                                              if (input.substr(pos, 2) === "::") {
                                                result6 = "::";
                                                pos += 2;
                                              } else {
                                                result6 = null;
                                                if (reportFailures === 0) {
                                                  matchFailed("\"::\"");
                                                }
                                              }
                                              if (result6 !== null) {
                                                result7 = parse_h16();
                                                if (result7 !== null) {
                                                  result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                                                } else {
                                                  result0 = null;
                                                  pos = pos1;
                                                }
                                              } else {
                                                result0 = null;
                                                pos = pos1;
                                              }
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                  if (result0 === null) {
                                    pos1 = pos;
                                    result0 = parse_h16();
                                    if (result0 !== null) {
                                      pos2 = pos;
                                      if (input.charCodeAt(pos) === 58) {
                                        result1 = ":";
                                        pos++;
                                      } else {
                                        result1 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result1 !== null) {
                                        result2 = parse_h16();
                                        if (result2 !== null) {
                                          result1 = [result1, result2];
                                        } else {
                                          result1 = null;
                                          pos = pos2;
                                        }
                                      } else {
                                        result1 = null;
                                        pos = pos2;
                                      }
                                      result1 = result1 !== null ? result1 : "";
                                      if (result1 !== null) {
                                        pos2 = pos;
                                        if (input.charCodeAt(pos) === 58) {
                                          result2 = ":";
                                          pos++;
                                        } else {
                                          result2 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\":\"");
                                          }
                                        }
                                        if (result2 !== null) {
                                          result3 = parse_h16();
                                          if (result3 !== null) {
                                            result2 = [result2, result3];
                                          } else {
                                            result2 = null;
                                            pos = pos2;
                                          }
                                        } else {
                                          result2 = null;
                                          pos = pos2;
                                        }
                                        result2 = result2 !== null ? result2 : "";
                                        if (result2 !== null) {
                                          pos2 = pos;
                                          if (input.charCodeAt(pos) === 58) {
                                            result3 = ":";
                                            pos++;
                                          } else {
                                            result3 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result3 !== null) {
                                            result4 = parse_h16();
                                            if (result4 !== null) {
                                              result3 = [result3, result4];
                                            } else {
                                              result3 = null;
                                              pos = pos2;
                                            }
                                          } else {
                                            result3 = null;
                                            pos = pos2;
                                          }
                                          result3 = result3 !== null ? result3 : "";
                                          if (result3 !== null) {
                                            pos2 = pos;
                                            if (input.charCodeAt(pos) === 58) {
                                              result4 = ":";
                                              pos++;
                                            } else {
                                              result4 = null;
                                              if (reportFailures === 0) {
                                                matchFailed("\":\"");
                                              }
                                            }
                                            if (result4 !== null) {
                                              result5 = parse_h16();
                                              if (result5 !== null) {
                                                result4 = [result4, result5];
                                              } else {
                                                result4 = null;
                                                pos = pos2;
                                              }
                                            } else {
                                              result4 = null;
                                              pos = pos2;
                                            }
                                            result4 = result4 !== null ? result4 : "";
                                            if (result4 !== null) {
                                              pos2 = pos;
                                              if (input.charCodeAt(pos) === 58) {
                                                result5 = ":";
                                                pos++;
                                              } else {
                                                result5 = null;
                                                if (reportFailures === 0) {
                                                  matchFailed("\":\"");
                                                }
                                              }
                                              if (result5 !== null) {
                                                result6 = parse_h16();
                                                if (result6 !== null) {
                                                  result5 = [result5, result6];
                                                } else {
                                                  result5 = null;
                                                  pos = pos2;
                                                }
                                              } else {
                                                result5 = null;
                                                pos = pos2;
                                              }
                                              result5 = result5 !== null ? result5 : "";
                                              if (result5 !== null) {
                                                pos2 = pos;
                                                if (input.charCodeAt(pos) === 58) {
                                                  result6 = ":";
                                                  pos++;
                                                } else {
                                                  result6 = null;
                                                  if (reportFailures === 0) {
                                                    matchFailed("\":\"");
                                                  }
                                                }
                                                if (result6 !== null) {
                                                  result7 = parse_h16();
                                                  if (result7 !== null) {
                                                    result6 = [result6, result7];
                                                  } else {
                                                    result6 = null;
                                                    pos = pos2;
                                                  }
                                                } else {
                                                  result6 = null;
                                                  pos = pos2;
                                                }
                                                result6 = result6 !== null ? result6 : "";
                                                if (result6 !== null) {
                                                  if (input.substr(pos, 2) === "::") {
                                                    result7 = "::";
                                                    pos += 2;
                                                  } else {
                                                    result7 = null;
                                                    if (reportFailures === 0) {
                                                      matchFailed("\"::\"");
                                                    }
                                                  }
                                                  if (result7 !== null) {
                                                    result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                                                  } else {
                                                    result0 = null;
                                                    pos = pos1;
                                                  }
                                                } else {
                                                  result0 = null;
                                                  pos = pos1;
                                                }
                                              } else {
                                                result0 = null;
                                                pos = pos1;
                                              }
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.host_type = 'IPv6';
            return input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_h16() {
        var result0, result1, result2, result3;
        var pos0;
        pos0 = pos;
        result0 = parse_HEXDIG();
        if (result0 !== null) {
          result1 = parse_HEXDIG();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_HEXDIG();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_HEXDIG();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_ls32() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_h16();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_h16();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        if (result0 === null) {
          result0 = parse_IPv4address();
        }
        return result0;
      }
      function parse_IPv4address() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_dec_octet();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 46) {
            result1 = ".";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_dec_octet();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 46) {
                result3 = ".";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\".\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_dec_octet();
                if (result4 !== null) {
                  if (input.charCodeAt(pos) === 46) {
                    result5 = ".";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\".\"");
                    }
                  }
                  if (result5 !== null) {
                    result6 = parse_dec_octet();
                    if (result6 !== null) {
                      result0 = [result0, result1, result2, result3, result4, result5, result6];
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.host_type = 'IPv4';
            return input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_dec_octet() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 2) === "25") {
          result0 = "25";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"25\"");
          }
        }
        if (result0 !== null) {
          if (/^[0-5]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[0-5]");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          if (input.charCodeAt(pos) === 50) {
            result0 = "2";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"2\"");
            }
          }
          if (result0 !== null) {
            if (/^[0-4]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[0-4]");
              }
            }
            if (result1 !== null) {
              result2 = parse_DIGIT();
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
          if (result0 === null) {
            pos0 = pos;
            if (input.charCodeAt(pos) === 49) {
              result0 = "1";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"1\"");
              }
            }
            if (result0 !== null) {
              result1 = parse_DIGIT();
              if (result1 !== null) {
                result2 = parse_DIGIT();
                if (result2 !== null) {
                  result0 = [result0, result1, result2];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
            if (result0 === null) {
              pos0 = pos;
              if (/^[1-9]/.test(input.charAt(pos))) {
                result0 = input.charAt(pos);
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("[1-9]");
                }
              }
              if (result0 !== null) {
                result1 = parse_DIGIT();
                if (result1 !== null) {
                  result0 = [result0, result1];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
              if (result0 === null) {
                result0 = parse_DIGIT();
              }
            }
          }
        }
        return result0;
      }
      function parse_port() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_DIGIT();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_DIGIT();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_DIGIT();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_DIGIT();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = parse_DIGIT();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, port) {
            port = parseInt(port.join(''));
            data.port = port;
            return port;
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_uri_parameters() {
        var result0, result1, result2;
        var pos0;
        result0 = [];
        pos0 = pos;
        if (input.charCodeAt(pos) === 59) {
          result1 = ";";
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("\";\"");
          }
        }
        if (result1 !== null) {
          result2 = parse_uri_parameter();
          if (result2 !== null) {
            result1 = [result1, result2];
          } else {
            result1 = null;
            pos = pos0;
          }
        } else {
          result1 = null;
          pos = pos0;
        }
        while (result1 !== null) {
          result0.push(result1);
          pos0 = pos;
          if (input.charCodeAt(pos) === 59) {
            result1 = ";";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\";\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_uri_parameter();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos0;
            }
          } else {
            result1 = null;
            pos = pos0;
          }
        }
        return result0;
      }
      function parse_uri_parameter() {
        var result0;
        result0 = parse_transport_param();
        if (result0 === null) {
          result0 = parse_user_param();
          if (result0 === null) {
            result0 = parse_method_param();
            if (result0 === null) {
              result0 = parse_ttl_param();
              if (result0 === null) {
                result0 = parse_maddr_param();
                if (result0 === null) {
                  result0 = parse_lr_param();
                  if (result0 === null) {
                    result0 = parse_other_param();
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_transport_param() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 10).toLowerCase() === "transport=") {
          result0 = input.substr(pos, 10);
          pos += 10;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"transport=\"");
          }
        }
        if (result0 !== null) {
          if (input.substr(pos, 3).toLowerCase() === "udp") {
            result1 = input.substr(pos, 3);
            pos += 3;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"udp\"");
            }
          }
          if (result1 === null) {
            if (input.substr(pos, 3).toLowerCase() === "tcp") {
              result1 = input.substr(pos, 3);
              pos += 3;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"tcp\"");
              }
            }
            if (result1 === null) {
              if (input.substr(pos, 4).toLowerCase() === "sctp") {
                result1 = input.substr(pos, 4);
                pos += 4;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"sctp\"");
                }
              }
              if (result1 === null) {
                if (input.substr(pos, 3).toLowerCase() === "tls") {
                  result1 = input.substr(pos, 3);
                  pos += 3;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"tls\"");
                  }
                }
                if (result1 === null) {
                  result1 = parse_token();
                }
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, transport) {
            if (!data.uri_params) data.uri_params = {};
            data.uri_params['transport'] = transport.toLowerCase();
          }(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_user_param() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 5).toLowerCase() === "user=") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"user=\"");
          }
        }
        if (result0 !== null) {
          if (input.substr(pos, 5).toLowerCase() === "phone") {
            result1 = input.substr(pos, 5);
            pos += 5;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"phone\"");
            }
          }
          if (result1 === null) {
            if (input.substr(pos, 2).toLowerCase() === "ip") {
              result1 = input.substr(pos, 2);
              pos += 2;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"ip\"");
              }
            }
            if (result1 === null) {
              result1 = parse_token();
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, user) {
            if (!data.uri_params) data.uri_params = {};
            data.uri_params['user'] = user.toLowerCase();
          }(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_method_param() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 7).toLowerCase() === "method=") {
          result0 = input.substr(pos, 7);
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"method=\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_Method();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, method) {
            if (!data.uri_params) data.uri_params = {};
            data.uri_params['method'] = method;
          }(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_ttl_param() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 4).toLowerCase() === "ttl=") {
          result0 = input.substr(pos, 4);
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"ttl=\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_ttl();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, ttl) {
            if (!data.params) data.params = {};
            data.params['ttl'] = ttl;
          }(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_maddr_param() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 6).toLowerCase() === "maddr=") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"maddr=\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_host();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, maddr) {
            if (!data.uri_params) data.uri_params = {};
            data.uri_params['maddr'] = maddr;
          }(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_lr_param() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 2).toLowerCase() === "lr") {
          result0 = input.substr(pos, 2);
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"lr\"");
          }
        }
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 61) {
            result1 = "=";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            if (!data.uri_params) data.uri_params = {};
            data.uri_params['lr'] = undefined;
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_other_param() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_pname();
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 61) {
            result1 = "=";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_pvalue();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, param, value) {
            if (!data.uri_params) data.uri_params = {};
            if (typeof value === 'undefined') {
              value = undefined;
            } else {
              value = value[1];
            }
            data.uri_params[param.toLowerCase()] = value;
          }(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_pname() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result1 = parse_paramchar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_paramchar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = function (offset, pname) {
            return pname.join('');
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_pvalue() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result1 = parse_paramchar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_paramchar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = function (offset, pvalue) {
            return pvalue.join('');
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_paramchar() {
        var result0;
        result0 = parse_param_unreserved();
        if (result0 === null) {
          result0 = parse_unreserved();
          if (result0 === null) {
            result0 = parse_escaped();
          }
        }
        return result0;
      }
      function parse_param_unreserved() {
        var result0;
        if (input.charCodeAt(pos) === 91) {
          result0 = "[";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 93) {
            result0 = "]";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"]\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 47) {
              result0 = "/";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"/\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 58) {
                result0 = ":";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\":\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 38) {
                  result0 = "&";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"&\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 43) {
                    result0 = "+";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 36) {
                      result0 = "$";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"$\"");
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_headers() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        pos0 = pos;
        if (input.charCodeAt(pos) === 63) {
          result0 = "?";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"?\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_header();
          if (result1 !== null) {
            result2 = [];
            pos1 = pos;
            if (input.charCodeAt(pos) === 38) {
              result3 = "&";
              pos++;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"&\"");
              }
            }
            if (result3 !== null) {
              result4 = parse_header();
              if (result4 !== null) {
                result3 = [result3, result4];
              } else {
                result3 = null;
                pos = pos1;
              }
            } else {
              result3 = null;
              pos = pos1;
            }
            while (result3 !== null) {
              result2.push(result3);
              pos1 = pos;
              if (input.charCodeAt(pos) === 38) {
                result3 = "&";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"&\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_header();
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = pos1;
                }
              } else {
                result3 = null;
                pos = pos1;
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_header() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_hname();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 61) {
            result1 = "=";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_hvalue();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, hname, hvalue) {
            hname = hname.join('').toLowerCase();
            hvalue = hvalue.join('');
            if (!data.uri_headers) data.uri_headers = {};
            if (!data.uri_headers[hname]) {
              data.uri_headers[hname] = [hvalue];
            } else {
              data.uri_headers[hname].push(hvalue);
            }
          }(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_hname() {
        var result0, result1;
        result1 = parse_hnv_unreserved();
        if (result1 === null) {
          result1 = parse_unreserved();
          if (result1 === null) {
            result1 = parse_escaped();
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_hnv_unreserved();
            if (result1 === null) {
              result1 = parse_unreserved();
              if (result1 === null) {
                result1 = parse_escaped();
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      function parse_hvalue() {
        var result0, result1;
        result0 = [];
        result1 = parse_hnv_unreserved();
        if (result1 === null) {
          result1 = parse_unreserved();
          if (result1 === null) {
            result1 = parse_escaped();
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_hnv_unreserved();
          if (result1 === null) {
            result1 = parse_unreserved();
            if (result1 === null) {
              result1 = parse_escaped();
            }
          }
        }
        return result0;
      }
      function parse_hnv_unreserved() {
        var result0;
        if (input.charCodeAt(pos) === 91) {
          result0 = "[";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 93) {
            result0 = "]";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"]\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 47) {
              result0 = "/";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"/\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 63) {
                result0 = "?";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"?\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 58) {
                  result0 = ":";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\":\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 43) {
                    result0 = "+";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 36) {
                      result0 = "$";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"$\"");
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_Request_Response() {
        var result0;
        result0 = parse_Status_Line();
        if (result0 === null) {
          result0 = parse_Request_Line();
        }
        return result0;
      }
      function parse_Request_Line() {
        var result0, result1, result2, result3, result4;
        var pos0;
        pos0 = pos;
        result0 = parse_Method();
        if (result0 !== null) {
          result1 = parse_SP();
          if (result1 !== null) {
            result2 = parse_Request_URI();
            if (result2 !== null) {
              result3 = parse_SP();
              if (result3 !== null) {
                result4 = parse_SIP_Version();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Request_URI() {
        var result0;
        result0 = parse_SIP_URI();
        if (result0 === null) {
          result0 = parse_absoluteURI();
        }
        return result0;
      }
      function parse_absoluteURI() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_scheme();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_hier_part();
            if (result2 === null) {
              result2 = parse_opaque_part();
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_hier_part() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_net_path();
        if (result0 === null) {
          result0 = parse_abs_path();
        }
        if (result0 !== null) {
          pos1 = pos;
          if (input.charCodeAt(pos) === 63) {
            result1 = "?";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"?\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_query();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos1;
            }
          } else {
            result1 = null;
            pos = pos1;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_net_path() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 2) === "//") {
          result0 = "//";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"//\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_authority();
          if (result1 !== null) {
            result2 = parse_abs_path();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_abs_path() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        if (input.charCodeAt(pos) === 47) {
          result0 = "/";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"/\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_path_segments();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_opaque_part() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_uric_no_slash();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_uric();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_uric();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_uric() {
        var result0;
        result0 = parse_reserved();
        if (result0 === null) {
          result0 = parse_unreserved();
          if (result0 === null) {
            result0 = parse_escaped();
          }
        }
        return result0;
      }
      function parse_uric_no_slash() {
        var result0;
        result0 = parse_unreserved();
        if (result0 === null) {
          result0 = parse_escaped();
          if (result0 === null) {
            if (input.charCodeAt(pos) === 59) {
              result0 = ";";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\";\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 63) {
                result0 = "?";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"?\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 58) {
                  result0 = ":";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\":\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 64) {
                    result0 = "@";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"@\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 38) {
                      result0 = "&";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"&\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 61) {
                        result0 = "=";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"=\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 43) {
                          result0 = "+";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"+\"");
                          }
                        }
                        if (result0 === null) {
                          if (input.charCodeAt(pos) === 36) {
                            result0 = "$";
                            pos++;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"$\"");
                            }
                          }
                          if (result0 === null) {
                            if (input.charCodeAt(pos) === 44) {
                              result0 = ",";
                              pos++;
                            } else {
                              result0 = null;
                              if (reportFailures === 0) {
                                matchFailed("\",\"");
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_path_segments() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_segment();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          if (input.charCodeAt(pos) === 47) {
            result2 = "/";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result2 !== null) {
            result3 = parse_segment();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            if (input.charCodeAt(pos) === 47) {
              result2 = "/";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"/\"");
              }
            }
            if (result2 !== null) {
              result3 = parse_segment();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_segment() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = [];
        result1 = parse_pchar();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_pchar();
        }
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          if (input.charCodeAt(pos) === 59) {
            result2 = ";";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\";\"");
            }
          }
          if (result2 !== null) {
            result3 = parse_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            if (input.charCodeAt(pos) === 59) {
              result2 = ";";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\";\"");
              }
            }
            if (result2 !== null) {
              result3 = parse_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_param() {
        var result0, result1;
        result0 = [];
        result1 = parse_pchar();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_pchar();
        }
        return result0;
      }
      function parse_pchar() {
        var result0;
        result0 = parse_unreserved();
        if (result0 === null) {
          result0 = parse_escaped();
          if (result0 === null) {
            if (input.charCodeAt(pos) === 58) {
              result0 = ":";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\":\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 64) {
                result0 = "@";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"@\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 38) {
                  result0 = "&";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"&\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 61) {
                    result0 = "=";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"=\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 43) {
                      result0 = "+";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"+\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 36) {
                        result0 = "$";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"$\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 44) {
                          result0 = ",";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\",\"");
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_scheme() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_ALPHA();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_ALPHA();
          if (result2 === null) {
            result2 = parse_DIGIT();
            if (result2 === null) {
              if (input.charCodeAt(pos) === 43) {
                result2 = "+";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"+\"");
                }
              }
              if (result2 === null) {
                if (input.charCodeAt(pos) === 45) {
                  result2 = "-";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"-\"");
                  }
                }
                if (result2 === null) {
                  if (input.charCodeAt(pos) === 46) {
                    result2 = ".";
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\".\"");
                    }
                  }
                }
              }
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_ALPHA();
            if (result2 === null) {
              result2 = parse_DIGIT();
              if (result2 === null) {
                if (input.charCodeAt(pos) === 43) {
                  result2 = "+";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"+\"");
                  }
                }
                if (result2 === null) {
                  if (input.charCodeAt(pos) === 45) {
                    result2 = "-";
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"-\"");
                    }
                  }
                  if (result2 === null) {
                    if (input.charCodeAt(pos) === 46) {
                      result2 = ".";
                      pos++;
                    } else {
                      result2 = null;
                      if (reportFailures === 0) {
                        matchFailed("\".\"");
                      }
                    }
                  }
                }
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.scheme = input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_authority() {
        var result0;
        result0 = parse_srvr();
        if (result0 === null) {
          result0 = parse_reg_name();
        }
        return result0;
      }
      function parse_srvr() {
        var result0, result1;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_userinfo();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 64) {
            result1 = "@";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"@\"");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_hostport();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        result0 = result0 !== null ? result0 : "";
        return result0;
      }
      function parse_reg_name() {
        var result0, result1;
        result1 = parse_unreserved();
        if (result1 === null) {
          result1 = parse_escaped();
          if (result1 === null) {
            if (input.charCodeAt(pos) === 36) {
              result1 = "$";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"$\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 44) {
                result1 = ",";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\",\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 59) {
                  result1 = ";";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\";\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 58) {
                    result1 = ":";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\":\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 64) {
                      result1 = "@";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"@\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 38) {
                        result1 = "&";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"&\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 61) {
                          result1 = "=";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"=\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 43) {
                            result1 = "+";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"+\"");
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_unreserved();
            if (result1 === null) {
              result1 = parse_escaped();
              if (result1 === null) {
                if (input.charCodeAt(pos) === 36) {
                  result1 = "$";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"$\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 44) {
                    result1 = ",";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\",\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 59) {
                      result1 = ";";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\";\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 58) {
                        result1 = ":";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 64) {
                          result1 = "@";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"@\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 38) {
                            result1 = "&";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"&\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 61) {
                              result1 = "=";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"=\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 43) {
                                result1 = "+";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"+\"");
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      function parse_query() {
        var result0, result1;
        result0 = [];
        result1 = parse_uric();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_uric();
        }
        return result0;
      }
      function parse_SIP_Version() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 3).toLowerCase() === "sip") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"SIP\"");
          }
        }
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 47) {
            result1 = "/";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result3 = parse_DIGIT();
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                result3 = parse_DIGIT();
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 46) {
                result3 = ".";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\".\"");
                }
              }
              if (result3 !== null) {
                result5 = parse_DIGIT();
                if (result5 !== null) {
                  result4 = [];
                  while (result5 !== null) {
                    result4.push(result5);
                    result5 = parse_DIGIT();
                  }
                } else {
                  result4 = null;
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.sip_version = input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_INVITEm() {
        var result0;
        if (input.substr(pos, 6) === "INVITE") {
          result0 = "INVITE";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"INVITE\"");
          }
        }
        return result0;
      }
      function parse_ACKm() {
        var result0;
        if (input.substr(pos, 3) === "ACK") {
          result0 = "ACK";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"ACK\"");
          }
        }
        return result0;
      }
      function parse_OPTIONSm() {
        var result0;
        if (input.substr(pos, 7) === "OPTIONS") {
          result0 = "OPTIONS";
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"OPTIONS\"");
          }
        }
        return result0;
      }
      function parse_BYEm() {
        var result0;
        if (input.substr(pos, 3) === "BYE") {
          result0 = "BYE";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"BYE\"");
          }
        }
        return result0;
      }
      function parse_CANCELm() {
        var result0;
        if (input.substr(pos, 6) === "CANCEL") {
          result0 = "CANCEL";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"CANCEL\"");
          }
        }
        return result0;
      }
      function parse_REGISTERm() {
        var result0;
        if (input.substr(pos, 8) === "REGISTER") {
          result0 = "REGISTER";
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"REGISTER\"");
          }
        }
        return result0;
      }
      function parse_SUBSCRIBEm() {
        var result0;
        if (input.substr(pos, 9) === "SUBSCRIBE") {
          result0 = "SUBSCRIBE";
          pos += 9;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"SUBSCRIBE\"");
          }
        }
        return result0;
      }
      function parse_NOTIFYm() {
        var result0;
        if (input.substr(pos, 6) === "NOTIFY") {
          result0 = "NOTIFY";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"NOTIFY\"");
          }
        }
        return result0;
      }
      function parse_REFERm() {
        var result0;
        if (input.substr(pos, 5) === "REFER") {
          result0 = "REFER";
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"REFER\"");
          }
        }
        return result0;
      }
      function parse_Method() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_INVITEm();
        if (result0 === null) {
          result0 = parse_ACKm();
          if (result0 === null) {
            result0 = parse_OPTIONSm();
            if (result0 === null) {
              result0 = parse_BYEm();
              if (result0 === null) {
                result0 = parse_CANCELm();
                if (result0 === null) {
                  result0 = parse_REGISTERm();
                  if (result0 === null) {
                    result0 = parse_SUBSCRIBEm();
                    if (result0 === null) {
                      result0 = parse_NOTIFYm();
                      if (result0 === null) {
                        result0 = parse_REFERm();
                        if (result0 === null) {
                          result0 = parse_token();
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.method = input.substring(pos, offset);
            return data.method;
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Status_Line() {
        var result0, result1, result2, result3, result4;
        var pos0;
        pos0 = pos;
        result0 = parse_SIP_Version();
        if (result0 !== null) {
          result1 = parse_SP();
          if (result1 !== null) {
            result2 = parse_Status_Code();
            if (result2 !== null) {
              result3 = parse_SP();
              if (result3 !== null) {
                result4 = parse_Reason_Phrase();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Status_Code() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_extension_code();
        if (result0 !== null) {
          result0 = function (offset, status_code) {
            data.status_code = parseInt(status_code.join(''));
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_extension_code() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_DIGIT();
        if (result0 !== null) {
          result1 = parse_DIGIT();
          if (result1 !== null) {
            result2 = parse_DIGIT();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Reason_Phrase() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result0 = [];
        result1 = parse_reserved();
        if (result1 === null) {
          result1 = parse_unreserved();
          if (result1 === null) {
            result1 = parse_escaped();
            if (result1 === null) {
              result1 = parse_UTF8_NONASCII();
              if (result1 === null) {
                result1 = parse_UTF8_CONT();
                if (result1 === null) {
                  result1 = parse_SP();
                  if (result1 === null) {
                    result1 = parse_HTAB();
                  }
                }
              }
            }
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_reserved();
          if (result1 === null) {
            result1 = parse_unreserved();
            if (result1 === null) {
              result1 = parse_escaped();
              if (result1 === null) {
                result1 = parse_UTF8_NONASCII();
                if (result1 === null) {
                  result1 = parse_UTF8_CONT();
                  if (result1 === null) {
                    result1 = parse_SP();
                    if (result1 === null) {
                      result1 = parse_HTAB();
                    }
                  }
                }
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.reason_phrase = input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Allow_Events() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_event_type();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_event_type();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_event_type();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Call_ID() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_word();
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 64) {
            result1 = "@";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"@\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_word();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data = input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Contact() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        result0 = parse_STAR();
        if (result0 === null) {
          pos1 = pos;
          result0 = parse_contact_param();
          if (result0 !== null) {
            result1 = [];
            pos2 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_contact_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
            while (result2 !== null) {
              result1.push(result2);
              pos2 = pos;
              result2 = parse_COMMA();
              if (result2 !== null) {
                result3 = parse_contact_param();
                if (result3 !== null) {
                  result2 = [result2, result3];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            }
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        }
        if (result0 !== null) {
          result0 = function (offset) {
            var idx, length;
            length = data.multi_header.length;
            for (idx = 0; idx < length; idx++) {
              if (data.multi_header[idx].parsed === null) {
                data = null;
                break;
              }
            }
            if (data !== null) {
              data = data.multi_header;
            } else {
              data = -1;
            }
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_contact_param() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SIP_URI_noparams();
        if (result0 === null) {
          result0 = parse_name_addr();
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_contact_params();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_contact_params();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            var header;
            if (!data.multi_header) data.multi_header = [];
            try {
              header = new NameAddrHeader(data.uri, data.display_name, data.params);
              delete data.uri;
              delete data.display_name;
              delete data.params;
            } catch (e) {
              header = null;
            }
            data.multi_header.push({ 'possition': pos,
              'offset': offset,
              'parsed': header
            });
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_name_addr() {
        var result0, result1, result2, result3;
        var pos0;
        pos0 = pos;
        result0 = parse_display_name();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_LAQUOT();
          if (result1 !== null) {
            result2 = parse_SIP_URI();
            if (result2 !== null) {
              result3 = parse_RAQUOT();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_display_name() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_LWS();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_LWS();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 === null) {
          result0 = parse_quoted_string();
        }
        if (result0 !== null) {
          result0 = function (offset, display_name) {
            display_name = input.substring(pos, offset).trim();
            if (display_name[0] === '\"') {
              display_name = display_name.substring(1, display_name.length - 1);
            }
            data.display_name = display_name;
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_contact_params() {
        var result0;
        result0 = parse_c_p_q();
        if (result0 === null) {
          result0 = parse_c_p_expires();
          if (result0 === null) {
            result0 = parse_generic_param();
          }
        }
        return result0;
      }
      function parse_c_p_q() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 1).toLowerCase() === "q") {
          result0 = input.substr(pos, 1);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"q\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_qvalue();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, q) {
            if (!data.params) data.params = {};
            data.params['q'] = q;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_c_p_expires() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 7).toLowerCase() === "expires") {
          result0 = input.substr(pos, 7);
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"expires\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_delta_seconds();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, expires) {
            if (!data.params) data.params = {};
            data.params['expires'] = expires;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_delta_seconds() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result1 = parse_DIGIT();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_DIGIT();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = function (offset, delta_seconds) {
            return parseInt(delta_seconds.join(''));
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_qvalue() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 48) {
          result0 = "0";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"0\"");
          }
        }
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 46) {
            result1 = ".";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_DIGIT();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_DIGIT();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = parse_DIGIT();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result1 = [result1, result2, result3, result4];
                } else {
                  result1 = null;
                  pos = pos2;
                }
              } else {
                result1 = null;
                pos = pos2;
              }
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            return parseFloat(input.substring(pos, offset));
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_generic_param() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          pos2 = pos;
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_gen_value();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, param, value) {
            if (!data.params) data.params = {};
            if (typeof value === 'undefined') {
              value = undefined;
            } else {
              value = value[1];
            }
            data.params[param.toLowerCase()] = value;
          }(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_gen_value() {
        var result0;
        result0 = parse_token();
        if (result0 === null) {
          result0 = parse_host();
          if (result0 === null) {
            result0 = parse_quoted_string();
          }
        }
        return result0;
      }
      function parse_Content_Disposition() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_disp_type();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_disp_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_disp_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_disp_type() {
        var result0;
        if (input.substr(pos, 6).toLowerCase() === "render") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"render\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 7).toLowerCase() === "session") {
            result0 = input.substr(pos, 7);
            pos += 7;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"session\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 4).toLowerCase() === "icon") {
              result0 = input.substr(pos, 4);
              pos += 4;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"icon\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 5).toLowerCase() === "alert") {
                result0 = input.substr(pos, 5);
                pos += 5;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"alert\"");
                }
              }
              if (result0 === null) {
                result0 = parse_token();
              }
            }
          }
        }
        return result0;
      }
      function parse_disp_param() {
        var result0;
        result0 = parse_handling_param();
        if (result0 === null) {
          result0 = parse_generic_param();
        }
        return result0;
      }
      function parse_handling_param() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 8).toLowerCase() === "handling") {
          result0 = input.substr(pos, 8);
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"handling\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            if (input.substr(pos, 8).toLowerCase() === "optional") {
              result2 = input.substr(pos, 8);
              pos += 8;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"optional\"");
              }
            }
            if (result2 === null) {
              if (input.substr(pos, 8).toLowerCase() === "required") {
                result2 = input.substr(pos, 8);
                pos += 8;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"required\"");
                }
              }
              if (result2 === null) {
                result2 = parse_token();
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Content_Encoding() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Content_Length() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result1 = parse_DIGIT();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_DIGIT();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = function (offset, length) {
            data = parseInt(length.join(''));
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Content_Type() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_media_type();
        if (result0 !== null) {
          result0 = function (offset) {
            data = input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_media_type() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_m_type();
        if (result0 !== null) {
          result1 = parse_SLASH();
          if (result1 !== null) {
            result2 = parse_m_subtype();
            if (result2 !== null) {
              result3 = [];
              pos1 = pos;
              result4 = parse_SEMI();
              if (result4 !== null) {
                result5 = parse_m_parameter();
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos1;
                }
              } else {
                result4 = null;
                pos = pos1;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos1 = pos;
                result4 = parse_SEMI();
                if (result4 !== null) {
                  result5 = parse_m_parameter();
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos1;
                  }
                } else {
                  result4 = null;
                  pos = pos1;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_m_type() {
        var result0;
        result0 = parse_discrete_type();
        if (result0 === null) {
          result0 = parse_composite_type();
        }
        return result0;
      }
      function parse_discrete_type() {
        var result0;
        if (input.substr(pos, 4).toLowerCase() === "text") {
          result0 = input.substr(pos, 4);
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"text\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 5).toLowerCase() === "image") {
            result0 = input.substr(pos, 5);
            pos += 5;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"image\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 5).toLowerCase() === "audio") {
              result0 = input.substr(pos, 5);
              pos += 5;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"audio\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 5).toLowerCase() === "video") {
                result0 = input.substr(pos, 5);
                pos += 5;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"video\"");
                }
              }
              if (result0 === null) {
                if (input.substr(pos, 11).toLowerCase() === "application") {
                  result0 = input.substr(pos, 11);
                  pos += 11;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"application\"");
                  }
                }
                if (result0 === null) {
                  result0 = parse_extension_token();
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_composite_type() {
        var result0;
        if (input.substr(pos, 7).toLowerCase() === "message") {
          result0 = input.substr(pos, 7);
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"message\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 9).toLowerCase() === "multipart") {
            result0 = input.substr(pos, 9);
            pos += 9;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"multipart\"");
            }
          }
          if (result0 === null) {
            result0 = parse_extension_token();
          }
        }
        return result0;
      }
      function parse_extension_token() {
        var result0;
        result0 = parse_token();
        if (result0 === null) {
          result0 = parse_x_token();
        }
        return result0;
      }
      function parse_x_token() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 2).toLowerCase() === "x-") {
          result0 = input.substr(pos, 2);
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"x-\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_token();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_m_subtype() {
        var result0;
        result0 = parse_extension_token();
        if (result0 === null) {
          result0 = parse_token();
        }
        return result0;
      }
      function parse_m_parameter() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_m_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_m_value() {
        var result0;
        result0 = parse_token();
        if (result0 === null) {
          result0 = parse_quoted_string();
        }
        return result0;
      }
      function parse_CSeq() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_CSeq_value();
        if (result0 !== null) {
          result1 = parse_LWS();
          if (result1 !== null) {
            result2 = parse_Method();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_CSeq_value() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result1 = parse_DIGIT();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_DIGIT();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = function (offset, cseq_value) {
            data.value = parseInt(cseq_value.join(''));
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Expires() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_delta_seconds();
        if (result0 !== null) {
          result0 = function (offset, expires) {
            data = expires;
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Event() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_event_type();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_generic_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_generic_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, event_type) {
            data.event = event_type.join('').toLowerCase();
          }(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_event_type() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_token_nodot();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          if (input.charCodeAt(pos) === 46) {
            result2 = ".";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result2 !== null) {
            result3 = parse_token_nodot();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            if (input.charCodeAt(pos) === 46) {
              result2 = ".";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result2 !== null) {
              result3 = parse_token_nodot();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_From() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SIP_URI_noparams();
        if (result0 === null) {
          result0 = parse_name_addr();
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_from_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_from_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            var tag = data.tag;
            try {
              data = new NameAddrHeader(data.uri, data.display_name, data.params);
              if (tag) {
                data.setParam('tag', tag);
              }
            } catch (e) {
              data = -1;
            }
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_from_param() {
        var result0;
        result0 = parse_tag_param();
        if (result0 === null) {
          result0 = parse_generic_param();
        }
        return result0;
      }
      function parse_tag_param() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 3).toLowerCase() === "tag") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"tag\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, tag) {
            data.tag = tag;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Max_Forwards() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result1 = parse_DIGIT();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_DIGIT();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = function (offset, forwards) {
            data = parseInt(forwards.join(''));
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Min_Expires() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_delta_seconds();
        if (result0 !== null) {
          result0 = function (offset, min_expires) {
            data = min_expires;
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Name_Addr_Header() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        result1 = parse_display_name();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_display_name();
        }
        if (result0 !== null) {
          result1 = parse_LAQUOT();
          if (result1 !== null) {
            result2 = parse_SIP_URI();
            if (result2 !== null) {
              result3 = parse_RAQUOT();
              if (result3 !== null) {
                result4 = [];
                pos2 = pos;
                result5 = parse_SEMI();
                if (result5 !== null) {
                  result6 = parse_generic_param();
                  if (result6 !== null) {
                    result5 = [result5, result6];
                  } else {
                    result5 = null;
                    pos = pos2;
                  }
                } else {
                  result5 = null;
                  pos = pos2;
                }
                while (result5 !== null) {
                  result4.push(result5);
                  pos2 = pos;
                  result5 = parse_SEMI();
                  if (result5 !== null) {
                    result6 = parse_generic_param();
                    if (result6 !== null) {
                      result5 = [result5, result6];
                    } else {
                      result5 = null;
                      pos = pos2;
                    }
                  } else {
                    result5 = null;
                    pos = pos2;
                  }
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            try {
              data = new NameAddrHeader(data.uri, data.display_name, data.params);
            } catch (e) {
              data = -1;
            }
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Proxy_Authenticate() {
        var result0;
        result0 = parse_challenge();
        return result0;
      }
      function parse_challenge() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        pos0 = pos;
        if (input.substr(pos, 6).toLowerCase() === "digest") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"Digest\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_LWS();
          if (result1 !== null) {
            result2 = parse_digest_cln();
            if (result2 !== null) {
              result3 = [];
              pos1 = pos;
              result4 = parse_COMMA();
              if (result4 !== null) {
                result5 = parse_digest_cln();
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos1;
                }
              } else {
                result4 = null;
                pos = pos1;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos1 = pos;
                result4 = parse_COMMA();
                if (result4 !== null) {
                  result5 = parse_digest_cln();
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos1;
                  }
                } else {
                  result4 = null;
                  pos = pos1;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        if (result0 === null) {
          result0 = parse_other_challenge();
        }
        return result0;
      }
      function parse_other_challenge() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = parse_LWS();
          if (result1 !== null) {
            result2 = parse_auth_param();
            if (result2 !== null) {
              result3 = [];
              pos1 = pos;
              result4 = parse_COMMA();
              if (result4 !== null) {
                result5 = parse_auth_param();
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos1;
                }
              } else {
                result4 = null;
                pos = pos1;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos1 = pos;
                result4 = parse_COMMA();
                if (result4 !== null) {
                  result5 = parse_auth_param();
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos1;
                  }
                } else {
                  result4 = null;
                  pos = pos1;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_auth_param() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 === null) {
              result2 = parse_quoted_string();
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_digest_cln() {
        var result0;
        result0 = parse_realm();
        if (result0 === null) {
          result0 = parse_domain();
          if (result0 === null) {
            result0 = parse_nonce();
            if (result0 === null) {
              result0 = parse_opaque();
              if (result0 === null) {
                result0 = parse_stale();
                if (result0 === null) {
                  result0 = parse_algorithm();
                  if (result0 === null) {
                    result0 = parse_qop_options();
                    if (result0 === null) {
                      result0 = parse_auth_param();
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_realm() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 5).toLowerCase() === "realm") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"realm\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_realm_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_realm_value() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_quoted_string_clean();
        if (result0 !== null) {
          result0 = function (offset, realm) {
            data.realm = realm;
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_domain() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1;
        pos0 = pos;
        if (input.substr(pos, 6).toLowerCase() === "domain") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"domain\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_LDQUOT();
            if (result2 !== null) {
              result3 = parse_URI();
              if (result3 !== null) {
                result4 = [];
                pos1 = pos;
                result6 = parse_SP();
                if (result6 !== null) {
                  result5 = [];
                  while (result6 !== null) {
                    result5.push(result6);
                    result6 = parse_SP();
                  }
                } else {
                  result5 = null;
                }
                if (result5 !== null) {
                  result6 = parse_URI();
                  if (result6 !== null) {
                    result5 = [result5, result6];
                  } else {
                    result5 = null;
                    pos = pos1;
                  }
                } else {
                  result5 = null;
                  pos = pos1;
                }
                while (result5 !== null) {
                  result4.push(result5);
                  pos1 = pos;
                  result6 = parse_SP();
                  if (result6 !== null) {
                    result5 = [];
                    while (result6 !== null) {
                      result5.push(result6);
                      result6 = parse_SP();
                    }
                  } else {
                    result5 = null;
                  }
                  if (result5 !== null) {
                    result6 = parse_URI();
                    if (result6 !== null) {
                      result5 = [result5, result6];
                    } else {
                      result5 = null;
                      pos = pos1;
                    }
                  } else {
                    result5 = null;
                    pos = pos1;
                  }
                }
                if (result4 !== null) {
                  result5 = parse_RDQUOT();
                  if (result5 !== null) {
                    result0 = [result0, result1, result2, result3, result4, result5];
                  } else {
                    result0 = null;
                    pos = pos0;
                  }
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_URI() {
        var result0;
        result0 = parse_absoluteURI();
        if (result0 === null) {
          result0 = parse_abs_path();
        }
        return result0;
      }
      function parse_nonce() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 5).toLowerCase() === "nonce") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"nonce\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_nonce_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_nonce_value() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_quoted_string_clean();
        if (result0 !== null) {
          result0 = function (offset, nonce) {
            data.nonce = nonce;
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_opaque() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 6).toLowerCase() === "opaque") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"opaque\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_quoted_string_clean();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, opaque) {
            data.opaque = opaque;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_stale() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        if (input.substr(pos, 5).toLowerCase() === "stale") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"stale\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            pos1 = pos;
            if (input.substr(pos, 4).toLowerCase() === "true") {
              result2 = input.substr(pos, 4);
              pos += 4;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"true\"");
              }
            }
            if (result2 !== null) {
              result2 = function (offset) {
                data.stale = true;
              }(pos1);
            }
            if (result2 === null) {
              pos = pos1;
            }
            if (result2 === null) {
              pos1 = pos;
              if (input.substr(pos, 5).toLowerCase() === "false") {
                result2 = input.substr(pos, 5);
                pos += 5;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"false\"");
                }
              }
              if (result2 !== null) {
                result2 = function (offset) {
                  data.stale = false;
                }(pos1);
              }
              if (result2 === null) {
                pos = pos1;
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_algorithm() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 9).toLowerCase() === "algorithm") {
          result0 = input.substr(pos, 9);
          pos += 9;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"algorithm\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            if (input.substr(pos, 3).toLowerCase() === "md5") {
              result2 = input.substr(pos, 3);
              pos += 3;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"MD5\"");
              }
            }
            if (result2 === null) {
              if (input.substr(pos, 8).toLowerCase() === "md5-sess") {
                result2 = input.substr(pos, 8);
                pos += 8;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"MD5-sess\"");
                }
              }
              if (result2 === null) {
                result2 = parse_token();
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, algorithm) {
            data.algorithm = algorithm.toUpperCase();
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_qop_options() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1, pos2;
        pos0 = pos;
        if (input.substr(pos, 3).toLowerCase() === "qop") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"qop\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_LDQUOT();
            if (result2 !== null) {
              pos1 = pos;
              result3 = parse_qop_value();
              if (result3 !== null) {
                result4 = [];
                pos2 = pos;
                if (input.charCodeAt(pos) === 44) {
                  result5 = ",";
                  pos++;
                } else {
                  result5 = null;
                  if (reportFailures === 0) {
                    matchFailed("\",\"");
                  }
                }
                if (result5 !== null) {
                  result6 = parse_qop_value();
                  if (result6 !== null) {
                    result5 = [result5, result6];
                  } else {
                    result5 = null;
                    pos = pos2;
                  }
                } else {
                  result5 = null;
                  pos = pos2;
                }
                while (result5 !== null) {
                  result4.push(result5);
                  pos2 = pos;
                  if (input.charCodeAt(pos) === 44) {
                    result5 = ",";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\",\"");
                    }
                  }
                  if (result5 !== null) {
                    result6 = parse_qop_value();
                    if (result6 !== null) {
                      result5 = [result5, result6];
                    } else {
                      result5 = null;
                      pos = pos2;
                    }
                  } else {
                    result5 = null;
                    pos = pos2;
                  }
                }
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = pos1;
                }
              } else {
                result3 = null;
                pos = pos1;
              }
              if (result3 !== null) {
                result4 = parse_RDQUOT();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_qop_value() {
        var result0;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 8).toLowerCase() === "auth-int") {
          result0 = input.substr(pos, 8);
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"auth-int\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 4).toLowerCase() === "auth") {
            result0 = input.substr(pos, 4);
            pos += 4;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"auth\"");
            }
          }
          if (result0 === null) {
            result0 = parse_token();
          }
        }
        if (result0 !== null) {
          result0 = function (offset, qop_value) {
            data.qop || (data.qop = []);
            data.qop.push(qop_value.toLowerCase());
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Proxy_Require() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Record_Route() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_rec_route();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_rec_route();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_rec_route();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            var idx, length;
            length = data.multi_header.length;
            for (idx = 0; idx < length; idx++) {
              if (data.multi_header[idx].parsed === null) {
                data = null;
                break;
              }
            }
            if (data !== null) {
              data = data.multi_header;
            } else {
              data = -1;
            }
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_rec_route() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_name_addr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_generic_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_generic_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            var header;
            if (!data.multi_header) data.multi_header = [];
            try {
              header = new NameAddrHeader(data.uri, data.display_name, data.params);
              delete data.uri;
              delete data.display_name;
              delete data.params;
            } catch (e) {
              header = null;
            }
            data.multi_header.push({ 'possition': pos,
              'offset': offset,
              'parsed': header
            });
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Reason() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 3).toLowerCase() === "sip") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"SIP\"");
          }
        }
        if (result0 === null) {
          result0 = parse_token();
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_reason_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_reason_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, protocol) {
            data.protocol = protocol.toLowerCase();
            if (!data.params) data.params = {};
            if (data.params.text && data.params.text[0] === '"') {
              var text = data.params.text;
              data.text = text.substring(1, text.length - 1);
              delete data.params.text;
            }
          }(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_reason_param() {
        var result0;
        result0 = parse_reason_cause();
        if (result0 === null) {
          result0 = parse_generic_param();
        }
        return result0;
      }
      function parse_reason_cause() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 5).toLowerCase() === "cause") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"cause\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result3 = parse_DIGIT();
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                result3 = parse_DIGIT();
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, cause) {
            data.cause = parseInt(cause.join(''));
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Require() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Route() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_route_param();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_route_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_route_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_route_param() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_name_addr();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_generic_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_generic_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Subscription_State() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_substate_value();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_subexp_params();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_subexp_params();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_substate_value() {
        var result0;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 6).toLowerCase() === "active") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"active\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 7).toLowerCase() === "pending") {
            result0 = input.substr(pos, 7);
            pos += 7;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"pending\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 10).toLowerCase() === "terminated") {
              result0 = input.substr(pos, 10);
              pos += 10;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"terminated\"");
              }
            }
            if (result0 === null) {
              result0 = parse_token();
            }
          }
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.state = input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_subexp_params() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 6).toLowerCase() === "reason") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"reason\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_event_reason_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, reason) {
            if (typeof reason !== 'undefined') data.reason = reason;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.substr(pos, 7).toLowerCase() === "expires") {
            result0 = input.substr(pos, 7);
            pos += 7;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"expires\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_EQUAL();
            if (result1 !== null) {
              result2 = parse_delta_seconds();
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = function (offset, expires) {
              if (typeof expires !== 'undefined') data.expires = expires;
            }(pos0, result0[2]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          if (result0 === null) {
            pos0 = pos;
            pos1 = pos;
            if (input.substr(pos, 11).toLowerCase() === "retry_after") {
              result0 = input.substr(pos, 11);
              pos += 11;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"retry_after\"");
              }
            }
            if (result0 !== null) {
              result1 = parse_EQUAL();
              if (result1 !== null) {
                result2 = parse_delta_seconds();
                if (result2 !== null) {
                  result0 = [result0, result1, result2];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
            if (result0 !== null) {
              result0 = function (offset, retry_after) {
                if (typeof retry_after !== 'undefined') data.retry_after = retry_after;
              }(pos0, result0[2]);
            }
            if (result0 === null) {
              pos = pos0;
            }
            if (result0 === null) {
              result0 = parse_generic_param();
            }
          }
        }
        return result0;
      }
      function parse_event_reason_value() {
        var result0;
        if (input.substr(pos, 11).toLowerCase() === "deactivated") {
          result0 = input.substr(pos, 11);
          pos += 11;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"deactivated\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 9).toLowerCase() === "probation") {
            result0 = input.substr(pos, 9);
            pos += 9;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"probation\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 8).toLowerCase() === "rejected") {
              result0 = input.substr(pos, 8);
              pos += 8;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"rejected\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 7).toLowerCase() === "timeout") {
                result0 = input.substr(pos, 7);
                pos += 7;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"timeout\"");
                }
              }
              if (result0 === null) {
                if (input.substr(pos, 6).toLowerCase() === "giveup") {
                  result0 = input.substr(pos, 6);
                  pos += 6;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"giveup\"");
                  }
                }
                if (result0 === null) {
                  if (input.substr(pos, 10).toLowerCase() === "noresource") {
                    result0 = input.substr(pos, 10);
                    pos += 10;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"noresource\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.substr(pos, 9).toLowerCase() === "invariant") {
                      result0 = input.substr(pos, 9);
                      pos += 9;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"invariant\"");
                      }
                    }
                    if (result0 === null) {
                      result0 = parse_token();
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_Subject() {
        var result0;
        result0 = parse_TEXT_UTF8_TRIM();
        result0 = result0 !== null ? result0 : "";
        return result0;
      }
      function parse_Supported() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        result0 = result0 !== null ? result0 : "";
        return result0;
      }
      function parse_To() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SIP_URI_noparams();
        if (result0 === null) {
          result0 = parse_name_addr();
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_to_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_to_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            var tag = data.tag;
            try {
              data = new NameAddrHeader(data.uri, data.display_name, data.params);
              if (tag) {
                data.setParam('tag', tag);
              }
            } catch (e) {
              data = -1;
            }
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_to_param() {
        var result0;
        result0 = parse_tag_param();
        if (result0 === null) {
          result0 = parse_generic_param();
        }
        return result0;
      }
      function parse_Via() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_via_param();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_via_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_via_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_via_param() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_sent_protocol();
        if (result0 !== null) {
          result1 = parse_LWS();
          if (result1 !== null) {
            result2 = parse_sent_by();
            if (result2 !== null) {
              result3 = [];
              pos1 = pos;
              result4 = parse_SEMI();
              if (result4 !== null) {
                result5 = parse_via_params();
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos1;
                }
              } else {
                result4 = null;
                pos = pos1;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos1 = pos;
                result4 = parse_SEMI();
                if (result4 !== null) {
                  result5 = parse_via_params();
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos1;
                  }
                } else {
                  result4 = null;
                  pos = pos1;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_via_params() {
        var result0;
        result0 = parse_via_ttl();
        if (result0 === null) {
          result0 = parse_via_maddr();
          if (result0 === null) {
            result0 = parse_via_received();
            if (result0 === null) {
              result0 = parse_via_branch();
              if (result0 === null) {
                result0 = parse_response_port();
                if (result0 === null) {
                  result0 = parse_generic_param();
                }
              }
            }
          }
        }
        return result0;
      }
      function parse_via_ttl() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 3).toLowerCase() === "ttl") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"ttl\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_ttl();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, via_ttl_value) {
            data.ttl = via_ttl_value;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_via_maddr() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 5).toLowerCase() === "maddr") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"maddr\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_host();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, via_maddr) {
            data.maddr = via_maddr;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_via_received() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 8).toLowerCase() === "received") {
          result0 = input.substr(pos, 8);
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"received\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_IPv4address();
            if (result2 === null) {
              result2 = parse_IPv6address();
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, via_received) {
            data.received = via_received;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_via_branch() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 6).toLowerCase() === "branch") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"branch\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, via_branch) {
            data.branch = via_branch;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_response_port() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 5).toLowerCase() === "rport") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"rport\"");
          }
        }
        if (result0 !== null) {
          pos2 = pos;
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = [];
            result3 = parse_DIGIT();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_DIGIT();
            }
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            if (typeof response_port !== 'undefined') data.rport = response_port.join('');
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_sent_protocol() {
        var result0, result1, result2, result3, result4;
        var pos0;
        pos0 = pos;
        result0 = parse_protocol_name();
        if (result0 !== null) {
          result1 = parse_SLASH();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result3 = parse_SLASH();
              if (result3 !== null) {
                result4 = parse_transport();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_protocol_name() {
        var result0;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 3).toLowerCase() === "sip") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"SIP\"");
          }
        }
        if (result0 === null) {
          result0 = parse_token();
        }
        if (result0 !== null) {
          result0 = function (offset, via_protocol) {
            data.protocol = via_protocol;
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_transport() {
        var result0;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 3).toLowerCase() === "udp") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"UDP\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 3).toLowerCase() === "tcp") {
            result0 = input.substr(pos, 3);
            pos += 3;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"TCP\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 3).toLowerCase() === "tls") {
              result0 = input.substr(pos, 3);
              pos += 3;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"TLS\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 4).toLowerCase() === "sctp") {
                result0 = input.substr(pos, 4);
                pos += 4;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"SCTP\"");
                }
              }
              if (result0 === null) {
                result0 = parse_token();
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = function (offset, via_transport) {
            data.transport = via_transport;
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_sent_by() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_via_host();
        if (result0 !== null) {
          pos1 = pos;
          result1 = parse_COLON();
          if (result1 !== null) {
            result2 = parse_via_port();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos1;
            }
          } else {
            result1 = null;
            pos = pos1;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_via_host() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_IPv4address();
        if (result0 === null) {
          result0 = parse_IPv6reference();
          if (result0 === null) {
            result0 = parse_hostname();
          }
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.host = input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_via_port() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_DIGIT();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_DIGIT();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_DIGIT();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_DIGIT();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = parse_DIGIT();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, via_sent_by_port) {
            data.port = parseInt(via_sent_by_port.join(''));
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_ttl() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_DIGIT();
        if (result0 !== null) {
          result1 = parse_DIGIT();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_DIGIT();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, ttl) {
            return parseInt(ttl.join(''));
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_WWW_Authenticate() {
        var result0;
        result0 = parse_challenge();
        return result0;
      }
      function parse_Session_Expires() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_s_e_expires();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_s_e_params();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_s_e_params();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_s_e_expires() {
        var result0;
        var pos0;
        pos0 = pos;
        result0 = parse_delta_seconds();
        if (result0 !== null) {
          result0 = function (offset, expires) {
            data.expires = expires;
          }(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_s_e_params() {
        var result0;
        result0 = parse_s_e_refresher();
        if (result0 === null) {
          result0 = parse_generic_param();
        }
        return result0;
      }
      function parse_s_e_refresher() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 9).toLowerCase() === "refresher") {
          result0 = input.substr(pos, 9);
          pos += 9;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"refresher\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            if (input.substr(pos, 3).toLowerCase() === "uac") {
              result2 = input.substr(pos, 3);
              pos += 3;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"uac\"");
              }
            }
            if (result2 === null) {
              if (input.substr(pos, 3).toLowerCase() === "uas") {
                result2 = input.substr(pos, 3);
                pos += 3;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"uas\"");
                }
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, s_e_refresher_value) {
            data.refresher = s_e_refresher_value.toLowerCase();
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_extension_header() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = parse_HCOLON();
          if (result1 !== null) {
            result2 = parse_header_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_header_value() {
        var result0, result1;
        result0 = [];
        result1 = parse_TEXT_UTF8char();
        if (result1 === null) {
          result1 = parse_UTF8_CONT();
          if (result1 === null) {
            result1 = parse_LWS();
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_TEXT_UTF8char();
          if (result1 === null) {
            result1 = parse_UTF8_CONT();
            if (result1 === null) {
              result1 = parse_LWS();
            }
          }
        }
        return result0;
      }
      function parse_message_body() {
        var result0, result1;
        result0 = [];
        result1 = parse_OCTET();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_OCTET();
        }
        return result0;
      }
      function parse_uuid_URI() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 5) === "uuid:") {
          result0 = "uuid:";
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"uuid:\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_uuid();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_uuid() {
        var result0, result1, result2, result3, result4, result5, result6, result7, result8;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_hex8();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_hex4();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 45) {
                result3 = "-";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_hex4();
                if (result4 !== null) {
                  if (input.charCodeAt(pos) === 45) {
                    result5 = "-";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"-\"");
                    }
                  }
                  if (result5 !== null) {
                    result6 = parse_hex4();
                    if (result6 !== null) {
                      if (input.charCodeAt(pos) === 45) {
                        result7 = "-";
                        pos++;
                      } else {
                        result7 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"-\"");
                        }
                      }
                      if (result7 !== null) {
                        result8 = parse_hex12();
                        if (result8 !== null) {
                          result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8];
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, uuid) {
            data = input.substring(pos + 5, offset);
          }(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_hex4() {
        var result0, result1, result2, result3;
        var pos0;
        pos0 = pos;
        result0 = parse_HEXDIG();
        if (result0 !== null) {
          result1 = parse_HEXDIG();
          if (result1 !== null) {
            result2 = parse_HEXDIG();
            if (result2 !== null) {
              result3 = parse_HEXDIG();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_hex8() {
        var result0, result1;
        var pos0;
        pos0 = pos;
        result0 = parse_hex4();
        if (result0 !== null) {
          result1 = parse_hex4();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_hex12() {
        var result0, result1, result2;
        var pos0;
        pos0 = pos;
        result0 = parse_hex4();
        if (result0 !== null) {
          result1 = parse_hex4();
          if (result1 !== null) {
            result2 = parse_hex4();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_Refer_To() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SIP_URI_noparams();
        if (result0 === null) {
          result0 = parse_name_addr();
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_generic_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_generic_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            try {
              data = new NameAddrHeader(data.uri, data.display_name, data.params);
            } catch (e) {
              data = -1;
            }
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_Replaces() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        pos0 = pos;
        result0 = parse_call_id();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_replaces_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_replaces_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      function parse_call_id() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        pos0 = pos;
        pos1 = pos;
        result0 = parse_word();
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 64) {
            result1 = "@";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"@\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_word();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.call_id = input.substring(pos, offset);
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_replaces_param() {
        var result0;
        result0 = parse_to_tag();
        if (result0 === null) {
          result0 = parse_from_tag();
          if (result0 === null) {
            result0 = parse_early_flag();
            if (result0 === null) {
              result0 = parse_generic_param();
            }
          }
        }
        return result0;
      }
      function parse_to_tag() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 6) === "to-tag") {
          result0 = "to-tag";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"to-tag\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, to_tag) {
            data.to_tag = to_tag;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_from_tag() {
        var result0, result1, result2;
        var pos0, pos1;
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 8) === "from-tag") {
          result0 = "from-tag";
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"from-tag\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = function (offset, from_tag) {
            data.from_tag = from_tag;
          }(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function parse_early_flag() {
        var result0;
        var pos0;
        pos0 = pos;
        if (input.substr(pos, 10) === "early-only") {
          result0 = "early-only";
          pos += 10;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"early-only\"");
          }
        }
        if (result0 !== null) {
          result0 = function (offset) {
            data.early_only = true;
          }(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      function cleanupExpected(expected) {
        expected.sort();
        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }
      function computeErrorPosition() {
        /*
         * The first idea was to use |String.split| to break the input up to the
         * error position along newlines and derive the line and column from
         * there. However IE's |split| implementation is so broken that it was
         * enough to prevent it.
         */
        var line = 1;
        var column = 1;
        var seenCR = false;
        for (var i = 0; i < Math.max(pos, rightmostFailuresPos); i++) {
          var ch = input.charAt(i);
          if (ch === "\n") {
            if (!seenCR) {
              line++;
            }
            column = 1;
            seenCR = false;
          } else if (ch === "\r" || ch === '\u2028' || ch === '\u2029') {
            line++;
            column = 1;
            seenCR = true;
          } else {
            column++;
            seenCR = false;
          }
        }
        return { line: line, column: column };
      }
      var URI = require('./URI');
      var NameAddrHeader = require('./NameAddrHeader');
      var data = {};
      var result = parseFunctions[startRule]();
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos !== input.length) {
        var offset = Math.max(pos, rightmostFailuresPos);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = computeErrorPosition();
        new this.SyntaxError(cleanupExpected(rightmostFailuresExpected), found, offset, errorPosition.line, errorPosition.column);
        return -1;
      }
      return data;
    },
    /* Returns the parser source code. */
    toSource: function toSource() {
      return this._source;
    }
  };
  /* Thrown when a parser encounters a syntax error. */
  result.SyntaxError = function (expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;
      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ") + " or " + expected[expected.length - 1];
      }
      foundHumanized = found ? quote(found) : "end of input";
      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }
    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };
  result.SyntaxError.prototype = Error.prototype;
  return result;
}();

},{"./NameAddrHeader":10,"./URI":25}],8:[function(require,module,exports){
'use strict';

var adapter = require('webrtc-adapter');
var pkg = require('../package.json');
var C = require('./Constants');
var Exceptions = require('./Exceptions');
var Utils = require('./Utils');
var UA = require('./UA');
var URI = require('./URI');
var NameAddrHeader = require('./NameAddrHeader');
var Grammar = require('./Grammar');
var WebSocketInterface = require('./WebSocketInterface');
var debug = require('debug')('JsSIP');

debug('version %s', pkg.version);

/**
 * Expose the JsSIP module.
 */
module.exports = {
  C: C,
  Exceptions: Exceptions,
  Utils: Utils,
  UA: UA,
  URI: URI,
  NameAddrHeader: NameAddrHeader,
  WebSocketInterface: WebSocketInterface,
  Grammar: Grammar,
  // Expose the debug module.
  debug: require('debug'),
  // Expose the adapter module.
  adapter: adapter,
  get name() {
    return pkg.title;
  },
  get version() {
    return pkg.version;
  }
};

},{"../package.json":51,"./Constants":2,"./Exceptions":6,"./Grammar":7,"./NameAddrHeader":10,"./UA":24,"./URI":25,"./Utils":26,"./WebSocketInterface":27,"debug":29,"webrtc-adapter":40}],9:[function(require,module,exports){
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

},{"./Constants":2,"./Exceptions":6,"./RequestSender":18,"./SIPMessage":19,"./Utils":26,"debug":29,"events":31}],10:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var URI = require('./URI');
var Grammar = require('./Grammar');

module.exports = function () {
  _createClass(NameAddrHeader, null, [{
    key: 'parse',

    /**
     * Parse the given string and returns a NameAddrHeader instance or undefined if
     * it is an invalid NameAddrHeader.
     */
    value: function parse(name_addr_header) {
      name_addr_header = Grammar.parse(name_addr_header, 'Name_Addr_Header');

      if (name_addr_header !== -1) {
        return name_addr_header;
      } else {
        return undefined;
      }
    }
  }]);

  function NameAddrHeader(uri, display_name, parameters) {
    _classCallCheck(this, NameAddrHeader);

    // Checks.
    if (!uri || !(uri instanceof URI)) {
      throw new TypeError('missing or invalid "uri" parameter');
    }

    // Initialize parameters.
    this._uri = uri;
    this._parameters = {};
    this._display_name = display_name;

    for (var param in parameters) {
      if (Object.prototype.hasOwnProperty.call(parameters, param)) {
        this.setParam(param, parameters[param]);
      }
    }
  }

  _createClass(NameAddrHeader, [{
    key: 'setParam',
    value: function setParam(key, value) {
      if (key) {
        this._parameters[key.toLowerCase()] = typeof value === 'undefined' || value === null ? null : value.toString();
      }
    }
  }, {
    key: 'getParam',
    value: function getParam(key) {
      if (key) {
        return this._parameters[key.toLowerCase()];
      }
    }
  }, {
    key: 'hasParam',
    value: function hasParam(key) {
      if (key) {
        return this._parameters.hasOwnProperty(key.toLowerCase()) && true || false;
      }
    }
  }, {
    key: 'deleteParam',
    value: function deleteParam(parameter) {
      parameter = parameter.toLowerCase();
      if (this._parameters.hasOwnProperty(parameter)) {
        var value = this._parameters[parameter];

        delete this._parameters[parameter];

        return value;
      }
    }
  }, {
    key: 'clearParams',
    value: function clearParams() {
      this._parameters = {};
    }
  }, {
    key: 'clone',
    value: function clone() {
      return new NameAddrHeader(this._uri.clone(), this._display_name, JSON.parse(JSON.stringify(this._parameters)));
    }
  }, {
    key: 'toString',
    value: function toString() {
      var body = this._display_name || this._display_name === 0 ? '"' + this._display_name + '" ' : '';

      body += '<' + this._uri.toString() + '>';

      for (var parameter in this._parameters) {
        if (Object.prototype.hasOwnProperty.call(this._parameters, parameter)) {
          body += ';' + parameter;

          if (this._parameters[parameter] !== null) {
            body += '=' + this._parameters[parameter];
          }
        }
      }

      return body;
    }
  }, {
    key: 'uri',
    get: function get() {
      return this._uri;
    }
  }, {
    key: 'display_name',
    get: function get() {
      return this._display_name;
    },
    set: function set(value) {
      this._display_name = value === 0 ? '0' : value;
    }
  }]);

  return NameAddrHeader;
}();

},{"./Grammar":7,"./URI":25}],11:[function(require,module,exports){
'use strict';

var Grammar = require('./Grammar');
var SIPMessage = require('./SIPMessage');
var debugerror = require('debug')('JsSIP:ERROR:Parser');

debugerror.log = console.warn.bind(console);

/**
 * Parse SIP Message
 */
exports.parseMessage = function (data, ua) {
  var message = void 0;
  var bodyStart = void 0;
  var headerEnd = data.indexOf('\r\n');

  if (headerEnd === -1) {
    debugerror('parseMessage() | no CRLF found, not a SIP message');

    return;
  }

  // Parse first line. Check if it is a Request or a Reply.
  var firstLine = data.substring(0, headerEnd);
  var parsed = Grammar.parse(firstLine, 'Request_Response');

  if (parsed === -1) {
    debugerror('parseMessage() | error parsing first line of SIP message: "' + firstLine + '"');

    return;
  } else if (!parsed.status_code) {
    message = new SIPMessage.IncomingRequest(ua);
    message.method = parsed.method;
    message.ruri = parsed.uri;
  } else {
    message = new SIPMessage.IncomingResponse();
    message.status_code = parsed.status_code;
    message.reason_phrase = parsed.reason_phrase;
  }

  message.data = data;
  var headerStart = headerEnd + 2;

  /* Loop over every line in data. Detect the end of each header and parse
  * it or simply add to the headers collection.
  */
  while (true) {
    headerEnd = getHeader(data, headerStart);

    // The SIP message has normally finished.
    if (headerEnd === -2) {
      bodyStart = headerStart + 2;
      break;
    }
    // Data.indexOf returned -1 due to a malformed message.
    else if (headerEnd === -1) {
        debugerror('parseMessage() | malformed message');

        return;
      }

    parsed = parseHeader(message, data, headerStart, headerEnd);

    if (parsed !== true) {
      debugerror('parseMessage() |', parsed.error);

      return;
    }

    headerStart = headerEnd + 2;
  }

  /* RFC3261 18.3.
   * If there are additional bytes in the transport packet
   * beyond the end of the body, they MUST be discarded.
   */
  if (message.hasHeader('content-length')) {
    var contentLength = message.getHeader('content-length');

    message.body = data.substr(bodyStart, contentLength);
  } else {
    message.body = data.substring(bodyStart);
  }

  return message;
};

/**
 * Extract and parse every header of a SIP message.
 */
function getHeader(data, headerStart) {
  // 'start' position of the header.
  var start = headerStart;
  // 'end' position of the header.
  var end = 0;
  // 'partial end' position of the header.
  var partialEnd = 0;

  // End of message.
  if (data.substring(start, start + 2).match(/(^\r\n)/)) {
    return -2;
  }

  while (end === 0) {
    // Partial End of Header.
    partialEnd = data.indexOf('\r\n', start);

    // 'indexOf' returns -1 if the value to be found never occurs.
    if (partialEnd === -1) {
      return partialEnd;
    }

    if (!data.substring(partialEnd + 2, partialEnd + 4).match(/(^\r\n)/) && data.charAt(partialEnd + 2).match(/(^\s+)/)) {
      // Not the end of the message. Continue from the next position.
      start = partialEnd + 2;
    } else {
      end = partialEnd;
    }
  }

  return end;
}

function parseHeader(message, data, headerStart, headerEnd) {
  var parsed = void 0;
  var hcolonIndex = data.indexOf(':', headerStart);
  var headerName = data.substring(headerStart, hcolonIndex).trim();
  var headerValue = data.substring(hcolonIndex + 1, headerEnd).trim();

  // If header-field is well-known, parse it.
  switch (headerName.toLowerCase()) {
    case 'via':
    case 'v':
      message.addHeader('via', headerValue);
      if (message.getHeaders('via').length === 1) {
        parsed = message.parseHeader('Via');
        if (parsed) {
          message.via = parsed;
          message.via_branch = parsed.branch;
        }
      } else {
        parsed = 0;
      }
      break;
    case 'from':
    case 'f':
      message.setHeader('from', headerValue);
      parsed = message.parseHeader('from');
      if (parsed) {
        message.from = parsed;
        message.from_tag = parsed.getParam('tag');
      }
      break;
    case 'to':
    case 't':
      message.setHeader('to', headerValue);
      parsed = message.parseHeader('to');
      if (parsed) {
        message.to = parsed;
        message.to_tag = parsed.getParam('tag');
      }
      break;
    case 'record-route':
      parsed = Grammar.parse(headerValue, 'Record_Route');

      if (parsed === -1) {
        parsed = undefined;
      } else {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = parsed[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var header = _step.value;

            message.addHeader('record-route', headerValue.substring(header.possition, header.offset));
            message.headers['Record-Route'][message.getHeaders('record-route').length - 1].parsed = header.parsed;
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
      break;
    case 'call-id':
    case 'i':
      message.setHeader('call-id', headerValue);
      parsed = message.parseHeader('call-id');
      if (parsed) {
        message.call_id = headerValue;
      }
      break;
    case 'contact':
    case 'm':
      parsed = Grammar.parse(headerValue, 'Contact');

      if (parsed === -1) {
        parsed = undefined;
      } else {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = parsed[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _header = _step2.value;

            message.addHeader('contact', headerValue.substring(_header.possition, _header.offset));
            message.headers.Contact[message.getHeaders('contact').length - 1].parsed = _header.parsed;
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }
      break;
    case 'content-length':
    case 'l':
      message.setHeader('content-length', headerValue);
      parsed = message.parseHeader('content-length');
      break;
    case 'content-type':
    case 'c':
      message.setHeader('content-type', headerValue);
      parsed = message.parseHeader('content-type');
      break;
    case 'cseq':
      message.setHeader('cseq', headerValue);
      parsed = message.parseHeader('cseq');
      if (parsed) {
        message.cseq = parsed.value;
      }
      if (message instanceof SIPMessage.IncomingResponse) {
        message.method = parsed.method;
      }
      break;
    case 'max-forwards':
      message.setHeader('max-forwards', headerValue);
      parsed = message.parseHeader('max-forwards');
      break;
    case 'www-authenticate':
      message.setHeader('www-authenticate', headerValue);
      parsed = message.parseHeader('www-authenticate');
      break;
    case 'proxy-authenticate':
      message.setHeader('proxy-authenticate', headerValue);
      parsed = message.parseHeader('proxy-authenticate');
      break;
    case 'session-expires':
    case 'x':
      message.setHeader('session-expires', headerValue);
      parsed = message.parseHeader('session-expires');
      if (parsed) {
        message.session_expires = parsed.expires;
        message.session_expires_refresher = parsed.refresher;
      }
      break;
    case 'refer-to':
    case 'r':
      message.setHeader('refer-to', headerValue);
      parsed = message.parseHeader('refer-to');
      if (parsed) {
        message.refer_to = parsed;
      }
      break;
    case 'replaces':
      message.setHeader('replaces', headerValue);
      parsed = message.parseHeader('replaces');
      if (parsed) {
        message.replaces = parsed;
      }
      break;
    case 'event':
    case 'o':
      message.setHeader('event', headerValue);
      parsed = message.parseHeader('event');
      if (parsed) {
        message.event = parsed;
      }
      break;
    default:
      // Do not parse this header.
      message.setHeader(headerName, headerValue);
      parsed = 0;
  }

  if (parsed === undefined) {
    return {
      error: 'error parsing header "' + headerName + '"'
    };
  } else {
    return true;
  }
}

},{"./Grammar":7,"./SIPMessage":19,"debug":29}],12:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* globals RTCPeerConnection: false, RTCSessionDescription: false */

var EventEmitter = require('events').EventEmitter;
var sdp_transform = require('sdp-transform');
var JsSIP_C = require('./Constants');
var Exceptions = require('./Exceptions');
var Transactions = require('./Transactions');
var Utils = require('./Utils');
var Timers = require('./Timers');
var SIPMessage = require('./SIPMessage');
var Dialog = require('./Dialog');
var RequestSender = require('./RequestSender');
var RTCSession_DTMF = require('./RTCSession/DTMF');
var RTCSession_Info = require('./RTCSession/Info');
var RTCSession_ReferNotifier = require('./RTCSession/ReferNotifier');
var RTCSession_ReferSubscriber = require('./RTCSession/ReferSubscriber');
var debug = require('debug')('JsSIP:RTCSession');
var debugerror = require('debug')('JsSIP:ERROR:RTCSession');

debugerror.log = console.warn.bind(console);

var C = {
  // RTCSession states.
  STATUS_NULL: 0,
  STATUS_INVITE_SENT: 1,
  STATUS_1XX_RECEIVED: 2,
  STATUS_INVITE_RECEIVED: 3,
  STATUS_WAITING_FOR_ANSWER: 4,
  STATUS_ANSWERED: 5,
  STATUS_WAITING_FOR_ACK: 6,
  STATUS_CANCELED: 7,
  STATUS_TERMINATED: 8,
  STATUS_CONFIRMED: 9
};

/**
 * Local variables.
 */
var holdMediaTypes = ['audio', 'video'];

module.exports = function (_EventEmitter) {
  _inherits(RTCSession, _EventEmitter);

  _createClass(RTCSession, null, [{
    key: 'C',

    /**
     * Expose C object.
     */
    get: function get() {
      return C;
    }
  }]);

  function RTCSession(ua) {
    _classCallCheck(this, RTCSession);

    debug('new');

    var _this = _possibleConstructorReturn(this, (RTCSession.__proto__ || Object.getPrototypeOf(RTCSession)).call(this));

    _this._id = null;
    _this._ua = ua;
    _this._status = C.STATUS_NULL;
    _this._dialog = null;
    _this._earlyDialogs = {};
    _this._contact = null;
    _this._from_tag = null;

    // The RTCPeerConnection instance (public attribute).
    _this._connection = null;

    // Incoming/Outgoing request being currently processed.
    _this._request = null;

    // Cancel state for initial outgoing request.
    _this._is_canceled = false;
    _this._cancel_reason = '';

    // RTCSession confirmation flag.
    _this._is_confirmed = false;

    // Is late SDP being negotiated.
    _this._late_sdp = false;

    // Default rtcOfferConstraints and rtcAnswerConstrainsts (passed in connect() or answer()).
    _this._rtcOfferConstraints = null;
    _this._rtcAnswerConstraints = null;

    // Local MediaStream.
    _this._localMediaStream = null;
    _this._localMediaStreamLocallyGenerated = false;

    // Flag to indicate PeerConnection ready for new actions.
    _this._rtcReady = true;

    // SIP Timers.
    _this._timers = {
      ackTimer: null,
      expiresTimer: null,
      invite2xxTimer: null,
      userNoAnswerTimer: null
    };

    // Session info.
    _this._direction = null;
    _this._local_identity = null;
    _this._remote_identity = null;
    _this._start_time = null;
    _this._end_time = null;
    _this._tones = null;

    // Mute/Hold state.
    _this._audioMuted = false;
    _this._videoMuted = false;
    _this._localHold = false;
    _this._remoteHold = false;

    // Session Timers (RFC 4028).
    _this._sessionTimers = {
      enabled: _this._ua.configuration.session_timers,
      defaultExpires: JsSIP_C.SESSION_EXPIRES,
      currentExpires: null,
      running: false,
      refresher: false,
      timer: null // A setTimeout.
    };

    // Map of ReferSubscriber instances indexed by the REFER's CSeq number.
    _this._referSubscribers = {};

    // Custom session empty object for high level use.
    _this._data = {};
    return _this;
  }

  /**
   * User API
   */

  // Expose RTCSession constants as a property of the RTCSession instance.


  _createClass(RTCSession, [{
    key: 'isInProgress',
    value: function isInProgress() {
      switch (this._status) {
        case C.STATUS_NULL:
        case C.STATUS_INVITE_SENT:
        case C.STATUS_1XX_RECEIVED:
        case C.STATUS_INVITE_RECEIVED:
        case C.STATUS_WAITING_FOR_ANSWER:
          return true;
        default:
          return false;
      }
    }
  }, {
    key: 'isEstablished',
    value: function isEstablished() {
      switch (this._status) {
        case C.STATUS_ANSWERED:
        case C.STATUS_WAITING_FOR_ACK:
        case C.STATUS_CONFIRMED:
          return true;
        default:
          return false;
      }
    }
  }, {
    key: 'isEnded',
    value: function isEnded() {
      switch (this._status) {
        case C.STATUS_CANCELED:
        case C.STATUS_TERMINATED:
          return true;
        default:
          return false;
      }
    }
  }, {
    key: 'isMuted',
    value: function isMuted() {
      return {
        audio: this._audioMuted,
        video: this._videoMuted
      };
    }
  }, {
    key: 'isOnHold',
    value: function isOnHold() {
      return {
        local: this._localHold,
        remote: this._remoteHold
      };
    }
  }, {
    key: 'connect',
    value: function connect(target) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var initCallback = arguments[2];

      debug('connect()');

      var originalTarget = target;
      var eventHandlers = options.eventHandlers || {};
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var mediaConstraints = options.mediaConstraints || { audio: true, video: true };
      var mediaStream = options.mediaStream || null;
      var pcConfig = options.pcConfig || { iceServers: [] };
      var rtcConstraints = options.rtcConstraints || null;
      var rtcOfferConstraints = options.rtcOfferConstraints || null;

      this._rtcOfferConstraints = rtcOfferConstraints;
      this._rtcAnswerConstraints = options.rtcAnswerConstraints || null;

      this._data = options.data || this._data;

      // Check target.
      if (target === undefined) {
        throw new TypeError('Not enough arguments');
      }

      // Check Session Status.
      if (this._status !== C.STATUS_NULL) {
        throw new Exceptions.InvalidStateError(this._status);
      }

      // Check WebRTC support.
      if (!window.RTCPeerConnection) {
        throw new Exceptions.NotSupportedError('WebRTC not supported');
      }

      // Check target validity.
      target = this._ua.normalizeTarget(target);
      if (!target) {
        throw new TypeError('Invalid target: ' + originalTarget);
      }

      // Session Timers.
      if (this._sessionTimers.enabled) {
        if (Utils.isDecimal(options.sessionTimersExpires)) {
          if (options.sessionTimersExpires >= JsSIP_C.MIN_SESSION_EXPIRES) {
            this._sessionTimers.defaultExpires = options.sessionTimersExpires;
          } else {
            this._sessionTimers.defaultExpires = JsSIP_C.SESSION_EXPIRES;
          }
        }
      }

      // Set event handlers.
      for (var event in eventHandlers) {
        if (Object.prototype.hasOwnProperty.call(eventHandlers, event)) {
          this.on(event, eventHandlers[event]);
        }
      }

      // Session parameter initialization.
      this._from_tag = Utils.newTag();

      // Set anonymous property.
      var anonymous = options.anonymous || false;

      var requestParams = { from_tag: this._from_tag };

      this._contact = this._ua.contact.toString({
        anonymous: anonymous,
        outbound: true
      });

      if (anonymous) {
        requestParams.from_display_name = 'Anonymous';
        requestParams.from_uri = 'sip:anonymous@anonymous.invalid';

        extraHeaders.push('P-Preferred-Identity: ' + this._ua.configuration.uri.toString());
        extraHeaders.push('Privacy: id');
      }

      extraHeaders.push('Contact: ' + this._contact);
      extraHeaders.push('Content-Type: application/sdp');
      if (this._sessionTimers.enabled) {
        extraHeaders.push('Session-Expires: ' + this._sessionTimers.defaultExpires);
      }

      this._request = new SIPMessage.InitialOutgoingInviteRequest(target, this._ua, requestParams, extraHeaders);

      this._id = this._request.call_id + this._from_tag;

      // Create a new RTCPeerConnection instance.
      this._createRTCConnection(pcConfig, rtcConstraints);

      // Set internal properties.
      this._direction = 'outgoing';
      this._local_identity = this._request.from;
      this._remote_identity = this._request.to;

      // User explicitly provided a newRTCSession callback for this session.
      if (initCallback) {
        initCallback(this);
      }

      this._newRTCSession('local', this._request);

      this._sendInitialRequest(mediaConstraints, rtcOfferConstraints, mediaStream);
    }
  }, {
    key: 'init_incoming',
    value: function init_incoming(request, initCallback) {
      var _this2 = this;

      debug('init_incoming()');

      var expires = void 0;
      var contentType = request.getHeader('Content-Type');

      // Check body and content type.
      if (request.body && contentType !== 'application/sdp') {
        request.reply(415);

        return;
      }

      // Session parameter initialization.
      this._status = C.STATUS_INVITE_RECEIVED;
      this._from_tag = request.from_tag;
      this._id = request.call_id + this._from_tag;
      this._request = request;
      this._contact = this._ua.contact.toString();

      // Get the Expires header value if exists.
      if (request.hasHeader('expires')) {
        expires = request.getHeader('expires') * 1000;
      }

      /* Set the to_tag before
       * replying a response code that will create a dialog.
       */
      request.to_tag = Utils.newTag();

      // An error on dialog creation will fire 'failed' event.
      if (!this._createDialog(request, 'UAS', true)) {
        request.reply(500, 'Missing Contact header field');

        return;
      }

      if (request.body) {
        this._late_sdp = false;
      } else {
        this._late_sdp = true;
      }

      this._status = C.STATUS_WAITING_FOR_ANSWER;

      // Set userNoAnswerTimer.
      this._timers.userNoAnswerTimer = setTimeout(function () {
        request.reply(408);
        _this2._failed('local', null, JsSIP_C.causes.NO_ANSWER);
      }, this._ua.configuration.no_answer_timeout);

      /* Set expiresTimer
       * RFC3261 13.3.1
       */
      if (expires) {
        this._timers.expiresTimer = setTimeout(function () {
          if (_this2._status === C.STATUS_WAITING_FOR_ANSWER) {
            request.reply(487);
            _this2._failed('system', null, JsSIP_C.causes.EXPIRES);
          }
        }, expires);
      }

      // Set internal properties.
      this._direction = 'incoming';
      this._local_identity = request.to;
      this._remote_identity = request.from;

      // A init callback was specifically defined.
      if (initCallback) {
        initCallback(this);
      }

      // Fire 'newRTCSession' event.
      this._newRTCSession('remote', request);

      // The user may have rejected the call in the 'newRTCSession' event.
      if (this._status === C.STATUS_TERMINATED) {
        return;
      }

      // Reply 180.
      request.reply(180, null, ['Contact: ' + this._contact]);

      // Fire 'progress' event.
      // TODO: Document that 'response' field in 'progress' event is null for incoming calls.
      this._progress('local', null);
    }

    /**
     * Answer the call.
     */

  }, {
    key: 'answer',
    value: function answer() {
      var _this3 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      debug('answer()');

      var request = this._request;
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var mediaConstraints = options.mediaConstraints || {};
      var mediaStream = options.mediaStream || null;
      var pcConfig = options.pcConfig || { iceServers: [] };
      var rtcConstraints = options.rtcConstraints || null;
      var rtcAnswerConstraints = options.rtcAnswerConstraints || null;

      var tracks = void 0;
      var peerHasAudioLine = false;
      var peerHasVideoLine = false;
      var peerOffersFullAudio = false;
      var peerOffersFullVideo = false;

      this._rtcAnswerConstraints = rtcAnswerConstraints;
      this._rtcOfferConstraints = options.rtcOfferConstraints || null;

      this._data = options.data || this._data;

      // Check Session Direction and Status.
      if (this._direction !== 'incoming') {
        throw new Exceptions.NotSupportedError('"answer" not supported for outgoing RTCSession');
      }

      // Check Session status.
      if (this._status !== C.STATUS_WAITING_FOR_ANSWER) {
        throw new Exceptions.InvalidStateError(this._status);
      }

      // Session Timers.
      if (this._sessionTimers.enabled) {
        if (Utils.isDecimal(options.sessionTimersExpires)) {
          if (options.sessionTimersExpires >= JsSIP_C.MIN_SESSION_EXPIRES) {
            this._sessionTimers.defaultExpires = options.sessionTimersExpires;
          } else {
            this._sessionTimers.defaultExpires = JsSIP_C.SESSION_EXPIRES;
          }
        }
      }

      this._status = C.STATUS_ANSWERED;

      // An error on dialog creation will fire 'failed' event.
      if (!this._createDialog(request, 'UAS')) {
        request.reply(500, 'Error creating dialog');

        return;
      }

      clearTimeout(this._timers.userNoAnswerTimer);

      extraHeaders.unshift('Contact: ' + this._contact);

      // Determine incoming media from incoming SDP offer (if any).
      var sdp = request.parseSDP();

      // Make sure sdp.media is an array, not the case if there is only one media.
      if (!Array.isArray(sdp.media)) {
        sdp.media = [sdp.media];
      }

      // Go through all medias in SDP to find offered capabilities to answer with.
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = sdp.media[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var m = _step.value;

          if (m.type === 'audio') {
            peerHasAudioLine = true;
            if (!m.direction || m.direction === 'sendrecv') {
              peerOffersFullAudio = true;
            }
          }
          if (m.type === 'video') {
            peerHasVideoLine = true;
            if (!m.direction || m.direction === 'sendrecv') {
              peerOffersFullVideo = true;
            }
          }
        }

        // Remove audio from mediaStream if suggested by mediaConstraints.
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (mediaStream && mediaConstraints.audio === false) {
        tracks = mediaStream.getAudioTracks();
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = tracks[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var track = _step2.value;

            mediaStream.removeTrack(track);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }

      // Remove video from mediaStream if suggested by mediaConstraints.
      if (mediaStream && mediaConstraints.video === false) {
        tracks = mediaStream.getVideoTracks();
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = tracks[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var _track = _step3.value;

            mediaStream.removeTrack(_track);
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
      }

      // Set audio constraints based on incoming stream if not supplied.
      if (!mediaStream && mediaConstraints.audio === undefined) {
        mediaConstraints.audio = peerOffersFullAudio;
      }

      // Set video constraints based on incoming stream if not supplied.
      if (!mediaStream && mediaConstraints.video === undefined) {
        mediaConstraints.video = peerOffersFullVideo;
      }

      // Don't ask for audio if the incoming offer has no audio section.
      if (!mediaStream && !peerHasAudioLine) {
        mediaConstraints.audio = false;
      }

      // Don't ask for video if the incoming offer has no video section.
      if (!mediaStream && !peerHasVideoLine) {
        mediaConstraints.video = false;
      }

      // Create a new RTCPeerConnection instance.
      // TODO: This may throw an error, should react.
      this._createRTCConnection(pcConfig, rtcConstraints);

      // If a local MediaStream is given use it.
      if (mediaStream) {
        userMediaSucceeded(mediaStream);
      }
      // If at least audio or video is requested prompt getUserMedia.
      else if (mediaConstraints.audio || mediaConstraints.video) {
          this._localMediaStreamLocallyGenerated = true;
          navigator.mediaDevices.getUserMedia(mediaConstraints).then(userMediaSucceeded.bind(this)).catch(function (error) {
            userMediaFailed.call(_this3, error);

            debugerror('emit "getusermediafailed" [error:%o]', error);

            _this3.emit('getusermediafailed', error);
          });
          // Otherwise don't prompt getUserMedia.
        } else {
          userMediaSucceeded.call(this, null);
        }

      // User media succeeded.
      function userMediaSucceeded(stream) {
        var _this4 = this;

        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        this._localMediaStream = stream;
        if (stream) {
          this._connection.addStream(stream);
        }

        debug('emit "peerconnection"');

        this.emit('peerconnection', {
          peerconnection: this._connection
        });

        if (!this._late_sdp) {
          var e = { originator: 'remote', type: 'offer', sdp: request.body };

          debug('emit "sdp"');
          this.emit('sdp', e);

          var offer = new RTCSessionDescription({ type: 'offer', sdp: e.sdp });

          this._connection.setRemoteDescription(offer).then(remoteDescriptionSucceededOrNotNeeded.bind(this)).catch(function (error) {
            request.reply(488);
            _this4._failed('system', null, JsSIP_C.causes.WEBRTC_ERROR);

            debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

            _this4.emit('peerconnection:setremotedescriptionfailed', error);
          });
        } else {
          remoteDescriptionSucceededOrNotNeeded.call(this);
        }
      }

      // User media failed.
      function userMediaFailed() {
        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        request.reply(480);
        this._failed('local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
      }

      function remoteDescriptionSucceededOrNotNeeded() {
        this._connecting(request);
        if (!this._late_sdp) {
          this._createLocalDescription('answer', rtcSucceeded.bind(this), rtcFailed.bind(this), rtcAnswerConstraints);
        } else {
          this._createLocalDescription('offer', rtcSucceeded.bind(this), rtcFailed.bind(this), this._rtcOfferConstraints);
        }
      }

      function rtcSucceeded(desc) {
        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        // Run for reply success callback.
        function replySucceeded() {
          this._status = C.STATUS_WAITING_FOR_ACK;

          this._setInvite2xxTimer(request, desc);
          this._setACKTimer();
          this._accepted('local');
        }

        // Run for reply failure callback.
        function replyFailed() {
          this._failed('system', null, JsSIP_C.causes.CONNECTION_ERROR);
        }

        this._handleSessionTimersInIncomingRequest(request, extraHeaders);

        request.reply(200, null, extraHeaders, desc, replySucceeded.bind(this), replyFailed.bind(this));
      }

      function rtcFailed() {
        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        request.reply(500);
        this._failed('system', null, JsSIP_C.causes.WEBRTC_ERROR);
      }
    }

    /**
     * Terminate the call.
     */

  }, {
    key: 'terminate',
    value: function terminate() {
      var _this5 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      debug('terminate()');

      var cause = options.cause || JsSIP_C.causes.BYE;
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var body = options.body;

      var cancel_reason = void 0;
      var status_code = options.status_code;
      var reason_phrase = options.reason_phrase;

      // Check Session Status.
      if (this._status === C.STATUS_TERMINATED) {
        throw new Exceptions.InvalidStateError(this._status);
      }

      switch (this._status) {
        // - UAC -
        case C.STATUS_NULL:
        case C.STATUS_INVITE_SENT:
        case C.STATUS_1XX_RECEIVED:
          debug('canceling session');

          if (status_code && (status_code < 200 || status_code >= 700)) {
            throw new TypeError('Invalid status_code: ' + status_code);
          } else if (status_code) {
            reason_phrase = reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
            cancel_reason = 'SIP ;cause=' + status_code + ' ;text="' + reason_phrase + '"';
          }

          // Check Session Status.
          if (this._status === C.STATUS_NULL || this._status === C.STATUS_INVITE_SENT) {
            this._is_canceled = true;
            this._cancel_reason = cancel_reason;
          } else if (this._status === C.STATUS_1XX_RECEIVED) {
            this._request.cancel(cancel_reason);
          }

          this._status = C.STATUS_CANCELED;

          this._failed('local', null, JsSIP_C.causes.CANCELED);
          break;

        // - UAS -
        case C.STATUS_WAITING_FOR_ANSWER:
        case C.STATUS_ANSWERED:
          debug('rejecting session');

          status_code = status_code || 480;

          if (status_code < 300 || status_code >= 700) {
            throw new TypeError('Invalid status_code: ' + status_code);
          }

          this._request.reply(status_code, reason_phrase, extraHeaders, body);
          this._failed('local', null, JsSIP_C.causes.REJECTED);
          break;

        case C.STATUS_WAITING_FOR_ACK:
        case C.STATUS_CONFIRMED:
          debug('terminating session');

          reason_phrase = options.reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';

          if (status_code && (status_code < 200 || status_code >= 700)) {
            throw new TypeError('Invalid status_code: ' + status_code);
          } else if (status_code) {
            extraHeaders.push('Reason: SIP ;cause=' + status_code + '; text="' + reason_phrase + '"');
          }

          /* RFC 3261 section 15 (Terminating a session):
            *
            * "...the callee's UA MUST NOT send a BYE on a confirmed dialog
            * until it has received an ACK for its 2xx response or until the server
            * transaction times out."
            */
          if (this._status === C.STATUS_WAITING_FOR_ACK && this._direction === 'incoming' && this._request.server_transaction.state !== Transactions.C.STATUS_TERMINATED) {

            // Save the dialog for later restoration.
            var dialog = this._dialog;

            // Send the BYE as soon as the ACK is received...
            this.receiveRequest = function (_ref) {
              var method = _ref.method;

              if (method === JsSIP_C.ACK) {
                _this5.sendRequest(JsSIP_C.BYE, {
                  extraHeaders: extraHeaders,
                  body: body
                });
                dialog.terminate();
              }
            };

            // .., or when the INVITE transaction times out
            this._request.server_transaction.on('stateChanged', function () {
              if (_this5._request.server_transaction.state === Transactions.C.STATUS_TERMINATED) {
                _this5.sendRequest(JsSIP_C.BYE, {
                  extraHeaders: extraHeaders,
                  body: body
                });
                dialog.terminate();
              }
            });

            this._ended('local', null, cause);

            // Restore the dialog into 'this' in order to be able to send the in-dialog BYE :-).
            this._dialog = dialog;

            // Restore the dialog into 'ua' so the ACK can reach 'this' session.
            this._ua.newDialog(dialog);
          } else {
            this.sendRequest(JsSIP_C.BYE, {
              extraHeaders: extraHeaders,
              body: body
            });

            this._ended('local', null, cause);
          }
      }
    }
  }, {
    key: 'sendDTMF',
    value: function sendDTMF(tones) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      debug('sendDTMF() | tones: %s', tones);

      var position = 0;
      var duration = options.duration || null;
      var interToneGap = options.interToneGap || null;

      if (tones === undefined) {
        throw new TypeError('Not enough arguments');
      }

      // Check Session Status.
      if (this._status !== C.STATUS_CONFIRMED && this._status !== C.STATUS_WAITING_FOR_ACK) {
        throw new Exceptions.InvalidStateError(this._status);
      }

      // Convert to string.
      if (typeof tones === 'number') {
        tones = tones.toString();
      }

      // Check tones.
      if (!tones || typeof tones !== 'string' || !tones.match(/^[0-9A-DR#*,]+$/i)) {
        throw new TypeError('Invalid tones: ' + tones);
      }

      // Check duration.
      if (duration && !Utils.isDecimal(duration)) {
        throw new TypeError('Invalid tone duration: ' + duration);
      } else if (!duration) {
        duration = RTCSession_DTMF.C.DEFAULT_DURATION;
      } else if (duration < RTCSession_DTMF.C.MIN_DURATION) {
        debug('"duration" value is lower than the minimum allowed, setting it to ' + RTCSession_DTMF.C.MIN_DURATION + ' milliseconds');
        duration = RTCSession_DTMF.C.MIN_DURATION;
      } else if (duration > RTCSession_DTMF.C.MAX_DURATION) {
        debug('"duration" value is greater than the maximum allowed, setting it to ' + RTCSession_DTMF.C.MAX_DURATION + ' milliseconds');
        duration = RTCSession_DTMF.C.MAX_DURATION;
      } else {
        duration = Math.abs(duration);
      }
      options.duration = duration;

      // Check interToneGap.
      if (interToneGap && !Utils.isDecimal(interToneGap)) {
        throw new TypeError('Invalid interToneGap: ' + interToneGap);
      } else if (!interToneGap) {
        interToneGap = RTCSession_DTMF.C.DEFAULT_INTER_TONE_GAP;
      } else if (interToneGap < RTCSession_DTMF.C.MIN_INTER_TONE_GAP) {
        debug('"interToneGap" value is lower than the minimum allowed, setting it to ' + RTCSession_DTMF.C.MIN_INTER_TONE_GAP + ' milliseconds');
        interToneGap = RTCSession_DTMF.C.MIN_INTER_TONE_GAP;
      } else {
        interToneGap = Math.abs(interToneGap);
      }

      if (this._tones) {
        // Tones are already queued, just add to the queue.
        this._tones += tones;

        return;
      }

      this._tones = tones;

      // Send the first tone.
      _sendDTMF.call(this);

      function _sendDTMF() {
        var _this6 = this;

        var timeout = void 0;

        if (this._status === C.STATUS_TERMINATED || !this._tones || position >= this._tones.length) {
          // Stop sending DTMF.
          this._tones = null;

          return;
        }

        var tone = this._tones[position];

        position += 1;

        if (tone === ',') {
          timeout = 2000;
        } else {
          var dtmf = new RTCSession_DTMF(this);

          options.eventHandlers = {
            onFailed: function onFailed() {
              _this6._tones = null;
            }
          };
          dtmf.send(tone, options);
          timeout = duration + interToneGap;
        }

        // Set timeout for the next tone.
        setTimeout(_sendDTMF.bind(this), timeout);
      }
    }
  }, {
    key: 'sendInfo',
    value: function sendInfo(contentType, body) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      debug('sendInfo()');

      // Check Session Status.
      if (this._status !== C.STATUS_CONFIRMED && this._status !== C.STATUS_WAITING_FOR_ACK) {
        throw new Exceptions.InvalidStateError(this._status);
      }

      var info = new RTCSession_Info(this);

      info.send(contentType, body, options);
    }

    /**
     * Mute
     */

  }, {
    key: 'mute',
    value: function mute() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { audio: true, video: false };

      debug('mute()');

      var audioMuted = false,
          videoMuted = false;

      if (this._audioMuted === false && options.audio) {
        audioMuted = true;
        this._audioMuted = true;
        this._toogleMuteAudio(true);
      }

      if (this._videoMuted === false && options.video) {
        videoMuted = true;
        this._videoMuted = true;
        this._toogleMuteVideo(true);
      }

      if (audioMuted === true || videoMuted === true) {
        this._onmute({
          audio: audioMuted,
          video: videoMuted
        });
      }
    }

    /**
     * Unmute
     */

  }, {
    key: 'unmute',
    value: function unmute() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { audio: true, video: true };

      debug('unmute()');

      var audioUnMuted = false,
          videoUnMuted = false;

      if (this._audioMuted === true && options.audio) {
        audioUnMuted = true;
        this._audioMuted = false;

        if (this._localHold === false) {
          this._toogleMuteAudio(false);
        }
      }

      if (this._videoMuted === true && options.video) {
        videoUnMuted = true;
        this._videoMuted = false;

        if (this._localHold === false) {
          this._toogleMuteVideo(false);
        }
      }

      if (audioUnMuted === true || videoUnMuted === true) {
        this._onunmute({
          audio: audioUnMuted,
          video: videoUnMuted
        });
      }
    }

    /**
     * Hold
     */

  }, {
    key: 'hold',
    value: function hold() {
      var _this7 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var done = arguments[1];

      debug('hold()');

      if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
        return false;
      }

      if (this._localHold === true) {
        return false;
      }

      if (!this._isReadyToReOffer()) {
        return false;
      }

      this._localHold = true;
      this._onhold('local');

      var eventHandlers = {
        succeeded: function succeeded() {
          if (done) {
            done();
          }
        },
        failed: function failed() {
          _this7.terminate({
            cause: JsSIP_C.causes.WEBRTC_ERROR,
            status_code: 500,
            reason_phrase: 'Hold Failed'
          });
        }
      };

      if (options.useUpdate) {
        this._sendUpdate({
          sdpOffer: true,
          eventHandlers: eventHandlers,
          extraHeaders: options.extraHeaders
        });
      } else {
        this._sendReinvite({
          eventHandlers: eventHandlers,
          extraHeaders: options.extraHeaders
        });
      }

      return true;
    }
  }, {
    key: 'unhold',
    value: function unhold() {
      var _this8 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var done = arguments[1];

      debug('unhold()');

      if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
        return false;
      }

      if (this._localHold === false) {
        return false;
      }

      if (!this._isReadyToReOffer()) {
        return false;
      }

      this._localHold = false;
      this._onunhold('local');

      var eventHandlers = {
        succeeded: function succeeded() {
          if (done) {
            done();
          }
        },
        failed: function failed() {
          _this8.terminate({
            cause: JsSIP_C.causes.WEBRTC_ERROR,
            status_code: 500,
            reason_phrase: 'Unhold Failed'
          });
        }
      };

      if (options.useUpdate) {
        this._sendUpdate({
          sdpOffer: true,
          eventHandlers: eventHandlers,
          extraHeaders: options.extraHeaders
        });
      } else {
        this._sendReinvite({
          eventHandlers: eventHandlers,
          extraHeaders: options.extraHeaders
        });
      }

      return true;
    }
  }, {
    key: 'renegotiate',
    value: function renegotiate() {
      var _this9 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var done = arguments[1];

      debug('renegotiate()');

      var rtcOfferConstraints = options.rtcOfferConstraints || null;

      if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
        return false;
      }

      if (!this._isReadyToReOffer()) {
        return false;
      }

      var eventHandlers = {
        succeeded: function succeeded() {
          if (done) {
            done();
          }
        },
        failed: function failed() {
          _this9.terminate({
            cause: JsSIP_C.causes.WEBRTC_ERROR,
            status_code: 500,
            reason_phrase: 'Media Renegotiation Failed'
          });
        }
      };

      this._setLocalMediaStatus();

      if (options.useUpdate) {
        this._sendUpdate({
          sdpOffer: true,
          eventHandlers: eventHandlers,
          rtcOfferConstraints: rtcOfferConstraints,
          extraHeaders: options.extraHeaders
        });
      } else {
        this._sendReinvite({
          eventHandlers: eventHandlers,
          rtcOfferConstraints: rtcOfferConstraints,
          extraHeaders: options.extraHeaders
        });
      }

      return true;
    }

    /**
     * Refer
     */

  }, {
    key: 'refer',
    value: function refer(target, options) {
      var _this10 = this;

      debug('refer()');

      var originalTarget = target;

      if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
        return false;
      }

      // Check target validity.
      target = this._ua.normalizeTarget(target);
      if (!target) {
        throw new TypeError('Invalid target: ' + originalTarget);
      }

      var referSubscriber = new RTCSession_ReferSubscriber(this);

      referSubscriber.sendRefer(target, options);

      // Store in the map.
      var id = referSubscriber.id;

      this._referSubscribers[id] = referSubscriber;

      // Listen for ending events so we can remove it from the map.
      referSubscriber.on('requestFailed', function () {
        delete _this10._referSubscribers[id];
      });
      referSubscriber.on('accepted', function () {
        delete _this10._referSubscribers[id];
      });
      referSubscriber.on('failed', function () {
        delete _this10._referSubscribers[id];
      });

      return referSubscriber;
    }

    /**
     * Send a generic in-dialog Request
     */

  }, {
    key: 'sendRequest',
    value: function sendRequest(method, options) {
      debug('sendRequest()');

      return this._dialog.sendRequest(method, options);
    }

    /**
     * In dialog Request Reception
     */

  }, {
    key: 'receiveRequest',
    value: function receiveRequest(request) {
      var _this11 = this;

      debug('receiveRequest()');

      if (request.method === JsSIP_C.CANCEL) {
        /* RFC3261 15 States that a UAS may have accepted an invitation while a CANCEL
        * was in progress and that the UAC MAY continue with the session established by
        * any 2xx response, or MAY terminate with BYE. JsSIP does continue with the
        * established session. So the CANCEL is processed only if the session is not yet
        * established.
        */

        /*
        * Terminate the whole session in case the user didn't accept (or yet send the answer)
        * nor reject the request opening the session.
        */
        if (this._status === C.STATUS_WAITING_FOR_ANSWER || this._status === C.STATUS_ANSWERED) {
          this._status = C.STATUS_CANCELED;
          this._request.reply(487);
          this._failed('remote', request, JsSIP_C.causes.CANCELED);
        }
      } else {
        // Requests arriving here are in-dialog requests.
        switch (request.method) {
          case JsSIP_C.ACK:
            if (this._status !== C.STATUS_WAITING_FOR_ACK) {
              return;
            }

            // Update signaling status.
            this._status = C.STATUS_CONFIRMED;

            clearTimeout(this._timers.ackTimer);
            clearTimeout(this._timers.invite2xxTimer);

            if (this._late_sdp) {
              if (!request.body) {
                this.terminate({
                  cause: JsSIP_C.causes.MISSING_SDP,
                  status_code: 400
                });
                break;
              }

              var e = { originator: 'remote', type: 'answer', sdp: request.body };
              var answer = new RTCSessionDescription({ type: 'answer', sdp: e.sdp });

              this.emit('sdp', e);

              this._connection.setRemoteDescription(answer).then(function () {
                if (!_this11._is_confirmed) {
                  _this11._confirmed('remote', request);
                }
              }).catch(function (error) {
                _this11.terminate({
                  cause: JsSIP_C.causes.BAD_MEDIA_DESCRIPTION,
                  status_code: 488
                });

                _this11.emit('peerconnection:setremotedescriptionfailed', error);
              });
            } else if (!this._is_confirmed) {
              this._confirmed('remote', request);
            }

            break;
          case JsSIP_C.BYE:
            if (this._status === C.STATUS_CONFIRMED) {
              request.reply(200);
              this._ended('remote', request, JsSIP_C.causes.BYE);
            } else if (this._status === C.STATUS_INVITE_RECEIVED) {
              request.reply(200);
              this._request.reply(487, 'BYE Received');
              this._ended('remote', request, JsSIP_C.causes.BYE);
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.INVITE:
            if (this._status === C.STATUS_CONFIRMED) {
              if (request.hasHeader('replaces')) {
                this._receiveReplaces(request);
              } else {
                this._receiveReinvite(request);
              }
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.INFO:
            if (this._status === C.STATUS_1XX_RECEIVED || this._status === C.STATUS_WAITING_FOR_ANSWER || this._status === C.STATUS_ANSWERED || this._status === C.STATUS_WAITING_FOR_ACK || this._status === C.STATUS_CONFIRMED) {
              var contentType = request.getHeader('content-type');

              if (contentType && contentType.match(/^application\/dtmf-relay/i)) {
                new RTCSession_DTMF(this).init_incoming(request);
              } else if (contentType !== undefined) {
                new RTCSession_Info(this).init_incoming(request);
              } else {
                request.reply(415);
              }
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.UPDATE:
            if (this._status === C.STATUS_CONFIRMED) {
              this._receiveUpdate(request);
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.REFER:
            if (this._status === C.STATUS_CONFIRMED) {
              this._receiveRefer(request);
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.NOTIFY:
            if (this._status === C.STATUS_CONFIRMED) {
              this._receiveNotify(request);
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          default:
            request.reply(501);
        }
      }
    }

    /**
     * Session Callbacks
     */

  }, {
    key: 'onTransportError',
    value: function onTransportError() {
      debugerror('onTransportError()');

      if (this._status !== C.STATUS_TERMINATED) {
        this.terminate({
          status_code: 500,
          reason_phrase: JsSIP_C.causes.CONNECTION_ERROR,
          cause: JsSIP_C.causes.CONNECTION_ERROR
        });
      }
    }
  }, {
    key: 'onRequestTimeout',
    value: function onRequestTimeout() {
      debugerror('onRequestTimeout()');

      if (this._status !== C.STATUS_TERMINATED) {
        this.terminate({
          status_code: 408,
          reason_phrase: JsSIP_C.causes.REQUEST_TIMEOUT,
          cause: JsSIP_C.causes.REQUEST_TIMEOUT
        });
      }
    }
  }, {
    key: 'onDialogError',
    value: function onDialogError() {
      debugerror('onDialogError()');

      if (this._status !== C.STATUS_TERMINATED) {
        this.terminate({
          status_code: 500,
          reason_phrase: JsSIP_C.causes.DIALOG_ERROR,
          cause: JsSIP_C.causes.DIALOG_ERROR
        });
      }
    }

    // Called from DTMF handler.

  }, {
    key: 'newDTMF',
    value: function newDTMF(data) {
      debug('newDTMF()');

      this.emit('newDTMF', data);
    }

    // Called from Info handler.

  }, {
    key: 'newInfo',
    value: function newInfo(data) {
      debug('newInfo()');

      this.emit('newInfo', data);
    }

    /**
     * Check if RTCSession is ready for an outgoing re-INVITE or UPDATE with SDP.
     */

  }, {
    key: '_isReadyToReOffer',
    value: function _isReadyToReOffer() {
      if (!this._rtcReady) {
        debug('_isReadyToReOffer() | internal WebRTC status not ready');

        return false;
      }

      // No established yet.
      if (!this._dialog) {
        debug('_isReadyToReOffer() | session not established yet');

        return false;
      }

      // Another INVITE transaction is in progress.
      if (this._dialog.uac_pending_reply === true || this._dialog.uas_pending_reply === true) {
        debug('_isReadyToReOffer() | there is another INVITE/UPDATE transaction in progress');

        return false;
      }

      return true;
    }
  }, {
    key: '_close',
    value: function _close() {
      debug('close()');

      if (this._status === C.STATUS_TERMINATED) {
        return;
      }

      this._status = C.STATUS_TERMINATED;

      // Terminate RTC.
      if (this._connection) {
        try {
          this._connection.close();
        } catch (error) {
          debugerror('close() | error closing the RTCPeerConnection: %o', error);
        }
      }

      // Close local MediaStream if it was not given by the user.
      if (this._localMediaStream && this._localMediaStreamLocallyGenerated) {
        debug('close() | closing local MediaStream');

        Utils.closeMediaStream(this._localMediaStream);
      }

      // Terminate signaling.

      // Clear SIP timers.
      for (var timer in this._timers) {
        if (Object.prototype.hasOwnProperty.call(this._timers, timer)) {
          clearTimeout(this._timers[timer]);
        }
      }

      // Clear Session Timers.
      clearTimeout(this._sessionTimers.timer);

      // Terminate confirmed dialog.
      if (this._dialog) {
        this._dialog.terminate();
        delete this._dialog;
      }

      // Terminate early dialogs.
      for (var dialog in this._earlyDialogs) {
        if (Object.prototype.hasOwnProperty.call(this._earlyDialogs, dialog)) {
          this._earlyDialogs[dialog].terminate();
          delete this._earlyDialogs[dialog];
        }
      }

      // Terminate REFER subscribers.
      for (var subscriber in this._referSubscribers) {
        if (Object.prototype.hasOwnProperty.call(this._referSubscribers, subscriber)) {
          delete this._referSubscribers[subscriber];
        }
      }

      this._ua.destroyRTCSession(this);
    }

    /**
     * Private API.
     */

    /**
     * RFC3261 13.3.1.4
     * Response retransmissions cannot be accomplished by transaction layer
     *  since it is destroyed when receiving the first 2xx answer
     */

  }, {
    key: '_setInvite2xxTimer',
    value: function _setInvite2xxTimer(request, body) {
      var timeout = Timers.T1;

      function invite2xxRetransmission() {
        if (this._status !== C.STATUS_WAITING_FOR_ACK) {
          return;
        }

        request.reply(200, null, ['Contact: ' + this._contact], body);

        if (timeout < Timers.T2) {
          timeout = timeout * 2;
          if (timeout > Timers.T2) {
            timeout = Timers.T2;
          }
        }

        this._timers.invite2xxTimer = setTimeout(invite2xxRetransmission.bind(this), timeout);
      }

      this._timers.invite2xxTimer = setTimeout(invite2xxRetransmission.bind(this), timeout);
    }

    /**
     * RFC3261 14.2
     * If a UAS generates a 2xx response and never receives an ACK,
     *  it SHOULD generate a BYE to terminate the dialog.
     */

  }, {
    key: '_setACKTimer',
    value: function _setACKTimer() {
      var _this12 = this;

      this._timers.ackTimer = setTimeout(function () {
        if (_this12._status === C.STATUS_WAITING_FOR_ACK) {
          debug('no ACK received, terminating the session');

          clearTimeout(_this12._timers.invite2xxTimer);
          _this12.sendRequest(JsSIP_C.BYE);
          _this12._ended('remote', null, JsSIP_C.causes.NO_ACK);
        }
      }, Timers.TIMER_H);
    }
  }, {
    key: '_createRTCConnection',
    value: function _createRTCConnection(pcConfig, rtcConstraints) {
      var _this13 = this;

      this._connection = new RTCPeerConnection(pcConfig, rtcConstraints);

      this._connection.addEventListener('iceconnectionstatechange', function () {
        var state = _this13._connection.iceConnectionState;

        // TODO: Do more with different states.
        if (state === 'failed') {
          _this13.terminate({
            cause: JsSIP_C.causes.RTP_TIMEOUT,
            status_code: 408,
            reason_phrase: JsSIP_C.causes.RTP_TIMEOUT
          });
        }
      });
    }
  }, {
    key: '_createLocalDescription',
    value: function _createLocalDescription(type, onSuccess, onFailure, constraints) {
      var _this14 = this;

      debug('createLocalDescription()');

      var connection = this._connection;

      this._rtcReady = false;

      if (type === 'offer') {
        connection.createOffer(constraints).then(createSucceeded.bind(this)).catch(function (error) {
          _this14._rtcReady = true;
          if (onFailure) {
            onFailure(error);
          }

          debugerror('emit "peerconnection:createofferfailed" [error:%o]', error);

          _this14.emit('peerconnection:createofferfailed', error);
        });
      } else if (type === 'answer') {
        connection.createAnswer(constraints).then(createSucceeded.bind(this)).catch(function (error) {
          _this14._rtcReady = true;
          if (onFailure) {
            onFailure(error);
          }

          debugerror('emit "peerconnection:createanswerfailed" [error:%o]', error);

          _this14.emit('peerconnection:createanswerfailed', error);
        });
      } else {
        throw new Error('createLocalDescription() | type must be "offer" or "answer", but "' + type + '" was given');
      }

      // CreateAnswer or createOffer succeeded.
      function createSucceeded(desc) {
        var _this15 = this;

        var _listener = void 0;

        connection.addEventListener('icecandidate', _listener = function listener(event) {
          var candidate = event.candidate;

          if (!candidate) {
            connection.removeEventListener('icecandidate', _listener);
            _this15._rtcReady = true;

            if (onSuccess) {
              var e = { originator: 'local', type: type, sdp: connection.localDescription.sdp };

              debug('emit "sdp"');

              _this15.emit('sdp', e);
              onSuccess(e.sdp);
            }
            onSuccess = null;
          }
        });

        connection.setLocalDescription(desc).then(function () {
          if (connection.iceGatheringState === 'complete') {
            _this15._rtcReady = true;

            if (onSuccess) {
              var e = { originator: 'local', type: type, sdp: connection.localDescription.sdp };

              debug('emit "sdp"');

              _this15.emit('sdp', e);
              onSuccess(e.sdp);
              onSuccess = null;
            }
          }
        }).catch(function (error) {
          _this15._rtcReady = true;
          if (onFailure) {
            onFailure(error);
          }

          debugerror('emit "peerconnection:setlocaldescriptionfailed" [error:%o]', error);

          _this15.emit('peerconnection:setlocaldescriptionfailed', error);
        });
      }
    }

    /**
     * Dialog Management
     */

  }, {
    key: '_createDialog',
    value: function _createDialog(message, type, early) {
      var local_tag = type === 'UAS' ? message.to_tag : message.from_tag;
      var remote_tag = type === 'UAS' ? message.from_tag : message.to_tag;
      var id = message.call_id + local_tag + remote_tag;

      var early_dialog = this._earlyDialogs[id];

      // Early Dialog.
      if (early) {
        if (early_dialog) {
          return true;
        } else {
          early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

          // Dialog has been successfully created.
          if (early_dialog.error) {
            debug(early_dialog.error);
            this._failed('remote', message, JsSIP_C.causes.INTERNAL_ERROR);

            return false;
          } else {
            this._earlyDialogs[id] = early_dialog;

            return true;
          }
        }
      }

      // Confirmed Dialog.
      else {
          this._from_tag = message.from_tag;
          this._to_tag = message.to_tag;

          // In case the dialog is in _early_ state, update it.
          if (early_dialog) {
            early_dialog.update(message, type);
            this._dialog = early_dialog;
            delete this._earlyDialogs[id];

            return true;
          }

          // Otherwise, create a _confirmed_ dialog.
          var dialog = new Dialog(this, message, type);

          if (dialog.error) {
            debug(dialog.error);
            this._failed('remote', message, JsSIP_C.causes.INTERNAL_ERROR);

            return false;
          } else {
            this._dialog = dialog;

            return true;
          }
        }
    }

    /**
     * In dialog INVITE Reception
     */

  }, {
    key: '_receiveReinvite',
    value: function _receiveReinvite(request) {
      var _this16 = this;

      debug('receiveReinvite()');

      var contentType = request.getHeader('Content-Type');
      var data = {
        request: request,
        callback: undefined,
        reject: reject.bind(this)
      };

      var hold = false;
      var rejected = false;

      function reject() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        rejected = true;

        var status_code = options.status_code || 403;
        var reason_phrase = options.reason_phrase || '';
        var extraHeaders = Utils.cloneArray(options.extraHeaders);

        if (this._status !== C.STATUS_CONFIRMED) {
          return false;
        }

        if (status_code < 300 || status_code >= 700) {
          throw new TypeError('Invalid status_code: ' + status_code);
        }

        request.reply(status_code, reason_phrase, extraHeaders);
      }

      // Emit 'reinvite'.
      this.emit('reinvite', data);

      if (rejected) {
        return;
      }

      if (request.body) {
        this._late_sdp = false;
        if (contentType !== 'application/sdp') {
          debug('invalid Content-Type');
          request.reply(415);

          return;
        }

        var sdp = request.parseSDP();

        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = sdp.media[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var m = _step4.value;

            if (holdMediaTypes.indexOf(m.type) === -1) {
              continue;
            }

            var direction = m.direction || sdp.direction || 'sendrecv';

            if (direction === 'sendonly' || direction === 'inactive') {
              hold = true;
            }
            // If at least one of the streams is active don't emit 'hold'.
            else {
                hold = false;
                break;
              }
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }

        var e = { originator: 'remote', type: 'offer', sdp: request.body };
        var offer = new RTCSessionDescription({ type: 'offer', sdp: e.sdp });

        this.emit('sdp', e);

        this._connection.setRemoteDescription(offer).then(doAnswer.bind(this)).catch(function (error) {
          request.reply(488);

          debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

          _this16.emit('peerconnection:setremotedescriptionfailed', error);
        });
      } else {
        this._late_sdp = true;
        doAnswer.call(this);
      }

      function doAnswer() {
        var _this17 = this;

        createSdp.call(this, function (sdp) {
          var extraHeaders = ['Contact: ' + _this17._contact];

          _this17._handleSessionTimersInIncomingRequest(request, extraHeaders);

          if (_this17._late_sdp) {
            sdp = _this17._mangleOffer(sdp);
          }

          request.reply(200, null, extraHeaders, sdp, function () {
            _this17._status = C.STATUS_WAITING_FOR_ACK;
            _this17._setInvite2xxTimer(request, sdp);
            _this17._setACKTimer();
          });

          // If callback is given execute it.
          if (typeof data.callback === 'function') {
            data.callback();
          }
        }, function () {
          request.reply(500);
        });
      }

      function createSdp(onSuccess, onFailure) {
        if (!this._late_sdp) {
          if (this._remoteHold === true && hold === false) {
            this._remoteHold = false;
            this._onunhold('remote');
          } else if (this._remoteHold === false && hold === true) {
            this._remoteHold = true;
            this._onhold('remote');
          }

          this._createLocalDescription('answer', onSuccess, onFailure, this._rtcAnswerConstraints);
        } else {
          this._createLocalDescription('offer', onSuccess, onFailure, this._rtcOfferConstraints);
        }
      }
    }

    /**
     * In dialog UPDATE Reception
     */

  }, {
    key: '_receiveUpdate',
    value: function _receiveUpdate(request) {
      var _this18 = this;

      debug('receiveUpdate()');

      var contentType = request.getHeader('Content-Type');
      var data = {
        request: request,
        callback: undefined,
        reject: reject.bind(this)
      };

      var rejected = false;
      var hold = false;

      function reject() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        rejected = true;

        var status_code = options.status_code || 403;
        var reason_phrase = options.reason_phrase || '';
        var extraHeaders = Utils.cloneArray(options.extraHeaders);

        if (this._status !== C.STATUS_CONFIRMED) {
          return false;
        }

        if (status_code < 300 || status_code >= 700) {
          throw new TypeError('Invalid status_code: ' + status_code);
        }

        request.reply(status_code, reason_phrase, extraHeaders);
      }

      // Emit 'update'.
      this.emit('update', data);

      if (rejected) {
        return;
      }

      if (!request.body) {
        var extraHeaders = [];

        this._handleSessionTimersInIncomingRequest(request, extraHeaders);
        request.reply(200, null, extraHeaders);

        return;
      }

      if (contentType !== 'application/sdp') {
        debug('invalid Content-Type');

        request.reply(415);

        return;
      }

      var sdp = request.parseSDP();

      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = sdp.media[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var m = _step5.value;


          if (holdMediaTypes.indexOf(m.type) === -1) {
            continue;
          }

          var direction = m.direction || sdp.direction || 'sendrecv';

          if (direction === 'sendonly' || direction === 'inactive') {
            hold = true;
          }
          // If at least one of the streams is active don't emit 'hold'.
          else {
              hold = false;
              break;
            }
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }

      var e = { originator: 'remote', type: 'offer', sdp: request.body };

      debug('emit "sdp"');
      this.emit('sdp', e);

      var offer = new RTCSessionDescription({ type: 'offer', sdp: e.sdp });

      this._connection.setRemoteDescription(offer).then(function () {
        if (_this18._remoteHold === true && hold === false) {
          _this18._remoteHold = false;
          _this18._onunhold('remote');
        } else if (_this18._remoteHold === false && hold === true) {
          _this18._remoteHold = true;
          _this18._onhold('remote');
        }

        _this18._createLocalDescription('answer', function (answerSdp) {
          var extraHeaders = ['Contact: ' + _this18._contact];

          _this18._handleSessionTimersInIncomingRequest(request, extraHeaders);
          request.reply(200, null, extraHeaders, answerSdp);

          // If callback is given execute it.
          if (typeof data.callback === 'function') {
            data.callback();
          }
        }, function () {
          request.reply(500);
        });
      }).catch(function (error) {
        request.reply(488);

        debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

        _this18.emit('peerconnection:setremotedescriptionfailed', error);
      });
    }

    /**
     * In dialog Refer Reception
     */

  }, {
    key: '_receiveRefer',
    value: function _receiveRefer(request) {
      var _this19 = this;

      debug('receiveRefer()');

      if (_typeof(request.refer_to) === undefined) {
        debug('no Refer-To header field present in REFER');
        request.reply(400);

        return;
      }

      if (request.refer_to.uri.scheme !== JsSIP_C.SIP) {
        debug('Refer-To header field points to a non-SIP URI scheme');
        request.reply(416);

        return;
      }

      // Reply before the transaction timer expires.
      request.reply(202);

      var notifier = new RTCSession_ReferNotifier(this, request.cseq);

      debug('emit "refer"');

      // Emit 'refer'.
      this.emit('refer', {
        request: request,
        accept: function accept(initCallback, options) {
          _accept.call(_this19, initCallback, options);
        },
        reject: function reject() {
          _reject.call(_this19);
        }
      });

      function _accept(initCallback) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        initCallback = typeof initCallback === 'function' ? initCallback : null;

        if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
          return false;
        }

        var session = new RTCSession(this._ua);

        session.on('progress', function (_ref2) {
          var response = _ref2.response;

          notifier.notify(response.status_code, response.reason_phrase);
        });

        session.on('accepted', function (_ref3) {
          var response = _ref3.response;

          notifier.notify(response.status_code, response.reason_phrase);
        });

        session.on('failed', function (_ref4) {
          var message = _ref4.message,
              cause = _ref4.cause;

          if (message) {
            notifier.notify(message.status_code, message.reason_phrase);
          } else {
            notifier.notify(487, cause);
          }
        });

        // Consider the Replaces header present in the Refer-To URI.
        if (request.refer_to.uri.hasHeader('replaces')) {
          var replaces = decodeURIComponent(request.refer_to.uri.getHeader('replaces'));

          options.extraHeaders = Utils.cloneArray(options.extraHeaders);
          options.extraHeaders.push('Replaces: ' + replaces);
        }

        session.connect(request.refer_to.uri.toAor(), options, initCallback);
      }

      function _reject() {
        notifier.notify(603);
      }
    }

    /**
     * In dialog Notify Reception
     */

  }, {
    key: '_receiveNotify',
    value: function _receiveNotify(request) {
      debug('receiveNotify()');

      if (_typeof(request.event) === undefined) {
        request.reply(400);
      }

      switch (request.event.event) {
        case 'refer':
          {
            var id = void 0;
            var referSubscriber = void 0;

            if (request.event.params && request.event.params.id) {
              id = request.event.params.id;
              referSubscriber = this._referSubscribers[id];
            } else if (Object.keys(this._referSubscribers).length === 1) {
              referSubscriber = this._referSubscribers[Object.keys(this._referSubscribers)[0]];
            } else {
              request.reply(400, 'Missing event id parameter');

              return;
            }

            if (!referSubscriber) {
              request.reply(481, 'Subscription does not exist');

              return;
            }

            referSubscriber.receiveNotify(request);
            request.reply(200);

            break;
          }

        default:
          {
            request.reply(489);
          }
      }
    }

    /**
     * INVITE with Replaces Reception
     */

  }, {
    key: '_receiveReplaces',
    value: function _receiveReplaces(request) {
      var _this21 = this;

      debug('receiveReplaces()');

      function _accept2(initCallback) {
        var _this20 = this;

        if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
          return false;
        }

        var session = new RTCSession(this._ua);

        // Terminate the current session when the new one is confirmed.
        session.on('confirmed', function () {
          _this20.terminate();
        });

        session.init_incoming(request, initCallback);
      }

      function _reject2() {
        debug('Replaced INVITE rejected by the user');
        request.reply(486);
      }

      // Emit 'replace'.
      this.emit('replaces', {
        request: request,
        accept: function accept(initCallback) {
          _accept2.call(_this21, initCallback);
        },
        reject: function reject() {
          _reject2.call(_this21);
        }
      });
    }

    /**
     * Initial Request Sender
     */

  }, {
    key: '_sendInitialRequest',
    value: function _sendInitialRequest(mediaConstraints, rtcOfferConstraints, mediaStream) {
      var _this22 = this;

      var request_sender = new RequestSender(this._ua, this._request, {
        onRequestTimeout: function onRequestTimeout() {
          _this22.onRequestTimeout();
        },
        onTransportError: function onTransportError() {
          _this22.onTransportError();
        },
        // Update the request on authentication.
        onAuthenticated: function onAuthenticated(request) {
          _this22._request = request;
        },
        onReceiveResponse: function onReceiveResponse(response) {
          _this22._receiveInviteResponse(response);
        }
      });

      // If a local MediaStream is given use it.
      if (mediaStream) {
        // Wait a bit so the app can set events such as 'peerconnection' and 'connecting'.
        setTimeout(function () {
          userMediaSucceeded(mediaStream);
        });
        // If at least audio or video is requested prompt getUserMedia.
      } else if (mediaConstraints.audio || mediaConstraints.video) {
        this._localMediaStreamLocallyGenerated = true;
        navigator.mediaDevices.getUserMedia(mediaConstraints).then(userMediaSucceeded.bind(this)).catch(function (error) {
          userMediaFailed.call(_this22, error);

          debugerror('emit "getusermediafailed" [error:%o]', error);

          _this22.emit('getusermediafailed', error);
        });
        // Otherwise don't prompt getUserMedia.
      } else {
        userMediaSucceeded.call(this, null);
      }

      // User media succeeded.
      function userMediaSucceeded(stream) {
        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        this._localMediaStream = stream;
        if (stream) {
          this._connection.addStream(stream);
        }

        debug('emit "peerconnection"');

        // Notify the app with the RTCPeerConnection so it can do stuff on it
        // before generating the offer.
        this.emit('peerconnection', {
          peerconnection: this._connection
        });

        this._connecting(this._request);
        this._createLocalDescription('offer', rtcSucceeded.bind(this), rtcFailed.bind(this), rtcOfferConstraints);
      }

      // User media failed.
      function userMediaFailed() {
        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        this._failed('local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
      }

      function rtcSucceeded(desc) {
        if (this._is_canceled || this._status === C.STATUS_TERMINATED) {
          return;
        }

        this._request.body = desc;
        this._status = C.STATUS_INVITE_SENT;

        debug('emit "sending" [request:%o]', this._request);

        // Emit 'sending' so the app can mangle the body before the request is sent.
        this.emit('sending', {
          request: this._request
        });

        request_sender.send();
      }

      function rtcFailed() {
        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        this._failed('system', null, JsSIP_C.causes.WEBRTC_ERROR);
      }
    }

    /**
     * Reception of Response for Initial INVITE
     */

  }, {
    key: '_receiveInviteResponse',
    value: function _receiveInviteResponse(response) {
      var _this23 = this;

      debug('receiveInviteResponse()');

      // Handle 2XX retransmissions and responses from forked requests.
      if (this._dialog && response.status_code >= 200 && response.status_code <= 299) {

        /*
         * If it is a retransmission from the endpoint that established
         * the dialog, send an ACK
         */
        if (this._dialog.id.call_id === response.call_id && this._dialog.id.local_tag === response.from_tag && this._dialog.id.remote_tag === response.to_tag) {
          this.sendRequest(JsSIP_C.ACK);

          return;
        }

        // If not, send an ACK  and terminate.
        else {
            var dialog = new Dialog(this, response, 'UAC');

            if (dialog.error !== undefined) {
              debug(dialog.error);

              return;
            }

            this.sendRequest(JsSIP_C.ACK);
            this.sendRequest(JsSIP_C.BYE);

            return;
          }
      }

      // Proceed to cancellation if the user requested.
      if (this._is_canceled) {
        if (response.status_code >= 100 && response.status_code < 200) {
          this._request.cancel(this._cancel_reason);
        } else if (response.status_code >= 200 && response.status_code < 299) {
          this._acceptAndTerminate(response);
        }

        return;
      }

      if (this._status !== C.STATUS_INVITE_SENT && this._status !== C.STATUS_1XX_RECEIVED) {
        return;
      }

      switch (true) {
        case /^100$/.test(response.status_code):
          this._status = C.STATUS_1XX_RECEIVED;
          break;

        case /^1[0-9]{2}$/.test(response.status_code):
          {
            // Do nothing with 1xx responses without To tag.
            if (!response.to_tag) {
              debug('1xx response received without to tag');
              break;
            }

            // Create Early Dialog if 1XX comes with contact.
            if (response.hasHeader('contact')) {
              // An error on dialog creation will fire 'failed' event.
              if (!this._createDialog(response, 'UAC', true)) {
                break;
              }
            }

            this._status = C.STATUS_1XX_RECEIVED;
            this._progress('remote', response);

            if (!response.body) {
              break;
            }

            var e = { originator: 'remote', type: 'answer', sdp: response.body };

            debug('emit "sdp"');

            this.emit('sdp', e);

            var answer = new RTCSessionDescription({ type: 'answer', sdp: e.sdp });

            this._connection.setRemoteDescription(answer).catch(function (error) {
              debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

              _this23.emit('peerconnection:setremotedescriptionfailed', error);
            });
            break;
          }

        case /^2[0-9]{2}$/.test(response.status_code):
          {
            this._status = C.STATUS_CONFIRMED;

            if (!response.body) {
              this._acceptAndTerminate(response, 400, JsSIP_C.causes.MISSING_SDP);
              this._failed('remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);
              break;
            }

            // An error on dialog creation will fire 'failed' event.
            if (!this._createDialog(response, 'UAC')) {
              break;
            }

            var _e = { originator: 'remote', type: 'answer', sdp: response.body };

            debug('emit "sdp"');
            this.emit('sdp', _e);

            var _answer = new RTCSessionDescription({ type: 'answer', sdp: _e.sdp });

            Promise.resolve().then(function () {
              // Be ready for 200 with SDP after a 180/183 with SDP. We created a SDP 'answer'
              // for it, so check the current signaling state.
              if (_this23._connection.signalingState === 'stable') {
                return _this23._connection.createOffer().then(function (offer) {
                  return _this23._connection.setLocalDescription(offer);
                }).catch(function (error) {
                  _this23._acceptAndTerminate(response, 500, error.toString());
                  _this23._failed('local', response, JsSIP_C.causes.WEBRTC_ERROR);

                  debugerror('emit "peerconnection:setlocaldescriptionfailed" [error:%o]', error);

                  _this23.emit('peerconnection:setlocaldescriptionfailed', error);
                });
              }
            }).then(function () {
              _this23._connection.setRemoteDescription(_answer).then(function () {
                // Handle Session Timers.
                _this23._handleSessionTimersInIncomingResponse(response);

                _this23._accepted('remote', response);
                _this23.sendRequest(JsSIP_C.ACK);
                _this23._confirmed('local', null);
              }).catch(function (error) {
                _this23._acceptAndTerminate(response, 488, 'Not Acceptable Here');
                _this23._failed('remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);

                debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

                _this23.emit('peerconnection:setremotedescriptionfailed', error);
              });
            });
            break;
          }

        default:
          {
            var cause = Utils.sipErrorCause(response.status_code);

            this._failed('remote', response, cause);
          }
      }
    }

    /**
     * Send Re-INVITE
     */

  }, {
    key: '_sendReinvite',
    value: function _sendReinvite() {
      var _this24 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      debug('sendReinvite()');

      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var eventHandlers = options.eventHandlers || {};
      var rtcOfferConstraints = options.rtcOfferConstraints || this._rtcOfferConstraints || null;

      var succeeded = false;

      extraHeaders.push('Contact: ' + this._contact);
      extraHeaders.push('Content-Type: application/sdp');

      // Session Timers.
      if (this._sessionTimers.running) {
        extraHeaders.push('Session-Expires: ' + this._sessionTimers.currentExpires + ';refresher=' + (this._sessionTimers.refresher ? 'uac' : 'uas'));
      }

      this._createLocalDescription('offer', function (sdp) {
        sdp = _this24._mangleOffer(sdp);

        _this24.sendRequest(JsSIP_C.INVITE, {
          extraHeaders: extraHeaders,
          body: sdp,
          eventHandlers: {
            onSuccessResponse: function onSuccessResponse(response) {
              onSucceeded.call(_this24, response);
              succeeded = true;
            },
            onErrorResponse: function onErrorResponse(response) {
              onFailed.call(_this24, response);
            },
            onTransportError: function onTransportError() {
              _this24.onTransportError(); // Do nothing because session ends.
            },
            onRequestTimeout: function onRequestTimeout() {
              _this24.onRequestTimeout(); // Do nothing because session ends.
            },
            onDialogError: function onDialogError() {
              _this24.onDialogError(); // Do nothing because session ends.
            }
          }
        });
      }, function () {
        onFailed();
      },
      // RTC constraints.
      rtcOfferConstraints);

      function onSucceeded(response) {
        var _this25 = this;

        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        this.sendRequest(JsSIP_C.ACK);

        // If it is a 2XX retransmission exit now.
        if (succeeded) {
          return;
        }

        // Handle Session Timers.
        this._handleSessionTimersInIncomingResponse(response);

        // Must have SDP answer.
        if (!response.body) {
          onFailed.call(this);

          return;
        } else if (response.getHeader('Content-Type') !== 'application/sdp') {
          onFailed.call(this);

          return;
        }

        var e = { originator: 'remote', type: 'answer', sdp: response.body };

        debug('emit "sdp"');
        this.emit('sdp', e);

        var answer = new RTCSessionDescription({ type: 'answer', sdp: e.sdp });

        this._connection.setRemoteDescription(answer).then(function () {
          if (eventHandlers.succeeded) {
            eventHandlers.succeeded(response);
          }
        }).catch(function (error) {
          onFailed.call(_this25);

          debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

          _this25.emit('peerconnection:setremotedescriptionfailed', error);
        });
      }

      function onFailed(response) {
        if (eventHandlers.failed) {
          eventHandlers.failed(response);
        }
      }
    }

    /**
     * Send UPDATE
     */

  }, {
    key: '_sendUpdate',
    value: function _sendUpdate() {
      var _this26 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      debug('sendUpdate()');

      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var eventHandlers = options.eventHandlers || {};
      var rtcOfferConstraints = options.rtcOfferConstraints || this._rtcOfferConstraints || null;
      var sdpOffer = options.sdpOffer || false;

      var succeeded = false;

      extraHeaders.push('Contact: ' + this._contact);

      // Session Timers.
      if (this._sessionTimers.running) {
        extraHeaders.push('Session-Expires: ' + this._sessionTimers.currentExpires + ';refresher=' + (this._sessionTimers.refresher ? 'uac' : 'uas'));
      }

      if (sdpOffer) {
        extraHeaders.push('Content-Type: application/sdp');

        this._createLocalDescription('offer', function (sdp) {
          sdp = _this26._mangleOffer(sdp);

          _this26.sendRequest(JsSIP_C.UPDATE, {
            extraHeaders: extraHeaders,
            body: sdp,
            eventHandlers: {
              onSuccessResponse: function onSuccessResponse(response) {
                onSucceeded.call(_this26, response);
                succeeded = true;
              },
              onErrorResponse: function onErrorResponse(response) {
                onFailed.call(_this26, response);
              },
              onTransportError: function onTransportError() {
                _this26.onTransportError(); // Do nothing because session ends.
              },
              onRequestTimeout: function onRequestTimeout() {
                _this26.onRequestTimeout(); // Do nothing because session ends.
              },
              onDialogError: function onDialogError() {
                _this26.onDialogError(); // Do nothing because session ends.
              }
            }
          });
        }, function () {
          onFailed.call(_this26);
        },
        // RTC constraints.
        rtcOfferConstraints);
      }

      // No SDP.
      else {
          this.sendRequest(JsSIP_C.UPDATE, {
            extraHeaders: extraHeaders,
            eventHandlers: {
              onSuccessResponse: function onSuccessResponse(response) {
                onSucceeded.call(_this26, response);
              },
              onErrorResponse: function onErrorResponse(response) {
                onFailed.call(_this26, response);
              },
              onTransportError: function onTransportError() {
                _this26.onTransportError(); // Do nothing because session ends.
              },
              onRequestTimeout: function onRequestTimeout() {
                _this26.onRequestTimeout(); // Do nothing because session ends.
              },
              onDialogError: function onDialogError() {
                _this26.onDialogError(); // Do nothing because session ends.
              }
            }
          });
        }

      function onSucceeded(response) {
        var _this27 = this;

        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        // If it is a 2XX retransmission exit now.
        if (succeeded) {
          return;
        }

        // Handle Session Timers.
        this._handleSessionTimersInIncomingResponse(response);

        // Must have SDP answer.
        if (sdpOffer) {
          if (!response.body) {
            onFailed.call(this);

            return;
          } else if (response.getHeader('Content-Type') !== 'application/sdp') {
            onFailed.call(this);

            return;
          }

          var e = { originator: 'remote', type: 'answer', sdp: response.body };

          debug('emit "sdp"');
          this.emit('sdp', e);

          var answer = new RTCSessionDescription({ type: 'answer', sdp: e.sdp });

          this._connection.setRemoteDescription(answer).then(function () {
            if (eventHandlers.succeeded) {
              eventHandlers.succeeded(response);
            }
          }).catch(function (error) {
            onFailed.call(_this27);

            debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

            _this27.emit('peerconnection:setremotedescriptionfailed', error);
          });
        }
        // No SDP answer.
        else if (eventHandlers.succeeded) {
            eventHandlers.succeeded(response);
          }
      }

      function onFailed(response) {
        if (eventHandlers.failed) {
          eventHandlers.failed(response);
        }
      }
    }
  }, {
    key: '_acceptAndTerminate',
    value: function _acceptAndTerminate(response, status_code, reason_phrase) {
      debug('acceptAndTerminate()');

      var extraHeaders = [];

      if (status_code) {
        reason_phrase = reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
        extraHeaders.push('Reason: SIP ;cause=' + status_code + '; text="' + reason_phrase + '"');
      }

      // An error on dialog creation will fire 'failed' event.
      if (this._dialog || this._createDialog(response, 'UAC')) {
        this.sendRequest(JsSIP_C.ACK);
        this.sendRequest(JsSIP_C.BYE, {
          extraHeaders: extraHeaders
        });
      }

      // Update session status.
      this._status = C.STATUS_TERMINATED;
    }

    /**
     * Correctly set the SDP direction attributes if the call is on local hold
     */

  }, {
    key: '_mangleOffer',
    value: function _mangleOffer(sdp) {

      if (!this._localHold && !this._remoteHold) {
        return sdp;
      }

      sdp = sdp_transform.parse(sdp);

      // Local hold.
      if (this._localHold && !this._remoteHold) {
        debug('mangleOffer() | me on hold, mangling offer');
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {
          for (var _iterator6 = sdp.media[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var m = _step6.value;

            if (holdMediaTypes.indexOf(m.type) === -1) {
              continue;
            }
            if (!m.direction) {
              m.direction = 'sendonly';
            } else if (m.direction === 'sendrecv') {
              m.direction = 'sendonly';
            } else if (m.direction === 'recvonly') {
              m.direction = 'inactive';
            }
          }
        } catch (err) {
          _didIteratorError6 = true;
          _iteratorError6 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
              _iterator6.return();
            }
          } finally {
            if (_didIteratorError6) {
              throw _iteratorError6;
            }
          }
        }
      }
      // Local and remote hold.
      else if (this._localHold && this._remoteHold) {
          debug('mangleOffer() | both on hold, mangling offer');
          var _iteratorNormalCompletion7 = true;
          var _didIteratorError7 = false;
          var _iteratorError7 = undefined;

          try {
            for (var _iterator7 = sdp.media[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
              var _m = _step7.value;

              if (holdMediaTypes.indexOf(_m.type) === -1) {
                continue;
              }
              _m.direction = 'inactive';
            }
          } catch (err) {
            _didIteratorError7 = true;
            _iteratorError7 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion7 && _iterator7.return) {
                _iterator7.return();
              }
            } finally {
              if (_didIteratorError7) {
                throw _iteratorError7;
              }
            }
          }
        }
        // Remote hold.
        else if (this._remoteHold) {
            debug('mangleOffer() | remote on hold, mangling offer');
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
              for (var _iterator8 = sdp.media[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                var _m2 = _step8.value;

                if (holdMediaTypes.indexOf(_m2.type) === -1) {
                  continue;
                }
                if (!_m2.direction) {
                  _m2.direction = 'recvonly';
                } else if (_m2.direction === 'sendrecv') {
                  _m2.direction = 'recvonly';
                } else if (_m2.direction === 'recvonly') {
                  _m2.direction = 'inactive';
                }
              }
            } catch (err) {
              _didIteratorError8 = true;
              _iteratorError8 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion8 && _iterator8.return) {
                  _iterator8.return();
                }
              } finally {
                if (_didIteratorError8) {
                  throw _iteratorError8;
                }
              }
            }
          }

      return sdp_transform.write(sdp);
    }
  }, {
    key: '_setLocalMediaStatus',
    value: function _setLocalMediaStatus() {
      var enableAudio = true,
          enableVideo = true;

      if (this._localHold || this._remoteHold) {
        enableAudio = false;
        enableVideo = false;
      }

      if (this._audioMuted) {
        enableAudio = false;
      }

      if (this._videoMuted) {
        enableVideo = false;
      }

      this._toogleMuteAudio(!enableAudio);
      this._toogleMuteVideo(!enableVideo);
    }

    /**
     * Handle SessionTimers for an incoming INVITE or UPDATE.
     * @param  {IncomingRequest} request
     * @param  {Array} responseExtraHeaders  Extra headers for the 200 response.
     */

  }, {
    key: '_handleSessionTimersInIncomingRequest',
    value: function _handleSessionTimersInIncomingRequest(request, responseExtraHeaders) {
      if (!this._sessionTimers.enabled) {
        return;
      }

      var session_expires_refresher = void 0;

      if (request.session_expires && request.session_expires >= JsSIP_C.MIN_SESSION_EXPIRES) {
        this._sessionTimers.currentExpires = request.session_expires;
        session_expires_refresher = request.session_expires_refresher || 'uas';
      } else {
        this._sessionTimers.currentExpires = this._sessionTimers.defaultExpires;
        session_expires_refresher = 'uas';
      }

      responseExtraHeaders.push('Session-Expires: ' + this._sessionTimers.currentExpires + ';refresher=' + session_expires_refresher);

      this._sessionTimers.refresher = session_expires_refresher === 'uas';
      this._runSessionTimer();
    }

    /**
     * Handle SessionTimers for an incoming response to INVITE or UPDATE.
     * @param  {IncomingResponse} response
     */

  }, {
    key: '_handleSessionTimersInIncomingResponse',
    value: function _handleSessionTimersInIncomingResponse(response) {
      if (!this._sessionTimers.enabled) {
        return;
      }

      var session_expires_refresher = void 0;

      if (response.session_expires && response.session_expires >= JsSIP_C.MIN_SESSION_EXPIRES) {
        this._sessionTimers.currentExpires = response.session_expires;
        session_expires_refresher = response.session_expires_refresher || 'uac';
      } else {
        this._sessionTimers.currentExpires = this._sessionTimers.defaultExpires;
        session_expires_refresher = 'uac';
      }

      this._sessionTimers.refresher = session_expires_refresher === 'uac';
      this._runSessionTimer();
    }
  }, {
    key: '_runSessionTimer',
    value: function _runSessionTimer() {
      var _this28 = this;

      var expires = this._sessionTimers.currentExpires;

      this._sessionTimers.running = true;

      clearTimeout(this._sessionTimers.timer);

      // I'm the refresher.
      if (this._sessionTimers.refresher) {
        this._sessionTimers.timer = setTimeout(function () {
          if (_this28._status === C.STATUS_TERMINATED) {
            return;
          }

          debug('runSessionTimer() | sending session refresh request');

          _this28._sendUpdate({
            eventHandlers: {
              succeeded: function succeeded(response) {
                _this28._handleSessionTimersInIncomingResponse(response);
              }
            }
          });
        }, expires * 500); // Half the given interval (as the RFC states).
      }

      // I'm not the refresher.
      else {
          this._sessionTimers.timer = setTimeout(function () {
            if (_this28._status === C.STATUS_TERMINATED) {
              return;
            }

            debugerror('runSessionTimer() | timer expired, terminating the session');

            _this28.terminate({
              cause: JsSIP_C.causes.REQUEST_TIMEOUT,
              status_code: 408,
              reason_phrase: 'Session Timer Expired'
            });
          }, expires * 1100);
        }
    }
  }, {
    key: '_toogleMuteAudio',
    value: function _toogleMuteAudio(mute) {
      var streams = this._connection.getLocalStreams();

      var _iteratorNormalCompletion9 = true;
      var _didIteratorError9 = false;
      var _iteratorError9 = undefined;

      try {
        for (var _iterator9 = streams[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
          var stream = _step9.value;

          var tracks = stream.getAudioTracks();

          var _iteratorNormalCompletion10 = true;
          var _didIteratorError10 = false;
          var _iteratorError10 = undefined;

          try {
            for (var _iterator10 = tracks[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
              var track = _step10.value;

              track.enabled = !mute;
            }
          } catch (err) {
            _didIteratorError10 = true;
            _iteratorError10 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion10 && _iterator10.return) {
                _iterator10.return();
              }
            } finally {
              if (_didIteratorError10) {
                throw _iteratorError10;
              }
            }
          }
        }
      } catch (err) {
        _didIteratorError9 = true;
        _iteratorError9 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion9 && _iterator9.return) {
            _iterator9.return();
          }
        } finally {
          if (_didIteratorError9) {
            throw _iteratorError9;
          }
        }
      }
    }
  }, {
    key: '_toogleMuteVideo',
    value: function _toogleMuteVideo(mute) {
      var streams = this._connection.getLocalStreams();

      var _iteratorNormalCompletion11 = true;
      var _didIteratorError11 = false;
      var _iteratorError11 = undefined;

      try {
        for (var _iterator11 = streams[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
          var stream = _step11.value;

          var tracks = stream.getVideoTracks();

          var _iteratorNormalCompletion12 = true;
          var _didIteratorError12 = false;
          var _iteratorError12 = undefined;

          try {
            for (var _iterator12 = tracks[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
              var track = _step12.value;

              track.enabled = !mute;
            }
          } catch (err) {
            _didIteratorError12 = true;
            _iteratorError12 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion12 && _iterator12.return) {
                _iterator12.return();
              }
            } finally {
              if (_didIteratorError12) {
                throw _iteratorError12;
              }
            }
          }
        }
      } catch (err) {
        _didIteratorError11 = true;
        _iteratorError11 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion11 && _iterator11.return) {
            _iterator11.return();
          }
        } finally {
          if (_didIteratorError11) {
            throw _iteratorError11;
          }
        }
      }
    }
  }, {
    key: '_newRTCSession',
    value: function _newRTCSession(originator, request) {
      debug('newRTCSession()');

      this._ua.newRTCSession(this, {
        originator: originator,
        session: this,
        request: request
      });
    }
  }, {
    key: '_connecting',
    value: function _connecting(request) {
      debug('session connecting');

      debug('emit "connecting"');

      this.emit('connecting', {
        request: request
      });
    }
  }, {
    key: '_progress',
    value: function _progress(originator, response) {
      debug('session progress');

      debug('emit "progress"');

      this.emit('progress', {
        originator: originator,
        response: response || null
      });
    }
  }, {
    key: '_accepted',
    value: function _accepted(originator, message) {
      debug('session accepted');

      this._start_time = new Date();

      debug('emit "accepted"');

      this.emit('accepted', {
        originator: originator,
        response: message || null
      });
    }
  }, {
    key: '_confirmed',
    value: function _confirmed(originator, ack) {
      debug('session confirmed');

      this._is_confirmed = true;

      debug('emit "confirmed"');

      this.emit('confirmed', {
        originator: originator,
        ack: ack || null
      });
    }
  }, {
    key: '_ended',
    value: function _ended(originator, message, cause) {
      debug('session ended');

      this._end_time = new Date();

      this._close();

      debug('emit "ended"');

      this.emit('ended', {
        originator: originator,
        message: message || null,
        cause: cause
      });
    }
  }, {
    key: '_failed',
    value: function _failed(originator, message, cause) {
      debug('session failed');

      this._close();

      debug('emit "failed"');

      this.emit('failed', {
        originator: originator,
        message: message || null,
        cause: cause
      });
    }
  }, {
    key: '_onhold',
    value: function _onhold(originator) {
      debug('session onhold');

      this._setLocalMediaStatus();

      debug('emit "hold"');

      this.emit('hold', {
        originator: originator
      });
    }
  }, {
    key: '_onunhold',
    value: function _onunhold(originator) {
      debug('session onunhold');

      this._setLocalMediaStatus();

      debug('emit "unhold"');

      this.emit('unhold', {
        originator: originator
      });
    }
  }, {
    key: '_onmute',
    value: function _onmute(_ref5) {
      var audio = _ref5.audio,
          video = _ref5.video;

      debug('session onmute');

      this._setLocalMediaStatus();

      debug('emit "muted"');

      this.emit('muted', {
        audio: audio,
        video: video
      });
    }
  }, {
    key: '_onunmute',
    value: function _onunmute(_ref6) {
      var audio = _ref6.audio,
          video = _ref6.video;

      debug('session onunmute');

      this._setLocalMediaStatus();

      debug('emit "unmuted"');

      this.emit('unmuted', {
        audio: audio,
        video: video
      });
    }
  }, {
    key: 'C',
    get: function get() {
      return C;
    }

    // Expose session failed/ended causes as a property of the RTCSession instance.

  }, {
    key: 'causes',
    get: function get() {
      return JsSIP_C.causes;
    }
  }, {
    key: 'id',
    get: function get() {
      return this._id;
    }
  }, {
    key: 'connection',
    get: function get() {
      return this._connection;
    }
  }, {
    key: 'direcion',
    get: function get() {
      return this._direcion;
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
  }, {
    key: 'start_time',
    get: function get() {
      return this._start_time;
    }
  }, {
    key: 'end_time',
    get: function get() {
      return this._end_time;
    }
  }, {
    key: 'data',
    get: function get() {
      return this._data;
    },
    set: function set(_data) {
      this._data = _data;
    }
  }, {
    key: 'status',
    get: function get() {
      return this._status;
    }
  }]);

  return RTCSession;
}(EventEmitter);

},{"./Constants":2,"./Dialog":3,"./Exceptions":6,"./RTCSession/DTMF":13,"./RTCSession/Info":14,"./RTCSession/ReferNotifier":15,"./RTCSession/ReferSubscriber":16,"./RequestSender":18,"./SIPMessage":19,"./Timers":21,"./Transactions":22,"./Utils":26,"debug":29,"events":31,"sdp-transform":36}],13:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var JsSIP_C = require('../Constants');
var Exceptions = require('../Exceptions');
var Utils = require('../Utils');
var debug = require('debug')('JsSIP:RTCSession:DTMF');
var debugerror = require('debug')('JsSIP:ERROR:RTCSession:DTMF');

debugerror.log = console.warn.bind(console);

var C = {
  MIN_DURATION: 70,
  MAX_DURATION: 6000,
  DEFAULT_DURATION: 100,
  MIN_INTER_TONE_GAP: 50,
  DEFAULT_INTER_TONE_GAP: 500
};

module.exports = function (_EventEmitter) {
  _inherits(DTMF, _EventEmitter);

  function DTMF(session) {
    _classCallCheck(this, DTMF);

    var _this = _possibleConstructorReturn(this, (DTMF.__proto__ || Object.getPrototypeOf(DTMF)).call(this));

    _this._session = session;
    _this._direction = null;
    _this._tone = null;
    _this._duration = null;
    _this._request = null;
    return _this;
  }

  _createClass(DTMF, [{
    key: 'send',
    value: function send(tone) {
      var _this2 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (tone === undefined) {
        throw new TypeError('Not enough arguments');
      }

      this._direction = 'outgoing';

      // Check RTCSession Status.
      if (this._session.status !== this._session.C.STATUS_CONFIRMED && this._session.status !== this._session.C.STATUS_WAITING_FOR_ACK) {
        throw new Exceptions.InvalidStateError(this._session.status);
      }

      var extraHeaders = Utils.cloneArray(options.extraHeaders);

      this.eventHandlers = options.eventHandlers || {};

      // Check tone type.
      if (typeof tone === 'string') {
        tone = tone.toUpperCase();
      } else if (typeof tone === 'number') {
        tone = tone.toString();
      } else {
        throw new TypeError('Invalid tone: ' + tone);
      }

      // Check tone value.
      if (!tone.match(/^[0-9A-DR#*]$/)) {
        throw new TypeError('Invalid tone: ' + tone);
      } else {
        this._tone = tone;
      }

      // Duration is checked/corrected in RTCSession.
      this._duration = options.duration;

      extraHeaders.push('Content-Type: application/dtmf-relay');

      var body = 'Signal=' + this._tone + '\r\n';

      body += 'Duration=' + this._duration;

      this._session.newDTMF({
        originator: 'local',
        dtmf: this,
        request: this._request
      });

      this._session.sendRequest(JsSIP_C.INFO, {
        extraHeaders: extraHeaders,
        eventHandlers: {
          onSuccessResponse: function onSuccessResponse(response) {
            _this2.emit('succeeded', {
              originator: 'remote',
              response: response
            });
          },
          onErrorResponse: function onErrorResponse(response) {
            if (_this2.eventHandlers.onFailed) {
              _this2.eventHandlers.onFailed();
            }

            _this2.emit('failed', {
              originator: 'remote',
              response: response
            });
          },
          onRequestTimeout: function onRequestTimeout() {
            _this2._session.onRequestTimeout();
          },
          onTransportError: function onTransportError() {
            _this2._session.onTransportError();
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
      var reg_tone = /^(Signal\s*?=\s*?)([0-9A-D#*]{1})(\s)?.*/;
      var reg_duration = /^(Duration\s?=\s?)([0-9]{1,4})(\s)?.*/;

      this._direction = 'incoming';
      this._request = request;

      request.reply(200);

      if (request.body) {
        var body = request.body.split('\n');

        if (body.length >= 1) {
          if (reg_tone.test(body[0])) {
            this._tone = body[0].replace(reg_tone, '$2');
          }
        }
        if (body.length >= 2) {
          if (reg_duration.test(body[1])) {
            this._duration = parseInt(body[1].replace(reg_duration, '$2'), 10);
          }
        }
      }

      if (!this._duration) {
        this._duration = C.DEFAULT_DURATION;
      }

      if (!this._tone) {
        debug('invalid INFO DTMF received, discarded');
      } else {
        this._session.newDTMF({
          originator: 'remote',
          dtmf: this,
          request: request
        });
      }
    }
  }, {
    key: 'tone',
    get: function get() {
      return this._tone;
    }
  }, {
    key: 'duration',
    get: function get() {
      return this._duration;
    }
  }]);

  return DTMF;
}(EventEmitter);

/**
 * Expose C object.
 */
module.exports.C = C;

},{"../Constants":2,"../Exceptions":6,"../Utils":26,"debug":29,"events":31}],14:[function(require,module,exports){
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

},{"../Constants":2,"../Exceptions":6,"../Utils":26,"debug":29,"events":31}],15:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JsSIP_C = require('../Constants');
var debug = require('debug')('JsSIP:RTCSession:ReferNotifier');

var C = {
  event_type: 'refer',
  body_type: 'message/sipfrag;version=2.0',
  expires: 300
};

module.exports = function () {
  function ReferNotifier(session, id, expires) {
    _classCallCheck(this, ReferNotifier);

    this._session = session;
    this._id = id;
    this._expires = expires || C.expires;
    this._active = true;

    // The creation of a Notifier results in an immediate NOTIFY.
    this.notify(100);
  }

  _createClass(ReferNotifier, [{
    key: 'notify',
    value: function notify(code, reason) {
      debug('notify()');

      if (this._active === false) {
        return;
      }

      reason = reason || JsSIP_C.REASON_PHRASE[code] || '';

      var state = void 0;

      if (code >= 200) {
        state = 'terminated;reason=noresource';
      } else {
        state = 'active;expires=' + this._expires;
      }

      // Put this in a try/catch block.
      this._session.sendRequest(JsSIP_C.NOTIFY, {
        extraHeaders: ['Event: ' + C.event_type + ';id=' + this._id, 'Subscription-State: ' + state, 'Content-Type: ' + C.body_type],
        body: 'SIP/2.0 ' + code + ' ' + reason,
        eventHandlers: {
          // If a negative response is received, subscription is canceled.
          onErrorResponse: function onErrorResponse() {
            this._active = false;
          }
        }
      });
    }
  }]);

  return ReferNotifier;
}();

},{"../Constants":2,"debug":29}],16:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var JsSIP_C = require('../Constants');
var Grammar = require('../Grammar');
var Utils = require('../Utils');
var debug = require('debug')('JsSIP:RTCSession:ReferSubscriber');

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
        replaces = options.replaces.request.call_id;
        replaces += ';to-tag=' + options.replaces.to_tag;
        replaces += ';from-tag=' + options.replaces.from_tag;

        replaces = encodeURIComponent(replaces);
      }

      // Refer-To header field.
      var referTo = 'Refer-To: <' + target + (replaces ? '?Replaces=' + replaces : '') + '>';

      extraHeaders.push(referTo);

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

      var status_line = Grammar.parse(request.body, 'Status_Line');

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

},{"../Constants":2,"../Grammar":7,"../Utils":26,"debug":29,"events":31}],17:[function(require,module,exports){
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
  }]);

  return Registrator;
}();

},{"./Constants":2,"./RequestSender":18,"./SIPMessage":19,"./Utils":26,"debug":29}],18:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JsSIP_C = require('./Constants');
var DigestAuthentication = require('./DigestAuthentication');
var Transactions = require('./Transactions');
var debug = require('debug')('JsSIP:RequestSender');

// Default event handlers.
var EventHandlers = {
  onRequestTimeout: function onRequestTimeout() {},
  onTransportError: function onTransportError() {},
  onReceiveResponse: function onReceiveResponse() {},
  onAuthenticated: function onAuthenticated() {}
};

module.exports = function () {
  function RequestSender(ua, request, eventHandlers) {
    _classCallCheck(this, RequestSender);

    this._ua = ua;
    this._eventHandlers = eventHandlers;
    this._method = request.method;
    this._request = request;
    this._auth = null;
    this._challenged = false;
    this._staled = false;

    // Define the undefined handlers.
    for (var handler in EventHandlers) {
      if (Object.prototype.hasOwnProperty.call(EventHandlers, handler)) {
        if (!this._eventHandlers[handler]) {
          this._eventHandlers[handler] = EventHandlers[handler];
        }
      }
    }

    // If ua is in closing process or even closed just allow sending Bye and ACK.
    if (ua.status === ua.C.STATUS_USER_CLOSED && (this._method !== JsSIP_C.BYE || this._method !== JsSIP_C.ACK)) {
      this._eventHandlers.onTransportError();
    }
  }

  /**
  * Create the client transaction and send the message.
  */


  _createClass(RequestSender, [{
    key: 'send',
    value: function send() {
      var _this = this;

      var eventHandlers = {
        onRequestTimeout: function onRequestTimeout() {
          _this._eventHandlers.onRequestTimeout();
        },
        onTransportError: function onTransportError() {
          _this._eventHandlers.onTransportError();
        },
        onReceiveResponse: function onReceiveResponse(response) {
          _this._receiveResponse(response);
        }
      };

      switch (this._method) {
        case 'INVITE':
          this.clientTransaction = new Transactions.InviteClientTransaction(this._ua, this._ua.transport, this._request, eventHandlers);
          break;
        case 'ACK':
          this.clientTransaction = new Transactions.AckClientTransaction(this._ua, this._ua.transport, this._request, eventHandlers);
          break;
        default:
          this.clientTransaction = new Transactions.NonInviteClientTransaction(this._ua, this._ua.transport, this._request, eventHandlers);
      }

      this.clientTransaction.send();
    }

    /**
    * Called from client transaction when receiving a correct response to the request.
    * Authenticate request if needed or pass the response back to the applicant.
    */

  }, {
    key: '_receiveResponse',
    value: function _receiveResponse(response) {
      var challenge = void 0;
      var authorization_header_name = void 0;
      var status_code = response.status_code;

      /*
      * Authentication
      * Authenticate once. _challenged_ flag used to avoid infinite authentications.
      */
      if ((status_code === 401 || status_code === 407) && (this._ua.configuration.password !== null || this._ua.configuration.ha1 !== null)) {

        // Get and parse the appropriate WWW-Authenticate or Proxy-Authenticate header.
        if (response.status_code === 401) {
          challenge = response.parseHeader('www-authenticate');
          authorization_header_name = 'authorization';
        } else {
          challenge = response.parseHeader('proxy-authenticate');
          authorization_header_name = 'proxy-authorization';
        }

        // Verify it seems a valid challenge.
        if (!challenge) {
          debug(response.status_code + ' with wrong or missing challenge, cannot authenticate');
          this._eventHandlers.onReceiveResponse(response);

          return;
        }

        if (!this._challenged || !this._staled && challenge.stale === true) {
          if (!this._auth) {
            this._auth = new DigestAuthentication({
              username: this._ua.configuration.authorization_user,
              password: this._ua.configuration.password,
              realm: this._ua.configuration.realm,
              ha1: this._ua.configuration.ha1
            });
          }

          // Verify that the challenge is really valid.
          if (!this._auth.authenticate(this._request, challenge)) {
            this._eventHandlers.onReceiveResponse(response);

            return;
          }
          this._challenged = true;

          // Update ha1 and realm in the UA.
          this._ua.set('realm', this._auth.get('realm'));
          this._ua.set('ha1', this._auth.get('ha1'));

          if (challenge.stale) {
            this._staled = true;
          }

          this._request = this._request.clone();
          this._request.cseq += 1;
          this._request.setHeader('cseq', this._request.cseq + ' ' + this._method);
          this._request.setHeader(authorization_header_name, this._auth.toString());

          this._eventHandlers.onAuthenticated(this._request);
          this.send();
        } else {
          this._eventHandlers.onReceiveResponse(response);
        }
      } else {
        this._eventHandlers.onReceiveResponse(response);
      }
    }
  }]);

  return RequestSender;
}();

},{"./Constants":2,"./DigestAuthentication":5,"./Transactions":22,"debug":29}],19:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var sdp_transform = require('sdp-transform');
var JsSIP_C = require('./Constants');
var Utils = require('./Utils');
var NameAddrHeader = require('./NameAddrHeader');
var Grammar = require('./Grammar');
var debug = require('debug')('JsSIP:SIPMessage');

/**
 * -param {String} method request method
 * -param {String} ruri request uri
 * -param {UA} ua
 * -param {Object} params parameters that will have priority over ua.configuration parameters:
 * <br>
 *  - cseq, call_id, from_tag, from_uri, from_display_name, to_uri, to_tag, route_set
 * -param {Object} [headers] extra headers
 * -param {String} [body]
 */

var OutgoingRequest = function () {
  function OutgoingRequest(method, ruri, ua, params, extraHeaders, body) {
    _classCallCheck(this, OutgoingRequest);

    // Mandatory parameters check.
    if (!method || !ruri || !ua) {
      return null;
    }

    params = params || {};

    this.ua = ua;
    this.headers = {};
    this.method = method;
    this.ruri = ruri;
    this.body = body;
    this.extraHeaders = Utils.cloneArray(extraHeaders);

    // Fill the Common SIP Request Headers.

    // Route.
    if (params.route_set) {
      this.setHeader('route', params.route_set);
    } else if (ua.configuration.use_preloaded_route) {
      this.setHeader('route', '<' + ua.transport.sip_uri + ';lr>');
    }

    // Via.
    // Empty Via header. Will be filled by the client transaction.
    this.setHeader('via', '');

    // Max-Forwards.
    this.setHeader('max-forwards', JsSIP_C.MAX_FORWARDS);

    // To
    var to = params.to_display_name || params.to_display_name === 0 ? '"' + params.to_display_name + '" ' : '';

    to += '<' + (params.to_uri || ruri) + '>';
    to += params.to_tag ? ';tag=' + params.to_tag : '';
    this.to = NameAddrHeader.parse(to);
    this.setHeader('to', to);

    // From.
    var from = void 0;

    if (params.from_display_name || params.from_display_name === 0) {
      from = '"' + params.from_display_name + '" ';
    } else if (ua.configuration.display_name) {
      from = '"' + ua.configuration.display_name + '" ';
    } else {
      from = '';
    }
    from += '<' + (params.from_uri || ua.configuration.uri) + '>;tag=';
    from += params.from_tag || Utils.newTag();
    this.from = NameAddrHeader.parse(from);
    this.setHeader('from', from);

    // Call-ID.
    var call_id = params.call_id || ua.configuration.jssip_id + Utils.createRandomToken(15);

    this.call_id = call_id;
    this.setHeader('call-id', call_id);

    // CSeq.
    var cseq = params.cseq || Math.floor(Math.random() * 10000);

    this.cseq = cseq;
    this.setHeader('cseq', cseq + ' ' + method);
  }

  /**
   * Replace the the given header by the given value.
   * -param {String} name header name
   * -param {String | Array} value header value
   */


  _createClass(OutgoingRequest, [{
    key: 'setHeader',
    value: function setHeader(name, value) {
      // Remove the header from extraHeaders if present.
      var regexp = new RegExp('^\\s*' + name + '\\s*:', 'i');

      for (var idx = 0; idx < this.extraHeaders.length; idx++) {
        if (regexp.test(this.extraHeaders[idx])) {
          this.extraHeaders.splice(idx, 1);
        }
      }

      this.headers[Utils.headerize(name)] = Array.isArray(value) ? value : [value];
    }

    /**
     * Get the value of the given header name at the given position.
     * -param {String} name header name
     * -returns {String|undefined} Returns the specified header, null if header doesn't exist.
     */

  }, {
    key: 'getHeader',
    value: function getHeader(name) {
      var headers = this.headers[Utils.headerize(name)];

      if (headers) {
        if (headers[0]) {
          return headers[0];
        }
      } else {
        var regexp = new RegExp('^\\s*' + name + '\\s*:', 'i');

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.extraHeaders[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var header = _step.value;

            if (regexp.test(header)) {
              return header.substring(header.indexOf(':') + 1).trim();
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }

      return;
    }

    /**
     * Get the header/s of the given name.
     * -param {String} name header name
     * -returns {Array} Array with all the headers of the specified name.
     */

  }, {
    key: 'getHeaders',
    value: function getHeaders(name) {
      var headers = this.headers[Utils.headerize(name)];
      var result = [];

      if (headers) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = headers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var header = _step2.value;

            result.push(header);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        return result;
      } else {
        var regexp = new RegExp('^\\s*' + name + '\\s*:', 'i');

        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = this.extraHeaders[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var _header = _step3.value;

            if (regexp.test(_header)) {
              result.push(_header.substring(_header.indexOf(':') + 1).trim());
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        return result;
      }
    }

    /**
     * Verify the existence of the given header.
     * -param {String} name header name
     * -returns {boolean} true if header with given name exists, false otherwise
     */

  }, {
    key: 'hasHeader',
    value: function hasHeader(name) {
      if (this.headers[Utils.headerize(name)]) {
        return true;
      } else {
        var regexp = new RegExp('^\\s*' + name + '\\s*:', 'i');

        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = this.extraHeaders[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var header = _step4.value;

            if (regexp.test(header)) {
              return true;
            }
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }
      }

      return false;
    }

    /**
     * Parse the current body as a SDP and store the resulting object
     * into this.sdp.
     * -param {Boolean} force: Parse even if this.sdp already exists.
     *
     * Returns this.sdp.
     */

  }, {
    key: 'parseSDP',
    value: function parseSDP(force) {
      if (!force && this.sdp) {
        return this.sdp;
      } else {
        this.sdp = sdp_transform.parse(this.body || '');

        return this.sdp;
      }
    }
  }, {
    key: 'toString',
    value: function toString() {
      var msg = this.method + ' ' + this.ruri + ' SIP/2.0\r\n';

      for (var headerName in this.headers) {
        if (Object.prototype.hasOwnProperty.call(this.headers, headerName)) {
          var _iteratorNormalCompletion5 = true;
          var _didIteratorError5 = false;
          var _iteratorError5 = undefined;

          try {
            for (var _iterator5 = this.headers[headerName][Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
              var headerValue = _step5.value;

              msg += headerName + ': ' + headerValue + '\r\n';
            }
          } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
              }
            } finally {
              if (_didIteratorError5) {
                throw _iteratorError5;
              }
            }
          }
        }
      }

      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = this.extraHeaders[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var header = _step6.value;

          msg += header.trim() + '\r\n';
        }

        // Supported.
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6.return) {
            _iterator6.return();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }

      var supported = [];

      switch (this.method) {
        case JsSIP_C.REGISTER:
          supported.push('path', 'gruu');
          break;
        case JsSIP_C.INVITE:
          if (this.ua.configuration.session_timers) {
            supported.push('timer');
          }
          if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) {
            supported.push('gruu');
          }
          supported.push('ice', 'replaces');
          break;
        case JsSIP_C.UPDATE:
          if (this.ua.configuration.session_timers) {
            supported.push('timer');
          }
          supported.push('ice');
          break;
      }

      supported.push('outbound');

      // Allow.
      msg += 'Allow: ' + JsSIP_C.ALLOWED_METHODS + '\r\n';
      msg += 'Supported: ' + supported + '\r\n';
      msg += 'User-Agent: ' + JsSIP_C.USER_AGENT + '\r\n';

      if (this.body) {
        var length = Utils.str_utf8_length(this.body);

        msg += 'Content-Length: ' + length + '\r\n\r\n';
        msg += this.body;
      } else {
        msg += 'Content-Length: 0\r\n\r\n';
      }

      return msg;
    }
  }, {
    key: 'clone',
    value: function clone() {
      var request = new OutgoingRequest(this.method, this.ruri, this.ua);

      Object.keys(this.headers).forEach(function (name) {
        request.headers[name] = this.headers[name].slice();
      }, this);

      request.body = this.body;
      request.extraHeaders = Utils.cloneArray(this.extraHeaders);
      request.to = this.to;
      request.from = this.from;
      request.call_id = this.call_id;
      request.cseq = this.cseq;

      return request;
    }
  }]);

  return OutgoingRequest;
}();

var InitialOutgoingInviteRequest = function (_OutgoingRequest) {
  _inherits(InitialOutgoingInviteRequest, _OutgoingRequest);

  function InitialOutgoingInviteRequest(ruri, ua, params, extraHeaders, body) {
    _classCallCheck(this, InitialOutgoingInviteRequest);

    var _this = _possibleConstructorReturn(this, (InitialOutgoingInviteRequest.__proto__ || Object.getPrototypeOf(InitialOutgoingInviteRequest)).call(this, JsSIP_C.INVITE, ruri, ua, params, extraHeaders, body));

    _this.transaction = null;
    return _this;
  }

  _createClass(InitialOutgoingInviteRequest, [{
    key: 'cancel',
    value: function cancel(reason) {
      this.transaction.cancel(reason);
    }
  }]);

  return InitialOutgoingInviteRequest;
}(OutgoingRequest);

var IncomingMessage = function () {
  function IncomingMessage() {
    _classCallCheck(this, IncomingMessage);

    this.data = null;
    this.headers = null;
    this.method = null;
    this.via = null;
    this.via_branch = null;
    this.call_id = null;
    this.cseq = null;
    this.from = null;
    this.from_tag = null;
    this.to = null;
    this.to_tag = null;
    this.body = null;
    this.sdp = null;
  }

  /**
  * Insert a header of the given name and value into the last position of the
  * header array.
  */


  _createClass(IncomingMessage, [{
    key: 'addHeader',
    value: function addHeader(name, value) {
      var header = { raw: value };

      name = Utils.headerize(name);

      if (this.headers[name]) {
        this.headers[name].push(header);
      } else {
        this.headers[name] = [header];
      }
    }

    /**
     * Get the value of the given header name at the given position.
     */

  }, {
    key: 'getHeader',
    value: function getHeader(name) {
      var header = this.headers[Utils.headerize(name)];

      if (header) {
        if (header[0]) {
          return header[0].raw;
        }
      } else {
        return;
      }
    }

    /**
     * Get the header/s of the given name.
     */

  }, {
    key: 'getHeaders',
    value: function getHeaders(name) {
      var headers = this.headers[Utils.headerize(name)];
      var result = [];

      if (!headers) {
        return [];
      }

      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = headers[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          var header = _step7.value;

          result.push(header.raw);
        }
      } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion7 && _iterator7.return) {
            _iterator7.return();
          }
        } finally {
          if (_didIteratorError7) {
            throw _iteratorError7;
          }
        }
      }

      return result;
    }

    /**
     * Verify the existence of the given header.
     */

  }, {
    key: 'hasHeader',
    value: function hasHeader(name) {
      return this.headers[Utils.headerize(name)] ? true : false;
    }

    /**
    * Parse the given header on the given index.
    * -param {String} name header name
    * -param {Number} [idx=0] header index
    * -returns {Object|undefined} Parsed header object, undefined if the header
    *  is not present or in case of a parsing error.
    */

  }, {
    key: 'parseHeader',
    value: function parseHeader(name) {
      var idx = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      name = Utils.headerize(name);

      if (!this.headers[name]) {
        debug('header "' + name + '" not present');

        return;
      } else if (idx >= this.headers[name].length) {
        debug('not so many "' + name + '" headers present');

        return;
      }

      var header = this.headers[name][idx];
      var value = header.raw;

      if (header.parsed) {
        return header.parsed;
      }

      // Substitute '-' by '_' for grammar rule matching.
      var parsed = Grammar.parse(value, name.replace(/-/g, '_'));

      if (parsed === -1) {
        this.headers[name].splice(idx, 1); // delete from headers
        debug('error parsing "' + name + '" header field with value "' + value + '"');

        return;
      } else {
        header.parsed = parsed;

        return parsed;
      }
    }

    /**
     * Message Header attribute selector. Alias of parseHeader.
     * -param {String} name header name
     * -param {Number} [idx=0] header index
     * -returns {Object|undefined} Parsed header object, undefined if the header
     *  is not present or in case of a parsing error.
     *
     * -example
     * message.s('via',3).port
     */

  }, {
    key: 's',
    value: function s(name, idx) {
      return this.parseHeader(name, idx);
    }

    /**
    * Replace the value of the given header by the value.
    * -param {String} name header name
    * -param {String} value header value
    */

  }, {
    key: 'setHeader',
    value: function setHeader(name, value) {
      var header = { raw: value };

      this.headers[Utils.headerize(name)] = [header];
    }

    /**
     * Parse the current body as a SDP and store the resulting object
     * into this.sdp.
     * -param {Boolean} force: Parse even if this.sdp already exists.
     *
     * Returns this.sdp.
     */

  }, {
    key: 'parseSDP',
    value: function parseSDP(force) {
      if (!force && this.sdp) {
        return this.sdp;
      } else {
        this.sdp = sdp_transform.parse(this.body || '');

        return this.sdp;
      }
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this.data;
    }
  }]);

  return IncomingMessage;
}();

var IncomingRequest = function (_IncomingMessage) {
  _inherits(IncomingRequest, _IncomingMessage);

  function IncomingRequest(ua) {
    _classCallCheck(this, IncomingRequest);

    var _this2 = _possibleConstructorReturn(this, (IncomingRequest.__proto__ || Object.getPrototypeOf(IncomingRequest)).call(this));

    _this2.ua = ua;
    _this2.headers = {};
    _this2.ruri = null;
    _this2.transport = null;
    _this2.server_transaction = null;
    return _this2;
  }

  /**
  * Stateful reply.
  * -param {Number} code status code
  * -param {String} reason reason phrase
  * -param {Object} headers extra headers
  * -param {String} body body
  * -param {Function} [onSuccess] onSuccess callback
  * -param {Function} [onFailure] onFailure callback
  */


  _createClass(IncomingRequest, [{
    key: 'reply',
    value: function reply(code, reason, extraHeaders, body, onSuccess, onFailure) {
      var supported = [];
      var to = this.getHeader('To');

      code = code || null;
      reason = reason || null;

      // Validate code and reason values.
      if (!code || code < 100 || code > 699) {
        throw new TypeError('Invalid status_code: ' + code);
      } else if (reason && typeof reason !== 'string' && !(reason instanceof String)) {
        throw new TypeError('Invalid reason_phrase: ' + reason);
      }

      reason = reason || JsSIP_C.REASON_PHRASE[code] || '';
      extraHeaders = Utils.cloneArray(extraHeaders);

      var response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n';

      if (this.method === JsSIP_C.INVITE && code > 100 && code <= 200) {
        var headers = this.getHeaders('record-route');

        var _iteratorNormalCompletion8 = true;
        var _didIteratorError8 = false;
        var _iteratorError8 = undefined;

        try {
          for (var _iterator8 = headers[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
            var header = _step8.value;

            response += 'Record-Route: ' + header + '\r\n';
          }
        } catch (err) {
          _didIteratorError8 = true;
          _iteratorError8 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion8 && _iterator8.return) {
              _iterator8.return();
            }
          } finally {
            if (_didIteratorError8) {
              throw _iteratorError8;
            }
          }
        }
      }

      var vias = this.getHeaders('via');

      var _iteratorNormalCompletion9 = true;
      var _didIteratorError9 = false;
      var _iteratorError9 = undefined;

      try {
        for (var _iterator9 = vias[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
          var via = _step9.value;

          response += 'Via: ' + via + '\r\n';
        }
      } catch (err) {
        _didIteratorError9 = true;
        _iteratorError9 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion9 && _iterator9.return) {
            _iterator9.return();
          }
        } finally {
          if (_didIteratorError9) {
            throw _iteratorError9;
          }
        }
      }

      if (!this.to_tag && code > 100) {
        to += ';tag=' + Utils.newTag();
      } else if (this.to_tag && !this.s('to').hasParam('tag')) {
        to += ';tag=' + this.to_tag;
      }

      response += 'To: ' + to + '\r\n';
      response += 'From: ' + this.getHeader('From') + '\r\n';
      response += 'Call-ID: ' + this.call_id + '\r\n';
      response += 'CSeq: ' + this.cseq + ' ' + this.method + '\r\n';

      var _iteratorNormalCompletion10 = true;
      var _didIteratorError10 = false;
      var _iteratorError10 = undefined;

      try {
        for (var _iterator10 = extraHeaders[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
          var _header2 = _step10.value;

          response += _header2.trim() + '\r\n';
        }

        // Supported.
      } catch (err) {
        _didIteratorError10 = true;
        _iteratorError10 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion10 && _iterator10.return) {
            _iterator10.return();
          }
        } finally {
          if (_didIteratorError10) {
            throw _iteratorError10;
          }
        }
      }

      switch (this.method) {
        case JsSIP_C.INVITE:
          if (this.ua.configuration.session_timers) {
            supported.push('timer');
          }
          if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) {
            supported.push('gruu');
          }
          supported.push('ice', 'replaces');
          break;
        case JsSIP_C.UPDATE:
          if (this.ua.configuration.session_timers) {
            supported.push('timer');
          }
          if (body) {
            supported.push('ice');
          }
          supported.push('replaces');
      }

      supported.push('outbound');

      // Allow and Accept.
      if (this.method === JsSIP_C.OPTIONS) {
        response += 'Allow: ' + JsSIP_C.ALLOWED_METHODS + '\r\n';
        response += 'Accept: ' + JsSIP_C.ACCEPTED_BODY_TYPES + '\r\n';
      } else if (code === 405) {
        response += 'Allow: ' + JsSIP_C.ALLOWED_METHODS + '\r\n';
      } else if (code === 415) {
        response += 'Accept: ' + JsSIP_C.ACCEPTED_BODY_TYPES + '\r\n';
      }

      response += 'Supported: ' + supported + '\r\n';

      if (body) {
        var length = Utils.str_utf8_length(body);

        response += 'Content-Type: application/sdp\r\n';
        response += 'Content-Length: ' + length + '\r\n\r\n';
        response += body;
      } else {
        response += 'Content-Length: ' + 0 + '\r\n\r\n';
      }

      this.server_transaction.receiveResponse(code, response, onSuccess, onFailure);
    }

    /**
    * Stateless reply.
    * -param {Number} code status code
    * -param {String} reason reason phrase
    */

  }, {
    key: 'reply_sl',
    value: function reply_sl() {
      var code = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var reason = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var vias = this.getHeaders('via');

      // Validate code and reason values.
      if (!code || code < 100 || code > 699) {
        throw new TypeError('Invalid status_code: ' + code);
      } else if (reason && typeof reason !== 'string' && !(reason instanceof String)) {
        throw new TypeError('Invalid reason_phrase: ' + reason);
      }

      reason = reason || JsSIP_C.REASON_PHRASE[code] || '';

      var response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n';

      var _iteratorNormalCompletion11 = true;
      var _didIteratorError11 = false;
      var _iteratorError11 = undefined;

      try {
        for (var _iterator11 = vias[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
          var via = _step11.value;

          response += 'Via: ' + via + '\r\n';
        }
      } catch (err) {
        _didIteratorError11 = true;
        _iteratorError11 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion11 && _iterator11.return) {
            _iterator11.return();
          }
        } finally {
          if (_didIteratorError11) {
            throw _iteratorError11;
          }
        }
      }

      var to = this.getHeader('To');

      if (!this.to_tag && code > 100) {
        to += ';tag=' + Utils.newTag();
      } else if (this.to_tag && !this.s('to').hasParam('tag')) {
        to += ';tag=' + this.to_tag;
      }

      response += 'To: ' + to + '\r\n';
      response += 'From: ' + this.getHeader('From') + '\r\n';
      response += 'Call-ID: ' + this.call_id + '\r\n';
      response += 'CSeq: ' + this.cseq + ' ' + this.method + '\r\n';
      response += 'Content-Length: ' + 0 + '\r\n\r\n';

      this.transport.send(response);
    }
  }]);

  return IncomingRequest;
}(IncomingMessage);

var IncomingResponse = function (_IncomingMessage2) {
  _inherits(IncomingResponse, _IncomingMessage2);

  function IncomingResponse() {
    _classCallCheck(this, IncomingResponse);

    var _this3 = _possibleConstructorReturn(this, (IncomingResponse.__proto__ || Object.getPrototypeOf(IncomingResponse)).call(this));

    _this3.headers = {};
    _this3.status_code = null;
    _this3.reason_phrase = null;
    return _this3;
  }

  return IncomingResponse;
}(IncomingMessage);

module.exports = {
  OutgoingRequest: OutgoingRequest,
  InitialOutgoingInviteRequest: InitialOutgoingInviteRequest,
  IncomingRequest: IncomingRequest,
  IncomingResponse: IncomingResponse
};

},{"./Constants":2,"./Grammar":7,"./NameAddrHeader":10,"./Utils":26,"debug":29,"sdp-transform":36}],20:[function(require,module,exports){
'use strict';

var Utils = require('./Utils');
var Grammar = require('./Grammar');
var debugerror = require('debug')('JsSIP:ERROR:Socket');

debugerror.log = console.warn.bind(console);

/**
 * Interface documentation: http://jssip.net/documentation/$last_version/api/socket/
 *
 * interface Socket {
 *  attribute String via_transport
 *  attribute String url
 *  attribute String sip_uri
 *
 *  method connect();
 *  method disconnect();
 *  method send(data);
 *
 *  attribute EventHandler onconnect
 *  attribute EventHandler ondisconnect
 *  attribute EventHandler ondata
 * }
 *
 */

exports.isSocket = function (socket) {
  // Ignore if an array is given.
  if (Array.isArray(socket)) {
    return false;
  }

  if (typeof socket === 'undefined') {
    debugerror('undefined JsSIP.Socket instance');

    return false;
  }

  // Check Properties.
  try {
    if (!Utils.isString(socket.url)) {
      debugerror('missing or invalid JsSIP.Socket url property');
      throw new Error();
    }

    if (!Utils.isString(socket.via_transport)) {
      debugerror('missing or invalid JsSIP.Socket via_transport property');
      throw new Error();
    }

    if (Grammar.parse(socket.sip_uri, 'SIP_URI') === -1) {
      debugerror('missing or invalid JsSIP.Socket sip_uri property');
      throw new Error();
    }
  } catch (e) {
    return false;
  }

  // Check Methods.
  try {
    ['connect', 'disconnect', 'send'].forEach(function (method) {
      if (!Utils.isFunction(socket[method])) {
        debugerror('missing or invalid JsSIP.Socket method: ' + method);
        throw new Error();
      }
    });
  } catch (e) {
    return false;
  }

  return true;
};

},{"./Grammar":7,"./Utils":26,"debug":29}],21:[function(require,module,exports){
"use strict";

var T1 = 500,
    T2 = 4000,
    T4 = 5000;

module.exports = {
  T1: T1,
  T2: T2,
  T4: T4,
  TIMER_B: 64 * T1,
  TIMER_D: 0 * T1,
  TIMER_F: 64 * T1,
  TIMER_H: 64 * T1,
  TIMER_I: 0 * T1,
  TIMER_J: 0 * T1,
  TIMER_K: 0 * T4,
  TIMER_L: 64 * T1,
  TIMER_M: 64 * T1,
  PROVISIONAL_RESPONSE_INTERVAL: 60000 // See RFC 3261 Section 13.3.1.1
};

},{}],22:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var JsSIP_C = require('./Constants');
var SIPMessage = require('./SIPMessage');
var Timers = require('./Timers');
var debugnict = require('debug')('JsSIP:NonInviteClientTransaction');
var debugict = require('debug')('JsSIP:InviteClientTransaction');
var debugact = require('debug')('JsSIP:AckClientTransaction');
var debugnist = require('debug')('JsSIP:NonInviteServerTransaction');
var debugist = require('debug')('JsSIP:InviteServerTransaction');

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

var NonInviteClientTransaction = function (_EventEmitter) {
  _inherits(NonInviteClientTransaction, _EventEmitter);

  function NonInviteClientTransaction(ua, transport, request, eventHandlers) {
    _classCallCheck(this, NonInviteClientTransaction);

    var _this = _possibleConstructorReturn(this, (NonInviteClientTransaction.__proto__ || Object.getPrototypeOf(NonInviteClientTransaction)).call(this));

    _this.type = C.NON_INVITE_CLIENT;
    _this.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
    _this.ua = ua;
    _this.transport = transport;
    _this.request = request;
    _this.eventHandlers = eventHandlers;

    var via = 'SIP/2.0/' + transport.via_transport;

    via += ' ' + ua.configuration.via_host + ';branch=' + _this.id;

    _this.request.setHeader('via', via);

    _this.ua.newTransaction(_this);
    return _this;
  }

  _createClass(NonInviteClientTransaction, [{
    key: 'stateChanged',
    value: function stateChanged(state) {
      this.state = state;
      this.emit('stateChanged');
    }
  }, {
    key: 'send',
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
    key: 'onTransportError',
    value: function onTransportError() {
      debugnict('transport error occurred, deleting transaction ' + this.id);
      clearTimeout(this.F);
      clearTimeout(this.K);
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
      this.eventHandlers.onTransportError();
    }
  }, {
    key: 'timer_F',
    value: function timer_F() {
      debugnict('Timer F expired for transaction ' + this.id);
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
      this.eventHandlers.onRequestTimeout();
    }
  }, {
    key: 'timer_K',
    value: function timer_K() {
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }
  }, {
    key: 'receiveResponse',
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
  }, {
    key: 'C',
    get: function get() {
      return C;
    }
  }]);

  return NonInviteClientTransaction;
}(EventEmitter);

var InviteClientTransaction = function (_EventEmitter2) {
  _inherits(InviteClientTransaction, _EventEmitter2);

  function InviteClientTransaction(ua, transport, request, eventHandlers) {
    _classCallCheck(this, InviteClientTransaction);

    var _this4 = _possibleConstructorReturn(this, (InviteClientTransaction.__proto__ || Object.getPrototypeOf(InviteClientTransaction)).call(this));

    _this4.type = C.INVITE_CLIENT;
    _this4.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
    _this4.ua = ua;
    _this4.transport = transport;
    _this4.request = request;
    _this4.eventHandlers = eventHandlers;
    request.transaction = _this4;

    var via = 'SIP/2.0/' + transport.via_transport;

    via += ' ' + ua.configuration.via_host + ';branch=' + _this4.id;

    _this4.request.setHeader('via', via);

    _this4.ua.newTransaction(_this4);
    return _this4;
  }

  _createClass(InviteClientTransaction, [{
    key: 'stateChanged',
    value: function stateChanged(state) {
      this.state = state;
      this.emit('stateChanged');
    }
  }, {
    key: 'send',
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
    key: 'onTransportError',
    value: function onTransportError() {
      clearTimeout(this.B);
      clearTimeout(this.D);
      clearTimeout(this.M);

      if (this.state !== C.STATUS_ACCEPTED) {
        debugict('transport error occurred, deleting transaction ' + this.id);
        this.eventHandlers.onTransportError();
      }

      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }

    // RFC 6026 7.2.

  }, {
    key: 'timer_M',
    value: function timer_M() {
      debugict('Timer M expired for transaction ' + this.id);

      if (this.state === C.STATUS_ACCEPTED) {
        clearTimeout(this.B);
        this.stateChanged(C.STATUS_TERMINATED);
        this.ua.destroyTransaction(this);
      }
    }

    // RFC 3261 17.1.1.

  }, {
    key: 'timer_B',
    value: function timer_B() {
      debugict('Timer B expired for transaction ' + this.id);
      if (this.state === C.STATUS_CALLING) {
        this.stateChanged(C.STATUS_TERMINATED);
        this.ua.destroyTransaction(this);
        this.eventHandlers.onRequestTimeout();
      }
    }
  }, {
    key: 'timer_D',
    value: function timer_D() {
      debugict('Timer D expired for transaction ' + this.id);
      clearTimeout(this.B);
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }
  }, {
    key: 'sendACK',
    value: function sendACK(response) {
      var _this6 = this;

      var ack = new SIPMessage.OutgoingRequest(JsSIP_C.ACK, this.request.ruri, this.ua, {
        'route_set': this.request.getHeader('route'),
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
    key: 'cancel',
    value: function cancel(reason) {
      // Send only if a provisional response (>100) has been received.
      if (this.state !== C.STATUS_PROCEEDING) {
        return;
      }

      var cancel = new SIPMessage.OutgoingRequest(JsSIP_C.CANCEL, this.request.ruri, this.ua, {
        'route_set': this.request.getHeader('route'),
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
    key: 'receiveResponse',
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
  }, {
    key: 'C',
    get: function get() {
      return C;
    }
  }]);

  return InviteClientTransaction;
}(EventEmitter);

var AckClientTransaction = function (_EventEmitter3) {
  _inherits(AckClientTransaction, _EventEmitter3);

  function AckClientTransaction(ua, transport, request, eventHandlers) {
    _classCallCheck(this, AckClientTransaction);

    var _this8 = _possibleConstructorReturn(this, (AckClientTransaction.__proto__ || Object.getPrototypeOf(AckClientTransaction)).call(this));

    _this8.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
    _this8.transport = transport;
    _this8.request = request;
    _this8.eventHandlers = eventHandlers;

    var via = 'SIP/2.0/' + transport.via_transport;

    via += ' ' + ua.configuration.via_host + ';branch=' + _this8.id;

    _this8.request.setHeader('via', via);
    return _this8;
  }

  _createClass(AckClientTransaction, [{
    key: 'send',
    value: function send() {
      if (!this.transport.send(this.request)) {
        this.onTransportError();
      }
    }
  }, {
    key: 'onTransportError',
    value: function onTransportError() {
      debugact('transport error occurred for transaction ' + this.id);
      this.eventHandlers.onTransportError();
    }
  }, {
    key: 'C',
    get: function get() {
      return C;
    }
  }]);

  return AckClientTransaction;
}(EventEmitter);

var NonInviteServerTransaction = function (_EventEmitter4) {
  _inherits(NonInviteServerTransaction, _EventEmitter4);

  function NonInviteServerTransaction(ua, transport, request) {
    _classCallCheck(this, NonInviteServerTransaction);

    var _this9 = _possibleConstructorReturn(this, (NonInviteServerTransaction.__proto__ || Object.getPrototypeOf(NonInviteServerTransaction)).call(this));

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

  _createClass(NonInviteServerTransaction, [{
    key: 'stateChanged',
    value: function stateChanged(state) {
      this.state = state;
      this.emit('stateChanged');
    }
  }, {
    key: 'timer_J',
    value: function timer_J() {
      debugnist('Timer J expired for transaction ' + this.id);
      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }
  }, {
    key: 'onTransportError',
    value: function onTransportError() {
      if (!this.transportError) {
        this.transportError = true;

        debugnist('transport error occurred, deleting transaction ' + this.id);

        clearTimeout(this.J);
        this.stateChanged(C.STATUS_TERMINATED);
        this.ua.destroyTransaction(this);
      }
    }
  }, {
    key: 'receiveResponse',
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
  }, {
    key: 'C',
    get: function get() {
      return C;
    }
  }]);

  return NonInviteServerTransaction;
}(EventEmitter);

var InviteServerTransaction = function (_EventEmitter5) {
  _inherits(InviteServerTransaction, _EventEmitter5);

  function InviteServerTransaction(ua, transport, request) {
    _classCallCheck(this, InviteServerTransaction);

    var _this11 = _possibleConstructorReturn(this, (InviteServerTransaction.__proto__ || Object.getPrototypeOf(InviteServerTransaction)).call(this));

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

  _createClass(InviteServerTransaction, [{
    key: 'stateChanged',
    value: function stateChanged(state) {
      this.state = state;
      this.emit('stateChanged');
    }
  }, {
    key: 'timer_H',
    value: function timer_H() {
      debugist('Timer H expired for transaction ' + this.id);

      if (this.state === C.STATUS_COMPLETED) {
        debugist('ACK not received, dialog will be terminated');
      }

      this.stateChanged(C.STATUS_TERMINATED);
      this.ua.destroyTransaction(this);
    }
  }, {
    key: 'timer_I',
    value: function timer_I() {
      this.stateChanged(C.STATUS_TERMINATED);
    }

    // RFC 6026 7.1.

  }, {
    key: 'timer_L',
    value: function timer_L() {
      debugist('Timer L expired for transaction ' + this.id);

      if (this.state === C.STATUS_ACCEPTED) {
        this.stateChanged(C.STATUS_TERMINATED);
        this.ua.destroyTransaction(this);
      }
    }
  }, {
    key: 'onTransportError',
    value: function onTransportError() {
      if (!this.transportError) {
        this.transportError = true;

        debugist('transport error occurred, deleting transaction ' + this.id);

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
    key: 'resend_provisional',
    value: function resend_provisional() {
      if (!this.transport.send(this.last_response)) {
        this.onTransportError();
      }
    }

    // INVITE Server Transaction RFC 3261 17.2.1.

  }, {
    key: 'receiveResponse',
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
  }, {
    key: 'C',
    get: function get() {
      return C;
    }
  }]);

  return InviteServerTransaction;
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

  var tr = void 0;

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

},{"./Constants":2,"./SIPMessage":19,"./Timers":21,"debug":29,"events":31}],23:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Socket = require('./Socket');
var debug = require('debug')('JsSIP:Transport');
var debugerror = require('debug')('JsSIP:ERROR:Transport');

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
      this.ondisconnect();
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

},{"./Socket":20,"debug":29}],24:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var JsSIP_C = require('./Constants');
var Registrator = require('./Registrator');
var RTCSession = require('./RTCSession');
var Message = require('./Message');
var Transactions = require('./Transactions');
var Transport = require('./Transport');
var Utils = require('./Utils');
var Exceptions = require('./Exceptions');
var URI = require('./URI');
var Grammar = require('./Grammar');
var Parser = require('./Parser');
var SIPMessage = require('./SIPMessage');
var sanityCheck = require('./sanityCheck');
var config = require('./Config');
var debug = require('debug')('JsSIP:UA');
var debugerror = require('debug')('JsSIP:ERROR:UA');

debugerror.log = console.warn.bind(console);

var C = {
  // UA status codes.
  STATUS_INIT: 0,
  STATUS_READY: 1,
  STATUS_USER_CLOSED: 2,
  STATUS_NOT_READY: 3,

  // UA error codes.
  CONFIGURATION_ERROR: 1,
  NETWORK_ERROR: 2
};

/**
 * The User-Agent class.
 * @class JsSIP.UA
 * @param {Object} configuration Configuration parameters.
 * @throws {JsSIP.Exceptions.ConfigurationError} If a configuration parameter is invalid.
 * @throws {TypeError} If no configuration is given.
 */
module.exports = function (_EventEmitter) {
  _inherits(UA, _EventEmitter);

  _createClass(UA, null, [{
    key: 'C',

    // Expose C object.
    get: function get() {
      return C;
    }
  }]);

  function UA(configuration) {
    _classCallCheck(this, UA);

    debug('new() [configuration:%o]', configuration);

    var _this = _possibleConstructorReturn(this, (UA.__proto__ || Object.getPrototypeOf(UA)).call(this));

    _this._cache = {
      credentials: {}
    };

    _this._configuration = Object.assign({}, config.settings);
    _this._dynConfiguration = {};
    _this._dialogs = {};

    // User actions outside any session/dialog (MESSAGE).
    _this._applicants = {};

    _this._sessions = {};
    _this._transport = null;
    _this._contact = null;
    _this._status = C.STATUS_INIT;
    _this._error = null;
    _this._transactions = {
      nist: {},
      nict: {},
      ist: {},
      ict: {}
    };

    // Custom UA empty object for high level use.
    _this._data = {};

    _this._closeTimer = null;

    // Check configuration argument.
    if (configuration === undefined) {
      throw new TypeError('Not enough arguments');
    }

    // Load configuration.
    try {
      _this._loadConfig(configuration);
    } catch (e) {
      _this._status = C.STATUS_NOT_READY;
      _this._error = C.CONFIGURATION_ERROR;
      throw e;
    }

    // Initialize registrator.
    _this._registrator = new Registrator(_this);
    return _this;
  }

  _createClass(UA, [{
    key: 'start',


    // =================
    //  High Level API
    // =================

    /**
     * Connect to the server if status = STATUS_INIT.
     * Resume UA after being closed.
     */
    value: function start() {
      debug('start()');

      if (this._status === C.STATUS_INIT) {
        this._transport.connect();
      } else if (this._status === C.STATUS_USER_CLOSED) {
        debug('restarting UA');

        // Disconnect.
        if (this._closeTimer !== null) {
          clearTimeout(this._closeTimer);
          this._closeTimer = null;
          this._transport.disconnect();
        }

        // Reconnect.
        this._status = C.STATUS_INIT;
        this._transport.connect();
      } else if (this._status === C.STATUS_READY) {
        debug('UA is in READY status, not restarted');
      } else {
        debug('ERROR: connection is down, Auto-Recovery system is trying to reconnect');
      }

      // Set dynamic configuration.
      this._dynConfiguration.register = this._configuration.register;
    }

    /**
     * Register.
     */

  }, {
    key: 'register',
    value: function register() {
      debug('register()');

      this._dynConfiguration.register = true;
      this._registrator.register();
    }

    /**
     * Unregister.
     */

  }, {
    key: 'unregister',
    value: function unregister(options) {
      debug('unregister()');

      this._dynConfiguration.register = false;
      this._registrator.unregister(options);
    }

    /**
     * Get the Registrator instance.
     */

  }, {
    key: 'registrator',
    value: function registrator() {
      return this._registrator;
    }

    /**
     * Registration state.
     */

  }, {
    key: 'isRegistered',
    value: function isRegistered() {
      if (this._registrator.registered) {
        return true;
      } else {
        return false;
      }
    }

    /**
     * Connection state.
     */

  }, {
    key: 'isConnected',
    value: function isConnected() {
      return this._transport.isConnected();
    }

    /**
     * Make an outgoing call.
     *
     * -param {String} target
     * -param {Object} views
     * -param {Object} [options]
     *
     * -throws {TypeError}
     *
     */

  }, {
    key: 'call',
    value: function call(target, options) {
      debug('call()');

      var session = new RTCSession(this);

      session.connect(target, options);

      return session;
    }

    /**
     * Send a message.
     *
     * -param {String} target
     * -param {String} body
     * -param {Object} [options]
     *
     * -throws {TypeError}
     *
     */

  }, {
    key: 'sendMessage',
    value: function sendMessage(target, body, options) {
      debug('sendMessage()');

      var message = new Message(this);

      message.send(target, body, options);

      return message;
    }

    /**
     * Terminate ongoing sessions.
     */

  }, {
    key: 'terminateSessions',
    value: function terminateSessions(options) {
      debug('terminateSessions()');

      for (var idx in this._sessions) {
        if (!this._sessions[idx].isEnded()) {
          this._sessions[idx].terminate(options);
        }
      }
    }

    /**
     * Gracefully close.
     *
     */

  }, {
    key: 'stop',
    value: function stop() {
      var _this2 = this;

      debug('stop()');

      // Remove dynamic settings.
      this._dynConfiguration = {};

      if (this._status === C.STATUS_USER_CLOSED) {
        debug('UA already closed');

        return;
      }

      // Close registrator.
      this._registrator.close();

      // If there are session wait a bit so CANCEL/BYE can be sent and their responses received.
      var num_sessions = Object.keys(this._sessions).length;

      // Run  _terminate_ on every Session.
      for (var session in this._sessions) {
        if (Object.prototype.hasOwnProperty.call(this._sessions, session)) {
          debug('closing session ' + session);
          try {
            this._sessions[session].terminate();
          } catch (error) {}
        }
      }

      // Run  _close_ on every applicant.
      for (var applicant in this._applicants) {
        if (Object.prototype.hasOwnProperty.call(this._applicants, applicant)) try {
          this._applicants[applicant].close();
        } catch (error) {}
      }

      this._status = C.STATUS_USER_CLOSED;

      var num_transactions = Object.keys(this._transactions.nict).length + Object.keys(this._transactions.nist).length + Object.keys(this._transactions.ict).length + Object.keys(this._transactions.ist).length;

      if (num_transactions === 0 && num_sessions === 0) {
        this._transport.disconnect();
      } else {
        this._closeTimer = setTimeout(function () {
          _this2._closeTimer = null;
          _this2._transport.disconnect();
        }, 2000);
      }
    }

    /**
     * Normalice a string into a valid SIP request URI
     * -param {String} target
     * -returns {JsSIP.URI|undefined}
     */

  }, {
    key: 'normalizeTarget',
    value: function normalizeTarget(target) {
      return Utils.normalizeTarget(target, this._configuration.hostport_params);
    }

    /**
     * Allow retrieving configuration and autogenerated fields in runtime.
     */

  }, {
    key: 'get',
    value: function get(parameter) {
      switch (parameter) {
        case 'realm':
          return this._configuration.realm;

        case 'ha1':
          return this._configuration.ha1;

        default:
          debugerror('get() | cannot get "%s" parameter in runtime', parameter);

          return undefined;
      }
    }

    /**
     * Allow configuration changes in runtime.
     * Returns true if the parameter could be set.
     */

  }, {
    key: 'set',
    value: function set(parameter, value) {
      switch (parameter) {
        case 'password':
          {
            this._configuration.password = String(value);
            break;
          }

        case 'realm':
          {
            this._configuration.realm = String(value);
            break;
          }

        case 'ha1':
          {
            this._configuration.ha1 = String(value);
            // Delete the plain SIP password.
            this._configuration.password = null;
            break;
          }

        case 'display_name':
          {
            if (Grammar.parse('"' + value + '"', 'display_name') === -1) {
              debugerror('set() | wrong "display_name"');

              return false;
            }
            this._configuration.display_name = value;
            break;
          }

        default:
          debugerror('set() | cannot set "%s" parameter in runtime', parameter);

          return false;
      }

      return true;
    }

    // ==========================
    // Event Handlers.
    // ==========================

    /**
     * new Transaction
     */

  }, {
    key: 'newTransaction',
    value: function newTransaction(transaction) {
      this._transactions[transaction.type][transaction.id] = transaction;
      this.emit('newTransaction', {
        transaction: transaction
      });
    }

    /**
     * Transaction destroyed.
     */

  }, {
    key: 'destroyTransaction',
    value: function destroyTransaction(transaction) {
      delete this._transactions[transaction.type][transaction.id];
      this.emit('transactionDestroyed', {
        transaction: transaction
      });
    }

    /**
     * new Dialog
     */

  }, {
    key: 'newDialog',
    value: function newDialog(dialog) {
      this._dialogs[dialog.id] = dialog;
    }

    /**
     * Dialog destroyed.
     */

  }, {
    key: 'destroyDialog',
    value: function destroyDialog(dialog) {
      delete this._dialogs[dialog.id];
    }

    /**
     *  new Message
     */

  }, {
    key: 'newMessage',
    value: function newMessage(message, data) {
      this._applicants[message] = message;
      this.emit('newMessage', data);
    }

    /**
     *  Message destroyed.
     */

  }, {
    key: 'destroyMessage',
    value: function destroyMessage(message) {
      delete this._applicants[message];
    }

    /**
     * new RTCSession
     */

  }, {
    key: 'newRTCSession',
    value: function newRTCSession(session, data) {
      this._sessions[session.id] = session;
      this.emit('newRTCSession', data);
    }

    /**
     * RTCSession destroyed.
     */

  }, {
    key: 'destroyRTCSession',
    value: function destroyRTCSession(session) {
      delete this._sessions[session.id];
    }

    /**
     * Registered
     */

  }, {
    key: 'registered',
    value: function registered(data) {
      this.emit('registered', data);
    }

    /**
     * Unregistered
     */

  }, {
    key: 'unregistered',
    value: function unregistered(data) {
      this.emit('unregistered', data);
    }

    /**
     * Registration Failed
     */

  }, {
    key: 'registrationFailed',
    value: function registrationFailed(data) {
      this.emit('registrationFailed', data);
    }

    // =========================
    // ReceiveRequest.
    // =========================

    /**
     * Request reception
     */

  }, {
    key: 'receiveRequest',
    value: function receiveRequest(request) {
      var method = request.method;

      // Check that request URI points to us.
      if (request.ruri.user !== this._configuration.uri.user && request.ruri.user !== this._contact.uri.user) {
        debug('Request-URI does not point to us');
        if (request.method !== JsSIP_C.ACK) {
          request.reply_sl(404);
        }

        return;
      }

      // Check request URI scheme.
      if (request.ruri.scheme === JsSIP_C.SIPS) {
        request.reply_sl(416);

        return;
      }

      // Check transaction.
      if (Transactions.checkTransaction(this, request)) {
        return;
      }

      // Create the server transaction.
      if (method === JsSIP_C.INVITE) {
        /* eslint-disable no-new */
        new Transactions.InviteServerTransaction(this, this._transport, request);
        /* eslint-enable no-new */
      } else if (method !== JsSIP_C.ACK && method !== JsSIP_C.CANCEL) {
        /* eslint-disable no-new */
        new Transactions.NonInviteServerTransaction(this, this._transport, request);
        /* eslint-enable no-new */
      }

      /* RFC3261 12.2.2
       * Requests that do not change in any way the state of a dialog may be
       * received within a dialog (for example, an OPTIONS request).
       * They are processed as if they had been received outside the dialog.
       */
      if (method === JsSIP_C.OPTIONS) {
        request.reply(200);
      } else if (method === JsSIP_C.MESSAGE) {
        if (this.listeners('newMessage').length === 0) {
          request.reply(405);

          return;
        }
        var message = new Message(this);

        message.init_incoming(request);
      } else if (method === JsSIP_C.INVITE) {
        // Initial INVITE.
        if (!request.to_tag && this.listeners('newRTCSession').length === 0) {
          request.reply(405);

          return;
        }
      }

      var dialog = void 0;
      var session = void 0;

      // Initial Request.
      if (!request.to_tag) {
        switch (method) {
          case JsSIP_C.INVITE:
            if (window.RTCPeerConnection) {
              // TODO
              if (request.hasHeader('replaces')) {
                var replaces = request.replaces;

                dialog = this._findDialog(replaces.call_id, replaces.from_tag, replaces.to_tag);
                if (dialog) {
                  session = dialog.owner;
                  if (!session.isEnded()) {
                    session.receiveRequest(request);
                  } else {
                    request.reply(603);
                  }
                } else {
                  request.reply(481);
                }
              } else {
                session = new RTCSession(this);
                session.init_incoming(request);
              }
            } else {
              debugerror('INVITE received but WebRTC is not supported');
              request.reply(488);
            }
            break;
          case JsSIP_C.BYE:
            // Out of dialog BYE received.
            request.reply(481);
            break;
          case JsSIP_C.CANCEL:
            session = this._findSession(request);
            if (session) {
              session.receiveRequest(request);
            } else {
              debug('received CANCEL request for a non existent session');
            }
            break;
          case JsSIP_C.ACK:
            /* Absorb it.
             * ACK request without a corresponding Invite Transaction
             * and without To tag.
             */
            break;
          default:
            request.reply(405);
            break;
        }
      }
      // In-dialog request.
      else {
          dialog = this._findDialog(request.call_id, request.from_tag, request.to_tag);

          if (dialog) {
            dialog.receiveRequest(request);
          } else if (method === JsSIP_C.NOTIFY) {
            session = this._findSession(request);
            if (session) {
              session.receiveRequest(request);
            } else {
              debug('received NOTIFY request for a non existent subscription');
              request.reply(481, 'Subscription does not exist');
            }
          }

          /* RFC3261 12.2.2
           * Request with to tag, but no matching dialog found.
           * Exception: ACK for an Invite request for which a dialog has not
           * been created.
           */
          else if (method !== JsSIP_C.ACK) {
              request.reply(481);
            }
        }
    }

    // =================
    // Utils.
    // =================

    /**
     * Get the session to which the request belongs to, if any.
     */

  }, {
    key: '_findSession',
    value: function _findSession(_ref) {
      var call_id = _ref.call_id,
          from_tag = _ref.from_tag,
          to_tag = _ref.to_tag;

      var sessionIDa = call_id + from_tag;
      var sessionA = this._sessions[sessionIDa];
      var sessionIDb = call_id + to_tag;
      var sessionB = this._sessions[sessionIDb];

      if (sessionA) {
        return sessionA;
      } else if (sessionB) {
        return sessionB;
      } else {
        return null;
      }
    }

    /**
     * Get the dialog to which the request belongs to, if any.
     */

  }, {
    key: '_findDialog',
    value: function _findDialog(call_id, from_tag, to_tag) {
      var id = call_id + from_tag + to_tag;
      var dialog = this._dialogs[id];

      if (dialog) {
        return dialog;
      } else {
        id = call_id + to_tag + from_tag;
        dialog = this._dialogs[id];
        if (dialog) {
          return dialog;
        } else {
          return null;
        }
      }
    }
  }, {
    key: '_loadConfig',
    value: function _loadConfig(configuration) {
      // Check and load the given configuration.
      try {
        config.load(this._configuration, configuration);
      } catch (e) {
        throw e;
      }

      // Post Configuration Process.

      // Allow passing 0 number as display_name.
      if (this._configuration.display_name === 0) {
        this._configuration.display_name = '0';
      }

      // Instance-id for GRUU.
      if (!this._configuration.instance_id) {
        this._configuration.instance_id = Utils.newUUID();
      }

      // Jssip_id instance parameter. Static random tag of length 5.
      this._configuration.jssip_id = Utils.createRandomToken(5);

      // String containing this._configuration.uri without scheme and user.
      var hostport_params = this._configuration.uri.clone();

      hostport_params.user = null;
      this._configuration.hostport_params = hostport_params.toString().replace(/^sip:/i, '');

      // Transport.
      try {
        this._transport = new Transport(this._configuration.sockets, {
          // Recovery options.
          max_interval: this._configuration.connection_recovery_max_interval,
          min_interval: this._configuration.connection_recovery_min_interval
        });

        // Transport event callbacks.
        this._transport.onconnecting = onTransportConnecting.bind(this);
        this._transport.onconnect = onTransportConnect.bind(this);
        this._transport.ondisconnect = onTransportDisconnect.bind(this);
        this._transport.ondata = onTransportData.bind(this);
      } catch (e) {
        debugerror(e);
        throw new Exceptions.ConfigurationError('sockets', this._configuration.sockets);
      }

      // Remove sockets instance from configuration object.
      delete this._configuration.sockets;

      // Check whether authorization_user is explicitly defined.
      // Take 'this._configuration.uri.user' value if not.
      if (!this._configuration.authorization_user) {
        this._configuration.authorization_user = this._configuration.uri.user;
      }

      // If no 'registrar_server' is set use the 'uri' value without user portion and
      // without URI params/headers.
      if (!this._configuration.registrar_server) {
        var registrar_server = this._configuration.uri.clone();

        registrar_server.user = null;
        registrar_server.clearParams();
        registrar_server.clearHeaders();
        this._configuration.registrar_server = registrar_server;
      }

      // User no_answer_timeout.
      this._configuration.no_answer_timeout *= 1000;

      // Via Host.
      if (this._configuration.contact_uri) {
        this._configuration.via_host = this._configuration.contact_uri.host;
      }

      // Contact URI.
      else {
          this._configuration.contact_uri = new URI('sip', Utils.createRandomToken(8), this._configuration.via_host, null, { transport: 'ws' });
        }

      this._contact = {
        pub_gruu: null,
        temp_gruu: null,
        uri: this._configuration.contact_uri,
        toString: function toString() {
          var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          var anonymous = options.anonymous || null;
          var outbound = options.outbound || null;
          var contact = '<';

          if (anonymous) {
            contact += this.temp_gruu || 'sip:anonymous@anonymous.invalid;transport=ws';
          } else {
            contact += this.pub_gruu || this.uri.toString();
          }

          if (outbound && (anonymous ? !this.temp_gruu : !this.pub_gruu)) {
            contact += ';ob';
          }

          contact += '>';

          return contact;
        }
      };

      // Seal the configuration.
      var writable_parameters = ['password', 'realm', 'ha1', 'display_name', 'register'];

      for (var parameter in this._configuration) {
        if (Object.prototype.hasOwnProperty.call(this._configuration, parameter)) {
          if (writable_parameters.indexOf(parameter)) {
            Object.defineProperty(this._configuration, parameter, {
              writable: true,
              configurable: false
            });
          } else {
            Object.defineProperty(this._configuration, parameter, {
              writable: false,
              configurable: false
            });
          }
        }
      }

      debug('configuration parameters after validation:');
      for (var _parameter in this._configuration) {
        // Only show the user user configurable parameters.
        if (Object.prototype.hasOwnProperty.call(config.settings, _parameter)) {
          switch (_parameter) {
            case 'uri':
            case 'registrar_server':
              debug('- ' + _parameter + ': ' + this._configuration[_parameter]);
              break;
            case 'password':
            case 'ha1':
              debug('- ' + _parameter + ': NOT SHOWN');
              break;
            default:
              debug('- ' + _parameter + ': ' + JSON.stringify(this._configuration[_parameter]));
          }
        }
      }

      return;
    }
  }, {
    key: 'C',
    get: function get() {
      return C;
    }
  }, {
    key: 'status',
    get: function get() {
      return this._status;
    }
  }, {
    key: 'contact',
    get: function get() {
      return this._contact;
    }
  }, {
    key: 'configuration',
    get: function get() {
      return this._configuration;
    }
  }, {
    key: 'transport',
    get: function get() {
      return this._transport;
    }
  }]);

  return UA;
}(EventEmitter);

/**
 * Transport event handlers
 */

// Transport connecting event.
function onTransportConnecting(data) {
  this.emit('connecting', data);
}

// Transport connected event.
function onTransportConnect(data) {
  if (this._status === C.STATUS_USER_CLOSED) {
    return;
  }

  this._status = C.STATUS_READY;
  this._error = null;

  this.emit('connected', data);

  if (this._dynConfiguration.register) {
    this._registrator.register();
  }
}

// Transport disconnected event.
function onTransportDisconnect(data) {
  // Run _onTransportError_ callback on every client transaction using _transport_.
  var client_transactions = ['nict', 'ict', 'nist', 'ist'];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = client_transactions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var type = _step.value;

      for (var id in this._transactions[type]) {
        if (Object.prototype.hasOwnProperty.call(this._transactions[type], id)) {
          this._transactions[type][id].onTransportError();
        }
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  this.emit('disconnected', data);

  // Call registrator _onTransportClosed_.
  this._registrator.onTransportClosed();

  if (this._status !== C.STATUS_USER_CLOSED) {
    this._status = C.STATUS_NOT_READY;
    this._error = C.NETWORK_ERROR;
  }
}

// Transport data event.
function onTransportData(data) {
  var transport = data.transport;
  var message = data.message;

  message = Parser.parseMessage(message, this);

  if (!message) {
    return;
  }

  if (this._status === C.STATUS_USER_CLOSED && message instanceof SIPMessage.IncomingRequest) {
    return;
  }

  // Do some sanity check.
  if (!sanityCheck(message, this, transport)) {
    return;
  }

  if (message instanceof SIPMessage.IncomingRequest) {
    message.transport = transport;
    this.receiveRequest(message);
  } else if (message instanceof SIPMessage.IncomingResponse) {
    /* Unike stated in 18.1.2, if a response does not match
    * any transaction, it is discarded here and no passed to the core
    * in order to be discarded there.
    */

    var transaction = void 0;

    switch (message.method) {
      case JsSIP_C.INVITE:
        transaction = this._transactions.ict[message.via_branch];
        if (transaction) {
          transaction.receiveResponse(message);
        }
        break;
      case JsSIP_C.ACK:
        // Just in case ;-).
        break;
      default:
        transaction = this._transactions.nict[message.via_branch];
        if (transaction) {
          transaction.receiveResponse(message);
        }
        break;
    }
  }
}

},{"./Config":1,"./Constants":2,"./Exceptions":6,"./Grammar":7,"./Message":9,"./Parser":11,"./RTCSession":12,"./Registrator":17,"./SIPMessage":19,"./Transactions":22,"./Transport":23,"./URI":25,"./Utils":26,"./sanityCheck":28,"debug":29,"events":31}],25:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JsSIP_C = require('./Constants');
var Utils = require('./Utils');
var Grammar = require('./Grammar');

/**
 * -param {String} [scheme]
 * -param {String} [user]
 * -param {String} host
 * -param {String} [port]
 * -param {Object} [parameters]
 * -param {Object} [headers]
 *
 */
module.exports = function () {
  _createClass(URI, null, [{
    key: 'parse',

    /**
      * Parse the given string and returns a JsSIP.URI instance or undefined if
      * it is an invalid URI.
      */
    value: function parse(uri) {
      uri = Grammar.parse(uri, 'SIP_URI');

      if (uri !== -1) {
        return uri;
      } else {
        return undefined;
      }
    }
  }]);

  function URI(scheme, user, host, port) {
    var parameters = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    var headers = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};

    _classCallCheck(this, URI);

    // Checks.
    if (!host) {
      throw new TypeError('missing or invalid "host" parameter');
    }

    // Initialize parameters.
    this._parameters = {};
    this._headers = {};

    this._scheme = scheme || JsSIP_C.SIP;
    this._user = user;
    this._host = host;
    this._port = port;

    for (var param in parameters) {
      if (Object.prototype.hasOwnProperty.call(parameters, param)) {
        this.setParam(param, parameters[param]);
      }
    }

    for (var header in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, header)) {
        this.setHeader(header, headers[header]);
      }
    }
  }

  _createClass(URI, [{
    key: 'setParam',
    value: function setParam(key, value) {
      if (key) {
        this._parameters[key.toLowerCase()] = typeof value === 'undefined' || value === null ? null : value.toString();
      }
    }
  }, {
    key: 'getParam',
    value: function getParam(key) {
      if (key) {
        return this._parameters[key.toLowerCase()];
      }
    }
  }, {
    key: 'hasParam',
    value: function hasParam(key) {
      if (key) {
        return this._parameters.hasOwnProperty(key.toLowerCase()) && true || false;
      }
    }
  }, {
    key: 'deleteParam',
    value: function deleteParam(parameter) {
      parameter = parameter.toLowerCase();
      if (this._parameters.hasOwnProperty(parameter)) {
        var value = this._parameters[parameter];

        delete this._parameters[parameter];

        return value;
      }
    }
  }, {
    key: 'clearParams',
    value: function clearParams() {
      this._parameters = {};
    }
  }, {
    key: 'setHeader',
    value: function setHeader(name, value) {
      this._headers[Utils.headerize(name)] = Array.isArray(value) ? value : [value];
    }
  }, {
    key: 'getHeader',
    value: function getHeader(name) {
      if (name) {
        return this._headers[Utils.headerize(name)];
      }
    }
  }, {
    key: 'hasHeader',
    value: function hasHeader(name) {
      if (name) {
        return this._headers.hasOwnProperty(Utils.headerize(name)) && true || false;
      }
    }
  }, {
    key: 'deleteHeader',
    value: function deleteHeader(header) {
      header = Utils.headerize(header);
      if (this._headers.hasOwnProperty(header)) {
        var value = this._headers[header];

        delete this._headers[header];

        return value;
      }
    }
  }, {
    key: 'clearHeaders',
    value: function clearHeaders() {
      this._headers = {};
    }
  }, {
    key: 'clone',
    value: function clone() {
      return new URI(this._scheme, this._user, this._host, this._port, JSON.parse(JSON.stringify(this._parameters)), JSON.parse(JSON.stringify(this._headers)));
    }
  }, {
    key: 'toString',
    value: function toString() {
      var headers = [];

      var uri = this._scheme + ':';

      if (this._user) {
        uri += Utils.escapeUser(this._user) + '@';
      }
      uri += this._host;
      if (this._port || this._port === 0) {
        uri += ':' + this._port;
      }

      for (var parameter in this._parameters) {
        if (Object.prototype.hasOwnProperty.call(this._parameters, parameter)) {
          uri += ';' + parameter;

          if (this._parameters[parameter] !== null) {
            uri += '=' + this._parameters[parameter];
          }
        }
      }

      for (var header in this._headers) {
        if (Object.prototype.hasOwnProperty.call(this._headers, header)) {
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = this._headers[header][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var item = _step.value;

              headers.push(header + '=' + item);
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
      }

      if (headers.length > 0) {
        uri += '?' + headers.join('&');
      }

      return uri;
    }
  }, {
    key: 'toAor',
    value: function toAor(show_port) {
      var aor = this._scheme + ':';

      if (this._user) {
        aor += Utils.escapeUser(this._user) + '@';
      }
      aor += this._host;
      if (show_port && (this._port || this._port === 0)) {
        aor += ':' + this._port;
      }

      return aor;
    }
  }, {
    key: 'scheme',
    get: function get() {
      return this._scheme;
    },
    set: function set(value) {
      this._scheme = value.toLowerCase();
    }
  }, {
    key: 'user',
    get: function get() {
      return this._user;
    },
    set: function set(value) {
      this._user = value;
    }
  }, {
    key: 'host',
    get: function get() {
      return this._host;
    },
    set: function set(value) {
      this._host = value.toLowerCase();
    }
  }, {
    key: 'port',
    get: function get() {
      return this._port;
    },
    set: function set(value) {
      this._port = value === 0 ? value : parseInt(value, 10) || null;
    }
  }]);

  return URI;
}();

},{"./Constants":2,"./Grammar":7,"./Utils":26}],26:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var JsSIP_C = require('./Constants');
var URI = require('./URI');
var Grammar = require('./Grammar');

exports.str_utf8_length = function (string) {
  return unescape(encodeURIComponent(string)).length;
};

// Used by 'hasMethods'.
var isFunction = exports.isFunction = function (fn) {
  if (fn !== undefined) {
    return Object.prototype.toString.call(fn) === '[object Function]' ? true : false;
  } else {
    return false;
  }
};

exports.isString = function (str) {
  if (str !== undefined) {
    return Object.prototype.toString.call(str) === '[object String]' ? true : false;
  } else {
    return false;
  }
};

exports.isDecimal = function (num) {
  return !isNaN(num) && parseFloat(num) === parseInt(num, 10);
};

exports.isEmpty = function (value) {
  return value === null || value === '' || value === undefined || Array.isArray(value) && value.length === 0 || typeof value === 'number' && isNaN(value);
};

exports.hasMethods = function (obj) {
  for (var _len = arguments.length, methodNames = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    methodNames[_key - 1] = arguments[_key];
  }

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = methodNames[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var methodName = _step.value;

      if (isFunction(obj[methodName])) {
        return false;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return true;
};

// Used by 'newTag'.
var createRandomToken = exports.createRandomToken = function (size) {
  var base = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 32;

  var i = void 0,
      r = void 0,
      token = '';

  for (i = 0; i < size; i++) {
    r = Math.random() * base | 0;
    token += r.toString(base);
  }

  return token;
};

exports.newTag = function () {
  return createRandomToken(10);
};

// http://stackoverflow.com/users/109538/broofa.
exports.newUUID = function () {
  var UUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
        v = c === 'x' ? r : r & 0x3 | 0x8;

    return v.toString(16);
  });

  return UUID;
};

exports.hostType = function (host) {
  if (!host) {
    return;
  } else {
    host = Grammar.parse(host, 'host');
    if (host !== -1) {
      return host.host_type;
    }
  }
};

/**
* Hex-escape a SIP URI user.
* Don't hex-escape ':' (%3A), '+' (%2B), '?' (%3F"), '/' (%2F).
*
* Used by 'normalizeTarget'.
*/
var escapeUser = exports.escapeUser = function (user) {
  return encodeURIComponent(decodeURIComponent(user)).replace(/%3A/ig, ':').replace(/%2B/ig, '+').replace(/%3F/ig, '?').replace(/%2F/ig, '/');
};

/**
* Normalize SIP URI.
* NOTE: It does not allow a SIP URI without username.
* Accepts 'sip', 'sips' and 'tel' URIs and convert them into 'sip'.
* Detects the domain part (if given) and properly hex-escapes the user portion.
* If the user portion has only 'tel' number symbols the user portion is clean of 'tel' visual separators.
*/
exports.normalizeTarget = function (target, domain) {
  // If no target is given then raise an error.
  if (!target) {
    return;
    // If a URI instance is given then return it.
  } else if (target instanceof URI) {
    return target;

    // If a string is given split it by '@':
    // - Last fragment is the desired domain.
    // - Otherwise append the given domain argument.
  } else if (typeof target === 'string') {
    var target_array = target.split('@');
    var target_user = void 0;
    var target_domain = void 0;

    switch (target_array.length) {
      case 1:
        if (!domain) {
          return;
        }
        target_user = target;
        target_domain = domain;
        break;
      case 2:
        target_user = target_array[0];
        target_domain = target_array[1];
        break;
      default:
        target_user = target_array.slice(0, target_array.length - 1).join('@');
        target_domain = target_array[target_array.length - 1];
    }

    // Remove the URI scheme (if present).
    target_user = target_user.replace(/^(sips?|tel):/i, '');

    // Remove 'tel' visual separators if the user portion just contains 'tel' number symbols.
    if (/^[-.()]*\+?[0-9\-.()]+$/.test(target_user)) {
      target_user = target_user.replace(/[-.()]/g, '');
    }

    // Build the complete SIP URI.
    target = JsSIP_C.SIP + ':' + escapeUser(target_user) + '@' + target_domain;

    // Finally parse the resulting URI.
    var uri = void 0;

    if (uri = URI.parse(target)) {
      return uri;
    } else {
      return;
    }
  } else {
    return;
  }
};

exports.headerize = function (string) {
  var exceptions = {
    'Call-Id': 'Call-ID',
    'Cseq': 'CSeq',
    'Www-Authenticate': 'WWW-Authenticate'
  };

  var name = string.toLowerCase().replace(/_/g, '-').split('-');
  var hname = '';
  var parts = name.length;
  var part = void 0;

  for (part = 0; part < parts; part++) {
    if (part !== 0) {
      hname += '-';
    }
    hname += name[part].charAt(0).toUpperCase() + name[part].substring(1);
  }
  if (exceptions[hname]) {
    hname = exceptions[hname];
  }

  return hname;
};

exports.sipErrorCause = function (status_code) {
  for (var cause in JsSIP_C.SIP_ERROR_CAUSES) {
    if (JsSIP_C.SIP_ERROR_CAUSES[cause].indexOf(status_code) !== -1) {
      return JsSIP_C.causes[cause];
    }
  }

  return JsSIP_C.causes.SIP_FAILURE_CODE;
};

/**
* Generate a random Test-Net IP (http://tools.ietf.org/html/rfc5735)
*/
exports.getRandomTestNetIP = function () {
  function getOctet(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
  }

  return '192.0.2.' + getOctet(1, 254);
};

// MD5 (Message-Digest Algorithm) http://www.webtoolkit.info.
exports.calculateMD5 = function (string) {
  function rotateLeft(lValue, iShiftBits) {
    return lValue << iShiftBits | lValue >>> 32 - iShiftBits;
  }

  function addUnsigned(lX, lY) {
    var lX8 = lX & 0x80000000;
    var lY8 = lY & 0x80000000;
    var lX4 = lX & 0x40000000;
    var lY4 = lY & 0x40000000;
    var lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);

    if (lX4 & lY4) {
      return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return lResult ^ 0xC0000000 ^ lX8 ^ lY8;
      } else {
        return lResult ^ 0x40000000 ^ lX8 ^ lY8;
      }
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  }

  function doF(x, y, z) {
    return x & y | ~x & z;
  }

  function doG(x, y, z) {
    return x & z | y & ~z;
  }

  function doH(x, y, z) {
    return x ^ y ^ z;
  }

  function doI(x, y, z) {
    return y ^ (x | ~z);
  }

  function doFF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doF(b, c, d), x), ac));

    return addUnsigned(rotateLeft(a, s), b);
  }

  function doGG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doG(b, c, d), x), ac));

    return addUnsigned(rotateLeft(a, s), b);
  }

  function doHH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doH(b, c, d), x), ac));

    return addUnsigned(rotateLeft(a, s), b);
  }

  function doII(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doI(b, c, d), x), ac));

    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str) {
    var lWordCount = void 0;
    var lMessageLength = str.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - lNumberOfWords_temp1 % 64) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = new Array(lNumberOfWords - 1);
    var lBytePosition = 0;
    var lByteCount = 0;

    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - lByteCount % 4) / 4;
      lBytePosition = lByteCount % 4 * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | str.charCodeAt(lByteCount) << lBytePosition;
      lByteCount++;
    }
    lWordCount = (lByteCount - lByteCount % 4) / 4;
    lBytePosition = lByteCount % 4 * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | 0x80 << lBytePosition;
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;

    return lWordArray;
  }

  function wordToHex(lValue) {
    var wordToHexValue = '',
        wordToHexValue_temp = '',
        lByte = void 0,
        lCount = void 0;

    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = lValue >>> lCount * 8 & 255;
      wordToHexValue_temp = '0' + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
    }

    return wordToHexValue;
  }

  function utf8Encode(str) {
    str = str.replace(/\r\n/g, '\n');
    var utftext = '';

    for (var n = 0; n < str.length; n++) {
      var _c = str.charCodeAt(n);

      if (_c < 128) {
        utftext += String.fromCharCode(_c);
      } else if (_c > 127 && _c < 2048) {
        utftext += String.fromCharCode(_c >> 6 | 192);
        utftext += String.fromCharCode(_c & 63 | 128);
      } else {
        utftext += String.fromCharCode(_c >> 12 | 224);
        utftext += String.fromCharCode(_c >> 6 & 63 | 128);
        utftext += String.fromCharCode(_c & 63 | 128);
      }
    }

    return utftext;
  }

  var x = [];
  var k = void 0,
      AA = void 0,
      BB = void 0,
      CC = void 0,
      DD = void 0,
      a = void 0,
      b = void 0,
      c = void 0,
      d = void 0;
  var S11 = 7,
      S12 = 12,
      S13 = 17,
      S14 = 22;
  var S21 = 5,
      S22 = 9,
      S23 = 14,
      S24 = 20;
  var S31 = 4,
      S32 = 11,
      S33 = 16,
      S34 = 23;
  var S41 = 6,
      S42 = 10,
      S43 = 15,
      S44 = 21;

  string = utf8Encode(string);

  x = convertToWordArray(string);

  a = 0x67452301;b = 0xEFCDAB89;c = 0x98BADCFE;d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    AA = a;BB = b;CC = c;DD = d;
    a = doFF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = doFF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = doFF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = doFF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = doFF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = doFF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = doFF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = doFF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = doFF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = doFF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = doFF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = doFF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = doFF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = doFF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = doFF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = doFF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = doGG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = doGG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = doGG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = doGG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = doGG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = doGG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = doGG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = doGG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = doGG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = doGG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = doGG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = doGG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = doGG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = doGG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = doGG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = doGG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = doHH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = doHH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = doHH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = doHH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = doHH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = doHH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = doHH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = doHH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = doHH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = doHH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = doHH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = doHH(b, c, d, a, x[k + 6], S34, 0x4881D05);
    a = doHH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = doHH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = doHH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = doHH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = doII(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = doII(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = doII(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = doII(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = doII(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = doII(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = doII(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = doII(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = doII(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = doII(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = doII(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = doII(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = doII(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = doII(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = doII(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = doII(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  var temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);

  return temp.toLowerCase();
};

exports.closeMediaStream = function (stream) {
  if (!stream) {
    return;
  }

  // Latest spec states that MediaStream has no stop() method and instead must
  // call stop() on every MediaStreamTrack.
  try {
    var tracks = void 0;

    if (stream.getTracks) {
      tracks = stream.getTracks();
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = tracks[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var track = _step2.value;

          track.stop();
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    } else {
      tracks = stream.getAudioTracks();
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = tracks[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _track = _step3.value;

          _track.stop();
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      tracks = stream.getVideoTracks();
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = tracks[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var _track2 = _step4.value;

          _track2.stop();
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }
    }
  } catch (error) {
    // Deprecated by the spec, but still in use.
    // NOTE: In Temasys IE plugin stream.stop is a callable 'object'.
    if (typeof stream.stop === 'function' || _typeof(stream.stop) === 'object') {
      stream.stop();
    }
  }
};

exports.cloneArray = function (array) {
  return array && array.slice() || [];
};

},{"./Constants":2,"./Grammar":7,"./URI":25}],27:[function(require,module,exports){
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
      this._via_transport = parsed_url.scheme;
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

},{"./Grammar":7,"debug":29}],28:[function(require,module,exports){
'use strict';

var JsSIP_C = require('./Constants');
var SIPMessage = require('./SIPMessage');
var Utils = require('./Utils');
var debug = require('debug')('JsSIP:sanityCheck');

// Checks for requests and responses.
var all = [minimumHeaders];

// Checks for requests.
var requests = [rfc3261_8_2_2_1, rfc3261_16_3_4, rfc3261_18_3_request, rfc3261_8_2_2_2];

// Checks for responses.
var responses = [rfc3261_8_1_3_3, rfc3261_18_3_response];

// local variables.
var message = void 0;
var ua = void 0;
var transport = void 0;

module.exports = function (m, u, t) {
  message = m;
  ua = u;
  transport = t;

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = all[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var _check2 = _step.value;

      if (_check2() === false) {
        return false;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  if (message instanceof SIPMessage.IncomingRequest) {
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = requests[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var check = _step2.value;

        if (check() === false) {
          return false;
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }
  } else if (message instanceof SIPMessage.IncomingResponse) {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = responses[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var _check = _step3.value;

        if (_check() === false) {
          return false;
        }
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }
  }

  // Everything is OK.
  return true;
};

/*
 * Sanity Check for incoming Messages
 *
 * Requests:
 *  - _rfc3261_8_2_2_1_ Receive a Request with a non supported URI scheme
 *  - _rfc3261_16_3_4_ Receive a Request already sent by us
 *   Does not look at via sent-by but at jssip_id, which is inserted as
 *   a prefix in all initial requests generated by the ua
 *  - _rfc3261_18_3_request_ Body Content-Length
 *  - _rfc3261_8_2_2_2_ Merged Requests
 *
 * Responses:
 *  - _rfc3261_8_1_3_3_ Multiple Via headers
 *  - _rfc3261_18_3_response_ Body Content-Length
 *
 * All:
 *  - Minimum headers in a SIP message
 */

// Sanity Check functions for requests.
function rfc3261_8_2_2_1() {
  if (message.s('to').uri.scheme !== 'sip') {
    reply(416);

    return false;
  }
}

function rfc3261_16_3_4() {
  if (!message.to_tag) {
    if (message.call_id.substr(0, 5) === ua.configuration.jssip_id) {
      reply(482);

      return false;
    }
  }
}

function rfc3261_18_3_request() {
  var len = Utils.str_utf8_length(message.body);
  var contentLength = message.getHeader('content-length');

  if (len < contentLength) {
    reply(400);

    return false;
  }
}

function rfc3261_8_2_2_2() {
  var fromTag = message.from_tag;
  var call_id = message.call_id;
  var cseq = message.cseq;
  var tr = void 0;

  // Accept any in-dialog request.
  if (message.to_tag) {
    return;
  }

  // INVITE request.
  if (message.method === JsSIP_C.INVITE) {
    // If the branch matches the key of any IST then assume it is a retransmission
    // and ignore the INVITE.
    // TODO: we should reply the last response.
    if (ua._transactions.ist[message.via_branch]) {
      return false;
    }
    // Otherwise check whether it is a merged request.
    else {
        for (var transaction in ua._transactions.ist) {
          if (Object.prototype.hasOwnProperty.call(ua._transactions.ist, transaction)) {
            tr = ua._transactions.ist[transaction];
            if (tr.request.from_tag === fromTag && tr.request.call_id === call_id && tr.request.cseq === cseq) {
              reply(482);

              return false;
            }
          }
        }
      }
  }

  // Non INVITE request.

  // If the branch matches the key of any NIST then assume it is a retransmission
  // and ignore the request.
  // TODO: we should reply the last response.
  else if (ua._transactions.nist[message.via_branch]) {
      return false;
    }

    // Otherwise check whether it is a merged request.
    else {
        for (var _transaction in ua._transactions.nist) {
          if (Object.prototype.hasOwnProperty.call(ua._transactions.nist, _transaction)) {
            tr = ua._transactions.nist[_transaction];
            if (tr.request.from_tag === fromTag && tr.request.call_id === call_id && tr.request.cseq === cseq) {
              reply(482);

              return false;
            }
          }
        }
      }
}

// Sanity Check functions for responses.
function rfc3261_8_1_3_3() {
  if (message.getHeaders('via').length > 1) {
    debug('more than one Via header field present in the response, dropping the response');

    return false;
  }
}

function rfc3261_18_3_response() {
  var len = Utils.str_utf8_length(message.body),
      contentLength = message.getHeader('content-length');

  if (len < contentLength) {
    debug('message body length is lower than the value in Content-Length header field, dropping the response');

    return false;
  }
}

// Sanity Check functions for requests and responses.
function minimumHeaders() {
  var mandatoryHeaders = ['from', 'to', 'call_id', 'cseq', 'via'];

  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = mandatoryHeaders[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var header = _step4.value;

      if (!message.hasHeader(header)) {
        debug('missing mandatory header field : ' + header + ', dropping the response');

        return false;
      }
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4.return) {
        _iterator4.return();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }
}

// Reply.
function reply(status_code) {
  var vias = message.getHeaders('via');

  var to = void 0;
  var response = 'SIP/2.0 ' + status_code + ' ' + JsSIP_C.REASON_PHRASE[status_code] + '\r\n';

  var _iteratorNormalCompletion5 = true;
  var _didIteratorError5 = false;
  var _iteratorError5 = undefined;

  try {
    for (var _iterator5 = vias[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
      var via = _step5.value;

      response += 'Via: ' + via + '\r\n';
    }
  } catch (err) {
    _didIteratorError5 = true;
    _iteratorError5 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion5 && _iterator5.return) {
        _iterator5.return();
      }
    } finally {
      if (_didIteratorError5) {
        throw _iteratorError5;
      }
    }
  }

  to = message.getHeader('To');

  if (!message.to_tag) {
    to += ';tag=' + Utils.newTag();
  }

  response += 'To: ' + to + '\r\n';
  response += 'From: ' + message.getHeader('From') + '\r\n';
  response += 'Call-ID: ' + message.call_id + '\r\n';
  response += 'CSeq: ' + message.cseq + ' ' + message.method + '\r\n';
  response += '\r\n';

  transport.send(response);
}

},{"./Constants":2,"./SIPMessage":19,"./Utils":26,"debug":29}],29:[function(require,module,exports){
(function (process){
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  '#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
  '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
  '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
  '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
  '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
  '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
  '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
  '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
  '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
  '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
  '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // Internet Explorer and Edge do not support colors.
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    return false;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))
},{"./debug":30,"_process":33}],30:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * Active `debug` instances.
 */
exports.instances = [];

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  var prevTime;

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);
  debug.destroy = destroy;

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  exports.instances.push(debug);

  return debug;
}

function destroy () {
  var index = exports.instances.indexOf(this);
  if (index !== -1) {
    exports.instances.splice(index, 1);
    return true;
  } else {
    return false;
  }
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var i;
  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }

  for (i = 0; i < exports.instances.length; i++) {
    var instance = exports.instances[i];
    instance.enabled = exports.enabled(instance.namespace);
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  if (name[name.length - 1] === '*') {
    return true;
  }
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":32}],31:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],32:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],33:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],34:[function(require,module,exports){
/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';

var SDPUtils = require('sdp');

function writeMediaSection(transceiver, caps, type, stream, dtlsRole) {
  var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

  // Map ICE parameters (ufrag, pwd) to SDP.
  sdp += SDPUtils.writeIceParameters(
      transceiver.iceGatherer.getLocalParameters());

  // Map DTLS parameters to SDP.
  sdp += SDPUtils.writeDtlsParameters(
      transceiver.dtlsTransport.getLocalParameters(),
      type === 'offer' ? 'actpass' : dtlsRole || 'active');

  sdp += 'a=mid:' + transceiver.mid + '\r\n';

  if (transceiver.direction) {
    sdp += 'a=' + transceiver.direction + '\r\n';
  } else if (transceiver.rtpSender && transceiver.rtpReceiver) {
    sdp += 'a=sendrecv\r\n';
  } else if (transceiver.rtpSender) {
    sdp += 'a=sendonly\r\n';
  } else if (transceiver.rtpReceiver) {
    sdp += 'a=recvonly\r\n';
  } else {
    sdp += 'a=inactive\r\n';
  }

  if (transceiver.rtpSender) {
    // spec.
    var msid = 'msid:' + stream.id + ' ' +
        transceiver.rtpSender.track.id + '\r\n';
    sdp += 'a=' + msid;

    // for Chrome.
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
        ' ' + msid;
    if (transceiver.sendEncodingParameters[0].rtx) {
      sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
          ' ' + msid;
      sdp += 'a=ssrc-group:FID ' +
          transceiver.sendEncodingParameters[0].ssrc + ' ' +
          transceiver.sendEncodingParameters[0].rtx.ssrc +
          '\r\n';
    }
  }
  // FIXME: this should be written by writeRtpDescription.
  sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
      ' cname:' + SDPUtils.localCName + '\r\n';
  if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
        ' cname:' + SDPUtils.localCName + '\r\n';
  }
  return sdp;
}

// Edge does not like
// 1) stun: filtered after 14393 unless ?transport=udp is present
// 2) turn: that does not have all of turn:host:port?transport=udp
// 3) turn: with ipv6 addresses
// 4) turn: occurring muliple times
function filterIceServers(iceServers, edgeVersion) {
  var hasTurn = false;
  iceServers = JSON.parse(JSON.stringify(iceServers));
  return iceServers.filter(function(server) {
    if (server && (server.urls || server.url)) {
      var urls = server.urls || server.url;
      if (server.url && !server.urls) {
        console.warn('RTCIceServer.url is deprecated! Use urls instead.');
      }
      var isString = typeof urls === 'string';
      if (isString) {
        urls = [urls];
      }
      urls = urls.filter(function(url) {
        var validTurn = url.indexOf('turn:') === 0 &&
            url.indexOf('transport=udp') !== -1 &&
            url.indexOf('turn:[') === -1 &&
            !hasTurn;

        if (validTurn) {
          hasTurn = true;
          return true;
        }
        return url.indexOf('stun:') === 0 && edgeVersion >= 14393 &&
            url.indexOf('?transport=udp') === -1;
      });

      delete server.url;
      server.urls = isString ? urls[0] : urls;
      return !!urls.length;
    }
    return false;
  });
}

// Determines the intersection of local and remote capabilities.
function getCommonCapabilities(localCapabilities, remoteCapabilities) {
  var commonCapabilities = {
    codecs: [],
    headerExtensions: [],
    fecMechanisms: []
  };

  var findCodecByPayloadType = function(pt, codecs) {
    pt = parseInt(pt, 10);
    for (var i = 0; i < codecs.length; i++) {
      if (codecs[i].payloadType === pt ||
          codecs[i].preferredPayloadType === pt) {
        return codecs[i];
      }
    }
  };

  var rtxCapabilityMatches = function(lRtx, rRtx, lCodecs, rCodecs) {
    var lCodec = findCodecByPayloadType(lRtx.parameters.apt, lCodecs);
    var rCodec = findCodecByPayloadType(rRtx.parameters.apt, rCodecs);
    return lCodec && rCodec &&
        lCodec.name.toLowerCase() === rCodec.name.toLowerCase();
  };

  localCapabilities.codecs.forEach(function(lCodec) {
    for (var i = 0; i < remoteCapabilities.codecs.length; i++) {
      var rCodec = remoteCapabilities.codecs[i];
      if (lCodec.name.toLowerCase() === rCodec.name.toLowerCase() &&
          lCodec.clockRate === rCodec.clockRate) {
        if (lCodec.name.toLowerCase() === 'rtx' &&
            lCodec.parameters && rCodec.parameters.apt) {
          // for RTX we need to find the local rtx that has a apt
          // which points to the same local codec as the remote one.
          if (!rtxCapabilityMatches(lCodec, rCodec,
              localCapabilities.codecs, remoteCapabilities.codecs)) {
            continue;
          }
        }
        rCodec = JSON.parse(JSON.stringify(rCodec)); // deepcopy
        // number of channels is the highest common number of channels
        rCodec.numChannels = Math.min(lCodec.numChannels,
            rCodec.numChannels);
        // push rCodec so we reply with offerer payload type
        commonCapabilities.codecs.push(rCodec);

        // determine common feedback mechanisms
        rCodec.rtcpFeedback = rCodec.rtcpFeedback.filter(function(fb) {
          for (var j = 0; j < lCodec.rtcpFeedback.length; j++) {
            if (lCodec.rtcpFeedback[j].type === fb.type &&
                lCodec.rtcpFeedback[j].parameter === fb.parameter) {
              return true;
            }
          }
          return false;
        });
        // FIXME: also need to determine .parameters
        //  see https://github.com/openpeer/ortc/issues/569
        break;
      }
    }
  });

  localCapabilities.headerExtensions.forEach(function(lHeaderExtension) {
    for (var i = 0; i < remoteCapabilities.headerExtensions.length;
         i++) {
      var rHeaderExtension = remoteCapabilities.headerExtensions[i];
      if (lHeaderExtension.uri === rHeaderExtension.uri) {
        commonCapabilities.headerExtensions.push(rHeaderExtension);
        break;
      }
    }
  });

  // FIXME: fecMechanisms
  return commonCapabilities;
}

// is action=setLocalDescription with type allowed in signalingState
function isActionAllowedInSignalingState(action, type, signalingState) {
  return {
    offer: {
      setLocalDescription: ['stable', 'have-local-offer'],
      setRemoteDescription: ['stable', 'have-remote-offer']
    },
    answer: {
      setLocalDescription: ['have-remote-offer', 'have-local-pranswer'],
      setRemoteDescription: ['have-local-offer', 'have-remote-pranswer']
    }
  }[type][action].indexOf(signalingState) !== -1;
}

function maybeAddCandidate(iceTransport, candidate) {
  // Edge's internal representation adds some fields therefore
  // not all fieldѕ are taken into account.
  var alreadyAdded = iceTransport.getRemoteCandidates()
      .find(function(remoteCandidate) {
        return candidate.foundation === remoteCandidate.foundation &&
            candidate.ip === remoteCandidate.ip &&
            candidate.port === remoteCandidate.port &&
            candidate.priority === remoteCandidate.priority &&
            candidate.protocol === remoteCandidate.protocol &&
            candidate.type === remoteCandidate.type;
      });
  if (!alreadyAdded) {
    iceTransport.addRemoteCandidate(candidate);
  }
  return !alreadyAdded;
}

module.exports = function(window, edgeVersion) {
  var RTCPeerConnection = function(config) {
    var self = this;

    var _eventTarget = document.createDocumentFragment();
    ['addEventListener', 'removeEventListener', 'dispatchEvent']
        .forEach(function(method) {
          self[method] = _eventTarget[method].bind(_eventTarget);
        });

    this.onicecandidate = null;
    this.onaddstream = null;
    this.ontrack = null;
    this.onremovestream = null;
    this.onsignalingstatechange = null;
    this.oniceconnectionstatechange = null;
    this.onicegatheringstatechange = null;
    this.onnegotiationneeded = null;
    this.ondatachannel = null;
    this.canTrickleIceCandidates = null;

    this.needNegotiation = false;

    this.localStreams = [];
    this.remoteStreams = [];

    this.localDescription = null;
    this.remoteDescription = null;

    this.signalingState = 'stable';
    this.iceConnectionState = 'new';
    this.iceGatheringState = 'new';

    config = JSON.parse(JSON.stringify(config || {}));

    this.usingBundle = config.bundlePolicy === 'max-bundle';
    if (config.rtcpMuxPolicy === 'negotiate') {
      var e = new Error('rtcpMuxPolicy \'negotiate\' is not supported');
      e.name = 'NotSupportedError';
      throw(e);
    } else if (!config.rtcpMuxPolicy) {
      config.rtcpMuxPolicy = 'require';
    }

    switch (config.iceTransportPolicy) {
      case 'all':
      case 'relay':
        break;
      default:
        config.iceTransportPolicy = 'all';
        break;
    }

    switch (config.bundlePolicy) {
      case 'balanced':
      case 'max-compat':
      case 'max-bundle':
        break;
      default:
        config.bundlePolicy = 'balanced';
        break;
    }

    config.iceServers = filterIceServers(config.iceServers || [], edgeVersion);

    this._iceGatherers = [];
    if (config.iceCandidatePoolSize) {
      for (var i = config.iceCandidatePoolSize; i > 0; i--) {
        this._iceGatherers = new window.RTCIceGatherer({
          iceServers: config.iceServers,
          gatherPolicy: config.iceTransportPolicy
        });
      }
    } else {
      config.iceCandidatePoolSize = 0;
    }

    this._config = config;

    // per-track iceGathers, iceTransports, dtlsTransports, rtpSenders, ...
    // everything that is needed to describe a SDP m-line.
    this.transceivers = [];

    this._sdpSessionId = SDPUtils.generateSessionId();
    this._sdpSessionVersion = 0;

    this._dtlsRole = undefined; // role for a=setup to use in answers.
  };

  RTCPeerConnection.prototype._emitGatheringStateChange = function() {
    var event = new Event('icegatheringstatechange');
    this.dispatchEvent(event);
    if (typeof this.onicegatheringstatechange === 'function') {
      this.onicegatheringstatechange(event);
    }
  };

  RTCPeerConnection.prototype.getConfiguration = function() {
    return this._config;
  };

  RTCPeerConnection.prototype.getLocalStreams = function() {
    return this.localStreams;
  };

  RTCPeerConnection.prototype.getRemoteStreams = function() {
    return this.remoteStreams;
  };

  // internal helper to create a transceiver object.
  // (whih is not yet the same as the WebRTC 1.0 transceiver)
  RTCPeerConnection.prototype._createTransceiver = function(kind) {
    var hasBundleTransport = this.transceivers.length > 0;
    var transceiver = {
      track: null,
      iceGatherer: null,
      iceTransport: null,
      dtlsTransport: null,
      localCapabilities: null,
      remoteCapabilities: null,
      rtpSender: null,
      rtpReceiver: null,
      kind: kind,
      mid: null,
      sendEncodingParameters: null,
      recvEncodingParameters: null,
      stream: null,
      wantReceive: true
    };
    if (this.usingBundle && hasBundleTransport) {
      transceiver.iceTransport = this.transceivers[0].iceTransport;
      transceiver.dtlsTransport = this.transceivers[0].dtlsTransport;
    } else {
      var transports = this._createIceAndDtlsTransports();
      transceiver.iceTransport = transports.iceTransport;
      transceiver.dtlsTransport = transports.dtlsTransport;
    }
    this.transceivers.push(transceiver);
    return transceiver;
  };

  RTCPeerConnection.prototype.addTrack = function(track, stream) {
    var transceiver;
    for (var i = 0; i < this.transceivers.length; i++) {
      if (!this.transceivers[i].track &&
          this.transceivers[i].kind === track.kind) {
        transceiver = this.transceivers[i];
      }
    }
    if (!transceiver) {
      transceiver = this._createTransceiver(track.kind);
    }

    this._maybeFireNegotiationNeeded();

    if (this.localStreams.indexOf(stream) === -1) {
      this.localStreams.push(stream);
    }

    transceiver.track = track;
    transceiver.stream = stream;
    transceiver.rtpSender = new window.RTCRtpSender(track,
        transceiver.dtlsTransport);
    return transceiver.rtpSender;
  };

  RTCPeerConnection.prototype.addStream = function(stream) {
    var self = this;
    if (edgeVersion >= 15025) {
      stream.getTracks().forEach(function(track) {
        self.addTrack(track, stream);
      });
    } else {
      // Clone is necessary for local demos mostly, attaching directly
      // to two different senders does not work (build 10547).
      // Fixed in 15025 (or earlier)
      var clonedStream = stream.clone();
      stream.getTracks().forEach(function(track, idx) {
        var clonedTrack = clonedStream.getTracks()[idx];
        track.addEventListener('enabled', function(event) {
          clonedTrack.enabled = event.enabled;
        });
      });
      clonedStream.getTracks().forEach(function(track) {
        self.addTrack(track, clonedStream);
      });
    }
  };

  RTCPeerConnection.prototype.removeStream = function(stream) {
    var idx = this.localStreams.indexOf(stream);
    if (idx > -1) {
      this.localStreams.splice(idx, 1);
      this._maybeFireNegotiationNeeded();
    }
  };

  RTCPeerConnection.prototype.getSenders = function() {
    return this.transceivers.filter(function(transceiver) {
      return !!transceiver.rtpSender;
    })
    .map(function(transceiver) {
      return transceiver.rtpSender;
    });
  };

  RTCPeerConnection.prototype.getReceivers = function() {
    return this.transceivers.filter(function(transceiver) {
      return !!transceiver.rtpReceiver;
    })
    .map(function(transceiver) {
      return transceiver.rtpReceiver;
    });
  };


  RTCPeerConnection.prototype._createIceGatherer = function(sdpMLineIndex,
      usingBundle) {
    var self = this;
    if (usingBundle && sdpMLineIndex > 0) {
      return this.transceivers[0].iceGatherer;
    } else if (this._iceGatherers.length) {
      return this._iceGatherers.shift();
    }
    var iceGatherer = new window.RTCIceGatherer({
      iceServers: this._config.iceServers,
      gatherPolicy: this._config.iceTransportPolicy
    });
    Object.defineProperty(iceGatherer, 'state',
        {value: 'new', writable: true}
    );

    this.transceivers[sdpMLineIndex].candidates = [];
    this.transceivers[sdpMLineIndex].bufferCandidates = function(event) {
      var end = !event.candidate || Object.keys(event.candidate).length === 0;
      // polyfill since RTCIceGatherer.state is not implemented in
      // Edge 10547 yet.
      iceGatherer.state = end ? 'completed' : 'gathering';
      if (self.transceivers[sdpMLineIndex].candidates !== null) {
        self.transceivers[sdpMLineIndex].candidates.push(event.candidate);
      }
    };
    iceGatherer.addEventListener('localcandidate',
      this.transceivers[sdpMLineIndex].bufferCandidates);
    return iceGatherer;
  };

  // start gathering from an RTCIceGatherer.
  RTCPeerConnection.prototype._gather = function(mid, sdpMLineIndex) {
    var self = this;
    var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
    if (iceGatherer.onlocalcandidate) {
      return;
    }
    var candidates = this.transceivers[sdpMLineIndex].candidates;
    this.transceivers[sdpMLineIndex].candidates = null;
    iceGatherer.removeEventListener('localcandidate',
      this.transceivers[sdpMLineIndex].bufferCandidates);
    iceGatherer.onlocalcandidate = function(evt) {
      if (self.usingBundle && sdpMLineIndex > 0) {
        // if we know that we use bundle we can drop candidates with
        // ѕdpMLineIndex > 0. If we don't do this then our state gets
        // confused since we dispose the extra ice gatherer.
        return;
      }
      var event = new Event('icecandidate');
      event.candidate = {sdpMid: mid, sdpMLineIndex: sdpMLineIndex};

      var cand = evt.candidate;
      // Edge emits an empty object for RTCIceCandidateComplete‥
      var end = !cand || Object.keys(cand).length === 0;
      if (end) {
        // polyfill since RTCIceGatherer.state is not implemented in
        // Edge 10547 yet.
        if (iceGatherer.state === 'new' || iceGatherer.state === 'gathering') {
          iceGatherer.state = 'completed';
        }
      } else {
        if (iceGatherer.state === 'new') {
          iceGatherer.state = 'gathering';
        }
        // RTCIceCandidate doesn't have a component, needs to be added
        cand.component = 1;
        event.candidate.candidate = SDPUtils.writeCandidate(cand);
      }

      // update local description.
      var sections = SDPUtils.splitSections(self.localDescription.sdp);
      if (!end) {
        sections[event.candidate.sdpMLineIndex + 1] +=
            'a=' + event.candidate.candidate + '\r\n';
      } else {
        sections[event.candidate.sdpMLineIndex + 1] +=
            'a=end-of-candidates\r\n';
      }
      self.localDescription.sdp = sections.join('');
      var complete = self.transceivers.every(function(transceiver) {
        return transceiver.iceGatherer &&
            transceiver.iceGatherer.state === 'completed';
      });

      if (self.iceGatheringState !== 'gathering') {
        self.iceGatheringState = 'gathering';
        self._emitGatheringStateChange();
      }

      // Emit candidate. Also emit null candidate when all gatherers are
      // complete.
      if (!end) {
        self.dispatchEvent(event);
        if (typeof self.onicecandidate === 'function') {
          self.onicecandidate(event);
        }
      }
      if (complete) {
        self.dispatchEvent(new Event('icecandidate'));
        if (typeof self.onicecandidate === 'function') {
          self.onicecandidate(new Event('icecandidate'));
        }
        self.iceGatheringState = 'complete';
        self._emitGatheringStateChange();
      }
    };

    // emit already gathered candidates.
    window.setTimeout(function() {
      candidates.forEach(function(candidate) {
        var e = new Event('RTCIceGatherEvent');
        e.candidate = candidate;
        iceGatherer.onlocalcandidate(e);
      });
    }, 0);
  };

  // Create ICE transport and DTLS transport.
  RTCPeerConnection.prototype._createIceAndDtlsTransports = function() {
    var self = this;
    var iceTransport = new window.RTCIceTransport(null);
    iceTransport.onicestatechange = function() {
      self._updateConnectionState();
    };

    var dtlsTransport = new window.RTCDtlsTransport(iceTransport);
    dtlsTransport.ondtlsstatechange = function() {
      self._updateConnectionState();
    };
    dtlsTransport.onerror = function() {
      // onerror does not set state to failed by itself.
      Object.defineProperty(dtlsTransport, 'state',
          {value: 'failed', writable: true});
      self._updateConnectionState();
    };

    return {
      iceTransport: iceTransport,
      dtlsTransport: dtlsTransport
    };
  };

  // Destroy ICE gatherer, ICE transport and DTLS transport.
  // Without triggering the callbacks.
  RTCPeerConnection.prototype._disposeIceAndDtlsTransports = function(
      sdpMLineIndex) {
    var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
    if (iceGatherer) {
      delete iceGatherer.onlocalcandidate;
      delete this.transceivers[sdpMLineIndex].iceGatherer;
    }
    var iceTransport = this.transceivers[sdpMLineIndex].iceTransport;
    if (iceTransport) {
      delete iceTransport.onicestatechange;
      delete this.transceivers[sdpMLineIndex].iceTransport;
    }
    var dtlsTransport = this.transceivers[sdpMLineIndex].dtlsTransport;
    if (dtlsTransport) {
      delete dtlsTransport.ondtlsstatechange;
      delete dtlsTransport.onerror;
      delete this.transceivers[sdpMLineIndex].dtlsTransport;
    }
  };

  // Start the RTP Sender and Receiver for a transceiver.
  RTCPeerConnection.prototype._transceive = function(transceiver,
      send, recv) {
    var params = getCommonCapabilities(transceiver.localCapabilities,
        transceiver.remoteCapabilities);
    if (send && transceiver.rtpSender) {
      params.encodings = transceiver.sendEncodingParameters;
      params.rtcp = {
        cname: SDPUtils.localCName,
        compound: transceiver.rtcpParameters.compound
      };
      if (transceiver.recvEncodingParameters.length) {
        params.rtcp.ssrc = transceiver.recvEncodingParameters[0].ssrc;
      }
      transceiver.rtpSender.send(params);
    }
    if (recv && transceiver.rtpReceiver && params.codecs.length > 0) {
      // remove RTX field in Edge 14942
      if (transceiver.kind === 'video'
          && transceiver.recvEncodingParameters
          && edgeVersion < 15019) {
        transceiver.recvEncodingParameters.forEach(function(p) {
          delete p.rtx;
        });
      }
      params.encodings = transceiver.recvEncodingParameters;
      params.rtcp = {
        cname: transceiver.rtcpParameters.cname,
        compound: transceiver.rtcpParameters.compound
      };
      if (transceiver.sendEncodingParameters.length) {
        params.rtcp.ssrc = transceiver.sendEncodingParameters[0].ssrc;
      }
      transceiver.rtpReceiver.receive(params);
    }
  };

  RTCPeerConnection.prototype.setLocalDescription = function(description) {
    var self = this;
    var args = arguments;

    if (!isActionAllowedInSignalingState('setLocalDescription',
        description.type, this.signalingState)) {
      return new Promise(function(resolve, reject) {
        var e = new Error('Can not set local ' + description.type +
            ' in state ' + self.signalingState);
        e.name = 'InvalidStateError';
        if (args.length > 2 && typeof args[2] === 'function') {
          args[2].apply(null, [e]);
        }
        reject(e);
      });
    }

    var sections;
    var sessionpart;
    if (description.type === 'offer') {
      // VERY limited support for SDP munging. Limited to:
      // * changing the order of codecs
      sections = SDPUtils.splitSections(description.sdp);
      sessionpart = sections.shift();
      sections.forEach(function(mediaSection, sdpMLineIndex) {
        var caps = SDPUtils.parseRtpParameters(mediaSection);
        self.transceivers[sdpMLineIndex].localCapabilities = caps;
      });

      this.transceivers.forEach(function(transceiver, sdpMLineIndex) {
        self._gather(transceiver.mid, sdpMLineIndex);
      });
    } else if (description.type === 'answer') {
      sections = SDPUtils.splitSections(self.remoteDescription.sdp);
      sessionpart = sections.shift();
      var isIceLite = SDPUtils.matchPrefix(sessionpart,
          'a=ice-lite').length > 0;
      sections.forEach(function(mediaSection, sdpMLineIndex) {
        var transceiver = self.transceivers[sdpMLineIndex];
        var iceGatherer = transceiver.iceGatherer;
        var iceTransport = transceiver.iceTransport;
        var dtlsTransport = transceiver.dtlsTransport;
        var localCapabilities = transceiver.localCapabilities;
        var remoteCapabilities = transceiver.remoteCapabilities;

        // treat bundle-only as not-rejected.
        var rejected = SDPUtils.isRejected(mediaSection) &&
            !SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 1;

        if (!rejected && !transceiver.isDatachannel) {
          var remoteIceParameters = SDPUtils.getIceParameters(
              mediaSection, sessionpart);
          var remoteDtlsParameters = SDPUtils.getDtlsParameters(
              mediaSection, sessionpart);
          if (isIceLite) {
            remoteDtlsParameters.role = 'server';
          }

          if (!self.usingBundle || sdpMLineIndex === 0) {
            self._gather(transceiver.mid, sdpMLineIndex);
            if (iceTransport.state === 'new') {
              iceTransport.start(iceGatherer, remoteIceParameters,
                  isIceLite ? 'controlling' : 'controlled');
            }
            if (dtlsTransport.state === 'new') {
              dtlsTransport.start(remoteDtlsParameters);
            }
          }

          // Calculate intersection of capabilities.
          var params = getCommonCapabilities(localCapabilities,
              remoteCapabilities);

          // Start the RTCRtpSender. The RTCRtpReceiver for this
          // transceiver has already been started in setRemoteDescription.
          self._transceive(transceiver,
              params.codecs.length > 0,
              false);
        }
      });
    }

    this.localDescription = {
      type: description.type,
      sdp: description.sdp
    };
    switch (description.type) {
      case 'offer':
        this._updateSignalingState('have-local-offer');
        break;
      case 'answer':
        this._updateSignalingState('stable');
        break;
      default:
        throw new TypeError('unsupported type "' + description.type +
            '"');
    }

    // If a success callback was provided, emit ICE candidates after it
    // has been executed. Otherwise, emit callback after the Promise is
    // resolved.
    var cb = arguments.length > 1 && typeof arguments[1] === 'function' &&
        arguments[1];
    return new Promise(function(resolve) {
      if (cb) {
        cb.apply(null);
      }
      resolve();
    });
  };

  RTCPeerConnection.prototype.setRemoteDescription = function(description) {
    var self = this;
    var args = arguments;

    if (!isActionAllowedInSignalingState('setRemoteDescription',
        description.type, this.signalingState)) {
      return new Promise(function(resolve, reject) {
        var e = new Error('Can not set remote ' + description.type +
            ' in state ' + self.signalingState);
        e.name = 'InvalidStateError';
        if (args.length > 2 && typeof args[2] === 'function') {
          args[2].apply(null, [e]);
        }
        reject(e);
      });
    }

    var streams = {};
    this.remoteStreams.forEach(function(stream) {
      streams[stream.id] = stream;
    });
    var receiverList = [];
    var sections = SDPUtils.splitSections(description.sdp);
    var sessionpart = sections.shift();
    var isIceLite = SDPUtils.matchPrefix(sessionpart,
        'a=ice-lite').length > 0;
    var usingBundle = SDPUtils.matchPrefix(sessionpart,
        'a=group:BUNDLE ').length > 0;
    this.usingBundle = usingBundle;
    var iceOptions = SDPUtils.matchPrefix(sessionpart,
        'a=ice-options:')[0];
    if (iceOptions) {
      this.canTrickleIceCandidates = iceOptions.substr(14).split(' ')
          .indexOf('trickle') >= 0;
    } else {
      this.canTrickleIceCandidates = false;
    }

    sections.forEach(function(mediaSection, sdpMLineIndex) {
      var lines = SDPUtils.splitLines(mediaSection);
      var kind = SDPUtils.getKind(mediaSection);
      // treat bundle-only as not-rejected.
      var rejected = SDPUtils.isRejected(mediaSection) &&
          !SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 1;
      var protocol = lines[0].substr(2).split(' ')[2];

      var direction = SDPUtils.getDirection(mediaSection, sessionpart);
      var remoteMsid = SDPUtils.parseMsid(mediaSection);

      var mid = SDPUtils.getMid(mediaSection) || SDPUtils.generateIdentifier();

      // Reject datachannels which are not implemented yet.
      if (kind === 'application' && protocol === 'DTLS/SCTP') {
        self.transceivers[sdpMLineIndex] = {
          mid: mid,
          isDatachannel: true
        };
        return;
      }

      var transceiver;
      var iceGatherer;
      var iceTransport;
      var dtlsTransport;
      var rtpReceiver;
      var sendEncodingParameters;
      var recvEncodingParameters;
      var localCapabilities;

      var track;
      // FIXME: ensure the mediaSection has rtcp-mux set.
      var remoteCapabilities = SDPUtils.parseRtpParameters(mediaSection);
      var remoteIceParameters;
      var remoteDtlsParameters;
      if (!rejected) {
        remoteIceParameters = SDPUtils.getIceParameters(mediaSection,
            sessionpart);
        remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection,
            sessionpart);
        remoteDtlsParameters.role = 'client';
      }
      recvEncodingParameters =
          SDPUtils.parseRtpEncodingParameters(mediaSection);

      var rtcpParameters = SDPUtils.parseRtcpParameters(mediaSection);

      var isComplete = SDPUtils.matchPrefix(mediaSection,
          'a=end-of-candidates', sessionpart).length > 0;
      var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:')
          .map(function(cand) {
            return SDPUtils.parseCandidate(cand);
          })
          .filter(function(cand) {
            return cand.component === 1;
          });

      // Check if we can use BUNDLE and dispose transports.
      if ((description.type === 'offer' || description.type === 'answer') &&
          !rejected && usingBundle && sdpMLineIndex > 0 &&
          self.transceivers[sdpMLineIndex]) {
        self._disposeIceAndDtlsTransports(sdpMLineIndex);
        self.transceivers[sdpMLineIndex].iceGatherer =
            self.transceivers[0].iceGatherer;
        self.transceivers[sdpMLineIndex].iceTransport =
            self.transceivers[0].iceTransport;
        self.transceivers[sdpMLineIndex].dtlsTransport =
            self.transceivers[0].dtlsTransport;
        if (self.transceivers[sdpMLineIndex].rtpSender) {
          self.transceivers[sdpMLineIndex].rtpSender.setTransport(
              self.transceivers[0].dtlsTransport);
        }
        if (self.transceivers[sdpMLineIndex].rtpReceiver) {
          self.transceivers[sdpMLineIndex].rtpReceiver.setTransport(
              self.transceivers[0].dtlsTransport);
        }
      }
      if (description.type === 'offer' && !rejected) {
        transceiver = self.transceivers[sdpMLineIndex] ||
            self._createTransceiver(kind);
        transceiver.mid = mid;

        if (!transceiver.iceGatherer) {
          transceiver.iceGatherer = self._createIceGatherer(sdpMLineIndex,
              usingBundle);
        }

        if (cands.length && transceiver.iceTransport.state === 'new') {
          if (isComplete && (!usingBundle || sdpMLineIndex === 0)) {
            transceiver.iceTransport.setRemoteCandidates(cands);
          } else {
            cands.forEach(function(candidate) {
              maybeAddCandidate(transceiver.iceTransport, candidate);
            });
          }
        }

        localCapabilities = window.RTCRtpReceiver.getCapabilities(kind);

        // filter RTX until additional stuff needed for RTX is implemented
        // in adapter.js
        if (edgeVersion < 15019) {
          localCapabilities.codecs = localCapabilities.codecs.filter(
              function(codec) {
                return codec.name !== 'rtx';
              });
        }

        sendEncodingParameters = transceiver.sendEncodingParameters || [{
          ssrc: (2 * sdpMLineIndex + 2) * 1001
        }];

        var isNewTrack = false;
        if (direction === 'sendrecv' || direction === 'sendonly') {
          isNewTrack = !transceiver.rtpReceiver;
          rtpReceiver = transceiver.rtpReceiver ||
              new window.RTCRtpReceiver(transceiver.dtlsTransport, kind);

          if (isNewTrack) {
            var stream;
            track = rtpReceiver.track;
            // FIXME: does not work with Plan B.
            if (remoteMsid) {
              if (!streams[remoteMsid.stream]) {
                streams[remoteMsid.stream] = new window.MediaStream();
                Object.defineProperty(streams[remoteMsid.stream], 'id', {
                  get: function() {
                    return remoteMsid.stream;
                  }
                });
              }
              Object.defineProperty(track, 'id', {
                get: function() {
                  return remoteMsid.track;
                }
              });
              stream = streams[remoteMsid.stream];
            } else {
              if (!streams.default) {
                streams.default = new window.MediaStream();
              }
              stream = streams.default;
            }
            stream.addTrack(track);
            receiverList.push([track, rtpReceiver, stream]);
          }
        }

        transceiver.localCapabilities = localCapabilities;
        transceiver.remoteCapabilities = remoteCapabilities;
        transceiver.rtpReceiver = rtpReceiver;
        transceiver.rtcpParameters = rtcpParameters;
        transceiver.sendEncodingParameters = sendEncodingParameters;
        transceiver.recvEncodingParameters = recvEncodingParameters;

        // Start the RTCRtpReceiver now. The RTPSender is started in
        // setLocalDescription.
        self._transceive(self.transceivers[sdpMLineIndex],
            false,
            isNewTrack);
      } else if (description.type === 'answer' && !rejected) {
        transceiver = self.transceivers[sdpMLineIndex];
        iceGatherer = transceiver.iceGatherer;
        iceTransport = transceiver.iceTransport;
        dtlsTransport = transceiver.dtlsTransport;
        rtpReceiver = transceiver.rtpReceiver;
        sendEncodingParameters = transceiver.sendEncodingParameters;
        localCapabilities = transceiver.localCapabilities;

        self.transceivers[sdpMLineIndex].recvEncodingParameters =
            recvEncodingParameters;
        self.transceivers[sdpMLineIndex].remoteCapabilities =
            remoteCapabilities;
        self.transceivers[sdpMLineIndex].rtcpParameters = rtcpParameters;

        if (cands.length && iceTransport.state === 'new') {
          if ((isIceLite || isComplete) &&
              (!usingBundle || sdpMLineIndex === 0)) {
            iceTransport.setRemoteCandidates(cands);
          } else {
            cands.forEach(function(candidate) {
              maybeAddCandidate(transceiver.iceTransport, candidate);
            });
          }
        }

        if (!usingBundle || sdpMLineIndex === 0) {
          if (iceTransport.state === 'new') {
            iceTransport.start(iceGatherer, remoteIceParameters,
                'controlling');
          }
          if (dtlsTransport.state === 'new') {
            dtlsTransport.start(remoteDtlsParameters);
          }
        }

        self._transceive(transceiver,
            direction === 'sendrecv' || direction === 'recvonly',
            direction === 'sendrecv' || direction === 'sendonly');

        if (rtpReceiver &&
            (direction === 'sendrecv' || direction === 'sendonly')) {
          track = rtpReceiver.track;
          if (remoteMsid) {
            if (!streams[remoteMsid.stream]) {
              streams[remoteMsid.stream] = new window.MediaStream();
            }
            streams[remoteMsid.stream].addTrack(track);
            receiverList.push([track, rtpReceiver, streams[remoteMsid.stream]]);
          } else {
            if (!streams.default) {
              streams.default = new window.MediaStream();
            }
            streams.default.addTrack(track);
            receiverList.push([track, rtpReceiver, streams.default]);
          }
        } else {
          // FIXME: actually the receiver should be created later.
          delete transceiver.rtpReceiver;
        }
      }
    });

    if (this._dtlsRole === undefined) {
      this._dtlsRole = description.type === 'offer' ? 'active' : 'passive';
    }

    this.remoteDescription = {
      type: description.type,
      sdp: description.sdp
    };
    switch (description.type) {
      case 'offer':
        this._updateSignalingState('have-remote-offer');
        break;
      case 'answer':
        this._updateSignalingState('stable');
        break;
      default:
        throw new TypeError('unsupported type "' + description.type +
            '"');
    }
    Object.keys(streams).forEach(function(sid) {
      var stream = streams[sid];
      if (stream.getTracks().length) {
        if (self.remoteStreams.indexOf(stream) === -1) {
          self.remoteStreams.push(stream);
          var event = new Event('addstream');
          event.stream = stream;
          window.setTimeout(function() {
            self.dispatchEvent(event);
            if (typeof self.onaddstream === 'function') {
              self.onaddstream(event);
            }
          });
        }

        receiverList.forEach(function(item) {
          var track = item[0];
          var receiver = item[1];
          if (stream.id !== item[2].id) {
            return;
          }
          var trackEvent = new Event('track');
          trackEvent.track = track;
          trackEvent.receiver = receiver;
          trackEvent.transceiver = {receiver: receiver};
          trackEvent.streams = [stream];
          window.setTimeout(function() {
            self.dispatchEvent(trackEvent);
            if (typeof self.ontrack === 'function') {
              self.ontrack(trackEvent);
            }
          });
        });
      }
    });

    // check whether addIceCandidate({}) was called within four seconds after
    // setRemoteDescription.
    window.setTimeout(function() {
      if (!(self && self.transceivers)) {
        return;
      }
      self.transceivers.forEach(function(transceiver) {
        if (transceiver.iceTransport &&
            transceiver.iceTransport.state === 'new' &&
            transceiver.iceTransport.getRemoteCandidates().length > 0) {
          console.warn('Timeout for addRemoteCandidate. Consider sending ' +
              'an end-of-candidates notification');
          transceiver.iceTransport.addRemoteCandidate({});
        }
      });
    }, 4000);

    return new Promise(function(resolve) {
      if (args.length > 1 && typeof args[1] === 'function') {
        args[1].apply(null);
      }
      resolve();
    });
  };

  RTCPeerConnection.prototype.close = function() {
    this.transceivers.forEach(function(transceiver) {
      /* not yet
      if (transceiver.iceGatherer) {
        transceiver.iceGatherer.close();
      }
      */
      if (transceiver.iceTransport) {
        transceiver.iceTransport.stop();
      }
      if (transceiver.dtlsTransport) {
        transceiver.dtlsTransport.stop();
      }
      if (transceiver.rtpSender) {
        transceiver.rtpSender.stop();
      }
      if (transceiver.rtpReceiver) {
        transceiver.rtpReceiver.stop();
      }
    });
    // FIXME: clean up tracks, local streams, remote streams, etc
    this._updateSignalingState('closed');
  };

  // Update the signaling state.
  RTCPeerConnection.prototype._updateSignalingState = function(newState) {
    this.signalingState = newState;
    var event = new Event('signalingstatechange');
    this.dispatchEvent(event);
    if (typeof this.onsignalingstatechange === 'function') {
      this.onsignalingstatechange(event);
    }
  };

  // Determine whether to fire the negotiationneeded event.
  RTCPeerConnection.prototype._maybeFireNegotiationNeeded = function() {
    var self = this;
    if (this.signalingState !== 'stable' || this.needNegotiation === true) {
      return;
    }
    this.needNegotiation = true;
    window.setTimeout(function() {
      if (self.needNegotiation === false) {
        return;
      }
      self.needNegotiation = false;
      var event = new Event('negotiationneeded');
      self.dispatchEvent(event);
      if (typeof self.onnegotiationneeded === 'function') {
        self.onnegotiationneeded(event);
      }
    }, 0);
  };

  // Update the connection state.
  RTCPeerConnection.prototype._updateConnectionState = function() {
    var newState;
    var states = {
      'new': 0,
      closed: 0,
      connecting: 0,
      checking: 0,
      connected: 0,
      completed: 0,
      disconnected: 0,
      failed: 0
    };
    this.transceivers.forEach(function(transceiver) {
      states[transceiver.iceTransport.state]++;
      states[transceiver.dtlsTransport.state]++;
    });
    // ICETransport.completed and connected are the same for this purpose.
    states.connected += states.completed;

    newState = 'new';
    if (states.failed > 0) {
      newState = 'failed';
    } else if (states.connecting > 0 || states.checking > 0) {
      newState = 'connecting';
    } else if (states.disconnected > 0) {
      newState = 'disconnected';
    } else if (states.new > 0) {
      newState = 'new';
    } else if (states.connected > 0 || states.completed > 0) {
      newState = 'connected';
    }

    if (newState !== this.iceConnectionState) {
      this.iceConnectionState = newState;
      var event = new Event('iceconnectionstatechange');
      this.dispatchEvent(event);
      if (typeof this.oniceconnectionstatechange === 'function') {
        this.oniceconnectionstatechange(event);
      }
    }
  };

  RTCPeerConnection.prototype.createOffer = function() {
    var self = this;
    var args = arguments;

    var offerOptions;
    if (arguments.length === 1 && typeof arguments[0] !== 'function') {
      offerOptions = arguments[0];
    } else if (arguments.length === 3) {
      offerOptions = arguments[2];
    }

    var numAudioTracks = this.transceivers.filter(function(t) {
      return t.kind === 'audio';
    }).length;
    var numVideoTracks = this.transceivers.filter(function(t) {
      return t.kind === 'video';
    }).length;

    // Determine number of audio and video tracks we need to send/recv.
    if (offerOptions) {
      // Reject Chrome legacy constraints.
      if (offerOptions.mandatory || offerOptions.optional) {
        throw new TypeError(
            'Legacy mandatory/optional constraints not supported.');
      }
      if (offerOptions.offerToReceiveAudio !== undefined) {
        if (offerOptions.offerToReceiveAudio === true) {
          numAudioTracks = 1;
        } else if (offerOptions.offerToReceiveAudio === false) {
          numAudioTracks = 0;
        } else {
          numAudioTracks = offerOptions.offerToReceiveAudio;
        }
      }
      if (offerOptions.offerToReceiveVideo !== undefined) {
        if (offerOptions.offerToReceiveVideo === true) {
          numVideoTracks = 1;
        } else if (offerOptions.offerToReceiveVideo === false) {
          numVideoTracks = 0;
        } else {
          numVideoTracks = offerOptions.offerToReceiveVideo;
        }
      }
    }

    this.transceivers.forEach(function(transceiver) {
      if (transceiver.kind === 'audio') {
        numAudioTracks--;
        if (numAudioTracks < 0) {
          transceiver.wantReceive = false;
        }
      } else if (transceiver.kind === 'video') {
        numVideoTracks--;
        if (numVideoTracks < 0) {
          transceiver.wantReceive = false;
        }
      }
    });

    // Create M-lines for recvonly streams.
    while (numAudioTracks > 0 || numVideoTracks > 0) {
      if (numAudioTracks > 0) {
        this._createTransceiver('audio');
        numAudioTracks--;
      }
      if (numVideoTracks > 0) {
        this._createTransceiver('video');
        numVideoTracks--;
      }
    }

    var sdp = SDPUtils.writeSessionBoilerplate(this._sdpSessionId,
        this._sdpSessionVersion++);
    this.transceivers.forEach(function(transceiver, sdpMLineIndex) {
      // For each track, create an ice gatherer, ice transport,
      // dtls transport, potentially rtpsender and rtpreceiver.
      var track = transceiver.track;
      var kind = transceiver.kind;
      var mid = SDPUtils.generateIdentifier();
      transceiver.mid = mid;

      if (!transceiver.iceGatherer) {
        transceiver.iceGatherer = self._createIceGatherer(sdpMLineIndex,
            self.usingBundle);
      }

      var localCapabilities = window.RTCRtpSender.getCapabilities(kind);
      // filter RTX until additional stuff needed for RTX is implemented
      // in adapter.js
      if (edgeVersion < 15019) {
        localCapabilities.codecs = localCapabilities.codecs.filter(
            function(codec) {
              return codec.name !== 'rtx';
            });
      }
      localCapabilities.codecs.forEach(function(codec) {
        // work around https://bugs.chromium.org/p/webrtc/issues/detail?id=6552
        // by adding level-asymmetry-allowed=1
        if (codec.name === 'H264' &&
            codec.parameters['level-asymmetry-allowed'] === undefined) {
          codec.parameters['level-asymmetry-allowed'] = '1';
        }
      });

      // generate an ssrc now, to be used later in rtpSender.send
      var sendEncodingParameters = transceiver.sendEncodingParameters || [{
        ssrc: (2 * sdpMLineIndex + 1) * 1001
      }];
      if (track) {
        // add RTX
        if (edgeVersion >= 15019 && kind === 'video' &&
            !sendEncodingParameters[0].rtx) {
          sendEncodingParameters[0].rtx = {
            ssrc: sendEncodingParameters[0].ssrc + 1
          };
        }
      }

      if (transceiver.wantReceive) {
        transceiver.rtpReceiver = new window.RTCRtpReceiver(
            transceiver.dtlsTransport, kind);
      }

      transceiver.localCapabilities = localCapabilities;
      transceiver.sendEncodingParameters = sendEncodingParameters;
    });

    // always offer BUNDLE and dispose on return if not supported.
    if (this._config.bundlePolicy !== 'max-compat') {
      sdp += 'a=group:BUNDLE ' + this.transceivers.map(function(t) {
        return t.mid;
      }).join(' ') + '\r\n';
    }
    sdp += 'a=ice-options:trickle\r\n';

    this.transceivers.forEach(function(transceiver, sdpMLineIndex) {
      sdp += writeMediaSection(transceiver, transceiver.localCapabilities,
          'offer', transceiver.stream, self._dtlsRole);
      sdp += 'a=rtcp-rsize\r\n';

      if (transceiver.iceGatherer && self.iceGatheringState !== 'new' &&
          (sdpMLineIndex === 0 || !self.usingBundle)) {
        transceiver.iceGatherer.getLocalCandidates().forEach(function(cand) {
          cand.component = 1;
          sdp += 'a=' + SDPUtils.writeCandidate(cand) + '\r\n';
        });

        if (transceiver.iceGatherer.state === 'completed') {
          sdp += 'a=end-of-candidates\r\n';
        }
      }
    });

    var desc = new window.RTCSessionDescription({
      type: 'offer',
      sdp: sdp
    });
    return new Promise(function(resolve) {
      if (args.length > 0 && typeof args[0] === 'function') {
        args[0].apply(null, [desc]);
        resolve();
        return;
      }
      resolve(desc);
    });
  };

  RTCPeerConnection.prototype.createAnswer = function() {
    var self = this;
    var args = arguments;

    var sdp = SDPUtils.writeSessionBoilerplate(this._sdpSessionId,
        this._sdpSessionVersion++);
    if (this.usingBundle) {
      sdp += 'a=group:BUNDLE ' + this.transceivers.map(function(t) {
        return t.mid;
      }).join(' ') + '\r\n';
    }
    var mediaSectionsInOffer = SDPUtils.splitSections(
        this.remoteDescription.sdp).length - 1;
    this.transceivers.forEach(function(transceiver, sdpMLineIndex) {
      if (sdpMLineIndex + 1 > mediaSectionsInOffer) {
        return;
      }
      if (transceiver.isDatachannel) {
        sdp += 'm=application 0 DTLS/SCTP 5000\r\n' +
            'c=IN IP4 0.0.0.0\r\n' +
            'a=mid:' + transceiver.mid + '\r\n';
        return;
      }

      // FIXME: look at direction.
      if (transceiver.stream) {
        var localTrack;
        if (transceiver.kind === 'audio') {
          localTrack = transceiver.stream.getAudioTracks()[0];
        } else if (transceiver.kind === 'video') {
          localTrack = transceiver.stream.getVideoTracks()[0];
        }
        if (localTrack) {
          // add RTX
          if (edgeVersion >= 15019 && transceiver.kind === 'video' &&
              !transceiver.sendEncodingParameters[0].rtx) {
            transceiver.sendEncodingParameters[0].rtx = {
              ssrc: transceiver.sendEncodingParameters[0].ssrc + 1
            };
          }
        }
      }

      // Calculate intersection of capabilities.
      var commonCapabilities = getCommonCapabilities(
          transceiver.localCapabilities,
          transceiver.remoteCapabilities);

      var hasRtx = commonCapabilities.codecs.filter(function(c) {
        return c.name.toLowerCase() === 'rtx';
      }).length;
      if (!hasRtx && transceiver.sendEncodingParameters[0].rtx) {
        delete transceiver.sendEncodingParameters[0].rtx;
      }

      sdp += writeMediaSection(transceiver, commonCapabilities,
          'answer', transceiver.stream, self._dtlsRole);
      if (transceiver.rtcpParameters &&
          transceiver.rtcpParameters.reducedSize) {
        sdp += 'a=rtcp-rsize\r\n';
      }
    });

    var desc = new window.RTCSessionDescription({
      type: 'answer',
      sdp: sdp
    });
    return new Promise(function(resolve) {
      if (args.length > 0 && typeof args[0] === 'function') {
        args[0].apply(null, [desc]);
        resolve();
        return;
      }
      resolve(desc);
    });
  };

  RTCPeerConnection.prototype.addIceCandidate = function(candidate) {
    var err;
    var sections;
    if (!candidate || candidate.candidate === '') {
      for (var j = 0; j < this.transceivers.length; j++) {
        if (this.transceivers[j].isDatachannel) {
          continue;
        }
        this.transceivers[j].iceTransport.addRemoteCandidate({});
        sections = SDPUtils.splitSections(this.remoteDescription.sdp);
        sections[j + 1] += 'a=end-of-candidates\r\n';
        this.remoteDescription.sdp = sections.join('');
        if (this.usingBundle) {
          break;
        }
      }
    } else if (!(candidate.sdpMLineIndex !== undefined || candidate.sdpMid)) {
      throw new TypeError('sdpMLineIndex or sdpMid required');
    } else if (!this.remoteDescription) {
      err = new Error('Can not add ICE candidate without ' +
          'a remote description');
      err.name = 'InvalidStateError';
    } else {
      var sdpMLineIndex = candidate.sdpMLineIndex;
      if (candidate.sdpMid) {
        for (var i = 0; i < this.transceivers.length; i++) {
          if (this.transceivers[i].mid === candidate.sdpMid) {
            sdpMLineIndex = i;
            break;
          }
        }
      }
      var transceiver = this.transceivers[sdpMLineIndex];
      if (transceiver) {
        if (transceiver.isDatachannel) {
          return Promise.resolve();
        }
        var cand = Object.keys(candidate.candidate).length > 0 ?
            SDPUtils.parseCandidate(candidate.candidate) : {};
        // Ignore Chrome's invalid candidates since Edge does not like them.
        if (cand.protocol === 'tcp' && (cand.port === 0 || cand.port === 9)) {
          return Promise.resolve();
        }
        // Ignore RTCP candidates, we assume RTCP-MUX.
        if (cand.component && cand.component !== 1) {
          return Promise.resolve();
        }
        // when using bundle, avoid adding candidates to the wrong
        // ice transport. And avoid adding candidates added in the SDP.
        if (sdpMLineIndex === 0 || (sdpMLineIndex > 0 &&
            transceiver.iceTransport !== this.transceivers[0].iceTransport)) {
          if (!maybeAddCandidate(transceiver.iceTransport, cand)) {
            err = new Error('Can not add ICE candidate');
            err.name = 'OperationError';
          }
        }

        if (!err) {
          // update the remoteDescription.
          var candidateString = candidate.candidate.trim();
          if (candidateString.indexOf('a=') === 0) {
            candidateString = candidateString.substr(2);
          }
          sections = SDPUtils.splitSections(this.remoteDescription.sdp);
          sections[sdpMLineIndex + 1] += 'a=' +
              (cand.type ? candidateString : 'end-of-candidates')
              + '\r\n';
          this.remoteDescription.sdp = sections.join('');
        }
      } else {
        err = new Error('Can not add ICE candidate');
        err.name = 'OperationError';
      }
    }
    var args = arguments;
    return new Promise(function(resolve, reject) {
      if (err) {
        if (args.length > 2 && typeof args[2] === 'function') {
          args[2].apply(null, [err]);
        }
        reject(err);
      } else {
        if (args.length > 1 && typeof args[1] === 'function') {
          args[1].apply(null);
        }
        resolve();
      }
    });
  };

  RTCPeerConnection.prototype.getStats = function() {
    var promises = [];
    this.transceivers.forEach(function(transceiver) {
      ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport',
          'dtlsTransport'].forEach(function(method) {
            if (transceiver[method]) {
              promises.push(transceiver[method].getStats());
            }
          });
    });
    var cb = arguments.length > 1 && typeof arguments[1] === 'function' &&
        arguments[1];
    var fixStatsType = function(stat) {
      return {
        inboundrtp: 'inbound-rtp',
        outboundrtp: 'outbound-rtp',
        candidatepair: 'candidate-pair',
        localcandidate: 'local-candidate',
        remotecandidate: 'remote-candidate'
      }[stat.type] || stat.type;
    };
    return new Promise(function(resolve) {
      // shim getStats with maplike support
      var results = new Map();
      Promise.all(promises).then(function(res) {
        res.forEach(function(result) {
          Object.keys(result).forEach(function(id) {
            result[id].type = fixStatsType(result[id]);
            results.set(id, result[id]);
          });
        });
        if (cb) {
          cb.apply(null, results);
        }
        resolve(results);
      });
    });
  };
  return RTCPeerConnection;
};

},{"sdp":39}],35:[function(require,module,exports){
var grammar = module.exports = {
  v: [{
    name: 'version',
    reg: /^(\d*)$/
  }],
  o: [{ //o=- 20518 0 IN IP4 203.0.113.1
    // NB: sessionId will be a String in most cases because it is huge
    name: 'origin',
    reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,
    names: ['username', 'sessionId', 'sessionVersion', 'netType', 'ipVer', 'address'],
    format: '%s %s %d %s IP%d %s'
  }],
  // default parsing of these only (though some of these feel outdated)
  s: [{ name: 'name' }],
  i: [{ name: 'description' }],
  u: [{ name: 'uri' }],
  e: [{ name: 'email' }],
  p: [{ name: 'phone' }],
  z: [{ name: 'timezones' }], // TODO: this one can actually be parsed properly..
  r: [{ name: 'repeats' }],   // TODO: this one can also be parsed properly
  //k: [{}], // outdated thing ignored
  t: [{ //t=0 0
    name: 'timing',
    reg: /^(\d*) (\d*)/,
    names: ['start', 'stop'],
    format: '%d %d'
  }],
  c: [{ //c=IN IP4 10.47.197.26
    name: 'connection',
    reg: /^IN IP(\d) (\S*)/,
    names: ['version', 'ip'],
    format: 'IN IP%d %s'
  }],
  b: [{ //b=AS:4000
    push: 'bandwidth',
    reg: /^(TIAS|AS|CT|RR|RS):(\d*)/,
    names: ['type', 'limit'],
    format: '%s:%s'
  }],
  m: [{ //m=video 51744 RTP/AVP 126 97 98 34 31
    // NB: special - pushes to session
    // TODO: rtp/fmtp should be filtered by the payloads found here?
    reg: /^(\w*) (\d*) ([\w\/]*)(?: (.*))?/,
    names: ['type', 'port', 'protocol', 'payloads'],
    format: '%s %d %s %s'
  }],
  a: [
    { //a=rtpmap:110 opus/48000/2
      push: 'rtp',
      reg: /^rtpmap:(\d*) ([\w\-\.]*)(?:\s*\/(\d*)(?:\s*\/(\S*))?)?/,
      names: ['payload', 'codec', 'rate', 'encoding'],
      format: function (o) {
        return (o.encoding) ?
          'rtpmap:%d %s/%s/%s':
          o.rate ?
          'rtpmap:%d %s/%s':
          'rtpmap:%d %s';
      }
    },
    { //a=fmtp:108 profile-level-id=24;object=23;bitrate=64000
      //a=fmtp:111 minptime=10; useinbandfec=1
      push: 'fmtp',
      reg: /^fmtp:(\d*) ([\S| ]*)/,
      names: ['payload', 'config'],
      format: 'fmtp:%d %s'
    },
    { //a=control:streamid=0
      name: 'control',
      reg: /^control:(.*)/,
      format: 'control:%s'
    },
    { //a=rtcp:65179 IN IP4 193.84.77.194
      name: 'rtcp',
      reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,
      names: ['port', 'netType', 'ipVer', 'address'],
      format: function (o) {
        return (o.address != null) ?
          'rtcp:%d %s IP%d %s':
          'rtcp:%d';
      }
    },
    { //a=rtcp-fb:98 trr-int 100
      push: 'rtcpFbTrrInt',
      reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/,
      names: ['payload', 'value'],
      format: 'rtcp-fb:%d trr-int %d'
    },
    { //a=rtcp-fb:98 nack rpsi
      push: 'rtcpFb',
      reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,
      names: ['payload', 'type', 'subtype'],
      format: function (o) {
        return (o.subtype != null) ?
          'rtcp-fb:%s %s %s':
          'rtcp-fb:%s %s';
      }
    },
    { //a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
      //a=extmap:1/recvonly URI-gps-string
      push: 'ext',
      reg: /^extmap:(\d+)(?:\/(\w+))? (\S*)(?: (\S*))?/,
      names: ['value', 'direction', 'uri', 'config'],
      format: function (o) {
        return 'extmap:%d' + (o.direction ? '/%s' : '%v') + ' %s' + (o.config ? ' %s' : '');
      }
    },
    { //a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:PS1uQCVeeCFCanVmcjkpPywjNWhcYD0mXXtxaVBR|2^20|1:32
      push: 'crypto',
      reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,
      names: ['id', 'suite', 'config', 'sessionConfig'],
      format: function (o) {
        return (o.sessionConfig != null) ?
          'crypto:%d %s %s %s':
          'crypto:%d %s %s';
      }
    },
    { //a=setup:actpass
      name: 'setup',
      reg: /^setup:(\w*)/,
      format: 'setup:%s'
    },
    { //a=mid:1
      name: 'mid',
      reg: /^mid:([^\s]*)/,
      format: 'mid:%s'
    },
    { //a=msid:0c8b064d-d807-43b4-b434-f92a889d8587 98178685-d409-46e0-8e16-7ef0db0db64a
      name: 'msid',
      reg: /^msid:(.*)/,
      format: 'msid:%s'
    },
    { //a=ptime:20
      name: 'ptime',
      reg: /^ptime:(\d*)/,
      format: 'ptime:%d'
    },
    { //a=maxptime:60
      name: 'maxptime',
      reg: /^maxptime:(\d*)/,
      format: 'maxptime:%d'
    },
    { //a=sendrecv
      name: 'direction',
      reg: /^(sendrecv|recvonly|sendonly|inactive)/
    },
    { //a=ice-lite
      name: 'icelite',
      reg: /^(ice-lite)/
    },
    { //a=ice-ufrag:F7gI
      name: 'iceUfrag',
      reg: /^ice-ufrag:(\S*)/,
      format: 'ice-ufrag:%s'
    },
    { //a=ice-pwd:x9cml/YzichV2+XlhiMu8g
      name: 'icePwd',
      reg: /^ice-pwd:(\S*)/,
      format: 'ice-pwd:%s'
    },
    { //a=fingerprint:SHA-1 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33
      name: 'fingerprint',
      reg: /^fingerprint:(\S*) (\S*)/,
      names: ['type', 'hash'],
      format: 'fingerprint:%s %s'
    },
    { //a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
      //a=candidate:1162875081 1 udp 2113937151 192.168.34.75 60017 typ host generation 0 network-id 3 network-cost 10
      //a=candidate:3289912957 2 udp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 generation 0 network-id 3 network-cost 10
      //a=candidate:229815620 1 tcp 1518280447 192.168.150.19 60017 typ host tcptype active generation 0 network-id 3 network-cost 10
      //a=candidate:3289912957 2 tcp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 tcptype passive generation 0 network-id 3 network-cost 10
      push:'candidates',
      reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: tcptype (\S*))?(?: generation (\d*))?(?: network-id (\d*))?(?: network-cost (\d*))?/,
      names: ['foundation', 'component', 'transport', 'priority', 'ip', 'port', 'type', 'raddr', 'rport', 'tcptype', 'generation', 'network-id', 'network-cost'],
      format: function (o) {
        var str = 'candidate:%s %d %s %d %s %d typ %s';

        str += (o.raddr != null) ? ' raddr %s rport %d' : '%v%v';

        // NB: candidate has three optional chunks, so %void middles one if it's missing
        str += (o.tcptype != null) ? ' tcptype %s' : '%v';

        if (o.generation != null) {
          str += ' generation %d';
        }

        str += (o['network-id'] != null) ? ' network-id %d' : '%v';
        str += (o['network-cost'] != null) ? ' network-cost %d' : '%v';
        return str;
      }
    },
    { //a=end-of-candidates (keep after the candidates line for readability)
      name: 'endOfCandidates',
      reg: /^(end-of-candidates)/
    },
    { //a=remote-candidates:1 203.0.113.1 54400 2 203.0.113.1 54401 ...
      name: 'remoteCandidates',
      reg: /^remote-candidates:(.*)/,
      format: 'remote-candidates:%s'
    },
    { //a=ice-options:google-ice
      name: 'iceOptions',
      reg: /^ice-options:(\S*)/,
      format: 'ice-options:%s'
    },
    { //a=ssrc:2566107569 cname:t9YU8M1UxTF8Y1A1
      push: 'ssrcs',
      reg: /^ssrc:(\d*) ([\w_]*)(?::(.*))?/,
      names: ['id', 'attribute', 'value'],
      format: function (o) {
        var str = 'ssrc:%d';
        if (o.attribute != null) {
          str += ' %s';
          if (o.value != null) {
            str += ':%s';
          }
        }
        return str;
      }
    },
    { //a=ssrc-group:FEC 1 2
      //a=ssrc-group:FEC-FR 3004364195 1080772241
      push: 'ssrcGroups',
      // token-char = %x21 / %x23-27 / %x2A-2B / %x2D-2E / %x30-39 / %x41-5A / %x5E-7E
      reg: /^ssrc-group:([\x21\x23\x24\x25\x26\x27\x2A\x2B\x2D\x2E\w]*) (.*)/,
      names: ['semantics', 'ssrcs'],
      format: 'ssrc-group:%s %s'
    },
    { //a=msid-semantic: WMS Jvlam5X3SX1OP6pn20zWogvaKJz5Hjf9OnlV
      name: 'msidSemantic',
      reg: /^msid-semantic:\s?(\w*) (\S*)/,
      names: ['semantic', 'token'],
      format: 'msid-semantic: %s %s' // space after ':' is not accidental
    },
    { //a=group:BUNDLE audio video
      push: 'groups',
      reg: /^group:(\w*) (.*)/,
      names: ['type', 'mids'],
      format: 'group:%s %s'
    },
    { //a=rtcp-mux
      name: 'rtcpMux',
      reg: /^(rtcp-mux)/
    },
    { //a=rtcp-rsize
      name: 'rtcpRsize',
      reg: /^(rtcp-rsize)/
    },
    { //a=sctpmap:5000 webrtc-datachannel 1024
      name: 'sctpmap',
      reg: /^sctpmap:([\w_\/]*) (\S*)(?: (\S*))?/,
      names: ['sctpmapNumber', 'app', 'maxMessageSize'],
      format: function (o) {
        return (o.maxMessageSize != null) ?
          'sctpmap:%s %s %s' :
          'sctpmap:%s %s';
      }
    },
    { //a=x-google-flag:conference
      name: 'xGoogleFlag',
      reg: /^x-google-flag:([^\s]*)/,
      format: 'x-google-flag:%s'
    },
    { //a=rid:1 send max-width=1280;max-height=720;max-fps=30;depend=0
      push: 'rids',
      reg: /^rid:([\d\w]+) (\w+)(?: ([\S| ]*))?/,
      names: ['id', 'direction', 'params'],
      format: function (o) {
        return (o.params) ? 'rid:%s %s %s' : 'rid:%s %s';
      }
    },
    { //a=imageattr:97 send [x=800,y=640,sar=1.1,q=0.6] [x=480,y=320] recv [x=330,y=250]
      //a=imageattr:* send [x=800,y=640] recv *
      //a=imageattr:100 recv [x=320,y=240]
      push: 'imageattrs',
      reg: new RegExp(
        //a=imageattr:97
        '^imageattr:(\\d+|\\*)' +
        //send [x=800,y=640,sar=1.1,q=0.6] [x=480,y=320]
        '[\\s\\t]+(send|recv)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*)' +
        //recv [x=330,y=250]
        '(?:[\\s\\t]+(recv|send)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*))?'
      ),
      names: ['pt', 'dir1', 'attrs1', 'dir2', 'attrs2'],
      format: function (o) {
        return 'imageattr:%s %s %s' + (o.dir2 ? ' %s %s' : '');
      }
    },
    { //a=simulcast:send 1,2,3;~4,~5 recv 6;~7,~8
      //a=simulcast:recv 1;4,5 send 6;7
      name: 'simulcast',
      reg: new RegExp(
        //a=simulcast:
        '^simulcast:' +
        //send 1,2,3;~4,~5
        '(send|recv) ([a-zA-Z0-9\\-_~;,]+)' +
        //space + recv 6;~7,~8
        '(?:\\s?(send|recv) ([a-zA-Z0-9\\-_~;,]+))?' +
        //end
        '$'
      ),
      names: ['dir1', 'list1', 'dir2', 'list2'],
      format: function (o) {
        return 'simulcast:%s %s' + (o.dir2 ? ' %s %s' : '');
      }
    },
    { //Old simulcast draft 03 (implemented by Firefox)
      //  https://tools.ietf.org/html/draft-ietf-mmusic-sdp-simulcast-03
      //a=simulcast: recv pt=97;98 send pt=97
      //a=simulcast: send rid=5;6;7 paused=6,7
      name: 'simulcast_03',
      reg: /^simulcast:[\s\t]+([\S+\s\t]+)$/,
      names: ['value'],
      format: 'simulcast: %s'
    },
    {
      //a=framerate:25
      //a=framerate:29.97
      name: 'framerate',
      reg: /^framerate:(\d+(?:$|\.\d+))/,
      format: 'framerate:%s'
    },
    { // any a= that we don't understand is kepts verbatim on media.invalid
      push: 'invalid',
      names: ['value']
    }
  ]
};

// set sensible defaults to avoid polluting the grammar with boring details
Object.keys(grammar).forEach(function (key) {
  var objs = grammar[key];
  objs.forEach(function (obj) {
    if (!obj.reg) {
      obj.reg = /(.*)/;
    }
    if (!obj.format) {
      obj.format = '%s';
    }
  });
});

},{}],36:[function(require,module,exports){
var parser = require('./parser');
var writer = require('./writer');

exports.write = writer;
exports.parse = parser.parse;
exports.parseFmtpConfig = parser.parseFmtpConfig;
exports.parseParams = parser.parseParams;
exports.parsePayloads = parser.parsePayloads;
exports.parseRemoteCandidates = parser.parseRemoteCandidates;
exports.parseImageAttributes = parser.parseImageAttributes;
exports.parseSimulcastStreamList = parser.parseSimulcastStreamList;

},{"./parser":37,"./writer":38}],37:[function(require,module,exports){
var toIntIfInt = function (v) {
  return String(Number(v)) === v ? Number(v) : v;
};

var attachProperties = function (match, location, names, rawName) {
  if (rawName && !names) {
    location[rawName] = toIntIfInt(match[1]);
  }
  else {
    for (var i = 0; i < names.length; i += 1) {
      if (match[i+1] != null) {
        location[names[i]] = toIntIfInt(match[i+1]);
      }
    }
  }
};

var parseReg = function (obj, location, content) {
  var needsBlank = obj.name && obj.names;
  if (obj.push && !location[obj.push]) {
    location[obj.push] = [];
  }
  else if (needsBlank && !location[obj.name]) {
    location[obj.name] = {};
  }
  var keyLocation = obj.push ?
    {} :  // blank object that will be pushed
    needsBlank ? location[obj.name] : location; // otherwise, named location or root

  attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);

  if (obj.push) {
    location[obj.push].push(keyLocation);
  }
};

var grammar = require('./grammar');
var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);

exports.parse = function (sdp) {
  var session = {}
    , media = []
    , location = session; // points at where properties go under (one of the above)

  // parse lines we understand
  sdp.split(/(\r\n|\r|\n)/).filter(validLine).forEach(function (l) {
    var type = l[0];
    var content = l.slice(2);
    if (type === 'm') {
      media.push({rtp: [], fmtp: []});
      location = media[media.length-1]; // point at latest media line
    }

    for (var j = 0; j < (grammar[type] || []).length; j += 1) {
      var obj = grammar[type][j];
      if (obj.reg.test(content)) {
        return parseReg(obj, location, content);
      }
    }
  });

  session.media = media; // link it up
  return session;
};

var paramReducer = function (acc, expr) {
  var s = expr.split(/=(.+)/, 2);
  if (s.length === 2) {
    acc[s[0]] = toIntIfInt(s[1]);
  }
  return acc;
};

exports.parseParams = function (str) {
  return str.split(/\;\s?/).reduce(paramReducer, {});
};

// For backward compatibility - alias will be removed in 3.0.0
exports.parseFmtpConfig = exports.parseParams;

exports.parsePayloads = function (str) {
  return str.split(' ').map(Number);
};

exports.parseRemoteCandidates = function (str) {
  var candidates = [];
  var parts = str.split(' ').map(toIntIfInt);
  for (var i = 0; i < parts.length; i += 3) {
    candidates.push({
      component: parts[i],
      ip: parts[i + 1],
      port: parts[i + 2]
    });
  }
  return candidates;
};

exports.parseImageAttributes = function (str) {
  return str.split(' ').map(function (item) {
    return item.substring(1, item.length-1).split(',').reduce(paramReducer, {});
  });
};

exports.parseSimulcastStreamList = function (str) {
  return str.split(';').map(function (stream) {
    return stream.split(',').map(function (format) {
      var scid, paused = false;

      if (format[0] !== '~') {
        scid = toIntIfInt(format);
      } else {
        scid = toIntIfInt(format.substring(1, format.length));
        paused = true;
      }

      return {
        scid: scid,
        paused: paused
      };
    });
  });
};

},{"./grammar":35}],38:[function(require,module,exports){
var grammar = require('./grammar');

// customized util.format - discards excess arguments and can void middle ones
var formatRegExp = /%[sdv%]/g;
var format = function (formatStr) {
  var i = 1;
  var args = arguments;
  var len = args.length;
  return formatStr.replace(formatRegExp, function (x) {
    if (i >= len) {
      return x; // missing argument
    }
    var arg = args[i];
    i += 1;
    switch (x) {
    case '%%':
      return '%';
    case '%s':
      return String(arg);
    case '%d':
      return Number(arg);
    case '%v':
      return '';
    }
  });
  // NB: we discard excess arguments - they are typically undefined from makeLine
};

var makeLine = function (type, obj, location) {
  var str = obj.format instanceof Function ?
    (obj.format(obj.push ? location : location[obj.name])) :
    obj.format;

  var args = [type + '=' + str];
  if (obj.names) {
    for (var i = 0; i < obj.names.length; i += 1) {
      var n = obj.names[i];
      if (obj.name) {
        args.push(location[obj.name][n]);
      }
      else { // for mLine and push attributes
        args.push(location[obj.names[i]]);
      }
    }
  }
  else {
    args.push(location[obj.name]);
  }
  return format.apply(null, args);
};

// RFC specified order
// TODO: extend this with all the rest
var defaultOuterOrder = [
  'v', 'o', 's', 'i',
  'u', 'e', 'p', 'c',
  'b', 't', 'r', 'z', 'a'
];
var defaultInnerOrder = ['i', 'c', 'b', 'a'];


module.exports = function (session, opts) {
  opts = opts || {};
  // ensure certain properties exist
  if (session.version == null) {
    session.version = 0; // 'v=0' must be there (only defined version atm)
  }
  if (session.name == null) {
    session.name = ' '; // 's= ' must be there if no meaningful name set
  }
  session.media.forEach(function (mLine) {
    if (mLine.payloads == null) {
      mLine.payloads = '';
    }
  });

  var outerOrder = opts.outerOrder || defaultOuterOrder;
  var innerOrder = opts.innerOrder || defaultInnerOrder;
  var sdp = [];

  // loop through outerOrder for matching properties on session
  outerOrder.forEach(function (type) {
    grammar[type].forEach(function (obj) {
      if (obj.name in session && session[obj.name] != null) {
        sdp.push(makeLine(type, obj, session));
      }
      else if (obj.push in session && session[obj.push] != null) {
        session[obj.push].forEach(function (el) {
          sdp.push(makeLine(type, obj, el));
        });
      }
    });
  });

  // then for each media line, follow the innerOrder
  session.media.forEach(function (mLine) {
    sdp.push(makeLine('m', grammar.m[0], mLine));

    innerOrder.forEach(function (type) {
      grammar[type].forEach(function (obj) {
        if (obj.name in mLine && mLine[obj.name] != null) {
          sdp.push(makeLine(type, obj, mLine));
        }
        else if (obj.push in mLine && mLine[obj.push] != null) {
          mLine[obj.push].forEach(function (el) {
            sdp.push(makeLine(type, obj, el));
          });
        }
      });
    });
  });

  return sdp.join('\r\n') + '\r\n';
};

},{"./grammar":35}],39:[function(require,module,exports){
 /* eslint-env node */
'use strict';

// SDP helpers.
var SDPUtils = {};

// Generate an alphanumeric identifier for cname or mids.
// TODO: use UUIDs instead? https://gist.github.com/jed/982883
SDPUtils.generateIdentifier = function() {
  return Math.random().toString(36).substr(2, 10);
};

// The RTCP CNAME used by all peerconnections from the same JS.
SDPUtils.localCName = SDPUtils.generateIdentifier();

// Splits SDP into lines, dealing with both CRLF and LF.
SDPUtils.splitLines = function(blob) {
  return blob.trim().split('\n').map(function(line) {
    return line.trim();
  });
};
// Splits SDP into sessionpart and mediasections. Ensures CRLF.
SDPUtils.splitSections = function(blob) {
  var parts = blob.split('\nm=');
  return parts.map(function(part, index) {
    return (index > 0 ? 'm=' + part : part).trim() + '\r\n';
  });
};

// Returns lines that start with a certain prefix.
SDPUtils.matchPrefix = function(blob, prefix) {
  return SDPUtils.splitLines(blob).filter(function(line) {
    return line.indexOf(prefix) === 0;
  });
};

// Parses an ICE candidate line. Sample input:
// candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8
// rport 55996"
SDPUtils.parseCandidate = function(line) {
  var parts;
  // Parse both variants.
  if (line.indexOf('a=candidate:') === 0) {
    parts = line.substring(12).split(' ');
  } else {
    parts = line.substring(10).split(' ');
  }

  var candidate = {
    foundation: parts[0],
    component: parseInt(parts[1], 10),
    protocol: parts[2].toLowerCase(),
    priority: parseInt(parts[3], 10),
    ip: parts[4],
    port: parseInt(parts[5], 10),
    // skip parts[6] == 'typ'
    type: parts[7]
  };

  for (var i = 8; i < parts.length; i += 2) {
    switch (parts[i]) {
      case 'raddr':
        candidate.relatedAddress = parts[i + 1];
        break;
      case 'rport':
        candidate.relatedPort = parseInt(parts[i + 1], 10);
        break;
      case 'tcptype':
        candidate.tcpType = parts[i + 1];
        break;
      case 'ufrag':
        candidate.ufrag = parts[i + 1]; // for backward compability.
        candidate.usernameFragment = parts[i + 1];
        break;
      default: // extension handling, in particular ufrag
        candidate[parts[i]] = parts[i + 1];
        break;
    }
  }
  return candidate;
};

// Translates a candidate object into SDP candidate attribute.
SDPUtils.writeCandidate = function(candidate) {
  var sdp = [];
  sdp.push(candidate.foundation);
  sdp.push(candidate.component);
  sdp.push(candidate.protocol.toUpperCase());
  sdp.push(candidate.priority);
  sdp.push(candidate.ip);
  sdp.push(candidate.port);

  var type = candidate.type;
  sdp.push('typ');
  sdp.push(type);
  if (type !== 'host' && candidate.relatedAddress &&
      candidate.relatedPort) {
    sdp.push('raddr');
    sdp.push(candidate.relatedAddress); // was: relAddr
    sdp.push('rport');
    sdp.push(candidate.relatedPort); // was: relPort
  }
  if (candidate.tcpType && candidate.protocol.toLowerCase() === 'tcp') {
    sdp.push('tcptype');
    sdp.push(candidate.tcpType);
  }
  if (candidate.ufrag) {
    sdp.push('ufrag');
    sdp.push(candidate.ufrag);
  }
  return 'candidate:' + sdp.join(' ');
};

// Parses an ice-options line, returns an array of option tags.
// a=ice-options:foo bar
SDPUtils.parseIceOptions = function(line) {
  return line.substr(14).split(' ');
}

// Parses an rtpmap line, returns RTCRtpCoddecParameters. Sample input:
// a=rtpmap:111 opus/48000/2
SDPUtils.parseRtpMap = function(line) {
  var parts = line.substr(9).split(' ');
  var parsed = {
    payloadType: parseInt(parts.shift(), 10) // was: id
  };

  parts = parts[0].split('/');

  parsed.name = parts[0];
  parsed.clockRate = parseInt(parts[1], 10); // was: clockrate
  // was: channels
  parsed.numChannels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
  return parsed;
};

// Generate an a=rtpmap line from RTCRtpCodecCapability or
// RTCRtpCodecParameters.
SDPUtils.writeRtpMap = function(codec) {
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  return 'a=rtpmap:' + pt + ' ' + codec.name + '/' + codec.clockRate +
      (codec.numChannels !== 1 ? '/' + codec.numChannels : '') + '\r\n';
};

// Parses an a=extmap line (headerextension from RFC 5285). Sample input:
// a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
// a=extmap:2/sendonly urn:ietf:params:rtp-hdrext:toffset
SDPUtils.parseExtmap = function(line) {
  var parts = line.substr(9).split(' ');
  return {
    id: parseInt(parts[0], 10),
    direction: parts[0].indexOf('/') > 0 ? parts[0].split('/')[1] : 'sendrecv',
    uri: parts[1]
  };
};

// Generates a=extmap line from RTCRtpHeaderExtensionParameters or
// RTCRtpHeaderExtension.
SDPUtils.writeExtmap = function(headerExtension) {
  return 'a=extmap:' + (headerExtension.id || headerExtension.preferredId) +
      (headerExtension.direction && headerExtension.direction !== 'sendrecv'
          ? '/' + headerExtension.direction
          : '') +
      ' ' + headerExtension.uri + '\r\n';
};

// Parses an ftmp line, returns dictionary. Sample input:
// a=fmtp:96 vbr=on;cng=on
// Also deals with vbr=on; cng=on
SDPUtils.parseFmtp = function(line) {
  var parsed = {};
  var kv;
  var parts = line.substr(line.indexOf(' ') + 1).split(';');
  for (var j = 0; j < parts.length; j++) {
    kv = parts[j].trim().split('=');
    parsed[kv[0].trim()] = kv[1];
  }
  return parsed;
};

// Generates an a=ftmp line from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeFmtp = function(codec) {
  var line = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.parameters && Object.keys(codec.parameters).length) {
    var params = [];
    Object.keys(codec.parameters).forEach(function(param) {
      params.push(param + '=' + codec.parameters[param]);
    });
    line += 'a=fmtp:' + pt + ' ' + params.join(';') + '\r\n';
  }
  return line;
};

// Parses an rtcp-fb line, returns RTCPRtcpFeedback object. Sample input:
// a=rtcp-fb:98 nack rpsi
SDPUtils.parseRtcpFb = function(line) {
  var parts = line.substr(line.indexOf(' ') + 1).split(' ');
  return {
    type: parts.shift(),
    parameter: parts.join(' ')
  };
};
// Generate a=rtcp-fb lines from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeRtcpFb = function(codec) {
  var lines = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
    // FIXME: special handling for trr-int?
    codec.rtcpFeedback.forEach(function(fb) {
      lines += 'a=rtcp-fb:' + pt + ' ' + fb.type +
      (fb.parameter && fb.parameter.length ? ' ' + fb.parameter : '') +
          '\r\n';
    });
  }
  return lines;
};

// Parses an RFC 5576 ssrc media attribute. Sample input:
// a=ssrc:3735928559 cname:something
SDPUtils.parseSsrcMedia = function(line) {
  var sp = line.indexOf(' ');
  var parts = {
    ssrc: parseInt(line.substr(7, sp - 7), 10)
  };
  var colon = line.indexOf(':', sp);
  if (colon > -1) {
    parts.attribute = line.substr(sp + 1, colon - sp - 1);
    parts.value = line.substr(colon + 1);
  } else {
    parts.attribute = line.substr(sp + 1);
  }
  return parts;
};

// Extracts the MID (RFC 5888) from a media section.
// returns the MID or undefined if no mid line was found.
SDPUtils.getMid = function(mediaSection) {
  var mid = SDPUtils.matchPrefix(mediaSection, 'a=mid:')[0];
  if (mid) {
    return mid.substr(6);
  }
}

SDPUtils.parseFingerprint = function(line) {
  var parts = line.substr(14).split(' ');
  return {
    algorithm: parts[0].toLowerCase(), // algorithm is case-sensitive in Edge.
    value: parts[1]
  };
};

// Extracts DTLS parameters from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the fingerprint line as input. See also getIceParameters.
SDPUtils.getDtlsParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.matchPrefix(mediaSection + sessionpart,
      'a=fingerprint:');
  // Note: a=setup line is ignored since we use the 'auto' role.
  // Note2: 'algorithm' is not case sensitive except in Edge.
  return {
    role: 'auto',
    fingerprints: lines.map(SDPUtils.parseFingerprint)
  };
};

// Serializes DTLS parameters to SDP.
SDPUtils.writeDtlsParameters = function(params, setupType) {
  var sdp = 'a=setup:' + setupType + '\r\n';
  params.fingerprints.forEach(function(fp) {
    sdp += 'a=fingerprint:' + fp.algorithm + ' ' + fp.value + '\r\n';
  });
  return sdp;
};
// Parses ICE information from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the ice-ufrag and ice-pwd lines as input.
SDPUtils.getIceParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.splitLines(mediaSection);
  // Search in session part, too.
  lines = lines.concat(SDPUtils.splitLines(sessionpart));
  var iceParameters = {
    usernameFragment: lines.filter(function(line) {
      return line.indexOf('a=ice-ufrag:') === 0;
    })[0].substr(12),
    password: lines.filter(function(line) {
      return line.indexOf('a=ice-pwd:') === 0;
    })[0].substr(10)
  };
  return iceParameters;
};

// Serializes ICE parameters to SDP.
SDPUtils.writeIceParameters = function(params) {
  return 'a=ice-ufrag:' + params.usernameFragment + '\r\n' +
      'a=ice-pwd:' + params.password + '\r\n';
};

// Parses the SDP media section and returns RTCRtpParameters.
SDPUtils.parseRtpParameters = function(mediaSection) {
  var description = {
    codecs: [],
    headerExtensions: [],
    fecMechanisms: [],
    rtcp: []
  };
  var lines = SDPUtils.splitLines(mediaSection);
  var mline = lines[0].split(' ');
  for (var i = 3; i < mline.length; i++) { // find all codecs from mline[3..]
    var pt = mline[i];
    var rtpmapline = SDPUtils.matchPrefix(
        mediaSection, 'a=rtpmap:' + pt + ' ')[0];
    if (rtpmapline) {
      var codec = SDPUtils.parseRtpMap(rtpmapline);
      var fmtps = SDPUtils.matchPrefix(
          mediaSection, 'a=fmtp:' + pt + ' ');
      // Only the first a=fmtp:<pt> is considered.
      codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
      codec.rtcpFeedback = SDPUtils.matchPrefix(
          mediaSection, 'a=rtcp-fb:' + pt + ' ')
        .map(SDPUtils.parseRtcpFb);
      description.codecs.push(codec);
      // parse FEC mechanisms from rtpmap lines.
      switch (codec.name.toUpperCase()) {
        case 'RED':
        case 'ULPFEC':
          description.fecMechanisms.push(codec.name.toUpperCase());
          break;
        default: // only RED and ULPFEC are recognized as FEC mechanisms.
          break;
      }
    }
  }
  SDPUtils.matchPrefix(mediaSection, 'a=extmap:').forEach(function(line) {
    description.headerExtensions.push(SDPUtils.parseExtmap(line));
  });
  // FIXME: parse rtcp.
  return description;
};

// Generates parts of the SDP media section describing the capabilities /
// parameters.
SDPUtils.writeRtpDescription = function(kind, caps) {
  var sdp = '';

  // Build the mline.
  sdp += 'm=' + kind + ' ';
  sdp += caps.codecs.length > 0 ? '9' : '0'; // reject if no codecs.
  sdp += ' UDP/TLS/RTP/SAVPF ';
  sdp += caps.codecs.map(function(codec) {
    if (codec.preferredPayloadType !== undefined) {
      return codec.preferredPayloadType;
    }
    return codec.payloadType;
  }).join(' ') + '\r\n';

  sdp += 'c=IN IP4 0.0.0.0\r\n';
  sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

  // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
  caps.codecs.forEach(function(codec) {
    sdp += SDPUtils.writeRtpMap(codec);
    sdp += SDPUtils.writeFmtp(codec);
    sdp += SDPUtils.writeRtcpFb(codec);
  });
  var maxptime = 0;
  caps.codecs.forEach(function(codec) {
    if (codec.maxptime > maxptime) {
      maxptime = codec.maxptime;
    }
  });
  if (maxptime > 0) {
    sdp += 'a=maxptime:' + maxptime + '\r\n';
  }
  sdp += 'a=rtcp-mux\r\n';

  caps.headerExtensions.forEach(function(extension) {
    sdp += SDPUtils.writeExtmap(extension);
  });
  // FIXME: write fecMechanisms.
  return sdp;
};

// Parses the SDP media section and returns an array of
// RTCRtpEncodingParameters.
SDPUtils.parseRtpEncodingParameters = function(mediaSection) {
  var encodingParameters = [];
  var description = SDPUtils.parseRtpParameters(mediaSection);
  var hasRed = description.fecMechanisms.indexOf('RED') !== -1;
  var hasUlpfec = description.fecMechanisms.indexOf('ULPFEC') !== -1;

  // filter a=ssrc:... cname:, ignore PlanB-msid
  var ssrcs = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
  .map(function(line) {
    return SDPUtils.parseSsrcMedia(line);
  })
  .filter(function(parts) {
    return parts.attribute === 'cname';
  });
  var primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
  var secondarySsrc;

  var flows = SDPUtils.matchPrefix(mediaSection, 'a=ssrc-group:FID')
  .map(function(line) {
    var parts = line.split(' ');
    parts.shift();
    return parts.map(function(part) {
      return parseInt(part, 10);
    });
  });
  if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
    secondarySsrc = flows[0][1];
  }

  description.codecs.forEach(function(codec) {
    if (codec.name.toUpperCase() === 'RTX' && codec.parameters.apt) {
      var encParam = {
        ssrc: primarySsrc,
        codecPayloadType: parseInt(codec.parameters.apt, 10),
        rtx: {
          ssrc: secondarySsrc
        }
      };
      encodingParameters.push(encParam);
      if (hasRed) {
        encParam = JSON.parse(JSON.stringify(encParam));
        encParam.fec = {
          ssrc: secondarySsrc,
          mechanism: hasUlpfec ? 'red+ulpfec' : 'red'
        };
        encodingParameters.push(encParam);
      }
    }
  });
  if (encodingParameters.length === 0 && primarySsrc) {
    encodingParameters.push({
      ssrc: primarySsrc
    });
  }

  // we support both b=AS and b=TIAS but interpret AS as TIAS.
  var bandwidth = SDPUtils.matchPrefix(mediaSection, 'b=');
  if (bandwidth.length) {
    if (bandwidth[0].indexOf('b=TIAS:') === 0) {
      bandwidth = parseInt(bandwidth[0].substr(7), 10);
    } else if (bandwidth[0].indexOf('b=AS:') === 0) {
      // use formula from JSEP to convert b=AS to TIAS value.
      bandwidth = parseInt(bandwidth[0].substr(5), 10) * 1000 * 0.95
          - (50 * 40 * 8);
    } else {
      bandwidth = undefined;
    }
    encodingParameters.forEach(function(params) {
      params.maxBitrate = bandwidth;
    });
  }
  return encodingParameters;
};

// parses http://draft.ortc.org/#rtcrtcpparameters*
SDPUtils.parseRtcpParameters = function(mediaSection) {
  var rtcpParameters = {};

  var cname;
  // Gets the first SSRC. Note that with RTX there might be multiple
  // SSRCs.
  var remoteSsrc = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
      .map(function(line) {
        return SDPUtils.parseSsrcMedia(line);
      })
      .filter(function(obj) {
        return obj.attribute === 'cname';
      })[0];
  if (remoteSsrc) {
    rtcpParameters.cname = remoteSsrc.value;
    rtcpParameters.ssrc = remoteSsrc.ssrc;
  }

  // Edge uses the compound attribute instead of reducedSize
  // compound is !reducedSize
  var rsize = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-rsize');
  rtcpParameters.reducedSize = rsize.length > 0;
  rtcpParameters.compound = rsize.length === 0;

  // parses the rtcp-mux attrіbute.
  // Note that Edge does not support unmuxed RTCP.
  var mux = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-mux');
  rtcpParameters.mux = mux.length > 0;

  return rtcpParameters;
};

// parses either a=msid: or a=ssrc:... msid lines and returns
// the id of the MediaStream and MediaStreamTrack.
SDPUtils.parseMsid = function(mediaSection) {
  var parts;
  var spec = SDPUtils.matchPrefix(mediaSection, 'a=msid:');
  if (spec.length === 1) {
    parts = spec[0].substr(7).split(' ');
    return {stream: parts[0], track: parts[1]};
  }
  var planB = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
  .map(function(line) {
    return SDPUtils.parseSsrcMedia(line);
  })
  .filter(function(parts) {
    return parts.attribute === 'msid';
  });
  if (planB.length > 0) {
    parts = planB[0].value.split(' ');
    return {stream: parts[0], track: parts[1]};
  }
};

// Generate a session ID for SDP.
// https://tools.ietf.org/html/draft-ietf-rtcweb-jsep-20#section-5.2.1
// recommends using a cryptographically random +ve 64-bit value
// but right now this should be acceptable and within the right range
SDPUtils.generateSessionId = function() {
  return Math.random().toString().substr(2, 21);
};

// Write boilder plate for start of SDP
// sessId argument is optional - if not supplied it will
// be generated randomly
// sessVersion is optional and defaults to 2
SDPUtils.writeSessionBoilerplate = function(sessId, sessVer) {
  var sessionId;
  var version = sessVer !== undefined ? sessVer : 2;
  if (sessId) {
    sessionId = sessId;
  } else {
    sessionId = SDPUtils.generateSessionId();
  }
  // FIXME: sess-id should be an NTP timestamp.
  return 'v=0\r\n' +
      'o=thisisadapterortc ' + sessionId + ' ' + version + ' IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n';
};

SDPUtils.writeMediaSection = function(transceiver, caps, type, stream) {
  var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

  // Map ICE parameters (ufrag, pwd) to SDP.
  sdp += SDPUtils.writeIceParameters(
      transceiver.iceGatherer.getLocalParameters());

  // Map DTLS parameters to SDP.
  sdp += SDPUtils.writeDtlsParameters(
      transceiver.dtlsTransport.getLocalParameters(),
      type === 'offer' ? 'actpass' : 'active');

  sdp += 'a=mid:' + transceiver.mid + '\r\n';

  if (transceiver.direction) {
    sdp += 'a=' + transceiver.direction + '\r\n';
  } else if (transceiver.rtpSender && transceiver.rtpReceiver) {
    sdp += 'a=sendrecv\r\n';
  } else if (transceiver.rtpSender) {
    sdp += 'a=sendonly\r\n';
  } else if (transceiver.rtpReceiver) {
    sdp += 'a=recvonly\r\n';
  } else {
    sdp += 'a=inactive\r\n';
  }

  if (transceiver.rtpSender) {
    // spec.
    var msid = 'msid:' + stream.id + ' ' +
        transceiver.rtpSender.track.id + '\r\n';
    sdp += 'a=' + msid;

    // for Chrome.
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
        ' ' + msid;
    if (transceiver.sendEncodingParameters[0].rtx) {
      sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
          ' ' + msid;
      sdp += 'a=ssrc-group:FID ' +
          transceiver.sendEncodingParameters[0].ssrc + ' ' +
          transceiver.sendEncodingParameters[0].rtx.ssrc +
          '\r\n';
    }
  }
  // FIXME: this should be written by writeRtpDescription.
  sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
      ' cname:' + SDPUtils.localCName + '\r\n';
  if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
        ' cname:' + SDPUtils.localCName + '\r\n';
  }
  return sdp;
};

// Gets the direction from the mediaSection or the sessionpart.
SDPUtils.getDirection = function(mediaSection, sessionpart) {
  // Look for sendrecv, sendonly, recvonly, inactive, default to sendrecv.
  var lines = SDPUtils.splitLines(mediaSection);
  for (var i = 0; i < lines.length; i++) {
    switch (lines[i]) {
      case 'a=sendrecv':
      case 'a=sendonly':
      case 'a=recvonly':
      case 'a=inactive':
        return lines[i].substr(2);
      default:
        // FIXME: What should happen here?
    }
  }
  if (sessionpart) {
    return SDPUtils.getDirection(sessionpart);
  }
  return 'sendrecv';
};

SDPUtils.getKind = function(mediaSection) {
  var lines = SDPUtils.splitLines(mediaSection);
  var mline = lines[0].split(' ');
  return mline[0].substr(2);
};

SDPUtils.isRejected = function(mediaSection) {
  return mediaSection.split(' ', 2)[1] === '0';
};

SDPUtils.parseMLine = function(mediaSection) {
  var lines = SDPUtils.splitLines(mediaSection);
  var mline = lines[0].split(' ');
  return {
    kind: mline[0].substr(2),
    port: parseInt(mline[1], 10),
    protocol: mline[2],
    fmt: mline.slice(3).join(' ')
  };
};

// Expose public methods.
if (typeof module === 'object') {
  module.exports = SDPUtils;
}

},{}],40:[function(require,module,exports){
(function (global){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

'use strict';

var adapterFactory = require('./adapter_factory.js');
module.exports = adapterFactory({window: global.window});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./adapter_factory.js":41}],41:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

'use strict';

var utils = require('./utils');
// Shimming starts here.
module.exports = function(dependencies, opts) {
  var window = dependencies && dependencies.window;

  var options = {
    shimChrome: true,
    shimFirefox: true,
    shimEdge: true,
    shimSafari: true,
  };

  for (var key in opts) {
    if (hasOwnProperty.call(opts, key)) {
      options[key] = opts[key];
    }
  }

  // Utils.
  var logging = utils.log;
  var browserDetails = utils.detectBrowser(window);

  // Export to the adapter global object visible in the browser.
  var adapter = {
    browserDetails: browserDetails,
    extractVersion: utils.extractVersion,
    disableLog: utils.disableLog,
    disableWarnings: utils.disableWarnings
  };

  // Uncomment the line below if you want logging to occur, including logging
  // for the switch statement below. Can also be turned on in the browser via
  // adapter.disableLog(false), but then logging from the switch statement below
  // will not appear.
  // require('./utils').disableLog(false);

  // Browser shims.
  var chromeShim = require('./chrome/chrome_shim') || null;
  var edgeShim = require('./edge/edge_shim') || null;
  var firefoxShim = require('./firefox/firefox_shim') || null;
  var safariShim = require('./safari/safari_shim') || null;
  var commonShim = require('./common_shim') || null;

  // Shim browser if found.
  switch (browserDetails.browser) {
    case 'chrome':
      if (!chromeShim || !chromeShim.shimPeerConnection ||
          !options.shimChrome) {
        logging('Chrome shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming chrome.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = chromeShim;
      commonShim.shimCreateObjectURL(window);

      chromeShim.shimGetUserMedia(window);
      chromeShim.shimMediaStream(window);
      chromeShim.shimSourceObject(window);
      chromeShim.shimPeerConnection(window);
      chromeShim.shimOnTrack(window);
      chromeShim.shimAddTrackRemoveTrack(window);
      chromeShim.shimGetSendersWithDtmf(window);

      commonShim.shimRTCIceCandidate(window);
      break;
    case 'firefox':
      if (!firefoxShim || !firefoxShim.shimPeerConnection ||
          !options.shimFirefox) {
        logging('Firefox shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming firefox.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = firefoxShim;
      commonShim.shimCreateObjectURL(window);

      firefoxShim.shimGetUserMedia(window);
      firefoxShim.shimSourceObject(window);
      firefoxShim.shimPeerConnection(window);
      firefoxShim.shimOnTrack(window);

      commonShim.shimRTCIceCandidate(window);
      break;
    case 'edge':
      if (!edgeShim || !edgeShim.shimPeerConnection || !options.shimEdge) {
        logging('MS edge shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming edge.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = edgeShim;
      commonShim.shimCreateObjectURL(window);

      edgeShim.shimGetUserMedia(window);
      edgeShim.shimPeerConnection(window);
      edgeShim.shimReplaceTrack(window);

      // the edge shim implements the full RTCIceCandidate object.
      break;
    case 'safari':
      if (!safariShim || !options.shimSafari) {
        logging('Safari shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming safari.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = safariShim;
      commonShim.shimCreateObjectURL(window);

      safariShim.shimRTCIceServerUrls(window);
      safariShim.shimCallbacksAPI(window);
      safariShim.shimLocalStreamsAPI(window);
      safariShim.shimRemoteStreamsAPI(window);
      safariShim.shimTrackEventTransceiver(window);
      safariShim.shimGetUserMedia(window);
      safariShim.shimCreateOfferLegacy(window);

      commonShim.shimRTCIceCandidate(window);
      break;
    default:
      logging('Unsupported browser!');
      break;
  }

  return adapter;
};

},{"./chrome/chrome_shim":42,"./common_shim":44,"./edge/edge_shim":45,"./firefox/firefox_shim":47,"./safari/safari_shim":49,"./utils":50}],42:[function(require,module,exports){

/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';
var utils = require('../utils.js');
var logging = utils.log;

var chromeShim = {
  shimMediaStream: function(window) {
    window.MediaStream = window.MediaStream || window.webkitMediaStream;
  },

  shimOnTrack: function(window) {
    if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
        window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
        get: function() {
          return this._ontrack;
        },
        set: function(f) {
          if (this._ontrack) {
            this.removeEventListener('track', this._ontrack);
          }
          this.addEventListener('track', this._ontrack = f);
        }
      });
      var origSetRemoteDescription =
          window.RTCPeerConnection.prototype.setRemoteDescription;
      window.RTCPeerConnection.prototype.setRemoteDescription = function() {
        var pc = this;
        if (!pc._ontrackpoly) {
          pc._ontrackpoly = function(e) {
            // onaddstream does not fire when a track is added to an existing
            // stream. But stream.onaddtrack is implemented so we use that.
            e.stream.addEventListener('addtrack', function(te) {
              var receiver;
              if (window.RTCPeerConnection.prototype.getReceivers) {
                receiver = pc.getReceivers().find(function(r) {
                  return r.track && r.track.id === te.track.id;
                });
              } else {
                receiver = {track: te.track};
              }

              var event = new Event('track');
              event.track = te.track;
              event.receiver = receiver;
              event.transceiver = {receiver: receiver};
              event.streams = [e.stream];
              pc.dispatchEvent(event);
            });
            e.stream.getTracks().forEach(function(track) {
              var receiver;
              if (window.RTCPeerConnection.prototype.getReceivers) {
                receiver = pc.getReceivers().find(function(r) {
                  return r.track && r.track.id === track.id;
                });
              } else {
                receiver = {track: track};
              }
              var event = new Event('track');
              event.track = track;
              event.receiver = receiver;
              event.transceiver = {receiver: receiver};
              event.streams = [e.stream];
              pc.dispatchEvent(event);
            });
          };
          pc.addEventListener('addstream', pc._ontrackpoly);
        }
        return origSetRemoteDescription.apply(pc, arguments);
      };
    }
  },

  shimGetSendersWithDtmf: function(window) {
    // Overrides addTrack/removeTrack, depends on shimAddTrackRemoveTrack.
    if (typeof window === 'object' && window.RTCPeerConnection &&
        !('getSenders' in window.RTCPeerConnection.prototype) &&
        'createDTMFSender' in window.RTCPeerConnection.prototype) {
      var shimSenderWithDtmf = function(pc, track) {
        return {
          track: track,
          get dtmf() {
            if (this._dtmf === undefined) {
              if (track.kind === 'audio') {
                this._dtmf = pc.createDTMFSender(track);
              } else {
                this._dtmf = null;
              }
            }
            return this._dtmf;
          },
          _pc: pc
        };
      };

      // augment addTrack when getSenders is not available.
      if (!window.RTCPeerConnection.prototype.getSenders) {
        window.RTCPeerConnection.prototype.getSenders = function() {
          this._senders = this._senders || [];
          return this._senders.slice(); // return a copy of the internal state.
        };
        var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
        window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
          var pc = this;
          var sender = origAddTrack.apply(pc, arguments);
          if (!sender) {
            sender = shimSenderWithDtmf(pc, track);
            pc._senders.push(sender);
          }
          return sender;
        };

        var origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
        window.RTCPeerConnection.prototype.removeTrack = function(sender) {
          var pc = this;
          origRemoveTrack.apply(pc, arguments);
          var idx = pc._senders.indexOf(sender);
          if (idx !== -1) {
            pc._senders.splice(idx, 1);
          }
        };
      }
      var origAddStream = window.RTCPeerConnection.prototype.addStream;
      window.RTCPeerConnection.prototype.addStream = function(stream) {
        var pc = this;
        pc._senders = pc._senders || [];
        origAddStream.apply(pc, [stream]);
        stream.getTracks().forEach(function(track) {
          pc._senders.push(shimSenderWithDtmf(pc, track));
        });
      };

      var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
      window.RTCPeerConnection.prototype.removeStream = function(stream) {
        var pc = this;
        pc._senders = pc._senders || [];
        origRemoveStream.apply(pc, [stream]);

        stream.getTracks().forEach(function(track) {
          var sender = pc._senders.find(function(s) {
            return s.track === track;
          });
          if (sender) {
            pc._senders.splice(pc._senders.indexOf(sender), 1); // remove sender
          }
        });
      };
    } else if (typeof window === 'object' && window.RTCPeerConnection &&
               'getSenders' in window.RTCPeerConnection.prototype &&
               'createDTMFSender' in window.RTCPeerConnection.prototype &&
               window.RTCRtpSender &&
               !('dtmf' in window.RTCRtpSender.prototype)) {
      var origGetSenders = window.RTCPeerConnection.prototype.getSenders;
      window.RTCPeerConnection.prototype.getSenders = function() {
        var pc = this;
        var senders = origGetSenders.apply(pc, []);
        senders.forEach(function(sender) {
          sender._pc = pc;
        });
        return senders;
      };

      Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
        get: function() {
          if (this._dtmf === undefined) {
            if (this.track.kind === 'audio') {
              this._dtmf = this._pc.createDTMFSender(this.track);
            } else {
              this._dtmf = null;
            }
          }
          return this._dtmf;
        }
      });
    }
  },

  shimSourceObject: function(window) {
    var URL = window && window.URL;

    if (typeof window === 'object') {
      if (window.HTMLMediaElement &&
        !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
          get: function() {
            return this._srcObject;
          },
          set: function(stream) {
            var self = this;
            // Use _srcObject as a private property for this shim
            this._srcObject = stream;
            if (this.src) {
              URL.revokeObjectURL(this.src);
            }

            if (!stream) {
              this.src = '';
              return undefined;
            }
            this.src = URL.createObjectURL(stream);
            // We need to recreate the blob url when a track is added or
            // removed. Doing it manually since we want to avoid a recursion.
            stream.addEventListener('addtrack', function() {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
            stream.addEventListener('removetrack', function() {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
          }
        });
      }
    }
  },

  shimAddTrackRemoveTrack: function(window) {
    var browserDetails = utils.detectBrowser(window);
    // shim addTrack and removeTrack.
    if (window.RTCPeerConnection.prototype.addTrack &&
        browserDetails.version >= 63) {
      return;
    }

    // also shim pc.getLocalStreams when addTrack is shimmed
    // to return the original streams.
    var origGetLocalStreams = window.RTCPeerConnection.prototype
        .getLocalStreams;
    window.RTCPeerConnection.prototype.getLocalStreams = function() {
      var self = this;
      var nativeStreams = origGetLocalStreams.apply(this);
      self._reverseStreams = self._reverseStreams || {};
      return nativeStreams.map(function(stream) {
        return self._reverseStreams[stream.id];
      });
    };

    var origAddStream = window.RTCPeerConnection.prototype.addStream;
    window.RTCPeerConnection.prototype.addStream = function(stream) {
      var pc = this;
      pc._streams = pc._streams || {};
      pc._reverseStreams = pc._reverseStreams || {};

      stream.getTracks().forEach(function(track) {
        var alreadyExists = pc.getSenders().find(function(s) {
          return s.track === track;
        });
        if (alreadyExists) {
          throw new DOMException('Track already exists.',
              'InvalidAccessError');
        }
      });
      // Add identity mapping for consistency with addTrack.
      // Unless this is being used with a stream from addTrack.
      if (!pc._reverseStreams[stream.id]) {
        var newStream = new window.MediaStream(stream.getTracks());
        pc._streams[stream.id] = newStream;
        pc._reverseStreams[newStream.id] = stream;
        stream = newStream;
      }
      origAddStream.apply(pc, [stream]);
    };

    var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
    window.RTCPeerConnection.prototype.removeStream = function(stream) {
      var pc = this;
      pc._streams = pc._streams || {};
      pc._reverseStreams = pc._reverseStreams || {};

      origRemoveStream.apply(pc, [(pc._streams[stream.id] || stream)]);
      delete pc._reverseStreams[(pc._streams[stream.id] ?
          pc._streams[stream.id].id : stream.id)];
      delete pc._streams[stream.id];
    };

    window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
      var pc = this;
      if (pc.signalingState === 'closed') {
        throw new DOMException(
          'The RTCPeerConnection\'s signalingState is \'closed\'.',
          'InvalidStateError');
      }
      var streams = [].slice.call(arguments, 1);
      if (streams.length !== 1 ||
          !streams[0].getTracks().find(function(t) {
            return t === track;
          })) {
        // this is not fully correct but all we can manage without
        // [[associated MediaStreams]] internal slot.
        throw new DOMException(
          'The adapter.js addTrack polyfill only supports a single ' +
          ' stream which is associated with the specified track.',
          'NotSupportedError');
      }

      var alreadyExists = pc.getSenders().find(function(s) {
        return s.track === track;
      });
      if (alreadyExists) {
        throw new DOMException('Track already exists.',
            'InvalidAccessError');
      }

      pc._streams = pc._streams || {};
      pc._reverseStreams = pc._reverseStreams || {};
      var oldStream = pc._streams[stream.id];
      if (oldStream) {
        // this is using odd Chrome behaviour, use with caution:
        // https://bugs.chromium.org/p/webrtc/issues/detail?id=7815
        // Note: we rely on the high-level addTrack/dtmf shim to
        // create the sender with a dtmf sender.
        oldStream.addTrack(track);

        // Trigger ONN async.
        Promise.resolve().then(function() {
          pc.dispatchEvent(new Event('negotiationneeded'));
        });
      } else {
        var newStream = new window.MediaStream([track]);
        pc._streams[stream.id] = newStream;
        pc._reverseStreams[newStream.id] = stream;
        pc.addStream(newStream);
      }
      return pc.getSenders().find(function(s) {
        return s.track === track;
      });
    };

    // replace the internal stream id with the external one and
    // vice versa.
    function replaceInternalStreamId(pc, description) {
      var sdp = description.sdp;
      Object.keys(pc._reverseStreams || []).forEach(function(internalId) {
        var externalStream = pc._reverseStreams[internalId];
        var internalStream = pc._streams[externalStream.id];
        sdp = sdp.replace(new RegExp(internalStream.id, 'g'),
            externalStream.id);
      });
      return new RTCSessionDescription({
        type: description.type,
        sdp: sdp
      });
    }
    function replaceExternalStreamId(pc, description) {
      var sdp = description.sdp;
      Object.keys(pc._reverseStreams || []).forEach(function(internalId) {
        var externalStream = pc._reverseStreams[internalId];
        var internalStream = pc._streams[externalStream.id];
        sdp = sdp.replace(new RegExp(externalStream.id, 'g'),
            internalStream.id);
      });
      return new RTCSessionDescription({
        type: description.type,
        sdp: sdp
      });
    }
    ['createOffer', 'createAnswer'].forEach(function(method) {
      var nativeMethod = window.RTCPeerConnection.prototype[method];
      window.RTCPeerConnection.prototype[method] = function() {
        var pc = this;
        var args = arguments;
        var isLegacyCall = arguments.length &&
            typeof arguments[0] === 'function';
        if (isLegacyCall) {
          return nativeMethod.apply(pc, [
            function(description) {
              var desc = replaceInternalStreamId(pc, description);
              args[0].apply(null, [desc]);
            },
            function(err) {
              if (args[1]) {
                args[1].apply(null, err);
              }
            }, arguments[2]
          ]);
        }
        return nativeMethod.apply(pc, arguments)
        .then(function(description) {
          return replaceInternalStreamId(pc, description);
        });
      };
    });

    var origSetLocalDescription =
        window.RTCPeerConnection.prototype.setLocalDescription;
    window.RTCPeerConnection.prototype.setLocalDescription = function() {
      var pc = this;
      if (!arguments.length || !arguments[0].type) {
        return origSetLocalDescription.apply(pc, arguments);
      }
      arguments[0] = replaceExternalStreamId(pc, arguments[0]);
      return origSetLocalDescription.apply(pc, arguments);
    };

    // TODO: mangle getStats: https://w3c.github.io/webrtc-stats/#dom-rtcmediastreamstats-streamidentifier

    var origLocalDescription = Object.getOwnPropertyDescriptor(
        window.RTCPeerConnection.prototype, 'localDescription');
    Object.defineProperty(window.RTCPeerConnection.prototype,
        'localDescription', {
          get: function() {
            var pc = this;
            var description = origLocalDescription.get.apply(this);
            if (description.type === '') {
              return description;
            }
            return replaceInternalStreamId(pc, description);
          }
        });

    window.RTCPeerConnection.prototype.removeTrack = function(sender) {
      var pc = this;
      if (pc.signalingState === 'closed') {
        throw new DOMException(
          'The RTCPeerConnection\'s signalingState is \'closed\'.',
          'InvalidStateError');
      }
      // We can not yet check for sender instanceof RTCRtpSender
      // since we shim RTPSender. So we check if sender._pc is set.
      if (!sender._pc) {
        throw new DOMException('Argument 1 of RTCPeerConnection.removeTrack ' +
            'does not implement interface RTCRtpSender.', 'TypeError');
      }
      var isLocal = sender._pc === pc;
      if (!isLocal) {
        throw new DOMException('Sender was not created by this connection.',
            'InvalidAccessError');
      }

      // Search for the native stream the senders track belongs to.
      pc._streams = pc._streams || {};
      var stream;
      Object.keys(pc._streams).forEach(function(streamid) {
        var hasTrack = pc._streams[streamid].getTracks().find(function(track) {
          return sender.track === track;
        });
        if (hasTrack) {
          stream = pc._streams[streamid];
        }
      });

      if (stream) {
        if (stream.getTracks().length === 1) {
          // if this is the last track of the stream, remove the stream. This
          // takes care of any shimmed _senders.
          pc.removeStream(pc._reverseStreams[stream.id]);
        } else {
          // relying on the same odd chrome behaviour as above.
          stream.removeTrack(sender.track);
        }
        pc.dispatchEvent(new Event('negotiationneeded'));
      }
    };
  },

  shimPeerConnection: function(window) {
    var browserDetails = utils.detectBrowser(window);

    // The RTCPeerConnection object.
    if (!window.RTCPeerConnection) {
      window.RTCPeerConnection = function(pcConfig, pcConstraints) {
        // Translate iceTransportPolicy to iceTransports,
        // see https://code.google.com/p/webrtc/issues/detail?id=4869
        // this was fixed in M56 along with unprefixing RTCPeerConnection.
        logging('PeerConnection');
        if (pcConfig && pcConfig.iceTransportPolicy) {
          pcConfig.iceTransports = pcConfig.iceTransportPolicy;
        }

        return new window.webkitRTCPeerConnection(pcConfig, pcConstraints);
      };
      window.RTCPeerConnection.prototype =
          window.webkitRTCPeerConnection.prototype;
      // wrap static methods. Currently just generateCertificate.
      if (window.webkitRTCPeerConnection.generateCertificate) {
        Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
          get: function() {
            return window.webkitRTCPeerConnection.generateCertificate;
          }
        });
      }
    } else {
      // migrate from non-spec RTCIceServer.url to RTCIceServer.urls
      var OrigPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function(pcConfig, pcConstraints) {
        if (pcConfig && pcConfig.iceServers) {
          var newIceServers = [];
          for (var i = 0; i < pcConfig.iceServers.length; i++) {
            var server = pcConfig.iceServers[i];
            if (!server.hasOwnProperty('urls') &&
                server.hasOwnProperty('url')) {
              utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
              server = JSON.parse(JSON.stringify(server));
              server.urls = server.url;
              newIceServers.push(server);
            } else {
              newIceServers.push(pcConfig.iceServers[i]);
            }
          }
          pcConfig.iceServers = newIceServers;
        }
        return new OrigPeerConnection(pcConfig, pcConstraints);
      };
      window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
      // wrap static methods. Currently just generateCertificate.
      Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
        get: function() {
          return OrigPeerConnection.generateCertificate;
        }
      });
    }

    var origGetStats = window.RTCPeerConnection.prototype.getStats;
    window.RTCPeerConnection.prototype.getStats = function(selector,
        successCallback, errorCallback) {
      var self = this;
      var args = arguments;

      // If selector is a function then we are in the old style stats so just
      // pass back the original getStats format to avoid breaking old users.
      if (arguments.length > 0 && typeof selector === 'function') {
        return origGetStats.apply(this, arguments);
      }

      // When spec-style getStats is supported, return those when called with
      // either no arguments or the selector argument is null.
      if (origGetStats.length === 0 && (arguments.length === 0 ||
          typeof arguments[0] !== 'function')) {
        return origGetStats.apply(this, []);
      }

      var fixChromeStats_ = function(response) {
        var standardReport = {};
        var reports = response.result();
        reports.forEach(function(report) {
          var standardStats = {
            id: report.id,
            timestamp: report.timestamp,
            type: {
              localcandidate: 'local-candidate',
              remotecandidate: 'remote-candidate'
            }[report.type] || report.type
          };
          report.names().forEach(function(name) {
            standardStats[name] = report.stat(name);
          });
          standardReport[standardStats.id] = standardStats;
        });

        return standardReport;
      };

      // shim getStats with maplike support
      var makeMapStats = function(stats) {
        return new Map(Object.keys(stats).map(function(key) {
          return [key, stats[key]];
        }));
      };

      if (arguments.length >= 2) {
        var successCallbackWrapper_ = function(response) {
          args[1](makeMapStats(fixChromeStats_(response)));
        };

        return origGetStats.apply(this, [successCallbackWrapper_,
          arguments[0]]);
      }

      // promise-support
      return new Promise(function(resolve, reject) {
        origGetStats.apply(self, [
          function(response) {
            resolve(makeMapStats(fixChromeStats_(response)));
          }, reject]);
      }).then(successCallback, errorCallback);
    };

    // add promise support -- natively available in Chrome 51
    if (browserDetails.version < 51) {
      ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
          .forEach(function(method) {
            var nativeMethod = window.RTCPeerConnection.prototype[method];
            window.RTCPeerConnection.prototype[method] = function() {
              var args = arguments;
              var self = this;
              var promise = new Promise(function(resolve, reject) {
                nativeMethod.apply(self, [args[0], resolve, reject]);
              });
              if (args.length < 2) {
                return promise;
              }
              return promise.then(function() {
                args[1].apply(null, []);
              },
              function(err) {
                if (args.length >= 3) {
                  args[2].apply(null, [err]);
                }
              });
            };
          });
    }

    // promise support for createOffer and createAnswer. Available (without
    // bugs) since M52: crbug/619289
    if (browserDetails.version < 52) {
      ['createOffer', 'createAnswer'].forEach(function(method) {
        var nativeMethod = window.RTCPeerConnection.prototype[method];
        window.RTCPeerConnection.prototype[method] = function() {
          var self = this;
          if (arguments.length < 1 || (arguments.length === 1 &&
              typeof arguments[0] === 'object')) {
            var opts = arguments.length === 1 ? arguments[0] : undefined;
            return new Promise(function(resolve, reject) {
              nativeMethod.apply(self, [resolve, reject, opts]);
            });
          }
          return nativeMethod.apply(this, arguments);
        };
      });
    }

    // shim implicit creation of RTCSessionDescription/RTCIceCandidate
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
        .forEach(function(method) {
          var nativeMethod = window.RTCPeerConnection.prototype[method];
          window.RTCPeerConnection.prototype[method] = function() {
            arguments[0] = new ((method === 'addIceCandidate') ?
                window.RTCIceCandidate :
                window.RTCSessionDescription)(arguments[0]);
            return nativeMethod.apply(this, arguments);
          };
        });

    // support for addIceCandidate(null or undefined)
    var nativeAddIceCandidate =
        window.RTCPeerConnection.prototype.addIceCandidate;
    window.RTCPeerConnection.prototype.addIceCandidate = function() {
      if (!arguments[0]) {
        if (arguments[1]) {
          arguments[1].apply(null);
        }
        return Promise.resolve();
      }
      return nativeAddIceCandidate.apply(this, arguments);
    };
  }
};


// Expose public methods.
module.exports = {
  shimMediaStream: chromeShim.shimMediaStream,
  shimOnTrack: chromeShim.shimOnTrack,
  shimAddTrackRemoveTrack: chromeShim.shimAddTrackRemoveTrack,
  shimGetSendersWithDtmf: chromeShim.shimGetSendersWithDtmf,
  shimSourceObject: chromeShim.shimSourceObject,
  shimPeerConnection: chromeShim.shimPeerConnection,
  shimGetUserMedia: require('./getusermedia')
};

},{"../utils.js":50,"./getusermedia":43}],43:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';
var utils = require('../utils.js');
var logging = utils.log;

// Expose public methods.
module.exports = function(window) {
  var browserDetails = utils.detectBrowser(window);
  var navigator = window && window.navigator;

  var constraintsToChrome_ = function(c) {
    if (typeof c !== 'object' || c.mandatory || c.optional) {
      return c;
    }
    var cc = {};
    Object.keys(c).forEach(function(key) {
      if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
        return;
      }
      var r = (typeof c[key] === 'object') ? c[key] : {ideal: c[key]};
      if (r.exact !== undefined && typeof r.exact === 'number') {
        r.min = r.max = r.exact;
      }
      var oldname_ = function(prefix, name) {
        if (prefix) {
          return prefix + name.charAt(0).toUpperCase() + name.slice(1);
        }
        return (name === 'deviceId') ? 'sourceId' : name;
      };
      if (r.ideal !== undefined) {
        cc.optional = cc.optional || [];
        var oc = {};
        if (typeof r.ideal === 'number') {
          oc[oldname_('min', key)] = r.ideal;
          cc.optional.push(oc);
          oc = {};
          oc[oldname_('max', key)] = r.ideal;
          cc.optional.push(oc);
        } else {
          oc[oldname_('', key)] = r.ideal;
          cc.optional.push(oc);
        }
      }
      if (r.exact !== undefined && typeof r.exact !== 'number') {
        cc.mandatory = cc.mandatory || {};
        cc.mandatory[oldname_('', key)] = r.exact;
      } else {
        ['min', 'max'].forEach(function(mix) {
          if (r[mix] !== undefined) {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname_(mix, key)] = r[mix];
          }
        });
      }
    });
    if (c.advanced) {
      cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
  };

  var shimConstraints_ = function(constraints, func) {
    constraints = JSON.parse(JSON.stringify(constraints));
    if (constraints && typeof constraints.audio === 'object') {
      var remap = function(obj, a, b) {
        if (a in obj && !(b in obj)) {
          obj[b] = obj[a];
          delete obj[a];
        }
      };
      constraints = JSON.parse(JSON.stringify(constraints));
      remap(constraints.audio, 'autoGainControl', 'googAutoGainControl');
      remap(constraints.audio, 'noiseSuppression', 'googNoiseSuppression');
      constraints.audio = constraintsToChrome_(constraints.audio);
    }
    if (constraints && typeof constraints.video === 'object') {
      // Shim facingMode for mobile & surface pro.
      var face = constraints.video.facingMode;
      face = face && ((typeof face === 'object') ? face : {ideal: face});
      var getSupportedFacingModeLies = browserDetails.version < 66;

      if ((face && (face.exact === 'user' || face.exact === 'environment' ||
                    face.ideal === 'user' || face.ideal === 'environment')) &&
          !(navigator.mediaDevices.getSupportedConstraints &&
            navigator.mediaDevices.getSupportedConstraints().facingMode &&
            !getSupportedFacingModeLies)) {
        delete constraints.video.facingMode;
        var matches;
        if (face.exact === 'environment' || face.ideal === 'environment') {
          matches = ['back', 'rear'];
        } else if (face.exact === 'user' || face.ideal === 'user') {
          matches = ['front'];
        }
        if (matches) {
          // Look for matches in label, or use last cam for back (typical).
          return navigator.mediaDevices.enumerateDevices()
          .then(function(devices) {
            devices = devices.filter(function(d) {
              return d.kind === 'videoinput';
            });
            var dev = devices.find(function(d) {
              return matches.some(function(match) {
                return d.label.toLowerCase().indexOf(match) !== -1;
              });
            });
            if (!dev && devices.length && matches.indexOf('back') !== -1) {
              dev = devices[devices.length - 1]; // more likely the back cam
            }
            if (dev) {
              constraints.video.deviceId = face.exact ? {exact: dev.deviceId} :
                                                        {ideal: dev.deviceId};
            }
            constraints.video = constraintsToChrome_(constraints.video);
            logging('chrome: ' + JSON.stringify(constraints));
            return func(constraints);
          });
        }
      }
      constraints.video = constraintsToChrome_(constraints.video);
    }
    logging('chrome: ' + JSON.stringify(constraints));
    return func(constraints);
  };

  var shimError_ = function(e) {
    return {
      name: {
        PermissionDeniedError: 'NotAllowedError',
        InvalidStateError: 'NotReadableError',
        DevicesNotFoundError: 'NotFoundError',
        ConstraintNotSatisfiedError: 'OverconstrainedError',
        TrackStartError: 'NotReadableError',
        MediaDeviceFailedDueToShutdown: 'NotReadableError',
        MediaDeviceKillSwitchOn: 'NotReadableError'
      }[e.name] || e.name,
      message: e.message,
      constraint: e.constraintName,
      toString: function() {
        return this.name + (this.message && ': ') + this.message;
      }
    };
  };

  var getUserMedia_ = function(constraints, onSuccess, onError) {
    shimConstraints_(constraints, function(c) {
      navigator.webkitGetUserMedia(c, onSuccess, function(e) {
        if (onError) {
          onError(shimError_(e));
        }
      });
    });
  };

  navigator.getUserMedia = getUserMedia_;

  // Returns the result of getUserMedia as a Promise.
  var getUserMediaPromise_ = function(constraints) {
    return new Promise(function(resolve, reject) {
      navigator.getUserMedia(constraints, resolve, reject);
    });
  };

  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {
      getUserMedia: getUserMediaPromise_,
      enumerateDevices: function() {
        return new Promise(function(resolve) {
          var kinds = {audio: 'audioinput', video: 'videoinput'};
          return window.MediaStreamTrack.getSources(function(devices) {
            resolve(devices.map(function(device) {
              return {label: device.label,
                kind: kinds[device.kind],
                deviceId: device.id,
                groupId: ''};
            }));
          });
        });
      },
      getSupportedConstraints: function() {
        return {
          deviceId: true, echoCancellation: true, facingMode: true,
          frameRate: true, height: true, width: true
        };
      }
    };
  }

  // A shim for getUserMedia method on the mediaDevices object.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return getUserMediaPromise_(constraints);
    };
  } else {
    // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
    // function which returns a Promise, it does not accept spec-style
    // constraints.
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(cs) {
      return shimConstraints_(cs, function(c) {
        return origGetUserMedia(c).then(function(stream) {
          if (c.audio && !stream.getAudioTracks().length ||
              c.video && !stream.getVideoTracks().length) {
            stream.getTracks().forEach(function(track) {
              track.stop();
            });
            throw new DOMException('', 'NotFoundError');
          }
          return stream;
        }, function(e) {
          return Promise.reject(shimError_(e));
        });
      });
    };
  }

  // Dummy devicechange event methods.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (typeof navigator.mediaDevices.addEventListener === 'undefined') {
    navigator.mediaDevices.addEventListener = function() {
      logging('Dummy mediaDevices.addEventListener called.');
    };
  }
  if (typeof navigator.mediaDevices.removeEventListener === 'undefined') {
    navigator.mediaDevices.removeEventListener = function() {
      logging('Dummy mediaDevices.removeEventListener called.');
    };
  }
};

},{"../utils.js":50}],44:[function(require,module,exports){
/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';

var SDPUtils = require('sdp');
var utils = require('./utils');

// Wraps the peerconnection event eventNameToWrap in a function
// which returns the modified event object.
function wrapPeerConnectionEvent(window, eventNameToWrap, wrapper) {
  if (!window.RTCPeerConnection) {
    return;
  }
  var proto = window.RTCPeerConnection.prototype;
  var nativeAddEventListener = proto.addEventListener;
  proto.addEventListener = function(nativeEventName, cb) {
    if (nativeEventName !== eventNameToWrap) {
      return nativeAddEventListener.apply(this, arguments);
    }
    var wrappedCallback = function(e) {
      cb(wrapper(e));
    };
    this._eventMap = this._eventMap || {};
    this._eventMap[cb] = wrappedCallback;
    return nativeAddEventListener.apply(this, [nativeEventName,
      wrappedCallback]);
  };

  var nativeRemoveEventListener = proto.removeEventListener;
  proto.removeEventListener = function(nativeEventName, cb) {
    if (nativeEventName !== eventNameToWrap || !this._eventMap
        || !this._eventMap[cb]) {
      return nativeRemoveEventListener.apply(this, arguments);
    }
    var unwrappedCb = this._eventMap[cb];
    delete this._eventMap[cb];
    return nativeRemoveEventListener.apply(this, [nativeEventName,
      unwrappedCb]);
  };

  Object.defineProperty(proto, 'on' + eventNameToWrap, {
    get: function() {
      return this['_on' + eventNameToWrap];
    },
    set: function(cb) {
      if (this['_on' + eventNameToWrap]) {
        this.removeEventListener(eventNameToWrap,
            this['_on' + eventNameToWrap]);
        delete this['_on' + eventNameToWrap];
      }
      if (cb) {
        this.addEventListener(eventNameToWrap,
            this['_on' + eventNameToWrap] = cb);
      }
    }
  });
}

module.exports = {
  shimRTCIceCandidate: function(window) {
    // foundation is arbitrarily chosen as an indicator for full support for
    // https://w3c.github.io/webrtc-pc/#rtcicecandidate-interface
    if (window.RTCIceCandidate && 'foundation' in
        window.RTCIceCandidate.prototype) {
      return;
    }

    var NativeRTCIceCandidate = window.RTCIceCandidate;
    window.RTCIceCandidate = function(args) {
      // Remove the a= which shouldn't be part of the candidate string.
      if (typeof args === 'object' && args.candidate &&
          args.candidate.indexOf('a=') === 0) {
        args = JSON.parse(JSON.stringify(args));
        args.candidate = args.candidate.substr(2);
      }

      // Augment the native candidate with the parsed fields.
      var nativeCandidate = new NativeRTCIceCandidate(args);
      var parsedCandidate = SDPUtils.parseCandidate(args.candidate);
      var augmentedCandidate = Object.assign(nativeCandidate,
          parsedCandidate);

      // Add a serializer that does not serialize the extra attributes.
      augmentedCandidate.toJSON = function() {
        return {
          candidate: augmentedCandidate.candidate,
          sdpMid: augmentedCandidate.sdpMid,
          sdpMLineIndex: augmentedCandidate.sdpMLineIndex,
          usernameFragment: augmentedCandidate.usernameFragment,
        };
      };
      return augmentedCandidate;
    };

    // Hook up the augmented candidate in onicecandidate and
    // addEventListener('icecandidate', ...)
    wrapPeerConnectionEvent(window, 'icecandidate', function(e) {
      if (e.candidate) {
        Object.defineProperty(e, 'candidate', {
          value: new window.RTCIceCandidate(e.candidate),
          writable: 'false'
        });
      }
      return e;
    });
  },

  // shimCreateObjectURL must be called before shimSourceObject to avoid loop.

  shimCreateObjectURL: function(window) {
    var URL = window && window.URL;

    if (!(typeof window === 'object' && window.HTMLMediaElement &&
          'srcObject' in window.HTMLMediaElement.prototype &&
        URL.createObjectURL && URL.revokeObjectURL)) {
      // Only shim CreateObjectURL using srcObject if srcObject exists.
      return undefined;
    }

    var nativeCreateObjectURL = URL.createObjectURL.bind(URL);
    var nativeRevokeObjectURL = URL.revokeObjectURL.bind(URL);
    var streams = new Map(), newId = 0;

    URL.createObjectURL = function(stream) {
      if ('getTracks' in stream) {
        var url = 'polyblob:' + (++newId);
        streams.set(url, stream);
        utils.deprecated('URL.createObjectURL(stream)',
            'elem.srcObject = stream');
        return url;
      }
      return nativeCreateObjectURL(stream);
    };
    URL.revokeObjectURL = function(url) {
      nativeRevokeObjectURL(url);
      streams.delete(url);
    };

    var dsc = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype,
                                              'src');
    Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
      get: function() {
        return dsc.get.apply(this);
      },
      set: function(url) {
        this.srcObject = streams.get(url) || null;
        return dsc.set.apply(this, [url]);
      }
    });

    var nativeSetAttribute = window.HTMLMediaElement.prototype.setAttribute;
    window.HTMLMediaElement.prototype.setAttribute = function() {
      if (arguments.length === 2 &&
          ('' + arguments[0]).toLowerCase() === 'src') {
        this.srcObject = streams.get(arguments[1]) || null;
      }
      return nativeSetAttribute.apply(this, arguments);
    };
  }
};

},{"./utils":50,"sdp":39}],45:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';

var utils = require('../utils');
var shimRTCPeerConnection = require('rtcpeerconnection-shim');

module.exports = {
  shimGetUserMedia: require('./getusermedia'),
  shimPeerConnection: function(window) {
    var browserDetails = utils.detectBrowser(window);

    if (window.RTCIceGatherer) {
      // ORTC defines an RTCIceCandidate object but no constructor.
      // Not implemented in Edge.
      if (!window.RTCIceCandidate) {
        window.RTCIceCandidate = function(args) {
          return args;
        };
      }
      // ORTC does not have a session description object but
      // other browsers (i.e. Chrome) that will support both PC and ORTC
      // in the future might have this defined already.
      if (!window.RTCSessionDescription) {
        window.RTCSessionDescription = function(args) {
          return args;
        };
      }
      // this adds an additional event listener to MediaStrackTrack that signals
      // when a tracks enabled property was changed. Workaround for a bug in
      // addStream, see below. No longer required in 15025+
      if (browserDetails.version < 15025) {
        var origMSTEnabled = Object.getOwnPropertyDescriptor(
            window.MediaStreamTrack.prototype, 'enabled');
        Object.defineProperty(window.MediaStreamTrack.prototype, 'enabled', {
          set: function(value) {
            origMSTEnabled.set.call(this, value);
            var ev = new Event('enabled');
            ev.enabled = value;
            this.dispatchEvent(ev);
          }
        });
      }
    }

    // ORTC defines the DTMF sender a bit different.
    // https://github.com/w3c/ortc/issues/714
    if (window.RTCRtpSender && !('dtmf' in window.RTCRtpSender.prototype)) {
      Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
        get: function() {
          if (this._dtmf === undefined) {
            if (this.track.kind === 'audio') {
              this._dtmf = new window.RTCDtmfSender(this);
            } else if (this.track.kind === 'video') {
              this._dtmf = null;
            }
          }
          return this._dtmf;
        }
      });
    }

    window.RTCPeerConnection =
        shimRTCPeerConnection(window, browserDetails.version);
  },
  shimReplaceTrack: function(window) {
    // ORTC has replaceTrack -- https://github.com/w3c/ortc/issues/614
    if (window.RTCRtpSender &&
        !('replaceTrack' in window.RTCRtpSender.prototype)) {
      window.RTCRtpSender.prototype.replaceTrack =
          window.RTCRtpSender.prototype.setTrack;
    }
  }
};

},{"../utils":50,"./getusermedia":46,"rtcpeerconnection-shim":34}],46:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';

// Expose public methods.
module.exports = function(window) {
  var navigator = window && window.navigator;

  var shimError_ = function(e) {
    return {
      name: {PermissionDeniedError: 'NotAllowedError'}[e.name] || e.name,
      message: e.message,
      constraint: e.constraint,
      toString: function() {
        return this.name;
      }
    };
  };

  // getUserMedia error shim.
  var origGetUserMedia = navigator.mediaDevices.getUserMedia.
      bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function(c) {
    return origGetUserMedia(c).catch(function(e) {
      return Promise.reject(shimError_(e));
    });
  };
};

},{}],47:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';

var utils = require('../utils');

var firefoxShim = {
  shimOnTrack: function(window) {
    if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
        window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
        get: function() {
          return this._ontrack;
        },
        set: function(f) {
          if (this._ontrack) {
            this.removeEventListener('track', this._ontrack);
            this.removeEventListener('addstream', this._ontrackpoly);
          }
          this.addEventListener('track', this._ontrack = f);
          this.addEventListener('addstream', this._ontrackpoly = function(e) {
            e.stream.getTracks().forEach(function(track) {
              var event = new Event('track');
              event.track = track;
              event.receiver = {track: track};
              event.transceiver = {receiver: event.receiver};
              event.streams = [e.stream];
              this.dispatchEvent(event);
            }.bind(this));
          }.bind(this));
        }
      });
    }
    if (typeof window === 'object' && window.RTCTrackEvent &&
        ('receiver' in window.RTCTrackEvent.prototype) &&
        !('transceiver' in window.RTCTrackEvent.prototype)) {
      Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
        get: function() {
          return {receiver: this.receiver};
        }
      });
    }
  },

  shimSourceObject: function(window) {
    // Firefox has supported mozSrcObject since FF22, unprefixed in 42.
    if (typeof window === 'object') {
      if (window.HTMLMediaElement &&
        !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
          get: function() {
            return this.mozSrcObject;
          },
          set: function(stream) {
            this.mozSrcObject = stream;
          }
        });
      }
    }
  },

  shimPeerConnection: function(window) {
    var browserDetails = utils.detectBrowser(window);

    if (typeof window !== 'object' || !(window.RTCPeerConnection ||
        window.mozRTCPeerConnection)) {
      return; // probably media.peerconnection.enabled=false in about:config
    }
    // The RTCPeerConnection object.
    if (!window.RTCPeerConnection) {
      window.RTCPeerConnection = function(pcConfig, pcConstraints) {
        if (browserDetails.version < 38) {
          // .urls is not supported in FF < 38.
          // create RTCIceServers with a single url.
          if (pcConfig && pcConfig.iceServers) {
            var newIceServers = [];
            for (var i = 0; i < pcConfig.iceServers.length; i++) {
              var server = pcConfig.iceServers[i];
              if (server.hasOwnProperty('urls')) {
                for (var j = 0; j < server.urls.length; j++) {
                  var newServer = {
                    url: server.urls[j]
                  };
                  if (server.urls[j].indexOf('turn') === 0) {
                    newServer.username = server.username;
                    newServer.credential = server.credential;
                  }
                  newIceServers.push(newServer);
                }
              } else {
                newIceServers.push(pcConfig.iceServers[i]);
              }
            }
            pcConfig.iceServers = newIceServers;
          }
        }
        return new window.mozRTCPeerConnection(pcConfig, pcConstraints);
      };
      window.RTCPeerConnection.prototype =
          window.mozRTCPeerConnection.prototype;

      // wrap static methods. Currently just generateCertificate.
      if (window.mozRTCPeerConnection.generateCertificate) {
        Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
          get: function() {
            return window.mozRTCPeerConnection.generateCertificate;
          }
        });
      }

      window.RTCSessionDescription = window.mozRTCSessionDescription;
      window.RTCIceCandidate = window.mozRTCIceCandidate;
    }

    // shim away need for obsolete RTCIceCandidate/RTCSessionDescription.
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
        .forEach(function(method) {
          var nativeMethod = window.RTCPeerConnection.prototype[method];
          window.RTCPeerConnection.prototype[method] = function() {
            arguments[0] = new ((method === 'addIceCandidate') ?
                window.RTCIceCandidate :
                window.RTCSessionDescription)(arguments[0]);
            return nativeMethod.apply(this, arguments);
          };
        });

    // support for addIceCandidate(null or undefined)
    var nativeAddIceCandidate =
        window.RTCPeerConnection.prototype.addIceCandidate;
    window.RTCPeerConnection.prototype.addIceCandidate = function() {
      if (!arguments[0]) {
        if (arguments[1]) {
          arguments[1].apply(null);
        }
        return Promise.resolve();
      }
      return nativeAddIceCandidate.apply(this, arguments);
    };

    // shim getStats with maplike support
    var makeMapStats = function(stats) {
      var map = new Map();
      Object.keys(stats).forEach(function(key) {
        map.set(key, stats[key]);
        map[key] = stats[key];
      });
      return map;
    };

    var modernStatsTypes = {
      inboundrtp: 'inbound-rtp',
      outboundrtp: 'outbound-rtp',
      candidatepair: 'candidate-pair',
      localcandidate: 'local-candidate',
      remotecandidate: 'remote-candidate'
    };

    var nativeGetStats = window.RTCPeerConnection.prototype.getStats;
    window.RTCPeerConnection.prototype.getStats = function(
      selector,
      onSucc,
      onErr
    ) {
      return nativeGetStats.apply(this, [selector || null])
        .then(function(stats) {
          if (browserDetails.version < 48) {
            stats = makeMapStats(stats);
          }
          if (browserDetails.version < 53 && !onSucc) {
            // Shim only promise getStats with spec-hyphens in type names
            // Leave callback version alone; misc old uses of forEach before Map
            try {
              stats.forEach(function(stat) {
                stat.type = modernStatsTypes[stat.type] || stat.type;
              });
            } catch (e) {
              if (e.name !== 'TypeError') {
                throw e;
              }
              // Avoid TypeError: "type" is read-only, in old versions. 34-43ish
              stats.forEach(function(stat, i) {
                stats.set(i, Object.assign({}, stat, {
                  type: modernStatsTypes[stat.type] || stat.type
                }));
              });
            }
          }
          return stats;
        })
        .then(onSucc, onErr);
    };
  }
};

// Expose public methods.
module.exports = {
  shimOnTrack: firefoxShim.shimOnTrack,
  shimSourceObject: firefoxShim.shimSourceObject,
  shimPeerConnection: firefoxShim.shimPeerConnection,
  shimGetUserMedia: require('./getusermedia')
};

},{"../utils":50,"./getusermedia":48}],48:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';

var utils = require('../utils');
var logging = utils.log;

// Expose public methods.
module.exports = function(window) {
  var browserDetails = utils.detectBrowser(window);
  var navigator = window && window.navigator;
  var MediaStreamTrack = window && window.MediaStreamTrack;

  var shimError_ = function(e) {
    return {
      name: {
        InternalError: 'NotReadableError',
        NotSupportedError: 'TypeError',
        PermissionDeniedError: 'NotAllowedError',
        SecurityError: 'NotAllowedError'
      }[e.name] || e.name,
      message: {
        'The operation is insecure.': 'The request is not allowed by the ' +
        'user agent or the platform in the current context.'
      }[e.message] || e.message,
      constraint: e.constraint,
      toString: function() {
        return this.name + (this.message && ': ') + this.message;
      }
    };
  };

  // getUserMedia constraints shim.
  var getUserMedia_ = function(constraints, onSuccess, onError) {
    var constraintsToFF37_ = function(c) {
      if (typeof c !== 'object' || c.require) {
        return c;
      }
      var require = [];
      Object.keys(c).forEach(function(key) {
        if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
          return;
        }
        var r = c[key] = (typeof c[key] === 'object') ?
            c[key] : {ideal: c[key]};
        if (r.min !== undefined ||
            r.max !== undefined || r.exact !== undefined) {
          require.push(key);
        }
        if (r.exact !== undefined) {
          if (typeof r.exact === 'number') {
            r. min = r.max = r.exact;
          } else {
            c[key] = r.exact;
          }
          delete r.exact;
        }
        if (r.ideal !== undefined) {
          c.advanced = c.advanced || [];
          var oc = {};
          if (typeof r.ideal === 'number') {
            oc[key] = {min: r.ideal, max: r.ideal};
          } else {
            oc[key] = r.ideal;
          }
          c.advanced.push(oc);
          delete r.ideal;
          if (!Object.keys(r).length) {
            delete c[key];
          }
        }
      });
      if (require.length) {
        c.require = require;
      }
      return c;
    };
    constraints = JSON.parse(JSON.stringify(constraints));
    if (browserDetails.version < 38) {
      logging('spec: ' + JSON.stringify(constraints));
      if (constraints.audio) {
        constraints.audio = constraintsToFF37_(constraints.audio);
      }
      if (constraints.video) {
        constraints.video = constraintsToFF37_(constraints.video);
      }
      logging('ff37: ' + JSON.stringify(constraints));
    }
    return navigator.mozGetUserMedia(constraints, onSuccess, function(e) {
      onError(shimError_(e));
    });
  };

  // Returns the result of getUserMedia as a Promise.
  var getUserMediaPromise_ = function(constraints) {
    return new Promise(function(resolve, reject) {
      getUserMedia_(constraints, resolve, reject);
    });
  };

  // Shim for mediaDevices on older versions.
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {getUserMedia: getUserMediaPromise_,
      addEventListener: function() { },
      removeEventListener: function() { }
    };
  }
  navigator.mediaDevices.enumerateDevices =
      navigator.mediaDevices.enumerateDevices || function() {
        return new Promise(function(resolve) {
          var infos = [
            {kind: 'audioinput', deviceId: 'default', label: '', groupId: ''},
            {kind: 'videoinput', deviceId: 'default', label: '', groupId: ''}
          ];
          resolve(infos);
        });
      };

  if (browserDetails.version < 41) {
    // Work around http://bugzil.la/1169665
    var orgEnumerateDevices =
        navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = function() {
      return orgEnumerateDevices().then(undefined, function(e) {
        if (e.name === 'NotFoundError') {
          return [];
        }
        throw e;
      });
    };
  }
  if (browserDetails.version < 49) {
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(c) {
      return origGetUserMedia(c).then(function(stream) {
        // Work around https://bugzil.la/802326
        if (c.audio && !stream.getAudioTracks().length ||
            c.video && !stream.getVideoTracks().length) {
          stream.getTracks().forEach(function(track) {
            track.stop();
          });
          throw new DOMException('The object can not be found here.',
                                 'NotFoundError');
        }
        return stream;
      }, function(e) {
        return Promise.reject(shimError_(e));
      });
    };
  }
  if (!(browserDetails.version > 55 &&
      'autoGainControl' in navigator.mediaDevices.getSupportedConstraints())) {
    var remap = function(obj, a, b) {
      if (a in obj && !(b in obj)) {
        obj[b] = obj[a];
        delete obj[a];
      }
    };

    var nativeGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(c) {
      if (typeof c === 'object' && typeof c.audio === 'object') {
        c = JSON.parse(JSON.stringify(c));
        remap(c.audio, 'autoGainControl', 'mozAutoGainControl');
        remap(c.audio, 'noiseSuppression', 'mozNoiseSuppression');
      }
      return nativeGetUserMedia(c);
    };

    if (MediaStreamTrack && MediaStreamTrack.prototype.getSettings) {
      var nativeGetSettings = MediaStreamTrack.prototype.getSettings;
      MediaStreamTrack.prototype.getSettings = function() {
        var obj = nativeGetSettings.apply(this, arguments);
        remap(obj, 'mozAutoGainControl', 'autoGainControl');
        remap(obj, 'mozNoiseSuppression', 'noiseSuppression');
        return obj;
      };
    }

    if (MediaStreamTrack && MediaStreamTrack.prototype.applyConstraints) {
      var nativeApplyConstraints = MediaStreamTrack.prototype.applyConstraints;
      MediaStreamTrack.prototype.applyConstraints = function(c) {
        if (this.kind === 'audio' && typeof c === 'object') {
          c = JSON.parse(JSON.stringify(c));
          remap(c, 'autoGainControl', 'mozAutoGainControl');
          remap(c, 'noiseSuppression', 'mozNoiseSuppression');
        }
        return nativeApplyConstraints.apply(this, [c]);
      };
    }
  }
  navigator.getUserMedia = function(constraints, onSuccess, onError) {
    if (browserDetails.version < 44) {
      return getUserMedia_(constraints, onSuccess, onError);
    }
    // Replace Firefox 44+'s deprecation warning with unprefixed version.
    utils.deprecated('navigator.getUserMedia',
        'navigator.mediaDevices.getUserMedia');
    navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
  };
};

},{"../utils":50}],49:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';
var utils = require('../utils');

var safariShim = {
  // TODO: DrAlex, should be here, double check against LayoutTests

  // TODO: once the back-end for the mac port is done, add.
  // TODO: check for webkitGTK+
  // shimPeerConnection: function() { },

  shimLocalStreamsAPI: function(window) {
    if (typeof window !== 'object' || !window.RTCPeerConnection) {
      return;
    }
    if (!('getLocalStreams' in window.RTCPeerConnection.prototype)) {
      window.RTCPeerConnection.prototype.getLocalStreams = function() {
        if (!this._localStreams) {
          this._localStreams = [];
        }
        return this._localStreams;
      };
    }
    if (!('getStreamById' in window.RTCPeerConnection.prototype)) {
      window.RTCPeerConnection.prototype.getStreamById = function(id) {
        var result = null;
        if (this._localStreams) {
          this._localStreams.forEach(function(stream) {
            if (stream.id === id) {
              result = stream;
            }
          });
        }
        if (this._remoteStreams) {
          this._remoteStreams.forEach(function(stream) {
            if (stream.id === id) {
              result = stream;
            }
          });
        }
        return result;
      };
    }
    if (!('addStream' in window.RTCPeerConnection.prototype)) {
      var _addTrack = window.RTCPeerConnection.prototype.addTrack;
      window.RTCPeerConnection.prototype.addStream = function(stream) {
        if (!this._localStreams) {
          this._localStreams = [];
        }
        if (this._localStreams.indexOf(stream) === -1) {
          this._localStreams.push(stream);
        }
        var self = this;
        stream.getTracks().forEach(function(track) {
          _addTrack.call(self, track, stream);
        });
      };

      window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
        if (stream) {
          if (!this._localStreams) {
            this._localStreams = [stream];
          } else if (this._localStreams.indexOf(stream) === -1) {
            this._localStreams.push(stream);
          }
        }
        _addTrack.call(this, track, stream);
      };
    }
    if (!('removeStream' in window.RTCPeerConnection.prototype)) {
      window.RTCPeerConnection.prototype.removeStream = function(stream) {
        if (!this._localStreams) {
          this._localStreams = [];
        }
        var index = this._localStreams.indexOf(stream);
        if (index === -1) {
          return;
        }
        this._localStreams.splice(index, 1);
        var self = this;
        var tracks = stream.getTracks();
        this.getSenders().forEach(function(sender) {
          if (tracks.indexOf(sender.track) !== -1) {
            self.removeTrack(sender);
          }
        });
      };
    }
  },
  shimRemoteStreamsAPI: function(window) {
    if (typeof window !== 'object' || !window.RTCPeerConnection) {
      return;
    }
    if (!('getRemoteStreams' in window.RTCPeerConnection.prototype)) {
      window.RTCPeerConnection.prototype.getRemoteStreams = function() {
        return this._remoteStreams ? this._remoteStreams : [];
      };
    }
    if (!('onaddstream' in window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'onaddstream', {
        get: function() {
          return this._onaddstream;
        },
        set: function(f) {
          if (this._onaddstream) {
            this.removeEventListener('addstream', this._onaddstream);
            this.removeEventListener('track', this._onaddstreampoly);
          }
          this.addEventListener('addstream', this._onaddstream = f);
          this.addEventListener('track', this._onaddstreampoly = function(e) {
            var stream = e.streams[0];
            if (!this._remoteStreams) {
              this._remoteStreams = [];
            }
            if (this._remoteStreams.indexOf(stream) >= 0) {
              return;
            }
            this._remoteStreams.push(stream);
            var event = new Event('addstream');
            event.stream = e.streams[0];
            this.dispatchEvent(event);
          }.bind(this));
        }
      });
    }
  },
  shimCallbacksAPI: function(window) {
    if (typeof window !== 'object' || !window.RTCPeerConnection) {
      return;
    }
    var prototype = window.RTCPeerConnection.prototype;
    var createOffer = prototype.createOffer;
    var createAnswer = prototype.createAnswer;
    var setLocalDescription = prototype.setLocalDescription;
    var setRemoteDescription = prototype.setRemoteDescription;
    var addIceCandidate = prototype.addIceCandidate;

    prototype.createOffer = function(successCallback, failureCallback) {
      var options = (arguments.length >= 2) ? arguments[2] : arguments[0];
      var promise = createOffer.apply(this, [options]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };

    prototype.createAnswer = function(successCallback, failureCallback) {
      var options = (arguments.length >= 2) ? arguments[2] : arguments[0];
      var promise = createAnswer.apply(this, [options]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };

    var withCallback = function(description, successCallback, failureCallback) {
      var promise = setLocalDescription.apply(this, [description]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.setLocalDescription = withCallback;

    withCallback = function(description, successCallback, failureCallback) {
      var promise = setRemoteDescription.apply(this, [description]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.setRemoteDescription = withCallback;

    withCallback = function(candidate, successCallback, failureCallback) {
      var promise = addIceCandidate.apply(this, [candidate]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.addIceCandidate = withCallback;
  },
  shimGetUserMedia: function(window) {
    var navigator = window && window.navigator;

    if (!navigator.getUserMedia) {
      if (navigator.webkitGetUserMedia) {
        navigator.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
      } else if (navigator.mediaDevices &&
          navigator.mediaDevices.getUserMedia) {
        navigator.getUserMedia = function(constraints, cb, errcb) {
          navigator.mediaDevices.getUserMedia(constraints)
          .then(cb, errcb);
        }.bind(navigator);
      }
    }
  },
  shimRTCIceServerUrls: function(window) {
    // migrate from non-spec RTCIceServer.url to RTCIceServer.urls
    var OrigPeerConnection = window.RTCPeerConnection;
    window.RTCPeerConnection = function(pcConfig, pcConstraints) {
      if (pcConfig && pcConfig.iceServers) {
        var newIceServers = [];
        for (var i = 0; i < pcConfig.iceServers.length; i++) {
          var server = pcConfig.iceServers[i];
          if (!server.hasOwnProperty('urls') &&
              server.hasOwnProperty('url')) {
            utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
            server = JSON.parse(JSON.stringify(server));
            server.urls = server.url;
            delete server.url;
            newIceServers.push(server);
          } else {
            newIceServers.push(pcConfig.iceServers[i]);
          }
        }
        pcConfig.iceServers = newIceServers;
      }
      return new OrigPeerConnection(pcConfig, pcConstraints);
    };
    window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
    // wrap static methods. Currently just generateCertificate.
    if ('generateCertificate' in window.RTCPeerConnection) {
      Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
        get: function() {
          return OrigPeerConnection.generateCertificate;
        }
      });
    }
  },
  shimTrackEventTransceiver: function(window) {
    // Add event.transceiver member over deprecated event.receiver
    if (typeof window === 'object' && window.RTCPeerConnection &&
        ('receiver' in window.RTCTrackEvent.prototype) &&
        // can't check 'transceiver' in window.RTCTrackEvent.prototype, as it is
        // defined for some reason even when window.RTCTransceiver is not.
        !window.RTCTransceiver) {
      Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
        get: function() {
          return {receiver: this.receiver};
        }
      });
    }
  },

  shimCreateOfferLegacy: function(window) {
    var origCreateOffer = window.RTCPeerConnection.prototype.createOffer;
    window.RTCPeerConnection.prototype.createOffer = function(offerOptions) {
      var pc = this;
      if (offerOptions) {
        var audioTransceiver = pc.getTransceivers().find(function(transceiver) {
          return transceiver.sender.track &&
              transceiver.sender.track.kind === 'audio';
        });
        if (offerOptions.offerToReceiveAudio === false && audioTransceiver) {
          if (audioTransceiver.direction === 'sendrecv') {
            audioTransceiver.setDirection('sendonly');
          } else if (audioTransceiver.direction === 'recvonly') {
            audioTransceiver.setDirection('inactive');
          }
        } else if (offerOptions.offerToReceiveAudio === true &&
            !audioTransceiver) {
          pc.addTransceiver('audio');
        }

        var videoTransceiver = pc.getTransceivers().find(function(transceiver) {
          return transceiver.sender.track &&
              transceiver.sender.track.kind === 'video';
        });
        if (offerOptions.offerToReceiveVideo === false && videoTransceiver) {
          if (videoTransceiver.direction === 'sendrecv') {
            videoTransceiver.setDirection('sendonly');
          } else if (videoTransceiver.direction === 'recvonly') {
            videoTransceiver.setDirection('inactive');
          }
        } else if (offerOptions.offerToReceiveVideo === true &&
            !videoTransceiver) {
          pc.addTransceiver('video');
        }
      }
      return origCreateOffer.apply(pc, arguments);
    };
  }
};

// Expose public methods.
module.exports = {
  shimCallbacksAPI: safariShim.shimCallbacksAPI,
  shimLocalStreamsAPI: safariShim.shimLocalStreamsAPI,
  shimRemoteStreamsAPI: safariShim.shimRemoteStreamsAPI,
  shimGetUserMedia: safariShim.shimGetUserMedia,
  shimRTCIceServerUrls: safariShim.shimRTCIceServerUrls,
  shimTrackEventTransceiver: safariShim.shimTrackEventTransceiver,
  shimCreateOfferLegacy: safariShim.shimCreateOfferLegacy
  // TODO
  // shimPeerConnection: safariShim.shimPeerConnection
};

},{"../utils":50}],50:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';

var logDisabled_ = true;
var deprecationWarnings_ = true;

// Utility methods.
var utils = {
  disableLog: function(bool) {
    if (typeof bool !== 'boolean') {
      return new Error('Argument type: ' + typeof bool +
          '. Please use a boolean.');
    }
    logDisabled_ = bool;
    return (bool) ? 'adapter.js logging disabled' :
        'adapter.js logging enabled';
  },

  /**
   * Disable or enable deprecation warnings
   * @param {!boolean} bool set to true to disable warnings.
   */
  disableWarnings: function(bool) {
    if (typeof bool !== 'boolean') {
      return new Error('Argument type: ' + typeof bool +
          '. Please use a boolean.');
    }
    deprecationWarnings_ = !bool;
    return 'adapter.js deprecation warnings ' + (bool ? 'disabled' : 'enabled');
  },

  log: function() {
    if (typeof window === 'object') {
      if (logDisabled_) {
        return;
      }
      if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log.apply(console, arguments);
      }
    }
  },

  /**
   * Shows a deprecation warning suggesting the modern and spec-compatible API.
   */
  deprecated: function(oldMethod, newMethod) {
    if (!deprecationWarnings_) {
      return;
    }
    console.warn(oldMethod + ' is deprecated, please use ' + newMethod +
        ' instead.');
  },

  /**
   * Extract browser version out of the provided user agent string.
   *
   * @param {!string} uastring userAgent string.
   * @param {!string} expr Regular expression used as match criteria.
   * @param {!number} pos position in the version string to be returned.
   * @return {!number} browser version.
   */
  extractVersion: function(uastring, expr, pos) {
    var match = uastring.match(expr);
    return match && match.length >= pos && parseInt(match[pos], 10);
  },

  /**
   * Browser detector.
   *
   * @return {object} result containing browser and version
   *     properties.
   */
  detectBrowser: function(window) {
    var navigator = window && window.navigator;

    // Returned result object.
    var result = {};
    result.browser = null;
    result.version = null;

    // Fail early if it's not a browser
    if (typeof window === 'undefined' || !window.navigator) {
      result.browser = 'Not a browser.';
      return result;
    }

    // Firefox.
    if (navigator.mozGetUserMedia) {
      result.browser = 'firefox';
      result.version = this.extractVersion(navigator.userAgent,
          /Firefox\/(\d+)\./, 1);
    } else if (navigator.webkitGetUserMedia) {
      // Chrome, Chromium, Webview, Opera, all use the chrome shim for now
      if (window.webkitRTCPeerConnection) {
        result.browser = 'chrome';
        result.version = this.extractVersion(navigator.userAgent,
          /Chrom(e|ium)\/(\d+)\./, 2);
      } else { // Safari (in an unpublished version) or unknown webkit-based.
        if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
          result.browser = 'safari';
          result.version = this.extractVersion(navigator.userAgent,
            /AppleWebKit\/(\d+)\./, 1);
        } else { // unknown webkit-based browser.
          result.browser = 'Unsupported webkit-based browser ' +
              'with GUM support but no WebRTC support.';
          return result;
        }
      }
    } else if (navigator.mediaDevices &&
        navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) { // Edge.
      result.browser = 'edge';
      result.version = this.extractVersion(navigator.userAgent,
          /Edge\/(\d+).(\d+)$/, 2);
    } else if (navigator.mediaDevices &&
        navigator.userAgent.match(/AppleWebKit\/(\d+)\./)) {
        // Safari, with webkitGetUserMedia removed.
      result.browser = 'safari';
      result.version = this.extractVersion(navigator.userAgent,
          /AppleWebKit\/(\d+)\./, 1);
    } else { // Default fallthrough: not supported.
      result.browser = 'Not a supported browser.';
      return result;
    }

    return result;
  },

};

// Export.
module.exports = {
  log: utils.log,
  deprecated: utils.deprecated,
  disableLog: utils.disableLog,
  disableWarnings: utils.disableWarnings,
  extractVersion: utils.extractVersion,
  shimCreateObjectURL: utils.shimCreateObjectURL,
  detectBrowser: utils.detectBrowser.bind(utils)
};

},{}],51:[function(require,module,exports){
module.exports={
  "name": "jssip",
  "title": "JsSIP",
  "description": "the Javascript SIP library",
  "version": "3.0.19",
  "homepage": "http://jssip.net",
  "author": "José Luis Millán <jmillan@aliax.net> (https://github.com/jmillan)",
  "contributors": [
    "Iñaki Baz Castillo <ibc@aliax.net> (https://github.com/ibc)",
    "Saúl Ibarra Corretgé <saghul@gmail.com> (https://github.com/saghul)"
  ],
  "main": "lib/JsSIP.js",
  "keywords": [
    "sip",
    "websocket",
    "webrtc",
    "node",
    "browser",
    "library"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/versatica/JsSIP.git"
  },
  "bugs": {
    "url": "https://github.com/versatica/JsSIP/issues"
  },
  "dependencies": {
    "debug": "^3.0.1",
    "sdp-transform": "^2.3.0",
    "webrtc-adapter": "^5.0.0"
  },
  "browserify": {
    "transform": [
      [
        "babelify",
        {
          "presets": [
            "es2015"
          ]
        }
      ]
    ]
  },
  "devDependencies": {
    "babel-preset-es2015": "^6.24.1",
    "babelify": "7.3.0",
    "browserify": "^14.3.0",
    "gulp": "git+https://github.com/gulpjs/gulp.git#4.0",
    "gulp-eslint": "^4.0.0",
    "gulp-expect-file": "0.0.7",
    "gulp-header": "1.8.9",
    "gulp-nodeunit-runner": "^0.2.2",
    "gulp-plumber": "^1.1.0",
    "gulp-rename": "^1.2.2",
    "gulp-uglify": "^3.0.0",
    "gulp-util": "^3.0.8",
    "eslint": "^4.4.1",
    "pegjs": "0.7.0",
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "^1.1.0"
  },
  "scripts": {
    "test": "gulp test"
  }
}

},{}]},{},[8])(8)
});