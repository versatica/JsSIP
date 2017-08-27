const EventEmitter = require('events').EventEmitter;
const JsSIP_C = require('../Constants');
const Grammar = require('../Grammar');
const Utils = require('../Utils');
const debug = require('debug')('JsSIP:RTCSession:ReferSubscriber');

const C = {
  expires : 120
};

module.exports = class ReferSubscriber extends EventEmitter
{
  constructor(session)
  {
    super();

    this._session = session;
    this._timer = null;
    this._id = null;
  }

  get id()
  {
    return this._id;
  }

  // TODO: Add a configurable expire time. Right now it's always set to C.expires.
  sendRefer(target, options = {})
  {
    debug('sendRefer()');

    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const eventHandlers = options.eventHandlers || {};

    // Set event handlers.
    for (const event in eventHandlers)
    {
      if (Object.prototype.hasOwnProperty.call(eventHandlers, event))
      {
        this.on(event, eventHandlers[event]);
      }
    }

    // Replaces URI header field.
    let replaces = null;

    if (options.replaces)
    {
      replaces = options.replaces.request.call_id;
      replaces += `;to-tag=${options.replaces.to_tag}`;
      replaces += `;from-tag=${options.replaces.from_tag}`;

      replaces = encodeURIComponent(replaces);
    }

    // Refer-To header field.
    const referTo = `Refer-To: <${target}${replaces?`?Replaces=${replaces}`:''}>`;

    extraHeaders.push(referTo);

    this._timer = setTimeout(() =>
    {
      this._timer = null;
      this.emit('timeoutExpired');
    }, C.expires * 1000);

    const request = this._session.sendRequest(JsSIP_C.REFER, {
      extraHeaders,
      eventHandlers : {
        onSuccessResponse : (response) =>
        {
          this.emit('requestSucceeded', {
            response
          });
        },
        onErrorResponse : (response) =>
        {
          this._requestFailed(response, JsSIP_C.causes.REJECTED);
        },
        onTransportError : () =>
        {
          this._requestFailed(null, JsSIP_C.causes.CONNECTION_ERROR);
        },
        onRequestTimeout : () =>
        {
          this._requestFailed(null, JsSIP_C.causes.REQUEST_TIMEOUT);
        },
        onDialogError : () =>
        {
          this._requestFailed(null, JsSIP_C.causes.DIALOG_ERROR);
        }
      }
    });

    this._id = request.cseq;
  }

  receiveNotify(request)
  {
    debug('receiveNotify()');

    if (!request.body)
    {
      return;
    }

    const status_line = Grammar.parse(request.body, 'Status_Line');

    if (status_line === -1)
    {
      debug(`receiveNotify() | error parsing NOTIFY body: "${request.body}"`);

      return;
    }

    switch (true)
    {
      case /^100$/.test(status_line.status_code):
        this.emit('trying', {
          request,
          status_line
        });
        break;

      case /^1[0-9]{2}$/.test(status_line.status_code):
        this.emit('progress', {
          request,
          status_line
        });
        break;

      case /^2[0-9]{2}$/.test(status_line.status_code):
        this._close();
        this.emit('accepted', {
          request,
          status_line
        });
        break;

      default:
        this._close();
        this.emit('failed', {
          request,
          status_line
        });
        break;
    }
  }

  _close()
  {
    clearTimeout(this._timer);
    this._timer = null;
  }

  _requestFailed(response, cause)
  {
    debug('REFER failed');

    this._close();

    debug('emit "requestFailed"');

    this.emit('requestFailed', {
      response : response || null,
      cause
    });
  }
};
