'use strict';

/**
 * Dependencies.
 */
const events = require('events');
const JsSIP_C = require('./Constants');
const SIPMessage = require('./SIPMessage');
const Utils = require('./Utils');
const RequestSender = require('./RequestSender');
const Transactions = require('./Transactions');
const Exceptions = require('./Exceptions');


class Message extends events.EventEmitter {
  constructor(ua) {
    this.ua = ua;

    // Custom message empty object for high level use
    this.data = {};

    super();
  }

  send(target, body, options = {}) {
    let request_sender;
    let event;
    let contentType;
    let eventHandlers;
    let extraHeaders;
    const originalTarget = target;

    if (target === undefined || body === undefined) {
      throw new TypeError('Not enough arguments');
    }

    // Check target validity
    target = this.ua.normalizeTarget(target);
    if (!target) {
      throw new TypeError(`Invalid target: ${originalTarget}`);
    }

    // Get call options
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

    extraHeaders.push(`Content-Type: ${contentType}`);

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
  }

  receiveResponse(response) {
    let cause;

    if(this.closed) {
      return;
    }
    switch(true) {
      case /^1[0-9]{2}$/.test(response.status_code):
        // Ignore provisional responses.
        break;

      case /^2[0-9]{2}$/.test(response.status_code):
        delete this.ua.applicants[this];
        this.emit('succeeded', {
          originator: 'remote',
          response: response
        });
        break;

      default:
        delete this.ua.applicants[this];
        cause = Utils.sipErrorCause(response.status_code);
        this.emit('failed', {
          originator: 'remote',
          response: response,
          cause: cause
        });
        break;
    }
  }

  onRequestTimeout() {
    if(this.closed) {
      return;
    }
    this.emit('failed', {
      originator: 'system',
      cause: JsSIP_C.causes.REQUEST_TIMEOUT
    });
  }

  onTransportError() {
    if(this.closed) {
      return;
    }
    this.emit('failed', {
      originator: 'system',
      cause: JsSIP_C.causes.CONNECTION_ERROR
    });
  }

  close() {
    this.closed = true;
    delete this.ua.applicants[this];
  }

  init_incoming(request) {
    let transaction;

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
  }

  /**
   * Accept the incoming Message
   * Only valid for incoming Messages
   */
  accept(options = {}) {
    const extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [], body = options.body;

    if (this.direction !== 'incoming') {
      throw new Exceptions.NotSupportedError('"accept" not supported for outgoing Message');
    }

    this.request.reply(200, null, extraHeaders, body);
  }

  /**
   * Reject the incoming Message
   * Only valid for incoming Messages
   */
  reject(options = {}) {
    const status_code = options.status_code || 480, reason_phrase = options.reason_phrase, extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [], body = options.body;

    if (this.direction !== 'incoming') {
      throw new Exceptions.NotSupportedError('"reject" not supported for outgoing Message');
    }

    if (status_code < 300 || status_code >= 700) {
      throw new TypeError(`Invalid status_code: ${status_code}`);
    }

    this.request.reply(status_code, reason_phrase, extraHeaders, body);
  }

  /**
   * Internal Callbacks
   */

  newMessage(originator, request) {
    if (originator === 'remote') {
      this.direction = 'incoming';
      this.local_identity = request.to;
      this.remote_identity = request.from;
    } else if (originator === 'local'){
      this.direction = 'outgoing';
      this.local_identity = request.from;
      this.remote_identity = request.to;
    }

    this.ua.newMessage({
      originator: originator,
      message: this,
      request: request
    });
  }
}

module.exports = Message;
