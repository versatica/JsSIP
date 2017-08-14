'use strict';

/**
 * Dependencies.
 */
const events = require('events');
const debugerror = require('debug')('JsSIP:ERROR:RTCSession:Info');
debugerror.log = console.warn.bind(console);
const JsSIP_C = require('../Constants');
const Exceptions = require('../Exceptions');
const RTCSession = require('../RTCSession');


class Info extends events.EventEmitter {
  constructor(session) {
    super();

    this.owner = session;
    this.direction = null;
    this.contentType = null;
    this.body = null;
  }

  send(contentType, body, options) {
    let extraHeaders;

    this.direction = 'outgoing';

    if (contentType === undefined) {
      throw new TypeError('Not enough arguments');
    }

    // Check RTCSession Status
    if (this.owner.status !== RTCSession.C.STATUS_CONFIRMED &&
      this.owner.status !== RTCSession.C.STATUS_WAITING_FOR_ACK) {
      throw new Exceptions.InvalidStateError(this.owner.status);
    }

    this.contentType = contentType;
    this.body = body;

    // Get Info options
    options = options || {};
    extraHeaders = options.extraHeaders ? options.extraHeaders.slice() : [];

    extraHeaders.push(`Content-Type: ${contentType}`);

    this.owner.newInfo({
      originator: 'local',
      info: this,
      request: this.request
    });

    this.owner.dialog.sendRequest(this, JsSIP_C.INFO, {
      extraHeaders: extraHeaders,
      body: body
    });
  }

  receiveResponse(response) {
    switch(true) {
      case /^1[0-9]{2}$/.test(response.status_code):
        // Ignore provisional responses.
        break;

      case /^2[0-9]{2}$/.test(response.status_code):
        this.emit('succeeded', {
          originator: 'remote',
          response: response
        });
        break;

      default:
        this.emit('failed', {
          originator: 'remote',
          response: response
        });
        break;
    }
  }

  onRequestTimeout() {
    debugerror('onRequestTimeout');
    this.owner.onRequestTimeout();
  }

  onTransportError() {
    debugerror('onTransportError');
    this.owner.onTransportError();
  }

  onDialogError() {
    debugerror('onDialogError');
    this.owner.onDialogError();
  }

  init_incoming(request) {
    this.direction = 'incoming';
    this.request = request;

    request.reply(200);

    this.contentType = request.getHeader('content-type');
    this.body = request.body;

    this.owner.newInfo({
      originator: 'remote',
      info: this,
      request: request
    });
  }
}

module.exports = Info;
