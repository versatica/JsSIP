module.exports = ReferNotifier;


var C = {
  event_type: 'refer',
  body_type: 'message/sipfrag;version=2.0',
  expires: 300
};

/**
 * Dependencies.
 */
var debug = require('debug')('JsSIP:RTCSession:ReferNotifier');
var JsSIP_C = require('../Constants');
var RTCSession_Request = require('./Request');


function ReferNotifier(session, id, expires) {
  this.session = session;
  this.id = id;
  this.expires = expires || C.expires;
  this.active = true;

  // The creation of a Notifier results in an immediate NOTIFY
  this.notify(100);
}

ReferNotifier.prototype.notify = function(code, reason) {
  debug('notify()');

  var state,
      self = this;

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
  var request = new RTCSession_Request(this.session, JsSIP_C.NOTIFY);
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
};
