
/**
 * @fileoverview Request Sender
 */

/**
 * @augments JsSIP
 * @class Class creating a request sender.
 * @param {Object} applicant
 * @param {JsSIP.UA} ua
 */

JsSIP.RequestSender = function(applicant, ua) {
  this.ua = ua;
  this.applicant = applicant;
  this.method = applicant.request.method;
  this.request = applicant.request;
  this.challenged = false;

  // If ua is in closing process or even closed just allow sending Bye and ACK
  if (ua.status === JsSIP.c.UA_STATUS_USER_CLOSED && (this.method !== JsSIP.c.BYE || this.method !== JsSIP.c.ACK)) {
    this.onTransportError();
  }
};

/**
* Create the client transaction and send the message.
*/
JsSIP.RequestSender.prototype = {
  send: function() {
    switch(this.method) {
      case "INVITE":
        this.clientTransaction = new JsSIP.Transactions.InviteClientTransaction(this, this.request, this.ua.transport);
        break;
      case "ACK":
        this.clientTransaction = new JsSIP.Transactions.AckClientTransaction(this, this.request, this.ua.transport);
        break;
      default:
        this.clientTransaction = new JsSIP.Transactions.NonInviteClientTransaction(this, this.request, this.ua.transport);
    }
    this.clientTransaction.send();
  },

  /**
  * Callback fired when receiving a request timeout error from the client transaction.
  * To be re-defined by the applicant.
  * @event
  */
  onRequestTimeout: function() {
    this.applicant.onRequestTimeout();
  },

  /**
  * Callback fired when receiving a transport error from the client transaction.
  * To be re-defined by the applicant.
  * @event
  */
  onTransportError: function() {
    this.applicant.onTransportError();
  },

  /**
  * Called from client transaction when receiving a correct response to the request.
  * Authenticate request if needed or pass the response back to the applicant.
  * @param {JsSIP.IncomingResponse} response
  */
  receiveResponse: function(response) {
    var authorization, cseq,
      status_code = response.status_code;

    /*
    * Authentication
    * Authenticate once. _challenged_ flag used to avoid infinite authentications.
    */
    if ((status_code === 401 || status_code === 407) && !this.challenged && this.ua.configuration.password !== null) {
      authorization = JsSIP.DigestAuthentication(this.ua, this.request, response);

      if (status_code === 401) {
        this.request.setHeader('authorization', authorization);
      } else {
        this.request.setHeader('proxy-authorization', authorization);
      }

      if (response.method === JsSIP.c.REGISTER) {
        cseq = this.applicant.cseq += 1;
      } else if (this.request.dialog){
        cseq = this.request.dialog.local_seqnum += 1;
      } else {
        cseq = this.request.headers.CSeq.toString().split(' ')[0];
        cseq = parseInt(cseq,10) +1;
      }

      this.request.setHeader('cseq', cseq +' '+ this.method);
      this.challenged = true;
      this.send();
    } else {
      this.applicant.receiveResponse(response);
    }
  }
};