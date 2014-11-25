module.exports = RTCSession;


var C = {
  // RTCSession states
  STATUS_NULL:               0,
  STATUS_INVITE_SENT:        1,
  STATUS_1XX_RECEIVED:       2,
  STATUS_INVITE_RECEIVED:    3,
  STATUS_WAITING_FOR_ANSWER: 4,
  STATUS_ANSWERED:           5,
  STATUS_WAITING_FOR_ACK:    6,
  STATUS_CANCELED:           7,
  STATUS_TERMINATED:         8,
  STATUS_CONFIRMED:          9
};

/**
 * Expose C object.
 */
RTCSession.C = C;


/**
 * Dependencies.
 */
var util = require('util');
var events = require('events');
var debug = require('debug')('JsSIP:RTCSession');
var JsSIP_C = require('./Constants');
var Exceptions = require('./Exceptions');
var Transactions = require('./Transactions');
var Parser = require('./Parser');
var Utils = require('./Utils');
var Timers = require('./Timers');
var UA = require('./UA');
var WebRTC = require('./WebRTC');
var SIPMessage = require('./SIPMessage');
var Dialog = require('./Dialog');
var RequestSender = require('./RequestSender');
var RTCSession_Request = require('./RTCSession/Request');
var RTCSession_DTMF = require('./RTCSession/DTMF');


function RTCSession(ua) {
  this.ua = ua;
  this.status = C.STATUS_NULL;
  this.dialog = null;
  this.earlyDialogs = {};
  this.rtcMediaHandler = null;

  // RTCSession confirmation flag
  this.is_confirmed = false;

  // is late SDP being negotiated
  this.late_sdp = false;

  // Session Timers
  this.timers = {
    ackTimer: null,
    expiresTimer: null,
    invite2xxTimer: null,
    userNoAnswerTimer: null
  };

  // Session info
  this.direction = null;
  this.local_identity = null;
  this.remote_identity = null;
  this.start_time = null;
  this.end_time = null;
  this.tones = null;

  // Mute/Hold state
  this.audioMuted = false;
  this.videoMuted = false;
  this.local_hold = false;
  this.remote_hold = false;

  this.pending_actions = {
    actions: [],

    length: function() {
      return this.actions.length;
    },

    isPending: function(name){
      var
        idx = 0,
        length = this.actions.length;

      for (idx; idx<length; idx++) {
        if (this.actions[idx].name === name) {
          return true;
        }
      }
      return false;
    },

    shift: function() {
      return this.actions.shift();
    },

    push: function(name) {
      this.actions.push({
        name: name
      });
    },

    pop: function(name) {
      var
        idx = 0,
        length = this.actions.length;

      for (idx; idx<length; idx++) {
        if (this.actions[idx].name === name) {
          this.actions.splice(idx,1);
        }
      }
    }
  };

  // Custom session empty object for high level use
  this.data = {};

  events.EventEmitter.call(this);
}

util.inherits(RTCSession, events.EventEmitter);


// Defined module properties.
Object.defineProperty(RTCSession, 'RTCEngine', {
  get: function() {
    return RTCSession._RTCEngine || require('./RTCSession/RTCMediaHandler');
  },

  set: function(engine) {
    RTCSession._RTCEngine = engine;
  }
});


/**
 * User API
 */


RTCSession.prototype.isInProgress = function() {
  switch(this.status) {
    case C.STATUS_NULL:
    case C.STATUS_INVITE_SENT:
    case C.STATUS_1XX_RECEIVED:
    case C.STATUS_INVITE_RECEIVED:
    case C.STATUS_WAITING_FOR_ANSWER:
      return true;
    default:
      return false;
  }
};


RTCSession.prototype.isEstablished = function() {
  switch(this.status) {
    case C.STATUS_ANSWERED:
    case C.STATUS_WAITING_FOR_ACK:
    case C.STATUS_CONFIRMED:
      return true;
    default:
      return false;
  }
};


RTCSession.prototype.isEnded = function() {
  switch(this.status) {
    case C.STATUS_CANCELED:
    case C.STATUS_TERMINATED:
      return true;
    default:
      return false;
  }
};


/**
 * Terminate the call.
 */
RTCSession.prototype.terminate = function(options) {
  options = options || {};

  var cancel_reason, dialog,
    cause = options.cause || JsSIP_C.causes.BYE,
    status_code = options.status_code,
    reason_phrase = options.reason_phrase,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    body = options.body,
    self = this;

  // Check Session Status
  if (this.status === C.STATUS_TERMINATED) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  switch(this.status) {
    // - UAC -
    case C.STATUS_NULL:
    case C.STATUS_INVITE_SENT:
    case C.STATUS_1XX_RECEIVED:
      debug('canceling sesssion');

      if (status_code && (status_code < 200 || status_code >= 700)) {
        throw new TypeError('Invalid status_code: '+ status_code);
      } else if (status_code) {
        reason_phrase = reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
        cancel_reason = 'SIP ;cause=' + status_code + ' ;text="' + reason_phrase + '"';
      }

      // Check Session Status
      if (this.status === C.STATUS_NULL) {
        this.isCanceled = true;
        this.cancelReason = cancel_reason;
      } else if (this.status === C.STATUS_INVITE_SENT) {
        this.isCanceled = true;
        this.cancelReason = cancel_reason;
      } else if(this.status === C.STATUS_1XX_RECEIVED) {
        this.request.cancel(cancel_reason);
      }

      this.status = C.STATUS_CANCELED;

      failed.call(this, 'local', null, JsSIP_C.causes.CANCELED);
      break;

      // - UAS -
    case C.STATUS_WAITING_FOR_ANSWER:
    case C.STATUS_ANSWERED:
      debug('rejecting session');

      status_code = status_code || 480;

      if (status_code < 300 || status_code >= 700) {
        throw new TypeError('Invalid status_code: '+ status_code);
      }

      this.request.reply(status_code, reason_phrase, extraHeaders, body);
      failed.call(this, 'local', null, JsSIP_C.causes.REJECTED);
      break;

    case C.STATUS_WAITING_FOR_ACK:
    case C.STATUS_CONFIRMED:
      debug('terminating session');

      reason_phrase = options.reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';

      if (status_code && (status_code < 200 || status_code >= 700)) {
        throw new TypeError('Invalid status_code: '+ status_code);
      } else if (status_code) {
        extraHeaders.push('Reason: SIP ;cause=' + status_code + '; text="' + reason_phrase + '"');
      }

      /* RFC 3261 section 15 (Terminating a session):
        *
        * "...the callee's UA MUST NOT send a BYE on a confirmed dialog
        * until it has received an ACK for its 2xx response or until the server
        * transaction times out."
        */
      if (this.status === C.STATUS_WAITING_FOR_ACK &&
          this.direction === 'incoming' &&
          this.request.server_transaction.state !== Transactions.C.STATUS_TERMINATED) {

        // Save the dialog for later restoration
        dialog = this.dialog;

        // Send the BYE as soon as the ACK is received...
        this.receiveRequest = function(request) {
          if(request.method === JsSIP_C.ACK) {
            this.sendRequest(JsSIP_C.BYE, {
              extraHeaders: extraHeaders,
              body: body
            });
            dialog.terminate();
          }
        };

        // .., or when the INVITE transaction times out
        this.request.server_transaction.on('stateChanged', function(){
          if (this.state === Transactions.C.STATUS_TERMINATED) {
            self.sendRequest(JsSIP_C.BYE, {
              extraHeaders: extraHeaders,
              body: body
            });
            dialog.terminate();
          }
        });

        ended.call(this, 'local', null, cause);

        // Restore the dialog into 'this' in order to be able to send the in-dialog BYE :-)
        this.dialog = dialog;

        // Restore the dialog into 'ua' so the ACK can reach 'this' session
        this.ua.dialogs[dialog.id.toString()] = dialog;

      } else {
        this.sendRequest(JsSIP_C.BYE, {
          extraHeaders: extraHeaders,
          body: body
        });

        ended.call(this, 'local', null, cause);
      }
  }

  this.close();
};

/**
 * Answer the call.
 */
RTCSession.prototype.answer = function(options) {
  options = options || {};

  var idx, length, sdp, remoteDescription,
    hasAudio = false,
    hasVideo = false,
    self = this,
    request = this.request,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    mediaConstraints = options.mediaConstraints || {},
    RTCAnswerConstraints = options.RTCAnswerConstraints || {},
    mediaStream = options.mediaStream || null;

  // User media succeeded
  function userMediaSucceeded(stream) {
    self.rtcMediaHandler.addStream(
      stream,
      streamAdditionSucceeded,
      streamAdditionFailed
    );
  }

  // User media failed
  function userMediaFailed() {
    request.reply(480);
    failed.call(self, 'local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
  }

  // rtcMediaHandler.addStream successfully added
  function streamAdditionSucceeded() {
    connecting.call(self, request);

    if (self.status === C.STATUS_TERMINATED) {
      return;
    }

    if (self.late_sdp) {
      self.rtcMediaHandler.createOffer(
        sdpCreationSucceeded,
        sdpCreationFailed,
        RTCAnswerConstraints
      );
    } else {
      self.rtcMediaHandler.createAnswer(
        sdpCreationSucceeded,
        sdpCreationFailed,
        RTCAnswerConstraints
      );
    }
  }

  // rtcMediaHandler.addStream failed
  function streamAdditionFailed() {
    if (self.status === C.STATUS_TERMINATED) {
      return;
    }

    failed.call(self, 'system', null, JsSIP_C.causes.WEBRTC_ERROR);
  }

  // rtcMediaHandler.createAnswer or rtcMediaHandler.createOffer succeeded
  function sdpCreationSucceeded(body) {
    var
      // run for reply success callback
      replySucceeded = function() {
        self.status = C.STATUS_WAITING_FOR_ACK;

        self.setInvite2xxTimer(request, body);
        self.setACKTimer();
        accepted.call(self, 'local');
      },

      // run for reply failure callback
      replyFailed = function() {
        failed.call(self, 'system', null, JsSIP_C.causes.CONNECTION_ERROR);
      };

    request.reply(200, null, extraHeaders,
      body,
      replySucceeded,
      replyFailed
    );
  }

  // rtcMediaHandler.createAnswer or rtcMediaHandler.createOffer failed
  function sdpCreationFailed() {
    if (self.status === C.STATUS_TERMINATED) {
      return;
    }

    failed.call(self, 'system', null, JsSIP_C.causes.WEBRTC_ERROR);
  }

  this.data = options.data || {};

  // Check Session Direction and Status
  if (this.direction !== 'incoming') {
    throw new Exceptions.NotSupportedError('"answer" not supported for outgoing RTCSession');
  } else if (this.status !== C.STATUS_WAITING_FOR_ANSWER) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  this.status = C.STATUS_ANSWERED;

  // An error on dialog creation will fire 'failed' event
  if(!this.createDialog(request, 'UAS')) {
    request.reply(500, 'Missing Contact header field');
    return;
  }

  clearTimeout(this.timers.userNoAnswerTimer);

  extraHeaders.unshift('Contact: ' + self.contact);

  // Determine incoming media from remote session description
  remoteDescription = this.rtcMediaHandler.getRemoteDescription();
  sdp = Parser.parseSDP(remoteDescription.sdp || '');

  // Make sure sdp is an array, not the case if there is only one media
  if(!(sdp.media instanceof Array)) {
    sdp.media = [sdp.media || []];
  }

  // Go through all medias in SDP to find offered capabilities to answer with
  idx = sdp.media.length;
  while(idx--) {
    if(sdp.media[idx].type === 'audio' &&
        (sdp.media[idx].direction === 'sendrecv' ||
         sdp.media[idx].direction === 'recvonly')) {
      hasAudio=true;
    }
    if(sdp.media[idx].type === 'video' &&
        (sdp.media[idx].direction === 'sendrecv' ||
         sdp.media[idx].direction === 'recvonly')) {
      hasVideo=true;
    }
  }

  // Remove audio from mediaStream if suggested by mediaConstraints
   if (mediaStream && mediaConstraints.audio === false) {
    length = mediaStream.getAudioTracks().length;
    for (idx=0; idx<length; idx++) {
      mediaStream.removeTrack(mediaStream.getAudioTracks()[idx]);
    }
  }

  // Remove video from mediaStream if suggested by mediaConstraints
  if (mediaStream && mediaConstraints.video === false) {
    length = mediaStream.getVideoTracks().length;
    for (idx=0; idx<length; idx++) {
      mediaStream.removeTrack(mediaStream.getVideoTracks()[idx]);
    }
  }

  // Set audio constraints based on incoming stream if not supplied
  if (mediaConstraints.audio === undefined) {
      mediaConstraints.audio = hasAudio;
  }

  // Set video constraints based on incoming stream if not supplied
  if (mediaConstraints.video === undefined) {
      mediaConstraints.video = hasVideo;
  }

  if (mediaStream) {
    userMediaSucceeded(mediaStream);
  } else {
    this.rtcMediaHandler.getUserMedia(
      userMediaSucceeded,
      userMediaFailed,
      mediaConstraints
    );
  }
};

/**
 * Send a DTMF
 */
RTCSession.prototype.sendDTMF = function(tones, options) {
  var duration, interToneGap,
    position = 0,
    self = this;

  options = options || {};
  duration = options.duration || null;
  interToneGap = options.interToneGap || null;

  if (tones === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check Session Status
  if (this.status !== C.STATUS_CONFIRMED && this.status !== C.STATUS_WAITING_FOR_ACK) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  // Convert to string
  if(typeof tones === 'number') {
    tones = tones.toString();
  }

  // Check tones
  if (!tones || typeof tones !== 'string' || !tones.match(/^[0-9A-D#*,]+$/i)) {
    throw new TypeError('Invalid tones: '+ tones);
  }

  // Check duration
  if (duration && !Utils.isDecimal(duration)) {
    throw new TypeError('Invalid tone duration: '+ duration);
  } else if (!duration) {
    duration = RTCSession_DTMF.C.DEFAULT_DURATION;
  } else if (duration < RTCSession_DTMF.C.MIN_DURATION) {
    debug('"duration" value is lower than the minimum allowed, setting it to '+ RTCSession_DTMF.C.MIN_DURATION+ ' milliseconds');
    duration = RTCSession_DTMF.C.MIN_DURATION;
  } else if (duration > RTCSession_DTMF.C.MAX_DURATION) {
    debug('"duration" value is greater than the maximum allowed, setting it to '+ RTCSession_DTMF.C.MAX_DURATION +' milliseconds');
    duration = RTCSession_DTMF.C.MAX_DURATION;
  } else {
    duration = Math.abs(duration);
  }
  options.duration = duration;

  // Check interToneGap
  if (interToneGap && !Utils.isDecimal(interToneGap)) {
    throw new TypeError('Invalid interToneGap: '+ interToneGap);
  } else if (!interToneGap) {
    interToneGap = RTCSession_DTMF.C.DEFAULT_INTER_TONE_GAP;
  } else if (interToneGap < RTCSession_DTMF.C.MIN_INTER_TONE_GAP) {
    debug('"interToneGap" value is lower than the minimum allowed, setting it to '+ RTCSession_DTMF.C.MIN_INTER_TONE_GAP +' milliseconds');
    interToneGap = RTCSession_DTMF.C.MIN_INTER_TONE_GAP;
  } else {
    interToneGap = Math.abs(interToneGap);
  }

  if (this.tones) {
    // Tones are already queued, just add to the queue
    this.tones += tones;
    return;
  }

  // New set of tones to start sending
  this.tones = tones;

  function _sendDTMF() {
    var tone, timeout,
      tones = self.tones;

    if (self.status === C.STATUS_TERMINATED || !tones || position >= tones.length) {
      // Stop sending DTMF
      self.tones = null;
      return;
    }

    tone = tones[position];
    position += 1;

    if (tone === ',') {
      timeout = 2000;
    } else {
      var dtmf = new RTCSession_DTMF(self);
      dtmf.on('failed', function(){self.tones = null;});
      dtmf.send(tone, options);
      timeout = duration + interToneGap;
    }

    // Set timeout for the next tone
    setTimeout(_sendDTMF, timeout);
  }

  // Send the first tone
  _sendDTMF();
};

/**
 * Send a generic in-dialog Request
 */
RTCSession.prototype.sendRequest = function(method, options) {
  var request = new RTCSession_Request(this);

  request.send(method, options);
};

/**
 * Check if RTCSession is ready for a re-INVITE
 */
RTCSession.prototype.isReadyToReinvite = function() {
  // rtcMediaHandler is not ready
  if (!this.rtcMediaHandler.isReady()) {
    return;
  }

  // Another INVITE transaction is in progress
  if (this.dialog.uac_pending_reply === true || this.dialog.uas_pending_reply === true) {
    return false;
  } else {
    return true;
  }
};


/**
 * Mute
 */
RTCSession.prototype.mute = function(options) {
  options = options || {audio:true, video:false};

  var
    audioMuted = false,
    videoMuted = false;

  if (this.audioMuted === false && options.audio) {
    audioMuted = true;
    this.audioMuted = true;
    this.toogleMuteAudio(true);
  }

  if (this.videoMuted === false && options.video) {
    videoMuted = true;
    this.videoMuted = true;
    this.toogleMuteVideo(true);
  }

  if (audioMuted === true || videoMuted === true) {
    onmute.call(this, {
      audio: audioMuted,
      video: videoMuted
    });
  }
};

/**
 * Unmute
 */
RTCSession.prototype.unmute = function(options) {
  options = options || {audio:true, video:true};

  var
    audioUnMuted = false,
    videoUnMuted = false;

  if (this.audioMuted === true && options.audio) {
    audioUnMuted = true;
    this.audioMuted = false;

    if (this.local_hold === false) {
      this.toogleMuteAudio(false);
    }
  }

  if (this.videoMuted === true && options.video) {
    videoUnMuted = true;
    this.videoMuted = false;

    if (this.local_hold === false) {
      this.toogleMuteVideo(false);
    }
  }

  if (audioUnMuted === true || videoUnMuted === true) {
    onunmute.call(this, {
      audio: audioUnMuted,
      video: videoUnMuted
    });
  }
};

/**
 * isMuted
 */
RTCSession.prototype.isMuted = function() {
  return {
    audio: this.audioMuted,
    video: this.videoMuted
  };
};

/**
 * Hold
 */
RTCSession.prototype.hold = function() {
  if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  this.toogleMuteAudio(true);
  this.toogleMuteVideo(true);

  if (!this.isReadyToReinvite()) {
    /* If there is a pending 'unhold' action, cancel it and don't queue this one
     * Else, if there isn't any 'hold' action, add this one to the queue
     * Else, if there is already a 'hold' action, skip
     */
    if (this.pending_actions.isPending('unhold')) {
      this.pending_actions.pop('unhold');
      return;
    } else if (!this.pending_actions.isPending('hold')) {
      this.pending_actions.push('hold');
      return;
    } else {
      return;
    }
  } else {
    if (this.local_hold === true) {
      return;
    }
  }

  onhold.call(this, 'local');

  this.sendReinvite({
    mangle: function(body){
      var idx, length;

      body = Parser.parseSDP(body);

      length = body.media.length;
      for (idx=0; idx<length; idx++) {
        if (body.media[idx].direction === undefined) {
          body.media[idx].direction = 'sendonly';
        } else if (body.media[idx].direction === 'sendrecv') {
          body.media[idx].direction = 'sendonly';
        } else if (body.media[idx].direction === 'sendonly') {
          body.media[idx].direction = 'inactive';
        }
      }

      return Parser.writeSDP(body);
    }
  });
};

/**
 * Unhold
 */
RTCSession.prototype.unhold = function() {
  if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  if (!this.audioMuted) {
    this.toogleMuteAudio(false);
  }

  if (!this.videoMuted) {
    this.toogleMuteVideo(false);
  }

  if (!this.isReadyToReinvite()) {
    /* If there is a pending 'hold' action, cancel it and don't queue this one
     * Else, if there isn't any 'unhold' action, add this one to the queue
     * Else, if there is already an 'unhold' action, skip
     */
    if (this.pending_actions.isPending('hold')) {
      this.pending_actions.pop('hold');
      return;
    } else if (!this.pending_actions.isPending('unhold')) {
      this.pending_actions.push('unhold');
      return;
    } else {
      return;
    }
  } else {
    if (this.local_hold === false) {
      return;
    }
  }

  onunhold.call(this, 'local');

  this.sendReinvite();
};

/**
 * isOnHold
 */
RTCSession.prototype.isOnHold = function() {
  return {
    local: this.local_hold,
    remote: this.remote_hold
  };
};


/**
 * Session Timers
 */


/**
 * RFC3261 13.3.1.4
 * Response retransmissions cannot be accomplished by transaction layer
 *  since it is destroyed when receiving the first 2xx answer
 */
RTCSession.prototype.setInvite2xxTimer = function(request, body) {
  var
    self = this,
    timeout = Timers.T1;

  this.timers.invite2xxTimer = setTimeout(function invite2xxRetransmission() {
    if (self.status !== C.STATUS_WAITING_FOR_ACK) {
      return;
    }

    request.reply(200, null, ['Contact: '+ self.contact], body);

    if (timeout < Timers.T2) {
      timeout = timeout * 2;
      if (timeout > Timers.T2) {
        timeout = Timers.T2;
      }
    }
    self.timers.invite2xxTimer = setTimeout(
      invite2xxRetransmission, timeout
    );
  }, timeout);
};


/**
 * RFC3261 14.2
 * If a UAS generates a 2xx response and never receives an ACK,
 *  it SHOULD generate a BYE to terminate the dialog.
 */
RTCSession.prototype.setACKTimer = function() {
  var self = this;

  this.timers.ackTimer = setTimeout(function() {
    if(self.status === C.STATUS_WAITING_FOR_ACK) {
      debug('no ACK received, terminating the session');
      clearTimeout(self.timers.invite2xxTimer);
      self.sendRequest(JsSIP_C.BYE);
      ended.call(self, 'remote', null, JsSIP_C.causes.NO_ACK);
    }
  }, Timers.TIMER_H);
};


/**
 * RTCPeerconnection handlers
 */
RTCSession.prototype.getLocalStreams = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.getLocalStreams();
};

RTCSession.prototype.getRemoteStreams = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.getRemoteStreams();
};


/**
 * Session Management
 */

RTCSession.prototype.init_incoming = function(request) {
  var expires,
    self = this,
    contentType = request.getHeader('Content-Type');

  function waitForAnswer() {
    self.status = C.STATUS_WAITING_FOR_ANSWER;

    // Set userNoAnswerTimer
    self.timers.userNoAnswerTimer = setTimeout(function() {
        request.reply(408);
        failed.call(self, 'local',null, JsSIP_C.causes.NO_ANSWER);
      }, self.ua.configuration.no_answer_timeout
    );

    /* Set expiresTimer
     * RFC3261 13.3.1
     */
    if (expires) {
      self.timers.expiresTimer = setTimeout(function() {
          if(self.status === C.STATUS_WAITING_FOR_ANSWER) {
            request.reply(487);
            failed.call(self, 'system', null, JsSIP_C.causes.EXPIRES);
          }
        }, expires
      );
    }

    // Fire 'newRTCSession' event.
    newRTCSession.call(self, 'remote', request);

    // Reply 180.
    request.reply(180, null, ['Contact: ' + self.contact]);

    // Fire 'progress' event.
    // TODO: Document that 'response' field in 'progress' event is null for
    // incoming calls.
    progress.call(self, 'local', null);
  }

  // Check body and content type
  if(request.body && (contentType !== 'application/sdp')) {
    request.reply(415);
    return;
  }

  // Session parameter initialization
  this.status = C.STATUS_INVITE_RECEIVED;
  this.from_tag = request.from_tag;
  this.id = request.call_id + this.from_tag;
  this.request = request;
  this.contact = this.ua.contact.toString();

  //Save the session into the ua sessions collection.
  this.ua.sessions[this.id] = this;

  //Get the Expires header value if exists
  if(request.hasHeader('expires')) {
    expires = request.getHeader('expires') * 1000;
  }

  /* Set the to_tag before
   * replying a response code that will create a dialog.
   */
  request.to_tag = Utils.newTag();

  // An error on dialog creation will fire 'failed' event
  if(!this.createDialog(request, 'UAS', true)) {
    request.reply(500, 'Missing Contact header field');
    return;
  }

  //Initialize Media Session
  this.rtcMediaHandler = new RTCSession.RTCEngine(this, {
    constraints: {optional: [{DtlsSrtpKeyAgreement: 'true'}]}
  });

  if (request.body) {
    this.rtcMediaHandler.setRemoteDescription(
      'offer',
      request.body,
      /*
       * onSuccess
       * SDP Offer is valid. Fire UA newRTCSession
       */
      waitForAnswer,
      /*
       * onFailure
       * Bad media description
       */
      function(e) {
        debug('invalid SDP: ' + e);
        request.reply(488);
      }
    );
  } else {
    this.late_sdp = true;
    waitForAnswer();
  }
};

RTCSession.prototype.connect = function(target, options) {
  options = options || {};

  var event, requestParams, iceServers,
    originalTarget = target,
    eventHandlers = options.eventHandlers || {},
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    mediaConstraints = options.mediaConstraints || {audio: true, video: true},
    mediaStream = options.mediaStream || null,
    RTCConstraints = options.RTCConstraints || {},
    RTCOfferConstraints = options.RTCOfferConstraints || {},
    stun_servers = options.stun_servers || null,
    turn_servers = options.turn_servers || null;

  this.data = options.data || {};

  if (stun_servers) {
    iceServers = UA.configuration_check.optional.stun_servers(stun_servers);
    if (!iceServers) {
      throw new TypeError('Invalid stun_servers: '+ stun_servers);
    } else {
      stun_servers = iceServers;
    }
  }

  if (turn_servers) {
    iceServers = UA.configuration_check.optional.turn_servers(turn_servers);
    if (!iceServers){
      throw new TypeError('Invalid turn_servers: '+ turn_servers);
    } else {
      turn_servers = iceServers;
    }
  }

  if (target === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check WebRTC support
  if (!WebRTC.isSupported) {
    throw new Exceptions.NotSupportedError('WebRTC not supported');
  }

  // Check target validity
  target = this.ua.normalizeTarget(target);
  if (!target) {
    throw new TypeError('Invalid target: '+ originalTarget);
  }

  // Check Session Status
  if (this.status !== C.STATUS_NULL) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  // Session parameter initialization
  this.from_tag = Utils.newTag();

  // Set anonymous property
  this.anonymous = options.anonymous || false;

  // OutgoingSession specific parameters
  this.isCanceled = false;

  requestParams = {from_tag: this.from_tag};

  this.contact = this.ua.contact.toString({
    anonymous: this.anonymous,
    outbound: true
  });

  if (this.anonymous) {
    requestParams.from_display_name = 'Anonymous';
    requestParams.from_uri = 'sip:anonymous@anonymous.invalid';

    extraHeaders.push('P-Preferred-Identity: '+ this.ua.configuration.uri.toString());
    extraHeaders.push('Privacy: id');
  }

  extraHeaders.push('Contact: '+ this.contact);
  extraHeaders.push('Content-Type: application/sdp');

  this.request = new SIPMessage.OutgoingRequest(JsSIP_C.INVITE, target, this.ua, requestParams, extraHeaders);

  this.id = this.request.call_id + this.from_tag;

  this.rtcMediaHandler = new RTCSession.RTCEngine(this, {
    constraints: RTCConstraints,
    stun_servers: stun_servers,
    turn_servers: turn_servers
  });

  //Save the session into the ua sessions collection.
  this.ua.sessions[this.id] = this;

  newRTCSession.call(this, 'local', this.request);

  this.sendInitialRequest(mediaConstraints, RTCOfferConstraints, mediaStream);
};

RTCSession.prototype.close = function() {
  var idx;

  if(this.status === C.STATUS_TERMINATED) {
    return;
  }

  debug('closing INVITE session ' + this.id);

  // 1st Step. Terminate media.
  if (this.rtcMediaHandler){
    this.rtcMediaHandler.close();
  }

  // 2nd Step. Terminate signaling.

  // Clear session timers
  for(idx in this.timers) {
    clearTimeout(this.timers[idx]);
  }

  // Terminate dialogs

  // Terminate confirmed dialog
  if(this.dialog) {
    this.dialog.terminate();
    delete this.dialog;
  }

  // Terminate early dialogs
  for(idx in this.earlyDialogs) {
    this.earlyDialogs[idx].terminate();
    delete this.earlyDialogs[idx];
  }

  this.status = C.STATUS_TERMINATED;

  delete this.ua.sessions[this.id];
};


/**
 * Dialog Management
 */
RTCSession.prototype.createDialog = function(message, type, early) {
  var dialog, early_dialog,
    local_tag = (type === 'UAS') ? message.to_tag : message.from_tag,
    remote_tag = (type === 'UAS') ? message.from_tag : message.to_tag,
    id = message.call_id + local_tag + remote_tag;

    early_dialog = this.earlyDialogs[id];

  // Early Dialog
  if (early) {
    if (early_dialog) {
      return true;
    } else {
      early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

      // Dialog has been successfully created.
      if(early_dialog.error) {
        debug(dialog.error);
        failed.call(this, 'remote', message, JsSIP_C.causes.INTERNAL_ERROR);
        return false;
      } else {
        this.earlyDialogs[id] = early_dialog;
        return true;
      }
    }
  }

  // Confirmed Dialog
  else {
    // In case the dialog is in _early_ state, update it
    if (early_dialog) {
      early_dialog.update(message, type);
      this.dialog = early_dialog;
      delete this.earlyDialogs[id];
      return true;
    }

    // Otherwise, create a _confirmed_ dialog
    dialog = new Dialog(this, message, type);

    if(dialog.error) {
      debug(dialog.error);
      failed.call(this, 'remote', message, JsSIP_C.causes.INTERNAL_ERROR);
      return false;
    } else {
      this.to_tag = message.to_tag;
      this.dialog = dialog;
      return true;
    }
  }
};

/**
 * In dialog INVITE Reception
 */

RTCSession.prototype.receiveReinvite = function(request) {
  var
    sdp, idx, direction,
    self = this,
    contentType = request.getHeader('Content-Type'),
    hold = false;

  function createSdp(onSuccess, onFailure) {
    if (self.late_sdp) {
      self.rtcMediaHandler.createOffer(onSuccess, onFailure);
    } else {
      self.rtcMediaHandler.createAnswer(onSuccess, onFailure);
    }
  }

  function answer() {
    createSdp(
      // onSuccess
      function(body) {
        request.reply(200, null, ['Contact: ' + self.contact], body,
          function() {
            self.status = C.STATUS_WAITING_FOR_ACK;
            self.setInvite2xxTimer(request, body);
            self.setACKTimer();

            if (self.remote_hold === true && hold === false) {
              onunhold.call(self, 'remote');
            } else if (self.remote_hold === false && hold === true) {
              onhold.call(self, 'remote');
            }
          }
        );
      },
      // onFailure
      function() {
        request.reply(500);
      }
    );
  }

  if (request.body) {
    if (contentType !== 'application/sdp') {
      debug('invalid Content-Type');
      request.reply(415);
      return;
    }

    sdp = Parser.parseSDP(request.body);

    for (idx=0; idx < sdp.media.length; idx++) {
      direction = sdp.direction || sdp.media[idx].direction || 'sendrecv';

      if (direction === 'sendonly' || direction === 'inactive') {
        hold = true;
      }
    }

    this.rtcMediaHandler.setRemoteDescription(
      'offer',
      request.body,
      /*
      * onSuccess
      * SDP Offer is valid
      */
      answer,
      /*
       * onFailure
       * Bad media description
       */
      function(e) {
        debug(e);
        request.reply(488);
      }
    );
  } else {
    this.late_sdp = true;
    answer();
  }
};

/**
 * In dialog UPDATE Reception
 */

RTCSession.prototype.receiveUpdate = function(request) {
  var
    sdp, idx, direction,
    self = this,
    contentType = request.getHeader('Content-Type'),
    hold = true;

  if (! request.body) {
    request.reply(200);
    return;
  }

  if (contentType !== 'application/sdp') {
    debug('invalid Content-Type');
    request.reply(415);
    return;
  }

  sdp = Parser.parseSDP(request.body);

  for (idx=0; idx < sdp.media.length; idx++) {
    direction = sdp.direction || sdp.media[idx].direction || 'sendrecv';

    if (direction !== 'sendonly' && direction !== 'inactive') {
      hold = false;
    }
  }

  this.rtcMediaHandler.setRemoteDescription(
    'offer',
    request.body,
    /*
    * onSuccess
    * SDP Offer is valid
    */
    function() {
      self.rtcMediaHandler.createAnswer(
        function(body) {
          request.reply(200, null, ['Contact: ' + self.contact], body,
            function() {
              if (self.remote_hold === true && hold === false) {
                onunhold.call(self, 'remote');
              } else if (self.remote_hold === false && hold === true) {
                onhold.call(self, 'remote');
              }
            }
          );
        },
        function() {
          request.reply(500);
        }
      );
    },
    /*
     * onFailure
     * Bad media description
     */
    function(e) {
      debug(e);
      request.reply(488);
    }
  );
};

/**
 * In dialog Request Reception
 */
RTCSession.prototype.receiveRequest = function(request) {
  var contentType,
      self = this;

  if(request.method === JsSIP_C.CANCEL) {
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
    if(this.status === C.STATUS_WAITING_FOR_ANSWER  || this.status === C.STATUS_ANSWERED) {
      this.status = C.STATUS_CANCELED;
      this.request.reply(487);
      failed.call(this, 'remote', request, JsSIP_C.causes.CANCELED);
    }
  } else {
    // Requests arriving here are in-dialog requests.
    switch(request.method) {
      case JsSIP_C.ACK:
        if(this.status === C.STATUS_WAITING_FOR_ACK) {
          clearTimeout(this.timers.ackTimer);
          clearTimeout(this.timers.invite2xxTimer);

          if (this.late_sdp) {
            if (!request.body) {
              ended.call(this, 'remote', request, JsSIP_C.causes.MISSING_SDP);
              break;
            }

            this.rtcMediaHandler.setRemoteDescription(
              'answer',
              request.body,
              /*
               * onSuccess
               * SDP Answer fits with Offer. Media will start
               */
              function() {
                self.late_sdp = false;
                self.status = C.STATUS_CONFIRMED;
              },
              /*
               * onFailure
               * SDP Answer does not fit the Offer. Accept the call and Terminate.
               */
              function(e) {
                debug(e);
                ended.call(self, 'remote', request, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);
              }
            );
          } else {
            this.status = C.STATUS_CONFIRMED;
          }

          if (this.status === C.STATUS_CONFIRMED && !this.is_confirmed) {
            confirmed.call(this, 'remote', request);
          }
        }
        break;
      case JsSIP_C.BYE:
        if(this.status === C.STATUS_CONFIRMED) {
          request.reply(200);
          ended.call(this, 'remote', request, JsSIP_C.causes.BYE);
        }
        else if (this.status === C.STATUS_INVITE_RECEIVED) {
          request.reply(200);
          this.request.reply(487, 'BYE Received');
          ended.call(this, 'remote', request, JsSIP_C.causes.BYE);
        }
        else {
          request.reply(403, 'Wrong Status');
        }
        break;
      case JsSIP_C.INVITE:
        if(this.status === C.STATUS_CONFIRMED) {
          debug('re-INVITE received');
          this.receiveReinvite(request);
        }
        else {
          request.reply(403, 'Wrong Status');
        }
        break;
      case JsSIP_C.INFO:
        if(this.status === C.STATUS_CONFIRMED || this.status === C.STATUS_WAITING_FOR_ACK || this.status === C.STATUS_INVITE_RECEIVED) {
          contentType = request.getHeader('content-type');
          if (contentType && (contentType.match(/^application\/dtmf-relay/i))) {
            new RTCSession_DTMF(this).init_incoming(request);
          }
          else {
            request.reply(415);
          }
        }
        else {
          request.reply(403, 'Wrong Status');
        }
        break;
      case JsSIP_C.UPDATE:
        if(this.status === C.STATUS_CONFIRMED) {
          debug('UPDATE received');
          this.receiveUpdate(request);
        }
        else {
          request.reply(403, 'Wrong Status');
        }
        break;
      default:
        request.reply(501);
    }
  }
};


/**
 * Initial Request Sender
 */
RTCSession.prototype.sendInitialRequest = function(mediaConstraints, RTCOfferConstraints, mediaStream) {
  var self = this;
  var request_sender = new RequestSender(self, this.ua);

  // User media succeeded
  function userMediaSucceeded(stream) {
    self.rtcMediaHandler.addStream(
      stream,
      streamAdditionSucceeded,
      streamAdditionFailed
    );
  }

  // User media failed
  function userMediaFailed() {
    if (self.status === C.STATUS_TERMINATED) {
      return;
    }

    failed.call(self, 'local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
  }

  // rtcMediaHandler.addStream successfully added
  function streamAdditionSucceeded() {
    connecting.call(self, self.request);

    if (self.status === C.STATUS_TERMINATED) {
      return;
    }

    self.rtcMediaHandler.createOffer(
      offerCreationSucceeded,
      offerCreationFailed,
      RTCOfferConstraints
    );
  }

  // rtcMediaHandler.addStream failed
  function streamAdditionFailed() {
    if (self.status === C.STATUS_TERMINATED) {
      return;
    }

    failed.call(self, 'system', null, JsSIP_C.causes.WEBRTC_ERROR);
  }

  // rtcMediaHandler.createOffer succeeded
  function offerCreationSucceeded(offer) {
    if (self.isCanceled || self.status === C.STATUS_TERMINATED) {
      return;
    }

    self.request.body = offer;
    self.status = C.STATUS_INVITE_SENT;
    request_sender.send();
  }

  // rtcMediaHandler.createOffer failed
  function offerCreationFailed() {
    if (self.status === C.STATUS_TERMINATED) {
      return;
    }

    failed.call(self, 'system', null, JsSIP_C.causes.WEBRTC_ERROR);
  }

  this.receiveResponse = this.receiveInviteResponse;

  if (mediaStream) {
    userMediaSucceeded(mediaStream);
  } else {
    this.rtcMediaHandler.getUserMedia(
      userMediaSucceeded,
      userMediaFailed,
      mediaConstraints
    );
  }
};

/**
 * Send Re-INVITE
 */
RTCSession.prototype.sendReinvite = function(options) {
  options = options || {};

  var
    self = this,
    extraHeaders = options.extraHeaders || [],
    eventHandlers = options.eventHandlers || {},
    mangle = options.mangle || null;

  if (eventHandlers.succeeded) {
    this.reinviteSucceeded = eventHandlers.succeeded;
  } else {
    this.reinviteSucceeded = function(){};
  }
  if (eventHandlers.failed) {
    this.reinviteFailed = eventHandlers.failed;
  } else {
    this.reinviteFailed = function(){};
  }

  extraHeaders.push('Contact: ' + this.contact);
  extraHeaders.push('Content-Type: application/sdp');

  this.receiveResponse = this.receiveReinviteResponse;

  this.rtcMediaHandler.createOffer(
    function(body){
      if (mangle) {
        body = mangle(body);
      }

      self.dialog.sendRequest(self, JsSIP_C.INVITE, {
        extraHeaders: extraHeaders,
        body: body
      });
    },
    function() {
      if (self.isReadyToReinvite()) {
        self.onReadyToReinvite();
      }
      self.reinviteFailed();
    }
  );
};


/**
 * Reception of Response for Initial INVITE
 */
RTCSession.prototype.receiveInviteResponse = function(response) {
  var cause, dialog,
    self = this;

  // Handle 2XX retransmissions and responses from forked requests
  if (this.dialog && (response.status_code >=200 && response.status_code <=299)) {

    /*
     * If it is a retransmission from the endpoint that established
     * the dialog, send an ACK
     */
    if (this.dialog.id.call_id === response.call_id &&
        this.dialog.id.local_tag === response.from_tag &&
        this.dialog.id.remote_tag === response.to_tag) {
      this.sendRequest(JsSIP_C.ACK);
      return;
    }

    // If not, send an ACK  and terminate
    else  {
      dialog = new Dialog(this, response, 'UAC');

      if (dialog.error !== undefined) {
        debug(dialog.error);
        return;
      }

      dialog.sendRequest({
          owner: {status: C.STATUS_TERMINATED},
          onRequestTimeout: function(){},
          onTransportError: function(){},
          onDialogError: function(){},
          receiveResponse: function(){}
        }, JsSIP_C.ACK);

      dialog.sendRequest({
          owner: {status: C.STATUS_TERMINATED},
          onRequestTimeout: function(){},
          onTransportError: function(){},
          onDialogError: function(){},
          receiveResponse: function(){}
        }, JsSIP_C.BYE);
      return;
    }

  }

  // Proceed to cancellation if the user requested.
  if(this.isCanceled) {
    // Remove the flag. We are done.
    this.isCanceled = false;

    if(response.status_code >= 100 && response.status_code < 200) {
      this.request.cancel(this.cancelReason);
    } else if(response.status_code >= 200 && response.status_code < 299) {
      this.acceptAndTerminate(response);
    }
    return;
  }

  if(this.status !== C.STATUS_INVITE_SENT && this.status !== C.STATUS_1XX_RECEIVED) {
    return;
  }

  switch(true) {
    case /^100$/.test(response.status_code):
      break;
    case /^1[0-9]{2}$/.test(response.status_code):
      if(this.status !== C.STATUS_INVITE_SENT && this.status !== C.STATUS_1XX_RECEIVED) {
        break;
      }

      // Do nothing with 1xx responses without To tag.
      if(!response.to_tag) {
        debug('1xx response received without to tag');
        break;
      }

      // Create Early Dialog if 1XX comes with contact
      if(response.hasHeader('contact')) {
        // An error on dialog creation will fire 'failed' event
        if(!this.createDialog(response, 'UAC', true)) {
          break;
        }
      }

      this.status = C.STATUS_1XX_RECEIVED;
      progress.call(this, 'remote', response);

      if (!response.body) {
        break;
      }

      this.rtcMediaHandler.setRemoteDescription(
        'pranswer',
        response.body,
        /*
        * OnSuccess.
        * SDP Answer fits with Offer.
        */
        function() { },
        /*
        * OnFailure.
        * SDP Answer does not fit with Offer.
        */
        function(e) {
          debug(e);
          self.earlyDialogs[response.call_id + response.from_tag + response.to_tag].terminate();
        }
      );
      break;
    case /^2[0-9]{2}$/.test(response.status_code):
      this.status = C.STATUS_CONFIRMED;

      if(!response.body) {
        this.acceptAndTerminate(response, 400, JsSIP_C.causes.MISSING_SDP);
        failed.call(this, 'remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);
        break;
      }

      // An error on dialog creation will fire 'failed' event
      if (!this.createDialog(response, 'UAC')) {
        break;
      }

      this.rtcMediaHandler.setRemoteDescription(
        'answer',
        response.body,
        /*
         * onSuccess
         * SDP Answer fits with Offer. Media will start
         */
        function() {
          accepted.call(self, 'remote', response);
          self.sendRequest(JsSIP_C.ACK);
          confirmed.call(self, 'local', null);
        },
        /*
         * onFailure
         * SDP Answer does not fit the Offer. Accept the call and Terminate.
         */
        function(e) {
          debug(e);
          self.acceptAndTerminate(response, 488, 'Not Acceptable Here');
          failed.call(self, 'remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);
        }
      );
      break;
    default:
      cause = Utils.sipErrorCause(response.status_code);
      failed.call(this, 'remote', response, cause);
  }
};

/**
 * Reception of Response for in-dialog INVITE
 */
RTCSession.prototype.receiveReinviteResponse = function(response) {
  var
    self = this,
    contentType = response.getHeader('Content-Type');

  if (this.status === C.STATUS_TERMINATED) {
    return;
  }

  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      break;
    case /^2[0-9]{2}$/.test(response.status_code):
      this.status = C.STATUS_CONFIRMED;
      this.sendRequest(JsSIP_C.ACK);

      if(!response.body) {
        this.reinviteFailed();
        break;
      } else if (contentType !== 'application/sdp') {
        this.reinviteFailed();
        break;
      }

      this.rtcMediaHandler.setRemoteDescription(
        'answer',
        response.body,
        /*
         * onSuccess
         * SDP Answer fits with Offer.
         */
        function() {
          self.reinviteSucceeded();
        },
        /*
         * onFailure
         * SDP Answer does not fit the Offer.
         */
        function() {
          self.reinviteFailed();
        }
      );
      break;
    default:
      this.reinviteFailed();
  }
};

RTCSession.prototype.acceptAndTerminate = function(response, status_code, reason_phrase) {
  var extraHeaders = [];

  if (status_code) {
    reason_phrase = reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
    extraHeaders.push('Reason: SIP ;cause=' + status_code + '; text="' + reason_phrase + '"');
  }

  // An error on dialog creation will fire 'failed' event
  if (this.dialog || this.createDialog(response, 'UAC')) {
    this.sendRequest(JsSIP_C.ACK);
    this.sendRequest(JsSIP_C.BYE, {
      extraHeaders: extraHeaders
    });
  }

  // Update session status.
  this.status = C.STATUS_TERMINATED;
};


RTCSession.prototype.toogleMuteAudio = function(mute) {
  var streamIdx, trackIdx, tracks,
    localStreams = this.getLocalStreams();

  for (streamIdx in localStreams) {
    tracks = localStreams[streamIdx].getAudioTracks();
    for (trackIdx in tracks) {
      tracks[trackIdx].enabled = !mute;
    }
  }
};

RTCSession.prototype.toogleMuteVideo = function(mute) {
  var streamIdx, trackIdx, tracks,
    localStreams = this.getLocalStreams();

  for (streamIdx in localStreams) {
    tracks = localStreams[streamIdx].getVideoTracks();
    for (trackIdx in tracks) {
      tracks[trackIdx].enabled = !mute;
    }
  }
};

/**
 * Session Callbacks
 */

RTCSession.prototype.onTransportError = function() {
  if(this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      ended.call(this, 'system', null, JsSIP_C.causes.CONNECTION_ERROR);
    } else {
      ended.call(this, 'system', null, JsSIP_C.causes.CONNECTION_ERROR);
    }
  }
};

RTCSession.prototype.onRequestTimeout = function() {
  if(this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      ended.call(this, 'system', null, JsSIP_C.causes.REQUEST_TIMEOUT);
    } else {
      ended.call(this, 'system', null, JsSIP_C.causes.REQUEST_TIMEOUT);
    }
  }
};

RTCSession.prototype.onDialogError = function(response) {
  if(this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      ended.call(this, 'remote', response, JsSIP_C.causes.DIALOG_ERROR);
    } else {
      failed.call(this, 'remote', response, JsSIP_C.causes.DIALOG_ERROR);
    }
  }
};


/**
 * Internal Callbacks
 */

function newRTCSession(originator, request) {
  if (originator === 'remote') {
    this.direction = 'incoming';
    this.local_identity = request.to;
    this.remote_identity = request.from;
  } else if (originator === 'local'){
    this.direction = 'outgoing';
    this.local_identity = request.from;
    this.remote_identity = request.to;
  }

  this.ua.newRTCSession({
    originator: originator,
    session: this,
    request: request
  });
}

function connecting(request) {
  this.emit('connecting', {
    request: request
  });
}

function progress(originator, response) {
  this.emit('progress', {
    originator: originator,
    response: response || null
  });
}

function accepted(originator, message) {
  this.start_time = new Date();

  this.emit('accepted', {
    originator: originator,
    response: message || null
  });
}

function confirmed(originator, ack) {
  this.is_confirmed = true;

  this.emit('confirmed', {
    originator: originator,
    ack: ack || null
  });
}

function ended(originator, message, cause) {
  this.end_time = new Date();

  this.close();
  this.emit('ended', {
    originator: originator,
    message: message || null,
    cause: cause
  });
}

function failed(originator, message, cause) {
  this.close();
  this.emit('failed', {
    originator: originator,
    message: message || null,
    cause: cause
  });
}

function onhold(originator) {
  if (originator === 'local') {
    this.local_hold = true;
  } else {
    this.remote_hold = true;
  }

  this.emit('hold', {
    originator: originator
  });
}

function onunhold(originator) {
  if (originator === 'local') {
    this.local_hold = false;
  } else {
    this.remote_hold = false;
  }

  this.emit('unhold', {
    originator: originator
  });
}

function onmute(options) {
  this.emit('muted', {
    audio: options.audio,
    video: options.video
  });
}

function onunmute(options) {
  this.emit('unmuted', {
    audio: options.audio,
    video: options.video
  });
}

// Called from DTMF handler.
RTCSession.prototype.newDTMF = function(data) {
  this.emit('newDTMF', data);
};

RTCSession.prototype.onReadyToReinvite = function() {
  var action = (this.pending_actions.length() > 0)? this.pending_actions.shift() : null;

  if (!action) {
    return;
  }

  if (action.name === 'hold') {
    this.hold();
  } else if (action.name === 'unhold') {
    this.unhold();
  }
};
