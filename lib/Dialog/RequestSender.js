const JsSIP_C = require('../Constants');
const Transactions = require('../Transactions');
const RTCSession = require('../RTCSession');
const RequestSender = require('../RequestSender');

// Default event handlers.
const EventHandlers = {
  onRequestTimeout  : () => {},
  onTransportError  : () => {},
  onSuccessResponse : () => {},
  onErrorResponse   : () => {},
  onAuthenticated   : () => {},
  onDialogError     : () => {}
};

module.exports = class DialogRequestSender
{
  constructor(dialog, request, eventHandlers)
  {
    this._dialog = dialog;
    this._ua = dialog._ua;
    this._request = request;
    this._eventHandlers = eventHandlers;

    // RFC3261 14.1 Modifying an Existing Session. UAC Behavior.
    this._reattempt = false;
    this._reattemptTimer = null;

    // Define the undefined handlers.
    for (const handler in EventHandlers)
    {
      if (Object.prototype.hasOwnProperty.call(EventHandlers, handler))
      {
        if (!this._eventHandlers[handler])
        {
          this._eventHandlers[handler] = EventHandlers[handler];
        }
      }
    }
  }

  get request()
  {
    return this._request;
  }

  send()
  {
    const request_sender = new RequestSender(this._ua, this._request, {
      onRequestTimeout : () =>
      {
        this._eventHandlers.onRequestTimeout();
      },
      onTransportError : () =>
      {
        this._eventHandlers.onTransportError();
      },
      onAuthenticated : (request) =>
      {
        this._eventHandlers.onAuthenticated(request);
      },
      onReceiveResponse : (response) =>
      {
        this.receiveResponse(response);
      }
    });

    request_sender.send();

    // RFC3261 14.2 Modifying an Existing Session -UAC BEHAVIOR-.
    if ((this._request.method === JsSIP_C.INVITE ||
          (this._request.method === JsSIP_C.UPDATE && this._request.body)) &&
        request_sender.clientTransaction.state !== Transactions.C.STATUS_TERMINATED)
    {
      this._dialog.uac_pending_reply = true;

      const stateChanged = () =>
      {
        if (request_sender.clientTransaction.state === Transactions.C.STATUS_ACCEPTED ||
            request_sender.clientTransaction.state === Transactions.C.STATUS_COMPLETED ||
            request_sender.clientTransaction.state === Transactions.C.STATUS_TERMINATED)
        {
          request_sender.clientTransaction.removeListener('stateChanged', stateChanged);
          this._dialog.uac_pending_reply = false;
        }
      };

      request_sender.clientTransaction.on('stateChanged', stateChanged);
    }
  }

  receiveResponse(response)
  {
    // RFC3261 12.2.1.2 408 or 481 is received for a request within a dialog.
    if (response.status_code === 408 || response.status_code === 481)
    {
      this._eventHandlers.onDialogError(response);
    }
    else if (response.method === JsSIP_C.INVITE && response.status_code === 491)
    {
      if (this._reattempt)
      {
        if (response.status_code >= 200 && response.status_code < 300)
        {
          this._eventHandlers.onSuccessResponse(response);
        }
        else if (response.status_code >= 300)
        {
          this._eventHandlers.onErrorResponse(response);
        }
      }
      else
      {
        this._request.cseq.value = this._dialog.local_seqnum += 1;
        this._reattemptTimer = setTimeout(() =>
        {
          // TODO: look at dialog state instead.
          if (this._dialog.owner.status !== RTCSession.C.STATUS_TERMINATED)
          {
            this._reattempt = true;
            this._request_sender.send();
          }
        }, 1000);
      }
    }
    else if (response.status_code >= 200 && response.status_code < 300)
    {
      this._eventHandlers.onSuccessResponse(response);
    }
    else if (response.status_code >= 300)
    {
      this._eventHandlers.onErrorResponse(response);
    }
  }
};
