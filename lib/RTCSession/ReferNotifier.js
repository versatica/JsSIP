
/**
 * Dependencies.
 */
const debug = require('debug')('JsSIP:RTCSession:ReferNotifier');
const JsSIP_C = require('../Constants');
const RTCSession_Request = require('./Request');

const C = {
  event_type: 'refer',
  body_type: 'message/sipfrag;version=2.0',
  expires: 300
};


class ReferNotifier {
  constructor(session, id, expires) {
    this.session = session;
    this.id = id;
    this.expires = expires || C.expires;
    this.active = true;

    // The creation of a Notifier results in an immediate NOTIFY
    this.notify(100);
  }

  notify(code, reason) {
    debug('notify()');

    let state;
    const self = this;

    if (this.active === false) {
      return;
    }

    reason = reason || JsSIP_C.REASON_PHRASE[code] || '';

    if (code >= 200) {
      state = 'terminated;reason=noresource';
    } else {
      state = 'active;expires='+ this.expires;
    }

    // put this in a try/catch block
    const request = new RTCSession_Request(this.session, JsSIP_C.NOTIFY);
    request.send({
      extraHeaders: [
        'Event: '+ C.event_type +';id='+ self.id,
        'Subscription-State: '+ state,
        'Content-Type: '+ C.body_type
      ],
      body: 'SIP/2.0 ' + code + ' ' + reason,
      eventHandlers: {
        // if a negative response is received, subscription is canceled
        onErrorResponse: function() { self.active = false; }
      }
    });
  }
}

module.exports = ReferNotifier;
