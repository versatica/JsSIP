const JsSIP_C = require('../Constants');
const Transactions = require('../Transactions');
const RTCSession = require('../RTCSession');
const RequestSender = require('../RequestSender');

module.exports = class DialogRequestSender
{
  constructor(dialog, applicant, request)
  {
    this._dialog = dialog;
    this._applicant = applicant;
    this._request = request;

    // RFC3261 14.1 Modifying an Existing Session. UAC Behavior.
    this._reattempt = false;
    this._reattemptTimer = null;
  }

  get request()
  {
    return this._request;
  }

  send()
  {
    const request_sender = new RequestSender(this, this._dialog.owner._ua);

    request_sender.send();

    // RFC3261 14.2 Modifying an Existing Session -UAC BEHAVIOR-
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

  onRequestTimeout()
  {
    this._applicant.onRequestTimeout();
  }

  onTransportError()
  {
    this._applicant.onTransportError();
  }

  receiveResponse(response)
  {
    // RFC3261 12.2.1.2 408 or 481 is received for a request within a dialog.
    if (response.status_code === 408 || response.status_code === 481)
    {
      this._applicant.onDialogError(response);
    }
    else if (response.method === JsSIP_C.INVITE && response.status_code === 491)
    {
      if (this._reattempt)
      {
        this._applicant.receiveResponse(response);
      }
      else
      {
        this._request.cseq.value = this._dialog.local_seqnum += 1;
        this._reattemptTimer = setTimeout(() =>
        {
          if (this._applicant.owner.status !== RTCSession.C.STATUS_TERMINATED)
          {
            this._reattempt = true;
            this._request_sender.send();
          }
        }, 1000);
      }
    }
    else
    {
      this._applicant.receiveResponse(response);
    }
  }
};
