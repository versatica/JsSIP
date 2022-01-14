const EventEmitter = require('events').EventEmitter;
const Logger = require('../Logger');
const JsSIP_C = require('../Constants');
const Exceptions = require('../Exceptions');
const Utils = require('../Utils');

const logger = new Logger('RTCSession:DTMF');

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

    this._session = session;
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

    // Check RTCSession Status.
    if (this._session.status !== this._session.C.STATUS_CONFIRMED &&
      this._session.status !== this._session.C.STATUS_WAITING_FOR_ACK)
    {
      throw new Exceptions.InvalidStateError(this._session.status);
    }

    const extraHeaders = Utils.cloneArray(options.extraHeaders);

    this.eventHandlers = Utils.cloneObject(options.eventHandlers);

    // Check tone type.
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

    // Check tone value.
    if (!tone.match(/^[0-9A-DR#*]$/))
    {
      throw new TypeError(`Invalid tone: ${tone}`);
    }
    else
    {
      this._tone = tone;
    }

    // Duration is checked/corrected in RTCSession.
    this._duration = options.duration;

    extraHeaders.push('Content-Type: application/dtmf-relay');

    let body = `Signal=${this._tone}\r\n`;

    body += `Duration=${this._duration}\r\n`;

    this._session.newDTMF({
      originator : 'local',
      dtmf       : this,
      request    : this._request
    });

    this._session.sendRequest(JsSIP_C.INFO, {
      extraHeaders,
      eventHandlers : {
        onSuccessResponse : (response) =>
        {
          this.emit('succeeded', {
            originator : 'remote',
            response
          });
        },
        onErrorResponse : (response) =>
        {
          if (this.eventHandlers.onFailed)
          {
            this.eventHandlers.onFailed();
          }

          this.emit('failed', {
            originator : 'remote',
            response
          });
        },
        onRequestTimeout : () =>
        {
          this._session.onRequestTimeout();
        },
        onTransportError : () =>
        {
          this._session.onTransportError();
        },
        onDialogError : () =>
        {
          this._session.onDialogError();
        }
      },
      body
    });
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
      logger.debug('invalid INFO DTMF received, discarded');
    }
    else
    {
      this._session.newDTMF({
        originator : 'remote',
        dtmf       : this,
        request
      });
    }
  }
};

/**
 * Expose C object.
 */
module.exports.C = C;
