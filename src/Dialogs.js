
/**
 * @fileoverview SIP dialog
 */

/**
 * @augments JsSIP
 * @class Class creating a SIP dialog.
 * @param {JsSIP.Session} session
 * @param {JsSIP.IncomingRequest|JsSIP.IncomingResponse} msg
 * @param {Enum} type UAC / UAS
 * @param {Enum} state JsSIP.c.DIALOG_EARLY / JsSIP.c.DIALOG_CONFIRMED
 */

// RFC 3261 12.1
JsSIP.Dialog = function(session, msg, type, state) {
  var contact;

  if(msg.countHeader('contact') === 0) {
    console.log(JsSIP.c.LOG_DIALOG + 'No contact header field. Silently discarded');
    return false;
  }

  if(msg instanceof JsSIP.IncomingResponse) {
    state = (msg.status_code < 200) ? JsSIP.c.DIALOG_EARLY : JsSIP.c.DIALOG_CONFIRMED;
  } else if (msg instanceof JsSIP.IncomingRequest) {
    // Create confirmed dialog if state is not defined
    state = state || JsSIP.c.DIALOG_CONFIRMED;
  } else {
    console.log(JsSIP.c.LOG_DIALOG + 'Received message is not a request neither a response');
    return false;
  }

  contact = msg.s('contact');

  // RFC 3261 12.1.1
  if(type === 'UAS') {
    this.id = {
      call_id: msg.call_id,
      local_tag: msg.to_tag,
      remote_tag: msg.from_tag,
      toString: function() {
        return this.call_id + this.local_tag + this.remote_tag;
      }
    };
    this.state = state;
    this.remote_seqnum = msg.cseq;
    this.local_uri = msg.parseHeader('to').uri;
    this.remote_uri = msg.parseHeader('from').uri;
    this.remote_target = contact.uri;
    this.route_set = msg.getHeaderAll('record-route');
  }
  // RFC 3261 12.1.2
  else if(type === 'UAC') {
    this.id = {
      call_id: msg.call_id,
      local_tag: msg.from_tag,
      remote_tag: msg.to_tag,
      toString: function() {
        return this.call_id + this.local_tag + this.remote_tag;
      }
    };
    this.state = state;
    this.local_seqnum = msg.cseq;
    this.local_uri = msg.parseHeader('from').uri;
    this.remote_uri = msg.parseHeader('to').uri;
    this.remote_target = contact.uri;
    this.route_set = msg.getHeaderAll('record-route').reverse();
  }

  this.session = session;
  session.ua.dialogs[this.id.toString()] = this;
  console.log(JsSIP.c.LOG_DIALOG +'New ' + type + ' dialog created: ' + this.state);
};

JsSIP.Dialog.prototype = {
  /**
   * @param {JsSIP.IncomingMessage} message
   * @param {Enum} UAC/UAS
   */
  update: function(message, type) {
    this.state = JsSIP.c.DIALOG_CONFIRMED;

    console.log(JsSIP.c.LOG_DIALOG +'dialog state changed to \'CONFIRMED\' state');

    if(type === 'UAC') {
      // RFC 3261 13.2.2.4
      this.route_set = message.getHeaderAll('record-route').reverse();
    }
  },

  terminate: function() {
    console.log(JsSIP.c.LOG_DIALOG +'dialog state: ' + this.id.toString() + ' deleted');
    delete this.session.ua.dialogs[this.id.toString()];
  },

  /**
  * @param {String} method request method
  * @param {Object} extraHeaders extra headers
  * @returns {JsSIP.OutgoingRequest}
  */

  // RFC 3261 12.2.1.1
  createRequest: function(method, extraHeaders) {
    var cseq, request, length, idx;
    extraHeaders = extraHeaders || [];

    if(!this.local_seqnum) { this.local_seqnum = Math.floor(Math.random() * 10000); }

    cseq = (method === JsSIP.c.CANCEL || method === JsSIP.c.ACK) ? this.local_seqnum : this.local_seqnum += 1;

    request = new JsSIP.OutgoingRequest(
      method,
      this.remote_target,
      this.session.ua, {
        'cseq': cseq,
        'call_id': this.id.call_id,
        'from_uri': this.local_uri,
        'from_tag': this.id.local_tag,
        'to_uri': this.remote_uri,
        'to_tag': this.id.remote_tag,
        'route_set': this.route_set
      }, extraHeaders);

    request.dialog = this;

    return request;
  },

  /**
  * @param {JsSIP.IncomingRequest} request
  * @returns {Boolean}
  */

  // RFC 3261 12.2.2
  checkInDialogRequest: function(request) {
    if(!this.remote_seqnum) {
      this.remote_seqnum = request.cseq;
    } else if(request.method !== JsSIP.c.INVITE && request.cseq < this.remote_seqnum) {
        //Do not try to reply to an ACK request.
        if (request.method !== JsSIP.c.ACK) {
          request.reply(500, JsSIP.c.REASON_500);
        }
        return false;
    } else if(request.cseq > this.remote_seqnum) {
      this.remote_seqnum = request.cseq;
    }

    switch(request.method) {
      // RFC3261 14.2 Modifying an Existing Session -UAS BEHAVIOR-
      case JsSIP.c.INVITE:
        if(request.cseq < this.remote_seqnum) {
          if(this.state === JsSIP.c.DIALOG_EARLY) {
            var retryAfter = (Math.random() * 10 | 0) + 1;
            request.reply(500, JsSIP.c.REASON_500, [
              'Retry-After:'+ retryAfter
            ]);
          } else {
            request.reply(500, JsSIP.c.REASON_500);
          }
          return false;
        }
        // RFC3261 14.2
        if(this.state === JsSIP.c.DIALOG_EARLY) {
          request.reply(491, JsSIP.c.REASON_491);
          return false;
        }
        // RFC3261 12.2.2 Replace the dialog`s remote target URI
        if(request.hasHeader('contact')) {
          this.remote_target = request.parseHeader('contact').uri;
        }
        break;
      case JsSIP.c.NOTIFY:
        // RFC6655 3.2 Replace the dialog`s remote target URI
        if(request.hasHeader('contact')) {
          this.remote_target = request.parseHeader('contact').uri;
        }
        break;
    }

    return true;
  },

  /**
  * @param {JsSIP.IncomingRequest} request
  */
  receiveRequest: function(request) {
    //Check in-dialog request
    if(!this.checkInDialogRequest(request)) {
      return;
    }

    this.session.receiveRequest(request);
  }
};