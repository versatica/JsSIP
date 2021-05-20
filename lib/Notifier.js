const EventEmitter = require('events').EventEmitter;
const JsSIP_C = require('./Constants');
const Utils = require('./Utils');
const debug = require('debug')('JsSIP:Notifier');
const debugerror = require('debug')('JsSIP:ERROR:Notifier');

debugerror.log = console.warn.bind(console);

module.exports = class Notifier extends EventEmitter 
{
  constructor(ua, { subscribe, content_type, headers, credential, pending }) 
  {
    super();
    this._ua = ua;
    this.expires_timestamp = null;
    this.expires_timer = null;
    this._state = pending ? 'pending' : 'active';
    this.is_final_notify_sent = false;
    this.is_first_notify_response = true;
    this.id = null;
    this.event_name = subscribe.getHeader('event');
    this.content_type = content_type;
    if (!content_type)
      throw new TypeError('content_type is undefined');
    this.expires = parseInt(subscribe.getHeader('expires'));
    this.credential = credential;
    const user = subscribe.to.uri.user;
    const domain = subscribe.to.uri.host;

    this.contact = `<sip:${user}@${domain};transport=ws>`;
    this.rcseq = subscribe.cseq;
    this.data = {}; // Custom session empty object for high level use.
    this.headers = headers ? headers : [];
    this.target = subscribe.from.uri.user;
    subscribe.to_tag = Utils.newTag();
    this.params = {
      from     : subscribe.to,
      from_tag : subscribe.to_tag,
      to       : subscribe.from,
      to_tag   : subscribe.from_tag,
      call_id  : subscribe.call_id,
      cseq     : Math.floor((Math.random() * 10000) + 1)
    };
    this.id = `${this.params.call_id}${this.params.from_tag}${this.params.to_tag}`;
    debug('add dialog id=', this.id);
    this._ua.newDialog(this);
    this._setExpiresTimestamp();
    this._setExpiresTimer();
    subscribe.reply(200, null, [ `Expires: ${this.expires}`, `Contact: ${this.contact}` ]);
    this.is_terminated = false;
    this.terminated_reason = undefined;
  }

  /**
   * Callbacks
   */
  onAuthenticated() 
  {
    this.params.cseq++;
  }

  onRequestTimeout() 
  {
    this._dialogTerminated('notify response timeout');
  }

  onTransportError() 
  {
    this._dialogTerminated('notify transport error');
  }

  onReceiveResponse(response) 
  {
    if (response.status_code >= 200 && response.status_code < 300) 
    {
      if (this.is_first_notify_response) 
      {
        this.is_first_notify_response = false;
        this.route_set = response.getHeaders('record-route').reverse();
        if (this.route_set.length > 0)
          this.params.route_set = this.route_set;
      }
    } 
    else if (response.status_code >= 300) 
    {
      this._dialogTerminated('receive notify non-OK response');
    }
  }

  receiveRequest(request) 
  {
    if (request.method !== JsSIP_C.SUBSCRIBE) 
    {
      request.reply(405); // Method Not Allowed    

      return;
    }
    let h = request.getHeader('expires');

    if (h === undefined || h === null) 
    { 
      h = '900'; // Missed header Expires. RFC 6665 3.1.1. Set default expires value
      debug(`Missed expires header. Set by default ${h}`);
    }
    this.expires = parseInt(h);
    request.reply(200, null, [ `Expires: ${this.expires}`, `Contact: ${this.contact}` ]);

    const body = request.body;
    const content_type = request.getHeader('content-type');
    const is_unsubscribe = this.expires === 0;

    debug('emit "subscribe"');
    this.emit('subscribe', is_unsubscribe, request, body, content_type);

    if (is_unsubscribe) 
    {
      this._dialogTerminated('receive un-subscribe');
    } 
    else 
    {
      this._setExpiresTimestamp();
      this._setExpiresTimer();
    }
  }

  /**
   * User API
   */
  setActiveState() 
  {
    if (this._state === 'pending') 
    {
      debug('set "active" state');
      this._state = 'active';
    }
  }
 
  sendNotify(body = null) 
  {
    let subs_state = this._state;
 
    if (this._state !== 'terminated') 
    {
      subs_state += `;expires=${this._getExpiresTimestamp()}`;
    } 
    else if (this.terminated_reason) 
    {
      subs_state += `;reason=${this.terminated_reason}`;
    }
 
    const headers = this.headers.slice();

    headers.push(`Subscription-State: ${subs_state}`);
    headers.push(`Event: ${this.event_name}`);
    if (body) 
    {
      headers.push(`Content-Type: ${this.content_type}`);
    }
    this.params.cseq++;
    this._ua.sendRequest(JsSIP_C.NOTIFY, this.target, this.params, headers, body,
      this, this.credential);
  }
 
  sendFinalNotify(body = null, reason = null) 
  {
    if (this.is_final_notify_sent)
      return;
    this.is_final_notify_sent = true;
    this._dialogTerminated('send final notify');
    this.terminated_reason = reason;
    this.sendNotify(body);
  }
 
  get state()
  {
    return this._state;
  }
  
  /**
   * Private API.
   */
  _dialogTerminated(reason) 
  {
    if (this.is_terminated)
      return;
    this.is_terminated = true;
    this._state = 'terminated';
    clearTimeout(this.expires_timer);
    // If delay needed ?
    setTimeout(() => 
    {
      debug('remove dialog id=', this.id);
      this._ua.destroyDialog(this);
    }, 32000);
    debug(`emit "terminated" ${reason}"`);
    this.emit('terminated', reason);
  }

  _setExpiresTimestamp() 
  {
    this.expires_timestamp = new Date().getTime() + (this.expires * 1000);
  }

  _getExpiresTimestamp() 
  {
    const delta = Math.floor((this.expires_timestamp - new Date().getTime()) / 1000);

    return delta >= 0 ? delta : 0;
  }

  _setExpiresTimer() 
  {
    clearTimeout(this.expires_timer);
    setTimeout(() => 
    {
      if (this.is_final_notify_sent)
        return;
      this.terminated_reason = 'timeout';
      this.is_final_notify_sent = true;
      this.sendNotify();
      this._dialogTerminated('subscription expired');
    }, this.expires * 1000);
  }
};