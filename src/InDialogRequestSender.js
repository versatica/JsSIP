
/**
 * @fileoverview In-Dialog Request Sender
 */

/**
 * @augments JsSIP
 * @class Class creating an In-dialog request sender.
 * @param {Object} applicant
 */

JsSIP.InDialogRequestSender = function(applicant) {
  this.applicant = applicant;
  this.request = applicant.request;
};

JsSIP.InDialogRequestSender.prototype = {
  send: function() {
    var request_sender = new JsSIP.RequestSender(this, this.applicant.session.ua);
    request_sender.send();
  },

  onRequestTimeout: function() {
    this.applicant.session.onRequestTimeout();
  },

  onTransportError: function() {
    this.applicant.session.onTransportError();
  },

  receiveResponse: function(response) {
    var status_code = response.status_code;

    // RFC3261 14.1. Terminate the dialog if a 408 or 481 is received from a re-Invite.
    if (status_code === 408 || status_code === 481) {
      this.applicant.ended('remote', response, JsSIP.c.causes.IN_DIALOG_408_OR_481);
    } else {
      this.applicant.receiveResponse(response);
    }
  }
};