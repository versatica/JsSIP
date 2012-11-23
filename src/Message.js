
/**
 * @fileoverview Message Sender
 */

/**
 * @augments JsSIP
 * @class Class creating SIP MESSAGE request.
 * @param {JsSIP.UA} ua
 */

JsSIP.Message = function(ua) {
  this.ua = ua;
  this.direction = null;
  this.local_identity = null;
  this.remote_identity = null;
};
JsSIP.Message.prototype = new JsSIP.EventEmitter();


JsSIP.Message.prototype.send = function(target, body, contentType, options) {
  var request_sender, event, eventHandlers, extraHeaders,
    events = [
      'sending',
      'succeeded',
      'failed'
    ];

  JsSIP.utils.checkUAStatus(this.ua);

  this.initEvents(events);

  // Get call options
  options = options || {};
  extraHeaders = options.extraHeaders || [];
  eventHandlers = options.eventHandlers || {};

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  // Check target validity
  target = JsSIP.utils.normalizeUri(target, this.ua.configuration.domain);
  if (!target) {
    throw new JsSIP.exceptions.InvalidTargetError();
  }

  // Message parameter initialization
  this.direction = 'outgoing';
  this.local_identity = this.ua.configuration.user;
  this.remote_identity = target;

  this.closed = false;
  this.ua.applicants[this] = this;

  extraHeaders.push('Content-Type: '+ (contentType ? contentType : 'text/plain'));

  this.request = new JsSIP.OutgoingRequest(JsSIP.c.MESSAGE, target, this.ua, null, extraHeaders);

  if(body) {
    this.request.body = body;
  }

  request_sender = new JsSIP.RequestSender(this, this.ua);

  this.ua.emit('newMessage', this.ua, {
    originator: 'local',
    message: this,
    request: this.request
  });

  this.emit('sending', this, {
    originator: 'local',
    request: this.request
  });

  request_sender.send();
};

/**
* @private
*/
JsSIP.Message.prototype.receiveResponse = function(response) {
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

      cause = JsSIP.utils.sipErrorCause(response.status_code);

      if (cause) {
        cause = JsSIP.c.causes[cause];
      } else {
        cause = JsSIP.c.causes.SIP_FAILURE_CODE;
      }

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
JsSIP.Message.prototype.onRequestTimeout = function() {
  if(this.closed) {
    return;
  }
  this.emit('failed', this, {
    originator: 'system',
    cause: JsSIP.c.causes.REQUEST_TIMEOUT
  });
};

/**
* @private
*/
JsSIP.Message.prototype.onTransportError = function() {
  if(this.closed) {
    return;
  }
  this.emit('failed', this, {
    originator: 'system',
    cause: JsSIP.c.causes.CONNECTION_ERROR
  });
};

/**
* @private
*/
JsSIP.Message.prototype.close = function() {
  this.closed = true;
  delete this.ua.applicants[this];
};

/**
 * @private
 */
JsSIP.Message.prototype.init_incoming = function(request) {
  var transaction,
    contentType = request.getHeader('content-type');

  this.direction = 'incoming';
  this.request = request;
  this.local_identity = request.s('to').uri;
  this.remote_identity = request.s('from').uri;

  if (contentType && (contentType.match(/^text\/plain(\s*;\s*.+)*$/i) || contentType.match(/^text\/html(\s*;\s*.+)*$/i))) {
    this.ua.emit('newMessage', this.ua, {
      originator: 'remote',
      message: this,
      request: request
    });

    transaction = this.ua.transactions.nist[request.via_branch];

    if (transaction && (transaction.state === JsSIP.c.TRANSACTION_TRYING || transaction.state === JsSIP.c.TRANSACTION_PROCEEDING)) {
      request.reply(200);
    }
  } else {
    request.reply(415, JsSIP.c.REASON_PHRASE[415], ["Accept: text/plain, text/html"]);
  }
};

/**
 * Accept the incoming Message
 * Only valid for incoming Messages
 */
JsSIP.Message.prototype.accept = function() {
  if (this.direction !== 'incoming') {
    throw new JsSIP.exceptions.InvalidMethodError();
  }

  this.request.reply(200);
};

/**
 * Reject the incoming Message
 * Only valid for incoming Messages
 *
 * @param {Number} status_code
 * @param {String} [reason_phrase]
 */
JsSIP.Message.prototype.reject = function(status_code, reason_phrase) {
  if (this.direction !== 'incoming') {
    throw new JsSIP.exceptions.InvalidMethodError();
  }

  if (status_code) {
    if ((status_code < 300 || status_code >= 700)) {
      throw new JsSIP.exceptions.InvalidValueError();
    } else {
      this.request.reply(status_code, reason_phrase);
    }
  } else {
    this.request.reply(480);
  }
};
