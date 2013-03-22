/**
 * @fileoverview Request
 */

/**
 * @class Request
 * @param {JsSIP.RTCSession} session
 */
(function(JsSIP) {

var Request = function(session) {
  var events = [
  'progress',
  'succeeded',
  'failed'
  ];

  this.session = session;

  this.initEvents(events);
};
Request.prototype = new JsSIP.EventEmitter();


Request.prototype.send = function(method, options) {
  options = options || {};

  var request_sender, event,
    extraHeaders = options.extraHeaders || [],
    eventHandlers = options.eventHandlers || {},
    body = options.body || null;

  if (method === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check RTCSession Status
  if (this.session.status !== JsSIP.RTCSession.C.STATUS_1XX_RECEIVED &&
    this.session.status !== JsSIP.RTCSession.C.STATUS_WAITING_FOR_ANSWER &&
    this.session.status !== JsSIP.RTCSession.C.STATUS_WAITING_FOR_ACK &&
    this.session.status !== JsSIP.RTCSession.C.STATUS_CONFIRMED) {
    throw new JsSIP.Exceptions.InvalidStateError(this.session.status);
  }

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  this.request = this.session.dialog.createRequest(method, extraHeaders);

  this.request.body = body;

  request_sender = new RequestSender(this);
  request_sender.send();
};

/**
 * @private
 */
Request.prototype.receiveResponse = function(response) {
  var cause;

  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      this.emit('progress', this, {
        originator: 'remote',
        response: response
      });
      break;

    case /^2[0-9]{2}$/.test(response.status_code):
      this.emit('succeeded', this, {
        originator: 'remote',
        response: response
      });
      break;

    default:
      cause = JsSIP.Utils.sipErrorCause(response.status_code);
      this.emit('failed', this, {
        originator: 'remote',
        response: response,
        cause: cause
      });
      break;
  }
};

/**
 * @private
 */
Request.prototype.onRequestTimeout = function() {
  this.emit('failed', this, {
    originator: 'system',
    cause: JsSIP.C.causes.REQUEST_TIMEOUT
  });
};

/**
 * @private
 */
Request.prototype.onRequestTransportError = function() {
  this.emit('failed', this, {
    originator: 'system',
    cause: JsSIP.C.causes.CONNECTION_ERROR
  });
};

return Request;
}(JsSIP));
