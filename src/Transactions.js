/**
 * @fileoverview SIP Transactions
 */

/**
 * SIP Transactions module.
 * @augments JsSIP
 */
(function(JsSIP) {
var Transactions,
  LOG_PREFIX =  JsSIP.name +' | '+ 'TRANSACTION' +' | ',
  C = {
    // Transaction states
    STATUS_TRYING:     1,
    STATUS_PROCEEDING: 2,
    STATUS_CALLING:    3,
    STATUS_ACCEPTED:   4,
    STATUS_COMPLETED:  5,
    STATUS_TERMINATED: 6,
    STATUS_CONFIRMED:  7
  };

Transactions = {};

/**
* @class Client Transaction
* @private
*/
var ClientTransaction = function() {
  this.init = function(request_sender, request, transport) {
    var via;

    this.transport = transport;
    this.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
    this.request_sender = request_sender;
    this.request = request;

    via = 'SIP/2.0/' + (request_sender.ua.configuration.hack_via_tcp ? 'TCP' : transport.server.scheme);
    via += ' ' + request_sender.ua.configuration.via_host + ';branch=' + this.id;

    this.request.setHeader('via', via);
  };
};

/**
* @class Non Invite Client Transaction Prototype
* @private
*/
var NonInviteClientTransactionPrototype = function() {
  this.send = function() {
    var tr = this;

    this.state = C.STATUS_TRYING;
    this.F = window.setTimeout(function() {tr.timer_F();}, JsSIP.Timers.TIMER_F);

    if(!this.transport.send(this.request)) {
      this.onTransportError();
    }
  };

  this.onTransportError = function() {
    console.log(LOG_PREFIX +'transport error occurred, deleting non-INVITE client transaction ' + this.id);
    window.clearTimeout(this.F);
    window.clearTimeout(this.K);
    delete this.request_sender.ua.transactions.nict[this.id];
    this.request_sender.onTransportError();
  };

  this.timer_F = function() {
    console.log(LOG_PREFIX +'Timer F expired for non-INVITE client transaction ' + this.id);
    this.state = C.STATUS_TERMINATED;
    this.request_sender.onRequestTimeout();
    delete this.request_sender.ua.transactions.nict[this.id];
  };

  this.timer_K = function() {
    this.state = C.STATUS_TERMINATED;
    delete this.request_sender.ua.transactions.nict[this.id];
  };

  this.receiveResponse = function(response) {
    var
      tr = this,
      status_code = response.status_code;

    if(status_code < 200) {
      switch(this.state) {
        case C.STATUS_TRYING:
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_PROCEEDING;
          this.request_sender.receiveResponse(response);
          break;
      }
    } else {
      switch(this.state) {
        case C.STATUS_TRYING:
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_COMPLETED;
          window.clearTimeout(this.F);

          if(status_code === 408) {
            this.request_sender.onRequestTimeout();
          } else {
            this.request_sender.receiveResponse(response);
          }

          this.K = window.setTimeout(function() {tr.timer_K();}, JsSIP.Timers.TIMER_K);
          break;
        case C.STATUS_COMPLETED:
          break;
      }
    }
  };
};
NonInviteClientTransactionPrototype.prototype = new ClientTransaction();


/**
 * @class Invite Client Transaction Prototype
 * @private
 */
var InviteClientTransactionPrototype = function() {

  this.send = function() {
    var tr = this;
    this.state = C.STATUS_CALLING;
    this.B = window.setTimeout(function() {
      tr.timer_B();
    }, JsSIP.Timers.TIMER_B);

    if(!this.transport.send(this.request)) {
      this.onTransportError();
    }
  };

  this.onTransportError = function() {
    console.log(LOG_PREFIX +'transport error occurred, deleting INVITE client transaction ' + this.id);
    window.clearTimeout(this.B);
    window.clearTimeout(this.D);
    window.clearTimeout(this.M);
    delete this.request_sender.ua.transactions.ict[this.id];
    this.request_sender.onTransportError();
  };

  // RFC 6026 7.2
  this.timer_M = function() {
  console.log(LOG_PREFIX +'Timer M expired for INVITE client transaction ' + this.id);

  if(this.state === C.STATUS_ACCEPTED) {
    this.state = C.STATUS_TERMINATED;
    window.clearTimeout(this.B);
    delete this.request_sender.ua.transactions.ict[this.id];
  }
  };

  // RFC 3261 17.1.1
  this.timer_B = function() {
  console.log(LOG_PREFIX +'Timer B expired for INVITE client transaction ' + this.id);
  if(this.state === C.STATUS_CALLING) {
    this.state = C.STATUS_TERMINATED;
    this.request_sender.onRequestTimeout();
    delete this.request_sender.ua.transactions.ict[this.id];
  }
  };

  this.timer_D = function() {
    console.log(LOG_PREFIX +'Timer D expired for INVITE client transaction ' + this.id);
    this.state = C.STATUS_TERMINATED;
    window.clearTimeout(this.B);
    delete this.request_sender.ua.transactions.ict[this.id];
  };

  this.sendACK = function(response) {
    var tr = this;

    this.ack = 'ACK ' + this.request.ruri + ' SIP/2.0\r\n';
    this.ack += 'Via: ' + this.request.headers['Via'].toString() + '\r\n';

    if(this.request.headers['Route']) {
      this.ack += 'Route: ' + this.request.headers['Route'].toString() + '\r\n';
    }

    this.ack += 'To: ' + response.getHeader('to') + '\r\n';
    this.ack += 'From: ' + this.request.headers['From'].toString() + '\r\n';
    this.ack += 'Call-ID: ' + this.request.headers['Call-ID'].toString() + '\r\n';
    this.ack += 'CSeq: ' + this.request.headers['CSeq'].toString().split(' ')[0];
    this.ack += ' ACK\r\n\r\n';

    this.D = window.setTimeout(function() {tr.timer_D();}, JsSIP.Timers.TIMER_D);

    this.transport.send(this.ack);
  };

  this.cancel_request = function(tr, reason) {
    var request = tr.request;

    this.cancel = JsSIP.C.CANCEL + ' ' + request.ruri + ' SIP/2.0\r\n';
    this.cancel += 'Via: ' + request.headers['Via'].toString() + '\r\n';

    if(this.request.headers['Route']) {
      this.cancel += 'Route: ' + request.headers['Route'].toString() + '\r\n';
    }

    this.cancel += 'To: ' + request.headers['To'].toString() + '\r\n';
    this.cancel += 'From: ' + request.headers['From'].toString() + '\r\n';
    this.cancel += 'Call-ID: ' + request.headers['Call-ID'].toString() + '\r\n';
    this.cancel += 'CSeq: ' + request.headers['CSeq'].toString().split(' ')[0] +
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

  this.receiveResponse = function(response) {
    var
      tr = this,
      status_code = response.status_code;

    if(status_code >= 100 && status_code <= 199) {
      switch(this.state) {
        case C.STATUS_CALLING:
          this.state = C.STATUS_PROCEEDING;
          this.request_sender.receiveResponse(response);
          if(this.cancel) {
            this.transport.send(this.cancel);
          }
          break;
        case C.STATUS_PROCEEDING:
          this.request_sender.receiveResponse(response);
          break;
      }
    } else if(status_code >= 200 && status_code <= 299) {
      switch(this.state) {
        case C.STATUS_CALLING:
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_ACCEPTED;
          this.M = window.setTimeout(function() {
            tr.timer_M();
          }, JsSIP.Timers.TIMER_M);
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
          this.state = C.STATUS_COMPLETED;
          this.sendACK(response);
          this.request_sender.receiveResponse(response);
          break;
        case C.STATUS_COMPLETED:
          this.sendACK(response);
          break;
      }
    }
  };
};
InviteClientTransactionPrototype.prototype = new ClientTransaction();

/**
 * @class Server Transaction
 * @private
 */
var ServerTransaction = function() {
  this.init = function(request, ua) {
    this.id = request.via_branch;
    this.request = request;
    this.transport = request.transport;
    this.ua = ua;
    this.last_response = '';
    request.server_transaction = this;
  };
};

/**
 * @class Non Invite Server Transaction Prototype
 * @private
 */
var NonInviteServerTransactionPrototype = function() {
  this.timer_J = function() {
    console.log(LOG_PREFIX +'Timer J expired for non-INVITE server transaction ' + this.id);
    this.state = C.STATUS_TERMINATED;
    delete this.ua.transactions.nist[this.id];
  };

  this.onTransportError = function() {
    if (!this.transportError) {
      this.transportError = true;

      console.log(LOG_PREFIX +'transport error occurred, deleting non-INVITE server transaction ' + this.id);

      window.clearTimeout(this.J);
      delete this.ua.transactions.nist[this.id];
    }
  };

  this.receiveResponse = function(status_code, response, onSuccess, onFailure) {
    var tr = this;

    if(status_code === 100) {
      /* RFC 4320 4.1
       * 'A SIP element MUST NOT
       * send any provisional response with a
       * Status-Code other than 100 to a non-INVITE request.'
       */
      switch(this.state) {
        case C.STATUS_TRYING:
          this.state = C.STATUS_PROCEEDING;
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
          this.state = C.STATUS_COMPLETED;
          this.last_response = response;
          this.J = window.setTimeout(function() {
            tr.timer_J();
          }, JsSIP.Timers.TIMER_J);
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
};
NonInviteServerTransactionPrototype.prototype = new ServerTransaction();

/**
 * @class Invite Server Transaction Prototype
 * @private
 */
var InviteServerTransactionPrototype = function() {
  this.timer_H = function() {
    console.log(LOG_PREFIX +'Timer H expired for INVITE server transaction ' + this.id);

    if(this.state === C.STATUS_COMPLETED) {
      console.warn(LOG_PREFIX +'transactions', 'ACK for INVITE server transaction was never received, call will be terminated');
      this.state = C.STATUS_TERMINATED;
    }

    delete this.ua.transactions.ist[this.id];
  };

  this.timer_I = function() {
    this.state = C.STATUS_TERMINATED;
    delete this.ua.transactions.ist[this.id];
  };

  // RFC 6026 7.1
  this.timer_L = function() {
  console.log(LOG_PREFIX +'Timer L expired for INVITE server transaction ' + this.id);

  if(this.state === C.STATUS_ACCEPTED) {
    this.state = C.STATUS_TERMINATED;
    delete this.ua.transactions.ist[this.id];
  }
  };

  this.onTransportError = function() {
    if (!this.transportError) {
      this.transportError = true;

      console.log(LOG_PREFIX +'transport error occurred, deleting INVITE server transaction ' + this.id);

      window.clearTimeout(this.reliableProvisionalTimer);
      window.clearTimeout(this.L);
      window.clearTimeout(this.H);
      window.clearTimeout(this.I);
      delete this.ua.transactions.ist[this.id];
    }
  };

  this.timer_reliableProvisional = function(retransmissions) {
    var
      tr = this,
      response = this.last_response,
      timeout = JsSIP.Timers.T1 * (Math.pow(2, retransmissions + 1));

    if(retransmissions > 8) {
      window.clearTimeout(this.reliableProvisionalTimer);
    } else {
      retransmissions += 1;
      if(!this.transport.send(response)) {
        this.onTransportError();
      }
      this.reliableProvisionalTimer = window.setTimeout(function() {
        tr.timer_reliableProvisional(retransmissions);}, timeout);
    }
  };

  // INVITE Server Transaction RFC 3261 17.2.1
  this.receiveResponse = function(status_code, response, onSuccess, onFailure) {
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

    if(status_code > 100 && status_code <= 199) {
      // Trigger the reliableProvisionalTimer only for the first non 100 provisional response.
      if(!this.reliableProvisionalTimer) {
        this.reliableProvisionalTimer = window.setTimeout(function() {
          tr.timer_reliableProvisional(1);}, JsSIP.Timers.T1);
      }
    } else if(status_code >= 200 && status_code <= 299) {
      switch(this.state) {
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_ACCEPTED;
          this.last_response = response;
          this.L = window.setTimeout(function() {
            tr.timer_L();
          }, JsSIP.Timers.TIMER_L);
          window.clearTimeout(this.reliableProvisionalTimer);
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
          window.clearTimeout(this.reliableProvisionalTimer);
          if(!this.transport.send(response)) {
            this.onTransportError();
            if (onFailure) {
              onFailure();
            }
          } else {
            this.state = C.STATUS_COMPLETED;
            this.H = window.setTimeout(function() {
              tr.timer_H();
            }, JsSIP.Timers.TIMER_H);
            if (onSuccess) {
              onSuccess();
            }
          }
          break;
      }
    }
  };
};
InviteServerTransactionPrototype.prototype = new ServerTransaction();

/**
* @augments JsSIP.Transactions
* @class Non Invite Client Transaction
* @param {JsSIP.RequestSender} request_sender
* @param {JsSIP.OutgoingRequest} request
* @param {JsSIP.Transport} transport
*/
Transactions.NonInviteClientTransaction = function(request_sender, request, transport) {
  this.init(request_sender, request, transport);
  this.request_sender.ua.transactions.nict[this.id] = this;
};
Transactions.NonInviteClientTransaction.prototype = new NonInviteClientTransactionPrototype();

/**
* @augments JsSIP.Transactions
* @class Invite Client Transaction
* @param {JsSIP.RequestSender} request_sender
* @param {JsSIP.OutgoingRequest} request
* @param {JsSIP.Transport} transport
*/
Transactions.InviteClientTransaction = function(request_sender, request, transport) {
  var tr = this;

  this.init(request_sender, request, transport);
  this.request_sender.ua.transactions.ict[this.id] = this;

  // Add the cancel property to the request.
  //Will be called from the request instance, not the transaction itself.
  this.request.cancel = function(reason) {
    tr.cancel_request(tr, reason);
  };
};
Transactions.InviteClientTransaction.prototype = new InviteClientTransactionPrototype();

Transactions.AckClientTransaction = function(request_sender, request, transport) {
  this.init(request_sender, request, transport);
  this.send = function() {
    this.transport.send(request);
  };
};
Transactions.AckClientTransaction.prototype = new NonInviteClientTransactionPrototype();


/**
* @augments JsSIP.Transactions
* @class Non Invite Server Transaction
* @param {JsSIP.IncomingRequest} request
* @param {JsSIP.UA} ua
*/
Transactions.NonInviteServerTransaction = function(request, ua) {
  this.init(request, ua);
  this.state = C.STATUS_TRYING;

  ua.transactions.nist[this.id] = this;
};
Transactions.NonInviteServerTransaction.prototype = new NonInviteServerTransactionPrototype();



/**
* @augments JsSIP.Transactions
* @class Invite Server Transaction
* @param {JsSIP.IncomingRequest} request
* @param {JsSIP.UA} ua
*/
Transactions.InviteServerTransaction = function(request, ua) {
  this.init(request, ua);
  this.state = C.STATUS_PROCEEDING;

  ua.transactions.ist[this.id] = this;

  this.reliableProvisionalTimer = null;

  request.reply(100);
};
Transactions.InviteServerTransaction.prototype = new InviteServerTransactionPrototype();

/**
 * @function
 * @param {JsSIP.UA} ua
 * @param {JsSIP.IncomingRequest} request
 *
 * @return {boolean}
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
Transactions.checkTransaction = function(ua, request) {
  var tr;

  switch(request.method) {
    case JsSIP.C.INVITE:
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
    case JsSIP.C.ACK:
      tr = ua.transactions.ist[request.via_branch];

      // RFC 6026 7.1
      if(tr) {
        if(tr.state === C.STATUS_ACCEPTED) {
          return false;
        } else if(tr.state === C.STATUS_COMPLETED) {
          tr.state = C.STATUS_CONFIRMED;
          tr.I = window.setTimeout(function() {tr.timer_I();}, JsSIP.Timers.TIMER_I);
          return true;
        }
      }

      // ACK to 2XX Response.
      else {
        return false;
      }
      break;
    case JsSIP.C.CANCEL:
      tr = ua.transactions.ist[request.via_branch];
      if(tr) {
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
};

Transactions.C = C;
JsSIP.Transactions = Transactions;
}(JsSIP));
