const EventEmitter = require('events').EventEmitter;
const Logger = require('./Logger');
const JsSIP_C = require('./Constants');
const Utils = require('./Utils');
const Grammar = require('./Grammar');
const SIPMessage = require('./SIPMessage');
const RequestSender = require('./RequestSender');
const Dialog = require('./Dialog');

const logger = new Logger('Subscriber');

/**
 * Termination codes.
 */
const C = {
  // Termination codes.
  SUBSCRIBE_RESPONSE_TIMEOUT      : 0,
  SUBSCRIBE_TRANSPORT_ERROR       : 1,
  SUBSCRIBE_NON_OK_RESPONSE       : 2,
  SUBSCRIBE_BAD_OK_RESPONSE       : 3,
  SUBSCRIBE_FAILED_AUTHENTICATION : 4,
  UNSUBSCRIBE_TIMEOUT             : 5,
  RECEIVE_FINAL_NOTIFY            : 6,
  RECEIVE_BAD_NOTIFY              : 7,

  // Subscriber states.
  STATE_PENDING     : 0,
  STATE_ACTIVE      : 1,
  STATE_TERMINATED  : 2,
  STATE_INIT        : 3,
  STATE_NOTIFY_WAIT : 4
};

/**
 * RFC 6665 Subscriber implementation.
 */
module.exports = class Subscriber extends EventEmitter
{
  /**
   * Expose C object.
   */
  static get C()
  {
    return C;
  }

  get C()
  {
    return C;
  }

  /**
   * @param {UA} ua - reference to JsSIP.UA
   * @param {string} target
   * @param {string} eventName - Event header value. May end with optional ;id=xxx
   * @param {string} accept - Accept header value.
   *
   * @param {SubscriberOption} options - optional parameters.
   *   @param {number} expires - Expires header value. Default is 900.
   *   @param {string} contentType - Content-Type header value. Used for SUBSCRIBE with body
   *   @param {string} allowEvents - Allow-Events header value.
   *   @param {RequestParams} params - Will have priority over ua.configuration.
   *      If set please define: to_uri, to_display_name, from_uri, from_display_name
   *   @param {Array<string>} extraHeaders - Additional SIP headers.
   */
  constructor(ua, target, eventName, accept, { expires, contentType,
    allowEvents, params, extraHeaders })
  {
    logger.debug('new');

    super();

    // Check that arguments are defined
    if (!target)
    {
      throw new TypeError('target is undefined');
    }

    if (!eventName)
    {
      throw new TypeError('eventName is undefined');
    }

    if (!accept)
    {
      throw new TypeError('accept is undefined');
    }

    this._ua = ua;
    this._target = target;

    if (expires !== 0 && !expires)
    {
      expires = 900;
    }

    this._expires = expires;

    // Used to subscribe with body.
    this._content_type = contentType;

    // Set initial subscribe parameters.
    this._params = Utils.cloneObject(params);

    if (!this._params.from_uri)
    {
      this._params.from_uri = this._ua.configuration.uri;
    }

    this._params.from_tag = Utils.newTag();
    this._params.to_tag = null;
    this._params.call_id = Utils.createRandomToken(20);

    // Create subscribe cseq if not defined custom cseq.
    if (this._params.cseq === undefined)
    {
      this._params.cseq = Math.floor((Math.random() * 10000) + 1);
    }

    // Subscriber state.
    this._state = C.STATE_INIT;

    // Dialog
    this._dialog = null;

    // To refresh subscription.
    this._expires_timer = null;
    this._expires_timestamp = null;

    // To prevent duplicate terminated call.
    this._terminated = false;

    // After send un-subscribe wait final notify limited time.
    this._unsubscribe_timeout_timer = null;

    // Custom session empty object for high level use.
    this.data = {};

    const parsed = Grammar.parse(eventName, 'Event');

    if (parsed === -1)
    {
      throw new TypeError('eventName - wrong format');
    }

    this._event_name = parsed.event;
    this._event_id = parsed.params && parsed.params.id;

    let eventValue = this._event_name;

    if (this._event_id)
    {
      eventValue += `;id=${this._event_id}`;
    }

    this._headers = Utils.cloneArray(extraHeaders);
    this._headers = this._headers.concat([
      `Event: ${eventValue}`,
      `Expires: ${this._expires}`,
      `Accept: ${accept}`
    ]);

    if (!this._headers.find((header) => header.startsWith('Contact')))
    {

      const contact = `Contact: ${this._ua._contact.toString()}`;

      this._headers.push(contact);
    }

    if (allowEvents)
    {
      this._headers.push(`Allow-Events: ${allowEvents}`);
    }

    // To enqueue subscribes created before receive initial subscribe OK.
    this._queue = [];
  }

  onRequestTimeout()
  {
    this._dialogTerminated(C.SUBSCRIBE_RESPONSE_TIMEOUT);
  }

  onTransportError()
  {
    this._dialogTerminated(C.SUBSCRIBE_TRANSPORT_ERROR);
  }

  /**
   * Dialog callback.
   */
  receiveRequest(request)
  {
    if (request.method !== JsSIP_C.NOTIFY)
    {
      logger.warn('received non-NOTIFY request');
      request.reply(405);

      return;
    }

    // RFC 6665 8.2.1. Check if event header matches.
    const event_header = request.parseHeader('Event');

    if (!event_header)
    {
      logger.warn('missed Event header');
      request.reply(400);
      this._dialogTerminated(C.RECEIVE_BAD_NOTIFY);

      return;
    }

    const event_name = event_header.event;
    const event_id = event_header.params && event_header.params.id;

    if (event_name !== this._event_name || event_id !== this._event_id)
    {
      logger.warn('Event header does not match SUBSCRIBE');
      request.reply(489);
      this._dialogTerminated(C.RECEIVE_BAD_NOTIFY);

      return;
    }

    // Process Subscription-State header.
    const subs_state = request.parseHeader('subscription-state');

    if (!subs_state)
    {
      logger.warn('missed Subscription-State header');
      request.reply(400);
      this._dialogTerminated(C.RECEIVE_BAD_NOTIFY);

      return;
    }

    request.reply(200);

    const new_state = this._stateStringToNumber(subs_state.state);
    const prev_state = this._state;

    if (prev_state !== C.STATE_TERMINATED && new_state !== C.STATE_TERMINATED)
    {
      this._state = new_state;

      if (subs_state.expires !== undefined)
      {
        const expires = subs_state.expires;
        const expires_timestamp = new Date().getTime() + (expires * 1000);
        const max_time_deviation = 2000;

        // Expiration time is shorter and the difference is not too small.
        if (this._expires_timestamp - expires_timestamp > max_time_deviation)
        {
          logger.debug('update sending re-SUBSCRIBE time');

          this._scheduleSubscribe(expires);
        }
      }
    }

    if (prev_state !== C.STATE_PENDING && new_state === C.STATE_PENDING)
    {
      logger.debug('emit "pending"');
      this.emit('pending');
    }
    else if (prev_state !== C.STATE_ACTIVE && new_state === C.STATE_ACTIVE)
    {
      logger.debug('emit "active"');
      this.emit('active');
    }

    const body = request.body;

    // Check if the notify is final.
    const is_final = new_state === C.STATE_TERMINATED;

    // Notify event fired only for notify with body.
    if (body)
    {
      const content_type = request.getHeader('content-type');

      logger.debug('emit "notify"');
      this.emit('notify', is_final, request, body, content_type);
    }

    if (is_final)
    {
      const reason = subs_state.reason;
      let retry_after = undefined;

      if (subs_state.params && subs_state.params['retry-after'] !== undefined)
      {
        retry_after = parseInt(subs_state.params['retry-after']);
      }

      this._dialogTerminated(C.RECEIVE_FINAL_NOTIFY, reason, retry_after);
    }
  }

  /**
   * User API
   */

  /**
   * Send the initial (non-fetch)  and subsequent subscribe.
   * @param {string} body - subscribe request body.
   */
  subscribe(body = null)
  {
    logger.debug('subscribe()');

    if (this._state === C.STATE_INIT)
    {
      this._sendInitialSubscribe(body, this._headers);
    }
    else
    {
      this._sendSubsequentSubscribe(body, this._headers);
    }
  }

  /**
   * terminate.
   * Send un-subscribe or fetch-subscribe (with Expires: 0).
   * @param {string} body - un-subscribe request body
   */
  terminate(body = null)
  {
    logger.debug('terminate()');

    // Prevent duplication un-subscribe sending.
    if (this._terminated)
    {

      return;
    }
    this._terminated = true;

    // Set header Expires: 0.
    const headers = this._headers.map((header) =>
    {
      return header.startsWith('Expires') ? 'Expires: 0' : header;
    });

    if (this._state === C.STATE_INIT)
    {
      // fetch-subscribe - initial subscribe with Expires: 0.
      this._sendInitialSubscribe(body, headers);
    }
    else
    {
      this._sendSubsequentSubscribe(body, headers);
    }

    // Waiting for the final notify for a while.
    const final_notify_timeout = 30000;

    this._unsubscribe_timeout_timer = setTimeout(() =>
    {
      this._dialogTerminated(C.UNSUBSCRIBE_TIMEOUT);
    }, final_notify_timeout);
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

  /**
   * Private API.
   */
  _sendInitialSubscribe(body, headers)
  {
    if (body)
    {
      if (!this._content_type)
      {
        throw new TypeError('content_type is undefined');
      }

      headers = headers.slice();
      headers.push(`Content-Type: ${this._content_type}`);
    }

    this._state = C.STATE_NOTIFY_WAIT;

    const request = new SIPMessage.OutgoingRequest(JsSIP_C.SUBSCRIBE,
      this._ua.normalizeTarget(this._target), this._ua, this._params, headers, body);

    const request_sender = new RequestSender(this._ua, request, {
      onRequestTimeout : () =>
      {
        this.onRequestTimeout();
      },
      onTransportError : () =>
      {
        this.onTransportError();
      },
      onReceiveResponse : (response) =>
      {
        this._receiveSubscribeResponse(response);
      }
    });

    request_sender.send();
  }

  _receiveSubscribeResponse(response)
  {
    if (response.status_code >= 200 && response.status_code < 300)
    {
      // Create dialog
      if (this._dialog === null)
      {
        const dialog = new Dialog(this, response, 'UAC');

        if (dialog.error)
        {
          // OK response without Contact
          logger.warn(dialog.error);
          this._dialogTerminated(C.SUBSCRIBE_BAD_OK_RESPONSE);

          return;
        }

        this._dialog = dialog;

        logger.debug('emit "accepted"');
        this.emit('accepted');

        // Subsequent subscribes saved in the queue until dialog created.
        for (const subscribe of this._queue)
        {
          logger.debug('dequeue subscribe');

          this._sendSubsequentSubscribe(subscribe.body, subscribe.headers);
        }
      }

      // Check expires value.
      let expires_value = response.getHeader('expires');

      if (expires_value !== 0 && !expires_value)
      {
        logger.warn('response without Expires header');

        // RFC 6665 3.1.1 subscribe OK response must contain Expires header.
        // Use workaround expires value.
        expires_value = '900';
      }

      const expires = parseInt(expires_value);

      if (expires > 0)
      {
        this._scheduleSubscribe(expires);
      }
    }
    else if (response.status_code === 401 || response.status_code === 407)
    {
      this._dialogTerminated(C.SUBSCRIBE_FAILED_AUTHENTICATION);
    }
    else if (response.status_code >= 300)
    {
      this._dialogTerminated(C.SUBSCRIBE_NON_OK_RESPONSE);
    }
  }

  _sendSubsequentSubscribe(body, headers)
  {
    if (this._state === C.STATE_TERMINATED)
    {
      return;
    }

    if (!this._dialog)
    {
      logger.debug('enqueue subscribe');

      this._queue.push({ body, headers: headers.slice() });

      return;
    }

    if (body)
    {
      if (!this._content_type)
      {
        throw new TypeError('content_type is undefined');
      }

      headers = headers.slice();
      headers.push(`Content-Type: ${this._content_type}`);
    }

    this._dialog.sendRequest(JsSIP_C.SUBSCRIBE, {
      body,
      extraHeaders  : headers,
      eventHandlers : {
        onRequestTimeout : () =>
        {
          this.onRequestTimeout();
        },
        onTransportError : () =>
        {
          this.onTransportError();
        },
        onSuccessResponse : (response) =>
        {
          this._receiveSubscribeResponse(response);
        },
        onErrorResponse : (response) =>
        {
          this._receiveSubscribeResponse(response);
        },
        onDialogError : (response) =>
        {
          this._receiveSubscribeResponse(response);
        }
      }
    });
  }

  _dialogTerminated(terminationCode, reason = undefined, retryAfter = undefined)
  {
    // To prevent duplicate emit terminated event.
    if (this._state === C.STATE_TERMINATED)
    {
      return;
    }

    this._state = C.STATE_TERMINATED;

    // Clear timers.
    clearTimeout(this._expires_timer);
    clearTimeout(this._unsubscribe_timeout_timer);

    if (this._dialog)
    {
      this._dialog.terminate();
      this._dialog = null;
    }

    logger.debug(`emit "terminated" code=${terminationCode}`);
    this.emit('terminated', terminationCode, reason, retryAfter);
  }

  _scheduleSubscribe(expires)
  {
    /*
      If the expires time is less than 140 seconds we do not support Chrome intensive timer throttling mode.
      In this case, the re-subcribe is sent 5 seconds before the subscription expiration.

      When Chrome is in intensive timer throttling mode, in the worst case,
	  the timer will be 60 seconds late.
      We give the server 10 seconds to make sure it will execute the command even if it is heavily loaded.
      As a result, we order the time no later than 70 seconds before the subscription expiration.
      Resulting time calculated as half time interval + (half interval - 70) * random.

      E.g. expires is 140, re-subscribe will be ordered to send in 70 seconds.
	       expires is 600, re-subscribe will be ordered to send in 300 + (0 .. 230) seconds.
	 */

    const timeout = expires >= 140 ? (expires * 1000 / 2)
     + Math.floor(((expires / 2) - 70) * 1000 * Math.random()) : (expires * 1000) - 5000;

    this._expires_timestamp = new Date().getTime() + (expires * 1000);

    logger.debug(`next SUBSCRIBE will be sent in ${Math.floor(timeout / 1000)} sec`);

    clearTimeout(this._expires_timer);
    this._expires_timer = setTimeout(() =>
    {
      this._expires_timer = null;
      this._sendSubsequentSubscribe(null, this._headers);
    }, timeout);
  }

  _stateStringToNumber(strState)
  {
    switch (strState)
    {
      case 'pending': return C.STATE_PENDING;
      case 'active': return C.STATE_ACTIVE;
      case 'terminated': return C.STATE_TERMINATED;
      case 'init': return C.STATE_INIT;
      case 'notify_wait': return C.STATE_NOTIFY_WAIT;
      default: throw new TypeError('wrong state value');
    }
  }
};
