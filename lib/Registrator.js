const debug = require('debug')('JsSIP:Registrator');
const Utils = require('./Utils');
const JsSIP_C = require('./Constants');
const SIPMessage = require('./SIPMessage');
const RequestSender = require('./RequestSender');

module.exports = class Registrator
{
  constructor(ua, transport)
  {
    const reg_id=1; // Force reg_id to 1.

    this._ua = ua;
    this._transport = transport;

    this._registrar = ua.configuration.registrar_server;
    this._expires = ua.configuration.register_expires;

    // Call-ID and CSeq values RFC3261 10.2
    this._call_id = Utils.createRandomToken(22);
    this._cseq = 0;

    // this._to_uri
    this._to_uri = ua.configuration.uri;

    this._registrationTimer = null;

    // Ongoing Register request
    this._registering = false;

    // Set status
    this._registered = false;

    // Contact header
    this._contact = this._ua.contact.toString();

    // sip.ice media feature tag (RFC 5768)
    this._contact += ';+sip.ice';

    // Custom headers for REGISTER and un-REGISTER.
    this._extraHeaders = [];

    // Custom Contact header params for REGISTER and un-REGISTER.
    this._extraContactParams = '';

    if (reg_id)
    {
      this._contact += `;reg-id=${reg_id}`;
      this._contact += `;+sip.instance="<urn:uuid:${this._ua.configuration.instance_id}>"`;
    }
  }

  setExtraHeaders(extraHeaders)
  {
    if (! Array.isArray(extraHeaders))
    {
      extraHeaders = [];
    }

    this._extraHeaders = extraHeaders.slice();
  }

  setExtraContactParams(extraContactParams)
  {
    if (! (extraContactParams instanceof Object))
    {
      extraContactParams = {};
    }

    // Reset it.
    this._extraContactParams = '';

    for (const param_key in extraContactParams)
    {
      if (Object.prototype.hasOwnProperty.call(extraContactParams, param_key))
      {
        const param_value = extraContactParams[param_key];

        this._extraContactParams += (`;${param_key}`);
        if (param_value)
        {
          this._extraContactParams += (`=${param_value}`);
        }
      }
    }
  }

  register()
  {
    if (this._registering)
    {
      debug('Register request in progress...');

      return;
    }

    const extraHeaders = this._extraHeaders.slice();

    extraHeaders.push(`Contact: \
        ${this._contact};expires=${this._expires}${this._extraContactParams}`);
    extraHeaders.push(`Expires: ${this._expires}`);

    const request = new SIPMessage.OutgoingRequest(
      JsSIP_C.REGISTER, this._registrar, this._ua, {
        'to_uri'  : this._to_uri,
        'call_id' : this._call_id,
        'cseq'    : (this._cseq += 1)
      }, extraHeaders);

    const request_sender = new RequestSender(this._ua, request, {
      onRequestTimeout : () =>
      {
        this._registrationFailure(null, JsSIP_C.causes.REQUEST_TIMEOUT);
      },
      onTransportError : () =>
      {
        this._registrationFailure(null, JsSIP_C.causes.CONNECTION_ERROR);
      },
      // Increase the CSeq on authentication.
      onAuthenticated : () =>
      {
        this._cseq += 1;
      },
      onReceiveResponse : (response) =>
      {
        let contact, expires, contacts = response.getHeaders('contact').length;

        // Discard responses to older REGISTER/un-REGISTER requests.
        if (response.cseq !== this._cseq)
        {
          return;
        }

        // Clear registration timer
        if (this._registrationTimer !== null)
        {
          clearTimeout(this._registrationTimer);
          this._registrationTimer = null;
        }

        switch (true)
        {
          case /^1[0-9]{2}$/.test(response.status_code):
            // Ignore provisional responses.
            break;
          case /^2[0-9]{2}$/.test(response.status_code):
            this._registering = false;

            if (response.hasHeader('expires'))
            {
              expires = response.getHeader('expires');
            }

            // Search the Contact pointing to us and update the expires value accordingly.
            if (!contacts)
            {
              debug('no Contact header in response to REGISTER, response ignored');
              break;
            }

            while (contacts--)
            {
              contact = response.parseHeader('contact', contacts);
              if (contact.uri.user === this._ua.contact.uri.user)
              {
                expires = contact.getParam('expires');
                break;
              }
              else
              {
                contact = null;
              }
            }

            if (!contact)
            {
              debug('no Contact header pointing to us, response ignored');
              break;
            }

            if (!expires)
            {
              expires = this._expires;
            }

            // Re-Register or emit an event before the expiration interval has elapsed.
            // For that, decrease the expires value. ie: 3 seconds
            this._registrationTimer = setTimeout(() =>
            {
              this._registrationTimer = null;
              // If there are no listeners for registrationExpiring, renew registration
              // If there are listeners, let the function listening do the register call
              if (this._ua.listeners('registrationExpiring').length === 0)
              {
                this.register();
              }
              else
              {
                this._ua.emit('registrationExpiring');
              }
            }, (expires * 1000) - 5000);

            // Save gruu values
            if (contact.hasParam('temp-gruu'))
            {
              this._ua.contact.temp_gruu = contact.getParam('temp-gruu').replace(/"/g, '');
            }
            if (contact.hasParam('pub-gruu'))
            {
              this._ua.contact.pub_gruu = contact.getParam('pub-gruu').replace(/"/g, '');
            }

            if (! this._registered)
            {
              this._registered = true;
              this._ua.registered({
                response
              });
            }
            break;
          // Interval too brief RFC3261 10.2.8
          case /^423$/.test(response.status_code):
            if (response.hasHeader('min-expires'))
            {
              // Increase our registration interval to the suggested minimum
              this._expires = response.getHeader('min-expires');
              // Attempt the registration again immediately
              this.register();
            }
            else
            { // This response MUST contain a Min-Expires header field
              debug('423 response received for REGISTER without Min-Expires');
              this._registrationFailure(response, JsSIP_C.causes.SIP_FAILURE_CODE);
            }
            break;
          default:
          {
            const cause = Utils.sipErrorCause(response.status_code);

            this._registrationFailure(response, cause);
          }
        }
      }
    });

    this._registering = true;
    request_sender.send();
  }

  unregister(options = {})
  {
    if (!this._registered)
    {
      debug('already unregistered');

      return;
    }

    this._registered = false;

    // Clear the registration timer.
    if (this._registrationTimer !== null)
    {
      clearTimeout(this._registrationTimer);
      this._registrationTimer = null;
    }

    const extraHeaders = this._extraHeaders.slice();

    if (options.all)
    {
      extraHeaders.push(`Contact: *${this._extraContactParams}`);
    }
    else
    {
      extraHeaders.push(`Contact: ${this._contact};expires=0${this._extraContactParams}`);
    }

    extraHeaders.push('Expires: 0');

    const request = new SIPMessage.OutgoingRequest(
      JsSIP_C.REGISTER, this._registrar, this._ua, {
        'to_uri'  : this._to_uri,
        'call_id' : this._call_id,
        'cseq'    : (this._cseq += 1)
      }, extraHeaders);

    const request_sender = new RequestSender(this._ua, request, {
      onRequestTimeout : () =>
      {
        this._unregistered(null, JsSIP_C.causes.REQUEST_TIMEOUT);
      },
      onTransportError : () =>
      {
        this._unregistered(null, JsSIP_C.causes.CONNECTION_ERROR);
      },
      // Increase the CSeq on authentication.
      onAuthenticated : () =>
      {
        this._cseq += 1;
      },
      onReceiveResponse : (response) =>
      {
        switch (true)
        {
          case /^1[0-9]{2}$/.test(response.status_code):
            // Ignore provisional responses.
            break;
          case /^2[0-9]{2}$/.test(response.status_code):
            this._unregistered(response);
            break;
          default:
          {
            const cause = Utils.sipErrorCause(response.status_code);

            this._unregistered(response, cause);
          }
        }
      }
    });

    request_sender.send();
  }

  close()
  {
    if (this._registered)
    {
      this.unregister();
    }
  }


  onTransportClosed()
  {
    this._registering = false;
    if (this._registrationTimer !== null)
    {
      clearTimeout(this._registrationTimer);
      this._registrationTimer = null;
    }

    if (this._registered)
    {
      this._registered = false;
      this._ua.unregistered({});
    }
  }

  _registrationFailure(response, cause)
  {
    this._registering = false;
    this._ua.registrationFailed({
      response : response || null,
      cause
    });

    if (this._registered)
    {
      this._registered = false;
      this._ua.unregistered({
        response : response || null,
        cause
      });
    }
  }

  _unregistered(response, cause)
  {
    this._registering = false;
    this._registered = false;
    this._ua.unregistered({
      response : response || null,
      cause    : cause || null
    });
  }
};
