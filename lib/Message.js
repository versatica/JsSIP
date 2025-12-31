const EventEmitter = require('events').EventEmitter;
const Logger = require('./Logger');
const JsSIP_C = require('./Constants');
const SIPMessage = require('./SIPMessage');
const Utils = require('./Utils');
const RequestSender = require('./RequestSender');
const Exceptions = require('./Exceptions');
const URI = require('./URI');

const logger = new Logger('Message');

module.exports = class Message extends EventEmitter
{
  constructor(ua)
  {
    super();

    this._ua = ua;
    this._request = null;
    this._closed = false;

    this._direction = null;
    this._local_identity = null;
    this._remote_identity = null;

    // Whether an incoming message has been replied.
    this._is_replied = false;

    // Custom message empty object for high level use.
    this._data = {};
  }

  get direction()
  {
    return this._direction;
  }

  get local_identity()
  {
    return this._local_identity;
  }

  get remote_identity()
  {
    return this._remote_identity;
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
    const eventHandlers = Utils.cloneObject(options.eventHandlers);
    const contentType = options.contentType || 'text/plain';

    const requestParams = {};
    if (options.callId !== undefined && options.callId !== null)
    {
      requestParams.call_id = String(options.callId);
    }

    if (options.fromUserName)
    {
      requestParams.from_uri = new URI('sip', options.fromUserName, this._ua.configuration.uri.host);

      extraHeaders.push(`P-Preferred-Identity: ${this._ua.configuration.uri.toString()}`);
    }

    if (options.fromDisplayName)
    {
      requestParams.from_display_name = options.fromDisplayName;
    }

    // Set event handlers.
    for (const event in eventHandlers)
    {
      if (Object.prototype.hasOwnProperty.call(eventHandlers, event))
      {
        this.on(event, eventHandlers[event]);
      }
    }

    extraHeaders.push(`Content-Type: ${contentType}`);

    this._request = new SIPMessage.OutgoingRequest(
      JsSIP_C.MESSAGE, target, this._ua, requestParams, extraHeaders);

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

    this._newMessage('local', this._request);

    request_sender.send();
  }

  init_incoming(request)
  {
    this._request = request;

    this._newMessage('remote', request);

    // Reply with a 200 OK if the user didn't reply.
    if (!this._is_replied)
    {
      this._is_replied = true;
      request.reply(200);
    }

    this._close();
  }

  /**
   * Accept the incoming Message
   * Only valid for incoming Messages
   */
  accept(options = {})
  {
    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const body = options.body;

    if (this._direction !== 'incoming')
    {
      throw new Exceptions.NotSupportedError('"accept" not supported for outgoing Message');
    }

    if (this._is_replied)
    {
      throw new Error('incoming Message already replied');
    }

    this._is_replied = true;
    this._request.reply(200, null, extraHeaders, body);
  }

  /**
   * Reject the incoming Message
   * Only valid for incoming Messages
   */
  reject(options = {})
  {
    const status_code = options.status_code || 480;
    const reason_phrase = options.reason_phrase;
    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const body = options.body;

    if (this._direction !== 'incoming')
    {
      throw new Exceptions.NotSupportedError('"reject" not supported for outgoing Message');
    }

    if (this._is_replied)
    {
      throw new Error('incoming Message already replied');
    }

    if (status_code < 300 || status_code >= 700)
    {
      throw new TypeError(`Invalid status_code: ${status_code}`);
    }

    this._is_replied = true;
    this._request.reply(status_code, reason_phrase, extraHeaders, body);
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

  /**
   * Internal Callbacks
   */

  _newMessage(originator, request)
  {
    if (originator === 'remote')
    {
      this._direction = 'incoming';
      this._local_identity = request.to;
      this._remote_identity = request.from;
    }
    else if (originator === 'local')
    {
      this._direction = 'outgoing';
      this._local_identity = request.from;
      this._remote_identity = request.to;
    }

    this._ua.newMessage(this, {
      originator,
      message : this,
      request
    });
  }

  _failed(originator, response, cause)
  {
    logger.debug('MESSAGE failed');

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
    logger.debug('MESSAGE succeeded');

    this._close();

    logger.debug('emit "succeeded"');

    this.emit('succeeded', {
      originator,
      response
    });
  }
};
