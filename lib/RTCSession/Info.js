const EventEmitter = require('events').EventEmitter;
const debugerror = require('debug')('JsSIP:ERROR:RTCSession:Info');

debugerror.log = console.warn.bind(console);
const JsSIP_C = require('../Constants');
const Exceptions = require('../Exceptions');
const RTCSession = require('../RTCSession');
const Utils = require('../Utils');

module.exports = class Info extends EventEmitter
{
  constructor(session)
  {
    super();

    this._owner = session;
    this._direction = null;
    this._contentType = null;
    this._body = null;
  }

  get contentType()
  {
    return this._contentType;
  }

  get body()
  {
    return this._body;
  }

  send(contentType, body, options = {})
  {
    this._direction = 'outgoing';

    if (contentType === undefined)
    {
      throw new TypeError('Not enough arguments');
    }

    // Check RTCSession Status
    if (this._owner.status !== RTCSession.C.STATUS_CONFIRMED &&
      this._owner.status !== RTCSession.C.STATUS_WAITING_FOR_ACK)
    {
      throw new Exceptions.InvalidStateError(this._owner.status);
    }

    this._contentType = contentType;
    this._body = body;

    const extraHeaders = Utils.cloneArray(options.extraHeaders);

    extraHeaders.push(`Content-Type: ${contentType}`);

    this._owner.newInfo({
      originator : 'local',
      info       : this,
      request    : this.request
    });

    this._owner._dialog.sendRequest(this, JsSIP_C.INFO, {
      extraHeaders : extraHeaders,
      body         : body
    });
  }

  receiveResponse(response)
  {
    switch (true)
    {
      case /^1[0-9]{2}$/.test(response.status_code):
        // Ignore provisional responses.
        break;

      case /^2[0-9]{2}$/.test(response.status_code):
        this.emit('succeeded', {
          originator : 'remote',
          response   : response
        });
        break;

      default:
        this.emit('failed', {
          originator : 'remote',
          response   : response
        });
        break;
    }
  }

  onRequestTimeout()
  {
    debugerror('onRequestTimeout');
    this._owner.onRequestTimeout();
  }

  onTransportError()
  {
    debugerror('onTransportError');
    this._owner.onTransportError();
  }

  onDialogError()
  {
    debugerror('onDialogError');
    this._owner.onDialogError();
  }

  init_incoming(request)
  {
    this._direction = 'incoming';
    this.request = request;

    request.reply(200);

    this._contentType = request.getHeader('content-type');
    this._body = request.body;

    this._owner.newInfo({
      originator : 'remote',
      info       : this,
      request    : request
    });
  }
};
