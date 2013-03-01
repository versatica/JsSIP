/**
 * @fileoverview RequestSender
 */

/**
 * @class Session RequestSender
 * @param {JsSIP.RTCSession | RTCSession applicant} applicant
 * @param {JsSIP.OutgoingRequest} [request]
 */
(function(JsSIP){

var RequestSender = function(applicant, request) {
  this.applicant = applicant;
  this.request = request || applicant.request;
  this.session = (applicant instanceof JsSIP.RTCSession)? applicant : applicant.session;
  this.reattempt = false;
  this.reatemptTimer = null;
  this.request_sender = new JsSIP.InDialogRequestSender(this);
};

RequestSender.prototype = {
  receiveResponse: function(response) {
    var
      self = this,
      status_code = response.status_code;

    if (response.method === JsSIP.C.INVITE && status_code === 491) {
      if (!this.reattempt) {
        this.request.cseq.value = this.request.dialog.local_seqnum += 1;
        this.reatemptTimer = window.setTimeout(
          function() {
            if (self.session.status !== JsSIP.RTCSession.C.STATUS_TERMINATED) {
              self.reattempt = true;
              self.request_sender.send();
            }
          },
          this.getReattemptTimeout()
        );
      } else {
        this.applicant.receiveResponse(response);
      }
    } else {
      this.applicant.receiveResponse(response);
    }
  },

  send: function() {
    this.request_sender.send();
  },

  onRequestTimeout: function() {
    this.applicant.onRequestTimeout();
  },

  onTransportError: function() {
    this.applicant.onTransportError();
  },

  // RFC3261 14.1
  getReattemptTimeout: function() {
    if(this.session.direction === 'outgoing') {
      return (Math.random() * (4 - 2.1) + 2.1).toFixed(2);
    } else {
      return (Math.random() * 2).toFixed(2);
    }
  }
};

return RequestSender;
}(JsSIP));
