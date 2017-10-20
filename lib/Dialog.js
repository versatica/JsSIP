module.exports = Dialog;


var C = {
  // Dialog states
  STATUS_EARLY:       1,
  STATUS_CONFIRMED:   2
};

/**
 * Expose C object.
 */
Dialog.C = C;


/**
 * Dependencies.
 */
var debug = require('debug')('JsSIP:Dialog');
var SIPMessage = require('./SIPMessage');
var JsSIP_C = require('./Constants');
var Transactions = require('./Transactions');
var Dialog_RequestSender = require('./Dialog/RequestSender');


// RFC 3261 12.1
function Dialog(owner, message, type, state) {
  var contact;

  this.uac_pending_reply = false;
  this.uas_pending_reply = false;

  if(!message.hasHeader('contact')) {
    return {
      error: 'unable to create a Dialog without Contact header field'
    };
  }

  if(message instanceof SIPMessage.IncomingResponse) {
    state = (message.status_code < 200) ? C.STATUS_EARLY : C.STATUS_CONFIRMED;
  } else {
    // Create confirmed dialog if state is not defined
    state = state || C.STATUS_CONFIRMED;
  }

  contact = message.parseHeader('contact');

  // RFC 3261 12.1.1
  if(type === 'UAS') {
    this.id = {
      call_id: message.call_id,
      local_tag: message.to_tag,
      remote_tag: message.from_tag,
      toString: function() {
        return this.call_id + this.local_tag + this.remote_tag;
      }
    };
    this.state = state;
    this.remote_seqnum = message.cseq;
    this.local_uri = message.parseHeader('to').uri;
    this.remote_uri = message.parseHeader('from').uri;
    this.remote_target = contact.uri;
    this.route_set = message.getHeaders('record-route');
    this.ack_seqnum = this.remote_seqnum;
  }
  // RFC 3261 12.1.2
  else if(type === 'UAC') {
    this.id = {
      call_id: message.call_id,
      local_tag: message.from_tag,
      remote_tag: message.to_tag,
      toString: function() {
        return this.call_id + this.local_tag + this.remote_tag;
      }
    };
    this.state = state;
    this.local_seqnum = message.cseq;
    this.local_uri = message.parseHeader('from').uri;
    this.remote_uri = message.parseHeader('to').uri;
    this.remote_target = contact.uri;
    this.route_set = message.getHeaders('record-route').reverse();
    this.ack_seqnum = null;
  }

  this.owner = owner;
  owner.ua.dialogs[this.id.toString()] = this;
  debug('new ' + type + ' dialog created with status ' + (this.state === C.STATUS_EARLY ? 'EARLY': 'CONFIRMED'));
}


Dialog.prototype = {
  update: function(message, type) {
    this.state = C.STATUS_CONFIRMED;

    debug('dialog '+ this.id.toString() +'  changed to CONFIRMED state');

    if(type === 'UAC') {
      // RFC 3261 13.2.2.4
      this.route_set = message.getHeaders('record-route').reverse();
    }
  },

  terminate: function() {
    debug('dialog ' + this.id.toString() + ' deleted');
    delete this.owner.ua.dialogs[this.id.toString()];
  },

  // RFC 3261 12.2.1.1
  createRequest: function(method, extraHeaders, body) {
    var cseq, request;
    extraHeaders = extraHeaders && extraHeaders.slice() || [];

    if(!this.local_seqnum) { this.local_seqnum = Math.floor(Math.random() * 10000); }

    cseq = (method === JsSIP_C.CANCEL || method === JsSIP_C.ACK) ? this.local_seqnum : this.local_seqnum += 1;

    request = new SIPMessage.OutgoingRequest(
      method,
      this.remote_target,
      this.owner.ua, {
        'cseq': cseq,
        'call_id': this.id.call_id,
        'from_uri': this.local_uri,
        'from_tag': this.id.local_tag,
        'to_uri': this.remote_uri,
        'to_tag': this.id.remote_tag,
        'route_set': this.route_set
      }, extraHeaders, body);

    request.dialog = this;

    return request;
  },

  // RFC 3261 12.2.2
  checkInDialogRequest: function(request) {
    var self = this;

    if(!this.remote_seqnum) {
      this.remote_seqnum = request.cseq;
    } else if(request.cseq < this.remote_seqnum) {
        if(request.method === JsSIP_C.ACK) {
          // We are not expecting any ACK with lower seqnum than the current one.
          // Or this is not the ACK we are waiting for.
          if(this.ack_seqnum === null || request.cseq !== this.ack_seqnum) {
            return false;
          }
        }
        else {
          request.reply(500);
          return false;
        }
    } else if(request.cseq > this.remote_seqnum) {
      this.remote_seqnum = request.cseq;
    }

    // RFC3261 14.2 Modifying an Existing Session -UAS BEHAVIOR-
    if (request.method === JsSIP_C.INVITE || (request.method === JsSIP_C.UPDATE && request.body)) {
      if (this.uac_pending_reply === true) {
        request.reply(491);
      } else if (this.uas_pending_reply === true) {
        var retryAfter = (Math.random() * 10 | 0) + 1;
        request.reply(500, null, ['Retry-After:'+ retryAfter]);
        return false;
      } else {
        this.uas_pending_reply = true;
        request.server_transaction.on('stateChanged', function stateChanged(){
          if (this.state === Transactions.C.STATUS_ACCEPTED ||
              this.state === Transactions.C.STATUS_COMPLETED ||
              this.state === Transactions.C.STATUS_TERMINATED) {

            request.server_transaction.removeListener('stateChanged', stateChanged);
            self.uas_pending_reply = false;
          }
        });
      }

      // RFC3261 12.2.2 Replace the dialog`s remote target URI if the request is accepted
      if(request.hasHeader('contact')) {
        request.server_transaction.on('stateChanged', function(){
          if (this.state === Transactions.C.STATUS_ACCEPTED) {
            self.remote_target = request.parseHeader('contact').uri;
          }
        });
      }
    }
    else if (request.method === JsSIP_C.NOTIFY) {
      // RFC6665 3.2 Replace the dialog`s remote target URI if the request is accepted
      if(request.hasHeader('contact')) {
        request.server_transaction.on('stateChanged', function(){
          if (this.state === Transactions.C.STATUS_COMPLETED) {
            self.remote_target = request.parseHeader('contact').uri;
          }
        });
      }
    }

    return true;
  },

  sendRequest: function(applicant, method, options) {
    options = options || {};

    var
      extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
      body = options.body || null,
      request = this.createRequest(method, extraHeaders, body),
      request_sender = new Dialog_RequestSender(this, applicant, request);

      request_sender.send();

      // Return the instance of OutgoingRequest
      return request;
  },

  receiveRequest: function(request) {
    //Check in-dialog request
    if(!this.checkInDialogRequest(request)) {
      return;
    }

    //ACK received. Cleanup this.ack_seqnum
    if(request.method === JsSIP_C.ACK && this.ack_seqnum !== null) {
      this.ack_seqnum = null;
    }
    //INVITE received. Set this.ack_seqnum
    else if (request.method === JsSIP_C.INVITE) {
        this.ack_seqnum = request.cseq;
    }

    this.owner.receiveRequest(request);
  }
};
