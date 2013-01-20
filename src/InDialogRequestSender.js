
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
    this.applicant.onRequestTimeout();
  },

  onTransportError: function() {
    this.applicant.session.onTransportError();
    this.applicant.onTransportError();
  },

  receiveResponse: function(response) {
    // RFC3261 14.1. Terminate the dialog if a 408 or 481 is received from a re-Invite.
    if (response.status_code === 408 || response.status_code === 481) {
      this.applicant.session.ended('remote', response, JsSIP.c.causes.IN_DIALOG_408_OR_481);
    }
    this.applicant.receiveResponse(response);
  }
};