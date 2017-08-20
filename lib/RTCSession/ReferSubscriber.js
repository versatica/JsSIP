const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('JsSIP:RTCSession:ReferSubscriber');
const JsSIP_C = require('../Constants');
const Grammar = require('../Grammar');
const RTCSession_Request = require('./Request');
const Utils = require('../Utils');

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
    // Instance of REFER OutgoingRequest
    this._outgoingRequest = null;
  }

  sendRefer(target, options = {})
  {
    debug('sendRefer()');

    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const eventHandlers = options.eventHandlers || {};

    // Set event handlers
    for (const event in eventHandlers)
    {
      if (Object.prototype.hasOwnProperty.call(eventHandlers, event))
      {
        this.on(event, eventHandlers[event]);
      }
    }

    // Replaces URI header field
    let replaces = null;

    if (options.replaces)
    {
      replaces = options.replaces.request.call_id;
      replaces += `;to-tag=${options.replaces.to_tag}`;
      replaces += `;from-tag=${options.replaces.from_tag}`;

      replaces = encodeURIComponent(replaces);
    }

    // Refer-To header field
    const referTo = `Refer-To: <${target}${replaces?`?Replaces=${replaces}`:''}>`;

    extraHeaders.push(referTo);

    const request = new RTCSession_Request(this._session, JsSIP_C.REFER);

    this._timer = setTimeout(() =>
    {
      removeSubscriber.call(this);
    }, C.expires * 1000);

    request.send({
      extraHeaders  : extraHeaders,
      eventHandlers : {
        onSuccessResponse : (response) =>
        {
          this.emit('requestSucceeded', {
            response : response
          });
        },
        onErrorResponse : (response) =>
        {
          this.emit('requestFailed', {
            response : response,
            cause    : JsSIP_C.causes.REJECTED
          });
        },
        onTransportError : () =>
        {
          removeSubscriber.call(this);
          this.emit('requestFailed', {
            response : null,
            cause    : JsSIP_C.causes.CONNECTION_ERROR
          });
        },
        onRequestTimeout : () =>
        {
          removeSubscriber.call(this);
          this.emit('requestFailed', {
            response : null,
            cause    : JsSIP_C.causes.REQUEST_TIMEOUT
          });
        },
        onDialogError : () =>
        {
          removeSubscriber.call(this);
          this.emit('requestFailed', {
            response : null,
            cause    : JsSIP_C.causes.DIALOG_ERROR
          });
        }
      }
    });

    this._outgoingRequest = request.outgoingRequest;
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
          request     : request,
          status_line : status_line
        });
        break;

      case /^1[0-9]{2}$/.test(status_line.status_code):
        this.emit('progress', {
          request     : request,
          status_line : status_line
        });
        break;

      case /^2[0-9]{2}$/.test(status_line.status_code):
        removeSubscriber.call(this);
        this.emit('accepted', {
          request     : request,
          status_line : status_line
        });
        break;

      default:
        removeSubscriber.call(this);
        this.emit('failed', {
          request     : request,
          status_line : status_line
        });
        break;
    }
  }
};

// remove refer subscriber from the session
function removeSubscriber()
{
  debug('removeSubscriber()');

  clearTimeout(this._timer);
}
