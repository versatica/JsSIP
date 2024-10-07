"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
/* globals RTCPeerConnection: false, RTCSessionDescription: false */

var EventEmitter = require('events').EventEmitter;
var sdp_transform = require('sdp-transform');
var Logger = require('./Logger');
var JsSIP_C = require('./Constants');
var Exceptions = require('./Exceptions');
var Transactions = require('./Transactions');
var Utils = require('./Utils');
var Timers = require('./Timers');
var SIPMessage = require('./SIPMessage');
var Dialog = require('./Dialog');
var RequestSender = require('./RequestSender');
var RTCSession_DTMF = require('./RTCSession/DTMF');
var RTCSession_Info = require('./RTCSession/Info');
var RTCSession_ReferNotifier = require('./RTCSession/ReferNotifier');
var RTCSession_ReferSubscriber = require('./RTCSession/ReferSubscriber');
var URI = require('./URI');
var logger = new Logger('RTCSession');
var C = {
  // RTCSession states.
  STATUS_NULL: 0,
  STATUS_INVITE_SENT: 1,
  STATUS_1XX_RECEIVED: 2,
  STATUS_INVITE_RECEIVED: 3,
  STATUS_WAITING_FOR_ANSWER: 4,
  STATUS_ANSWERED: 5,
  STATUS_WAITING_FOR_ACK: 6,
  STATUS_CANCELED: 7,
  STATUS_TERMINATED: 8,
  STATUS_CONFIRMED: 9
};

/**
 * Local variables.
 */
var holdMediaTypes = ['audio', 'video'];
module.exports = /*#__PURE__*/function (_EventEmitter) {
  function RTCSession(ua) {
    var _this;
    _classCallCheck(this, RTCSession);
    logger.debug('new');
    _this = _callSuper(this, RTCSession);
    _this._id = null;
    _this._ua = ua;
    _this._status = C.STATUS_NULL;
    _this._dialog = null;
    _this._earlyDialogs = {};
    _this._contact = null;
    _this._from_tag = null;
    _this._to_tag = null;

    // The RTCPeerConnection instance (public attribute).
    _this._connection = null;

    // Prevent races on serial PeerConnction operations.
    _this._connectionPromiseQueue = Promise.resolve();

    // Incoming/Outgoing request being currently processed.
    _this._request = null;

    // Cancel state for initial outgoing request.
    _this._is_canceled = false;
    _this._cancel_reason = '';

    // RTCSession confirmation flag.
    _this._is_confirmed = false;

    // Is late SDP being negotiated.
    _this._late_sdp = false;

    // Default rtcOfferConstraints and rtcAnswerConstrainsts (passed in connect() or answer()).
    _this._rtcOfferConstraints = null;
    _this._rtcAnswerConstraints = null;

    // Local MediaStream.
    _this._localMediaStream = null;
    _this._localMediaStreamLocallyGenerated = false;

    // Flag to indicate PeerConnection ready for new actions.
    _this._rtcReady = true;

    // Flag to indicate ICE candidate gathering is finished even if iceGatheringState is not yet 'complete'.
    _this._iceReady = false;

    // SIP Timers.
    _this._timers = {
      ackTimer: null,
      expiresTimer: null,
      invite2xxTimer: null,
      userNoAnswerTimer: null
    };

    // Session info.
    _this._direction = null;
    _this._local_identity = null;
    _this._remote_identity = null;
    _this._start_time = null;
    _this._end_time = null;
    _this._tones = null;

    // Mute/Hold state.
    _this._audioMuted = false;
    _this._videoMuted = false;
    _this._localHold = false;
    _this._remoteHold = false;

    // Session Timers (RFC 4028).
    _this._sessionTimers = {
      enabled: _this._ua.configuration.session_timers,
      refreshMethod: _this._ua.configuration.session_timers_refresh_method,
      defaultExpires: JsSIP_C.SESSION_EXPIRES,
      currentExpires: null,
      running: false,
      refresher: false,
      timer: null // A setTimeout.
    };

    // Map of ReferSubscriber instances indexed by the REFER's CSeq number.
    _this._referSubscribers = {};

    // Custom session empty object for high level use.
    _this._data = {};
    return _this;
  }

  /**
   * User API
   */

  // Expose RTCSession constants as a property of the RTCSession instance.
  _inherits(RTCSession, _EventEmitter);
  return _createClass(RTCSession, [{
    key: "C",
    get: function get() {
      return C;
    }

    // Expose session failed/ended causes as a property of the RTCSession instance.
  }, {
    key: "causes",
    get: function get() {
      return JsSIP_C.causes;
    }
  }, {
    key: "id",
    get: function get() {
      return this._id;
    }
  }, {
    key: "connection",
    get: function get() {
      return this._connection;
    }
  }, {
    key: "contact",
    get: function get() {
      return this._contact;
    }
  }, {
    key: "direction",
    get: function get() {
      return this._direction;
    }
  }, {
    key: "local_identity",
    get: function get() {
      return this._local_identity;
    }
  }, {
    key: "remote_identity",
    get: function get() {
      return this._remote_identity;
    }
  }, {
    key: "start_time",
    get: function get() {
      return this._start_time;
    }
  }, {
    key: "end_time",
    get: function get() {
      return this._end_time;
    }
  }, {
    key: "data",
    get: function get() {
      return this._data;
    },
    set: function set(_data) {
      this._data = _data;
    }
  }, {
    key: "status",
    get: function get() {
      return this._status;
    }
  }, {
    key: "isInProgress",
    value: function isInProgress() {
      switch (this._status) {
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
  }, {
    key: "isEstablished",
    value: function isEstablished() {
      switch (this._status) {
        case C.STATUS_ANSWERED:
        case C.STATUS_WAITING_FOR_ACK:
        case C.STATUS_CONFIRMED:
          return true;
        default:
          return false;
      }
    }
  }, {
    key: "isEnded",
    value: function isEnded() {
      switch (this._status) {
        case C.STATUS_CANCELED:
        case C.STATUS_TERMINATED:
          return true;
        default:
          return false;
      }
    }
  }, {
    key: "isMuted",
    value: function isMuted() {
      return {
        audio: this._audioMuted,
        video: this._videoMuted
      };
    }
  }, {
    key: "isOnHold",
    value: function isOnHold() {
      return {
        local: this._localHold,
        remote: this._remoteHold
      };
    }
  }, {
    key: "connect",
    value: function connect(target) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var initCallback = arguments.length > 2 ? arguments[2] : undefined;
      logger.debug('connect()');
      var originalTarget = target;
      var eventHandlers = Utils.cloneObject(options.eventHandlers);
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var mediaConstraints = Utils.cloneObject(options.mediaConstraints, {
        audio: true,
        video: true
      });
      var mediaStream = options.mediaStream || null;
      var pcConfig = Utils.cloneObject(options.pcConfig, {
        iceServers: []
      });
      var rtcConstraints = options.rtcConstraints || null;
      var rtcOfferConstraints = options.rtcOfferConstraints || null;
      this._rtcOfferConstraints = rtcOfferConstraints;
      this._rtcAnswerConstraints = options.rtcAnswerConstraints || null;
      this._data = options.data || this._data;

      // Check target.
      if (target === undefined) {
        throw new TypeError('Not enough arguments');
      }

      // Check Session Status.
      if (this._status !== C.STATUS_NULL) {
        throw new Exceptions.InvalidStateError(this._status);
      }

      // Check WebRTC support.
      if (!window.RTCPeerConnection) {
        throw new Exceptions.NotSupportedError('WebRTC not supported');
      }

      // Check target validity.
      target = this._ua.normalizeTarget(target);
      if (!target) {
        throw new TypeError("Invalid target: ".concat(originalTarget));
      }

      // Session Timers.
      if (this._sessionTimers.enabled) {
        if (Utils.isDecimal(options.sessionTimersExpires)) {
          if (options.sessionTimersExpires >= JsSIP_C.MIN_SESSION_EXPIRES) {
            this._sessionTimers.defaultExpires = options.sessionTimersExpires;
          } else {
            this._sessionTimers.defaultExpires = JsSIP_C.SESSION_EXPIRES;
          }
        }
      }

      // Set event handlers.
      for (var event in eventHandlers) {
        if (Object.prototype.hasOwnProperty.call(eventHandlers, event)) {
          this.on(event, eventHandlers[event]);
        }
      }

      // Session parameter initialization.
      this._from_tag = Utils.newTag();

      // Set anonymous property.
      var anonymous = options.anonymous || false;
      var requestParams = {
        from_tag: this._from_tag
      };
      this._contact = this._ua.contact.toString({
        anonymous: anonymous,
        outbound: true
      });
      if (anonymous) {
        requestParams.from_display_name = 'Anonymous';
        requestParams.from_uri = new URI('sip', 'anonymous', 'anonymous.invalid');
        extraHeaders.push("P-Preferred-Identity: ".concat(this._ua.configuration.uri.toString()));
        extraHeaders.push('Privacy: id');
      } else if (options.fromUserName) {
        requestParams.from_uri = new URI('sip', options.fromUserName, this._ua.configuration.uri.host);
        extraHeaders.push("P-Preferred-Identity: ".concat(this._ua.configuration.uri.toString()));
      }
      if (options.fromDisplayName) {
        requestParams.from_display_name = options.fromDisplayName;
      }
      extraHeaders.push("Contact: ".concat(this._contact));
      extraHeaders.push('Content-Type: application/sdp');
      if (this._sessionTimers.enabled) {
        extraHeaders.push("Session-Expires: ".concat(this._sessionTimers.defaultExpires).concat(this._ua.configuration.session_timers_force_refresher ? ';refresher=uac' : ''));
      }
      this._request = new SIPMessage.InitialOutgoingInviteRequest(target, this._ua, requestParams, extraHeaders);
      this._id = this._request.call_id + this._from_tag;

      // Create a new RTCPeerConnection instance.
      this._createRTCConnection(pcConfig, rtcConstraints);

      // Set internal properties.
      this._direction = 'outgoing';
      this._local_identity = this._request.from;
      this._remote_identity = this._request.to;

      // User explicitly provided a newRTCSession callback for this session.
      if (initCallback) {
        initCallback(this);
      }
      this._newRTCSession('local', this._request);
      this._sendInitialRequest(mediaConstraints, rtcOfferConstraints, mediaStream);
    }
  }, {
    key: "init_incoming",
    value: function init_incoming(request, initCallback) {
      var _this2 = this;
      logger.debug('init_incoming()');
      var expires;
      var contentType = request.hasHeader('Content-Type') ? request.getHeader('Content-Type').toLowerCase() : undefined;

      // Check body and content type.
      if (request.body && contentType !== 'application/sdp') {
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
      if (request.hasHeader('expires')) {
        expires = request.getHeader('expires') * 1000;
      }

      /* Set the to_tag before
       * replying a response code that will create a dialog.
       */
      request.to_tag = Utils.newTag();

      // An error on dialog creation will fire 'failed' event.
      if (!this._createDialog(request, 'UAS', true)) {
        request.reply(500, 'Missing Contact header field');
        return;
      }
      if (request.body) {
        this._late_sdp = false;
      } else {
        this._late_sdp = true;
      }
      this._status = C.STATUS_WAITING_FOR_ANSWER;

      // Set userNoAnswerTimer.
      this._timers.userNoAnswerTimer = setTimeout(function () {
        request.reply(408);
        _this2._failed('local', null, JsSIP_C.causes.NO_ANSWER);
      }, this._ua.configuration.no_answer_timeout);

      /* Set expiresTimer
       * RFC3261 13.3.1
       */
      if (expires) {
        this._timers.expiresTimer = setTimeout(function () {
          if (_this2._status === C.STATUS_WAITING_FOR_ANSWER) {
            request.reply(487);
            _this2._failed('system', null, JsSIP_C.causes.EXPIRES);
          }
        }, expires);
      }

      // Set internal properties.
      this._direction = 'incoming';
      this._local_identity = request.to;
      this._remote_identity = request.from;

      // A init callback was specifically defined.
      if (initCallback) {
        initCallback(this);
      }

      // Fire 'newRTCSession' event.
      this._newRTCSession('remote', request);

      // The user may have rejected the call in the 'newRTCSession' event.
      if (this._status === C.STATUS_TERMINATED) {
        return;
      }

      // Reply 180.
      request.reply(180, null, ["Contact: ".concat(this._contact)]);

      // Fire 'progress' event.
      // TODO: Document that 'response' field in 'progress' event is null for incoming calls.
      this._progress('local', null);
    }

    /**
     * Answer the call.
     */
  }, {
    key: "answer",
    value: function answer() {
      var _this3 = this;
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      logger.debug('answer()');
      var request = this._request;
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var mediaConstraints = Utils.cloneObject(options.mediaConstraints);
      var mediaStream = options.mediaStream || null;
      var pcConfig = Utils.cloneObject(options.pcConfig, {
        iceServers: []
      });
      var rtcConstraints = options.rtcConstraints || null;
      var rtcAnswerConstraints = options.rtcAnswerConstraints || null;
      var rtcOfferConstraints = Utils.cloneObject(options.rtcOfferConstraints);
      var tracks;
      var peerHasAudioLine = false;
      var peerHasVideoLine = false;
      var peerOffersFullAudio = false;
      var peerOffersFullVideo = false;
      this._rtcAnswerConstraints = rtcAnswerConstraints;
      this._rtcOfferConstraints = options.rtcOfferConstraints || null;
      this._data = options.data || this._data;

      // Check Session Direction and Status.
      if (this._direction !== 'incoming') {
        throw new Exceptions.NotSupportedError('"answer" not supported for outgoing RTCSession');
      }

      // Check Session status.
      if (this._status !== C.STATUS_WAITING_FOR_ANSWER) {
        throw new Exceptions.InvalidStateError(this._status);
      }

      // Session Timers.
      if (this._sessionTimers.enabled) {
        if (Utils.isDecimal(options.sessionTimersExpires)) {
          if (options.sessionTimersExpires >= JsSIP_C.MIN_SESSION_EXPIRES) {
            this._sessionTimers.defaultExpires = options.sessionTimersExpires;
          } else {
            this._sessionTimers.defaultExpires = JsSIP_C.SESSION_EXPIRES;
          }
        }
      }
      this._status = C.STATUS_ANSWERED;

      // An error on dialog creation will fire 'failed' event.
      if (!this._createDialog(request, 'UAS')) {
        request.reply(500, 'Error creating dialog');
        return;
      }
      clearTimeout(this._timers.userNoAnswerTimer);
      extraHeaders.unshift("Contact: ".concat(this._contact));

      // Determine incoming media from incoming SDP offer (if any).
      var sdp = request.parseSDP();

      // Make sure sdp.media is an array, not the case if there is only one media.
      if (!Array.isArray(sdp.media)) {
        sdp.media = [sdp.media];
      }

      // Go through all medias in SDP to find offered capabilities to answer with.
      var _iterator = _createForOfIteratorHelper(sdp.media),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var m = _step.value;
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

        // Remove audio from mediaStream if suggested by mediaConstraints.
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      if (mediaStream && mediaConstraints.audio === false) {
        tracks = mediaStream.getAudioTracks();
        var _iterator2 = _createForOfIteratorHelper(tracks),
          _step2;
        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var track = _step2.value;
            mediaStream.removeTrack(track);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }

      // Remove video from mediaStream if suggested by mediaConstraints.
      if (mediaStream && mediaConstraints.video === false) {
        tracks = mediaStream.getVideoTracks();
        var _iterator3 = _createForOfIteratorHelper(tracks),
          _step3;
        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var _track = _step3.value;
            mediaStream.removeTrack(_track);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }

      // Set audio constraints based on incoming stream if not supplied.
      if (!mediaStream && mediaConstraints.audio === undefined) {
        mediaConstraints.audio = peerOffersFullAudio;
      }

      // Set video constraints based on incoming stream if not supplied.
      if (!mediaStream && mediaConstraints.video === undefined) {
        mediaConstraints.video = peerOffersFullVideo;
      }

      // Don't ask for audio if the incoming offer has no audio section.
      if (!mediaStream && !peerHasAudioLine && !rtcOfferConstraints.offerToReceiveAudio) {
        mediaConstraints.audio = false;
      }

      // Don't ask for video if the incoming offer has no video section.
      if (!mediaStream && !peerHasVideoLine && !rtcOfferConstraints.offerToReceiveVideo) {
        mediaConstraints.video = false;
      }

      // Create a new RTCPeerConnection instance.
      // TODO: This may throw an error, should react.
      this._createRTCConnection(pcConfig, rtcConstraints);
      Promise.resolve()
      // Handle local MediaStream.
      .then(function () {
        // A local MediaStream is given, use it.
        if (mediaStream) {
          return mediaStream;
        }

        // Audio and/or video requested, prompt getUserMedia.
        else if (mediaConstraints.audio || mediaConstraints.video) {
          _this3._localMediaStreamLocallyGenerated = true;
          return navigator.mediaDevices.getUserMedia(mediaConstraints)["catch"](function (error) {
            if (_this3._status === C.STATUS_TERMINATED) {
              throw new Error('terminated');
            }
            request.reply(480);
            _this3._failed('local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
            logger.warn('emit "getusermediafailed" [error:%o]', error);
            _this3.emit('getusermediafailed', error);
            throw new Error('getUserMedia() failed');
          });
        }
      })
      // Attach MediaStream to RTCPeerconnection.
      .then(function (stream) {
        if (_this3._status === C.STATUS_TERMINATED) {
          throw new Error('terminated');
        }
        _this3._localMediaStream = stream;
        if (stream) {
          stream.getTracks().forEach(function (track) {
            _this3._connection.addTrack(track, stream);
          });
        }
      })
      // Set remote description.
      .then(function () {
        if (_this3._late_sdp) {
          return;
        }
        var e = {
          originator: 'remote',
          type: 'offer',
          sdp: request.body
        };
        logger.debug('emit "sdp"');
        _this3.emit('sdp', e);
        var offer = new RTCSessionDescription({
          type: 'offer',
          sdp: e.sdp
        });
        _this3._connectionPromiseQueue = _this3._connectionPromiseQueue.then(function () {
          return _this3._connection.setRemoteDescription(offer);
        })["catch"](function (error) {
          request.reply(488);
          _this3._failed('system', null, JsSIP_C.causes.WEBRTC_ERROR);
          logger.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);
          _this3.emit('peerconnection:setremotedescriptionfailed', error);
          throw new Error('peerconnection.setRemoteDescription() failed');
        });
        return _this3._connectionPromiseQueue;
      })
      // Create local description.
      .then(function () {
        if (_this3._status === C.STATUS_TERMINATED) {
          throw new Error('terminated');
        }

        // TODO: Is this event already useful?
        _this3._connecting(request);
        if (!_this3._late_sdp) {
          return _this3._createLocalDescription('answer', rtcAnswerConstraints)["catch"](function () {
            request.reply(500);
            throw new Error('_createLocalDescription() failed');
          });
        } else {
          return _this3._createLocalDescription('offer', _this3._rtcOfferConstraints)["catch"](function () {
            request.reply(500);
            throw new Error('_createLocalDescription() failed');
          });
        }
      })
      // Send reply.
      .then(function (desc) {
        if (_this3._status === C.STATUS_TERMINATED) {
          throw new Error('terminated');
        }
        _this3._handleSessionTimersInIncomingRequest(request, extraHeaders);
        request.reply(200, null, extraHeaders, desc, function () {
          _this3._status = C.STATUS_WAITING_FOR_ACK;
          _this3._setInvite2xxTimer(request, desc);
          _this3._setACKTimer();
          _this3._accepted('local');
        }, function () {
          _this3._failed('system', null, JsSIP_C.causes.CONNECTION_ERROR);
        });
      })["catch"](function (error) {
        if (_this3._status === C.STATUS_TERMINATED) {
          return;
        }
        logger.warn(error);
      });
    }

    /**
     * Terminate the call.
     */
  }, {
    key: "terminate",
    value: function terminate() {
      var _this4 = this;
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      logger.debug('terminate()');
      var cause = options.cause || JsSIP_C.causes.BYE;
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var body = options.body;
      var cancel_reason;
      var status_code = options.status_code;
      var reason_phrase = options.reason_phrase;

      // Check Session Status.
      if (this._status === C.STATUS_TERMINATED) {
        throw new Exceptions.InvalidStateError(this._status);
      }
      switch (this._status) {
        // - UAC -
        case C.STATUS_NULL:
        case C.STATUS_INVITE_SENT:
        case C.STATUS_1XX_RECEIVED:
          logger.debug('canceling session');
          if (status_code && (status_code < 200 || status_code >= 700)) {
            throw new TypeError("Invalid status_code: ".concat(status_code));
          } else if (status_code) {
            reason_phrase = reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
            cancel_reason = "SIP ;cause=".concat(status_code, " ;text=\"").concat(reason_phrase, "\"");
          }

          // Check Session Status.
          if (this._status === C.STATUS_NULL || this._status === C.STATUS_INVITE_SENT) {
            this._is_canceled = true;
            this._cancel_reason = cancel_reason;
          } else if (this._status === C.STATUS_1XX_RECEIVED) {
            this._request.cancel(cancel_reason);
          }
          this._status = C.STATUS_CANCELED;
          this._failed('local', null, JsSIP_C.causes.CANCELED);
          break;

        // - UAS -
        case C.STATUS_WAITING_FOR_ANSWER:
        case C.STATUS_ANSWERED:
          logger.debug('rejecting session');
          status_code = status_code || 480;
          if (status_code < 300 || status_code >= 700) {
            throw new TypeError("Invalid status_code: ".concat(status_code));
          }
          this._request.reply(status_code, reason_phrase, extraHeaders, body);
          this._failed('local', null, JsSIP_C.causes.REJECTED);
          break;
        case C.STATUS_WAITING_FOR_ACK:
        case C.STATUS_CONFIRMED:
          logger.debug('terminating session');
          reason_phrase = options.reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
          if (status_code && (status_code < 200 || status_code >= 700)) {
            throw new TypeError("Invalid status_code: ".concat(status_code));
          } else if (status_code) {
            extraHeaders.push("Reason: SIP ;cause=".concat(status_code, "; text=\"").concat(reason_phrase, "\""));
          }

          /* RFC 3261 section 15 (Terminating a session):
            *
            * "...the callee's UA MUST NOT send a BYE on a confirmed dialog
            * until it has received an ACK for its 2xx response or until the server
            * transaction times out."
            */
          if (this._status === C.STATUS_WAITING_FOR_ACK && this._direction === 'incoming' && this._request.server_transaction.state !== Transactions.C.STATUS_TERMINATED) {
            // Save the dialog for later restoration.
            var dialog = this._dialog;

            // Send the BYE as soon as the ACK is received...
            this.receiveRequest = function (_ref) {
              var method = _ref.method;
              if (method === JsSIP_C.ACK) {
                _this4.sendRequest(JsSIP_C.BYE, {
                  extraHeaders: extraHeaders,
                  body: body
                });
                dialog.terminate();
              }
            };

            // .., or when the INVITE transaction times out
            this._request.server_transaction.on('stateChanged', function () {
              if (_this4._request.server_transaction.state === Transactions.C.STATUS_TERMINATED) {
                _this4.sendRequest(JsSIP_C.BYE, {
                  extraHeaders: extraHeaders,
                  body: body
                });
                dialog.terminate();
              }
            });
            this._ended('local', null, cause);

            // Restore the dialog into 'this' in order to be able to send the in-dialog BYE :-).
            this._dialog = dialog;

            // Restore the dialog into 'ua' so the ACK can reach 'this' session.
            this._ua.newDialog(dialog);
          } else {
            this.sendRequest(JsSIP_C.BYE, {
              extraHeaders: extraHeaders,
              body: body
            });
            this._ended('local', null, cause);
          }
      }
    }
  }, {
    key: "sendDTMF",
    value: function sendDTMF(tones) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      logger.debug('sendDTMF() | tones: %s', tones);
      var position = 0;
      var duration = options.duration || null;
      var interToneGap = options.interToneGap || null;
      var transportType = options.transportType || JsSIP_C.DTMF_TRANSPORT.INFO;
      if (tones === undefined) {
        throw new TypeError('Not enough arguments');
      }

      // Check Session Status.
      if (this._status !== C.STATUS_CONFIRMED && this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_1XX_RECEIVED) {
        throw new Exceptions.InvalidStateError(this._status);
      }

      // Check Transport type.
      if (transportType !== JsSIP_C.DTMF_TRANSPORT.INFO && transportType !== JsSIP_C.DTMF_TRANSPORT.RFC2833) {
        throw new TypeError("invalid transportType: ".concat(transportType));
      }

      // Convert to string.
      if (typeof tones === 'number') {
        tones = tones.toString();
      }

      // Check tones.
      if (!tones || typeof tones !== 'string' || !tones.match(/^[0-9A-DR#*,]+$/i)) {
        throw new TypeError("Invalid tones: ".concat(tones));
      }

      // Check duration.
      if (duration && !Utils.isDecimal(duration)) {
        throw new TypeError("Invalid tone duration: ".concat(duration));
      } else if (!duration) {
        duration = RTCSession_DTMF.C.DEFAULT_DURATION;
      } else if (duration < RTCSession_DTMF.C.MIN_DURATION) {
        logger.debug("\"duration\" value is lower than the minimum allowed, setting it to ".concat(RTCSession_DTMF.C.MIN_DURATION, " milliseconds"));
        duration = RTCSession_DTMF.C.MIN_DURATION;
      } else if (duration > RTCSession_DTMF.C.MAX_DURATION) {
        logger.debug("\"duration\" value is greater than the maximum allowed, setting it to ".concat(RTCSession_DTMF.C.MAX_DURATION, " milliseconds"));
        duration = RTCSession_DTMF.C.MAX_DURATION;
      } else {
        duration = Math.abs(duration);
      }
      options.duration = duration;

      // Check interToneGap.
      if (interToneGap && !Utils.isDecimal(interToneGap)) {
        throw new TypeError("Invalid interToneGap: ".concat(interToneGap));
      } else if (!interToneGap) {
        interToneGap = RTCSession_DTMF.C.DEFAULT_INTER_TONE_GAP;
      } else if (interToneGap < RTCSession_DTMF.C.MIN_INTER_TONE_GAP) {
        logger.debug("\"interToneGap\" value is lower than the minimum allowed, setting it to ".concat(RTCSession_DTMF.C.MIN_INTER_TONE_GAP, " milliseconds"));
        interToneGap = RTCSession_DTMF.C.MIN_INTER_TONE_GAP;
      } else {
        interToneGap = Math.abs(interToneGap);
      }

      // RFC2833. Let RTCDTMFSender enqueue the DTMFs.
      if (transportType === JsSIP_C.DTMF_TRANSPORT.RFC2833) {
        // Send DTMF in current audio RTP stream.
        var sender = this._getDTMFRTPSender();
        if (sender) {
          // Add remaining buffered tones.
          tones = sender.toneBuffer + tones;
          // Insert tones.
          sender.insertDTMF(tones, duration, interToneGap);
        }
        return;
      }
      if (this._tones) {
        // Tones are already queued, just add to the queue.
        this._tones += tones;
        return;
      }
      this._tones = tones;

      // Send the first tone.
      _sendDTMF.call(this);
      function _sendDTMF() {
        var _this5 = this;
        var timeout;
        if (this._status === C.STATUS_TERMINATED || !this._tones || position >= this._tones.length) {
          // Stop sending DTMF.
          this._tones = null;
          return;
        }
        var tone = this._tones[position];
        position += 1;
        if (tone === ',') {
          timeout = 2000;
        } else {
          // Send DTMF via SIP INFO messages.
          var dtmf = new RTCSession_DTMF(this);
          options.eventHandlers = {
            onFailed: function onFailed() {
              _this5._tones = null;
            }
          };
          dtmf.send(tone, options);
          timeout = duration + interToneGap;
        }

        // Set timeout for the next tone.
        setTimeout(_sendDTMF.bind(this), timeout);
      }
    }
  }, {
    key: "sendInfo",
    value: function sendInfo(contentType, body) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      logger.debug('sendInfo()');

      // Check Session Status.
      if (this._status !== C.STATUS_CONFIRMED && this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_1XX_RECEIVED) {
        throw new Exceptions.InvalidStateError(this._status);
      }
      var info = new RTCSession_Info(this);
      info.send(contentType, body, options);
    }

    /**
     * Mute
     */
  }, {
    key: "mute",
    value: function mute() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
        audio: true,
        video: false
      };
      logger.debug('mute()');
      var audioMuted = false,
        videoMuted = false;
      if (this._audioMuted === false && options.audio) {
        audioMuted = true;
        this._audioMuted = true;
        this._toggleMuteAudio(true);
      }
      if (this._videoMuted === false && options.video) {
        videoMuted = true;
        this._videoMuted = true;
        this._toggleMuteVideo(true);
      }
      if (audioMuted === true || videoMuted === true) {
        this._onmute({
          audio: audioMuted,
          video: videoMuted
        });
      }
    }

    /**
     * Unmute
     */
  }, {
    key: "unmute",
    value: function unmute() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
        audio: true,
        video: true
      };
      logger.debug('unmute()');
      var audioUnMuted = false,
        videoUnMuted = false;
      if (this._audioMuted === true && options.audio) {
        audioUnMuted = true;
        this._audioMuted = false;
        if (this._localHold === false) {
          this._toggleMuteAudio(false);
        }
      }
      if (this._videoMuted === true && options.video) {
        videoUnMuted = true;
        this._videoMuted = false;
        if (this._localHold === false) {
          this._toggleMuteVideo(false);
        }
      }
      if (audioUnMuted === true || videoUnMuted === true) {
        this._onunmute({
          audio: audioUnMuted,
          video: videoUnMuted
        });
      }
    }

    /**
     * Hold
     */
  }, {
    key: "hold",
    value: function hold() {
      var _this6 = this;
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var done = arguments.length > 1 ? arguments[1] : undefined;
      logger.debug('hold()');
      if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
        return false;
      }
      if (this._localHold === true) {
        return false;
      }
      if (!this._isReadyToReOffer()) {
        return false;
      }
      this._localHold = true;
      this._onhold('local');
      var eventHandlers = {
        succeeded: function succeeded() {
          if (done) {
            done();
          }
        },
        failed: function failed() {
          _this6.terminate({
            cause: JsSIP_C.causes.WEBRTC_ERROR,
            status_code: 500,
            reason_phrase: 'Hold Failed'
          });
        }
      };
      if (options.useUpdate) {
        this._sendUpdate({
          sdpOffer: true,
          eventHandlers: eventHandlers,
          extraHeaders: options.extraHeaders
        });
      } else {
        this._sendReinvite({
          eventHandlers: eventHandlers,
          extraHeaders: options.extraHeaders
        });
      }
      return true;
    }
  }, {
    key: "unhold",
    value: function unhold() {
      var _this7 = this;
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var done = arguments.length > 1 ? arguments[1] : undefined;
      logger.debug('unhold()');
      if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
        return false;
      }
      if (this._localHold === false) {
        return false;
      }
      if (!this._isReadyToReOffer()) {
        return false;
      }
      this._localHold = false;
      this._onunhold('local');
      var eventHandlers = {
        succeeded: function succeeded() {
          if (done) {
            done();
          }
        },
        failed: function failed() {
          _this7.terminate({
            cause: JsSIP_C.causes.WEBRTC_ERROR,
            status_code: 500,
            reason_phrase: 'Unhold Failed'
          });
        }
      };
      if (options.useUpdate) {
        this._sendUpdate({
          sdpOffer: true,
          eventHandlers: eventHandlers,
          extraHeaders: options.extraHeaders
        });
      } else {
        this._sendReinvite({
          eventHandlers: eventHandlers,
          extraHeaders: options.extraHeaders
        });
      }
      return true;
    }
  }, {
    key: "renegotiate",
    value: function renegotiate() {
      var _this8 = this;
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var done = arguments.length > 1 ? arguments[1] : undefined;
      logger.debug('renegotiate()');
      var rtcOfferConstraints = options.rtcOfferConstraints || null;
      if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
        return false;
      }
      if (!this._isReadyToReOffer()) {
        return false;
      }
      var eventHandlers = {
        succeeded: function succeeded() {
          if (done) {
            done();
          }
        },
        failed: function failed() {
          _this8.terminate({
            cause: JsSIP_C.causes.WEBRTC_ERROR,
            status_code: 500,
            reason_phrase: 'Media Renegotiation Failed'
          });
        }
      };
      this._setLocalMediaStatus();
      if (options.useUpdate) {
        this._sendUpdate({
          sdpOffer: true,
          eventHandlers: eventHandlers,
          rtcOfferConstraints: rtcOfferConstraints,
          extraHeaders: options.extraHeaders
        });
      } else {
        this._sendReinvite({
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
  }, {
    key: "refer",
    value: function refer(target, options) {
      var _this9 = this;
      logger.debug('refer()');
      var originalTarget = target;
      if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
        return false;
      }

      // Check target validity.
      target = this._ua.normalizeTarget(target);
      if (!target) {
        throw new TypeError("Invalid target: ".concat(originalTarget));
      }
      var referSubscriber = new RTCSession_ReferSubscriber(this);
      referSubscriber.sendRefer(target, options);

      // Store in the map.
      var id = referSubscriber.id;
      this._referSubscribers[id] = referSubscriber;

      // Listen for ending events so we can remove it from the map.
      referSubscriber.on('requestFailed', function () {
        delete _this9._referSubscribers[id];
      });
      referSubscriber.on('accepted', function () {
        delete _this9._referSubscribers[id];
      });
      referSubscriber.on('failed', function () {
        delete _this9._referSubscribers[id];
      });
      return referSubscriber;
    }

    /**
     * Send a generic in-dialog Request
     */
  }, {
    key: "sendRequest",
    value: function sendRequest(method, options) {
      logger.debug('sendRequest()');
      return this._dialog.sendRequest(method, options);
    }

    /**
     * In dialog Request Reception
     */
  }, {
    key: "receiveRequest",
    value: function receiveRequest(request) {
      var _this10 = this;
      logger.debug('receiveRequest()');
      if (request.method === JsSIP_C.CANCEL) {
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
        if (this._status === C.STATUS_WAITING_FOR_ANSWER || this._status === C.STATUS_ANSWERED) {
          this._status = C.STATUS_CANCELED;
          this._request.reply(487);
          this._failed('remote', request, JsSIP_C.causes.CANCELED);
        }
      } else {
        // Requests arriving here are in-dialog requests.
        switch (request.method) {
          case JsSIP_C.ACK:
            if (this._status !== C.STATUS_WAITING_FOR_ACK) {
              return;
            }

            // Update signaling status.
            this._status = C.STATUS_CONFIRMED;
            clearTimeout(this._timers.ackTimer);
            clearTimeout(this._timers.invite2xxTimer);
            if (this._late_sdp) {
              if (!request.body) {
                this.terminate({
                  cause: JsSIP_C.causes.MISSING_SDP,
                  status_code: 400
                });
                break;
              }
              var e = {
                originator: 'remote',
                type: 'answer',
                sdp: request.body
              };
              logger.debug('emit "sdp"');
              this.emit('sdp', e);
              var answer = new RTCSessionDescription({
                type: 'answer',
                sdp: e.sdp
              });
              this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
                return _this10._connection.setRemoteDescription(answer);
              }).then(function () {
                if (!_this10._is_confirmed) {
                  _this10._confirmed('remote', request);
                }
              })["catch"](function (error) {
                _this10.terminate({
                  cause: JsSIP_C.causes.BAD_MEDIA_DESCRIPTION,
                  status_code: 488
                });
                logger.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);
                _this10.emit('peerconnection:setremotedescriptionfailed', error);
              });
            } else if (!this._is_confirmed) {
              this._confirmed('remote', request);
            }
            break;
          case JsSIP_C.BYE:
            if (this._status === C.STATUS_CONFIRMED || this._status === C.STATUS_WAITING_FOR_ACK) {
              request.reply(200);
              this._ended('remote', request, JsSIP_C.causes.BYE);
            } else if (this._status === C.STATUS_INVITE_RECEIVED || this._status === C.STATUS_WAITING_FOR_ANSWER) {
              request.reply(200);
              this._request.reply(487, 'BYE Received');
              this._ended('remote', request, JsSIP_C.causes.BYE);
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.INVITE:
            if (this._status === C.STATUS_CONFIRMED) {
              if (request.hasHeader('replaces')) {
                this._receiveReplaces(request);
              } else {
                this._receiveReinvite(request);
              }
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.INFO:
            if (this._status === C.STATUS_1XX_RECEIVED || this._status === C.STATUS_WAITING_FOR_ANSWER || this._status === C.STATUS_ANSWERED || this._status === C.STATUS_WAITING_FOR_ACK || this._status === C.STATUS_CONFIRMED) {
              var contentType = request.hasHeader('Content-Type') ? request.getHeader('Content-Type').toLowerCase() : undefined;
              if (contentType && contentType.match(/^application\/dtmf-relay/i)) {
                new RTCSession_DTMF(this).init_incoming(request);
              } else if (contentType !== undefined) {
                new RTCSession_Info(this).init_incoming(request);
              } else {
                request.reply(415);
              }
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.UPDATE:
            if (this._status === C.STATUS_CONFIRMED) {
              this._receiveUpdate(request);
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.REFER:
            if (this._status === C.STATUS_CONFIRMED) {
              this._receiveRefer(request);
            } else {
              request.reply(403, 'Wrong Status');
            }
            break;
          case JsSIP_C.NOTIFY:
            if (this._status === C.STATUS_CONFIRMED) {
              this._receiveNotify(request);
            } else {
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
  }, {
    key: "onTransportError",
    value: function onTransportError() {
      logger.warn('onTransportError()');
      if (this._status !== C.STATUS_TERMINATED) {
        this.terminate({
          status_code: 500,
          reason_phrase: JsSIP_C.causes.CONNECTION_ERROR,
          cause: JsSIP_C.causes.CONNECTION_ERROR
        });
      }
    }
  }, {
    key: "onRequestTimeout",
    value: function onRequestTimeout() {
      logger.warn('onRequestTimeout()');
      if (this._status !== C.STATUS_TERMINATED) {
        this.terminate({
          status_code: 408,
          reason_phrase: JsSIP_C.causes.REQUEST_TIMEOUT,
          cause: JsSIP_C.causes.REQUEST_TIMEOUT
        });
      }
    }
  }, {
    key: "onDialogError",
    value: function onDialogError() {
      logger.warn('onDialogError()');
      if (this._status !== C.STATUS_TERMINATED) {
        this.terminate({
          status_code: 500,
          reason_phrase: JsSIP_C.causes.DIALOG_ERROR,
          cause: JsSIP_C.causes.DIALOG_ERROR
        });
      }
    }

    // Called from DTMF handler.
  }, {
    key: "newDTMF",
    value: function newDTMF(data) {
      logger.debug('newDTMF()');
      this.emit('newDTMF', data);
    }

    // Called from Info handler.
  }, {
    key: "newInfo",
    value: function newInfo(data) {
      logger.debug('newInfo()');
      this.emit('newInfo', data);
    }

    /**
     * Check if RTCSession is ready for an outgoing re-INVITE or UPDATE with SDP.
     */
  }, {
    key: "_isReadyToReOffer",
    value: function _isReadyToReOffer() {
      if (!this._rtcReady) {
        logger.debug('_isReadyToReOffer() | internal WebRTC status not ready');
        return false;
      }

      // No established yet.
      if (!this._dialog) {
        logger.debug('_isReadyToReOffer() | session not established yet');
        return false;
      }

      // Another INVITE transaction is in progress.
      if (this._dialog.uac_pending_reply === true || this._dialog.uas_pending_reply === true) {
        logger.debug('_isReadyToReOffer() | there is another INVITE/UPDATE transaction in progress');
        return false;
      }
      return true;
    }
  }, {
    key: "_close",
    value: function _close() {
      logger.debug('close()');

      // Close local MediaStream if it was not given by the user.
      if (this._localMediaStream && this._localMediaStreamLocallyGenerated) {
        logger.debug('close() | closing local MediaStream');
        Utils.closeMediaStream(this._localMediaStream);
      }
      if (this._status === C.STATUS_TERMINATED) {
        return;
      }
      this._status = C.STATUS_TERMINATED;

      // Terminate RTC.
      if (this._connection) {
        try {
          this._connection.close();
        } catch (error) {
          logger.warn('close() | error closing the RTCPeerConnection: %o', error);
        }
      }

      // Terminate signaling.

      // Clear SIP timers.
      for (var timer in this._timers) {
        if (Object.prototype.hasOwnProperty.call(this._timers, timer)) {
          clearTimeout(this._timers[timer]);
        }
      }

      // Clear Session Timers.
      clearTimeout(this._sessionTimers.timer);

      // Terminate confirmed dialog.
      if (this._dialog) {
        this._dialog.terminate();
        delete this._dialog;
      }

      // Terminate early dialogs.
      for (var dialog in this._earlyDialogs) {
        if (Object.prototype.hasOwnProperty.call(this._earlyDialogs, dialog)) {
          this._earlyDialogs[dialog].terminate();
          delete this._earlyDialogs[dialog];
        }
      }

      // Terminate REFER subscribers.
      for (var subscriber in this._referSubscribers) {
        if (Object.prototype.hasOwnProperty.call(this._referSubscribers, subscriber)) {
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
  }, {
    key: "_setInvite2xxTimer",
    value: function _setInvite2xxTimer(request, body) {
      var timeout = Timers.T1;
      function invite2xxRetransmission() {
        if (this._status !== C.STATUS_WAITING_FOR_ACK) {
          return;
        }
        request.reply(200, null, ["Contact: ".concat(this._contact)], body);
        if (timeout < Timers.T2) {
          timeout = timeout * 2;
          if (timeout > Timers.T2) {
            timeout = Timers.T2;
          }
        }
        this._timers.invite2xxTimer = setTimeout(invite2xxRetransmission.bind(this), timeout);
      }
      this._timers.invite2xxTimer = setTimeout(invite2xxRetransmission.bind(this), timeout);
    }

    /**
     * RFC3261 14.2
     * If a UAS generates a 2xx response and never receives an ACK,
     *  it SHOULD generate a BYE to terminate the dialog.
     */
  }, {
    key: "_setACKTimer",
    value: function _setACKTimer() {
      var _this11 = this;
      this._timers.ackTimer = setTimeout(function () {
        if (_this11._status === C.STATUS_WAITING_FOR_ACK) {
          logger.debug('no ACK received, terminating the session');
          clearTimeout(_this11._timers.invite2xxTimer);
          _this11.sendRequest(JsSIP_C.BYE);
          _this11._ended('remote', null, JsSIP_C.causes.NO_ACK);
        }
      }, Timers.TIMER_H);
    }
  }, {
    key: "_createRTCConnection",
    value: function _createRTCConnection(pcConfig, rtcConstraints) {
      var _this12 = this;
      this._connection = new RTCPeerConnection(pcConfig, rtcConstraints);
      this._connection.addEventListener('iceconnectionstatechange', function () {
        var state = _this12._connection.iceConnectionState;

        // TODO: Do more with different states.
        if (state === 'failed') {
          _this12.terminate({
            cause: JsSIP_C.causes.RTP_TIMEOUT,
            status_code: 408,
            reason_phrase: JsSIP_C.causes.RTP_TIMEOUT
          });
        }
      });
      logger.debug('emit "peerconnection"');
      this.emit('peerconnection', {
        peerconnection: this._connection
      });
    }
  }, {
    key: "_createLocalDescription",
    value: function _createLocalDescription(type, constraints) {
      var _this13 = this;
      logger.debug('createLocalDescription()');
      if (type !== 'offer' && type !== 'answer') throw new Error("createLocalDescription() | invalid type \"".concat(type, "\""));
      var connection = this._connection;
      this._rtcReady = false;
      return Promise.resolve()
      // Create Offer or Answer.
      .then(function () {
        if (type === 'offer') {
          return connection.createOffer(constraints)["catch"](function (error) {
            logger.warn('emit "peerconnection:createofferfailed" [error:%o]', error);
            _this13.emit('peerconnection:createofferfailed', error);
            return Promise.reject(error);
          });
        } else {
          return connection.createAnswer(constraints)["catch"](function (error) {
            logger.warn('emit "peerconnection:createanswerfailed" [error:%o]', error);
            _this13.emit('peerconnection:createanswerfailed', error);
            return Promise.reject(error);
          });
        }
      })
      // Set local description.
      .then(function (desc) {
        return connection.setLocalDescription(desc)["catch"](function (error) {
          _this13._rtcReady = true;
          logger.warn('emit "peerconnection:setlocaldescriptionfailed" [error:%o]', error);
          _this13.emit('peerconnection:setlocaldescriptionfailed', error);
          return Promise.reject(error);
        });
      }).then(function () {
        // Resolve right away if 'pc.iceGatheringState' is 'complete'.
        /**
         * Resolve right away if:
         * - 'connection.iceGatheringState' is 'complete' and no 'iceRestart' constraint is set.
         * - 'connection.iceGatheringState' is 'gathering' and 'iceReady' is true.
         */
        var iceRestart = constraints && constraints.iceRestart;
        if (connection.iceGatheringState === 'complete' && !iceRestart || connection.iceGatheringState === 'gathering' && _this13._iceReady) {
          _this13._rtcReady = true;
          var e = {
            originator: 'local',
            type: type,
            sdp: connection.localDescription.sdp
          };
          logger.debug('emit "sdp"');
          _this13.emit('sdp', e);
          return Promise.resolve(e.sdp);
        }

        // Add 'pc.onicencandidate' event handler to resolve on last candidate.
        return new Promise(function (resolve) {
          var finished = false;
          var iceCandidateListener;
          var iceGatheringStateListener;
          _this13._iceReady = false;
          var ready = function ready() {
            if (finished) {
              return;
            }
            connection.removeEventListener('icecandidate', iceCandidateListener);
            connection.removeEventListener('icegatheringstatechange', iceGatheringStateListener);
            finished = true;
            _this13._rtcReady = true;

            // connection.iceGatheringState will still indicate 'gathering' and thus be blocking.
            _this13._iceReady = true;
            var e = {
              originator: 'local',
              type: type,
              sdp: connection.localDescription.sdp
            };
            logger.debug('emit "sdp"');
            _this13.emit('sdp', e);
            resolve(e.sdp);
          };
          connection.addEventListener('icecandidate', iceCandidateListener = function iceCandidateListener(event) {
            var candidate = event.candidate;
            if (candidate) {
              _this13.emit('icecandidate', {
                candidate: candidate,
                ready: ready
              });
            } else {
              ready();
            }
          });
          connection.addEventListener('icegatheringstatechange', iceGatheringStateListener = function iceGatheringStateListener() {
            if (connection.iceGatheringState === 'complete') {
              ready();
            }
          });
        });
      });
    }

    /**
     * Dialog Management
     */
  }, {
    key: "_createDialog",
    value: function _createDialog(message, type, early) {
      var local_tag = type === 'UAS' ? message.to_tag : message.from_tag;
      var remote_tag = type === 'UAS' ? message.from_tag : message.to_tag;
      var id = message.call_id + local_tag + remote_tag;
      var early_dialog = this._earlyDialogs[id];

      // Early Dialog.
      if (early) {
        if (early_dialog) {
          return true;
        } else {
          early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

          // Dialog has been successfully created.
          if (early_dialog.error) {
            logger.debug(early_dialog.error);
            this._failed('remote', message, JsSIP_C.causes.INTERNAL_ERROR);
            return false;
          } else {
            this._earlyDialogs[id] = early_dialog;
            return true;
          }
        }
      }

      // Confirmed Dialog.
      else {
        this._from_tag = message.from_tag;
        this._to_tag = message.to_tag;

        // In case the dialog is in _early_ state, update it.
        if (early_dialog) {
          early_dialog.update(message, type);
          this._dialog = early_dialog;
          delete this._earlyDialogs[id];
          return true;
        }

        // Otherwise, create a _confirmed_ dialog.
        var dialog = new Dialog(this, message, type);
        if (dialog.error) {
          logger.debug(dialog.error);
          this._failed('remote', message, JsSIP_C.causes.INTERNAL_ERROR);
          return false;
        } else {
          this._dialog = dialog;
          return true;
        }
      }
    }

    /**
     * In dialog INVITE Reception
     */
  }, {
    key: "_receiveReinvite",
    value: function _receiveReinvite(request) {
      var _this14 = this;
      logger.debug('receiveReinvite()');
      var contentType = request.hasHeader('Content-Type') ? request.getHeader('Content-Type').toLowerCase() : undefined;
      var data = {
        request: request,
        callback: undefined,
        reject: reject.bind(this)
      };
      var rejected = false;
      function reject() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        rejected = true;
        var status_code = options.status_code || 403;
        var reason_phrase = options.reason_phrase || '';
        var extraHeaders = Utils.cloneArray(options.extraHeaders);
        if (this._status !== C.STATUS_CONFIRMED) {
          return false;
        }
        if (status_code < 300 || status_code >= 700) {
          throw new TypeError("Invalid status_code: ".concat(status_code));
        }
        request.reply(status_code, reason_phrase, extraHeaders);
      }

      // Emit 'reinvite'.
      this.emit('reinvite', data);
      if (rejected) {
        return;
      }
      this._late_sdp = false;

      // Request without SDP.
      if (!request.body) {
        this._late_sdp = true;
        if (this._remoteHold) {
          this._remoteHold = false;
          this._onunhold('remote');
        }
        this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
          return _this14._createLocalDescription('offer', _this14._rtcOfferConstraints);
        }).then(function (sdp) {
          sendAnswer.call(_this14, sdp);
        })["catch"](function () {
          request.reply(500);
        });
        return;
      }

      // Request with SDP.
      if (contentType !== 'application/sdp') {
        logger.debug('invalid Content-Type');
        request.reply(415);
        return;
      }
      this._processInDialogSdpOffer(request)
      // Send answer.
      .then(function (desc) {
        if (_this14._status === C.STATUS_TERMINATED) {
          return;
        }
        sendAnswer.call(_this14, desc);
      })["catch"](function (error) {
        logger.warn(error);
      });
      function sendAnswer(desc) {
        var _this15 = this;
        var extraHeaders = ["Contact: ".concat(this._contact)];
        this._handleSessionTimersInIncomingRequest(request, extraHeaders);
        if (this._late_sdp) {
          desc = this._mangleOffer(desc);
        }
        request.reply(200, null, extraHeaders, desc, function () {
          _this15._status = C.STATUS_WAITING_FOR_ACK;
          _this15._setInvite2xxTimer(request, desc);
          _this15._setACKTimer();
        });

        // If callback is given execute it.
        if (typeof data.callback === 'function') {
          data.callback();
        }
      }
    }

    /**
     * In dialog UPDATE Reception
     */
  }, {
    key: "_receiveUpdate",
    value: function _receiveUpdate(request) {
      var _this16 = this;
      logger.debug('receiveUpdate()');
      var contentType = request.hasHeader('Content-Type') ? request.getHeader('Content-Type').toLowerCase() : undefined;
      var data = {
        request: request,
        callback: undefined,
        reject: reject.bind(this)
      };
      var rejected = false;
      function reject() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        rejected = true;
        var status_code = options.status_code || 403;
        var reason_phrase = options.reason_phrase || '';
        var extraHeaders = Utils.cloneArray(options.extraHeaders);
        if (this._status !== C.STATUS_CONFIRMED) {
          return false;
        }
        if (status_code < 300 || status_code >= 700) {
          throw new TypeError("Invalid status_code: ".concat(status_code));
        }
        request.reply(status_code, reason_phrase, extraHeaders);
      }

      // Emit 'update'.
      this.emit('update', data);
      if (rejected) {
        return;
      }
      if (!request.body) {
        sendAnswer.call(this, null);
        return;
      }
      if (contentType !== 'application/sdp') {
        logger.debug('invalid Content-Type');
        request.reply(415);
        return;
      }
      this._processInDialogSdpOffer(request)
      // Send answer.
      .then(function (desc) {
        if (_this16._status === C.STATUS_TERMINATED) {
          return;
        }
        sendAnswer.call(_this16, desc);
      })["catch"](function (error) {
        logger.warn(error);
      });
      function sendAnswer(desc) {
        var extraHeaders = ["Contact: ".concat(this._contact)];
        this._handleSessionTimersInIncomingRequest(request, extraHeaders);
        request.reply(200, null, extraHeaders, desc);

        // If callback is given execute it.
        if (typeof data.callback === 'function') {
          data.callback();
        }
      }
    }
  }, {
    key: "_processInDialogSdpOffer",
    value: function _processInDialogSdpOffer(request) {
      var _this17 = this;
      logger.debug('_processInDialogSdpOffer()');
      var sdp = request.parseSDP();
      var hold = false;
      var _iterator4 = _createForOfIteratorHelper(sdp.media),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var m = _step4.value;
          if (holdMediaTypes.indexOf(m.type) === -1) {
            continue;
          }
          var direction = m.direction || sdp.direction || 'sendrecv';
          if (direction === 'sendonly' || direction === 'inactive') {
            hold = true;
          }
          // If at least one of the streams is active don't emit 'hold'.
          else {
            hold = false;
            break;
          }
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
      var e = {
        originator: 'remote',
        type: 'offer',
        sdp: request.body
      };
      logger.debug('emit "sdp"');
      this.emit('sdp', e);
      var offer = new RTCSessionDescription({
        type: 'offer',
        sdp: e.sdp
      });
      this._connectionPromiseQueue = this._connectionPromiseQueue
      // Set remote description.
      .then(function () {
        if (_this17._status === C.STATUS_TERMINATED) {
          throw new Error('terminated');
        }
        return _this17._connection.setRemoteDescription(offer)["catch"](function (error) {
          request.reply(488);
          logger.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);
          _this17.emit('peerconnection:setremotedescriptionfailed', error);
          throw error;
        });
      }).then(function () {
        if (_this17._status === C.STATUS_TERMINATED) {
          throw new Error('terminated');
        }
        if (_this17._remoteHold === true && hold === false) {
          _this17._remoteHold = false;
          _this17._onunhold('remote');
        } else if (_this17._remoteHold === false && hold === true) {
          _this17._remoteHold = true;
          _this17._onhold('remote');
        }
      })
      // Create local description.
      .then(function () {
        if (_this17._status === C.STATUS_TERMINATED) {
          throw new Error('terminated');
        }
        return _this17._createLocalDescription('answer', _this17._rtcAnswerConstraints)["catch"](function (error) {
          request.reply(500);
          logger.warn('emit "peerconnection:createtelocaldescriptionfailed" [error:%o]', error);
          throw error;
        });
      })["catch"](function (error) {
        logger.warn('_processInDialogSdpOffer() failed [error: %o]', error);
      });
      return this._connectionPromiseQueue;
    }

    /**
     * In dialog Refer Reception
     */
  }, {
    key: "_receiveRefer",
    value: function _receiveRefer(request) {
      var _this18 = this;
      logger.debug('receiveRefer()');
      if (!request.refer_to) {
        logger.debug('no Refer-To header field present in REFER');
        request.reply(400);
        return;
      }
      if (request.refer_to.uri.scheme !== JsSIP_C.SIP) {
        logger.debug('Refer-To header field points to a non-SIP URI scheme');
        request.reply(416);
        return;
      }

      // Reply before the transaction timer expires.
      request.reply(202);
      var notifier = new RTCSession_ReferNotifier(this, request.cseq);
      logger.debug('emit "refer"');

      // Emit 'refer'.
      this.emit('refer', {
        request: request,
        accept: function accept(initCallback, options) {
          _accept.call(_this18, initCallback, options);
        },
        reject: function reject() {
          _reject.call(_this18);
        }
      });
      function _accept(initCallback) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        initCallback = typeof initCallback === 'function' ? initCallback : null;
        if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
          return false;
        }
        var session = new RTCSession(this._ua);
        session.on('progress', function (_ref2) {
          var response = _ref2.response;
          notifier.notify(response.status_code, response.reason_phrase);
        });
        session.on('accepted', function (_ref3) {
          var response = _ref3.response;
          notifier.notify(response.status_code, response.reason_phrase);
        });
        session.on('_failed', function (_ref4) {
          var message = _ref4.message,
            cause = _ref4.cause;
          if (message) {
            notifier.notify(message.status_code, message.reason_phrase);
          } else {
            notifier.notify(487, cause);
          }
        });

        // Consider the Replaces header present in the Refer-To URI.
        if (request.refer_to.uri.hasHeader('replaces')) {
          var replaces = decodeURIComponent(request.refer_to.uri.getHeader('replaces'));
          options.extraHeaders = Utils.cloneArray(options.extraHeaders);
          options.extraHeaders.push("Replaces: ".concat(replaces));
        }
        session.connect(request.refer_to.uri.toAor(), options, initCallback);
      }
      function _reject() {
        notifier.notify(603);
      }
    }

    /**
     * In dialog Notify Reception
     */
  }, {
    key: "_receiveNotify",
    value: function _receiveNotify(request) {
      logger.debug('receiveNotify()');
      if (!request.event) {
        request.reply(400);
      }
      switch (request.event.event) {
        case 'refer':
          {
            var id;
            var referSubscriber;
            if (request.event.params && request.event.params.id) {
              id = request.event.params.id;
              referSubscriber = this._referSubscribers[id];
            } else if (Object.keys(this._referSubscribers).length === 1) {
              referSubscriber = this._referSubscribers[Object.keys(this._referSubscribers)[0]];
            } else {
              request.reply(400, 'Missing event id parameter');
              return;
            }
            if (!referSubscriber) {
              request.reply(481, 'Subscription does not exist');
              return;
            }
            referSubscriber.receiveNotify(request);
            request.reply(200);
            break;
          }
        default:
          {
            request.reply(489);
          }
      }
    }

    /**
     * INVITE with Replaces Reception
     */
  }, {
    key: "_receiveReplaces",
    value: function _receiveReplaces(request) {
      var _this20 = this;
      logger.debug('receiveReplaces()');
      function _accept2(initCallback) {
        var _this19 = this;
        if (this._status !== C.STATUS_WAITING_FOR_ACK && this._status !== C.STATUS_CONFIRMED) {
          return false;
        }
        var session = new RTCSession(this._ua);

        // Terminate the current session when the new one is confirmed.
        session.on('confirmed', function () {
          _this19.terminate();
        });
        session.init_incoming(request, initCallback);
      }
      function _reject2() {
        logger.debug('Replaced INVITE rejected by the user');
        request.reply(486);
      }

      // Emit 'replace'.
      this.emit('replaces', {
        request: request,
        accept: function accept(initCallback) {
          _accept2.call(_this20, initCallback);
        },
        reject: function reject() {
          _reject2.call(_this20);
        }
      });
    }

    /**
     * Initial Request Sender
     */
  }, {
    key: "_sendInitialRequest",
    value: function _sendInitialRequest(mediaConstraints, rtcOfferConstraints, mediaStream) {
      var _this21 = this;
      var request_sender = new RequestSender(this._ua, this._request, {
        onRequestTimeout: function onRequestTimeout() {
          _this21.onRequestTimeout();
        },
        onTransportError: function onTransportError() {
          _this21.onTransportError();
        },
        // Update the request on authentication.
        onAuthenticated: function onAuthenticated(request) {
          _this21._request = request;
        },
        onReceiveResponse: function onReceiveResponse(response) {
          _this21._receiveInviteResponse(response);
        }
      });

      // This Promise is resolved within the next iteration, so the app has now
      // a chance to set events such as 'peerconnection' and 'connecting'.
      Promise.resolve()
      // Get a stream if required.
      .then(function () {
        // A stream is given, let the app set events such as 'peerconnection' and 'connecting'.
        if (mediaStream) {
          return mediaStream;
        }
        // Request for user media access.
        else if (mediaConstraints.audio || mediaConstraints.video) {
          _this21._localMediaStreamLocallyGenerated = true;
          return navigator.mediaDevices.getUserMedia(mediaConstraints)["catch"](function (error) {
            if (_this21._status === C.STATUS_TERMINATED) {
              throw new Error('terminated');
            }
            _this21._failed('local', null, JsSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
            logger.warn('emit "getusermediafailed" [error:%o]', error);
            _this21.emit('getusermediafailed', error);
            throw error;
          });
        }
      }).then(function (stream) {
        if (_this21._status === C.STATUS_TERMINATED) {
          throw new Error('terminated');
        }
        _this21._localMediaStream = stream;
        if (stream) {
          stream.getTracks().forEach(function (track) {
            _this21._connection.addTrack(track, stream);
          });
        }

        // TODO: should this be triggered here?
        _this21._connecting(_this21._request);
        return _this21._createLocalDescription('offer', rtcOfferConstraints)["catch"](function (error) {
          _this21._failed('local', null, JsSIP_C.causes.WEBRTC_ERROR);
          throw error;
        });
      }).then(function (desc) {
        if (_this21._is_canceled || _this21._status === C.STATUS_TERMINATED) {
          throw new Error('terminated');
        }
        _this21._request.body = desc;
        _this21._status = C.STATUS_INVITE_SENT;
        logger.debug('emit "sending" [request:%o]', _this21._request);

        // Emit 'sending' so the app can mangle the body before the request is sent.
        _this21.emit('sending', {
          request: _this21._request
        });
        request_sender.send();
      })["catch"](function (error) {
        if (_this21._status === C.STATUS_TERMINATED) {
          return;
        }
        logger.warn(error);
      });
    }

    /**
     * Get DTMF RTCRtpSender.
     */
  }, {
    key: "_getDTMFRTPSender",
    value: function _getDTMFRTPSender() {
      var sender = this._connection.getSenders().find(function (rtpSender) {
        return rtpSender.track && rtpSender.track.kind === 'audio';
      });
      if (!(sender && sender.dtmf)) {
        logger.warn('sendDTMF() | no local audio track to send DTMF with');
        return;
      }
      return sender.dtmf;
    }

    /**
     * Reception of Response for Initial INVITE
     */
  }, {
    key: "_receiveInviteResponse",
    value: function _receiveInviteResponse(response) {
      var _this22 = this;
      logger.debug('receiveInviteResponse()');

      // Handle 2XX retransmissions and responses from forked requests.
      if (this._dialog && response.status_code >= 200 && response.status_code <= 299) {
        /*
         * If it is a retransmission from the endpoint that established
         * the dialog, send an ACK
         */
        if (this._dialog.id.call_id === response.call_id && this._dialog.id.local_tag === response.from_tag && this._dialog.id.remote_tag === response.to_tag) {
          this.sendRequest(JsSIP_C.ACK);
          return;
        }

        // If not, send an ACK  and terminate.
        else {
          var dialog = new Dialog(this, response, 'UAC');
          if (dialog.error !== undefined) {
            logger.debug(dialog.error);
            return;
          }
          this.sendRequest(JsSIP_C.ACK);
          this.sendRequest(JsSIP_C.BYE);
          return;
        }
      }

      // Proceed to cancellation if the user requested.
      if (this._is_canceled) {
        if (response.status_code >= 100 && response.status_code < 200) {
          this._request.cancel(this._cancel_reason);
        } else if (response.status_code >= 200 && response.status_code < 299) {
          this._acceptAndTerminate(response);
        }
        return;
      }
      if (this._status !== C.STATUS_INVITE_SENT && this._status !== C.STATUS_1XX_RECEIVED) {
        return;
      }
      switch (true) {
        case /^100$/.test(response.status_code):
          this._status = C.STATUS_1XX_RECEIVED;
          break;
        case /^1[0-9]{2}$/.test(response.status_code):
          {
            // Do nothing with 1xx responses without To tag.
            if (!response.to_tag) {
              logger.debug('1xx response received without to tag');
              break;
            }

            // Create Early Dialog if 1XX comes with contact.
            if (response.hasHeader('contact')) {
              // An error on dialog creation will fire 'failed' event.
              if (!this._createDialog(response, 'UAC', true)) {
                break;
              }
            }
            this._status = C.STATUS_1XX_RECEIVED;
            if (!response.body) {
              this._progress('remote', response);
              break;
            }
            var e = {
              originator: 'remote',
              type: 'answer',
              sdp: response.body
            };
            logger.debug('emit "sdp"');
            this.emit('sdp', e);
            var answer = new RTCSessionDescription({
              type: 'answer',
              sdp: e.sdp
            });
            this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
              return _this22._connection.setRemoteDescription(answer);
            }).then(function () {
              return _this22._progress('remote', response);
            })["catch"](function (error) {
              logger.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);
              _this22.emit('peerconnection:setremotedescriptionfailed', error);
            });
            break;
          }
        case /^2[0-9]{2}$/.test(response.status_code):
          {
            this._status = C.STATUS_CONFIRMED;
            if (!response.body) {
              this._acceptAndTerminate(response, 400, JsSIP_C.causes.MISSING_SDP);
              this._failed('remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);
              break;
            }

            // An error on dialog creation will fire 'failed' event.
            if (!this._createDialog(response, 'UAC')) {
              break;
            }
            var _e = {
              originator: 'remote',
              type: 'answer',
              sdp: response.body
            };
            logger.debug('emit "sdp"');
            this.emit('sdp', _e);
            var _answer = new RTCSessionDescription({
              type: 'answer',
              sdp: _e.sdp
            });
            this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
              // Be ready for 200 with SDP after a 180/183 with SDP.
              // We created a SDP 'answer' for it, so check the current signaling state.
              if (_this22._connection.signalingState === 'stable') {
                return _this22._connection.createOffer(_this22._rtcOfferConstraints).then(function (offer) {
                  return _this22._connection.setLocalDescription(offer);
                })["catch"](function (error) {
                  _this22._acceptAndTerminate(response, 500, error.toString());
                  _this22._failed('local', response, JsSIP_C.causes.WEBRTC_ERROR);
                });
              }
            }).then(function () {
              _this22._connection.setRemoteDescription(_answer).then(function () {
                // Handle Session Timers.
                _this22._handleSessionTimersInIncomingResponse(response);
                _this22._accepted('remote', response);
                _this22.sendRequest(JsSIP_C.ACK);
                _this22._confirmed('local', null);
              })["catch"](function (error) {
                _this22._acceptAndTerminate(response, 488, 'Not Acceptable Here');
                _this22._failed('remote', response, JsSIP_C.causes.BAD_MEDIA_DESCRIPTION);
                logger.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);
                _this22.emit('peerconnection:setremotedescriptionfailed', error);
              });
            });
            break;
          }
        default:
          {
            var cause = Utils.sipErrorCause(response.status_code);
            this._failed('remote', response, cause);
          }
      }
    }

    /**
     * Send Re-INVITE
     */
  }, {
    key: "_sendReinvite",
    value: function _sendReinvite() {
      var _this23 = this;
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      logger.debug('sendReinvite()');
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var eventHandlers = Utils.cloneObject(options.eventHandlers);
      var rtcOfferConstraints = options.rtcOfferConstraints || this._rtcOfferConstraints || null;
      var succeeded = false;
      extraHeaders.push("Contact: ".concat(this._contact));
      extraHeaders.push('Content-Type: application/sdp');

      // Session Timers.
      if (this._sessionTimers.running) {
        extraHeaders.push("Session-Expires: ".concat(this._sessionTimers.currentExpires, ";refresher=").concat(this._sessionTimers.refresher ? 'uac' : 'uas'));
      }
      this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
        return _this23._createLocalDescription('offer', rtcOfferConstraints);
      }).then(function (sdp) {
        sdp = _this23._mangleOffer(sdp);
        var e = {
          originator: 'local',
          type: 'offer',
          sdp: sdp
        };
        logger.debug('emit "sdp"');
        _this23.emit('sdp', e);
        _this23.sendRequest(JsSIP_C.INVITE, {
          extraHeaders: extraHeaders,
          body: sdp,
          eventHandlers: {
            onSuccessResponse: function onSuccessResponse(response) {
              onSucceeded.call(_this23, response);
              succeeded = true;
            },
            onErrorResponse: function onErrorResponse(response) {
              onFailed.call(_this23, response);
            },
            onTransportError: function onTransportError() {
              _this23.onTransportError(); // Do nothing because session ends.
            },
            onRequestTimeout: function onRequestTimeout() {
              _this23.onRequestTimeout(); // Do nothing because session ends.
            },
            onDialogError: function onDialogError() {
              _this23.onDialogError(); // Do nothing because session ends.
            }
          }
        });
      })["catch"](function () {
        onFailed();
      });
      function onSucceeded(response) {
        var _this24 = this;
        if (this._status === C.STATUS_TERMINATED) {
          return;
        }
        this.sendRequest(JsSIP_C.ACK);

        // If it is a 2XX retransmission exit now.
        if (succeeded) {
          return;
        }

        // Handle Session Timers.
        this._handleSessionTimersInIncomingResponse(response);

        // Must have SDP answer.
        if (!response.body) {
          onFailed.call(this);
          return;
        } else if (!response.hasHeader('Content-Type') || response.getHeader('Content-Type').toLowerCase() !== 'application/sdp') {
          onFailed.call(this);
          return;
        }
        var e = {
          originator: 'remote',
          type: 'answer',
          sdp: response.body
        };
        logger.debug('emit "sdp"');
        this.emit('sdp', e);
        var answer = new RTCSessionDescription({
          type: 'answer',
          sdp: e.sdp
        });
        this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
          return _this24._connection.setRemoteDescription(answer);
        }).then(function () {
          if (eventHandlers.succeeded) {
            eventHandlers.succeeded(response);
          }
        })["catch"](function (error) {
          onFailed.call(_this24);
          logger.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);
          _this24.emit('peerconnection:setremotedescriptionfailed', error);
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
  }, {
    key: "_sendUpdate",
    value: function _sendUpdate() {
      var _this25 = this;
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      logger.debug('sendUpdate()');
      var extraHeaders = Utils.cloneArray(options.extraHeaders);
      var eventHandlers = Utils.cloneObject(options.eventHandlers);
      var rtcOfferConstraints = options.rtcOfferConstraints || this._rtcOfferConstraints || null;
      var sdpOffer = options.sdpOffer || false;
      var succeeded = false;
      extraHeaders.push("Contact: ".concat(this._contact));

      // Session Timers.
      if (this._sessionTimers.running) {
        extraHeaders.push("Session-Expires: ".concat(this._sessionTimers.currentExpires, ";refresher=").concat(this._sessionTimers.refresher ? 'uac' : 'uas'));
      }
      if (sdpOffer) {
        extraHeaders.push('Content-Type: application/sdp');
        this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
          return _this25._createLocalDescription('offer', rtcOfferConstraints);
        }).then(function (sdp) {
          sdp = _this25._mangleOffer(sdp);
          var e = {
            originator: 'local',
            type: 'offer',
            sdp: sdp
          };
          logger.debug('emit "sdp"');
          _this25.emit('sdp', e);
          _this25.sendRequest(JsSIP_C.UPDATE, {
            extraHeaders: extraHeaders,
            body: sdp,
            eventHandlers: {
              onSuccessResponse: function onSuccessResponse(response) {
                onSucceeded.call(_this25, response);
                succeeded = true;
              },
              onErrorResponse: function onErrorResponse(response) {
                onFailed.call(_this25, response);
              },
              onTransportError: function onTransportError() {
                _this25.onTransportError(); // Do nothing because session ends.
              },
              onRequestTimeout: function onRequestTimeout() {
                _this25.onRequestTimeout(); // Do nothing because session ends.
              },
              onDialogError: function onDialogError() {
                _this25.onDialogError(); // Do nothing because session ends.
              }
            }
          });
        })["catch"](function () {
          onFailed.call(_this25);
        });
      }

      // No SDP.
      else {
        this.sendRequest(JsSIP_C.UPDATE, {
          extraHeaders: extraHeaders,
          eventHandlers: {
            onSuccessResponse: function onSuccessResponse(response) {
              onSucceeded.call(_this25, response);
            },
            onErrorResponse: function onErrorResponse(response) {
              onFailed.call(_this25, response);
            },
            onTransportError: function onTransportError() {
              _this25.onTransportError(); // Do nothing because session ends.
            },
            onRequestTimeout: function onRequestTimeout() {
              _this25.onRequestTimeout(); // Do nothing because session ends.
            },
            onDialogError: function onDialogError() {
              _this25.onDialogError(); // Do nothing because session ends.
            }
          }
        });
      }
      function onSucceeded(response) {
        var _this26 = this;
        if (this._status === C.STATUS_TERMINATED) {
          return;
        }

        // If it is a 2XX retransmission exit now.
        if (succeeded) {
          return;
        }

        // Handle Session Timers.
        this._handleSessionTimersInIncomingResponse(response);

        // Must have SDP answer.
        if (sdpOffer) {
          if (!response.body) {
            onFailed.call(this);
            return;
          } else if (!response.hasHeader('Content-Type') || response.getHeader('Content-Type').toLowerCase() !== 'application/sdp') {
            onFailed.call(this);
            return;
          }
          var e = {
            originator: 'remote',
            type: 'answer',
            sdp: response.body
          };
          logger.debug('emit "sdp"');
          this.emit('sdp', e);
          var answer = new RTCSessionDescription({
            type: 'answer',
            sdp: e.sdp
          });
          this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
            return _this26._connection.setRemoteDescription(answer);
          }).then(function () {
            if (eventHandlers.succeeded) {
              eventHandlers.succeeded(response);
            }
          })["catch"](function (error) {
            onFailed.call(_this26);
            logger.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', error);
            _this26.emit('peerconnection:setremotedescriptionfailed', error);
          });
        }
        // No SDP answer.
        else if (eventHandlers.succeeded) {
          eventHandlers.succeeded(response);
        }
      }
      function onFailed(response) {
        if (eventHandlers.failed) {
          eventHandlers.failed(response);
        }
      }
    }
  }, {
    key: "_acceptAndTerminate",
    value: function _acceptAndTerminate(response, status_code, reason_phrase) {
      logger.debug('acceptAndTerminate()');
      var extraHeaders = [];
      if (status_code) {
        reason_phrase = reason_phrase || JsSIP_C.REASON_PHRASE[status_code] || '';
        extraHeaders.push("Reason: SIP ;cause=".concat(status_code, "; text=\"").concat(reason_phrase, "\""));
      }

      // An error on dialog creation will fire 'failed' event.
      if (this._dialog || this._createDialog(response, 'UAC')) {
        this.sendRequest(JsSIP_C.ACK);
        this.sendRequest(JsSIP_C.BYE, {
          extraHeaders: extraHeaders
        });
      }

      // Update session status.
      this._status = C.STATUS_TERMINATED;
    }

    /**
     * Correctly set the SDP direction attributes if the call is on local hold
     */
  }, {
    key: "_mangleOffer",
    value: function _mangleOffer(sdp) {
      if (!this._localHold && !this._remoteHold) {
        return sdp;
      }
      sdp = sdp_transform.parse(sdp);

      // Local hold.
      if (this._localHold && !this._remoteHold) {
        logger.debug('mangleOffer() | me on hold, mangling offer');
        var _iterator5 = _createForOfIteratorHelper(sdp.media),
          _step5;
        try {
          for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
            var m = _step5.value;
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
        } catch (err) {
          _iterator5.e(err);
        } finally {
          _iterator5.f();
        }
      }
      // Local and remote hold.
      else if (this._localHold && this._remoteHold) {
        logger.debug('mangleOffer() | both on hold, mangling offer');
        var _iterator6 = _createForOfIteratorHelper(sdp.media),
          _step6;
        try {
          for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
            var _m = _step6.value;
            if (holdMediaTypes.indexOf(_m.type) === -1) {
              continue;
            }
            _m.direction = 'inactive';
          }
        } catch (err) {
          _iterator6.e(err);
        } finally {
          _iterator6.f();
        }
      }
      // Remote hold.
      else if (this._remoteHold) {
        logger.debug('mangleOffer() | remote on hold, mangling offer');
        var _iterator7 = _createForOfIteratorHelper(sdp.media),
          _step7;
        try {
          for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
            var _m2 = _step7.value;
            if (holdMediaTypes.indexOf(_m2.type) === -1) {
              continue;
            }
            if (!_m2.direction) {
              _m2.direction = 'recvonly';
            } else if (_m2.direction === 'sendrecv') {
              _m2.direction = 'recvonly';
            } else if (_m2.direction === 'recvonly') {
              _m2.direction = 'inactive';
            }
          }
        } catch (err) {
          _iterator7.e(err);
        } finally {
          _iterator7.f();
        }
      }
      return sdp_transform.write(sdp);
    }
  }, {
    key: "_setLocalMediaStatus",
    value: function _setLocalMediaStatus() {
      var enableAudio = true,
        enableVideo = true;
      if (this._localHold || this._remoteHold) {
        enableAudio = false;
        enableVideo = false;
      }
      if (this._audioMuted) {
        enableAudio = false;
      }
      if (this._videoMuted) {
        enableVideo = false;
      }
      this._toggleMuteAudio(!enableAudio);
      this._toggleMuteVideo(!enableVideo);
    }

    /**
     * Handle SessionTimers for an incoming INVITE or UPDATE.
     * @param  {IncomingRequest} request
     * @param  {Array} responseExtraHeaders  Extra headers for the 200 response.
     */
  }, {
    key: "_handleSessionTimersInIncomingRequest",
    value: function _handleSessionTimersInIncomingRequest(request, responseExtraHeaders) {
      if (!this._sessionTimers.enabled) {
        return;
      }
      var session_expires_refresher;
      if (request.session_expires && request.session_expires >= JsSIP_C.MIN_SESSION_EXPIRES) {
        this._sessionTimers.currentExpires = request.session_expires;
        session_expires_refresher = request.session_expires_refresher || 'uas';
      } else {
        this._sessionTimers.currentExpires = this._sessionTimers.defaultExpires;
        session_expires_refresher = 'uas';
      }
      responseExtraHeaders.push("Session-Expires: ".concat(this._sessionTimers.currentExpires, ";refresher=").concat(session_expires_refresher));
      this._sessionTimers.refresher = session_expires_refresher === 'uas';
      this._runSessionTimer();
    }

    /**
     * Handle SessionTimers for an incoming response to INVITE or UPDATE.
     * @param  {IncomingResponse} response
     */
  }, {
    key: "_handleSessionTimersInIncomingResponse",
    value: function _handleSessionTimersInIncomingResponse(response) {
      if (!this._sessionTimers.enabled) {
        return;
      }
      var session_expires_refresher;
      if (response.session_expires && response.session_expires >= JsSIP_C.MIN_SESSION_EXPIRES) {
        this._sessionTimers.currentExpires = response.session_expires;
        session_expires_refresher = response.session_expires_refresher || 'uac';
      } else {
        this._sessionTimers.currentExpires = this._sessionTimers.defaultExpires;
        session_expires_refresher = 'uac';
      }
      this._sessionTimers.refresher = session_expires_refresher === 'uac';
      this._runSessionTimer();
    }
  }, {
    key: "_runSessionTimer",
    value: function _runSessionTimer() {
      var _this27 = this;
      var expires = this._sessionTimers.currentExpires;
      this._sessionTimers.running = true;
      clearTimeout(this._sessionTimers.timer);

      // I'm the refresher.
      if (this._sessionTimers.refresher) {
        this._sessionTimers.timer = setTimeout(function () {
          if (_this27._status === C.STATUS_TERMINATED) {
            return;
          }
          if (!_this27._isReadyToReOffer()) {
            return;
          }
          logger.debug('runSessionTimer() | sending session refresh request');
          if (_this27._sessionTimers.refreshMethod === JsSIP_C.UPDATE) {
            _this27._sendUpdate();
          } else {
            _this27._sendReinvite();
          }
        }, expires * 500); // Half the given interval (as the RFC states).
      }

      // I'm not the refresher.
      else {
        this._sessionTimers.timer = setTimeout(function () {
          if (_this27._status === C.STATUS_TERMINATED) {
            return;
          }
          logger.warn('runSessionTimer() | timer expired, terminating the session');
          _this27.terminate({
            cause: JsSIP_C.causes.REQUEST_TIMEOUT,
            status_code: 408,
            reason_phrase: 'Session Timer Expired'
          });
        }, expires * 1100);
      }
    }
  }, {
    key: "_toggleMuteAudio",
    value: function _toggleMuteAudio(mute) {
      var senders = this._connection.getSenders().filter(function (sender) {
        return sender.track && sender.track.kind === 'audio';
      });
      var _iterator8 = _createForOfIteratorHelper(senders),
        _step8;
      try {
        for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
          var sender = _step8.value;
          sender.track.enabled = !mute;
        }
      } catch (err) {
        _iterator8.e(err);
      } finally {
        _iterator8.f();
      }
    }
  }, {
    key: "_toggleMuteVideo",
    value: function _toggleMuteVideo(mute) {
      var senders = this._connection.getSenders().filter(function (sender) {
        return sender.track && sender.track.kind === 'video';
      });
      var _iterator9 = _createForOfIteratorHelper(senders),
        _step9;
      try {
        for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
          var sender = _step9.value;
          sender.track.enabled = !mute;
        }
      } catch (err) {
        _iterator9.e(err);
      } finally {
        _iterator9.f();
      }
    }
  }, {
    key: "_newRTCSession",
    value: function _newRTCSession(originator, request) {
      logger.debug('newRTCSession()');
      this._ua.newRTCSession(this, {
        originator: originator,
        session: this,
        request: request
      });
    }
  }, {
    key: "_connecting",
    value: function _connecting(request) {
      logger.debug('session connecting');
      logger.debug('emit "connecting"');
      this.emit('connecting', {
        request: request
      });
    }
  }, {
    key: "_progress",
    value: function _progress(originator, response) {
      logger.debug('session progress');
      logger.debug('emit "progress"');
      this.emit('progress', {
        originator: originator,
        response: response || null
      });
    }
  }, {
    key: "_accepted",
    value: function _accepted(originator, message) {
      logger.debug('session accepted');
      this._start_time = new Date();
      logger.debug('emit "accepted"');
      this.emit('accepted', {
        originator: originator,
        response: message || null
      });
    }
  }, {
    key: "_confirmed",
    value: function _confirmed(originator, ack) {
      logger.debug('session confirmed');
      this._is_confirmed = true;
      logger.debug('emit "confirmed"');
      this.emit('confirmed', {
        originator: originator,
        ack: ack || null
      });
    }
  }, {
    key: "_ended",
    value: function _ended(originator, message, cause) {
      logger.debug('session ended');
      this._end_time = new Date();
      this._close();
      logger.debug('emit "ended"');
      this.emit('ended', {
        originator: originator,
        message: message || null,
        cause: cause
      });
    }
  }, {
    key: "_failed",
    value: function _failed(originator, message, cause) {
      logger.debug('session failed');

      // Emit private '_failed' event first.
      logger.debug('emit "_failed"');
      this.emit('_failed', {
        originator: originator,
        message: message || null,
        cause: cause
      });
      this._close();
      logger.debug('emit "failed"');
      this.emit('failed', {
        originator: originator,
        message: message || null,
        cause: cause
      });
    }
  }, {
    key: "_onhold",
    value: function _onhold(originator) {
      logger.debug('session onhold');
      this._setLocalMediaStatus();
      logger.debug('emit "hold"');
      this.emit('hold', {
        originator: originator
      });
    }
  }, {
    key: "_onunhold",
    value: function _onunhold(originator) {
      logger.debug('session onunhold');
      this._setLocalMediaStatus();
      logger.debug('emit "unhold"');
      this.emit('unhold', {
        originator: originator
      });
    }
  }, {
    key: "_onmute",
    value: function _onmute(_ref5) {
      var audio = _ref5.audio,
        video = _ref5.video;
      logger.debug('session onmute');
      this._setLocalMediaStatus();
      logger.debug('emit "muted"');
      this.emit('muted', {
        audio: audio,
        video: video
      });
    }
  }, {
    key: "_onunmute",
    value: function _onunmute(_ref6) {
      var audio = _ref6.audio,
        video = _ref6.video;
      logger.debug('session onunmute');
      this._setLocalMediaStatus();
      logger.debug('emit "unmuted"');
      this.emit('unmuted', {
        audio: audio,
        video: video
      });
    }
  }], [{
    key: "C",
    get:
    /**
     * Expose C object.
     */
    function get() {
      return C;
    }
  }]);
}(EventEmitter);