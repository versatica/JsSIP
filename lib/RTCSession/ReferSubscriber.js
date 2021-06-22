const EventEmitter = require('events').EventEmitter;
const Logger = require('../Logger');
const JsSIP_C = require('../Constants');
const Grammar = require('../Grammar');
const Utils = require('../Utils');

const logger = new Logger('RTCSession:ReferSubscriber');

module.exports = class ReferSubscriber extends EventEmitter
{
  constructor(session)
  {
    super();

    this._id = null;
    this._session = session;
  }

  get id()
  {
    return this._id;
  }

  sendRefer(target, options = {})
  {
    logger.debug('sendRefer()');

    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const eventHandlers = Utils.cloneObject(options.eventHandlers);

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
      replaces = options.replaces._request.call_id;
      replaces += `;to-tag=${options.replaces._to_tag}`;
      replaces += `;from-tag=${options.replaces._from_tag}`;

      replaces = encodeURIComponent(replaces);
    }

    // Refer-To header field.
    const referTo = `Refer-To: <${target}${replaces?`?Replaces=${replaces}`:''}>`;

    extraHeaders.push(referTo);

    // Referred-By header field (if not already present).
    if (!extraHeaders.some(header => header.startsWith('Referred-By:'))) 
    {
      const referredBy = `Referred-By: <${this._session._ua._configuration.uri._scheme}:${this._session._ua._configuration.uri._user}@${this._session._ua._configuration.uri._host}>`;

      extraHeaders.push(referredBy);
    }

    extraHeaders.push(`Contact: ${this._session.contact}`);

    const request = this._session.sendRequest(JsSIP_C.REFER, {
      extraHeaders,
      eventHandlers : {
        onSuccessResponse : (response) =>
        {
          this._requestSucceeded(response);
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
    logger.debug('receiveNotify()');

    if (!request.body)
    {
      return;
    }

    const status_line = Grammar.parse(request.body.trim(), 'Status_Line');

    if (status_line === -1)
    {
      logger.debug(`receiveNotify() | error parsing NOTIFY body: "${request.body}"`);

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
        this.emit('accepted', {
          request,
          status_line
        });
        break;

      default:
        this.emit('failed', {
          request,
          status_line
        });
        break;
    }
  }

  _requestSucceeded(response)
  {
    logger.debug('REFER succeeded');

    logger.debug('emit "requestSucceeded"');

    this.emit('requestSucceeded', {
      response
    });
  }

  _requestFailed(response, cause)
  {
    logger.debug('REFER failed');

    logger.debug('emit "requestFailed"');

    this.emit('requestFailed', {
      response : response || null,
      cause
    });
  }
};
