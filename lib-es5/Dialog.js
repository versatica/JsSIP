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
      var eventHandlers = options.eventHandlers || {};
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