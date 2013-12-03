/**
 * @fileoverview SIP Dialog
 */

/**
 * @augments JsSIP
 * @class Class creating a SIP dialog.
 * @param {JsSIP.RTCSession} owner
 * @param {JsSIP.IncomingRequest|JsSIP.IncomingResponse} message
 * @param {Enum} type UAC / UAS
 * @param {Enum} state JsSIP.Dialog.C.STATUS_EARLY / JsSIP.Dialog.C.STATUS_CONFIRMED
 */
(function(JsSIP) {

// Load dependencies
var RequestSender   = @@include('../src/Dialog/RequestSender.js')

var Dialog,
  C = {
    // Dialog states
    STATUS_EARLY:       1,
    STATUS_CONFIRMED:   2
  };

// RFC 3261 12.1
Dialog = function(owner, message, type, state) {
  var contact;
  
  this.uac_pending_reply = false;
  this.uas_pending_reply = false;

  if(!message.hasHeader('contact')) {
    return {
      error: 'unable to create a Dialog without Contact header field'
    };
  }

  if(message instanceof JsSIP.IncomingResponse) {
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
  }

  this.logger = owner.ua.getLogger('jssip.dialog', this.id.toString());
  this.owner = owner;
  owner.ua.dialogs[this.id.toString()] = this;
  this.logger.log('new ' + type + ' dialog created with status ' + (this.state === C.STATUS_EARLY ? 'EARLY': 'CONFIRMED'));
};

Dialog.prototype = {
  /**
   * @param {JsSIP.IncomingMessage} message
   * @param {Enum} UAC/UAS
   */
  update: function(message, type) {
    this.state = C.STATUS_CONFIRMED;

    this.logger.log('dialog '+ this.id.toString() +'  changed to CONFIRMED state');

    if(type === 'UAC') {
      // RFC 3261 13.2.2.4
      this.route_set = message.getHeaders('record-route').reverse();
    }
  },

  terminate: function() {
    this.logger.log('dialog ' + this.id.toString() + ' deleted');
    delete this.owner.ua.dialogs[this.id.toString()];
  },

  /**
  * @param {String} method request method
  * @param {Object} extraHeaders extra headers
  * @returns {JsSIP.OutgoingRequest}
  */

  // RFC 3261 12.2.1.1
  createRequest: function(method, extraHeaders, body) {
    var cseq, request;
    extraHeaders = extraHeaders || [];

    if(!this.local_seqnum) { this.local_seqnum = Math.floor(Math.random() * 10000); }

    cseq = (method === JsSIP.C.CANCEL || method === JsSIP.C.ACK) ? this.local_seqnum : this.local_seqnum += 1;

    request = new JsSIP.OutgoingRequest(
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

  /**
  * @param {JsSIP.IncomingRequest} request
  * @returns {Boolean}
  */

  // RFC 3261 12.2.2
  checkInDialogRequest: function(request) {
    var self = this;
    
    if(!this.remote_seqnum) {
      this.remote_seqnum = request.cseq;
    } else if(request.cseq < this.remote_seqnum) {
        //Do not try to reply to an ACK request.
        if (request.method !== JsSIP.C.ACK) {
          request.reply(500);
        }
        return false;
    } else if(request.cseq > this.remote_seqnum) {
      this.remote_seqnum = request.cseq;
    }

    switch(request.method) {
      // RFC3261 14.2 Modifying an Existing Session -UAS BEHAVIOR-
      case JsSIP.C.INVITE:
        if (this.uac_pending_reply === true) {
          request.reply(491);
        } else if (this.uas_pending_reply === true) {
          var retryAfter = (Math.random() * 10 | 0) + 1;
          request.reply(500, null, ['Retry-After:'+ retryAfter]);
          return false;
        } else {
          this.uas_pending_reply = true;
          request.server_transaction.on('stateChanged', function stateChanged(e){
            if (e.sender.state === JsSIP.Transactions.C.STATUS_ACCEPTED ||
                e.sender.state === JsSIP.Transactions.C.STATUS_COMPLETED ||
                e.sender.state === JsSIP.Transactions.C.STATUS_TERMINATED) {
                
              request.server_transaction.removeListener('stateChanged', stateChanged);
              self.uas_pending_reply = false;
              
              if (self.uac_pending_reply === false) {
                self.owner.onReadyToReinvite();
              }
            }
          });
        }
        
        // RFC3261 12.2.2 Replace the dialog`s remote target URI if the request is accepted
        if(request.hasHeader('contact')) {
          request.server_transaction.on('stateChanged', function(e){
            if (e.sender.state === JsSIP.Transactions.C.STATUS_ACCEPTED) {
              self.remote_target = request.parseHeader('contact').uri;
            }
          });
        }
        break;
      case JsSIP.C.NOTIFY:
        // RFC6665 3.2 Replace the dialog`s remote target URI if the request is accepted
        if(request.hasHeader('contact')) {
          request.server_transaction.on('stateChanged', function(e){
            if (e.sender.state === JsSIP.Transactions.C.STATUS_COMPLETED) {
              self.remote_target = request.parseHeader('contact').uri;
            }
          });
        }
        break;
    }

    return true;
  },

  sendRequest: function(applicant, method, options) {
    options = options || {};

    var
      extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
      body = options.body || null,
      request = this.createRequest(method, extraHeaders, body),
      request_sender = new RequestSender(this, applicant, request);

      request_sender.send();
  },

  /**
  * @param {JsSIP.IncomingRequest} request
  */
  receiveRequest: function(request) {
    //Check in-dialog request
    if(!this.checkInDialogRequest(request)) {
      return;
    }

    this.owner.receiveRequest(request);
  }
};

Dialog.C = C;
JsSIP.Dialog = Dialog;
}(JsSIP));
