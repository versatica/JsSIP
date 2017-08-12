/* globals RTCPeerConnection: false, RTCSessionDescription: false */

/**
 * Dependencies.
 */
const events = require('events');
const debug = require('debug')('JsSIP:RTCSession');
const debugerror = require('debug')('JsSIP:ERROR:RTCSession');
debugerror.log = console.warn.bind(console);
const sdp_transform = require('sdp-transform');
const JsSIP_C = require('./Constants');
const Exceptions = require('./Exceptions');
const Transactions = require('./Transactions');
const Utils = require('./Utils');
const Timers = require('./Timers');
const SIPMessage = require('./SIPMessage');
const Dialog = require('./Dialog');
const RequestSender = require('./RequestSender');
const RTCSession_Request = require('./RTCSession/Request');
const RTCSession_DTMF = require('./RTCSession/DTMF');
const RTCSession_Info = require('./RTCSession/Info');
const RTCSession_ReferNotifier = require('./RTCSession/ReferNotifier');
const RTCSession_ReferSubscriber = require('./RTCSession/ReferSubscriber');

const C = {
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
 * Local variables.
 */
const holdMediaTypes = ['audio', 'video'];


class RTCSession extends events.EventEmitter {
  constructor(ua) {
    debug('new');

    this.ua = ua;
    this.status = C.STATUS_NULL;
    this.dialog = null;
    this.earlyDialogs = {};
    this.connection = null;  // The RTCPeerConnection instance (public attribute).

    // RTCSession confirmation flag
    this.is_confirmed = false;

    // is late SDP being negotiated
    this.late_sdp = false;

    // Default rtcOfferConstraints and rtcAnswerConstrainsts (passed in connect() or answer()).
    this.rtcOfferConstraints = null;
    this.rtcAnswerConstraints = null;

    // Local MediaStream.
    this.localMediaStream = null;
    this.localMediaStreamLocallyGenerated = false;

    // Flag to indicate PeerConnection ready for new actions.
    this.rtcReady = true;

    // SIP Timers
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
    this.localHold = false;
    this.remoteHold = false;

    // Session Timers (RFC 4028)
    this.sessionTimers = {
      enabled: this.ua.configuration.session_timers,
      defaultExpires: JsSIP_C.SESSION_EXPIRES,
      currentExpires: null,
      running: false,
      refresher: false,
      timer: null  // A setTimeout.
    };

    // Map of ReferSubscriber instances indexed by the REFER's CSeq number
    this.referSubscribers = {};

    // Custom session empty object for high level use
    this.data = {};

    // Expose session failed/ended causes as a property of the RTCSession instance
    this.causes = JsSIP_C.causes;

    super();
  }

  /**
   * User API
   */


  isInProgress() {
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
  }

  isEstablished() {
    switch(this.status) {
      case C.STATUS_ANSWERED:
      case C.STATUS_WAITING_FOR_ACK:
      case C.STATUS_CONFIRMED:
        return true;
      default:
        return false;
    }
  }

  isEnded() {
    switch(this.status) {
      case C.STATUS_CANCELED:
      case C.STATUS_TERMINATED:
        return true;
      default:
        return false;
    }
  }

  isMuted() {
    return {
      audio: this.audioMuted,
      video: this.videoMuted
    };
  }

  isOnHold() {
    return {
      local: this.localHold,
      remote: this.remoteHold
    };
  }

  /**
   * Check if RTCSession is ready for an outgoing re-INVITE or UPDATE with SDP.
   */
  isReadyToReOffer() {
   if (! this.rtcReady) {
     debug('isReadyToReOffer() | internal WebRTC status not ready');
     return false;
   }

   // No established yet.
   if (! this.dialog) {
     debug('isReadyToReOffer() | session not established yet');
     return false;
   }

   // Another INVITE transaction is in progress
   if (this.dialog.uac_pending_reply === true || this.dialog.uas_pending_reply === true) {
     debug('isReadyToReOffer() | there is another INVITE/UPDATE transaction in progress');
     return false;
   }

   return true;
 }

  connect(target, options, initCallback) {
    debug('connect()');

    options = options || {};

    let event;
    let requestParams;
    const originalTarget = target;
    const eventHandlers = options.eventHandlers || {};
    const extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [];
    const mediaConstraints = options.mediaConstraints || {audio: true, video: true};
    const mediaStream = options.mediaStream || null;
    const pcConfig = options.pcConfig || {iceServers:[]};
    const rtcConstraints = options.rtcConstraints || null;
    const rtcOfferConstraints = options.rtcOfferConstraints || null;

    this.rtcOfferConstraints = rtcOfferConstraints;
    this.rtcAnswerConstraints = options.rtcAnswerConstraints || null;

    // Session Timers.
    if (this.sessionTimers.enabled) {
      if (Utils.isDecimal(options.sessionTimersExpires)) {
        if (options.sessionTimersExpires >= JsSIP_C.MIN_SESSION_EXPIRES) {
          this.sessionTimers.defaultExpires = options.sessionTimersExpires;
        }
        else {
          this.sessionTimers.defaultExpires = JsSIP_C.SESSION_EXPIRES;
        }
      }
    }

    this.data = options.data || this.data;

    if (target === undefined) {
      throw new TypeError('Not enough arguments');
    }

    // Check WebRTC support.
    if (!window.RTCPeerConnection) {
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
    if (this.sessionTimers.enabled) {
      extraHeaders.push('Session-Expires: ' + this.sessionTimers.defaultExpires);
    }

    this.request = new SIPMessage.OutgoingRequest(JsSIP_C.INVITE, target, this.ua, requestParams, extraHeaders);

    this.id = this.request.call_id + this.from_tag;

    // Create a new RTCPeerConnection instance.
    createRTCConnection.call(this, pcConfig, rtcConstraints);

    // Save the session into the ua sessions collection.
    this.ua.sessions[this.id] = this;

    // Set internal properties
    this.direction = 'outgoing';
    this.local_identity = this.request.from;
    this.remote_identity = this.request.to;

    // User explicitly provided a newRTCSession callback for this session
    if (initCallback) {
      initCallback(this);
    } else {
      newRTCSession.call(this, 'local', this.request);
    }

    sendInitialRequest.call(this, mediaConstraints, rtcOfferConstraints, mediaStream);
  }

  init_incoming(request, initCallback) {
    debug('init_incoming()');

    let expires;
    const self = this;
    const contentType = request.getHeader('Content-Type');

    // Check body and content type
    if (request.body && (contentType !== 'application/sdp')) {
      request.reply(415);
      return;
    }

    // Session parameter initialization
    this.status = C.STATUS_INVITE_RECEIVED;
    this.from_tag = request.from_tag;
    this.id = request.call_id + this.from_tag;
    this.request = request;
    this.contact = this.ua.contact.toString();

    // Save the session into the ua sessions collection.
    this.ua.sessions[this.id] = this;

    // Get the Expires header value if exists
    if (request.hasHeader('expires')) {
      expires = request.getHeader('expires') * 1000;
    }

    /* Set the to_tag before
     * replying a response code that will create a dialog.
     */
    request.to_tag = Utils.newTag();

    // An error on dialog creation will fire 'failed' event
    if (! createDialog.call(this, request, 'UAS', true)) {
      request.reply(500, 'Missing Contact header field');
      return;
    }

    if (request.body) {
      this.late_sdp = false;
    }
    else {
      this.late_sdp = true;
    }

    this.status = C.STATUS_WAITING_FOR_ANSWER;

    // Set userNoAnswerTimer
    this.timers.userNoAnswerTimer = setTimeout(() => {
        request.reply(408);
        failed.call(self, 'local',null, JsSIP_C.causes.NO_ANSWER);
      }, this.ua.configuration.no_answer_timeout
    );

    /* Set expiresTimer
     * RFC3261 13.3.1
     */
    if (expires) {
      this.timers.expiresTimer = setTimeout(() => {
          if(self.status === C.STATUS_WAITING_FOR_ANSWER) {
            request.reply(487);
            failed.call(self, 'system', null, JsSIP_C.causes.EXPIRES);
          }
        }, expires
      );
    }

    // Set internal properties
    this.direction = 'incoming';
    this.local_identity = request.to;
    this.remote_identity = request.from;

    // A init callback was specifically defined
    if (initCallback) {
      initCallback(this);

    // Fire 'newRTCSession' event.
    } else {
      newRTCSession.call(this, 'remote', request);
    }

    // The user may have rejected the call in the 'newRTCSession' event.
    if (this.status === C.STATUS_TERMINATED) {
      return;
    }

    // Reply 180.
    request.reply(180, null, ['Contact: ' + self.contact]);

    // Fire 'progress' event.
    // TODO: Document that 'response' field in 'progress' event is null for
    // incoming calls.
    progress.call(self, 'local', null);
  }

  /**
   * Answer the call.
   */
  answer(options) {
    debug('answer()');

    options = options || {};

    let idx;
    let sdp;
    let tracks;
    let peerHasAudioLine = false;
    let peerHasVideoLine = false;
    let peerOffersFullAudio = false;
    let peerOffersFullVideo = false;
    const self = this;
    const request = this.request;
    const extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [];
    const mediaConstraints = options.mediaConstraints || {};
    const mediaStream = options.mediaStream || null;
    const pcConfig = options.pcConfig || {iceServers:[]};
    const rtcConstraints = options.rtcConstraints || null;
    const rtcAnswerConstraints = options.rtcAnswerConstraints || null;

    this.rtcAnswerConstraints = rtcAnswerConstraints;
    this.rtcOfferConstraints = options.rtcOfferConstraints || null;

    // Session Timers.
    if (this.sessionTimers.enabled) {
      if (Utils.isDecimal(options.sessionTimersExpires)) {
        if (options.sessionTimersExpires >= JsSIP_C.MIN_SESSION_EXPIRES) {
          this.sessionTimers.defaultExpires = options.sessionTimersExpires;
        }
        else {
          this.sessionTimers.defaultExpires = JsSIP_C.SESSION_EXPIRES;
        }
      }
    }

    this.data = options.data || this.data;

    // Check Session Direction and Status
    if (this.direction !== 'incoming') {
      throw new Exceptions.NotSupportedError('"answer" not supported for outgoing RTCSession');
    } else if (this.status !== C.STATUS_WAITING_FOR_ANSWER) {
      throw new Exceptions.InvalidStateError(this.status);
    }

    this.status = C.STATUS_ANSWERED;

    // An error on dialog creation will fire 'failed' event
    if (! createDialog.call(this, request, 'UAS')) {
      request.reply(500, 'Error creating dialog');
      return;
    }

    clearTimeout(this.timers.userNoAnswerTimer);

    extraHeaders.unshift('Contact: ' + self.contact);

    // Determine incoming media from incoming SDP offer (if any).
    sdp = request.parseSDP();

    // Make sure sdp.media is an array, not the case if there is only one media
    if (! Array.isArray(sdp.media)) {
      sdp.media = [sdp.media];
    }

    // Go through all medias in SDP to find offered capabilities to answer with
    idx = sdp.media.length;
    while(idx--) {
      const m = sdp.media[idx];
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

    // Remove audio from mediaStream if suggested by mediaConstraints
    if (mediaStream && mediaConstraints.audio === false) {
      tracks = mediaStream.getAudioTracks();
      for (let track of tracks) {
        mediaStream.removeTrack(track);
      }
    }

    // Remove video from mediaStream if suggested by mediaConstraints
    if (mediaStream && mediaConstraints.video === false) {
      tracks = mediaStream.getVideoTracks();
      for (let track of tracks) {
        mediaStream.removeTrack(track);
      }
    }

    // Set audio constraints based on incoming stream if not supplied
    if (!mediaStream && mediaConstraints.audio === undefined) {
      mediaConstraints.audio = peerOffersFullAudio;
    }

    // Set video constraints based on incoming stream if not supplied
    if (!mediaStream && mediaConstraints.video === undefined) {
      mediaConstraints.video = peerOffersFullVideo;
    }

    // Don't ask for audio if the incoming offer has no audio section
    if (!mediaStream && !peerHasAudioLine) {
      mediaConstraints.audio = false;
    }

    // Don't ask for video if the incoming offer has no video section
    if (!mediaStream && !peerHasVideoLine) {
      mediaConstraints.video = false;
    }

    // Create a new RTCPeerConnection instance.
    // TODO: This may throw an error, should react.
    createRTCConnection.call(this, pcConfig, rtcConstraints);

    // If a local MediaStream is given use it.
    if (mediaStream) {
      userMediaSucceeded(mediaStream);
    // If at least audio or video is requested prompt getUserMedia.
    } else if (mediaConstraints.audio || mediaConstraints.video) {
      self.localMediaStreamLocallyGenerated = true;
      navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(userMediaSucceeded)
        .catch(error => {
          userMediaFailed(error);

          debugerror('emit "getusermediafailed" [error:%o]', error);

          self.emit('getusermediafailed', error);
        });
    // Otherwise don't prompt getUserMedia.
    } else {
      userMediaSucceeded(null);
    }

    // User media succeeded
    function userMediaSucceeded(stream) {
      if (self.status === C.STATUS_TERMINATED) { return; }

      self.localMediaStream = stream;
      if (stream) {
        self.connection.addStream(stream);
      }

      debug('emit "peerconnection"');

      self.emit('peerconnection', {
        peerconnection: self.connection
      });

      if (! self.late_sdp) {
        const e = {originator:'remote', type:'offer', sdp:request.body};

        debug('emit "sdp"');
        self.emit('sdp', e);

        const offer = new RTCSessionDescription({type:'offer', sdp:e.sdp});

        self.connection.setRemoteDescription(offer)
          .then(remoteDescriptionSucceededOrNotNeeded)
          .catch(error => {
            request.reply(488);
            failed.call(self, 'system', null, JsSIP_C.causes.WEBRTC_ERROR);

            debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

            self.emit('peerconnection:setremotedescriptionfailed', error);
          });
      }
      else {
        remoteDescriptionSucceededOrNotNeeded();
      }
    }

    // User media failed
    function userMediaFailed() {
      if (self.status === C.STATUS_TERMINATED) { return; }

      request.reply(480);
      failed.call(self, 'local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
    }

    function remoteDescriptionSucceededOrNotNeeded() {
      connecting.call(self, request);
      if (! self.late_sdp) {
        createLocalDescription.call(self, 'answer', rtcSucceeded, rtcFailed, rtcAnswerConstraints);
      } else {
        createLocalDescription.call(self, 'offer', rtcSucceeded, rtcFailed, self.rtcOfferConstraints);
      }
    }

    function rtcSucceeded(desc) {
      if (self.status === C.STATUS_TERMINATED) { return; }

      // run for reply success callback
      function replySucceeded() {
        self.status = C.STATUS_WAITING_FOR_ACK;

        setInvite2xxTimer.call(self, request, desc);
        setACKTimer.call(self);
        accepted.call(self, 'local');
      }

      // run for reply failure callback
      function replyFailed() {
        failed.call(self, 'system', null, JsSIP_C.causes.CONNECTION_ERROR);
      }

      handleSessionTimersInIncomingRequest.call(self, request, extraHeaders);

      request.reply(200, null, extraHeaders,
        desc,
        replySucceeded,
        replyFailed
      );
    }

    function rtcFailed() {
      if (self.status === C.STATUS_TERMINATED) { return; }

      request.reply(500);
      failed.call(self, 'system', null, JsSIP_C.causes.WEBRTC_ERROR);
    }
  }

  /**
   * Terminate the call.
   */
  terminate(options) {
    debug('terminate()');

    options = options || {};

    let cancel_reason;
    let dialog;
    const cause = options.cause || JsSIP_C.causes.BYE;
    let status_code = options.status_code;
    let reason_phrase = options.reason_phrase;
    const extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [];
    const body = options.body;
    const self = this;

    // Check Session Status
    if (this.status === C.STATUS_TERMINATED) {
      throw new Exceptions.InvalidStateError(this.status);
    }

    switch(this.status) {
      // - UAC -
      case C.STATUS_NULL:
      case C.STATUS_INVITE_SENT:
      case C.STATUS_1XX_RECEIVED:
        debug('canceling session');

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
              sendRequest.call(this, JsSIP_C.BYE, {
                extraHeaders: extraHeaders,
                body: body
              });
              dialog.terminate();
            }
          };

          // .., or when the INVITE transaction times out
          this.request.server_transaction.on('stateChanged', function(){
            if (this.state === Transactions.C.STATUS_TERMINATED) {
              sendRequest.call(self, JsSIP_C.BYE, {
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
          sendRequest.call(this, JsSIP_C.BYE, {
            extraHeaders: extraHeaders,
            body: body
          });

          ended.call(this, 'local', null, cause);
        }
    }
  }

  close() {
    debug('close()');

    let idx;

    if (this.status === C.STATUS_TERMINATED) {
      return;
    }

    // Terminate RTC.
    if (this.connection) {
      try {
        this.connection.close();
      } catch(error) {
        debugerror('close() | error closing the RTCPeerConnection: %o', error);
      }
    }

    // Close local MediaStream if it was not given by the user.
    if (this.localMediaStream && this.localMediaStreamLocallyGenerated) {
      debug('close() | closing local MediaStream');

      Utils.closeMediaStream(this.localMediaStream);
    }

    // Terminate signaling.

    // Clear SIP timers
    for(idx in this.timers) {
      clearTimeout(this.timers[idx]);
    }

    // Clear Session Timers.
    clearTimeout(this.sessionTimers.timer);

    // Terminate confirmed dialog
    if (this.dialog) {
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
  }

  sendDTMF(tones, options) {
    debug('sendDTMF() | tones: %s', tones);

    let duration;
    let interToneGap;
    let position = 0;
    const self = this;

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
    if (!tones || typeof tones !== 'string' || !tones.match(/^[0-9A-DR#*,]+$/i)) {
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

    this.tones = tones;

    // Send the first tone
    _sendDTMF();

    function _sendDTMF() {
      let tone, timeout;

      if (self.status === C.STATUS_TERMINATED || !self.tones || position >= self.tones.length) {
        // Stop sending DTMF
        self.tones = null;
        return;
      }

      tone = self.tones[position];
      position += 1;

      if (tone === ',') {
        timeout = 2000;
      } else {
        const dtmf = new RTCSession_DTMF(self);
        options.eventHandlers = {
          onFailed: function() { self.tones = null; }
        };
        dtmf.send(tone, options);
        timeout = duration + interToneGap;
      }

      // Set timeout for the next tone
      setTimeout(_sendDTMF, timeout);
    }
  }

  sendInfo(contentType, body, options) {
    debug('sendInfo()');

    options = options || {};

    // Check Session Status
    if (this.status !== C.STATUS_CONFIRMED && this.status !== C.STATUS_WAITING_FOR_ACK) {
      throw new Exceptions.InvalidStateError(this.status);
    }

    const info = new RTCSession_Info(this);
    info.send(contentType, body, options);
  }

  /**
   * Mute
   */
  mute(options) {
    debug('mute()');

    options = options || {audio:true, video:false};

    let audioMuted = false, videoMuted = false;

    if (this.audioMuted === false && options.audio) {
      audioMuted = true;
      this.audioMuted = true;
      toogleMuteAudio.call(this, true);
    }

    if (this.videoMuted === false && options.video) {
      videoMuted = true;
      this.videoMuted = true;
      toogleMuteVideo.call(this, true);
    }

    if (audioMuted === true || videoMuted === true) {
      onmute.call(this, {
        audio: audioMuted,
        video: videoMuted
      });
    }
  }

  /**
   * Unmute
   */
  unmute(options) {
    debug('unmute()');

    options = options || {audio:true, video:true};

    let audioUnMuted = false, videoUnMuted = false;

    if (this.audioMuted === true && options.audio) {
      audioUnMuted = true;
      this.audioMuted = false;

      if (this.localHold === false) {
        toogleMuteAudio.call(this, false);
      }
    }

    if (this.videoMuted === true && options.video) {
      videoUnMuted = true;
      this.videoMuted = false;

      if (this.localHold === false) {
        toogleMuteVideo.call(this, false);
      }
    }

    if (audioUnMuted === true || videoUnMuted === true) {
      onunmute.call(this, {
        audio: audioUnMuted,
        video: videoUnMuted
      });
    }
  }

  /**
   * Hold
   */
  hold(options, done) {
    debug('hold()');

    options = options || {};

    const self = this;
    let eventHandlers;

    if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
      return false;
    }

    if (this.localHold === true) {
      return false;
    }

    if (! this.isReadyToReOffer()) {
      return false;
    }

    this.localHold = true;
    onhold.call(this, 'local');

    eventHandlers = {
      succeeded: function() {
        if (done) { done(); }
      },
      failed: function() {
        self.terminate({
          cause: JsSIP_C.causes.WEBRTC_ERROR,
          status_code: 500,
          reason_phrase: 'Hold Failed'
        });
      }
    };

    if (options.useUpdate) {
      sendUpdate.call(this, {
        sdpOffer: true,
        eventHandlers: eventHandlers,
        extraHeaders: options.extraHeaders
      });
    } else {
      sendReinvite.call(this, {
        eventHandlers: eventHandlers,
        extraHeaders: options.extraHeaders
      });
    }

    return true;
  }

  unhold(options, done) {
    debug('unhold()');

    options = options || {};

    const self = this;
    let eventHandlers;

    if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
      return false;
    }

    if (this.localHold === false) {
      return false;
    }

    if (! this.isReadyToReOffer()) {
      return false;
    }

    this.localHold = false;
    onunhold.call(this, 'local');

    eventHandlers = {
      succeeded: function() {
        if (done) { done(); }
      },
      failed: function() {
        self.terminate({
          cause: JsSIP_C.causes.WEBRTC_ERROR,
          status_code: 500,
          reason_phrase: 'Unhold Failed'
        });
      }
    };

    if (options.useUpdate) {
      sendUpdate.call(this, {
        sdpOffer: true,
        eventHandlers: eventHandlers,
        extraHeaders: options.extraHeaders
      });
    } else {
      sendReinvite.call(this, {
        eventHandlers: eventHandlers,
        extraHeaders: options.extraHeaders
      });
    }

    return true;
  }

  renegotiate(options, done) {
    debug('renegotiate()');

    options = options || {};

    const self = this;
    let eventHandlers;
    const rtcOfferConstraints = options.rtcOfferConstraints || null;

    if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
      return false;
    }

    if (! this.isReadyToReOffer()) {
      return false;
    }

    eventHandlers = {
      succeeded: function() {
        if (done) { done(); }
      },
      failed: function() {
        self.terminate({
          cause: JsSIP_C.causes.WEBRTC_ERROR,
          status_code: 500,
          reason_phrase: 'Media Renegotiation Failed'
        });
      }
    };

    setLocalMediaStatus.call(this);

    if (options.useUpdate) {
      sendUpdate.call(this, {
        sdpOffer: true,
        eventHandlers: eventHandlers,
        rtcOfferConstraints: rtcOfferConstraints,
        extraHeaders: options.extraHeaders
      });
    } else {
      sendReinvite.call(this, {
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
  refer(target, options) {
    debug('refer()');

    const self = this;
    const originalTarget = target;
    let referSubscriber;
    let id;

    if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
      return false;
    }

    // Check target validity
    target = this.ua.normalizeTarget(target);
    if (!target) {
      throw new TypeError('Invalid target: '+ originalTarget);
    }

    referSubscriber = new RTCSession_ReferSubscriber(this);
    referSubscriber.sendRefer(target, options);

    // Store in the map
    id = referSubscriber.outgoingRequest.cseq;
    this.referSubscribers[id] = referSubscriber;

    // Listen for ending events so we can remove it from the map
    referSubscriber.on('requestFailed', () => {
      delete self.referSubscribers[id];
    });
    referSubscriber.on('accepted', () => {
      delete self.referSubscribers[id];
    });
    referSubscriber.on('failed', () => {
      delete self.referSubscribers[id];
    });

    return referSubscriber;
  }

  /**
   * In dialog Request Reception
   */
  receiveRequest(request) {
    debug('receiveRequest()');

    let contentType;
    const self = this;

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
          if (this.status !== C.STATUS_WAITING_FOR_ACK) {
            return;
          }

          // Update signaling status.
          this.status = C.STATUS_CONFIRMED;

          clearTimeout(this.timers.ackTimer);
          clearTimeout(this.timers.invite2xxTimer);

          if (this.late_sdp) {
            if (!request.body) {
              this.terminate({
                cause: JsSIP_C.causes.MISSING_SDP,
                status_code: 400
              });
              break;
            }

            const e = {originator:'remote', type:'answer', sdp:request.body};
            const answer = new RTCSessionDescription({type:'answer', sdp:e.sdp});

            this.emit('sdp', e);

            this.connection.setRemoteDescription(answer)
              .then(() => {
                if (!self.is_confirmed) {
                  confirmed.call(self, 'remote', request);
                }
              })
              .catch(error => {
                self.terminate({
                  cause: JsSIP_C.causes.BAD_MEDIA_DESCRIPTION,
                  status_code: 488
                });

                self.emit('peerconnection:setremotedescriptionfailed', error);
              });
          }
          else {
            if (!this.is_confirmed) {
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
            if (request.hasHeader('replaces')) {
              receiveReplaces.call(this, request);
            } else {
              receiveReinvite.call(this, request);
            }
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
            else if (contentType !== undefined) {
              new RTCSession_Info(this).init_incoming(request);
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
            receiveUpdate.call(this, request);
          }
          else {
            request.reply(403, 'Wrong Status');
          }
          break;
        case JsSIP_C.REFER:
          if(this.status === C.STATUS_CONFIRMED) {
            receiveRefer.call(this, request);
          }
          else {
            request.reply(403, 'Wrong Status');
          }
          break;
        case JsSIP_C.NOTIFY:
          if(this.status === C.STATUS_CONFIRMED) {
            receiveNotify.call(this, request);
          }
          else {
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

  onTransportError() {
    debugerror('onTransportError()');

    if(this.status !== C.STATUS_TERMINATED) {
      this.terminate({
        status_code: 500,
        reason_phrase: JsSIP_C.causes.CONNECTION_ERROR,
        cause: JsSIP_C.causes.CONNECTION_ERROR
      });
    }
  }

  onRequestTimeout() {
    debugerror('onRequestTimeout()');

    if(this.status !== C.STATUS_TERMINATED) {
      this.terminate({
        status_code: 408,
        reason_phrase: JsSIP_C.causes.REQUEST_TIMEOUT,
        cause: JsSIP_C.causes.REQUEST_TIMEOUT
      });
    }
  }

  onDialogError() {
    debugerror('onDialogError()');

    if(this.status !== C.STATUS_TERMINATED) {
      this.terminate({
        status_code: 500,
        reason_phrase: JsSIP_C.causes.DIALOG_ERROR,
        cause: JsSIP_C.causes.DIALOG_ERROR
      });
    }
  }

  // Called from DTMF handler.
  newDTMF(data) {
    debug('newDTMF()');

    this.emit('newDTMF', data);
  }

  // Called from Info handler.
  newInfo(data) {
    debug('newInfo()');

    this.emit('newInfo', data);
  }

  resetLocalMedia() {
    debug('resetLocalMedia()');

    // Reset all but remoteHold.
    this.localHold = false;
    this.audioMuted = false;
    this.videoMuted = false;

    setLocalMediaStatus.call(this);
  }
}


/**
 * Private API.
 */


/**
 * RFC3261 13.3.1.4
 * Response retransmissions cannot be accomplished by transaction layer
 *  since it is destroyed when receiving the first 2xx answer
 */
function setInvite2xxTimer(request, body) {
  const self = this;
  let timeout = Timers.T1;

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
}


/**
 * RFC3261 14.2
 * If a UAS generates a 2xx response and never receives an ACK,
 *  it SHOULD generate a BYE to terminate the dialog.
 */
function setACKTimer() {
  const self = this;

  this.timers.ackTimer = setTimeout(() => {
    if(self.status === C.STATUS_WAITING_FOR_ACK) {
      debug('no ACK received, terminating the session');

      clearTimeout(self.timers.invite2xxTimer);
      sendRequest.call(self, JsSIP_C.BYE);
      ended.call(self, 'remote', null, JsSIP_C.causes.NO_ACK);
    }
  }, Timers.TIMER_H);
}


function createRTCConnection(pcConfig, rtcConstraints) {
  const self = this;

  this.connection = new RTCPeerConnection(pcConfig, rtcConstraints);

  this.connection.addEventListener('iceconnectionstatechange', () => {
    const state = self.connection.iceConnectionState;

    // TODO: Do more with different states.
    if (state === 'failed') {
      self.terminate({
        cause: JsSIP_C.causes.RTP_TIMEOUT,
        status_code: 408,
        reason_phrase: JsSIP_C.causes.RTP_TIMEOUT
      });
    }
  });
}

function createLocalDescription(type, onSuccess, onFailure, constraints) {
  debug('createLocalDescription()');

  const self = this;
  const connection = this.connection;

  this.rtcReady = false;

  if (type === 'offer') {
    connection.createOffer(constraints)
      .then(createSucceeded)
      .catch(error => {
        self.rtcReady = true;
        if (onFailure) { onFailure(error); }

        debugerror('emit "peerconnection:createofferfailed" [error:%o]', error);

        self.emit('peerconnection:createofferfailed', error);
      });
  }
  else if (type === 'answer') {
    connection.createAnswer(constraints)
      .then(createSucceeded)
      .catch(error => {
        self.rtcReady = true;
        if (onFailure) { onFailure(error); }

        debugerror('emit "peerconnection:createanswerfailed" [error:%o]', error);

        self.emit('peerconnection:createanswerfailed', error);
      });
  }
  else {
    throw new Error('createLocalDescription() | type must be "offer" or "answer", but "' +type+ '" was given');
  }

  // createAnswer or createOffer succeeded
  function createSucceeded(desc) {
    let listener;

    connection.addEventListener('icecandidate', listener = event => {
      const candidate = event.candidate;

      if (! candidate) {
        connection.removeEventListener('icecandidate', listener);
        self.rtcReady = true;

        if (onSuccess) {
          const e = {originator:'local', type:type, sdp:connection.localDescription.sdp};

          debug('emit "sdp"');

          self.emit('sdp', e);
          onSuccess(e.sdp);
        }
        onSuccess = null;
      }
    });

    connection.setLocalDescription(desc)
      .then(() => {
        if (connection.iceGatheringState === 'complete') {
          self.rtcReady = true;

          if (onSuccess) {
            const e = {originator:'local', type:type, sdp:connection.localDescription.sdp};

            debug('emit "sdp"');

            self.emit('sdp', e);
            onSuccess(e.sdp);
            onSuccess = null;
          }
        }
      })
      .catch(error => {
        self.rtcReady = true;
        if (onFailure) { onFailure(error); }

        debugerror('emit "peerconnection:setlocaldescriptionfailed" [error:%o]', error);

        self.emit('peerconnection:setlocaldescriptionfailed', error);
      });
  }
}


/**
 * Dialog Management
 */
function createDialog(message, type, early) {
  let dialog;
  let early_dialog;
  const local_tag = (type === 'UAS') ? message.to_tag : message.from_tag;
  const remote_tag = (type === 'UAS') ? message.from_tag : message.to_tag;
  const id = message.call_id + local_tag + remote_tag;

  early_dialog = this.earlyDialogs[id];

  // Early Dialog
  if (early) {
    if (early_dialog) {
      return true;
    } else {
      early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

      // Dialog has been successfully created.
      if(early_dialog.error) {
        debug(early_dialog.error);
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
    this.from_tag = message.from_tag;
    this.to_tag = message.to_tag;

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
      this.dialog = dialog;
      return true;
    }
  }
}

/**
 * In dialog INVITE Reception
 */

function receiveReinvite(request) {
  debug('receiveReinvite()');

  let sdp;
  let direction;
  const self = this;
  const contentType = request.getHeader('Content-Type');
  let hold = false;
  let rejected = false;

  const data = {
    request: request,
    callback: undefined,
    reject: reject.bind(this)
  };

  function reject(options = {}) {
    rejected = true;

    const status_code = options.status_code || 403, reason_phrase = options.reason_phrase || '', extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [];

    if (this.status !== C.STATUS_CONFIRMED) {
      return false;
    }

    if (status_code < 300 || status_code >= 700) {
      throw new TypeError('Invalid status_code: '+ status_code);
    }

    request.reply(status_code, reason_phrase, extraHeaders);
  }

  // Emit 'reinvite'.
  this.emit('reinvite', data);

  if (rejected) {
    return;
  }

  if (request.body) {
    this.late_sdp = false;
    if (contentType !== 'application/sdp') {
      debug('invalid Content-Type');
      request.reply(415);
      return;
    }

    sdp = request.parseSDP();

    for (let m of sdp.media) {
      if (holdMediaTypes.indexOf(m.type) === -1) {
        continue;
      }

      direction = m.direction || sdp.direction || 'sendrecv';

      if (direction === 'sendonly' || direction === 'inactive') {
        hold = true;
      }
      // If at least one of the streams is active don't emit 'hold'.
      else {
        hold = false;
        break;
      }
    }

    const e = {originator:'remote', type:'offer', sdp:request.body};
    const offer = new RTCSessionDescription({type:'offer', sdp:e.sdp});

    this.emit('sdp', e);

    this.connection.setRemoteDescription(offer)
      .then(doAnswer)
      .catch(error => {
        request.reply(488);

        debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

        self.emit('peerconnection:setremotedescriptionfailed', error);
      });
  }
  else {
    this.late_sdp = true;
    doAnswer();
  }

  function doAnswer() {
    createSdp(
      sdp => {
        const extraHeaders = ['Contact: ' + self.contact];

        handleSessionTimersInIncomingRequest.call(self, request, extraHeaders);

        if (self.late_sdp) {
          sdp = mangleOffer.call(self, sdp);
        }

        request.reply(200, null, extraHeaders, sdp,
          () => {
            self.status = C.STATUS_WAITING_FOR_ACK;
            setInvite2xxTimer.call(self, request, sdp);
            setACKTimer.call(self);
          }
        );

        // If callback is given execute it.
        if (typeof data.callback === 'function') {
          data.callback();
        }
      },
      () => {
        request.reply(500);
      }
    );
  }

  function createSdp(onSuccess, onFailure) {
    if (! self.late_sdp) {
      if (self.remoteHold === true && hold === false) {
        self.remoteHold = false;
        onunhold.call(self, 'remote');
      } else if (self.remoteHold === false && hold === true) {
        self.remoteHold = true;
        onhold.call(self, 'remote');
      }

      createLocalDescription.call(self, 'answer', onSuccess, onFailure, self.rtcAnswerConstraints);
    } else {
      createLocalDescription.call(self, 'offer', onSuccess, onFailure, self.rtcOfferConstraints);
    }
  }
}

/**
 * In dialog UPDATE Reception
 */
function receiveUpdate(request) {
  debug('receiveUpdate()');

  let sdp;
  let direction;
  const self = this;
  const contentType = request.getHeader('Content-Type');
  let rejected = false;
  let hold = false;

  const data = {
    request: request,
    callback: undefined,
    reject: reject.bind(this)
  };

  function reject(options = {}) {
    rejected = true;

    const status_code = options.status_code || 403, reason_phrase = options.reason_phrase || '', extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [];

    if (this.status !== C.STATUS_CONFIRMED) {
      return false;
    }

    if (status_code < 300 || status_code >= 700) {
      throw new TypeError('Invalid status_code: '+ status_code);
    }

    request.reply(status_code, reason_phrase, extraHeaders);
  }

  // Emit 'update'.
  this.emit('update', data);

  if (rejected) {
    return;
  }

  if (! request.body) {
    const extraHeaders = [];
    handleSessionTimersInIncomingRequest.call(this, request, extraHeaders);
    request.reply(200, null, extraHeaders);
    return;
  }

  if (contentType !== 'application/sdp') {
    debug('invalid Content-Type');

    request.reply(415);
    return;
  }

  sdp = request.parseSDP();

  for (let m of sdp.media) {

    if (holdMediaTypes.indexOf(m.type) === -1) {
      continue;
    }

    direction = m.direction || sdp.direction || 'sendrecv';

    if (direction === 'sendonly' || direction === 'inactive') {
      hold = true;
    }
    // If at least one of the streams is active don't emit 'hold'.
    else {
      hold = false;
      break;
    }
  }

  const e = {originator:'remote', type:'offer', sdp:request.body};

  debug('emit "sdp"');
  this.emit('sdp', e);

  const offer = new RTCSessionDescription({type:'offer', sdp:e.sdp});

  this.connection.setRemoteDescription(offer)
    .then(() => {
      if (self.remoteHold === true && hold === false) {
        self.remoteHold = false;
        onunhold.call(self, 'remote');
      } else if (self.remoteHold === false && hold === true) {
        self.remoteHold = true;
        onhold.call(self, 'remote');
      }

      createLocalDescription.call(self, 'answer',
        sdp => {
          const extraHeaders = ['Contact: ' + self.contact];

          handleSessionTimersInIncomingRequest.call(self, request, extraHeaders);
          request.reply(200, null, extraHeaders, sdp);

          // If callback is given execute it.
          if (typeof data.callback === 'function') {
            data.callback();
          }
        },
        () => {
          request.reply(500);
        }
      );
    })
    .catch(error => {
      request.reply(488);

      debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

      self.emit('peerconnection:setremotedescriptionfailed', error);
    });
}

/**
 * In dialog Refer Reception
 */
function receiveRefer(request) {
  debug('receiveRefer()');

  let notifier;
  const self = this;

  function accept(initCallback, options) {
    let session, replaces;

    options = options || {};
    initCallback = (typeof initCallback === 'function')? initCallback : null;

    if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
      return false;
    }

    session = new RTCSession(this.ua);

    session.on('progress', e => {
      notifier.notify(e.response.status_code, e.response.reason_phrase);
    });

    session.on('accepted', e => {
      notifier.notify(e.response.status_code, e.response.reason_phrase);
    });

    session.on('failed', e => {
      if (e.message) {
        notifier.notify(e.message.status_code, e.message.reason_phrase);
      } else {
        notifier.notify(487, e.cause);
      }
    });

    // Consider the Replaces header present in the Refer-To URI
    if (request.refer_to.uri.hasHeader('replaces')) {
      replaces = decodeURIComponent(request.refer_to.uri.getHeader('replaces'));
      options.extraHeaders = options.extraHeaders || [];
      options.extraHeaders.push('Replaces: '+ replaces);
    }

    session.connect(request.refer_to.uri.toAor(), options, initCallback);
  }

  function reject() {
    notifier.notify(603);
  }

  if (typeof request.refer_to === undefined) {
    debug('no Refer-To header field present in REFER');
    request.reply(400);
    return;
  }

  if (request.refer_to.uri.scheme !== JsSIP_C.SIP) {
    debug('Refer-To header field points to a non-SIP URI scheme');
    request.reply(416);
    return;
  }

  // reply before the transaction timer expires
  request.reply(202);

  notifier = new RTCSession_ReferNotifier(this, request.cseq);

  debug('emit "refer"');

  // Emit 'refer'.
  this.emit('refer', {
    request: request,
    accept: function(initCallback, options) { accept.call(self, initCallback, options); },
    reject: function() { reject.call(self); }
  });
}

/**
 * In dialog Notify Reception
 */
function receiveNotify(request) {
  debug('receiveNotify()');

  if (typeof request.event === undefined) {
    request.reply(400);
  }

  switch (request.event.event) {
    case 'refer': {
      const id = request.event.params.id;
      const referSubscriber = this.referSubscribers[id];

      if (!referSubscriber) {
        request.reply(481, 'Subscription does not exist');
        return;
      }

      referSubscriber.receiveNotify(request);
      request.reply(200);

      break;
    }

    default: {
      request.reply(489);
    }
  }
}

/**
 * INVITE with Replaces Reception
 */
function receiveReplaces(request) {
  debug('receiveReplaces()');

  const self = this;

  function accept(initCallback) {
    let session;

    if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
      return false;
    }

    session = new RTCSession(this.ua);

    // terminate the current session when the new one is confirmed
    session.on('confirmed', () => {
      self.terminate();
    });

    session.init_incoming(request, initCallback);
  }

  function reject() {
    debug('Replaced INVITE rejected by the user');
    request.reply(486);
  }

  // Emit 'replace'.
  this.emit('replaces', {
    request: request,
    accept: function(initCallback) { accept.call(self, initCallback); },
    reject: function() { reject.call(self); }
  });
}

/**
 * Initial Request Sender
 */
function sendInitialRequest(mediaConstraints, rtcOfferConstraints, mediaStream) {
  const self = this;
  const request_sender = new RequestSender(self, this.ua);

  this.receiveResponse = response => {
    receiveInviteResponse.call(self, response);
  };

  // If a local MediaStream is given use it.
  if (mediaStream) {
    // Wait a bit so the app can set events such as 'peerconnection' and 'connecting'.
    setTimeout(() => {
      userMediaSucceeded(mediaStream);
    });
  // If at least audio or video is requested prompt getUserMedia.
  } else if (mediaConstraints.audio || mediaConstraints.video) {
    this.localMediaStreamLocallyGenerated = true;
    navigator.mediaDevices.getUserMedia(mediaConstraints)
      .then(userMediaSucceeded)
      .catch(error => {
      userMediaFailed(error);

      debugerror('emit "getusermediafailed" [error:%o]', error);

      self.emit('getusermediafailed', error);
    });
  // Otherwise don't prompt getUserMedia.
  } else {
    userMediaSucceeded(null);
  }

  // User media succeeded
  function userMediaSucceeded(stream) {
    if (self.status === C.STATUS_TERMINATED) { return; }

    self.localMediaStream = stream;
    if (stream) {
      self.connection.addStream(stream);
    }

    debug('emit "peerconnection"');

    // Notify the app with the RTCPeerConnection so it can do stuff on it
    // before generating the offer.
    self.emit('peerconnection', {
      peerconnection: self.connection
    });

    connecting.call(self, self.request);
    createLocalDescription.call(self, 'offer', rtcSucceeded, rtcFailed, rtcOfferConstraints);
  }

  // User media failed
  function userMediaFailed() {
    if (self.status === C.STATUS_TERMINATED) { return; }

    failed.call(self, 'local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
  }

  function rtcSucceeded(desc) {
    if (self.isCanceled || self.status === C.STATUS_TERMINATED) { return; }

    self.request.body = desc;
    self.status = C.STATUS_INVITE_SENT;

    debug('emit "sending" [request:%o]', self.request);

    // Emit 'sending' so the app can mangle the body before the request
    // is sent.
    self.emit('sending', {
      request: self.request
    });

    request_sender.send();
  }

  function rtcFailed() {
    if (self.status === C.STATUS_TERMINATED) { return; }

    failed.call(self, 'system', null, JsSIP_C.causes.WEBRTC_ERROR);
  }
}

/**
 * Reception of Response for Initial INVITE
 */
function receiveInviteResponse(response) {
  debug('receiveInviteResponse()');

  let cause;
  let dialog;
  let e;
  let answer;
  const self = this;

  // Handle 2XX retransmissions and responses from forked requests
  if (this.dialog && (response.status_code >=200 && response.status_code <=299)) {

    /*
     * If it is a retransmission from the endpoint that established
     * the dialog, send an ACK
     */
    if (this.dialog.id.call_id === response.call_id &&
        this.dialog.id.local_tag === response.from_tag &&
        this.dialog.id.remote_tag === response.to_tag) {
      sendRequest.call(this, JsSIP_C.ACK);
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
      acceptAndTerminate.call(this, response);
    }
    return;
  }

  if(this.status !== C.STATUS_INVITE_SENT && this.status !== C.STATUS_1XX_RECEIVED) {
    return;
  }

  switch(true) {
    case /^100$/.test(response.status_code):
      this.status = C.STATUS_1XX_RECEIVED;
      break;

    case /^1[0-9]{2}$/.test(response.status_code):
      // Do nothing with 1xx responses without To tag.
      if (!response.to_tag) {
        debug('1xx response received without to tag');
        break;
      }

      // Create Early Dialog if 1XX comes with contact
      if (response.hasHeader('contact')) {
        // An error on dialog creation will fire 'failed' event
        if(! createDialog.call(this, response, 'UAC', true)) {
          break;
        }
      }

      this.status = C.STATUS_1XX_RECEIVED;
      progress.call(this, 'remote', response);

      if (!response.body) {
        break;
      }

      e = {originator:'remote', type:'answer', sdp:response.body};

      debug('emit "sdp"');

      this.emit('sdp', e);

      answer = new RTCSessionDescription({type:'answer', sdp:e.sdp});

      this.connection.setRemoteDescription(answer)
        .catch(error => {
          debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

          self.emit('peerconnection:setremotedescriptionfailed', error);
        });
      break;

    case /^2[0-9]{2}$/.test(response.status_code):
      this.status = C.STATUS_CONFIRMED;

      if(!response.body) {
        acceptAndTerminate.call(this, response, 400, JsSIP_C.causes.MISSING_SDP);
        failed.call(this, 'remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);
        break;
      }

      // An error on dialog creation will fire 'failed' event
      if (! createDialog.call(this, response, 'UAC')) {
        break;
      }

      e = {originator:'remote', type:'answer', sdp:response.body};

      debug('emit "sdp"');
      this.emit('sdp', e);

      answer = new RTCSessionDescription({type:'answer', sdp:e.sdp});

      Promise.resolve()
        .then(() => {
          // Be ready for 200 with SDP after a 180/183 with SDP. We created a SDP 'answer'
          // for it, so check the current signaling state.
          if (self.connection.signalingState === 'stable') {
            return self.connection.createOffer()
              .then(offer => self.connection.setLocalDescription(offer))
              .catch(error => {
                acceptAndTerminate.call(self, response, 500, error.toString());
                failed.call(self, 'local', response, JsSIP_C.causes.WEBRTC_ERROR);

                debugerror('emit "peerconnection:setlocaldescriptionfailed" [error:%o]', error);

                self.emit('peerconnection:setlocaldescriptionfailed', error);
              });
          }
        })
        .then(() => {
          self.connection.setRemoteDescription(answer)
            .then(() => {
              // Handle Session Timers.
              handleSessionTimersInIncomingResponse.call(self, response);

              accepted.call(self, 'remote', response);
              sendRequest.call(self, JsSIP_C.ACK);
              confirmed.call(self, 'local', null);
            })
            .catch(error => {
              acceptAndTerminate.call(self, response, 488, 'Not Acceptable Here');
              failed.call(self, 'remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);

              debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

              self.emit('peerconnection:setremotedescriptionfailed', error);
            });
        });
      break;

    default:
      cause = Utils.sipErrorCause(response.status_code);
      failed.call(this, 'remote', response, cause);
  }
}

/**
 * Send Re-INVITE
 */
function sendReinvite(options) {
  debug('sendReinvite()');

  options = options || {};

  const self = this;
  const extraHeaders = options.extraHeaders || [];
  const eventHandlers = options.eventHandlers || {};
  const rtcOfferConstraints = options.rtcOfferConstraints || this.rtcOfferConstraints || null;
  let succeeded = false;

  extraHeaders.push('Contact: ' + this.contact);
  extraHeaders.push('Content-Type: application/sdp');

  // Session Timers.
  if (this.sessionTimers.running) {
    extraHeaders.push('Session-Expires: ' + this.sessionTimers.currentExpires + ';refresher=' + (this.sessionTimers.refresher ? 'uac' : 'uas'));
  }

  createLocalDescription.call(this, 'offer',
    sdp => {
      sdp = mangleOffer.call(self, sdp);

      const request = new RTCSession_Request(self, JsSIP_C.INVITE);

      request.send({
        extraHeaders: extraHeaders,
        body: sdp,
        eventHandlers: {
          onSuccessResponse: function(response) {
            onSucceeded(response);
            succeeded = true;
          },
          onErrorResponse: function(response) {
            onFailed(response);
          },
          onTransportError: function() {
            self.onTransportError();  // Do nothing because session ends.
          },
          onRequestTimeout: function() {
            self.onRequestTimeout();  // Do nothing because session ends.
          },
          onDialogError: function() {
            self.onDialogError();  // Do nothing because session ends.
          }
        }
      });
    },
    () => {
      onFailed();
    },
    // RTC constraints.
    rtcOfferConstraints
  );

  function onSucceeded(response) {
    if (self.status === C.STATUS_TERMINATED) {
      return;
    }

    sendRequest.call(self, JsSIP_C.ACK);

    // If it is a 2XX retransmission exit now.
    if (succeeded) { return; }

    // Handle Session Timers.
    handleSessionTimersInIncomingResponse.call(self, response);

    // Must have SDP answer.
    if(! response.body) {
      onFailed();
      return;
    } else if (response.getHeader('Content-Type') !== 'application/sdp') {
      onFailed();
      return;
    }

    const e = {originator:'remote', type:'answer', sdp:response.body};

    debug('emit "sdp"');
    self.emit('sdp', e);

    const answer = new RTCSessionDescription({type:'answer', sdp:e.sdp});

    self.connection.setRemoteDescription(answer)
      .then(() => {
        if (eventHandlers.succeeded) {
          eventHandlers.succeeded(response);
        }
      })
      .catch(error => {
        onFailed();

        debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

        self.emit('peerconnection:setremotedescriptionfailed', error);
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
function sendUpdate(options) {
  debug('sendUpdate()');

  options = options || {};

  const self = this;
  const extraHeaders = options.extraHeaders || [];
  const eventHandlers = options.eventHandlers || {};
  const rtcOfferConstraints = options.rtcOfferConstraints || this.rtcOfferConstraints || null;
  const sdpOffer = options.sdpOffer || false;
  let succeeded = false;

  extraHeaders.push('Contact: ' + this.contact);

  // Session Timers.
  if (this.sessionTimers.running) {
    extraHeaders.push('Session-Expires: ' + this.sessionTimers.currentExpires + ';refresher=' + (this.sessionTimers.refresher ? 'uac' : 'uas'));
  }

  if (sdpOffer) {
    extraHeaders.push('Content-Type: application/sdp');

    createLocalDescription.call(this, 'offer',
      sdp => {
        sdp = mangleOffer.call(self, sdp);

        const request = new RTCSession_Request(self, JsSIP_C.UPDATE);

        request.send({
          extraHeaders: extraHeaders,
          body: sdp,
          eventHandlers: {
            onSuccessResponse: function(response) {
              onSucceeded(response);
              succeeded = true;
            },
            onErrorResponse: function(response) {
              onFailed(response);
            },
            onTransportError: function() {
              self.onTransportError();  // Do nothing because session ends.
            },
            onRequestTimeout: function() {
              self.onRequestTimeout();  // Do nothing because session ends.
            },
            onDialogError: function() {
              self.onDialogError();  // Do nothing because session ends.
            }
          }
        });
      },
      () => {
        onFailed();
      },
      // RTC constraints.
      rtcOfferConstraints
    );
  }

  // No SDP.
  else {
    const request = new RTCSession_Request(self, JsSIP_C.UPDATE);

    request.send({
      extraHeaders: extraHeaders,
      eventHandlers: {
        onSuccessResponse: function(response) {
          onSucceeded(response);
        },
        onErrorResponse: function(response) {
          onFailed(response);
        },
        onTransportError: function() {
          self.onTransportError();  // Do nothing because session ends.
        },
        onRequestTimeout: function() {
          self.onRequestTimeout();  // Do nothing because session ends.
        },
        onDialogError: function() {
          self.onDialogError();  // Do nothing because session ends.
        }
      }
    });
  }

  function onSucceeded(response) {
    if (self.status === C.STATUS_TERMINATED) {
      return;
    }

    // If it is a 2XX retransmission exit now.
    if (succeeded) { return; }

    // Handle Session Timers.
    handleSessionTimersInIncomingResponse.call(self, response);

    // Must have SDP answer.
    if (sdpOffer) {
      if(! response.body) {
        onFailed();
        return;
      } else if (response.getHeader('Content-Type') !== 'application/sdp') {
        onFailed();
        return;
      }

      const e = {originator:'remote', type:'answer', sdp:response.body};

      debug('emit "sdp"');
      self.emit('sdp', e);

      const answer = new RTCSessionDescription({type:'answer', sdp:e.sdp});

      self.connection.setRemoteDescription(answer)
        .then(() => {
          if (eventHandlers.succeeded) {
            eventHandlers.succeeded(response);
          }
        })
        .catch(error => {
          onFailed();

          debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

          self.emit('peerconnection:setremotedescriptionfailed', error);
        });
    }
    // No SDP answer.
    else {
      if (eventHandlers.succeeded) {
        eventHandlers.succeeded(response);
      }
    }
  }

  function onFailed(response) {
    if (eventHandlers.failed) { eventHandlers.failed(response); }
  }
}

function acceptAndTerminate(response, status_code, reason_phrase) {
  debug('acceptAndTerminate()');

  const extraHeaders = [];

  if (status_code) {
    reason_phrase = reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
    extraHeaders.push('Reason: SIP ;cause=' + status_code + '; text="' + reason_phrase + '"');
  }

  // An error on dialog creation will fire 'failed' event
  if (this.dialog || createDialog.call(this, response, 'UAC')) {
    sendRequest.call(this, JsSIP_C.ACK);
    sendRequest.call(this, JsSIP_C.BYE, {
      extraHeaders: extraHeaders
    });
  }

  // Update session status.
  this.status = C.STATUS_TERMINATED;
}

/**
 * Send a generic in-dialog Request
 */
function sendRequest(method, options) {
  debug('sendRequest()');

  const request = new RTCSession_Request(this, method);
  request.send(options);
}

/**
 * Correctly set the SDP direction attributes if the call is on local hold
 */
function mangleOffer(sdp) {

  if (! this.localHold && ! this.remoteHold) {
    return sdp;
  }

  sdp = sdp_transform.parse(sdp);

  // Local hold.
  if (this.localHold && ! this.remoteHold) {
    debug('mangleOffer() | me on hold, mangling offer');
    for (let m of sdp.media) {
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
  }
  // Local and remote hold.
  else if (this.localHold && this.remoteHold) {
    debug('mangleOffer() | both on hold, mangling offer');
    for (let m of sdp.media) {
      if (holdMediaTypes.indexOf(m.type) === -1) {
        continue;
      }
      m.direction = 'inactive';
    }
  }
  // Remote hold.
  else if (this.remoteHold) {
    debug('mangleOffer() | remote on hold, mangling offer');
    for (let m of sdp.media) {
      if (holdMediaTypes.indexOf(m.type) === -1) {
        continue;
      }
      if (!m.direction) {
        m.direction = 'recvonly';
      } else if (m.direction === 'sendrecv') {
        m.direction = 'recvonly';
      } else if (m.direction === 'recvonly') {
        m.direction = 'inactive';
      }
    }
  }

  return sdp_transform.write(sdp);
}

function setLocalMediaStatus() {
  let enableAudio = true, enableVideo = true;

  if (this.localHold || this.remoteHold) {
    enableAudio = false;
    enableVideo = false;
  }

  if (this.audioMuted) {
    enableAudio = false;
  }

  if (this.videoMuted) {
    enableVideo = false;
  }

  toogleMuteAudio.call(this, !enableAudio);
  toogleMuteVideo.call(this, !enableVideo);
}

/**
 * Handle SessionTimers for an incoming INVITE or UPDATE.
 * @param  {IncomingRequest} request
 * @param  {Array} responseExtraHeaders  Extra headers for the 200 response.
 */
function handleSessionTimersInIncomingRequest(request, responseExtraHeaders) {
  if (! this.sessionTimers.enabled) { return; }

  let session_expires_refresher;

  if (request.session_expires && request.session_expires >= JsSIP_C.MIN_SESSION_EXPIRES) {
    this.sessionTimers.currentExpires = request.session_expires;
    session_expires_refresher = request.session_expires_refresher || 'uas';
  }
  else {
    this.sessionTimers.currentExpires = this.sessionTimers.defaultExpires;
    session_expires_refresher = 'uas';
  }

  responseExtraHeaders.push('Session-Expires: ' + this.sessionTimers.currentExpires + ';refresher=' + session_expires_refresher);

  this.sessionTimers.refresher = (session_expires_refresher === 'uas');
  runSessionTimer.call(this);
}

/**
 * Handle SessionTimers for an incoming response to INVITE or UPDATE.
 * @param  {IncomingResponse} response
 */
function handleSessionTimersInIncomingResponse(response) {
  if (! this.sessionTimers.enabled) { return; }

  let session_expires_refresher;

  if (response.session_expires && response.session_expires >= JsSIP_C.MIN_SESSION_EXPIRES) {
    this.sessionTimers.currentExpires = response.session_expires;
    session_expires_refresher = response.session_expires_refresher || 'uac';
  }
  else {
    this.sessionTimers.currentExpires = this.sessionTimers.defaultExpires;
    session_expires_refresher = 'uac';
  }

  this.sessionTimers.refresher = (session_expires_refresher === 'uac');
  runSessionTimer.call(this);
}

function runSessionTimer() {
  const self = this;
  const expires = this.sessionTimers.currentExpires;

  this.sessionTimers.running = true;

  clearTimeout(this.sessionTimers.timer);

  // I'm the refresher.
  if (this.sessionTimers.refresher) {
    this.sessionTimers.timer = setTimeout(() => {
      if (self.status === C.STATUS_TERMINATED) { return; }

      debug('runSessionTimer() | sending session refresh request');

      sendUpdate.call(self, {
        eventHandlers: {
          succeeded: function(response) {
            handleSessionTimersInIncomingResponse.call(self, response);
          }
        }
      });
    }, expires * 500);  // Half the given interval (as the RFC states).
  }

  // I'm not the refresher.
  else {
    this.sessionTimers.timer = setTimeout(() => {
      if (self.status === C.STATUS_TERMINATED) { return; }

      debugerror('runSessionTimer() | timer expired, terminating the session');

      self.terminate({
        cause: JsSIP_C.causes.REQUEST_TIMEOUT,
        status_code: 408,
        reason_phrase: 'Session Timer Expired'
      });
    }, expires * 1100);
  }
}

function toogleMuteAudio(mute) {
  const streams = this.connection.getLocalStreams();

  for (let stream of streams) {
    let tracks = stream.getAudioTracks();
    for (let track of tracks) {
      track.enabled = !mute;
    }
  }
}

function toogleMuteVideo(mute) {
  const streams = this.connection.getLocalStreams();

  for (let stream of streams) {
    let tracks = stream.getVideoTracks();
    for (let track of tracks) {
      track.enabled = !mute;
    }
  }
}

function newRTCSession(originator, request) {
  debug('newRTCSession()');

  this.ua.newRTCSession({
    originator: originator,
    session: this,
    request: request
  });
}

function connecting(request) {
  debug('session connecting');

  debug('emit "connecting"');

  this.emit('connecting', {
    request: request
  });
}

function progress(originator, response) {
  debug('session progress');

  debug('emit "progress"');

  this.emit('progress', {
    originator: originator,
    response: response || null
  });
}

function accepted(originator, message) {
  debug('session accepted');

  this.start_time = new Date();

  debug('emit "accepted"');

  this.emit('accepted', {
    originator: originator,
    response: message || null
  });
}

function confirmed(originator, ack) {
  debug('session confirmed');

  this.is_confirmed = true;

  debug('emit "confirmed"');

  this.emit('confirmed', {
    originator: originator,
    ack: ack || null
  });
}

function ended(originator, message, cause) {
  debug('session ended');

  this.end_time = new Date();

  this.close();

  debug('emit "ended"');

  this.emit('ended', {
    originator: originator,
    message: message || null,
    cause: cause
  });
}

function failed(originator, message, cause) {
  debug('session failed');

  this.close();

  debug('emit "failed"');

  this.emit('failed', {
    originator: originator,
    message: message || null,
    cause: cause
  });
}

function onhold(originator) {
  debug('session onhold');

  setLocalMediaStatus.call(this);

  debug('emit "hold"');

  this.emit('hold', {
    originator: originator
  });
}

function onunhold(originator) {
  debug('session onunhold');

  setLocalMediaStatus.call(this);

  debug('emit "unhold"');

  this.emit('unhold', {
    originator: originator
  });
}

function onmute(options) {
  debug('session onmute');

  setLocalMediaStatus.call(this);

  debug('emit "muted"');

  this.emit('muted', {
    audio: options.audio,
    video: options.video
  });
}

function onunmute(options) {
  debug('session onunmute');

  setLocalMediaStatus.call(this);

  debug('emit "unmuted"');

  this.emit('unmuted', {
    audio: options.audio,
    video: options.video
  });
}

/**
 * Expose C object.
 */
RTCSession.C = C;

module.exports = RTCSession;

