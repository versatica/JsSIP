module.exports = Message;


/**
 * Dependencies.
 */
var JsSIP_C = require('./Constants');
var EventEmitter = require('./EventEmitter');
var SIPMessage = require('./SIPMessage');
var Utils = require('./Utils');
var RequestSender = require('./RequestSender');
var Transactions = require('./Transactions');
var Exceptions = require('./Exceptions');


function Message(ua) {
  this.ua = ua;

  // Custom message empty object for high level use
  this.data = {};
}


Message.prototype = new EventEmitter();


Message.prototype.send = function(target, body, options) {
  var request_sender, event, contentType, eventHandlers, extraHeaders,
    events = [
      'succeeded',
      'failed'
    ],
    originalTarget = target;

  if (target === undefined || body === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check target validity
  target = this.ua.normalizeTarget(target);
  if (!target) {
    throw new TypeError('Invalid target: '+ originalTarget);
  }

  this.initEvents(events);

  // Get call options
  options = options || {};
  extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [];
  eventHandlers = options.eventHandlers || {};
  contentType = options.contentType || 'text/plain';

  this.content_type = contentType;

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  this.closed = false;
  this.ua.applicants[this] = this;

  extraHeaders.push('Content-Type: '+ contentType);

  this.request = new SIPMessage.OutgoingRequest(JsSIP_C.MESSAGE, target, this.ua, null, extraHeaders);

  if(body) {
    this.request.body = body;
    this.content = body;
  } else {
    this.content = null;
  }

  request_sender = new RequestSender(this, this.ua);

  this.newMessage('local', this.request);

  request_sender.send();
};

Message.prototype.receiveResponse = function(response) {
  var cause;

  if(this.closed) {
    return;
  }
  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      // Ignore provisional responses.
      break;

    case /^2[0-9]{2}$/.test(response.status_code):
      delete this.ua.applicants[this];
      this.emit('succeeded', this, {
        originator: 'remote',
        response: response
      });
      break;

    default:
      delete this.ua.applicants[this];
      cause = Utils.sipErrorCause(response.status_code);
      this.emit('failed', this, {
        originator: 'remote',
        response: response,
        cause: cause
      });
      break;
  }
};


Message.prototype.onRequestTimeout = function() {
  if(this.closed) {
    return;
  }
  this.emit('failed', this, {
    originator: 'system',
    cause: JsSIP_C.causes.REQUEST_TIMEOUT
  });
};

Message.prototype.onTransportError = function() {
  if(this.closed) {
    return;
  }
  this.emit('failed', this, {
    originator: 'system',
    cause: JsSIP_C.causes.CONNECTION_ERROR
  });
};

Message.prototype.close = function() {
  this.closed = true;
  delete this.ua.applicants[this];
};

Message.prototype.init_incoming = function(request) {
  var transaction;

  this.request = request;
  this.content_type = request.getHeader('Content-Type');

  if (request.body) {
    this.content = request.body;
  } else {
    this.content = null;
  }

  this.newMessage('remote', request);

  transaction = this.ua.transactions.nist[request.via_branch];

  if (transaction && (transaction.state === Transactions.C.STATUS_TRYING || transaction.state === Transactions.C.STATUS_PROCEEDING)) {
    request.reply(200);
  }
};

/**
 * Accept the incoming Message
 * Only valid for incoming Messages
 */
Message.prototype.accept = function(options) {
  options = options || {};

  var
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    body = options.body;

  if (this.direction !== 'incoming') {
    throw new Exceptions.NotSupportedError('"accept" not supported for outgoing Message');
  }

  this.request.reply(200, null, extraHeaders, body);
};

/**
 * Reject the incoming Message
 * Only valid for incoming Messages
 */
Message.prototype.reject = function(options) {
  options = options || {};

  var
    status_code = options.status_code || 480,
    reason_phrase = options.reason_phrase,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    body = options.body;

  if (this.direction !== 'incoming') {
    throw new Exceptions.NotSupportedError('"reject" not supported for outgoing Message');
  }

  if (status_code < 300 || status_code >= 700) {
    throw new TypeError('Invalid status_code: '+ status_code);
  }

  this.request.reply(status_code, reason_phrase, extraHeaders, body);
};

/**
 * Internal Callbacks
 */

Message.prototype.newMessage = function(originator, request) {
  var message = this,
    event_name = 'newMessage';

  if (originator === 'remote') {
    message.direction = 'incoming';
    message.local_identity = request.to;
    message.remote_identity = request.from;
  } else if (originator === 'local'){
    message.direction = 'outgoing';
    message.local_identity = request.from;
    message.remote_identity = request.to;
  }

  message.ua.emit(event_name, message.ua, {
    originator: originator,
    message: message,
    request: request
  });
};
