'use strict';

/**
 * Dependencies.
 */
const debug = require('debug')('JsSIP:RTCSession:Request');
const debugerror = require('debug')('JsSIP:ERROR:RTCSession:Request');
debugerror.log = console.warn.bind(console);
const JsSIP_C = require('../Constants');
const Exceptions = require('../Exceptions');
const RTCSession = require('../RTCSession');


class Request {
  constructor(session, method) {
    debug('new | %s', method);

    this.session = session;
    this.method = method;
    // Instance of OutgoingRequest
    this.outgoingRequest = null;

    // Check RTCSession Status
    if (this.session.status !== RTCSession.C.STATUS_1XX_RECEIVED &&
      this.session.status !== RTCSession.C.STATUS_WAITING_FOR_ANSWER &&
      this.session.status !== RTCSession.C.STATUS_WAITING_FOR_ACK &&
      this.session.status !== RTCSession.C.STATUS_CONFIRMED &&
      this.session.status !== RTCSession.C.STATUS_TERMINATED) {
      throw new Exceptions.InvalidStateError(this.session.status);
    }

    /*
     * Allow sending BYE in TERMINATED status since the RTCSession
     * could had been terminated before the ACK had arrived.
     * RFC3261 Section 15, Paragraph 2
     */
    else if (this.session.status === RTCSession.C.STATUS_TERMINATED && method !== JsSIP_C.BYE) {
      throw new Exceptions.InvalidStateError(this.session.status);
    }
  }

  send(options = {}) {
    const extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [], body = options.body || null;

    this.eventHandlers = options.eventHandlers || {};

    this.outgoingRequest = this.session.dialog.sendRequest(this, this.method, {
      extraHeaders: extraHeaders,
      body: body
    });
  }

  receiveResponse(response) {
    switch(true) {
      case /^1[0-9]{2}$/.test(response.status_code):
        debug('onProgressResponse');
        if (this.eventHandlers.onProgressResponse) { this.eventHandlers.onProgressResponse(response); }
        break;

      case /^2[0-9]{2}$/.test(response.status_code):
        debug('onSuccessResponse');
        if (this.eventHandlers.onSuccessResponse) { this.eventHandlers.onSuccessResponse(response); }
        break;

      default:
        debug('onErrorResponse');
        if (this.eventHandlers.onErrorResponse) { this.eventHandlers.onErrorResponse(response); }
        break;
    }
  }

  onRequestTimeout() {
    debugerror('onRequestTimeout');
    if (this.eventHandlers.onRequestTimeout) { this.eventHandlers.onRequestTimeout(); }
  }

  onTransportError() {
    debugerror('onTransportError');
    if (this.eventHandlers.onTransportError) { this.eventHandlers.onTransportError(); }
  }

  onDialogError() {
    debugerror('onDialogError');
    if (this.eventHandlers.onDialogError) { this.eventHandlers.onDialogError(); }
  }
}

module.exports = Request;
