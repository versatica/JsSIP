'use strict';

/**
 * Dependencies.
 */
const events = require('events');
const debug = require('debug')('JsSIP:RTCSession:ReferSubscriber');
const JsSIP_C = require('../Constants');
const Grammar = require('../Grammar');
const RTCSession_Request = require('./Request');

const C = {
  expires: 120
};

class ReferSubscriber extends events.EventEmitter {
  constructor(session) {
    this.session = session;
    this.timer = null;
    // Instance of REFER OutgoingRequest
    this.outgoingRequest = null;

    super();
  }

  sendRefer(target, options) {
    debug('sendRefer()');

    let extraHeaders;
    let eventHandlers;
    let referTo;
    let replaces = null;
    const self = this;

    // Get REFER options
    options = options || {};
    extraHeaders = options.extraHeaders ? options.extraHeaders.slice() : [];
    eventHandlers = options.eventHandlers || {};

    // Set event handlers
    for (const event in eventHandlers) {
      this.on(event, eventHandlers[event]);
    }

    // Replaces URI header field
    if (options.replaces) {
      replaces = options.replaces.request.call_id;
      replaces += `;to-tag=${options.replaces.to_tag}`;
      replaces += `;from-tag=${options.replaces.from_tag}`;

      replaces = encodeURIComponent(replaces);
    }

    // Refer-To header field
    referTo = `Refer-To: <${target}${replaces?`?Replaces=${replaces}`:''}>`;

    extraHeaders.push(referTo);

    const request = new RTCSession_Request(this.session, JsSIP_C.REFER);

    this.timer = setTimeout(() => {
      removeSubscriber.call(self);
    }, C.expires * 1000);

    request.send({
      extraHeaders: extraHeaders,
      eventHandlers: {
        onSuccessResponse(response) {
          self.emit('requestSucceeded', {
            response: response
          });
        },
        onErrorResponse(response) {
          self.emit('requestFailed', {
            response: response,
            cause: JsSIP_C.causes.REJECTED
          });
        },
        onTransportError() {
          removeSubscriber.call(self);
          self.emit('requestFailed', {
            response: null,
            cause: JsSIP_C.causes.CONNECTION_ERROR
          });
        },
        onRequestTimeout() {
          removeSubscriber.call(self);
          self.emit('requestFailed', {
            response: null,
            cause: JsSIP_C.causes.REQUEST_TIMEOUT
          });
        },
        onDialogError() {
          removeSubscriber.call(self);
          self.emit('requestFailed', {
            response: null,
            cause: JsSIP_C.causes.DIALOG_ERROR
          });
        }
      }
    });

    this.outgoingRequest = request.outgoingRequest;
  }

  receiveNotify(request) {
    debug('receiveNotify()');

    let status_line;

    if (!request.body) {
      return;
    }

    status_line = Grammar.parse(request.body, 'Status_Line');

    if(status_line === -1) {
      debug(`receiveNotify() | error parsing NOTIFY body: "${request.body}"`);
      return;
    }

    switch(true) {
      case /^100$/.test(status_line.status_code):
        this.emit('trying', {
          request: request,
          status_line: status_line
        });
        break;

      case /^1[0-9]{2}$/.test(status_line.status_code):
        this.emit('progress', {
          request: request,
          status_line: status_line
        });
        break;

      case /^2[0-9]{2}$/.test(status_line.status_code):
        removeSubscriber.call(this);
        this.emit('accepted', {
          request: request,
          status_line: status_line
        });
        break;

      default:
        removeSubscriber.call(this);
        this.emit('failed', {
          request: request,
          status_line: status_line
        });
        break;
    }
  }
}

// remove refer subscriber from the session
function removeSubscriber() {
  console.log('removeSubscriber()');
  clearTimeout(this.timer);
  this.session.referSubscriber = null;
}

module.exports = ReferSubscriber;
