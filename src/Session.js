
/**
 * @fileoverview Invite Session
 */

/**
 * @augments JsSIP
 * @class Invite Session
 */

JsSIP.Session = function(ua) {
  var events = [
  'connecting',
  'progress',
  'failed',
  'started',
  'ended'
  ];

  this.ua = ua;
  this.status = JsSIP.c.SESSION_NULL;
  this.dialog = null;
  this.earlyDialogs = [];
  this.mediaSession = null;

  // Session Timers
  // A BYE will be sent if ACK for the response establishing the session is not received
  this.ackTimer = null;
  this.expiresTimer = null;
  this.invite2xxTimer = null;
  this.userNoAnswerTimer = null;
  this.closeTimer = null;

  // Session info
  this.direction = null;
  this.local_identity = null;
  this.remote_identity = null;
  this.start_time = null;
  this.end_time = null;

  // Custom session empty object for high user
  this.data = {};

  this.initEvents(events);

  // Self contact value. _gruu_ or not.
  if (ua.contact.pub_gruu) {
    this.contact = ua.contact.pub_gruu;
  } else {
    this.contact = ua.contact.uri;
  }
};
JsSIP.Session.prototype = new JsSIP.EventEmitter();

/*
 * Session Management
 */

/**
* @private
*/
JsSIP.Session.prototype.init_incoming = function(request) {
  // Session parameter initialization
  this.from_tag = request.from_tag;
  this.status = JsSIP.c.SESSION_INVITE_RECEIVED;
  this.id = request.call_id + this.from_tag;
  this.request = request;

  //Save the session into the ua sessions collection.
  this.ua.sessions[this.id] = this;

  this.receiveInitialRequest(this.ua, request);
};

JsSIP.Session.prototype.connect = function(target, options) {
  var event, eventHandlers, request, selfView, remoteView, mediaType, extraHeaders, requestParams;

  // Check UA Status
  JsSIP.utils.checkUAStatus(this.ua);

  // Check WebRTC support
  if(!JsSIP.utils.isWebRtcSupported()) {
    console.log(JsSIP.c.LOG_UA +'rtcweb not supported.');
    throw new JsSIP.exceptions.WebRtcNotSupportedError();
  }

  // Check Session Status
  if (this.status !== JsSIP.c.SESSION_NULL) {
    throw new JsSIP.exceptions.InvalidStateError();
  }

  // Get call options
  options = options || {};
  selfView = options.views ? options.views.selfView : null;
  remoteView = options.views ? options.views.remoteView : null;
  mediaType = options.mediaType || {audio: true, video: true};
  extraHeaders = options.extraHeaders || [];
  eventHandlers = options.eventHandlers || {};

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  // Check target validity
  target = JsSIP.utils.normalizeUri(target, this.ua.configuration.domain);
  if (!target) {
    throw new JsSIP.exceptions.InvalidTargetError();
  }

  // Session parameter initialization
  this.from_tag = JsSIP.utils.newTag();
  this.status = JsSIP.c.SESSION_NULL;
  this.mediaSession = new JsSIP.MediaSession(this, selfView, remoteView);

  // Set anonymous property
  this.anonymous = options.anonymous;

  // OutgoingSession specific parameters
  this.isCanceled = false;
  this.received_100 = false;

  requestParams = {from_tag: this.from_tag};

  if (options.anonymous) {
    if (this.ua.contact.temp_gruu) {
      this.contact = this.ua.contact.temp_gruu;
    }

    requestParams.from_display_name = 'Anonymous';
    requestParams.from_uri = 'sip:anonymous@anonymous.invalid';

    extraHeaders.push('P-Preferred-Identity: '+ this.ua.configuration.from_uri);
    extraHeaders.push('Privacy: id');
  }

  extraHeaders.push('Contact: <'+ this.contact + ';ob>');
  extraHeaders.push('Allow: '+ JsSIP.utils.getAllowedMethods(this.ua));
  extraHeaders.push('Content-Type: application/sdp');

  request = new JsSIP.OutgoingRequest(JsSIP.c.INVITE, target, this.ua, requestParams, extraHeaders);

  this.id = request.headers['Call-ID'] + this.from_tag;
  this.request = request;

  //Save the session into the ua sessions collection.
  this.ua.sessions[this.id] = this;

  this.newSession('local', request, target);
  this.connecting('local', request, target);
  this.sendInitialRequest(mediaType);
};

/**
* @private
*/
JsSIP.Session.prototype.close = function(event, sender, data) {
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
  }
};

/*
 * Dialog Management
 */

/**
* @private
*/
JsSIP.Session.prototype.createEarlyDialog = function(message, type) {
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
    if(earlyDialog.id) {
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
JsSIP.Session.prototype.createConfirmedDialog = function(message, type) {
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

  if(dialog.id) {
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
JsSIP.Session.prototype.terminateConfirmedDialog = function() {
  // Terminate confirmed dialog
  if(this.dialog) {
    this.dialog.terminate();
    delete this.dialog;
  }
};

/**
* @private
*/
JsSIP.Session.prototype.terminateEarlyDialogs = function() {
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
JsSIP.Session.prototype.receiveRequest = function(request) {
  if(request.method === JsSIP.c.CANCEL) {
    /* RFC3261 15 States that a UAS may have accepted an invitation while a CANCEL
    * was in progress and that the UAC MAY continue with the session established by
    * any 2xx response, or MAY terminate with BYE. JsSIP does continue with the
    * established session. So the CANCEL is processed only if the session is not yet
    * established.
    */

    // Transaction layer already responded 487 to the initial request.

    // Reply 200 to CANCEL
    request.reply(200);

    /*
    * Terminate the whole session in case the user didn't accept nor reject the
    *request opening the session.
    */
    if(this.status === JsSIP.c.SESSION_WAITING_FOR_ANSWER) {
      this.status = JsSIP.c.SESSION_CANCELED;
      this.failed('remote', request, JsSIP.c.causes.CANCELED);
    }
  } else {
    // Requests arriving here are in-dialog requests.
    switch(request.method) {
      case JsSIP.c.ACK:
        if(this.status === JsSIP.c.SESSION_WAITING_FOR_ACK) {
          window.clearTimeout(this.ackTimer);
          window.clearTimeout(this.invite2xxTimer);
          this.status = JsSIP.c.SESSION_CONFIRMED;
        }
        break;
      case JsSIP.c.BYE:
        if(this.status === JsSIP.c.SESSION_CONFIRMED) {
          request.reply(200);
          this.ended('remote', request, JsSIP.c.causes.BYE);
        }
        break;
      case JsSIP.c.INVITE:
        if(this.status === JsSIP.c.SESSION_CONFIRMED) {
          console.log(JsSIP.c.LOG_INVITE_SESSION +'Re-INVITE received');
        }
        break;
    }
  }
};


/*
 * Initial Request Reception
 */

/**
 * @private
 */
JsSIP.Session.prototype.receiveInitialRequest = function(ua, request) {
  var body, contentType, expires,
    session = this;

  //Get the Expires header value if exists
  if(request.hasHeader('expires')) {
    expires = request.getHeader('expires') * 1000;
    this.expiresTimer = window.setTimeout(function() { session.expiresTimeout(request); }, expires);
  }

  // Process the INVITE request
  body = request.body;
  contentType = request.getHeader('Content-Type');

  // Request with sdp Offer
  if(body && (contentType === 'application/sdp')) {
    // ** Set the to_tag before replying a response code that will create a dialog
    request.to_tag = JsSIP.utils.newTag();

    if(!this.createEarlyDialog(request, 'UAS')) {
      return;
    }

    this.status = JsSIP.c.SESSION_WAITING_FOR_ANSWER;

    this.userNoAnswerTimer = window.setTimeout(
      function() { session.userNoAnswerTimeout(request); },
      ua.configuration.no_answer_timeout
    );

    /**
    * Answer the call.
    * @param {HTMLVideoElement} selfView
    * @param {HTMLVideoElement} remoteView
    */
    this.answer = function(selfView, remoteView) {
      var offer, onSuccess, onMediaFailure, onSdpFailure;

      // Check UA Status
      JsSIP.utils.checkUAStatus(this.ua);

      // Check Session Status
      if (this.status !== JsSIP.c.SESSION_WAITING_FOR_ANSWER) {
        throw new JsSIP.exceptions.InvalidStateError();
      }

      offer = request.body;

      onSuccess = function() {
        var sdp = session.mediaSession.peerConnection.localDescription.sdp;

        if(!session.createConfirmedDialog(request, 'UAS')) {
          return;
        }

        request.reply(200, null, ['Contact: <' + session.contact + '>'],
          sdp,
          // onSuccess
          function(){
            session.status = JsSIP.c.SESSION_WAITING_FOR_ACK;

            session.invite2xxTimer = window.setTimeout(
              function() {session.invite2xxRetransmission(1, request,sdp);},JsSIP.Timers.T1
            );

            window.clearTimeout(session.userNoAnswerTimer);

            session.ackTimer = window.setTimeout(
              function() { session.ackTimeout(); },
              JsSIP.Timers.TIMER_H
            );

            session.started('local');
          },
          // onFailure
          function() {
            session.failed('system', null, JsSIP.c.causes.CONNECTION_ERROR);
          }
        );
      };

      onMediaFailure = function(e) {
        // Unable to get User Media
        request.reply(486);
        session.failed('local', null, JsSIP.c.causes.USER_DENIED_MEDIA_ACCESS);
      };

      onSdpFailure = function(e) {
        /* Bad SDP Offer
        * peerConnection.setRemoteDescription throws an exception
        */
        console.log(JsSIP.c.LOG_SERVER_INVITE_SESSION +'PeerConnection Creation Failed: --'+e+'--');
        request.reply(488);
        session.failed('remote', request, JsSIP.c.causes.BAD_MEDIA_DESCRIPTION);
      };

      //Initialize Media Session
      session.mediaSession = new JsSIP.MediaSession(session, selfView, remoteView);
      session.mediaSession.startCallee(onSuccess, onMediaFailure, onSdpFailure, offer);
    };

    // Fire 'call' event callback
    this.newSession('remote', request);

    // Reply with 180 if the session is not closed. It may be closed in the newSession event.
    if (this.status !== JsSIP.c.SESSION_TERMINATED) {
      this.progress('local');

      request.reply(180, null, ['Contact: <' + this.contact + '>']);
    }
  } else {
    request.reply(415);
  }
};


/*
 * Reception of Response for Initial Request
 */

/**
 * @private
 */
JsSIP.Session.prototype.receiveResponse = function(response) {
  var cause, label,
    session = this;

  // Proceed to cancellation if the user requested.
  if(this.isCanceled) {
    if(response.status_code >= 100 && response.status_code < 200) {
      this.request.cancel(this.cancelReason);
    } else if(response.status_code >= 200 && response.status_code < 299) {
      this.acceptAndTerminate(response);
    }
    return;
  }

  switch(true) {
    case /^100$/.test(response.status_code):
      this.received_100 = true;
      break;
    case /^1[0-9]{2}$/.test(response.status_code):
      if(!response.to_tag) {
        // Do nothing with 1xx responses without To tag.
        break;
      }
      if(response.body) {
        label = '1xx_answer';
      } else {
        label = '1xx';
      }
      break;
    case /^2[0-9]{2}$/.test(response.status_code):
      if(response.body) {
        label = '2xx_answer';
      } else {
        label = '2xx';
      }
      break;
    default:
      label = 'failure';
  }

  // Process the response otherwise.
  if(this.status === JsSIP.c.SESSION_INVITE_SENT || this.status === JsSIP.c.SESSION_1XX_RECEIVED) {
    switch(label) {
      case 100:
        this.received_100 = true;
        break;
      case '1xx':
        // same logic for 1xx and 1xx_answer
      case '1xx_answer':
        // Create Early Dialog
        if (this.createEarlyDialog(response, 'UAC')) {
          this.status = JsSIP.c.SESSION_1XX_RECEIVED;
          this.progress('remote', response);
        }
        break;
      case '2xx':
        // Dialog confirmed already
        if (this.dialog) {
          if (response.to_tag === this.to_tag) {
            console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'2xx retransmission received');
          } else {
            console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'2xx received from an endpoint not establishing the dialog');
          }
          return;
        }

        this.acceptAndTerminate(response,'SIP ;cause=400 ;text= "Missing session description"');
        this.failed('remote', response, JsSIP.c.causes.BAD_MEDIA_DESCRIPTION);

        break;
      case '2xx_answer':
        // Dialog confirmed already
        if (this.dialog) {
          if (response.to_tag === this.to_tag) {
            console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'2xx_answer retransmission received');
          } else {
            console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'2xx_answer received from an endpoint not establishing the dialog');
          }
          return;
        }

        this.mediaSession.onMessage(
          'answer',
          response.body,
          /*
           * OnSuccess.
           * SDP Answer fits with Offer. MediaSession will start.
           */
          function() {
            if (session.createConfirmedDialog(response, 'UAC')) {
              session.sendACK();
              session.status = JsSIP.c.SESSION_CONFIRMED;
              session.started('remote', response);
            }
          },
          /*
           * OnFailure.
           * SDP Answer does not fit with Offer. Accept the call and Terminate.
           */
          function(e) {
            console.warn(e);
            session.acceptAndTerminate(response, 'SIP ;cause=488 ;text="Not Acceptable Here"');
            session.failed('remote', response, JsSIP.c.causes.BAD_MEDIA_DESCRIPTION);
          }
        );
        break;
      case 'failure':
        cause = JsSIP.utils.sipErrorCause(response.status_code);

        if (cause) {
          cause = JsSIP.c.causes[cause];
        } else {
          cause = JsSIP.c.causes.SIP_FAILURE_CODE;
        }

        this.failed('remote', response, cause);
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
JsSIP.Session.prototype.ackTimeout = function() {
  if(this.status === JsSIP.c.SESSION_WAITING_FOR_ACK) {
    console.log(JsSIP.c.LOG_INVITE_SESSION + 'No ACK received. Call will be terminated');
    window.clearTimeout(this.invite2xxTimer);
    this.sendBye();

    this.ended('remote', null, JsSIP.c.causes.NO_ACK);
  }
};

/**
* RFC3261 13.3.1
* @private
*/
JsSIP.Session.prototype.expiresTimeout = function(request) {
  if(this.status === JsSIP.c.SESSION_WAITING_FOR_ANSWER) {
    request.reply(487);

    this.failed('system', null, JsSIP.c.causes.EXPIRES);
  }
};

/**
* RFC3261 13.3.1.4
* Response retransmissions cannot be accomplished by transaction layer
*  since it is destroyed when receiving the first 2xx answer
* @private
*/
JsSIP.Session.prototype.invite2xxRetransmission = function(retransmissions, request, body) {
  var timeout,
    session = this;

  timeout = JsSIP.Timers.T1 * (Math.pow(2, retransmissions));

  if((retransmissions * JsSIP.Timers.T1) <= JsSIP.Timers.T2) {
    retransmissions += 1;

    request.reply(200, null, ['Contact: <' + this.contact + '>'], body);

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
JsSIP.Session.prototype.userNoAnswerTimeout = function(request) {
  request.reply(408);

  this.failed('local',null, JsSIP.c.causes.NO_ANSWER);
};

/*
 * Private Methods
 */

/**
* @private
*/
JsSIP.Session.prototype.acceptAndTerminate = function(response, reason) {
  // Send ACK and BYE
  if (this.dialog || this.createConfirmedDialog(response, 'UAC')) {
    this.sendACK();
    this.sendBye(reason);
  }
};

/**
* @private
*/
JsSIP.Session.prototype.sendACK = function() {
  var request = this.dialog.createRequest(JsSIP.c.ACK);

  this.sendRequest(request);
};

/**
* @private
*/
JsSIP.Session.prototype.sendBye = function(reason) {
  var
    extraHeaders = (reason) ? ['Reason: '+ reason] : [],
    request = this.dialog.createRequest(JsSIP.c.BYE, extraHeaders);

  this.sendRequest(request);
};


JsSIP.Session.prototype.sendRequest = function(request, receiveResponse) {
  var request_sender;

  receiveResponse = receiveResponse || function(){};

  request_sender = new JsSIP.Session.RequestSender(this, request, receiveResponse);

  request_sender.send();
};

/*
 * Session Callbacks
 */

/**
* Callback to be called from UA instance when TransportError occurs
* @private
*/
JsSIP.Session.prototype.onTransportError = function() {
  if(this.status !== JsSIP.c.SESSION_TERMINATED) {
    if (this.status === JsSIP.c.SESSION_CONFIRMED) {
      this.ended('system', null, JsSIP.c.causes.CONNECTION_ERROR);
    } else {
      this.failed('system', null, JsSIP.c.causes.CONNECTION_ERROR);
    }
  }
};

/**
* Callback to be called from UA instance when RequestTimeout occurs
* @private
*/
JsSIP.Session.prototype.onRequestTimeout = function() {
  if(this.status !== JsSIP.c.SESSION_TERMINATED) {
    if (this.status === JsSIP.c.SESSION_CONFIRMED) {
      this.ended('system', null, JsSIP.c.causes.REQUEST_TIMEOUT);
    } else {
      this.failed('system', null, JsSIP.c.causes.CONNECTION_ERROR);
    }
  }
};

/**
 * Internal Callbacks
 */
JsSIP.Session.prototype.newSession = function(originator, request, target) {
  var session = this,
    event_name = 'newSession';

  session.direction = (originator === 'local') ? 'outgoing' : 'incoming';

  if (originator === 'remote') {
    session.local_identity = request.s('to').uri;
    session.remote_identity = request.s('from').uri;
  } else if (originator === 'local'){
    session.local_identity = session.ua.configuration.user;
    session.remote_identity = target;
  }

  session.ua.emit(event_name, session.ua, {
    originator: originator,
    session: session,
    request: request
  });
};

JsSIP.Session.prototype.connecting = function(originator, request) {
  var session = this,
  event_name = 'connecting';

  session.emit(event_name, session, {
    originator: 'local',
    request: request
  });
};

JsSIP.Session.prototype.progress = function(originator, response) {
  var session = this,
    event_name = 'progress';

  session.emit(event_name, session, {
    originator: originator,
    response: response || null
  });
};

JsSIP.Session.prototype.started = function(originator, message) {
  var session = this,
    event_name = 'started';

  session.start_time = new Date();

  session.emit(event_name, session, {
    response: message || null
  });
};

JsSIP.Session.prototype.ended = function(originator, message, cause) {
  var session = this,
    event_name = 'ended';

  session.end_time = new Date();

  session.close();
  session.emit(event_name, session, {
    originator: originator,
    message: message || null,
    cause: cause
  });
};


JsSIP.Session.prototype.failed = function(originator, response, cause) {
  var session = this,
    event_name = 'failed';

  session.close();
  session.emit(event_name, session, {
    originator: originator,
    response: response,
    cause: cause
  });
};



/*
 * User API
 */

/**
* Terminate the call.
* @param {String} [reason]
*/
JsSIP.Session.prototype.terminate = function() {
  // Check UA Status
  JsSIP.utils.checkUAStatus(this.ua);

  // Check Session Status
  if (this.status === JsSIP.c.SESSION_TERMINATED) {
    throw new JsSIP.exceptions.InvalidStateError();
  }

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

      this.ended('local', null, JsSIP.c.causes.BYE);
      break;
  }

  this.close();
};

/**
 * Reject the incoming call
 * Only valid for incoming Messages
 *
 * @param {Number} status_code
 * @param {String} [reason_phrase]
 */
JsSIP.Session.prototype.reject = function(status_code, reason_phrase) {
  // Check Session Direction and Status
  if (this.direction !== 'incoming') {
    throw new JsSIP.exceptions.InvalidMethodError();
  } else if (this.status !== JsSIP.c.SESSION_WAITING_FOR_ANSWER) {
    throw new JsSIP.exceptions.InvalidStateError();
  }

  if (status_code) {
    if ((status_code < 300 || status_code >= 700)) {
      throw new JsSIP.exceptions.InvalidValueError();
    } else {
      this.request.reply(status_code, reason_phrase);
    }
  } else {
    this.request.reply(480);
  }

  this.failed('local', null, JsSIP.c.causes.REJECTED);
};

/**
 * Cancel the outgoing call
 *
 * @param {String} [reason]
 */
JsSIP.Session.prototype.cancel = function(reason) {
  // Check Session Direction
  if (this.direction !== 'outgoing') {
    throw new JsSIP.exceptions.InvalidMethodError();
  }

  // Check Session Status
  if (this.status === JsSIP.c.SESSION_NULL) {
    this.isCanceled = true;
    this.cancelReason = reason;
  } else if (this.status === JsSIP.c.SESSION_INVITE_SENT) {
    if(this.received_100) {
      this.request.cancel(reason);
    } else {
      this.isCanceled = true;
      this.cancelReason = reason;
    }
  } else if(this.status === JsSIP.c.SESSION_1XX_RECEIVED) {
    this.request.cancel(reason);
  } else {
    throw new JsSIP.exceptions.InvalidStateError();
  }

  this.failed('local', null, JsSIP.c.causes.CANCELED);
};



/**
 * Initial Request Sender
 */

/**
 * @private
 */
JsSIP.Session.prototype.sendInitialRequest = function(mediaType) {
  var
    self = this,
    request_sender = new JsSIP.RequestSender(self, this.ua);

  function onMediaSuccess() {
    if (self.isCanceled || self.status === JsSIP.c.SESSION_TERMINATED) {
      self.mediaSession.close();
      return;
    }

    // Set the body to the request and send it.
    self.request.body = self.mediaSession.peerConnection.localDescription.sdp;

    // Hack to quit m=video section from sdp defined in http://code.google.com/p/webrtc/issues/detail?id=935
    // To be deleted when the fix arrives to chrome stable version
    if (!mediaType.video) {
      if (self.request.body.indexOf('m=video') !== -1){
        self.request.body = self.request.body.substring(0, self.request.body.indexOf('m=video'));
      }
    }
    // End of Hack

    self.status = JsSIP.c.SESSION_INVITE_SENT;
    request_sender.send();
  }

  function onMediaFailure(e) {
    if (self.status !== JsSIP.c.SESSION_TERMINATED) {
      console.log(JsSIP.c.LOG_CLIENT_INVITE_SESSION +'Media Access denied');
      self.failed('local', null, JsSIP.c.causes.USER_DENIED_MEDIA_ACCESS);
    }
  }

  self.mediaSession.startCaller(mediaType, onMediaSuccess, onMediaFailure);
};



/**
 * Session Request Sender
 */

/**
 * @private
 */
JsSIP.Session.RequestSender = function(session, request, onReceiveResponse) {
  this.session = session;
  this.request = request;
  this.onReceiveResponse = onReceiveResponse;
  this.reattempt = false;
  this.reatemptTimer = null;
  this.request_sender = new JsSIP.InDialogRequestSender(this);

};

JsSIP.Session.RequestSender.prototype = {
  receiveResponse: function(response) {
    var
      self = this,
      status_code = response.status_code;

    if (this.session.status !== JsSIP.c.SESSION_TERMINATED) {
      if (response.method === JsSIP.c.INVITE && status_code === 491 && !this.reattempt) {
            this.request.cseq.value = this.request.dialog.local_seqnum += 1;
            this.reatemptTimer = window.setTimeout(
              function() {
                self.reattempt = true;
                self.request_sender.send();
              },
              this.getReattemptTimeout()
            );
      } else {
        this.onReceiveResponse.call(this.session, response);
      }
    }
  },

  send: function() {
    this.request_sender.send();
  },

  // RFC3261 14.1
  getReattemptTimeout: function() {
    if(this.session.direction === 'outgoing') {
      return (Math.random() * (4 - 2.1) + 2.1).toFixed(2);
    } else {
      return (Math.random() * 2).toFixed(2);
    }
  }
};