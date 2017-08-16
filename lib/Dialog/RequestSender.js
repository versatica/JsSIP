'use strict';

/**
 * Dependencies.
 */
const JsSIP_C = require('../Constants');
const Transactions = require('../Transactions');
const RTCSession = require('../RTCSession');
const RequestSender = require('../RequestSender');


class DialogRequestSender {
  constructor(dialog, applicant, request) {
    this.dialog = dialog;
    this.applicant = applicant;
    this.request = request;

    // RFC3261 14.1 Modifying an Existing Session. UAC Behavior.
    this.reattempt = false;
    this.reattemptTimer = null;
  }

  send() {
    const request_sender = new RequestSender(this, this.dialog.owner.ua);

    request_sender.send();

    // RFC3261 14.2 Modifying an Existing Session -UAC BEHAVIOR-
    if ((this.request.method === JsSIP_C.INVITE || (this.request.method === JsSIP_C.UPDATE && this.request.body)) &&
        request_sender.clientTransaction.state !== Transactions.C.STATUS_TERMINATED) {
      this.dialog.uac_pending_reply = true;
      request_sender.clientTransaction.once('stateChanged', () => {
        if (this.state === Transactions.C.STATUS_ACCEPTED ||
            this.state === Transactions.C.STATUS_COMPLETED ||
            this.state === Transactions.C.STATUS_TERMINATED) {

          this.dialog.uac_pending_reply = false;
        }
      });
    }
  }

  onRequestTimeout() {
    this.applicant.onRequestTimeout();
  }

  onTransportError() {
    this.applicant.onTransportError();
  }

  receiveResponse(response) {
    // RFC3261 12.2.1.2 408 or 481 is received for a request within a dialog.
    if (response.status_code === 408 || response.status_code === 481) {
      this.applicant.onDialogError(response);
    } else if (response.method === JsSIP_C.INVITE && response.status_code === 491) {
      if (this.reattempt) {
        this.applicant.receiveResponse(response);
      } else {
        this.request.cseq.value = this.dialog.local_seqnum += 1;
        this.reattemptTimer = setTimeout(() => {
          if (this.applicant.owner.status !== RTCSession.C.STATUS_TERMINATED) {
            this.reattempt = true;
            this.request_sender.send();
          }
        }, 1000);
      }
    } else {
      this.applicant.receiveResponse(response);
    }
  }
}

module.exports = DialogRequestSender;
