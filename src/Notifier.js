const EventEmitter = require('events').EventEmitter;
const Exceptions = require('./Exceptions');
const Logger = require('./Logger');
const JsSIP_C = require('./Constants');
const Utils = require('./Utils');
const Dialog = require('./Dialog');

const logger = new Logger('Notifier');

/**
 * Termination codes.
 */
const C = {
  // Termination codes.
  NOTIFY_RESPONSE_TIMEOUT      : 0,
  NOTIFY_TRANSPORT_ERROR       : 1,
  NOTIFY_NON_OK_RESPONSE       : 2,
  NOTIFY_AUTHENTICATION_FAILED : 3,
  FINAL_NOTIFY_SENT            : 4,
  UNSUBSCRIBE_RECEIVED         : 5,
  SUBSCRIPTION_EXPIRED         : 6,

  // Notifer states.
  STATE_PENDING    : 0,
  STATE_ACTIVE     : 1,
  STATE_TERMINATED : 2,

  // RFC 6665 3.1.1, default expires value.
  DEFAULT_EXPIRES_MS : 900
};

/**
 * RFC 6665 Notifier implementation.
 */
module.exports = class Notifier extends EventEmitter
{
  /**
   * Expose C object.
   */
  static get C()
  {
    return C;
  }

  static init_incoming(request, callback)
  {
    if (request.method !== JsSIP_C.SUBSCRIBE || !request.hasHeader('contact') || !request.hasHeader('event'))
    {
      logger.debug('Notifier.init_incoming: invalid request');

      request.reply(405);

      return;
    }
    callback();
  }

  /**
   * @param {UA} ua - JsSIP User Agent instance.
   * @param {IncomingRequest} subscribe - Subscribe request.
   * @param {string} contentType - Content-Type header value.
   * @param {NotifierOptions} options - Optional parameters.
   *   @param {Array<string>}  extraHeaders - Additional SIP headers.
   *   @param {string} allowEvents - Allow-Events header value.
   *   @param {boolean} pending - Set initial dialog state as "pending".
   */
  constructor(ua, subscribe, contentType, { extraHeaders, allowEvents, pending })
  {
    logger.debug('new');

    super();

    if (!subscribe)
    {
      throw new TypeError('Not enough arguments. Missing subscribe request');
    }

    if (!subscribe.hasHeader('contact'))
    {
      throw new TypeError('Missing Contact header in subscribe request');
    }

    if (!contentType)
    {
      throw new TypeError('Not enough arguments. Missing contentType');
    }

    const eventName = subscribe.getHeader('event');

    if (!eventName)
    {
      throw new TypeError('Missing Event header in subscribe request');
    }

    this._ua = ua;
    this._initial_subscribe = subscribe;
    this._expires_timestamp = null;
    this._expires_timer = null;

    // Notifier state: pending, active, terminated.
    this._state = pending ? C.STATE_PENDING : C.STATE_ACTIVE;

    this._content_type = contentType;
    this._expires = parseInt(subscribe.getHeader('expires'));
    this._headers = Utils.cloneArray(extraHeaders);
    this._headers.push(`Event: ${eventName}`);

    // Use contact from extraHeaders or create it.
    this._contact = this._headers.find((header) => header.startsWith('Contact'));
    if (!this._contact)
    {
      this._contact = `Contact: ${this._ua._contact.toString()}`;

      this._headers.push(this._contact);
    }

    if (allowEvents)
    {
      this._headers.push(`Allow-Events: ${allowEvents}`);
    }

    this._target = subscribe.from.uri.user;
    subscribe.to_tag = Utils.newTag();

    // Create dialog for normal and fetch-subscribe.
    this._dialog = new Dialog(this, subscribe, 'UAS');

    if (this._expires > 0)
    {
      // Set expires timer and time-stamp.
      this._setExpiresTimer();
    }

    // Custom session empty object for high level use.
    this._data = {};
  }

  // Expose Notifier constants as a property of the Notifier instance.
  get C()
  {
    return C;
  }

  /**
   * Get dialog state.
   */
  get state()
  {
    return this._state;
  }

  /**
   * Get dialog id.
   */
  get id()
  {
    return this._dialog ? this._dialog.id : null;
  }

  get data()
  {
    return this._data;
  }

  set data(_data)
  {
    this._data = _data;
  }

  /**
   * Dialog callback.
   * Called also for initial subscribe.
   * Supported RFC 6665 4.4.3: initial fetch subscribe (with expires: 0).
   */
  receiveRequest(request)
  {
    if (request.method !== JsSIP_C.SUBSCRIBE)
    {
      request.reply(405);

      return;
    }

    if (request.hasHeader('expires'))
    {
      this._expires = parseInt(request.getHeader('expires'));
    }
    else
    {
      this._expires = C.DEFAULT_EXPIRES_MS;

      logger.debug(`missing Expires header field, default value set: ${this._expires}`);
    }
    request.reply(200, null, [ `Expires: ${this._expires}`, `${this._contact}` ]);

    const body = request.body;
    const content_type = request.getHeader('content-type');
    const is_unsubscribe = this._expires === 0;

    if (!is_unsubscribe)
    {
      this._setExpiresTimer();
    }

    logger.debug('emit "subscribe"');

    this.emit('subscribe', is_unsubscribe, request, body, content_type);

    if (is_unsubscribe)
    {
      this._terminateDialog(C.UNSUBSCRIBE_RECEIVED);
    }
  }

  /**
   * User API
   */

  /**
   * Call this method after creating the Notifier instance and setting the event handlers.
   */
  start()
  {
    logger.debug('start()');

    if (this._state === C.STATE_TERMINATED)
    {
      throw new Exceptions.InvalidStateError(this._state);
    }

    this.receiveRequest(this._initial_subscribe);
  }

  /**
   * Switch pending dialog state to active.
   */
  setActiveState()
  {
    logger.debug('setActiveState()');

    if (this._state === C.STATE_TERMINATED)
    {
      throw new Exceptions.InvalidStateError(this._state);
    }

    if (this._state === C.STATE_PENDING)
    {
      this._state = C.STATE_ACTIVE;
    }
  }

  /**
   *  Send the initial and subsequent notify request.
   *  @param {string} body - notify request body.
   */
  notify(body=null)
  {
    logger.debug('notify()');

    if (this._state === C.STATE_TERMINATED)
    {
      throw new Exceptions.InvalidStateError(this._state);
    }

    let expires = Math.floor((this._expires_timestamp - new Date().getTime()) / 1000);

    if (expires < 0)
    {
      expires = 0;
    }

    this._sendNotify([ `;expires=${expires}` ], body);
  }

  /**
   *  Terminate. (Send the final NOTIFY request).
   *
   * @param {string} body - Notify message body.
   * @param {string} reason - Set Subscription-State reason parameter.
   * @param {number} retryAfter - Set Subscription-State retry-after parameter.
   */
  terminate(body = null, reason = null, retryAfter = null)
  {
    if (this._state === C.STATE_TERMINATED)
    {
      return;
    }

    logger.debug('terminate()');

    this._state = C.STATE_TERMINATED;
    const subsStateParameters = [];

    if (reason)
    {
      subsStateParameters.push(`;reason=${reason}`);
    }

    if (retryAfter !== null)
    {
      subsStateParameters.push(`;retry-after=${retryAfter}`);
    }

    this._sendNotify(subsStateParameters, body);

    this._terminateDialog(reason === 'timeout' ? C.SUBSCRIPTION_EXPIRED : C.FINAL_NOTIFY_SENT);
  }

  /**
   * Private API
   */

  /**
   * @param {Array<string>} subsStateParams subscription state parameters.
   * @param {String} body Notify body
   * @param {Array<string>} extraHeaders
   */
  _sendNotify(subsStateParameters, body=null, extraHeaders=null)
  {
    // Prevent send notify after final notify.
    if (!this._dialog)
    {
      logger.warn('final notify already sent');

      return;
    }

    // Build Subscription-State header with parameters.
    let subsState = `Subscription-State: ${this._parseState()}`;

    for (const param of subsStateParameters)
    {
      subsState += param;
    }

    let headers = Utils.cloneArray(this._headers);

    headers.push(subsState);

    if (extraHeaders)
    {
      headers = headers.concat(extraHeaders);
    }

    if (body)
    {
      headers.push(`Content-Type: ${this._content_type}`);
    }

    this._dialog.sendRequest(JsSIP_C.NOTIFY, {
      body,
      extraHeaders  : headers,
      eventHandlers : {
        onRequestTimeout : () =>
        {
          this._terminateDialog(C.NOTIFY_RESPONSE_TIMEOUT);
        },
        onTransportError : () =>
        {
          this._terminateDialog(C.NOTIFY_TRANSPORT_ERROR);
        },
        onErrorResponse : (response) =>
        {
          if (response.status_code === 401 || response.status_code === 407)
          {
            this._terminateDialog(C.NOTIFY_AUTHENTICATION_FAILED);
          }
          else
          {
            this._terminateDialog(C.NOTIFY_NON_OK_RESPONSE);
          }
        },
        onDialogError : () =>
        {
          this._terminateDialog(C.NOTIFY_NON_OK_RESPONSE);
        }
      }
    });
  }

  _terminateDialog(termination_code)
  {
    if (!this._dialog)
    {
      return;
    }

    this._state = C.STATE_TERMINATED;
    clearTimeout(this._expires_timer);

    this._dialog.terminate();
    this._dialog = null;

    logger.debug(`emit "terminated" code=${termination_code}`);

    this.emit('terminated', termination_code);
  }

  _setExpiresTimer()
  {
    this._expires_timestamp = new Date().getTime() + (this._expires * 1000);

    clearTimeout(this._expires_timer);
    this._expires_timer = setTimeout(() =>
    {
      if (!this._dialog)
      {
        return;
      }

      logger.debug('emit "expired"');

      // Client can hook into the 'expired' event and call terminate to send a custom notify.
      this.emit('expired');

      // This will be no-op if the client already called `terminate()`.
      this.terminate('', 'timeout');
    }, this._expires * 1000);
  }

  _parseState()
  {
    switch (this._state)
    {
      case C.STATE_PENDING: return 'pending';
      case C.STATE_ACTIVE: return 'active';
      case C.STATE_TERMINATED: return 'terminated';
      default: throw new TypeError('wrong state value');
    }
  }
};
