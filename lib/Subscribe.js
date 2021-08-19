const EventEmitter = require('events').EventEmitter;
const Logger = require('./Logger');
const JsSIP_C = require('./Constants');
const SIPMessage = require('./SIPMessage');
const Utils = require('./Utils');
const RequestSender = require('./RequestSender');

const logger = new Logger('Subscribe');

module.exports = class Subscribe extends EventEmitter
{
  constructor(ua)
  {
    super();

    this._ua = ua;
    this._request = null;

  }

  send(target, body, options = {})
  {
    const originalTarget = target;

    if (target === undefined || body === undefined)
    {
      throw new TypeError('Not enough arguments');
    }

    // Check target validity.
    target = this._ua.normalizeTarget(target);
    if (!target)
    {
      throw new TypeError(`Invalid target: ${originalTarget}`);
    }

    // Get call options.
    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const subscriptionDuration = options.subscriptionDuration || 1;
    const contentType = options.contentType || 'text/plain';
    const eventType = options.eventType;

    extraHeaders.push(`Content-Type: ${contentType}`);
    if (eventType === 'message-summary')
    {
      extraHeaders.push(`Contact: ${target}`);
      extraHeaders.push(`Expires: ${subscriptionDuration}`);
      extraHeaders.push(`Event: ${eventType}`);  
    }

    this._request = new SIPMessage.OutgoingRequest(
      JsSIP_C.SUBSCRIBE, target, this._ua, null, extraHeaders);

    if (body)
    {
      this._request.body = body;
    }

    const request_sender = new RequestSender(this._ua, this._request, {
      onRequestTimeout : () =>
      {
        this._onRequestTimeout();
      },
      onTransportError : () =>
      {
        this._onTransportError();
      },
      onReceiveResponse : (response) =>
      {
        this._receiveResponse(response);
      }
    });

    request_sender.send();
  }

  _receiveResponse(response)
  {
    if (this._closed)
    {
      return;
    }
    switch (true)
    {
      case /^1[0-9]{2}$/.test(response.status_code):
        // Ignore provisional responses.
        break;

      case /^2[0-9]{2}$/.test(response.status_code):
        this._succeeded('remote', response);
        break;

      default:
      {
        const cause = Utils.sipErrorCause(response.status_code);

        this._failed('remote', response, cause);
        break;
      }
    }
  }

  _onRequestTimeout()
  {
    if (this._closed)
    {
      return;
    }
    this._failed('system', null, JsSIP_C.causes.REQUEST_TIMEOUT);
  }

  _onTransportError()
  {
    if (this._closed)
    {
      return;
    }
    this._failed('system', null, JsSIP_C.causes.CONNECTION_ERROR);
  }

  _close()
  {
    this._closed = true;
    this._ua.destroyMessage(this);
  }


  _failed(originator, response, cause)
  {
    logger.debug('SUBSCRIBE failed');

    this._close();

    logger.debug('emit "failed"');

    this.emit('failed', {
      originator,
      response : response || null,
      cause
    });
  }

  _succeeded(originator, response)
  {
    logger.debug('SUBSCRIBEsucceeded');

    this._close();

    logger.debug('emit "succeeded"');

    this.emit('succeeded', {
      originator,
      response
    });
  }
};
