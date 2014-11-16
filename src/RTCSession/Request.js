module.exports = Request;

/**
 * Dependencies.
 */
var util = require('util');
var events = require('events');
var JsSIP_C = require('../Constants');
var Exceptions = require('../Exceptions');
var RTCSession = require('../RTCSession');
var Utils = require('../Utils');


function Request(session) {
  this.owner = session;
}

util.inherits(Request, events.EventEmitter);


Request.prototype.send = function(method, options) {
  options = options || {};

  var event,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    eventHandlers = options.eventHandlers || {},
    body = options.body || null;

  if (method === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check RTCSession Status
  if (this.owner.status !== RTCSession.C.STATUS_1XX_RECEIVED &&
    this.owner.status !== RTCSession.C.STATUS_WAITING_FOR_ANSWER &&
    this.owner.status !== RTCSession.C.STATUS_WAITING_FOR_ACK &&
    this.owner.status !== RTCSession.C.STATUS_CONFIRMED &&
    this.owner.status !== RTCSession.C.STATUS_TERMINATED) {
    throw new Exceptions.InvalidStateError(this.owner.status);
  }

  /*
   * Allow sending BYE in TERMINATED status since the RTCSession
   * could had been terminated before the ACK had arrived.
   * RFC3261 Section 15, Paragraph 2
   */
  else if (this.owner.status === RTCSession.C.STATUS_TERMINATED && method !== JsSIP_C.BYE) {
    throw new Exceptions.InvalidStateError(this.owner.status);
  }

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  this.owner.dialog.sendRequest(this, method, {
    extraHeaders: extraHeaders,
    body: body
  });
};

Request.prototype.receiveResponse = function(response) {
  var cause;

  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      this.emit('progress', {
        originator: 'remote',
        response: response
      });
      break;

    case /^2[0-9]{2}$/.test(response.status_code):
      this.emit('succeeded', {
        originator: 'remote',
        response: response
      });
      break;

    default:
      cause = Utils.sipErrorCause(response.status_code);
      this.emit('failed', {
        originator: 'remote',
        response: response,
        cause: cause
      });
      break;
  }
};

Request.prototype.onRequestTimeout = function() {
  this.emit('failed', {
    originator: 'system',
    cause: JsSIP_C.causes.REQUEST_TIMEOUT
  });
  this.owner.onRequestTimeout();
};

Request.prototype.onTransportError = function() {
  this.emit('failed', {
    originator: 'system',
    cause: JsSIP_C.causes.CONNECTION_ERROR
  });
  this.owner.onTransportError();
};

Request.prototype.onDialogError = function(response) {
  this.emit('failed', {
    originator: 'remote',
    response: response,
    cause: JsSIP_C.causes.DIALOG_ERROR
  });
  this.owner.onDialogError(response);
};
