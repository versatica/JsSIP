const debug = require('debug')('JsSIP:RTCSession:Request');
const debugerror = require('debug')('JsSIP:ERROR:RTCSession:Request');

debugerror.log = console.warn.bind(console);
const JsSIP_C = require('../Constants');
const Exceptions = require('../Exceptions');
const RTCSession_C = require('../RTCSession_Constants');
const Utils = require('../Utils');

module.exports = class Request
{
  constructor(session, method)
  {
    debug('new | %s', method);

    this._session = session;
    this._method = method;
    // Instance of OutgoingRequest
    this._outgoingRequest = null;
    this._eventHandlers = {};

    // Check RTCSession Status
    if (this._session.status !== RTCSession_C.STATUS_1XX_RECEIVED &&
      this._session.status !== RTCSession_C.STATUS_WAITING_FOR_ANSWER &&
      this._session.status !== RTCSession_C.STATUS_WAITING_FOR_ACK &&
      this._session.status !== RTCSession_C.STATUS_CONFIRMED &&
      this._session.status !== RTCSession_C.STATUS_TERMINATED)
    {
      throw new Exceptions.InvalidStateError(this._session.status);
    }

    /*
     * Allow sending BYE in TERMINATED status since the RTCSession
     * could had been terminated before the ACK had arrived.
     * RFC3261 Section 15, Paragraph 2
     */
    else if (this._session.status === RTCSession_C.STATUS_TERMINATED &&
        method !== JsSIP_C.BYE)
    {
      throw new Exceptions.InvalidStateError(this._session.status);
    }
  }

  send(options = {})
  {
    const extraHeaders = Utils.cloneArray(options.extraHeaders);
    const body = options.body || null;

    this._eventHandlers = options.eventHandlers || {};

    this._outgoingRequest = this._session._dialog.sendRequest(this, this._method, {
      extraHeaders,
      body
    });
  }

  receiveResponse(response)
  {
    switch (true)
    {
      case /^1[0-9]{2}$/.test(response.status_code):
        debug('onProgressResponse');
        if (this._eventHandlers.onProgressResponse)
        {
          this._eventHandlers.onProgressResponse(response);
        }
        break;

      case /^2[0-9]{2}$/.test(response.status_code):
        debug('onSuccessResponse');
        if (this._eventHandlers.onSuccessResponse)
        {
          this._eventHandlers.onSuccessResponse(response);
        }
        break;

      default:
        debug('onErrorResponse');
        if (this._eventHandlers.onErrorResponse)
        {
          this._eventHandlers.onErrorResponse(response);
        }
        break;
    }
  }

  onRequestTimeout()
  {
    debugerror('onRequestTimeout');
    if (this._eventHandlers.onRequestTimeout)
    {
      this._eventHandlers.onRequestTimeout();
    }
  }

  onTransportError()
  {
    debugerror('onTransportError');
    if (this._eventHandlers.onTransportError)
    {
      this._eventHandlers.onTransportError();
    }
  }

  onDialogError()
  {
    debugerror('onDialogError');
    if (this._eventHandlers.onDialogError)
    {
      this._eventHandlers.onDialogError();
    }
  }
};
