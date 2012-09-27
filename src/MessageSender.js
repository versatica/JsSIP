
/**
 * @fileoverview Message Sender
 */

/**
 * @augments JsSIP
 * @class Class creating SIP MESSAGE request.
 * @param {JsSIP.UA} ua
 * @param {string} target
 * @param {string} [body]
 * @param {string} [content_type='text/plain']
 */

JsSIP.MessageSender = function(ua, target, body, content_type) {
  var events = [
    'success',
    'failure',
    'error'
  ];

  this.ua = ua;
  this.target = target;
  this.closed = false;
  this.ua.applicants[this] = this;
  this.request = new JsSIP.OutgoingRequest(JsSIP.c.MESSAGE, target, ua, null, {
    'content_type': content_type || 'text/plain'});

  if(body) {
    this.request.body = body;
  }

  this.initEvents(events);
};
JsSIP.MessageSender.prototype = new JsSIP.EventEmitter();

JsSIP.MessageSender.prototype.send = function() {
  var request_sender = new JsSIP.RequestSender(this, this.ua);
  request_sender.send();
};

  /**
  * @private
  */
JsSIP.MessageSender.prototype.receiveResponse = function(response) {
  if(this.closed) {
    return;
  }
  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      // Ignore provisional responses.
      break;
    case /^2[0-9]{2}$/.test(response.status_code):
      delete this.ua.applicants[this];
      this.emit('success',[response]);
      break;
    default:
      delete this.ua.applicants[this];
      this.emit('failure', [response]);
      break;
  }
};


/**
* @private
*/
JsSIP.MessageSender.prototype.onRequestTimeout = function() {
  if(this.closed) {
    return;
  }
  this.emit('error', [JsSIP.c.REQUEST_TIMEOUT]);
};

/**
* @private
*/
JsSIP.MessageSender.prototype.onTransportError = function() {
  if(this.closed) {
    return;
  }
  this.emit('error', [JsSIP.c.TRANSPORT_ERROR]);
};

/**
* @private
*/
JsSIP.MessageSender.prototype.close = function() {
  this.closed = true;
  delete this.ua.applicants[this];
  //this.onFailure(null, JsSIP.c.USER_CLOSED);
};
