const EventEmitter = require('events').EventEmitter;
const JsSIP_C = require('./Constants');
const Utils = require('./Utils');
const debug = require('debug')('JsSIP:Subscriber');
const debugerror = require('debug')('JsSIP:ERROR:Subscriber');

debugerror.log = console.warn.bind(console);

module.exports = class Subscriber extends EventEmitter 
{
  constructor(ua, target, { event_name, accept, expires, content_type, 
    allow_events, params, headers, credential }) 
  {
    super();
    this._ua = ua;
    if (!target)
      throw new TypeError('target is undefined');
    this.target = target;
    if (!event_name)
      throw new TypeError('event_name is undefined');
    this.event_name = event_name;
    if (!accept)
      throw new TypeError('accept is undefined');
    this.accept = accept;
    if (!expires)
      expires = 900;
    this.expires = expires;
    this.allow_events = allow_events; // optional
    this.content_type = content_type; // used to subscribe with body
    if (!params)
      throw new TypeError('params is undefined');
    if (!params.from_uri)
      throw new TypeError('params.from_uri is undefined');
    if (!params.to_uri)
      throw new TypeError('params.to_uri is undefined');
    this.params = params;
    params.from_tag = Utils.newTag();
    params.to_tag = null;
    params.call_id = Utils.createRandomToken(20);
    params.cseq = Math.floor((Math.random() * 10000) + 1);
    this.contact = `<sip:${params.from_uri.user}@${Utils.createRandomToken(12)}.invalid;transport=ws>`;
    // this.contact = `<sip:${params.from_uri.user}@${params.from_uri.host};transport=ws>`;
    this.credential = credential; // optional
    this._state = 'init'; // init, notify_wait, pending, active, terminated
    this.id = null; // dialog id
    this.expires_timer = null; // to update subscription
    this.expires_timestamp = null;      
    if (!headers)
      headers = [];
    this.headers = headers.concat([
      `Event: ${this.event_name}`,
      `Accept: ${this.accept}`, 
      `Expires: ${this.expires}`,
      `Contact: ${this.contact}`
    ]);
    if (this.allowEvents)
      this.headers.push(`Allow-Events: ${this.allowEvents}`);
    this.is_terminated = false;
    this.route_set = null;
    this.data = {}; // Custom session empty object for high level use.
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
    this._dialogTerminated('subscribe response timeout');
  }

  onTransportError() 
  {
    this._dialogTerminated('subscribe transport error');
  }

  onReceiveResponse(response) 
  {
    if (response.status_code >= 200 && response.status_code < 300) 
    {
      if (this.params.to_tag === null) 
      {
        this.params.to_tag = response.to_tag;
        this.id = `${this.params.call_id}${this.params.from_tag}${this.params.to_tag}`;
        debug('added dialog id=', this.id);
        this._ua.newDialog(this);
        this.route_set = response.getHeaders('record-route').reverse();
        if (this.route_set.length > 0)
          this.params.route_set = this.route_set;
      }
      const expires = this._getExpires(response);

      if (expires === -1) 
      {
        debugerror('response without Expires header');

        return;
      }
      if (expires > 0) 
      {
        this.expires_timestamp = new Date().getTime() + (expires * 1000);
        this._scheduleSubscribe(this._calculateTimeoutMs(expires));
      }
    } 
    else if (response.status_code >= 300) 
    {
      this._dialogTerminated('receive subscribe non-OK response');
    }
  }

  receiveRequest(request) 
  {
    if (request.method !== JsSIP_C.NOTIFY) 
    {
      request.reply(405); // Method Not Allowed   

      return;
    }
    const subs_state = request.parseHeader('subscription-state');

    if (!subs_state) 
    {
      debugerror('missed header Subscription-State');
      request.reply(400); // Bad request

      return;
    }
    request.reply(200);

    const new_state = subs_state.state.toLowerCase();
    const prev_state = this._state;

    if (prev_state !== 'terminated' && new_state !== 'terminated') 
    {
      this._state = new_state;
      if (subs_state.expires !== undefined) 
      {
        const expires = subs_state.expires;
        const expires_timestamp = new Date().getTime() + (expires * 1000);
        const max_time_deviation = 2000;

        // expiration shorter and the difference is not too small
        if (this.expires_timestamp - expires_timestamp > max_time_deviation) 
        {
          debug('update sending re-SUBSCRIBE time');
          clearTimeout(this.expires_timer);
          this.expires_timestamp = expires_timestamp;
          this._scheduleSubscribe(this._calculateTimeoutMs(expires));
        }
      }
    }
    if (prev_state !== 'active' && new_state === 'active') 
    {
      debug('emit "active"');
      this.emit('active');
    }

    const body = request.body;
    const is_final = new_state === 'terminated';

    // notify event fired for NOTIFY with body
    if (body) 
    {
      const content_type = request.getHeader('content-type');

      debug('emit "notify"');
      this.emit('notify', is_final, request, body, content_type);
    }
    if (is_final)
      this._dialogTerminated('receive final notify');
  }

  /**
   * User API
   */
  subscribe(body = null) 
  {
    if (this._state === 'init')
      this._state = 'notify_wait';
    const headers = this.headers.slice();

    if (body) 
    {
      if (!this.content_type) 
        throw new TypeError('content_type is undefined');
      headers.push(`Content-Type: ${this.content_type}`);
    }
    this._send(body, headers);
  }

  unsubscribe() 
  {
    this._dialogTerminated('send un-subscribe');
    const headers = [
      `Event: ${this.event_name}`,
      'Expires: 0'
    ];

    this._send(null, headers);
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
    if (this.is_terminated) // to prevent duplicate call
      return;
    this.is_terminated = true;
    this._state = 'terminated';
    clearTimeout(this.expires_timer);
    // remove dialog from dialogs table with some delay, to allow receive end NOTIFY
    setTimeout(() => 
    {
      debug('removed dialog id=', this.id);
      this._ua.destroyDialog(this);
    }, 32000);
    debug(`emit "terminated" ${reason}"`);
    this.emit('terminated', reason);
  }

  _send(body, headers) 
  {
    this.params.cseq++;
    this._ua.sendRequest(JsSIP_C.SUBSCRIBE, this.target, this.params, headers, 
      body, this, this.credential);
  }

  _getExpires(r) 
  {
    const e = r.getHeader('expires');

    return e ? parseInt(e) : -1;
  }

  _calculateTimeoutMs(expires) 
  {
    return expires >= 140 ? (expires * 1000 / 2) 
     + Math.floor(((expires / 2) - 70) * 1000 * Math.random()) : (expires * 1000) - 5000;
  }

  _scheduleSubscribe(timeout) 
  {
    debug(`next SUBSCRIBE will be sent in ${Math.floor(timeout / 1000)} sec`);
    this.expires_timer = setTimeout(() => 
    {
      this.expires_timer = undefined;
      this._send(null, this.headers);
    }, timeout);
  }
};