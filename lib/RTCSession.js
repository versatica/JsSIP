/* globals RTCPeerConnection: false, RTCSessionDescription: false */

const EventEmitter = require('events').EventEmitter;
const sdp_transform = require('sdp-transform');
const JsSIP_C = require('./Constants');
const Exceptions = require('./Exceptions');
const Transactions = require('./Transactions');
const Utils = require('./Utils');
const Timers = require('./Timers');
const SIPMessage = require('./SIPMessage');
const Dialog = require('./Dialog');
const RequestSender = require('./RequestSender');
const RTCSession_DTMF = require('./RTCSession/DTMF');
const RTCSession_Info = require('./RTCSession/Info');
const RTCSession_ReferNotifier = require('./RTCSession/ReferNotifier');
const RTCSession_ReferSubscriber = require('./RTCSession/ReferSubscriber');
const debug = require('debug')('JsSIP:RTCSession');
const debugerror = require('debug')('JsSIP:ERROR:RTCSession');

debugerror.log = console.warn.bind(console);

const C = {
  // RTCSession states.
  STATUS_NULL               : 0,
  STATUS_INVITE_SENT        : 1,
  STATUS_1XX_RECEIVED       : 2,
  STATUS_INVITE_RECEIVED    : 3,
  STATUS_WAITING_FOR_ANSWER : 4,
  STATUS_ANSWERED           : 5,
  STATUS_WAITING_FOR_ACK    : 6,
  STATUS_CANCELED           : 7,
  STATUS_TERMINATED         : 8,
  STATUS_CONFIRMED          : 9
};

/**
 * Local variables.
 */
const holdMediaTypes = [ 'audio', 'video' ];

module.exports = class RTCSession extends EventEmitter
{
  /**
   * Expose C object.
   */
  static get C()
  {
    return C;
  }

  constructor(ua)
  {
    debug('new');

    super();

    this._id = null;
    this._ua = ua;
    this._status = C.STATUS_NULL;
    this._dialog = null;
    this._earlyDialogs = {};
    this._contact = null;
    this._from_tag = null;

    // The RTCPeerConnection instance (public attribute).
    this._connection = null;

    // Prevent races on serial PeerConnction operations.
    this._connectionPromiseQueue = Promise.resolve();

    // Incoming/Outgoing request being currently processed.
    this._request = null;

    // Cancel state for initial outgoing request.
    this._is_canceled = false;
    this._cancel_reason = '';

    // RTCSession confirmation flag.
    this._is_confirmed = false;

    // Is late SDP being negotiated.
    this._late_sdp = false;

    // Default rtcOfferConstraints and rtcAnswerConstrainsts (passed in connect() or answer()).
    this._rtcOfferConstraints = null;
    this._rtcAnswerConstraints = null;

    // Local MediaStream.
    this._localMediaStream = null;
    this._localMediaStreamLocallyGenerated = false;

    // Flag to indicate PeerConnection ready for new actions.
    this._rtcReady = true;

    // SIP Timers.
    this._timers = {
      ackTimer          : null,
      expiresTimer      : null,
      invite2xxTimer    : null,
      userNoAnswerTimer : null
    };

    // Session info.
    this._direction = null;
    this._local_identity = null;
    this._remote_identity = null;
    this._start_time = null;
    this._end_time = null;
    this._tones = null;

    // Mute/Hold state.
    this._audioMuted = false;
    this._videoMuted = false;
    this._localHold = false;
    this._remoteHold = false;

    // Session Timers (RFC 4028).
    this._sessionTimers = {
      enabled        : this._ua.configuration.session_timers,
      defaultExpires : JsSIP_C.SESSION_EXPIRES,
      currentExpires : null,
      running        : false,
      refresher      : false,
      timer          : null // A setTimeout.
    };

    // Map of ReferSubscriber instances indexed by the REFER's CSeq number.
    this._referSubscribers = {};

    // Custom session empty object for high level use.
    this._data = {};
  }

  /**
   * User API
   */

  // Expose RTCSession constants as a property of the RTCSession instance.
  get C()
  {
    return C;
  }

  // Expose session failed/ended causes as a property of the RTCSession instance.
  get causes()
  {
    return JsSIP_C.causes;
  }

  get id()
  {
    return this._id;
  }

  get connection()
  {
    return this._connection;
  }

  get direcion()
  {
    return this._direcion;
  }

  get local_identity()
  {
    return this._local_identity;
  }

  get remote_identity()
  {
    return this._remote_identity;
  }

  get start_time()
  {
    return this._start_time;
  }

  get end_time()
  {
    return this._end_time;
  }

  get data()
  {
    return this._data;
  }

  set data(_data)
  {
    this._data = _data;
  }

  get status()
  {
    return this._status;
  }

  isInProgress()
  {
    switch (this._status)
    {
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

  isEstablished()
  {
    switch (this._status)
    {
      case C.STATUS_ANSWERED:
      case C.STATUS_WAITING_FOR_ACK:
      case C.STATUS_CONFIRMED:
        return true;
      default:
        return false;
    }
  }

  isEnded()
  {
    switch (this._status)
    {
      case C.STATUS_CANCELED:
      case C.STATUS_TERMINATED:
        return true;
      default:
        return false;
    }
  }

  isMuted()
  {
    return {
      audio : this._audioMuted,
      video : this._videoMuted
    };
  }

  isOnHold()
  {
    return {
      local  : this._localHold,
      remote : this._remoteHold
    };
  }

  connect(target, options = {}, initCallback)
  {
    debug('connect()');

    const originalTarget = target;
    const eventHandlers = options.eventHandlers || {};
    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const mediaConstraints = options.mediaConstraints || { audio: true, video: true };
    const mediaStream = options.mediaStream || null;
    const pcConfig = options.pcConfig || { iceServers: [] };
    const rtcConstraints = options.rtcConstraints || null;
    const rtcOfferConstraints = options.rtcOfferConstraints || null;

    this._rtcOfferConstraints = rtcOfferConstraints;
    this._rtcAnswerConstraints = options.rtcAnswerConstraints || null;

    this._data = options.data || this._data;

    // Check target.
    if (target === undefined)
    {
      throw new TypeError('Not enough arguments');
    }

    // Check Session Status.
    if (this._status !== C.STATUS_NULL)
    {
      throw new Exceptions.InvalidStateError(this._status);
    }

    // Check WebRTC support.
    if (!window.RTCPeerConnection)
    {
      throw new Exceptions.NotSupportedError('WebRTC not supported');
    }

    // Check target validity.
    target = this._ua.normalizeTarget(target);
    if (!target)
    {
      throw new TypeError(`Invalid target: ${originalTarget}`);
    }

    // Session Timers.
    if (this._sessionTimers.enabled)
    {
      if (Utils.isDecimal(options.sessionTimersExpires))
      {
        if (options.sessionTimersExpires >= JsSIP_C.MIN_SESSION_EXPIRES)
        {
          this._sessionTimers.defaultExpires = options.sessionTimersExpires;
        }
        else
        {
          this._sessionTimers.defaultExpires = JsSIP_C.SESSION_EXPIRES;
        }
      }
    }

    // Set event handlers.
    for (const event in eventHandlers)
    {
      if (Object.prototype.hasOwnProperty.call(eventHandlers, event))
      {
        this.on(event, eventHandlers[event]);
      }
    }

    // Session parameter initialization.
    this._from_tag = Utils.newTag();

    // Set anonymous property.
    const anonymous = options.anonymous || false;

    const requestParams = { from_tag: this._from_tag };

    this._contact = this._ua.contact.toString({
      anonymous,
      outbound : true
    });

    if (anonymous)
    {
      requestParams.from_display_name = 'Anonymous';
      requestParams.from_uri = 'sip:anonymous@anonymous.invalid';

      extraHeaders.push(`P-Preferred-Identity: ${this._ua.configuration.uri.toString()}`);
      extraHeaders.push('Privacy: id');
    }

    extraHeaders.push(`Contact: ${this._contact}`);
    extraHeaders.push('Content-Type: application/sdp');
    if (this._sessionTimers.enabled)
    {
      extraHeaders.push(`Session-Expires: ${this._sessionTimers.defaultExpires}`);
    }

    this._request = new SIPMessage.InitialOutgoingInviteRequest(
      target, this._ua, requestParams, extraHeaders);

    this._id = this._request.call_id + this._from_tag;

    // Create a new RTCPeerConnection instance.
    this._createRTCConnection(pcConfig, rtcConstraints);

    // Set internal properties.
    this._direction = 'outgoing';
    this._local_identity = this._request.from;
    this._remote_identity = this._request.to;

    // User explicitly provided a newRTCSession callback for this session.
    if (initCallback)
    {
      initCallback(this);
    }

    this._newRTCSession('local', this._request);

    this._sendInitialRequest(mediaConstraints, rtcOfferConstraints, mediaStream);
  }

  init_incoming(request, initCallback)
  {
    debug('init_incoming()');

    let expires;
    const contentType = request.getHeader('Content-Type');

    // Check body and content type.
    if (request.body && (contentType !== 'application/sdp'))
    {
      request.reply(415);

      return;
    }

    // Session parameter initialization.
    this._status = C.STATUS_INVITE_RECEIVED;
    this._from_tag = request.from_tag;
    this._id = request.call_id + this._from_tag;
    this._request = request;
    this._contact = this._ua.contact.toString();

    // Get the Expires header value if exists.
    if (request.hasHeader('expires'))
    {
      expires = request.getHeader('expires') * 1000;
    }

    /* Set the to_tag before
     * replying a response code that will create a dialog.
     */
    request.to_tag = Utils.newTag();

    // An error on dialog creation will fire 'failed' event.
    if (! this._createDialog(request, 'UAS', true))
    {
      request.reply(500, 'Missing Contact header field');

      return;
    }

    if (request.body)
    {
      this._late_sdp = false;
    }
    else
    {
      this._late_sdp = true;
    }

    this._status = C.STATUS_WAITING_FOR_ANSWER;

    // Set userNoAnswerTimer.
    this._timers.userNoAnswerTimer = setTimeout(() =>
    {
      request.reply(408);
      this._failed('local', null, JsSIP_C.causes.NO_ANSWER);
    }, this._ua.configuration.no_answer_timeout
    );

    /* Set expiresTimer
     * RFC3261 13.3.1
     */
    if (expires)
    {
      this._timers.expiresTimer = setTimeout(() =>
      {
        if (this._status === C.STATUS_WAITING_FOR_ANSWER)
        {
          request.reply(487);
          this._failed('system', null, JsSIP_C.causes.EXPIRES);
        }
      }, expires
      );
    }

    // Set internal properties.
    this._direction = 'incoming';
    this._local_identity = request.to;
    this._remote_identity = request.from;

    // A init callback was specifically defined.
    if (initCallback)
    {
      initCallback(this);
    }

    // Fire 'newRTCSession' event.
    this._newRTCSession('remote', request);

    // The user may have rejected the call in the 'newRTCSession' event.
    if (this._status === C.STATUS_TERMINATED)
    {
      return;
    }

    // Reply 180.
    request.reply(180, null, [ `Contact: ${this._contact}` ]);

    // Fire 'progress' event.
    // TODO: Document that 'response' field in 'progress' event is null for incoming calls.
    this._progress('local', null);
  }

  /**
   * Answer the call.
   */
  answer(options = {})
  {
    debug('answer()');

    const request = this._request;
    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const mediaConstraints = options.mediaConstraints || {};
    const mediaStream = options.mediaStream || null;
    const pcConfig = options.pcConfig || { iceServers: [] };
    const rtcConstraints = options.rtcConstraints || null;
    const rtcAnswerConstraints = options.rtcAnswerConstraints || null;

    let tracks;
    let peerHasAudioLine = false;
    let peerHasVideoLine = false;
    let peerOffersFullAudio = false;
    let peerOffersFullVideo = false;

    this._rtcAnswerConstraints = rtcAnswerConstraints;
    this._rtcOfferConstraints = options.rtcOfferConstraints || null;

    this._data = options.data || this._data;

    // Check Session Direction and Status.
    if (this._direction !== 'incoming')
    {
      throw new Exceptions.NotSupportedError('"answer" not supported for outgoing RTCSession');
    }

    // Check Session status.
    if (this._status !== C.STATUS_WAITING_FOR_ANSWER)
    {
      throw new Exceptions.InvalidStateError(this._status);
    }

    // Session Timers.
    if (this._sessionTimers.enabled)
    {
      if (Utils.isDecimal(options.sessionTimersExpires))
      {
        if (options.sessionTimersExpires >= JsSIP_C.MIN_SESSION_EXPIRES)
        {
          this._sessionTimers.defaultExpires = options.sessionTimersExpires;
        }
        else
        {
          this._sessionTimers.defaultExpires = JsSIP_C.SESSION_EXPIRES;
        }
      }
    }

    this._status = C.STATUS_ANSWERED;

    // An error on dialog creation will fire 'failed' event.
    if (! this._createDialog(request, 'UAS'))
    {
      request.reply(500, 'Error creating dialog');

      return;
    }

    clearTimeout(this._timers.userNoAnswerTimer);

    extraHeaders.unshift(`Contact: ${this._contact}`);

    // Determine incoming media from incoming SDP offer (if any).
    const sdp = request.parseSDP();

    // Make sure sdp.media is an array, not the case if there is only one media.
    if (! Array.isArray(sdp.media))
    {
      sdp.media = [ sdp.media ];
    }

    // Go through all medias in SDP to find offered capabilities to answer with.
    for (const m of sdp.media)
    {
      if (m.type === 'audio')
      {
        peerHasAudioLine = true;
        if (!m.direction || m.direction === 'sendrecv')
        {
          peerOffersFullAudio = true;
        }
      }
      if (m.type === 'video')
      {
        peerHasVideoLine = true;
        if (!m.direction || m.direction === 'sendrecv')
        {
          peerOffersFullVideo = true;
        }
      }
    }

    // Remove audio from mediaStream if suggested by mediaConstraints.
    if (mediaStream && mediaConstraints.audio === false)
    {
      tracks = mediaStream.getAudioTracks();
      for (const track of tracks)
      {
        mediaStream.removeTrack(track);
      }
    }

    // Remove video from mediaStream if suggested by mediaConstraints.
    if (mediaStream && mediaConstraints.video === false)
    {
      tracks = mediaStream.getVideoTracks();
      for (const track of tracks)
      {
        mediaStream.removeTrack(track);
      }
    }

    // Set audio constraints based on incoming stream if not supplied.
    if (!mediaStream && mediaConstraints.audio === undefined)
    {
      mediaConstraints.audio = peerOffersFullAudio;
    }

    // Set video constraints based on incoming stream if not supplied.
    if (!mediaStream && mediaConstraints.video === undefined)
    {
      mediaConstraints.video = peerOffersFullVideo;
    }

    // Don't ask for audio if the incoming offer has no audio section.
    if (!mediaStream && !peerHasAudioLine)
    {
      mediaConstraints.audio = false;
    }

    // Don't ask for video if the incoming offer has no video section.
    if (!mediaStream && !peerHasVideoLine)
    {
      mediaConstraints.video = false;
    }

    // Create a new RTCPeerConnection instance.
    // TODO: This may throw an error, should react.
    this._createRTCConnection(pcConfig, rtcConstraints);

    // If a local MediaStream is given use it.
    if (mediaStream)
    {
      userMediaSucceeded(mediaStream);
    }
    // If at least audio or video is requested prompt getUserMedia.
    else if (mediaConstraints.audio || mediaConstraints.video)
    {
      this._localMediaStreamLocallyGenerated = true;
      navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(userMediaSucceeded.bind(this))
        .catch((error) =>
        {
          userMediaFailed.call(this, error);

          debugerror('emit "getusermediafailed" [error:%o]', error);

          this.emit('getusermediafailed', error);
        });
    // Otherwise don't prompt getUserMedia.
    }
    else
    {
      userMediaSucceeded.call(this, null);
    }

    // User media succeeded.
    function userMediaSucceeded(stream)
    {
      if (this._status === C.STATUS_TERMINATED) { return; }

      this._localMediaStream = stream;
      if (stream)
      {
        this._connection.addStream(stream);
      }

      if (! this._late_sdp)
      {
        const e = { originator: 'remote', type: 'offer', sdp: request.body };

        debug('emit "sdp"');
        this.emit('sdp', e);

        const offer = new RTCSessionDescription({ type: 'offer', sdp: e.sdp });

        this._connectionPromiseQueue = this._connectionPromiseQueue
          .then(() => this._connection.setRemoteDescription(offer))
          .then(remoteDescriptionSucceededOrNotNeeded.bind(this))
          .catch((error) =>
          {
            request.reply(488);
            this._failed('system', null, JsSIP_C.causes.WEBRTC_ERROR);

            debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

            this.emit('peerconnection:setremotedescriptionfailed', error);
          });
      }
      else
      {
        remoteDescriptionSucceededOrNotNeeded.call(this);
      }
    }

    // User media failed.
    function userMediaFailed()
    {
      if (this._status === C.STATUS_TERMINATED) { return; }

      request.reply(480);
      this._failed('local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
    }

    function remoteDescriptionSucceededOrNotNeeded()
    {
      this._connecting(request);
      if (! this._late_sdp)
      {
        this._createLocalDescription('answer', rtcSucceeded.bind(this), rtcFailed.bind(this), rtcAnswerConstraints);
      }
      else
      {
        this._createLocalDescription('offer', rtcSucceeded.bind(this), rtcFailed.bind(this), this._rtcOfferConstraints);
      }
    }

    function rtcSucceeded(desc)
    {
      if (this._status === C.STATUS_TERMINATED) { return; }

      // Run for reply success callback.
      function replySucceeded()
      {
        this._status = C.STATUS_WAITING_FOR_ACK;

        this._setInvite2xxTimer(request, desc);
        this._setACKTimer();
        this._accepted('local');
      }

      // Run for reply failure callback.
      function replyFailed()
      {
        this._failed('system', null, JsSIP_C.causes.CONNECTION_ERROR);
      }

      this._handleSessionTimersInIncomingRequest(request, extraHeaders);

      request.reply(200, null, extraHeaders,
        desc,
        replySucceeded.bind(this),
        replyFailed.bind(this)
      );
    }

    function rtcFailed()
    {
      if (this._status === C.STATUS_TERMINATED) { return; }

      request.reply(500);
      this._failed('system', null, JsSIP_C.causes.WEBRTC_ERROR);
    }
  }

  /**
   * Terminate the call.
   */
  terminate(options = {})
  {
    debug('terminate()');

    const cause = options.cause || JsSIP_C.causes.BYE;
    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const body = options.body;

    let cancel_reason;
    let status_code = options.status_code;
    let reason_phrase = options.reason_phrase;

    // Check Session Status.
    if (this._status === C.STATUS_TERMINATED)
    {
      throw new Exceptions.InvalidStateError(this._status);
    }

    switch (this._status)
    {
      // - UAC -
      case C.STATUS_NULL:
      case C.STATUS_INVITE_SENT:
      case C.STATUS_1XX_RECEIVED:
        debug('canceling session');

        if (status_code && (status_code < 200 || status_code >= 700))
        {
          throw new TypeError(`Invalid status_code: ${status_code}`);
        }
        else if (status_code)
        {
          reason_phrase = reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
          cancel_reason = `SIP ;cause=${status_code} ;text="${reason_phrase}"`;
        }

        // Check Session Status.
        if (this._status === C.STATUS_NULL || this._status === C.STATUS_INVITE_SENT)
        {
          this._is_canceled = true;
          this._cancel_reason = cancel_reason;
        }
        else if (this._status === C.STATUS_1XX_RECEIVED)
        {
          this._request.cancel(cancel_reason);
        }

        this._status = C.STATUS_CANCELED;

        this._failed('local', null, JsSIP_C.causes.CANCELED);
        break;

        // - UAS -
      case C.STATUS_WAITING_FOR_ANSWER:
      case C.STATUS_ANSWERED:
        debug('rejecting session');

        status_code = status_code || 480;

        if (status_code < 300 || status_code >= 700)
        {
          throw new TypeError(`Invalid status_code: ${status_code}`);
        }

        this._request.reply(status_code, reason_phrase, extraHeaders, body);
        this._failed('local', null, JsSIP_C.causes.REJECTED);
        break;

      case C.STATUS_WAITING_FOR_ACK:
      case C.STATUS_CONFIRMED:
        debug('terminating session');

        reason_phrase = options.reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';

        if (status_code && (status_code < 200 || status_code >= 700))
        {
          throw new TypeError(`Invalid status_code: ${status_code}`);
        }
        else if (status_code)
        {
          extraHeaders.push(`Reason: SIP ;cause=${status_code}; text="${reason_phrase}"`);
        }

        /* RFC 3261 section 15 (Terminating a session):
          *
          * "...the callee's UA MUST NOT send a BYE on a confirmed dialog
          * until it has received an ACK for its 2xx response or until the server
          * transaction times out."
          */
        if (this._status === C.STATUS_WAITING_FOR_ACK &&
            this._direction === 'incoming' &&
            this._request.server_transaction.state !== Transactions.C.STATUS_TERMINATED)
        {

          // Save the dialog for later restoration.
          const dialog = this._dialog;

          // Send the BYE as soon as the ACK is received...
          this.receiveRequest = ({ method }) =>
          {
            if (method === JsSIP_C.ACK)
            {
              this.sendRequest(JsSIP_C.BYE, {
                extraHeaders,
                body
              });
              dialog.terminate();
            }
          };

          // .., or when the INVITE transaction times out
          this._request.server_transaction.on('stateChanged', () =>
          {
            if (this._request.server_transaction.state ===
                Transactions.C.STATUS_TERMINATED)
            {
              this.sendRequest(JsSIP_C.BYE, {
                extraHeaders,
                body
              });
              dialog.terminate();
            }
          });

          this._ended('local', null, cause);

          // Restore the dialog into 'this' in order to be able to send the in-dialog BYE :-).
          this._dialog = dialog;

          // Restore the dialog into 'ua' so the ACK can reach 'this' session.
          this._ua.newDialog(dialog);
        }
        else
        {
          this.sendRequest(JsSIP_C.BYE, {
            extraHeaders,
            body
          });

          this._ended('local', null, cause);
        }
    }
  }

  sendDTMF(tones, options = {})
  {
    debug('sendDTMF() | tones: %s', tones);

    let position = 0;
    let duration = options.duration || null;
    let interToneGap = options.interToneGap || null;

    if (tones === undefined)
    {
      throw new TypeError('Not enough arguments');
    }

    // Check Session Status.
    if (this._status !== C.STATUS_CONFIRMED && this._status !== C.STATUS_WAITING_FOR_ACK)
    {
      throw new Exceptions.InvalidStateError(this._status);
    }

    // Convert to string.
    if (typeof tones === 'number')
    {
      tones = tones.toString();
    }

    // Check tones.
    if (!tones || typeof tones !== 'string' || !tones.match(/^[0-9A-DR#*,]+$/i))
    {
      throw new TypeError(`Invalid tones: ${tones}`);
    }

    // Check duration.
    if (duration && !Utils.isDecimal(duration))
    {
      throw new TypeError(`Invalid tone duration: ${duration}`);
    }
    else if (!duration)
    {
      duration = RTCSession_DTMF.C.DEFAULT_DURATION;
    }
    else if (duration < RTCSession_DTMF.C.MIN_DURATION)
    {
      debug(`"duration" value is lower than the minimum allowed, setting it to ${RTCSession_DTMF.C.MIN_DURATION} milliseconds`);
      duration = RTCSession_DTMF.C.MIN_DURATION;
    }
    else if (duration > RTCSession_DTMF.C.MAX_DURATION)
    {
      debug(`"duration" value is greater than the maximum allowed, setting it to ${RTCSession_DTMF.C.MAX_DURATION} milliseconds`);
      duration = RTCSession_DTMF.C.MAX_DURATION;
    }
    else
    {
      duration = Math.abs(duration);
    }
    options.duration = duration;

    // Check interToneGap.
    if (interToneGap && !Utils.isDecimal(interToneGap))
    {
      throw new TypeError(`Invalid interToneGap: ${interToneGap}`);
    }
    else if (!interToneGap)
    {
      interToneGap = RTCSession_DTMF.C.DEFAULT_INTER_TONE_GAP;
    }
    else if (interToneGap < RTCSession_DTMF.C.MIN_INTER_TONE_GAP)
    {
      debug(`"interToneGap" value is lower than the minimum allowed, setting it to ${RTCSession_DTMF.C.MIN_INTER_TONE_GAP} milliseconds`);
      interToneGap = RTCSession_DTMF.C.MIN_INTER_TONE_GAP;
    }
    else
    {
      interToneGap = Math.abs(interToneGap);
    }

    if (this._tones)
    {
      // Tones are already queued, just add to the queue.
      this._tones += tones;

      return;
    }

    this._tones = tones;

    // Send the first tone.
    _sendDTMF.call(this);

    function _sendDTMF()
    {
      let timeout;

      if (this._status === C.STATUS_TERMINATED ||
          !this._tones || position >= this._tones.length)
      {
        // Stop sending DTMF.
        this._tones = null;

        return;
      }

      const tone = this._tones[position];

      position += 1;

      if (tone === ',')
      {
        timeout = 2000;
      }
      else
      {
        const dtmf = new RTCSession_DTMF(this);

        options.eventHandlers = {
          onFailed : () => { this._tones = null; }
        };
        dtmf.send(tone, options);
        timeout = duration + interToneGap;
      }

      // Set timeout for the next tone.
      setTimeout(_sendDTMF.bind(this), timeout);
    }
  }

  sendInfo(contentType, body, options = {})
  {
    debug('sendInfo()');

    // Check Session Status.
    if (this._status !== C.STATUS_CONFIRMED && this._status !== C.STATUS_WAITING_FOR_ACK)
    {
      throw new Exceptions.InvalidStateError(this._status);
    }

    const info = new RTCSession_Info(this);

    info.send(contentType, body, options);
  }

  /**
   * Mute
   */
  mute(options = { audio: true, video: false })
  {
    debug('mute()');

    let audioMuted = false, videoMuted = false;

    if (this._audioMuted === false && options.audio)
    {
      audioMuted = true;
      this._audioMuted = true;
      this._toogleMuteAudio(true);
    }

    if (this._videoMuted === false && options.video)
    {
      videoMuted = true;
      this._videoMuted = true;
      this._toogleMuteVideo(true);
    }

    if (audioMuted === true || videoMuted === true)
    {
      this._onmute({
        audio : audioMuted,
        video : videoMuted
      });
    }
  }

  /**
   * Unmute
   */
  unmute(options = { audio: true, video: true })
  {
    debug('unmute()');

    let audioUnMuted = false, videoUnMuted = false;

    if (this._audioMuted === true && options.audio)
    {
      audioUnMuted = true;
      this._audioMuted = false;

      if (this._localHold === false)
      {
        this._toogleMuteAudio(false);
      }
    }

    if (this._videoMuted === true && options.video)
    {
      videoUnMuted = true;
      this._videoMuted = false;

      if (this._localHold === false)
      {
        this._toogleMuteVideo(false);
      }
    }

    if (audioUnMuted === true || videoUnMuted === true)
    {
      this._onunmute({
        audio : audioUnMuted,
        video : videoUnMuted
      });
    }
  }

  /**
   * Hold
   */
  hold(options = {}, done)
  {
    debug('hold()');

    if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED)
    {
      return false;
    }

    if (this._localHold === true)
    {
      return false;
    }

    if (! this._isReadyToReOffer())
    {
      return false;
    }

    this._localHold = true;
    this._onhold('local');

    const eventHandlers = {
      succeeded : () =>
      {
        if (done) { done(); }
      },
      failed : () =>
      {
        this.terminate({
          cause         : JsSIP_C.causes.WEBRTC_ERROR,
          status_code   : 500,
          reason_phrase : 'Hold Failed'
        });
      }
    };

    if (options.useUpdate)
    {
      this._sendUpdate({
        sdpOffer     : true,
        eventHandlers,
        extraHeaders : options.extraHeaders
      });
    }
    else
    {
      this._sendReinvite({
        eventHandlers,
        extraHeaders : options.extraHeaders
      });
    }

    return true;
  }

  unhold(options = {}, done)
  {
    debug('unhold()');

    if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED)
    {
      return false;
    }

    if (this._localHold === false)
    {
      return false;
    }

    if (! this._isReadyToReOffer())
    {
      return false;
    }

    this._localHold = false;
    this._onunhold('local');

    const eventHandlers = {
      succeeded : () =>
      {
        if (done) { done(); }
      },
      failed : () =>
      {
        this.terminate({
          cause         : JsSIP_C.causes.WEBRTC_ERROR,
          status_code   : 500,
          reason_phrase : 'Unhold Failed'
        });
      }
    };

    if (options.useUpdate)
    {
      this._sendUpdate({
        sdpOffer     : true,
        eventHandlers,
        extraHeaders : options.extraHeaders
      });
    }
    else
    {
      this._sendReinvite({
        eventHandlers,
        extraHeaders : options.extraHeaders
      });
    }

    return true;
  }

  renegotiate(options = {}, done)
  {
    debug('renegotiate()');

    const rtcOfferConstraints = options.rtcOfferConstraints || null;

    if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED)
    {
      return false;
    }

    if (! this._isReadyToReOffer())
    {
      return false;
    }

    const eventHandlers = {
      succeeded : () =>
      {
        if (done) { done(); }
      },
      failed : () =>
      {
        this.terminate({
          cause         : JsSIP_C.causes.WEBRTC_ERROR,
          status_code   : 500,
          reason_phrase : 'Media Renegotiation Failed'
        });
      }
    };

    this._setLocalMediaStatus();

    if (options.useUpdate)
    {
      this._sendUpdate({
        sdpOffer     : true,
        eventHandlers,
        rtcOfferConstraints,
        extraHeaders : options.extraHeaders
      });
    }
    else
    {
      this._sendReinvite({
        eventHandlers,
        rtcOfferConstraints,
        extraHeaders : options.extraHeaders
      });
    }

    return true;
  }

  /**
   * Refer
   */
  refer(target, options)
  {
    debug('refer()');

    const originalTarget = target;

    if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED)
    {
      return false;
    }

    // Check target validity.
    target = this._ua.normalizeTarget(target);
    if (!target)
    {
      throw new TypeError(`Invalid target: ${originalTarget}`);
    }

    const referSubscriber = new RTCSession_ReferSubscriber(this);

    referSubscriber.sendRefer(target, options);

    // Store in the map.
    const id = referSubscriber.id;

    this._referSubscribers[id] = referSubscriber;

    // Listen for ending events so we can remove it from the map.
    referSubscriber.on('requestFailed', () =>
    {
      delete this._referSubscribers[id];
    });
    referSubscriber.on('accepted', () =>
    {
      delete this._referSubscribers[id];
    });
    referSubscriber.on('failed', () =>
    {
      delete this._referSubscribers[id];
    });

    return referSubscriber;
  }

  /**
   * Send a generic in-dialog Request
   */
  sendRequest(method, options)
  {
    debug('sendRequest()');

    return this._dialog.sendRequest(method, options);
  }

  /**
   * In dialog Request Reception
   */
  receiveRequest(request)
  {
    debug('receiveRequest()');

    if (request.method === JsSIP_C.CANCEL)
    {
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
      if (this._status === C.STATUS_WAITING_FOR_ANSWER ||
          this._status === C.STATUS_ANSWERED)
      {
        this._status = C.STATUS_CANCELED;
        this._request.reply(487);
        this._failed('remote', request, JsSIP_C.causes.CANCELED);
      }
    }
    else
    {
      // Requests arriving here are in-dialog requests.
      switch (request.method)
      {
        case JsSIP_C.ACK:
          if (this._status !== C.STATUS_WAITING_FOR_ACK)
          {
            return;
          }

          // Update signaling status.
          this._status = C.STATUS_CONFIRMED;

          clearTimeout(this._timers.ackTimer);
          clearTimeout(this._timers.invite2xxTimer);

          if (this._late_sdp)
          {
            if (!request.body)
            {
              this.terminate({
                cause       : JsSIP_C.causes.MISSING_SDP,
                status_code : 400
              });
              break;
            }

            const e = { originator: 'remote', type: 'answer', sdp: request.body };
            const answer = new RTCSessionDescription({ type: 'answer', sdp: e.sdp });

            this.emit('sdp', e);

            this._connectionPromiseQueue = this._connectionPromiseQueue
              .then(() => this._connection.setRemoteDescription(answer))
              .then(() =>
              {
                if (!this._is_confirmed)
                {
                  this._confirmed('remote', request);
                }
              })
              .catch((error) =>
              {
                this.terminate({
                  cause       : JsSIP_C.causes.BAD_MEDIA_DESCRIPTION,
                  status_code : 488
                });

                this.emit('peerconnection:setremotedescriptionfailed', error);
              });
          }
          else
          if (!this._is_confirmed)
          {
            this._confirmed('remote', request);
          }

          break;
        case JsSIP_C.BYE:
          if (this._status === C.STATUS_CONFIRMED)
          {
            request.reply(200);
            this._ended('remote', request, JsSIP_C.causes.BYE);
          }
          else if (this._status === C.STATUS_INVITE_RECEIVED)
          {
            request.reply(200);
            this._request.reply(487, 'BYE Received');
            this._ended('remote', request, JsSIP_C.causes.BYE);
          }
          else
          {
            request.reply(403, 'Wrong Status');
          }
          break;
        case JsSIP_C.INVITE:
          if (this._status === C.STATUS_CONFIRMED)
          {
            if (request.hasHeader('replaces'))
            {
              this._receiveReplaces(request);
            }
            else
            {
              this._receiveReinvite(request);
            }
          }
          else
          {
            request.reply(403, 'Wrong Status');
          }
          break;
        case JsSIP_C.INFO:
          if (this._status === C.STATUS_1XX_RECEIVED ||
              this._status === C.STATUS_WAITING_FOR_ANSWER ||
              this._status === C.STATUS_ANSWERED ||
              this._status === C.STATUS_WAITING_FOR_ACK ||
              this._status === C.STATUS_CONFIRMED)
          {
            const contentType = request.getHeader('content-type');

            if (contentType && (contentType.match(/^application\/dtmf-relay/i)))
            {
              new RTCSession_DTMF(this).init_incoming(request);
            }
            else if (contentType !== undefined)
            {
              new RTCSession_Info(this).init_incoming(request);
            }
            else
            {
              request.reply(415);
            }
          }
          else
          {
            request.reply(403, 'Wrong Status');
          }
          break;
        case JsSIP_C.UPDATE:
          if (this._status === C.STATUS_CONFIRMED)
          {
            this._receiveUpdate(request);
          }
          else
          {
            request.reply(403, 'Wrong Status');
          }
          break;
        case JsSIP_C.REFER:
          if (this._status === C.STATUS_CONFIRMED)
          {
            this._receiveRefer(request);
          }
          else
          {
            request.reply(403, 'Wrong Status');
          }
          break;
        case JsSIP_C.NOTIFY:
          if (this._status === C.STATUS_CONFIRMED)
          {
            this._receiveNotify(request);
          }
          else
          {
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

  onTransportError()
  {
    debugerror('onTransportError()');

    if (this._status !== C.STATUS_TERMINATED)
    {
      this.terminate({
        status_code   : 500,
        reason_phrase : JsSIP_C.causes.CONNECTION_ERROR,
        cause         : JsSIP_C.causes.CONNECTION_ERROR
      });
    }
  }

  onRequestTimeout()
  {
    debugerror('onRequestTimeout()');

    if (this._status !== C.STATUS_TERMINATED)
    {
      this.terminate({
        status_code   : 408,
        reason_phrase : JsSIP_C.causes.REQUEST_TIMEOUT,
        cause         : JsSIP_C.causes.REQUEST_TIMEOUT
      });
    }
  }

  onDialogError()
  {
    debugerror('onDialogError()');

    if (this._status !== C.STATUS_TERMINATED)
    {
      this.terminate({
        status_code   : 500,
        reason_phrase : JsSIP_C.causes.DIALOG_ERROR,
        cause         : JsSIP_C.causes.DIALOG_ERROR
      });
    }
  }

  // Called from DTMF handler.
  newDTMF(data)
  {
    debug('newDTMF()');

    this.emit('newDTMF', data);
  }

  // Called from Info handler.
  newInfo(data)
  {
    debug('newInfo()');

    this.emit('newInfo', data);
  }

  /**
   * Check if RTCSession is ready for an outgoing re-INVITE or UPDATE with SDP.
   */
  _isReadyToReOffer()
  {
    if (! this._rtcReady)
    {
      debug('_isReadyToReOffer() | internal WebRTC status not ready');

      return false;
    }

    // No established yet.
    if (! this._dialog)
    {
      debug('_isReadyToReOffer() | session not established yet');

      return false;
    }

    // Another INVITE transaction is in progress.
    if (this._dialog.uac_pending_reply === true ||
        this._dialog.uas_pending_reply === true)
    {
      debug('_isReadyToReOffer() | there is another INVITE/UPDATE transaction in progress');

      return false;
    }

    return true;
  }

  _close()
  {
    debug('close()');

    if (this._status === C.STATUS_TERMINATED)
    {
      return;
    }

    this._status = C.STATUS_TERMINATED;

    // Terminate RTC.
    if (this._connection)
    {
      try
      {
        this._connection.close();
      }
      catch (error)
      {
        debugerror('close() | error closing the RTCPeerConnection: %o', error);
      }
    }

    // Close local MediaStream if it was not given by the user.
    if (this._localMediaStream && this._localMediaStreamLocallyGenerated)
    {
      debug('close() | closing local MediaStream');

      Utils.closeMediaStream(this._localMediaStream);
    }

    // Terminate signaling.

    // Clear SIP timers.
    for (const timer in this._timers)
    {
      if (Object.prototype.hasOwnProperty.call(this._timers, timer))
      {
        clearTimeout(this._timers[timer]);
      }
    }

    // Clear Session Timers.
    clearTimeout(this._sessionTimers.timer);

    // Terminate confirmed dialog.
    if (this._dialog)
    {
      this._dialog.terminate();
      delete this._dialog;
    }

    // Terminate early dialogs.
    for (const dialog in this._earlyDialogs)
    {
      if (Object.prototype.hasOwnProperty.call(this._earlyDialogs, dialog))
      {
        this._earlyDialogs[dialog].terminate();
        delete this._earlyDialogs[dialog];
      }
    }

    // Terminate REFER subscribers.
    for (const subscriber in this._referSubscribers)
    {
      if (Object.prototype.hasOwnProperty.call(this._referSubscribers, subscriber))
      {
        delete this._referSubscribers[subscriber];
      }
    }

    this._ua.destroyRTCSession(this);
  }

  /**
   * Private API.
   */

  /**
   * RFC3261 13.3.1.4
   * Response retransmissions cannot be accomplished by transaction layer
   *  since it is destroyed when receiving the first 2xx answer
   */
  _setInvite2xxTimer(request, body)
  {
    let timeout = Timers.T1;

    function invite2xxRetransmission()
    {
      if (this._status !== C.STATUS_WAITING_FOR_ACK)
      {
        return;
      }

      request.reply(200, null, [ `Contact: ${this._contact}` ], body);

      if (timeout < Timers.T2)
      {
        timeout = timeout * 2;
        if (timeout > Timers.T2)
        {
          timeout = Timers.T2;
        }
      }

      this._timers.invite2xxTimer = setTimeout(
        invite2xxRetransmission.bind(this), timeout);
    }

    this._timers.invite2xxTimer = setTimeout(
      invite2xxRetransmission.bind(this), timeout);
  }


  /**
   * RFC3261 14.2
   * If a UAS generates a 2xx response and never receives an ACK,
   *  it SHOULD generate a BYE to terminate the dialog.
   */
  _setACKTimer()
  {
    this._timers.ackTimer = setTimeout(() =>
    {
      if (this._status === C.STATUS_WAITING_FOR_ACK)
      {
        debug('no ACK received, terminating the session');

        clearTimeout(this._timers.invite2xxTimer);
        this.sendRequest(JsSIP_C.BYE);
        this._ended('remote', null, JsSIP_C.causes.NO_ACK);
      }
    }, Timers.TIMER_H);
  }


  _createRTCConnection(pcConfig, rtcConstraints)
  {
    this._connection = new RTCPeerConnection(pcConfig, rtcConstraints);

    this._connection.addEventListener('iceconnectionstatechange', () =>
    {
      const state = this._connection.iceConnectionState;

      // TODO: Do more with different states.
      if (state === 'failed')
      {
        this.terminate({
          cause         : JsSIP_C.causes.RTP_TIMEOUT,
          status_code   : 408,
          reason_phrase : JsSIP_C.causes.RTP_TIMEOUT
        });
      }
    });

    debug('emit "peerconnection"');

    this.emit('peerconnection', {
      peerconnection : this._connection
    });
  }

  _createLocalDescription(type, onSuccess, onFailure, constraints)
  {
    debug('createLocalDescription()');

    const connection = this._connection;

    this._rtcReady = false;

    if (type === 'offer')
    {
      this._connectionPromiseQueue = this._connectionPromiseQueue
        .then(() => connection.createOffer(constraints))
        .then(createSucceeded.bind(this))
        .catch((error) =>
        {
          this._rtcReady = true;
          if (onFailure) { onFailure(error); }

          debugerror('emit "peerconnection:createofferfailed" [error:%o]', error);

          this.emit('peerconnection:createofferfailed', error);
        });
    }
    else if (type === 'answer')
    {
      this._connectionPromiseQueue = this._connectionPromiseQueue
        .then(() => connection.createAnswer(constraints))
        .then(createSucceeded.bind(this))
        .catch((error) =>
        {
          this._rtcReady = true;
          if (onFailure) { onFailure(error); }

          debugerror('emit "peerconnection:createanswerfailed" [error:%o]', error);

          this.emit('peerconnection:createanswerfailed', error);
        });
    }
    else
    {
      throw new Error(`createLocalDescription() | type must be "offer" or "answer", but "${type}" was given`);
    }

    // CreateAnswer or createOffer succeeded.
    function createSucceeded(desc)
    {
      let listener;

      connection.addEventListener('icecandidate', listener = (event) =>
      {
        const candidate = event.candidate;

        if (! candidate)
        {
          connection.removeEventListener('icecandidate', listener);
          this._rtcReady = true;

          if (onSuccess)
          {
            const e = { originator: 'local', type: type, sdp: connection.localDescription.sdp };

            debug('emit "sdp"');

            this.emit('sdp', e);
            onSuccess(e.sdp);
          }
          onSuccess = null;
        }
      });

      connection.setLocalDescription(desc)
        .then(() =>
        {
          if (connection.iceGatheringState === 'complete')
          {
            this._rtcReady = true;

            if (onSuccess)
            {
              const e = { originator: 'local', type: type, sdp: connection.localDescription.sdp };

              debug('emit "sdp"');

              this.emit('sdp', e);
              onSuccess(e.sdp);
              onSuccess = null;
            }
          }
        })
        .catch((error) =>
        {
          this._rtcReady = true;
          if (onFailure) { onFailure(error); }

          debugerror('emit "peerconnection:setlocaldescriptionfailed" [error:%o]', error);

          this.emit('peerconnection:setlocaldescriptionfailed', error);
        });
    }
  }


  /**
   * Dialog Management
   */
  _createDialog(message, type, early)
  {
    const local_tag = (type === 'UAS') ? message.to_tag : message.from_tag;
    const remote_tag = (type === 'UAS') ? message.from_tag : message.to_tag;
    const id = message.call_id + local_tag + remote_tag;

    let early_dialog = this._earlyDialogs[id];

    // Early Dialog.
    if (early)
    {
      if (early_dialog)
      {
        return true;
      }
      else
      {
        early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

        // Dialog has been successfully created.
        if (early_dialog.error)
        {
          debug(early_dialog.error);
          this._failed('remote', message, JsSIP_C.causes.INTERNAL_ERROR);

          return false;
        }
        else
        {
          this._earlyDialogs[id] = early_dialog;

          return true;
        }
      }
    }

    // Confirmed Dialog.
    else
    {
      this._from_tag = message.from_tag;
      this._to_tag = message.to_tag;

      // In case the dialog is in _early_ state, update it.
      if (early_dialog)
      {
        early_dialog.update(message, type);
        this._dialog = early_dialog;
        delete this._earlyDialogs[id];

        return true;
      }

      // Otherwise, create a _confirmed_ dialog.
      const dialog = new Dialog(this, message, type);

      if (dialog.error)
      {
        debug(dialog.error);
        this._failed('remote', message, JsSIP_C.causes.INTERNAL_ERROR);

        return false;
      }
      else
      {
        this._dialog = dialog;

        return true;
      }
    }
  }

  /**
   * In dialog INVITE Reception
   */

  _receiveReinvite(request)
  {
    debug('receiveReinvite()');

    const contentType = request.getHeader('Content-Type');
    const data = {
      request,
      callback : undefined,
      reject   : reject.bind(this)
    };

    let hold = false;
    let rejected = false;

    function reject(options = {})
    {
      rejected = true;

      const status_code = options.status_code || 403;
      const reason_phrase = options.reason_phrase || '';
      const extraHeaders = Utils.cloneArray(options.extraHeaders);

      if (this._status !== C.STATUS_CONFIRMED)
      {
        return false;
      }

      if (status_code < 300 || status_code >= 700)
      {
        throw new TypeError(`Invalid status_code: ${status_code}`);
      }

      request.reply(status_code, reason_phrase, extraHeaders);
    }

    // Emit 'reinvite'.
    this.emit('reinvite', data);

    if (rejected)
    {
      return;
    }

    if (request.body)
    {
      this._late_sdp = false;
      if (contentType !== 'application/sdp')
      {
        debug('invalid Content-Type');
        request.reply(415);

        return;
      }

      const sdp = request.parseSDP();

      for (const m of sdp.media)
      {
        if (holdMediaTypes.indexOf(m.type) === -1)
        {
          continue;
        }

        const direction = m.direction || sdp.direction || 'sendrecv';

        if (direction === 'sendonly' || direction === 'inactive')
        {
          hold = true;
        }
        // If at least one of the streams is active don't emit 'hold'.
        else
        {
          hold = false;
          break;
        }
      }

      const e = { originator: 'remote', type: 'offer', sdp: request.body };
      const offer = new RTCSessionDescription({ type: 'offer', sdp: e.sdp });

      this.emit('sdp', e);

      this._connectionPromiseQueue = this._connectionPromiseQueue
        .then(() => this._connection.setRemoteDescription(offer))
        .then(doAnswer.bind(this))
        .catch((error) =>
        {
          request.reply(488);

          debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

          this.emit('peerconnection:setremotedescriptionfailed', error);
        });
    }
    else
    {
      this._late_sdp = true;
      doAnswer.call(this);
    }

    function doAnswer()
    {
      createSdp.call(this,
        (sdp) =>
        {
          const extraHeaders = [ `Contact: ${this._contact}` ];

          this._handleSessionTimersInIncomingRequest(request, extraHeaders);

          if (this._late_sdp)
          {
            sdp = this._mangleOffer(sdp);
          }

          request.reply(200, null, extraHeaders, sdp,
            () =>
            {
              this._status = C.STATUS_WAITING_FOR_ACK;
              this._setInvite2xxTimer(request, sdp);
              this._setACKTimer();
            }
          );

          // If callback is given execute it.
          if (typeof data.callback === 'function')
          {
            data.callback();
          }
        },
        () =>
        {
          request.reply(500);
        }
      );
    }

    function createSdp(onSuccess, onFailure)
    {
      if (! this._late_sdp)
      {
        if (this._remoteHold === true && hold === false)
        {
          this._remoteHold = false;
          this._onunhold('remote');
        }
        else if (this._remoteHold === false && hold === true)
        {
          this._remoteHold = true;
          this._onhold('remote');
        }

        this._createLocalDescription('answer', onSuccess, onFailure, this._rtcAnswerConstraints);
      }
      else
      {
        this._createLocalDescription('offer', onSuccess, onFailure, this._rtcOfferConstraints);
      }
    }
  }

  /**
   * In dialog UPDATE Reception
   */
  _receiveUpdate(request)
  {
    debug('receiveUpdate()');

    const contentType = request.getHeader('Content-Type');
    const data = {
      request,
      callback : undefined,
      reject   : reject.bind(this)
    };

    let rejected = false;
    let hold = false;

    function reject(options = {})
    {
      rejected = true;

      const status_code = options.status_code || 403;
      const reason_phrase = options.reason_phrase || '';
      const extraHeaders = Utils.cloneArray(options.extraHeaders);

      if (this._status !== C.STATUS_CONFIRMED)
      {
        return false;
      }

      if (status_code < 300 || status_code >= 700)
      {
        throw new TypeError(`Invalid status_code: ${status_code}`);
      }

      request.reply(status_code, reason_phrase, extraHeaders);
    }

    // Emit 'update'.
    this.emit('update', data);

    if (rejected)
    {
      return;
    }

    if (! request.body)
    {
      const extraHeaders = [];

      this._handleSessionTimersInIncomingRequest(request, extraHeaders);
      request.reply(200, null, extraHeaders);

      return;
    }

    if (contentType !== 'application/sdp')
    {
      debug('invalid Content-Type');

      request.reply(415);

      return;
    }

    const sdp = request.parseSDP();

    for (const m of sdp.media)
    {

      if (holdMediaTypes.indexOf(m.type) === -1)
      {
        continue;
      }

      const direction = m.direction || sdp.direction || 'sendrecv';

      if (direction === 'sendonly' || direction === 'inactive')
      {
        hold = true;
      }
      // If at least one of the streams is active don't emit 'hold'.
      else
      {
        hold = false;
        break;
      }
    }

    const e = { originator: 'remote', type: 'offer', sdp: request.body };

    debug('emit "sdp"');
    this.emit('sdp', e);

    const offer = new RTCSessionDescription({ type: 'offer', sdp: e.sdp });

    this._connectionPromiseQueue = this._connectionPromiseQueue
      .then(() => this._connection.setRemoteDescription(offer))
      .then(() =>
      {
        if (this._remoteHold === true && hold === false)
        {
          this._remoteHold = false;
          this._onunhold('remote');
        }
        else if (this._remoteHold === false && hold === true)
        {
          this._remoteHold = true;
          this._onhold('remote');
        }

        this._createLocalDescription('answer',
          (answerSdp) =>
          {
            const extraHeaders = [ `Contact: ${this._contact}` ];

            this._handleSessionTimersInIncomingRequest(request, extraHeaders);
            request.reply(200, null, extraHeaders, answerSdp);

            // If callback is given execute it.
            if (typeof data.callback === 'function')
            {
              data.callback();
            }
          },
          () =>
          {
            request.reply(500);
          }
        );
      })
      .catch((error) =>
      {
        request.reply(488);

        debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

        this.emit('peerconnection:setremotedescriptionfailed', error);
      });
  }

  /**
   * In dialog Refer Reception
   */
  _receiveRefer(request)
  {
    debug('receiveRefer()');

    if (typeof request.refer_to === undefined)
    {
      debug('no Refer-To header field present in REFER');
      request.reply(400);

      return;
    }

    if (request.refer_to.uri.scheme !== JsSIP_C.SIP)
    {
      debug('Refer-To header field points to a non-SIP URI scheme');
      request.reply(416);

      return;
    }

    // Reply before the transaction timer expires.
    request.reply(202);

    const notifier = new RTCSession_ReferNotifier(this, request.cseq);

    debug('emit "refer"');

    // Emit 'refer'.
    this.emit('refer', {
      request,
      accept : (initCallback, options) =>
      {
        accept.call(this, initCallback, options);
      },
      reject : () =>
      {
        reject.call(this);
      }
    });

    function accept(initCallback, options = {})
    {
      initCallback = (typeof initCallback === 'function')? initCallback : null;

      if (this._status !== C.STATUS_WAITING_FOR_ACK &&
          this._status !== C.STATUS_CONFIRMED)
      {
        return false;
      }

      const session = new RTCSession(this._ua);

      session.on('progress', ({ response }) =>
      {
        notifier.notify(response.status_code, response.reason_phrase);
      });

      session.on('accepted', ({ response }) =>
      {
        notifier.notify(response.status_code, response.reason_phrase);
      });

      session.on('failed', ({ message, cause }) =>
      {
        if (message)
        {
          notifier.notify(message.status_code, message.reason_phrase);
        }
        else
        {
          notifier.notify(487, cause);
        }
      });

      // Consider the Replaces header present in the Refer-To URI.
      if (request.refer_to.uri.hasHeader('replaces'))
      {
        const replaces = decodeURIComponent(request.refer_to.uri.getHeader('replaces'));

        options.extraHeaders = Utils.cloneArray(options.extraHeaders);
        options.extraHeaders.push(`Replaces: ${replaces}`);
      }

      session.connect(request.refer_to.uri.toAor(), options, initCallback);
    }

    function reject()
    {
      notifier.notify(603);
    }
  }

  /**
   * In dialog Notify Reception
   */
  _receiveNotify(request)
  {
    debug('receiveNotify()');

    if (typeof request.event === undefined)
    {
      request.reply(400);
    }

    switch (request.event.event)
    {
      case 'refer': {
        let id;
        let referSubscriber;

        if (request.event.params && request.event.params.id)
        {
          id = request.event.params.id;
          referSubscriber = this._referSubscribers[id];
        }
        else if (Object.keys(this._referSubscribers).length === 1)
        {
          referSubscriber = this._referSubscribers[
            Object.keys(this._referSubscribers)[0]];
        }
        else
        {
          request.reply(400, 'Missing event id parameter');

          return;
        }

        if (!referSubscriber)
        {
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
  _receiveReplaces(request)
  {
    debug('receiveReplaces()');

    function accept(initCallback)
    {
      if (this._status !== C.STATUS_WAITING_FOR_ACK &&
          this._status !== C.STATUS_CONFIRMED)
      {
        return false;
      }

      const session = new RTCSession(this._ua);

      // Terminate the current session when the new one is confirmed.
      session.on('confirmed', () =>
      {
        this.terminate();
      });

      session.init_incoming(request, initCallback);
    }

    function reject()
    {
      debug('Replaced INVITE rejected by the user');
      request.reply(486);
    }

    // Emit 'replace'.
    this.emit('replaces', {
      request,
      accept : (initCallback) => { accept.call(this, initCallback); },
      reject : () => { reject.call(this); }
    });
  }

  /**
   * Initial Request Sender
   */
  _sendInitialRequest(mediaConstraints, rtcOfferConstraints, mediaStream)
  {
    const request_sender = new RequestSender(this._ua, this._request, {
      onRequestTimeout : () =>
      {
        this.onRequestTimeout();
      },
      onTransportError : () =>
      {
        this.onTransportError();
      },
      // Update the request on authentication.
      onAuthenticated : (request) =>
      {
        this._request = request;
      },
      onReceiveResponse : (response) =>
      {
        this._receiveInviteResponse(response);
      }
    });

    // If a local MediaStream is given use it.
    if (mediaStream)
    {
      // Wait a bit so the app can set events such as 'peerconnection' and 'connecting'.
      setTimeout(() =>
      {
        userMediaSucceeded(mediaStream);
      });
    // If at least audio or video is requested prompt getUserMedia.
    }
    else if (mediaConstraints.audio || mediaConstraints.video)
    {
      this._localMediaStreamLocallyGenerated = true;
      navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(userMediaSucceeded.bind(this))
        .catch((error) =>
        {
          userMediaFailed.call(this, error);

          debugerror('emit "getusermediafailed" [error:%o]', error);

          this.emit('getusermediafailed', error);
        });
    // Otherwise don't prompt getUserMedia.
    }
    else
    {
      userMediaSucceeded.call(this, null);
    }

    // User media succeeded.
    function userMediaSucceeded(stream)
    {
      if (this._status === C.STATUS_TERMINATED) { return; }

      this._localMediaStream = stream;
      if (stream)
      {
        this._connection.addStream(stream);
      }

      this._connecting(this._request);
      this._createLocalDescription('offer', rtcSucceeded.bind(this), rtcFailed.bind(this), rtcOfferConstraints);
    }

    // User media failed.
    function userMediaFailed()
    {
      if (this._status === C.STATUS_TERMINATED) { return; }

      this._failed('local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
    }

    function rtcSucceeded(desc)
    {
      if (this._is_canceled || this._status === C.STATUS_TERMINATED) { return; }

      this._request.body = desc;
      this._status = C.STATUS_INVITE_SENT;

      debug('emit "sending" [request:%o]', this._request);

      // Emit 'sending' so the app can mangle the body before the request is sent.
      this.emit('sending', {
        request : this._request
      });

      request_sender.send();
    }

    function rtcFailed()
    {
      if (this._status === C.STATUS_TERMINATED) { return; }

      this._failed('system', null, JsSIP_C.causes.WEBRTC_ERROR);
    }
  }

  /**
   * Reception of Response for Initial INVITE
   */
  _receiveInviteResponse(response)
  {
    debug('receiveInviteResponse()');

    // Handle 2XX retransmissions and responses from forked requests.
    if (this._dialog && (response.status_code >=200 && response.status_code <=299))
    {

      /*
       * If it is a retransmission from the endpoint that established
       * the dialog, send an ACK
       */
      if (this._dialog.id.call_id === response.call_id &&
          this._dialog.id.local_tag === response.from_tag &&
          this._dialog.id.remote_tag === response.to_tag)
      {
        this.sendRequest(JsSIP_C.ACK);

        return;
      }

      // If not, send an ACK  and terminate.
      else
      {
        const dialog = new Dialog(this, response, 'UAC');

        if (dialog.error !== undefined)
        {
          debug(dialog.error);

          return;
        }

        this.sendRequest(JsSIP_C.ACK);
        this.sendRequest(JsSIP_C.BYE);

        return;
      }

    }

    // Proceed to cancellation if the user requested.
    if (this._is_canceled)
    {
      if (response.status_code >= 100 && response.status_code < 200)
      {
        this._request.cancel(this._cancel_reason);
      }
      else if (response.status_code >= 200 && response.status_code < 299)
      {
        this._acceptAndTerminate(response);
      }

      return;
    }

    if (this._status !== C.STATUS_INVITE_SENT && this._status !== C.STATUS_1XX_RECEIVED)
    {
      return;
    }

    switch (true)
    {
      case /^100$/.test(response.status_code):
        this._status = C.STATUS_1XX_RECEIVED;
        break;

      case /^1[0-9]{2}$/.test(response.status_code):
      {
        // Do nothing with 1xx responses without To tag.
        if (!response.to_tag)
        {
          debug('1xx response received without to tag');
          break;
        }

        // Create Early Dialog if 1XX comes with contact.
        if (response.hasHeader('contact'))
        {
          // An error on dialog creation will fire 'failed' event.
          if (! this._createDialog(response, 'UAC', true))
          {
            break;
          }
        }

        this._status = C.STATUS_1XX_RECEIVED;
        this._progress('remote', response);

        if (!response.body)
        {
          break;
        }

        const e = { originator: 'remote', type: 'answer', sdp: response.body };

        debug('emit "sdp"');

        this.emit('sdp', e);

        const answer = new RTCSessionDescription({ type: 'answer', sdp: e.sdp });

        this._connectionPromiseQueue = this._connectionPromiseQueue
          .then(() => this._connection.setRemoteDescription(answer))
          .catch((error) =>
          {
            debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

            this.emit('peerconnection:setremotedescriptionfailed', error);
          });
        break;
      }

      case /^2[0-9]{2}$/.test(response.status_code):
      {
        this._status = C.STATUS_CONFIRMED;

        if (!response.body)
        {
          this._acceptAndTerminate(response, 400, JsSIP_C.causes.MISSING_SDP);
          this._failed('remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);
          break;
        }

        // An error on dialog creation will fire 'failed' event.
        if (! this._createDialog(response, 'UAC'))
        {
          break;
        }

        const e = { originator: 'remote', type: 'answer', sdp: response.body };

        debug('emit "sdp"');
        this.emit('sdp', e);

        const answer = new RTCSessionDescription({ type: 'answer', sdp: e.sdp });

        this._connectionPromiseQueue = this._connectionPromiseQueue
          .then(() =>
          {
            // Be ready for 200 with SDP after a 180/183 with SDP. We created a SDP 'answer'
            // for it, so check the current signaling state.
            if (this._connection.signalingState === 'stable')
            {
              return this._connection.createOffer()
                .then((offer) => this._connection.setLocalDescription(offer))
                .catch((error) =>
                {
                  this._acceptAndTerminate(response, 500, error.toString());
                  this._failed('local', response, JsSIP_C.causes.WEBRTC_ERROR);

                  debugerror('emit "peerconnection:setlocaldescriptionfailed" [error:%o]', error);

                  this.emit('peerconnection:setlocaldescriptionfailed', error);
                });
            }
          })
          .then(() =>
          {
            this._connection.setRemoteDescription(answer)
              .then(() =>
              {
                // Handle Session Timers.
                this._handleSessionTimersInIncomingResponse(response);

                this._accepted('remote', response);
                this.sendRequest(JsSIP_C.ACK);
                this._confirmed('local', null);
              })
              .catch((error) =>
              {
                this._acceptAndTerminate(response, 488, 'Not Acceptable Here');
                this._failed('remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);

                debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

                this.emit('peerconnection:setremotedescriptionfailed', error);
              });
          });
        break;
      }

      default:
      {
        const cause = Utils.sipErrorCause(response.status_code);

        this._failed('remote', response, cause);
      }
    }
  }

  /**
   * Send Re-INVITE
   */
  _sendReinvite(options = {})
  {
    debug('sendReinvite()');

    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const eventHandlers = options.eventHandlers || {};
    const rtcOfferConstraints = options.rtcOfferConstraints ||
      this._rtcOfferConstraints || null;

    let succeeded = false;

    extraHeaders.push(`Contact: ${this._contact}`);
    extraHeaders.push('Content-Type: application/sdp');

    // Session Timers.
    if (this._sessionTimers.running)
    {
      extraHeaders.push(`Session-Expires: ${this._sessionTimers.currentExpires};refresher=${this._sessionTimers.refresher ? 'uac' : 'uas'}`);
    }

    this._createLocalDescription('offer',
      (sdp) =>
      {
        sdp = this._mangleOffer(sdp);

        this.sendRequest(JsSIP_C.INVITE, {
          extraHeaders,
          body          : sdp,
          eventHandlers : {
            onSuccessResponse : (response) =>
            {
              onSucceeded.call(this, response);
              succeeded = true;
            },
            onErrorResponse : (response) =>
            {
              onFailed.call(this, response);
            },
            onTransportError : () =>
            {
              this.onTransportError(); // Do nothing because session ends.
            },
            onRequestTimeout : () =>
            {
              this.onRequestTimeout(); // Do nothing because session ends.
            },
            onDialogError : () =>
            {
              this.onDialogError(); // Do nothing because session ends.
            }
          }
        });
      },
      () =>
      {
        onFailed();
      },
      // RTC constraints.
      rtcOfferConstraints
    );

    function onSucceeded(response)
    {
      if (this._status === C.STATUS_TERMINATED)
      {
        return;
      }

      this.sendRequest(JsSIP_C.ACK);

      // If it is a 2XX retransmission exit now.
      if (succeeded) { return; }

      // Handle Session Timers.
      this._handleSessionTimersInIncomingResponse(response);

      // Must have SDP answer.
      if (! response.body)
      {
        onFailed.call(this);

        return;
      }
      else if (response.getHeader('Content-Type') !== 'application/sdp')
      {
        onFailed.call(this);

        return;
      }

      const e = { originator: 'remote', type: 'answer', sdp: response.body };

      debug('emit "sdp"');
      this.emit('sdp', e);

      const answer = new RTCSessionDescription({ type: 'answer', sdp: e.sdp });

      this._connectionPromiseQueue = this._connectionPromiseQueue
        .then(() => this._connection.setRemoteDescription(answer))
        .then(() =>
        {
          if (eventHandlers.succeeded)
          {
            eventHandlers.succeeded(response);
          }
        })
        .catch((error) =>
        {
          onFailed.call(this);

          debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

          this.emit('peerconnection:setremotedescriptionfailed', error);
        });
    }

    function onFailed(response)
    {
      if (eventHandlers.failed)
      {
        eventHandlers.failed(response);
      }
    }
  }

  /**
   * Send UPDATE
   */
  _sendUpdate(options = {})
  {
    debug('sendUpdate()');

    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const eventHandlers = options.eventHandlers || {};
    const rtcOfferConstraints = options.rtcOfferConstraints ||
      this._rtcOfferConstraints || null;
    const sdpOffer = options.sdpOffer || false;

    let succeeded = false;

    extraHeaders.push(`Contact: ${this._contact}`);

    // Session Timers.
    if (this._sessionTimers.running)
    {
      extraHeaders.push(`Session-Expires: ${this._sessionTimers.currentExpires};refresher=${this._sessionTimers.refresher ? 'uac' : 'uas'}`);
    }

    if (sdpOffer)
    {
      extraHeaders.push('Content-Type: application/sdp');

      this._createLocalDescription('offer',
        (sdp) =>
        {
          sdp = this._mangleOffer(sdp);

          this.sendRequest(JsSIP_C.UPDATE, {
            extraHeaders,
            body          : sdp,
            eventHandlers : {
              onSuccessResponse : (response) =>
              {
                onSucceeded.call(this, response);
                succeeded = true;
              },
              onErrorResponse : (response) =>
              {
                onFailed.call(this, response);
              },
              onTransportError : () =>
              {
                this.onTransportError(); // Do nothing because session ends.
              },
              onRequestTimeout : () =>
              {
                this.onRequestTimeout(); // Do nothing because session ends.
              },
              onDialogError : () =>
              {
                this.onDialogError(); // Do nothing because session ends.
              }
            }
          });
        },
        () =>
        {
          onFailed.call(this);
        },
        // RTC constraints.
        rtcOfferConstraints
      );
    }

    // No SDP.
    else
    {
      this.sendRequest(JsSIP_C.UPDATE, {
        extraHeaders,
        eventHandlers : {
          onSuccessResponse : (response) =>
          {
            onSucceeded.call(this, response);
          },
          onErrorResponse : (response) =>
          {
            onFailed.call(this, response);
          },
          onTransportError : () =>
          {
            this.onTransportError(); // Do nothing because session ends.
          },
          onRequestTimeout : () =>
          {
            this.onRequestTimeout(); // Do nothing because session ends.
          },
          onDialogError : () =>
          {
            this.onDialogError(); // Do nothing because session ends.
          }
        }
      });
    }

    function onSucceeded(response)
    {
      if (this._status === C.STATUS_TERMINATED)
      {
        return;
      }

      // If it is a 2XX retransmission exit now.
      if (succeeded) { return; }

      // Handle Session Timers.
      this._handleSessionTimersInIncomingResponse(response);

      // Must have SDP answer.
      if (sdpOffer)
      {
        if (! response.body)
        {
          onFailed.call(this);

          return;
        }
        else if (response.getHeader('Content-Type') !== 'application/sdp')
        {
          onFailed.call(this);

          return;
        }

        const e = { originator: 'remote', type: 'answer', sdp: response.body };

        debug('emit "sdp"');
        this.emit('sdp', e);

        const answer = new RTCSessionDescription({ type: 'answer', sdp: e.sdp });

        this._connectionPromiseQueue = this._connectionPromiseQueue
          .then(() => this._connection.setRemoteDescription(answer))
          .then(() =>
          {
            if (eventHandlers.succeeded)
            {
              eventHandlers.succeeded(response);
            }
          })
          .catch((error) =>
          {
            onFailed.call(this);

            debugerror('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);

            this.emit('peerconnection:setremotedescriptionfailed', error);
          });
      }
      // No SDP answer.
      else
      if (eventHandlers.succeeded)
      {
        eventHandlers.succeeded(response);
      }
    }

    function onFailed(response)
    {
      if (eventHandlers.failed) { eventHandlers.failed(response); }
    }
  }

  _acceptAndTerminate(response, status_code, reason_phrase)
  {
    debug('acceptAndTerminate()');

    const extraHeaders = [];

    if (status_code)
    {
      reason_phrase = reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
      extraHeaders.push(`Reason: SIP ;cause=${status_code}; text="${reason_phrase}"`);
    }

    // An error on dialog creation will fire 'failed' event.
    if (this._dialog || this._createDialog(response, 'UAC'))
    {
      this.sendRequest(JsSIP_C.ACK);
      this.sendRequest(JsSIP_C.BYE, {
        extraHeaders
      });
    }

    // Update session status.
    this._status = C.STATUS_TERMINATED;
  }

  /**
   * Correctly set the SDP direction attributes if the call is on local hold
   */
  _mangleOffer(sdp)
  {

    if (! this._localHold && ! this._remoteHold)
    {
      return sdp;
    }

    sdp = sdp_transform.parse(sdp);

    // Local hold.
    if (this._localHold && ! this._remoteHold)
    {
      debug('mangleOffer() | me on hold, mangling offer');
      for (const m of sdp.media)
      {
        if (holdMediaTypes.indexOf(m.type) === -1)
        {
          continue;
        }
        if (!m.direction)
        {
          m.direction = 'sendonly';
        }
        else if (m.direction === 'sendrecv')
        {
          m.direction = 'sendonly';
        }
        else if (m.direction === 'recvonly')
        {
          m.direction = 'inactive';
        }
      }
    }
    // Local and remote hold.
    else if (this._localHold && this._remoteHold)
    {
      debug('mangleOffer() | both on hold, mangling offer');
      for (const m of sdp.media)
      {
        if (holdMediaTypes.indexOf(m.type) === -1)
        {
          continue;
        }
        m.direction = 'inactive';
      }
    }
    // Remote hold.
    else if (this._remoteHold)
    {
      debug('mangleOffer() | remote on hold, mangling offer');
      for (const m of sdp.media)
      {
        if (holdMediaTypes.indexOf(m.type) === -1)
        {
          continue;
        }
        if (!m.direction)
        {
          m.direction = 'recvonly';
        }
        else if (m.direction === 'sendrecv')
        {
          m.direction = 'recvonly';
        }
        else if (m.direction === 'recvonly')
        {
          m.direction = 'inactive';
        }
      }
    }

    return sdp_transform.write(sdp);
  }

  _setLocalMediaStatus()
  {
    let enableAudio = true, enableVideo = true;

    if (this._localHold || this._remoteHold)
    {
      enableAudio = false;
      enableVideo = false;
    }

    if (this._audioMuted)
    {
      enableAudio = false;
    }

    if (this._videoMuted)
    {
      enableVideo = false;
    }

    this._toogleMuteAudio(!enableAudio);
    this._toogleMuteVideo(!enableVideo);
  }

  /**
   * Handle SessionTimers for an incoming INVITE or UPDATE.
   * @param  {IncomingRequest} request
   * @param  {Array} responseExtraHeaders  Extra headers for the 200 response.
   */
  _handleSessionTimersInIncomingRequest(request, responseExtraHeaders)
  {
    if (! this._sessionTimers.enabled) { return; }

    let session_expires_refresher;

    if (request.session_expires && request.session_expires >= JsSIP_C.MIN_SESSION_EXPIRES)
    {
      this._sessionTimers.currentExpires = request.session_expires;
      session_expires_refresher = request.session_expires_refresher || 'uas';
    }
    else
    {
      this._sessionTimers.currentExpires = this._sessionTimers.defaultExpires;
      session_expires_refresher = 'uas';
    }

    responseExtraHeaders.push(`Session-Expires: ${this._sessionTimers.currentExpires};refresher=${session_expires_refresher}`);

    this._sessionTimers.refresher = (session_expires_refresher === 'uas');
    this._runSessionTimer();
  }

  /**
   * Handle SessionTimers for an incoming response to INVITE or UPDATE.
   * @param  {IncomingResponse} response
   */
  _handleSessionTimersInIncomingResponse(response)
  {
    if (! this._sessionTimers.enabled) { return; }

    let session_expires_refresher;

    if (response.session_expires &&
        response.session_expires >= JsSIP_C.MIN_SESSION_EXPIRES)
    {
      this._sessionTimers.currentExpires = response.session_expires;
      session_expires_refresher = response.session_expires_refresher || 'uac';
    }
    else
    {
      this._sessionTimers.currentExpires = this._sessionTimers.defaultExpires;
      session_expires_refresher = 'uac';
    }

    this._sessionTimers.refresher = (session_expires_refresher === 'uac');
    this._runSessionTimer();
  }

  _runSessionTimer()
  {
    const expires = this._sessionTimers.currentExpires;

    this._sessionTimers.running = true;

    clearTimeout(this._sessionTimers.timer);

    // I'm the refresher.
    if (this._sessionTimers.refresher)
    {
      this._sessionTimers.timer = setTimeout(() =>
      {
        if (this._status === C.STATUS_TERMINATED) { return; }

        debug('runSessionTimer() | sending session refresh request');

        this._sendUpdate({
          eventHandlers : {
            succeeded : (response) =>
            {
              this._handleSessionTimersInIncomingResponse(response);
            }
          }
        });
      }, expires * 500); // Half the given interval (as the RFC states).
    }

    // I'm not the refresher.
    else
    {
      this._sessionTimers.timer = setTimeout(() =>
      {
        if (this._status === C.STATUS_TERMINATED) { return; }

        debugerror('runSessionTimer() | timer expired, terminating the session');

        this.terminate({
          cause         : JsSIP_C.causes.REQUEST_TIMEOUT,
          status_code   : 408,
          reason_phrase : 'Session Timer Expired'
        });
      }, expires * 1100);
    }
  }

  _toogleMuteAudio(mute)
  {
    const streams = this._connection.getLocalStreams();

    for (const stream of streams)
    {
      const tracks = stream.getAudioTracks();

      for (const track of tracks)
      {
        track.enabled = !mute;
      }
    }
  }

  _toogleMuteVideo(mute)
  {
    const streams = this._connection.getLocalStreams();

    for (const stream of streams)
    {
      const tracks = stream.getVideoTracks();

      for (const track of tracks)
      {
        track.enabled = !mute;
      }
    }
  }

  _newRTCSession(originator, request)
  {
    debug('newRTCSession()');

    this._ua.newRTCSession(this, {
      originator,
      session : this,
      request
    });
  }

  _connecting(request)
  {
    debug('session connecting');

    debug('emit "connecting"');

    this.emit('connecting', {
      request
    });
  }

  _progress(originator, response)
  {
    debug('session progress');

    debug('emit "progress"');

    this.emit('progress', {
      originator,
      response : response || null
    });
  }

  _accepted(originator, message)
  {
    debug('session accepted');

    this._start_time = new Date();

    debug('emit "accepted"');

    this.emit('accepted', {
      originator,
      response : message || null
    });
  }

  _confirmed(originator, ack)
  {
    debug('session confirmed');

    this._is_confirmed = true;

    debug('emit "confirmed"');

    this.emit('confirmed', {
      originator,
      ack : ack || null
    });
  }

  _ended(originator, message, cause)
  {
    debug('session ended');

    this._end_time = new Date();

    this._close();

    debug('emit "ended"');

    this.emit('ended', {
      originator,
      message : message || null,
      cause
    });
  }

  _failed(originator, message, cause)
  {
    debug('session failed');

    this._close();

    debug('emit "failed"');

    this.emit('failed', {
      originator,
      message : message || null,
      cause
    });
  }

  _onhold(originator)
  {
    debug('session onhold');

    this._setLocalMediaStatus();

    debug('emit "hold"');

    this.emit('hold', {
      originator
    });
  }

  _onunhold(originator)
  {
    debug('session onunhold');

    this._setLocalMediaStatus();

    debug('emit "unhold"');

    this.emit('unhold', {
      originator
    });
  }

  _onmute({ audio, video })
  {
    debug('session onmute');

    this._setLocalMediaStatus();

    debug('emit "muted"');

    this.emit('muted', {
      audio,
      video
    });
  }

  _onunmute({ audio, video })
  {
    debug('session onunmute');

    this._setLocalMediaStatus();

    debug('emit "unmuted"');

    this.emit('unmuted', {
      audio,
      video
    });
  }
};
