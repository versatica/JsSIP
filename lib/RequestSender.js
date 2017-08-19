const debug = require('debug')('JsSIP:RequestSender');
const JsSIP_C = require('./Constants');
const UA_C = require('./UA_Constants');
const DigestAuthentication = require('./DigestAuthentication');
const Transactions = require('./Transactions');

module.exports = class RequestSender
{
  constructor(applicant, ua)
  {
    this._ua = ua;
    this._applicant = applicant;
    this._method = applicant.request.method;
    this._request = applicant.request;
    this._auth = null;
    this._challenged = false;
    this._staled = false;

    // If ua is in closing process or even closed just allow sending Bye and ACK
    if (ua.status === UA_C.STATUS_USER_CLOSED &&
        (this._method !== JsSIP_C.BYE || this._method !== JsSIP_C.ACK))
    {
      this.onTransportError();
    }
  }

  /**
  * Create the client transaction and send the message.
  */
  send()
  {
    switch (this._method)
    {
      case 'INVITE':
        this.clientTransaction = new Transactions.InviteClientTransaction(
          this, this._request, this._ua.transport);
        break;
      case 'ACK':
        this.clientTransaction = new Transactions.AckClientTransaction(
          this, this._request, this._ua.transport);
        break;
      default:
        this.clientTransaction = new Transactions.NonInviteClientTransaction(
          this, this._request, this._ua.transport);
    }

    this.clientTransaction.send();
  }

  /**
  * Callback fired when receiving a request timeout error from the client transaction.
  * To be re-defined by the applicant.
  */
  onRequestTimeout()
  {
    this._applicant.onRequestTimeout();
  }

  /**
  * Callback fired when receiving a transport error from the client transaction.
  * To be re-defined by the applicant.
  */
  onTransportError()
  {
    this._applicant.onTransportError();
  }

  /**
  * Called from client transaction when receiving a correct response to the request.
  * Authenticate request if needed or pass the response back to the applicant.
  */
  receiveResponse(response)
  {
    let challenge;
    let authorization_header_name;
    const status_code = response.status_code;

    /*
    * Authentication
    * Authenticate once. _challenged_ flag used to avoid infinite authentications.
    */
    if ((status_code === 401 || status_code === 407) &&
        (this._ua.configuration.password !== null || this._ua.configuration.ha1 !== null))
    {

      // Get and parse the appropriate WWW-Authenticate or Proxy-Authenticate header.
      if (response.status_code === 401)
      {
        challenge = response.parseHeader('www-authenticate');
        authorization_header_name = 'authorization';
      }
      else
      {
        challenge = response.parseHeader('proxy-authenticate');
        authorization_header_name = 'proxy-authorization';
      }

      // Verify it seems a valid challenge.
      if (!challenge)
      {
        debug(`${response.status_code} with wrong or missing challenge, cannot authenticate`);
        this._applicant.receiveResponse(response);

        return;
      }

      if (!this._challenged || (!this._staled && challenge.stale === true))
      {
        if (!this._auth)
        {
          this._auth = new DigestAuthentication({
            username : this._ua.configuration.authorization_user,
            password : this._ua.configuration.password,
            realm    : this._ua.configuration.realm,
            ha1      : this._ua.configuration.ha1
          });
        }

        // Verify that the challenge is really valid.
        if (!this._auth.authenticate(this._request, challenge))
        {
          this._applicant.receiveResponse(response);

          return;
        }
        this._challenged = true;

        // Update ha1 and realm in the UA.
        this._ua.set('realm', this._auth.get('realm'));
        this._ua.set('ha1', this._auth.get('ha1'));

        if (challenge.stale)
        {
          this._staled = true;
        }

        let cseq;

        if (response.method === JsSIP_C.REGISTER)
        {
          cseq = this._applicant.cseq += 1;
        }
        else if (this._request.dialog)
        {
          cseq = this._request.dialog.local_seqnum += 1;
        }
        else
        {
          cseq = this._request.cseq + 1;
        }

        this._request = this._applicant.request = this._request.clone();

        this._request.cseq = cseq;
        this._request.setHeader('cseq', `${cseq} ${this._method}`);

        this._request.setHeader(authorization_header_name, this._auth.toString());
        this.send();
      }
      else
      {
        this._applicant.receiveResponse(response);
      }
    }
    else
    {
      this._applicant.receiveResponse(response);
    }
  }
};
