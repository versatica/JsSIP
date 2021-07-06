const EventEmitter = require('events').EventEmitter;
const JsSIP_C = require('./Constants');
const Utils = require('./Utils');
const Dialog = require('./Dialog');
const debug = require('debug')('JsSIP:Notifier');
const debugerror = require('debug')('JsSIP:ERROR:Notifier');

debugerror.log = console.warn.bind(console);

/**
 * Termination codes. 
 */
const C = {
  // Termination codes.
  NOTIFY_RESPONSE_TIMEOUT      : 0, 
  NOTIFY_TRANSPORT_ERROR       : 1, 
  NOTIFY_NON_OK_RESPONSE       : 2, 
  NOTIFY_FAILED_AUTHENTICATION : 3,
  SEND_FINAL_NOTIFY            : 4, 
  RECEIVE_UNSUBSCRIBE          : 5, 
  SUBSCRIPTION_EXPIRED         : 6,

  // Notifer states
  STATE_PENDING    : 0,
  STATE_ACTIVE     : 1,
  STATE_TERMINATED : 2
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

  get C()
  {
    return C;
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
    debug('new');

    super();

    if (!subscribe)
    {
      throw new TypeError('subscribe is undefined');
    }

    if (!contentType)
    {
      throw new TypeError('contentType is undefined');
    }

    this._ua = ua;
    this._initial_subscribe = subscribe;
    this._expires_timestamp = null;
    this._expires_timer = null;

    // Notifier state: pending, active, terminated. Not used: init, resp_wait.
    this._state = pending ? C.STATE_PENDING : C.STATE_ACTIVE;

    // Optional. Used to build terminated Subscription-State.
    this._terminated_reason = null;
    this._terminated_retry_after = null;

    // Custom session empty object for high level use.
    this.data = {};

    this._dialog = null;
    
    const eventName = subscribe.getHeader('event');

    this._content_type = contentType;
    this._expires = parseInt(subscribe.getHeader('expires'));
    this._headers = Utils.cloneArray(extraHeaders);
    this._headers.push(`Event: ${eventName}`);

    // Use contact from extraHeaders or create it.
    this._contact = this._headers.find((header) => header.startsWith('Contact'));
    if (!this._contact)
    {
      this._contact = `Contact: <sip:${subscribe.to.uri.user}@${Utils.createRandomToken(12)}.invalid;transport=ws>`;

      this._headers.push(this._contact);
    }

    if (allowEvents)
    {
      this._headers.push(`Allow-Events: ${allowEvents}`);
    }

    this._target = subscribe.from.uri.user;
    subscribe.to_tag = Utils.newTag();

    // Create dialog for normal and fetch-subscribe.
    const dialog = new Dialog(this, subscribe, 'UAS');

    if (dialog.error)
    {
      debugerror(dialog.error);

      throw new Error('SUBSCRIBE missed Contact');
    }
      
    this._dialog = dialog;  

    if (this._expires > 0)
    {
      // Set expires timer and time-stamp.
      this._setExpiresTimer();
    }
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

    let expiresValue = request.getHeader('expires');

    if (expiresValue === undefined || expiresValue === null) 
    { 
      // Missed header Expires. RFC 6665 3.1.1. Set default expires value.  
      expiresValue = '900';
      debug(`Missed expires header. Set by default ${expiresValue}`);
    }

    this._expires = parseInt(expiresValue);
    request.reply(200, null, [ `Expires: ${this._expires}`, `${this._contact}` ]);

    const body = request.body;
    const content_type = request.getHeader('content-type');
    const is_unsubscribe = this._expires === 0;

    if (!is_unsubscribe)
    {
      this._setExpiresTimer();
    }

    debug('emit "subscribe"');
    this.emit('subscribe', is_unsubscribe, request, body, content_type);

    if (is_unsubscribe) 
    {
      this._dialogTerminated(C.RECEIVE_UNSUBSCRIBE);
    } 
  }

  /**
   * User API
   */
  /**
   * Please call after creating the Notifier instance and setting the event handlers.
   */
  start()
  {  
    debug('start()');

    this.receiveRequest(this._initial_subscribe);
  }

  /**
   * Switch pending dialog state to active.
   */
  setActiveState() 
  {
    debug('setActiveState()');

    if (this._state === C.STATE_PENDING) 
    {
      this._state = C.STATE_ACTIVE;
    }
  }
 
  /**
   *  Send the initial and subsequent notify request.
   *  @param {string} body - notify request body.
   */
  notify(body = null) 
  {
    debug('notify()');

    // Prevent send notify after final notify.
    if (!this._dialog)
    {
      debugerror('final notify has sent');

      return;
    }

    let subs_state = this._stateNumberToString(this._state);
 
    if (this._state !== C.STATE_TERMINATED) 
    {
      let expires = Math.floor((this._expires_timestamp - new Date().getTime()) / 1000);

      if (expires < 0)
      {
        expires = 0;
      }

      subs_state += `;expires=${expires}`;
    } 
    else 
    {
      if (this._terminated_reason) 
      {
        subs_state += `;reason=${this._terminated_reason}`;
      }
      if (this._terminated_retry_after !== null)
      {
        subs_state += `;retry-after=${this._terminated_retry_after}`;    
      }
    }

    const headers = this._headers.slice();

    headers.push(`Subscription-State: ${subs_state}`);

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
          this._dialogTerminated(C.NOTIFY_RESPONSE_TIMEOUT);
        },
        onTransportError : () =>
        {
          this._dialogTerminated(C.NOTIFY_TRANSPORT_ERROR);
        },
        onErrorResponse : (response) =>
        {
          if (response.status_code === 401 || response.status_code === 407)
          {
            this._dialogTerminated(C.NOTIFY_FAILED_AUTHENTICATION);
          }
          else 
          {
            this._dialogTerminated(C.NOTIFY_NON_OK_RESPONSE);
          }
        }, 
        onDialogError : () =>
        {
          this._dialogTerminated(C.NOTIFY_NON_OK_RESPONSE);
        } 
      }
    });
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
    debug('terminate()');
    
    this._state = C.STATE_TERMINATED;
    this._terminated_reason = reason;
    this._terminated_retry_after = retryAfter;

    this.notify(body);

    this._dialogTerminated(C.SEND_FINAL_NOTIFY);
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
   * Private API
   */
  _dialogTerminated(termination_code) 
  { 
    if (!this._dialog)
    {
      return;
    }

    this._state = C.STATE_TERMINATED;
    clearTimeout(this._expires_timer);

    if (this._dialog)
    {
      this._dialog.terminate();
      this._dialog = null;
    }

    const send_final_notify = termination_code === C.SUBSCRIPTION_EXPIRED;
  
    debug(`emit "terminated" code=${termination_code}, send final notify=${send_final_notify}`);
    this.emit('terminated', termination_code, send_final_notify);
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

      this._terminated_reason = 'timeout';
      this.notify();
      this._dialogTerminated(C.SUBSCRIPTION_EXPIRED);
    }, this._expires * 1000);
  }

  _stateNumberToString(state)
  {
    switch (state)
    {
      case C.STATE_PENDING: return 'pending';
      case C.STATE_ACTIVE: return 'active';
      case C.STATE_TERMINATED: return 'terminated';
      default: throw new TypeError('wrong state value');
    }
  }
};