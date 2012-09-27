
/**
 * @fileoverview Invite Session
 */

/**
 * @augments JsSIP
 * @class Invite Session
 */
JsSIP.Session = (function() {

  var Session = function() {
    this.status = null;
    this.dialog = null;
    this.earlyDialogs = [];
    this.mediaSession = null;

    // Session Timers
    // A BYE will be sent if ACK for the response stablishing the session is not received
    this.ackTimer = null;
    this.expiresTimer = null;
    this.invite2xxTimer = null;
    this.userNoAnswerTimer = null;
    this.closeTimer = null;

    this.events = [
    'ring',
    'cancel',
    'answer',
    'terminate',
    'failure',
    'error'
    ];
  };
  Session.prototype = new JsSIP.EventEmitter();

  /*
   * Session Management
   */

  /**
  * @private
  */
  Session.prototype.close = function(event, args) {
    if(this.status !== JsSIP.c.SESSION_TERMINATED) {
      var session = this;

      console.log(JsSIP.c.LOG_INVITE_SESSION +'Closing Invite Session ' + this.id);

      // 1st Step. Terminate media.
      if (this.mediaSession){
        this.mediaSession.close();
      }

      // 2nd Step. Terminate signaling.

      // Clear session timers
      window.clearTimeout(this.ackTimer);
      window.clearTimeout(this.expiresTimer);
      window.clearTimeout(this.invite2xxTimer);
      window.clearTimeout(this.userNoAnswerTimer);

      this.terminateEarlyDialogs();
      this.terminateConfirmedDialog();
      this.status = JsSIP.c.SESSION_TERMINATED;
      this.closeTimer = window.setTimeout(
        function() {
          if (session && session.ua.sessions[session.id]) {
            delete session.ua.sessions[session.id];
          }
        }, '5000'
      );

      if (event) {
        this.emit(event, args);
      }
    }
  };

  /*
   * Dialog Management
   */

  /**
  * @private
  */
  Session.prototype.createEarlyDialog = function(message, type) {
    // Create an early Dialog given a message and type ('UAC' or 'UAS').
    var earlyDialog,
      local_tag = (type === 'UAS') ? message.to_tag : message.from_tag,
      remote_tag = (type === 'UAS') ? message.from_tag : message.to_tag,
      id = message.call_id + local_tag + remote_tag;

    if (this.earlyDialogs[id]) {
      return true;
    } else {
      earlyDialog = new JsSIP.Dialog(this, message, type, JsSIP.c.DIALOG_EARLY);

      // Dialog has been successfully created.
      if(earlyDialog) {
        this.earlyDialogs[id] = earlyDialog;
        return true;
      }
      // Dialog not created due to an error.
      else {
        return false;
      }
    }
  };

  /**
  * @private
  */
  Session.prototype.createConfirmedDialog = function(message, type) {
    // Create a confirmed dialog given a message and type ('UAC' or 'UAS')
    var dialog,
      local_tag = (type === 'UAS') ? message.to_tag : message.from_tag,
      remote_tag = (type === 'UAS') ? message.from_tag : message.to_tag,
      id = message.call_id + local_tag + remote_tag;

    dialog = this.earlyDialogs[id];
    // In case the dialog is in _early_ state, update it
    if (dialog) {
      dialog.update(message, type);
      this.dialog = dialog;
      delete this.earlyDialogs[id];
      return true;
    }

    // Otherwise, create a _confirmed_ dialog
    dialog = new JsSIP.Dialog(this, message, type);

    if(dialog) {
      this.to_tag = message.to_tag;
      this.dialog = dialog;
      return true;
    }
    // Dialog not created due to an error
    else {
      return false;
    }
  };

  /**
  * @private
  */
  Session.prototype.terminateConfirmedDialog = function() {
    // Terminate confirmed dialog
    if(this.dialog) {
      this.dialog.terminate();
      delete this.dialog;
    }
  };

  /**
  * @private
  */
  Session.prototype.terminateEarlyDialogs = function() {
    // Terminate early Dialogs
    var idx;

    for(idx in this.earlyDialogs) {
      this.earlyDialogs[idx].terminate();
      delete this.earlyDialogs[idx];
    }
  };


  /*
   * Request Reception
   */

  /**
  * @private
  */
  Session.prototype.receiveRequest = function(request) {
    var reason,
      session = this;

    if(request.method === JsSIP.c.CANCEL) {
      /* RFC3261 15 States that a UAS may have accepted an invitation while a CANCEL
      * was in progrees and that the UAC MAY continue with the session stablished by
      * any 2xx response, or MAY terminate with BYE. JsSIP does continue with the
      *stablished session. So the CANCEL is processed only if the session is not yet
      *stablished.
      */

      // Transaction layer already responded 487 to the initial request.

      // Reply 200 to CANCEL
      request.reply(200, JsSIP.c.REASON_200);

      /*
      * Terminate the whole session in case the user didn't accept nor reject the
      *request oppening the session.
      */
      if(this.status === JsSIP.c.SESSION_WAITING_FOR_ANSWER) {
        reason = request.getHeader('Reason');

        this.status = JsSIP.c.SESSION_CANCELED;
        this.close('cancel', [reason ? reason : undefined]);
      }

    }
    // Requests different to CANCEL.
    // Requests arriving here are in-dialog requests.
    else {
      switch(request.method) {
        case JsSIP.c.ACK:
          if(this.status === JsSIP.c.SESSION_WAITING_FOR_ACK) {
            window.clearTimeout(this.ackTimer);
            window.clearTimeout(this.invite2xxTimer);
            this.status = JsSIP.c.SESSION_CONFIRMED;
          }
          break;
        case JsSIP.c.BYE:
          request.reply(200, JsSIP.c.REASON_200);
          this.close('terminate', [JsSIP.c.SESSION_TERMINATE_PEER_TERMINATED]);
          break;
        case JsSIP.c.INVITE:
          if(this.status === JsSIP.c.SESSION_CONFIRMED) {
            console.log(JsSIP.c.LOG_INVITE_SESSION +'Re-INVITE received');
          }
          break;
        case JsSIP.c.MESSAGE:
          JsSIP.messageReceiver(this.ua, request);
          break;
      }
    }
  };


  /*
   * Timer Handlers
   */

  /**
  * RFC3261 14.2
  * If a UAS generates a 2xx response and never receives an ACK,
  *  it SHOULD generate a BYE to terminate the dialog.
  * @private
  */
  Session.prototype.ackTimeout = function() {
    if(this.status === JsSIP.c.SESSION_WAITING_FOR_ACK) {
      console.log(JsSIP.c.LOG_INVITE_SESSION + 'No ACK received. Call will be terminated');
      window.clearTimeout(this.invite2xxTimer);
      this.sendBye();
      this.close('terminate', [JsSIP.c.SESSION_TERMINATE_NO_ACK_RECEIVED]);
    }
  };

  /**
  * RFC3261 13.3.1
  * @private
  */
  Session.prototype.expiresTimeout = function(request) {
    if(this.status === JsSIP.c.SESSION_WAITING_FOR_ANSWER) {
      request.reply(487, JsSIP.c.REASON_487);
      this.close('terminate',[JsSIP.c.SESSION_TERMINATE_EXPIRES_TIMEOUT]);
    }
  };

  /**
  * RFC3261 13.3.1.4
  * Response retransmisions cannot be accomplished by transaction layer
  *  since it is destroyed when receiving the first 2xx answer
  * @private
  */
  Session.prototype.invite2xxRetransmission = function(retransmissions, request, body) {
    var timeout,
      session = this;

    timeout = JsSIP.Timers.T1 * (Math.pow(2, retransmissions));

    if((retransmissions * JsSIP.Timers.T1) <= JsSIP.Timers.T2) {
      retransmissions += 1;

      request.reply(200, JsSIP.c.REASON_200, {
        'Contact': '<' + this.contact + '>'},
        body);

      this.invite2xxTimer = window.setTimeout(
        function() {
          session.invite2xxRetransmission(retransmissions, request, body);},
        timeout
      );
    } else {
      window.clearTimeout(this.invite2xxTimer);
    }
  };

  /**
  * @private
  */
  Session.prototype.userNoAnswerTimeout = function(request) {
    request.reply(408, JsSIP.c.REASON_408);
    this.close('terminate', [JsSIP.c.SESSION_TERMINATE_USER_NO_ANSWER_TIMEOUT]);
  };

  /*
   * Private Methods
   */

  /**
  * @private
  */
  Session.prototype.acceptAndTerminate = function(response, reason) {
    // Create _confirmed_ Dialog
    if(!this.createConfirmedDialog(response, 'UAC')) {
      return;
    }

      // Send ACK
      this.sendACK();

      // Now send a BYE and terminate the session
      this.sendBye(reason);
  };

  /**
  * @private
  */
  Session.prototype.sendACK = function() {
    var request, ackSender,
      session = this;

    function AckSender(request) {
      this.request = request;
      this.send = function() {
        var request_sender = new JsSIP.RequestSender(this, session.ua);
        request_sender.send();
      };
    }

    request = this.dialog.createRequest(JsSIP.c.ACK);
    ackSender = new AckSender(request);
    ackSender.send();
  };

  /**
  * @private
  */
  Session.prototype.sendBye = function(reason) {
    var request, byeSender,
      session = this;

    function ByeSender(request) {
      this.request = request;
      this.send = function() {
        var request_sender = new JsSIP.RequestSender(this, session.ua);
        request_sender.receiveResponse = function(response){};
        request_sender.send();
      };
    }

    reason = reason ? {'reason': reason} : {};
    request = this.dialog.createRequest(JsSIP.c.BYE, reason);
    byeSender = new ByeSender(request);

    byeSender.send();
  };

  /*
   * Session Callbacks
   */

  /**
  * Callback to be called from UA instance when TransportError occurs
  * @private
  */
  Session.prototype.onTransportError = function() {
    if(this.status !== JsSIP.c.TERMINATED) {
      this.close('error',[JsSIP.c.TRANSPORT_ERROR]);
    }
  };

  /**
  * Callback to be called from UA instance when RequestTimeout occurs
  * @private
  */
  Session.prototype.onRequestTimeout = function() {
    if(this.status !== JsSIP.c.TERMINATED) {
      this.close('error',[JsSIP.c.REQUEST_TIMEOUT]);
    }
  };

  /*
   * User API
   */

  /**
  * Terminate the call.
  * @param {String} [reason]
  */
  Session.prototype.terminate = function() {
    switch(this.status) {
      // - UAC -
      case JsSIP.c.SESSION_NULL:
      case JsSIP.c.SESSION_INVITE_SENT:
      case JsSIP.c.SESSION_1XX_RECEIVED:
        this.cancel();
        break;
        // - UAS -
      case JsSIP.c.SESSION_WAITING_FOR_ANSWER:
        this.reject();
        break;
      case JsSIP.c.SESSION_WAITING_FOR_ACK:
      case JsSIP.c.SESSION_CONFIRMED:
        // Send Bye
        this.sendBye();
        break;
    }

    // By convention in this 0.1.0 release. Do not fire events for user generated actions.
    //this.close('terminate', [JsSIP.c.SESSION_TERMINATE_USER_TERMINATED]);
    this.close();
  };

  /**
  * Send an in-dialog message.
  * @param {String} body message content
  * @param {String} [content_type='text/plain']
  * @param {Function} [onSuccess]
  * @param {Function} [onFailure]
  */
  Session.prototype.message = function(body, content_type, onSuccess, onFailure) {
    // Check Callbacks
    var request, request_sender;

    onSuccess = (JsSIP.utils.isFunction(onSuccess)) ? onSuccess : null;
    onFailure = (JsSIP.utils.isFunction(onFailure)) ? onFailure : null;
    content_type = content_type || 'text/plain';

    // Create Request
    request = this.dialog.createRequest(JsSIP.c.MESSAGE, {
      content_type: content_type
    });
    request.body = body;

    // Define receiveResponse logic
    function receiveResponse(response) {
      switch(true) {
        case /^2[0-9]{2}$/.test(response.status_code):
          console.log(JsSIP.c.LOG_INVITE_SESSION +'Positive response received to in-dialog Message.');
          if (onSuccess) {
            onSuccess();
          }
          break;
        case /^[3456][0-9]{2}$/.test(response.status_code):
          console.log(JsSIP.c.LOG_INVITE_SESSION +'Negative response received to in-dialog Message.');
          if (onFailure) {
            onFailure();
          }
          break;
      }
    }

    // Create InDialogRequestSender
    request_sender = new InDialogRequestSender(this, request, receiveResponse, onFailure);
    // Send the request
    request_sender.send();
  };


  var InDialogRequestSender = function(session, request, onReceiveResponse, onFailure) {
    this.session = session;
    this.request = request;
    this.onReceiveResponse = onReceiveResponse;
    this.onFailure = onFailure;
    this.reatempt = false; // Due to a 491 response
    this.reatemptTimer = null;
  };

  InDialogRequestSender.prototype = {
    send: function() {
      var request_sender = new JsSIP.RequestSender(this, this.session.ua);

      this.receiveResponse = function(response) {
        var status_code = response.status_code;

        // RFC3261 14.1.
        // Terminate the dialog if a 408 or 481 is received from a re-Invite.
        if (status_code === '408' || status_code === '480') {
          this.session.close('terminate', [JsSIP.c.SESSION_TERMINATE_IN_DIALOG_408_480]);
          this.session.onFailure(response);
          this.onReceiveResponse(response);
        } else if (status_code === '491' && response.method === JsSIP.c.INVITE) {
          if(!this.reatempt && this.session.status !== JsSIP.c.TERMINATED) {
            this.request.cseq.value = this.request.dialog.local_seqnum += 1;
            this.reatemptTimer = window.setTimeout(
              function() { request_sender.send(); },
              this.getReatempTimeout()
            );
          }
        } else {
          this.onReceiveResponse(response);
        }
      };

      this.onRequestTimeout = function() {
        this.session.onRequestTimeout();
        if (this.onFailure) {
          this.onFailure(JsSIP.c.REQUEST_TIMEOUT);
        }
      };

      this.onTransportError = function() {
        this.session.onTransportError();
        if (this.onFailure) {
          this.onFailure(JsSIP.c.TRANSPORT_ERROR);
        }
      };

      request_sender.send();
    },

    getReatempTimeout: function() { // RFC3261 14.1
      var timeout;

      if(this instanceof JsSIP.OutgoingSession) {
        timeout = (Math.random() * (4 - 2.1) + 2.1).toFixed(2);
      } else {
        timeout = (Math.random() * 2).toFixed(2);
      }

      return timeout;
    }
  };

  return Session;
}());