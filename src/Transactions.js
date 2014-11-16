module.exports = {
  C: null,
  NonInviteClientTransaction: NonInviteClientTransaction,
  InviteClientTransaction: InviteClientTransaction,
  AckClientTransaction: AckClientTransaction,
  NonInviteServerTransaction: NonInviteServerTransaction,
  InviteServerTransaction: InviteServerTransaction,
  checkTransaction: checkTransaction
};


var C = {
  // Transaction states
  STATUS_TRYING:     1,
  STATUS_PROCEEDING: 2,
  STATUS_CALLING:    3,
  STATUS_ACCEPTED:   4,
  STATUS_COMPLETED:  5,
  STATUS_TERMINATED: 6,
  STATUS_CONFIRMED:  7,

  // Transaction types
  NON_INVITE_CLIENT: 'nict',
  NON_INVITE_SERVER: 'nist',
  INVITE_CLIENT: 'ict',
  INVITE_SERVER: 'ist'
};

/**
 * Expose C object.
 */
module.exports.C = C;


/**
 * Dependencies.
 */
var util = require('util');
var events = require('events');
var debugnict = require('debug')('JsSIP:NonInviteClientTransaction');
var debugict = require('debug')('JsSIP:InviteClientTransaction');
var debugact = require('debug')('JsSIP:AckClientTransaction');
var debugnist = require('debug')('JsSIP:NonInviteServerTransaction');
var debugist = require('debug')('JsSIP:InviteServerTransaction');
var JsSIP_C = require('./Constants');
var Timers = require('./Timers');


function NonInviteClientTransaction(request_sender, request, transport) {
  var via,
    via_transport;

  this.type = C.NON_INVITE_CLIENT;
  this.transport = transport;
  this.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
  this.request_sender = request_sender;
  this.request = request;

  if (request_sender.ua.configuration.hack_via_tcp) {
    via_transport = 'TCP';
  }
  else if (request_sender.ua.configuration.hack_via_ws) {
    via_transport = 'WS';
  }
  else {
    via_transport = transport.server.scheme;
  }

  via = 'SIP/2.0/' + via_transport;
  via += ' ' + request_sender.ua.configuration.via_host + ';branch=' + this.id;

  this.request.setHeader('via', via);

  this.request_sender.ua.newTransaction(this);

  events.EventEmitter.call(this);
}

util.inherits(NonInviteClientTransaction, events.EventEmitter);

NonInviteClientTransaction.prototype.stateChanged = function(state) {
  this.state = state;
  this.emit('stateChanged');
};

NonInviteClientTransaction.prototype.send = function() {
  var tr = this;

  this.stateChanged(C.STATUS_TRYING);
  this.F = setTimeout(function() {tr.timer_F();}, Timers.TIMER_F);

  if(!this.transport.send(this.request)) {
    this.onTransportError();
  }
};

NonInviteClientTransaction.prototype.onTransportError = function() {
  debugnict('transport error occurred, deleting transaction ' + this.id);
  clearTimeout(this.F);
  clearTimeout(this.K);
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);
  this.request_sender.onTransportError();
};

NonInviteClientTransaction.prototype.timer_F = function() {
  debugnict('Timer F expired for transaction ' + this.id);
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);
  this.request_sender.onRequestTimeout();
};

NonInviteClientTransaction.prototype.timer_K = function() {
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);
};

NonInviteClientTransaction.prototype.receiveResponse = function(response) {
  var
    tr = this,
    status_code = response.status_code;

  if(status_code < 200) {
    switch(this.state) {
      case C.STATUS_TRYING:
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_PROCEEDING);
        this.request_sender.receiveResponse(response);
        break;
    }
  } else {
    switch(this.state) {
      case C.STATUS_TRYING:
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_COMPLETED);
        clearTimeout(this.F);

        if(status_code === 408) {
          this.request_sender.onRequestTimeout();
        } else {
          this.request_sender.receiveResponse(response);
        }

        this.K = setTimeout(function() {tr.timer_K();}, Timers.TIMER_K);
        break;
      case C.STATUS_COMPLETED:
        break;
    }
  }
};


function InviteClientTransaction(request_sender, request, transport) {
  var via,
    tr = this,
    via_transport;

  this.type = C.INVITE_CLIENT;
  this.transport = transport;
  this.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
  this.request_sender = request_sender;
  this.request = request;

  if (request_sender.ua.configuration.hack_via_tcp) {
    via_transport = 'TCP';
  }
  else if (request_sender.ua.configuration.hack_via_ws) {
    via_transport = 'WS';
  }
  else {
    via_transport = transport.server.scheme;
  }

  via = 'SIP/2.0/' + via_transport;
  via += ' ' + request_sender.ua.configuration.via_host + ';branch=' + this.id;

  this.request.setHeader('via', via);

  this.request_sender.ua.newTransaction(this);

  // TODO: Adding here the cancel() method is a hack that must be fixed.
  // Add the cancel property to the request.
  //Will be called from the request instance, not the transaction itself.
  this.request.cancel = function(reason) {
    tr.cancel_request(tr, reason);
  };

  events.EventEmitter.call(this);
}

util.inherits(InviteClientTransaction, events.EventEmitter);

InviteClientTransaction.prototype.stateChanged = function(state) {
  this.state = state;
  this.emit('stateChanged');
};

InviteClientTransaction.prototype.send = function() {
  var tr = this;
  this.stateChanged(C.STATUS_CALLING);
  this.B = setTimeout(function() {
    tr.timer_B();
  }, Timers.TIMER_B);

  if(!this.transport.send(this.request)) {
    this.onTransportError();
  }
};

InviteClientTransaction.prototype.onTransportError = function() {
  debugict('transport error occurred, deleting transaction ' + this.id);
  clearTimeout(this.B);
  clearTimeout(this.D);
  clearTimeout(this.M);
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);

  if (this.state !== C.STATUS_ACCEPTED) {
    this.request_sender.onTransportError();
  }
};

// RFC 6026 7.2
InviteClientTransaction.prototype.timer_M = function() {
  debugict('Timer M expired for transaction ' + this.id);

  if(this.state === C.STATUS_ACCEPTED) {
    clearTimeout(this.B);
    this.stateChanged(C.STATUS_TERMINATED);
    this.request_sender.ua.destroyTransaction(this);
  }
};

// RFC 3261 17.1.1
InviteClientTransaction.prototype.timer_B = function() {
  debugict('Timer B expired for transaction ' + this.id);
  if(this.state === C.STATUS_CALLING) {
    this.stateChanged(C.STATUS_TERMINATED);
    this.request_sender.ua.destroyTransaction(this);
    this.request_sender.onRequestTimeout();
  }
};

InviteClientTransaction.prototype.timer_D = function() {
  debugict('Timer D expired for transaction ' + this.id);
  clearTimeout(this.B);
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);
};

InviteClientTransaction.prototype.sendACK = function(response) {
  var tr = this;

  this.ack = 'ACK ' + this.request.ruri + ' SIP/2.0\r\n';
  this.ack += 'Via: ' + this.request.headers.Via.toString() + '\r\n';

  if(this.request.headers.Route) {
    this.ack += 'Route: ' + this.request.headers.Route.toString() + '\r\n';
  }

  this.ack += 'To: ' + response.getHeader('to') + '\r\n';
  this.ack += 'From: ' + this.request.headers.From.toString() + '\r\n';
  this.ack += 'Call-ID: ' + this.request.headers['Call-ID'].toString() + '\r\n';
  this.ack += 'CSeq: ' + this.request.headers.CSeq.toString().split(' ')[0];
  this.ack += ' ACK\r\n';
  this.ack += 'Content-Length: 0\r\n\r\n';

  this.D = setTimeout(function() {tr.timer_D();}, Timers.TIMER_D);

  this.transport.send(this.ack);
};

InviteClientTransaction.prototype.cancel_request = function(tr, reason) {
  var request = tr.request;

  this.cancel = JsSIP_C.CANCEL + ' ' + request.ruri + ' SIP/2.0\r\n';
  this.cancel += 'Via: ' + request.headers.Via.toString() + '\r\n';

  if(this.request.headers.Route) {
    this.cancel += 'Route: ' + request.headers.Route.toString() + '\r\n';
  }

  this.cancel += 'To: ' + request.headers.To.toString() + '\r\n';
  this.cancel += 'From: ' + request.headers.From.toString() + '\r\n';
  this.cancel += 'Call-ID: ' + request.headers['Call-ID'].toString() + '\r\n';
  this.cancel += 'CSeq: ' + request.headers.CSeq.toString().split(' ')[0] +
  ' CANCEL\r\n';

  if(reason) {
    this.cancel += 'Reason: ' + reason + '\r\n';
  }

  this.cancel += 'Content-Length: 0\r\n\r\n';

  // Send only if a provisional response (>100) has been received.
  if(this.state === C.STATUS_PROCEEDING) {
    this.transport.send(this.cancel);
  }
};

InviteClientTransaction.prototype.receiveResponse = function(response) {
  var
  tr = this,
  status_code = response.status_code;

  if(status_code >= 100 && status_code <= 199) {
    switch(this.state) {
      case C.STATUS_CALLING:
        this.stateChanged(C.STATUS_PROCEEDING);
        this.request_sender.receiveResponse(response);
        break;
      case C.STATUS_PROCEEDING:
        this.request_sender.receiveResponse(response);
        break;
    }
  } else if(status_code >= 200 && status_code <= 299) {
    switch(this.state) {
      case C.STATUS_CALLING:
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_ACCEPTED);
        this.M = setTimeout(function() {
          tr.timer_M();
        }, Timers.TIMER_M);
        this.request_sender.receiveResponse(response);
        break;
      case C.STATUS_ACCEPTED:
        this.request_sender.receiveResponse(response);
        break;
    }
  } else if(status_code >= 300 && status_code <= 699) {
    switch(this.state) {
      case C.STATUS_CALLING:
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_COMPLETED);
        this.sendACK(response);
        this.request_sender.receiveResponse(response);
        break;
      case C.STATUS_COMPLETED:
        this.sendACK(response);
        break;
    }
  }
};


function AckClientTransaction(request_sender, request, transport) {
  var via,
    via_transport;

  this.transport = transport;
  this.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
  this.request_sender = request_sender;
  this.request = request;

  if (request_sender.ua.configuration.hack_via_tcp) {
    via_transport = 'TCP';
  }
  else if (request_sender.ua.configuration.hack_via_ws) {
    via_transport = 'WS';
  }
  else {
    via_transport = transport.server.scheme;
  }

  via = 'SIP/2.0/' + via_transport;
  via += ' ' + request_sender.ua.configuration.via_host + ';branch=' + this.id;

  this.request.setHeader('via', via);

  events.EventEmitter.call(this);
}

util.inherits(AckClientTransaction, events.EventEmitter);

AckClientTransaction.prototype.send = function() {
  if(!this.transport.send(this.request)) {
    this.onTransportError();
  }
};

AckClientTransaction.prototype.onTransportError = function() {
  debugact('transport error occurred for transaction ' + this.id);
  this.request_sender.onTransportError();
};


function NonInviteServerTransaction(request, ua) {
  this.type = C.NON_INVITE_SERVER;
  this.id = request.via_branch;
  this.request = request;
  this.transport = request.transport;
  this.ua = ua;
  this.last_response = '';
  request.server_transaction = this;

  this.state = C.STATUS_TRYING;

  ua.newTransaction(this);

  events.EventEmitter.call(this);
}

util.inherits(NonInviteServerTransaction, events.EventEmitter);

NonInviteServerTransaction.prototype.stateChanged = function(state) {
  this.state = state;
  this.emit('stateChanged');
};

NonInviteServerTransaction.prototype.timer_J = function() {
  debugnist('Timer J expired for transaction ' + this.id);
  this.stateChanged(C.STATUS_TERMINATED);
  this.ua.destroyTransaction(this);
};

NonInviteServerTransaction.prototype.onTransportError = function() {
  if (!this.transportError) {
    this.transportError = true;

    debugnist('transport error occurred, deleting transaction ' + this.id);

    clearTimeout(this.J);
    this.stateChanged(C.STATUS_TERMINATED);
    this.ua.destroyTransaction(this);
  }
};

NonInviteServerTransaction.prototype.receiveResponse = function(status_code, response, onSuccess, onFailure) {
  var tr = this;

  if(status_code === 100) {
    /* RFC 4320 4.1
     * 'A SIP element MUST NOT
     * send any provisional response with a
     * Status-Code other than 100 to a non-INVITE request.'
     */
    switch(this.state) {
      case C.STATUS_TRYING:
        this.stateChanged(C.STATUS_PROCEEDING);
        if(!this.transport.send(response))  {
          this.onTransportError();
        }
        break;
      case C.STATUS_PROCEEDING:
        this.last_response = response;
        if(!this.transport.send(response)) {
          this.onTransportError();
          if (onFailure) {
            onFailure();
          }
        } else if (onSuccess) {
          onSuccess();
        }
        break;
    }
  } else if(status_code >= 200 && status_code <= 699) {
    switch(this.state) {
      case C.STATUS_TRYING:
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_COMPLETED);
        this.last_response = response;
        this.J = setTimeout(function() {
          tr.timer_J();
        }, Timers.TIMER_J);
        if(!this.transport.send(response)) {
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
};


function InviteServerTransaction(request, ua) {
  this.type = C.INVITE_SERVER;
  this.id = request.via_branch;
  this.request = request;
  this.transport = request.transport;
  this.ua = ua;
  this.last_response = '';
  request.server_transaction = this;

  this.state = C.STATUS_PROCEEDING;

  ua.newTransaction(this);

  this.resendProvisionalTimer = null;

  request.reply(100);

  events.EventEmitter.call(this);
}

util.inherits(InviteServerTransaction, events.EventEmitter);

InviteServerTransaction.prototype.stateChanged = function(state) {
  this.state = state;
  this.emit('stateChanged');
};

InviteServerTransaction.prototype.timer_H = function() {
  debugist('Timer H expired for transaction ' + this.id);

  if(this.state === C.STATUS_COMPLETED) {
    debugist('ACK not received, dialog will be terminated');
  }

  this.stateChanged(C.STATUS_TERMINATED);
  this.ua.destroyTransaction(this);
};

InviteServerTransaction.prototype.timer_I = function() {
  this.stateChanged(C.STATUS_TERMINATED);
  this.ua.destroyTransaction(this);
};

// RFC 6026 7.1
InviteServerTransaction.prototype.timer_L = function() {
  debugist('Timer L expired for transaction ' + this.id);

  if(this.state === C.STATUS_ACCEPTED) {
    this.stateChanged(C.STATUS_TERMINATED);
    this.ua.destroyTransaction(this);
  }
};

InviteServerTransaction.prototype.onTransportError = function() {
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
};

InviteServerTransaction.prototype.resend_provisional = function() {
  if(!this.transport.send(this.last_response)) {
    this.onTransportError();
  }
};

// INVITE Server Transaction RFC 3261 17.2.1
InviteServerTransaction.prototype.receiveResponse = function(status_code, response, onSuccess, onFailure) {
  var tr = this;

  if(status_code >= 100 && status_code <= 199) {
    switch(this.state) {
      case C.STATUS_PROCEEDING:
        if(!this.transport.send(response)) {
          this.onTransportError();
        }
        this.last_response = response;
        break;
    }
  }

  if(status_code > 100 && status_code <= 199 && this.state === C.STATUS_PROCEEDING) {
    // Trigger the resendProvisionalTimer only for the first non 100 provisional response.
    if(this.resendProvisionalTimer === null) {
      this.resendProvisionalTimer = setInterval(function() {
        tr.resend_provisional();}, Timers.PROVISIONAL_RESPONSE_INTERVAL);
    }
  } else if(status_code >= 200 && status_code <= 299) {
    switch(this.state) {
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_ACCEPTED);
        this.last_response = response;
        this.L = setTimeout(function() {
          tr.timer_L();
        }, Timers.TIMER_L);

        if (this.resendProvisionalTimer !== null) {
          clearInterval(this.resendProvisionalTimer);
          this.resendProvisionalTimer = null;
        }
        /* falls through */
        case C.STATUS_ACCEPTED:
          // Note that this point will be reached for proceeding tr.state also.
          if(!this.transport.send(response)) {
            this.onTransportError();
            if (onFailure) {
              onFailure();
            }
          } else if (onSuccess) {
            onSuccess();
          }
          break;
    }
  } else if(status_code >= 300 && status_code <= 699) {
    switch(this.state) {
      case C.STATUS_PROCEEDING:
        if (this.resendProvisionalTimer !== null) {
          clearInterval(this.resendProvisionalTimer);
          this.resendProvisionalTimer = null;
        }

        if(!this.transport.send(response)) {
          this.onTransportError();
          if (onFailure) {
            onFailure();
          }
        } else {
          this.stateChanged(C.STATUS_COMPLETED);
          this.H = setTimeout(function() {
            tr.timer_H();
          }, Timers.TIMER_H);
          if (onSuccess) {
            onSuccess();
          }
        }
        break;
    }
  }
};

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
function checkTransaction(ua, request) {
  var tr;

  switch(request.method) {
    case JsSIP_C.INVITE:
      tr = ua.transactions.ist[request.via_branch];
      if(tr) {
        switch(tr.state) {
          case C.STATUS_PROCEEDING:
            tr.transport.send(tr.last_response);
            break;

            // RFC 6026 7.1 Invite retransmission
            //received while in C.STATUS_ACCEPTED state. Absorb it.
          case C.STATUS_ACCEPTED:
            break;
        }
        return true;
      }
      break;
    case JsSIP_C.ACK:
      tr = ua.transactions.ist[request.via_branch];

      // RFC 6026 7.1
      if(tr) {
        if(tr.state === C.STATUS_ACCEPTED) {
          return false;
        } else if(tr.state === C.STATUS_COMPLETED) {
          tr.state = C.STATUS_CONFIRMED;
          tr.I = setTimeout(function() {tr.timer_I();}, Timers.TIMER_I);
          return true;
        }
      }
      // ACK to 2XX Response.
      else {
        return false;
      }
      break;
    case JsSIP_C.CANCEL:
      tr = ua.transactions.ist[request.via_branch];
      if(tr) {
        request.reply_sl(200);
        if(tr.state === C.STATUS_PROCEEDING) {
          return false;
        } else {
          return true;
        }
      } else {
        request.reply_sl(481);
        return true;
      }
      break;
    default:

      // Non-INVITE Server Transaction RFC 3261 17.2.2
      tr = ua.transactions.nist[request.via_branch];
      if(tr) {
        switch(tr.state) {
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
