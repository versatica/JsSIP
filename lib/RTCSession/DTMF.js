module.exports = DTMF;


const C = {
  MIN_DURATION:            70,
  MAX_DURATION:            6000,
  DEFAULT_DURATION:        100,
  MIN_INTER_TONE_GAP:      50,
  DEFAULT_INTER_TONE_GAP:  500
};

/**
 * Expose C object.
 */
DTMF.C = C;


/**
 * Dependencies.
 */
const util = require('util');
const events = require('events');
const debug = require('debug')('JsSIP:RTCSession:DTMF');
const debugerror = require('debug')('JsSIP:ERROR:RTCSession:DTMF');
debugerror.log = console.warn.bind(console);
const JsSIP_C = require('../Constants');
const Exceptions = require('../Exceptions');
const RTCSession = require('../RTCSession');


function DTMF(session) {
  this.owner = session;
  this.direction = null;
  this.tone = null;
  this.duration = null;

  events.EventEmitter.call(this);
}

util.inherits(DTMF, events.EventEmitter);

DTMF.prototype.send = function(tone, options) {
  let extraHeaders, body;

  if (tone === undefined) {
    throw new TypeError('Not enough arguments');
  }

  this.direction = 'outgoing';

  // Check RTCSession Status
  if (this.owner.status !== RTCSession.C.STATUS_CONFIRMED &&
    this.owner.status !== RTCSession.C.STATUS_WAITING_FOR_ACK) {
    throw new Exceptions.InvalidStateError(this.owner.status);
  }

  // Get DTMF options
  options = options || {};
  extraHeaders = options.extraHeaders ? options.extraHeaders.slice() : [];
  this.eventHandlers = options.eventHandlers || {};

  // Check tone type
  if (typeof tone === 'string' ) {
    tone = tone.toUpperCase();
  } else if (typeof tone === 'number') {
    tone = tone.toString();
  } else {
    throw new TypeError('Invalid tone: '+ tone);
  }

  // Check tone value
  if (!tone.match(/^[0-9A-DR#*]$/)) {
    throw new TypeError('Invalid tone: '+ tone);
  } else {
    this.tone = tone;
  }

  // Duration is checked/corrected in RTCSession
  this.duration = options.duration;

  extraHeaders.push('Content-Type: application/dtmf-relay');

  body = 'Signal=' + this.tone + '\r\n';
  body += 'Duration=' + this.duration;

  this.owner.newDTMF({
    originator: 'local',
    dtmf: this,
    request: this.request
  });

  this.owner.dialog.sendRequest(this, JsSIP_C.INFO, {
    extraHeaders: extraHeaders,
    body: body
  });
};

DTMF.prototype.receiveResponse = function(response) {
  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      // Ignore provisional responses.
      break;

    case /^2[0-9]{2}$/.test(response.status_code):
      this.emit('succeeded', {
        originator: 'remote',
        response: response
      });
      break;

    default:
      if (this.eventHandlers.onFailed) {
        this.eventHandlers.onFailed();
      }

      this.emit('failed', {
        originator: 'remote',
        response: response
      });
      break;
  }
};

DTMF.prototype.onRequestTimeout = function() {
  debugerror('onRequestTimeout');
  this.owner.onRequestTimeout();
};

DTMF.prototype.onTransportError = function() {
  debugerror('onTransportError');
  this.owner.onTransportError();
};

DTMF.prototype.onDialogError = function() {
  debugerror('onDialogError');
  this.owner.onDialogError();
};

DTMF.prototype.init_incoming = function(request) {
  let body;
  const reg_tone = /^(Signal\s*?=\s*?)([0-9A-D#*]{1})(\s)?.*/;
  const reg_duration = /^(Duration\s?=\s?)([0-9]{1,4})(\s)?.*/;

  this.direction = 'incoming';
  this.request = request;

  request.reply(200);

  if (request.body) {
    body = request.body.split('\n');
    if (body.length >= 1) {
      if (reg_tone.test(body[0])) {
        this.tone = body[0].replace(reg_tone,'$2');
      }
    }
    if (body.length >=2) {
      if (reg_duration.test(body[1])) {
        this.duration = parseInt(body[1].replace(reg_duration,'$2'), 10);
      }
    }
  }

  if (!this.duration) {
    this.duration = C.DEFAULT_DURATION;
  }

  if (!this.tone) {
    debug('invalid INFO DTMF received, discarded');
  } else {
    this.owner.newDTMF({
      originator: 'remote',
      dtmf: this,
      request: request
    });
  }
};
