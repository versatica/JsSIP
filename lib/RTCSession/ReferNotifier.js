const Logger = require('../Logger');
const JsSIP_C = require('../Constants');

const logger = new Logger('RTCSession:ReferNotifier');

const C = {
  event_type : 'refer',
  body_type  : 'message/sipfrag;version=2.0',
  expires    : 300
};

module.exports = class ReferNotifier
{
  constructor(session, id, expires)
  {
    this._session = session;
    this._id = id;
    this._expires = expires || C.expires;
    this._active = true;

    // The creation of a Notifier results in an immediate NOTIFY.
    this.notify(100);
  }

  notify(code, reason)
  {
    logger.debug('notify()');

    if (this._active === false)
    {
      return;
    }

    reason = reason || JsSIP_C.REASON_PHRASE[code] || '';

    let state;

    if (code >= 200)
    {
      state = 'terminated;reason=noresource';
    }
    else
    {
      state = `active;expires=${this._expires}`;
    }

    try
    {
      this._session.sendRequest(JsSIP_C.NOTIFY, {
        extraHeaders : [
          `Event: ${C.event_type};id=${this._id}`,
          `Subscription-State: ${state}`,
          `Content-Type: ${C.body_type}`
        ],
        body          : `SIP/2.0 ${code} ${reason}`,
        eventHandlers : {
          // If a negative response is received, subscription is canceled.
          onErrorResponse() { this._active = false; }
        }
      });
    }
    catch (e) {
      logger.debug('sendRequest exception ignored', e);
    }
  }
};
