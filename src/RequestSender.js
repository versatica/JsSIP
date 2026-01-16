const Logger = require('./Logger');
const JsSIP_C = require('./Constants');
const DigestAuthentication = require('./DigestAuthentication');
const Transactions = require('./Transactions');

const logger = new Logger('RequestSender');

// Default event handlers.
const EventHandlers = {
  onRequestTimeout  : () => {},
  onTransportError  : () => {},
  onReceiveResponse : () => {},
  onAuthenticated   : () => {}
};

module.exports = class RequestSender
{
  constructor(ua, request, eventHandlers)
  {
    this._ua = ua;
    this._eventHandlers = eventHandlers;
    this._method = request.method;
    this._request = request;
    this._auth = null;
    this._challenged = false;
    this._staled = false;

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

    // If ua is in closing process or even closed just allow sending Bye and ACK.
    if (ua.status === ua.C.STATUS_USER_CLOSED &&
        (this._method !== JsSIP_C.BYE || this._method !== JsSIP_C.ACK))
    {
      this._eventHandlers.onTransportError();
    }
  }

  /**
  * Create the client transaction and send the message.
  */
  send()
  {
    const eventHandlers = {
      onRequestTimeout  : () => { this._eventHandlers.onRequestTimeout(); },
      onTransportError  : () => { this._eventHandlers.onTransportError(); },
      onReceiveResponse : (response) => { this._receiveResponse(response); }
    };

    switch (this._method)
    {
      case 'INVITE':
        this.clientTransaction = new Transactions.InviteClientTransaction(
          this._ua, this._ua.transport, this._request, eventHandlers);
        break;
      case 'ACK':
        this.clientTransaction = new Transactions.AckClientTransaction(
          this._ua, this._ua.transport, this._request, eventHandlers);
        break;
      default:
        this.clientTransaction = new Transactions.NonInviteClientTransaction(
          this._ua, this._ua.transport, this._request, eventHandlers);
    }
    // If authorization JWT is present, use it.
    if (this._ua._configuration.authorization_jwt)
    {
      this._request.setHeader('Authorization', this._ua._configuration.authorization_jwt);
    }

    this.clientTransaction.send();
  }

  /**
  * Called from client transaction when receiving a correct response to the request.
  * Authenticate request if needed or pass the response back to the applicant.
  */
  _receiveResponse(response)
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
        logger.debug(`${response.status_code} with wrong or missing challenge, cannot authenticate`);
        this._eventHandlers.onReceiveResponse(response);

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
          this._eventHandlers.onReceiveResponse(response);

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

        this._request = this._request.clone();
        this._request.cseq += 1;
        this._request.setHeader('cseq', `${this._request.cseq} ${this._method}`);
        this._request.setHeader(authorization_header_name, this._auth.toString());

        this._eventHandlers.onAuthenticated(this._request);
        this.send();
      }
      else
      {
        this._eventHandlers.onReceiveResponse(response);
      }
    }
    else
    {
      this._eventHandlers.onReceiveResponse(response);
    }
  }
};
