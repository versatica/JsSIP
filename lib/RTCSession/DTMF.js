const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('JsSIP:RTCSession:DTMF');
const debugerror = require('debug')('JsSIP:ERROR:RTCSession:DTMF');

debugerror.log = console.warn.bind(console);
const JsSIP_C = require('../Constants');
const Exceptions = require('../Exceptions');
const RTCSession = require('../RTCSession');
const Utils = require('../Utils');

const C = {
  MIN_DURATION           : 70,
  MAX_DURATION           : 6000,
  DEFAULT_DURATION       : 100,
  MIN_INTER_TONE_GAP     : 50,
  DEFAULT_INTER_TONE_GAP : 500
};

module.exports = class DTMF extends EventEmitter
{
  constructor(session)
  {
    super();

    this._owner = session;
    this._direction = null;
    this._tone = null;
    this._duration = null;

    this._request = null;
  }

  get tone()
  {
    return this._tone;
  }

  get duration()
  {
    return this._duration;
  }

  send(tone, options = {})
  {
    if (tone === undefined)
    {
      throw new TypeError('Not enough arguments');
    }

    this._direction = 'outgoing';

    // Check RTCSession Status
    if (this._owner.status !== RTCSession.C.STATUS_CONFIRMED &&
      this._owner.status !== RTCSession.C.STATUS_WAITING_FOR_ACK)
    {
      throw new Exceptions.InvalidStateError(this._owner.status);
    }

    const extraHeaders = Utils.cloneArray(options.extraHeaders);

    this.eventHandlers = options.eventHandlers || {};

    // Check tone type
    if (typeof tone === 'string')
    {
      tone = tone.toUpperCase();
    }
    else if (typeof tone === 'number')
    {
      tone = tone.toString();
    }
    else
    {
      throw new TypeError(`Invalid tone: ${tone}`);
    }

    // Check tone value
    if (!tone.match(/^[0-9A-DR#*]$/))
    {
      throw new TypeError(`Invalid tone: ${tone}`);
    }
    else
    {
      this._tone = tone;
    }

    // Duration is checked/corrected in RTCSession
    this._duration = options.duration;

    extraHeaders.push('Content-Type: application/dtmf-relay');

    let body = `Signal=${this._tone}\r\n`;

    body += `Duration=${this._duration}`;

    this._owner.newDTMF({
      originator : 'local',
      dtmf       : this,
      request    : this._request
    });

    this._owner._dialog.sendRequest(this, JsSIP_C.INFO, {
      extraHeaders : extraHeaders,
      body         : body
    });
  }

  receiveResponse(response)
  {
    switch (true)
    {
      case /^1[0-9]{2}$/.test(response.status_code):
        // Ignore provisional responses.
        break;

      case /^2[0-9]{2}$/.test(response.status_code):
        this.emit('succeeded', {
          originator : 'remote',
          response   : response
        });
        break;

      default:
        if (this.eventHandlers.onFailed)
        {
          this.eventHandlers.onFailed();
        }

        this.emit('failed', {
          originator : 'remote',
          response   : response
        });
        break;
    }
  }

  onRequestTimeout()
  {
    debugerror('onRequestTimeout');
    this._owner.onRequestTimeout();
  }

  onTransportError()
  {
    debugerror('onTransportError');
    this._owner.onTransportError();
  }

  onDialogError()
  {
    debugerror('onDialogError');
    this._owner.onDialogError();
  }

  init_incoming(request)
  {
    const reg_tone = /^(Signal\s*?=\s*?)([0-9A-D#*]{1})(\s)?.*/;
    const reg_duration = /^(Duration\s?=\s?)([0-9]{1,4})(\s)?.*/;

    this._direction = 'incoming';
    this._request = request;

    request.reply(200);

    if (request.body)
    {
      const body = request.body.split('\n');

      if (body.length >= 1)
      {
        if (reg_tone.test(body[0]))
        {
          this._tone = body[0].replace(reg_tone, '$2');
        }
      }
      if (body.length >=2)
      {
        if (reg_duration.test(body[1]))
        {
          this._duration = parseInt(body[1].replace(reg_duration, '$2'), 10);
        }
      }
    }

    if (!this._duration)
    {
      this._duration = C.DEFAULT_DURATION;
    }

    if (!this._tone)
    {
      debug('invalid INFO DTMF received, discarded');
    }
    else
    {
      this._owner.newDTMF({
        originator : 'remote',
        dtmf       : this,
        request    : request
      });
    }
  }
};

/**
 * Expose C object.
 */
module.exports.C = C;
